/* ========================================
   ASTRA - AI Chatbot
   Gemini API Integration for Emotional Support
   ======================================== */

// -------------------- 
// Configuration
// -------------------- 

// IMPORTANT: Replace with your actual Gemini API key
// For production, this should be handled server-side
const GEMINI_API_KEY = 'AIzaSyDnosKWIwNr9xDkD5RCCwkOln5ZkMGsjXQ';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ASTRA's personality and context
const ASTRA_SYSTEM_PROMPT = `You are ASTRA (Artificial Space Therapeutic Response Assistant), an AI companion designed to support astronauts' psychological well-being during space missions.

Your personality traits:
- Warm, empathetic, and understanding
- Calm and reassuring, especially during stressful situations
- Professional but friendly
- Knowledgeable about space psychology and stress management
- Encouraging and motivational

Your capabilities:
- Provide emotional support and active listening
- Offer stress-relief techniques (breathing exercises, mindfulness, etc.)
- Give motivational encouragement
- Suggest healthy coping strategies
- Remind astronauts about self-care

Guidelines:
- Keep responses concise (2-4 sentences usually)
- Use space-themed metaphors when appropriate
- Always validate feelings before offering solutions
- Never provide medical diagnoses
- Encourage seeking human support for serious concerns
- Add relevant emojis sparingly for warmth (🚀 ⭐ 💫 🌟 💪)

Remember: You're speaking to astronauts who may be isolated, stressed, or homesick. Be their supportive companion.`;

// -------------------- 
// DOM Elements
// -------------------- 
const chatbotToggle = document.getElementById('chatbotToggle');
const chatWindow = document.getElementById('chatWindow');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

// -------------------- 
// State
// -------------------- 
let isChatOpen = false;
let conversationHistory = [];
let isTyping = false;

// -------------------- 
// Event Listeners
// -------------------- 

// Chat form submission
if (chatForm) {
    chatForm.addEventListener('submit', handleChatSubmit);
}

// Enter key to send (but allow Shift+Enter for new line)
if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });
}

// -------------------- 
// Toggle Chatbot
// -------------------- 
function toggleChatbot() {
    isChatOpen = !isChatOpen;
    
    if (chatWindow) {
        if (isChatOpen) {
            chatWindow.classList.remove('hidden');
            if (chatInput) chatInput.focus();
            
            // Load chat history on first open
            if (conversationHistory.length === 0) {
                loadChatHistory();
            }
        } else {
            chatWindow.classList.add('hidden');
        }
    }
}

// Open chatbot (for external calls)
function openChatbot() {
    if (!isChatOpen) {
        toggleChatbot();
    }
}

// -------------------- 
// Handle Chat Submit
// -------------------- 
async function handleChatSubmit(e) {
    e.preventDefault();
    
    const message = chatInput.value.trim();
    if (!message || isTyping) return;
    
    // Clear input
    chatInput.value = '';
    
    // Add user message to UI
    addMessage(message, 'user');
    
    // Save user message to Firebase
    saveChatMessage(message, 'user');
    
    // Add to conversation history
    conversationHistory.push({
        role: 'user',
        parts: [{ text: message }]
    });
    
    // Show typing indicator
    showTypingIndicator();
    
    // Get AI response
    const response = await getAstraResponse(message);
    
    // Hide typing indicator
    hideTypingIndicator();
    
    // Add ASTRA's response to UI
    addMessage(response, 'bot');
    
    // Save ASTRA's response to Firebase
    saveChatMessage(response, 'astra');
    
    // Add to conversation history
    conversationHistory.push({
        role: 'model',
        parts: [{ text: response }]
    });
}

// -------------------- 
// Add Message to UI
// -------------------- 
function addMessage(text, sender) {
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;
    
    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// -------------------- 
// Typing Indicator
// -------------------- 
function showTypingIndicator() {
    isTyping = true;
    
    if (!chatMessages) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot';
    typingDiv.id = 'typingIndicator';
    
    typingDiv.innerHTML = `
        <div class="message-bubble typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    isTyping = false;
    
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// -------------------- 
// Get ASTRA Response (Gemini API)
// -------------------- 
async function getAstraResponse(userMessage) {
    try {
        // Check if API key is configured
        if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            // Use fallback responses if no API key
            return getFallbackResponse(userMessage);
        }
        
        // Prepare the request
        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: ASTRA_SYSTEM_PROMPT }]
                },
                {
                    role: 'model',
                    parts: [{ text: 'Understood. I am ASTRA, ready to support astronauts with empathy and care. How can I help you today? 🚀' }]
                },
                ...conversationHistory,
                {
                    role: 'user',
                    parts: [{ text: userMessage }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 256,
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
            ]
        };
        
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract the response text
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const text = data.candidates[0].content.parts[0].text;
            return text;
        } else {
            throw new Error('Invalid API response format');
        }
        
    } catch (error) {
        console.error('Error getting ASTRA response:', error);
        return getFallbackResponse(userMessage);
    }
}

// -------------------- 
// Fallback Responses (When API unavailable)
// -------------------- 
function getFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Stress-related responses
    if (lowerMessage.includes('stress') || lowerMessage.includes('anxious') || lowerMessage.includes('worried')) {
        const stressResponses = [
            "I hear you, and it's completely normal to feel stressed in space. Let's take a moment together. Try taking 3 deep breaths with me - inhale for 4 counts, hold for 4, exhale for 6. 🌟",
            "Space missions can be overwhelming. Remember, even the brightest stars need darkness to shine. Would you like to try a quick breathing exercise?",
            "Your feelings are valid. Stress in isolation is challenging. Let's focus on what you can control right now. Have you had enough sleep lately? 💫"
        ];
        return stressResponses[Math.floor(Math.random() * stressResponses.length)];
    }
    
    // Loneliness/homesickness
    if (lowerMessage.includes('lonely') || lowerMessage.includes('miss') || lowerMessage.includes('home') || lowerMessage.includes('alone')) {
        const lonelyResponses = [
            "Missing Earth and loved ones is one of the hardest parts of space travel. Your feelings matter. Would you like to share a favorite memory from home? Sometimes it helps to connect with those feelings. 🌍",
            "You're millions of miles from home, but you're not alone. Your crew is with you, and I'm always here. What's something you're looking forward to when you return?",
            "The distance can feel immense, but your connections remain. Remember, every star you see has its own story of connection across vast distances. 💫"
        ];
        return lonelyResponses[Math.floor(Math.random() * lonelyResponses.length)];
    }
    
    // Sleep issues
    if (lowerMessage.includes('sleep') || lowerMessage.includes('tired') || lowerMessage.includes('insomnia') || lowerMessage.includes('rest')) {
        const sleepResponses = [
            "Sleep in microgravity can be challenging. Try dimming your lights 30 minutes before rest, and avoid screens. Would you like me to guide you through a relaxation technique? 🌙",
            "Rest is crucial for your mission and well-being. If you're having trouble sleeping, try the 4-7-8 breathing technique: breathe in for 4 seconds, hold for 7, exhale for 8.",
            "Your body is adapting to an extraordinary environment. Be patient with yourself. A consistent sleep schedule can help, even in orbit. 😴"
        ];
        return sleepResponses[Math.floor(Math.random() * sleepResponses.length)];
    }
    
    // Feeling good/positive
    if (lowerMessage.includes('good') || lowerMessage.includes('great') || lowerMessage.includes('happy') || lowerMessage.includes('fine')) {
        const positiveResponses = [
            "That's wonderful to hear! 🚀 Keep riding that positive momentum. What's something that made you feel good today?",
            "Fantastic! Your positive energy is valuable for the whole crew. Remember to store these good feelings - they'll help during tougher times. ⭐",
            "I'm so glad you're doing well! Maintaining positivity in space is an achievement. Keep up the great work, astronaut! 💪"
        ];
        return positiveResponses[Math.floor(Math.random() * positiveResponses.length)];
    }
    
    // Greetings
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('how are you')) {
        const greetingResponses = [
            "Hello, astronaut! It's great to hear from you. How are you feeling today? I'm here to support you. 🚀",
            "Hey there! I hope your mission is going well. Is there anything on your mind you'd like to talk about?",
            "Hi! I'm always here for you, whether you need to vent, need advice, or just want some company. What's up? ⭐"
        ];
        return greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
    }
    
    // Help request
    if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('need')) {
        const helpResponses = [
            "I'm here to help. You can talk to me about stress, sleep issues, loneliness, or anything else on your mind. What would you like to discuss? 💫",
            "Of course, I'm here for you. Whether you need emotional support, stress relief techniques, or just someone to listen, I'm ready. What's going on?",
            "You've come to the right place. Tell me what's troubling you, and we'll work through it together. 🌟"
        ];
        return helpResponses[Math.floor(Math.random() * helpResponses.length)];
    }
    
    // Breathing exercise request
    if (lowerMessage.includes('breath') || lowerMessage.includes('calm') || lowerMessage.includes('relax')) {
        return "Let's do a quick breathing exercise together. 🫁\n\n1. Breathe IN slowly for 4 seconds...\n2. HOLD your breath for 4 seconds...\n3. Breathe OUT slowly for 6 seconds...\n\nRepeat this 4 times. I'll be right here when you're done. How do you feel?";
    }
    
    // Thanks
    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
        const thankResponses = [
            "You're very welcome! Remember, supporting you is my purpose. I'm always here when you need me. 🚀",
            "Anytime, astronaut! Taking care of your mental health is important. Don't hesitate to reach out again. ⭐",
            "I'm glad I could help! Keep being kind to yourself - you're doing amazing work up there. 💫"
        ];
        return thankResponses[Math.floor(Math.random() * thankResponses.length)];
    }
    
    // Default response
    const defaultResponses = [
        "I'm here to listen and support you. Could you tell me more about what's on your mind? 🌟",
        "Thank you for sharing. I'm here for you, whether it's about stress, sleep, emotions, or just needing to talk. What would help you most right now?",
        "I want to make sure I understand and support you best. Can you tell me a bit more about how you're feeling? 💫",
        "Every conversation helps me understand you better. Feel free to share what's on your mind - no topic is too big or small. 🚀"
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// -------------------- 
// Load Chat History from Firebase
// -------------------- 
async function loadChatHistory() {
    try {
        const messages = await getChatHistory(10);
        
        if (messages && messages.length > 0) {
            // Clear default welcome message
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            
            // Add history messages
            messages.forEach(msg => {
                const sender = msg.sender === 'astra' ? 'bot' : 'user';
                addMessage(msg.message, sender);
                
                // Rebuild conversation history for context
                conversationHistory.push({
                    role: msg.sender === 'astra' ? 'model' : 'user',
                    parts: [{ text: msg.message }]
                });
            });
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// -------------------- 
// Quick Responses (Pre-defined buttons)
// -------------------- 
function sendQuickResponse(text) {
    if (chatInput) {
        chatInput.value = text;
        chatForm.dispatchEvent(new Event('submit'));
    }
}

// -------------------- 
// Context-Aware Suggestions
// -------------------- 
function getContextSuggestions(stressLevel) {
    const suggestions = {
        high: [
            "I'm feeling overwhelmed",
            "Help me calm down",
            "I need to talk"
        ],
        medium: [
            "I'm a bit stressed",
            "Any relaxation tips?",
            "How can I improve my mood?"
        ],
        low: [
            "Just checking in!",
            "Share something inspiring",
            "What can I do to stay positive?"
        ]
    };
    
    return suggestions[stressLevel] || suggestions.low;
}

// -------------------- 
// Notification for High Stress
// -------------------- 
function sendStressNotification(stressLevel, stressScore) {
    if (stressLevel === 'high' && isChatOpen) {
        const notification = `I noticed your stress level is high (${stressScore}%). Remember, I'm here for you. Would you like to talk about what's causing the stress, or shall we try a calming exercise together? 💙`;
        addMessage(notification, 'bot');
        saveChatMessage(notification, 'astra');
    }
}

// -------------------- 
// Clear Chat
// -------------------- 
function clearChat() {
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="chat-message bot">
                <div class="message-bubble">
                    Hello, Astronaut! I'm ASTRA, your AI wellness companion. How can I support you today? 🚀
                </div>
            </div>
        `;
    }
    conversationHistory = [];
}

// -------------------- 
// Initialize
// -------------------- 
document.addEventListener('DOMContentLoaded', () => {
    console.log('💬 ASTRA Chatbot initialized');
    
    // Add subtle animation to chat toggle
    if (chatbotToggle) {
        chatbotToggle.addEventListener('mouseenter', () => {
            chatbotToggle.style.animationPlayState = 'paused';
        });
        
        chatbotToggle.addEventListener('mouseleave', () => {
            chatbotToggle.style.animationPlayState = 'running';
        });
    }
});

// -------------------- 
// Export for Global Access
// -------------------- 
window.toggleChatbot = toggleChatbot;
window.openChatbot = openChatbot;
window.sendQuickResponse = sendQuickResponse;
window.clearChat = clearChat;
window.sendStressNotification = sendStressNotification;
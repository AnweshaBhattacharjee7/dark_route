const crewGrid = document.getElementById('crewGrid');
const crewCount = document.getElementById('crewCount');
const onlineCount = document.getElementById('onlineCount');
const alertsCount = document.getElementById('alertsCount');
const highStressCount = document.getElementById('highStressCount');
const alertsList = document.getElementById('alertsList');
const noAlertsMessage = document.getElementById('noAlertsMessage');
const crewLoadingState = document.getElementById('crewLoadingState');
const connectionStatus = document.getElementById('connectionStatus');

let crewMembers = [];
let activeAlerts = [];
let unsubscribeCrew = null;
let unsubscribeAlerts = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('👥 Crew Dashboard initialized');
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            initializeCrewDashboard();
        } else {
            window.location.href = 'login.html';
        }
    });
});

function initializeCrewDashboard() {
    showLoadingState(true);
    
    subscribeToCrewMembers();
    
    subscribeToAlerts();
    
    updateConnectionStatus('online');
}

function subscribeToCrewMembers() {
    unsubscribeCrew = db.collection('users')
        .orderBy('lastCheckIn', 'desc')
        .onSnapshot((snapshot) => {
            crewMembers = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                crewMembers.push({
                    id: doc.id,
                    ...data
                });
            });
            
            renderCrewMembers();
            updateCrewStats();
            showLoadingState(false);
            
            console.log(`📡 Crew updated: ${crewMembers.length} members`);
            
        }, (error) => {
            console.error('Error subscribing to crew:', error);
            showLoadingState(false);
            updateConnectionStatus('offline');
            showToast('error', 'Connection Error', 'Unable to load crew data');
        });
}

function renderCrewMembers() {
    if (!crewGrid) return;
    
    crewGrid.innerHTML = '';
    
    if (crewMembers.length === 0) {
        crewGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                    <svg class="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-400">No Crew Members Found</h3>
                <p class="text-gray-500 text-sm mt-2">Crew members will appear here once they log in.</p>
            </div>
        `;
        return;
    }
    
    const sortedCrew = [...crewMembers].sort((a, b) => {
        const stressPriority = { high: 0, medium: 1, low: 2 };
        const aPriority = stressPriority[a.stressLevel] ?? 2;
        const bPriority = stressPriority[b.stressLevel] ?? 2;
        
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        if (a.isOnline !== b.isOnline) return b.isOnline ? 1 : -1;
        
        return 0;
    });
    
    sortedCrew.forEach((member, index) => {
        const card = createCrewCard(member, index);
        crewGrid.appendChild(card);
    });
}

function createCrewCard(member, index) {
    const card = document.createElement('div');
    const isCurrentUser = member.id === currentUser?.uid;
    const stressLevel = member.stressLevel || 'low';
    const isHighStress = stressLevel === 'high';
    
    card.className = `crew-card ${isHighStress ? 'stress-high' : ''} fade-in`;
    card.style.animationDelay = `${index * 0.1}s`;
    
    const avatarColors = [
        'from-cyan-500 to-blue-600',
        'from-purple-500 to-pink-600',
        'from-green-500 to-teal-600',
        'from-orange-500 to-red-600',
        'from-indigo-500 to-purple-600',
        'from-pink-500 to-rose-600'
    ];
    const colorIndex = member.displayName ? member.displayName.charCodeAt(0) % avatarColors.length : 0;
    const avatarColor = avatarColors[colorIndex];
    
    let lastCheckIn = 'Never';
    if (member.lastCheckIn) {
        const date = member.lastCheckIn.toDate ? member.lastCheckIn.toDate() : new Date(member.lastCheckIn);
        lastCheckIn = formatTimeAgo(date);
    }
    
    const statusConfig = getStatusConfig(stressLevel);
    
    card.innerHTML = `
        ${isHighStress ? `
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-pink-500"></div>
        ` : ''}
        
        <div class="crew-avatar bg-gradient-to-br ${avatarColor}">
            ${member.displayName ? member.displayName.charAt(0).toUpperCase() : 'A'}
        </div>
        
        <div class="crew-info">
            <div class="crew-name flex items-center gap-2">
                ${member.displayName || 'Unknown Astronaut'}
                ${isCurrentUser ? '<span class="text-xs text-cyan-400">(You)</span>' : ''}
            </div>
            <div class="crew-role">${member.role || 'Astronaut'}</div>
            <div class="text-xs text-gray-500 mt-1">
                Last check: ${lastCheckIn}
            </div>
        </div>
        
        <div class="crew-status">
            <div class="flex items-center gap-2">
                <div class="status-indicator ${stressLevel}"></div>
                <span class="text-sm font-medium ${statusConfig.textColor}">
                    ${statusConfig.label}
                </span>
            </div>
            <div class="text-xs text-gray-500 mt-1">
                ${member.isOnline ? '🟢 Online' : '⚫ Offline'}
            </div>
        </div>
        
        ${isHighStress && !isCurrentUser ? `
            <button 
                onclick="offerSupport('${member.id}', '${member.displayName}')"
                class="absolute bottom-3 right-3 text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full hover:bg-red-500/30 transition-colors"
            >
                Offer Support
            </button>
        ` : ''}
    `;
    
    return card;
}

function getStatusConfig(stressLevel) {
    const configs = {
        low: {
            label: 'Low Stress',
            textColor: 'text-green-400',
            bgColor: 'bg-green-500/20',
            borderColor: 'border-green-500/30'
        },
        medium: {
            label: 'Medium Stress',
            textColor: 'text-yellow-400',
            bgColor: 'bg-yellow-500/20',
            borderColor: 'border-yellow-500/30'
        },
        high: {
            label: 'High Stress',
            textColor: 'text-red-400',
            bgColor: 'bg-red-500/20',
            borderColor: 'border-red-500/30'
        }
    };
    
    return configs[stressLevel] || configs.low;
}

function updateCrewStats() {
    const total = crewMembers.length;
    const online = crewMembers.filter(m => m.isOnline).length;
    const highStress = crewMembers.filter(m => m.stressLevel === 'high').length;
    
    if (crewCount) crewCount.textContent = total;
    if (onlineCount) onlineCount.textContent = online;
    if (highStressCount) highStressCount.textContent = highStress;
    
    const highStressIndicator = document.getElementById('highStressIndicator');
    if (highStressIndicator) {
        if (highStress > 0) {
            highStressIndicator.classList.remove('hidden');
        } else {
            highStressIndicator.classList.add('hidden');
        }
    }
}

function subscribeToAlerts() {
    unsubscribeAlerts = db.collection('crewAlerts')
        .where('isActive', '==', true)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
            activeAlerts = [];
            
            snapshot.forEach((doc) => {
                activeAlerts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            renderAlerts();
            updateAlertsCount();
            
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const alert = change.doc.data();
                    if (alert.userId !== currentUser?.uid) {
                        playAlertSound();
                        showAlertNotification(alert);
                    }
                }
            });
            
        }, (error) => {
            console.error('Error subscribing to alerts:', error);
        });
}

function renderAlerts() {
    if (!alertsList) return;
    
    alertsList.innerHTML = '';
    
    if (activeAlerts.length === 0) {
        if (noAlertsMessage) noAlertsMessage.classList.remove('hidden');
        return;
    }
    
    if (noAlertsMessage) noAlertsMessage.classList.add('hidden');
    
    activeAlerts.forEach((alert, index) => {
        const alertCard = createAlertCard(alert, index);
        alertsList.appendChild(alertCard);
    });
}

function createAlertCard(alert, index) {
    const div = document.createElement('div');
    div.className = 'alert-banner danger fade-in';
    div.style.animationDelay = `${index * 0.1}s`;
    
    let timeAgo = 'Just now';
    if (alert.timestamp) {
        const date = alert.timestamp.toDate ? alert.timestamp.toDate() : new Date(alert.timestamp);
        timeAgo = formatTimeAgo(date);
    }
    
    div.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
            <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
        </div>
        <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
                <h4 class="font-semibold text-red-400">${alert.userName || 'A crew member'}</h4>
                <span class="text-xs text-gray-500">${timeAgo}</span>
            </div>
            <p class="text-sm text-gray-300 mt-1">${alert.message}</p>
        </div>
        <button 
            onclick="dismissAlert('${alert.id}')"
            class="text-gray-500 hover:text-white p-1 flex-shrink-0"
            title="Dismiss alert"
        >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    `;
    
    return div;
}

function updateAlertsCount() {
    if (alertsCount) {
        alertsCount.textContent = activeAlerts.length;
    }
    
    const alertsBadge = document.getElementById('alertsBadge');
    if (alertsBadge) {
        if (activeAlerts.length > 0) {
            alertsBadge.classList.remove('hidden');
            alertsBadge.textContent = activeAlerts.length;
        } else {
            alertsBadge.classList.add('hidden');
        }
    }
}

async function dismissAlert(alertId) {
    try {
        await db.collection('crewAlerts').doc(alertId).update({
            isActive: false,
            dismissedBy: currentUser?.uid,
            dismissedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('success', 'Alert Dismissed', 'The alert has been acknowledged');
        
    } catch (error) {
        console.error('Error dismissing alert:', error);
        showToast('error', 'Error', 'Failed to dismiss alert');
    }
}

async function offerSupport(memberId, memberName) {
    try {
        await db.collection('users').doc(memberId)
            .collection('notifications').add({
                type: 'support',
                fromUserId: currentUser?.uid,
                fromUserName: currentUser?.displayName || 'A crew member',
                message: `${currentUser?.displayName || 'A crew member'} is checking in on you and offering support.`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                isRead: false
            });
        
        showToast('success', 'Support Offered', `${memberName} has been notified that you're thinking of them`);
        
        if (typeof openChatbot === 'function') {
            openChatbot();
        }
        
    } catch (error) {
        console.error('Error offering support:', error);
        showToast('error', 'Error', 'Failed to send support notification');
    }
}

function showAlertNotification(alert) {
    showToast('warning', '⚠️ Crew Alert', alert.message);
    
    if (Notification.permission === 'granted') {
        new Notification('ASTRA - Crew Alert', {
            body: alert.message,
            icon: '/assets/logo.svg',
            tag: 'crew-alert'
        });
    }
}

function playAlertSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
    } catch (error) {
        console.log('Audio not available');
    }
}

async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showToast('success', 'Notifications Enabled', 'You will receive crew alerts');
        }
    }
}

function showLoadingState(show) {
    if (crewLoadingState) {
        if (show) {
            crewLoadingState.classList.remove('hidden');
        } else {
            crewLoadingState.classList.add('hidden');
        }
    }
    
    if (crewGrid) {
        if (show) {
            crewGrid.classList.add('opacity-50');
        } else {
            crewGrid.classList.remove('opacity-50');
        }
    }
}

function updateConnectionStatus(status) {
    if (!connectionStatus) return;
    
    const dot = connectionStatus.querySelector('.connection-dot');
    const text = connectionStatus.querySelector('span:last-child');
    
    if (status === 'online') {
        dot?.classList.remove('offline', 'syncing');
        dot?.classList.add('online');
        if (text) text.textContent = 'Connected';
    } else if (status === 'syncing') {
        dot?.classList.remove('online', 'offline');
        dot?.classList.add('syncing');
        if (text) text.textContent = 'Syncing...';
    } else {
        dot?.classList.remove('online', 'syncing');
        dot?.classList.add('offline');
        if (text) text.textContent = 'Offline';
    }
}

function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

function filterCrew(filter) {
    const buttons = document.querySelectorAll('[data-filter]');
    buttons.forEach(btn => {
        btn.classList.remove('active', 'bg-white/10');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active', 'bg-white/10');
        }
    });
    
    let filteredCrew = [...crewMembers];
    
    switch (filter) {
        case 'online':
            filteredCrew = crewMembers.filter(m => m.isOnline);
            break;
        case 'high-stress':
            filteredCrew = crewMembers.filter(m => m.stressLevel === 'high');
            break;
        case 'all':
        default:
            break;
    }
    
    renderFilteredCrew(filteredCrew);
}

function renderFilteredCrew(crew) {
    if (!crewGrid) return;
    
    crewGrid.innerHTML = '';
    
    if (crew.length === 0) {
        crewGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-gray-400">No crew members match this filter.</p>
            </div>
        `;
        return;
    }
    
    crew.forEach((member, index) => {
        const card = createCrewCard(member, index);
        crewGrid.appendChild(card);
    });
}

function refreshCrewData() {
    showLoadingState(true);
    updateConnectionStatus('syncing');
    
    setTimeout(() => {
        showLoadingState(false);
        updateConnectionStatus('online');
        showToast('success', 'Data Refreshed', 'Crew data is up to date');
    }, 1000);
}

window.addEventListener('beforeunload', () => {
    if (unsubscribeCrew) unsubscribeCrew();
    if (unsubscribeAlerts) unsubscribeAlerts();
});

window.filterCrew = filterCrew;
window.refreshCrewData = refreshCrewData;
window.dismissAlert = dismissAlert;
window.offerSupport = offerSupport;
window.requestNotificationPermission = requestNotificationPermission;
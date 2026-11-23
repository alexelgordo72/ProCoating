let notificationsList = [];

async function loadNotifications() {
    try {
        const res = await fetch('/api/notifications');
        notificationsList = await res.json();
        updateNotificationBadge();
    } catch(e) { console.error('Error loading notifications:', e); }
}

async function updateNotificationBadge() {
    try {
        const res = await fetch('/api/notifications/unread-count');
        const data = await res.json();
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (data.count > 0) {
                badge.textContent = data.count > 9 ? '9+' : data.count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch(e) { console.error('Error updating badge:', e); }
}

function toggleNotifications() {
    displayNotificationsModal();
}

async function displayNotificationsModal() {
    await loadNotifications();
    const listContainer = document.getElementById('notificationsList');
    if (!listContainer) return;
    
    if (notificationsList.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#666;">No notifications</p>';
    } else {
        listContainer.innerHTML = notificationsList.map(n => `
            <div class="notification-item ${n.is_read ? 'notification-read' : 'notification-unread'}" onclick="markNotificationRead(${n.id})">
                <div style="font-weight:bold;">${escapeHtml(n.title)}</div>
                <div style="font-size:12px; color:#666; margin-top:5px;">${escapeHtml(n.message)}</div>
                <div style="font-size:10px; color:#999; margin-top:5px;">${new Date(n.created_at).toLocaleString()}</div>
            </div>
        `).join('');
    }
    openModal('notificationsModal');
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function markNotificationRead(id) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    await loadNotifications();
    displayNotificationsModal();
}

async function markAllNotificationsRead() {
    await fetch('/api/notifications/read-all', { method: 'PUT' });
    await loadNotifications();
    displayNotificationsModal();
}

async function checkLowStock() {
    try {
        await fetch('/api/notifications/check-low-stock', { method: 'POST' });
        await loadNotifications();
    } catch(e) { console.error('Error checking low stock:', e); }
}

setInterval(() => { checkLowStock(); }, 5 * 60 * 1000);
setTimeout(() => { checkLowStock(); loadNotifications(); }, 5000);

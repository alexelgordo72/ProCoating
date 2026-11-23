let currentUser = null;
let charts = {};

async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) { window.location.href = '/login.html'; return false; }
        currentUser = await res.json();
        document.getElementById('userName').innerText = currentUser.username;
        document.getElementById('userRole').innerText = currentUser.role;
        loadNotifications();
        return true;
    } catch(error) { window.location.href = '/login.html'; return false; }
}

async function logout() { 
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); 
    window.location.href = '/login.html'; 
}

async function loadPage(page) {
    if (!currentUser) return;
    if (page === 'dashboard') await loadDashboard();
    else if (page === 'customers') await loadCustomers();
    else if (page === 'equipment') await loadEquipment();
    else if (page === 'rentals') await loadRentals();
    else if (page === 'workorders') await loadWorkOrders();
    else if (page === 'inventory') await loadInventory();
    else if (page === 'purchaseorders') await loadPurchaseOrders();
    else if (page === 'reports') await loadReports();
    else if (page === 'backup') await loadBackup();
    else if (page === 'audit') loadAuditLogs();
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

const darkModeToggle = document.getElementById('darkModeToggle');
function initDarkMode() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        if (darkModeToggle) darkModeToggle.textContent = '🌙';
    }
}
function toggleDarkMode() {
    if (document.body.classList.contains('dark-mode')) {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if (darkModeToggle) darkModeToggle.textContent = '🌙';
    } else {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (darkModeToggle) darkModeToggle.textContent = '☀️';
    }
}
if (darkModeToggle) darkModeToggle.addEventListener('click', toggleDarkMode);
initDarkMode();

checkAuth().then(() => loadPage('dashboard'));

// ============ BACKUP FUNCTIONS ============
async function loadBackup() {
    try {
        const res = await fetch('/api/backup/list');
        const backups = await res.json();
        
        let backupsHtml = '';
        if (backups.length === 0) {
            backupsHtml = '<tr><td colspan="4" style="text-align:center;">No backups found. Click "Run Backup Now" to create one.</td></tr>';
        } else {
            backupsHtml = backups.map(b => `
                <tr>
                    <td>${b.name}</td>
                    <td>${b.date_str || '-'}</td>
                    <td>${b.size_mb ? b.size_mb + ' MB' : '-'}</td>
                    <td>
                        <button class="btn-secondary" onclick="window.downloadBackup('${b.name}')">Download</button>
                        <button class="btn-danger" onclick="window.deleteBackup('${b.name}')">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
        
        document.getElementById('mainContent').innerHTML = `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                    <h2>💾 Backup Management</h2>
                    <button class="btn btn-success" onclick="window.runBackup()" id="backupBtn">🔄 Run Backup Now</button>
                </div>
                <p style="margin-top:1rem;">Automatic backups run daily at 2:00 AM.</p>
            </div>
            
            <div class="card">
                <h3>📋 Available Backups</h3>
                <div id="backupStatus"></div>
                <div class="table-container">
                    <table style="width:100%">
                        <thead>
                            <tr><th>Backup Name</th><th>Date</th><th>Size</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            ${backupsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch(e) {
        document.getElementById('mainContent').innerHTML = `<div class="card">Error loading backup: ${e.message}</div>`;
    }
}

window.runBackup = async function() {
    const btn = document.getElementById('backupBtn');
    const statusDiv = document.getElementById('backupStatus');
    
    if (btn) {
        btn.innerHTML = 'Running...';
        btn.disabled = true;
    }
    if (statusDiv) statusDiv.innerHTML = '<div style="background:#cfe2ff; padding:10px; border-radius:8px;">Creating backup...</div>';
    
    try {
        const res = await fetch('/api/backup/run', { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
            if (statusDiv) statusDiv.innerHTML = '<div style="background:#d4edda; padding:10px; border-radius:8px;">Backup completed!</div>';
            setTimeout(() => loadBackup(), 1500);
        } else {
            if (statusDiv) statusDiv.innerHTML = '<div style="background:#f8d7da; padding:10px; border-radius:8px;">Backup failed: ' + data.error + '</div>';
        }
    } catch(e) {
        if (statusDiv) statusDiv.innerHTML = '<div style="background:#f8d7da; padding:10px; border-radius:8px;">Error: ' + e.message + '</div>';
    } finally {
        if (btn) {
            btn.innerHTML = 'Run Backup Now';
            btn.disabled = false;
        }
    }
};

window.downloadBackup = function(filename) {
    window.open('/api/backup/download/' + filename, '_blank');
};

window.deleteBackup = async function(filename) {
    if (confirm('Delete ' + filename + '?')) {
        const res = await fetch('/api/backup/delete/' + filename, { method: 'DELETE' });
        if (res.ok) {
            loadBackup();
            alert('Backup deleted');
        } else {
            alert('Error deleting backup');
        }
    }
};

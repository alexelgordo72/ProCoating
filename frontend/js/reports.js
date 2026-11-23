// ============ REPORTS ============
async function loadReports() {
    document.getElementById('mainContent').innerHTML = `
        <div class="card"><h2>📊 Reports</h2><p>Generate Excel reports for different areas of the system.</p></div>
        
        <div class="card"><h3>📄 Rentals Report</h3>
            <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-top:1rem;">
                <div class="form-group" style="flex:1;"><label>Start Date</label><input type="date" id="rentalsStartDate" class="form-control"></div>
                <div class="form-group" style="flex:1;"><label>End Date</label><input type="date" id="rentalsEndDate" class="form-control"></div>
                <div><button class="btn" onclick="downloadRentalsExcel()">📥 Download Excel</button></div>
            </div>
        </div>
        
        <div class="card"><h3>🔧 Work Orders Report</h3>
            <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-top:1rem;">
                <div class="form-group" style="flex:1;"><label>Start Date</label><input type="date" id="woStartDate" class="form-control"></div>
                <div class="form-group" style="flex:1;"><label>End Date</label><input type="date" id="woEndDate" class="form-control"></div>
                <div class="form-group" style="flex:1;"><label>Status</label><select id="woStatus" class="form-control"><option value="">All</option><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div>
                <div><button class="btn" onclick="downloadWorkOrdersExcel()">📥 Download Excel</button></div>
            </div>
        </div>
        
        <div class="card"><h3>📦 Inventory Report</h3>
            <div style="margin-top:1rem;"><button class="btn" onclick="downloadInventoryExcel()">📥 Download Excel</button></div>
        </div>
        
        <div class="card"><h3>💰 Financial Report</h3>
            <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-top:1rem;">
                <div class="form-group" style="flex:1;"><label>Year</label><input type="number" id="financialYear" placeholder="2024" class="form-control"></div>
                <div class="form-group" style="flex:1;"><label>Month</label><select id="financialMonth" class="form-control"><option value="">All Year</option><option value="1">January</option><option value="2">February</option><option value="3">March</option><option value="4">April</option><option value="5">May</option><option value="6">June</option><option value="7">July</option><option value="8">August</option><option value="9">September</option><option value="10">October</option><option value="11">November</option><option value="12">December</option></select></div>
                <div><button class="btn" onclick="downloadFinancialExcel()">📥 Download Excel</button></div>
            </div>
        </div>
    `;
}

function downloadRentalsExcel() {
    const startDate = document.getElementById('rentalsStartDate')?.value;
    const endDate = document.getElementById('rentalsEndDate')?.value;
    let url = '/api/reports/rentals/excel';
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length) url += '?' + params.join('&');
    window.open(url, '_blank');
}

function downloadWorkOrdersExcel() {
    const startDate = document.getElementById('woStartDate')?.value;
    const endDate = document.getElementById('woEndDate')?.value;
    const status = document.getElementById('woStatus')?.value;
    let url = '/api/reports/workorders/excel';
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (status) params.push(`status=${status}`);
    if (params.length) url += '?' + params.join('&');
    window.open(url, '_blank');
}

function downloadInventoryExcel() { window.open('/api/reports/inventory/excel', '_blank'); }

function downloadFinancialExcel() {
    const year = document.getElementById('financialYear')?.value;
    const month = document.getElementById('financialMonth')?.value;
    let url = '/api/reports/financial/excel';
    const params = [];
    if (year) params.push(`year=${year}`);
    if (month) params.push(`month=${month}`);
    if (params.length) url += '?' + params.join('&');
    window.open(url, '_blank');
}

// ============ BACKUP ============
async function loadBackup() {
    try {
        const res = await fetch('/api/backup/list');
        const backups = await res.json();
        
        document.getElementById('mainContent').innerHTML = `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                    <h2>💾 Backup Management</h2>
                    <button class="btn btn-success" onclick="runBackup()" id="backupBtn">🔄 Run Backup Now</button>
                </div>
                <p style="margin-top:1rem;">Automatic backups run daily at 2:00 AM.</p>
            </div>
            
            <div class="card">
                <h3>📋 Available Backups</h3>
                <div id="backupStatus"></div>
                <div class="table-container">
                    <table style="width:100%">
                        <thead><tr><th>Backup Name</th><th>Date</th><th>Size</th><th>Actions</th></tr></thead>
                        <tbody id="backupsList">
                            ${backups.map(b => `
                                <tr>
                                    <td>${b.name}</td>
                                    <td>${b.date_str}</td>
                                    <td>${b.size_mb} MB</td>
                                    <td>
                                        <button class="btn-secondary" onclick="downloadBackup('${b.name}')">Download</button>
                                        <button class="btn-danger" onclick="deleteBackup('${b.name}')">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${backups.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No backups found. Click "Run Backup Now" to create one.寛</td></tr>' : ''}
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
        btn.innerHTML = '⏳ Running...';
        btn.disabled = true;
    }
    if (statusDiv) statusDiv.innerHTML = '<div style="background:#cfe2ff; padding:10px; border-radius:8px;">Creating backup...</div>';
    
    try {
        const res = await fetch('/api/backup/run', { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
            if (statusDiv) statusDiv.innerHTML = '<div style="background:#d4edda; padding:10px; border-radius:8px;">✅ Backup completed successfully!</div>';
            setTimeout(() => loadBackup(), 1500);
        } else {
            if (statusDiv) statusDiv.innerHTML = `<div style="background:#f8d7da; padding:10px; border-radius:8px;">❌ Backup failed: ${data.error}</div>`;
        }
    } catch(e) {
        if (statusDiv) statusDiv.innerHTML = `<div style="background:#f8d7da; padding:10px; border-radius:8px;">❌ Error: ${e.message}</div>`;
    } finally {
        if (btn) {
            btn.innerHTML = '🔄 Run Backup Now';
            btn.disabled = false;
        }
    }
};

window.downloadBackup = function(filename) {
    window.open(`/api/backup/download/${filename}`, '_blank');
};

window.deleteBackup = async function(filename) {
    if (confirm(`Delete ${filename}?`)) {
        const res = await fetch(`/api/backup/delete/${filename}`, { method: 'DELETE' });
        if (res.ok) {
            loadBackup();
            alert('Backup deleted');
        } else {
            alert('Error deleting backup');
        }
    }
};

// ============ AUDIT LOGS ============
let currentPage = 1;
let itemsPerPage = 50;

async function loadAuditLogs() {
    try {
        const [logsRes, actionsRes, entitiesRes, countRes] = await Promise.all([
            fetch(`/api/audit-logs?limit=${itemsPerPage}&offset=${(currentPage-1)*itemsPerPage}`),
            fetch('/api/audit-logs/actions'),
            fetch('/api/audit-logs/entities'),
            fetch('/api/audit-logs/count')
        ]);
        
        const logs = await logsRes.json();
        const actions = await actionsRes.json();
        const entities = await entitiesRes.json();
        const count = await countRes.json();
        const totalPages = Math.ceil(count.count / itemsPerPage);
        
        let logsHtml = '';
        if (logs.length === 0) {
            logsHtml = '<tr><td colspan="7" style="text-align:center;">No logs found. Perform some actions to see them here.</td></tr>';
        } else {
            logsHtml = logs.map(log => `
                <tr>
                    <td>${new Date(log.created_at).toLocaleString()}</td>
                    <td>${log.username || log.user_name || '-'}</td>
                    <td>${log.action}</td>
                    <td>${log.entity_type || '-'}${log.entity_id ? ` #${log.entity_id}` : ''}</td>
                    <td>${log.details || '-'}</td>
                    <td>${log.ip_address || '-'}</td>
                </tr>
            `).join('');
        }
        
        document.getElementById('mainContent').innerHTML = `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                    <h2>📋 Audit Logs</h2>
                    <button class="btn" onclick="applyFilters()">🔍 Apply Filters</button>
                </div>
                <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-top:1rem;">
                    <div class="form-group" style="flex:1;">
                        <label>Action</label>
                        <select id="filterAction" class="form-control">
                            <option value="">All Actions</option>
                            ${actions.map(a => `<option value="${a}">${a}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label>Entity Type</label>
                        <select id="filterEntity" class="form-control">
                            <option value="">All Entities</option>
                            ${entities.map(e => `<option value="${e}">${e}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label>Start Date</label>
                        <input type="date" id="filterStartDate" class="form-control">
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label>End Date</label>
                        <input type="date" id="filterEndDate" class="form-control">
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>📝 Activity Log</h3>
                <div class="table-container">
                    <table style="width:100%">
                        <thead>
                            <tr><th>Date/Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th><th>IP Address</th></tr>
                        </thead>
                        <tbody>
                            ${logsHtml}
                        </tbody>
                    </table>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem;">
                    <div>Page ${currentPage} of ${totalPages}</div>
                    <div>
                        <button class="btn-secondary" onclick="prevPage()" ${currentPage <= 1 ? 'disabled' : ''}>Previous</button>
                        <button class="btn-secondary" onclick="nextPage()" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
                    </div>
                </div>
            </div>
        `;
    } catch(e) {
        document.getElementById('mainContent').innerHTML = `<div class="card">Error loading audit logs: ${e.message}</div>`;
    }
}

async function applyFilters() {
    const action = document.getElementById('filterAction')?.value;
    const entity = document.getElementById('filterEntity')?.value;
    const startDate = document.getElementById('filterStartDate')?.value;
    const endDate = document.getElementById('filterEndDate')?.value;
    
    currentPage = 1;
    
    try {
        let url = `/api/audit-logs?limit=${itemsPerPage}&offset=0`;
        if (action) url += `&action=${action}`;
        if (entity) url += `&entity_type=${entity}`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        
        const logsRes = await fetch(url);
        const countRes = await fetch(`/api/audit-logs/count?action=${action || ''}&entity_type=${entity || ''}&start_date=${startDate || ''}&end_date=${endDate || ''}`);
        
        const logs = await logsRes.json();
        const count = await countRes.json();
        const totalPages = Math.ceil(count.count / itemsPerPage);
        
        let logsHtml = '';
        if (logs.length === 0) {
            logsHtml = '<tr><td colspan="7" style="text-align:center;">No logs found.</td></tr>';
        } else {
            logsHtml = logs.map(log => `
                <tr>
                    <td>${new Date(log.created_at).toLocaleString()}</td>
                    <td>${log.username || log.user_name || '-'}</td>
                    <td>${log.action}</td>
                    <td>${log.entity_type || '-'}${log.entity_id ? ` #${log.entity_id}` : ''}</td>
                    <td>${log.details || '-'}</td>
                    <td>${log.ip_address || '-'}</td>
                </tr>
            `).join('');
        }
        
        const tbody = document.querySelector('#mainContent tbody');
        if (tbody) tbody.innerHTML = logsHtml;
        
        const paginationDiv = document.querySelector('#mainContent .card:last-child div:last-child');
        if (paginationDiv) {
            paginationDiv.innerHTML = `
                <div>Page 1 of ${totalPages}</div>
                <div>
                    <button class="btn-secondary" onclick="prevPage()" disabled>Previous</button>
                    <button class="btn-secondary" onclick="nextPage()" ${totalPages <= 1 ? 'disabled' : ''}>Next</button>
                </div>
            `;
        }
    } catch(e) {
        console.error('Error applying filters:', e);
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadAuditLogs();
    }
}

function nextPage() {
    currentPage++;
    loadAuditLogs();
}

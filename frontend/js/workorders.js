let customersList = [];
let equipmentList = [];

async function loadWorkOrders() {
    const res = await fetch('/api/workorders');
    const workorders = await res.json();
    document.getElementById('mainContent').innerHTML = `
        <div class="card"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
            <h2>Work Orders</h2>
            <div><button class="btn" onclick="showNewWorkOrder()">+ New Work Order</button><button class="btn btn-secondary" onclick="showNewWorkOrder(true)">🚨 Emergency</button></div>
        </div>
        <div class="table-container" style="margin-top:1rem;">
            <table style="width:100%">
                <thead><tr><th>#WO</th><th>Customer</th><th>Equipment</th><th>Priority</th><th>Status</th><th>Start</th><th>Actions</th></tr></thead>
                <tbody>
                    ${workorders.map(w => `
                        <tr>
                            <td data-label="#WO">${w.wo_number || '-'}</td>
                            <td data-label="Customer">${w.customer_name || '-'}</td>
                            <td data-label="Equipment">${w.equipment_model || '-'}</td>
                            <td data-label="Priority" class="priority-${w.priority}">${w.priority || 'normal'}</td>
                            <td data-label="Status" class="status-${w.status}">${w.status || 'pending'}</td>
                            <td data-label="Start">${w.start_date ? new Date(w.start_date).toLocaleDateString() : '-'}</td>
                            <td data-label="Actions"><button class="btn-secondary" onclick="viewWorkOrder(${w.id})">View Details</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    document.getElementById('woModal')?.remove();
    document.getElementById('newWoModal')?.remove();
    const woModal = document.createElement('div');
    woModal.id = 'woModal';
    woModal.className = 'modal';
    woModal.innerHTML = '<div class="modal-content" id="woModalContent"></div>';
    document.body.appendChild(woModal);
    const newWoModal = document.createElement('div');
    newWoModal.id = 'newWoModal';
    newWoModal.className = 'modal';
    newWoModal.innerHTML = '<div class="modal-content"><span class="close" onclick="closeModal(\'newWoModal\')">&times;</span><div id="newWoFormContent"></div></div>';
    document.body.appendChild(newWoModal);
}

async function showNewWorkOrder(isEmergency) {
    await loadCustomersAndEquipment();
    document.getElementById('newWoFormContent').innerHTML = `
        <h3>New Work Order ${isEmergency ? '🚨 EMERGENCY' : ''}</h3>
        <div class="form-group"><label>WO Number</label><input id="woNumber" value="WO${Date.now().toString().slice(-8)}" class="form-control"></div>
        <div class="form-group"><label>Customer</label><select id="woCustomerId" class="form-control"><option value="">Select Customer</option>${customersList.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Equipment</label><select id="woEquipmentId" class="form-control"><option value="">Select Equipment</option>${equipmentList.map(e => `<option value="${e.id}">${e.model}</option>`).join('')}</select></div>
        <div class="form-group"><label>Priority</label><select id="woPriority" class="form-control"><option value="normal">Normal</option><option value="emergency" ${isEmergency ? 'selected' : ''}>Emergency</option><option value="scheduled">Scheduled</option></select></div>
        <div class="form-group"><label>Reported Issue</label><textarea id="woIssue" rows="3" class="form-control"></textarea></div>
        <div class="form-group"><label><input type="checkbox" id="woWarranty"> Warranty (no cost)</label></div>
        <button class="btn" onclick="saveWorkOrder()">Create</button>
        <button class="btn-secondary" onclick="closeModal('newWoModal')">Cancel</button>
    `;
    openModal('newWoModal');
}

async function loadCustomersAndEquipment() {
    customersList = await (await fetch('/api/customers')).json();
    equipmentList = await (await fetch('/api/equipment')).json();
}

async function saveWorkOrder() {
    const data = { 
        wo_number: document.getElementById('woNumber').value, 
        customer_id: document.getElementById('woCustomerId').value, 
        equipment_id: document.getElementById('woEquipmentId').value, 
        priority: document.getElementById('woPriority').value, 
        reported_issue: document.getElementById('woIssue').value, 
        is_warranty: document.getElementById('woWarranty').checked 
    };
    if (!data.customer_id || !data.equipment_id) { alert('Please select customer and equipment'); return; }
    const res = await fetch('/api/workorders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) { closeModal('newWoModal'); loadWorkOrders(); alert('Work Order created'); } 
    else alert('Error');
}

async function viewWorkOrder(id) {
    const [woRes, photosRes, costsRes] = await Promise.all([
        fetch(`/api/workorders/${id}`),
        fetch(`/api/workorders/${id}/photos`),
        fetch(`/api/workorders/${id}/costs`)
    ]);
    const wo = await woRes.json();
    const photos = await photosRes.json();
    const costs = await costsRes.json();
    
    document.getElementById('woModalContent').innerHTML = `
        <span class="close" onclick="closeModal('woModal')">&times;</span>
        <h2>Work Order #${wo.wo_number}</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div><strong>Customer:</strong> ${wo.customer_name || '-'}</div>
            <div><strong>Equipment:</strong> ${wo.equipment_model || '-'}</div>
            <div><strong>Priority:</strong> <span class="priority-${wo.priority}">${wo.priority}</span></div>
            <div><strong>Status:</strong> <span class="status-${wo.status}">${wo.status}</span></div>
            <div><strong>Start Date:</strong> ${new Date(wo.start_date).toLocaleDateString()}</div>
            <div><strong>End Date:</strong> ${wo.end_date ? new Date(wo.end_date).toLocaleDateString() : '-'}</div>
        </div>
        <div class="card" style="margin:10px 0;"><strong>Reported Issue:</strong><br>${wo.reported_issue || '-'}</div>
        <div><strong>Diagnosis:</strong><br><textarea id="editDiagnosis" rows="2" style="width:100%;padding:8px;">${wo.diagnosis || ''}</textarea></div>
        <div><strong>Solution:</strong><br><textarea id="editSolution" rows="2" style="width:100%;padding:8px;">${wo.solution || ''}</textarea></div>
        <div><strong>Internal Cost:</strong> $<input type="number" step="0.01" id="editCost" value="${wo.internal_cost || 0}" style="width:150px;"></div>
        
        <h3>💰 Costs</h3>
        <div style="margin:10px 0;padding:10px;background:#f8f9fa;border-radius:8px;">
            ${costs.map(c => `<div>$${c.amount} - ${c.description}</div>`).join('') || 'No costs added'}
        </div>
        <div><input id="newCostDesc" placeholder="Description" style="width:55%;padding:5px;"><input id="newCostAmount" type="number" placeholder="Amount" step="0.01" style="width:25%;padding:5px;"><button class="btn-secondary" onclick="addCost(${id})">+ Add Cost</button></div>
        
        <h3>📸 Photos</h3>
        <div class="photo-grid" id="photosGrid">
            ${photos.map(p => `
                <div class="photo-item">
                    <a href="${p.image_url}" target="_blank"><img src="${p.image_url}" onerror="this.src='https://via.placeholder.com/150?text=No+Image'"></a>
                    <small>${p.description || ''}</small>
                    <button class="btn-danger" style="display:block;width:100%;margin-top:5px;" onclick="deletePhoto(${p.id}, ${id})">Delete</button>
                </div>
            `).join('') || 'No photos'}
        </div>
        <form id="photoForm" enctype="multipart/form-data" style="margin:10px 0;padding:10px;background:#f8f9fa;border-radius:8px;">
            <input type="file" id="photoFile" accept="image/*">
            <input type="text" id="photoDesc" placeholder="Description" style="width:60%;margin:5px 0;">
            <button type="button" class="btn" onclick="uploadPhoto(${id})">Upload Photo</button>
        </form>
        
        <div style="margin-top:20px;">
            <button class="btn" onclick="updateWorkOrder(${id})">💾 Save Changes</button>
            <button class="btn-success" onclick="updateWorkOrderStatus(${id}, 'in_progress')">▶ Start</button>
            <button class="btn-success" onclick="updateWorkOrderStatus(${id}, 'completed')">✅ Complete</button>
        </div>
    `;
    openModal('woModal');
}

async function updateWorkOrder(id) {
    const data = { diagnosis: document.getElementById('editDiagnosis').value, solution: document.getElementById('editSolution').value, internal_cost: parseFloat(document.getElementById('editCost').value) };
    const res = await fetch(`/api/workorders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) { closeModal('woModal'); loadWorkOrders(); alert('Work Order updated'); } 
    else alert('Error');
}

async function updateWorkOrderStatus(id, status) {
    const res = await fetch(`/api/workorders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status, end_date: status === 'completed' ? new Date().toISOString() : null }) });
    if (res.ok) { closeModal('woModal'); loadWorkOrders(); alert(`Status updated to ${status}`); } 
    else alert('Error');
}

async function uploadPhoto(id) {
    const file = document.getElementById('photoFile').files[0];
    const description = document.getElementById('photoDesc').value;
    if (!file) { alert('Select a file'); return; }
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('description', description);
    const res = await fetch(`/api/workorders/${id}/photos`, { method: 'POST', body: formData });
    if (res.ok) { alert('Photo uploaded'); viewWorkOrder(id); } 
    else alert('Error');
}

async function deletePhoto(photoId, woId) {
    if (confirm('Delete this photo?')) { await fetch(`/api/workorders/photos/${photoId}`, { method: 'DELETE' }); viewWorkOrder(woId); }
}

async function addCost(woId) {
    const description = document.getElementById('newCostDesc').value;
    const amount = parseFloat(document.getElementById('newCostAmount').value);
    if (!description || !amount) { alert('Enter description and amount'); return; }
    const res = await fetch(`/api/workorders/${woId}/costs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description, amount }) });
    if (res.ok) { viewWorkOrder(woId); alert('Cost added'); } 
    else alert('Error');
}

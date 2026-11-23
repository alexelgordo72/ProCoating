async function loadRentals() {
    const res = await fetch('/api/rentals');
    const rentals = await res.json();
    document.getElementById('mainContent').innerHTML = `
        <div class="card"><div style="display:flex;justify-content:space-between;"><h2>Rentals / Deliveries</h2><button class="btn" onclick="showNewRental()">+ New Rental</button></div>
        <table style="width:100%;margin-top:1rem;"><thead><tr><th>#</th><th>Customer</th><th>Equipment</th><th>Start</th><th>End</th><th>Total</th><th>Actions</th></tr></thead><tbody>
        ${rentals.map(r => `<tr><td data-label="#">${r.rental_number}</td><td data-label="Customer">${r.customer_name || '-'}</td><td data-label="Equipment">${r.equipment_model || '-'}</td><td data-label="Start">${new Date(r.start_date).toLocaleDateString()}</td><td data-label="End">${r.end_date ? new Date(r.end_date).toLocaleDateString() : '-'}</td><td data-label="Total">$${r.subtotal}</td><td data-label="Actions"><button class="btn-pdf" onclick="downloadPDF(${r.id})">📄 PDF</button></td></tr>`).join('')}
        </tbody></tr></div>
        <div id="rentalModal" class="modal"><div class="modal-content"><span class="close" onclick="closeModal('rentalModal')">&times;</span><h3>New Rental</h3>
        <div class="form-group"><label>Rental #</label><input id="rentalNumber"></div><div class="form-group"><label>Customer</label><select id="customerId"></select></div>
        <div class="form-group"><label>Equipment</label><select id="equipmentId"></select></div><div class="form-group"><label>Start Date</label><input type="date" id="startDate"></div>
        <div class="form-group"><label>End Date</label><input type="date" id="endDate"></div><div class="form-group"><label>Notes</label><textarea id="rentalNotes"></textarea></div>
        <button class="btn" onclick="saveRental()">Create</button></div></div>`;
    const customers = await (await fetch('/api/customers')).json();
    const equipment = await (await fetch('/api/equipment')).json();
    document.getElementById('customerId').innerHTML = '<option value="">Select</option>' + customers.map(c => `<option value="${c.id}">${c.name}</option>`);
    document.getElementById('equipmentId').innerHTML = '<option value="">Select</option>' + equipment.map(e => `<option value="${e.id}">${e.model} - $${e.daily_rate}/day</option>`);
}

function showNewRental() { openModal('rentalModal'); }

async function saveRental() {
    const data = { rental_number: document.getElementById('rentalNumber').value, customer_id: document.getElementById('customerId').value, equipment_id: document.getElementById('equipmentId').value, start_date: document.getElementById('startDate').value, end_date: document.getElementById('endDate').value, notes: document.getElementById('rentalNotes').value };
    const res = await fetch('/api/rentals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) { closeModal('rentalModal'); loadRentals(); alert('Rental created'); } else alert('Error');
}

function downloadPDF(id) { window.open(`/api/rentals/${id}/pdf`, '_blank'); }

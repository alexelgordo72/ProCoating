async function loadCustomers() {
    const res = await fetch('/api/customers');
    const customers = await res.json();
    document.getElementById('mainContent').innerHTML = `
        <div class="card"><div style="display:flex;justify-content:space-between;"><h2>Customers</h2><button class="btn" onclick="showAddCustomer()">+ New</button></div>
        <table style="width:100%;margin-top:1rem;"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Actions</th></tr></thead><tbody>
        ${customers.map(c => `<tr><td data-label="Name">${c.name}</td><td data-label="Phone">${c.phone || '-'}</td><td data-label="Email">${c.email || '-'}</td><td data-label="Actions"><button class="btn-danger" onclick="deleteCustomer(${c.id})">Delete</button></td></tr>`).join('')}
        </tbody></table></div>
        <div id="customerModal" class="modal"><div class="modal-content"><span class="close" onclick="closeModal('customerModal')">&times;</span><h3>New Customer</h3>
        <div class="form-group"><label>Name</label><input id="custName"></div><div class="form-group"><label>Phone</label><input id="custPhone"></div>
        <div class="form-group"><label>Email</label><input id="custEmail"></div><div class="form-group"><label>Address</label><textarea id="custAddress"></textarea></div>
        <button class="btn" onclick="addCustomer()">Save</button></div></div>`;
}

function showAddCustomer() { openModal('customerModal'); }

async function addCustomer() {
    const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: document.getElementById('custName').value, phone: document.getElementById('custPhone').value, email: document.getElementById('custEmail').value, address: document.getElementById('custAddress').value }) });
    if (res.ok) { closeModal('customerModal'); loadCustomers(); alert('Customer added'); } else alert('Error');
}

async function deleteCustomer(id) { if (confirm('Delete?')) { await fetch(`/api/customers/${id}`, { method: 'DELETE' }); loadCustomers(); } }

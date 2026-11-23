let suppliersData = [];
let partsData = [];
let poItems = [];

async function loadPurchaseOrders() {
    try {
        const [suppliersRes, poRes] = await Promise.all([
            fetch('/api/suppliers'),
            fetch('/api/purchase-orders')
        ]);
        const suppliers = await suppliersRes.json();
        const purchaseOrders = await poRes.json();
        
        document.getElementById('mainContent').innerHTML = `
            <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
                    <h2>📋 Purchase Orders</h2>
                    <button class="btn" onclick="showNewPurchaseOrder()">+ New Purchase Order</button>
                </div>
                ${purchaseOrders.length === 0 ? '<p>No purchase orders found.</p>' : `
                <div class="table-container" style="margin-top:1rem;">
                    <table style="width:100%">
                        <thead>
                            <tr><th>PO #</th><th>Supplier</th><th>Order Date</th><th>Expected Date</th><th>Total</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            ${purchaseOrders.map(po => `
                                <tr>
                                    <td data-label="PO #">${po.po_number || '-'}</td>
                                    <td data-label="Supplier">${po.supplier_name || '-'}</td>
                                    <td data-label="Order Date">${po.order_date ? new Date(po.order_date).toLocaleDateString() : '-'}</td>
                                    <td data-label="Expected Date">${po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '-'}</td>
                                    <td data-label="Total">$${po.total || 0}</td>
                                    <td data-label="Status">${po.status === 'received' ? '✅ Received' : po.status === 'cancelled' ? '❌ Cancelled' : '⏳ Pending'}</td>
                                    <td data-label="Actions">
                                        <button class="btn-secondary" onclick="viewPurchaseOrder(${po.id})">View</button>
                                        ${po.status === 'pending' ? `<button class="btn-success" onclick="receivePurchaseOrder(${po.id})">Receive</button>` : ''}
                                        ${po.status === 'pending' ? `<button class="btn-danger" onclick="cancelPurchaseOrder(${po.id})">Cancel</button>` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                `}
            </div>
        `;
        
        // Remove old modals if they exist to avoid duplicates
        const oldPoModal = document.getElementById('poModal');
        const oldReceiveModal = document.getElementById('receiveModal');
        if (oldPoModal) oldPoModal.remove();
        if (oldReceiveModal) oldReceiveModal.remove();
        
        const poModal = document.createElement('div');
        poModal.id = 'poModal';
        poModal.className = 'modal';
        poModal.innerHTML = '<div class="modal-content" id="poModalContent"></div>';
        document.body.appendChild(poModal);
        
        const receiveModal = document.createElement('div');
        receiveModal.id = 'receiveModal';
        receiveModal.className = 'modal';
        receiveModal.innerHTML = '<div class="modal-content" id="receiveModalContent"></div>';
        document.body.appendChild(receiveModal);
        
    } catch(e) {
        console.error('Error:', e);
        document.getElementById('mainContent').innerHTML = `<div class="card">Error loading purchase orders: ${e.message}</div>`;
    }
}

async function showNewPurchaseOrder() {
    const [suppliers, parts] = await Promise.all([
        fetch('/api/suppliers').then(r => r.json()),
        fetch('/api/spare-parts').then(r => r.json())
    ]);
    suppliersData = suppliers;
    partsData = parts;
    poItems = [];
    
    const poNumber = 'PO' + new Date().getFullYear() + '-' + (Math.floor(Math.random() * 1000));
    const today = new Date().toISOString().split('T')[0];
    
    document.getElementById('poModalContent').innerHTML = `
        <span class="close" onclick="closeModal('poModal')">&times;</span>
        <h3>New Purchase Order</h3>
        <div class="form-group"><label>PO Number *</label><input id="poNumber" value="${poNumber}" class="form-control"></div>
        <div class="form-group"><label>Supplier *</label>
            <select id="poSupplierId" class="form-control">
                <option value="">Select Supplier</option>
                ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group"><label>Order Date</label><input type="date" id="poOrderDate" value="${today}" class="form-control"></div>
        <div class="form-group"><label>Expected Date</label><input type="date" id="poExpectedDate" class="form-control"></div>
        <div class="form-group"><label>Notes</label><textarea id="poNotes" rows="2" class="form-control"></textarea></div>
        <h4>Items</h4>
        <div id="poItemsList"></div>
        <button type="button" class="btn" onclick="addPOItem()">+ Add Item</button>
        <br><br>
        <button type="button" class="btn" onclick="savePurchaseOrder()">Create Purchase Order</button>
        <button type="button" class="btn-secondary" onclick="closeModal('poModal')">Cancel</button>
    `;
    openModal('poModal');
}

function addPOItem() {
    const itemIndex = poItems.length;
    const itemHtml = `
        <div id="poItem_${itemIndex}" style="border:1px solid #ddd;padding:10px;margin:10px 0;border-radius:8px;">
            <select id="poItemPart_${itemIndex}" style="width:45%;padding:5px;margin-right:5px;" class="form-control">
                <option value="">Select Part</option>
                ${partsData.map(p => `<option value="${p.id}" data-price="${p.unit_price}">${p.part_number} - ${p.name} (Stock: ${p.stock_quantity})</option>`)}
            </select>
            <input type="number" id="poItemQty_${itemIndex}" placeholder="Qty" style="width:15%;padding:5px;margin-right:5px;" class="form-control">
            <input type="number" id="poItemPrice_${itemIndex}" placeholder="Price" step="0.01" style="width:20%;padding:5px;margin-right:5px;" class="form-control">
            <button type="button" class="btn-danger" onclick="removePOItem(${itemIndex})" style="padding:5px 10px;">Remove</button>
        </div>
    `;
    document.getElementById('poItemsList').insertAdjacentHTML('beforeend', itemHtml);
    poItems.push(itemIndex);
    
    document.getElementById(`poItemPart_${itemIndex}`).addEventListener('change', function() {
        const selected = this.options[this.selectedIndex];
        const price = selected.getAttribute('data-price');
        if (price && price !== '0') {
            document.getElementById(`poItemPrice_${itemIndex}`).value = price;
        }
    });
}

function removePOItem(index) {
    const element = document.getElementById(`poItem_${index}`);
    if (element) element.remove();
    poItems = poItems.filter(i => i !== index);
}

async function savePurchaseOrder() {
    const items = [];
    for (let i = 0; i < poItems.length; i++) {
        const partSelect = document.getElementById(`poItemPart_${i}`);
        const qty = document.getElementById(`poItemQty_${i}`);
        const price = document.getElementById(`poItemPrice_${i}`);
        if (partSelect && partSelect.value && qty && qty.value && price && price.value) {
            items.push({
                spare_part_id: parseInt(partSelect.value),
                quantity_ordered: parseInt(qty.value),
                unit_price: parseFloat(price.value)
            });
        }
    }
    
    const data = {
        po_number: document.getElementById('poNumber').value,
        supplier_id: parseInt(document.getElementById('poSupplierId').value),
        order_date: document.getElementById('poOrderDate').value,
        expected_date: document.getElementById('poExpectedDate').value || null,
        notes: document.getElementById('poNotes').value,
        items: items
    };
    
    if (!data.po_number) { alert('PO Number required'); return; }
    if (!data.supplier_id) { alert('Supplier required'); return; }
    if (items.length === 0) { alert('Add at least one item'); return; }
    
    const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        closeModal('poModal');
        loadPurchaseOrders();
        alert('Purchase Order created successfully');
    } else {
        const err = await res.json();
        alert('Error: ' + err.error);
    }
}

async function viewPurchaseOrder(id) {
    const res = await fetch(`/api/purchase-orders/${id}`);
    const data = await res.json();
    const po = data.purchase_order;
    const items = data.items;
    
    document.getElementById('poModalContent').innerHTML = `
        <span class="close" onclick="closeModal('poModal')">&times;</span>
        <h3>Purchase Order #${po.po_number}</h3>
        <p><strong>Supplier:</strong> ${po.supplier_name}</p>
        <p><strong>Order Date:</strong> ${new Date(po.order_date).toLocaleDateString()}</p>
        <p><strong>Expected Date:</strong> ${po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '-'}</p>
        <p><strong>Status:</strong> ${po.status === 'received' ? '✅ Received' : po.status === 'cancelled' ? '❌ Cancelled' : '⏳ Pending'}</p>
        <p><strong>Total:</strong> $${po.total}</p>
        <h4>Items:</h4>
        <table style="width:100%; border-collapse:collapse;">
            <thead><tr><th>Part</th><th>Ordered</th><th>Received</th><th>Unit Price</th><th>Total</th></tr></thead>
            <tbody>
                ${items.map(i => `
                    <tr>
                        <td>${i.part_number} - ${i.part_name}</td>
                        <td>${i.quantity_ordered}</td>
                        <td>${i.quantity_received || 0}</td>
                        <td>$${i.unit_price}</td>
                        <td>$${i.total}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${po.notes ? `<p><strong>Notes:</strong> ${po.notes}</p>` : ''}
        <button class="btn" onclick="closeModal('poModal')">Close</button>
    `;
    openModal('poModal');
}

async function receivePurchaseOrder(id) {
    const res = await fetch(`/api/purchase-orders/${id}`);
    const data = await res.json();
    const po = data.purchase_order;
    const items = data.items;
    
    document.getElementById('receiveModalContent').innerHTML = `
        <span class="close" onclick="closeModal('receiveModal')">&times;</span>
        <h3>Receive Purchase Order #${po.po_number}</h3>
        <p><strong>Supplier:</strong> ${po.supplier_name}</p>
        <div class="form-group"><label>Received Date</label><input type="date" id="receiveDate" value="${new Date().toISOString().split('T')[0]}" class="form-control"></div>
        <h4>Items to Receive:</h4>
        ${items.map(item => `
            <div style="border:1px solid #ddd; padding:10px; margin:10px 0; border-radius:8px;">
                <strong>${item.part_number} - ${item.part_name}</strong><br>
                Ordered: ${item.quantity_ordered} | Already Received: ${item.quantity_received || 0}<br>
                <label>Quantity Receiving: 
                    <input type="number" id="receiveQty_${item.id}" max="${item.quantity_ordered - (item.quantity_received || 0)}" value="${item.quantity_ordered - (item.quantity_received || 0)}" style="width:100px;" class="form-control">
                </label>
            </div>
        `).join('')}
        <button class="btn" onclick="confirmReceive(${id})">Confirm Receive</button>
        <button class="btn-secondary" onclick="closeModal('receiveModal')">Cancel</button>
    `;
    openModal('receiveModal');
}

async function confirmReceive(poId) {
    const receiveDate = document.getElementById('receiveDate').value;
    const items = [];
    const response = await fetch(`/api/purchase-orders/${poId}`);
    const data = await response.json();
    
    for (const item of data.items) {
        const qtyInput = document.getElementById(`receiveQty_${item.id}`);
        if (qtyInput) {
            const qty = parseInt(qtyInput.value);
            if (qty > 0) {
                items.push({
                    id: item.id,
                    spare_part_id: item.spare_part_id,
                    quantity_received: qty
                });
            }
        }
    }
    
    const res = await fetch(`/api/purchase-orders/${poId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ received_date: receiveDate, items: items })
    });
    
    if (res.ok) {
        closeModal('receiveModal');
        loadPurchaseOrders();
        if (typeof loadInventory === 'function') loadInventory();
        alert('Purchase Order received successfully. Stock updated.');
    } else {
        alert('Error receiving purchase order');
    }
}

async function cancelPurchaseOrder(id) {
    if (confirm('Cancel this purchase order?')) {
        const res = await fetch(`/api/purchase-orders/${id}/cancel`, { method: 'PUT' });
        if (res.ok) {
            loadPurchaseOrders();
            alert('Purchase Order cancelled');
        } else {
            alert('Error cancelling');
        }
    }
}

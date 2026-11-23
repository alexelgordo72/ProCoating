let allPartsCache = [];

async function loadInventory() {
    try {
        const res = await fetch('/api/spare-parts');
        allPartsCache = await res.json();
        renderInventoryTable(allPartsCache);
    } catch(e) {
        document.getElementById('mainContent').innerHTML = `<div class="card">Error loading inventory: ${e.message}</div>`;
    }
}

function filterInventory() {
    const q = (document.getElementById('invSearch')?.value || '').toLowerCase();
    const filtered = allPartsCache.filter(p =>
        (p.part_number || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.supplier_name || '').toLowerCase().includes(q)
    );
    renderInventoryTable(filtered, q);
}

function renderInventoryTable(parts, queryVal = '') {
    const lowStock = allPartsCache.filter(p => p.stock_quantity <= p.min_stock);
    document.getElementById('mainContent').innerHTML = `
        <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <h2>📦 Inventory - Spare Parts & Coatings (${parts.length})</h2>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input id="invSearch" value="${queryVal.replace(/"/g, '&quot;')}" oninput="filterInventory()" placeholder="Search part #, description, vendor..." style="padding:8px 12px;border:1px solid #ccc;border-radius:8px;min-width:240px;">
                    <button class="btn" onclick="showAddPart()">+ New Part</button>
                </div>
            </div>
            ${lowStock.length > 0 ? `<div style="background:#fff3cd;border-left:4px solid #e67e22;padding:10px;border-radius:6px;margin:12px 0;"><strong>⚠️ Stock Alert:</strong> ${lowStock.length} items are at or below minimum stock (use <strong>Adjust / Initial Stock</strong> to load opening balances).</div>` : ''}
            <div class="table-container" style="margin-top:1rem;">
                <table style="width:100%">
                    <thead><tr><th>Part #</th><th>Name / Description</th><th>Category</th><th>Vendor</th><th>Stock</th><th>Min</th><th>Unit Price</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${parts.map(p => `
                            <tr>
                                <td data-label="Part #"><strong>${p.part_number}</strong></td>
                                <td data-label="Name">${p.name}</td>
                                <td data-label="Category">${p.category || '-'}</td>
                                <td data-label="Vendor">${p.supplier_name || '-'}</td>
                                <td data-label="Stock" style="${p.stock_quantity <= p.min_stock ? 'color:#c0392b;font-weight:bold;' : 'color:#27ae60;font-weight:bold;'}">${p.stock_quantity}</td>
                                <td data-label="Min">${p.min_stock}</td>
                                <td data-label="Price">$${Number(p.unit_price || 0).toFixed(2)}</td>
                                <td data-label="Actions" style="white-space:nowrap;">
                                    <button class="btn-secondary" onclick="adjustStockById(${p.id})">+/- Stock</button>
                                    <button class="btn-danger" onclick="deletePart(${p.id})">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        <div id="partModal" class="modal"><div class="modal-content"><span class="close" onclick="closeModal('partModal')">&times;</span><div id="partFormContent"></div></div></div>
        <div id="stockModal" class="modal"><div class="modal-content"><span class="close" onclick="closeModal('stockModal')">&times;</span><div id="stockFormContent"></div></div></div>
    `;
    const inp = document.getElementById('invSearch');
    if (inp && queryVal) { inp.focus(); inp.setSelectionRange(queryVal.length, queryVal.length); }
}

function showAddPart() {
    document.getElementById('partFormContent').innerHTML = `
        <h3>New Spare Part / Chemical</h3>
        <div class="form-group"><label>Part Number *</label><input id="partNumber" placeholder="e.g. SEN00296"></div>
        <div class="form-group"><label>Name *</label><input id="partName" placeholder="Part name"></div>
        <div class="form-group"><label>Description</label><textarea id="partDescription" rows="2"></textarea></div>
        <div class="form-group"><label>Category</label><input id="partCategory" value="Chiller Parts"></div>
        <div class="form-group"><label>Location</label><input id="partLocation" placeholder="Warehouse A, Shelf 2"></div>
        <div class="form-group"><label>Initial Stock</label><input id="partStock" type="number" value="0"></div>
        <div class="form-group"><label>Minimum Stock Alert</label><input id="partMinStock" type="number" value="2"></div>
        <div class="form-group"><label>Unit Price ($)</label><input id="partPrice" type="number" step="0.01" value="0"></div>
        <button class="btn" onclick="savePart()">Save Part</button>
        <button onclick="closeModal('partModal')">Cancel</button>
    `;
    openModal('partModal');
}

async function savePart() {
    const data = {
        part_number: document.getElementById('partNumber').value.trim(),
        name: document.getElementById('partName').value.trim(),
        description: document.getElementById('partDescription').value.trim(),
        category: document.getElementById('partCategory').value.trim(),
        location: document.getElementById('partLocation').value.trim(),
        stock_quantity: parseInt(document.getElementById('partStock').value) || 0,
        min_stock: parseInt(document.getElementById('partMinStock').value) || 2,
        unit_price: parseFloat(document.getElementById('partPrice').value) || 0
    };
    if (!data.part_number || !data.name) { alert('Part Number and Name are required'); return; }
    const res = await fetch('/api/spare-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (res.ok) {
        closeModal('partModal');
        loadInventory();
    } else {
        const err = await res.json();
        alert('Error: ' + err.error);
    }
}

async function deletePart(id) {
    if (confirm('Delete this spare part? This action cannot be undone.')) {
        const res = await fetch(`/api/spare-parts/${id}`, { method: 'DELETE' });
        if (res.ok) loadInventory();
        else alert('Error deleting part');
    }
}

function adjustStockById(id) {
    const part = allPartsCache.find(p => p.id === id);
    if (!part) return;
    document.getElementById('stockFormContent').innerHTML = `
        <h3>Stock Adjustment / Opening Balance</h3>
        <p style="margin:8px 0;"><strong>${part.part_number}</strong> - ${part.name}</p>
        <p style="margin-bottom:12px;">Current Stock: <strong>${part.stock_quantity}</strong></p>
        <div class="form-group"><label>Movement Type</label>
        <select id="stockType">
            <option value="in">+ Add Stock (Opening Balance / Purchase)</option>
            <option value="out">- Remove Stock (Used / Dispatch)</option>
        </select></div>
        <div class="form-group"><label>Quantity</label><input id="stockQuantity" type="number" min="1" value="1"></div>
        <div class="form-group"><label>Reason / Reference</label><textarea id="stockReason" rows="2" placeholder="e.g. Initial physical inventory count"></textarea></div>
        <button class="btn" onclick="saveStockAdjustment(${part.id})">Apply</button>
        <button onclick="closeModal('stockModal')">Cancel</button>
    `;
    openModal('stockModal');
}

async function saveStockAdjustment(partId) {
    const type = document.getElementById('stockType').value;
    const quantity = parseInt(document.getElementById('stockQuantity').value);
    const reason = document.getElementById('stockReason').value.trim();
    if (!quantity || quantity <= 0) { alert('Enter a valid quantity'); return; }
    const res = await fetch('/api/inventory-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_id: partId, type, quantity, reason })
    });
    if (res.ok) {
        closeModal('stockModal');
        loadInventory();
    } else {
        const err = await res.json();
        alert('Error: ' + err.error);
    }
}

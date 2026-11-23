let allEquipmentCache = [];

async function loadEquipment() {
    const res = await fetch('/api/equipment');
    allEquipmentCache = await res.json();
    renderEquipmentGrid(allEquipmentCache);
}

function filterEquipment() {
    const q = (document.getElementById('eqSearch')?.value || '').toLowerCase();
    const filtered = allEquipmentCache.filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.model || '').toLowerCase().includes(q) ||
        (e.serial_number || '').toLowerCase().includes(q) ||
        (e.brand || '').toLowerCase().includes(q) ||
        (e.type || '').toLowerCase().includes(q)
    );
    renderEquipmentGrid(filtered, q);
}

function renderEquipmentGrid(equipment, queryVal = '') {
    document.getElementById('mainContent').innerHTML = `
        <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:1rem;">
                <h2>❄️ Equipment Fleet & Catalog (${equipment.length})</h2>
                <input id="eqSearch" value="${queryVal.replace(/"/g, '&quot;')}" oninput="filterEquipment()" placeholder="Search model, S/N, brand, tons..." style="padding:8px 12px;border:1px solid #ccc;border-radius:8px;min-width:250px;">
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem;">
                ${equipment.map(e => `
                    <div style="border:1px solid #dce3ea;padding:14px;border-radius:10px;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
                            <h3 style="color:#0a2b4e;font-size:1.05rem;margin-bottom:4px;">${e.name || e.model}</h3>
                            <span style="background:${e.status === 'available' ? '#e8f8f0' : '#fdecea'};color:${e.status === 'available' ? '#1e8449' : '#c0392b'};padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:bold;text-transform:uppercase;">${e.status || 'available'}</span>
                        </div>
                        <p style="font-size:0.85rem;color:#555;margin:3px 0;"><strong>Model:</strong> ${e.model || '-'} ${e.unit_number ? `| <strong>Unit #:</strong> ${e.unit_number}` : ''}</p>
                        <p style="font-size:0.85rem;color:#555;margin:3px 0;"><strong>S/N:</strong> ${e.serial_number || 'N/A'} | <strong>Type:</strong> ${e.type || '-'}</p>
                        <p style="font-size:0.85rem;color:#555;margin:3px 0;">
                            ${e.tons ? `<strong>Capacity:</strong> ${e.tons} Tons | ` : ''}
                            <strong>Voltage:</strong> ${e.voltage || 'N/A'}
                        </p>
                        ${e.specs ? `<p style="font-size:0.8rem;color:#666;margin:3px 0;">${e.specs}</p>` : ''}
                        ${e.daily_rate ? `<p style="margin-top:6px;color:#005596;"><strong>$${Number(e.daily_rate).toFixed(2)}/day</strong></p>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    const inp = document.getElementById('eqSearch');
    if (inp && queryVal) { inp.focus(); inp.setSelectionRange(queryVal.length, queryVal.length); }
}

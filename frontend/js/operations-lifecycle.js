(function () {
  let lookups = { customers: [], contacts: [], equipment: [], spare_parts: [], employees: [], vehicles: [], quotations: [], quotation_items: [] };

  const STATUS_COLORS = {
    'Available': { bg: '#DCFCE7', fg: '#166534' },
    'Staged / Prepared': { bg: '#FEF3C7', fg: '#92400E' },
    'Delivered': { bg: '#DBEAFE', fg: '#1E40AF' },
    'Rented': { bg: '#E0E7FF', fg: '#3730A3' },
    'Returned / Completed': { bg: '#F1F5F9', fg: '#334155' },
    'Maintenance': { bg: '#FEE2E2', fg: '#991B1B' },
    'Draft': { bg: '#F1F5F9', fg: '#334155' },
    'Sent': { bg: '#DBEAFE', fg: '#1E40AF' },
    'Approved': { bg: '#DCFCE7', fg: '#166534' },
    'Rejected': { bg: '#FEE2E2', fg: '#991B1B' }
  };

  function badge(status) {
    const s = status || 'Available';
    const c = STATUS_COLORS[s] || { bg: '#E2E8F0', fg: '#1E293B' };
    return `<span style="display:inline-block;padding:3px 9px;border-radius:999px;font-size:0.76rem;font-weight:700;background:${c.bg};color:${c.fg};white-space:nowrap;">${s}</span>`;
  }

  function normCustomer(c) {
    return { id: c.id, name: c.name || c.company_name || `Customer #${c.id}`, address: c.address || c.billing_address || c.shipping_address || '' };
  }
  function normEquipment(e) {
    return { id: e.id, name: e.name || e.equipment_name || e.category || `Unit #${e.id}`, model: e.model || '', serial_number: e.serial_number || e.serial || 'N/A', status: e.status || 'Available' };
  }
  function normEmployee(emp) {
    return { id: emp.id, full_name: emp.full_name || emp.name || emp.username || `Staff #${emp.id}`, department: emp.department || emp.role || '' };
  }
  function normPart(p) {
    return {
      id: p.id,
      part_number: p.part_number || p.sku || p.code || 'ITEM',
      description: p.description || p.name || `Part #${p.id}`,
      category: p.category || 'Spare Part',
      quantity: p.stock_quantity ?? p.quantity ?? p.stock ?? 0,
      unit_cost: p.unit_price ?? p.unit_cost ?? p.cost ?? 0
    };
  }
  function normVehicle(v) {
    return { id: v.id, plate_number: v.plate_number || v.plate || v.license_plate || `Unit #${v.id}`, make: v.make || v.brand || '', model: v.model || '' };
  }

  async function loadLookups() {
    try {
      const res = await fetch('/api/operations/lookups', { credentials: 'include' });
      if (!res.ok) return;
      const raw = await res.json();
      lookups = {
        customers: (raw.customers || []).map(normCustomer),
        contacts: raw.contacts || [],
        equipment: (raw.equipment || []).map(normEquipment),
        spare_parts: (raw.spare_parts || []).map(normPart),
        employees: (raw.employees || []).map(normEmployee),
        vehicles: (raw.vehicles || []).map(normVehicle),
        quotations: raw.quotations || [],
        quotation_items: raw.quotation_items || []
      };
    } catch (err) {
      console.warn('Lookups load warning:', err);
    }
  }

  function injectStyles() {
    if (document.getElementById('pctOpsStyles')) return;
    const st = document.createElement('style');
    st.id = 'pctOpsStyles';
    st.textContent = `
      .pct-sidebar-link {
        display: flex !important; align-items: center; gap: 12px; padding: 13px 22px;
        color: #F8FAFC !important; text-decoration: none !important; font-size: 0.96rem;
        font-weight: 500; border-left: 4px solid transparent; transition: background 0.18s ease, border-color 0.18s ease; cursor: pointer;
      }
      .pct-sidebar-link:hover { background: rgba(255, 255, 255, 0.08) !important; color: #FFFFFF !important; }
      .pct-sidebar-link.pct-active { background: rgba(158, 198, 59, 0.18) !important; border-left-color: #9EC63B !important; color: #FFFFFF !important; font-weight: 700; }
      .pct-ops-view { display: none; padding: 20px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; }
      .pct-ops-view * { box-sizing: border-box; }
      .pct-ops-card { background: var(--bg-card, #ffffff); color: var(--text-primary, #0f172a); border: 1px solid var(--border-color, #cbd5e1); border-radius: 10px; padding: 18px; margin-bottom: 18px; box-shadow: 0 2px 6px rgba(15,23,42,0.05); max-width: 100%; }
      .pct-ops-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; align-items: end; }
      .pct-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: end; }
      .pct-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; align-items: end; }
      .pct-span-2 { grid-column: span 2; }
      .pct-form-section { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; }
      .pct-form-section-title { font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #003B6F; margin: 0 0 12px 0; padding-bottom: 6px; border-bottom: 1px solid #CBD5E1; display: flex; justify-content: space-between; align-items: center; }
      .pct-field label { display: block; font-size: 0.8rem; font-weight: 600; color: #334155; margin-bottom: 5px; line-height: 1.25; }
      .pct-items-header { display: grid; grid-template-columns: 220px 165px minmax(180px, 1fr) 80px 90px 36px; gap: 10px; padding: 0 2px 6px 2px; font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.03em; }
      @media (max-width: 1024px) { .pct-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 768px) { .pct-grid-3, .pct-grid-4 { grid-template-columns: 1fr; } .pct-span-2 { grid-column: span 1; } .pct-items-header { display: none; } }
      .pct-ops-input { width: 100%; max-width: 100%; height: 38px; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.88rem; background: #ffffff; color: #0f172a; } textarea.pct-ops-input { height: auto; }
      .pct-ops-input[readonly] { background: #F1F5F9; color: #334155; font-weight: 600; cursor: not-allowed; }
      .pct-ops-btn { padding: 8px 14px; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; }
      .pct-ops-btn-primary { background: #003B6F; color: #fff; }
      .pct-ops-btn-green { background: #689F38; color: #fff; }
      .pct-ops-btn-outline { background: transparent; border: 1px solid #003B6F; color: #003B6F; }
      .pct-ops-table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
      .pct-ops-table th { background: #003B6F; color: #fff; text-align: left; padding: 10px; white-space: nowrap; }
      .pct-ops-table td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
      .pct-modal-backdrop { display:none; position:fixed; inset:0; background:rgba(15,23,42,0.68); z-index:9998; align-items:center; justify-content:center; padding:16px; }
      .pct-modal-box { background:var(--bg-card,#fff); color:var(--text-primary,#0f172a); width:100%; max-width:960px; max-height:92vh; overflow-y:auto; border-radius:12px; padding:22px; box-shadow:0 24px 48px rgba(0,0,0,0.35); }
      .pct-modal-box * { box-sizing: border-box; }
      .pct-eq-hist-btn { padding: 4px 8px; margin-right: 5px; border-radius: 6px; border: 1px solid #005596; background: #EFF6FF; color: #003B6F; font-size: 0.78rem; font-weight: 700; cursor: pointer; }
      .pct-eq-hist-btn:hover { background: #003B6F; color: #FFFFFF; }
    `;
    document.head.appendChild(st);
  }

  function getContentHost() {
    const candidates = [
      document.querySelector('main'),
      document.querySelector('.main-content'),
      document.querySelector('#mainContent'),
      document.querySelector('.content'),
      document.querySelector('#content'),
      document.querySelector('.page-content')
    ].filter(Boolean);
    if (candidates.length) return candidates[0];
    const sidebar = document.querySelector('.sidebar, aside, nav');
    if (sidebar && sidebar.parentElement) {
      const sibling = Array.from(sidebar.parentElement.children).find(el => el !== sidebar && el.tagName !== 'HEADER');
      if (sibling) return sibling;
    }
    return document.body;
  }

  function restoreNativeViews() {
    document.querySelectorAll('.pct-ops-view').forEach(el => { el.style.display = 'none'; });
    document.querySelectorAll('.pct-sidebar-link').forEach(el => el.classList.remove('pct-active'));
    const host = getContentHost();
    Array.from(host.children).forEach(ch => {
      if (!ch.classList.contains('pct-ops-view') && ch.dataset.pctHidden === '1') {
        ch.style.display = ch.dataset.pctPrevDisplay || '';
        delete ch.dataset.pctHidden;
      }
    });
  }

  function showCustomView(viewId, linkEl) {
    const host = getContentHost();
    ensureContainers();
    Array.from(host.children).forEach(ch => {
      if (!ch.classList.contains('pct-ops-view') && ch.tagName !== 'HEADER' && !ch.classList.contains('topbar')) {
        if (!ch.dataset.pctHidden) {
          ch.dataset.pctPrevDisplay = ch.style.display || '';
          ch.dataset.pctHidden = '1';
        }
        ch.style.display = 'none';
      }
    });
    document.querySelectorAll('.pct-ops-view').forEach(el => { el.style.display = 'none'; });
    document.querySelectorAll('.pct-sidebar-link').forEach(el => el.classList.remove('pct-active'));
    if (linkEl) linkEl.classList.add('pct-active');
    const target = document.getElementById(viewId);
    if (target) target.style.display = 'block';
  }

  function ensureContainers() {
    const host = getContentHost();
    ['pctQuotationsView', 'pctDispatchView', 'pctSettlementView'].forEach(id => {
      let div = document.getElementById(id);
      if (!div) {
        div = document.createElement('div');
        div.id = id;
        div.className = 'pct-ops-view';
      }
      if (div.parentElement !== host) host.appendChild(div);
    });
  }

  function mountSidebarLinks() {
    const apiLink = Array.from(document.querySelectorAll('a, button, li')).find(el => /API Docs/i.test(el.textContent || ''));
    const nav = apiLink ? apiLink.parentElement : document.querySelector('.sidebar nav, .sidebar ul, aside nav, aside ul, .sidebar');
    if (!nav || document.getElementById('nav-pct-quotations')) return;

    const nativeLinks = Array.from(nav.querySelectorAll('a, button, li')).filter(el => !el.id || !el.id.startsWith('nav-pct-'));
    nativeLinks.forEach(el => el.addEventListener('click', () => restoreNativeViews()));

    const items = [
      { id: 'nav-pct-quotations', icon: '📝', label: 'Quotations (PDF)', view: 'pctQuotationsView', loader: renderQuotationsView },
      { id: 'nav-pct-dispatch', icon: '🚚', label: 'Dispatch & Orders', view: 'pctDispatchView', loader: renderDispatchView },
      { id: 'nav-pct-settlement', icon: '💰', label: 'Monthly Settlement', view: 'pctSettlementView', loader: renderSettlementView }
    ];

    items.forEach(item => {
      const link = document.createElement('a');
      link.id = item.id;
      link.href = '#';
      link.className = 'pct-sidebar-link';
      link.innerHTML = `<span style="font-size:1.05rem;line-height:1;">${item.icon}</span><span>${item.label}</span>`;
      link.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        nativeLinks.forEach(nl => nl.classList.remove('active'));
        showCustomView(item.view, link);
        const container = document.getElementById(item.view);
        if (container && !container.innerHTML.trim()) {
          container.innerHTML = '<div class="pct-ops-card">Loading module...</div>';
        }
        await loadLookups();
        await item.loader();
      };
      nav.appendChild(link);
    });
  }

  // ==================== 1. QUOTATIONS VIEW ====================
  async function renderQuotationsView() {
    const root = document.getElementById('pctQuotationsView');
    const custOpts = lookups.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const eqOpts = lookups.equipment.map(e => `<option value="eq:${e.id}" data-eqid="${e.id}" data-desc="${e.name} ${e.model} (S/N: ${e.serial_number})">[Equipment] ${e.name} - ${e.serial_number} (${e.status})</option>`).join('');
    const partOpts = lookups.spare_parts.map(p => `<option value="sp:${p.id}" data-spid="${p.id}" data-price="${p.unit_cost}" data-desc="${p.description}">[Warehouse] ${p.description} (Stock: ${p.quantity})</option>`).join('');

    root.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="margin:0;color:#003B6F;">Commercial Quotations & Proposals</h2>
          <small style="color:#64748b;">Create client proposals, download branded PDFs for email attachment, and convert approved quotes into Internal Dispatch Orders.</small>
        </div>
        <button class="pct-ops-btn pct-ops-btn-primary" id="btnToggleNewQuote">+ New Quotation</button>
      </div>

      <div id="newQuoteCard" class="pct-ops-card" style="display:none;">
        <h3 style="margin-top:0;color:#003B6F;">Create Client Quotation</h3>
        <form id="pctQuoteForm">
          <div class="pct-ops-grid">
            <div><label>Customer *</label><select id="qtCustomer" class="pct-ops-input" required><option value="">-- Select Customer --</option>${custOpts}</select></div>
            <div><label>Customer Contact</label><select id="qtContact" class="pct-ops-input"><option value="">-- Select Contact --</option></select></div>
            <div><label>Service Category</label>
              <select id="qtServiceType" class="pct-ops-input">
                <option value="Equipment Rental">Equipment Rental (24/7 HVAC/Power)</option>
                <option value="HVAC/R Protective Coating (ADSIL)">HVAC/R Protective Coating (ADSIL MicroGuard)</option>
                <option value="Replacement Coils (OEM / Custom)">Replacement Coils (OEM / Custom)</option>
                <option value="Preventive / Corrective Maintenance">Preventive / Corrective Maintenance</option>
              </select>
            </div>
            <div><label>Valid Until</label><input type="date" id="qtValidUntil" class="pct-ops-input" /></div>
            <div><label>Tax Rate (%)</label><input type="number" step="0.01" id="qtTaxRate" value="0" class="pct-ops-input" /></div>
            <div><label>Payment Terms</label><input type="text" id="qtTerms" value="Net 30 Days" class="pct-ops-input" /></div>
          </div>

          <div style="margin-top:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="color:#003B6F;">Proposal Line Items</strong>
              <button type="button" class="pct-ops-btn pct-ops-btn-outline" id="btnAddQuoteLine">+ Add Line Item</button>
            </div>
            <div id="qtLinesContainer"></div>
          </div>

          <div style="margin-top:12px;">
            <label>Scope of Work / Technical Notes</label>
            <textarea id="qtNotes" rows="2" class="pct-ops-input" placeholder="Include delivery terms, rigging requirements, electrical hookup notes, or coating warranty..."></textarea>
          </div>
          <div style="margin-top:14px;text-align:right;">
            <button type="submit" class="pct-ops-btn pct-ops-btn-green">Save Quotation</button>
          </div>
        </form>
      </div>

      <div class="pct-ops-card" style="overflow-x:auto;">
        <table class="pct-ops-table">
          <thead><tr><th>Quote #</th><th>Customer</th><th>Contact</th><th>Service</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="qtTableBody"><tr><td colspan="7">Loading quotations...</td></tr></tbody>
        </table>
      </div>
    `;

    document.getElementById('btnToggleNewQuote').onclick = () => {
      const c = document.getElementById('newQuoteCard');
      c.style.display = c.style.display === 'none' ? 'block' : 'none';
    };

    document.getElementById('qtCustomer').onchange = (e) => {
      const cid = Number(e.target.value);
      const list = lookups.contacts.filter(x => Number(x.customer_id) === cid);
      document.getElementById('qtContact').innerHTML = '<option value="">-- Select Contact --</option>' +
        list.map(x => `<option value="${x.id}">${x.full_name} (${x.email || x.phone || 'Contact'})</option>`).join('');
    };

    function addQuoteLine() {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:grid;grid-template-columns:150px 190px minmax(160px,1fr) 75px 95px 34px;gap:8px;margin-bottom:8px;align-items:center;';
      wrap.innerHTML = `
        <select class="pct-ops-input qt-type">
          <option value="Equipment Rental">Equipment Rental</option>
          <option value="Protective Coating">Protective Coating</option>
          <option value="Spare Part / Coil">Spare Part / Coil</option>
          <option value="Transport / Rigging">Transport / Rigging</option>
          <option value="Installation / Labor">Installation / Labor</option>
        </select>
        <select class="pct-ops-input qt-catalog">
          <option value="">-- Pick Equipment / Warehouse --</option>
          <optgroup label="HVAC & Power Fleet">${eqOpts}</optgroup>
          <optgroup label="Warehouse Supplies & Parts">${partOpts}</optgroup>
        </select>
        <input type="text" class="pct-ops-input qt-desc" placeholder="Item description (e.g., 100T Air-Cooled Chiller Monthly Rental)" required />
        <input type="number" step="0.01" class="pct-ops-input qt-qty" value="1" min="0.01" />
        <input type="number" step="0.01" class="pct-ops-input qt-price" value="0" min="0" />
        <button type="button" onclick="this.parentElement.remove()" style="background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;height:38px;cursor:pointer;font-weight:700;">&times;</button>
      `;
      wrap.querySelector('.qt-catalog').onchange = (ev) => {
        const opt = ev.target.selectedOptions[0];
        if (opt && opt.dataset.desc) wrap.querySelector('.qt-desc').value = opt.dataset.desc;
        if (opt && opt.dataset.price && Number(opt.dataset.price) > 0) wrap.querySelector('.qt-price').value = opt.dataset.price;
      };
      document.getElementById('qtLinesContainer').appendChild(wrap);
    }
    document.getElementById('btnAddQuoteLine').onclick = addQuoteLine;
    addQuoteLine();

    document.getElementById('pctQuoteForm').onsubmit = async (e) => {
      e.preventDefault();
      const items = Array.from(document.querySelectorAll('#qtLinesContainer > div')).map(row => {
        const selOpt = row.querySelector('.qt-catalog').selectedOptions[0];
        return {
          item_type: row.querySelector('.qt-type').value,
          equipment_id: selOpt && selOpt.dataset.eqid ? selOpt.dataset.eqid : null,
          spare_part_id: selOpt && selOpt.dataset.spid ? selOpt.dataset.spid : null,
          description: row.querySelector('.qt-desc').value.trim(),
          quantity: row.querySelector('.qt-qty').value,
          unit_price: row.querySelector('.qt-price').value
        };
      });
      const res = await fetch('/api/quotations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          customer_id: document.getElementById('qtCustomer').value,
          contact_id: document.getElementById('qtContact').value || null,
          service_type: document.getElementById('qtServiceType').value,
          valid_until: document.getElementById('qtValidUntil').value || null,
          tax_rate: document.getElementById('qtTaxRate').value,
          payment_terms: document.getElementById('qtTerms').value,
          notes: document.getElementById('qtNotes').value,
          items
        })
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'Error saving quote'); return; }
      document.getElementById('newQuoteCard').style.display = 'none';
      await loadLookups();
      await loadQuotationsTable();
    };

    await loadQuotationsTable();
  }

  async function loadQuotationsTable() {
    const tbody = document.getElementById('qtTableBody');
    const res = await fetch('/api/quotations', { credentials: 'include' });
    const rows = res.ok ? await res.json() : [];
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;">No quotations created yet. Click "+ New Quotation" to start.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(q => `
      <tr>
        <td><strong>${q.quote_number}</strong><br><small style="color:#64748b;">${String(q.issue_date).slice(0,10)}</small></td>
        <td><strong>${q.customer_name || ''}</strong></td>
        <td>${q.contact_name || '—'}<br><small style="color:#64748b;">${q.contact_email || ''}</small></td>
        <td>${q.service_type}</td>
        <td><strong>$${Number(q.total_amount).toFixed(2)}</strong></td>
        <td>${badge(q.status)}</td>
        <td style="white-space:nowrap;">
          <a href="/api/quotations/${q.id}/pdf" target="_blank" class="pct-ops-btn pct-ops-btn-outline" style="text-decoration:none;padding:5px 9px;">PDF</a>
          ${q.contact_email ? `<a href="mailto:${q.contact_email}?subject=${encodeURIComponent('PRO-Coating Quotation ' + q.quote_number)}&body=${encodeURIComponent('Dear ' + (q.contact_name || 'Customer') + ',\n\nPlease find attached our quotation ' + q.quote_number + ' for ' + q.service_type + '.\n\nBest regards,\nPRO-Coating Treatments Inc.\n787-309-8738 | sales@procoatingpr.com')}" class="pct-ops-btn pct-ops-btn-outline" style="text-decoration:none;padding:5px 9px;">Email</a>` : ''}
          ${q.status !== 'Approved' ? `<button class="pct-ops-btn pct-ops-btn-green" style="padding:5px 9px;" onclick="window._pctApproveQuote(${q.id})">Approve & Dispatch</button>` : `<button class="pct-ops-btn pct-ops-btn-primary" style="padding:5px 9px;" onclick="window._pctConvertQuote(${q.id})">+ Dispatch Order</button>`}
        </td>
      </tr>
    `).join('');
  }

  window._pctApproveQuote = async function (qId) {
    await fetch(`/api/quotations/${qId}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ status: 'Approved' })
    });
    await window._pctConvertQuote(qId);
  };

  window._pctConvertQuote = async function (qId) {
    const res = await fetch(`/api/quotations/${qId}`, { credentials: 'include' });
    const q = await res.json();
    await loadLookups();
    showCustomView('pctDispatchView', document.getElementById('nav-pct-dispatch'));
    await renderDispatchView(q);
  };

  // ==================== 2. DISPATCH & INTERNAL ORDERS VIEW (LINKED BY QUOTATION) ====================
  async function renderDispatchView(prefillQuote) {
    const root = document.getElementById('pctDispatchView');
    const quoteOpts = lookups.quotations.map(q =>
      `<option value="${q.id}">${q.quote_number} — ${q.customer_name || 'Customer'} ($${Number(q.total_amount).toFixed(2)}) [${q.status}]</option>`
    ).join('');
    const eqOpts = lookups.equipment.map(e => `<option value="${e.id}">${e.name} | S/N: ${e.serial_number} (${e.status})</option>`).join('');
    const empOpts = lookups.employees.map(emp => `<option value="${emp.id}">${emp.full_name} (${emp.department})</option>`).join('');
    const vehOpts = lookups.vehicles.map(v => `<option value="${v.id}">${v.plate_number} - ${v.make} ${v.model}</option>`).join('');
    const whOpts = lookups.spare_parts.map(p => `<option value="${p.id}" data-desc="${p.description}" data-cat="${p.category}">${p.description} (Stock: ${p.quantity})</option>`).join('');

    root.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="margin:0;color:#003B6F;">Internal Dispatch, Pre-Departure Checklist & Handover Orders</h2>
          <small style="color:#64748b;">Every dispatch order is linked directly to a Quotation for full end-to-end traceability.</small>
        </div>
        <button class="pct-ops-btn pct-ops-btn-primary" id="btnToggleNewOrder">+ New Dispatch Order from Quotation</button>
      </div>

      <div id="newOrderCard" class="pct-ops-card" style="display:${prefillQuote ? 'block' : 'none'};border-top:4px solid #003B6F;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
          <div>
            <h3 style="margin:0;color:#003B6F;">Create Internal Dispatch Order (Linked to Quotation)</h3>
            <small style="color:#64748b;">Complete quotation link, equipment/crew assignment, and staged warehouse accessories.</small>
          </div>
          <span id="ioTraceBadge" style="font-size:0.8rem;font-weight:700;color:#005596;background:#EFF6FF;padding:5px 12px;border-radius:6px;border:1px solid #BFDBFE;">Select a Quotation to auto-load client & scope</span>
        </div>
        <form id="pctOrderForm">
          <input type="hidden" id="ioCustomer" required />
          <div class="pct-form-section">
            <div class="pct-form-section-title"><span>1. Quotation & Customer Traceability</span></div>
            <div class="pct-grid-3">
              <div class="pct-field"><label>Linked Quotation *</label><select id="ioQuoteSelect" class="pct-ops-input" required style="border:2px solid #003B6F;font-weight:600;"><option value="">-- Select Created / Approved Quotation --</option>${quoteOpts}</select></div>
              <div class="pct-field"><label>Customer Account (Auto-filled)</label><input type="text" id="ioCustomerName" class="pct-ops-input" readonly placeholder="Auto-filled from quotation..." /></div>
              <div class="pct-field"><label>On-Site Contact Person</label><select id="ioContact" class="pct-ops-input"><option value="">-- Select Contact --</option></select></div>
            </div>
          </div>
          <div class="pct-form-section">
            <div class="pct-form-section-title"><span>2. Equipment, Field Crew & Logistics Schedule</span></div>
            <div class="pct-grid-4">
              <div class="pct-field"><label>Equipment Unit to Dispatch</label><select id="ioEquipment" class="pct-ops-input"><option value="">-- Select Equipment --</option>${eqOpts}</select></div>
              <div class="pct-field"><label>Monthly Rental Rate ($)</label><input type="number" step="0.01" id="ioRate" class="pct-ops-input" value="0" /></div>
              <div class="pct-field"><label>Scheduled Delivery Date</label><input type="date" id="ioDelivDate" class="pct-ops-input" value="${new Date().toISOString().slice(0,10)}" /></div>
              <div class="pct-field"><label>Fleet Vehicle / Truck</label><select id="ioVehicle" class="pct-ops-input"><option value="">-- Select Truck/Trailer --</option>${vehOpts}</select></div>
              <div class="pct-field"><label>Delivery Driver / Transporter</label><select id="ioDriver" class="pct-ops-input"><option value="">-- Assign Driver --</option>${empOpts}</select></div>
              <div class="pct-field"><label>Installing Technician / Operator</label><select id="ioInstaller" class="pct-ops-input"><option value="">-- Assign Installer --</option>${empOpts}</select></div>
              <div class="pct-field pct-span-2"><label>Delivery Site Address & Logistics Instructions</label><input type="text" id="ioAddress" class="pct-ops-input" placeholder="Customer facility address, gate instructions, crane/rigging notes..." /></div>
            </div>
          </div>
          <div class="pct-form-section" style="margin-bottom:0;">
            <div class="pct-form-section-title">
              <span>3. Staged Accessories, Hoses, Ducts, Cables & Supplies</span>
              <button type="button" class="pct-ops-btn pct-ops-btn-outline" style="padding:5px 11px;font-size:0.8rem;text-transform:none;" id="btnAddDispatchItem">+ Add Supply / Accessory</button>
            </div>
            <div class="pct-items-header"><span>Warehouse Catalog</span><span>Category</span><span>Item Description</span><span>Qty</span><span>Unit</span><span></span></div>
            <div id="ioItemsContainer"></div>
          </div>
          <div style="margin-top:16px;display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="pct-ops-btn pct-ops-btn-outline" onclick="document.getElementById('newOrderCard').style.display='none'">Cancel</button>
            <button type="submit" class="pct-ops-btn pct-ops-btn-green" style="padding:10px 18px;">Create Order & Mark Equipment "Staged / Prepared"</button>
          </div>
        </form>
      </div>

      <div class="pct-ops-card" style="overflow-x:auto;">
        <table class="pct-ops-table">
          <thead><tr><th>Order # & Quote Trace</th><th>Customer</th><th>Equipment (S/N)</th><th>Assigned Staff</th><th>Monthly Rate</th><th>Internal Costs</th><th>Status</th><th>Manage</th></tr></thead>
          <tbody id="ioTableBody"><tr><td colspan="8">Loading orders...</td></tr></tbody>
        </table>
      </div>

      <div id="pctOrderDetailModal" class="pct-modal-backdrop">
        <div class="pct-modal-box" id="pctOrderDetailContent"></div>
      </div>
    `;

    document.getElementById('btnToggleNewOrder').onclick = () => {
      const c = document.getElementById('newOrderCard');
      c.style.display = c.style.display === 'none' ? 'block' : 'none';
    };

    function addDispatchItem(desc = '', qty = 1, unit = 'Unit', cat = 'Hoses & Sleeves') {
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:220px 165px minmax(180px,1fr) 80px 90px 36px;gap:10px;margin-bottom:8px;align-items:center;';
      row.innerHTML = `
        <select class="pct-ops-input io-wh-pick"><option value="">-- Pick Warehouse Item --</option>${whOpts}</select>
        <input type="text" class="pct-ops-input io-cat" value="${cat}" placeholder="Category" />
        <input type="text" class="pct-ops-input io-desc" value="${desc}" placeholder="e.g., Mangas 6 x 25' or 4/0 Cables" required />
        <input type="number" step="0.01" class="pct-ops-input io-qty" value="${qty}" />
        <input type="text" class="pct-ops-input io-unit" value="${unit}" />
        <button type="button" onclick="this.parentElement.remove()" style="background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;height:34px;cursor:pointer;font-weight:700;">&times;</button>
      `;
      row.querySelector('.io-wh-pick').onchange = (ev) => {
        const opt = ev.target.selectedOptions[0];
        if (opt && opt.dataset.desc) {
          row.querySelector('.io-desc').value = opt.dataset.desc;
          row.querySelector('.io-cat').value = opt.dataset.cat || 'Warehouse Supply';
        }
      };
      document.getElementById('ioItemsContainer').appendChild(row);
    }
    document.getElementById('btnAddDispatchItem').onclick = () => addDispatchItem();

    function applyQuotationData(qObj, qItems) {
      if (!qObj) return;
      document.getElementById('ioQuoteSelect').value = qObj.id;
      document.getElementById('ioCustomer').value = qObj.customer_id;
      document.getElementById('ioCustomerName').value = qObj.customer_name || '';
      document.getElementById('ioRate').value = Number(qObj.total_amount) || 0;
      document.getElementById('ioAddress').value = qObj.customer_address || '';
      document.getElementById('ioTraceBadge').textContent = `Traceability: ${qObj.quote_number} → ${qObj.customer_name}`;

      const contactList = lookups.contacts.filter(x => Number(x.customer_id) === Number(qObj.customer_id));
      document.getElementById('ioContact').innerHTML = '<option value="">-- Select Contact --</option>' +
        contactList.map(x => `<option value="${x.id}" ${Number(x.id) === Number(qObj.contact_id) ? 'selected' : ''}>${x.full_name} (${x.phone || x.email || 'Contact'})</option>`).join('');

      const items = qItems || lookups.quotation_items.filter(it => Number(it.quotation_id) === Number(qObj.id));
      const eqItem = items.find(i => i.equipment_id);
      if (eqItem) document.getElementById('ioEquipment').value = eqItem.equipment_id;

      const container = document.getElementById('ioItemsContainer');
      container.innerHTML = '';
      if (items.length) {
        items.forEach(i => addDispatchItem(i.description, i.quantity, 'Unit', i.item_type || 'Quoted Item'));
      } else {
        addDispatchItem();
      }
    }

    document.getElementById('ioQuoteSelect').onchange = (e) => {
      const qid = Number(e.target.value);
      const qObj = lookups.quotations.find(x => Number(x.id) === qid);
      if (qObj) applyQuotationData(qObj, null);
    };

    if (prefillQuote) {
      applyQuotationData(prefillQuote, prefillQuote.items);
    } else {
      addDispatchItem();
    }

    document.getElementById('pctOrderForm').onsubmit = async (e) => {
      e.preventDefault();
      const qid = document.getElementById('ioQuoteSelect').value;
      if (!qid) { alert('Please select a linked Quotation first.'); return; }

      const items = Array.from(document.querySelectorAll('#ioItemsContainer > div')).map(r => ({
        category: r.querySelector('.io-cat').value.trim() || 'Supply',
        description: r.querySelector('.io-desc').value.trim(),
        quantity: r.querySelector('.io-qty').value,
        unit: r.querySelector('.io-unit').value
      }));
      const res = await fetch('/api/internal-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          quotation_id: qid,
          customer_id: document.getElementById('ioCustomer').value,
          contact_id: document.getElementById('ioContact').value || null,
          equipment_id: document.getElementById('ioEquipment').value || null,
          vehicle_id: document.getElementById('ioVehicle').value || null,
          delivered_by_id: document.getElementById('ioDriver').value || null,
          installed_by_id: document.getElementById('ioInstaller').value || null,
          scheduled_delivery: document.getElementById('ioDelivDate').value || null,
          monthly_rate: document.getElementById('ioRate').value,
          site_address: document.getElementById('ioAddress').value,
          items
        })
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'Error creating order'); return; }
      const created = await res.json();
      document.getElementById('newOrderCard').style.display = 'none';
      await loadLookups();
      await loadOrdersTable();
      await window._pctOpenOrderDetail(created.id);
    };

    await loadOrdersTable();
  }

  async function loadOrdersTable() {
    const tbody = document.getElementById('ioTableBody');
    const res = await fetch('/api/internal-orders', { credentials: 'include' });
    const rows = res.ok ? await res.json() : [];
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#64748b;">No internal dispatch orders yet. Click "+ New Dispatch Order from Quotation" to start.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(o => `
      <tr>
        <td>
          <strong>${o.order_number}</strong><br>
          <span style="display:inline-block;margin-top:2px;font-size:0.75rem;font-weight:700;color:#005596;background:#EFF6FF;padding:2px 6px;border-radius:4px;">Quote: ${o.quote_number || 'N/A'}</span>
        </td>
        <td><strong>${o.customer_name || ''}</strong></td>
        <td>${o.equipment_name || 'N/A'}<br><small style="color:#64748b;">S/N: ${o.equipment_serial || 'N/A'}</small></td>
        <td><small>Delivery: ${o.delivered_by_name || '—'}<br>Install: ${o.installed_by_name || '—'}</small></td>
        <td><strong>$${Number(o.monthly_rate).toFixed(2)}</strong>/mo</td>
        <td><span style="color:#DC2626;font-weight:600;">$${Number(o.total_internal_cost).toFixed(2)}</span></td>
        <td>${badge(o.status)}</td>
        <td style="white-space:nowrap;">
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <button class="pct-ops-btn pct-ops-btn-primary" style="padding:4px 8px;font-size:0.78rem;" onclick="window._pctOpenOrderDetail(${o.id}, 'sec-checklist')">Checklist & Photos</button>
            <button class="pct-ops-btn pct-ops-btn-green" style="padding:4px 8px;font-size:0.78rem;" onclick="window._pctOpenOrderDetail(${o.id}, 'sec-signature')">On-Site Sign-Off</button>
            <button class="pct-ops-btn pct-ops-btn-outline" style="padding:4px 8px;font-size:0.78rem;" onclick="window._pctOpenOrderDetail(${o.id}, 'sec-expenses')">Maint. & Costs</button>
            ${o.equipment_id ? `<button class="pct-ops-btn pct-ops-btn-outline" style="padding:4px 8px;font-size:0.78rem;" onclick="window._pctShowEquipmentHistory(${o.equipment_id})">Traceability</button>` : ''}
            <a href="/api/internal-orders/${o.id}/pdf" target="_blank" class="pct-ops-btn pct-ops-btn-outline" style="text-decoration:none;padding:4px 8px;font-size:0.78rem;">PDF</a>
          </div>
        </td>
      </tr>
    `).join('');
  }

  window._pctOpenOrderDetail = async function (orderId, focusSection) {
    const modal = document.getElementById('pctOrderDetailModal');
    const box = document.getElementById('pctOrderDetailContent');
    modal.style.display = 'flex';
    box.innerHTML = '<p>Loading order details...</p>';

    const res = await fetch(`/api/internal-orders/${orderId}`, { credentials: 'include' });
    const o = await res.json();
    const partsOpts = lookups.spare_parts.map(p => `<option value="${p.id}" data-cost="${p.unit_cost}" data-desc="${p.description}">${p.part_number} - ${p.description} (Stock: ${p.quantity})</option>`).join('');
    const empOpts = lookups.employees.map(e => `<option value="${e.id}">${e.full_name}</option>`).join('');

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #9EC63B;padding-bottom:10px;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="margin:0;color:#003B6F;">${o.order_number} <span style="font-size:0.82rem;color:#005596;background:#EFF6FF;padding:2px 8px;border-radius:6px;margin-left:6px;">Linked Quote: ${o.quote_number || 'N/A'}</span></h3>
          <small style="color:#64748b;">Customer: <strong>${o.customer_name}</strong> | Equipment: <strong>${o.equipment_name || 'N/A'}</strong> (S/N: ${o.equipment_serial || 'N/A'}) | Status: ${badge(o.status)}</small>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <a href="/api/internal-orders/${o.id}/pdf" target="_blank" class="pct-ops-btn pct-ops-btn-outline" style="text-decoration:none;">Download Handover PDF</a>
          <button onclick="document.getElementById('pctOrderDetailModal').style.display='none'" style="background:none;border:none;font-size:1.6rem;cursor:pointer;">&times;</button>
        </div>
      </div>

      <div class="pct-ops-card" style="background:#F8FAFC;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <strong style="color:#003B6F;">Equipment & Dispatch Lifecycle Status:</strong>
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
              ${['Staged / Prepared', 'Delivered', 'Rented', 'Returned / Completed'].map(st => `
                <button type="button" class="pct-ops-btn ${o.status === st ? 'pct-ops-btn-primary' : 'pct-ops-btn-outline'}" style="padding:5px 10px;" onclick="window._pctSetOrderStatus(${o.id}, '${st}')">${st}</button>
              `).join('')}
            </div>
          </div>
          ${o.equipment_id ? `<button type="button" class="pct-ops-btn pct-ops-btn-outline" onclick="window._pctShowEquipmentHistory(${o.equipment_id})">View Equipment Traceability</button>` : ''}
        </div>
      </div>

      <div class="pct-ops-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h4 id="sec-checklist" style="margin:0;color:#003B6F;">1. Pre-Departure & Customer On-Site Verification Checklist</h4>
          <button type="button" class="pct-ops-btn pct-ops-btn-green" style="padding:5px 12px;" id="btnSaveChecklist">Save Checklist</button>
        </div>
        <table class="pct-ops-table">
          <thead><tr><th>Inspection Item</th><th style="text-align:center;">Pre-Departure (Warehouse)</th><th style="text-align:center;">On-Site (Customer Verified)</th><th>Remarks</th></tr></thead>
          <tbody>
            ${o.checklist.map(ch => `
              <tr data-chid="${ch.id}">
                <td>${ch.check_label}</td>
                <td style="text-align:center;"><input type="checkbox" class="chk-pre" ${ch.pre_departure_ok ? 'checked' : ''} /></td>
                <td style="text-align:center;"><input type="checkbox" class="chk-cust" ${ch.customer_verified_ok ? 'checked' : ''} /></td>
                <td><input type="text" class="pct-ops-input chk-rem" value="${ch.remarks || ''}" placeholder="Optional note..." /></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:18px;">
        <div class="pct-ops-card" style="margin:0;">
          <h4 id="sec-photos" style="margin-top:0;color:#003B6F;">2. Pre-Departure & Delivery Photo Evidence</h4>
          <form id="pctPhotoForm" style="display:flex;flex-direction:column;gap:8px;">
            <select id="photoStage" class="pct-ops-input">
              <option value="Pre-Departure">Pre-Departure Inspection (Warehouse)</option>
              <option value="On-Site Delivery">On-Site Delivery & Rigging</option>
              <option value="Installation">Installation & Startup</option>
              <option value="Maintenance">Corrective / Preventive Maintenance</option>
            </select>
            <input type="text" id="photoCaption" class="pct-ops-input" placeholder="Photo caption (e.g., Gauge pressure & serial plate)" />
            <input type="file" id="photoFile" accept="image/*" capture="environment" required class="pct-ops-input" />
            <button type="submit" class="pct-ops-btn pct-ops-btn-primary">Upload / Capture Photo</button>
          </form>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:8px;margin-top:12px;">
            ${o.photos.map(ph => `
              <a href="${ph.file_path}" target="_blank" style="text-decoration:none;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;display:block;">
                <img src="${ph.file_path}" style="width:100%;height:75px;object-fit:cover;display:block;" />
                <div style="padding:4px;font-size:0.7rem;color:#334155;background:#f8fafc;"><strong>${ph.stage}</strong><br>${ph.caption || ''}</div>
              </a>
            `).join('') || '<small style="color:#64748b;">No photos uploaded yet.</small>'}
          </div>
        </div>

        <div class="pct-ops-card" style="margin:0;">
          <h4 id="sec-signature" style="margin-top:0;color:#003B6F;">3. Customer Handover & Digital Signature</h4>
          ${o.customer_signature_data ? `
            <div style="background:#F0FDF4;border:1px solid #86EFAC;padding:10px;border-radius:8px;margin-bottom:10px;">
              <strong style="color:#166534;">Signed & Verified by: ${o.customer_signed_name}</strong><br>
              <small style="color:#475569;">Timestamp: ${new Date(o.signed_at).toLocaleString()}</small>
              <div style="background:#fff;border:1px solid #cbd5e1;margin-top:8px;padding:6px;border-radius:6px;text-align:center;">
                <img src="${o.customer_signature_data}" style="max-height:95px;" />
              </div>
            </div>
          ` : ''}
          <input type="text" id="sigSignerName" class="pct-ops-input" placeholder="Customer Receiver Full Name *" value="${o.customer_signed_name || o.contact_name || ''}" style="margin-bottom:8px;" />
          <canvas id="pctSigCanvas" width="380" height="120" style="width:100%;height:120px;border:1.5px dashed #003B6F;border-radius:8px;background:#fff;touch-action:none;cursor:crosshair;"></canvas>
          <div style="display:flex;justify-content:space-between;margin-top:8px;gap:8px;">
            <button type="button" class="pct-ops-btn pct-ops-btn-outline" id="btnClearSig">Clear Pad</button>
            <button type="button" class="pct-ops-btn pct-ops-btn-green" id="btnSaveSig">Confirm Handover & Mark "Rented"</button>
          </div>
        </div>
      </div>

      <div class="pct-ops-card">
        <h4 id="sec-expenses" style="margin-top:0;color:#003B6F;">4. Spare Parts, Supplies, Transport & Maintenance Cost Log</h4>
        <form id="pctExpenseForm" style="background:#F8FAFC;padding:12px;border-radius:8px;margin-bottom:12px;">
          <div class="pct-ops-grid">
            <div><label>Resource Category</label>
              <select id="exCategory" class="pct-ops-input">
                <option value="Spare Part">Spare Part (Deducts Stock)</option>
                <option value="Consumable / Supply">Consumable / Supply</option>
                <option value="Transport / Freight">Transport / Freight / Crane</option>
                <option value="Labor / Technician">Technician Labor</option>
              </select>
            </div>
            <div><label>Service Type</label>
              <select id="exMaintType" class="pct-ops-input">
                <option value="Initial Deployment">Initial Deployment / Install</option>
                <option value="Preventive Maintenance">Preventive Maintenance</option>
                <option value="Corrective Maintenance">Corrective Maintenance</option>
              </select>
            </div>
            <div><label>Warehouse Part / Supply (Optional)</label><select id="exPartId" class="pct-ops-input"><option value="">-- Manual / Non-Stock Item --</option>${partsOpts}</select></div>
            <div><label>Technician / Operator</label><select id="exEmpId" class="pct-ops-input"><option value="">-- Select Staff --</option>${empOpts}</select></div>
            <div><label>Description *</label><input type="text" id="exDesc" class="pct-ops-input" required placeholder="Part or service description" /></div>
            <div><label>Quantity</label><input type="number" step="0.01" id="exQty" value="1" class="pct-ops-input" /></div>
            <div><label>Internal Unit Cost ($)</label><input type="number" step="0.01" id="exCost" value="0" class="pct-ops-input" /></div>
            <div><label>Billing Treatment</label>
              <select id="exBillable" class="pct-ops-input">
                <option value="false">Non-Billable (Internal Cost Only)</option>
                <option value="true">Billable to Customer</option>
              </select>
            </div>
            <div id="exBillablePriceWrap" style="display:none;">
              <label>Client Billable Unit Price ($)</label>
              <input type="number" step="0.01" id="exBillablePrice" value="0" class="pct-ops-input" />
            </div>
          </div>
          <div style="margin-top:10px;text-align:right;">
            <button type="submit" class="pct-ops-btn pct-ops-btn-primary">+ Record Part / Expense</button>
          </div>
        </form>

        <table class="pct-ops-table">
          <thead><tr><th>Date</th><th>Category / Service</th><th>Description</th><th>Technician</th><th>Qty</th><th>Internal Cost</th><th>Billing Status</th></tr></thead>
          <tbody>
            ${o.expenses.map(ex => `
              <tr>
                <td>${String(ex.expense_date).slice(0,10)}</td>
                <td><strong>${ex.category}</strong><br><small style="color:#64748b;">${ex.maintenance_type}</small></td>
                <td>${ex.description}</td>
                <td>${ex.technician_name || '—'}</td>
                <td>${Number(ex.quantity)}</td>
                <td style="color:#DC2626;font-weight:700;">$${Number(ex.internal_total_cost).toFixed(2)}</td>
                <td>${ex.is_billable ? `<span style="color:#15803D;font-weight:700;">Billable ($${Number(ex.billable_total_price).toFixed(2)})</span>` : '<span style="color:#64748b;font-weight:600;">Non-Billable (Absorbed)</span>'}</td>
              </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center;color:#64748b;">No parts, transport, or maintenance costs logged on this order yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('btnSaveChecklist').onclick = async () => {
      const checklist = Array.from(box.querySelectorAll('tbody tr[data-chid]')).map(tr => ({
        id: tr.dataset.chid,
        pre_departure_ok: tr.querySelector('.chk-pre').checked,
        customer_verified_ok: tr.querySelector('.chk-cust').checked,
        remarks: tr.querySelector('.chk-rem').value
      }));
      await fetch(`/api/internal-orders/${orderId}/checklist`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ checklist })
      });
      alert('Checklist saved successfully.');
    };

    document.getElementById('pctPhotoForm').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData();
      fd.append('stage', document.getElementById('photoStage').value);
      fd.append('caption', document.getElementById('photoCaption').value);
      fd.append('photo', document.getElementById('photoFile').files[0]);
      const up = await fetch(`/api/internal-orders/${orderId}/photos`, { method: 'POST', credentials: 'include', body: fd });
      if (!up.ok) { alert('Photo upload failed'); return; }
      await window._pctOpenOrderDetail(orderId);
    };

    const canvas = document.getElementById('pctSigCanvas');
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0F172A';
    let drawing = false;
    const getPos = (ev) => {
      const rect = canvas.getBoundingClientRect();
      const t = ev.touches ? ev.touches[0] : ev;
      return { x: (t.clientX - rect.left) * (canvas.width / rect.width), y: (t.clientY - rect.top) * (canvas.height / rect.height) };
    };
    canvas.onmousedown = canvas.ontouchstart = (ev) => { drawing = true; const p = getPos(ev); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    canvas.onmousemove = canvas.ontouchmove = (ev) => { if (!drawing) return; ev.preventDefault(); const p = getPos(ev); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    window.addEventListener('mouseup', () => { drawing = false; });
    window.addEventListener('touchend', () => { drawing = false; });

    document.getElementById('btnClearSig').onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('btnSaveSig').onclick = async () => {
      const signedName = document.getElementById('sigSignerName').value.trim();
      if (!signedName) { alert('Please enter the customer representative name.'); return; }
      const resSig = await fetch(`/api/internal-orders/${orderId}/signature`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ signed_name: signedName, signature_data: canvas.toDataURL('image/png'), target_status: 'Rented' })
      });
      if (!resSig.ok) { const err = await resSig.json().catch(() => ({})); alert(err.error || 'Error saving signature'); return; }
      await loadOrdersTable();
      await window._pctOpenOrderDetail(orderId);
    };

    document.getElementById('exBillable').onchange = (ev) => {
      document.getElementById('exBillablePriceWrap').style.display = ev.target.value === 'true' ? 'block' : 'none';
    };

    document.getElementById('exPartId').onchange = (ev) => {
      const opt = ev.target.selectedOptions[0];
      if (opt && opt.value) {
        document.getElementById('exDesc').value = opt.dataset.desc || '';
        document.getElementById('exCost').value = opt.dataset.cost || 0;
        document.getElementById('exBillablePrice').value = opt.dataset.cost || 0;
      }
    };
    document.getElementById('pctExpenseForm').onsubmit = async (e) => {
      e.preventDefault();
      const isBill = document.getElementById('exBillable').value === 'true';
      const resEx = await fetch(`/api/internal-orders/${orderId}/expenses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          category: document.getElementById('exCategory').value,
          maintenance_type: document.getElementById('exMaintType').value,
          spare_part_id: document.getElementById('exPartId').value || null,
          employee_id: document.getElementById('exEmpId').value || null,
          description: document.getElementById('exDesc').value,
          quantity: document.getElementById('exQty').value,
          internal_unit_cost: document.getElementById('exCost').value,
          is_billable: isBill,
          billable_unit_price: isBill ? document.getElementById('exBillablePrice').value : 0
        })
      });
      if (!resEx.ok) { const err = await resEx.json().catch(() => ({})); alert(err.error || 'Error logging expense'); return; }
      await loadLookups();
      await loadOrdersTable();
      await window._pctOpenOrderDetail(orderId, 'sec-expenses');
    };

    if (focusSection) {
      const targetEl = document.getElementById(focusSection);
      if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  window._pctSetOrderStatus = async function (orderId, status) {
    await fetch(`/api/internal-orders/${orderId}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ status })
    });
    await loadOrdersTable();
    await window._pctOpenOrderDetail(orderId);
  };

  // ==================== 3. MONTHLY SETTLEMENT VIEW ====================
  async function renderSettlementView() {
    const root = document.getElementById('pctSettlementView');
    const curMonth = new Date().toISOString().slice(0, 7);
    root.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="margin:0;color:#003B6F;">Monthly Service Settlement & Maintenance Cost Liquidation</h2>
          <small style="color:#64748b;">Audit monthly rental revenue against absorbed preventive/corrective spare parts, supplies, and transport costs.</small>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="month" id="liqMonthInput" value="${curMonth}" class="pct-ops-input" style="width:165px;" />
          <button class="pct-ops-btn pct-ops-btn-primary" id="btnRefreshLiq">Calculate</button>
          <a id="btnExportLiqPdf" href="/api/monthly-settlement/pdf?month=${curMonth}" target="_blank" class="pct-ops-btn pct-ops-btn-green" style="text-decoration:none;">Export PDF</a>
        </div>
      </div>

      <div id="liqKpis" class="pct-ops-grid" style="margin-bottom:18px;"></div>

      <div class="pct-ops-card" style="overflow-x:auto;">
        <h4 style="margin-top:0;color:#003B6F;">Monthly Settlement by Order & Equipment</h4>
        <table class="pct-ops-table">
          <thead><tr><th>Order #</th><th>Customer</th><th>Equipment (S/N)</th><th>Status</th><th>Monthly Rental</th><th>Billable Extras</th><th>Absorbed Maint. Parts</th><th>Transport & Labor</th><th>Net Margin</th></tr></thead>
          <tbody id="liqContractsBody"></tbody>
        </table>
      </div>

      <div class="pct-ops-card" style="overflow-x:auto;">
        <h4 style="margin-top:0;color:#003B6F;">Itemized Parts & Resources Consumed in Period</h4>
        <table class="pct-ops-table">
          <thead><tr><th>Date</th><th>Order #</th><th>Customer</th><th>Service Type</th><th>Part / Supply Description</th><th>Technician</th><th>Qty</th><th>Internal Cost</th><th>Billing</th></tr></thead>
          <tbody id="liqExpensesBody"></tbody>
        </table>
      </div>
    `;

    async function loadLiq() {
      const m = document.getElementById('liqMonthInput').value || curMonth;
      document.getElementById('btnExportLiqPdf').href = `/api/monthly-settlement/pdf?month=${m}`;
      const res = await fetch(`/api/monthly-settlement?month=${m}`, { credentials: 'include' });
      const data = res.ok ? await res.json() : {
        summary: { total_gross_billed: 0, total_non_billable_parts: 0, total_transport_labor: 0, total_net_margin: 0 },
        contracts: [],
        expenses: []
      };
      const { summary, contracts, expenses } = data;

      document.getElementById('liqKpis').innerHTML = `
        <div class="pct-ops-card" style="margin:0;border-left:4px solid #003B6F;"><small style="color:#64748b;font-weight:700;">GROSS BILLED REVENUE</small><div style="font-size:1.45rem;font-weight:800;color:#003B6F;">$${Number(summary.total_gross_billed).toFixed(2)}</div></div>
        <div class="pct-ops-card" style="margin:0;border-left:4px solid #DC2626;"><small style="color:#64748b;font-weight:700;">NON-BILLABLE MAINT. PARTS</small><div style="font-size:1.45rem;font-weight:800;color:#DC2626;">$${Number(summary.total_non_billable_parts).toFixed(2)}</div></div>
        <div class="pct-ops-card" style="margin:0;border-left:4px solid #D97706;"><small style="color:#64748b;font-weight:700;">TRANSPORT & FIELD LABOR</small><div style="font-size:1.45rem;font-weight:800;color:#D97706;">$${Number(summary.total_transport_labor).toFixed(2)}</div></div>
        <div class="pct-ops-card" style="margin:0;border-left:4px solid #15803D;"><small style="color:#64748b;font-weight:700;">NET MONTHLY MARGIN</small><div style="font-size:1.45rem;font-weight:800;color:#15803D;">$${Number(summary.total_net_margin).toFixed(2)}</div></div>
      `;

      document.getElementById('liqContractsBody').innerHTML = contracts.map(c => `
        <tr>
          <td><strong>${c.order_number}</strong></td>
          <td>${c.customer_name || ''}</td>
          <td>${c.equipment_name || 'N/A'} <small style="color:#64748b;">(${c.equipment_serial || 'N/A'})</small></td>
          <td>${badge(c.status)}</td>
          <td>$${Number(c.rental_revenue).toFixed(2)}</td>
          <td>$${Number(c.billable_extras).toFixed(2)}</td>
          <td style="color:#DC2626;font-weight:600;">$${Number(c.non_billable_parts_cost).toFixed(2)}</td>
          <td style="color:#D97706;font-weight:600;">$${Number(c.transport_labor_cost).toFixed(2)}</td>
          <td style="color:#15803D;font-weight:800;">$${Number(c.net_margin).toFixed(2)}</td>
        </tr>
      `).join('') || '<tr><td colspan="9" style="text-align:center;color:#64748b;">No active orders found for selected month.</td></tr>';

      document.getElementById('liqExpensesBody').innerHTML = expenses.map(ex => `
        <tr>
          <td>${String(ex.expense_date).slice(0,10)}</td>
          <td><strong>${ex.order_number}</strong></td>
          <td>${ex.customer_name || ''}</td>
          <td>${ex.maintenance_type}</td>
          <td>${ex.description}</td>
          <td>${ex.technician_name || '—'}</td>
          <td>${Number(ex.quantity)}</td>
          <td style="color:#DC2626;font-weight:700;">$${Number(ex.internal_total_cost).toFixed(2)}</td>
          <td>${ex.is_billable ? '<span style="color:#15803D;font-weight:700;">Billable</span>' : '<span style="color:#64748b;">Non-Billable (Internal)</span>'}</td>
        </tr>
      `).join('') || '<tr><td colspan="9" style="text-align:center;color:#64748b;">No spare parts or maintenance expenses logged in this month.</td></tr>';
    }

    document.getElementById('btnRefreshLiq').onclick = loadLiq;
    await loadLiq();
  }

  // ==================== EQUIPMENT TRACEABILITY MODAL & TABLE HOOK ====================
  window._pctShowEquipmentHistory = async function (equipmentId) {
    let modal = document.getElementById('pctEqHistoryModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pctEqHistoryModal';
      modal.className = 'pct-modal-backdrop';
      modal.style.zIndex = '10000';
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.innerHTML = '<div class="pct-modal-box" style="max-width:680px;"><p>Loading equipment traceability...</p></div>';

    const res = await fetch(`/api/equipment/${equipmentId}/history`, { credentials: 'include' });
    const data = await res.json();
    const eq = data.equipment || {};
    const hist = data.history || [];

    modal.firstElementChild.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #9EC63B;padding-bottom:10px;margin-bottom:14px;">
        <div>
          <h3 style="margin:0;color:#003B6F;">Equipment Status Traceability</h3>
          <small style="color:#64748b;">${eq.name || ''} | S/N: <strong>${eq.serial_number || 'N/A'}</strong> | Current: ${badge(eq.status)}</small>
        </div>
        <button onclick="document.getElementById('pctEqHistoryModal').style.display='none'" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">&times;</button>
      </div>
      <table class="pct-ops-table">
        <thead><tr><th>Timestamp</th><th>Previous</th><th>New Status</th><th>Changed By</th><th>Notes</th></tr></thead>
        <tbody>
          ${hist.map(h => `
            <tr>
              <td><small>${new Date(h.created_at).toLocaleString()}</small></td>
              <td>${badge(h.previous_status)}</td>
              <td>${badge(h.new_status)}</td>
              <td>${h.changed_by || 'System'}</td>
              <td><small>${h.notes || '—'}</small></td>
            </tr>
          `).join('') || '<tr><td colspan="5" style="text-align:center;color:#64748b;">No status transitions recorded yet.</td></tr>'}
        </tbody>
      </table>
    `;
  };

  function injectEquipmentHistoryButtons() {
    const eqTbody = document.getElementById('equipmentTableBody') || document.querySelector('#equipmentPage tbody');
    if (!eqTbody) return;
    eqTbody.querySelectorAll('tr').forEach(tr => {
      if (tr.dataset.eqHistHooked) return;
      const actionCell = tr.lastElementChild;
      if (!actionCell) return;
      let eqId = null;
      actionCell.querySelectorAll('button').forEach(b => {
        const m = (b.getAttribute('onclick') || '').match(/\((\d+)/);
        if (m) eqId = m[1];
      });
      if (!eqId) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pct-eq-hist-btn';
      btn.textContent = 'History';
      btn.title = 'View full equipment status traceability';
      btn.onclick = () => window._pctShowEquipmentHistory(eqId);
      actionCell.prepend(btn);
      tr.dataset.eqHistHooked = '1';
    });
  }

  function start() {
    injectStyles();
    ensureContainers();
    mountSidebarLinks();
    const obs = new MutationObserver(() => injectEquipmentHistoryButtons());
    obs.observe(document.body, { childList: true, subtree: true });
    injectEquipmentHistoryButtons();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();

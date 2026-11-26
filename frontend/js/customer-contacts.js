(function () {
  let activeCustomerId = null;
  let editingContactId = null;

  const SVG_USERS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  const SVG_TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
  const SVG_EDIT  = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';

  function injectStyles() {
    if (document.getElementById('pctActionStyles')) return;
    const style = document.createElement('style');
    style.id = 'pctActionStyles';
    style.textContent = `
      .pct-actions-group { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
      .pct-icon-btn {
        position: relative; display: inline-flex; align-items: center; justify-content: center;
        width: 34px; height: 34px; padding: 0; border-radius: 8px; cursor: pointer;
        transition: all 0.18s ease; box-shadow: 0 1px 2px rgba(15,23,42,0.06);
      }
      .pct-btn-contacts { background: #EFF6FF; color: #003B6F; border: 1px solid #BFDBFE; }
      .pct-btn-contacts:hover { background: #003B6F; color: #FFFFFF; border-color: #003B6F; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,59,111,0.22); }
      .pct-btn-delete { background: #FEF2F2 !important; color: #DC2626 !important; border: 1px solid #FECACA !important; }
      .pct-btn-delete:hover { background: #DC2626 !important; color: #FFFFFF !important; border-color: #DC2626 !important; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(220,38,38,0.22); }
      .pct-icon-btn::after {
        content: attr(data-tooltip); position: absolute; bottom: calc(100% + 8px); left: 50%;
        transform: translateX(-50%) translateY(4px); background: #0F172A; color: #F8FAFC;
        font-size: 11.5px; font-weight: 600; line-height: 1; padding: 6px 10px; border-radius: 6px;
        white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.16s ease, transform 0.16s ease;
        box-shadow: 0 4px 12px rgba(15,23,42,0.25); z-index: 1000;
      }
      .pct-icon-btn::before {
        content: ''; position: absolute; bottom: calc(100% + 3px); left: 50%;
        transform: translateX(-50%) translateY(4px); border: 5px solid transparent; border-top-color: #0F172A;
        opacity: 0; pointer-events: none; transition: opacity 0.16s ease, transform 0.16s ease; z-index: 1000;
      }
      .pct-icon-btn:hover::after, .pct-icon-btn:hover::before { opacity: 1; transform: translateX(-50%) translateY(0); }
      #pctContactsModal * { box-sizing: border-box; }
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    if (document.getElementById('pctContactsModal')) return;
    const modal = document.createElement('div');
    modal.id = 'pctContactsModal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(15,23,42,0.65);z-index:9999;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
      <div style="background:var(--bg-card,#ffffff);color:var(--text-primary,#0f172a);width:100%;max-width:780px;max-height:90vh;overflow-y:auto;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.35);padding:24px;border:1px solid var(--border-color,#cbd5e1);">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #9EC63B;padding-bottom:12px;margin-bottom:18px;">
          <div>
            <h3 style="margin:0;color:#003B6F;font-size:1.2rem;">Customer Contacts Directory</h3>
            <small id="pctContactsSubtitle" style="color:#64748b;font-weight:600;"></small>
          </div>
          <button type="button" id="pctCloseContactsBtn" aria-label="Close" style="background:transparent;border:none;font-size:1.5rem;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <form id="pctContactForm" style="background:rgba(0,59,111,0.04);padding:16px;border-radius:8px;margin-bottom:20px;border:1px solid rgba(0,59,111,0.12);">
          <div style="font-weight:700;color:#003B6F;margin-bottom:12px;" id="pctFormTitle">+ Add New Contact</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;">
            <div><label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;">Full Name *</label><input type="text" id="pctContactName" required placeholder="e.g., Carlos Rivera" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;" /></div>
            <div><label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;">Phone</label><input type="text" id="pctContactPhone" placeholder="e.g., 787-555-0199" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;" /></div>
            <div><label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;">Email Address</label><input type="email" id="pctContactEmail" placeholder="contact@company.com" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;" /></div>
            <div><label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;">Role / Department</label><input type="text" id="pctContactRole" placeholder="e.g., Plant Manager" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;" /></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;flex-wrap:wrap;gap:10px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer;"><input type="checkbox" id="pctContactPrimary" /> Set as primary contact</label>
            <div style="display:flex;gap:8px;">
              <button type="button" id="pctCancelEditBtn" style="display:none;padding:8px 14px;border-radius:6px;border:1px solid #94a3b8;background:#fff;cursor:pointer;">Cancel</button>
              <button type="submit" style="padding:8px 16px;border-radius:6px;border:none;background:#003B6F;color:#fff;font-weight:600;cursor:pointer;">Save Contact</button>
            </div>
          </div>
        </form>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
            <thead><tr style="background:#003B6F;color:#fff;text-align:left;"><th style="padding:10px;">Name</th><th style="padding:10px;">Phone</th><th style="padding:10px;">Email</th><th style="padding:10px;">Role</th><th style="padding:10px;text-align:right;">Actions</th></tr></thead>
            <tbody id="pctContactsList"></tbody>
          </table>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('pctCloseContactsBtn').onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    document.getElementById('pctCancelEditBtn').onclick = resetForm;
    document.getElementById('pctContactForm').onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        full_name: document.getElementById('pctContactName').value.trim(),
        phone: document.getElementById('pctContactPhone').value.trim(),
        email: document.getElementById('pctContactEmail').value.trim(),
        position: document.getElementById('pctContactRole').value.trim(),
        is_primary: document.getElementById('pctContactPrimary').checked
      };
      const url = editingContactId ? `/api/customer-contacts/${editingContactId}` : `/api/customers/${activeCustomerId}/contacts`;
      const res = await fetch(url, { method: editingContactId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'Failed to save contact'); return; }
      resetForm();
      await loadContacts();
      if (typeof window.loadCustomers === 'function') window.loadCustomers();
    };
  }

  function resetForm() {
    editingContactId = null;
    document.getElementById('pctFormTitle').textContent = '+ Add New Contact';
    ['pctContactName', 'pctContactPhone', 'pctContactEmail', 'pctContactRole'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('pctContactPrimary').checked = false;
    document.getElementById('pctCancelEditBtn').style.display = 'none';
  }

  async function loadContacts() {
    const tbody = document.getElementById('pctContactsList');
    tbody.innerHTML = '<tr><td colspan="5" style="padding:14px;text-align:center;">Loading contacts...</td></tr>';
    const res = await fetch(`/api/customers/${activeCustomerId}/contacts`, { credentials: 'include' });
    const contacts = await res.json();
    if (!Array.isArray(contacts) || !contacts.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="padding:16px;text-align:center;color:#64748b;">No contacts registered yet. Add the first one above.</td></tr>';
      return;
    }
    tbody.innerHTML = contacts.map(c => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px;font-weight:600;">${c.full_name}${c.is_primary ? '<span style="background:#9EC63B;color:#0f172a;font-size:0.72rem;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:700;">Primary</span>' : ''}</td>
        <td style="padding:10px;">${c.phone ? `<a href="tel:${c.phone}" style="color:#005596;text-decoration:none;">${c.phone}</a>` : '—'}</td>
        <td style="padding:10px;">${c.email ? `<a href="mailto:${c.email}" style="color:#005596;text-decoration:none;">${c.email}</a>` : '—'}</td>
        <td style="padding:10px;color:#475569;">${c.position || '—'}</td>
        <td style="padding:10px;text-align:right;">
          <div class="pct-actions-group">
            <button type="button" class="pct-icon-btn pct-btn-contacts" data-tooltip="Edit contact" onclick='window._pctEditContact(${JSON.stringify(c)})'>${SVG_EDIT}</button>
            <button type="button" class="pct-icon-btn pct-btn-delete" data-tooltip="Delete contact" onclick="window._pctDeleteContact(${c.id})">${SVG_TRASH}</button>
          </div>
        </td>
      </tr>`).join('');
  }

  window.openCustomerContacts = async function (customerId, customerName) {
    ensureModal();
    activeCustomerId = customerId;
    document.getElementById('pctContactsSubtitle').textContent = customerName || `Customer #${customerId}`;
    resetForm();
    document.getElementById('pctContactsModal').style.display = 'flex';
    await loadContacts();
  };

  window._pctEditContact = function (c) {
    editingContactId = c.id;
    document.getElementById('pctFormTitle').textContent = `Editing: ${c.full_name}`;
    document.getElementById('pctContactName').value = c.full_name || '';
    document.getElementById('pctContactPhone').value = c.phone || '';
    document.getElementById('pctContactEmail').value = c.email || '';
    document.getElementById('pctContactRole').value = c.position || '';
    document.getElementById('pctContactPrimary').checked = Boolean(c.is_primary);
    document.getElementById('pctCancelEditBtn').style.display = 'inline-block';
  };

  window._pctDeleteContact = async function (contactId) {
    if (!confirm('Delete this contact from the customer?')) return;
    await fetch(`/api/customer-contacts/${contactId}`, { method: 'DELETE', credentials: 'include' });
    await loadContacts();
  };

  function injectRowButtons() {
    injectStyles();
    const customerTable = Array.from(document.querySelectorAll('table')).find(tbl => {
      const th = (tbl.querySelector('thead')?.textContent || '').trim();
      return /Phone/i.test(th) && /Email/i.test(th) && !/Part\s*#|Stock|Serial|Quote/i.test(th);
    });
    if (!customerTable) return;
    const tbody = customerTable.querySelector('tbody');
    if (!tbody) return;

    tbody.querySelectorAll('tr').forEach(tr => {
      if (tr.dataset.contactsHooked) return;
      const actionCell = tr.lastElementChild;
      if (!actionCell) return;
      const existingBtns = Array.from(actionCell.querySelectorAll('button'));
      if (!existingBtns.length) return;

      let cid = null;
      existingBtns.forEach(b => {
        const m = (b.getAttribute('onclick') || '').match(/\((\d+)/);
        if (m) cid = m[1];
      });
      if (!cid) return;

      const cname = (tr.cells[0] && tr.cells[0].textContent.trim()) || '';
      const wrap = document.createElement('div');
      wrap.className = 'pct-actions-group';

      const contactsBtn = document.createElement('button');
      contactsBtn.type = 'button';
      contactsBtn.className = 'pct-icon-btn pct-btn-contacts';
      contactsBtn.setAttribute('data-tooltip', 'Manage contacts');
      contactsBtn.setAttribute('aria-label', 'Manage contacts');
      contactsBtn.innerHTML = SVG_USERS;
      contactsBtn.onclick = () => window.openCustomerContacts(cid, cname);
      wrap.appendChild(contactsBtn);

      existingBtns.forEach(b => {
        const isDel = /delete|eliminar/i.test((b.textContent || '') + (b.getAttribute('onclick') || ''));
        b.removeAttribute('style');
        b.className = `pct-icon-btn ${isDel ? 'pct-btn-delete' : 'pct-btn-contacts'}`;
        b.setAttribute('data-tooltip', isDel ? 'Delete customer' : 'Edit customer');
        b.setAttribute('aria-label', isDel ? 'Delete customer' : 'Edit customer');
        b.innerHTML = isDel ? SVG_TRASH : SVG_EDIT;
        wrap.appendChild(b);
      });

      actionCell.innerHTML = '';
      actionCell.appendChild(wrap);
      tr.dataset.contactsHooked = '1';
    });
  }

  const observer = new MutationObserver(() => injectRowButtons());
  const start = () => { observer.observe(document.body, { childList: true, subtree: true }); injectRowButtons(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();

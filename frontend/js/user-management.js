(function () {
  let cachedUsers = [];
  let cachedRoles = [];
  let currentUser = null;

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

  function ensureViewContainer() {
    const host = getContentHost();
    let div = document.getElementById('pctUsersView');
    if (!div) {
      div = document.createElement('div');
      div.id = 'pctUsersView';
      div.className = 'pct-ops-view';
    }
    if (div.parentElement !== host) host.appendChild(div);
    return div;
  }

  function openUsersView(linkEl) {
    const host = getContentHost();
    ensureViewContainer();
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
    const view = document.getElementById('pctUsersView');
    if (view) view.style.display = 'block';
  }

  function mountSidebarLink() {
    const refLink = document.getElementById('nav-pct-settlement') ||
      Array.from(document.querySelectorAll('a, button, li')).find(el => /API Docs/i.test(el.textContent || ''));
    const nav = refLink ? refLink.parentElement : document.querySelector('.sidebar nav, .sidebar ul, aside nav, aside ul, .sidebar');
    if (!nav || document.getElementById('nav-pct-users')) return;

    const link = document.createElement('a');
    link.id = 'nav-pct-users';
    link.href = '#';
    link.className = 'pct-sidebar-link';
    link.innerHTML = '<span style="font-size:1.05rem;line-height:1;">🔐</span><span>Users & Roles</span>';
    link.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      nav.querySelectorAll('a, button, li').forEach(el => el.classList.remove('active'));
      openUsersView(link);
      await renderUsersView();
    };
    nav.appendChild(link);
  }

  async function renderUsersView() {
    const root = ensureViewContainer();
    root.innerHTML = '<div class="pct-ops-card">Loading user administration...</div>';

    const [meRes, listRes] = await Promise.all([
      fetch('/api/users/me', { credentials: 'include' }),
      fetch('/api/users', { credentials: 'include' })
    ]);
    const meData = meRes.ok ? await meRes.json() : { user: null, roles: [] };
    const listData = listRes.ok ? await listRes.json() : { users: [], roles: [] };

    currentUser = meData.user;
    cachedUsers = listData.users || [];
    cachedRoles = (listData.roles && listData.roles.length ? listData.roles : meData.roles) || [
      { id: 1, name: 'Administrator' },
      { id: 2, name: 'Operator / Technician' }
    ];

    const roleOptions = cachedRoles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');

    root.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="margin:0;color:#003B6F;">User Administration & Security</h2>
          <small style="color:#64748b;">Manage system users, assign administrator/operator roles, update profiles, and reset passwords.</small>
        </div>
        <button type="button" class="pct-ops-btn pct-ops-btn-primary" id="btnOpenNewUser">+ New User</button>
      </div>

      ${currentUser ? `
      <div class="pct-ops-card" style="border-left:4px solid #689F38;">
        <h4 style="margin:0 0 10px 0;color:#003B6F;">My Account & Quick Password Update (${currentUser.username})</h4>
        <form id="pctMyProfileForm" class="pct-ops-grid" style="align-items:end;">
          <div>
            <label style="font-size:0.82rem;font-weight:600;">Full Name *</label>
            <input type="text" id="myFullName" class="pct-ops-input" value="${currentUser.full_name || ''}" required />
          </div>
          <div>
            <label style="font-size:0.82rem;font-weight:600;">Email Address *</label>
            <input type="email" id="myEmail" class="pct-ops-input" value="${currentUser.email || ''}" required />
          </div>
          <div>
            <label style="font-size:0.82rem;font-weight:600;">New Password (optional)</label>
            <input type="password" id="myNewPassword" class="pct-ops-input" placeholder="Min. 6 chars to change..." />
          </div>
          <div>
            <button type="submit" class="pct-ops-btn pct-ops-btn-green" style="width:100%;justify-content:center;">Update My Profile</button>
          </div>
        </form>
      </div>
      ` : ''}

      <div class="pct-ops-card" style="overflow-x:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
          <strong style="color:#003B6F;">Registered System Users (${cachedUsers.length})</strong>
          <input type="text" id="usrSearchInput" class="pct-ops-input" style="max-width:290px;" placeholder="Filter by name, username, or email..." />
        </div>
        <table class="pct-ops-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="pctUsersTableBody"></tbody>
        </table>
      </div>

      <!-- Create / Edit User Modal -->
      <div id="pctUserModal" class="pct-modal-backdrop">
        <div class="pct-modal-box" style="max-width:540px;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #9EC63B;padding-bottom:10px;margin-bottom:14px;">
            <h3 id="pctUserModalTitle" style="margin:0;color:#003B6F;">Create User</h3>
            <button type="button" onclick="document.getElementById('pctUserModal').style.display='none'" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">&times;</button>
          </div>
          <form id="pctUserCrudForm" style="display:flex;flex-direction:column;gap:12px;">
            <input type="hidden" id="usrEditId" />
            <div class="pct-ops-grid">
              <div>
                <label style="font-size:0.82rem;font-weight:600;">Full Name *</label>
                <input type="text" id="usrFullName" class="pct-ops-input" placeholder="e.g., Adriana Barney" required />
              </div>
              <div>
                <label style="font-size:0.82rem;font-weight:600;">Username *</label>
                <input type="text" id="usrUsername" class="pct-ops-input" placeholder="e.g., adbarney" required />
              </div>
              <div>
                <label style="font-size:0.82rem;font-weight:600;">Email Address *</label>
                <input type="email" id="usrEmail" class="pct-ops-input" placeholder="user@procoatingpr.com" required />
              </div>
              <div>
                <label style="font-size:0.82rem;font-weight:600;">Access Role *</label>
                <select id="usrRoleId" class="pct-ops-input">${roleOptions}</select>
              </div>
              <div>
                <label id="usrPasswordLabel" style="font-size:0.82rem;font-weight:600;">Password *</label>
                <input type="password" id="usrPassword" class="pct-ops-input" placeholder="Minimum 6 characters" />
              </div>
              <div>
                <label style="font-size:0.82rem;font-weight:600;">Account Status</label>
                <select id="usrIsActive" class="pct-ops-input">
                  <option value="true">Active (Can Sign In)</option>
                  <option value="false">Inactive (Suspended)</option>
                </select>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
              <button type="button" class="pct-ops-btn pct-ops-btn-outline" onclick="document.getElementById('pctUserModal').style.display='none'">Cancel</button>
              <button type="submit" class="pct-ops-btn pct-ops-btn-green">Save User</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Reset Password Modal -->
      <div id="pctResetPwModal" class="pct-modal-backdrop">
        <div class="pct-modal-box" style="max-width:420px;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #9EC63B;padding-bottom:10px;margin-bottom:14px;">
            <h3 id="pctResetPwTitle" style="margin:0;color:#003B6F;">Reset User Password</h3>
            <button type="button" onclick="document.getElementById('pctResetPwModal').style.display='none'" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">&times;</button>
          </div>
          <form id="pctResetPwForm" style="display:flex;flex-direction:column;gap:12px;">
            <input type="hidden" id="pwTargetUserId" />
            <div>
              <label style="font-size:0.82rem;font-weight:600;">New Password *</label>
              <input type="password" id="pwNewValue" class="pct-ops-input" placeholder="Enter new password (min. 6 chars)" required />
            </div>
            <div>
              <label style="font-size:0.82rem;font-weight:600;">Confirm New Password *</label>
              <input type="password" id="pwConfirmValue" class="pct-ops-input" placeholder="Repeat new password" required />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
              <button type="button" class="pct-ops-btn pct-ops-btn-outline" onclick="document.getElementById('pctResetPwModal').style.display='none'">Cancel</button>
              <button type="submit" class="pct-ops-btn pct-ops-btn-primary">Update Password</button>
            </div>
          </form>
        </div>
      </div>
    `;

    function drawRows(filterText = '') {
      const q = filterText.trim().toLowerCase();
      const filtered = cachedUsers.filter(u =>
        !q ||
        String(u.full_name || '').toLowerCase().includes(q) ||
        String(u.username || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q)
      );
      const tbody = document.getElementById('pctUsersTableBody');
      tbody.innerHTML = filtered.map(u => {
        const isAdmin = Number(u.role_id) === 1 || /admin/i.test(u.role_name || '');
        const roleBadge = isAdmin
          ? `<span style="background:#DBEAFE;color:#1E40AF;padding:3px 9px;border-radius:999px;font-size:0.76rem;font-weight:700;">${u.role_name || 'Administrator'}</span>`
          : `<span style="background:#F1F5F9;color:#334155;padding:3px 9px;border-radius:999px;font-size:0.76rem;font-weight:700;">${u.role_name || 'Operator'}</span>`;
        const statusBadge = u.is_active
          ? '<span style="background:#DCFCE7;color:#166534;padding:3px 9px;border-radius:999px;font-size:0.76rem;font-weight:700;">Active</span>'
          : '<span style="background:#FEE2E2;color:#991B1B;padding:3px 9px;border-radius:999px;font-size:0.76rem;font-weight:700;">Inactive</span>';

        return `
          <tr>
            <td><strong>#${u.id}</strong></td>
            <td><strong>${u.full_name || ''}</strong></td>
            <td><code>${u.username || ''}</code></td>
            <td>${u.email || ''}</td>
            <td>${roleBadge}</td>
            <td>${statusBadge}</td>
            <td><small style="color:#64748b;">${u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</small></td>
            <td style="text-align:right;white-space:nowrap;">
              <button type="button" class="pct-ops-btn pct-ops-btn-outline" style="padding:5px 9px;" onclick="window._pctEditUser(${u.id})">Edit</button>
              <button type="button" class="pct-ops-btn pct-ops-btn-primary" style="padding:5px 9px;" onclick="window._pctOpenResetPw(${u.id})">Password</button>
              ${u.id !== 1 ? `<button type="button" class="pct-ops-btn" style="padding:5px 9px;background:#FEE2E2;color:#DC2626;" onclick="window._pctDeleteUser(${u.id})">Delete</button>` : ''}
            </td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="8" style="text-align:center;color:#64748b;">No users matched your search.</td></tr>';
    }

    drawRows();
    document.getElementById('usrSearchInput').oninput = (e) => drawRows(e.target.value);

    const myForm = document.getElementById('pctMyProfileForm');
    if (myForm) {
      myForm.onsubmit = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/users/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            full_name: document.getElementById('myFullName').value,
            email: document.getElementById('myEmail').value,
            new_password: document.getElementById('myNewPassword').value
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { alert(data.error || 'Failed to update profile'); return; }
        alert('Profile updated successfully.');
        await renderUsersView();
      };
    }

    document.getElementById('btnOpenNewUser').onclick = () => {
      document.getElementById('pctUserModalTitle').textContent = '+ Create New System User';
      document.getElementById('usrEditId').value = '';
      document.getElementById('usrFullName').value = '';
      document.getElementById('usrUsername').value = '';
      document.getElementById('usrEmail').value = '';
      document.getElementById('usrRoleId').value = cachedRoles[0] ? cachedRoles[0].id : 1;
      document.getElementById('usrPasswordLabel').textContent = 'Initial Password *';
      document.getElementById('usrPassword').value = '';
      document.getElementById('usrPassword').placeholder = 'Minimum 6 characters';
      document.getElementById('usrIsActive').value = 'true';
      document.getElementById('pctUserModal').style.display = 'flex';
    };

    document.getElementById('pctUserCrudForm').onsubmit = async (e) => {
      e.preventDefault();
      const editId = document.getElementById('usrEditId').value;
      const payload = {
        full_name: document.getElementById('usrFullName').value,
        username: document.getElementById('usrUsername').value,
        email: document.getElementById('usrEmail').value,
        role_id: document.getElementById('usrRoleId').value,
        password: document.getElementById('usrPassword').value,
        is_active: document.getElementById('usrIsActive').value === 'true'
      };
      const url = editId ? `/api/users/${editId}` : '/api/users';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error || 'Error saving user'); return; }
      document.getElementById('pctUserModal').style.display = 'none';
      await renderUsersView();
    };

    document.getElementById('pctResetPwForm').onsubmit = async (e) => {
      e.preventDefault();
      const p1 = document.getElementById('pwNewValue').value.trim();
      const p2 = document.getElementById('pwConfirmValue').value.trim();
      if (p1 !== p2) { alert('Passwords do not match.'); return; }
      const targetId = document.getElementById('pwTargetUserId').value;
      const res = await fetch(`/api/users/${targetId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_password: p1 })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error || 'Failed to update password'); return; }
      document.getElementById('pctResetPwModal').style.display = 'none';
      alert('Password updated successfully.');
    };
  }

  window._pctEditUser = function (uid) {
    const u = cachedUsers.find(x => Number(x.id) === Number(uid));
    if (!u) return;
    document.getElementById('pctUserModalTitle').textContent = `Edit User: ${u.full_name} (${u.username})`;
    document.getElementById('usrEditId').value = u.id;
    document.getElementById('usrFullName').value = u.full_name || '';
    document.getElementById('usrUsername').value = u.username || '';
    document.getElementById('usrEmail').value = u.email || '';
    document.getElementById('usrRoleId').value = u.role_id || 1;
    document.getElementById('usrPasswordLabel').textContent = 'New Password (optional)';
    document.getElementById('usrPassword').value = '';
    document.getElementById('usrPassword').placeholder = 'Leave blank to keep current password';
    document.getElementById('usrIsActive').value = u.is_active ? 'true' : 'false';
    document.getElementById('pctUserModal').style.display = 'flex';
  };

  window._pctOpenResetPw = function (uid) {
    const u = cachedUsers.find(x => Number(x.id) === Number(uid));
    if (!u) return;
    document.getElementById('pctResetPwTitle').textContent = `Reset Password: ${u.full_name} (${u.username})`;
    document.getElementById('pwTargetUserId').value = u.id;
    document.getElementById('pwNewValue').value = '';
    document.getElementById('pwConfirmValue').value = '';
    document.getElementById('pctResetPwModal').style.display = 'flex';
  };

  window._pctDeleteUser = async function (uid) {
    const u = cachedUsers.find(x => Number(x.id) === Number(uid));
    if (!confirm(`Delete user "${u ? u.full_name : uid}"?`)) return;
    const res = await fetch(`/api/users/${uid}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data.error || 'Could not delete user'); return; }
    await renderUsersView();
  };

  function start() {
    ensureViewContainer();
    mountSidebarLink();
    const obs = new MutationObserver(() => mountSidebarLink());
    obs.observe(document.body, { childList: true, subtree: true });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();

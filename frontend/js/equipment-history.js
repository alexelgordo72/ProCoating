(function () {
  let snToId = null;
  let loadingPromise = null;

  async function ensureEquipmentMap() {
    if (snToId && snToId.size > 0) return snToId;
    if (loadingPromise) return loadingPromise;
    loadingPromise = fetch('/api/operations/lookups', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { equipment: [] }))
      .then(data => {
        const map = new Map();
        (data.equipment || []).forEach(e => {
          const raw = String(e.serial_number || e.serial || '').trim().toLowerCase();
          if (raw) {
            map.set(raw, e.id);
            map.set(raw.replace(/\s+/g, ''), e.id);
          }
        });
        snToId = map;
        return map;
      })
      .finally(() => { loadingPromise = null; });
    return loadingPromise;
  }

  async function openFallbackHistoryModal(eqId) {
    if (typeof window._pctShowEquipmentHistory === 'function') {
      return window._pctShowEquipmentHistory(eqId);
    }
    const res = await fetch(`/api/equipment/${eqId}/history`, { credentials: 'include' });
    const data = await res.json();
    const eq = data.equipment || {};
    const hist = data.history || [];
    alert(`Equipment: ${eq.name || ''} (S/N: ${eq.serial_number || 'N/A'})\nCurrent Status: ${eq.status || 'Available'}\nTransitions: ${hist.length}`);
  }

  async function hookEquipmentCards() {
    const heading = Array.from(document.querySelectorAll('h1, h2, h3')).find(
      el => /Equipment Fleet/i.test(el.textContent || '')
    );
    if (!heading) return;

    const map = await ensureEquipmentMap();
    if (!map || map.size === 0) return;

    const root = heading.closest('section') || heading.parentElement?.parentElement || document.body;
    Array.from(root.querySelectorAll('div')).forEach(card => {
      if (card.dataset.eqHistHooked) return;
      const txt = card.textContent || '';
      if (!/S\/N:/i.test(txt) || !/Model:/i.test(txt)) return;
      const hasInner = Array.from(card.querySelectorAll('div')).some(
        d => /S\/N:/i.test(d.textContent || '') && /Model:/i.test(d.textContent || '')
      );
      if (hasInner) return;

      const m = txt.match(/S\/N:\s*([^\|\n\r]+)/i);
      if (!m) return;
      const rawSn = m[1].trim().toLowerCase();
      const eqId = map.get(rawSn) || map.get(rawSn.replace(/\s+/g, ''));
      if (!eqId) return;

      const bar = document.createElement('div');
      bar.style.cssText = 'margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'History / Traceability';
      btn.style.cssText = 'padding:5px 10px;border-radius:6px;border:1px solid #005596;background:#EFF6FF;color:#003B6F;font-size:0.78rem;font-weight:700;cursor:pointer;';
      btn.onmouseenter = () => { btn.style.background = '#003B6F'; btn.style.color = '#FFFFFF'; };
      btn.onmouseleave = () => { btn.style.background = '#EFF6FF'; btn.style.color = '#003B6F'; };
      btn.onclick = (ev) => { ev.stopPropagation(); openFallbackHistoryModal(eqId); };
      bar.appendChild(btn);
      card.appendChild(bar);
      card.dataset.eqHistHooked = '1';
    });
  }

  const obs = new MutationObserver(() => hookEquipmentCards());
  const start = () => { obs.observe(document.body, { childList: true, subtree: true }); hookEquipmentCards(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();

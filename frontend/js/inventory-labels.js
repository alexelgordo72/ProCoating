(function () {
  const SVG_BARCODE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>';

  function findInventoryTable() {
    return Array.from(document.querySelectorAll('table')).find(tbl => {
      const th = (tbl.querySelector('thead')?.textContent || '').trim();
      return /Part\s*#/i.test(th) && /Stock/i.test(th);
    });
  }

  function injectToolbar(invTable) {
    if (!invTable || document.getElementById('pctInvBarcodeBar')) return;
    const bar = document.createElement('div');
    bar.id = 'pctInvBarcodeBar';
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;background:#F8FAFC;border:1px solid #CBD5E1;border-left:4px solid #003B6F;border-radius:8px;padding:10px 14px;margin:10px 0 14px 0;';
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="color:#003B6F;display:inline-flex;">${SVG_BARCODE}</span>
        <div>
          <strong style="color:#003B6F;font-size:0.9rem;">Warehouse Box Barcode Labels (Code 128)</strong>
          <div style="font-size:0.78rem;color:#64748b;">Print scannable box labels (2×5 per Letter sheet) or scan a barcode into the search box above.</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="/api/inventory/labels/pdf?scope=new" target="_blank" style="text-decoration:none;padding:6px 12px;border-radius:6px;background:#003B6F;color:#FFFFFF;font-size:0.82rem;font-weight:600;">Print New Warehouse Batch (91)</a>
        <a href="/api/inventory/labels/pdf?scope=pending" target="_blank" style="text-decoration:none;padding:6px 12px;border-radius:6px;background:#FEF3C7;color:#92400E;border:1px solid #F59E0B;font-size:0.82rem;font-weight:700;">Print Pending Count Labels (23)</a>
        <a href="/api/inventory/labels/pdf?scope=all" target="_blank" style="text-decoration:none;padding:6px 12px;border-radius:6px;background:#FFFFFF;color:#003B6F;border:1px solid #003B6F;font-size:0.82rem;font-weight:600;">Print Full Catalog</a>
      </div>
    `;
    invTable.parentElement.insertBefore(bar, invTable);
  }

  function injectRowLabelButtons() {
    const invTable = findInventoryTable();
    if (!invTable) return;
    injectToolbar(invTable);

    const tbody = invTable.querySelector('tbody');
    if (!tbody) return;

    tbody.querySelectorAll('tr').forEach(tr => {
      if (tr.dataset.barcodeHooked) return;
      const actionCell = tr.lastElementChild;
      if (!actionCell) return;

      let itemId = null;
      actionCell.querySelectorAll('button').forEach(b => {
        const m = (b.getAttribute('onclick') || '').match(/\((\d+)/);
        if (m) itemId = m[1];
      });
      if (!itemId) return;

      const btn = document.createElement('a');
      btn.href = `/api/inventory/labels/pdf?ids=${itemId}`;
      btn.target = '_blank';
      btn.title = 'Print Box Barcode Label (PDF)';
      btn.setAttribute('aria-label', 'Print Box Barcode Label');
      btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin-right:4px;border-radius:6px;background:#EFF6FF;color:#003B6F;border:1px solid #BFDBFE;text-decoration:none;vertical-align:middle;';
      btn.innerHTML = SVG_BARCODE;
      actionCell.prepend(btn);
      tr.dataset.barcodeHooked = '1';
    });
  }

  const observer = new MutationObserver(() => injectRowLabelButtons());
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    injectRowLabelButtons();
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();

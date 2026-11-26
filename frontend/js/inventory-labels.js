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
    bar.className = 'pct-barcode-bar';
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;min-width:220px;flex:1 1 280px;">
        <span class="pct-barcode-icon" style="display:inline-flex;flex-shrink:0;">${SVG_BARCODE}</span>
        <div>
          <strong class="pct-barcode-title" style="font-size:0.9rem;display:block;">Warehouse Box Barcode Labels (Code 128)</strong>
          <span class="pct-barcode-sub" style="font-size:0.78rem;display:block;">Print scannable box labels (2×5 per Letter sheet) or scan a barcode into the search box above.</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <a href="/api/inventory/labels/pdf?scope=new" target="_blank" style="text-decoration:none;padding:6px 11px;border-radius:6px;background:#003B6F;color:#FFFFFF;font-size:0.8rem;font-weight:600;white-space:nowrap;">Print New Batch (91)</a>
        <a href="/api/inventory/labels/pdf?scope=pending" target="_blank" style="text-decoration:none;padding:6px 11px;border-radius:6px;background:#FEF3C7;color:#92400E;border:1px solid #F59E0B;font-size:0.8rem;font-weight:700;white-space:nowrap;">Print Pending (23)</a>
        <a href="/api/inventory/labels/pdf?scope=all" target="_blank" class="pct-barcode-btn-all" style="text-decoration:none;padding:6px 11px;border-radius:6px;font-size:0.8rem;font-weight:600;white-space:nowrap;">Print Full Catalog</a>
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

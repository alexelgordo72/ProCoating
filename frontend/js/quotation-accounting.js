(function () {
  let nextQuoteCode = 'Q-000001';

  async function refreshNextQuoteCode() {
    try {
      const res = await fetch('/api/quotations', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.quotations || data.rows || []);
      const maxId = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
      nextQuoteCode = `Q-${String(maxId + 1).padStart(6, '0')}`;
    } catch (_) {}
  }

  function enhanceQuoteForms() {
    const forms = Array.from(document.querySelectorAll('form, .modal, [id*="quote" i], [id*="quotation" i]'));
    forms.forEach(container => {
      const isQuoteContext = /quotation|quote/i.test(container.id || '') ||
        /quote\s*#|quotation\s*#|service category/i.test(container.textContent || '');
      if (!isQuoteContext) return;

      const inputs = Array.from(container.querySelectorAll('input, select, textarea'));
      const quoteNumInput = inputs.find(el => {
        const idn = `${el.id || ''} ${el.name || ''} ${el.placeholder || ''}`.toLowerCase();
        return /quote.?number|quote_no|quoteno/.test(idn);
      });

      if (quoteNumInput) {
        if (!quoteNumInput.value || !/^Q-\d{6}$/.test(quoteNumInput.value)) {
          quoteNumInput.value = nextQuoteCode;
        }
        quoteNumInput.readOnly = true;
        quoteNumInput.style.backgroundColor = '#f1f5f9';
        quoteNumInput.style.fontWeight = '700';
      }

      if (!container.querySelector('#pctApprovedAccountingQuote')) {
        const anchor = quoteNumInput ? (quoteNumInput.closest('.form-group, .pct-field, .col-md-6, .col-md-4, .mb-3, div') || quoteNumInput) : container.firstElementChild;
        if (anchor && anchor.parentElement) {
          const wrap = document.createElement('div');
          wrap.className = anchor.className || 'pct-field';
          wrap.style.marginTop = '8px';
          wrap.innerHTML = `
            <label for="pctApprovedAccountingQuote" style="display:block;font-weight:600;margin-bottom:4px;">
              Approved Accounting Quote # (Real / Approved)
            </label>
            <input
              type="text"
              id="pctApprovedAccountingQuote"
              name="approved_accounting_quote"
              class="form-control pct-ops-input"
              placeholder="Enter accounting quote # once approved..."
            />
          `;
          anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
        }
      }
    });
  }

  // Ensure fetch requests to /api/quotations include approved_accounting_quote and Q-000001
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (/\/api\/quotations(?:\/\d+)?$/i.test(url) && (method === 'POST' || method === 'PUT' || method === 'PATCH') && init && typeof init.body === 'string') {
      try {
        const payload = JSON.parse(init.body);
        const accInput = document.getElementById('pctApprovedAccountingQuote');
        if (accInput && payload.approved_accounting_quote === undefined) {
          payload.approved_accounting_quote = accInput.value.trim() || null;
        }
        if (method === 'POST' && (!payload.quote_number || !/^Q-\d{6}$/.test(String(payload.quote_number)))) {
          payload.quote_number = nextQuoteCode;
        }
        init = Object.assign({}, init, { body: JSON.stringify(payload) });
      } catch (_) {}
    }
    const resp = await origFetch(input, init);
    if (/\/api\/quotations(?:\/\d+)?$/i.test(url) && (method === 'POST' || method === 'PUT' || method === 'PATCH') && resp.ok) {
      await refreshNextQuoteCode();
      setTimeout(enhanceQuoteForms, 150);
    }
    return resp;
  };

  const obs = new MutationObserver(() => enhanceQuoteForms());
  const boot = async () => {
    await refreshNextQuoteCode();
    enhanceQuoteForms();
    obs.observe(document.body, { childList: true, subtree: true });
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();

(function () {
  function injectThemeStyles() {
    if (document.getElementById('pctThemeCompatStyles')) return;
    const st = document.createElement('style');
    st.id = 'pctThemeCompatStyles';
    st.textContent = `
      /* Base Light Styles for Barcode Bar */
      .pct-barcode-bar {
        display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
        gap: 10px; width: 100%; max-width: 100%; box-sizing: border-box;
        background: #F8FAFC; border: 1px solid #CBD5E1; border-left: 4px solid #003B6F;
        border-radius: 8px; padding: 10px 14px; margin: 10px 0 14px 0;
      }
      .pct-barcode-bar * { box-sizing: border-box; }
      .pct-barcode-icon, .pct-barcode-title { color: #003B6F; }
      .pct-barcode-sub { color: #475569; }
      .pct-barcode-btn-all { background: #FFFFFF; color: #003B6F; border: 1px solid #003B6F; }

      /* Dark Mode Compatibility across all selectors */
      body.dark-mode .pct-barcode-bar, body.dark .pct-barcode-bar, html.dark .pct-barcode-bar, [data-theme="dark"] .pct-barcode-bar {
        background: #1E293B !important; border-color: #334155 !important; border-left-color: #9EC63B !important;
      }
      body.dark-mode .pct-barcode-icon, body.dark .pct-barcode-icon, html.dark .pct-barcode-icon, [data-theme="dark"] .pct-barcode-icon,
      body.dark-mode .pct-barcode-title, body.dark .pct-barcode-title, html.dark .pct-barcode-title, [data-theme="dark"] .pct-barcode-title {
        color: #9EC63B !important;
      }
      body.dark-mode .pct-barcode-sub, body.dark .pct-barcode-sub, html.dark .pct-barcode-sub, [data-theme="dark"] .pct-barcode-sub {
        color: #CBD5E1 !important;
      }
      body.dark-mode .pct-barcode-btn-all, body.dark .pct-barcode-btn-all, html.dark .pct-barcode-btn-all, [data-theme="dark"] .pct-barcode-btn-all {
        background: #0F172A !important; color: #E2E8F0 !important; border-color: #475569 !important;
      }

      /* Fix Native Yellow Stock Alert & Inline Light Banners in Dark Mode */
      body.dark-mode [style*="fef3c7"], body.dark [style*="fef3c7"], html.dark [style*="fef3c7"], [data-theme="dark"] [style*="fef3c7"],
      body.dark-mode [style*="fffbeb"], body.dark [style*="fffbeb"], html.dark [style*="fffbeb"], [data-theme="dark"] [style*="fffbeb"],
      body.dark-mode [style*="fff3cd"], body.dark [style*="fff3cd"], html.dark [style*="fff3cd"], [data-theme="dark"] [style*="fff3cd"],
      body.dark-mode .pct-dark-alert-fix, body.dark .pct-dark-alert-fix, html.dark .pct-dark-alert-fix, [data-theme="dark"] .pct-dark-alert-fix {
        background: #422006 !important;
        color: #FEF3C7 !important;
        border-color: #F59E0B !important;
      }
      body.dark-mode .pct-dark-alert-fix *, body.dark .pct-dark-alert-fix *, html.dark .pct-dark-alert-fix *, [data-theme="dark"] .pct-dark-alert-fix * {
        color: #FEF3C7 !important;
      }

      /* Custom Cards, Sections, Inputs, Tables & Modals in Dark Mode */
      body.dark-mode .pct-ops-card, body.dark .pct-ops-card, html.dark .pct-ops-card, [data-theme="dark"] .pct-ops-card,
      body.dark-mode .pct-modal-box, body.dark .pct-modal-box, html.dark .pct-modal-box, [data-theme="dark"] .pct-modal-box,
      body.dark-mode #pctContactsModal > div, body.dark #pctContactsModal > div, html.dark #pctContactsModal > div, [data-theme="dark"] #pctContactsModal > div {
        background: #1E293B !important; color: #F8FAFC !important; border-color: #334155 !important;
      }
      body.dark-mode .pct-form-section, body.dark .pct-form-section, html.dark .pct-form-section, [data-theme="dark"] .pct-form-section {
        background: #0F172A !important; border-color: #334155 !important;
      }
      body.dark-mode .pct-form-section-title, body.dark .pct-form-section-title, html.dark .pct-form-section-title, [data-theme="dark"] .pct-form-section-title,
      body.dark-mode .pct-ops-view h2, body.dark .pct-ops-view h2, html.dark .pct-ops-view h2, [data-theme="dark"] .pct-ops-view h2,
      body.dark-mode .pct-ops-view h3, body.dark .pct-ops-view h3, html.dark .pct-ops-view h3, [data-theme="dark"] .pct-ops-view h3,
      body.dark-mode .pct-ops-view h4, body.dark .pct-ops-view h4, html.dark .pct-ops-view h4, [data-theme="dark"] .pct-ops-view h4 {
        color: #9EC63B !important;
      }
      body.dark-mode .pct-field label, body.dark .pct-field label, html.dark .pct-field label, [data-theme="dark"] .pct-field label,
      body.dark-mode .pct-items-header, body.dark .pct-items-header, html.dark .pct-items-header, [data-theme="dark"] .pct-items-header {
        color: #CBD5E1 !important;
      }
      body.dark-mode .pct-ops-input, body.dark .pct-ops-input, html.dark .pct-ops-input, [data-theme="dark"] .pct-ops-input,
      body.dark-mode #pctContactsModal input, body.dark #pctContactsModal input, html.dark #pctContactsModal input, [data-theme="dark"] #pctContactsModal input {
        background: #0F172A !important; color: #F8FAFC !important; border-color: #475569 !important;
      }
      body.dark-mode .pct-ops-input[readonly], body.dark .pct-ops-input[readonly], html.dark .pct-ops-input[readonly], [data-theme="dark"] .pct-ops-input[readonly] {
        background: #1E293B !important; color: #94A3B8 !important;
      }
      body.dark-mode .pct-ops-table td, body.dark .pct-ops-table td, html.dark .pct-ops-table td, [data-theme="dark"] .pct-ops-table td {
        color: #E2E8F0 !important; border-bottom-color: #334155 !important;
      }
      body.dark-mode .pct-ops-btn-outline, body.dark .pct-ops-btn-outline, html.dark .pct-ops-btn-outline, [data-theme="dark"] .pct-ops-btn-outline {
        color: #93C5FD !important; border-color: #60A5FA !important;
      }
    `;
    document.head.appendChild(st);
  }

  function tagAlerts() {
    document.querySelectorAll('div, p, span').forEach(el => {
      if (el.dataset.pctAlertTagged) return;
      const txt = (el.textContent || '').trim();
      if (/^⚠️?\s*Stock Alert:/i.test(txt) && txt.length < 220) {
        el.classList.add('pct-dark-alert-fix');
        el.dataset.pctAlertTagged = '1';
      }
    });
  }

  const obs = new MutationObserver(() => tagAlerts());
  const start = () => {
    injectThemeStyles();
    tagAlerts();
    obs.observe(document.body, { childList: true, subtree: true });
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();

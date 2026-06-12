/* ═══════════════════════════════════════════════════════
   DentCare Pro — WhatsApp Bot (Static Mode Stub)
   WhatsApp Bot requires a persistent Node.js process
   and cannot run on Netlify static hosting.
   ═══════════════════════════════════════════════════════ */

const WhatsAppBotPage = {
  async render() {
    const el = document.getElementById('pg-whatsappbot');
    if (!el) return;
    const content = el.querySelector('.page-body') || el;
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1.5rem">
        <div style="font-size:4rem">📵</div>
        <h2 style="color:var(--text);margin:0">WhatsApp Bot Unavailable</h2>
        <p style="color:var(--text2);max-width:480px;line-height:1.6;margin:0">
          The WhatsApp bot requires a persistent Node.js server process running on a VPS or container host.
          It cannot run on Netlify static hosting.
        </p>
        <div style="background:var(--surface2);border-radius:12px;padding:1.25rem 2rem;max-width:420px;text-align:left">
          <div style="font-weight:600;color:var(--accent);margin-bottom:.5rem">To use WhatsApp Bot:</div>
          <div style="font-size:.85rem;color:var(--text2);line-height:1.8">
            1. Deploy the <strong>Port-3000</strong> version on Railway, Render, or a VPS<br>
            2. The bot will be available under the same WhatsApp Bot menu
          </div>
        </div>
      </div>`;
  }
};

/* Datihan public pop-ups / alerts
   Loads active announcements created by the shop owner. */
(function () {
  const SUPABASE_URL = 'https://kymtqzyatofclfaeegfw.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_2gwFi5f702YC_-py8PGxPw_z6iW67MN';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[ch]));
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function activateTab(name) {
    const tab = document.querySelector(`[data-tab="${CSS.escape(name)}"]`);
    if (tab) tab.click();
    else if (name === 'events') {
      const fallback = document.querySelector('[data-tab="events"]');
      if (fallback) fallback.click();
    }
  }

  async function loadPublicPopups() {
    const banner = document.getElementById('newsBanner');
    const eventList = document.querySelector('#panel-events .event-list');
    if (!banner || !eventList || !window.supabase) return;

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await client
      .from('popups')
      .select('id,title,message,location,event_date,button_text,button_tab,is_active')
      .eq('is_active', true)
      .order('event_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Could not load public pop-ups:', error);
      return;
    }

    const popups = data || [];

    if (!popups.length) {
      banner.classList.add('hidden');
      eventList.innerHTML = '<div class="event-row"><div class="event-info"><h3>No upcoming pop-ups yet.</h3></div><div class="event-status">Stay tuned</div></div>';
      return;
    }

    const featured = popups[0];
    const msg = banner.querySelector('.msg');
    const go = banner.querySelector('.go');
    if (msg) msg.textContent = featured.location
      ? `${featured.title} — ${featured.location}`
      : featured.title;
    if (go) {
      go.textContent = featured.button_text || 'See details';
      go.dataset.goto = featured.button_tab || 'events';
      go.onclick = function () { activateTab(this.dataset.goto || 'events'); };
    }
    banner.classList.remove('hidden');

    eventList.innerHTML = popups.map(p => {
      const details = [p.location, formatDate(p.event_date)].filter(Boolean).join(' · ');
      const button = p.button_text
        ? `<button class="btn btn-outline popup-public-go" data-goto="${escapeHtml(p.button_tab || 'events')}">${escapeHtml(p.button_text)}</button>`
        : '';
      return `<div class="event-row">
        <div class="event-info">
          <h3>${escapeHtml(p.title)}</h3>
          ${p.message ? `<p style="margin:6px 0 0;color:var(--ink-soft);">${escapeHtml(p.message)}</p>` : ''}
          ${details ? `<div class="tag-font" style="font-size:.75rem;margin-top:8px;color:var(--ink-soft);">${escapeHtml(details)}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
          <span class="event-status">Upcoming</span>${button}
        </div>
      </div>`;
    }).join('');

    eventList.querySelectorAll('.popup-public-go').forEach(button => {
      button.addEventListener('click', () => activateTab(button.dataset.goto || 'events'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPublicPopups);
  } else {
    loadPublicPopups();
  }
})();

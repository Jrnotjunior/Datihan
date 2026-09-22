/* Datihan pop-up events module.
   Loads active shop-owner announcements and renders them on the public store. */
(function () {
  const SUPABASE_URL = 'https://kymtqzyatofclfaeegfw.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_2gwFi5f702YC_-py8PGxPw_z6iW67MN';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function activateTab(name) {
    const tab = document.querySelector(`[data-tab="${CSS.escape(name)}"]`);
    if (tab) tab.click();
  }

  function popupDateText(value) {
    if (!value) return '';
    const d = new Date(value + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  function popupTimeText(value) {
    if (!value) return '';
    const parts = String(value).slice(0, 5).split(':');
    const d = new Date(2000, 0, 1, Number(parts[0]), Number(parts[1]));
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function popupStatus(p) {
    if (!p.event_date) return 'Announcement';
    const now = new Date();
    const [y, m, d] = p.event_date.split('-').map(Number);
    const start = p.start_time
      ? new Date(y, m - 1, d, ...String(p.start_time).slice(0, 5).split(':').map(Number))
      : new Date(y, m - 1, d, 0, 0);
    const end = p.end_time
      ? new Date(y, m - 1, d, ...String(p.end_time).slice(0, 5).split(':').map(Number))
      : new Date(y, m - 1, d, 23, 59, 59, 999);
    if (now < start) return 'Upcoming';
    if (now <= end) return 'Ongoing';
    return 'Ended';
  }

  function popupDestination(value) {
    return ['home', 'shop', 'events', 'consign', 'about'].includes(value) ? value : 'events';
  }

  function renderPopups(popups) {
    const list = document.getElementById('popupEventList');
    const homeTitle = document.getElementById('homePopupTitle');
    const homeMeta = document.getElementById('homePopupMeta');
    const homeButton = document.getElementById('homePopupButton');
    const banner = document.getElementById('newsBanner');
    const bannerMsg = document.getElementById('newsBannerMsg');
    const bannerGo = document.getElementById('newsBannerGo');
    if (!list) return;

    if (!popups.length) {
      list.innerHTML = '<div class="event-row"><div class="event-info"><h3>No pop-ups available</h3><p>Check back later for the next Datihan announcement.</p></div><div class="event-status">Stay tuned</div></div>';
      if (homeTitle) homeTitle.textContent = 'No upcoming pop-ups';
      if (homeMeta) homeMeta.textContent = 'Check back later for the next Datihan announcement.';
      if (homeButton) {
        homeButton.textContent = 'View pop-ups';
        homeButton.onclick = () => activateTab('events');
      }
      if (banner) {
        banner.hidden = true;
        banner.classList.add('hidden');
      }
      return;
    }

    list.innerHTML = popups.map(p => {
      const title = escapeHtml(p.title || 'Datihan pop-up');
      const message = escapeHtml(p.message || '');
      const location = escapeHtml(p.location || '');
      const date = popupDateText(p.event_date);
      const time = [popupTimeText(p.start_time), popupTimeText(p.end_time)].filter(Boolean).join(' – ');
      const meta = [location, date, time].filter(Boolean).join(' · ');
      return '<div class="event-row"><div class="event-info"><h3>' + title + '</h3><p>' + message + (meta ? ' · ' + meta : '') + '</p></div><div class="event-status">' + popupStatus(p) + '</div></div>';
    }).join('');

    const first = popups[0];
    const firstTitle = first.title || 'Datihan pop-up';
    const firstMeta = [
      first.message,
      first.location,
      popupDateText(first.event_date),
      [popupTimeText(first.start_time), popupTimeText(first.end_time)].filter(Boolean).join(' – ')
    ].filter(Boolean).join(' · ');
    const firstButton = first.button_text || 'See details';
    const destination = popupDestination(first.button_tab);

    if (homeTitle) homeTitle.textContent = firstTitle;
    if (homeMeta) homeMeta.textContent = firstMeta;
    if (homeButton) {
      homeButton.textContent = firstButton;
      homeButton.onclick = () => activateTab(destination);
    }

    if (banner) {
      banner.hidden = false;
      banner.classList.remove('hidden');
      if (bannerMsg) bannerMsg.textContent = first.message ? firstTitle + ' — ' + first.message : firstTitle;
      if (bannerGo) {
        bannerGo.textContent = firstButton;
        bannerGo.onclick = () => activateTab(destination);
      }
    }
  }

  async function loadPopups() {
    const list = document.getElementById('popupEventList');
    if (!list || !window.supabase) return;

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await client
      .from('popups')
      .select('*')
      .eq('is_active', true)
      .order('event_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Could not load pop-ups:', error);
      renderPopups([]);
      return;
    }

    renderPopups(data || []);
  }

  function bindCloseButton() {
    const close = document.getElementById('newsBannerClose');
    if (!close) return;
    close.addEventListener('click', () => {
      const banner = document.getElementById('newsBanner');
      if (!banner) return;
      banner.classList.add('hidden');
      banner.hidden = true;
    });
  }

  function init() {
    bindCloseButton();
    loadPopups();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

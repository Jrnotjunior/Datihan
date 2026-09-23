// ---------------- DATIHAN AUTH / ACCOUNT ----------------
// Phase 6: account/session UI only.
// Actual sign-in and sign-up are handled by login.html and signup.html.

(() => {
  const supabaseClient = window.supabase?.createClient
    ? window.supabase.createClient(
        'https://kymtqzyatofclfaeegfw.supabase.co',
        'sb_publishable_2gwFi5f702YC_-py8PGxPw_z6iW67MN'
      )
    : null;

  if (!supabaseClient) {
    console.error('Datihan auth module: Supabase client is unavailable.');
    return;
  }

  const authBtn = document.getElementById('authBtn');
  const roleNavBtn = document.getElementById('roleNavBtn');

  function isOrdersControl(el) {
    const label = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const href = (el.getAttribute('href') || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
    return label === 'my orders' || label === 'orders' || label.includes('my orders') ||
      href.includes('my-orders') || href.includes('orders.html') ||
      id.includes('orders') || cls.includes('orders');
  }

  // Buyers get Cart + My Orders. Shop Owners only browse/manage.
  // Guests can browse, but My Orders is hidden until a buyer signs in.
  function setAccountControls({ isShopOwner = false, isBuyer = false } = {}) {
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) cartBtn.style.display = isShopOwner ? 'none' : '';

    document.querySelectorAll('button, a').forEach((el) => {
      if (isOrdersControl(el)) el.style.display = isBuyer ? '' : 'none';
    });

    // Buyer-oriented category shortcuts on Home.
    document.querySelectorAll('.chip-row').forEach((el) => {
      el.style.display = isShopOwner ? 'none' : '';
    });

    document.body.dataset.accountRole = isShopOwner ? 'shop_owner' : (isBuyer ? 'buyer' : 'guest');
  }

  function ensureAccountMenuStyles() {
    if (document.getElementById('datihanAccountMenuStyles')) return;

    const style = document.createElement('style');
    style.id = 'datihanAccountMenuStyles';
    style.textContent = `
      #authBtn.account-menu-trigger {
        width: 44px;
        min-width: 44px;
        height: 44px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0;
        position: relative;
      }

      #authBtn.account-menu-trigger .hamburger-lines,
      #authBtn.account-menu-trigger .hamburger-lines::before,
      #authBtn.account-menu-trigger .hamburger-lines::after {
        display: block;
        width: 18px;
        height: 2px;
        background: currentColor;
        content: '';
        transition: transform .18s ease;
      }

      #authBtn.account-menu-trigger .hamburger-lines::before {
        position: absolute;
        transform: translateY(-6px);
      }

      #authBtn.account-menu-trigger .hamburger-lines::after {
        position: absolute;
        transform: translateY(6px);
      }

      #authBtn.account-menu-trigger[aria-expanded="true"] .hamburger-lines {
        background: transparent;
      }

      #authBtn.account-menu-trigger[aria-expanded="true"] .hamburger-lines::before {
        transform: rotate(45deg);
      }

      #authBtn.account-menu-trigger[aria-expanded="true"] .hamburger-lines::after {
        transform: rotate(-45deg);
      }

      .datihan-account-menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        min-width: 210px;
        padding: 8px;
        background: var(--panel, #fff);
        border: 1px solid var(--ink, #111);
        box-shadow: 5px 5px 0 var(--ink, #111);
        z-index: 1000;
      }

      .datihan-account-wrap {
        position: relative;
        display: inline-flex;
      }

      .datihan-account-email {
        padding: 9px 10px 10px;
        border-bottom: 1px solid rgba(0,0,0,.18);
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .datihan-account-signout {
        width: 100%;
        margin-top: 8px;
        padding: 10px;
        border: 1px solid var(--ink, #111);
        background: var(--ink, #111);
        color: var(--panel, #fff);
        font: inherit;
        cursor: pointer;
        text-align: left;
      }

      .datihan-account-signout:hover {
        opacity: .88;
      }
    `;
    document.head.appendChild(style);
  }

  function closeAccountMenu() {
    const menu = document.getElementById('datihanAccountMenu');
    if (menu) menu.hidden = true;
    if (authBtn) authBtn.setAttribute('aria-expanded', 'false');
  }

  function createAccountMenu(user) {
    if (!authBtn || document.getElementById('datihanAccountMenu')) return;

    ensureAccountMenuStyles();

    const parent = authBtn.parentElement;
    if (!parent) return;

    const wrap = document.createElement('div');
    wrap.className = 'datihan-account-wrap';

    parent.insertBefore(wrap, authBtn);
    wrap.appendChild(authBtn);

    const menu = document.createElement('div');
    menu.id = 'datihanAccountMenu';
    menu.className = 'datihan-account-menu';
    menu.hidden = true;
    menu.innerHTML = `
      <div class="datihan-account-email"></div>
      <button class="datihan-account-signout" type="button">Sign out</button>
    `;

    menu.querySelector('.datihan-account-email').textContent = user.email || 'Signed in';
    menu.querySelector('.datihan-account-signout').addEventListener('click', async () => {
      closeAccountMenu();
      await supabaseClient.auth.signOut();
      location.href = 'index.html';
    });

    wrap.appendChild(menu);

    authBtn.classList.add('account-menu-trigger');
    authBtn.setAttribute('aria-label', 'Open account menu');
    authBtn.setAttribute('aria-haspopup', 'menu');
    authBtn.setAttribute('aria-expanded', 'false');
    authBtn.innerHTML = '<span class="hamburger-lines" aria-hidden="true"></span>';
    authBtn.onclick = (event) => {
      event.stopPropagation();
      const isOpen = menu.hidden;
      menu.hidden = !isOpen;
      authBtn.setAttribute('aria-expanded', String(isOpen));
    };
  }

  function removeAccountMenu() {
    const menu = document.getElementById('datihanAccountMenu');
    const wrap = authBtn?.closest('.datihan-account-wrap');

    if (menu) menu.remove();

    if (wrap && authBtn) {
      const parent = wrap.parentElement;
      parent.insertBefore(authBtn, wrap);
      wrap.remove();
    }

    if (authBtn) {
      authBtn.classList.remove('account-menu-trigger');
      authBtn.removeAttribute('aria-label');
      authBtn.removeAttribute('aria-haspopup');
      authBtn.removeAttribute('aria-expanded');
    }
  }

  async function refreshAuthUI() {
    if (!authBtn) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
      removeAccountMenu();
      createAccountMenu(user);

      let profile = null;
      if (roleNavBtn) {
        const { data } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        profile = data;
      }

      if (profile?.role === 'shop_owner') {
        roleNavBtn.textContent = 'Shop owner';
        roleNavBtn.style.display = 'inline-flex';
        roleNavBtn.onclick = () => location.href = 'shop-owner.html';
        setAccountControls({ isShopOwner: true, isBuyer: false });
      } else {
        roleNavBtn.textContent = '';
        roleNavBtn.style.display = 'none';
        setAccountControls({ isShopOwner: false, isBuyer: true });
      }
    } else {
      removeAccountMenu();
      authBtn.textContent = 'Login';
      authBtn.classList.remove('signed-in');
      authBtn.onclick = () => { location.href = 'login.html'; };

      if (roleNavBtn) {
        roleNavBtn.textContent = '';
        roleNavBtn.style.display = 'none';
      }

      setAccountControls({ isShopOwner: false, isBuyer: false });
    }
  }

  document.addEventListener('click', (event) => {
    const wrap = authBtn?.closest('.datihan-account-wrap');
    if (wrap && !wrap.contains(event.target)) closeAccountMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAccountMenu();
  });

  window.datihanAuth = { supabaseClient, refreshAuthUI };
  refreshAuthUI();
})();

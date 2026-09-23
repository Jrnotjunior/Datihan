// Datihan account/session UI.
// Logged-in users always use the hamburger account control.
(() => {
  const URL = 'https://kymtqzyatofclfaeegfw.supabase.co';
  const KEY = 'sb_publishable_2gwFi5f702YC_-py8PGxPw_z6iW67MN';
  const client = window.supabase?.createClient ? window.supabase.createClient(URL, KEY) : null;
  if (!client) return;

  const authBtn = document.getElementById('authBtn');
  const roleNavBtn = document.getElementById('roleNavBtn');
  if (!authBtn) return;

  let currentUser = null;
  let menu = null;
  let applying = false;

  function isOrdersControl(el) {
    const label = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const href = (el.getAttribute('href') || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
    return label === 'my orders' || label === 'orders' || label.includes('my orders') ||
      href.includes('my-orders') || href.includes('orders.html') || id.includes('orders') || cls.includes('orders');
  }

  function setAccountControls({ isShopOwner = false, isBuyer = false } = {}) {
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) cartBtn.style.display = isShopOwner ? 'none' : '';
    document.querySelectorAll('button, a').forEach(el => {
      if (isOrdersControl(el)) el.style.display = isBuyer ? '' : 'none';
    });
    document.querySelectorAll('.chip-row').forEach(el => {
      el.style.display = isShopOwner ? 'none' : '';
    });
    document.body.dataset.accountRole = isShopOwner ? 'shop_owner' : (isBuyer ? 'buyer' : 'guest');
  }

  function ensureStyles() {
    if (document.getElementById('datihanAccountMenuStyles')) return;
    const style = document.createElement('style');
    style.id = 'datihanAccountMenuStyles';
    style.textContent = `
      /* Account controls: Shop Owner is always LEFT of the hamburger. */
      .header-right #roleNavBtn{order:1 !important}
      .header-right .datihan-account-wrap{order:2 !important}
      .header-right #authBtn{order:2 !important}
      .header-right #cartBtn{order:3 !important}
      #authBtn.account-menu-trigger{width:44px;min-width:44px;height:44px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:0;position:relative}
      #authBtn.account-menu-trigger .hamburger-lines,#authBtn.account-menu-trigger .hamburger-lines::before,#authBtn.account-menu-trigger .hamburger-lines::after{display:block;width:18px;height:2px;background:currentColor;content:'';transition:transform .18s ease}
      #authBtn.account-menu-trigger .hamburger-lines::before{position:absolute;transform:translateY(-6px)}
      #authBtn.account-menu-trigger .hamburger-lines::after{position:absolute;transform:translateY(6px)}
      #authBtn.account-menu-trigger[aria-expanded="true"] .hamburger-lines{background:transparent}
      #authBtn.account-menu-trigger[aria-expanded="true"] .hamburger-lines::before{transform:rotate(45deg)}
      #authBtn.account-menu-trigger[aria-expanded="true"] .hamburger-lines::after{transform:rotate(-45deg)}
      .datihan-account-wrap{position:relative;display:inline-flex}
      .datihan-account-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:210px;padding:8px;background:var(--panel,#fff);border:1px solid var(--ink,#111);box-shadow:5px 5px 0 var(--ink,#111);z-index:1000}
      .datihan-account-menu[hidden]{display:none!important}
      .datihan-account-email{padding:9px 10px 10px;border-bottom:1px solid rgba(0,0,0,.18);font-family:'IBM Plex Mono',monospace;font-size:12px;line-height:1.4;overflow-wrap:anywhere}
      .datihan-account-orders{width:100%;margin-top:8px;padding:10px;border:1px solid var(--ink,#111);background:var(--panel,#fff);color:var(--ink,#111);font:inherit;cursor:pointer;text-align:left;text-decoration:none;display:block}
      .datihan-account-orders:hover{background:#eee}
      .datihan-account-signout{width:100%;margin-top:8px;padding:10px;border:1px solid var(--ink,#111);background:var(--ink,#111);color:var(--panel,#fff);font:inherit;cursor:pointer;text-align:left}
      .datihan-account-signout:hover{opacity:.88}
      @media(max-width:900px){
        .header-right #roleNavBtn{order:1 !important}
        .header-right .datihan-account-wrap{order:2 !important}
      }
    `;
    document.head.appendChild(style);
  }

  function showAuthControl() {
    authBtn.style.visibility = 'visible';
  }

  function normalizeHeaderOrder() {
    const headerRight = document.querySelector('.header-right');
    if (!headerRight || !roleNavBtn) return;
    const accountWrap = authBtn.closest('.datihan-account-wrap');
    const accountNode = accountWrap || authBtn;
    if (accountNode && roleNavBtn.nextElementSibling !== accountNode) {
      headerRight.insertBefore(roleNavBtn, accountNode);
    }
    roleNavBtn.style.order = '1';
    accountNode.style.order = '2';
  }

  function closeMenu() {
    if (menu) menu.hidden = true;
    authBtn.setAttribute('aria-expanded', 'false');
  }

  function removeMenu() {
    closeMenu();
    if (menu) menu.remove();
    menu = null;
    const wrap = authBtn.closest('.datihan-account-wrap');
    if (wrap) {
      const parent = wrap.parentElement;
      parent.insertBefore(authBtn, wrap);
      wrap.remove();
    }
    authBtn.classList.remove('account-menu-trigger');
    authBtn.removeAttribute('aria-haspopup');
  }

  function renderSignedIn(user) {
    applying = true;
    ensureStyles();
    removeMenu();

    const parent = authBtn.parentElement;
    const wrap = document.createElement('div');
    wrap.className = 'datihan-account-wrap';
    parent.insertBefore(wrap, authBtn);
    wrap.appendChild(authBtn);

    menu = document.createElement('div');
    menu.id = 'datihanAccountMenu';
    menu.className = 'datihan-account-menu';
    menu.hidden = true;
    menu.innerHTML = '<div class="datihan-account-email"></div><a class="datihan-account-orders" href="orders.html">My Orders</a><button class="datihan-account-signout" type="button">Sign out</button>';
    menu.querySelector('.datihan-account-email').textContent = user.email || 'Signed in';
    menu.querySelector('.datihan-account-signout').addEventListener('click', async () => {
      closeMenu();
      await client.auth.signOut();
      location.href = 'index.html';
    });
    wrap.appendChild(menu);

    authBtn.classList.add('account-menu-trigger');
    authBtn.classList.remove('signed-in', 'logged-in');
    authBtn.setAttribute('aria-label', 'Open account menu');
    authBtn.setAttribute('aria-haspopup', 'menu');
    authBtn.setAttribute('aria-expanded', 'false');
    authBtn.innerHTML = '<span class="hamburger-lines" aria-hidden="true"></span>';
    authBtn.onclick = (event) => {
      event.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      authBtn.setAttribute('aria-expanded', String(open));
    };

    normalizeHeaderOrder();
    showAuthControl();
    applying = false;
  }

  function renderLoggedOut() {
    applying = true;
    removeMenu();
    authBtn.innerHTML = 'Login';
    authBtn.classList.remove('logged-in', 'signed-in');
    authBtn.removeAttribute('aria-label');
    authBtn.removeAttribute('aria-expanded');
    authBtn.onclick = () => { location.href = 'login.html'; };
    showAuthControl();
    applying = false;
  }

  async function refresh() {
    const { data: { user } } = await client.auth.getUser();
    currentUser = user || null;

    if (currentUser) {
      renderSignedIn(currentUser);

      const { data: profile } = await client.from('profiles').select('role').eq('id', currentUser.id).maybeSingle();
      if (profile?.role === 'shop_owner') {
        if (roleNavBtn) {
          roleNavBtn.textContent = 'Shop owner';
          roleNavBtn.style.display = 'inline-flex';
          roleNavBtn.onclick = () => location.href = 'shop-owner.html';
        }
        setAccountControls({ isShopOwner: true, isBuyer: false });
      } else {
        if (roleNavBtn) {
          roleNavBtn.textContent = '';
          roleNavBtn.style.display = 'none';
        }
        setAccountControls({ isShopOwner: false, isBuyer: true });
      }
      normalizeHeaderOrder();
    } else {
      renderLoggedOut();
      if (roleNavBtn) {
        roleNavBtn.textContent = '';
        roleNavBtn.style.display = 'none';
      }
      setAccountControls({ isShopOwner: false, isBuyer: false });
    }
  }

  function watchHeader() {
    const observer = new MutationObserver(() => {
      if (applying || !currentUser) return;
      const trigger = document.getElementById('authBtn');
      if (!trigger.classList.contains('account-menu-trigger') || !trigger.querySelector('.hamburger-lines')) {
        renderSignedIn(currentUser);
      }
      normalizeHeaderOrder();
    });
    observer.observe(authBtn, { childList: true, characterData: true, attributes: true, subtree: true });
  }

  document.addEventListener('click', event => {
    const wrap = authBtn.closest('.datihan-account-wrap');
    if (wrap && !wrap.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  client.auth.onAuthStateChange(() => { setTimeout(refresh, 0); });
  window.datihanAuth = { supabaseClient: client, refreshAuthUI: refresh };

  refresh().then(watchHeader);
})();

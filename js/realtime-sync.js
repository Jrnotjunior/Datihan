/* Datihan Realtime Sync
 * Keeps buyer, shop-owner, and admin screens synchronized with Supabase.
 * UI-specific rendering remains in each page; this bridge only emits a
 * normalized browser event and asks refresh-capable pages to update.
 */
(function(){
  const URL = 'https://kymtqzyatofclfaeegfw.supabase.co';
  const KEY = 'sb_publishable_2gwFi5f702YC_-py8PGxPw_z6iW67MN';
  if(!window.supabase || !window.supabase.createClient) return;

  const client = window.supabase.createClient(URL, KEY);
  let timer = null;
  const pending = new Set();

  function notify(table, event){
    pending.add(table);
    clearTimeout(timer);
    timer = setTimeout(() => {
      const tables = Array.from(pending);
      pending.clear();
      tables.forEach(name => {
        window.dispatchEvent(new CustomEvent('datihan:realtime', {
          detail: { table:name, event:event || 'change' }
        }));
      });
    }, 100);
  }

  ['inventory','cart_items','popups','orders'].forEach(table => {
    client
      .channel('datihan-realtime-' + table)
      .on('postgres_changes', { event:'*', schema:'public', table }, payload => {
        notify(table, payload.eventType);
      })
      .subscribe();
  });

  window.addEventListener('datihan:realtime', event => {
    const table = event.detail && event.detail.table;
    if(!table) return;
    const refresh = document.getElementById('refreshBtn');
    if(refresh && !refresh.disabled && (table === 'inventory' || table === 'popups' || table === 'orders')){
      refresh.click();
    }
  });
})();

// ---------------- SHARED CART / CHECKOUT DRAWER ----------------
// main.js owns the cart data and rendering. This controller owns only the
// visual open/close state so realtime refreshes cannot break the drawer.
(function(){
  function overlay(){ return document.getElementById('overlayBg'); }

  window.openDrawer = function(drawer){
    if(!drawer) return;
    document.querySelectorAll('.drawer.open').forEach(d => {
      if(d !== drawer) d.classList.remove('open');
    });
    overlay()?.classList.add('open');
    drawer.classList.add('open');
  };

  window.closeDrawer = function(drawer){
    if(!drawer) return;
    drawer.classList.remove('open');
    if(!document.querySelector('.drawer.open')) overlay()?.classList.remove('open');
  };

  function initDrawer(){
    const cartDrawer = document.getElementById('cartDrawer');
    const checkoutDrawer = document.getElementById('checkoutDrawer');
    const closeCart = document.getElementById('closeCart');
    const closeCheckout = document.getElementById('closeCheckout');
    const bg = overlay();

    closeCart?.addEventListener('click', () => window.closeDrawer(cartDrawer));
    closeCheckout?.addEventListener('click', () => window.closeDrawer(checkoutDrawer));
    bg?.addEventListener('click', () => {
      window.closeDrawer(cartDrawer);
      window.closeDrawer(checkoutDrawer);
    });
    document.addEventListener('keydown', event => {
      if(event.key !== 'Escape') return;
      window.closeDrawer(cartDrawer);
      window.closeDrawer(checkoutDrawer);
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initDrawer, {once:true});
  }else{
    initDrawer();
  }
})();

// ---------------- PHASE 9 NAVIGATION ----------------
// Keep the existing pages untouched while exposing the new order pages.
(function(){
  function addLink(parent, text, href, className){
    if(!parent || document.querySelector('[data-datihan-order-link]')) return;
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    a.dataset.datihanOrderLink = 'true';
    a.className = className || '';
    a.style.textDecoration = 'none';
    a.style.display = 'inline-flex';
    a.style.alignItems = 'center';
    a.style.justifyContent = 'center';
    a.style.cursor = 'pointer';
    a.style.fontFamily = 'inherit';
    a.style.fontWeight = '700';
    a.style.padding = '9px 13px';
    a.style.border = '1px solid #333';
    a.style.background = '#f8f8f5';
    a.style.color = '#171717';
    parent.appendChild(a);
  }

  function initPhase9Navigation(){
    const path = (location.pathname || '').toLowerCase();

    if(path.endsWith('/shop-owner.html') || path.endsWith('shop-owner.html')){
      const nav = document.querySelector('.admin-nav');
      if(nav && !nav.querySelector('[data-datihan-order-link]')) addLink(nav, 'Orders', 'shop-orders.html');
      return;
    }

    if(path.endsWith('/index.html') || path === '/' || path.endsWith('/')){
      const cartCount = document.getElementById('cartCount');
      const cartButton = cartCount?.closest('button');
      if(cartButton && !document.querySelector('[data-datihan-order-link]')){
        addLink(cartButton.parentElement, 'My Orders', 'orders.html');
      }
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPhase9Navigation, {once:true});
  else initPhase9Navigation();
})();

// ---------------- PHASE 10 BUYER PHOTO GALLERY ----------------
// Load the gallery after the main shop and realtime scripts without changing
// the existing cart, checkout, or inventory rendering code.
(function(){
  function loadGallery(){
    if(document.getElementById('datihanGalleryScript')) return;
    const path = (location.pathname || '').toLowerCase();
    if(!(path.endsWith('/index.html') || path === '/' || path.endsWith('/'))) return;
    const script = document.createElement('script');
    script.id = 'datihanGalleryScript';
    script.src = 'js/gallery.js';
    script.defer = true;
    document.head.appendChild(script);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadGallery, {once:true});
  else loadGallery();
})();

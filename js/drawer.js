// Datihan shared drawer controller.
// Keeps cart and checkout drawers working independently of realtime UI refreshes.
(function(){
  function getOverlay(){ return document.getElementById('overlayBg'); }

  window.openDrawer = function(drawer){
    if(!drawer) return;
    const overlay = getOverlay();
    document.querySelectorAll('.drawer.open').forEach(d => {
      if(d !== drawer) d.classList.remove('open');
    });
    if(overlay) overlay.classList.add('open');
    drawer.classList.add('open');
  };

  window.closeDrawer = function(drawer){
    if(!drawer) return;
    drawer.classList.remove('open');
    const anyOpen = document.querySelector('.drawer.open');
    if(!anyOpen){
      const overlay = getOverlay();
      if(overlay) overlay.classList.remove('open');
    }
  };

  function init(){
    const overlay = getOverlay();
    const cartDrawer = document.getElementById('cartDrawer');
    const checkoutDrawer = document.getElementById('checkoutDrawer');
    const closeCart = document.getElementById('closeCart');
    const closeCheckout = document.getElementById('closeCheckout');

    closeCart?.addEventListener('click', () => window.closeDrawer(cartDrawer));
    closeCheckout?.addEventListener('click', () => window.closeDrawer(checkoutDrawer));

    overlay?.addEventListener('click', () => {
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
    document.addEventListener('DOMContentLoaded', init, { once:true });
  }else{
    init();
  }
})();

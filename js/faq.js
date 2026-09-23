// Datihan FAQ module
// Phase 5: FAQ behavior is isolated here.
// Compatibility guard: the current main.js calls openCheckoutAfterLogin()
// during initialization, but that helper is no longer present. Define a
// harmless fallback so the rest of main.js can finish initializing products
// and pop-ups instead of stopping with a ReferenceError.
window.openCheckoutAfterLogin = window.openCheckoutAfterLogin || function(){};

// Shared helper used by main.js when rendering products/pop-ups.
window.escapeHtml = window.escapeHtml || function(value){
  return String(value ?? '').replace(/[&<>\"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
  }[ch]));
};

document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const answer = btn.nextElementSibling;
    btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    answer.style.maxHeight = expanded ? '0px' : answer.scrollHeight + 'px';
  });
});

// ---------------- ADD-TO-CART ACCOUNT CHOICE ----------------
// index.html currently has no dedicated add-to-cart choice modal. Intercept
// Add to Cart clicks during capture so main.js cannot redirect an unauthenticated
// buyer straight to login before the buyer gets the account-choice popup.
(function(){
  const SUPABASE_URL='https://kymtqzyatofclfaeegfw.supabase.co';
  const SUPABASE_KEY='sb_publishable_2gwFi5f702YC_-py8PGxPw_z6iW67MN';
  const addAuthClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

  function ensureModal(){
    let modal=document.getElementById('addAuthModal');
    if(modal) return modal;

    modal=document.createElement('div');
    modal.id='addAuthModal';
    modal.className='auth-backdrop';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`
      <section class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="addAuthTitle">
        <div class="auth-head">
          <div><h2 class="display" id="addAuthTitle">Login required to add to cart</h2></div>
          <button class="auth-close" id="addAuthClose" type="button" aria-label="Close">&times;</button>
        </div>
        <div class="auth-body">
          <p class="auth-copy">Please sign in or create a Datihan buyer account before adding an item. Your cart will be saved to your account.</p>
          <button class="btn btn-primary auth-submit" id="addAuthLogin" type="button">I already have an account</button>
          <button class="btn btn-outline auth-submit" id="addAuthSignup" type="button" style="margin-top:10px;">I'm a new buyer — Sign Up</button>
          <p class="auth-message">You can browse the store without an account. An account is required to keep your cart connected to you.</p>
        </div>
      </section>`;
    document.body.appendChild(modal);
    return modal;
  }

  function closeModal(){
    const modal=document.getElementById('addAuthModal');
    if(!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  }

  function openModal(productId){
    const modal=ensureModal();
    const login=document.getElementById('addAuthLogin');
    const signup=document.getElementById('addAuthSignup');
    const close=document.getElementById('addAuthClose');
    const overlay=modal.querySelector('.auth-modal');
    const redirect='?add='+encodeURIComponent(productId);

    login.onclick=()=>{ location.href='login.html'+redirect; };
    signup.onclick=()=>{ location.href='signup.html'+redirect; };
    close.onclick=closeModal;
    modal.onclick=(event)=>{ if(event.target===modal) closeModal(); };
    overlay.onclick=(event)=>event.stopPropagation();

    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-add]');
    if(!button || button.disabled) return;

    // Allow the original main.js click handler through after an authenticated
    // session has been confirmed.
    if(button.dataset.authBypass==='1'){
      delete button.dataset.authBypass;
      return;
    }

    // Stop main.js synchronously first. We then check the real Supabase user.
    event.preventDefault();
    event.stopPropagation();
    if(event.stopImmediatePropagation) event.stopImmediatePropagation();

    addAuthClient.auth.getUser().then(({data:{user}})=>{
      if(user){
        button.dataset.authBypass='1';
        button.click();
      }else{
        openModal(button.dataset.add);
      }
    }).catch(()=>openModal(button.dataset.add));
  },true);
})();

// ---------------- SHOP OWNER VIEW-ONLY MODE ----------------
// Shop Owners can use View Store to inspect the public catalog, but they are
// not buyers. Therefore Cart, Add to Cart, Checkout, and My Orders are hidden.
(function(){
  const SUPABASE_URL='https://kymtqzyatofclfaeegfw.supabase.co';
  const SUPABASE_KEY='sb_publishable_2gwFi5f702YC_-py8PGxPw_z6iW67MN';
  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

  function removeBuyerControls(){
    // Cart button/icon.
    document.querySelectorAll('#cartBtn, .cart-btn, [aria-label="Open cart"]').forEach(el=>{
      el.remove();
    });

    // Remove My Orders / Orders regardless of whether they are buttons, links,
    // generated dynamically, or contain extra whitespace/icons.
    document.querySelectorAll('a,button,[role="button"]').forEach(el=>{
      const text=(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      const href=(el.getAttribute('href')||'').toLowerCase();
      const id=(el.id||'').toLowerCase();
      const cls=(typeof el.className === 'string' ? el.className : '').toLowerCase();

      const isMyOrders =
        text === 'my orders' ||
        text === 'orders' ||
        text.includes('my orders') ||
        href.includes('orders.html') ||
        href.includes('my-orders') ||
        id.includes('orders') ||
        cls.includes('orders');

      if(isMyOrders) el.remove();
    });

    // Buyer-only product controls.
    document.querySelectorAll('[data-add], .add-btn, .checkout-btn, [id="checkoutBtn"]').forEach(el=>el.remove());
  }

  async function checkShopOwner(){
    try{
      const {data:{user}}=await client.auth.getUser();
      if(!user) return false;

      const {data:profile,error}=await client
        .from('profiles')
        .select('role')
        .eq('id',user.id)
        .maybeSingle();

      if(error){
        console.error('Could not check account role:', error);
        return false;
      }

      if(profile?.role === 'shop_owner'){
        removeBuyerControls();
        return true;
      }
    }catch(err){
      console.error('Shop owner view-only mode failed:',err);
    }
    return false;
  }

  // The header is rendered immediately, while some account controls may be
  // rendered by main.js after authentication. Re-run after those changes.
  checkShopOwner();
  window.addEventListener('load', checkShopOwner);
  setTimeout(checkShopOwner, 500);
  setTimeout(checkShopOwner, 1500);
  setTimeout(checkShopOwner, 3000);

  const observer=new MutationObserver(()=>{
    checkShopOwner();
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();

// ---------------- COORDINATED INITIAL PAGE LOAD ----------------
// Keep the storefront visually together during the first load. The browser
// still downloads resources independently, but customers do not see the
// header, account controls, cart, products, or pop-up content appearing one
// piece at a time. Realtime updates continue normally after the initial load.
(function(){
  const loader=document.createElement('div');
  loader.id='datihanInitialLoader';
  loader.innerHTML=`
    <div class="datihan-loader-card" role="status" aria-live="polite" aria-label="Loading Datihan">
      <div class="datihan-loader-logo">DATIHAN</div>
      <div class="datihan-loader-bar"><span></span></div>
      <div class="datihan-loader-text">Loading storefront...</div>
    </div>`;

  const style=document.createElement('style');
  style.id='datihanInitialLoaderStyles';
  style.textContent=`
    #datihanInitialLoader{
      position:fixed;
      inset:0;
      z-index:2147483647;
      display:flex;
      align-items:center;
      justify-content:center;
      background:var(--bg,#E6E6E2);
      color:var(--ink,#1B1B1A);
      opacity:1;
      visibility:visible;
      transition:opacity .24s ease,visibility .24s ease;
    }
    #datihanInitialLoader.is-ready{
      opacity:0;
      visibility:hidden;
      pointer-events:none;
    }
    .datihan-loader-card{
      width:min(360px,calc(100vw - 44px));
      text-align:center;
    }
    .datihan-loader-logo{
      font-family:'Barlow Condensed',sans-serif;
      font-size:clamp(2.6rem,10vw,4.5rem);
      font-weight:700;
      letter-spacing:.12em;
      line-height:1;
    }
    .datihan-loader-bar{
      height:3px;
      margin:22px auto 12px;
      width:100%;
      overflow:hidden;
      background:var(--line,rgba(27,27,26,.16));
    }
    .datihan-loader-bar span{
      display:block;
      width:38%;
      height:100%;
      background:var(--accent,#A63B2C);
      animation:datihanLoaderMove 1.05s ease-in-out infinite;
    }
    .datihan-loader-text{
      font-family:'IBM Plex Mono',monospace;
      font-size:.72rem;
      letter-spacing:.08em;
      text-transform:uppercase;
      color:var(--ink-soft,#58564F);
    }
    @keyframes datihanLoaderMove{
      0%{transform:translateX(-130%)}
      50%{transform:translateX(150%)}
      100%{transform:translateX(330%)}
    }
    @media(prefers-reduced-motion:reduce){
      .datihan-loader-bar span{animation:none;margin-left:31%;}
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(loader);
  document.documentElement.style.overflow='hidden';

  const started=Date.now();
  const maxWait=10000;
  let released=false;

  function accountReady(){
    const auth=document.getElementById('authBtn');
    if(!auth || auth.style.visibility==='hidden') return false;

    const role=document.body.dataset.accountRole;
    if(!role) return false;

    if(role==='buyer'){
      return !!document.getElementById('datihanOrdersBtn');
    }

    if(role==='shop_owner'){
      const roleBtn=document.getElementById('roleNavBtn');
      return !!roleBtn && getComputedStyle(roleBtn).display!=='none';
    }

    return role==='guest';
  }

  function catalogReady(){
    const grid=document.getElementById('shopGrid');
    const noResults=document.getElementById('noResults');
    if(!grid || !noResults) return true;
    return grid.children.length>0 || getComputedStyle(noResults).display!=='none';
  }

  function popupsReady(){
    const list=document.getElementById('popupEventList');
    if(!list) return true;
    return !/Loading pop-ups/i.test(list.textContent||'');
  }

  function imagesReady(){
    const images=Array.from(document.images);
    return images.every(img=>img.complete);
  }

  function release(reason){
    if(released) return;
    released=true;
    loader.classList.add('is-ready');
    document.documentElement.style.overflow='';
    window.setTimeout(()=>loader.remove(),280);
    if(reason) console.info('Datihan initial load ready:',reason);
  }

  function check(){
    if(released) return;

    const timedOut=Date.now()-started>=maxWait;
    const pageLoaded=document.readyState==='complete';

    if(timedOut){
      release('timeout safeguard');
      return;
    }

    if(pageLoaded && accountReady() && catalogReady() && popupsReady() && imagesReady()){
      release('critical storefront state ready');
      return;
    }

    window.setTimeout(check,100);
  }

  if(document.readyState==='complete') check();
  else window.addEventListener('load',check,{once:true});
  window.setTimeout(check,250);
})();

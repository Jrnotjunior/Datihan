// Datihan FAQ module
// Phase 5: FAQ behavior is isolated here.
// Compatibility guard: the current main.js calls openCheckoutAfterLogin()
// during initialization, but that helper is no longer present. Define a
// harmless fallback so the rest of main.js can finish initializing products
// and pop-ups instead of stopping with a ReferenceError.
window.openCheckoutAfterLogin = window.openCheckoutAfterLogin || function(){};

// Shared helper used by main.js when rendering products/pop-ups.
window.escapeHtml = window.escapeHtml || function(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
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

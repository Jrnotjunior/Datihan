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
// unauthenticated Add to Cart clicks before main.js handles the button, then
// give the buyer an explicit choice between Login and Sign Up.
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

  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-add]');
    if(!button || button.disabled) return;

    const {data:{user}}=await addAuthClient.auth.getUser();
    if(user) return;

    event.preventDefault();
    event.stopPropagation();
    if(event.stopImmediatePropagation) event.stopImmediatePropagation();
    openModal(button.dataset.add);
  },true);
})();

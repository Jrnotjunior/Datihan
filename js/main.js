  // ---------------- SUPABASE AUTH ----------------
  const SUPABASE_URL = "https://kymtqzyatofclfaeegfw.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2gwFi5f702YC_-py8PGxPw_z6iW67MN";
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  // ---------------- CATALOG (SUPABASE) ----------------
  // Products now come directly from the admin inventory table.
  // Anything marked "sold" in admin.html is hidden from the customer shop.
  let PRODUCTS = [];

  async function loadProducts(){
    const { data, error } = await supabaseClient
      .from('inventory')
      .select('*')
      .neq('status', 'sold')
      .order('created_at', { ascending:false });

    if(error){
      console.error('Could not load shop inventory:', error);
      PRODUCTS = [];
      renderShopGrid();
      noResults.textContent = 'The shop inventory could not be loaded right now. Please refresh and try again.';
      noResults.style.display = 'block';
      return;
    }

    PRODUCTS = (data || []).map(item => ({
      id: String(item.id),
      itemCode: item.item_code || String(item.id).slice(0,8).toUpperCase(),
      name: item.name || 'Untitled item',
      category: String(item.category || 'other').toLowerCase(),
      size: item.size || 'One size',
      condition: item.condition || 'Good condition',
      price: Number(item.price || 0),
      image: item.image_url || '',
      badge: item.status === 'available' ? 'AVAILABLE' : '',
      soldOut: item.status === 'sold'
    }));

    noResults.textContent = 'Nothing matches that search yet — try a different keyword or category.';
    renderShopGrid();
  }

  const ICONS = {
    shoes: '<path d="M6 34h34c3 0 6-2 6-6-4 0-7-1-10-4l-8-8-6 2-8-2-8 4v14z"/>',
    pants: '<path d="M14 6h20l2 10-3 26h-7l-2-20-2 20h-7L12 16z"/>',
    shirts: '<path d="M17 8l7 5 7-5 6 6-5 5v20H16V19l-5-5z"/>'
  };

  function iconSvg(cat){
    return '<svg class="icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6">' + (ICONS[cat]||ICONS.shirts) + '</svg>';
  }
  function peso(n){ return '\u20B1' + n.toLocaleString('en-PH'); }
  function findProduct(id){ return PRODUCTS.find(p => p.id === id); }

  // ---------------- CART (per-browser, localStorage) ----------------
  const CART_KEY = 'datihan_cart_v1';
  function loadCart(){
    try{ return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
    catch(e){ return {}; }
  }
  function saveCart(cart){
    try{ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }catch(e){}
  }
  let cart = loadCart(); // { productId: qty }

  function cartCount(){
    return Object.values(cart).reduce((a,b) => a+b, 0);
  }
  function cartTotal(){
    return Object.entries(cart).reduce((sum,[id,qty]) => {
      const p = findProduct(id);
      return sum + (p ? p.price*qty : 0);
    }, 0);
  }
  async function addToCart(id){
    const p = findProduct(id);
    if(!p || p.soldOut) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if(!user){
      pendingAddToCartId = id;
      showAddToCartAuthChoice();
      return;
    }

    cart[id] = (cart[id]||0) + 1;
    saveCart(cart);
    renderCartBadge();
    renderCartDrawer();
  }
  function setQty(id, qty){
    if(qty <= 0){ delete cart[id]; }
    else { cart[id] = qty; }
    saveCart(cart);
    renderCartBadge();
    renderCartDrawer();
  }

  function renderCartBadge(){
    const n = cartCount();
    const el = document.getElementById('cartCount');
    el.textContent = n;
    el.dataset.zero = n === 0 ? 'true' : 'false';
  }

  // ---------------- SHOP GRID ----------------
  const shopGrid = document.getElementById('shopGrid');
  const noResults = document.getElementById('noResults');
  const searchInput = document.getElementById('shopSearch');
  const fchips = document.querySelectorAll('.fchip');
  let activeFilter = 'all';

  function renderShopGrid(){
    const q = searchInput.value.trim().toLowerCase();
    const visible = PRODUCTS.filter(p => {
      const matchesCat = activeFilter === 'all' || p.category === activeFilter;
      const matchesText = !q || p.name.toLowerCase().includes(q) || p.category.includes(q);
      return matchesCat && matchesText;
    });
    shopGrid.innerHTML = visible.map(p => {
      const badge = p.badge ? '<span class="badge">'+p.badge+'</span>' : '';
      const inCart = cart[p.id] || 0;
      const safeName = escapeHtml(p.name);
      const safeImage = escapeHtml(p.image);
      const media = p.image
        ? '<img class="photo" src="'+safeImage+'" alt="'+safeName+'">'
        : iconSvg(p.category);
      const safeCategory = escapeHtml(p.category);
      const safeSize = escapeHtml(p.size);
      const safeCondition = escapeHtml(p.condition);
      const safeCode = escapeHtml(p.itemCode);
      return '<div class="item-card'+(p.soldOut?' sold-out':'')+'" data-id="'+escapeHtml(p.id)+'">'
        + badge
        + media
        + '<h3>'+safeName+'</h3>'
        + '<div class="meta">'+safeSize+' · '+safeCondition+' · '+safeCategory+'</div>'
        + '<div class="price"><span class="tag-font">#'+safeCode+'</span><span class="amt">'+peso(p.price)+'</span></div>'
        + '<button class="add-btn" data-add="'+escapeHtml(p.id)+'" '+(p.soldOut?'disabled':'')+'>'+(p.soldOut ? 'Sold out' : (inCart ? 'Added ('+inCart+') · Add another' : 'Add to cart'))+'</button>'
        + '</div>';
    }).join('');
    noResults.style.display = visible.length === 0 ? 'block' : 'none';

    shopGrid.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await addToCart(btn.dataset.add);
        renderShopGrid();
      });
    });
  }

  searchInput.addEventListener('input', renderShopGrid);
  fchips.forEach(chip => {
    chip.addEventListener('click', () => {
      fchips.forEach(c => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      activeFilter = chip.dataset.filter;
      renderShopGrid();
    });
  });

  // ---------------- TABS ----------------
  const tabs = document.querySelectorAll('[data-tab]');
  const panels = document.querySelectorAll('.tabpanel');
  function activateTab(name){
    tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.tab === name ? 'true' : 'false'));
    panels.forEach(p => { p.hidden = (p.id !== 'panel-' + name); });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  tabs.forEach(t => t.addEventListener('click', () => activateTab(t.dataset.tab)));
  document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      activateTab(el.dataset.goto);
      if(el.dataset.cat){
        const target = document.querySelector('.fchip[data-filter="' + el.dataset.cat + '"]');
        if(target) target.click();
      }
    });
  });

  // ---------------- POP-UPS / ALERTS (SHOP OWNER CONTROLLED) ----------------
  let ACTIVE_POPUPS = [];

  function popupDateText(value){
    return value ? new Date(value + 'T00:00:00').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : '';
  }

  function popupTimeText(value){
    if(!value) return '';
    const parts=String(value).slice(0,5).split(':');
    const d=new Date(2000,0,1,Number(parts[0]),Number(parts[1]));
    return d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
  }

  function popupStatus(p){
    if(!p.event_date) return 'Announcement';
    const now = new Date();
    const [y,m,d] = p.event_date.split('-').map(Number);
    const start = p.start_time ? new Date(y,m-1,d,...String(p.start_time).slice(0,5).split(':').map(Number)) : new Date(y,m-1,d,0,0);
    const end = p.end_time ? new Date(y,m-1,d,...String(p.end_time).slice(0,5).split(':').map(Number)) : new Date(y,m-1,d,23,59,59,999);
    if(now < start) return 'Upcoming';
    if(now <= end) return 'Ongoing';
    return 'Ended';
  }

  function popupDestination(value){
    return ['home','shop','events','consign','about'].includes(value) ? value : 'events';
  }

  function renderPopups(){
    const list = document.getElementById('popupEventList');
    const homeTitle = document.getElementById('homePopupTitle');
    const homeMeta = document.getElementById('homePopupMeta');
    const homeButton = document.getElementById('homePopupButton');
    const banner = document.getElementById('newsBanner');
    const bannerMsg = document.getElementById('newsBannerMsg');
    const bannerGo = document.getElementById('newsBannerGo');
    if(!list) return;

    if(!ACTIVE_POPUPS.length){
      list.innerHTML = '<div class="event-row"><div class="event-info"><h3>No pop-ups available</h3><p>Check back later for the next Datihan announcement.</p></div><div class="event-status">Stay tuned</div></div>';
      if(homeTitle) homeTitle.textContent = 'No upcoming pop-ups';
      if(homeMeta) homeMeta.textContent = 'Check back later for the next Datihan announcement.';
      if(homeButton){ homeButton.textContent='View pop-ups'; homeButton.onclick=()=>activateTab('events'); }
      if(banner){ banner.hidden=true; banner.classList.add('hidden'); }
      return;
    }

    list.innerHTML = ACTIVE_POPUPS.map(p => {
      const title = escapeHtml(p.title || 'Datihan pop-up');
      const message = escapeHtml(p.message || '');
      const location = escapeHtml(p.location || '');
      const date = popupDateText(p.event_date);
      const time = [popupTimeText(p.start_time),popupTimeText(p.end_time)].filter(Boolean).join(' – ');
      const meta = [location,date,time].filter(Boolean).join(' · ');
      return '<div class="event-row"><div class="event-info"><h3>'+title+'</h3><p>'+message+(meta?' · '+meta:'')+'</p></div><div class="event-status">'+popupStatus(p)+'</div></div>';
    }).join('');

    const first = ACTIVE_POPUPS[0];
    const firstTitle = first.title || 'Datihan pop-up';
    const firstMeta = [first.message,first.location,popupDateText(first.event_date),[popupTimeText(first.start_time),popupTimeText(first.end_time)].filter(Boolean).join(' – ')].filter(Boolean).join(' · ');
    const firstButton = first.button_text || 'See details';
    const destination = popupDestination(first.button_tab);

    if(homeTitle) homeTitle.textContent = firstTitle;
    if(homeMeta) homeMeta.textContent = firstMeta;
    if(homeButton){
      homeButton.textContent = firstButton;
      homeButton.onclick = () => activateTab(destination);
    }

    if(banner){
      banner.hidden=false;
      banner.classList.remove('hidden');
      if(bannerMsg) bannerMsg.textContent = first.message ? firstTitle + ' — ' + first.message : firstTitle;
      if(bannerGo){
        bannerGo.textContent = firstButton;
        bannerGo.onclick = () => activateTab(destination);
      }
    }
  }

  async function loadPopups(){
    const {data,error} = await supabaseClient
      .from('popups')
      .select('*')
      .eq('is_active', true)
      .order('event_date',{ascending:true,nullsFirst:false})
      .order('created_at',{ascending:false});

    if(error){
      console.error('Could not load pop-ups:', error);
      ACTIVE_POPUPS=[];
    }else{
      ACTIVE_POPUPS=data||[];
    }
    renderPopups();
  }

  document.getElementById('newsBannerClose').addEventListener('click', () => {
    const banner=document.getElementById('newsBanner');
    banner.classList.add('hidden');
    banner.hidden=true;
  });

  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const answer = btn.nextElementSibling;
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      answer.style.maxHeight = expanded ? '0px' : answer.scrollHeight + 'px';
    });
  });

  // ---------------- CART DRAWER ----------------
  const overlayBg = document.getElementById('overlayBg');
  const cartDrawer = document.getElementById('cartDrawer');
  const checkoutDrawer = document.getElementById('checkoutDrawer');
  const cartBody = document.getElementById('cartBody');
  const cartFoot = document.getElementById('cartFoot');

  function openDrawer(drawer){
    overlayBg.classList.add('open');
    drawer.classList.add('open');
  }
  function closeDrawers(){
    overlayBg.classList.remove('open');
    cartDrawer.classList.remove('open');
    checkoutDrawer.classList.remove('open');
  }
  overlayBg.addEventListener('click', closeDrawers);
  document.getElementById('closeCart').addEventListener('click', closeDrawers);
  document.getElementById('closeCheckout').addEventListener('click', closeDrawers);

  document.getElementById('cartBtn').addEventListener('click', () => {
    renderCartDrawer();
    openDrawer(cartDrawer);
  });

  function renderCartDrawer(){
    const ids = Object.keys(cart);
    if(ids.length === 0){
      cartBody.innerHTML = '<p class="empty-cart">Your cart is empty. Add something from the Shop tab.</p>';
      cartFoot.innerHTML = '';
      return;
    }
    cartBody.innerHTML = ids.map(id => {
      const p = findProduct(id);
      if(!p) return '';
      const qty = cart[id];
      const media = p.image ? '<img src="'+p.image+'" alt="">' : iconSvg(p.category);
      return '<div class="cart-line" data-id="'+id+'">'
        + '<div class="thumb">'+media+'</div>'
        + '<div class="info">'
        +   '<h4>'+p.name+'</h4>'
        +   '<div class="row2">'
        +     '<div class="qty-stepper">'
        +       '<button data-step="-1" aria-label="Decrease quantity">−</button>'
        +       '<span>'+qty+'</span>'
        +       '<button data-step="1" aria-label="Increase quantity">+</button>'
        +     '</div>'
        +     '<span class="amt">'+peso(p.price*qty)+'</span>'
        +   '</div>'
        +   '<button class="remove" data-remove>Remove</button>'
        + '</div>'
        + '</div>';
    }).join('');

    cartBody.querySelectorAll('[data-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const line = btn.closest('.cart-line');
        const id = line.dataset.id;
        setQty(id, cart[id] + Number(btn.dataset.step));
      });
    });
    cartBody.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.cart-line').dataset.id;
        setQty(id, 0);
      });
    });

    cartFoot.innerHTML = `
      <div class="cart-total"><span>Total</span><strong>${peso(cartTotal())}</strong></div>
      <button class="btn btn-primary checkout-btn" id="checkoutBtn" type="button">Checkout</button>`;
    document.getElementById('checkoutBtn').addEventListener('click', async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if(!user){
        pendingCheckout=true;
        showCheckoutAuthChoice();
        return;
      }
      renderCheckoutForm();
      openDrawer(checkoutDrawer);
    });
  }

  function renderCheckoutForm(){
    checkoutDrawer.querySelector('.drawer-head h2').textContent = 'Checkout';
    checkoutBody.innerHTML = `
      <div class="checkout-summary">
        <div class="tag-font">ORDER SUMMARY</div>
        ${Object.entries(cart).map(([id,qty])=>{
          const p=findProduct(id);
          return p ? `<div class="checkout-line"><span>${escapeHtml(p.name)} × ${qty}</span><strong>${peso(p.price*qty)}</strong></div>` : '';
        }).join('')}
        <div class="checkout-total"><span>Total</span><strong>${peso(cartTotal())}</strong></div>
      </div>
      <form id="checkoutForm" class="checkout-form">
        <div class="checkout-field"><label for="buyerName">Full name</label><input id="buyerName" required></div>
        <div class="checkout-field"><label for="buyerPhone">Phone</label><input id="buyerPhone" required></div>
        <div class="checkout-field"><label for="buyerAddress">Delivery address</label><textarea id="buyerAddress" rows="3" required></textarea></div>
        <div class="checkout-field"><label for="buyerNote">Note (optional)</label><textarea id="buyerNote" rows="2"></textarea></div>
        <button class="btn btn-primary" type="submit">Place order — COD</button>
        <p class="checkout-message" id="checkoutMessage"></p>
      </form>`;
    const checkoutForm=document.getElementById('checkoutForm');
    checkoutForm.addEventListener('submit', async event => {
      event.preventDefault();
      const user=(await supabaseClient.auth.getUser()).data.user;
      if(!user){
        pendingCheckout=true;
        showCheckoutAuthChoice();
        return;
      }
      const msg=document.getElementById('checkoutMessage');
      const submit=checkoutForm.querySelector('button[type="submit"]');
      submit.disabled=true;
      msg.textContent='Placing your order…';
      const payload={
        user_id:user.id,
        customer_name:document.getElementById('buyerName').value.trim(),
        phone:document.getElementById('buyerPhone').value.trim(),
        address:document.getElementById('buyerAddress').value.trim(),
        note:document.getElementById('buyerNote').value.trim(),
        total_amount:cartTotal(),
        items:Object.entries(cart).map(([id,qty])=>({product_id:id,quantity:qty}))
      };
      const {error}=await supabaseClient.from('orders').insert(payload);
      if(error){
        msg.textContent=error.message||'Could not place the order.';
        submit.disabled=false;
        return;
      }
      msg.textContent='Order placed successfully. We will contact you to confirm delivery.';
      cart={};
      saveCart(cart);
      renderCartBadge();
      renderCartDrawer();
    });
  }

  // ---------------- AUTHENTICATION UI ----------------
  const authBtn = document.getElementById('authBtn');
  const roleNavBtn = document.getElementById('roleNavBtn');
  const authBackdrop = document.getElementById('authBackdrop');
  const authClose = document.getElementById('authClose');
  const authBody = document.getElementById('authBody');
  const authTitle = document.getElementById('authTitle');
  const authEmailForm = document.getElementById('authEmailForm');
  const authEmail = document.getElementById('authEmail');
  const authMessage = document.getElementById('authMessage');

  let pendingOtpEmail = '';
  let pendingCheckout = false;
  let pendingAddToCartId = null;

  function goToLoginForCheckout(){
    localStorage.setItem('datihan_return_to_checkout','true');
    location.href = 'login.html';
  }

  function openCheckoutAfterLogin(){
    const shouldReturn = localStorage.getItem('datihan_return_to_checkout') === 'true';
    if(!shouldReturn) return;
    localStorage.removeItem('datihan_return_to_checkout');
    if(Object.keys(cart).length){
      closeAuth();
      renderCheckoutForm();
      openDrawer(checkoutDrawer);
    }
  }

  function goToLoginForCart(){
    if(pendingAddToCartId){
      localStorage.setItem('datihan_pending_add_to_cart', String(pendingAddToCartId));
    }
    location.href = 'login.html';
  }

  function goToSignupForCart(){
    if(pendingAddToCartId){
      localStorage.setItem('datihan_pending_add_to_cart', String(pendingAddToCartId));
    }
    location.href = 'signup.html';
  }

  function showAddToCartAuthChoice(){
    authTitle.textContent = 'Login required to add to cart';
    authBody.innerHTML = `
      <p class="auth-copy">Please sign in or create a Datihan account before adding an item. Your cart will be preserved after you sign in.</p>
      <button class="btn btn-primary auth-submit" type="button" id="existingCartBuyerBtn">I already have an account</button>
      <button class="btn btn-outline auth-submit" type="button" id="newCartBuyerBtn" style="margin-top:10px;">I'm a new buyer — Sign Up</button>
      <p class="auth-message">You can browse the store without an account. An account is required to keep your cart connected to you.</p>`;
    document.getElementById('existingCartBuyerBtn').addEventListener('click', goToLoginForCart);
    document.getElementById('newCartBuyerBtn').addEventListener('click', goToSignupForCart);
    openAuth();
  }

  function showCheckoutAuthChoice(){
    authTitle.textContent = 'Login required to checkout';
    authBody.innerHTML = `
      <p class="auth-copy">You can browse Datihan without an account. To place an order, choose an option below.</p>
      <button class="btn btn-primary auth-submit" type="button" id="existingBuyerBtn">I already have an account</button>
      <button class="btn btn-outline auth-submit" type="button" id="newBuyerBtn" style="margin-top:10px;">I'm a new buyer — Sign Up</button>
      <p class="auth-message">Existing buyers will sign in through the Datihan login page. New buyers can create an account with their email.</p>`;
    document.getElementById('existingBuyerBtn').addEventListener('click', goToLoginForCheckout);
    document.getElementById('newBuyerBtn').addEventListener('click', showSignupStep);
    openAuth();
  }

  function showSignupStep(){
    authTitle.textContent = 'Create your buyer account';
    authBody.innerHTML = `
      <p class="auth-copy">Enter your email and we'll send you a 6-digit code to create your buyer account.</p>
      <form id="signupEmailForm">
        <div class="auth-field">
          <label for="signupEmail">Email</label>
          <input id="signupEmail" type="email" autocomplete="email" placeholder="you@example.com" required>
        </div>
        <button class="btn btn-primary auth-submit" type="submit" id="signupSendBtn">Send Sign-Up Code</button>
        <p class="auth-message" id="signupMessage" aria-live="polite"></p>
      </form>
      <div class="auth-secondary"><button class="auth-link" type="button" id="backAuthChoiceBtn">Back</button></div>`;
    document.getElementById('backAuthChoiceBtn').addEventListener('click', showCheckoutAuthChoice);
    document.getElementById('signupEmailForm').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email=document.getElementById('signupEmail').value.trim().toLowerCase();
      const btn=document.getElementById('signupSendBtn');
      const message=document.getElementById('signupMessage');
      if(!email) return;
      btn.disabled=true; message.textContent='Sending your sign-up code…'; message.className='auth-message';
      const {error}=await supabaseClient.auth.signInWithOtp({email,options:{shouldCreateUser:true}});
      btn.disabled=false;
      if(error){message.textContent=error.message||'Could not send the sign-up code.';message.className='auth-message error';return;}
      pendingOtpEmail=email;
      showOtpStep();
    });
  }

  function setAuthMessage(message, type=''){
    authMessage.textContent = message;
    authMessage.className = 'auth-message' + (type ? ' ' + type : '');
  }

  function openAuth(){
    authBackdrop.classList.add('open');
    authBackdrop.setAttribute('aria-hidden','false');
    setTimeout(() => {
      const input = document.getElementById('authEmail');
      if(input) input.focus();
    }, 0);
  }

  function closeAuth(){
    authBackdrop.classList.remove('open');
    authBackdrop.setAttribute('aria-hidden','true');
  }

  function showEmailStep(copyText="Sign in or create your Datihan account to continue. We\'ll send a 6-digit one-time code.") {
    authTitle.textContent = 'Sign in to Datihan';
    authBody.innerHTML = `
      <p class="auth-copy">${escapeHtml(copyText)}</p>
      <form id="authEmailForm">
        <div class="auth-field">
          <label for="authEmail">Email</label>
          <input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com" required>
        </div>
        <button class="btn btn-primary auth-submit" type="submit" id="sendOtpBtn">Send OTP</button>
        <p class="auth-message" id="authMessage" aria-live="polite"></p>
      </form>`;
    bindEmailStep();
  }

  function bindEmailStep(){
    const form = document.getElementById('authEmailForm');
    const emailInput = document.getElementById('authEmail');
    const message = document.getElementById('authMessage');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = emailInput.value.trim().toLowerCase();
      if(!email) return;
      const btn = document.getElementById('sendOtpBtn');
      btn.disabled = true;
      message.textContent = 'Sending your code…';
      message.className = 'auth-message';

      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }
      });

      btn.disabled = false;
      if(error){
        message.textContent = error.message || 'We could not send the code. Please try again.';
        message.className = 'auth-message error';
        return;
      }

      pendingOtpEmail = email;
      showOtpStep();
    });
  }

  function showOtpStep(){
    authTitle.textContent = 'Check your email';
    authBody.innerHTML = `
      <p class="auth-copy">We sent a 6-digit code to <strong>${escapeHtml(pendingOtpEmail)}</strong>. Enter it below to ${pendingCheckout ? 'finish creating your buyer account' : 'finish signing in'}.</p>
      <form id="authOtpForm">
        <div class="auth-field">
          <label for="authOtp">6-digit OTP</label>
          <input id="authOtp" class="auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\d{6}" placeholder="123456" required>
        </div>
        <button class="btn btn-primary auth-submit" type="submit" id="verifyOtpBtn">Verify OTP</button>
        <p class="auth-message" id="authMessage" aria-live="polite"></p>
      </form>
      <div class="auth-secondary">
        <button class="auth-link" type="button" id="changeEmailBtn">Use another email</button>
        <button class="auth-link" type="button" id="resendOtpBtn">Resend code</button>
      </div>`;

    document.getElementById('authOtp').focus();
    document.getElementById('authOtpForm').addEventListener('submit', verifyOtp);
    document.getElementById('changeEmailBtn').addEventListener('click', () => { pendingOtpEmail=''; showEmailStep(); });
    document.getElementById('resendOtpBtn').addEventListener('click', resendOtp);
  }

  async function verifyOtp(event){
    event.preventDefault();
    const token = document.getElementById('authOtp').value.trim();
    const btn = document.getElementById('verifyOtpBtn');
    const message = document.getElementById('authMessage');
    if(!/^\d{6}$/.test(token)){
      message.textContent = 'Please enter the 6-digit code from your email.';
      message.className = 'auth-message error';
      return;
    }

    btn.disabled = true;
    message.textContent = 'Verifying…';
    message.className = 'auth-message';

    const { error } = await supabaseClient.auth.verifyOtp({
      email: pendingOtpEmail,
      token,
      type: 'email'
    });

    btn.disabled = false;
    if(error){
      message.textContent = error.message || 'That code could not be verified. Please try again.';
      message.className = 'auth-message error';
      return;
    }

    await refreshAuthUI();
    closeAuth();

    if(pendingAddToCartId){
      const id = pendingAddToCartId;
      pendingAddToCartId = null;
      const product = findProduct(id);
      if(product && !product.soldOut){
        cart[id] = (cart[id]||0) + 1;
        saveCart(cart);
        renderCartBadge();
        renderCartDrawer();
        renderShopGrid();
      }
    }

    if(pendingCheckout){
      pendingCheckout=false;
      renderCheckoutForm();
      openDrawer(checkoutDrawer);
    }
  }

  async function resendOtp(){
    if(!pendingOtpEmail) return;
    const btn = document.getElementById('resendOtpBtn');
    const message = document.getElementById('authMessage');
    btn.disabled = true;
    message.textContent = 'Sending a new code…';
    message.className = 'auth-message';
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: pendingOtpEmail,
      options: { shouldCreateUser: true }
    });
    btn.disabled = false;
    if(error){
      message.textContent = error.message || 'Could not resend the code.';
      message.className = 'auth-message error';
      return;
    }
    message.textContent = 'A new code has been sent.';
    message.className = 'auth-message success';
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>\"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]));
  }

  async function refreshAuthUI(){
    const {data:{user}} = await supabaseClient.auth.getUser();
    if(user){
      authBtn.textContent = user.email || 'Account';
      authBtn.classList.add('signed-in');
      authBtn.onclick = async () => {
        await supabaseClient.auth.signOut();
        location.href = 'index.html';
      };
      const {data:profile}=await supabaseClient.from('profiles').select('role').eq('id',user.id).single();
      if(profile?.role === 'shop_owner'){
        roleNavBtn.textContent='Shop owner';
        roleNavBtn.style.display='inline-flex';
        roleNavBtn.onclick=()=>location.href='shop-owner.html';
      }else{
        roleNavBtn.textContent='';
        roleNavBtn.style.display='none';
      }
    }else{
      authBtn.textContent='Login';
      authBtn.classList.remove('signed-in');
      authBtn.onclick=()=>{ location.href='login.html'; };
      roleNavBtn.textContent='';
      roleNavBtn.style.display='none';
    }
  }

  authBtn.addEventListener('click', () => { location.href = 'login.html'; });
  authClose.addEventListener('click', closeAuth);
  authBackdrop.addEventListener('click', event => {
    if(event.target === authBackdrop) closeAuth();
  });
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape' && authBackdrop.classList.contains('open')) closeAuth();
  });

  // ---------------- INIT ----------------
  renderCartBadge();
  renderShopGrid();
  refreshAuthUI();
  openCheckoutAfterLogin();
  loadProducts();
  loadPopups();

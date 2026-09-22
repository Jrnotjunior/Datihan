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

  // ---------------- CART (ACCOUNT-BASED / SUPABASE) ----------------
  // Cart data is never stored in browser localStorage. Each authenticated
  // buyer has an isolated cart identified by their Supabase auth user id.
  // Datihan currently sells unique thrift items, so each cart item is quantity 1.
  let cart = {};
  let cartUserId = null;

  async function loadCartForUser(user){
    cart = {};
    cartUserId = user ? user.id : null;
    if(!user){ renderCartBadge(); return; }

    const { data, error } = await supabaseClient
      .from('cart_items')
      .select('product_id,quantity')
      .eq('user_id', user.id);

    if(error){
      console.error('Could not load account cart:', error);
      renderCartBadge();
      return;
    }

    (data || []).forEach(row => {
      // Current Datihan inventory is one-of-a-kind: normalize every cart item to 1.
      cart[String(row.product_id)] = Number(row.quantity) > 0 ? 1 : 0;
    });
    renderCartBadge();
  }

  async function saveCartItem(productId, quantity){
    quantity = quantity > 0 ? 1 : 0;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if(!user) return false;

    if(quantity <= 0){
      const { error } = await supabaseClient
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
      if(error){ console.error('Could not remove cart item:', error); return false; }
      return true;
    }

    const { error } = await supabaseClient
      .from('cart_items')
      .upsert(
        { user_id:user.id, product_id:productId, quantity:1 },
        { onConflict:'user_id,product_id' }
      );
    if(error){ console.error('Could not save cart item:', error); return false; }
    return true;
  }

  function cartCount(){
    return Object.values(cart).reduce((a,b) => a+b, 0);
  }
  function cartTotal(){
    return Object.entries(cart).reduce((sum,[id,qty]) => {
      const p = findProduct(id);
      return sum + (p ? p.price*qty : 0);
    }, 0);
  }

  function getAddToCartRedirect(page,id){
    return page + '?add=' + encodeURIComponent(id);
  }

  function showAddToCartAuthChoice(){
    const modal = document.getElementById('addAuthModal');
    if(!modal){
      if(pendingAddToCartId) location.href = getAddToCartRedirect('login.html', pendingAddToCartId);
      return;
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    const login = document.getElementById('addAuthLogin');
    const signup = document.getElementById('addAuthSignup');
    const close = document.getElementById('addAuthClose');
    if(login) login.onclick = () => {
      if(pendingAddToCartId) location.href = getAddToCartRedirect('login.html', pendingAddToCartId);
    };
    if(signup) signup.onclick = () => {
      if(pendingAddToCartId) location.href = getAddToCartRedirect('signup.html', pendingAddToCartId);
    };
    if(close) close.onclick = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden','true');
      pendingAddToCartId = null;
    };
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

    if(cartUserId !== user.id) await loadCartForUser(user);
    // A unique thrift item can only appear once in the cart.
    const next = 1;
    if(await saveCartItem(id,next)){
      cart[id] = next;
      renderCartBadge();
      renderCartDrawer();
    }
  }

  async function setQty(id, qty){
    const { data: { user } } = await supabaseClient.auth.getUser();
    if(!user) return;
    // Quantity is intentionally limited to 1 for the current thrift-store model.
    const nextQty = qty <= 0 ? 0 : 1;
    if(await saveCartItem(id,nextQty)){
      if(nextQty <= 0) delete cart[id];
      else cart[id] = 1;
      renderCartBadge();
      renderCartDrawer();
    }
  }

  let pendingAddToCartId = null;

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
        + '<button class="add-btn" data-add="'+escapeHtml(p.id)+'" '+(p.soldOut?'disabled':'')+'>'+(p.soldOut ? 'Sold out' : (inCart ? 'Already in cart' : 'Add to cart'))+'</button>'
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

  document.getElementById('cartBtn').addEventListener('click', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if(!user){
      openCheckout();
      return;
    }
    if(cartUserId !== user.id) await loadCartForUser(user);
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
      const media = p.image ? '<img src="'+p.image+'" alt="">' : iconSvg(p.category);
      return '<div class="cart-line" data-id="'+id+'">'
        + '<div class="thumb">'+media+'</div>'
        + '<div class="info">'
        +   '<h4>'+p.name+'</h4>'
        +   '<div class="row2">'
        +     '<span class="cart-qty">Quantity: 1</span>'
        +     '<span class="amt">'+peso(p.price)+'</span>'
        +   '</div>'
        +   '<button class="remove" data-remove>Remove</button>'
        + '</div>'
        + '</div>';
    }).join('');

    cartBody.querySelectorAll('.cart-line').forEach(line => {
      const id = line.dataset.id;
      line.querySelector('[data-remove]').addEventListener('click', () => setQty(id, 0));
    });

    const total = cartTotal();
    cartFoot.innerHTML = '<div class="cart-total"><span>Total</span><strong>'+peso(total)+'</strong></div>'
      + '<button class="btn btn-primary checkout-btn" id="checkoutBtn" type="button">Proceed to checkout</button>';
    document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
  }

  // ---------------- CHECKOUT ----------------
  const checkoutBody = document.getElementById('checkoutBody');
  let checkoutProfile = null;

  function showCheckoutAuthChoice(){
    checkoutBody.innerHTML = `
      <div class="checkout-auth">
        <h3 class="display">Continue to checkout</h3>
        <p>Please sign in or create a buyer account before checking out.</p>
        <div class="checkout-auth-actions">
          <button class="btn btn-primary" type="button" id="checkoutExistingBtn">I already have an account</button>
          <button class="btn btn-outline" type="button" id="checkoutNewBtn">I'm a new buyer — Sign Up</button>
        </div>
      </div>`;
    document.getElementById('checkoutExistingBtn').addEventListener('click', showCheckoutLogin);
    document.getElementById('checkoutNewBtn').addEventListener('click', showCheckoutSignup);
  }

  function showCheckoutLogin(){
    location.href = 'login.html';
  }

  function showCheckoutSignup(){
    location.href = 'signup.html';
  }

  async function openCheckout(){
    const { data: { user } } = await supabaseClient.auth.getUser();
    if(!user){
      showCheckoutAuthChoice();
      openDrawer(checkoutDrawer);
      return;
    }
    if(cartUserId !== user.id) await loadCartForUser(user);
    checkoutProfile = user;
    renderCheckoutForm(user);
    openDrawer(checkoutDrawer);
  }

  function renderCheckoutForm(user){
    checkoutBody.innerHTML = `
      <form id="checkoutForm" class="checkout-form">
        <div class="checkout-grid">
          <div class="field"><label for="buyerName">Full name</label><input id="buyerName" required value=""></div>
          <div class="field"><label for="buyerPhone">Phone</label><input id="buyerPhone" required></div>
        </div>
        <div class="field"><label for="buyerAddress">Delivery address</label><textarea id="buyerAddress" rows="3" required></textarea></div>
        <div class="field"><label for="buyerNotes">Notes</label><textarea id="buyerNotes" rows="3" placeholder="Optional"></textarea></div>
        <button class="btn btn-primary" type="submit">Place order</button>
        <p class="auth-message" id="checkoutMessage" aria-live="polite"></p>
      </form>`;

    document.getElementById('checkoutForm').addEventListener('submit', submitCheckout);
  }

  async function submitCheckout(e){
    e.preventDefault();
    const message = document.getElementById('checkoutMessage');
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    message.textContent = 'Placing order…';
    message.className = 'auth-message';

    const { data: { user } } = await supabaseClient.auth.getUser();
    if(!user){
      location.href='login.html';
      return;
    }

    if(cartUserId !== user.id) await loadCartForUser(user);
    const orderItems = Object.entries(cart).map(([id]) => ({
      product_id: Number(id),
      quantity: 1,
      price: findProduct(id)?.price || 0
    }));

    if(!orderItems.length){
      message.textContent = 'Your cart is empty.';
      message.className = 'auth-message error';
      btn.disabled = false;
      return;
    }

    // Checkout is completed atomically in Supabase. The database function
    // verifies availability, creates the order, marks items sold, and clears
    // this buyer's cart in one transaction.
    const { error } = await supabaseClient.rpc('place_datihan_order', {
      p_customer_name: document.getElementById('buyerName').value.trim(),
      p_phone: document.getElementById('buyerPhone').value.trim(),
      p_address: document.getElementById('buyerAddress').value.trim(),
      p_notes: document.getElementById('buyerNotes').value.trim()
    });

    if(error){
      message.textContent = error.message || 'One or more items are no longer available. Please review your cart.';
      message.className = 'auth-message error';
      btn.disabled = false;
      await loadProducts();
      await loadCartForUser(user);
      renderCartDrawer();
      return;
    }

    await loadCartForUser(user);
    await loadProducts();
    renderCartBadge();
    renderCartDrawer();
    message.textContent = 'Order placed successfully.';
    message.className = 'auth-message success';
    btn.disabled = false;
  }

  // ---------------- AUTH / ACCOUNT ----------------
  const authBackdrop = document.getElementById('authBackdrop');
  const authModal = document.getElementById('authModal');
  const authTitle = document.getElementById('authTitle');
  const authBody = document.getElementById('authBody');
  const authClose = document.getElementById('authClose');
  const authBtn = document.getElementById('authBtn');
  const roleNavBtn = document.getElementById('roleNavBtn');
  let pendingOtpEmail = '';

  function openAuth(){
    authBackdrop.classList.add('open');
    authModal.classList.add('open');
    showCheckoutAuthChoice();
  }

  function closeAuth(){
    authBackdrop.classList.remove('open');
    authModal.classList.remove('open');
  }

  function showEmailStep(){
    authTitle.textContent = 'Sign in to Datihan';
    authBody.innerHTML = `
      <p class="auth-copy">Enter your email and we'll send you a 6-digit code to sign in.</p>
      <form id="authEmailForm">
        <div class="auth-field">
          <label for="authEmail">Email</label>
          <input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com" required>
        </div>
        <button class="btn btn-primary auth-submit" type="submit">Send OTP</button>
        <p class="auth-message" id="authMessage" aria-live="polite"></p>
      </form>`;
    document.getElementById('authEmailForm').addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('authEmail').value.trim();
      const message = document.getElementById('authMessage');
      message.textContent = 'Sending…';
      const { error } = await supabaseClient.auth.signInWithOtp({ email, options:{ shouldCreateUser:false } });
      if(error){
        message.textContent = error.message;
        message.className = 'auth-message error';
        return;
      }
      pendingOtpEmail = email;
      showOtpStep();
    });
  }

  function showOtpStep(){
    authTitle.textContent = 'Enter your code';
    authBody.innerHTML = `
      <p class="auth-copy">Check your email for the 6-digit code.</p>
      <form id="authOtpForm">
        <div class="auth-field">
          <label for="authOtp">Code</label>
          <input id="authOtp" inputmode="numeric" maxlength="6" required>
        </div>
        <button class="btn btn-primary auth-submit" id="verifyOtpBtn" type="submit">Verify & Sign In</button>
        <p class="auth-message" id="authMessage" aria-live="polite"></p>
      </form>`;
    document.getElementById('authOtpForm').addEventListener('submit', verifyOtp);
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
    const { error } = await supabaseClient.auth.verifyOtp({ email: pendingOtpEmail, token, type: 'email' });
    if(error){
      message.textContent = error.message;
      message.className = 'auth-message error';
      btn.disabled = false;
      return;
    }
    closeAuth();
    await refreshAuthUI();
  }

  async function refreshAuthUI(){
    const { data:{ user } } = await supabaseClient.auth.getUser();
    if(user){
      const name = user.email || 'Account';
      authBtn.textContent = name.length > 18 ? name.slice(0,18) + '…' : name;
      authBtn.classList.add('signed-in');
      authBtn.onclick = async () => {
        await supabaseClient.auth.signOut();
        cart = {};
        cartUserId = null;
        renderCartBadge();
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

  // ---------------- INIT ----------------
  async function handlePendingCartFromUrl(){
    const params = new URLSearchParams(location.search);
    const pendingId = params.get('add');
    if(!pendingId) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if(!user) return;
    const p = findProduct(pendingId);
    if(!p || p.soldOut) return;
    if(cartUserId !== user.id) await loadCartForUser(user);
    const next = 1;
    if(await saveCartItem(pendingId,next)){
      cart[pendingId] = next;
      renderCartBadge();
      renderCartDrawer();
      history.replaceState({}, document.title, location.pathname);
    }
  }

  (async()=>{
    await refreshAuthUI();
    const { data: { user } } = await supabaseClient.auth.getUser();
    await loadCartForUser(user);
    renderCartBadge();
    await loadProducts();
    await handlePendingCartFromUrl();
    loadPopups();
  })();

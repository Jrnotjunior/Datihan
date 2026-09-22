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

  async function refreshAuthUI() {
    if (!authBtn) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
      const name = user.email || 'Account';
      authBtn.textContent = name.length > 18 ? name.slice(0, 18) + '…' : name;
      authBtn.classList.add('signed-in');
      authBtn.onclick = async () => {
        await supabaseClient.auth.signOut();
        location.href = 'index.html';
      };

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

  window.datihanAuth = { supabaseClient, refreshAuthUI };
  refreshAuthUI();
})();

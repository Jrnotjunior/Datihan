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

  // Buyer-only controls must not be available to a Shop Owner.
  // Keep the buyer controls unchanged for normal buyer accounts.
  function setShopOwnerBuyerControls(isShopOwner) {
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
      cartBtn.style.display = isShopOwner ? 'none' : '';
    }

    // My Orders may be rendered by the page markup or another account module,
    // so remove/hide it by its visible label as well as common order links.
    document.querySelectorAll('button, a').forEach((el) => {
      const label = (el.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const href = (el.getAttribute('href') || '').toLowerCase();
      const isMyOrders = label === 'my orders' || href.includes('my-orders') || href.includes('orders.html');

      if (isMyOrders) {
        el.style.display = isShopOwner ? 'none' : '';
      }
    });
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

      if (roleNavBtn) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'shop_owner') {
          roleNavBtn.textContent = 'Shop owner';
          roleNavBtn.style.display = 'inline-flex';
          roleNavBtn.onclick = () => location.href = 'shop-owner.html';
          setShopOwnerBuyerControls(true);
        } else {
          roleNavBtn.textContent = '';
          roleNavBtn.style.display = 'none';
          setShopOwnerBuyerControls(false);
        }
      } else {
        setShopOwnerBuyerControls(false);
      }
    } else {
      authBtn.textContent = 'Login';
      authBtn.classList.remove('signed-in');
      authBtn.onclick = () => {
        location.href = 'login.html';
      };

      if (roleNavBtn) {
        roleNavBtn.textContent = '';
        roleNavBtn.style.display = 'none';
      }
      setShopOwnerBuyerControls(false);
    }
  }

  window.datihanAuth = {
    supabaseClient,
    refreshAuthUI
  };

  refreshAuthUI();
})();

// Datihan Products / Shop module
// Phase 3A: extracted from the working Phase 2 main.js without changing behavior.

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


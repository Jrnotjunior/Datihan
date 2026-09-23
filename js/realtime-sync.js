/* Datihan Realtime Sync
 * Keeps buyer, shop-owner, and admin screens synchronized with Supabase.
 * UI-specific rendering remains in each page; this bridge only emits a
 * normalized browser event and asks refresh-capable pages to update.
 */

// Prevent the legacy main.js email text from flashing in the header while the
// session/account module is loading. auth.js reveals the control once it has
// rendered either the hamburger menu or the guest Login state.
(function(){
  const authBtn=document.getElementById('authBtn');
  if(authBtn) authBtn.style.visibility='hidden';
})();

(function(){
  const URL = 'https://kymtqzyatofclfaeegfw.supabase.co';
  const KEY = 'sb_publishable_2gwFi5f702YC_-py8PGxPw_z6iW67MN';
  if(!window.supabase || !window.supabase.createClient) return;
  const client = window.supabase.createClient(URL, KEY);
  let timer = null;
  const pending = new Set();
  function notify(table, event){
    pending.add(table); clearTimeout(timer);
    timer = setTimeout(() => {
      const tables = Array.from(pending); pending.clear();
      tables.forEach(name => window.dispatchEvent(new CustomEvent('datihan:realtime',{detail:{table:name,event:event||'change'}})));
    },100);
  }
  ['inventory','cart_items','popups','orders'].forEach(table => {
    client.channel('datihan-realtime-'+table).on('postgres_changes',{event:'*',schema:'public',table},payload=>notify(table,payload.eventType)).subscribe();
  });
  window.addEventListener('datihan:realtime',event=>{
    const table=event.detail&&event.detail.table;
    const refresh=document.getElementById('refreshBtn');
    if(refresh&&!refresh.disabled&&(table==='inventory'||table==='popups'||table==='orders')) refresh.click();
  });
})();

(function(){
  function overlay(){return document.getElementById('overlayBg');}
  window.openDrawer=function(drawer){
    if(!drawer)return;
    document.querySelectorAll('.drawer.open').forEach(d=>{if(d!==drawer)d.classList.remove('open');});
    overlay()?.classList.add('open'); drawer.classList.add('open');
  };
  window.closeDrawer=function(drawer){
    if(!drawer)return;
    drawer.classList.remove('open');
    if(!document.querySelector('.drawer.open'))overlay()?.classList.remove('open');
  };
  function initDrawer(){
    const cartDrawer=document.getElementById('cartDrawer'),checkoutDrawer=document.getElementById('checkoutDrawer');
    const closeCart=document.getElementById('closeCart'),closeCheckout=document.getElementById('closeCheckout'),bg=overlay();
    closeCart?.addEventListener('click',()=>window.closeDrawer(cartDrawer));
    closeCheckout?.addEventListener('click',()=>window.closeDrawer(checkoutDrawer));
    bg?.addEventListener('click',()=>{window.closeDrawer(cartDrawer);window.closeDrawer(checkoutDrawer);});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){window.closeDrawer(cartDrawer);window.closeDrawer(checkoutDrawer);}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initDrawer,{once:true});else initDrawer();
})();

(function(){
  async function initPhase9Navigation(){
    const path=(location.pathname||'').toLowerCase();
    if(path.endsWith('/shop-owner.html')||path.endsWith('shop-owner.html')){
      const nav=document.querySelector('.admin-nav');
      if(nav&&!nav.querySelector('[data-datihan-order-link]')){
        const a=document.createElement('a'); a.href='shop-orders.html'; a.textContent='Orders'; a.dataset.datihanOrderLink='true';
        a.style.cssText='text-decoration:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;font-weight:700;padding:9px 13px;border:1px solid #333;background:#f8f8f5;color:#171717';
        nav.appendChild(a);
      }
      return;
    }
    if(!(path.endsWith('/index.html')||path==='/'||path.endsWith('/'))) return;
    const cartCount=document.getElementById('cartCount'),cartButton=cartCount?.closest('button');
    if(!cartButton) return;
    const {data:{user}}=await client.auth.getUser();
    let role='guest';
    if(user){
      const {data:profile}=await client.from('profiles').select('role').eq('id',user.id).maybeSingle();
      role=profile?.role || 'buyer';
    }
    const existing=document.querySelector('[data-datihan-order-link]');
    if(existing) existing.remove();
    if(role !== 'buyer') return;
    const a=document.createElement('a'); a.href='orders.html'; a.textContent='My Orders'; a.dataset.datihanOrderLink='true';
    a.style.cssText='text-decoration:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;font-weight:700;padding:9px 13px;border:1px solid #333;background:#f8f8f5;color:#171717';
    cartButton.parentElement.appendChild(a);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPhase9Navigation,{once:true});else initPhase9Navigation();
})();

(function(){
  function loadGallery(){
    if(document.getElementById('datihanGalleryScript'))return;
    const path=(location.pathname||'').toLowerCase();
    if(!(path.endsWith('/index.html')||path==='/'||path.endsWith('/')))return;
    const script=document.createElement('script');script.id='datihanGalleryScript';script.src='js/gallery.js';script.defer=true;document.head.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadGallery,{once:true});else loadGallery();
})();

// ---------------- PHASE 10 PHOTO VALIDATION FEEDBACK ----------------
(function(){
  function initPhotoValidation(){
    const path=(location.pathname||'').toLowerCase();
    if(!(path.endsWith('/shop-owner.html')||path.endsWith('shop-owner.html')))return;
    const input=document.getElementById('imageFiles');
    if(!input||input.dataset.validationReady)return;
    input.dataset.validationReady='true';
    input.addEventListener('change',function(){
      const existingEl=document.getElementById('imagePreview');
      if(!existingEl)return;
      let existing=[]; try{existing=JSON.parse(existingEl.dataset.existing||'[]');}catch(e){}
      const selected=Array.from(input.files||[]);
      const currentNew=Number(input.dataset.currentNew||0);
      if(existing.length+currentNew+selected.length>8){
        input.value=''; input.dataset.currentNew=String(currentNew);
        const help=input.parentElement?.querySelector('.image-help');
        if(help){help.textContent='⚠ Maximum 8 photos allowed. Remove a photo before adding another.';help.style.color='#b42318';help.style.fontWeight='700';}
        window.setTimeout(()=>{if(help){help.textContent='When editing, click Remove under any photo. Keep at least 1 photo.';help.style.color='';help.style.fontWeight='';}},5000);
      }
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPhotoValidation,{once:true});else initPhotoValidation();
})();

// ---------------- PHASE 10 MISSING PHOTO MESSAGE ----------------
(function(){
  function init(){
    const form=document.getElementById('itemForm');
    const preview=document.getElementById('imagePreview');
    const input=document.getElementById('imageFiles');
    if(!form||!preview||!input)return;
    function getBox(){
      let box=document.getElementById('photoValidationMessage');
      if(!box){
        box=document.createElement('div'); box.id='photoValidationMessage';
        box.style.cssText='display:none;margin-top:8px;padding:10px 12px;border:1px solid #e0b5b0;background:#fff7f6;color:#9b241a;font-size:12px;font-weight:700;line-height:1.4;';
        preview.parentNode.insertBefore(box,preview);
      }
      return box;
    }
    function show(msg){const box=getBox();box.textContent='⚠️ '+msg;box.style.display='block';}
    function clear(){const box=document.getElementById('photoValidationMessage');if(box)box.style.display='none';}
    form.addEventListener('submit',function(e){
      let existing=[]; try{existing=JSON.parse(preview.dataset.existing||'[]');}catch(err){}
      const total=existing.length + Number(input.dataset.currentNew||0) + Array.from(input.files||[]).length;
      if(total<1){e.preventDefault();e.stopImmediatePropagation();show('At least 1 photo is required. Please add a photo before saving.');return;}
      if(total>8){e.preventDefault();e.stopImmediatePropagation();show('Maximum 8 photos allowed. Remove a photo before saving.');return;}
      clear();
    },true);
    preview.addEventListener('click',()=>setTimeout(()=>{let existing=[];try{existing=JSON.parse(preview.dataset.existing||'[]')}catch(e){} if(existing.length>0||input.files?.length)clear();},0));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

// ---------------- SHOP OWNER STORE VIEW ----------------
// Shop Owners can browse the catalog, but cannot shop from it.
(function(){
  const URL='https://kymtqzyatofclfaeegfw.supabase.co';
  const KEY='sb_publishable_2gwFi5f702YC_-py8PGxPw_z6iW67MN';
  if(!window.supabase || !window.supabase.createClient) return;
  const client=window.supabase.createClient(URL,KEY);

  function escapeHtml(value){return String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function peso(value){return '₱'+Number(value||0).toLocaleString('en-PH');}
  function icon(category){
    const paths={
      shoes:'<path d="M6 34h34c3 0 6-2 6-6-4 0-7-1-10-4l-8-8-6 2-8-2-8 4v14z"/>',
      pants:'<path d="M14 6h20l2 10-3 26h-7l-2-20-2 20h-7L12 16z"/>',
      shirts:'<path d="M17 8l7 5 7-5 6 6-5 5v20H16V19l-5-5z"/>'
    };
    return '<svg class="icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6">'+(paths[category]||paths.shirts)+'</svg>';
  }
  async function owner(){
    const {data:{user}}=await client.auth.getUser();
    if(!user)return false;
    const {data:profile}=await client.from('profiles').select('role').eq('id',user.id).maybeSingle();
    return profile?.role==='shop_owner';
  }
  function disableShopping(){
    const cart=document.getElementById('cartBtn');
    if(cart){cart.style.display='none';cart.setAttribute('aria-hidden','true');}
    document.querySelectorAll('[data-add],.add-btn,[data-datihan-order-link]').forEach(el=>el.remove());
  }
  async function renderOwnerCatalog(){
    if(!(await owner()))return;
    disableShopping();
    const grid=document.getElementById('shopGrid');
    const noResults=document.getElementById('noResults');
    if(!grid)return;
    const {data,error}=await client.from('inventory').select('*').neq('status','sold').order('created_at',{ascending:false});
    if(error){console.error('Shop owner catalog could not load:',error);return;}
    function draw(){
      const q=(document.getElementById('shopSearch')?.value||'').trim().toLowerCase();
      const active=document.querySelector('.fchip[aria-pressed="true"]')?.dataset.filter||'all';
      const rows=(data||[]).filter(item=>{
        const cat=String(item.category||'other').toLowerCase();
        const name=String(item.name||'').toLowerCase();
        return (active==='all'||cat===active)&&(!q||name.includes(q)||cat.includes(q));
      });
      grid.innerHTML=rows.map(item=>{
        const id=escapeHtml(item.id),name=escapeHtml(item.name||'Untitled item');
        const cat=String(item.category||'other').toLowerCase(),image=String(item.image_url||'');
        const media=image?'<img class="photo" src="'+escapeHtml(image)+'" alt="'+name+'">':icon(cat);
        const badge=String(item.status||'').toLowerCase()==='available'?'<span class="badge">AVAILABLE</span>':'';
        const code=escapeHtml(item.item_code||String(item.id).slice(0,8).toUpperCase());
        return '<div class="item-card" data-id="'+id+'">'+badge+media+'<h3>'+name+'</h3><div class="meta">'+escapeHtml(item.size||'One size')+' · '+escapeHtml(item.condition||'Good condition')+' · '+escapeHtml(cat)+'</div><div class="price"><span class="tag-font">#'+code+'</span><span class="amt">'+peso(item.price)+'</span></div></div>';
      }).join('');
      if(noResults)noResults.style.display=rows.length?'none':'block';
      disableShopping();
    }
    draw();
    document.getElementById('shopSearch')?.addEventListener('input',draw);
    document.querySelectorAll('.fchip').forEach(chip=>chip.addEventListener('click',()=>setTimeout(draw,0)));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderOwnerCatalog,{once:true});else renderOwnerCatalog();
})();

// ---------------- ACCOUNT MENU LOADER ----------------
// index.html already loads realtime-sync.js, but did not load auth.js.
// Load the existing account-menu module here so signed-in users get the
// hamburger account button and Sign out menu without changing page routing.
(function(){
  function loadAccountMenu(){
    if(document.getElementById('datihanAuthScript')) return;
    if(!document.getElementById('authBtn')) return;
    const script=document.createElement('script');
    script.id='datihanAuthScript';
    script.src='js/auth.js?v=20260923';
    script.async=false;
    document.head.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadAccountMenu,{once:true});else loadAccountMenu();
})();

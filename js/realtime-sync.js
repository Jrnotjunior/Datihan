/* Datihan Realtime Sync
 * Keeps buyer, shop-owner, and admin screens synchronized with Supabase.
 * UI-specific rendering remains in each page; this bridge only emits a
 * normalized browser event and asks refresh-capable pages to update.
 */
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
  function addLink(parent,text,href,className){
    if(!parent||document.querySelector('[data-datihan-order-link]'))return;
    const a=document.createElement('a'); a.href=href;a.textContent=text;a.dataset.datihanOrderLink='true';a.className=className||'';
    Object.assign(a.style,{textDecoration:'none',display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',padding:'9px 13px',border:'1px solid #333',background:'#f8f8f5',color:'#171717'});
    parent.appendChild(a);
  }
  function initPhase9Navigation(){
    const path=(location.pathname||'').toLowerCase();
    if(path.endsWith('/shop-owner.html')||path.endsWith('shop-owner.html')){
      const nav=document.querySelector('.admin-nav'); if(nav&&!nav.querySelector('[data-datihan-order-link]'))addLink(nav,'Orders','shop-orders.html'); return;
    }
    if(path.endsWith('/index.html')||path==='/'||path.endsWith('/')){
      const cartCount=document.getElementById('cartCount'),cartButton=cartCount?.closest('button');
      if(cartButton&&!document.querySelector('[data-datihan-order-link]'))addLink(cartButton.parentElement,'My Orders','orders.html');
    }
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
        input.value='';
        input.dataset.currentNew=String(currentNew);
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
      if(total<1){
        e.preventDefault(); e.stopImmediatePropagation();
        show('At least 1 photo is required. Please add a photo before saving.');
        return;
      }
      if(total>8){
        e.preventDefault(); e.stopImmediatePropagation();
        show('Maximum 8 photos allowed. Remove a photo before saving.');
        return;
      }
      clear();
    },true);
    preview.addEventListener('click',()=>setTimeout(()=>{let existing=[];try{existing=JSON.parse(preview.dataset.existing||'[]')}catch(e){} if(existing.length>0||input.files?.length)clear();},0));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

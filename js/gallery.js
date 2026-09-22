/* Datihan Buyer Photo Gallery / Lightbox
 * Opens the full set of inventory photos when a buyer clicks an item photo.
 * Supports 1–8 photos, previous/next controls, swipe gestures, keyboard
 * navigation, a photo counter, and Escape/outside-click close.
 */
(function(){
  const URL = 'https://kymtqzyatofclfaeegfw.supabase.co';
  const KEY = 'sb_publishable_2gwFi5f702YC_-py8PGxPw_z6iW67MN';
  let client = null;
  let modal = null;
  let imageEl = null;
  let counterEl = null;
  let captionEl = null;
  let prevBtn = null;
  let nextBtn = null;
  let photos = [];
  let index = 0;
  let touchStartX = 0;
  let loading = false;

  function ensureClient(){
    if(client) return client;
    if(!window.supabase || !window.supabase.createClient) return null;
    client = window.supabase.createClient(URL, KEY);
    return client;
  }

  function injectStyles(){
    if(document.getElementById('datihanGalleryStyles')) return;
    const style = document.createElement('style');
    style.id = 'datihanGalleryStyles';
    style.textContent = `
      .datihan-gallery-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.86);display:none;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
      .datihan-gallery-backdrop.open{display:flex}
      .datihan-gallery-dialog{position:relative;width:min(100%,1100px);height:min(92vh,850px);display:flex;align-items:center;justify-content:center;outline:none}
      .datihan-gallery-image-wrap{position:relative;max-width:calc(100% - 120px);max-height:100%;display:flex;align-items:center;justify-content:center}
      .datihan-gallery-image{display:block;max-width:100%;max-height:78vh;width:auto;height:auto;object-fit:contain;border-radius:4px;box-shadow:0 12px 45px rgba(0,0,0,.4);user-select:none;-webkit-user-drag:none}
      .datihan-gallery-close{position:absolute;top:0;right:0;width:46px;height:46px;border:1px solid rgba(255,255,255,.45);border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:30px;line-height:1;cursor:pointer;z-index:3}
      .datihan-gallery-nav{position:absolute;top:50%;transform:translateY(-50%);width:52px;height:52px;border:1px solid rgba(255,255,255,.45);border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:34px;line-height:1;cursor:pointer;z-index:3}
      .datihan-gallery-prev{left:4px}.datihan-gallery-next{right:4px}
      .datihan-gallery-nav[hidden]{display:none}
      .datihan-gallery-counter{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);background:rgba(0,0,0,.62);color:#fff;padding:7px 13px;border-radius:999px;font:600 14px/1.2 system-ui,sans-serif;z-index:3}
      .datihan-gallery-caption{position:absolute;left:50%;bottom:-2px;transform:translate(-50%,100%);color:#fff;text-align:center;font:600 14px/1.3 system-ui,sans-serif;max-width:80%;text-shadow:0 1px 3px #000}
      .datihan-gallery-loading{color:#fff;font:600 16px/1.4 system-ui,sans-serif}
      @media(max-width:700px){
        .datihan-gallery-backdrop{padding:12px}
        .datihan-gallery-dialog{height:90vh}
        .datihan-gallery-image-wrap{max-width:calc(100% - 74px)}
        .datihan-gallery-image{max-height:72vh}
        .datihan-gallery-nav{width:42px;height:42px;font-size:28px}
        .datihan-gallery-prev{left:0}.datihan-gallery-next{right:0}
        .datihan-gallery-close{top:4px;right:4px;width:42px;height:42px}
      }
    `;
    document.head.appendChild(style);
  }

  function createModal(){
    if(modal) return;
    injectStyles();
    modal = document.createElement('div');
    modal.className = 'datihan-gallery-backdrop';
    modal.id = 'datihanGallery';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML = `
      <section class="datihan-gallery-dialog" role="dialog" aria-modal="true" aria-label="Item photos" tabindex="-1">
        <button class="datihan-gallery-close" type="button" aria-label="Close photos">&times;</button>
        <button class="datihan-gallery-nav datihan-gallery-prev" type="button" aria-label="Previous photo">&#8249;</button>
        <div class="datihan-gallery-image-wrap">
          <div class="datihan-gallery-loading">Loading photos...</div>
          <img class="datihan-gallery-image" alt="" hidden>
        </div>
        <button class="datihan-gallery-nav datihan-gallery-next" type="button" aria-label="Next photo">&#8250;</button>
        <div class="datihan-gallery-counter" aria-live="polite"></div>
        <div class="datihan-gallery-caption"></div>
      </section>`;
    document.body.appendChild(modal);

    imageEl = modal.querySelector('.datihan-gallery-image');
    counterEl = modal.querySelector('.datihan-gallery-counter');
    captionEl = modal.querySelector('.datihan-gallery-caption');
    prevBtn = modal.querySelector('.datihan-gallery-prev');
    nextBtn = modal.querySelector('.datihan-gallery-next');

    modal.querySelector('.datihan-gallery-close').addEventListener('click', close);
    prevBtn.addEventListener('click', previous);
    nextBtn.addEventListener('click', next);
    modal.addEventListener('click', e => { if(e.target === modal) close(); });
    imageEl.addEventListener('click', e => e.stopPropagation());
    modal.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0]?.clientX || 0; }, {passive:true});
    modal.addEventListener('touchend', e => {
      const endX = e.changedTouches[0]?.clientX || 0;
      const dx = endX - touchStartX;
      if(Math.abs(dx) >= 45){ if(dx < 0) next(); else previous(); }
    }, {passive:true});
  }

  function update(){
    if(!modal || !photos.length) return;
    const item = photos[index];
    imageEl.hidden = false;
    imageEl.src = item.url;
    imageEl.alt = item.alt || 'Item photo';
    counterEl.textContent = `${index + 1} / ${photos.length}`;
    captionEl.textContent = item.name || '';
    const showNav = photos.length > 1;
    prevBtn.hidden = !showNav;
    nextBtn.hidden = !showNav;
    prevBtn.disabled = false;
    nextBtn.disabled = false;
    const loadingEl = modal.querySelector('.datihan-gallery-loading');
    if(loadingEl) loadingEl.hidden = true;
  }

  function previous(){
    if(!photos.length) return;
    index = (index - 1 + photos.length) % photos.length;
    update();
  }

  function next(){
    if(!photos.length) return;
    index = (index + 1) % photos.length;
    update();
  }

  function openLoading(name){
    createModal();
    photos = [];
    index = 0;
    loading = true;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    imageEl.hidden = true;
    counterEl.textContent = '';
    captionEl.textContent = name || '';
    const loadingEl = modal.querySelector('.datihan-gallery-loading');
    if(loadingEl) loadingEl.hidden = false;
    modal.querySelector('.datihan-gallery-dialog').focus();
    document.body.style.overflow = 'hidden';
  }

  function close(){
    if(!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    imageEl.removeAttribute('src');
    photos = [];
    loading = false;
    document.body.style.overflow = '';
  }

  async function loadPhotos(productId, fallbackUrl, name){
    openLoading(name);
    const sb = ensureClient();
    let urls = [];
    if(sb){
      try{
        const {data,error} = await sb.from('inventory').select('image_urls,image_url,name').eq('id',productId).maybeSingle();
        if(!error && data){
          if(Array.isArray(data.image_urls)) urls = data.image_urls.filter(Boolean);
          else if(typeof data.image_urls === 'string'){
            try{ const parsed = JSON.parse(data.image_urls); if(Array.isArray(parsed)) urls = parsed.filter(Boolean); }catch(e){}
          }
          if(!urls.length && data.image_url) urls = [data.image_url];
          name = data.name || name;
        }
      }catch(e){ console.error('Could not load item photos:',e); }
    }
    if(!urls.length && fallbackUrl) urls = [fallbackUrl];
    photos = urls.slice(0,8).map(url => ({url,name,alt:name ? `${name} photo` : 'Item photo'}));
    loading = false;
    if(!photos.length){ close(); return; }
    index = 0;
    update();
  }

  function handleClick(event){
    const img = event.target.closest('.item-card .photo');
    if(!img) return;
    const card = img.closest('.item-card');
    const id = card?.dataset.id;
    if(!id) return;
    event.preventDefault();
    event.stopPropagation();
    loadPhotos(id, img.currentSrc || img.src, img.alt || 'Item photos');
  }

  function handleKeydown(event){
    if(!modal || !modal.classList.contains('open')) return;
    if(event.key === 'Escape'){ event.preventDefault(); close(); }
    else if(event.key === 'ArrowLeft'){ event.preventDefault(); previous(); }
    else if(event.key === 'ArrowRight'){ event.preventDefault(); next(); }
  }

  function init(){
    createModal();
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeydown);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();

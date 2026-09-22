/* Datihan Phase 10 - Inventory photo validation feedback */
(function(){
  function init(){
    const form=document.getElementById('itemForm');
    const preview=document.getElementById('imagePreview');
    const fileInput=document.getElementById('imageFiles');
    if(!form||!preview||!fileInput) return;

    function box(){
      let el=document.getElementById('photoValidationMessage');
      if(!el){
        el=document.createElement('div');
        el.id='photoValidationMessage';
        el.style.cssText='display:none;margin-top:8px;padding:10px 12px;border:1px solid #e0b5b0;background:#fff7f6;color:#9b241a;font-size:12px;font-weight:700;line-height:1.4;';
        preview.parentNode.insertBefore(el,preview);
      }
      return el;
    }
    function show(text){const el=box();el.textContent='⚠️ '+text;el.style.display='block';}
    function clear(){const el=document.getElementById('photoValidationMessage');if(el)el.style.display='none';}
    function count(){
      let existing=[];
      try{existing=JSON.parse(preview.dataset.existing||'[]')}catch(e){}
      const newFiles=Array.isArray(window.selectedNewFiles)?window.selectedNewFiles.length:0;
      return existing.length+newFiles;
    }

    form.addEventListener('submit',function(e){
      const total=count();
      if(total<1){
        e.preventDefault();
        e.stopImmediatePropagation();
        show('At least 1 photo is required. Please add a photo before saving.');
        return;
      }
      if(total>8){
        e.preventDefault();
        e.stopImmediatePropagation();
        show('Maximum 8 photos allowed. Remove a photo before saving.');
        return;
      }
      clear();
    },true);

    preview.addEventListener('click',function(){
      setTimeout(()=>{if(count()>=1) clear();},0);
    });
    fileInput.addEventListener('change',function(){
      setTimeout(()=>{if(count()>=1) clear();},0);
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();

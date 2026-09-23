/* Datihan global page loader
 * Keeps the first paint coordinated so pages do not reveal buttons, icons,
 * fonts, and images one-by-one while the browser is still loading.
 */
(function(){
  'use strict';

  const root=document.documentElement;
  if(root.dataset.datihanLoaderReady==='true') return;
  root.dataset.datihanLoaderReady='true';
  root.classList.add('datihan-loading');

  const style=document.createElement('style');
  style.id='datihan-page-loader-style';
  style.textContent=`
    html.datihan-loading body{opacity:0!important;visibility:hidden!important}
    #datihan-page-loader{
      position:fixed;inset:0;z-index:2147483647;
      display:grid;place-items:center;
      background:#f1f0ec;color:#171717;
      font-family:"Courier New",monospace;
      opacity:1;visibility:visible;
      transition:opacity .22s ease,visibility .22s ease;
    }
    #datihan-page-loader.is-done{opacity:0;visibility:hidden;pointer-events:none}
    #datihan-page-loader .loader-box{text-align:center}
    #datihan-page-loader .loader-brand{
      font-family:Impact,"Arial Narrow",Arial,sans-serif;
      font-size:42px;line-height:1;letter-spacing:1px
    }
    #datihan-page-loader .loader-text{
      margin-top:10px;font-size:11px;letter-spacing:2px;color:#666
    }
    #datihan-page-loader .loader-line{
      width:150px;height:2px;margin:18px auto 0;background:#d2d1cc;overflow:hidden
    }
    #datihan-page-loader .loader-line::after{
      content:"";display:block;width:45%;height:100%;background:#171717;
      animation:datihanLoaderMove 1s ease-in-out infinite
    }
    @keyframes datihanLoaderMove{
      0%{transform:translateX(-110%)}
      100%{transform:translateX(330%)}
    }
    @media(prefers-reduced-motion:reduce){
      #datihan-page-loader{transition:none}
      #datihan-page-loader .loader-line::after{animation:none;transform:translateX(120%)}
    }
  `;
  (document.head||document.documentElement).appendChild(style);

  const loader=document.createElement('div');
  loader.id='datihan-page-loader';
  loader.setAttribute('aria-label','Loading Datihan');
  loader.innerHTML='<div class="loader-box"><div class="loader-brand">DATIHAN</div><div class="loader-text">LOADING</div><div class="loader-line"></div></div>';
  document.documentElement.appendChild(loader);

  let finished=false;
  function finish(){
    if(finished) return;
    finished=true;
    root.classList.remove('datihan-loading');
    loader.classList.add('is-done');
    window.setTimeout(()=>loader.remove(),260);
  }

  function afterResources(){
    const fonts=document.fonts?.ready;
    if(fonts&&typeof fonts.then==='function'){
      fonts.catch(()=>{}).then(()=>window.setTimeout(finish,180));
    }else{
      window.setTimeout(finish,220);
    }
  }

  window.addEventListener('load',afterResources,{once:true});
  window.setTimeout(finish,10000);
})();
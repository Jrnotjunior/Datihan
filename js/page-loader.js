/* Datihan global page loader + typography bootstrap */
(function(){
  'use strict';

  /* Load the two-font Datihan typography system before the page is revealed. */
  (function loadTypography(){
    if(document.querySelector('link[data-datihan-typography]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@600;700&family=Inter:wght@400;500;600;700&display=swap';
    link.dataset.datihanTypography='true';
    document.head.appendChild(link);

    const style=document.createElement('style');
    style.id='datihan-typography-overrides';
    style.textContent=`
      :root{
        --datihan-display-font:'Bodoni Moda',Georgia,serif;
        --datihan-body-font:'Inter',Arial,sans-serif;
      }
      html,body,
      body *{font-family:var(--datihan-body-font)!important}
      h1,h2,h3,h4,h5,h6,
      .display,.loader-brand,.brand,
      .top h1,.box h1,
      .order-id,.section-head h2,
      .teaser-card h3,.split-panel .big,
      .plate-logo svg text,.plate-hero svg text:first-of-type,
      svg text{font-family:var(--datihan-display-font)!important}
      button,input,textarea,select{font-family:var(--datihan-body-font)!important}
      .loader-brand{font-weight:700!important}
    `;
    (document.head||document.documentElement).appendChild(style);
  })();

  // Load the shared performance helper from this already-included boot file.
  (function loadPerformanceHelper(){
    if(document.querySelector('script[data-datihan-performance]')) return;
    const script=document.createElement('script');
    script.src='js/performance.js';
    script.defer=true;
    script.dataset.datihanPerformance='true';
    document.head.appendChild(script);
  })();

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
      font-family:'Inter',Arial,sans-serif;
      opacity:1;visibility:visible;
      transition:opacity .18s ease,visibility .18s ease;
    }
    #datihan-page-loader.is-done{opacity:0;visibility:hidden;pointer-events:none}
    #datihan-page-loader .loader-box{text-align:center}
    #datihan-page-loader .loader-brand{
      font-family:'Bodoni Moda',Georgia,serif!important;
      font-weight:700;font-size:42px;line-height:1;letter-spacing:1px
    }
    #datihan-page-loader .loader-text{
      margin-top:10px;font-size:11px;letter-spacing:2px;color:#666
    }
    #datihan-page-loader .loader-line{
      width:150px;height:2px;margin:18px auto 0;background:#d2d1cc;overflow:hidden
    }
    #datihan-page-loader .loader-line::after{
      content:"";display:block;width:45%;height:100%;background:#171717;
      animation:datihanLoaderMove .9s ease-in-out infinite
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
  function finish(reason){
    if(finished) return;
    finished=true;
    root.classList.remove('datihan-loading');
    loader.classList.add('is-done');
    window.setTimeout(()=>loader.remove(),220);
    if(reason) console.info('Datihan page ready:',reason);
  }

  function releaseAfterDom(){
    window.requestAnimationFrame(()=>window.setTimeout(()=>finish('critical DOM ready'),80));
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',releaseAfterDom,{once:true});
  }else{
    releaseAfterDom();
  }

  window.setTimeout(()=>finish('safety timeout'),3500);
})();
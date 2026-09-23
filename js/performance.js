/* Datihan frontend performance helpers.
 * This file is intentionally dependency-free so it can be loaded on every page.
 * It improves image decoding/lazy loading and adds connection hints without
 * changing Supabase data or checkout behavior.
 */
(function(){
  'use strict';

  // Tell the browser about origins we use frequently.
  const origins = [
    'https://kymtqzyatofclfaeegfw.supabase.co',
    'https://cdn.jsdelivr.net',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ];
  origins.forEach(function(href){
    if(document.head.querySelector('link[rel="preconnect"][href="'+href+'"]')) return;
    const link=document.createElement('link');
    link.rel='preconnect';
    link.href=href;
    if(href.includes('gstatic')) link.crossOrigin='anonymous';
    document.head.appendChild(link);
  });

  function optimizeImage(img){
    if(!(img instanceof HTMLImageElement)) return;
    if(!img.hasAttribute('decoding')) img.decoding='async';
    if(!img.hasAttribute('loading')) img.loading='lazy';
    if(!img.hasAttribute('fetchpriority')) img.fetchPriority='low';
  }

  // Images already in the HTML.
  document.querySelectorAll('img').forEach(optimizeImage);

  // Product/catalog images are commonly created dynamically by main.js.
  // Applying these attributes as soon as nodes are inserted reduces the
  // amount of work competing with the initial UI.
  const observer=new MutationObserver(function(records){
    for(const record of records){
      record.addedNodes.forEach(function(node){
        if(node.nodeType!==1) return;
        if(node.tagName==='IMG') optimizeImage(node);
        if(node.querySelectorAll) node.querySelectorAll('img').forEach(optimizeImage);
      });
    }
  });
  if(document.body) observer.observe(document.body,{childList:true,subtree:true});

  // Do not keep this observer alive forever on pages that do not create much
  // dynamic content. It is only needed during the first few seconds.
  window.setTimeout(function(){ observer.disconnect(); },15000);
})();

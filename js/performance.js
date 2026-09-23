/* Datihan frontend performance helpers.
 * Dependency-free. Safe to load on every page.
 * This improves connection setup and image loading without changing
 * Supabase data, authentication, cart, checkout, or order behavior.
 */
(function(){
  'use strict';

  // Establish connections early for resources used frequently by Datihan.
  const origins=[
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

  function optimizeImage(img,index){
    if(!(img instanceof HTMLImageElement)) return;

    if(!img.hasAttribute('decoding')) img.decoding='async';

    // Keep the first few visible images fast. Images farther down the page
    // should not compete with the initial UI/network requests.
    const critical=index<4;
    if(!img.hasAttribute('loading')) img.loading=critical?'eager':'lazy';
    if(!img.hasAttribute('fetchpriority')) img.fetchPriority=critical?'high':'low';
  }

  function optimizeAll(){
    const images=Array.from(document.images);
    images.forEach((img,index)=>optimizeImage(img,index));
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',optimizeAll,{once:true});
  }else{
    optimizeAll();
  }

  // Product/catalog images are often inserted by main.js after the first
  // render. Give the first few visible images priority and lazy-load the rest.
  const observer=new MutationObserver(function(records){
    let newImages=[];
    for(const record of records){
      record.addedNodes.forEach(function(node){
        if(node.nodeType!==1) return;
        if(node.tagName==='IMG') newImages.push(node);
        if(node.querySelectorAll) node.querySelectorAll('img').forEach(img=>newImages.push(img));
      });
    }
    newImages.forEach((img,index)=>optimizeImage(img,index));
  });

  if(document.body) observer.observe(document.body,{childList:true,subtree:true});

  // Dynamic product rendering is most active shortly after startup. Stop
  // observing after that period so the performance helper itself stays light.
  window.setTimeout(()=>observer.disconnect(),12000);
})();
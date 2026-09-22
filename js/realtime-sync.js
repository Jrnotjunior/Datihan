/* Datihan Realtime Sync
 * Keeps buyer, shop-owner, and admin screens synchronized with Supabase.
 * UI-specific rendering remains in each page; this bridge only emits a
 * normalized browser event and asks refresh-capable pages to update.
 * Installed through the repository workflow so existing page code stays protected.
 */
(function(){
  const URL = 'https://kymtqzyatofclfaeegfw.supabase.co';
  const KEY = 'sb_publishable_2gwFi5f702YC_-py8PGxPw_z6iW67MN';
  if(!window.supabase || !window.supabase.createClient) return;

  const client = window.supabase.createClient(URL, KEY);
  let timer = null;
  const pending = new Set();

  function notify(table, event){
    pending.add(table);
    clearTimeout(timer);
    timer = setTimeout(() => {
      const tables = Array.from(pending);
      pending.clear();
      tables.forEach(name => {
        window.dispatchEvent(new CustomEvent('datihan:realtime', {
          detail: { table:name, event:event || 'change' }
        }));
      });
    }, 100);
  }

  ['inventory','cart_items','popups','orders'].forEach(table => {
    client
      .channel('datihan-realtime-' + table)
      .on('postgres_changes', { event:'*', schema:'public', table }, payload => {
        notify(table, payload.eventType);
      })
      .subscribe();
  });

  // Generic fallback for dashboard pages that expose a Refresh button.
  window.addEventListener('datihan:realtime', event => {
    const table = event.detail && event.detail.table;
    if(!table) return;

    const refresh = document.getElementById('refreshBtn');
    if(refresh && !refresh.disabled && (table === 'inventory' || table === 'popups' || table === 'orders')){
      refresh.click();
    }
  });
})();

/* Phase 7 account-cart module.
 * This module intentionally contains no cart localStorage usage.
 * It is loaded by the site after Supabase is initialized.
 */
(function(){
  const sb = window.datihanSupabase;
  if (!sb) { console.error('Datihan Supabase client is not initialized.'); return; }

  window.DatihanAccountCart = {
    async getUser(){
      const { data, error } = await sb.auth.getUser();
      if (error) throw error;
      return data.user || null;
    },
    async load(){
      const user = await this.getUser();
      if (!user) return [];
      const { data, error } = await sb.from('cart_items')
        .select('product_id, quantity')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    async set(productId, quantity){
      const user = await this.getUser();
      if (!user) return false;
      if (quantity <= 0) {
        const { error } = await sb.from('cart_items').delete()
          .eq('user_id', user.id).eq('product_id', productId);
        if (error) throw error;
        return true;
      }
      const { error } = await sb.from('cart_items').upsert({
        user_id: user.id,
        product_id: Number(productId),
        quantity: Number(quantity)
      }, { onConflict: 'user_id,product_id' });
      if (error) throw error;
      return true;
    },
    async clear(){
      const user = await this.getUser();
      if (!user) return;
      const { error } = await sb.from('cart_items').delete().eq('user_id', user.id);
      if (error) throw error;
    }
  };
})();

// Datihan FAQ module
// Phase 5: FAQ behavior is isolated here.
// Compatibility guard: the current main.js calls openCheckoutAfterLogin()
// during initialization, but that helper is no longer present. Define a
// harmless fallback so the rest of main.js can finish initializing products
// and pop-ups instead of stopping with a ReferenceError.
window.openCheckoutAfterLogin = window.openCheckoutAfterLogin || function(){};

// Shared helper used by main.js when rendering products/pop-ups.
window.escapeHtml = window.escapeHtml || function(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
};

document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const answer = btn.nextElementSibling;
    btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    answer.style.maxHeight = expanded ? '0px' : answer.scrollHeight + 'px';
  });
});

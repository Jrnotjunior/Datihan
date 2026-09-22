// Datihan FAQ module
// Phase 5: FAQ behavior is isolated here.
// Shared helper: main.js uses escapeHtml when rendering products/pop-ups.
// Keep it global so the existing main.js can use it without changing the working page structure.
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

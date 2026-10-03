/* Views module: presentation helpers kept independent from the application coordinator. */
export const safeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const percent = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

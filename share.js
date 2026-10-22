export const WA_LIMIT = 1800; // آمن تقريبًا لروابط wa.me
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch {
    const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select();
    const ok = document.execCommand('copy'); a.remove(); return ok;
  }
}
export function download(name, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: type + ';charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export async function nativeShare(title, text) {
  if (!navigator.share) return 'unsupported';
  try { await navigator.share({ title, text }); return 'ok'; } catch (e) { return e.name === 'AbortError' ? 'cancel' : 'error'; }
}
export function whatsapp(text) {
  if (text.length > WA_LIMIT) return false;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  return true;
}

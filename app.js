import { support, Transcriber } from './transcription.js';
import * as store from './storage.js';
import { copyText, download, nativeShare, whatsapp, WA_LIMIT } from './share.js';

const $ = id => document.getElementById(id);
const TXT = {
  ar: { idle: 'جاهز', listening: 'جارٍ الاستماع…', paused: 'متوقف مؤقتًا', restarting: 'إعادة تشغيل التعرّف…', lang: 'اللغة', saveAudio: 'تسجيل الصوت كملف (اختياري)',
    langHint: 'اختيار العربية لا يضمن فهم اللهجة المصرية بدقة كاملة؛ الدقة تعتمد على محرك التعرّف في متصفحك. التعرّف يحتاج إنترنت غالبًا وقد يُرسل الصوت إلى خدمة المتصفح.',
    sessionName: 'اسم الجلسة', search: 'بحث في النص…', speaker: 'المتحدث', rename: 'تسمية المتحدثين', unsureHint: 'الكلمات ذات الخلفية الصفراء غير مؤكدة — راجعها.',
    copyAll: 'نسخ الكل', copySel: 'نسخ المحدد', selAll: 'تحديد الكل', dlAudio: 'تنزيل الصوت', share: 'مشاركة', new: 'جديد', sessions: 'الجلسات', clear: 'حذف النص', privacy: 'الخصوصية', close: 'إغلاق',
    restoreMsg: 'وُجدت جلسة غير محفوظة.', restore: 'استعادة', discard: 'تجاهل', none: 'بدون تحديد', words: 'كلمة', chars: 'حرف', empty: 'لا توجد جلسات محفوظة.', open: 'فتح', del: 'حذف',
    privacyText: 'الميكروفون يعمل فقط أثناء ظهور الحالة «جارٍ الاستماع» ويمكنك إيقافه فورًا بزر ■. النص يُحفظ على جهازك فقط (IndexedDB). التعرّف على الكلام في المتصفح قد يرسل الصوت إلى خدمة المتصفح (مثل Google في Chrome). الصوت المسجّل لا يُحفظ إلا إذا نزّلته أنت.',
    unsupported: 'التعرّف على الكلام غير مدعوم في هذا المتصفح. جرّب Chrome أو Edge أو Safari حديثًا، أو اربط التطبيق بخدمة تعرّف خارجية عبر API (انظر README).',
    denied: 'تم رفض إذن الميكروفون. فعّله من إعدادات المتصفح ثم أعد المحاولة.', net: 'مشكلة في الاتصال بخدمة التعرّف. النص المكتوب محفوظ، وسنحاول الاستمرار.',
    srStopped: 'توقف التعرّف على الكلام بينما التسجيل الصوتي جارٍ.', offline: 'أنت غير متصل بالإنترنت؛ التعرّف قد لا يعمل.', confirmDel: 'تأكيد الحذف؟ لا يمكن التراجع.', copied: 'تم النسخ', failed: 'تعذّر التنفيذ',
    longWa: 'النص طويل لرابط واتساب. تم نسخه — الصقه في المحادثة.', igNote: 'إنستجرام لا يقبل نصًا طويلًا برابط. تم نسخ النص؛ الصقه في رسالة أو نزّل ملف TXT.', noShare: 'المشاركة الأصلية غير مدعومة؛ تم النسخ بدلًا منها.', sp1: 'المتحدث الأول', sp2: 'المتحدث الثاني', nameSp: 'اسم المتحدث' },
  en: { idle: 'Ready', listening: 'Listening…', paused: 'Paused', restarting: 'Restarting recognition…', lang: 'Language', saveAudio: 'Record audio file (optional)',
    langHint: 'Choosing Arabic does not guarantee accurate Egyptian dialect recognition; accuracy depends on your browser engine. Recognition usually needs internet and audio may be sent to the browser vendor.',
    sessionName: 'Session name', search: 'Search text…', speaker: 'Speaker', rename: 'Name speakers', unsureHint: 'Yellow-highlighted text is uncertain — please review.',
    copyAll: 'Copy all', copySel: 'Copy selected', selAll: 'Select all', dlAudio: 'Download audio', share: 'Share', new: 'New', sessions: 'Sessions', clear: 'Clear text', privacy: 'Privacy', close: 'Close',
    restoreMsg: 'An unsaved session was found.', restore: 'Restore', discard: 'Discard', none: 'Unassigned', words: 'words', chars: 'chars', empty: 'No saved sessions.', open: 'Open', del: 'Delete',
    privacyText: 'The microphone is only active while status shows “Listening”; stop instantly with ■. Text is stored on your device only (IndexedDB). Browser speech recognition may send audio to the vendor (e.g. Google in Chrome). Recorded audio is never kept unless you download it.',
    unsupported: 'Speech recognition is not supported in this browser. Try recent Chrome, Edge or Safari, or connect an external STT API (see README).',
    denied: 'Microphone permission denied. Enable it in browser settings and retry.', net: 'Recognition service connection problem. Your text is kept; retrying.',
    srStopped: 'Speech recognition stopped while audio recording continues.', offline: 'You are offline; recognition may not work.', confirmDel: 'Confirm delete? This cannot be undone.', copied: 'Copied', failed: 'Failed',
    longWa: 'Text is too long for a WhatsApp link. Copied — paste it in the chat.', igNote: 'Instagram cannot take long text via link. Copied; paste into a message or download TXT.', noShare: 'Native share unsupported; copied instead.', sp1: 'Speaker 1', sp2: 'Speaker 2', nameSp: 'Speaker name' }
};
let ui = localStorage.getItem('sout-ui') || 'ar';
let session = newSession(), startAt = 0, pausedAt = 0, pausedTotal = 0, tick = null, audioBlob = null, state = 'idle';
const t = k => TXT[ui][k] || k;

function newSession() {
  const d = new Date();
  return { id: crypto.randomUUID(), name: '', date: d.toISOString(), updated: Date.now(), lang: 'ar-SA', speakers: [TXT[ui].sp1, TXT[ui].sp2], segments: [] };
}
const toast = m => { const e = $('toast'); e.textContent = m; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 2600); };
const fmt = ms => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

/* ---------- واجهة ولغة ---------- */
function applyUI() {
  document.documentElement.lang = ui; document.documentElement.dir = ui === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i]').forEach(e => e.textContent = t(e.dataset.i));
  document.querySelectorAll('[data-ph]').forEach(e => e.placeholder = t(e.dataset.ph));
  $('btnLang').textContent = ui === 'ar' ? 'EN' : 'ع';
  setState(state); fillSpeakers(); render();
}
$('btnLang').onclick = () => { ui = ui === 'ar' ? 'en' : 'ar'; localStorage.setItem('sout-ui', ui); applyUI(); };
$('btnTheme').onclick = () => { const n = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = n; localStorage.setItem('sout-theme', n); };
document.documentElement.dataset.theme = localStorage.getItem('sout-theme') || 'dark';

function notice(msg, ok) { const n = $('notice'); n.textContent = msg; n.classList.toggle('ok', !!ok); n.hidden = !msg; }
function setState(s) {
  state = s;
  $('status').textContent = t(s === 'recording' ? 'listening' : s);
  $('micDot').className = 'led ' + (s === 'recording' ? 'on' : s === 'paused' ? 'warn' : '');
  document.body.classList.toggle('live', s === 'recording');
}

/* ---------- المتحدثون والعرض ---------- */
function fillSpeakers() {
  const sel = $('selSpeaker'), cur = sel.value;
  sel.innerHTML = `<option value="-1">${t('none')}</option>` + session.speakers.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join('');
  sel.value = cur || '-1';
}
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function render() {
  const q = $('search').value.trim().toLowerCase(), box = $('transcript');
  box.innerHTML = '';
  session.segments.forEach(seg => {
    if (q && !seg.text.toLowerCase().includes(q)) return;
    const el = document.createElement('article'); el.className = 'seg' + (seg.unsure ? ' unsure' : '');
    el.innerHTML = `<div class="meta"><input type="checkbox" ${seg.sel ? 'checked' : ''}><time>${fmt(seg.t)}</time><select>${
      `<option value="-1">${t('none')}</option>` + session.speakers.map((n, i) => `<option value="${i}" ${seg.sp === i ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><button class="chip sm" title="${t('copyAll')}">⧉</button></div><p contenteditable="true" spellcheck="false"></p>`;
    const p = el.querySelector('p'); p.textContent = seg.text;
    p.oninput = () => { seg.text = p.textContent; seg.unsure = false; el.classList.remove('unsure'); persist(); counts(); };
    el.querySelector('input').onchange = e => seg.sel = e.target.checked;
    el.querySelector('select').onchange = e => { seg.sp = +e.target.value; persist(); };
    el.querySelector('button').onclick = async () => toast((await copyText(seg.text)) ? t('copied') : t('failed'));
    box.appendChild(el);
  });
  counts(); box.scrollTop = box.scrollHeight;
}
const fullText = (segs = session.segments) => segs.map(s => `[${fmt(s.t)}] ${s.sp >= 0 ? session.speakers[s.sp] + ': ' : ''}${s.text}`).join('\n');
function counts() { const all = session.segments.map(s => s.text).join(' ').trim(); $('counts').textContent = `${all ? all.split(/\s+/).length : 0} ${t('words')} · ${all.length} ${t('chars')}`; }
function persist() { session.updated = Date.now(); session.name = $('sessionName').value || session.name; store.saveDraft(session); }
$('search').oninput = render;
$('sessionName').oninput = persist;
$('btnRename').onclick = () => {
  session.speakers = session.speakers.map((n, i) => prompt(`${t('nameSp')} ${i + 1}`, n) || n);
  const extra = prompt(`${t('nameSp')} 3 (${ui === 'ar' ? 'اختياري' : 'optional'})`, session.speakers[2] || '');
  if (extra) session.speakers[2] = extra;
  fillSpeakers(); render(); persist();
};

/* ---------- التفريغ ---------- */
const engine = new Transcriber({
  final(text, conf) {
    if (!text) return;
    const last = session.segments.at(-1);
    if (last && last.text.replace(/[.؟?!،,]$/, '') === text) return; // منع التكرار
    let out = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.!?؟…]$/.test(out)) out += /[؟]|^(هل|ما|ماذا|لماذا|كيف|متى|أين|من|هو)\s/.test(out) ? '؟' : (/[\u0600-\u06FF]/.test(out) ? '.' : '.');
    session.segments.push({ t: Math.max(0, Date.now() - startAt - pausedTotal), text: out, sp: +$('selSpeaker').value, unsure: typeof conf === 'number' && conf > 0 && conf < 0.6 });
    persist(); render();
  },
  interim: txt => { $('interim').textContent = txt; },
  state: s => { if (s === 'restarting') notice(audioBlob === null && $('chkAudio').checked ? t('srStopped') : '', false); else notice(''); },
  error(code) {
    if (code === 'not-allowed' || code === 'service-not-allowed') { notice(t('denied')); resetControls(); setState('idle'); }
    else if (code === 'network') notice(t('net'));
    else notice(`Error: ${code}`);
  },
  level(d) {
    const c = $('wave'), g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.fillStyle = '#7CFFB2';
    const w = c.width / d.length; d.forEach((v, i) => { const h = Math.max(2, v / 255 * c.height); g.fillRect(i * w + 1, (c.height - h) / 2, w - 2, h); });
  }
});

function resetControls() { $('btnPause').disabled = true; $('btnStop').disabled = true; $('btnRec').disabled = false; clearInterval(tick); }
$('btnRec').onclick = async () => {
  if (!support.speech) { notice(t('unsupported')); return; }
  if (!navigator.onLine) notice(t('offline'));
  if (!session.segments.length) { session = Object.assign(newSession(), { name: $('sessionName').value }); fillSpeakers(); }
  session.lang = $('selLang').value; audioBlob = null; $('btnAudio').hidden = true;
  try { await engine.start({ lang: session.lang, record: $('chkAudio').checked }); }
  catch (e) { notice(t('denied')); return; }
  startAt = Date.now() - (session.segments.at(-1)?.t || 0); pausedTotal = 0;
  $('btnRec').disabled = true; $('btnPause').disabled = false; $('btnStop').disabled = false; setState('recording');
  tick = setInterval(() => $('timer').textContent = fmt(state === 'paused' ? pausedAt - startAt - pausedTotal : Date.now() - startAt - pausedTotal), 500);
};
$('btnPause').onclick = () => {
  if (state === 'recording') { engine.pause(); pausedAt = Date.now(); setState('paused'); $('btnPause').textContent = '▶'; }
  else { pausedTotal += Date.now() - pausedAt; engine.resume(); setState('recording'); $('btnPause').textContent = '⏸'; }
};
$('btnStop').onclick = async () => {
  audioBlob = await engine.stop(); resetControls(); setState('idle'); $('interim').textContent = ''; $('btnPause').textContent = '⏸';
  const c = $('wave'); c.getContext('2d').clearRect(0, 0, c.width, c.height);
  if (audioBlob) $('btnAudio').hidden = false;
  if (session.segments.length) { session.name = $('sessionName').value || new Date(session.date).toLocaleString(ui); $('sessionName').value = session.name; session.updated = Date.now(); await store.saveSession(session); store.clearDraft(); toast(t('copied').replace(t('copied'), '✓')); }
};
$('btnAudio').onclick = () => audioBlob && download(`${session.name || 'sout'}.${audioBlob.type.includes('mp4') ? 'm4a' : 'webm'}`, audioBlob);

/* ---------- تصدير ومشاركة ---------- */
const getText = () => fullText(session.segments);
const slug = () => (session.name || 'sout').replace(/[\\/:*?"<>|]/g, '_');
$('btnCopy').onclick = async () => toast((await copyText(getText())) ? t('copied') : t('failed'));
$('btnCopySel').onclick = async () => { const s = session.segments.filter(x => x.sel); toast((await copyText(fullText(s))) ? t('copied') : t('failed')); };
$('btnSelAll').onclick = () => { const on = !session.segments.every(s => s.sel); session.segments.forEach(s => s.sel = on); render(); };
$('btnTxt').onclick = () => download(slug() + '.txt', getText());
$('btnMd').onclick = () => download(slug() + '.md', `# ${session.name || 'SOUT'}\n\n_${new Date(session.date).toLocaleString(ui)} · ${session.lang}_\n\n` + session.segments.map(s => `**${s.sp >= 0 ? session.speakers[s.sp] : '—'}** (${fmt(s.t)}): ${s.text}`).join('\n\n'), 'text/markdown');
$('btnShare').onclick = async () => { const r = await nativeShare(session.name || 'SOUT', getText()); if (r === 'unsupported') { await copyText(getText()); toast(t('noShare')); } };
$('btnWa').onclick = async () => { if (!whatsapp(getText())) { await copyText(getText()); $('shareNote').textContent = t('longWa'); toast(t('copied')); } };
$('btnIg').onclick = async () => { await copyText(getText()); $('shareNote').textContent = t('igNote'); toast(t('copied')); };

/* ---------- الجلسات ---------- */
$('btnNew').onclick = () => { if (state !== 'idle') return; session = newSession(); $('sessionName').value = ''; store.clearDraft(); fillSpeakers(); render(); };
$('btnClear').onclick = () => { if (confirm(t('confirmDel'))) { session.segments = []; persist(); render(); } };
$('btnSessions').onclick = async () => {
  const list = await store.listSessions(), box = $('sessList'); box.innerHTML = list.length ? '' : `<p>${t('empty')}</p>`;
  list.forEach(s => {
    const r = document.createElement('div'); r.className = 'srow';
    r.innerHTML = `<span>${esc(s.name || s.id.slice(0, 6))}<small> ${new Date(s.date).toLocaleDateString(ui)} · ${s.segments.length}</small></span><button class="chip">${t('open')}</button><button class="chip stop">${t('del')}</button>`;
    const [o, d] = r.querySelectorAll('button');
    o.onclick = () => { if (state !== 'idle') return; session = s; $('sessionName').value = s.name; $('selLang').value = s.lang; fillSpeakers(); render(); $('dlgSessions').close(); };
    d.onclick = async () => { if (confirm(t('confirmDel'))) { await store.deleteSession(s.id); r.remove(); } };
    box.appendChild(r);
  });
  $('dlgSessions').showModal();
};
$('btnPrivacy').onclick = () => $('dlgPrivacy').showModal();
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());

/* ---------- تشغيل ---------- */
applyUI();
if (!support.speech) notice(t('unsupported'));
const draft = store.loadDraft();
if (draft?.segments?.length) {
  $('restore').hidden = false;
  $('btnRestore').onclick = () => { session = draft; $('sessionName').value = draft.name || ''; $('selLang').value = draft.lang; fillSpeakers(); render(); $('restore').hidden = true; };
  $('btnDiscard').onclick = () => { store.clearDraft(); $('restore').hidden = true; };
}
addEventListener('offline', () => notice(t('offline')));
addEventListener('online', () => notice(''));
addEventListener('beforeunload', persist);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});

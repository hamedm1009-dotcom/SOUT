const DB = 'sout-db', STORE = 'sessions', DRAFT = 'sout-draft';
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const tx = async (mode, fn) => {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req?.result);
    t.onerror = () => rej(t.error);
  });
};
export const saveSession = s => tx('readwrite', st => st.put(s));
export const listSessions = async () => ((await tx('readonly', st => st.getAll())) || []).sort((a, b) => b.updated - a.updated);
export const deleteSession = id => tx('readwrite', st => st.delete(id));
export const saveDraft = s => { try { localStorage.setItem(DRAFT, JSON.stringify(s)); } catch {} };
export const loadDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT)); } catch { return null; } };
export const clearDraft = () => localStorage.removeItem(DRAFT);

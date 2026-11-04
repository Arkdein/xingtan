// The app's IndexedDB database, shared by store.js (boards, class lists, points)
// and images.js (pictures). Opened once; every module uses the same connection.
//
// Database "xingtan"
//   v1  images   uploaded backgrounds and Images-tool pictures   (keyPath id)
//   v2  boards   one record per board                            (keyPath id)
//       kv       app-wide records: 'meta' (class lists, points, settings),
//                'migration' (when data was moved from localStorage)

export const DB_NAME = 'xingtan';
export const DB_VERSION = 2;

let dbPromise = null;

// An older copy of the app open in another tab can hold the database at
// version 1 and stop this one upgrading. Tell the teacher what to do.
function showBlockedNotice() {
  if (document.getElementById('db-blocked')) return;
  const el = document.createElement('div');
  el.id = 'db-blocked';
  el.setAttribute('role', 'alert');
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(15,30,50,.85);color:#fff;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px';
  el.innerHTML = '<div style="max-width:460px"><p style="font-size:20px;font-weight:700;margin:0 0 8px">杏坛 · ClassroomBoard is updating</p>' +
    '<p style="margin:0 0 8px">Please close the app in your other tabs or windows. This page will carry on by itself.</p>' +
    '<p style="margin:0;opacity:.8">正在更新。请关闭其他标签页或窗口中的杏坛，本页会自动继续。</p></div>';
  (document.body || document.documentElement).append(el);
}

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB not available')); return; }
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (err) { reject(err); return; }
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('images')) d.createObjectStore('images', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('boards')) d.createObjectStore('boards', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
    };
    req.onblocked = showBlockedNotice;
    req.onsuccess = () => {
      const d = req.result;
      document.getElementById('db-blocked')?.remove();
      // A newer copy of the app wants to upgrade: step aside and reload into it.
      d.onversionchange = () => { d.close(); location.reload(); };
      resolve(d);
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export const reqP = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

// Waits for a transaction to finish (or fail).
export const done = (t) => new Promise((resolve, reject) => {
  t.oncomplete = () => resolve();
  t.onerror = () => reject(t.error || new Error('Storage refused'));
  t.onabort = () => reject(t.error || new Error('Storage refused'));
});

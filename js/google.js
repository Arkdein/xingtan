// Optional connection to the teacher's Google account, used by tools that
// collect students' answers through Google Forms.
//
// There is no server: the browser signs in with Google Identity Services
// (token model) and talks to Google directly. The app asks only for
// drive.file (files it creates itself) plus the account's email address.
// The access token lasts about an hour and is kept in this tab only
// (sessionStorage), so a reload stays connected but nothing outlives the tab.

export const CLIENT_ID = '400819269577-bm9e5fqoaimanu5n03sih1b5ms3pdl9u.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file openid email';
const SESSION_KEY = 'xingtan:google';

let session = readSession(); // { token, exp, email }
let tokenClient = null;
let pending = null;          // { resolve, reject } while the Google window is open
const listeners = new Set();

function readSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    return s && s.token && s.exp > Date.now() ? s : null;
  } catch (e) { return null; }
}
function writeSession() {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch (e) { /* ignore */ }
}
const notify = () => listeners.forEach((fn) => fn(status()));

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function isConnected() { return !!session && session.exp - Date.now() > 60_000; }

export function status() {
  return { connected: isConnected(), email: session?.email || null, minutesLeft: session ? Math.max(0, Math.round((session.exp - Date.now()) / 60000)) : 0 };
}

function loadGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    let s = document.querySelector('script[data-gis]');
    if (!s) {
      s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.dataset.gis = '1';
      document.head.append(s);
    }
    s.addEventListener('load', () => resolve(), { once: true });
    s.addEventListener('error', () => reject(new Error('Could not reach Google. Check the internet connection.')), { once: true });
  });
}

// Opens Google's sign-in window. Resolves with status() once access is granted.
export async function connect() {
  await loadGis();
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (resp) => {
        const p = pending; pending = null;
        if (resp.error) { p?.reject(new Error(plainAuthError(resp.error, resp.error_description))); return; }
        if (!google.accounts.oauth2.hasGrantedAllScopes(resp, 'https://www.googleapis.com/auth/drive.file')) {
          p?.reject(new Error('Google Drive access was not allowed. Click Connect again and tick the box to allow it.'));
          return;
        }
        session = { token: resp.access_token, exp: Date.now() + (Number(resp.expires_in) || 3600) * 1000, email: session?.email || null };
        try {
          const me = await api('GET', 'https://openidconnect.googleapis.com/v1/userinfo');
          session.email = me.email || null;
        } catch (e) { /* the email is only for display */ }
        writeSession();
        notify();
        p?.resolve(status());
      },
      error_callback: (err) => {
        const p = pending; pending = null;
        p?.reject(new Error(err?.type === 'popup_closed' ? 'The Google window was closed before finishing.'
          : err?.type === 'popup_failed_to_open' ? 'The browser blocked the Google window. Allow pop-ups for this site and try again.'
            : 'Google sign-in did not finish.'));
      },
    });
  }
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    tokenClient.requestAccessToken({ prompt: session ? '' : 'consent', hint: session?.email || undefined });
  });
}

export function disconnect() {
  const t = session?.token;
  session = null;
  writeSession();
  notify();
  try { if (t && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(t, () => {}); } catch (e) { /* ignore */ }
}

function plainAuthError(code, desc) {
  if (code === 'access_denied') return 'Access was not allowed.';
  if (/admin_policy|org_internal/.test(code + desc)) return 'Your organisation’s Google admin does not allow this app.';
  return `${code}${desc ? ': ' + desc : ''}`;
}

function explain(status, body) {
  const msg = body?.error?.message || '';
  const all = JSON.stringify(body || {});
  if (/admin_policy_enforced/.test(all)) return 'Your organisation’s Google admin does not allow this.';
  if (status === 401) return 'The Google sign-in has expired. Click Reconnect.';
  if (status === 404) return 'That Google file no longer exists.';
  if (status === 429) return 'Google is busy. Trying again shortly.';
  return `Google said: ${msg || status}`;
}

// Authorised call to a Google API. Throws an Error with a plain message and .status.
export async function api(method, url, body) {
  if (!session) { const e = new Error('Not connected to Google.'); e.status = 401; throw e; }
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${session.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    const err = new Error('Could not reach Google. Check the internet connection.'); err.status = 0; throw err;
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401) { session = null; writeSession(); notify(); }
    const err = new Error(explain(res.status, data)); err.status = res.status; throw err;
  }
  return data;
}

// Tell tools when the hour runs out.
setInterval(() => { if (session && !isConnected()) { session = null; writeSession(); notify(); } }, 30_000);

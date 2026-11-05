// Spotify links for the Music tool. The app doesn't sign in to Spotify: it
// shows Spotify's own embedded player for a playlist, album or track link.
// Teachers signed in to Spotify Premium in the same (desktop) browser hear
// whole songs; everyone else hears 30-second previews. That is Spotify's rule.
//
// Spotify's iframe API is loaded too, only so the Timer can pause the player.
// Playback started by a script is preview-only, so the teacher always starts
// it with the player's own button.

const TYPES = ['playlist', 'album', 'track', 'episode', 'show', 'artist'];

// 'https://open.spotify.com/intl-en/playlist/37i9…?si=…', 'spotify:album:…' -> { type, id }
// Short share links (spotify.link, spoti.fi) can't be read here: returns { short: true }.
export function parse(text) {
  const s = String(text || '').trim();
  if (/^(https?:\/\/)?(spotify\.link|spoti\.fi)\//i.test(s)) return { short: true };
  let m = s.match(/^spotify:(playlist|album|track|episode|show|artist):([A-Za-z0-9]{10,40})$/i);
  if (!m) m = s.match(/^(?:https?:\/\/)?(?:open|play)\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|episode|show|artist)\/([A-Za-z0-9]{10,40})/i);
  if (!m || !TYPES.includes(m[1].toLowerCase())) return null;
  return { type: m[1].toLowerCase(), id: m[2] };
}

export const ref = (link) => `${link.type}/${link.id}`;
export const fromRef = (r) => { const [type, id] = String(r || '').split('/'); return TYPES.includes(type) && id ? { type, id } : null; };
export const uri = (link) => `spotify:${link.type}:${link.id}`;
export const openUrl = (link) => `https://open.spotify.com/${link.type}/${link.id}`;
export const embedUrl = (link) => `https://open.spotify.com/embed/${link.type}/${link.id}?utm_source=generator&theme=0`;
export const searchUrl = (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}`;

// The playlist or album name, from Spotify's public oEmbed. null if unavailable.
export async function lookupTitle(link) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(openUrl(link))}`, { signal: ctl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.title === 'string' && data.title.trim() ? data.title.trim().slice(0, 120) : null;
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Spotify's iframe API (https://developer.spotify.com/documentation/embeds/references/iframe-api).
let apiPromise = null;
export function loadIframeApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { apiPromise = null; reject(new Error('timeout')); }, 10000);
    const prev = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      clearTimeout(timer);
      if (typeof prev === 'function') { try { prev(api); } catch (err) { /* ignore */ } }
      resolve(api);
    };
    const s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1';
    s.async = true;
    s.onerror = () => { clearTimeout(timer); apiPromise = null; s.remove(); reject(new Error('blocked')); };
    document.head.append(s);
  });
  return apiPromise;
}

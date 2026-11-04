"""Fetch candidate board backgrounds from open-licence sources.

Runs in GitHub Actions (see .github/workflows/fetch-backgrounds.yml) because the
images live on sites the development workspace cannot reach.

tools/request.json decides what happens:
  {"mode": "candidates"}                       small review copies + metadata
  {"mode": "full", "items": [{"key", "url"}]}  full-size copies of chosen images

Sources
  The Met Open Access  public-domain artworks, CC0     collectionapi.metmuseum.org
  Openverse            CC0 and public-domain photos    api.openverse.org
"""
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image

UA = 'xingtan-background-fetch/1.0 (+https://github.com/Arkdein/xingtan)'
OUT = 'staging'
START = time.time()
BUDGET = 15 * 60          # stop fetching after 15 minutes, keep what we have
failures = {'met': 0}


def out_of_time():
    return time.time() - START > BUDGET

MET_QUERIES = [
    ('chinese', 'landscape handscroll'),
    ('chinese', 'landscape album leaf'),
    ('chinese', 'river landscape'),
    ('chinese', 'mountains clouds'),
    ('chinese', 'flowers and birds'),
    ('chinese', 'lotus'),
    ('chinese', 'plum blossom'),
    ('chinese', 'bamboo'),
]

OPENVERSE_QUERIES = [
    ('chinese', 'chinese landscape painting'),
    ('chinese', 'chinese handscroll'),
    ('chinese', 'song dynasty painting'),
    ('chinese', 'shan shui'),
    ('chinese', 'Metropolitan Museum chinese painting landscape'),
    ('chinese', 'chinese painting flowers birds'),
    ('chinese', 'chinese painting lotus'),
    ('chinese', 'chinese painting bamboo'),
    ('nature', 'misty mountains'),
    ('nature', 'calm lake reflection'),
    ('nature', 'forest sunlight'),
    ('nature', 'ocean horizon'),
    ('nature', 'clouds blue sky'),
    ('nature', 'bamboo forest'),
    ('nature', 'tea plantation'),
    ('singapore', 'Singapore skyline'),
    ('singapore', 'Marina Bay Singapore'),
    ('singapore', 'Gardens by the Bay'),
    ('singapore', 'Singapore Botanic Gardens'),
    ('singapore', 'Singapore HDB'),
    ('singapore', 'Singapore Chinatown'),
    ('singapore', 'Singapore river'),
    ('festive', 'chinese new year lanterns'),
    ('festive', 'red lanterns'),
    ('festive', 'mid-autumn lanterns'),
    ('festive', 'diwali lamps'),
    ('festive', 'ketupat'),
    ('festive', 'fireworks'),
    ('festive', 'christmas lights'),
]


def get(url, tries=2, timeout=20):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            print('  retry', i + 1, url[:100], e, file=sys.stderr, flush=True)
            time.sleep(2)
    return None


def get_json(url):
    raw = get(url)
    return json.loads(raw) if raw else None


def save_review(raw, path, max_w=640):
    try:
        im = Image.open(io.BytesIO(raw))
        im = im.convert('RGB')
    except Exception as e:  # noqa: BLE001
        print('  bad image', path, e, file=sys.stderr)
        return None
    w, h = im.size
    if w / h < 1.25:  # boards are wide; skip tall images
        return None
    if w > max_w:
        im = im.resize((max_w, round(h * max_w / w)), Image.LANCZOS)
    im.save(path, 'JPEG', quality=82)
    return {'w': w, 'h': h}


def met(cands):
    for cat, q in MET_QUERIES:
        if out_of_time() or failures['met'] >= 8:
            print('Met: stopping (time or repeated failures)', flush=True)
            return
        url = ('https://collectionapi.metmuseum.org/public/collection/v1/search?'
               + urllib.parse.urlencode({'q': q, 'hasImages': 'true', 'departmentId': 6}))
        res = get_json(url)
        if res is None:
            failures['met'] += 4
            continue
        ids = (res.get('objectIDs') or [])[:40]
        kept = 0
        print(f'Met "{q}": {len(ids)} ids', flush=True)
        for oid in ids:
            if kept >= 10:
                break
            if any(c['key'] == f'met-{oid}' for c in cands):
                continue
            if out_of_time() or failures['met'] >= 8:
                break
            o = get_json(f'https://collectionapi.metmuseum.org/public/collection/v1/objects/{oid}')
            if o is None:
                failures['met'] += 1
                continue
            failures['met'] = 0
            time.sleep(0.05)
            if not o or not o.get('isPublicDomain') or not o.get('primaryImageSmall'):
                continue
            if 'China' not in (o.get('culture') or '') or o.get('classification') != 'Paintings':
                continue
            raw = get(o['primaryImageSmall'])
            if not raw:
                continue
            key = f'met-{oid}'
            dims = save_review(raw, f'{OUT}/review/{key}.jpg')
            if not dims:
                continue
            kept += 1
            cands.append({
                'key': key, 'category': cat, 'query': q,
                'title': o.get('title'), 'creator': o.get('artistDisplayName') or '',
                'date': o.get('objectDate'), 'credit': o.get('creditLine'),
                'license': 'CC0 (The Met Open Access)', 'landing': o.get('objectURL'),
                'full_url': o.get('primaryImage'), 'source': 'The Met', 'small_dims': dims,
            })


def openverse(cands):
    for cat, q in OPENVERSE_QUERIES:
        if out_of_time():
            print('Openverse: out of time', flush=True)
            return
        url = ('https://api.openverse.org/v1/images/?'
               + urllib.parse.urlencode({'q': q, 'license': 'cc0,pdm', 'aspect_ratio': 'wide',
                                         'size': 'large', 'page_size': 20, 'mature': 'false'}))
        res = get_json(url) or {}
        results = res.get('results') or []
        print(f'Openverse "{q}": {len(results)} results', flush=True)
        kept = 0
        for r in results:
            if kept >= 9:
                break
            key = f'ov-{r["id"][:8]}'
            if any(c['key'] == key for c in cands):
                continue
            raw = get(r['thumbnail'], tries=1) if r.get('thumbnail') else None
            if not raw:  # the thumbnail service sometimes fails; use the original
                raw = get(r['url'], tries=1, timeout=30)
            time.sleep(0.3)
            if not raw:
                continue
            dims = save_review(raw, f'{OUT}/review/{key}.jpg')
            if not dims:
                continue
            kept += 1
            cands.append({
                'key': key, 'category': cat, 'query': q,
                'title': r.get('title'), 'creator': r.get('creator') or '',
                'license': (r.get('license') or '').upper() + (' ' + r['license_version'] if r.get('license_version') else ''),
                'landing': r.get('foreign_landing_url'), 'full_url': r.get('url'),
                'source': r.get('source') or r.get('provider'), 'width': r.get('width'), 'height': r.get('height'),
            })
        time.sleep(1.5)


import html
import re

COMMONS = 'https://commons.wikimedia.org/w/api.php?'
PD_WORDS = ('cc0', 'public domain', 'pd-', 'pdm')


def strip_html(t):
    return html.unescape(re.sub(r'<[^>]+>', '', t or '')).strip()


def commons(cands, cat, q, licensed_filter, n=6, min_w=2400):
    search = q + (' haswbstatement:P275=Q6938433|P6216=Q19652' if licensed_filter else '')
    url = COMMONS + urllib.parse.urlencode({
        'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': search,
        'gsrnamespace': 6, 'gsrlimit': 30, 'prop': 'imageinfo',
        'iiprop': 'url|size|extmetadata|mime', 'iiurlwidth': 640})
    res = get_json(url) or {}
    pages = sorted((res.get('query') or {}).get('pages', {}).values(), key=lambda p: p.get('index', 99))
    kept = 0
    print(f'Commons "{q}": {len(pages)} pages', flush=True)
    for pg in pages:
        if kept >= n or out_of_time():
            break
        ii = (pg.get('imageinfo') or [{}])[0]
        if ii.get('mime') not in ('image/jpeg', 'image/png', 'image/tiff'):
            continue
        w, h = ii.get('width', 0), ii.get('height', 1)
        if w < min_w or w / h < 1.3:
            continue
        em = ii.get('extmetadata') or {}
        lic = strip_html((em.get('LicenseShortName') or {}).get('value'))
        if not any(x in lic.lower() for x in PD_WORDS):
            continue
        key = 'wc-' + str(pg['pageid'])
        if any(c['key'] == key for c in cands):
            continue
        raw = get(ii['thumburl'])
        if not raw:
            continue
        if not save_review(raw, f'{OUT}/review/{key}.jpg'):
            continue
        kept += 1
        cands.append({
            'key': key, 'category': cat, 'query': q, 'title': pg['title'].replace('File:', ''),
            'creator': strip_html((em.get('Artist') or {}).get('value'))[:120],
            'credit': strip_html((em.get('Credit') or {}).get('value'))[:160],
            'license': lic, 'landing': ii.get('descriptionurl'), 'full_url': ii.get('url'),
            'source': 'Wikimedia Commons', 'width': w, 'height': h,
        })
        time.sleep(0.2)


def aic(cands, q):
    url = 'https://api.artic.edu/api/v1/artworks/search?' + urllib.parse.urlencode(
        {'q': q, 'fields': 'id,title,image_id,is_public_domain,artist_display,thumbnail', 'limit': 5})
    res = get_json(url) or {}
    for a in res.get('data') or []:
        if not a.get('is_public_domain') or not a.get('image_id'):
            continue
        key = f'aic-{a["id"]}'
        raw = get(f'https://www.artic.edu/iiif/2/{a["image_id"]}/full/843,/0/default.jpg')
        if not raw or not save_review(raw, f'{OUT}/review/{key}.jpg'):
            continue
        tw = (a.get('thumbnail') or {}).get('width')
        cands.append({'key': key, 'category': 'chinese', 'query': q, 'title': a['title'],
                      'creator': a.get('artist_display', ''), 'license': 'CC0 (Art Institute of Chicago)',
                      'landing': f'https://www.artic.edu/artworks/{a["id"]}', 'source': 'Art Institute of Chicago',
                      'full_url': f'https://www.artic.edu/iiif/2/{a["image_id"]}/full/3000,/0/default.jpg', 'width': tw})


def hires(req):
    cands = []
    try:
        for q in req.get('aic', []):
            aic(cands, q)
        for cat, q, lf in req['commons']:
            commons(cands, cat, q, lf)
    finally:
        json.dump(cands, open(f'{OUT}/hires.json', 'w'), indent=1, ensure_ascii=False)
        print('hires candidates:', len(cands))


def full(items):
    os.makedirs(f'{OUT}/full', exist_ok=True)
    for it in items:
        raw = get(it['url'])
        if not raw:
            print('FAILED', it['key'], file=sys.stderr)
            continue
        Image.MAX_IMAGE_PIXELS = None  # some museum scans are very large
        im = Image.open(io.BytesIO(raw)).convert('RGB')
        if it.get('crop'):  # [left, top, right, bottom] as fractions
            w, h = im.size
            l, t, r, b = it['crop']
            im = im.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
        w, h = im.size
        if max(w, h) > 3840:
            f = 3840 / max(w, h)
            im = im.resize((round(w * f), round(h * f)), Image.LANCZOS)
        im.save(f'{OUT}/full/{it["key"]}.jpg', 'JPEG', quality=92)
        print('saved', it['key'], im.size)


def main():
    req = json.load(open('tools/request.json'))
    os.makedirs(f'{OUT}/review', exist_ok=True)
    if req['mode'] == 'candidates':
        cands = []
        try:
            openverse(cands)  # The Met's search API now answers 410 Gone, so Met images come via Wikimedia Commons
        finally:
            json.dump(cands, open(f'{OUT}/candidates.json', 'w'), indent=1, ensure_ascii=False)
            print('candidates:', len(cands))
    elif req['mode'] == 'hires':
        hires(req)
    else:
        full(req['items'])


if __name__ == '__main__':
    main()

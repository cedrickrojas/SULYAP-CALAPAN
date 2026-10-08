import json, re, io, time, html, urllib.request, urllib.parse, hashlib
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageOps
root = Path(__file__).resolve().parent.parent
assets = json.loads((root / 'scripts/photo-assets.json').read_text(encoding='utf-8'))
def fetch(asset):
    target = root / 'public/images' / asset['file']
    if not re.fullmatch(r'[a-z0-9-]+\.jpg', asset['file']): raise ValueError('Invalid image filename')
    if target.exists():
        return asset['file'] + ' already ready'
    title = asset['title'].replace(' ', '_')
    digest = hashlib.md5(title.encode()).hexdigest()
    original = asset.get('url') or 'https://upload.wikimedia.org/wikipedia/commons/' + digest[0] + '/' + digest[:2] + '/' + urllib.parse.quote(title)
    parts = urllib.parse.urlsplit(original)
    thumbnail = parts.scheme + '://' + 'thumb.wikimedia.org' + parts.path.replace('/commons/', '/commons/thumb/', 1) + '/960px-' + parts.path.rsplit('/', 1)[-1]
    urls = [thumbnail]
    for attempt in range(2):
        try:
            request = urllib.request.Request(urls[0], headers={'User-Agent': 'SulyapTourismGuide/1.0 (academic tourism project; Wikimedia attribution included)'})
            with urllib.request.urlopen(request, timeout=45) as response:
                raw = response.read()
            img = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
            img.thumbnail((1800, 1400))
            target.parent.mkdir(parents=True, exist_ok=True)
            img.save(target, 'JPEG', quality=84, optimize=True)
            return asset['file'] + ' ready (' + str(target.stat().st_size // 1024) + ' KB)'
        except Exception as error:
            if attempt == 1: return asset['file'] + ' FAILED: ' + str(error)
            time.sleep(2 + attempt * 3)
with ThreadPoolExecutor(max_workers=2) as pool:
    for result in pool.map(fetch, assets): print(result, flush=True)
items = []
for a in assets:
    e = lambda value: html.escape(value, quote=True)
    items.append('<li><strong>' + e(a['file']) + '</strong> — ' + e(a['author']) + ' · <a href="' + e(a['licenseUrl']) + '">' + e(a['license']) + '</a> · <a href="' + e(a['source']) + '">Original on Wikimedia Commons</a>. Resized and compressed for the web; display crops vary.</li>')
page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Photo Credits — Sulyap</title><style>body{font:16px/1.8 system-ui,sans-serif;max-width:950px;margin:50px auto;padding:0 24px;color:#073b3d}li{margin:20px 0;overflow-wrap:anywhere}a{color:#386c5c}h1{font:40px Georgia,serif}</style></head><body><a href="/">Back to Sulyap</a><h1>Photo credits</h1><p>Destination photography is sourced from Wikimedia Commons. The images retain the licenses listed below.</p><ol>' + ''.join(items) + '</ol></body></html>'
(root / 'public/photo-credits.html').write_text(page, encoding='utf-8')
failed = [a['file'] for a in assets if not (root / 'public/images' / a['file']).exists()]
if failed: raise SystemExit('Missing photos: ' + ', '.join(failed))

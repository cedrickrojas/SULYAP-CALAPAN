"""Prepare attributed Calapan photos and explicitly labelled missing-photo assets."""
import html
import base64
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
NAMES = [
    ('sto-nino-cathedral', 'Sto. Niño Cathedral'),
    ('silonay-mangrove-conservation-eco-park', 'Silonay Mangrove Conservation Eco-Park'),
    ('oriental-mindoro-heritage-museum', 'Oriental Mindoro Heritage Museum'),
    ('calapan-zoological-and-recreational-park', 'Calapan Zoological and Recreational Park'),
    ('plaza-del-gobernador', 'Plaza del Gobernador'),
    ('calapan-city-plaza', 'Calapan City Plaza'),
    ('aganhao-islet', 'Aganagahaw Islet'),
    ('caluangan-lake', 'Caluangan Lake'),
    ('baco-island', 'Baco Islands'),
    ('suqui-beach', 'Suqui Beach'),
]
PHOTOS = [
    ('sto-nino-cathedral', 1, 'Sto Nino Church Calapan.jpg'),
    ('sto-nino-cathedral', 2, 'Santo Niño Cathedral in Calapan, Oriental Mindoro.jpg'),
    ('sto-nino-cathedral', 3, 'Calapan Church historical marker.jpg'),
    ('calapan-city-plaza', 1, 'Calapan Plaza.jpg'),
    ('calapan-city-plaza', 2, 'Calapan City Plaza, Calapan City, Oriental Mindoro, Philippines.jpg'),
    ('calapan-city-plaza', 3, 'Mindoro Relief Map at Calapan Plaza.jpg'),
    ('baco-island', 1, 'Baco Islands.JPG'),
    ('suqui-beach', 1, 'Donnyland Resort from afar.jpg'),
]
PORTAL_PHOTOS = json.loads((ROOT / 'scripts/calapan-portal-photo-sources.json').read_text(encoding='utf-8'))
WEB_PHOTOS = json.loads((ROOT / 'scripts/calapan-web-photo-sources.json').read_text(encoding='utf-8'))
DETAIL_VIEWS = [
    ('aganhao-islet', 2, 'Shoreline detail (crop of the same aerial photograph)', (120, 300, 900, 600)),
    ('aganhao-islet', 3, 'Island greenery detail (crop of the same aerial photograph)', (750, 200, 1020, 680)),
]


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'SulyapTourismGuide/1.0 (academic project; image attribution included)'})
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read()


def prepare_photo(item):
    slug, number, title = item
    try:
        query = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'titles': 'File:' + title, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': 1600})
        response = json.loads(fetch('https://commons.wikimedia.org/w/api.php?' + query))
        page = next(iter(response['query']['pages'].values()))
        info = page['imageinfo'][0]
        metadata = info['extmetadata']
        license_name = metadata.get('LicenseShortName', {}).get('value', '')
        if not (license_name.startswith('CC BY') or license_name in ('CC0', 'Public domain')):
            raise ValueError('Unsupported or missing image license: ' + license_name)
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(fetch(info.get('thumburl', info['url']))))).convert('RGB')
        image.thumbnail((1800, 1400))
        filename = f'{slug}-{number}.jpg'
        target = ROOT / 'public/images' / filename
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, 'JPEG', quality=86, optimize=True)
        artist = html.unescape(re.sub('<[^>]+>', '', metadata.get('Artist', {}).get('value', 'See original file')))
        record = {'file': filename, 'title': title, 'author': artist, 'license': license_name, 'licenseUrl': metadata.get('LicenseUrl', {}).get('value', ''), 'source': info['descriptionurl'], 'url': info['url']}
        print('PHOTO READY: ' + filename, flush=True)
        return slug, number, record
    except Exception as error:
        print('PHOTO PENDING: ' + title + ' — ' + str(error), flush=True)
        return slug, number, None


def prepare_portal_photo(item):
    slug, number = item['slug'], item['number']
    try:
        url = 'https://www.travelorientalmindoro.ph' + item['path']
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(fetch(url)))).convert('RGB')
        image.thumbnail((1800, 1400))
        filename = f'{slug}-{number}.jpg'
        target = ROOT / 'public/images' / filename
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, 'JPEG', quality=86, optimize=True)
        record = {'file': filename, 'title': item['title'], 'author': 'Published by Travel Oriental Mindoro',
                  'sourceType': 'tourism-portal', 'source': 'https://www.travelorientalmindoro.ph/place/' + item['page'],
                  'url': url, 'license': 'Not stated on source page', 'licenseUrl': ''}
        print('PORTAL PHOTO READY: ' + filename, flush=True)
        return slug, number, record
    except Exception as error:
        print('PORTAL PHOTO PENDING: ' + item['title'] + ' — ' + str(error), flush=True)
        return slug, number, None


def prepare_web_photo(item):
    slug, number = item['slug'], item['number']
    try:
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(fetch(item['url'])))).convert('RGB')
        image.thumbnail((1800, 1400))
        filename = f'{slug}-{number}.jpg'
        target = ROOT / 'public/images' / filename
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, 'JPEG', quality=86, optimize=True)
        record = {key: item[key] for key in ('title', 'author', 'source', 'url', 'note')}
        record.update({'file': filename, 'sourceType': 'published-source', 'license': 'Not stated on source page', 'licenseUrl': ''})
        print('SOURCE PHOTO READY: ' + filename, flush=True)
        return slug, number, record
    except Exception as error:
        print('SOURCE PHOTO PENDING: ' + item['title'] + ' — ' + str(error), flush=True)
        return slug, number, None


def placeholder(slug, name, number):
    filename = f'{slug}-{number}-pending.svg'
    lines = []
    words = name.split()
    line = ''
    for word in words:
        if len(line + ' ' + word) > 29:
            lines.append(line)
            line = word
        else:
            line = (line + ' ' + word).strip()
    lines.append(line)
    title = ''.join(f'<tspan x="600" dy="{0 if i == 0 else 49}">{html.escape(text)}</tspan>' for i, text in enumerate(lines))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#FFF9F7"/><stop offset="1" stop-color="#F8DCE5"/></linearGradient></defs>
<rect width="1200" height="800" fill="url(#bg)"/><rect x="35" y="35" width="1130" height="730" rx="24" fill="none" stroke="#D9A0B5"/>
<g fill="none" stroke="#B66583" stroke-width="3"><rect x="559" y="216" width="82" height="59" rx="9"/><path d="M578 216l8-14h28l8 14"/><circle cx="600" cy="245" r="15"/></g>
<text x="600" y="336" text-anchor="middle" font-family="Georgia,serif" font-size="40" fill="#4A3540">{title}</text>
<text x="600" y="{430 + max(0, len(lines) - 1) * 36}" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" letter-spacing="4" fill="#974965">PHOTO COMING SOON</text>
<text x="600" y="650" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#796770">CALAPAN CITY · ORIENTAL MINDORO</text>
<text x="600" y="697" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#796770">Gallery view {number} · destination photo awaiting confirmation</text></svg>'''
    target = ROOT / 'public/images' / filename
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(svg, encoding='utf-8')
    return {'src': '/images/' + filename, 'alt': f'{name} — photo {number} coming soon', 'placeholder': True}


def prepare_detail_views(ready):
    """Frame details of an existing photo with SVG; preserve its original pixels."""
    for slug, number, title, bounds in DETAIL_VIEWS:
        existing = ready.get((slug, number))
        if existing and not existing.get('derivedFrom'):
            continue
        original = ready.get((slug, 1))
        if not original:
            continue
        source = ROOT / 'public/images' / original['file']
        with Image.open(source) as photograph:
            width, height = photograph.size
        # Bounds refer to the prepared 1800px-wide aerial photograph.
        ratio = width / 1800
        x, y, crop_width, crop_height = [value * ratio for value in bounds]
        encoded = base64.b64encode(source.read_bytes()).decode('ascii')
        filename = f'{slug}-{number}-detail.svg'
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" '
               f'viewBox="{x:g} {y:g} {crop_width:g} {crop_height:g}">'
               f'<title>{html.escape(title)}</title>'
               '<desc>Detail view of the same verified Aganagahaw aerial photograph; not a separate photograph.</desc>'
               f'<image width="{width}" height="{height}" href="data:image/jpeg;base64,{encoded}"/>'
               '</svg>')
        (ROOT / 'public/images' / filename).write_text(svg, encoding='utf-8')
        record = dict(original, file=filename, title=title, derivedFrom=original['file'])
        record['note'] = (f'Detail crop of {original["file"]}, using the same original aerial photograph. '
                          'This is not a separate photograph. The original pixels and source attribution are preserved. '
                          + original['note'])
        ready[(slug, number)] = record


def main():
    credit_file = ROOT / 'scripts/calapan-photo-assets.json'
    existing = json.loads(credit_file.read_text(encoding='utf-8')) if credit_file.exists() else []
    # Preserve working local files if a remote source is temporarily unavailable.
    ready = {}
    for photo in existing:
        match = re.fullmatch(r'(.+)-(\d+)\.jpg', photo['file'])
        if match and (ROOT / 'public/images' / photo['file']).exists():
            ready[(match[1], int(match[2]))] = photo
    with ThreadPoolExecutor(max_workers=2) as pool:
        if '--local-only' in sys.argv:
            results = []
        elif '--web-only' in sys.argv:
            results = list(pool.map(prepare_photo, [item for item in PHOTOS if item[0] in ('aganhao-islet', 'caluangan-lake', 'suqui-beach')]))
            results += list(pool.map(prepare_web_photo, WEB_PHOTOS))
        else:
            results = [] if '--portal-only' in sys.argv else list(pool.map(prepare_photo, PHOTOS))
            results += list(pool.map(prepare_portal_photo, PORTAL_PHOTOS))
            if '--portal-only' not in sys.argv:
                results += list(pool.map(prepare_web_photo, WEB_PHOTOS))
    ready.update({(slug, number): photo for slug, number, photo in results if photo})
    prepare_detail_views(ready)
    images, credits = {}, []
    for slug, name in NAMES:
        images[slug] = []
        for number in range(1, 4):
            photo = ready.get((slug, number))
            if photo:
                images[slug].append({'src': '/images/' + photo['file'], 'alt': f'{name} — {photo["title"].rsplit(".", 1)[0]}', 'placeholder': False})
                credits.append(photo)
            else:
                images[slug].append(placeholder(slug, name, number))
    (ROOT / 'src/destination-images.json').write_text(json.dumps(images, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'scripts/calapan-photo-assets.json').write_text(json.dumps(credits, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    write_credits(credits)
    detail_count = sum('derivedFrom' in photo for photo in credits)
    print(f'PREPARED: {len(credits) - detail_count} attributed photographs, {detail_count} labelled detail views, and {30 - len(credits)} placeholders.', flush=True)


def write_credits(credits):
    page = ROOT / 'public/photo-credits.html'
    previous = page.read_text(encoding='utf-8')
    head = previous.split('<body>', 1)[0]
    items = []
    escape = lambda value: html.escape(value, quote=True)
    for photo in credits:
        if photo.get('sourceType') == 'published-source':
            items.append('<li><strong>' + escape(photo['file']) + '</strong> — ' + escape(photo['author']) +
                         ' · <a href="' + escape(photo['source']) + '">Original published source</a>' +
                         ' · <a href="' + escape(photo['url']) + '">Source image</a>' +
                         ' · <a href="/images/' + escape(photo['file']) + '">Processed photo</a>. ' +
                         escape(photo['note']) + ' Resized and compressed; display crops vary.</li>')
            continue
        if photo.get('sourceType') == 'tourism-portal':
            items.append('<li><strong>' + escape(photo['file']) + '</strong> — ' + escape(photo['author']) +
                         ' · <a href="' + escape(photo['source']) + '">Original destination gallery</a>' +
                         ' · <a href="' + escape(photo['url']) + '">Source image</a>' +
                         ' · <a href="/images/' + escape(photo['file']) + '">Processed photo</a>.' +
                         ' Photographer and reuse license are not stated on the listing. Resized and compressed; display crops vary.</li>')
            continue
        items.append('<li><strong>' + escape(photo['file']) + '</strong> — ' + escape(photo['author']) +
                     ' · <a href="' + escape(photo['licenseUrl']) + '">' + escape(photo['license']) +
                     '</a> · <a href="' + escape(photo['source']) + '">Original on Wikimedia Commons</a>' +
                     ' · <a href="/images/' + escape(photo['file']) + '">Processed photo</a>.' +
                     ' Resized and compressed for the web; display crops vary. The processed image retains the stated license.</li>')
    body = '<body><a href="/">Back to Sulyap</a><h1>Photo credits</h1><p>Calapan destination photographs come from Wikimedia Commons, the client-supplied Travel Oriental Mindoro portal, Calapan community mapping, UPLB, Mindoro Travel Guide, and Philippine Information Agency MIMAROPA. Individual source and license details are listed below. They may show earlier appearances of the sites; the Baco gallery shows the island group, and the Suqui gallery includes the Donnyland beachfront and private resort frontage.</p><p>The Aganagahaw gallery uses one verified aerial photograph and two clearly labelled detail crops of that same image. The shoreline and greenery details are not separate photographs. All thirty gallery slots now display destination imagery.</p><ol>' + ''.join(items) + '</ol></body></html>'
    establishment_sources = ROOT / 'scripts/establishment-photo-assets.json'
    if establishment_sources.exists():
        establishment_items = []
        for photo in json.loads(establishment_sources.read_text(encoding='utf-8')):
            establishment_items.append(
                '<li id="establishment-' + escape(photo['id']) + '"><strong>' +
                escape(photo['name']) + '</strong> &mdash; ' + escape(photo['author']) +
                ' &middot; <a href="' + escape(photo['source']) + '">Original published source</a>' +
                ' &middot; <a href="' + escape(photo['url']) + '">Source image</a>' +
                (' &middot; <a href="' + escape(photo['licenseUrl']) + '">' + escape(photo['license']) + '</a>' if photo.get('licenseUrl') else '') +
                ' &middot; <a href="/images/' + escape(photo['file']) + '">Local photo</a>. ' +
                escape(photo['note']) + '</li>')
        section = '<section id="establishments"><h2>Establishment photographs</h2><p>Photographs are stored locally and linked to their original published sources.</p><ol>' + ''.join(establishment_items) + '</ol></section>'
        body = body.replace('</body>', section + '</body>')
    # Home culture photographs have their own curated attribution section.
    marker = '<section id="mindoro-culture">'
    if marker in previous:
        culture = marker + previous.split(marker, 1)[1].split('</section>', 1)[0] + '</section>'
        body = body.replace('</body>', culture + '</body>')
    page.write_text(head + body, encoding='utf-8')


if __name__ == '__main__':
    if '--credits-only' in sys.argv:
        write_credits(json.loads((ROOT / 'scripts/calapan-photo-assets.json').read_text(encoding='utf-8')))
    else:
        main()

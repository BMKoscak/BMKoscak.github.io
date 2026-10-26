"""Render the 1200x630 social preview images into public/og/.
Run from the repo root:  python3 tools/og.py   (needs: pip install playwright pillow)"""
import math, re, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'og'
FONTS = (ROOT / 'public' / 'fonts').as_uri()

def front(md):
    t = md.read_text(encoding='utf-8')
    fm = t.split('---')[1]
    get = lambda k: (re.search(rf"^{k}:\s*'?(.*?)'?\s*$", fm, re.M) or [None, ''])[1]
    cover = get('cover')
    gallery = re.findall(r"- src: (.+)", fm)
    img = (md.parent / (gallery[0] if gallery else cover)).resolve() if (gallery or cover) else None
    return {'title': get('title'), 'kind': get('kind') or 'Lab', 'summary': get('summary'), 'img': img, 'scope': get('scope') or '3:2:0.25'}

def curve(ratio, w=520, h=420):
    a, b, ph = (list(map(float, ratio.split(':'))) + [0.25])[:3]
    pts = []
    for i in range(801):
        t = i / 800 * math.pi * 2
        pts.append(f"{w/2 + w*0.42*math.sin(a*t + ph*math.pi*2):.1f},{h/2 - h*0.42*math.sin(b*t):.1f}")
    return f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}"><polyline points="{" ".join(pts)}" fill="none" stroke="#f0c43a" stroke-width="3" opacity=".95" style="filter:drop-shadow(0 0 8px rgba(240,196,58,.7))"/></svg>'

def page(title, kind, sub, right):
    return f"""<!doctype html><html><head><meta charset=utf-8><style>
@font-face{{font-family:A;src:url({FONTS}/archivo-var.woff2);font-weight:300 900;font-stretch:62% 125%}}
@font-face{{font-family:B;src:url({FONTS}/bricolage-var.woff2);font-weight:300 800}}
@font-face{{font-family:H;src:url({FONTS}/shantell-500.woff2)}}
*{{box-sizing:border-box}}body{{margin:0;width:1200px;height:630px;background:#13110d;color:#ede6d4;font-family:B}}
.f{{position:absolute;inset:28px;border:1px solid #3a362c;display:grid;grid-template-columns:1.15fr 1fr}}
.l{{padding:48px 44px;display:flex;flex-direction:column;gap:22px;border-right:1px solid #3a362c}}
.tape{{align-self:flex-start;background:#f0c43a;color:#1d1708;font-family:H;font-size:24px;padding:6px 18px;transform:rotate(-2deg)}}
h1{{margin:0;font-family:A;font-weight:850;font-stretch:100%;font-size:{'84' if len(title)<16 else '64' if len(title)<26 else '52'}px;line-height:.95;letter-spacing:-.01em}}
p{{margin:0;font-size:24px;line-height:1.4;color:#b4ab95}}
.u{{margin-top:auto;font-family:A;font-weight:800;font-stretch:125%;font-size:22px;text-transform:uppercase;letter-spacing:.02em}}
.u b{{color:#f0c43a}}
.r{{position:relative;overflow:hidden;display:grid;place-items:center;
background-image:linear-gradient(to right,rgba(237,230,212,.08) 1px,transparent 1px),linear-gradient(to bottom,rgba(237,230,212,.08) 1px,transparent 1px);background-size:10% 12.5%}}
.r img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
</style></head><body><div class=f><div class=l><span class=tape>{kind}</span><h1>{title}</h1><p>{sub}</p><div class=u>thebenn<b>.me</b></div></div><div class=r>{right}</div></div></body></html>"""

jobs = []
for md in sorted((ROOT / 'src/content/work').glob('*.md')):
    d = front(md)
    right = f'<img src="{d["img"].as_uri()}">' if d['img'] else curve('1:2:0')
    jobs.append((f'work-{md.stem}', page(d['title'], d['kind'], d['summary'], right)))
for md in sorted((ROOT / 'src/content/lab').glob('*.md')):
    d = front(md)
    jobs.append((f'lab-{md.stem}', page(d['title'], 'Lab', d['summary'], curve(d['scope']))))
photo = lambda n: f'<img src="{(ROOT / "src/assets/photos" / n).as_uri()}" style="object-position:center 30%">'
jobs += [
    ('home', page('The Benn', 'Freelance · Ljubljana', 'Creative web developer in Slovenia. Websites, interactive 3D and custom tools.', curve('3:2:0.25'))),
    ('work', page('Work', 'Case studies', 'A browser game, an MCP hub, a Blender commercial, a visual novel and a chess AI.', curve('5:4:0.1'))),
    ('lab', page('Lab', 'Experiments', 'A scope, beat pads, a vision mixer, a viewfinder and an ARM assembly stepper.', curve('1:2:0'))),
    ('about', page('Camera, then sound, then code.', 'About', 'Films and photos, then beats, then live TV. Now a developer at FRI Ljubljana.', photo('ben-portrait.jpg'))),
    ('contact', page('Start a project', 'Contact', 'Websites, interactive 3D and custom tools for studios, brands and teams.', curve('1:1:0.25'))),
]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1200, 'height': 630})
    for name, html in jobs:
        tmp = OUT / '_tmp.html'
        tmp.write_text(html, encoding='utf-8')
        pg.goto(tmp.as_uri()); pg.wait_for_timeout(300)
        pg.screenshot(path=str(OUT / f'{name}.jpg'), type='jpeg', quality=84)
        print(name)
    tmp.unlink()
    # square portrait for the Person entity
    pg.set_viewport_size({'width': 800, 'height': 800})
    pg.set_content(f'<body style="margin:0"><img src="{(ROOT / "src/assets/photos/ben-portrait.jpg").as_uri()}" style="width:800px;height:800px;object-fit:cover;object-position:center 25%"></body>')
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / 'portrait.jpg'), type='jpeg', quality=84)
    b.close()

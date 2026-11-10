# Puts the customer's logo in as the app icon + splash for one flavor (no logo → standard icon stays)
import base64, io, os, sys
from PIL import Image

bid, app = sys.argv[1], sys.argv[2]
data = open('logo-' + bid).read()
if not data.startswith('data:image'):
    sys.exit(0)
im = Image.open(io.BytesIO(base64.b64decode(data.split(',', 1)[1]))).convert('RGBA')
side = max(im.size)
square = Image.new('RGBA', (side, side), (255, 255, 255, 255))
square.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
for dpi, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    out = f'app/src/{app}/res/mipmap-{dpi}'
    os.makedirs(out, exist_ok=True)
    square.resize((px, px), Image.LANCZOS).save(f'{out}/ic_launcher.png')
out = f'app/src/{app}/res/drawable-nodpi'
os.makedirs(out, exist_ok=True)
square.resize((288, 288), Image.LANCZOS).save(f'{out}/splash.png')

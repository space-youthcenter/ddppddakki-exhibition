"""Format-only TV derivatives. Existing artwork and source assets are not modified."""
from pathlib import Path
from PIL import Image
import hashlib, json
root = Path(__file__).resolve().parents[1]
out = root / 'assets/tv'
out.mkdir(exist_ok=True)
manifest = []
names = ['room-entrance','room-make','room-take','room-wake','tag-arch','sign-arch','photo-lines','table','card-rack','color-panel','craft-shelf','record-rack']
for name in names + ['frame-landscape','frame-portrait']:
    source = root / ('assets/higgsfield/web' if name.startswith('frame-') else 'assets/final-design-v3/web') / (name + '.webp')
    im = Image.open(source)
    background = name.startswith('room-')
    dest = out / (name + ('.jpg' if background else '.png'))
    if background:
        im.convert('RGB').save(dest, quality=91, subsampling=0, optimize=True, progressive=False)
    else:
        im.convert('RGBA').save(dest, optimize=True)
        check = Image.open(dest).convert('RGBA')
        assert check.tobytes() == im.convert('RGBA').tobytes(), 'RGBA pixel mismatch'
    manifest.append({'source':str(source.relative_to(root)), 'file':dest.name,'width':im.width,'height':im.height,'bytes':dest.stat().st_size,'alphaPreserved':not background,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
(out / 'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(manifest),'bytes':sum(x['bytes'] for x in manifest),'images':manifest},ensure_ascii=False))

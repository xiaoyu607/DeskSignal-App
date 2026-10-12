"""Generate DeskSignal's original app and menu-bar icons. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw
repo = Path(__file__).resolve().parents[1]
def symbol(size, badge=True, strength=1):
    scale = 4
    im = Image.new('RGBA', (size*scale, size*scale))
    d = ImageDraw.Draw(im)
    def box(coords): return tuple(round(x*size*scale/128) for x in coords)
    if badge: d.rounded_rectangle(box((4,4,124,124)), radius=size*scale/4, fill='#0b3329')
    color = '#79efbb' if badge else (0,0,0,round(255*strength))
    w = round(11*size*scale/128)
    for coords in [[(35,40),(35,71),(38,82),(46,89),(55,91),(85,91)],[(55,27),(55,58),(58,69),(66,76),(75,78),(102,78)]]:
        points = [(round(x*size*scale/128),round(y*size*scale/128)) for x,y in coords]
        d.line(points,fill=color,width=w,joint='curve')
        for x,y in points: d.ellipse((x-w/2,y-w/2,x+w/2,y+w/2),fill=color)
    d.ellipse(box((82,26,102,46)),fill='#e0ffc9' if badge else color)
    return im.resize((size,size),Image.Resampling.LANCZOS)
build=repo/'build'; brand=repo/'assets/brand'
build.mkdir(exist_ok=True); brand.mkdir(exist_ok=True)
symbol(1024).save(build/'icon.png'); symbol(256).save(build/'icon.ico', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
symbol(256).save(brand/'icon.png'); symbol(64,False).save(brand/'tray.png')
for name,strength in [('trayTemplate',1),('trayOffTemplate',.4)]:
    for scale,suffix in [(1,''),(2,'@2x')]: symbol(18*scale,False,strength).save(build/f'{name}{suffix}.png')

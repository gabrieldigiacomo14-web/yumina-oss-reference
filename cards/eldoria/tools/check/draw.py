import json,sys
from PIL import Image, ImageDraw
m=json.load(open('full.json')); w,h=m['w'],m['h']
im=Image.frombytes('RGBA',(w,h),open('full.raw','rb').read()).convert('RGB'); d=ImageDraw.Draw(im)
for r in m['rivers']: d.line([tuple(p) for p in r], fill=(110,180,232), width=2)
for r in m['roads']: d.line([tuple(p) for p in r], fill=(232,201,138), width=1)
for k in m['places']:
    x,y=k['p']; c=(255,240,190) if k['k']!='capital' else (255,90,90); d.ellipse([x-2.5,y-2.5,x+2.5,y+2.5],fill=c,outline=(30,20,10))
for k in m['labels']+m['seas']:
    x,y=k['p']; t=str(k['n']); d.text((x-len(t)*3+1,y+1),t,fill=(0,0,0)); d.text((x-len(t)*3,y),t,fill=(255,250,235))
im.save(sys.argv[1] if len(sys.argv)>1 else 'eldoria-overview.png')

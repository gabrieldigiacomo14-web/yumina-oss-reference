from PIL import Image
import base64, io, os, sys
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'crops')
out=sys.argv[1]
lines=["/* Painted art cropped from the creator's own interface mockups. Not sent to the AI. */","export var BC_IMG = {"]
tot=0
for f in sorted(os.listdir(D)):
    k=f[:-4]; im=Image.open(os.path.join(D,f)).convert('RGB')
    if im.width>440: im=im.resize((440,round(im.height*440/im.width)),Image.LANCZOS)
    b=io.BytesIO(); im.save(b,'JPEG',quality=74,optimize=True,progressive=True)
    s=base64.b64encode(b.getvalue()).decode(); tot+=len(s)
    lines.append('  %s: "data:image/jpeg;base64,%s",'%(k,s))
lines.append("};")
open(out,'w').write('\n'.join(lines)+'\n'); print('bytes',tot)

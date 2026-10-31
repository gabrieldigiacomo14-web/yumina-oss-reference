from PIL import Image, ImageDraw
import os, sys
U='/root/.claude/uploads/78665f8d-2367-5b13-bb5f-b0ce909d62ec/'
IM={'pack':'0826df0e','map':'87397a3b','grim':'43816467','story':'bcba92a4','final':'9dc56e6e','origin':'91701c66','magic':'91a091d3','bg':'f6c5e55c','ident':'0b24622d','home':'6e115008'}
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'crops')
# key: (image, box)
C={
 # home tiles: art portion only (text sits left, chevron right edge)
 'tile_adventure':('map',(450,232,668,342)), 'tile_grimoire':('grim',(600,20,930,200)),
 'tile_character':('final',(38,540,452,760)), 'tile_squad':('bg',(674,305,905,462)),
 'tile_inventory':('pack',(488,446,665,540)), 'tile_market':('home',(768,881,878,965)),
 'tile_bank':('pack',(814,1052,915,1140)), 'tile_missions':('home',(808,989,880,1073)),
 'tile_map':('map',(48,609,300,675)), 'tile_relationships':('home',(815,1097,880,1181)),
 'tile_more':('home',(560,1206,875,1284)),
 'location':('map',(450,232,668,342)),
 'purse':('pack',(560,182,905,312)),
 'inv_head':('pack',(488,446,665,540)),
 'market_head':('home',(768,881,878,965)),
 'bank_head':('pack',(814,1052,915,1140)),
 'bank_balance':('pack',(816,1170,898,1262)),
 'place_torren':('map',(48,525,300,590)), 'place_capital':('map',(48,609,300,675)),
 'place_lake':('map',(48,693,300,759)), 'place_rumor':('map',(48,1102,300,1168)),
 'place_detail':('map',(55,1392,180,1508)),
 'story_head':('story',(500,345,905,500)),
 'act_rest':('story',(322,1068,428,1162)), 'act_eat':('story',(742,1068,880,1162)),
 'act_train':('story',(290,1188,428,1282)), 'act_out':('story',(742,1188,880,1282)),
 'region_forsaken':('origin',(42,562,316,664)), 'region_common':('origin',(346,562,610,664)),
 'region_noble':('origin',(642,562,906,664)),
 'place_rural':('origin',(268,940,400,1008)), 'place_outskirts':('origin',(718,940,850,1008)),
 'place_market':('origin',(268,1032,400,1102)), 'place_castle':('origin',(712,1032,850,1102)),
 'origin_about':('origin',(640,1136,912,1322)),
 'bg_head':('bg',(674,305,905,462)),
 'final_portrait':('final',(38,478,452,838)),
 'ident_appear':('ident',(560,1078,820,1162)),
 'grim_head':('grim',(520,10,935,205)),
 'map_head':('map',(470,10,800,210)),
}
# Trim every crop inward so no mockup frame lines, corner ornaments, arrows or lettering ride along.
EXTRA = {  # (left, top, right, bottom) extra inset in source pixels
 'place_detail': (14,10,4,4), 'purse': (4,4,16,6), 'origin_about': (4,4,14,12), 'grim_head': (4,4,16,4), 'tile_grimoire': (4,4,16,4),
 'tile_squad': (4,4,12,8), 'bg_head': (4,4,12,8), 'final_portrait': (4,4,12,4), 'tile_character': (4,4,12,4), 'map_head': (4,10,14,4),
 'bank_balance': (4,4,10,6), 'bank_head': (4,4,10,6), 'tile_bank': (4,4,10,6), 'act_eat': (4,4,14,12), 'inv_head': (4,4,10,4), 'tile_inventory': (4,4,10,4),
 'region_forsaken': (4,4,10,4), 'region_common': (4,4,10,4), 'region_noble': (4,4,10,4), 'story_head': (4,4,12,4), 'place_torren': (8,4,4,4),
 'tile_missions': (6,4,4,4), 'tile_relationships': (4,4,4,4), 'ident_appear': (4,4,30,4),
}
for k,(im,box) in list(C.items()):
    e = EXTRA.get(k, (0,0,0,0)); base = 6
    C[k] = (im, (box[0]+base+e[0], box[1]+base+e[1], box[2]-base-e[2], box[3]-base-e[3]))
for k,(im,box) in C.items():
    img=Image.open(U+IM[im]+'-image.png').crop(box)
    img.save(f'{OUT}/{k}.jpg',quality=82)
if len(sys.argv)>1:
    keys=list(C); W=4; cell=(300,170)
    sheet=Image.new('RGB',(W*cell[0],((len(keys)+W-1)//W)*cell[1]),'white'); d=ImageDraw.Draw(sheet)
    for i,k in enumerate(keys):
        t=Image.open(f'{OUT}/{k}.jpg'); t.thumbnail((cell[0]-10,cell[1]-25))
        x=(i%W)*cell[0]; y=(i//W)*cell[1]; sheet.paste(t,(x+5,y+5)); d.text((x+5,y+cell[1]-18),k,fill='black')
    sheet.save(sys.argv[1])

import {orientArtworkMedia,applyOrientationInEnvelope} from './display-orientation.mjs';
import {safeImageUrl} from './work-view.mjs?v=20261119-rotation1';
import {FIXTURE_SIZE,FIXTURE_TYPES,FIXTURE_BAYS,fixtureSlot,fixtureLabel} from './fixture-layout.mjs';
import {creatorLabel,creatorCaption,artworkLabel} from './work-info.mjs';
import {hangingPoint} from './hanging.mjs';
import {ASSETS} from './assets.mjs?v=higgsfield1';
import {fixtureSkinName,stationImageUrl,registeredFixtureSlot,registeredFixtureBay,FIXTURE_IMAGE_REGISTRATION,fixtureFastenerWindows} from './fixture-skins.mjs';
const fixtureNode=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!==undefined)e.textContent=text;return e;};
export function fixtureImageUrl(type,skin=fixtureSkinName()){return stationImageUrl(FIXTURE_TYPES[type].asset,skin);}
export function fixtureArtwork(work){
 const cut=work.media?.cutout;
 return orientArtworkMedia(['object','special'].includes(work.displayType)&&cut?.status==='approved'&&work.displayPreference!=='original'?{url:cut.url,width:cut.width,height:cut.height,cutout:true,contact:cut.contact||{x:.5,y:1}}:{url:work.imageUrl,width:work.width,height:work.height,cutout:false},work.displayRotation);
}
/** Every coordinate is relative to the same 1200×1000 camera, in review and public. */
export function fixtureArtworkGeometry(work,{skin=fixtureSkinName()}={}){
 const designedSlot=registeredFixtureSlot(work.placement,fixtureSlot(work.placement),skin);if(!designedSlot)throw new Error('전시 자리를 찾을 수 없습니다.');
 const media=fixtureArtwork(work),s=designedSlot.mode==='table'&&media.cutout?{...designedSlot,mode:'object'}:designedSlot,scale=Math.min(1,Math.max(.4,work.displayScale||1));
 const boundW=s.width*12,boundH=s.height*10;let fit=Math.min(boundW/media.width,boundH/media.height)*scale;
 if(s.mode==='table'&&skin!=='prototype'){
  const frame=ASSETS.frames[media.width/media.height<.95?'portrait':'landscape'],a=frame.aperture;
  const f=Math.min(boundW/frame.width,boundH/frame.height)*scale,fw=frame.width*f,fh=frame.height*f,fx=s.x*12-fw/2,fy=s.y*10-fh;
  const aw=fw*a.width,ah=fh*a.height,k=Math.min(aw/media.width,ah/media.height),width=media.width*k,height=media.height*k;
  const x=fx+fw*a.x+(aw-width)/2,y=fy+fh*a.y+(ah-height)/2;
  return {slot:s,media,left:x/12,top:y/10,width:width/12,height:height/10,anchor:{x:s.x,y:s.y},bottom:true,frame:{asset:frame,left:fx/12,top:fy/10,width:fw/12,height:fh/10,aperture:{left:(fx+fw*a.x)/12,top:(fy+fh*a.y)/10,width:aw/12,height:ah/10}}};
 }
 if(s.mode==='object'&&media.cutout){fit=Math.min(fit,boundW/(media.width*2*Math.max(media.contact.x,1-media.contact.x)),30/(media.height*Math.max(.001,1-media.contact.y)));}
 const hanging=s.mode==='hang'&&media.cutout&&hangingPoint(media.contact?.hang);
 if(hanging){
  // Fit around the existing hook, reserving a disjoint envelope for each slot.
  // A small amount above the hook admits an off-centre hole without crossing the rail.
  fit=Math.min(fit,boundW/(2*media.width*Math.max(hanging.x,1-hanging.x)),boundH/(media.height*Math.max(.001,1-hanging.y)),30/(media.height*Math.max(.001,hanging.y)));
  const width=media.width*fit,height=media.height*fit;
  return {slot:s,media,left:s.x-width*hanging.x/12,top:s.y-height*hanging.y/10,width:width/12,height:height/10,anchor:{x:s.x,y:s.y},bottom:false,hanging};
 }
 const width=media.width*fit,height=media.height*fit,bottom=['object','table'].includes(s.mode)||s.align==='bottom';
 let x=s.x*12-width/2,y=bottom?s.y*10-height:s.y*10;
 if(s.mode==='object'&&media.cutout){x=s.x*12-width*media.contact.x;y=s.y*10-height*media.contact.y;}
 // Renderer never expands a crop outside its designed slot, including contact calibration.
 x=Math.max(s.x*12-boundW/2,Math.min(x,s.x*12+boundW/2-width));
 if(!(s.mode==='object'&&media.cutout))y=Math.max(bottom?s.y*10-boundH:s.y*10,Math.min(y,(bottom?s.y*10:s.y*10+boundH)-height));
 return {slot:s,media,left:x/12,top:y/10,width:width/12,height:height/10,anchor:{x:s.x,y:s.y},bottom};
}
export function createFixtureWork(work,{onOpen,arrival=false,focusId,showCredit=true,skin=fixtureSkinName()}={}){
 const g=fixtureArtworkGeometry(work,{skin}),b=fixtureNode('button','g-fixture-work'),s=g.slot;b.type='button';
 Object.assign(b.dataset,{workId:work.id,slot:s.id,mode:s.mode,cutout:String(g.media.cutout)});
 Object.assign(b.style,{left:g.left+'%',top:g.top+'%',width:g.width+'%',height:g.height+'%'});
 b.style.setProperty('--turn',s.rotate+'deg');
 b.setAttribute('aria-label',`${artworkLabel(work)}, ${creatorCaption(work)}, 작품 크게 감상하기`);
 b.title=artworkLabel(work);
 if(focusId===work.id)b.classList.add('is-review-focus');
 if(arrival&&!(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion:reduce)').matches)){
  b.classList.add('g-fixture-arrival');
  b.addEventListener('animationend',()=>b.classList.remove('g-fixture-arrival'),{once:true});
 }
 const img=fixtureNode('img');img.src=safeImageUrl(g.media.url);img.alt='';img.draggable=false;applyOrientationInEnvelope(img,g.media);
 img.onerror=()=>{if(g.media.cutout){const fallback=createFixtureWork({...work,displayPreference:'original'},{onOpen,focusId,skin});b.replaceWith(fallback);}else b.classList.add('has-image-error');};
 if(g.frame){
  const relative=(node,r)=>Object.assign(node.style,{left:(r.left-g.left)/g.width*100+'%',top:(r.top-g.top)/g.height*100+'%',width:r.width/g.width*100+'%',height:r.height/g.height*100+'%'});
  const mat=fixtureNode('span','g-raster-frame-mat');relative(mat,g.frame.aperture);b.append(mat);
  const border=fixtureNode('img','g-raster-frame');border.src=g.frame.asset.url;border.alt='';relative(border,g.frame);b.append(border);
 }
 b.append(img);
 if(showCredit&&work.creatorRole==='photographer'){
  const credit=fixtureNode('span','g-photo-credit',creatorCaption(work));
  // Seat the HTML credit beneath the frame, not inside the photograph.
  if(g.frame)credit.style.top=((g.frame.top+g.frame.height-g.top)/g.height*100)+'%';
  b.append(credit);
 }
 if(skin==='prototype'){
  if(s.mode==='clip')b.append(fixtureNode('i','g-live-clip'));
  if(s.mode==='hang')b.append(fixtureNode('i','g-live-hook'));
  if(['card','record'].includes(s.mode))b.append(fixtureNode('i','g-card-lip'));
 }
 if(s.mode==='object'){
  const shadow=fixtureNode('i','g-fixture-contact'),contact=g.media.contact||{x:.5,y:1};
  Object.assign(shadow.style,{left:(contact.x*100-28)+'%',top:(contact.y*100-3)+'%',bottom:'auto'});
  b.append(shadow);
 }
 const badge=fixtureNode('span','g-work-number',String(work.labelNumber||'').padStart(2,'0'));b.append(badge);
 b.onclick=()=>onOpen?.(work.id,b);return b;
}
// Only the operator-curated 18-photo collection uses one caption per author row.
// Ordinary submissions and the administrator's inspection view keep their captions.
export function photoCollectionRows(f,works){
 if(f.type!=='photo-lines')return [];
 const rows=[];
 for(let row=0;row<3;row++){
  const members=works.filter(w=>Math.floor((Number(w.placement?.slotId?.slice(1))-1)/3)===row);
  if(!members.length||!members.every(w=>/^chalkak-2026-(0[1-9]|1[0-8])$/.test(w.id)&&w.creditOnly===true&&w.creatorRole==='photographer'&&w.collection==='사진동아리 찰칵 · 올해의 베스트컷'&&creatorCaption(w)===creatorCaption(members[0])))continue;
  rows.push({row,works:members,caption:creatorCaption(members[0])});
 }
 return rows;
}
export function createFixtureElement(f,works,{onOpen,onZoom,focusId,arrivalIds=new Set(),assetUrl,skin=fixtureSkinName()}={}){
 const def=FIXTURE_TYPES[f.type],bay=registeredFixtureBay(f.bay,FIXTURE_BAYS[f.bay],skin),wrap=fixtureNode('section','g-fixture');
 wrap.setAttribute('aria-label',def.name);Object.assign(wrap.dataset,{fixture:f.id,type:f.type,room:f.room,skin});
 Object.assign(wrap.style,{left:bay.x/16+'%',top:bay.y/9+'%',width:bay.width/16+'%',height:bay.height/9+'%',zIndex:bay.depth});
 const image=fixtureNode('img','g-fixture-body');image.src=assetUrl||fixtureImageUrl(f.type,skin);image.alt='';image.width=FIXTURE_SIZE.width;image.height=FIXTURE_SIZE.height;image.draggable=false;wrap.append(image);
 const title=fixtureNode('div','g-fixture-sign',def.name),sign=skin==='reference'&&FIXTURE_IMAGE_REGISTRATION[f.type]?.sign;
 if(sign)Object.assign(title.style,{top:sign.top+'%',left:sign.left+'%',width:sign.width+'%'});wrap.append(title);
 const assigned=works.filter(w=>w.placement?.room===f.room&&w.placement?.fixtureId===f.id);
 const rows=document.body?.classList.contains('g-public')?photoCollectionRows(f,assigned):[],rowIds=new Set(rows.flatMap(r=>r.works.map(w=>w.id)));
 // Leave breathing room between the photographs and the row's separate HTML label.
 for(const w of assigned){const grouped=rowIds.has(w.id),node=createFixtureWork(grouped?{...w,displayScale:(w.displayScale||1)*.85}:w,{onOpen,focusId,skin,showCredit:!grouped,arrival:arrivalIds.has(w.id)});if(grouped&&(Number(w.placement.slotId.slice(1))-1)%3===0)node.style.left=(parseFloat(node.style.left)+1.4)+'%';wrap.append(node);}
 for(const r of rows){
  const first={...r.works[0].placement,slotId:'s'+String(r.row*3+1).padStart(2,'0')};
  const a=registeredFixtureSlot(first,fixtureSlot(first),skin);
  const credit=fixtureNode('div','g-photo-row-credit');credit.dataset.photographerRow=String(r.row+1);credit.setAttribute('aria-label',r.caption);
  credit.append(fixtureNode('small','','PHOTOGRAPHER'),fixtureNode('span','','촬영'),fixtureNode('strong','',r.works[0].creatorDisplayName||r.caption.replace(/^촬영 · /,'')));
  Object.assign(credit.style,{left:'12.2%',top:a.y+'%',width:'9.7%',height:'12.8%'});wrap.append(credit);
  // Hang the HTML name card using the same photographed wooden clip as the photos.
  const source=fixtureFastenerWindows(f.type,skin)[r.row*3];
  if(source){const crop=fixtureNode('span','g-image-fastener g-name-card-clip'),part=fixtureNode('img');crop.setAttribute('aria-hidden','true');
   Object.assign(crop.style,{left:'15.25%',top:source.y+'%',width:source.width+'%',height:source.height+'%'});
   part.src=image.src;part.alt='';Object.assign(part.style,{left:-source.x/source.width*100+'%',top:-source.y/source.height*100+'%',width:100/source.width*100+'%',height:100/source.height*100+'%'});crop.append(part);wrap.append(crop);
  }
 }
 // Reuse the actual generated pixels above the photos; no CSS-drawn clip/hook substitute.
 for(const r of fixtureFastenerWindows(f.type,skin)){
  const crop=fixtureNode('span','g-image-fastener'),part=fixtureNode('img');crop.setAttribute('aria-hidden','true');
  Object.assign(crop.style,{left:r.x+'%',top:r.y+'%',width:r.width+'%',height:r.height+'%'});
  part.src=image.src;part.alt='';Object.assign(part.style,{left:-r.x/r.width*100+'%',top:-r.y/r.height*100+'%',width:100/r.width*100+'%',height:100/r.height*100+'%'});crop.append(part);wrap.append(crop);
 }
 if(onZoom){const zoom=fixtureNode('button','g-fixture-zoom',`${def.name} · ${assigned.length}/${def.slots.length} ↗`);zoom.type='button';zoom.setAttribute('aria-label',def.name+' 가까이 보기');zoom.onclick=()=>onZoom(f);wrap.append(zoom);}
 return wrap;
}

import {CATEGORY_INFO,programFor} from './programs.mjs';
// Layout v3 is additive. Layouts 1 and 2 keep their original eight positions.
export const FIXTURE_VERSION=3;
export const FIXTURE_SIZE={width:1200,height:1000};
export const FIXTURE_BAYS=Object.freeze([
 {id:'west',x:45,y:210,width:760,height:633.333,depth:3},
 {id:'east',x:850,y:270,width:680,height:566.667,depth:2},
]);
// Coordinates are normalized in the separate transparent fixture image.
// Slots include image space; ties/clips/ledges are in the structural layer.
function grid(cols,rows,{left=19,right=81,top=31,bottom=68,width=14,height=21,mode='hang',ratio=1}={}){
 return Array.from({length:cols*rows},(_,i)=>({id:'s'+String(i+1).padStart(2,'0'),x:left+(right-left)*(i%cols)/Math.max(1,cols-1),y:top+(bottom-top)*Math.floor(i/cols)/Math.max(1,rows-1),width,height,mode,ratio,rotate:mode==='clip'?[-1.4,.7,-.6,1.1][i%4]:0}));
}
export const FIXTURE_TYPES=Object.freeze({
 'tag-arch':{name:'네임택 아치 걸이',asset:'tag-arch',slots:grid(4,2,{left:21,right:79,top:33,bottom:57,width:13,height:19,ratio:.7})},
 'sign-arch':{name:'역명판 아치 걸이',asset:'sign-arch',slots:grid(2,2,{left:31,right:69,top:33,bottom:57,width:30,height:19,ratio:1.7})},
 'photo-lines':{name:'세 줄 사진 집게',asset:'photo-lines',slots:grid(3,3,{left:26,right:74,top:29,bottom:64,width:19,height:16,mode:'clip',ratio:1.2})},
 'table-frames':{name:'탁상 액자 테이블',asset:'table',slots:grid(4,1,{left:21,right:79,top:51,width:17,height:26,mode:'table',ratio:.9})},
 'card-rack':{name:'소형 미래특허 카드 진열대',asset:'card-rack',slots:grid(4,3,{left:21,right:79,top:34,bottom:66,width:16.5,height:10.6,mode:'card',ratio:1.58})},
 'color-panel':{name:'색칠탐험 집게 패널',asset:'color-panel',slots:grid(3,2,{left:26,right:74,top:32,bottom:59,width:19,height:23,mode:'clip',ratio:.75})},
 'craft-shelf':{name:'공예품 원목 선반',asset:'craft-shelf',slots:grid(3,2,{left:26,right:74,top:39,bottom:66,width:19,height:24,mode:'object',ratio:1})},
 'poster-stand':{name:'독립형 포스터 스탠드',asset:'table',slots:grid(2,1,{left:31,right:69,top:51,width:28,height:42,mode:'table',ratio:.7})},
 'record-rack':{name:'레코드 재킷 진열대',asset:'record-rack',slots:grid(3,2,{left:26,right:74,top:37,bottom:65,width:19,height:23,mode:'record',ratio:1})},
});
export const fixtureTypeFor=work=>work.fixtureType&&programFor(work.boothId)?.fixtures.includes(work.fixtureType)?work.fixtureType:programFor(work.boothId)?.fixtures[0];
export const isFixturePlacement=p=>p?.layoutVersion===3;
export const fixtureKey=p=>`${p.room}/${p.fixtureId}`;
export const placementKey=p=>`${p.layoutVersion||1}/${p.room}/${p.fixtureId||''}/${p.slotId}`;
export function fixtureSlot(p){return FIXTURE_TYPES[p?.fixtureType]?.slots.find(s=>s.id===p.slotId);}
export function fixtureLabel(p){const f=FIXTURE_TYPES[p?.fixtureType];return f?`${p.category} ${p.roomNumber}관 · ${f.name} ${p.bay+1} · ${p.slotId}`:`${p?.room}관 / ${p?.slotId}`;}
export function fixtureInstances(works,room){
 const map=new Map();
 for(const w of works){const p=w.placement;if(isFixturePlacement(p)&&(!room||p.room===room)&&!map.has(fixtureKey(p)))map.set(fixtureKey(p),{id:p.fixtureId,type:p.fixtureType,bay:p.bay,room:p.room,category:p.category,roomNumber:p.roomNumber});}
 return [...map.values()].sort((a,b)=>a.roomNumber-b.roomNumber||a.bay-b.bay);
}
export function validateFixturePlacements(works){
 const occupied=new Set(),bayKinds=new Map();
 for(const w of works){const p=w.placement;if(!isFixturePlacement(p))continue;
  if(!Object.hasOwn(CATEGORY_INFO,p.category)||p.room!==`${CATEGORY_INFO[p.category].id}-${p.roomNumber}`||!Number.isInteger(p.roomNumber)||p.roomNumber<1||!Number.isInteger(p.bay)||!FIXTURE_BAYS[p.bay]||p.fixtureId!==`fixture-${p.bay+1}`||!fixtureSlot(p))throw new Error('전시 구조물 배치 정보가 올바르지 않습니다.');
  const fk=fixtureKey(p),pk=placementKey(p);if(occupied.has(pk))throw new Error('중복 구조물 자리가 발견되었습니다.');
  if(bayKinds.has(fk)&&bayKinds.get(fk)!==p.fixtureType)throw new Error('구조물 종류가 일치하지 않습니다.');
  occupied.add(pk);bayKinds.set(fk,p.fixtureType);
 }return true;
}
/** Called inside the existing ScriptLock transaction, not from a public browser. */
export function allocateFixture(works,work){
 const existing=works.find(w=>w.id===work.id&&w.placement);if(existing)return {...existing.placement};
 const program=programFor(work.boothId),kind=fixtureTypeFor(work),def=FIXTURE_TYPES[kind];
 if(!program||program.category!==work.category||!def)throw new Error('프로그램과 전시 구조물을 확인해 주세요.');
 validateFixturePlacements(works);
 const instances=fixtureInstances(works).filter(f=>f.category===work.category);
 let chosen,slot;
 for(const f of instances.filter(f=>f.type===kind)){
  const occupied=new Set(works.filter(w=>w.placement?.room===f.room&&w.placement?.fixtureId===f.id).map(w=>w.placement.slotId));
  slot=def.slots.find(s=>!occupied.has(s.id));if(slot){chosen=f;break;}
 }
 if(!chosen){
  let number=1,bay;
  while(true){const used=new Set(instances.filter(f=>f.roomNumber===number).map(f=>f.bay));bay=FIXTURE_BAYS.findIndex((_,i)=>!used.has(i));if(bay>=0)break;number++;}
  chosen={id:`fixture-${bay+1}`,type:kind,bay,room:`${CATEGORY_INFO[work.category].id}-${number}`,category:work.category,roomNumber:number};slot=def.slots[0];
 }
 return {layoutVersion:3,category:work.category,booth:work.boothId,room:chosen.room,roomNumber:chosen.roomNumber,fixtureId:chosen.id,fixtureType:kind,bay:chosen.bay,slotId:slot.id};
}
export function fixtureRooms(works){
 const map=new Map();for(const w of works){const p=w.placement;if(isFixturePlacement(p))map.set(p.room,{id:p.room,category:p.category,number:p.roomNumber,layoutVersion:3});}
 // Once both fixtures are full, expose the next empty room without renumbering.
 for(const category of Object.keys(CATEGORY_INFO)){
  const all=[...map.values()].filter(r=>r.category===category);if(!all.length)continue;
  const last=all.reduce((a,b)=>a.number>b.number?a:b),instances=fixtureInstances(works,last.id);
  if(instances.length===FIXTURE_BAYS.length&&instances.every(f=>works.filter(w=>w.placement?.room===f.room&&w.placement?.fixtureId===f.id).length===FIXTURE_TYPES[f.type].slots.length))map.set(`${CATEGORY_INFO[category].id}-${last.number+1}`,{id:`${CATEGORY_INFO[category].id}-${last.number+1}`,category,number:last.number+1,layoutVersion:3});
 }
 return [...map.values()];
}
export function fixtureCatalog(works){
 return {rooms:fixtureRooms(works),fixtures:fixtureInstances(works)};
}

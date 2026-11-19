import {displayMediaSize} from './display-orientation.mjs';
import {CATEGORY_INFO,programFor} from './programs.mjs';
// Layout v3 is additive. Layouts 1 and 2 keep their original eight positions.
export const FIXTURE_VERSION=3;
// Allocation evolves independently of the saved image/slot coordinate version.
export const ALLOCATION_VERSION=3;
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
// Only combinations supported by the existing independent raster layers are enabled.
// Hanging pieces and craft shelves can share the two independent room bays.
export const FIXTURE_RULES=Object.freeze({
 'tag-arch':{types:['frame','object'],with:['sign-arch','craft-shelf','table-frames'],ratio:[.25,4]},
 'sign-arch':{types:['frame','object'],with:['tag-arch','craft-shelf','table-frames'],ratio:[.25,4]},
 'craft-shelf':{types:['frame','object','special'],with:['table-frames','tag-arch','sign-arch'],ratio:[.25,4]},
 'photo-lines':{types:['frame'],with:['table-frames','record-rack'],ratio:[.25,4]},
 'table-frames':{types:['frame','object','special'],with:['craft-shelf','tag-arch','sign-arch','photo-lines','record-rack','poster-stand','card-rack','color-panel'],ratio:[.25,4]},
 'poster-stand':{types:['frame','easel'],with:['table-frames'],ratio:[.15,6]},
 'card-rack':{types:['frame','object'],with:['color-panel','table-frames'],ratio:[.25,4]},
 'color-panel':{types:['frame'],with:['card-rack','table-frames'],ratio:[.25,4]},
 'record-rack':{types:['frame','special'],with:['table-frames','photo-lines'],ratio:[.25,4]},
});
export function fixtureMediaRatio(work){
 const size=displayMediaSize(work);return size.width/size.height;
}
export function compatibleFixtures(work){
 const p=programFor(work.boothId),ratio=fixtureMediaRatio(work),type=work.displayType==='auto'?'frame':work.displayType||'frame';
 if(!p||p.category!==work.category||!Number.isFinite(ratio)||ratio<=0)return [];
 // Transparent objects are contained inside the existing slot without cropping.
 // A long keychain must not lose every display option after its background is removed.
 const containedObject=['object','special'].includes(type);
 return p.fixtures.filter(id=>{const rule=FIXTURE_RULES[id];return rule.types.includes(type)&&(containedObject||ratio>=rule.ratio[0]&&ratio<=rule.ratio[1]);});
}
export function recommendedFixture(work){
 const candidates=compatibleFixtures(work),ratio=fixtureMediaRatio(work);
 // A badly letterboxed default can yield to a supported frame/stand; never crop art.
 return [...candidates].sort((a,b)=>{
  const fit=id=>Math.min(ratio/FIXTURE_TYPES[id].slots[0].ratio,FIXTURE_TYPES[id].slots[0].ratio/ratio);
  return Number(fit(a)<.3)-Number(fit(b)<.3)||candidates.indexOf(a)-candidates.indexOf(b);
 })[0];
}
export const fixtureTypeFor=work=>work.fixtureType||recommendedFixture(work);
export const fixturesCanShare=(a,b)=>a===b||!!(FIXTURE_RULES[a]?.with.includes(b)&&FIXTURE_RULES[b]?.with.includes(a));
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
// Fill the selected fixture type in earlier MAKE rooms before opening another.
// Never change a hanging work to shelf display just because a shelf has space.
function makeRoomChoice(works,instances,kind){
 const existing=f=>{
  const def=FIXTURE_TYPES[f.type],used=new Set(works.filter(w=>w.placement?.room===f.room&&w.placement?.fixtureId===f.id).map(w=>w.placement.slotId)),slot=def.slots.find(s=>!used.has(s.id));
  return slot?{chosen:f,slot,remainingSlots:def.slots.length-used.size,action:'existing-slot'}:null;
 };
 const create=(number,bay,action)=>({chosen:{id:`fixture-${bay+1}`,type:kind,bay,room:`make-${number}`,category:'MAKE',roomNumber:number},slot:FIXTURE_TYPES[kind].slots[0],remainingSlots:FIXTURE_TYPES[kind].slots.length,action});
 const numbers=[...new Set(instances.map(f=>f.roomNumber))].sort((a,b)=>a-b);
 for(const number of numbers){
  const occupants=instances.filter(f=>f.roomNumber===number);
  for(const f of occupants.filter(f=>f.type===kind)){const choice=existing(f);if(choice)return choice;}
  const bay=FIXTURE_BAYS.findIndex((_,i)=>!occupants.some(f=>f.bay===i));
  if(bay>=0&&occupants.every(f=>fixturesCanShare(kind,f.type)))return create(number,bay,'new-fixture');
 }
 return create(numbers.length?Math.max(...numbers)+1:1,0,'new-room');
}
/** Pure, read-only plan. Approval reruns this against the locked current state. */
export function planFixturePlacement(works,work){
 const existing=works.find(w=>w.id===work.id&&isFixturePlacement(w.placement));
 const saved=existing?.placement||work.placement;
 const compatible=compatibleFixtures(work),recommended=recommendedFixture(work);
 if(isFixturePlacement(saved)){
  const used=works.filter(w=>w.placement?.room===saved.room&&w.placement?.fixtureId===saved.fixtureId).length;
  return {placement:{...saved},action:'fixed',recommendedFixture:recommended||saved.fixtureType,compatibleFixtures:compatible,remainingSlots:FIXTURE_TYPES[saved.fixtureType].slots.length-used,newFixture:false,newRoom:false,reason:'비공개 작품을 포함하여 이미 배정된 구조물·슬롯을 그대로 유지합니다.'};
 }
 const program=programFor(work.boothId),kind=fixtureTypeFor(work),def=FIXTURE_TYPES[kind];
 if(!program||program.category!==work.category||!def||!compatible.includes(kind))throw new Error('이 프로그램·전시 방식·이미지 비율에 맞는 구조물이 없습니다. 호환 구조물 또는 평면형을 선택해 주세요.');
 validateFixturePlacements(works);
 const instances=fixtureInstances(works).filter(f=>f.category===work.category);
 let chosen,slot,remainingSlots,action='existing-slot',separated=false;
 if(work.category==='MAKE')({chosen,slot,remainingSlots,action}=makeRoomChoice(works,instances,kind));
 else for(const f of instances.filter(f=>f.type===kind)){
  const occupied=new Set(works.filter(w=>w.placement?.room===f.room&&w.placement?.fixtureId===f.id).map(w=>w.placement.slotId));
  slot=def.slots.find(s=>!occupied.has(s.id));if(slot){chosen=f;remainingSlots=def.slots.length-occupied.size;break;}
 }
 if(!chosen){
  let number=1,bay=0;
  const roomNumbers=[...new Set(instances.map(f=>f.roomNumber))].sort((a,b)=>a-b);
  let matched=false;
  for(const n of roomNumbers){
   const occupants=instances.filter(f=>f.roomNumber===n),used=new Set(occupants.map(f=>f.bay));
   const free=FIXTURE_BAYS.findIndex((_,i)=>!used.has(i));
   if(free<0)continue;
   if(!occupants.every(f=>fixturesCanShare(kind,f.type))){separated=true;continue;}
   number=n;bay=free;matched=true;break;
  }
  if(!matched)number=roomNumbers.length?Math.max(...roomNumbers)+1:1;
  action=matched?'new-fixture':'new-room';remainingSlots=def.slots.length;
  chosen={id:`fixture-${bay+1}`,type:kind,bay,room:`${CATEGORY_INFO[work.category].id}-${number}`,category:work.category,roomNumber:number};slot=def.slots[0];
 }
 const placement={layoutVersion:3,allocationVersion:ALLOCATION_VERSION,category:work.category,booth:work.boothId,room:chosen.room,roomNumber:chosen.roomNumber,fixtureId:chosen.id,fixtureType:chosen.type,bay:chosen.bay,slotId:slot.id};
 const reason=action==='existing-slot'?'같은 구조물의 남은 슬롯을 사용합니다.':action==='new-fixture'?'작품이 배정되지 않은 자리에 구조물을 추가합니다.':separated?'작품 크기와 구조물 구성이 어울리도록 별도 전시실을 엽니다.':'선택한 전시 형태의 빈칸과 구조물 자리가 없어 새 전시실을 엽니다.';
 return {placement,action,recommendedFixture:recommended,compatibleFixtures:compatible,remainingSlots,newFixture:action!=='existing-slot',newRoom:action==='new-room',reason};
}
/** Must be called inside the existing ScriptLock transaction for approval. */
export function allocateFixture(works,work){
 const existing=works.find(w=>w.id===work.id&&w.placement);if(existing)return {...existing.placement};
 return planFixturePlacement(works,work).placement;
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

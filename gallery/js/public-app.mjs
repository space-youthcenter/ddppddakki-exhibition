import {CATEGORY_INFO,PROGRAMS,programFor} from './programs.mjs';
import {FIXTURE_TYPES} from './fixture-layout.mjs';
import {createFixtureElement,fixtureArtwork} from './fixture-view.mjs?v=20261116-perf1';
import {fixtureSkinName,stationImageUrl} from './fixture-skins.mjs';
import {alignEntranceSigns} from './sign-surfaces.mjs';
import {creatorLabel,creatorCaption,artworkLabel,detailBackground} from './work-info.mjs';
import {GALLERY_CONFIG as config} from './config.mjs';
import {readPublic,validEndpoint,createMetrics} from './public-api.mjs?v=20261116-perf1';
import {PublicGalleryCache} from './public-cache.mjs';
import {CAPACITY,themeFor} from './layout.mjs';
import {ASSETS} from './assets.mjs';
import {createWorkElement,safeImageUrl} from './work-view.mjs';

const $=id=>document.getElementById(id),make=(tag,cls,value)=>{const e=document.createElement(tag);e.className=cls||'';if(value!==undefined)e.textContent=value;return e;};
document.body.dataset.imageTheme=fixtureSkinName();
if(fixtureSkinName()==='final')alignEntranceSigns(document);
$('entrance-background').src=stationImageUrl('room-entrance');
const demo=document.body.dataset.demo==='fixtures',demoStore=demo?await new (await import('./station-store.mjs')).StationDemoStore().connect():null;
const publicCache=new PublicGalleryCache(),roomViews=new Map();let renderedRoom=null,renderedKey=null,metricsStarted=false,initialRoomRead=null;const pendingViews=new Set();
const read=(action,args={})=>demo?demoStore.read(action,args):readPublic(config.endpoint,action,args);
// Visitor navigation only: stored category/program IDs and placements stay unchanged.
const visitorCategories=['MAKE','TAKE','WAKE'];
const visitorWorks=()=>catalog.works.filter(w=>visitorCategories.includes(w.category));
let roomFixtures=[],currentCategory='MAKE',alignOnLoad=false,metricsState=null;
let catalog={revision:0,roomsOpened:1,works:[]},roomWorks=[],currentRoom='make-1',roomRequest=0,detailRequest=0,activeId=null,detail,returnFocus,returnView,lastRevision=-1,refreshing=false;
const metrics=createMetrics(demo||config.metricsEnabled!==true?null:config.endpoint),reduced=matchMedia('(prefers-reduced-motion:reduce)');
const status=message=>{$('public-status').textContent=message;$('public-status').hidden=!message;};
function button(text,fn,cls=''){const b=make('button',cls,text);b.type='button';b.onclick=fn;return b;}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,5000);}
function roomMeta(){
 if(typeof currentRoom==='number')return {id:currentRoom,category:'',number:currentRoom,layoutVersion:2};
 const [slug,no]=String(currentRoom).split('-'),category=Object.keys(CATEGORY_INFO).find(k=>CATEGORY_INFO[k].id===slug)||'MAKE';
 return {id:currentRoom,category,number:Number(no)||1,layoutVersion:3};
}
function availableRooms(){const m=roomMeta();return m.layoutVersion===2?Array.from({length:catalog.roomsOpened},(_,i)=>({id:i+1,number:i+1})):([{id:CATEGORY_INFO[m.category].id+'-1',category:m.category,number:1},...(catalog.rooms||[]).filter(r=>r.category===m.category&&r.number>1)]).sort((a,b)=>a.number-b.number);}
function entrance(){
 $('category-doors').replaceChildren();$('category-nav').replaceChildren();
 for(const key of visitorCategories){const c=CATEGORY_INFO[key];
  const count=catalog.works.filter(w=>w.category===key).length;
  const a=make('a','g-category-door');a.href='#'+c.id+'-1';a.style.setProperty('--category',c.color);a.dataset.category=key;a.setAttribute('aria-label',c.label+' 전시관 · 공개 작품 '+count+'개');
  const arch=make('img','g-category-arch');arch.src='./assets/final-design-v3/web/arch-'+c.id+'.webp';arch.alt='';arch.width=1086;arch.height=1448;
  const copy=make('span','g-category-copy'),platform=make('small','g-category-platform','PLATFORM 0'+(visitorCategories.indexOf(key)+1)),arrow=make('span','g-category-arrow','→');arrow.setAttribute('aria-hidden','true');
  copy.append(platform,make('strong','',c.label),make('span','g-category-count',count+'개의 작품'),arrow);a.append(arch,copy);$('category-doors').append(a);
  const nav=make('a','',c.label);nav.href=a.href;nav.style.setProperty('--category',c.color);nav.dataset.category=key;$('category-nav').append(nav);
 }
 if(catalog.works.some(w=>w.placement.layoutVersion!==3)){const a=make('a','','기존 전시실');a.href='#room-1';$('category-nav').append(a);}
 const count=visitorWorks().length;$('entrance-total').textContent=count?'세 전시관에 '+count+'개의 이야기가 도착했어요':'세 전시관이 첫 번째 작품을 기다립니다';
}
async function refreshMetrics(){
 const output=$('visitor-total');if(!output||demo)return;
 try{const value=await read('stats');if(!Number.isInteger(value.totalSessions)||!Number.isInteger(value.todaySessions))throw new Error('invalid');metricsState=value;
  output.textContent='누적 관람 '+value.totalSessions.toLocaleString('ko-KR')+'세션 · 오늘 '+value.todaySessions.toLocaleString('ko-KR')+(value.enabled?'':' · 집계 중단');
  metrics.setEnabled(config.metricsEnabled===true&&value.enabled===true);for(const id of pendingViews)if(catalog.works.some(w=>w.id===id))metrics.record('view',id);pendingViews.clear();
 }catch{output.textContent='관람 집계를 불러오지 못했습니다';metrics.setEnabled(false);metricsState=null;}
}
function shell(){
 const meta=roomMeta(),legacy=meta.layoutVersion!==3,theme=themeFor(legacy?currentRoom:meta.number),count=catalog.works.filter(w=>w.placement.room===currentRoom).length;
 currentCategory=meta.category||'MAKE';const c=CATEGORY_INFO[currentCategory];
 const fs=(catalog.fixtures||[]).filter(f=>f.room===currentRoom),capacity=legacy?CAPACITY:fs.reduce((n,f)=>n+FIXTURE_TYPES[f.type].slots.length,0);
 $('room-title').textContent=legacy?'전시 '+currentRoom+'관':c.label+' 전시관';
 $('room-kicker').textContent=legacy?theme.name:'전시 '+meta.number+'관';
 $('room-subtitle').textContent=legacy?theme.subtitle:c.subtitle;
 if(legacy)$('room-wall-sign').textContent='GALLERY '+String(currentRoom).padStart(2,'0');
 else $('room-wall-sign').replaceChildren(make('strong','',c.label),make('small','',{MAKE:'상상을 만드는 공간',TAKE:'기록으로 남기는 공간',WAKE:'기술로 확장하는 공간'}[currentCategory]||c.subtitle));
 Object.assign($('room-scene').dataset,{variant:'B',theme:theme.id,layout:legacy?'2':'3',category:legacy?'':currentCategory});
 $('room-background').src=legacy?ASSETS.rooms[theme.id]:stationImageUrl('room-'+c.id);
 $('room-background').alt=legacy?'햇빛이 비치는 기존 전시실':'원목 아치와 자연광이 있는 '+c.label+' 전시실. 작품은 별도 구조물에 배치됩니다.';
 $('room-count').replaceChildren(document.createTextNode(count+' '),make('i','','작품'));
 $('room-count').setAttribute('aria-label','이 전시실의 공개 작품 '+count+'개');
 $('room-progress').style.width=(capacity?count/capacity*100:0)+'%';
 const rooms=availableRooms(),ix=rooms.findIndex(r=>r.id===currentRoom);
 $('room-prev').disabled=ix<=0;$('room-next').disabled=ix>=rooms.length-1;$('room-tabs').replaceChildren();
 for(const r of rooms){const b=button(String(r.number).padStart(2,'0'),()=>goRoom(r.id),'g-room-tab');b.setAttribute('aria-label',(legacy?'전시':c.label+' 전시 ')+r.number+'관으로 이동');b.setAttribute('aria-current',String(r.id===currentRoom));$('room-tabs').append(b);}
 for(const a of $('category-nav').querySelectorAll('a'))a.setAttribute('aria-current',a.dataset.category===meta.category?'page':'false');
}
function focusFixture(fixture,smooth=true){
 const el=$('works-layer').querySelector('[data-fixture="'+CSS.escape(fixture.id)+'"]'),vp=$('room-viewport');
 if(!canPanRoom()){vp.scrollLeft=0;return;}
 if(el)vp.scrollTo({left:Math.max(0,el.offsetLeft+el.offsetWidth/2-vp.clientWidth/2),behavior:smooth&&!reduced.matches?'smooth':'instant'});
}
function empty(message){$('empty-note').hidden=false;$('empty-note').querySelector('h2').textContent=message||'첫 번째 상상을 기다리는 중';$('empty-note').querySelector('p').textContent=message?'잠시 후 다시 방문해 주세요.':'새로운 작품이 도착하면\n이 공간에 이야기가 펼쳐집니다.';}
function renderWorks(works,previous=[],fixtures=roomFixtures){
 roomWorks=works;roomFixtures=fixtures||[];const before=new Set(previous.map(w=>w.id));$('works-layer').replaceChildren();
 if(roomMeta().layoutVersion===3){for(const f of roomFixtures){const el=createFixtureElement(f,works,{onOpen:openArt,arrivalIds:new Set(works.filter(w=>!before.has(w.id)).map(w=>w.id))});el.querySelector('.g-fixture-sign')?.remove();el.setAttribute('aria-label','작품 전시 구조물');$('works-layer').append(el);}}
 else for(const w of works){const el=createWorkElement(w,{variant:'B',onOpen:openArt});$('works-layer').append(el);}
 for(const el of $('works-layer').querySelectorAll('[data-work-id]')){
  const work=works.find(w=>w.id===el.dataset.workId);el.classList.add('g-direct-work');el.setAttribute('aria-haspopup','dialog');el.title=artworkLabel(work)+' · '+creatorCaption(work);
 }
 $('empty-note').hidden=!!fixtures.length||!!works.length;if(!$('empty-note').hidden)empty();
}
function showRoom(result,{cached=false}={}){
 const same=renderedRoom===currentRoom,previous=same?roomWorks:result.works;
 renderWorks(result.works,previous,result.fixtures||[]);renderedRoom=currentRoom;renderedKey=publicCache.roomKey(currentRoom);
 if(alignOnLoad){const saved=roomViews.get(currentRoom);if(saved!==undefined)$('room-viewport').scrollLeft=saved;
 else{const first=roomFixtures.find(f=>roomWorks.some(w=>w.placement.fixtureId===f.id));if(first&&canPanRoom())focusFixture(first,false);else pan('center',false);}alignOnLoad=false;}
 status('');startMetrics();
}
function startMetrics(){if(metricsStarted)return;metricsStarted=true;setTimeout(refreshMetrics,1200);}
async function loadRoom(){
 const seq=++roomRequest,room=currentRoom;shell();if(!demo&&!config.endpoint)return;
 if(!publicCache.catalog){if(!initialRoomRead)initialRoomRead={room,promise:read('room',{room,media:'display'}).then(value=>({value}),error=>({error}))};return;}
 if(!publicCache.fresh()){await refresh();return;}
 const cached=publicCache.room(room);if(cached){if(renderedRoom!==room||renderedKey!==publicCache.roomKey(room))showRoom(cached,{cached:true});return;}
 if(typeof room==='string'&&!(catalog.rooms||[]).some(r=>r.id===room)){showRoom({works:[],fixtures:[]},{cached:true});return;}
 if(renderedRoom!==room){renderWorks([],[],[]);renderedRoom=null;empty('작품을 불러오고 있습니다');}
 const ticket=publicCache.ticket(room);
 try{const initial=initialRoomRead?.room===room?initialRoomRead:null;initialRoomRead=null;const loaded=initial?await initial.promise:{value:await read('room',{room,media:'display'})};if(loaded.error)throw loaded.error;const result=loaded.value;if(seq!==roomRequest||room!==currentRoom)return;
  if(!publicCache.putRoom(ticket,result)){setTimeout(refresh,0);return;}showRoom(result);
 }catch(e){if(seq!==roomRequest)return;if(!publicCache.fresh()){renderWorks([],[],[]);renderedRoom=null;}if(!roomWorks.length)empty('연결을 기다리고 있습니다');status(e.message);if(/변경/.test(e.message))setTimeout(refresh,0);}
}
function route(scroll=false){
 const legacy=location.hash.match(/^#room-(\d+)$/),modern=location.hash.match(/^#((?:make|take|wake|fablab)-[1-9][0-9]*)$/),isRoom=!!legacy||!!modern;
 if($('art-dialog').open)closeArt(false);
 if(renderedRoom===currentRoom)roomViews.set(currentRoom,$('room-viewport').scrollLeft);
 currentRoom=legacy?Number(legacy[1]):modern?modern[1]:currentRoom;
 $('entrance').hidden=isRoom;$('exhibition').hidden=!isRoom;
 $('nav-entrance').setAttribute('aria-current',isRoom?'false':'page');$('nav-rooms').setAttribute('aria-current',isRoom?'page':'false');
 if(isRoom){
  closeInfo(false);alignOnLoad=true;loadRoom();
  requestAnimationFrame(()=>{if(scroll){$('exhibition').scrollIntoView({block:'start',behavior:'instant'});$('category-nav').querySelector('[aria-current="page"]')?.focus({preventScroll:true});}});
 }else if(scroll)window.scrollTo({top:0,behavior:'instant'});
}
function goRoom(room){location.hash=typeof room==='number'?'room-'+room:room;}
function canPanRoom(){const vp=$('room-viewport');return matchMedia('(max-width:1023px)').matches&&vp.scrollWidth-vp.clientWidth>1;}
function pan(side,smooth=true){const vp=$('room-viewport'),max=canPanRoom()?Math.max(0,vp.scrollWidth-vp.clientWidth):0;vp.scrollTo({left:side==='left'?0:side==='right'?max:max/2,behavior:smooth&&!reduced.matches?'smooth':'instant'});syncPanControls();}
function syncPanControls(){
 const vp=$('room-viewport'),pannable=canPanRoom(),max=pannable?vp.scrollWidth-vp.clientWidth:0;
 if(!pannable&&vp.scrollLeft)vp.scrollLeft=0;
 document.querySelector('.g-pan-controls').hidden=!pannable;
 const position=max<1?'center':vp.scrollLeft<max*.25?'left':vp.scrollLeft>max*.75?'right':'center';
 document.querySelectorAll('[data-pan]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pan===position)));
}
$('room-viewport').addEventListener('scroll',syncPanControls,{passive:true});
window.addEventListener('resize',syncPanControls);
new ResizeObserver(syncPanControls).observe($('room-viewport'));
async function refresh(){
 if(refreshing||(!demo&&!config.endpoint))return;refreshing=true;
 try{const next=await read('catalog',{revision:lastRevision});
  if(next.notModified===true&&next.revision===lastRevision)publicCache.confirm();
  else{if(!Number.isInteger(next.roomsOpened)||next.roomsOpened<1||!Array.isArray(next.works))throw new Error('전시 정보를 읽지 못했습니다.');
   const changed=lastRevision!==next.revision;lastRevision=next.revision;catalog=next;publicCache.sync(next);if(changed){entrance();shell();}}
  status('');
  const stillPublic=roomWorks.filter(w=>{const current=catalog.works.find(x=>x.id===w.id);return current&&current.updatedAt===w.updatedAt&&current.mediaVersion===w.mediaVersion;});
  if(stillPublic.length!==roomWorks.length)renderWorks(stillPublic,stillPublic,roomFixtures);
  if(activeId&&!publicCache.workKey(activeId)){closeArt();toast('작품의 공개 상태가 변경되었습니다.');}
  if(activeId&&detail&&(detail.updatedAt!==catalog.works.find(w=>w.id===activeId)?.updatedAt||detail.mediaVersion!==catalog.works.find(w=>w.id===activeId)?.mediaVersion)){openArt(activeId,null,true);}
  if(!$('exhibition').hidden)await loadRoom();else startMetrics();
 }catch(e){status(e.message);expirePublicView();}finally{refreshing=false;}
}
function expirePublicView(){if(publicCache.fresh())return;publicCache.clear();renderWorks([],[],[]);renderedRoom=null;renderedKey=null;if($('art-dialog').open)closeArt();empty('공개 상태를 확인하고 있습니다');}
async function openArt(id,source,reload=false){
 if(!publicCache.fresh()){await refresh();if(!publicCache.fresh())return;}
 if(!catalog.works.some(w=>w.id===id)||(!reload&&activeId===id&&$('art-dialog').open))return;
 if(!$('art-dialog').open){returnFocus=source||document.activeElement;returnView={x:window.scrollX,y:window.scrollY,left:$('room-viewport').scrollLeft,top:$('room-viewport').scrollTop};}
 const seq=++detailRequest,key=publicCache.workKey(id);activeId=id;detail=null;
 $('art-image').removeAttribute('src');$('art-image').alt='';$('art-image').onerror=null;
 $('art-title').hidden=false;$('art-title').textContent='작품을 불러오고 있습니다';$('art-dialog').setAttribute('aria-labelledby','art-title');
 for(const k of ['art-description','art-creator','art-category','art-location','art-index'])$(k).textContent='';
 $('art-prev').disabled=true;$('art-next').disabled=true;$('art-dialog').style.setProperty('--art-background','#F7F3E9');
 if(!$('art-dialog').open){$('art-dialog').showModal();$('art-dialog').scrollTop=0;}
 const cached=publicCache.detail(id),preview=cached||publicCache.preview(id);if(preview){detail=preview;renderArt();}
 $('art-dialog').setAttribute('aria-busy',String(!cached));if(metricsState)metrics.record('view',id);else pendingViews.add(id);if(cached)return;
 try{
  const w=await read('artwork',{id,media:'display'});if(seq!==detailRequest||!$('art-dialog').open)return;
  if(!publicCache.putDetail(id,key,w)){closeArt();refresh();return;}
  const img=new Image();img.src=safeImageUrl(fixtureArtwork(w).url);await img.decode();
  if(seq!==detailRequest||!publicCache.fresh()||publicCache.workKey(id)!==key)return;detail=w;renderArt();
 }catch(e){if(seq!==detailRequest)return;publicCache.details.delete(id);$('art-dialog').setAttribute('aria-busy','false');if(!detail){closeArt();toast(e.message);}refresh();}
}
function renderArt(){
 const w=detail;if(!w)return;const media=fixtureArtwork(w),c=CATEGORY_INFO[w.category];
 $('art-dialog').dataset.presentation=media.cutout?w.displayType:'frame';
 $('art-image').onerror=()=>{if(media.cutout){$('art-image').onerror=null;$('art-image').src=safeImageUrl(w.imageUrl);}else $('art-image').alt=artworkLabel(w)+' · 이미지를 불러오지 못했습니다';};
 $('art-image').src=safeImageUrl(media.url);$('art-image').alt=artworkLabel(w)+' · '+creatorCaption(w);
 $('art-title').textContent=w.title||'';$('art-title').hidden=!w.title?.trim();
 $('art-category').textContent=w.collection||c?.label||w.category;
 $('art-description').textContent=w.description||'';$('art-description').hidden=!w.description?.trim();
 $('art-creator').textContent=creatorCaption(w);
 $('art-dialog').setAttribute('aria-labelledby',w.title?.trim()?'art-title':'art-creator');
 $('art-dialog').style.setProperty('--art-background',detailBackground(w));
 $('art-location').textContent=w.placement.layoutVersion===3?(c?.label||w.category)+' · 전시 '+w.placement.roomNumber+'관':'전시 '+w.placement.room+'관';
 const works=visitorWorks(),i=works.findIndex(x=>x.id===w.id);$('art-index').textContent=i<0?'':(i+1)+' / '+works.length;
 $('art-prev').disabled=i<=0;$('art-next').disabled=i<0||i>=works.length-1;
 $('art-dialog').setAttribute('aria-busy','false');
}
function closeArt(restore=true){
 const closingId=activeId;detailRequest++;activeId=null;detail=null;
 $('art-image').removeAttribute('src');$('art-image').onerror=null;$('art-dialog').setAttribute('aria-busy','false');
 if($('art-dialog').open)$('art-dialog').close();
 if(restore){
  const target=returnFocus?.isConnected?returnFocus:closingId&&document.querySelector('[data-work-id="'+CSS.escape(closingId)+'"]');
  target?.focus?.({preventScroll:true});
  if(returnView){$('room-viewport').scrollTo({left:returnView.left,top:returnView.top,behavior:'instant'});window.scrollTo({left:returnView.x,top:returnView.y,behavior:'instant'});}
 }
 returnFocus=null;returnView=null;
}
function navigateArt(delta){const works=visitorWorks(),i=works.findIndex(w=>w.id===activeId);if(i>=0&&works[i+delta])openArt(works[i+delta].id);}
// Reuse one information dialog; closing it restores its original trigger and view.
let infoRequest=0,infoReturnFocus,infoReturnView;
function closeInfo(restore=true){
 infoRequest++;
 if($('info-dialog').open)$('info-dialog').close();
 if(restore){
  if(infoReturnFocus?.isConnected)infoReturnFocus.focus({preventScroll:true});
  if(infoReturnView){
   $('room-viewport').scrollTo({left:infoReturnView.left,top:infoReturnView.top,behavior:'instant'});
   window.scrollTo({left:infoReturnView.x,top:infoReturnView.y,behavior:'instant'});
  }
 }
 infoReturnFocus=null;infoReturnView=null;
}
async function info(kind,source){
 const titles={about:'2026 뚝딱이 온라인 작품 전시관',story:'작은 상상이 모여 하나의 전시가 됩니다.',upload:'나의 작품도 전시해 보세요',guestbook:'이곳에 남긴 작은 이야기',guide:'관람 방법',privacy:'관람 기록 안내'};
 if(!Object.hasOwn(titles,kind))return;
 const dialog=$('info-dialog'),body=$('info-body'),request=++infoRequest;
 if(!dialog.open){
  infoReturnFocus=source||document.activeElement;
  infoReturnView={x:window.scrollX,y:window.scrollY,left:$('room-viewport').scrollLeft,top:$('room-viewport').scrollTop};
 }
 dialog.dataset.kind=kind;body.replaceChildren();$('info-title').textContent=titles[kind];
 $('info-kicker').textContent={about:'전시관 소개',story:'전시 이야기',upload:'작품 등록 안내',guide:'관람 안내',guestbook:'방명록',privacy:'관람 기록 안내'}[kind];
 const p=(message,cls='')=>body.append(make('p',cls,message));
 if(kind==='about'){
  p('만들고, 기록하고, 상상한 청소년들의 창작물이 모이는 공간입니다.','g-info-lead');
  p('2026 뚝딱이 전시회에서 탄생한 다양한 결과물을 온라인에서도 만나보세요.');
  const fields=make('div','g-info-fields');
  for(const [name,title,description] of [
   ['MAKE','만들고 새기다','목공과 공예 등 직접 손으로 만든 작품을 전시합니다.'],
   ['TAKE','순간을 기록하다','사진과 영상·미디어 활동을 통해 표현한 결과물을 소개합니다.'],
   ['WAKE','상상을 현실로','AI와 코딩, 다양한 창작 활동에서 탄생한 아이디어를 전시합니다.']
  ]){const field=make('section','g-info-field');field.append(make('span','',name),make('h3','',title),make('p','',description));fields.append(field);}
  body.append(fields);
  const event=make('dl','g-info-event');
  for(const [label,value] of [['행사','2026 뚝딱이 전시회'],['운영','시립중랑청소년센터'],['기간','2026.11.19. — 11.22.']])event.append(make('dt','',label),make('dd','',value));
  body.append(event);
 }
 if(kind==='story'){
  p('이곳은 참가자들의 창작물이 모여 완성되는 온라인 전시관입니다.','g-info-lead');
  p('목공품과 역명판, 사진과 포스터, 미래특허 등록증과 다양한 창작물까지. 서로 다른 작품들이 각자의 전시 공간에서 새로운 이야기를 만들어 갑니다.');
  p('처음에는 비어 있던 공간도 작품이 하나씩 등록되고 공개될 때마다 채워집니다.');
  const closing=make('p','g-info-callout');closing.append(make('strong','','작품 하나하나가 모여 완성되는 전시관을 함께 둘러보세요.'));body.append(closing);
 }
 if(kind==='upload'){
  p('뚝딱이 전시회에서 만든 작품이나 온라인 공개가 허용된 현장 전시 작품을 등록할 수 있습니다.');
  p('등록된 작품은 관리자 확인을 거쳐 온라인 전시관에 공개됩니다.');
  const steps=make('ol','g-info-process');
  for(const [title,description] of [['작품 등록','작품 사진과 제목, 설명을 입력합니다.'],['관리자 확인','작품 정보와 온라인 공개 동의를 확인합니다.'],['온라인 전시','승인된 작품은 해당 전시관의 빈 공간에 배치됩니다.']]){
   const step=make('li'),copy=make('div');copy.append(make('h3','',title),make('p','',description));step.append(copy);steps.append(step);
  }body.append(steps);
  const notice=make('section','g-info-note');notice.append(make('h3','','공개 전 확인해 주세요'),make('p','','제작자 표시명은 선택사항입니다. 실명 대신 별명이나 팀명을 사용할 수 있으며, 공개 동의가 없는 표시명은 공개하지 않습니다.'),make('p','','온라인 공개가 어려운 작품이나 다른 사람의 초상·저작물이 포함된 경우에는 필요한 공개 권한을 확인해 주세요.'));
  const contact=make('p');contact.append(document.createTextNode('작품 공개 및 철회 문의'),make('br'),make('strong','','시립중랑청소년센터 '));const phone=make('a','','02-490-0316');phone.href='tel:024900316';contact.append(phone);notice.append(contact);body.append(notice);
  if(demo)p('지금은 가상 작품으로 둘러보는 시제품입니다. 이 화면에서는 실제 작품을 접수하지 않습니다.','g-info-status');
  else if(config.uploadUrl){
   // Google exposes accepting through the existing registration bootstrap only.
   // Keep that server-controlled route authoritative instead of guessing OPEN here.
   p('현재 접수 여부는 등록 화면에서 확인해 주세요. 접수가 중단된 동안에는 작품을 등록할 수 없습니다.','g-info-status');
   const a=make('a','g-btn g-btn-primary','접수 상태·등록 안내 확인 ↗');
   a.href=validEndpoint(config.uploadUrl).href;a.target='_blank';a.rel='noopener';body.append(a);
  }else p('작품 등록을 준비하고 있습니다. 접수 경로가 준비되면 이곳에서 안내합니다.');
 }
 if(kind==='guide'){
  // The board is the single copy source for the header's guide dialog.
  const list=make('ol','g-guide-steps');
  for(const step of document.querySelectorAll('.g-master-guide li'))list.append(make('li','',step.textContent.trim()));
  body.append(list);
  p('MAKE·TAKE·WAKE 메뉴로 전시관을 바로 옮길 수 있습니다. 작은 화면에서는 공간을 좌우로 밀어 둘러보세요.');
  p('키보드: Tab으로 선택 · Enter 또는 Space로 열기 · Esc로 닫기','g-info-note');
 }
 if(kind==='privacy'){
  if(config.metricsEnabled!==true||metricsState?.enabled!==true)p('현재 관람 통계 수집은 중단되어 있습니다. 아래는 향후 집계를 운영할 때의 기준입니다.','g-info-status');
  p('방문 세션과 일별 추정 기기 수, 작품 감상 횟수를 집계합니다. 30분 동안 활동이 없으면 새 세션으로 봅니다. 같은 브라우저를 여러 사람이 사용할 수 있어 실제 인원과 다릅니다.');
  p('전시관 통계 기록에는 IP 주소·위치·이름을 저장하지 않습니다. 브라우저 임의 식별자는 매일 새로 만들고 서버에는 해시값으로 기록합니다. Google 등 접속 제공자의 자체 로그와는 별개입니다. 집계 차단·연결 오류로 누락될 수 있으며, 다른 브라우저·기기·저장소 삭제는 별도 방문으로 잡힐 수 있습니다.');
  p('관람 이벤트는 행사 결과 집계에 사용하며 2027년 2월 20일까지 보관합니다. 문의: 시립중랑청소년센터 02-490-0316. 같은 세션의 작품 감상은 작품별 1회로 계산합니다.');
  body.append(button(metrics.optedOut()?'관람 기록 집계 허용':'이 브라우저의 관람 기록 집계 끄기',()=>{metrics.setOptOut(!metrics.optedOut());info('privacy');},'g-btn'));
 }
 if(kind==='guestbook'){
  p('관람의 여운을 짧게 남겨 주세요. 모든 글은 확인 후 공개합니다.');
  if(!demo&&config.guestbookUrl){const a=make('a','g-btn g-btn-primary','방명록 남기기 ↗');a.href=validEndpoint(config.guestbookUrl).href;a.target='_blank';a.rel='noopener';body.append(a);}
 }
 if(!dialog.open){dialog.showModal();dialog.scrollTop=0;}
 if(kind==='guestbook'){
  if(config.endpoint){try{
   const rows=await read('guestbook');if(request!==infoRequest||!dialog.open)return;
   const list=make('ul','g-guest-messages');for(const g of rows){const li=make('li');li.append(make('b','',g.alias),make('p','',g.message),make('small','',g.day));list.append(li);}body.append(list);
   if(!rows.length)p('첫 번째 인사를 기다리고 있어요.');
  }catch(e){if(request===infoRequest&&dialog.open)p(e.message);}}
  else p('방명록을 준비하고 있습니다.');
 }
}
document.querySelectorAll('[data-info]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();info(b.dataset.info,e.currentTarget);}));document.querySelectorAll('[data-pan]').forEach(b=>b.onclick=()=>pan(b.dataset.pan));$('room-prev').onclick=()=>{const rs=availableRooms(),i=rs.findIndex(r=>r.id===currentRoom);if(rs[i-1])goRoom(rs[i-1].id);};$('room-next').onclick=()=>{const rs=availableRooms(),i=rs.findIndex(r=>r.id===currentRoom);if(rs[i+1])goRoom(rs[i+1].id);};$('art-close').onclick=()=>closeArt();$('art-dialog').addEventListener('cancel',e=>{e.preventDefault();closeArt();});$('art-prev').onclick=()=>navigateArt(-1);$('art-next').onclick=()=>navigateArt(1);$('info-close').onclick=$('info-done').onclick=()=>closeInfo();$('info-dialog').addEventListener('cancel',e=>{e.preventDefault();closeInfo();});window.addEventListener('hashchange',()=>route(true));window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
$('art-dialog').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();navigateArt(e.key==='ArrowLeft'?-1:1);}});
if(demo){
 const lab=$('station-lab');lab.hidden=false;for(const p of PROGRAMS){const o=make('option','',p.category+' / '+p.name);o.value=p.id;$('demo-program').append(o);}
 const fixtureOptions=()=>{const p=programFor($('demo-program').value);$('demo-fixture').replaceChildren();for(const id of p.fixtures){const o=make('option','',FIXTURE_TYPES[id].name);o.value=id;$('demo-fixture').append(o);}};fixtureOptions();$('demo-program').onchange=fixtureOptions;
 async function add(count){try{const ws=await demoStore.add($('demo-program').value,$('demo-fixture').value,count);await refresh();goRoom(ws.at(-1).placement.room);toast(count+'개의 가상 작품을 전시했습니다.');}catch(e){toast(e.message);}}
 $('demo-add').onclick=()=>add(1);$('demo-fill').onclick=()=>add(FIXTURE_TYPES[$('demo-fixture').value].slots.length);$('demo-concurrent').onclick=async()=>{await Promise.all(Array.from({length:3},()=>demoStore.add($('demo-program').value,$('demo-fixture').value)));await refresh();await loadRoom();toast('동시 3개 추가 완료 · 기존 자리는 유지합니다.');};
 $('demo-hide').onclick=async()=>{const s=await demoStore.snapshot(),w=s.works.find(w=>w.placement.room===currentRoom&&w.status==='published');if(w){await demoStore.visibility(w.id,false);await refresh();toast('첫 작품을 숨겼습니다. 자리는 보존합니다.');}};
 $('demo-restore').onclick=async()=>{const s=await demoStore.snapshot();for(const w of s.works.filter(w=>w.status==='hidden'))await demoStore.visibility(w.id,true);await refresh();};
 $('demo-reset').onclick=()=>{const d=$('demo-reset-dialog');d.showModal();};$('demo-reset-cancel').onclick=()=>$('demo-reset-dialog').close();$('demo-reset-confirm').onclick=async()=>{await demoStore.reset();$('demo-reset-dialog').close();goRoom('make-1');await refresh();await loadRoom();};
 $('demo-flex-tour').onclick=async()=>{try{const s=await demoStore.snapshot();if(s.works.length){toast('빈 전시관부터 다시 시작한 뒤 유연 배치 예시를 선택해 주세요.');return;}for(const [booth,kind,n] of [['name-tag','tag-arch',17],['station-sign','sign-arch',1],['woodcraft','craft-shelf',7],['photo','photo-lines',19],['photo','table-frames',1],['future-patent','card-rack',25],['coloring','color-panel',1]])await demoStore.add(booth,kind,n);await refresh();goRoom('make-1');toast('71개의 가상 작품: 동일 구조물·혼합 전시·별도 방 개방을 확인하세요.');}catch(e){toast(e.message);}};
 $('demo-tour').onclick=async()=>{const s=await demoStore.snapshot();if(s.works.length){toast('이미 가상 작품이 있습니다. 필요하면 빈 전시관부터 다시 시작해 주세요.');return;}for(const [booth,kind,n] of [['name-tag','tag-arch',6],['station-sign','sign-arch',3],['photo','photo-lines',7],['photo','table-frames',4],['future-patent','card-rack',10],['coloring','color-panel',5]])await demoStore.add(booth,kind,n);await refresh();goRoom('make-1');toast('35개의 가상 작품으로 MAKE·TAKE·WAKE를 준비했습니다.');};
}
entrance();route();refresh();setInterval(()=>{if(!document.hidden)refresh();},Math.min(30000,Math.max(15000,config.pollMs||30000)));
setInterval(()=>{if(!document.hidden&&metricsStarted)refreshMetrics();},60000);
setInterval(expirePublicView,1000);

/* Classic ES5 television viewer. Read-only catalog/room/artwork JSONP only.
   No ES modules, Promise, fetch, crypto, ResizeObserver or matchMedia dependency. */
(function () {
  'use strict';
  var config=window.DDGTV_LAYOUT, geometry=window.DDGTVGeometry, asset='./assets/tv/', counter=0;
  var catalog=null, freshAt=0, expired=false, room='make-1', roomToken=0, detailToken=0, detailId='', currentWorks=[], returnFocus=null, returnScroll=0;
  var roomCache={}, roomOrder=[], roomLoading=null, detailCache={}, detailOrder=[], catalogBusy=false, queue=[], active=0, detailOpen=false;
  var LEASE=50000, POLL=20000;
  function id(s) { return document.getElementById(s); }
  function text(e,s) { if (e) e.textContent=s==null?'':String(s); }
  function node(tag,cls,value) { var e=document.createElement(tag);if(cls)e.className=cls;if(value!=null)text(e,value);return e; }
  function clear(e) { while(e.firstChild)e.removeChild(e.firstChild); }
  function own(o,k) { return Object.prototype.hasOwnProperty.call(o,k); }
  function safeImage(s) { return typeof s==='string' && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=\r\n]+$/.test(s) ? s : ''; }
  function status(message,error) { text(id('tv-status'),message);id('tv-status').className=error?'is-error':''; }
  function fresh() { return catalog && !expired && Date.now()-freshAt < LEASE; }
  function title(w) { return w.title || (w.creatorRole==='photographer'?'올해의 베스트컷':'전시 작품'); }
  function credit(w) { return (w.creatorRole==='photographer'?'촬영 · ':'제작자 · ')+(w.creatorDisplayName||'익명'); }
  function find(list,workId) { var i;for(i=0;i<list.length;i++)if(list[i].id===workId)return list[i];return null; }
  function publicWork(workId) { return catalog && find(catalog.works,workId); }
  function matches(w) { var meta=publicWork(w.id);return meta && meta.status==='published' && String(meta.updatedAt)===String(w.updatedAt); }
  function box(e,b) { e.style.left=b.left+'%';e.style.top=b.top+'%';e.style.width=b.width+'%';e.style.height=b.height+'%'; }
  function cachePut(cache,order,key,value,max) { var i=order.indexOf(key);if(i>=0)order.splice(i,1);order.push(key);cache[key]=value;while(order.length>max)delete cache[order.shift()]; }
  function pump() {
    while(active<2 && queue.length) { active++;send(queue.shift()); }
  }
  function read(action,params,callback) {
    if (action!=='catalog' && action!=='room' && action!=='artwork') {callback(new Error('지원하지 않는 요청입니다.'));return;}
    queue.push({action:action,params:params,callback:callback});pump();
  }
  function send(job) {
    var cb='__ddg_tv_'+Date.now()+'_'+(++counter), script=document.createElement('script'), done=false, timer, key;
    var url=config.endpoint+'?action='+encodeURIComponent(job.action)+'&callback='+cb;
    // Deliberately omit media=display: existing server defaults return JPEG/PNG, not WebP.
    for(key in job.params)if(own(job.params,key))url+='&'+encodeURIComponent(key)+'='+encodeURIComponent(job.params[key]);
    function finish(error,data) {
      if(done)return;done=true;clearTimeout(timer);script.onerror=null;
      if(script.parentNode)script.parentNode.removeChild(script);
      // A late response after timeout must not throw or resurrect an old work.
      window[cb]=function(){};setTimeout(function(){try{delete window[cb];}catch(ignore){}},90000);
      active--;try{job.callback(error,data);}finally{pump();}
    }
    window[cb]=function(result){if(result && result.ok)finish(null,result.data);else finish(new Error(result && result.error || '공개 작품을 불러오지 못했습니다.'));};
    timer=setTimeout(function(){finish(new Error('연결이 지연되고 있습니다. 새로고침을 눌러 주세요.'));},job.action==='room'?65000:30000);
    script.onerror=function(){finish(new Error('Google 전시 서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.'));};
    script.src=url;script.async=true;document.getElementsByTagName('head')[0].appendChild(script);
  }
  function invalidate() {
    roomToken++;roomLoading=null;detailToken++;roomCache={};roomOrder=[];detailCache={};detailOrder=[];currentWorks=[];clear(id('tv-fixtures'));clear(id('tv-extra'));closeDetail();
  }
  function expire() {
    if(!expired && catalog && Date.now()-freshAt>=LEASE){expired=true;invalidate();text(id('tv-count'),'');status('최신 공개 상태를 확인하고 있습니다. 연결이 복구되면 작품을 다시 표시합니다.',true);}
  }
  function refresh(force) {
    if(catalogBusy)return;catalogBusy=true;
    read('catalog',catalog && !force?{revision:catalog.revision}:{},function(error,data){
      catalogBusy=false;
      if(error){expire();status(error.message,true);return;}
      if(!data || (!data.notModified && !Array.isArray(data.works))){status('전시 목록을 확인하지 못했습니다. 새로고침해 주세요.',true);return;}
      var changed=!catalog || String(catalog.revision)!==String(data.revision), recovered=expired;
      if(data.notModified && !catalog){refresh(true);return;}
      if(changed || recovered)invalidate();
      if(!data.notModified)catalog=data;
      freshAt=Date.now();expired=false;
      updateRooms();
      if(changed || recovered || !currentWorks.length)loadRoom();
      else status(currentWorks.length+'개의 작품이 전시되어 있습니다. 작품을 터치해 감상하세요.');
    });
  }
  function roomList(category) {
    var result=[],seen={},i,r,all=catalog && catalog.rooms || [];
    for(i=0;i<all.length;i++){r=all[i];if(r.category===category && /^(make|take|wake)-[1-9][0-9]*$/.test(r.id)){result.push(r);seen[r.id]=true;}}
    if(!result.length)result.push({id:category.toLowerCase()+'-1',category:category,number:1});
    result.sort(function(a,b){return a.number-b.number;});return result;
  }
  function updateRooms() {
    var select=id('tv-rooms'), category=room.split('-')[0].toUpperCase(),list,i,opt;
    if(category!=='MAKE' && category!=='TAKE' && category!=='WAKE')category='MAKE';
    list=roomList(category);clear(select);
    for(i=0;i<list.length;i++){opt=node('option','',category+' '+list[i].number+'관');opt.value=list[i].id;select.appendChild(opt);}
    select.value=room;
    if(select.selectedIndex<0 && room!=='entrance'){opt=node('option','',category+' '+room.split('-')[1]+'관');opt.value=room;select.appendChild(opt);select.value=room;}
    ['make','take','wake'].forEach(function(c){var a=id('tv-nav-'+c);a.className=category.toLowerCase()===c && room!=='entrance'?'is-current':'';a.setAttribute('aria-current',a.className?'page':'false');});
  }
  function navigate() {
    var wanted=location.hash.slice(1);
    if(!/^(make|take|wake)-[1-9][0-9]*$/.test(wanted) && wanted!=='entrance')wanted='make-1';
    room=wanted;roomToken++;roomLoading=null;closeDetail();currentWorks=[];clear(id('tv-fixtures'));clear(id('tv-extra'));
    var entrance=room==='entrance',category=entrance?'entrance':room.split('-')[0];
    id('tv-background').src=asset+'room-'+category+'.jpg';text(id('tv-sign'),entrance?'온라인 작품 전시관':category.toUpperCase());
    id('tv-entrance-actions').style.display=entrance?'block':'none';
    updateRooms();resize();
    if(fresh())loadRoom();else{status('공개된 작품을 불러오고 있습니다. 잠시 기다려 주세요.');refresh(false);}
  }
  function loadRoom() {
    if(!fresh())return;
    if(room==='entrance'){text(id('tv-count'),'공개 작품 '+catalog.works.length+'점');status('MAKE · TAKE · WAKE 중 관람할 전시관을 선택해 주세요.');return;}
    if(roomLoading && roomLoading.room===room && String(roomLoading.revision)===String(catalog.revision))return;
    var cached=roomCache[room],token=++roomToken,expected=catalog.revision,requested=room;
    if(cached && String(cached.revision)===String(expected)){render(cached);return;}
    text(id('tv-count'),'');status('이 전시실의 작품을 불러오고 있습니다. 잠시 기다려 주세요.');
    roomLoading={room:requested,revision:expected};
    read('room',{room:requested},function(error,data){
      if(token!==roomToken || room!==requested || !fresh())return;
      roomLoading=null;
      if(error){status(error.message,true);return;}
      if(!data || !Array.isArray(data.works)){status('작품 정보를 확인하지 못했습니다.',true);return;}
      if(String(data.revision)!==String(catalog.revision)){refresh(true);return;}
      cachePut(roomCache,roomOrder,requested,data,3);render(data);
    });
  }
  function groupedRows(f,works) {
    var rows={},i,w,p,r,keys=[];
    if(f.type!=='photo-lines')return rows;
    for(i=0;i<works.length;i++){w=works[i];p=w.placement;if(p.fixtureId!==f.id)continue;r=Math.floor((Number(p.slotId.slice(1))-1)/3);if(!own(rows,r)){rows[r]=[];keys.push(r);}rows[r].push(w);}
    for(i=0;i<keys.length;i++){r=keys[i];if(!rows[r].every(function(w){return /^chalkak-2026-(0[1-9]|1[0-8])$/.test(w.id) && w.creditOnly===true && w.creatorRole==='photographer' && w.collection==='사진동아리 찰칵 · 올해의 베스트컷' && credit(w)===credit(rows[r][0]);}))delete rows[r];}
    return rows;
  }
  function fastener(wrap,src,r,left) {
    var crop=node('span','tv-fastener'),img=node('img');box(crop,{left:left==null?r.x:left,top:r.y,width:r.width,height:r.height});
    img.src=src;img.alt='';box(img,{left:-r.x/r.width*100,top:-r.y/r.height*100,width:100/r.width*100,height:100/r.height*100});crop.appendChild(img);wrap.appendChild(crop);
  }
  function addArt(w,wrap,grouped) {
    var work=w,k,g,img,button,b,frame;
    if(grouped){work={};for(k in w)if(own(w,k))work[k]=w[k];work.displayScale=(w.displayScale||1)*0.85;}
    g=geometry.geometry(work);if(!g)return false;
    if(grouped && (Number(w.placement.slotId.slice(1))-1)%3===0)g.left+=1.4;
    if(!safeImage(g.media.url))return false;
    img=node('img','tv-art');img.alt='';img.src=g.media.url;box(img,g);wrap.appendChild(img);
    button=node('button','tv-hit');button.type='button';button.setAttribute('aria-label',title(w)+', '+credit(w)+', 크게 감상');button.setAttribute('data-work-id',w.id);button.title=title(w);box(button,g);
    button.onclick=function(){openArt(w.id,button);};wrap.appendChild(button);
    // Keep the hit target centred around the image, without stretching the artwork.
    button.tvBounds=g;button.tvWrap=wrap;
    img.onerror=function(){
      if(g.media.cutout && safeImage(w.imageUrl)) {var copy={};for(k in w)if(own(w,k))copy[k]=w[k];copy.displayPreference='original';var fallback=geometry.geometry(copy);if(fallback){box(img,fallback);box(button,fallback);button.tvBounds=fallback;img.onerror=null;img.src=w.imageUrl;resize();}}
      else{button.style.border='2px solid #a26d29';text(button,'작품 보기');button.style.color='#183e30';status('일부 미리보기를 불러오지 못했습니다. 작품을 눌러 다시 확인할 수 있습니다.',true);}
    };
    if(g.frame){frame=node('img','tv-frame');frame.src=asset+g.frame.asset+'.png';frame.alt='';box(frame,g.frame);wrap.appendChild(frame);}
    return true;
  }
  function render(data) {
    if(!fresh())return;
    clear(id('tv-fixtures'));clear(id('tv-extra'));currentWorks=data.works.filter(function(w){return matches(w) && w.placement && w.placement.room===room;});
    var fixtures=data.fixtures||[],shown={},i,j,f,def,bay,wrap,img,rows,w,slot,r,card,src;
    for(i=0;i<fixtures.length;i++){
      f=fixtures[i];def=config.fixtures[f.type];bay=config.bays[f.bay];if(!def || !bay)continue;
      wrap=node('section','tv-fixture');box(wrap,{left:bay.x/16,top:bay.y/9,width:bay.width/16,height:bay.height/9});wrap.style.zIndex=bay.depth;
      img=node('img','tv-fixture-body');src=asset+def.asset+'.png';img.src=src;img.alt='';wrap.appendChild(img);rows=groupedRows(f,currentWorks);
      for(j=0;j<currentWorks.length;j++){w=currentWorks[j];if(w.placement.fixtureId===f.id){r=Math.floor((Number(w.placement.slotId.slice(1))-1)/3);if(addArt(w,wrap,own(rows,r)))shown[w.id]=true;}}
      for(r in rows)if(own(rows,r)){
        slot=def.slots[Number(r)*3];card=node('div','tv-credit');box(card,{left:12.2,top:slot.y,width:9.7,height:12.8});card.appendChild(node('small','','촬영'));card.appendChild(node('strong','',rows[r][0].creatorDisplayName||'익명'));wrap.appendChild(card);
        if(def.fasteners[Number(r)*3])fastener(wrap,src,def.fasteners[Number(r)*3],15.25);
      }
      for(j=0;j<def.fasteners.length;j++)fastener(wrap,src,def.fasteners[j]);
      id('tv-fixtures').appendChild(wrap);
    }
    // Older saved placement versions remain viewable without reallocating them.
    for(i=0;i<currentWorks.length;i++)if(!shown[currentWorks[i].id])addExtra(currentWorks[i]);
    text(id('tv-count'),room.split('-')[0].toUpperCase()+' '+room.split('-')[1]+'관 · 공개 작품 '+currentWorks.length+'점');
    status(currentWorks.length?currentWorks.length+'개의 작품이 전시되어 있습니다. 작품을 터치해 감상하세요.':'이 전시실에는 아직 공개된 작품이 없습니다. 다른 전시관도 둘러보세요.');resize();
  }
  function addExtra(w) {
    var b=node('button','tv-extra-work'),img=node('img'),m=geometry.media(w);b.type='button';img.src=safeImage(m.url)||safeImage(w.imageUrl);img.alt=title(w);b.appendChild(img);b.appendChild(node('span','',credit(w)));b.onclick=function(){openArt(w.id,b);};id('tv-extra').appendChild(b);
  }
  function fitDetail() {
    var img=id('tv-detail-image'),stage=id('tv-detail-stage'),height=Math.max(180,Math.min(680,(window.innerHeight||document.documentElement.clientHeight)-340)),width=stage.clientWidth,k;
    stage.style.height=height+'px';if(!img.naturalWidth || !width)return;k=Math.min(width/img.naturalWidth,height/img.naturalHeight);img.style.width=Math.round(img.naturalWidth*k)+'px';img.style.height=Math.round(img.naturalHeight*k)+'px';img.style.left=Math.round((width-img.naturalWidth*k)/2)+'px';img.style.top=Math.round((height-img.naturalHeight*k)/2)+'px';
  }
  function detailImage(w) {
    var m=geometry.media(w),url=safeImage(m.url)||safeImage(w.imageUrl);if(!url)return false;
    id('tv-detail-image').src=url;id('tv-detail-image').alt=title(w);fitDetail();return true;
  }
  function openArt(workId,source) {
    if(!fresh()){expire();refresh(false);return;}
    var w=find(currentWorks,workId),token=++detailToken,revision=catalog.revision,cached=detailCache[workId];if(!w || !matches(w))return;
    if(!detailOpen){returnFocus=source||document.activeElement;returnScroll=window.pageYOffset||document.documentElement.scrollTop||0;}
    detailOpen=true;detailId=workId;id('tv-detail').style.display='block';document.body.style.overflow='hidden';
    text(id('tv-detail-title'),w.creditOnly?'올해의 베스트컷':title(w));text(id('tv-detail-creator'),credit(w));text(id('tv-detail-category'),w.category+(w.collection?' · '+w.collection:''));
    text(id('tv-detail-status'),'큰 이미지를 불러오는 중입니다.');detailImage(w);id('tv-close').focus();
    id('tv-prev').disabled=currentWorks.length<2;id('tv-next').disabled=currentWorks.length<2;
    if(cached && matches(cached)){detailImage(cached);text(id('tv-detail-status'),'');return;}
    read('artwork',{id:workId},function(error,data){
      if(token!==detailToken || !detailOpen || detailId!==workId || !fresh() || String(revision)!==String(catalog.revision))return;
      if(error){text(id('tv-detail-status'),'큰 이미지를 불러오지 못해 미리보기를 표시합니다.');refresh(true);return;}
      if(!data || !matches(data)){closeDetail();refresh(true);return;}
      cachePut(detailCache,detailOrder,workId,data,4);
      var loader=new Image(),url=safeImage(geometry.media(data).url)||safeImage(data.imageUrl);
      loader.onload=function(){if(token===detailToken && detailOpen && fresh() && matches(data)){id('tv-detail-image').src=url;fitDetail();text(id('tv-detail-status'),'');}};
      loader.onerror=function(){if(token===detailToken)text(id('tv-detail-status'),'큰 이미지를 불러오지 못해 미리보기를 표시합니다.');};
      if(url)loader.src=url;
    });
  }
  function closeDetail() {
    detailToken++;detailId='';id('tv-detail').style.display='none';id('tv-detail-image').removeAttribute('src');
    if(detailOpen){detailOpen=false;document.body.style.overflow='';window.scrollTo(0,returnScroll);if(returnFocus && document.documentElement.contains(returnFocus))returnFocus.focus();}
  }
  function step(n) {var i;for(i=0;i<currentWorks.length;i++)if(currentWorks[i].id===detailId){openArt(currentWorks[(i+n+currentWorks.length)%currentWorks.length].id);break;}}
  function resize() {
    var stage=id('tv-stage'),available=document.documentElement.clientWidth,viewHeight=window.innerHeight||document.documentElement.clientHeight,top=stage.getBoundingClientRect().top+(window.pageYOffset||0),target=available;
    if(available>=900)target=Math.min(available,Math.max(440,viewHeight-top-52)*16/9);
    stage.style.width=Math.floor(target)+'px';stage.style.height=Math.floor(target*9/16)+'px';stage.style.paddingTop='0';
    var width=stage.clientWidth,buttons=stage.getElementsByTagName('button'),i,b,g,ww,hh,w,h;
    id('tv-sign').style.fontSize=Math.max(14,Math.round(width*(room==='entrance'?0.026:0.035)))+'px';
    for(i=0;i<buttons.length;i++){b=buttons[i];if(!b.tvBounds)continue;g=b.tvBounds;ww=b.tvWrap.clientWidth;hh=b.tvWrap.clientHeight;w=Math.max(56,ww*g.width/100);h=Math.max(56,hh*g.height/100);b.style.width=w+'px';b.style.height=h+'px';b.style.left=(ww*(g.left+g.width/2)/100-w/2)+'px';b.style.top=(hh*(g.top+g.height/2)/100-h/2)+'px';}
    var credits=stage.getElementsByClassName('tv-credit');for(i=0;i<credits.length;i++)credits[i].style.fontSize=Math.max(9,Math.round(width/100))+'px';
    if(detailOpen)fitDetail();
  }
  if(!config || !geometry){status('전시 화면 파일을 불러오지 못했습니다. 브라우저를 새로고침해 주세요.',true);return;}
  id('tv-refresh').onclick=function(){status('최신 전시 상태를 확인하고 있습니다.');roomCache={};roomOrder=[];currentWorks=[];refresh(true);};
  id('tv-rooms').onchange=function(){location.hash=this.value;};
  id('tv-close').onclick=closeDetail;id('tv-prev').onclick=function(){step(-1);};id('tv-next').onclick=function(){step(1);};
  id('tv-detail-image').onload=fitDetail;
  window.onhashchange=navigate;window.onresize=resize;
  document.addEventListener('keydown',function(e){
    var key=e.keyCode;if(!detailOpen)return;
    if(key===27){e.preventDefault();closeDetail();}
    if(key===9){var controls=[id('tv-close'),id('tv-prev'),id('tv-next')].filter(function(b){return !b.disabled;});if(e.shiftKey && document.activeElement===controls[0]){e.preventDefault();controls[controls.length-1].focus();}else if(!e.shiftKey && document.activeElement===controls[controls.length-1]){e.preventDefault();controls[0].focus();}}
  });
  document.addEventListener('visibilitychange',function(){if(!document.hidden){expire();refresh(false);}});
  window.addEventListener('focus',function(){expire();refresh(false);});
  setInterval(function(){expire();refresh(false);},POLL);setInterval(expire,1000);
  navigate();
}());

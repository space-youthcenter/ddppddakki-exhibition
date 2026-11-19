import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {FIXTURE_TYPES} from '../js/fixture-layout.mjs';
import {fixtureArtworkGeometry} from '../js/fixture-view.mjs';
const source=name=>fs.readFileSync(new URL('../js/'+name,import.meta.url),'utf8');
function realm(){const c={};c.window=c;vm.createContext(c);vm.runInContext(source('tv-layout.js'),c);vm.runInContext(source('tv-geometry.js'),c);return c;}
test('TV geometry exactly preserves every current fixture slot, frame and hole anchor',()=>{
 const c=realm();let count=0;
 for(const [type,def] of Object.entries(FIXTURE_TYPES))for(const slot of def.slots)for(const ratio of [.4,1,2])for(const cutout of [false,true]){
  const w={displayType:cutout?'object':'frame',width:1000*ratio,height:1000,displayScale:.85,placement:{fixtureType:type,slotId:slot.id},imageUrl:'data:image/jpeg;base64,AA=='};
  if(cutout)w.media={cutout:{url:'data:image/png;base64,AA==',width:1000*ratio,height:1000,status:'approved',contact:{x:.5,y:.96,hang:{x:.16,y:.12}}}};
  const a=c.DDGTVGeometry.geometry(w),b=fixtureArtworkGeometry(w,{skin:'final'});
  for(const key of ['left','top','width','height'])assert.ok(Math.abs(a[key]-b[key])<1e-9,type+' '+slot.id+' '+key);
  count++;
 }
 assert.equal(count,342);
});
test('feature gate leaves modern browsers unchanged, routes each missing feature and LG TV safely',()=>{
 function gate(mutate){let redirected='';const c={location:{hash:'#take-1',replace:u=>redirected=u},navigator:{userAgent:'Chrome modern'},document:{createElement:()=>({noModule:true})},ResizeObserver:function(){},crypto:{randomUUID(){}},matchMedia:()=>({addEventListener(){}}),CSS:{supports:()=>true},HTMLDialogElement:function(){}};c.HTMLDialogElement.prototype.showModal=function(){};c.window=c;if(mutate)mutate(c);vm.runInNewContext(source('tv-compat.js'),c);return redirected;}
 assert.equal(gate(),'');
 for(const mutate of [c=>delete c.ResizeObserver,c=>delete c.crypto.randomUUID,c=>c.matchMedia=()=>({addListener(){}}),c=>c.document.createElement=()=>({}),c=>c.CSS.supports=()=>false,c=>c.navigator.userAgent='Mozilla/5.0 (Web0S; Linux/SmartTV)'])assert.match(gate(mutate),/tv\.html\?v=.*#take-1$/);
});
function harness(){
 let now=1000;const intervals=[],requests=[],elements={};let document;
 class E{
  constructor(tag,id){this.tagName=tag;this.id=id;this.children=[];this.style={};this.attributes={};this.clientWidth=id==='tv-stage'?1280:640;this.clientHeight=530;this.selectedIndex=0;this.value='';this.textContent='';}
  appendChild(e){this.children.push(e);e.parentNode=this;if(e.tagName==='script'){const u=new URL(e.src);requests.push({action:u.searchParams.get('action'),params:u.searchParams,callback:u.searchParams.get('callback')});}return e;}
  removeChild(e){this.children.splice(this.children.indexOf(e),1);e.parentNode=null;}
  get firstChild(){return this.children[0];}
  setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}focus(){document.activeElement=this;}
  getElementsByTagName(tag){return this.children.flatMap(e=>[...(e.tagName===tag?[e]:[]),...e.getElementsByTagName(tag)]);}
  getElementsByClassName(cls){return this.children.flatMap(e=>[...(e.className===cls?[e]:[]),...e.getElementsByClassName(cls)]);}
  getBoundingClientRect(){return {top:200};}contains(){return true;}
 }
 const head=new E('head'),html=new E('html');html.clientWidth=1280;
 document={getElementById:id=>elements[id]||(elements[id]=new E('div',id)),createElement:tag=>new E(tag),getElementsByTagName:tag=>tag==='head'?[head]:[],documentElement:html,body:new E('body'),addEventListener(){},activeElement:null};
 const c={document,location:{hash:'#make-1'},navigator:{userAgent:'oldTV'},innerHeight:900,pageYOffset:0,Date:{now:()=>now},setTimeout:()=>1,clearTimeout(){},setInterval:(f,ms)=>{intervals.push({f,ms});},addEventListener(){},scrollTo(){},Image:class{set src(v){this._src=v;if(this.onload)this.onload();}},Promise:undefined,crypto:undefined,ResizeObserver:undefined,matchMedia:undefined};c.window=c;vm.createContext(c);
 for(const f of ['tv-layout.js','tv-geometry.js','tv.js'])vm.runInContext(source(f),c);
 const work={id:'sample',status:'published',updatedAt:'one',title:'작품',category:'MAKE',creatorDisplayName:'제작자',displayType:'frame',width:400,height:400,imageUrl:'data:image/jpeg;base64,AA==',placement:{room:'make-1',fixtureId:'fixture-1',fixtureType:'tag-arch',bay:0,slotId:'s01',layoutVersion:3}};
 const cat=(revision=1,works=[work])=>({revision,works,rooms:[{id:'make-1',category:'MAKE',number:1}]});
 const room=()=>({revision:1,room:'make-1',works:[work],fixtures:[{id:'fixture-1',type:'tag-arch',bay:0,room:'make-1'}]});
 function take(action){const r=requests.find(r=>r.action===action&&!r.taken);assert.ok(r,'missing '+action);r.taken=true;return r;}
 function reply(r,data,ok=true){c[r.callback](ok?{ok:true,data}:{ok:false,error:'hidden'});}
 return {c,e:elements,requests,work,cat,room,take,reply,tick:(ms)=>{now+=ms;intervals.filter(i=>i.ms===ms).forEach(i=>i.f());}};
}
test('classic runtime initializes with modern APIs absent; slow room survives metadata polling',()=>{
 const h=harness();h.reply(h.take('catalog'),h.cat());const r=h.take('room');h.tick(20000);h.reply(h.take('catalog'),{revision:1,notModified:true});
 assert.equal(h.requests.filter(x=>x.action==='room').length,1);h.reply(r,h.room());assert.equal(h.e['tv-fixtures'].children.length,1);assert.match(h.e['tv-count'].textContent,/1점/);
 assert.equal(r.params.has('media'),false);assert.match(r.callback,/^__ddg_[a-zA-Z0-9_]{8,80}$/);
 const b=h.e['tv-fixtures'].getElementsByTagName('button')[0];b.onclick();assert.equal(h.e['tv-detail'].style.display,'block');assert.match(h.e['tv-detail-image'].src,/^data:image\/jpeg/);
 h.reply(h.take('artwork'),h.work);h.e['tv-close'].onclick();assert.equal(h.e['tv-detail'].style.display,'none');assert.equal(h.c.document.activeElement,b);
});
test('revision change removes hidden work and rejects a late high resolution response',()=>{
 const h=harness();h.reply(h.take('catalog'),h.cat());h.reply(h.take('room'),h.room());h.e['tv-fixtures'].getElementsByTagName('button')[0].onclick();const delayed=h.take('artwork');
 h.tick(20000);h.reply(h.take('catalog'),h.cat(2,[]));assert.equal(h.e['tv-fixtures'].children.length,0);assert.equal(h.e['tv-detail'].style.display,'none');h.reply(delayed,h.work);assert.equal(h.e['tv-detail'].style.display,'none');
});
test('lost public validation expires all displayed works and closes the detail',()=>{
 const h=harness();h.reply(h.take('catalog'),h.cat());h.reply(h.take('room'),h.room());h.e['tv-fixtures'].getElementsByTagName('button')[0].onclick();
 h.tick(51000);h.tick(1000);assert.equal(h.e['tv-fixtures'].children.length,0);assert.equal(h.e['tv-detail'].style.display,'none');
});
test('minimum TV scene sizes keep 56px hit targets separate on every fixture',()=>{
 const c=realm();
 for(const [type,def] of Object.entries(FIXTURE_TYPES))for(const bay of c.DDGTV_LAYOUT.bays){
  const scene=type==='card-rack'?1120:900,scale=scene/1600;
  const rects=def.slots.map(slot=>{
   const g=c.DDGTVGeometry.geometry({displayType:'frame',width:700,height:1000,placement:{fixtureType:type,slotId:slot.id}});
   const cx=(bay.x+bay.width*(g.left+g.width/2)/100)*scale,cy=(bay.y+bay.height*(g.top+g.height/2)/100)*scale;
   const w=Math.max(56,bay.width*g.width/100*scale),h=Math.max(56,bay.height*g.height/100*scale);
   return {id:slot.id,left:cx-w/2,right:cx+w/2,top:cy-h/2,bottom:cy+h/2};
  });
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];assert.ok(Math.min(a.right,b.right)<=Math.max(a.left,b.left)||Math.min(a.bottom,b.bottom)<=Math.max(a.top,b.top),type+' '+a.id+' '+b.id);}
 }
});

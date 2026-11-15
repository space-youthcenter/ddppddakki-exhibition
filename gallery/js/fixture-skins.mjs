// Image registration only. Never writes placement IDs, allocation rules or room data.
// These coordinates were measured on the image_gen outputs, not used to draw art.
export const REFERENCE_ASSET_ROOT='./assets/reference-design/web/';
export const FINAL_ASSET_ROOT='./assets/final-design-v3/web/';
export function fixtureSkinName(){
 const requested=typeof location!=='undefined'&&new URLSearchParams(location.search).get('assets');
 const preview=typeof document!=='undefined'&&(!document.body?.classList.contains('g-public')||document.body.dataset.demo==='fixtures');
 if(preview&&(requested==='prototype'||requested==='reference'))return requested;
 return typeof document!=='undefined'&&document.body?.classList.contains('g-final-design')?'final':'reference';
}
export function stationImageUrl(name,skin=fixtureSkinName()){
 const root=skin==='prototype'?'./assets/station/':skin==='final'&&name!=='room-fablab'?FINAL_ASSET_ROOT:REFERENCE_ASSET_ROOT;
 return root+name+'.webp';
}
const gridSkin=(xs,ys,extra={})=>({xs,ys,...extra});
export const FIXTURE_IMAGE_REGISTRATION=Object.freeze({
 'tag-arch':gridSkin([24.6,41.8,58.7,75.8],[34.5,54.4],{width:13,height:18.8,sign:{top:13.8,left:29,width:42},fasteners:{ys:[35,54.8],width:4.2,height:4.4}}),
 'sign-arch':gridSkin([33.4,66.6],[38,54.5],{width:29,height:14.5,sign:{top:13.8,left:29,width:42},fasteners:{ys:[37.4,53.4],width:4.2,height:4.4}}),
 'photo-lines':gridSkin([28.9,50,71.3],[31.4,48.3,65.1],{width:18.5,height:15.4,sign:{top:11,left:35,width:30},fasteners:{ys:[27.8,44.6,61.5],width:3.6,height:6.9}}),
 'color-panel':gridSkin([31.7,49.9,68.2],[39.2,59.6],{width:16.5,height:18.2,sign:{top:11,left:35,width:30},fasteners:{ys:[35.2,55.6],width:4,height:8}}),
 'table-frames':gridSkin([20.5,40.2,59.8,79.5],[55.6],{width:17,height:27,sign:{top:61.1,left:41,width:18}}),
 'poster-stand':gridSkin([31,69],[55.6],{width:26,height:39,sign:{top:61.1,left:41,width:18}}),
 'card-rack':gridSkin([25.1,41.7,58.3,74.9],[54.3,65.8,77.6],{width:15.8,height:9.4,align:'bottom',rowXs:[[25.1,41.7,58.3,74.9],[23.5,41.2,58.8,76.5],[22,40.7,59.3,78]],sign:{top:85,left:25,width:50}}),
 'craft-shelf':gridSkin([28,50,72],[46,68.5],{width:18,height:21,sign:{top:82.8,left:27,width:46}}),
 'record-rack':gridSkin([27,50,73],[61,81.3],{width:21,height:19,align:'bottom',sign:{top:87.8,left:40,width:20}}),
});
// Read-only registration of the new raster layers; slot IDs and allocation remain v3.
export const FINAL_FIXTURE_REGISTRATION=Object.freeze({
 'tag-arch':gridSkin([26,42,58,74],[29.5,53.5],{width:14.5,height:18.8,fasteners:{ys:[28.1,52.3],width:3,height:3.2}}),
 'sign-arch':gridSkin([32,67.6],[28.3,57.7],{width:30,height:16,fasteners:{ys:[27.1,56.4],width:3.6,height:3.2}}),
 'photo-lines':gridSkin([29.2,50,70.8],[28.2,45.8,63.1],{width:18.5,height:15.6,fasteners:{ys:[24,41.5,58.9],width:3.6,height:7.3}}),
 'color-panel':gridSkin([28,50,72],[27.4,54],{width:19,height:22,fasteners:{ys:[24.2,50.9],width:5.4,height:4.1}}),
 'table-frames':gridSkin([30,70],[45.2,69.2],{width:27,height:23}),
 'poster-stand':gridSkin([30,70],[45.2],{width:27,height:27}),
 'card-rack':gridSkin([24,41.3,58.7,76],[45.6,58.8,72.1],{width:15.5,height:9.5,align:'bottom'}),
 'craft-shelf':gridSkin([27,50,73],[43.8,68],{width:19,height:22}),
 'record-rack':gridSkin([26.2,50,73.8],[46.5,71.2],{width:19,height:22.8,align:'bottom'}),
});
export const FINAL_FIXTURE_BAYS=Object.freeze([
 {x:20,y:240,width:770,height:641.6667,depth:3},
 {x:825,y:278,width:740,height:616.6667,depth:2},
]);
export function registeredFixtureBay(index,fallback,skin=fixtureSkinName()){return skin==='final'?FINAL_FIXTURE_BAYS[index]||fallback:fallback;}
export function registeredFixtureSlot(placement,slot,skin=fixtureSkinName()){
 if(!slot||skin==='prototype')return slot;
 const r=(skin==='final'?FINAL_FIXTURE_REGISTRATION:FIXTURE_IMAGE_REGISTRATION)[placement.fixtureType];if(!r)return slot;
 const index=Number(slot.id.slice(1))-1,row=Math.floor(index/r.xs.length),col=index%r.xs.length;
 return {...slot,x:(r.rowXs?.[row]||r.xs)[col],y:r.ys[row],width:r.width,height:r.height,align:r.align,rotate:0};
}
export function fixtureFastenerWindows(type,skin=fixtureSkinName()){
 const r=(skin==='final'?FINAL_FIXTURE_REGISTRATION:skin==='reference'?FIXTURE_IMAGE_REGISTRATION:{})[type];if(!r?.fasteners)return [];
 const f=r.fasteners;return f.ys.flatMap(y=>r.xs.map(x=>({x:x-f.width/2,y,width:f.width,height:f.height})));
}

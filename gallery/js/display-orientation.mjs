// Geometry only: rotate the display layer, never decode or rewrite a source file.
// ES5 function bodies are also built into the television viewer.
export function normalizeDisplayRotation(value) {
  if (typeof value !== 'number' || !isFinite(value)) return 0;
  return Math.round((((value + 180) % 360 + 360) % 360 - 180) * 10) / 10 || 0;
}
export function reviewedDisplayRotation(value, fallback) {
  if (value === undefined) return normalizeDisplayRotation(fallback);
  if (typeof value !== 'number' || !isFinite(value) || Math.abs(value) > 180) throw new Error('회전 각도는 -180°부터 180° 사이의 숫자로 조절해 주세요.');
  return normalizeDisplayRotation(value);
}
export function rotatedDisplaySize(width, height, rotation) {
  var angle=normalizeDisplayRotation(rotation),r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  if(Math.abs(c)<1e-12)c=0;if(Math.abs(s)<1e-12)s=0;
  return {width:Math.abs(width*c)+Math.abs(height*s),height:Math.abs(width*s)+Math.abs(height*c),sourceWidth:width,sourceHeight:height,rotation:angle,cos:c,sin:s};
}
export function orientArtworkMedia(media, rotation) {
  var size=rotatedDisplaySize(media.width,media.height,rotation),result={},key;
  for(key in media)if(Object.prototype.hasOwnProperty.call(media,key))result[key]=media[key];
  for(key in size)if(Object.prototype.hasOwnProperty.call(size,key))result[key]=size[key];
  function turnPoint(p){var x=(p.x-.5)*media.width,y=(p.y-.5)*media.height;return {x:Math.max(0,Math.min(1,.5+(x*size.cos-y*size.sin)/size.width)),y:Math.max(0,Math.min(1,.5+(x*size.sin+y*size.cos)/size.height))};}
  if(media.contact&&size.rotation){result.contact=turnPoint(media.contact);if(media.contact.hang)result.contact.hang=turnPoint(media.contact.hang);}
  return result;
}
export function displayMediaSize(work) {
  var sculptural=work.displayType==='object'||work.displayType==='special',cut=sculptural&&(work.media&&work.media.cutout||work.cutout);
  return rotatedDisplaySize(cut&&cut.width||sculptural&&work.cutoutWidth||work.width,cut&&cut.height||sculptural&&work.cutoutHeight||work.height,work.displayRotation);
}
export function patentLandscapeReady(work) {
  if(work.category!=='WAKE'||work.boothId!=='future-patent')return true;
  var size=displayMediaSize(work);return size.width>size.height+1e-7;
}
// The returned source rectangle rotates about its centre into the fitted envelope.
export function orientedImageRect(media, bounds) {
  var k=Math.min(bounds.width/media.width,bounds.height/media.height),w=media.sourceWidth*k,h=media.sourceHeight*k;
  return {left:bounds.left+(bounds.width-w)/2,top:bounds.top+(bounds.height-h)/2,width:w,height:h,rotation:media.rotation||0};
}
export function applyOrientationInEnvelope(img, media) {
  if(!media.rotation)return;
  img.style.left=(1-media.sourceWidth/media.width)*50+'%';img.style.top=(1-media.sourceHeight/media.height)*50+'%';
  img.style.width=media.sourceWidth/media.width*100+'%';img.style.height=media.sourceHeight/media.height*100+'%';
  img.style.transform='rotate('+media.rotation+'deg)';img.style.transformOrigin='50% 50%';
}
export function fitOrientedPreview(img, stage, media) {
  if(!stage||!media||!(media.width>0&&media.height>0))return;
  var style=typeof getComputedStyle==='function'?getComputedStyle(stage):{},px=function(v){return parseFloat(v)||0;};
  var left=px(style.paddingLeft),top=px(style.paddingTop),width=stage.clientWidth-left-px(style.paddingRight),height=stage.clientHeight-top-px(style.paddingBottom);
  if(!(width>0&&height>0))return;
  var rect=orientedImageRect(media,{left:left,top:top,width:width,height:height});
  img.style.position='absolute';img.style.left=rect.left+'px';img.style.top=rect.top+'px';img.style.width=rect.width+'px';img.style.height=rect.height+'px';
  img.style.maxWidth='none';img.style.maxHeight='none';img.style.transform='rotate('+rect.rotation+'deg)';img.style.transformOrigin='50% 50%';
}

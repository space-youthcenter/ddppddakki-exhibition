/* Generated ES5 display geometry; original files are untouched. */
(function(root){"use strict";
// Geometry only: rotate the display layer, never decode or rewrite a source file.
// ES5 function bodies are also built into the television viewer.
function normalizeDisplayRotation(value) {
  if (typeof value !== 'number' || !isFinite(value)) return 0;
  return Math.round((((value + 180) % 360 + 360) % 360 - 180) * 10) / 10 || 0;
}
function reviewedDisplayRotation(value, fallback) {
  if (value === undefined) return normalizeDisplayRotation(fallback);
  if (typeof value !== 'number' || !isFinite(value) || Math.abs(value) > 180) throw new Error('회전 각도는 -180°부터 180° 사이의 숫자로 조절해 주세요.');
  return normalizeDisplayRotation(value);
}
function rotatedDisplaySize(width, height, rotation) {
  var angle=normalizeDisplayRotation(rotation),r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  if(Math.abs(c)<1e-12)c=0;if(Math.abs(s)<1e-12)s=0;
  return {width:Math.abs(width*c)+Math.abs(height*s),height:Math.abs(width*s)+Math.abs(height*c),sourceWidth:width,sourceHeight:height,rotation:angle,cos:c,sin:s};
}
function orientArtworkMedia(media, rotation) {
  var size=rotatedDisplaySize(media.width,media.height,rotation),result={},key;
  // Rotate the visible outline, not the empty corners of the PNG canvas.
  // Source pixels still rotate about their original centre; offsetX/Y translate
  // that centre into the visible envelope without cropping or changing pixels.
  if(media.outline&&media.outline.length>2&&size.rotation){
    var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,i,p,x,y,rx,ry;
    for(i=0;i<media.outline.length;i++){p=media.outline[i];x=(p[0]-.5)*media.width;y=(p[1]-.5)*media.height;rx=x*size.cos-y*size.sin;ry=x*size.sin+y*size.cos;minX=Math.min(minX,rx);maxX=Math.max(maxX,rx);minY=Math.min(minY,ry);maxY=Math.max(maxY,ry);}
    if(maxX>minX&&maxY>minY){size.width=maxX-minX;size.height=maxY-minY;size.offsetX=-(minX+maxX)/2;size.offsetY=-(minY+maxY)/2;}
  }
  for(key in media)if(Object.prototype.hasOwnProperty.call(media,key))result[key]=media[key];
  for(key in size)if(Object.prototype.hasOwnProperty.call(size,key))result[key]=size[key];
  function turnPoint(p){var x=(p.x-.5)*media.width,y=(p.y-.5)*media.height;return {x:Math.max(0,Math.min(1,.5+(x*size.cos-y*size.sin+(size.offsetX||0))/size.width)),y:Math.max(0,Math.min(1,.5+(x*size.sin+y*size.cos+(size.offsetY||0))/size.height))};}
  if(media.contact&&size.rotation){result.contact=turnPoint(media.contact);if(media.contact.hang)result.contact.hang=turnPoint(media.contact.hang);}
  return result;
}
function displayMediaSize(work) {
  var sculptural=work.displayType==='object'||work.displayType==='special',cut=sculptural&&(work.media&&work.media.cutout||work.cutout);
  return rotatedDisplaySize(cut&&cut.width||sculptural&&work.cutoutWidth||work.width,cut&&cut.height||sculptural&&work.cutoutHeight||work.height,work.displayRotation);
}
function patentLandscapeReady(work) {
  if(work.category!=='WAKE'||work.boothId!=='future-patent')return true;
  var size=displayMediaSize(work);return size.width>size.height+1e-7;
}
// The returned source rectangle rotates about its centre into the fitted envelope.
function orientedImageRect(media, bounds) {
  var k=Math.min(bounds.width/media.width,bounds.height/media.height),w=media.sourceWidth*k,h=media.sourceHeight*k;
  return {left:bounds.left+(bounds.width-w)/2+(media.offsetX||0)*k,top:bounds.top+(bounds.height-h)/2+(media.offsetY||0)*k,width:w,height:h,rotation:media.rotation||0};
}
function applyOrientationInEnvelope(img, media) {
  if(!media.rotation)return;
  img.style.maxWidth='none';img.style.maxHeight='none';
  img.style.left=((1-media.sourceWidth/media.width)*50+(media.offsetX||0)/media.width*100)+'%';img.style.top=((1-media.sourceHeight/media.height)*50+(media.offsetY||0)/media.height*100)+'%';
  img.style.width=media.sourceWidth/media.width*100+'%';img.style.height=media.sourceHeight/media.height*100+'%';
  img.style.transform='rotate('+media.rotation+'deg)';img.style.transformOrigin='50% 50%';
}
function fitOrientedPreview(img, stage, media) {
  if(!stage||!media||!(media.width>0&&media.height>0))return;
  var style=typeof getComputedStyle==='function'?getComputedStyle(stage):{},px=function(v){return parseFloat(v)||0;};
  var left=px(style.paddingLeft),top=px(style.paddingTop),width=stage.clientWidth-left-px(style.paddingRight),height=stage.clientHeight-top-px(style.paddingBottom);
  if(!(width>0&&height>0))return;
  var rect=orientedImageRect(media,{left:left,top:top,width:width,height:height});
  img.style.position='absolute';img.style.left=rect.left+'px';img.style.top=rect.top+'px';img.style.width=rect.width+'px';img.style.height=rect.height+'px';
  img.style.maxWidth='none';img.style.maxHeight='none';img.style.transform='rotate('+rect.rotation+'deg)';img.style.transformOrigin='50% 50%';
}
// Read-only display measurements. No RGB/alpha edits, encoding, uploads or API calls.
// ES5 is intentional: the same implementation runs in the TV viewer.
var displayAlphaCache = [], displayAlphaBytes = 0;
function clearDisplayAlphaCache() { displayAlphaCache = []; displayAlphaBytes = 0; }
function cachedDisplayOutline(url) {
  for (var i = displayAlphaCache.length - 1; i >= 0; i--) if (displayAlphaCache[i].url === url) return displayAlphaCache[i].outline;
  return undefined;
}
// The convex hull of every non-transparent pixel includes thin chains and
// antialiased edges. Four corners per row span suffice; RGB is never examined.
function alphaOutlineFromRgba(data, width, height) {
  if (!(width > 0 && height > 0) || data.length !== width * height * 4) return null;
  var points = [], x, y, first, last;
  for (y = 0; y < height; y++) {
    first = -1; last = -1;
    for (x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 0) { if (first < 0) first = x; last = x; }
    if (first >= 0) points.push([first, y], [last + 1, y], [first, y + 1], [last + 1, y + 1]);
  }
  if (!points.length) return null;
  points.sort(function(a, b) { return a[0] - b[0] || a[1] - b[1]; });
  function cross(a, b, c) { return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); }
  function half(list) {
    var h = [], i;
    for (i = 0; i < list.length; i++) { while (h.length > 1 && cross(h[h.length-2], h[h.length-1], list[i]) <= 0) h.pop(); h.push(list[i]); }
    h.pop(); return h;
  }
  return half(points).concat(half(points.reverse())).map(function(p) { return [p[0]/width, p[1]/height]; });
}
function measureDisplayOutline(img, url) {
  var known = cachedDisplayOutline(url), width = img.naturalWidth, height = img.naturalHeight, outline = null, canvas;
  if (known !== undefined) return known;
  if (!url || !(width > 0 && height > 0)) return null;
  try {
    // Inspect the already downloaded display derivative at its native pixels.
    // If canvas access is unavailable/tainted/too large, keep the original fit.
    if (width * height <= 4000000) {
      canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      var context = canvas.getContext('2d'); context.drawImage(img, 0, 0);
      outline = alphaOutlineFromRgba(context.getImageData(0, 0, width, height).data, width, height);
    }
  } catch (error) { outline = null; }
  if (canvas) canvas.width = canvas.height = 0;
  displayAlphaCache.push({url:url, outline:outline}); displayAlphaBytes += url.length * 2;
  while (displayAlphaCache.length > 24 || displayAlphaBytes > 32000000) displayAlphaBytes -= displayAlphaCache.shift().url.length * 2;
  return outline;
}

root.DDGOrientation={cachedDisplayOutline:cachedDisplayOutline,measureDisplayOutline:measureDisplayOutline,orientArtworkMedia:orientArtworkMedia,orientedImageRect:orientedImageRect};
}(window));
/* ES5, read-only port of fixtureArtworkGeometry. No saved placements are changed. */
(function (root) {
  'use strict';
  function point(p) { return p && typeof p.x === 'number' && typeof p.y === 'number' && isFinite(p.x) && isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1; }
  function media(w) {
    var cut = w.media && w.media.cutout;
    if ((w.displayType === 'object' || w.displayType === 'special') && cut && cut.status === 'approved' && w.displayPreference !== 'original') {
      return root.DDGOrientation.orientArtworkMedia({url:cut.url,width:cut.width,height:cut.height,cutout:true,outline:root.DDGOrientation.cachedDisplayOutline(cut.url),contact:point(cut.contact) ? cut.contact : {x:0.5,y:1}},w.displayRotation);
    }
    return root.DDGOrientation.orientArtworkMedia({url:w.imageUrl,width:w.width,height:w.height,cutout:false},w.displayRotation);
  }
  function geometry(w) {
    var p = w.placement, def = p && root.DDGTV_LAYOUT.fixtures[p.fixtureType], slot, i, s, m, scale, bw, bh, fit, frame, a, f, fw, fh, fx, fy, aw, ah, k, width, height, x, y, bottom, hanging;
    if (!def) return null;
    for (i=0;i<def.slots.length;i++) if (def.slots[i].id === p.slotId) slot=def.slots[i];
    if (!slot) return null;
    s={}; for (k in slot) if (Object.prototype.hasOwnProperty.call(slot,k)) s[k]=slot[k];
    m=media(w); if (!(m.width>0 && m.height>0)) return null;
    if (s.mode==='table' && m.cutout) s.mode='object';
    scale=Math.min(1,Math.max(0.4,w.displayScale||1)); bw=s.width*12; bh=s.height*10; fit=Math.min(bw/m.width,bh/m.height)*scale;
    if (s.mode==='table') {
      frame=root.DDGTV_LAYOUT.frames[m.width/m.height<0.95?'portrait':'landscape']; a=frame.aperture;
      f=Math.min(bw/frame.width,bh/frame.height)*scale; fw=frame.width*f; fh=frame.height*f; fx=s.x*12-fw/2; fy=s.y*10-fh;
      aw=fw*a.width; ah=fh*a.height; k=Math.min(aw/m.width,ah/m.height); width=m.width*k; height=m.height*k;
      x=fx+fw*a.x+(aw-width)/2; y=fy+fh*a.y+(ah-height)/2;
      return {slot:s,media:m,left:x/12,top:y/10,width:width/12,height:height/10,frame:{asset:frame.asset,left:fx/12,top:fy/10,width:fw/12,height:fh/10}};
    }
    if (s.mode==='object' && m.cutout) fit=Math.min(fit,bw/(m.width*2*Math.max(m.contact.x,1-m.contact.x)),30/(m.height*Math.max(0.001,1-m.contact.y)));
    hanging=s.mode==='hang' && m.cutout && point(m.contact.hang) ? m.contact.hang : null;
    if (hanging) {
      fit=Math.min(fit,bw/(2*m.width*Math.max(hanging.x,1-hanging.x)),bh/(m.height*Math.max(0.001,1-hanging.y)),30/(m.height*Math.max(0.001,hanging.y)));
      width=m.width*fit; height=m.height*fit;
      return {slot:s,media:m,left:s.x-width*hanging.x/12,top:s.y-height*hanging.y/10,width:width/12,height:height/10};
    }
    width=m.width*fit; height=m.height*fit; bottom=s.mode==='object'||s.mode==='table'||s.align==='bottom';
    x=s.x*12-width/2; y=bottom?s.y*10-height:s.y*10;
    if (s.mode==='object' && m.cutout) {x=s.x*12-width*m.contact.x;y=s.y*10-height*m.contact.y;}
    x=Math.max(s.x*12-bw/2,Math.min(x,s.x*12+bw/2-width));
    if (!(s.mode==='object' && m.cutout)) y=Math.max(bottom?s.y*10-bh:s.y*10,Math.min(y,(bottom?s.y*10:s.y*10+bh)-height));
    return {slot:s,media:m,left:x/12,top:y/10,width:width/12,height:height/10};
  }
  root.DDGTVGeometry={media:media,geometry:geometry};
}(window));

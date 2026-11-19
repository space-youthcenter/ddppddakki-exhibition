/* ES5, read-only port of fixtureArtworkGeometry. No saved placements are changed. */
(function (root) {
  'use strict';
  function point(p) { return p && typeof p.x === 'number' && typeof p.y === 'number' && isFinite(p.x) && isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1; }
  function media(w) {
    var cut = w.media && w.media.cutout;
    if ((w.displayType === 'object' || w.displayType === 'special') && cut && cut.status === 'approved' && w.displayPreference !== 'original') {
      return {url:cut.url,width:cut.width,height:cut.height,cutout:true,contact:point(cut.contact) ? cut.contact : {x:0.5,y:1}};
    }
    return {url:w.imageUrl,width:w.width,height:w.height,cutout:false};
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

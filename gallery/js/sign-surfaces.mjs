// Measured interior corners in the unchanged 1672 × 941 entrance image.
// Only these oblique faces need projection; frontal arches use CSS anchors.
export const ENTRANCE_SIGN_FACES=Object.freeze({
 noticeTitle:{selector:'.g-master-notice h2',width:168,height:32,corners:[[122,319],[286,334],[285,362],[122,349]]},
 noticePaper:{selector:'.g-master-notice-links',width:220,height:204,corners:[[106,393],[300,408],[300,564],[106,572]]},
 guideTitle:{selector:'.g-master-guide h2',width:145,height:30,corners:[[1318,383],[1444,381],[1444,408],[1318,411]]},
 guidePaper:{selector:'.g-master-guide ol',width:178,height:156,corners:[[1299,439],[1465,434],[1465,581],[1299,579]]},
 banner:{selector:'.g-master-banner',width:90,height:190,corners:[[1546,278],[1640,273],[1640,466],[1546,469]]},
});

// Rectangle → measured quadrilateral homography, CSS column-major matrix3d.
export function signPlaneMatrix(width,height,corners){
 const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=corners;
 const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
 const det=dx1*dy2-dx2*dy1;
 if(width<=0||height<=0||Math.abs(det)<1e-8)throw new Error('Invalid sign face');
 const g=(dx3*dy2-dx2*dy3)/det,h=(dx1*dy3-dx3*dy1)/det;
 return [(x1-x0+g*x1)/width,(y1-y0+g*y1)/width,0,g/width,
  (x3-x0+h*x3)/height,(y3-y0+h*y3)/height,0,h/height,
  0,0,1,0,x0,y0,0,1];
}

export function alignEntranceSigns(root){
 const scene=root.querySelector('.g-entrance-scene');if(!scene)return;
 const faces=Object.values(ENTRANCE_SIGN_FACES).map(face=>({...face,node:root.querySelector(face.selector)})).filter(f=>f.node);
 const wide=matchMedia('(min-width:1100px)');
 const update=()=>{
  const {width,height}=scene.getBoundingClientRect();
  for(const f of faces){
   if(!wide.matches||!width||!height){for(const key of ['--sign-map','--sign-width','--sign-height'])f.node.style.removeProperty(key);continue;}
   const corners=f.corners.map(([x,y])=>[x*width/1672,y*height/941]);
   f.node.style.setProperty('--sign-map','matrix3d('+signPlaneMatrix(f.width,f.height,corners).join(',')+')');
   f.node.style.setProperty('--sign-width',f.width+'px');f.node.style.setProperty('--sign-height',f.height+'px');
  }
 };
 const observer=new ResizeObserver(update);observer.observe(scene);wide.addEventListener('change',update);update();
}

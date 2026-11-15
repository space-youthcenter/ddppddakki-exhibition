/** Geometry from an alpha mask and the original photograph, never generated RGB.
 * Only a verified, broad nametag body is retained. Ambiguous holes fail closed. */
function tagComponents(binary,width,height){
  const seen=new Uint8Array(binary.length),queue=new Int32Array(binary.length),groups=[];
  for(let start=0;start<binary.length;start++){
    if(!binary[start]||seen[start])continue;let head=0,tail=1;queue[0]=start;seen[start]=1;
    let left=width,top=height,right=0,bottom=0,sx=0,sy=0,perimeter=0;
    while(head<tail){const p=queue[head++],x=p%width,y=(p-x)/width;sx+=x;sy+=y;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      for(const q of [x?p-1:-1,x<width-1?p+1:-1,y?p-width:-1,y<height-1?p+width:-1]){
        if(q<0||!binary[q]){perimeter++;continue;}if(!seen[q]){seen[q]=1;queue[tail++]=q;}
      }
    }
    if(tail>=3)groups.push({pixels:queue.slice(0,tail),area:tail,left,top,right,bottom,x:sx/tail,y:sy/tail,perimeter});
  }
  return groups.sort((a,b)=>b.area-a.area);
}
function tagHull(points){
  points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const half=ps=>{const h=[];for(const p of ps){while(h.length>=2&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}h.pop();return h;};
  return [...half(points),...half([...points].reverse())];
}
function tagInside(x,y,hull){
  for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length];if((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0])<-.01)return false;}return true;
}
function tagBoardEdges(points,core,width,radius){
  const cx=core.x,cy=core.y,span=Math.ceil(Math.hypot(width,core.bottom-core.top+radius*4)),bin=2,minimum=Math.min(core.right-core.left,core.bottom-core.top)*.21,candidates=[];
  for(let degree=0;degree<360;degree++){
    const angle=degree*Math.PI/180,nx=Math.cos(angle),ny=Math.sin(angle),counts=new Uint16Array(span*2+4);let coreMax=-Infinity;
    for(let i=0;i<core.pixels.length;i+=9){const p=core.pixels[i],x=p%width,y=(p-x)/width;coreMax=Math.max(coreMax,(x-cx)*nx+(y-cy)*ny);}
    for(const [x,y]of points){const d=(x-cx)*nx+(y-cy)*ny;if(d>coreMax+radius*.55)counts[Math.round(d/bin)+span]++;}
    let best=0,index=0;for(let i=1;i<counts.length-1;i++){const v=counts[i-1]+counts[i]+counts[i+1];if(v>best){best=v;index=i;}}
    if(best>=minimum)candidates.push({degree,nx,ny,rho:(index-span)*bin+3.5,votes:best,cx,cy});
  }
  const difference=(a,b)=>Math.min(Math.abs(a-b),360-Math.abs(a-b)),lines=[];
  for(const c of candidates.sort((a,b)=>b.votes-a.votes))if(!lines.some(l=>difference(l.degree,c.degree)<25)){
    const near=candidates.filter(v=>difference(v.degree,c.degree)<10&&v.votes>=c.votes*.8).sort((a,b)=>a.rho-b.rho),chosen=near[0]||c;
    if(!lines.some(l=>difference(l.degree,chosen.degree)<25))lines.push(chosen);
  }
  if(lines.length<4)throw new Error('몸체 가장자리가 불분명해 체인을 안전하게 분리하지 못했습니다. 원본 사진을 사용해 주세요.');
  const angles=lines.map(l=>l.degree).sort((a,b)=>a-b);if(angles.some((n,i)=>(angles[(i+1)%angles.length]+(i===angles.length-1?360:0))-n>140))throw new Error('몸체 외곽을 모두 찾지 못했습니다. 원본 사진을 사용해 주세요.');
  return lines.slice(0,8);
}
function tagHoleCenter(hole,source,erosion){
  const {rgba,width,height}=source,estimate=Math.max(hole.right-hole.left+1,hole.bottom-hole.top+1)/2+erosion;
  const light=(x,y)=>{x=Math.max(0,Math.min(width-1,Math.round(x)));y=Math.max(0,Math.min(height-1,Math.round(y)));const p=(y*width+x)*4;return (rgba[p]+rgba[p+1]+rgba[p+2])/3;};
  let best={x:hole.x,y:hole.y,score:-Infinity,radius:estimate};
  for(let y=Math.round(hole.y-estimate*.4);y<=hole.y+estimate*.4;y+=1)for(let x=Math.round(hole.x-estimate*.4);x<=hole.x+estimate*.4;x+=1)for(let r=Math.max(4,Math.round(estimate*.75));r<=estimate*1.25;r+=1){
    const values=[];for(let n=0;n<32;n++){const a=n*Math.PI/16,nx=Math.cos(a),ny=Math.sin(a);values.push(light(x+nx*(r+2.5),y+ny*(r+2.5))-light(x+nx*(r-2.5),y+ny*(r-2.5)));}
    values.sort((a,b)=>a-b);const score=values.slice(6,27).reduce((a,b)=>a+b,0)/21;if(score>best.score)best={x,y,radius:r,score};
  }
  if(best.score<25)throw new Error('구멍 테두리가 불명확합니다. 원본 사진으로 전시해 주세요.');return best;
}
export function automaticNametag(source,mask){
  const {width,height,rgba}=source;if(!Number.isInteger(width)||!Number.isInteger(height)||mask.length!==width*height||rgba.length!==width*height*4||width*height>4000000)throw new Error('네임택 원본 크기를 확인해 주세요.');
  const binary=Uint8Array.from(mask,a=>a>=128?1:0),groups=tagComponents(binary,width,height),body=groups[0];
  if(!body||body.area<width*height*.006)throw new Error('네임택 몸체를 구분하지 못했습니다. 원본 사진으로 전시해 주세요.');
  const stride=width+1,integral=new Uint32Array((width+1)*(height+1));
  for(let y=0;y<height;y++){let sum=0;for(let x=0;x<width;x++){sum+=binary[y*width+x];integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+sum;}}
  const radius=Math.max(6,Math.round(Math.sqrt(body.area)*.10)),points=[],coreMask=new Uint8Array(mask.length);
  for(const p of body.pixels){const x=p%width,y=(p-x)/width,l=Math.max(0,x-radius),r=Math.min(width,x+radius+1),t=Math.max(0,y-radius),b=Math.min(height,y+radius+1);
    const count=integral[b*stride+r]-integral[t*stride+r]-integral[b*stride+l]+integral[t*stride+l];if(count/((r-l)*(b-t))>.96)coreMask[p]=1;
  }
  const core=tagComponents(coreMask,width,height)[0];if(!core||core.area<body.area*.45)throw new Error('얇거나 복잡한 형태는 자동으로 자르지 않습니다. 원본 사진을 사용해 주세요.');
  const margin=radius*1.16;
  for(const p of body.pixels){const x=p%width,y=(p-x)/width,l=Math.max(0,x-radius),r=Math.min(width,x+radius+1),t=Math.max(0,y-radius),b=Math.min(height,y+radius+1);
    if(x<core.left-margin||x>core.right+margin||y<core.top-margin||y>core.bottom+margin)continue;
    const count=integral[b*stride+r]-integral[t*stride+r]-integral[b*stride+l]+integral[t*stride+l];
    if(count/((r-l)*(b-t))>=.29&&(x===0||y===0||x===width-1||y===height-1||!binary[p-1]||!binary[p+1]||!binary[p-width]||!binary[p+width]))points.push([x,y]);
  }
  if(points.length<12)throw new Error('몸체와 체인을 구분하지 못했습니다. 원본 사진을 사용해 주세요.');
  const hull=tagHull(points),lines=tagBoardEdges(points,core,width,radius),cleaned=new Uint8ClampedArray(mask.length);let retained=0,removed=0;
  const bounds={left:Math.min(...hull.map(p=>p[0])),right:Math.max(...hull.map(p=>p[0])),top:Math.min(...hull.map(p=>p[1])),bottom:Math.max(...hull.map(p=>p[1]))};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=y*width+x;if(mask[p]&&lines.every(l=>(x-l.cx)*l.nx+(y-l.cy)*l.ny<=l.rho)){cleaned[p]=mask[p];if(mask[p]>=128)retained++;}else if(mask[p]>=128)removed++;}
  if(retained<body.area*.65)throw new Error('작품 몸체가 지나치게 줄어들어 자동 처리를 중단했습니다. 원본 사진을 사용해 주세요.');
  const bw=bounds.right-bounds.left+1,bh=bounds.bottom-bounds.top+1,dark=new Uint8Array(mask.length);
  // Dense dark circles near the upper body distinguish a drilled hole from
  // thin handwritten strokes. The hole is only an anchor; no pixels are drawn.
  for(let y=bounds.top;y<=bounds.top+bh*.48;y++)for(let x=bounds.left;x<=bounds.right;x++){
    const p=y*width+x,i=p*4;if(tagInside(x,y,hull)&&Math.max(rgba[i],rgba[i+1],rgba[i+2])<95)dark[p]=1;
  }
  const darkCore=new Uint8Array(mask.length),dr=Math.max(2,Math.round(Math.min(bw,bh)*.009));
  for(let y=bounds.top+dr;y<Math.min(height-dr,bounds.top+bh*.48);y++)for(let x=bounds.left+dr;x<=Math.min(width-dr-1,bounds.right);x++){
    let full=true;for(let dy=-dr;dy<=dr&&full;dy++)for(let dx=-dr;dx<=dr;dx++)if(!dark[(y+dy)*width+x+dx]){full=false;break;}if(full)darkCore[y*width+x]=1;
  }
  const holes=tagComponents(darkCore,width,height).map(c=>{const w=c.right-c.left+1,h=c.bottom-c.top+1,fill=c.area/(w*h),roundness=4*Math.PI*c.area/(c.perimeter*c.perimeter);return {...c,fill,roundness,ratio:w/h,score:fill*roundness*Math.sqrt(c.area)};})
    .filter(c=>c.area>retained*.00025&&c.area<retained*.02&&c.fill>.32&&c.roundness>.18&&c.ratio>.55&&c.ratio<1.8&&c.y>bounds.top+bh*.025&&c.y<bounds.top+bh*.45&&lines.every(l=>l.rho-(c.x-l.cx)*l.nx-(c.y-l.cy)*l.ny>Math.max(c.right-c.left+1,c.bottom-c.top+1)*.65+dr))
    .sort((a,b)=>b.score-a.score);
  if(!holes.length||holes[1]&&holes[0].score<holes[1].score*1.35)throw new Error('구멍을 확실하게 찾지 못했습니다. 원본 사진 전시를 선택해 주세요.');
  const hole=tagHoleCenter(holes[0],source,dr);
  return {mask:cleaned,hang:{x:hole.x,y:hole.y},audit:{method:'nametag-body-hole-v1',bodyPixels:retained,removedPixels:removed,holeConfidence:Math.min(1,hole.score/100),hole,hull,bounds,edges:lines}};
}

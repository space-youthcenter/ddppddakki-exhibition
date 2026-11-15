import {decodeFile,packetFromBlob,resized} from './image-tools.mjs';
import {modelInputRGBA} from './pixel-resize.mjs';
import {PIXEL_METHOD} from './pixel-contract.mjs';
import {validatedPixelCrop} from './hanging.mjs';
import {automaticNametag} from './nametag-auto.mjs';
import {alphaFromPrediction,applySourceMask,cropMaskedPixels,maskAudit,encodeExactPNG} from './pixel-mask.mjs';
const pixelCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
export async function pixelSource(fileOrURL,width,height){
  const file=typeof fileOrURL==='string'?await(await fetch(fileOrURL)).blob():fileOrURL;
  const image=await decodeFile(file),scale=Math.min(1,1600/Math.max(image.width,image.height));
  const w=width||Math.round(image.width*scale),h=height||Math.round(image.height*scale);
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||Math.max(w,h)>1800)throw new Error('원본 작업 크기를 확인해 주세요.');
  const canvas=pixelCanvas(w,h),ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,w,h);
  // Feed the original decoder directly to the model. Never infer from a
  // recompressed exhibition JPEG; small text and chains can otherwise disappear.
  const full=pixelCanvas(image.width,image.height),fc=full.getContext('2d',{willReadFrequently:true});fc.drawImage(image,0,0);image.close?.();
  const modelRgba=modelInputRGBA(fc.getImageData(0,0,full.width,full.height).data,full.width,full.height);full.width=full.height=1;
  return {width:w,height:h,rgba:ctx.getImageData(0,0,w,h).data,modelRgba};
}
export function segmentInBrowser(source,galleryUrl,onProgress=()=>{}){
  const base=new URL(galleryUrl,location.href),local=['localhost','127.0.0.1'].includes(base.hostname)&&base.origin===location.origin;
  if(!local&&base.origin!=='https://space-youthcenter.github.io')throw new Error('배경 처리 화면의 출처를 확인해 주세요.');
  const url=new URL('pixel-engine.html',base.pathname.endsWith('/')?base:new URL('./',base));
  const channel=crypto.randomUUID();url.searchParams.set('channel',channel);
  return new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe');frame.hidden=true;frame.title='원본 보존 배경 분리';frame.referrerPolicy='no-referrer';frame.sandbox='allow-scripts allow-same-origin';let sent=false;
    const cleanup=()=>{clearTimeout(timer);removeEventListener('message',receive);frame.remove();};
    const fail=message=>{cleanup();reject(new Error(message));};
    const timer=setTimeout(()=>fail('자동 처리 시간이 길어 중단했습니다. 접수는 완료됐으며 관리자가 이어서 처리할 수 있습니다.'),180000);
    const receive=event=>{
      if(event.source!==frame.contentWindow||event.origin!==url.origin||event.data?.channel!==channel)return;
      const m=event.data;
      if(m.type==='ready'&&!sent){sent=true;const rgba=new Uint8ClampedArray(source.modelRgba);frame.contentWindow.postMessage({type:'segment',channel,rgba},url.origin,[rgba.buffer]);}
      if(m.type==='progress')onProgress(String(m.message||''));
      if(m.type==='error')fail(String(m.message||'배경 분리에 실패했습니다. 원본은 유지됩니다.'));
      if(m.type==='result'){
        try{if(m.model!=='birefnet-lite-512'||!(m.prediction instanceof Float32Array)||m.width!==512||m.height!==512||m.logits!==true)throw new Error('마스크 응답이 올바르지 않습니다.');
          const mask=alphaFromPrediction(m.prediction,512,512,source.width,source.height,{logits:true}),rgba=applySourceMask(source.rgba,mask),audit=maskAudit(source.rgba,rgba);
          if(audit.changedRgbChannels||audit.visiblePixels<source.width*source.height*.001||audit.hiddenPixels<source.width*source.height*.005)throw new Error('작품 경계를 분리하지 못했습니다. 원본 사진 전시를 선택해 주세요.');
          cleanup();resolve({source,mask,model:m.model,method:PIXEL_METHOD,audit,apiUsd:0});
        }catch(e){fail(e.message);}
      }
    };
    addEventListener('message',receive);frame.src=url.href;document.body.append(frame);
    onProgress('원본 보존 분리 준비 중 · 첫 실행에는 모델을 내려받습니다. API 비용 $0');
  });
}
export async function exactPixelPacket(rgba,width,height,maxBytes=6*1024*1024){
  const bytes=await encodeExactPNG(rgba,width,height);if(bytes.length>maxBytes)throw new Error('원본 보존 PNG 용량이 큽니다. 자동 축소하거나 다시 그리지 않았습니다. 원본 사진 전시를 선택해 주세요.');
  return {...await packetFromBlob(new Blob([bytes],{type:'image/png'})),width,height};
}
export async function pixelCandidate(draft){
  const {source,mask}=draft,rgba=applySourceMask(source.rgba,mask),audit=maskAudit(source.rgba,rgba);
  if(audit.changedRgbChannels)throw new Error('원본 RGB 보존 검사에 실패했습니다. 저장하지 않았습니다.');
  return {candidate:await exactPixelPacket(rgba,source.width,source.height),method:PIXEL_METHOD,model:'birefnet-lite-512',audit};
}
export async function pixelCutout(draft){
  const rgba=applySourceMask(draft.source.rgba,draft.mask),cropped=cropMaskedPixels(rgba,draft.source.width,draft.source.height);
  const cutout=await exactPixelPacket(cropped.rgba,cropped.width,cropped.height),c=pixelCanvas(cropped.width,cropped.height);
  c.getContext('2d').putImageData(new ImageData(cropped.rgba,cropped.width,cropped.height),0,0);
  const small=resized(c,640),im=small.getContext('2d').getImageData(0,0,small.width,small.height);
  const cutoutThumb=await exactPixelPacket(im.data,small.width,small.height,1500*1024);
  return {cutout,cutoutThumb,contact:{x:.5,y:.96},canvas:c,method:PIXEL_METHOD,crop:cropped.crop};
}
/** One action prepares the mask, removes outside chains, finds the real hole,
 * and produces source-pixel PNGs. Saving is handled internally by the admin UI. */
export async function automaticDisplayCutout(work,galleryUrl,onProgress=()=>{}){
  let draft;
  if(work.automaticCutout&&work.automaticMethod===PIXEL_METHOD){
    onProgress('원본과 분리 결과를 확인하고 있습니다…');
    draft=await reopenPixelCandidate(work.original,work.automaticCutout,work.width,work.height);
  }else{
    const source=await pixelSource(work.original,work.width,work.height);
    draft=await segmentInBrowser(source,galleryUrl,onProgress);
  }
  let tag;
  if(work.boothId==='name-tag'){
    onProgress('바깥 체인과 구멍 위치를 자동으로 정리하고 있습니다…');
    tag=automaticNametag(draft.source,draft.mask);draft.mask=tag.mask;
  }
  const result=await pixelCutout(draft),audit=maskAudit(draft.source.rgba,applySourceMask(draft.source.rgba,draft.mask));
  if(audit.changedRgbChannels)throw new Error('원본 색상 보존 검사에 실패했습니다. 원본은 변경하지 않았습니다.');
  if(tag)result.contact.hang={x:(tag.hang.x-result.crop.x)/result.crop.width,y:(tag.hang.y-result.crop.y)/result.crop.height};
  return {...result,audit,automaticPrepared:true,nametag:tag?{method:tag.audit.method,holeConfidence:tag.audit.holeConfidence,removedPixels:tag.audit.removedPixels}:null};
}
export async function reopenPixelCandidate(original,candidate,width,height){
  const source=await pixelSource(original,width,height),blob=await(await fetch(candidate)).blob(),image=await decodeFile(blob);
  if(image.width!==width||image.height!==height){image.close?.();throw new Error('원본과 후보의 좌표가 다릅니다. 새로 배경을 분리해 주세요.');}
  const c=pixelCanvas(width,height),ctx=c.getContext('2d');ctx.drawImage(image,0,0);image.close?.();const data=ctx.getImageData(0,0,width,height).data;
  const mask=new Uint8ClampedArray(width*height);for(let p=0;p<mask.length;p++)mask[p]=data[p*4+3];
  return {source,mask,method:PIXEL_METHOD,model:'birefnet-lite-512',apiUsd:0};
}
export async function reopenSavedPixelCutout(original,cutout,width,height,crop){
  const source=await pixelSource(original,width,height),image=await decodeFile(await(await fetch(cutout)).blob());
  const box=validatedPixelCrop(crop,image.width,image.height,width,height);
  if(!box){image.close?.();throw new Error('저장된 원본 좌표가 없습니다. 원본에서 다시 배경을 분리해 주세요.');}
  const c=pixelCanvas(image.width,image.height),ctx=c.getContext('2d');ctx.drawImage(image,0,0);image.close?.();const rgba=ctx.getImageData(0,0,c.width,c.height).data;
  const mask=new Uint8ClampedArray(width*height);
  for(let y=0;y<box.height;y++)for(let x=0;x<box.width;x++)mask[(box.y+y)*width+box.x+x]=rgba[(y*box.width+x)*4+3];
  return {source,mask,method:PIXEL_METHOD,model:'birefnet-lite-512',apiUsd:0};
}

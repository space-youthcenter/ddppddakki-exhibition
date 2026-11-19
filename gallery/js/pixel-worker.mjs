import * as ort from '../assets/vendor/onnxruntime/ort.wasm.min.mjs';
import {PIXEL_MODEL} from './pixel-model.mjs';
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
async function modelBytes(progress){
  let cache;try{cache=await caches.open('dd-gallery-pixel-model-v1');}catch{}
  const cached=await cache?.match(PIXEL_MODEL.url);
  if(cached){const b=await cached.arrayBuffer();if(b.byteLength===PIXEL_MODEL.bytes&&await digest(b)===PIXEL_MODEL.sha256)return b;await cache.delete(PIXEL_MODEL.url);}
  progress('download','원본 보존 모델 준비 중 · 최초 약 101MB, API 비용 $0');
  const response=await fetch(PIXEL_MODEL.url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw new Error('모델 파일을 준비하지 못했습니다. 나중에 관리자 화면에서 다시 시도해 주세요.');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength!==PIXEL_MODEL.bytes||await digest(bytes)!==PIXEL_MODEL.sha256)throw new Error('모델 무결성 확인에 실패했습니다. 사진은 변경하지 않았습니다.');
  try{await cache?.put(PIXEL_MODEL.url,new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}}));}catch{}
  return bytes;
}
let active=false,session;
onmessage=async({data})=>{
  if(active||!(data.rgba instanceof Uint8ClampedArray)||data.rgba.length!==512*512*4)return;active=true;
  const jobId=data.jobId,started=performance.now(),reused=!!session;
  const send=message=>postMessage({...message,jobId});
  const progress=(phase,message)=>send({type:'progress',phase,message});
  try{
    if(!session){
      ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
      ort.env.wasm.wasmPaths=new URL('../assets/vendor/onnxruntime/',import.meta.url).href;
      const bytes=await modelBytes(progress);progress('loading','분리 모델을 준비하고 있습니다. 원본은 안전하게 보관됩니다.');
      session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'basic'});
    }
    const prepared=performance.now();
    const pixels=512*512,input=new Float32Array(pixels*3),mean=[.485,.456,.406],std=[.229,.224,.225];
    for(let c=0;c<3;c++)for(let p=0;p<pixels;p++)input[c*pixels+p]=(data.rgba[p*4+c]/255-mean[c])/std[c];
    progress('processing','글씨와 색상을 새로 그리지 않고 배경 영역만 찾고 있습니다…');
    const output=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',input,[1,3,512,512])});
    const prediction=new Float32Array(output[session.outputNames[0]].data);
    if(prediction.length!==pixels)throw new Error('마스크 크기가 올바르지 않습니다.');
    postMessage({type:'result',prediction,model:PIXEL_MODEL.id,width:512,height:512,logits:true,apiUsd:0,jobId,timing:{reused,prepareMs:prepared-started,inferenceMs:performance.now()-prepared,totalMs:performance.now()-started}},[prediction.buffer]);
  }catch(error){try{await session?.release();}catch{}session=null;send({type:'error',message:/[가-힣]/.test(error.message)?error.message:'자동 분리를 완료하지 못했습니다. 관리자가 원본에서 이어서 처리할 수 있습니다.'});}
  finally{active=false;}
};

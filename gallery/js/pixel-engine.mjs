const channel=new URL(location.href).searchParams.get('channel');
const allowed=origin=>origin==='https://script.google.com'||origin==='https://script.googleusercontent.com'||/^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(origin)||origin===location.origin;
let worker,started=false;
if(/^[a-zA-Z0-9_-]{16,80}$/.test(channel||'')&&parent!==window){
  addEventListener('message',event=>{
    const m=event.data;if(event.source!==parent||!allowed(event.origin)||m?.channel!==channel||m.type!=='segment'||started)return;
    if(!(m.rgba instanceof Uint8ClampedArray)||m.rgba.length!==512*512*4)return;
    started=true;worker=new Worker(new URL('./pixel-worker.mjs',import.meta.url),{type:'module'});
    const send=(message,transfer=[])=>parent.postMessage({...message,channel},event.origin,transfer);
    worker.onmessage=({data})=>{send(data,data.prediction?[data.prediction.buffer]:[]);if(['result','error'].includes(data.type)){worker.terminate();worker=null;}};
    worker.onerror=()=>{send({type:'error',message:'이 기기에서 자동 분리를 완료하지 못했습니다. 접수한 원본은 유지됩니다.'});worker?.terminate();worker=null;};
    worker.postMessage({rgba:m.rgba},[m.rgba.buffer]);
  });
  parent.postMessage({type:'ready',channel},'*'); // readiness carries no photo or secret
  addEventListener('pagehide',()=>worker?.terminate());
}

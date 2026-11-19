const channel=new URL(location.href).searchParams.get('channel');
const allowed=origin=>origin==='https://script.google.com'||origin==='https://script.googleusercontent.com'||/^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(origin)||origin===location.origin;
let worker,activeJob;
if(/^[a-zA-Z0-9_-]{16,80}$/.test(channel||'')&&parent!==window){
  addEventListener('message',event=>{
    const m=event.data;if(event.source!==parent||!allowed(event.origin)||m?.channel!==channel||m.type!=='segment'||activeJob)return;
    if(!(m.rgba instanceof Uint8ClampedArray)||m.rgba.length!==512*512*4)return;
    const jobId=m.jobId||'legacy';if(!/^[a-zA-Z0-9_-]{1,80}$/.test(jobId))return;
    activeJob={id:jobId,origin:event.origin};
    if(!worker){
      worker=new Worker(new URL('./pixel-worker.mjs?v=session2',import.meta.url),{type:'module'});
      worker.onmessage=({data})=>{
        if(!activeJob||data.jobId!==activeJob.id)return;
        parent.postMessage({...data,channel},activeJob.origin,data.prediction?[data.prediction.buffer]:[]);
        if(['result','error'].includes(data.type))activeJob=null;
        if(data.type==='error'){worker.terminate();worker=null;}
      };
      worker.onerror=()=>{if(activeJob)parent.postMessage({type:'error',channel,jobId:activeJob.id,message:'이 기기에서 자동 분리를 완료하지 못했습니다. 접수한 원본은 유지됩니다.'},activeJob.origin);worker?.terminate();worker=null;activeJob=null;};
    }
    worker.postMessage({jobId,rgba:m.rgba},[m.rgba.buffer]);
  });
  parent.postMessage({type:'ready',channel,protocol:2},'*'); // readiness carries no photo or secret
  addEventListener('pagehide',()=>worker?.terminate());
}

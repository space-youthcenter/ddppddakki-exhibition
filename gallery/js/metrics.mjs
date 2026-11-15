/** A random per-day browser token and a 30-minute inactivity session.
 * Storage denial falls back to one in-memory identity for this page. */
export function sessionIdentity(storage,now=()=>Date.now(),uuid=()=>crypto.randomUUID()){
 const memory=new Map(),read=k=>{try{return JSON.parse(storage?.getItem(k))||memory.get(k);}catch{return memory.get(k);}},write=(k,v)=>{memory.set(k,v);try{storage?.setItem(k,JSON.stringify(v));}catch{}};
 return {current(){const at=now(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));let device=read('dd-gallery-daily-device'),session=read('dd-gallery-session');
  if(!device||device.day!==day)device={id:uuid(),day};if(!session||at-session.last>=1800000||session.last>at)session={id:uuid()};session.last=at;write('dd-gallery-daily-device',device);write('dd-gallery-session',session);return {deviceId:device.id,sessionId:session.id};
 },clear(){memory.clear();try{storage?.removeItem('dd-gallery-daily-device');storage?.removeItem('dd-gallery-session');}catch{}}};
}
export function createMetricsClient(endpoint){
 let storage;try{storage=localStorage;}catch{}
 const identity=sessionIdentity(storage),channel=crypto.randomUUID(),pending=new Map();
 let enabled=false,queue=[],timer,frame,peer,peerOrigin,starting,lastSession,activityAt=0,inFlight=false,memoryOptOut=false;
 const optedOut=()=>{try{return storage?.getItem('dd-gallery-metrics-optout')==='true'||memoryOptOut;}catch{return memoryOptOut;}};
 const googleOrigin=value=>{try{const u=new URL(value);return u.protocol==='https:'&&/^[a-z0-9-]+-script\.googleusercontent\.com$/.test(u.hostname);}catch{return false;}};
 window.addEventListener('message',event=>{
  const m=event.data;if(!m||m.source!=='dd-gallery-metrics'||m.channel!==channel||!googleOrigin(event.origin))return;
  if(m.type==='ready'&&frame&&starting){peer=event.source;peerOrigin=event.origin;clearTimeout(starting.timer);starting.resolve();starting=null;return;}
  if(event.source!==peer||event.origin!==peerOrigin)return;
  const p=pending.get(m.requestId);if(p){pending.delete(m.requestId);clearTimeout(p.timer);p.resolve(m);}
 });
 async function transport(payload){
  const url=new URL(endpoint,location.href);
  if(url.origin===location.origin&&['localhost','127.0.0.1'].includes(url.hostname)){
   const rpc=async(method,arg)=>{const r=await fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,args:[arg]})});const body=await r.json();if(!body.ok)throw new Error('metrics');return body.data;};
   const b=await rpc('metricsBootstrap',payload);return b.enabled?rpc('recordMetrics',{...payload,ticket:b.token}):{accepted:false,disabled:true};
  }
  if(!peer){
   if(!starting){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;}),wait={promise,resolve,reject};starting=wait;frame=document.createElement('iframe');frame.title='전시관 관람 집계 연결';frame.hidden=true;frame.referrerPolicy='no-referrer';url.search=new URLSearchParams({page:'metrics',channel});frame.src=url.href;document.body.append(frame);wait.timer=setTimeout(()=>{if(starting===wait){wait.reject(new Error('metrics timeout'));starting=null;frame?.remove();frame=null;}},30000);}
   await starting.promise;
  }
  return new Promise((resolve,reject)=>{const requestId=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('metrics timeout'));},25000);pending.set(requestId,{resolve,timer});peer.postMessage({type:'dd-gallery-metrics-record',channel,requestId,payload},peerOrigin);});
 }
 async function flush(){clearTimeout(timer);if(!enabled||optedOut()||!queue.length||inFlight)return;inFlight=true;const payload=queue.splice(0,10),ids=payload[0].ids,events=payload.filter(x=>x.ids.sessionId===ids.sessionId&&x.ids.deviceId===ids.deviceId);queue.unshift(...payload.filter(x=>!events.includes(x)));
  try{let result;for(let attempt=0;attempt<2;attempt++){if(!enabled||optedOut())break;try{result=await transport({...ids,events:events.map(x=>x.event)});if(result.disabled){setEnabled(false);break;}if(result.accepted)break;}catch{}}
   // A delivery failure is a possible undercount, never a successful delivery claim.
  }finally{inFlight=false;if(queue.length&&enabled)timer=setTimeout(flush,1500);}
 }
 function record(type,workId){if(!endpoint||!enabled||optedOut())return;const ids=identity.current();if(lastSession!==ids.sessionId){lastSession=ids.sessionId;queue.push({ids,event:{type:'session'}});}if(type==='view')queue.push({ids,event:{type,workId}});queue=queue.slice(-20);clearTimeout(timer);timer=setTimeout(flush,1200);}
 function disconnect(){if(starting){clearTimeout(starting.timer);starting.reject(new Error('metrics disabled'));starting=null;}for(const p of pending.values()){clearTimeout(p.timer);p.resolve({accepted:false,disabled:true});}pending.clear();frame?.remove();frame=null;peer=null;peerOrigin=null;}
 function setEnabled(value){const next=value===true&&!!endpoint;if(enabled===next)return;enabled=next;if(enabled)record('session');else{queue=[];lastSession=null;clearTimeout(timer);disconnect();}}
 function setOptOut(value){memoryOptOut=!!value;try{storage?.setItem('dd-gallery-metrics-optout',String(!!value));}catch{}if(value){queue=[];identity.clear();clearTimeout(timer);disconnect();lastSession=null;}else if(enabled)record('session');}
 const activity=()=>{if(!enabled||optedOut()||Date.now()-activityAt<1000)return;activityAt=Date.now();const ids=identity.current();if(lastSession!==ids.sessionId)record('session');};
 for(const name of ['pointerdown','keydown','scroll'])window.addEventListener(name,activity,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
 return {record,setEnabled,optedOut,setOptOut};
}

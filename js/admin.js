(function(){
"use strict";
let reservations=[];
const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const expanded=()=>reservations.flatMap(r=>Visit.times(r).map(time=>({...r,slotTime:time})));
const dateLabel=d=>CONFIG.EVENT_DATES.find(x=>x.value===d)?.label||d;
function render(){
 const date=document.querySelector("#filter-date").value,time=document.querySelector("#filter-time").value;
 const rows=expanded().filter(r=>(!date||r.date===date)&&(!time||r.slotTime===time)).sort((a,b)=>(a.date+a.slotTime).localeCompare(b.date+b.slotTime));
 const slots=new Map(Visit.fixedSlots().map(s=>[s.date+"|"+s.time,s]));
 expanded().forEach(r=>slots.set(r.date+"|"+r.slotTime,{date:r.date,time:r.slotTime}));
 document.querySelector("#reservation-count").textContent=new Set(rows.map(r=>r.ticketId)).size+"건";
 document.querySelector("#print-scope").textContent=(date?dateLabel(date):"전체 날짜")+" / "+(time||"전체 시간대");
 document.querySelector("#slot-list").innerHTML=Array.from(slots.values()).filter(s=>(!date||s.date===date)&&(!time||s.time===time)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(s=>{
 const active=rows.filter(r=>r.date===s.date&&r.slotTime===s.time&&["예약 완료","참여 확인"].includes(r.status));
 return `<tr><td>${esc(dateLabel(s.date))}</td><td>${esc(s.time)}</td><td>${active.length}건</td><td>${active.reduce((n,r)=>n+Number(r.peopleCount),0)}명</td></tr>`;
 }).join("");
 // Keep per-slot rows above for summary counts; group only the detailed roster.
 const details=new Map();
 rows.forEach(r=>{if(!details.has(r.ticketId))details.set(r.ticketId,{...r,visitTimes:new Set()});});
 // Use all selected times even when the operator filters to one matching time slot.
 reservations.forEach(r=>{
 const detail=details.get(r.ticketId);
 if(detail)Visit.times(r).forEach(t=>detail.visitTimes.add(t));
 });
 document.querySelector("#admin-list").innerHTML=Array.from(details.values()).map(r=>`<tr><td>${esc(dateLabel(r.date))}</td><td>${esc(Array.from(r.visitTimes).sort().join(", "))}</td><td>${esc(r.ticketId)}</td><td>${esc(r.name)}</td><td>${esc(r.contactPhone||"-")}</td><td class="no-print">${esc(r.checkCode)}</td><td>${Number(r.peopleCount)}명</td><td>${esc(r.status)}</td><td class="no-print">${esc(r.createdAt)}</td><td class="no-print"><button data-action="check" data-id="${esc(r.ticketId)}" ${r.status!=="예약 완료"?"disabled":""}>참여 확인</button><button data-action="cancel" data-id="${esc(r.ticketId)}" ${r.status==="취소"?"disabled":""}>취소</button></td></tr>`).join("")||'<tr><td colspan="10">해당 예약이 없습니다.</td></tr>';
}
function updateTimes(){
 const date=document.querySelector("#filter-date").value,select=document.querySelector("#filter-time"),previous=select.value;
 const values=new Set([...Visit.fixedSlots().filter(s=>!date||s.date===date).map(s=>s.time),...expanded().filter(r=>!date||r.date===date).map(r=>r.slotTime)]);
 select.replaceChildren(new Option("전체 시간대",""));Array.from(values).sort().forEach(t=>select.add(new Option(t,t)));if(values.has(previous))select.value=previous;
}
document.addEventListener("DOMContentLoaded",async()=>{
 const date=document.querySelector("#filter-date"),time=document.querySelector("#filter-time");
 CONFIG.EVENT_DATES.forEach(d=>date.add(new Option(d.label,d.value)));
 date.addEventListener("change",()=>{updateTimes();render();});time.addEventListener("change",render);
 document.querySelector("#print-current").addEventListener("click",()=>{document.body.dataset.printMode="all";window.print();});
 document.querySelector("#print-list").addEventListener("click",()=>{document.body.dataset.printMode="list";window.print();});
 document.querySelector("#print-all").addEventListener("click",()=>{date.value="";updateTimes();time.value="";render();document.body.dataset.printMode="all";window.print();});
 try{reservations=await getReservations();updateTimes();render();document.querySelectorAll(".print-tools button").forEach(b=>b.disabled=false);}
 catch(e){document.querySelector("#admin-error").textContent=e.message||"예약 목록을 불러오지 못했습니다.";}
 document.querySelector("#admin-list").addEventListener("click",async e=>{
 const button=e.target.closest("button[data-action]");if(!button)return;
 if(button.dataset.action==="cancel"&&!confirm("이 예약의 모든 선택 시간대를 취소할까요?"))return;
 document.querySelectorAll("#admin-list button").forEach(b=>b.disabled=true);
 try{await updateReservationStatus(button.dataset.id,button.dataset.action==="check"?"참여 확인":"취소");reservations=await getReservations();render();}
 catch(error){document.querySelector("#admin-error").textContent=error.message;render();}
 });
});
})();

(function () {
  'use strict';
  const times = r => Array.from(new Set(String(r.time || '').split(',').map(t => t.trim()).filter(Boolean))).sort();
  const range = hour => `${String(hour).padStart(2,'0')}:00~${String(hour+1).padStart(2,'0')}:00`;
  const local = () => JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
  const validTicketId = value => typeof value === 'string' && value.length <= 100 && /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+$/.test(value);
  const request = async (action, payload={}) => {
    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload})});
    if (!response.ok) throw new Error('예약 서버에 연결하지 못했습니다.');
    const invalidResponse = () => new Error(`예약 서버 응답에서 올바른 예약번호를 확인하지 못했습니다. 중복 예약을 피하려면 다시 예약하기 전에 내 승차권 확인에서 저장 여부를 확인해 주세요. 요청 예약번호: ${payload.data.ticketId}`);
    let result;
    try { result = await response.json(); }
    catch (_) { throw invalidResponse(); }
    // Log only response identifiers, never participant details or verification codes.
    console.debug('createVisitReservation response:', JSON.stringify({success:result?.success,ticketId:result?.ticketId,dataTicketId:result?.data?.ticketId,service:result?.data?.service,status:result?.data?.status}));
    if (result?.success !== true) throw new Error(result?.message || '예약 요청을 처리하지 못했습니다.');
    // Accept both {success, ticketId} and the existing {success, data:{ticketId}} contract.
    const ticketId = result.ticketId ?? result.data?.ticketId;
    if (!validTicketId(ticketId) || (result.ticketId != null && result.data?.ticketId != null && result.ticketId !== result.data.ticketId)) throw invalidResponse();
    return {...(result.data && typeof result.data === 'object' ? result.data : {}), ticketId};
  };
  const fixedSlots = () => Object.entries(CONFIG.VISIT_HOURS).flatMap(([date,[start,end]]) =>
    Array.from({length:end-start},(_,i)=>({programId:'visit',programName:'전시회 방문',date,time:range(start+i),isOpen:true})));
  const getVisitSlots = () => Promise.resolve(fixedSlots());
  const getVisitAvailability = date => Promise.resolve(fixedSlots().filter(s=>s.date===date));
  const createVisit = async input => {
    const selected=Array.from(new Set(input.times)).sort();
    if (!selected.length) throw new Error('방문 시간대를 하나 이상 선택해 주세요.');
    const stamp=new Date();
    const ticketId=`DD-${stamp.getFullYear()}${String(stamp.getMonth()+1).padStart(2,'0')}${String(stamp.getDate()).padStart(2,'0')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const data={...input,times:selected,ticketId,programId:'visit',programName:'전시회 방문',time:selected.join(', '),status:'예약 완료',createdAt:stamp.toISOString(),updatedAt:stamp.toISOString()};
    const states=await getVisitAvailability(data.date);
    if (!Number.isInteger(data.peopleCount)||data.peopleCount<1||data.peopleCount>4) throw new Error('참여 인원은 1~4명이어야 합니다.');
    for(const t of selected){const s=states.find(s=>s.time===t);if(!s||!s.isOpen)throw new Error(`${t} 운영 시간대를 확인해 주세요.`);}
    if (!CONFIG.USE_MOCK_DATA) return request('createVisitReservation',{data});
    const rows=local();rows.push(data);localStorage.setItem(CONFIG.STORAGE_KEY,JSON.stringify(rows));return data;
  };
  window.Visit={times,fixedSlots,getVisitAvailability,createVisit};
  window.getSlots=getVisitSlots;
  window.createReservation=createVisit;
  Object.assign(window.ReservationAPI, {createReservation:createVisit, getSlots:getVisitSlots});
  document.addEventListener('DOMContentLoaded',()=>{
    const form=document.querySelector('#reservation-form');if(!form)return;
    const date=form.elements.date, party=form.elements.peopleCount, box=document.querySelector('#visit-slots'), notice=document.querySelector('#timeslot-loading-message'), summary=document.querySelector('#availability-message'), submit=form.querySelector('[type=submit]'), message=document.querySelector('#form-message');
    CONFIG.EVENT_DATES.forEach(d=>date.add(new Option(d.label,d.value)));
    let states=[],busy=false;
    const selected=()=>Array.from(box.querySelectorAll('input:checked')).map(i=>i.value);
    const refresh=()=>{
      const picked=selected(), count=Number(party.value);
      box.querySelectorAll('input').forEach(i=>{const s=states.find(s=>s.time===i.value);i.disabled=busy||!s.isOpen;i.closest('label').classList.toggle('unavailable',i.disabled);});
      const valid=picked.length && picked.every(t=>states.some(s=>s.time===t&&s.isOpen));
      submit.disabled=busy||!valid;
      summary.textContent=picked.length?`${picked.join(', ')} · 각 시간대 ${count}명${valid?'':' · 방문 시간대를 다시 선택해 주세요.'}`:'방문 시간대를 하나 이상 선택해 주세요.';
    };
    const load=()=>{
      states=fixedSlots().filter(s=>s.date===date.value);
      box.replaceChildren();notice.hidden=true;
      for(const s of states){
        const label=document.createElement('label'),check=document.createElement('input'),text=document.createElement('span');
        check.type='checkbox';check.name='times';check.value=s.time;
        text.textContent=s.time.replace('~',' ~ ');label.className='visit-slot';label.append(check,text);box.append(label);
      }
      refresh();
      if(!date.value)summary.textContent='날짜를 선택한 뒤 방문 시간대를 선택해 주세요.';
    };
    date.addEventListener('change',load);party.addEventListener('change',refresh);box.addEventListener('change',refresh);
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(busy||!form.reportValidity()||!selected().length)return;
      const input={date:date.value,times:selected(),peopleCount:Number(party.value),name:form.elements.name.value.trim(),checkCode:form.elements.checkCode.value.trim(),contactPhone:form.elements.contactPhone.value.trim()};
      busy=true;submit.disabled=true;submit.textContent='승차권 발급 중…';message.textContent='';
      try{
        const r=await createVisit(input);
        if(!validTicketId(r?.ticketId))throw new Error('예약번호를 확인하지 못했습니다. 내 승차권 확인에서 저장 여부를 확인해 주세요.');
        location.href=`ticket.html?ticketId=${encodeURIComponent(r.ticketId)}`;
      }
      catch(e){message.textContent=e.message||'예약을 처리하지 못했습니다.';busy=false;submit.textContent='예약 완료 · 승차권 발급';refresh();}
    });
  });
})();

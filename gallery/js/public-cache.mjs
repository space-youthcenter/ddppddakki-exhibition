// Memory only. A recent catalog is the authority for every cached image.
export const PUBLIC_LEASE_MS=45000;
const trim=(map,max)=>{let bytes=Array.from(map.values()).reduce((n,r)=>n+r.bytes,0);while(map.size>1&&(map.size>6||bytes>max)){const id=map.keys().next().value;bytes-=map.get(id).bytes;map.delete(id);}};
const signature=w=>JSON.stringify([w.id,w.updatedAt,w.mediaVersion,w.placement,w.displayType,w.displayScale,w.hasCutout]);
export class PublicGalleryCache {
 constructor({now=()=>Date.now(),leaseMs=PUBLIC_LEASE_MS}={}){this.now=now;this.leaseMs=leaseMs;this.checkedAt=-Infinity;this.works=new Map();this.rooms=new Map();this.details=new Map();this.catalog=null;}
 fresh(){return this.now()-this.checkedAt<this.leaseMs;}
 roomKey(id){return JSON.stringify([Array.from(this.works.values()).filter(w=>w.placement.room===id).map(signature),(this.catalog?.fixtures||[]).filter(f=>f.room===id)]);}
 sync(catalog){
  this.catalog=catalog;this.works=new Map(catalog.works.map(w=>[w.id,w]));this.checkedAt=this.now();
  for(const [id,row]of this.rooms)if(row.key!==this.roomKey(id))this.rooms.delete(id);
  for(const [id,row]of this.details)if(row.key!==this.workKey(id))this.details.delete(id);
 }
 confirm(){if(this.catalog)this.checkedAt=this.now();}
 workKey(id){const w=this.works.get(id);return w?signature(w):null;}
 ticket(room){return {room,key:this.roomKey(room),revision:this.catalog?.revision};}
 putRoom(ticket,value){
  if(!this.fresh()||ticket.key!==this.roomKey(ticket.room)||value.revision!==this.catalog?.revision)return false;
  if(value.works.some(w=>!this.works.has(w.id)||signature(w)!==this.workKey(w.id)))return false;
  this.rooms.delete(ticket.room);this.rooms.set(ticket.room,{key:ticket.key,value,bytes:JSON.stringify(value).length});trim(this.rooms,8000000);return true;
 }
 room(id){return this.fresh()?this.rooms.get(id)?.value:null;}
 preview(id){if(!this.fresh()||!this.works.has(id))return null;for(const r of this.rooms.values()){const w=r.value.works.find(w=>w.id===id);if(w)return w;}return null;}
 putDetail(id,key,value){if(!this.fresh()||!key||key!==this.workKey(id)||signature(value)!==key)return false;this.details.delete(id);this.details.set(id,{key,value,bytes:JSON.stringify(value).length});trim(this.details,8000000);return true;}
 detail(id){return this.fresh()?this.details.get(id)?.value:null;}
 clear(){this.rooms.clear();this.details.clear();}
}

import {orientArtworkMedia} from './display-orientation.mjs';
/** Presentation is separate from allocation. Switching A/B or a failed cutout
 * never updates placement, approval, or the source asset. */
export const DISPLAY_TYPES = { object: '입체형', frame: '벽면 액자', easel: '이젤', special: '특수형 · 전용 전시대' };

export function presentationFor(work, slot, variant = 'B') {
  const type = work.displayType ?? 'frame';
  const cutout = work.media?.cutout;
  const ready = cutout?.status === 'approved' && cutout.url && cutout.width > 0 && cutout.height > 0;
  const supported = slot.support && slot.supports.includes(type);
  const useCutout = variant === 'B' && ['object', 'special'].includes(type) && ready && supported && work.displayPreference !== 'original';
  if (useCutout) return orientArtworkMedia({ kind: type, imageUrl: cutout.url, originalUrl: work.imageUrl, width: cutout.width, height: cutout.height,
    support: type === 'special' ? { ...slot.support, style: 'console' } : slot.support, contact: cutout.contact ?? { x: .5, y: 1 }, scale: work.displayScale ?? 1, fallback: false },work.displayRotation);
  const kind = slot.type === 'frame' ? 'frame' : 'easel';
  return orientArtworkMedia({ kind, imageUrl: work.imageUrl, originalUrl: work.imageUrl, width: work.width, height: work.height,
    scale: work.displayScale ?? 1, fallback: variant === 'B' && ['object', 'special'].includes(type),
    reason: work.displayPreference === 'original' ? '원본 사진 전시 선택' : !ready ? '승인된 누끼 이미지 없음' : !supported ? '평면 슬롯에서 원본 사진 감상' : '' },work.displayRotation);
}

export function setDisplayPreference(state, id, preference) {
  if (!['auto', 'original'].includes(preference)) throw new Error('지원하지 않는 전시 방식입니다.');
  const work = state.works.find(w => w.id === id);
  if (!work) throw new Error('작품을 찾을 수 없습니다.');
  work.displayPreference = preference;
  return work;
}

export function objectGeometry(slot, artwork, support) {
  // Keep both images' native aspect ratios. A support may be narrower when tall.
  const scale = Math.min(slot.width * .88 / support.width, slot.height * .47 / support.height);
  const sw = support.width * scale, sh = support.height * scale;
  const sl = (slot.width - sw) / 2, st = slot.height * .94 - sh;
  const contactX = sl + sw * support.seat.x, contactY = st + sh * support.seat.y;
  const a = artwork.contact ?? { x: .5, y: 1 };
  // Account for an off-centre handle and the projected ground-plane origin.
  const maxWidth = Math.min(contactX / Math.max(a.x,.01), (slot.width-contactX) / Math.max(1-a.x,.01), slot.width*.92, sw*(support.maxArtworkWidth ?? 2));
  const artScale = Math.min(maxWidth/artwork.width, contactY / (artwork.height*Math.max(a.y,.01))) * Math.max(.4,Math.min(1,artwork.scale ?? 1));
  const aw = artwork.width*artScale, ah = artwork.height*artScale;
  return { support: { left: sl, top: st, width: sw, height: sh },
    artwork: { left: contactX-aw*a.x, top: contactY-ah*a.y, width: aw, height: ah },
    contact: { x:contactX, y:contactY }, floor: { x: sl+sw*support.floor.x, y: st+sh*support.floor.y },
    labelY: contactY+(st+sh-contactY)*.52 };
}

/** Fit the frame and artwork independently: its measured transparent aperture
 * is the mat, while contain preserves the complete original image. */
export function flatGeometry(slot, presentation, frame, easel) {
  const standing = presentation.kind === 'easel';
  let support = null, seat = null;
  if (standing) {
    const scale = Math.min(slot.width*.88/easel.width, slot.height*.94/easel.height);
    support = { left:(slot.width-easel.width*scale)/2, top:slot.height*.94-easel.height*scale, width:easel.width*scale, height:easel.height*scale };
    seat = { x:support.left+support.width*easel.seat.x, y:support.top+support.height*easel.seat.y };
  }
  const scale = Math.min(slot.width*.94/frame.width, (standing ? seat.y-slot.height*.025 : slot.height*.83)/frame.height)*Math.max(.4,Math.min(1,presentation.scale ?? 1));
  const width = frame.width*scale, height = frame.height*scale;
  const left = Math.max(0,Math.min(slot.width-width,(seat?.x ?? slot.width/2)-width/2));
  const top = standing ? seat.y-height : 0;
  const opening = frame.aperture;
  return { support, frame:{left,top,width,height}, aperture:{left:left+width*opening.x,top:top+height*opening.y,width:width*opening.width,height:height*opening.height},
    labelY:standing ? slot.height*.78 : top+height+slot.height*.055,
    floor: standing ? {x:support.left+support.width*easel.floor.x,y:support.top+support.height*easel.floor.y} : null };
}

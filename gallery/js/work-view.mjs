import {creatorLabel} from './work-info.mjs';
import { ROOM_SIZE, slotFor } from './layout.mjs?v=higgsfield1';
import { ASSETS } from './assets.mjs?v=higgsfield1';
import { presentationFor, objectGeometry, flatGeometry } from './presentation.mjs?v=higgsfield1';

export function safeImageUrl(value) {
  if (typeof value === 'string' && value.length <= 16000000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return value;
  const url = new URL(value, location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL('./assets/art/', location.href).pathname)) {
    throw new Error('허용되지 않은 작품 이미지 주소입니다.');
  }
  return url.href;
}

export function positionElement(el, slot) {
  Object.assign(el.style, {
    left: `${slot.x / ROOM_SIZE.width * 100}%`, top: `${slot.y / ROOM_SIZE.height * 100}%`,
    width: `${slot.width / ROOM_SIZE.width * 100}%`, height: `${slot.height / ROOM_SIZE.height * 100}%`, zIndex: slot.depth,
  });
  el.style.setProperty('--rotate', `${slot.rotate}deg`);
  el.style.setProperty('--skew', `${slot.skew}deg`);
}

export function workRenderKey(work, variant, failed = false) {
  return JSON.stringify([variant, work.displayType, work.displayPreference, work.media?.cutout, work.displayScale, work.title, work.creatorDisplayName, failed]);
}

export function createWorkElement(work, { variant = 'B', onOpen, onImageError, arrival = false, failed = false } = {}) {
  const slot = slotFor(work.placement);
  const p = presentationFor(failed ? { ...work, displayPreference: 'original' } : work, slot, variant);
  const make = (tag, cls) => { const el = document.createElement(tag); el.className = cls; return el; };
  const button = make('button', 'g-work'); button.type = 'button';
  Object.assign(button.dataset, { workId: work.id, slot: slot.id, type: p.kind, presentation: p.kind, variant,
    surface: work.placement.surface ?? '', fallback: String(p.fallback), renderKey: workRenderKey(work, variant, failed) });
  button.setAttribute('aria-label', `${work.title}, ${creatorLabel(work)}, ${work.material ?? work.category}, 작품 크게 감상하기`);
  positionElement(button, slot);
  const sculptural = ['object', 'special'].includes(p.kind);
  const rect = (el, r) => Object.assign(el.style, { left:`${r.left/slot.width*100}%`, top:`${r.top/slot.height*100}%`, width:`${r.width/slot.width*100}%`, height:`${r.height/slot.height*100}%` });
  const media = (cls, source, bounds) => { const el = make('img', cls); el.src = source.url; el.alt = ''; el.draggable = false; rect(el,bounds); return el; };
  let geometry, flat;
  const artwork = make('img', 'g-work-image');
  if (sculptural) {
    const support = ASSETS.supports[p.support.style];
    geometry = objectGeometry(slot, p, support);
    button.style.setProperty('--seat', `${geometry.contact.y/slot.height*100}%`);
    button.style.setProperty('--floor', `${geometry.floor.y/slot.height*100}%`);
    button.style.setProperty('--floor-x', `${geometry.floor.x/slot.width*100}%`);
    button.style.setProperty('--label-top', `${geometry.labelY/slot.height*100}%`);
    button.style.setProperty('--contact-x', `${geometry.contact.x/slot.width*100}%`);
    button.style.setProperty('--shadow-width', `${geometry.support.width/slot.width*95}%`);
    button.style.setProperty('--contact-width', `${Math.min(geometry.artwork.width*.55,geometry.support.width*.6)/slot.width*100}%`);
    button.dataset.contactY = String(p.contact.y);
    button.dataset.contactX = String(p.contact.x);
    button.dataset.supportSeatY = String(support.seat.y);
    button.dataset.supportSeatX = String(support.seat.x);
    button.dataset.support = p.support.style;
    const floor = make('span', 'g-floor-shadow'); const contact = make('span', 'g-contact-shadow');
    floor.setAttribute('aria-hidden', 'true'); contact.setAttribute('aria-hidden', 'true');
    button.append(floor, media('g-work-support',support,geometry.support), contact);
    rect(artwork,geometry.artwork);
  } else {
    button.classList.add('g-work-flat');
    const frame = ASSETS.frames[p.width/p.height < .95 ? 'portrait' : 'landscape'];
    flat = flatGeometry(slot,p,frame,ASSETS.easel);
    if (flat.support) {
      button.style.setProperty('--floor', `${flat.floor.y/slot.height*100}%`);
      button.style.setProperty('--floor-x', `${flat.floor.x/slot.width*100}%`);
      button.style.setProperty('--shadow-width', `${flat.support.width/slot.width*95}%`);
      const shadow = make('span','g-floor-shadow');shadow.setAttribute('aria-hidden','true');
      button.append(shadow,media('g-work-easel',ASSETS.easel,flat.support));
    }
    const mat = make('span','g-work-mat');rect(mat,flat.aperture);mat.setAttribute('aria-hidden','true');
    button.append(mat,media('g-work-frame',frame,flat.frame));
    button.dataset.aperture = JSON.stringify(flat.aperture);
    rect(artwork,flat.aperture);
  }
  artwork.src = safeImageUrl(p.imageUrl); artwork.alt = ''; artwork.draggable = false;
  artwork.addEventListener('error', () => {
    if (sculptural) onImageError?.(work.id);
    else { artwork.alt = '이미지를 불러오지 못했습니다'; button.dataset.imageError = 'true'; }
  }, { once: true });
  const label = make('span', 'g-work-label'); const number = make('b', ''); const title = make('span', '');
  if (geometry) Object.assign(label.style, { left:`${(geometry.support.left+geometry.support.width*.10)/slot.width*100}%`, width:`${geometry.support.width*.82/slot.width*100}%` });
  if (flat) Object.assign(label.style, { top:`${flat.labelY/slot.height*100}%`, left:'9%', width:'82%' });
  number.textContent = work.labelNumber ?? work.id.replace('demo-', '').slice(-2); title.textContent = work.title;
  const caption=make('span','g-work-caption');caption.append(title);if(work.creatorDisplayName&&work.creatorDisplayName!=='익명 제작자'){const creator=make('small','g-work-creator');creator.textContent=creatorLabel(work);caption.append(creator);}label.append(number, caption); button.append(artwork, label);
  if (arrival) { button.classList.add('g-work-new'); button.addEventListener('animationend', () => button.classList.remove('g-work-new'), { once: true }); }
  button.addEventListener('click', () => onOpen?.(work.id, button));
  return button;
}

/** Pure, deterministic placement. The production approval service must own this transaction. */
export const SCHEMA_VERSION = 1;
export const ROOM_SIZE = { width: 1600, height: 900 };

// Bounds include the object, its label and its small perspective transform.
// Never rearrange an occupied slot. Version the layout if these coordinates change.
export const LEGACY_SLOTS = Object.freeze([
  { id: 'central-easel', order: 0, type: 'easel', x: 682, y: 347, width: 210, height: 380, ratios: ['square', 'portrait'], idealRatio: 1, rotate: -1, skew: 0, depth: 4 },
  { id: 'left-portrait', order: 1, type: 'frame', x: 98, y: 269, width: 155, height: 247, ratios: ['portrait'], idealRatio: 0.67, rotate: 0, skew: -12, depth: 1 },
  { id: 'right-plinth', order: 2, type: 'plinth', x: 1260, y: 510, width: 184, height: 268, ratios: ['square'], idealRatio: 1, rotate: 0, skew: 0, depth: 5 },
  { id: 'back-landscape', order: 3, type: 'frame', x: 347, y: 270, width: 247, height: 188, ratios: ['landscape'], idealRatio: 1.5, rotate: 0, skew: 0, depth: 2 },
  { id: 'back-portrait', order: 4, type: 'frame', x: 1022, y: 246, width: 153, height: 251, ratios: ['portrait'], idealRatio: 0.67, rotate: 0, skew: 0, depth: 2 },
  { id: 'right-landscape', order: 5, type: 'frame', x: 1334, y: 277, width: 185, height: 162, ratios: ['landscape'], idealRatio: 1.5, rotate: 0, skew: 12, depth: 1 },
  { id: 'small-easel', order: 6, type: 'easel', x: 358, y: 505, width: 172, height: 290, ratios: ['portrait', 'square'], idealRatio: 0.8, rotate: 2, skew: 0, depth: 5 },
  { id: 'left-plinth', order: 7, type: 'plinth', x: 102, y: 612, width: 168, height: 216, ratios: ['landscape', 'square'], idealRatio: 1.3, rotate: 0, skew: 0, depth: 6 },
].map(s => ({ ...s, displayType: s.type === 'frame' ? 'frame' : 'object', supports: s.type === 'frame' ? ['frame'] : ['object', 'special', 'easel'], support: { style: 'stone', seat: 58, base: 92 } })));

// Layout 2 is used for NEW collections only. Saved layout-1 coordinates never migrate.
export const SLOTS = Object.freeze([
  { id: 'maker-hero', order: 0, type: 'easel', displayType: 'object', supports: ['object', 'special', 'easel'], x: 650, y: 410, width: 270, height: 385, ratios: ['landscape', 'square'], idealRatio: 1.3, rotate: 0, skew: 0, depth: 5, support: { style: 'oak', seat: 72, base: 94 } },
  { id: 'west-wall', order: 1, type: 'frame', displayType: 'frame', supports: ['frame'], x: 382, y: 235, width: 158, height: 225, ratios: ['portrait'], idealRatio: .67, rotate: 0, skew: 0, depth: 1 },
  { id: 'east-sculpture', order: 2, type: 'easel', displayType: 'object', supports: ['object', 'special', 'easel'], x: 1080, y: 440, width: 220, height: 315, ratios: ['square'], idealRatio: 1, rotate: 0, skew: 0, depth: 4, support: { style: 'charcoal', seat: 58, base: 94 } },
  { id: 'back-print', order: 3, type: 'frame', displayType: 'frame', supports: ['frame'], x: 1062, y: 248, width: 244, height: 180, ratios: ['landscape'], idealRatio: 1.5, rotate: 0, skew: 0, depth: 1 },
  { id: 'west-ceramic', order: 4, type: 'easel', displayType: 'object', supports: ['object', 'special', 'easel'], x: 335, y: 470, width: 198, height: 295, ratios: ['portrait'], idealRatio: .7, rotate: 0, skew: 0, depth: 4, support: { style: 'round', seat: 54, base: 94 } },
  { id: 'mini-plinth', order: 5, type: 'easel', displayType: 'object', supports: ['object', 'special', 'easel'], x: 945, y: 470, width: 120, height: 242, ratios: ['square', 'portrait'], idealRatio: .9, rotate: 0, skew: 0, depth: 3, support: { style: 'oak', seat: 51, base: 94 } },
  { id: 'front-invention', order: 6, type: 'easel', displayType: 'object', supports: ['object', 'special', 'easel'], x: 1345, y: 566, width: 192, height: 275, ratios: ['portrait', 'square'], idealRatio: .85, rotate: 0, skew: 0, depth: 6, support: { style: 'stone', seat: 62, base: 94 } },
  { id: 'listening-table', order: 7, type: 'easel', displayType: 'special', supports: ['special', 'object', 'easel'], x: 92, y: 605, width: 215, height: 250, ratios: ['landscape', 'square'], idealRatio: 1.35, rotate: 0, skew: 0, depth: 6, support: { style: 'console', seat: 61, base: 94 } },
]);
export const slotsFor = (version = 2) => version === 1 ? LEGACY_SLOTS : SLOTS;
// Two wall positions have alternative low foreground mounts. Their geometry is
// chosen ONCE at allocation, so an object-heavy room can use eight floor mounts.
const FLOOR_ALTERNATIVES = {
  'west-wall': { x: 515, y: 790, width: 130, height: 110, support: { style: 'stone', seat: 60, base: 94 } },
  'back-print': { x: 1080, y: 785, width: 190, height: 112, support: { style: 'oak', seat: 65, base: 94 } },
};
export const slotFor = (placement) => {
  const slot = slotsFor(placement.layoutVersion ?? 1).find(s => s.id === placement.slotId);
  const alternate = placement.layoutVersion === 2 && placement.surface === 'floor' && FLOOR_ALTERNATIVES[placement.slotId];
  return alternate ? { ...slot, ...alternate, type: 'easel', displayType: 'object', supports: ['object', 'special', 'easel'], rotate: 0, skew: 0, depth: 7 } : slot;
};
export const CAPACITY = SLOTS.length;
export const THEMES = [
  { id: 'daylight', name: '햇살의 방', subtitle: '작은 상상이 모이는 공간' },
  { id: 'sage', name: '숲의 방', subtitle: '서로 다른 생각이 나란히 머무는 곳' },
  { id: 'amber', name: '노을의 방', subtitle: '오늘의 발견이 내일의 영감으로' },
];
export const themeFor = (room) => THEMES[(room - 1) % THEMES.length];
export const ratioKind = (width, height) => width / height < 0.83 ? 'portrait' : width / height > 1.2 ? 'landscape' : 'square';

export function emptyState(layoutVersion = 2) {
  return { schemaVersion: SCHEMA_VERSION, layoutVersion, revision: 0, nextSequence: 1, roomsOpened: 1, works: [] };
}

export function validateState(state) {
  if (!state || state.schemaVersion !== SCHEMA_VERSION || ![1, 2].includes(state.layoutVersion) || !Array.isArray(state.works) ||
      !Number.isInteger(state.roomsOpened) || state.roomsOpened < 1 || !Number.isInteger(state.nextSequence) || state.nextSequence < 1 ||
      !Number.isInteger(state.revision) || state.revision < 0) throw new Error('호환되지 않는 로컬 전시 데이터입니다.');
  const ids = new Set();
  const places = new Set();
  for (const work of state.works) {
    const p = work.placement;
    if (!work.id || ids.has(work.id) || !['published', 'hidden'].includes(work.status) ||
        !Number.isFinite(work.width) || work.width <= 0 || !Number.isFinite(work.height) || work.height <= 0 ||
        !p || (p.layoutVersion ?? 1) !== state.layoutVersion || !Number.isInteger(p.room) || p.room < 1 || p.room > state.roomsOpened || !slotFor(p)) {
      throw new Error('전시 데이터 검증에 실패했습니다.');
    }
    const key = `${p.room}/${p.slotId}`;
    if (places.has(key)) throw new Error('중복 전시 위치가 발견되었습니다.');
    ids.add(work.id);
    places.add(key);
  }
  return state;
}

export function allocate(state, work) {
  validateState(state);
  // Idempotent approval: retries must not allocate another slot.
  const existing = state.works.find(w => w.id === work.id);
  if (existing) {
    existing.status = 'published';
    return existing;
  }
  if (!Number.isFinite(work.width) || !Number.isFinite(work.height) || work.width <= 0 || work.height <= 0) {
    throw new Error('올바른 이미지 크기가 필요합니다.');
  }
  let room = 1;
  let free = [];
  while (!free.length) {
    const occupied = new Set(state.works.filter(w => w.placement.room === room).map(w => w.placement.slotId));
    free = slotsFor(state.layoutVersion).filter(s => !occupied.has(s.id));
    if (!free.length) room += 1;
  }
  const kind = ratioKind(work.width, work.height);
  const needsFloor = ['object', 'special', 'easel'].includes(work.displayType);
  // Fill the oldest available room. Prefer compatible ratios inside that room,
  // then curatorial order. A filled ratio group falls back to a contained mat.
  const slot = [...free].sort((a, b) =>
    (state.layoutVersion === 2 ? Number(needsFloor ? a.type === 'frame' : a.type !== 'frame') - Number(needsFloor ? b.type === 'frame' : b.type !== 'frame') : 0) ||
    (state.layoutVersion === 2 && work.displayType === 'special' ? Number(a.displayType !== 'special') - Number(b.displayType !== 'special') : 0) ||
    Number(!a.ratios.includes(kind)) - Number(!b.ratios.includes(kind)) || a.order - b.order
  )[0];
  const placement = { room, slotId: slot.id, layoutVersion: state.layoutVersion };
  if (state.layoutVersion === 2) placement.surface = needsFloor ? 'floor' : slot.type === 'frame' ? 'wall' : 'floor';
  const placed = { ...work, status: 'published', placement };
  state.works.push(placed);
  const roomFull = state.works.filter(w => w.placement.room === room).length === CAPACITY;
  state.roomsOpened = Math.max(state.roomsOpened, room + Number(roomFull));
  validateState(state);
  return placed;
}

export function setVisibility(state, id, visible) {
  const work = state.works.find(w => w.id === id);
  if (!work) throw new Error('작품을 찾을 수 없습니다.');
  work.status = visible ? 'published' : 'hidden';
  // Hidden slots remain reserved, including across an approval reversal.
  return work;
}

export function roomSummary(state, room) {
  const all = state.works.filter(w => w.placement.room === room);
  return { room, capacity: CAPACITY, reserved: all.length, published: all.filter(w => w.status === 'published').length };
}

export function publicSnapshot(state) {
  return {
    schemaVersion: state.schemaVersion, layoutVersion: state.layoutVersion, revision: state.revision,
    roomsOpened: state.roomsOpened,
    works: state.works.filter(w => w.status === 'published').map(({ id, title, category, description, width, height, imageUrl, placement, displayType, material, media, displayPreference }) =>
      ({ id, title, category, description, width, height, imageUrl, placement: { ...placement }, displayType: displayType ?? 'frame', material,
        displayPreference, media: media?.cutout?.status === 'approved' ? { cutout: { url: media.cutout.url, width: media.cutout.width, height: media.cutout.height, status: 'approved', contact: media.cutout.contact } } : undefined })),
  };
}

import { HIGGSFIELD } from './higgsfield-manifest.mjs?v=higgsfield1';
// Supplied originals are archived separately. Runtime uses local optimized assets.
export const ASSETS = {
  entrance: HIGGSFIELD.entrance.url,
  rooms: {
    daylight: HIGGSFIELD['room-base'].url,
    sage: HIGGSFIELD['room-forest'].url,
    amber: HIGGSFIELD['room-golden'].url,
  },
  frames: { portrait: HIGGSFIELD['frame-portrait'], landscape: HIGGSFIELD['frame-landscape'] },
  easel: HIGGSFIELD['easel-empty'],
  supports: {
    oak: HIGGSFIELD['plinth-low'],
    stone: HIGGSFIELD['plinth-tall'],
    round: HIGGSFIELD['plinth-tall'],
    charcoal: HIGGSFIELD['plinth-tall'],
    console: HIGGSFIELD['plinth-low'],
  },
};

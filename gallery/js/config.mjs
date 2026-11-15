// Public deployment URLs only. No passwords, API keys or private storage IDs.
// Separate gallery deployment. Intake and collection are gated by Script Properties.
const endpoint = 'https://script.google.com/macros/s/AKfycbzM4j-HSV0YTf1wr3wJgJRBdixIzRwue-2shpoacrqN2xI-JOOFrALIxuRGW4tze5rF/exec';
export const GALLERY_CONFIG = Object.freeze({
  endpoint,
  uploadUrl: endpoint + '?page=upload',
  guestbookUrl: endpoint + '?page=guestbook',
  pollMs: 60000,
  // Institution-approved client capability; the server remains the live switch.
  metricsEnabled: true,
});

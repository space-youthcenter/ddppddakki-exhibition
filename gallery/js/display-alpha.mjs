// Read-only display measurements. No RGB/alpha edits, encoding, uploads or API calls.
// ES5 is intentional: the same implementation runs in the TV viewer.
var displayAlphaCache = [], displayAlphaBytes = 0;
export function clearDisplayAlphaCache() { displayAlphaCache = []; displayAlphaBytes = 0; }
export function cachedDisplayOutline(url) {
  for (var i = displayAlphaCache.length - 1; i >= 0; i--) if (displayAlphaCache[i].url === url) return displayAlphaCache[i].outline;
  return undefined;
}
// The convex hull of every non-transparent pixel includes thin chains and
// antialiased edges. Four corners per row span suffice; RGB is never examined.
export function alphaOutlineFromRgba(data, width, height) {
  if (!(width > 0 && height > 0) || data.length !== width * height * 4) return null;
  var points = [], x, y, first, last;
  for (y = 0; y < height; y++) {
    first = -1; last = -1;
    for (x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 0) { if (first < 0) first = x; last = x; }
    if (first >= 0) points.push([first, y], [last + 1, y], [first, y + 1], [last + 1, y + 1]);
  }
  if (!points.length) return null;
  points.sort(function(a, b) { return a[0] - b[0] || a[1] - b[1]; });
  function cross(a, b, c) { return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); }
  function half(list) {
    var h = [], i;
    for (i = 0; i < list.length; i++) { while (h.length > 1 && cross(h[h.length-2], h[h.length-1], list[i]) <= 0) h.pop(); h.push(list[i]); }
    h.pop(); return h;
  }
  return half(points).concat(half(points.reverse())).map(function(p) { return [p[0]/width, p[1]/height]; });
}
export function measureDisplayOutline(img, url) {
  var known = cachedDisplayOutline(url), width = img.naturalWidth, height = img.naturalHeight, outline = null, canvas;
  if (known !== undefined) return known;
  if (!url || !(width > 0 && height > 0)) return null;
  try {
    // Inspect the already downloaded display derivative at its native pixels.
    // If canvas access is unavailable/tainted/too large, keep the original fit.
    if (width * height <= 4000000) {
      canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      var context = canvas.getContext('2d'); context.drawImage(img, 0, 0);
      outline = alphaOutlineFromRgba(context.getImageData(0, 0, width, height).data, width, height);
    }
  } catch (error) { outline = null; }
  if (canvas) canvas.width = canvas.height = 0;
  displayAlphaCache.push({url:url, outline:outline}); displayAlphaBytes += url.length * 2;
  while (displayAlphaCache.length > 24 || displayAlphaBytes > 32000000) displayAlphaBytes -= displayAlphaCache.shift().url.length * 2;
  return outline;
}

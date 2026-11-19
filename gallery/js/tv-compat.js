/* Run before modules. Older TV browsers are sent to the ES5/JPEG/PNG viewer. */
(function () {
  'use strict';
  var supported=false, media, hash=location.hash;
  try {
    media=window.matchMedia && window.matchMedia('(min-width: 1px)');
    supported=('noModule' in document.createElement('script')) && typeof window.ResizeObserver==='function' && window.crypto && typeof window.crypto.randomUUID==='function' && media && typeof media.addEventListener==='function' && window.CSS && typeof window.CSS.supports==='function' && window.CSS.supports('aspect-ratio','16 / 9') && window.CSS.supports('container-type','inline-size') && window.CSS.supports('font-size','1cqw') && window.HTMLDialogElement && typeof window.HTMLDialogElement.prototype.showModal==='function';
  } catch(ignore) {}
  if(/web0s|webos|netcast|lg browser|smarttv/i.test(navigator.userAgent||''))supported=false;
  if(!supported){if(!/^#(?:(?:make|take|wake)-[1-9][0-9]*|entrance)$/.test(hash))hash='#make-1';location.replace('./tv.html?v=20261119-1'+hash);}
}());

(function () {
  'use strict';
  // Only the representative phone field. Booking APIs and other numeric fields are untouched.
  const form = document.querySelector('#reservation-form');
  const phone = form && form.querySelector('input[name="contactPhone"]');
  if (!phone) return;

  const digitsOnly = value => value.replace(/\D/g, '').slice(0, 11);
  const format = value => {
    const digits = digitsOnly(value);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    const middleEnd = digits.length === 11 ? 7 : 6;
    return `${digits.slice(0, 3)}-${digits.slice(3, middleEnd)}-${digits.slice(middleEnd)}`;
  };
  const caretAfterDigits = (value, count) => {
    if (!count) return 0;
    for (let i = 0, seen = 0; i < value.length; i++) {
      if (/\d/.test(value[i]) && ++seen === count) return i + 1;
    }
    return value.length;
  };
  const normalize = () => {
    const raw = phone.value;
    const start = phone.selectionStart ?? raw.length;
    const end = phone.selectionEnd ?? start;
    const formatted = format(raw);
    if (raw === formatted) return;
    phone.value = formatted;
    if (document.activeElement === phone) {
      phone.setSelectionRange(
        caretAfterDigits(formatted, digitsOnly(raw.slice(0, start)).length),
        caretAfterDigits(formatted, digitsOnly(raw.slice(0, end)).length)
      );
    }
  };

  // Deleting next to a separator should remove the adjacent digit, not restore
  // the separator forever. Ordinary digit/selection deletion uses the input handler.
  phone.addEventListener('beforeinput', event => {
    if (!event.cancelable || event.isComposing || phone.selectionStart !== phone.selectionEnd) return;
    const position = phone.selectionStart;
    const raw = phone.value;
    let removeAt;
    if (event.inputType === 'deleteContentBackward' && raw[position - 1] === '-') removeAt = position - 2;
    else if (event.inputType === 'deleteContentForward' && raw[position] === '-') removeAt = position + 1;
    if (removeAt == null || !/\d/.test(raw[removeAt] || '')) return;
    event.preventDefault();
    phone.value = raw.slice(0, removeAt) + raw.slice(removeAt + 1);
    const caret = Math.min(position, removeAt);
    phone.setSelectionRange(caret, caret);
    normalize();
  });
  phone.addEventListener('input', event => { if (!event.isComposing) normalize(); });
  phone.addEventListener('compositionend', normalize);
  phone.addEventListener('change', normalize);
  // Normalize before the existing submit listener reads the same field into its payload.
  form.addEventListener('submit', normalize, true);
  normalize();
})();

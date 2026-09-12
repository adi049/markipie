/* MARKIPIE — booking + contact forms */
(function () {
  'use strict';
  function wire(formId, noteId, url) {
    var f = document.getElementById(formId);
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = document.getElementById(noteId);
      var data = {};
      new FormData(f).forEach(function (v, k) { data[k] = v; });
      var required = f.querySelectorAll('[required]');
      for (var i = 0; i < required.length; i++) {
        if (!required[i].value.trim()) {
          note.textContent = 'Please fill “' + (required[i].closest('label') ? required[i].closest('label').textContent.trim().split('\n')[0] : required[i].name) + '”.';
          note.className = 'form-note err'; required[i].focus(); return;
        }
      }
      note.textContent = 'Sending…'; note.className = 'form-note';
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.ok) {
            note.className = 'form-note ok';
            note.textContent = (formId === 'bookform' ? '✓ Date request received! We’ll confirm availability within hours. ' : '✓ Message sent — thank you! ') + 'We’ll reach you on ' + (data.phone || 'your number') + '.';
            f.reset();
          } else { note.className = 'form-note err'; note.textContent = j.error || 'Something went wrong.'; }
        })
        .catch(function () { note.className = 'form-note err'; note.textContent = 'Network error — please try again.'; });
    });
  }
  wire('bookform', 'booknote', '/api/bookings');
  wire('contactform', 'contactnote', '/api/contact');
})();

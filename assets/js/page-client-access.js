/* Client Access — code entry flow.
   Validation goes through the data layer only; the response is
   generic and never reveals which codes exist. */
(function () {
  'use strict';
  var D = window.MarkipieData, MK = window.MK;

  var form = MK.qs('#accessForm');
  if (!form) return;
  var input = MK.qs('#clientCode');
  var err = MK.qs('#accessError');
  var btn = MK.qs('#accessBtn');
  /* QR links prefill the code but still require an explicit submit. */
  var presetCode = new URLSearchParams(location.search).get('code');
  if (presetCode) input.value = presetCode.trim().toUpperCase();

  input.addEventListener('input', function () {
    err.classList.remove('is-visible');
    input.closest('.field').classList.remove('has-err');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = input.value.trim();
    if (!code) {
      err.textContent = 'Please enter your client code.';
      err.classList.add('is-visible');
      input.closest('.field').classList.add('has-err');
      input.focus();
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="spin" aria-hidden="true"></span> Checking…';
    /* Phase 9: secure validation — edge function when Supabase is
       configured (never a client-list query), local check in dev */
    var attempt = (window.MKServices && MKServices.clients)
      ? MKServices.clients.validateAccess(code)
      : D.clients.validate(code);
    attempt.then(function (res) {
      if (res.ok) {
        MK.toast('Gallery found — opening…');
        setTimeout(function () { location.href = '/client/?id=' + encodeURIComponent(res.clientId); }, 450);
      } else {
        err.textContent = 'Invalid or inactive client code.';
        err.classList.add('is-visible');
        btn.disabled = false;
        btn.textContent = 'Access Gallery';
      }
    }).catch(function () {
      err.textContent = 'Something went wrong. Please try again.';
      err.classList.add('is-visible');
      btn.disabled = false;
      btn.textContent = 'Access Gallery';
    });
  });
})();

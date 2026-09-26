/* Contact — validation, package/service enquiry prefill (?package= /
   ?service=) and success state. Form delivery itself connects with
   the backend in a future phase. */
(function () {
  'use strict';
  var D = window.MarkipieData, MK = window.MK;

  var form = MK.qs('#contactForm');
  if (!form) return;
  var fields = MK.qs('#formFields');
  var success = MK.qs('#formSuccess');
  var chip = MK.qs('#regardingChip');
  var msg = MK.qs('#cfMsg');

  /* enquiry prefill from Services / Marketing CTAs */
  var pkg = MK.param('package'), svc = MK.param('service');
  if (pkg) {
    D.packages.list().then(function (list) {
      var p = list.filter(function (x) { return x.id === pkg; })[0];
      if (!p) return;
      chip.innerHTML = MK.icon('star') + 'Regarding: ' + MK.esc(p.title) + ' — ' + MK.esc(p.priceDisplay);
      chip.classList.add('is-visible');
      if (!msg.value) msg.value = "Hi! I'd like to enquire about the \"" + p.title + "\" (" + p.priceDisplay + ").";
    });
  } else if (svc) {
    D.marketing.list().then(function (list) {
      var s = list.filter(function (x) { return x.id === svc; })[0];
      if (!s) return;
      chip.innerHTML = MK.icon('star') + 'Regarding: ' + MK.esc(s.title) + ' (' + MK.esc(s.priceLine) + ')';
      chip.classList.add('is-visible');
      if (!msg.value) msg.value = "Hi! I'm interested in " + s.title + " — " + s.priceLine + ".";
    });
  }

  function fieldOf(input) { return input.closest('.field'); }
  function setErr(input, on) { fieldOf(input).classList.toggle('has-err', on); }

  ['cfName', 'cfPhone', 'cfEmail', 'cfMsg'].forEach(function (fid) {
    var el = document.getElementById(fid);
    el.addEventListener('input', function () { setErr(el, false); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = MK.qs('#cfName'), phone = MK.qs('#cfPhone'), email = MK.qs('#cfEmail');
    var ok = true;
    if (!name.value.trim()) { setErr(name, true); ok = false; }
    if (!/^[+\d][\d\s\-()]{6,}$/.test(phone.value.trim())) { setErr(phone, true); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setErr(email, true); ok = false; }
    if (!msg.value.trim()) { setErr(msg, true); ok = false; }
    if (!ok) return;

    var btn = MK.qs('#cfSubmit');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin" aria-hidden="true"></span> Sending…';
    /* simulated send — real delivery connects with the backend later */
    setTimeout(function () {
      fields.style.display = 'none';
      success.classList.add('is-visible');
    }, 900);
  });
})();

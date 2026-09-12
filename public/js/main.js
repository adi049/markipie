/* MARKIPIE — global cinematic experience */
(function () {
  'use strict';

  /* ---------- intro: short, luxurious ---------- */
  var intro = document.getElementById('intro');
  if (intro) {
    if (sessionStorage.getItem('mk_intro')) {
      intro.remove();
    } else {
      var finished = false;
      var finish = function () {
        if (finished) return; finished = true;
        sessionStorage.setItem('mk_intro', '1');
        intro.classList.add('leave');
        setTimeout(function () { intro.remove(); }, 850);
      };
      intro.addEventListener('click', finish);
      setTimeout(function () { intro.classList.add('logo-in'); }, 1150);
      setTimeout(finish, 2500);
    }
  }

  /* ---------- navbar ---------- */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var mmenu = document.getElementById('mmenu');
  if (burger) burger.addEventListener('click', function () {
    var on = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', on);
    document.body.classList.toggle('lock', on);
  });
  if (mmenu) mmenu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { nav.classList.remove('open'); document.body.classList.remove('lock'); }
  });

  /* ---------- scroll: progress, nav state, parallax ---------- */
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE = window.matchMedia && matchMedia('(max-width: 640px)').matches;
  var prog = document.getElementById('progress');
  var pxEls = Array.prototype.slice.call(document.querySelectorAll('[data-px]')).map(function (el) {
    return { el: el, target: el.tagName === 'IMG' ? el : (el.querySelector('img') || el), sp: parseFloat(el.getAttribute('data-px')) || 0.1 };
  });
  var tick = false;
  function onScroll() {
    if (tick) return; tick = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || 0;
      var vh = innerHeight;
      if (prog) prog.style.transform = 'scaleX(' + Math.min(1, y / Math.max(1, document.documentElement.scrollHeight - vh)) + ')';
      if (nav) nav.classList.toggle('scrolled', y > 30);
      if (!RM && !MOBILE) for (var i = 0; i < pxEls.length; i++) {
        var p = pxEls[i];
        var r = p.el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        var rel = (r.top + r.height / 2) - vh / 2;
        p.target.style.transform = 'translate3d(0,' + (rel * p.sp * -1).toFixed(1) + 'px,0)';
      }
      tick = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        var el = en.target;
        el.style.transitionDelay = (el.getAttribute('data-d') || 0) + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('[data-rv]').forEach(function (el) { io.observe(el); });

  /* ---------- film play interaction ---------- */
  var playbtn = document.getElementById('playbtn');
  var film = document.getElementById('filmvideo');
  if (playbtn && film) {
    var heroWrap = playbtn.closest('.film-hero');
    playbtn.addEventListener('click', function () {
      film.play();
      heroWrap.classList.add('playing');
    });
    film.addEventListener('click', function () {
      if (heroWrap.classList.contains('playing')) { film.pause(); heroWrap.classList.remove('playing'); }
    });
    film.addEventListener('ended', function () { heroWrap.classList.remove('playing'); });
  }
})();

/* ============================================================
   MARKIPIE — Public site shell & shared components
   Injects header / drawer / footer / floating buttons (single
   source of truth for navigation), plus reveal-on-scroll,
   lightbox, toasts and small utilities.
   ============================================================ */
(function (global) {
  'use strict';

  var M = global.MarkipieData || {};
  var esc = (M.util && M.util.esc) || function (s) { return String(s == null ? '' : s); };

  /* ---------------- icons (24×24, stroke) ---------------- */
  var I = {
    zoomIn: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>',
    zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevDown: '<path d="M6 9l6 6 6-6"/>',
    chevLeft: '<path d="M15 6l-6 6 6 6"/>',
    chevRight: '<path d="M9 6l6 6-6 6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3-3.5 3.5z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
    mapPin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    video: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    gift: '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    award: '<circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    film: '<rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>',
    aperture: '<circle cx="12" cy="12" r="10"/><path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.7 2.1L22 18l-2.3.9L19 21l-.7-2.1L16 18l2.3-.9L19 15z"/>',
    play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>',
    pen: '<path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    whatsapp: '<path fill="currentColor" stroke="none" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>',
    instagram: '<path fill="currentColor" stroke="none" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>'
  };
  /* magnetic buttons — desktop pointer only; disabled for reduced motion */
  function initMagnetic() {
    try {
      if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      document.querySelectorAll('.btn, .fyp-btn').forEach(function (el) {
        if (el.classList.contains('mag-ready')) return;
        el.classList.add('mag-ready');
        el.addEventListener('mousemove', function (e) {
          var r = el.getBoundingClientRect();
          var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
          var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
          el.style.transform = 'translate(' + (dx * 7).toFixed(1) + 'px,' + (dy * 5 - 1).toFixed(1) + 'px)';
        });
        el.addEventListener('mouseleave', function () { el.style.transform = ''; });
      });
    } catch (e) { /* never block the page */ }
  }
  setTimeout(initMagnetic, 600);
  /* pages render their content after site.js — re-scan when the DOM settles */
  if (window.MutationObserver) {
    var magT = null;
    new MutationObserver(function () {
      if (magT) clearTimeout(magT);
      magT = setTimeout(initMagnetic, 350);
    }).observe(document.body, { childList: true, subtree: true });
  }

  function icon(name, cls) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
      (cls ? ' class="' + cls + '"' : '') + '>' + (I[name] || I.info) + '</svg>';
  }

  /* ---------------- navigation (single source of truth) ---------------- */
  var NAV = [
    { label: 'Home', href: '/', match: ['/', '/index.html'] },
    { label: 'About', href: '/about/', match: ['/about/'] },
    { label: 'Services', href: '/services/', match: ['/services/'] },
    { label: 'Gallery', href: '/gallery/', match: ['/gallery/'] },
    { label: 'Client Access', href: '/client-access/', match: ['/client-access/', '/client/'] },
    { label: 'Blogs', href: '/blogs/', match: ['/blogs/'] },
    { label: 'Marketing', href: '/marketing/', match: ['/marketing/'] },
    { label: 'Contact', href: '/contact/', match: ['/contact/'] }
  ];
  function currentPath() { return location.pathname.replace(/\/+$/, '') + '/'; }
  function navActive(href, match) { return match.indexOf(currentPath()) !== -1; }

  /* ---------------- shell injection ---------------- */
  function buildShell() {
    var path = currentPath();
    var isRoot = path === '/';

    /* header */
    var header = document.getElementById('siteHeader');
    if (header) {
      header.innerHTML =
        '<div class="container header-inner">' +
          '<a class="brand" href="/" aria-label="Markipie — home"><img src="' + (isRoot ? '' : '/') + 'assets/markipie-wordmark.svg" alt="Markipie"></a>' +
          '<nav class="main-nav" aria-label="Primary"><ul class="nav-list">' +
            NAV.map(function (n) {
              return '<li><a class="nav-link nav-underline' + (navActive(n.href, n.match) ? ' is-active' : '') + '" href="' + n.href + '" ' +
                (navActive(n.href, n.match) ? 'aria-current="page"' : '') + '>' + n.label + '</a></li>';
            }).join('') +
          '</ul></nav>' +
          '<button class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="mobileDrawer" aria-label="Open menu">' +
            '<span></span><span></span><span></span></button>' +
        '</div>';
    }

    /* mobile drawer */
    var drawer = document.getElementById('mobileDrawer');
    if (drawer) {
      drawer.innerHTML =
        '<div class="drawer-backdrop" data-drawer-close></div>' +
        '<div class="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu">' +
          '<div class="drawer-head">' +
            '<img src="' + (isRoot ? '' : '/') + 'assets/markipie-wordmark.svg" alt="Markipie">' +
            '<button class="drawer-close" data-drawer-close aria-label="Close menu">' + icon('close') + '</button>' +
          '</div>' +
          '<ul class="drawer-list">' +
            NAV.map(function (n) {
              return '<li><a class="drawer-link' + (navActive(n.href, n.match) ? ' is-active' : '') + '" href="' + n.href + '">' +
                n.label + icon('chevRight') + '</a></li>';
            }).join('') +
          '</ul>' +
          '<div class="drawer-foot">Wedding photography &amp; films — Markipie</div>' +
        '</div>';
      var toggle = document.getElementById('navToggle');
      var open = function (o) {
        if (o) { drawer.hidden = false; requestAnimationFrame(function () { requestAnimationFrame(function () { drawer.classList.add('is-open'); }); }); }
        else { drawer.classList.remove('is-open'); setTimeout(function () { drawer.hidden = true; }, 340); }
        if (toggle) toggle.setAttribute('aria-expanded', o ? 'true' : 'false');
        document.body.style.overflow = o ? 'hidden' : '';
      };
      if (toggle) toggle.addEventListener('click', function () { open(drawer.hidden); });
      drawer.addEventListener('click', function (e) {
        if (e.target.closest('[data-drawer-close]')) open(false);
        var link = e.target.closest('a');
        if (link) { open(false); if (link.getAttribute('href') === path) e.preventDefault(); }
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) open(false); });
    }

    /* footer */
    var footer = document.getElementById('siteFooter');
    if (footer) {
      footer.innerHTML =
        '<div class="container">' +
          '<div class="footer-grid">' +
            '<div class="footer-brand">' +
              '<img src="' + (isRoot ? '' : '/') + 'assets/markipie-wordmark.svg" alt="Markipie">' +
              '<p>Wedding photography, cinematic films and creative studio services — crafted with care.</p>' +
            '</div>' +
            '<div class="footer-col"><b>Explore</b><ul>' +
              NAV.slice(0, 4).map(function (n) { return '<li><a href="' + n.href + '">' + n.label + '</a></li>'; }).join('') +
            '</ul></div>' +
            '<div class="footer-col"><b>Studio</b><ul>' +
              NAV.slice(4).map(function (n) { return '<li><a href="' + n.href + '">' + n.label + '</a></li>'; }).join('') +
            '</ul></div>' +
          '</div>' +
          '<div class="footer-bottom">' +
            '<small>© ' + new Date().getFullYear() + ' Markipie. All rights reserved.</small>' +
            '<a class="admin-lock" href="/admin/" aria-label="Admin login" title="Admin">' + icon('lock') + '</a>' +
          '</div>' +
        '</div>';
    }

    /* floating buttons (icon-only). Links come from the studio Settings
       (admin-editable) — never invented here. Unconfigured buttons fall
       back to the contact page instead of dead links. */
    var fabs = document.getElementById('fabs');
    if (fabs) {
      fabs.innerHTML =
        '<a class="fab fab--ig" href="/contact/" aria-label="Instagram" title="Instagram" data-fab>' + icon('instagram') + '</a>' +
        '<a class="fab fab--wa" href="/contact/" aria-label="WhatsApp" title="WhatsApp" data-fab>' + icon('whatsapp') + '</a>' +
        '<a class="fab fab--call" href="/contact/" aria-label="Call" title="Call" data-fab>' + icon('phone') + '</a>';
      var D0 = window.MarkipieData;
      if (D0 && D0.settings && D0.settings.get) {
        D0.settings.get().then(function (st) {
          var ig = fabs.querySelector('.fab--ig');
          var wa = fabs.querySelector('.fab--wa');
          var call = fabs.querySelector('.fab--call');
          if (st.instagram) ig.href = 'https://instagram.com/' + String(st.instagram).replace(/^@/, '').trim();
          if (st.whatsapp) wa.href = 'https://wa.me/' + String(st.whatsapp).replace(/[^0-9]/g, '');
          if (st.phone) call.href = 'tel:' + String(st.phone).replace(/[^0-9+]/g, '');
        }).catch(function () {});
      }
    }

    /* header scroll state */
    if (header) {
      var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 10); };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  /* ---------------- reveal on scroll ---------------- */
  var io = null;
  function revealInit(root) {
    var els = (root || document).querySelectorAll('.reveal:not(.in-view)');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in-view'); }); return; }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    }
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- toast ---------------- */
  var toastEl = null, toastTimer = null;
  function toast(msg, type) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.className = 'toast' + (type === 'error' ? ' toast--error' : '');
    toastEl.innerHTML = icon(type === 'error' ? 'alert' : 'info') + '<span>' + esc(msg) + '</span>';
    requestAnimationFrame(function () { toastEl.classList.add('is-visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 3400);
  }

  /* ---------------- lightbox ---------------- */
  var lb = null, lbItems = [], lbIndex = 0, lbLastFocus = null, lbOpts = {};
  /* zoom state (Parts 7–8): toggle · double-tap · pinch · pan */
  var lbZoom = { on: false, scale: 1, x: 0, y: 0, pinching: false };
  function lightboxEnsure() {
    if (lb) return lb;
    lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Media viewer');
    lb.innerHTML =
      '<div class="lb-backdrop" data-lb-close></div>' +
      '<div class="lb-stage">' +
        '<figure class="lb-figure"><div class="lb-canvas"></div>' +
        '<figcaption><div class="lb-caption"></div><div class="lb-count"></div></figcaption></figure>' +
        '<img class="wm-corner" src="/assets/markipie-wordmark-white.svg" alt="" hidden>' +
        '<button class="lb-btn lb-close" data-lb-close aria-label="Close">' + icon('close') + '</button>' +
        '<button class="lb-btn lb-zoom" data-lb-zoom aria-label="Zoom in" title="Zoom">' + icon('zoomIn') + '</button>' +
        '<button class="lb-btn lb-dl" data-lb-dl aria-label="Download" title="Download">' + icon('download') + '</button>' +
        '<button class="lb-btn lb-prev" data-lb-prev aria-label="Previous">' + icon('chevLeft') + '</button>' +
        '<button class="lb-btn lb-next" data-lb-next aria-label="Next">' + icon('chevRight') + '</button>' +
        '<div class="lb-navrow">' +
          '<button class="lb-btn" data-lb-prev aria-label="Previous">' + icon('chevLeft') + '</button>' +
          '<button class="lb-btn" data-lb-next aria-label="Next">' + icon('chevRight') + '</button>' +
        '</div>' +
        '<div class="lb-hint-swipe">Swipe to browse</div>' +
      '</div>';
    document.body.appendChild(lb);
    lb.addEventListener('click', function (e) {
      if (e.target.closest('[data-lb-close]')) lightboxClose();
      else if (e.target.closest('[data-lb-zoom]')) lbZoomToggle();
      else if (e.target.closest('[data-lb-prev]')) lightboxStep(-1);
      else if (e.target.closest('[data-lb-next]')) lightboxStep(1);
      else if (e.target.closest('[data-lb-dl]')) {
        /* permission-gated download (Phases 10–11). The button only
           exists when the studio allows downloads; the resource is
           authorised server-side. App-level control cannot prevent
           screenshots or screen recording. */
        var it = lbItems[lbIndex];
        if (!lbOpts.download || !it) return;
        toast('Preparing download…');
        var finish = function (url, filename) {
          var a = document.createElement('a');
          a.href = url;
          a.download = filename || it.caption || 'markipie-media';
          a.rel = 'noopener';
          document.body.appendChild(a); a.click(); a.remove();
          toast('Download started');
        };
        if (typeof lbOpts.onDownload === 'function') {
          lbOpts.onDownload(it).then(function (r) {
            if (r && r.ok && r.url) finish(r.url, r.filename);
            else toast((r && r.error) || 'Download is not available for this item.');
          });
        } else if (it.src) {
          finish(it.src, it.caption);
        } else {
          toast('Download is not available for this item.');
        }
      }
    });
    /* touch: swipe navigation · double-tap zoom · pinch zoom (Parts 7–8) */
    var tx = 0, ty = 0, lastTap = 0, pinchD0 = 0, pinchS0 = 1;
    lb.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2 && lbZoom.on) {
        lbZoom.pinching = true;
        pinchD0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        pinchS0 = lbZoom.scale;
      } else {
        tx = e.touches[0].clientX; ty = e.touches[0].clientY;
      }
    }, { passive: true });
    lb.addEventListener('touchmove', function (e) {
      if (lbZoom.pinching && e.touches.length === 2) {
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        lbZoom.scale = Math.min(3, Math.max(1, pinchS0 * (d / pinchD0)));
        if (lbZoom.scale === 1) { lbZoom.on = false; }
        lbZoomApply();
      } else if (lbZoom.on && e.touches.length === 1) {
        var pm = e.touches[0], pt = e.touches[0];
        lbZoom.x += pt.clientX - tx; lbZoom.y += pt.clientY - ty;
        tx = pt.clientX; ty = pt.clientY;
        lbZoomApply();
      }
    }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (lbZoom.pinching) { lbZoom.pinching = false; return; }
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      var now = Date.now();
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        /* tap: double-tap toggles zoom on photos */
        var onMedia = e.target.closest('.lb-canvas img');
        if (onMedia && now - lastTap < 320) { lbZoomToggle(); lastTap = 0; return; }
        lastTap = now;
      }
      if (!lbZoom.on && Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4) lightboxStep(dx < 0 ? 1 : -1);
    }, { passive: true });
    /* double-click zoom (desktop) */
    lb.addEventListener('dblclick', function (e) {
      if (e.target.closest('.lb-canvas img') && !e.target.closest('video')) lbZoomToggle();
    });
    /* pan while zoomed (mouse) */
    var dragging = false, dpx = 0, dpy = 0;
    lb.addEventListener('mousedown', function (e) {
      if (!lbZoom.on || !e.target.closest('.lb-canvas img')) return;
      dragging = true; dpx = e.clientX; dpy = e.clientY; e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      lbZoom.x += e.clientX - dpx; lbZoom.y += e.clientY - dpy;
      dpx = e.clientX; dpy = e.clientY;
      lbZoomApply();
    });
    window.addEventListener('mouseup', function () { dragging = false; });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') { if (lbZoom.on) { lbZoomReset(); } else lightboxClose(); }
      if (e.key === '+' || e.key === '=') { lbZoom.on = true; lbZoom.scale = Math.min(3, lbZoom.scale + 0.4); lbZoomApply(); }
      if (e.key === '-') { lbZoom.scale = Math.max(1, lbZoom.scale - 0.4); if (lbZoom.scale === 1) lbZoom.on = false; lbZoomApply(); }
      if (e.key === 'ArrowLeft') lightboxStep(-1);
      if (e.key === 'ArrowRight') lightboxStep(1);
    });
    return lb;
  }
  function lbZoomApply() {
    if (!lb) return;
    var stage = lb.querySelector('.lb-stage');
    var media = lb.querySelector('.lb-canvas img, .lb-canvas video');
    if (!stage) return;
    if (lbZoom.on && media) {
      stage.classList.add('is-zoomed');
      media.style.transform = 'translate(' + lbZoom.x + 'px,' + lbZoom.y + 'px) scale(' + lbZoom.scale + ')';
      var zb = lb.querySelector('.lb-zoom');
      if (zb) { zb.innerHTML = icon('zoomOut'); zb.setAttribute('aria-label', 'Zoom out'); }
    } else {
      stage.classList.remove('is-zoomed');
      if (media) media.style.transform = '';
      lbZoom.scale = 1; lbZoom.x = 0; lbZoom.y = 0;
      var zb2 = lb.querySelector('.lb-zoom');
      if (zb2) { zb2.innerHTML = icon('zoomIn'); zb2.setAttribute('aria-label', 'Zoom in'); }
    }
  }
  function lbZoomToggle(on) {
    var turningOn = on === undefined ? !lbZoom.on : !!on;
    lbZoom.on = turningOn;
    if (turningOn && lbZoom.scale === 1) lbZoom.scale = 2.2;   /* meaningful default zoom */
    if (!turningOn) { lbZoom.scale = 1; lbZoom.x = 0; lbZoom.y = 0; }
    lbZoomApply();
  }
  function lbZoomReset() { lbZoom.on = false; lbZoomApply(); }

  function lbRender() {
    var it = lbItems[lbIndex];
    if (!it) return;
    lbZoomReset();
    var canvas = lb.querySelector('.lb-canvas');
    var oldVid = canvas.querySelector('video');
    if (oldVid) { try { oldVid.pause(); } catch (e) {} }
    /* zoom applies to photos (videos use the native player's own
       fullscreen — zooming a playing video would fight the controls) */
    var isVideoItem = it.type === 'video';
    var zoomBtn = lb.querySelector('.lb-zoom');
    if (zoomBtn) zoomBtn.hidden = !!isVideoItem || !it.src;
    if (it.src && it.type === 'video') {
      /* native video playback — play · pause · seek · volume · fullscreen */
      canvas.innerHTML = '<video class="lb-video" controls playsinline preload="metadata" src="' + esc(it.src) + '"' +
        (it.poster ? ' poster="' + esc(it.poster) + '"' : '') + '></video>';
    } else if (it.src) {
      canvas.innerHTML = '<img src="' + esc(it.src) + '" alt="' + esc(it.caption || '') + '">';
    } else {
      var shade = 'ph-' + (1 + (lbIndex % 6));
      canvas.innerHTML = '<div class="ph-visual ' + shade + '">' + icon(it.type === 'video' ? 'play' : 'image') +
        '<span class="ph-label">' + esc(it.category || 'Preview') + '</span></div>';
    }
    var wm = lb.querySelector('.wm-corner');
    if (wm) wm.hidden = !lbOpts.watermark;
    var dl = lb.querySelector('.lb-dl');
    if (dl) dl.classList.toggle('is-visible', !!lbOpts.download);
    lb.querySelector('.lb-caption').textContent = it.caption || '';
    lb.querySelector('.lb-count').textContent = (lbIndex + 1) + ' / ' + lbItems.length;
    var single = lbItems.length < 2;
    ['.lb-prev', '.lb-next'].forEach(function (s) {
      lb.querySelectorAll(s).forEach(function (b) { b.style.display = single ? 'none' : ''; });
    });
  }
  function lightboxOpen(items, index, opts) {
    lbItems = items || []; lbIndex = Math.max(0, index || 0);
    lbOpts = opts || {};
    lbLastFocus = document.activeElement;
    lightboxEnsure(); lbRender();
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var c = lb.querySelector('.lb-close'); if (c) c.focus();
  }
  function lightboxStep(d) {
    if (!lbItems.length) return;
    lbIndex = (lbIndex + d + lbItems.length) % lbItems.length;
    lbRender();   /* render resets zoom for the incoming media */
  }
  function lightboxClose() {
    if (!lb) return;
    var v = lb.querySelector('.lb-canvas video');
    if (v) { try { v.pause(); } catch (e) {} }
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lbLastFocus && lbLastFocus.focus) lbLastFocus.focus();
  }

  /* ---------------- helpers ---------------- */
  function param(name) {
    return decodeURIComponent((location.search.match(new RegExp('[?&]' + name + '=([^&]+)')) || [null, ''])[1] || '');
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* photography visuals — remote editorial images keep the demo alive until
     the studio's own portfolio is connected. The image layer is presentation-only. */
  var PHOTO_MAP = {
    wedding: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=86',
    candid: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=86',
    films: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=86',
    portraits: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1200&q=86',
    details: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=86',
    stories: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1200&q=86',
    haldi: 'https://images.unsplash.com/photo-1606800052052-a08af714886e?auto=format&fit=crop&w=1200&q=86',
    mehendi: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=86',
    reception: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=86',
    album: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=86',
    marketing: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=86',
    journal: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=86'
  };
  function photoForLabel(label, idx) {
    var s = String(label || '').toLowerCase();
    var keys = Object.keys(PHOTO_MAP);
    for (var i = 0; i < keys.length; i++) if (s.indexOf(keys[i]) !== -1) return PHOTO_MAP[keys[i]];
    return PHOTO_MAP[keys[(Number(idx) || 0) % keys.length]];
  }
  function phVisual(idx, label, iconName) {
    var shade = 'ph-' + (1 + (idx % 6));
    var src = photoForLabel(label, idx);
    return '<div class="ph-visual ' + shade + '">' +
      '<img class="ph-photo" src="' + esc(src) + '" alt="' + esc(label || 'Markipie photography') + '" loading="' + (idx < 2 ? 'eager' : 'lazy') + '">' +
      '<span class="ph-photo-shade"></span>' +
      (label ? '<span class="ph-label">' + esc(label) + '</span>' : '') + '</div>';
  }

  /* ---------------- background field ---------------- */
  function initBgFx() {
    if (document.querySelector('.bg-fx')) return;
    var fx = document.createElement('div');
    fx.className = 'bg-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML = '<i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i>';
    document.body.appendChild(fx);
  }

  /* ---------------- scroll progress ---------------- */
  var progressBar = null, progressTick = false;
  function initProgress() {
    progressBar = document.createElement('div');
    progressBar.id = 'scrollProgress';
    document.body.appendChild(progressBar);
    var update = function () {
      progressTick = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 40 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      progressBar.style.width = pct + '%';
    };
    window.addEventListener('scroll', function () {
      if (!progressTick) { progressTick = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------------- number count-up (About stats etc.) ---------------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') != null ? el.getAttribute('data-suffix') : (el.textContent.match(/[^0-9.,]+$/) || [''])[0];
    if (isNaN(target)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = target.toLocaleString('en-IN') + suffix;
      return;
    }
    var t0 = null, dur = 1300;
    function frame(t) {
      if (t0 == null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-IN') + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function initCounters(root) {
    var els = (root || document).querySelectorAll('[data-count]:not([data-counted])');
    if (!els.length) return;
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.setAttribute('data-counted', '1');
        countUp(en.target);
        cio.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { cio.observe(el); });
  }

  /* ---------------- page transitions (public pages) ---------------- */
  function initTransitions() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-no-transition')) return;
      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#') return;
      var url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // hash/in-page
      e.preventDefault();
      document.body.classList.add('page-exit');
      setTimeout(function () { location.href = url.href; }, 210);
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) document.body.classList.remove('page-exit');
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    buildShell();
    revealInit();
    initBgFx();
    initProgress();
    initCounters();
    initTransitions();
    document.documentElement.classList.add('js');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* ---------------- export ---------------- */
  global.MK = {
    icon: icon,
    esc: esc,
    param: param,
    qs: qs,
    qsa: qsa,
    phVisual: phVisual,
    photoForLabel: photoForLabel,
    reveal: revealInit,
    toast: toast,
    lightbox: { open: lightboxOpen, close: lightboxClose }
  };
})(window);

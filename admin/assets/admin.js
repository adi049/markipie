/* ============================================================
   MARKIPIE — Admin shell & shared components
   (Layout is completely separate from the public site.)
   • Sidebar (desktop) / drawer (mobile)
   • Session guard — real enforcement happens server-side later;
     this keeps the UI architecture ready for that switch.
   ============================================================ */
(function (global) {
  'use strict';
  var M = global.MarkipieData;

  /* ---------------- icons ---------------- */
  var I = {
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h3M3 10h18"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',
    video: '<rect x="2" y="6" width="13" height="12" rx="2"/><path d="M15 10l7-4v12l-7-4"/>',
    face: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="0.5"/><circle cx="15" cy="10" r="0.5"/><path d="M9 15c1 1 5 1 6 0"/>',
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    blog: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevLeft: '<path d="M15 6l-6 6 6 6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3-3.5 3.5z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    power: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    megaphone: '<path d="M3 11l18-7-4 16-6-4-3 4-1-6z"/>',
    drive: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'
  };
  function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[name] || I.info) + '</svg>';
  }

  /* ---------------- helpers ---------------- */
  function qs(s, r) { return (r || document).querySelector(s); }
  function qsa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return M.util.esc(s); }

  var toastEl = null, toastTimer = null;
  function toast(msg, type) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.className = 'toast' + (type === 'error' ? ' toast--error' : '');
    toastEl.innerHTML = icon(type === 'error' ? 'alert' : 'check') + '<span>' + esc(msg) + '</span>';
    requestAnimationFrame(function () { toastEl.classList.add('is-visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 3200);
  }

  /* confirm modal — replaces native confirm() */
  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var bd = document.createElement('div');
      bd.className = 'modal-backdrop';
      bd.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' +
        '<h3>' + esc(opts.title || 'Are you sure?') + '</h3>' +
        '<p>' + esc(opts.message || '') + '</p>' +
        '<div class="modal-actions">' +
          '<button class="btn btn--ghost" data-no>Cancel</button>' +
          '<button class="btn ' + (opts.danger ? 'btn--danger' : 'btn--primary') + '" data-yes>' + esc(opts.confirmText || 'Confirm') + '</button>' +
        '</div></div>';
      document.body.appendChild(bd);
      requestAnimationFrame(function () { bd.classList.add('is-open'); });
      function close(v) {
        bd.classList.remove('is-open');
        setTimeout(function () { bd.remove(); }, 260);
        resolve(v);
      }
      bd.addEventListener('click', function (e) {
        if (e.target === bd || e.target.closest('[data-no]')) close(false);
        else if (e.target.closest('[data-yes]')) close(true);
      });
      document.addEventListener('keydown', function h(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', h); close(false); }
      });
    });
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e2) { return false; }
    }
  }

  /* ---------------- shell ---------------- */
  var PAGES = [
    { id: 'dashboard', label: 'Dashboard', href: '/admin/dashboard/', icon: 'dashboard' },
    { id: 'clients', label: 'Clients', href: '/admin/clients/', icon: 'users', children: [
      { label: 'All Clients', href: '/admin/clients/' },
      { label: 'Add Client', href: '/admin/clients/add/' }
    ] },
    { id: 'blogs', label: 'Blogs', href: '/admin/blogs/', icon: 'blog' },
    { id: 'services', label: 'Services', href: '/admin/services/', icon: 'tag' },
    { id: 'marketing', label: 'Marketing', href: '/admin/marketing/', icon: 'megaphone' },
    { id: 'activity', label: 'Activity Logs', href: '/admin/activity/', icon: 'clock' },
    { id: 'settings', label: 'Settings', href: '/admin/settings/', icon: 'settings' }
  ];
  function pageId() {
    var p = location.pathname;
    if (p.indexOf('/admin/dashboard') === 0) return 'dashboard';
    if (p.indexOf('/admin/blogs') === 0) return 'blogs';
    if (p.indexOf('/admin/marketing') === 0) return 'marketing';
    if (p.indexOf('/admin/activity') === 0) return 'activity';
    if (p.indexOf('/admin/clients') === 0) return 'clients';
    if (p.indexOf('/admin/services') === 0) return 'services';
    if (p.indexOf('/admin/settings') === 0) return 'settings';
    return '';
  }
  function crumbLabel() {
    var id = pageId();
    var map = { dashboard: 'Dashboard', blogs: 'Blogs', clients: 'Clients', services: 'Services', settings: 'Settings' };
    return map[id] || 'Admin';
  }
  function buildShell() {
    var sidebar = qs('#adminSidebar');
    var current = pageId();
    if (sidebar) {
      sidebar.innerHTML =
        '<div class="brand"><img src="/assets/markipie-wordmark.svg" alt="Markipie"><small>Admin</small></div>' +
        '<nav class="admin-nav" aria-label="Admin">' +
          PAGES.map(function (p) {
            var cls = 'nav-item' + (p.id === current ? ' is-active' : '');
            var html = '<a href="' + p.href + '" class="' + cls + '">' + icon(p.icon) + p.label + '</a>';
            if (p.children) {
              html += '<div class="nav-sub">' + p.children.map(function (c) {
                return '<a href="' + c.href + '">' + c.label + '</a>';
              }).join('') + '</div>';
            }
            return html;
          }).join('') +
        '</nav>' +
        '<div class="admin-side-foot">' +
          '<div class="side-profile" id="adminProfile">' + icon('users') +
            '<span class="sp-name" id="adminProfileName">Admin</span>' +
            '<span class="sp-role">Administrator</span>' +
          '</div>' +
          '<a class="side-back" href="/" target="_blank" rel="noopener">' + icon('external') + 'View website</a>' +
          '<button class="side-logout" id="adminLogoutBtn">' + icon('power') + 'Log out</button>' +
        '</div>';
      var lb = qs('#adminLogoutBtn');
      if (lb) lb.addEventListener('click', function () { Admin.logout(); });
      /* profile block (§2): display name from the real session — never credentials */
      var sess = M.auth && M.auth.session();
      var pn = qs('#adminProfileName');
      if (pn && sess) pn.textContent = sess.user || sess.email || 'Admin';
    }
    var topbar = qs('#adminTopbar');
    if (topbar) {
      topbar.innerHTML =
        '<button class="burger" id="adminBurger" aria-label="Open menu" aria-expanded="false">' + icon('menu') + '</button>' +
        '<span class="brand-m"><img src="/assets/markipie-wordmark.svg" alt="Markipie"></span>' +
        '<span class="crumb">' + esc(crumbLabel()) + '</span>' +
        '<span class="topbar-right"><span class="admin-chip">' + icon('shield') + 'Local session</span></span>';
    }
    /* mobile drawer behaviour */
    var burger = qs('#adminBurger');
    var backdrop = qs('#sidebarBackdrop');
    if (burger && sidebar) {
      var open = function (o) {
        sidebar.classList.toggle('is-open', o);
        if (backdrop) backdrop.classList.toggle('is-visible', o);
        burger.setAttribute('aria-expanded', o ? 'true' : 'false');
      };
      burger.addEventListener('click', function () { open(!sidebar.classList.contains('is-open')); });
      if (backdrop) backdrop.addEventListener('click', function () { open(false); });
      sidebar.addEventListener('click', function (e) {
        if (e.target.closest('a')) open(false);
        if (e.target.closest('#adminLogoutBtn')) open(false);
      });
    }
  }

  /* ---------------- auth guard ---------------- */
  function requireAuth() {
    /* Phase 9: when Supabase Auth is configured, authService.gate()
       performs the authoritative async check (authService auto-runs);
       this sync check keeps the local development flow intact. */
    if (global.MKServices && MKServices.auth && MKServices.auth.mode() === 'supabase') return true;
    var s = M.auth && M.auth.session();
    if (!s || !s.token) {
      location.replace('/admin/');
      return false;
    }
    return true;
  }

  function logout() {
    if (global.MKServices && MKServices.auth && MKServices.auth.mode() === 'supabase') {
      MKServices.auth.logout();
    }
    M.auth.logout();
    location.replace('/admin/');
  }

  global.Admin = {
    icon: icon, qs: qs, qsa: qsa, esc: esc,
    toast: toast, confirm: confirmDialog, copy: copyText,
    requireAuth: requireAuth, logout: logout,
    buildShell: buildShell
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildShell);
  else buildShell();
})(window);

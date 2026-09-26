/* ============================================================
   Markipie — blogService (Phase 9)
   Canonical table: blogs. Public sees status='published' only
   (also enforced by RLS). Slug unique; duplicate handled cleanly.
   ============================================================ */
(function (global) {
  'use strict';
  var C = global.MKServicesCore, SB = global.MKSupabase;
  /* MarkipieData resolves lazily — service files may load before data.js */
  function MD() { return global.MarkipieData; }
  if (!C || !SB) return;

  var T = 'blogs';
  var COLS = { coverImageUrl: 'cover_image_url', publishedAt: 'published_at' };

  function slugify(t) {
    return String(t || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'post';
  }

  function mapPublic(row) {
    /* remote row → the shape the public pages already render */
    var content = row.content || {};
    return {
      id: row.id, slug: row.slug, title: row.title,
      excerpt: row.excerpt || '', cover: row.cover_image_url ? { src: row.cover_image_url, alt: row.title } : null,
      date: (row.published_at || row.created_at || '').slice(0, 10),
      status: row.status, intro: content.intro || [], gallery: content.gallery || [], outro: content.outro || []
    };
  }

  var blogs = {
    /* ---------- public (published only) ---------- */
    listPublic: function () {
      return C.remoteFirst(
        function () {
          return SB.run(function (db) {
            return db.from(T).select('*').eq('status', 'published').order('published_at', { ascending: false });
          }).then(function (r) { return r.ok ? C.ok((r.data || []).map(mapPublic)) : r; });
        },
        function () { return MD().blogs.list().then(function (list) { return C.ok(list); }); }
      );
    },
    getPublic: function (slug) {
      return C.remoteFirst(
        function () {
          return SB.run(function (db) {
            return db.from(T).select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
          }).then(function (r) { return r.ok ? C.ok(r.data ? mapPublic(r.data) : null) : r; });
        },
        function () { return MD().blogs.get(slug).then(function (p) { return C.ok(p); }); }
      );
    },

    /* ---------- admin CRUD ---------- */
    listAdmin: function () {
      return SB.run(function (db) {
        return db.from(T).select('*').order('created_at', { ascending: false });
      }).then(function (r) { return r.ok ? C.ok(r.data || []) : r; });
    },
    create: function (input) {
      var err = C.V.first([
        C.V.required(input.title, 'Title'),
        C.V.required(input.content || input.intro, 'Content')
      ]);
      if (err) return Promise.resolve(C.fail(err));
      var row = {
        title: input.title,
        slug: input.slug || slugify(input.title),
        cover_image_url: input.coverImageUrl || null,
        excerpt: input.excerpt || null,
        content: input.content || {},
        status: 'draft',
        published_at: null
      };
      return SB.run(function (db) {
        return db.from(T).insert(row).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    update: function (id, patch) {
      return SB.run(function (db) {
        return db.from(T).update(C.toSnake(patch, COLS)).eq('id', id).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    publish: function (id) {
      return SB.run(function (db) {
        return db.from(T).update({ status: 'published', published_at: new Date().toISOString() }).eq('id', id).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    unpublish: function (id) {
      return SB.run(function (db) {
        return db.from(T).update({ status: 'draft' }).eq('id', id).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    remove: function (id) {
      return SB.run(function (db) { return db.from(T).delete().eq('id', id); }).then(C.ok);
    }
  };

  global.MKServices = global.MKServices || {};
  global.MKServices.blogs = blogs;
})(window);

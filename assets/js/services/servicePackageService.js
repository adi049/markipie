/* ============================================================
   Markipie — servicePackageService (Phase 9)
   Canonical tables: service_categories · service_packages ·
   service_package_sections · service_package_items.
   The Services page reads from here — package data is never
   duplicated inside frontend components. Remote results are
   mapped back into the render shape the existing premium cards
   already use (design unchanged, data source swapped).
   ============================================================ */
(function (global) {
  'use strict';
  var C = global.MKServicesCore, SB = global.MKSupabase;
  /* MarkipieData resolves lazily — service files may load before data.js */
  function MD() { return global.MarkipieData; }
  if (!C || !SB) return;

  function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') + '/-'; }

  /* remote rows → render shape (sections / deliverables / complimentary) */
  function assemble(rows) {
    var cats = rows.categories || [], pkgs = rows.packages || [], secs = rows.sections || [], items = rows.items || [];
    var byPkg = {};
    secs.forEach(function (s) {
      (byPkg[s.package_id] = byPkg[s.package_id] || {})[s.section_type] =
        (byPkg[s.package_id][s.section_type] || []).concat([s]);
    });
    var itemsBySection = {};
    items.forEach(function (it) { (itemsBySection[it.section_id] = itemsBySection[it.section_id] || []).push(it); });

    return pkgs.map(function (p) {
      var cov = (byPkg[p.id] && byPkg[p.id].coverage || []).sort(function (a, b) { return a.sort_order - b.sort_order; })
        .map(function (s) {
          return {
            name: s.title,
            items: (itemsBySection[s.id] || []).sort(function (a, b) { return a.sort_order - b.sort_order; }).map(function (x) { return x.item_text; })
          };
        });
      function flat(type) {
        return (byPkg[p.id] && byPkg[p.id][type] || []).sort(function (a, b) { return a.sort_order - b.sort_order; })
          .reduce(function (acc, s) {
            return acc.concat((itemsBySection[s.id] || []).sort(function (a, b) { return a.sort_order - b.sort_order; }).map(function (x) { return x.item_text; }));
          }, []);
      }
      return {
        id: p.id, category: (cats.filter(function (c) { return c.id === p.category_id; })[0] || {}).slug || p.category_id,
        categoryLabel: p.subtitle || '', title: p.title, note: p.description || '',
        price: Number(p.price), priceDisplay: inr(p.price),
        priceLine: 'All this for ' + inr(p.price) + ' only', albumOption: p.price_label || '',
        sections: cov, deliverables: flat('deliverables'), complimentary: flat('complimentary'),
        compare: (global.MarkipieData && MD().packages.buildCompare)
          ? MD().packages.buildCompare({ sections: cov, deliverables: flat('deliverables'), complimentary: flat('complimentary') }) : null
      };
    });
  }

  var svc = {
    /* ---------- public (active only — RLS also enforces) ---------- */
    listPublic: function () {
      return C.remoteFirst(
        function () {
          return Promise.all([
            SB.run(function (db) { return db.from('service_categories').select('*').eq('is_active', true).order('sort_order'); }),
            SB.run(function (db) { return db.from('service_packages').select('*').eq('is_active', true).order('sort_order'); }),
            SB.run(function (db) { return db.from('service_package_sections').select('*').order('sort_order'); }),
            SB.run(function (db) { return db.from('service_package_items').select('*').order('sort_order'); })
          ]).then(function (res) {
            for (var i = 0; i < res.length; i++) if (!res[i].ok) return res[i];
            return C.ok({
              categories: res[0].data, raw: true,
              packages: assemble({
                categories: res[0].data, packages: res[1].data,
                sections: res[2].data, items: res[3].data
              })
            });
          });
        },
        function () {
          return Promise.all([MD().packages.categories(), MD().packages.list()]).then(function (res) {
            return C.ok({ categories: res[0].map(function (c) { return { id: c.id, name: c.label, slug: c.id }; }), packages: res[1] });
          });
        }
      ).then(function (r) {
        /* pages consume {categories, packages} lists */
        if (r.ok && r.data && r.data.raw) {
          return C.ok({ categories: r.data.categories, packages: r.data.packages });
        }
        return r;
      });
    },

    /* ---------- admin CRUD ---------- */
    listAdmin: function () {
      return SB.run(function (db) { return db.from('service_packages').select('*').order('sort_order'); })
        .then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    create: function (input) {
      var err = C.V.first([
        C.V.required(input.title, 'Title'),
        C.V.required(input.price, 'Price'),
        C.V.required(input.categoryId, 'Category')
      ]);
      if (err) return Promise.resolve(C.fail(err));
      return SB.run(function (db) {
        return db.from('service_packages').insert({
          category_id: input.categoryId, title: input.title, subtitle: input.subtitle || null,
          description: input.description || null, price: Number(input.price),
          currency: input.currency || 'INR', price_label: input.priceLabel || null,
          sort_order: Number(input.sortOrder) || 0, is_active: true
        }).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    update: function (id, patch) {
      var keys = { title: 'title', subtitle: 'subtitle', description: 'description', price: 'price', priceLabel: 'price_label', sortOrder: 'sort_order', isActive: 'is_active', categoryId: 'category_id' };
      var row = {};
      Object.keys(patch || {}).forEach(function (k) { if (keys[k]) row[keys[k]] = patch[k]; });
      return SB.run(function (db) {
        return db.from('service_packages').update(row).eq('id', id).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    setPrice: function (id, price) {
      var err = C.V.number(price, 'Price');
      if (err) return Promise.resolve(C.fail(err));
      return svc.update(id, { price: price });
    },
    setPublished: function (id, active) { return svc.update(id, { isActive: active !== false }); },
    remove: function (id) {
      return SB.run(function (db) { return db.from('service_packages').delete().eq('id', id); }).then(C.ok);
    },
    setSectionItems: function (sectionId, texts) {
      /* replace-on-write keeps sections/items consistent */
      return SB.run(function (db) {
        return db.from('service_package_items').delete().eq('section_id', sectionId)
          .then(function () {
            if (!texts || !texts.length) return { error: null, data: [] };
            return db.from('service_package_items').insert(
              texts.map(function (t, i) { return { section_id: sectionId, item_text: t, sort_order: i + 1 }; }));
          });
      }).then(C.ok);
    }
  };

  global.MKServices = global.MKServices || {};
  global.MKServices.packages = svc;
})(window);

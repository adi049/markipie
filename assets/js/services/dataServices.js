/* ============================================================
   Markipie — marketingService · mediaService · dashboardService ·
   activityLogService (Phase 9)
   ------------------------------------------------------------
   marketing: canonical marketing_services table (active = public).
   media/indexing/jobs: SERVICE INTERFACES ONLY (Parts 28–29) —
     no Drive calls, no processing, no embeddings in this phase.
   dashboard: counters from real database values (0 when empty).
   activity: admin_activity_logs (never logs secrets).
   ============================================================ */
(function (global) {
  'use strict';
  var C = global.MKServicesCore, SB = global.MKSupabase;
  /* MarkipieData resolves lazily — service files may load before data.js */
  function MD() { return global.MarkipieData; }
  if (!C || !SB) return;

  /* ================= marketing ================= */
  var marketing = {
    listPublic: function () {
      return C.remoteFirst(
        function () {
          return SB.run(function (db) {
            return db.from('marketing_services').select('*').eq('is_active', true).order('sort_order');
          }).then(function (r) {
            if (!r.ok) return r;
            return C.ok((r.data || []).map(function (x) {
              return {
                id: x.slug, slug: x.slug, title: x.title, icon: x.icon_name || 'sparkles',
                intro: x.description || '',
                priceLine: x.starting_price != null ? 'Starting at ₹' + Number(x.starting_price).toLocaleString('en-IN') : ''
              };
            }));
          });
        },
        function () { return MD().marketing.list().then(function (list) { return C.ok(list); }); }
      );
    },
    listAdmin: function () {
      return SB.run(function (db) { return db.from('marketing_services').select('*').order('sort_order'); })
        .then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    create: function (input) {
      var err = C.V.first([
        C.V.required(input.title, 'Title'),
        C.V.maxLen(input.slug, 80, 'Slug')
      ]);
      if (err) return Promise.resolve(C.fail(err));
      return SB.run(function (db) {
        return db.from('marketing_services').insert({
          title: input.title, slug: input.slug, description: input.description || null,
          starting_price: input.startingPrice != null ? Number(input.startingPrice) : null,
          currency: input.currency || 'INR', icon_name: input.iconName || null,
          sort_order: Number(input.sortOrder) || 0, is_active: true
        }).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    update: function (id, patch) {
      var keys = { title: 'title', slug: 'slug', description: 'description', startingPrice: 'starting_price', iconName: 'icon_name', sortOrder: 'sort_order', isActive: 'is_active' };
      var row = {};
      Object.keys(patch || {}).forEach(function (k) { if (keys[k]) row[keys[k]] = patch[k]; });
      return SB.run(function (db) {
        return db.from('marketing_services').update(row).eq('id', id).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    remove: function (id) {
      return SB.run(function (db) { return db.from('marketing_services').delete().eq('id', id); }).then(C.ok);
    }
  };

  /* ================= media + indexing + embeddings (interfaces only) =================
     PHASE 10–12 will implement the bodies against real Drive + the
     face model. Nothing here processes photos or writes embeddings. */
  var media = {
    listForFunction: function (clientFunctionId) {
      return SB.run(function (db) {
        return db.from('media').select('*').eq('client_function_id', clientFunctionId).order('created_at');
      }).then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    registerMetadata: function (row) {
      /* metadata only — binaries stay in Google Drive */
      return SB.run(function (db) {
        return db.from('media').upsert(row, { onConflict: 'client_function_id,drive_file_id' }).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(r.data) : r; });
    }
  };

  var indexing = {
    createJob: function (clientId, clientFunctionId) {
      return SB.run(function (db) {
        return db.from('indexing_jobs').insert({
          client_id: clientId, client_function_id: clientFunctionId || null, status: 'queued'
        }).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    updateProgress: function (jobId, patch) {
      var keys = { status: 'status', totalFiles: 'total_files', processedFiles: 'processed_files', facesFound: 'faces_found', failedFiles: 'failed_files', startedAt: 'started_at', completedAt: 'completed_at', errorMessage: 'error_message' };
      var row = {};
      Object.keys(patch || {}).forEach(function (k) { if (keys[k]) row[keys[k]] = patch[k]; });
      return SB.run(function (db) {
        return db.from('indexing_jobs').update(row).eq('id', jobId).select('*').single();
      }).then(function (r) { return r.ok ? C.ok(r.data) : r; });
    },
    /* interface stub — real embeddings arrive in Phase 12; videos are
       rejected by the database trigger even if someone tries */
    insertEmbedding: function () {
      return Promise.resolve(C.fail('Face embedding storage activates in Phase 12 — no embeddings are generated yet.'));
    }
  };

  /* ================= dashboard counters (Part 25) ================= */
  var dashboard = {
    counters: function () {
      var local = function () {
        return Promise.all([MD().clients.list(), MD().blogs.list({ includeDrafts: true })]).then(function (res) {
          var clients = res[0], blogs = res[1];
          var jobs = MD().store.read('jobs_v1', []);
          var fnCounts = { active: 0, photos: 0, videos: 0 };
          clients.forEach(function (c) {
            (MD().store.read('functions_v1', []) || []).forEach(function (f) {
              if (f.clientId !== c.id || f.status !== 'active') return;
              fnCounts.active++;
              fnCounts.photos += Number(f.photoCount) || 0;
              fnCounts.videos += Number(f.videoCount) || 0;
            });
          });
          var rows = MD().store.read('faceidx_v1', []) || [];
          return C.ok({
            totalClients: clients.length,
            activeClients: clients.filter(function (c) { return c.status === 'active' && c.paymentStatus === 'received'; }).length,
            pendingPayments: clients.filter(function (c) { return c.paymentStatus !== 'received'; }).length,
            activeEvents: fnCounts.active,
            totalPhotos: fnCounts.photos,
            totalVideos: fnCounts.videos,
            indexedPhotos: jobs.reduce(function (s, j) { return s + (j.processed || 0); }, 0),
            indexedFaces: rows.reduce(function (s, r) { return s + (Number(r.fc) || 1); }, 0),
            activeServices: (MD().store.read('packages_v1', []) || []).filter(function (p) { return p.status !== 'inactive'; }).length,
            totalBlogs: blogs.length,
            publishedBlogs: blogs.filter(function (b) { return b.status === 'published'; }).length,
            connectedDrives: clients.filter(function (c) { return c.drive && c.drive.connected; }).length
          });
        });
      };
      if (!SB.isConfigured()) return local();
      return Promise.all([
        SB.run(function (db) { return db.from('clients').select('id,client_status,payment_status'); }),
        SB.run(function (db) { return db.from('blogs').select('id,status'); }),
        SB.run(function (db) { return db.from('drive_connections').select('id', { count: 'exact', head: true }).neq('connection_status', 'not_connected'); }),
        SB.run(function (db) { return db.from('media').select('id', { count: 'exact', head: true }).eq('processing_status', 'indexed'); })
      ]).then(function (res) {
        for (var i = 0; i < res.length; i++) if (!res[i].ok) return local();
        var clients = res[0].data || [], blogs = res[1].data || [];
        return Promise.all([
          SB.run(function (db) { return db.from('client_functions').select('id', { count: 'exact', head: true }).eq('status', 'active'); }),
          SB.run(function (db) { return db.from('media').select('media_type', { count: 'exact', head: true }); }),
          SB.run(function (db) { return db.from('face_embeddings').select('id', { count: 'exact', head: true }); }),
          SB.run(function (db) { return db.from('service_packages').select('id', { count: 'exact', head: true }).eq('status', 'active'); })
        ]).then(function (x) {
          var okx = x.every(function (r) { return r.ok; });
          return C.ok({
            totalClients: clients.length,
            activeClients: clients.filter(function (c) { return c.client_status === 'active' && c.payment_status === 'received'; }).length,
            pendingPayments: clients.filter(function (c) { return c.payment_status !== 'received'; }).length,
            activeEvents: okx ? (x[0].count || 0) : 0,
            totalPhotos: 0,
            totalVideos: 0,
            indexedPhotos: res[3].count || 0,
            indexedFaces: okx ? (x[2].count || 0) : 0,
            activeServices: okx ? (x[3].count || 0) : 0,
            totalBlogs: blogs.length,
            publishedBlogs: blogs.filter(function (b) { return b.status === 'published'; }).length,
            connectedDrives: res[2].data ? 1 : (res[2].count || 0)
          });
        });
      }).catch(local);
    }
  };

  /* ================= admin activity logs (Part 15) ================= */
  var activity = {
    log: function (adminUserId, action, entityType, entityId, metadata) {
      /* no secrets in metadata — callers must pass ids/labels only */
      if (!SB.isConfigured()) return Promise.resolve(C.fail('Logging activates once Supabase is connected.'));
      return SB.run(function (db) {
        return db.from('admin_activity_logs').insert({
          admin_user_id: adminUserId || null, action: action,
          entity_type: entityType, entity_id: entityId || null, metadata: metadata || null
        });
      }).then(C.ok);
    },
    listRecent: function (limit) {
      return SB.run(function (db) {
        return db.from('admin_activity_logs').select('*').order('created_at', { ascending: false }).limit(limit || 30);
      }).then(function (r) { return r.ok ? C.ok(r.data || []) : r; });
    }
  };

  global.MKServices = global.MKServices || {};
  global.MKServices.marketing = marketing;
  global.MKServices.media = media;
  global.MKServices.indexing = indexing;
  global.MKServices.dashboard = dashboard;
  global.MKServices.activity = activity;
})(window);

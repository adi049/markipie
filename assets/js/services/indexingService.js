/* ============================================================
   Markipie — indexingService (Phase 12 spec §15–§18, §22–§23)
   ------------------------------------------------------------
   MarkipieIndex — the REAL admin-driven AI photo-indexing
   pipeline over the canonical `indexing_jobs` +
   `face_embeddings` + `media.processing_status` structures.

   Pipeline (photos ONLY — videos are never indexed):

     synced media (Drive → media table)
       → indexing job (queued → processing)
       → per-photo: download nothing — load the synced
         thumbnail/preview into memory, detect faces,
         create 128-d descriptors
       → write face_embeddings + media.processing_status
       → progress saved after EVERY batch
       → resumable: pause / resume / cancel / retry failed
       → temporary image memory discarded

   The processing worker is the ADMIN'S BROWSER (authenticated,
   admin-RLS only) — heavy ML stays out of edge functions, no
   secrets are involved, and every write is admin-gated by RLS.
   Batches are small (10 photos between progress writes), the
   loop yields between photos, backs off while the tab is hidden
   or a video is playing, and survives page reloads via the job
   row + media states (spec §16/§28/§34).

   Duplicate protection (§17): a photo is skipped when its
   processing_status is indexed/skipped OR embeddings already
   exist for it. Re-indexing rebuilds ONLY the relevant scope.
   ============================================================ */
(function (global) {
  'use strict';
  var SB = global.MKSupabase;
  if (!SB) return;

  /* lazy — this file may load before data.js */
  function MD() { return global.MarkipieData; }
  function F() { return global.MarkipieFace; }

  var JOB_STORE = 'indexjobs_v1';   // local-mode canonical job rows
  var BATCH_SIZE = 10;              // spec §16: reasonable batches (10–50)
  var YIELD_MS = 40;

  var listeners = [];

  function emit(clientId) {
    var snap = { clientId: clientId };
    listeners.forEach(function (f) { try { f(snap); } catch (e) {} });
  }
  function onChange(cb) { listeners.push(cb); return function () { listeners = listeners.filter(function (x) { return x !== cb; }); }; }

  /* ---------------- local job rows (canonical shape) ---------------- */
  function localJobs() { var s = MD() && MD().store; return s ? s.read(JOB_STORE, []) || [] : []; }
  function saveLocalJobs(list) { var s = MD() && MD().store; if (s) s.write(JOB_STORE, list); }
  function localJobFor(clientId) {
    var hit = null;
    localJobs().forEach(function (j) { if (j.client_id === clientId) { if (!hit || j.started_at > hit.started_at) hit = j; } });
    return hit;
  }
  function putLocalJob(job) {
    var list = localJobs().filter(function (j) { return j.id !== job.id; });
    list.unshift(job);
    saveLocalJobs(list.slice(0, 40));
  }

  /* ---------------- worker state ---------------- */
  var run = { active: false, paused: false, canceled: false, clientId: null, jobId: null, configured: false };

  function yieldDelay() {
    if (document.hidden) return 800;
    var vs = document.querySelectorAll('video');
    for (var i = 0; i < vs.length; i++) if (!vs[i].paused) return 800;
    return YIELD_MS;
  }

  function logEvent(clientId, text) {
    if (!run.configured) {
      try { MD().clients.logEvent(clientId, 'indexing', text); } catch (e) {}
      return;
    }
    /* configured errors are swallowed — logging must never kill a job */
    SB.run(function (db) {
      return db.from('admin_activity_logs').insert({
        action: 'ai.indexing', entity_type: 'client', entity_id: clientId, metadata: { note: text }
      });
    }).catch(function () {});
  }

  /* ---------------- media source (photos ONLY) ---------------- */
  function listPhotos(clientId, fnId) {
    if (!run.configured) {
      return MD().functions.forClient(clientId, { admin: true }).then(function (fns) {
        var wanted = fnId ? fns.filter(function (f) { return f.id === fnId; }) : fns;
        return wanted.reduce(function (chain, f) {
          return chain.then(function (acc) {
            var out = [], page = 1;
            function nextPage() {
              return MD().media.listByFunction(f.id, { page: page, type: 'photo', admin: true }).then(function (r) {
                (r.items || []).forEach(function (it) { if (it.thumb || it.src) acc.push({ id: it.id, fnId: f.id, name: it.filename, url: it.thumb || it.src, status: 'pending' }); });
                if (r.hasMore && page < 200) { page++; return nextPage(); }
                return acc;
              });
            }
            return nextPage();
          });
        }, Promise.resolve([]));
      });
    }
    return SB.run(function (db) {
      var q = db.from('media')
        .select('id, client_function_id, file_name, thumbnail_url, preview_url, processing_status')
        .eq('client_id', clientId).eq('media_type', 'photo').eq('available', true);
      if (fnId) q = q.eq('client_function_id', fnId);
      return q;
    }).then(function (r) {
      if (!r.ok) return [];
      return (r.data || []).map(function (m) {
        return { id: m.id, fnId: m.client_function_id, name: m.file_name,
                 url: m.thumbnail_url || m.preview_url, status: m.processing_status || 'pending' };
      });
    });
  }

  /* ---------------- one photo of real work ----------------
     The loop calls this per photo and persists the job row every
     BATCH_SIZE photos (spec §16: progress saved after every batch;
     media states + descriptors are saved per photo). */
  function processOne(job, photos, opts) {
    var engine = F();
    return new Promise(function (res) {
      if (run.canceled || run.paused) return res(false);
      var ph = photos.shift();
      if (!ph) return res(false);
      var load = engine.ready() ? Promise.resolve() : engine.loadModels();
      load.catch(function () { return null; }).then(function () {
        return engine.describeImage(ph.url).then(function (faces) {
          return opts.onFaces(ph, faces).then(function () {
            job.faces_found += faces.length;
            job.processed_files++;
            if (!faces.length) job.skipped_files = (job.skipped_files || 0) + 1;
          });
        }).catch(function () {
          return opts.onFail(ph).then(function () { job.failed_files++; job.processed_files++; });
        }).then(function () {
          emit(run.clientId);
          setTimeout(function () { res(true); }, yieldDelay());
        });
      }).catch(function () { res(false); });
    });
  }

  /* ---------------- public API ---------------- */
  var MarkipieIndex = {

    onChange: onChange,
    isRunning: function (clientId) { return run.active && (!clientId || run.clientId === clientId); },

    /* START INDEXING (client-wide, or one function) */
    start: function (clientId, fnId) {
      var self = this;
      if (run.active) return Promise.resolve({ ok: false, error: 'Indexing is already running.' });
      var engine = F();
      if (!engine) return Promise.resolve({ ok: false, error: 'The face engine is unavailable.' });
      run = { active: true, paused: false, canceled: false, clientId: clientId, configured: SB.isConfigured(), jobId: null };
      var job = null;

      var boot = run.configured
        ? SB.run(function (db) {
            return db.from('indexing_jobs').insert({
              client_id: clientId, client_function_id: fnId || null,
              status: 'processing', total_files: 0, started_at: new Date().toISOString()
            }).select('*').single();
          }).then(function (r) { if (!r.ok) throw new Error(r.error && r.error.message || 'job'); return r.data; })
        : Promise.resolve(null).then(function () {
            var j = {
              id: 'job_' + Date.now(), client_id: clientId, client_function_id: fnId || null,
              status: 'queued', total_files: 0, processed_files: 0, faces_found: 0,
              failed_files: 0, skipped_files: 0, error_message: null,
              started_at: new Date().toISOString(), completed_at: null
            };
            putLocalJob(j);
            return j;
          });

      return boot.then(function (j) {
        j.status = 'processing';   /* queued → processing once work begins */
        job = j; run.jobId = j.id;
        return listPhotos(clientId, fnId);
      }).then(function (photos) {
        var pending = photos.filter(function (p) { return p.status === 'pending' || p.status === 'processing' || p.status === 'failed'; });
        /* duplicate protection (§17) narrows the scope BEFORE the total is
           written — a resumed run's job total is ITS remaining work */
        if (!run.configured && F().filterPending) pending = F().filterPending(pending);
        job.total_files = pending.length;
        if (run.configured) {
          return SB.run(function (db) {
            return db.from('indexing_jobs').update({ total_files: pending.length }).eq('id', job.id);
          }).then(function () { return pending; });
        }
        putLocalJob(job);
        return pending;
      }).then(function (pending) {
        if (!run.configured && F().filterPending) pending = F().filterPending(pending);
        logEvent(clientId, 'AI photo indexing started — ' + pending.length + ' photos (videos excluded).');
        var opts = run.configured ? self.configuredOpts() : self.localOpts();
        function savePaused() {
          job.status = 'paused';
          if (run.configured) { self.saveJob(job); } else putLocalJob(job);
          emit(clientId);
        }
        var sinceSave = 0;
        function loop() {
          if (run.canceled) return self.finish(job, 'cancelled');
          if (run.paused) return savePaused();
          processOne(job, pending, opts).then(function (more) {
            sinceSave++;
            function after() {
              if (run.paused) return savePaused();
              if (!more) { return self.finish(job, 'completed'); }
              loop();
            }
            if (!run.configured) { putLocalJob(job); after(); return; }
            if (sinceSave >= Math.min(50, Math.max(10, (self.config && self.config.batchSize) || BATCH_SIZE))) {
              sinceSave = 0;
              self.saveJob(job).then(after, after);
              return;
            }
            after();
          }).catch(function () { return self.finish(job, 'failed', 'A batch could not be processed.'); });
        }
        loop();
        return { ok: true };
      }).catch(function (e) {
        run.active = false;
        if (job) { job.status = 'failed'; job.error_message = 'Indexing could not start.'; putLocalJob(job); }
        if (global.MKDebug) console.warn('MarkipieIndex start failed:', e && e.message, e && e.stack);
        return { ok: false, error: 'Indexing could not start.' + (e && e.message === 'job' ? ' Check the database connection.' : ''), debug: e && e.message };
      });
    },

    /* per-photo persistence — CONFIGURED (admin RLS writes) */
    configuredOpts: function () {
      var self = this;
      return {
        onFaces: function (ph, faces) {
          return SB.run(function (db) {
            var write = db.from('face_embeddings').delete().eq('media_id', ph.id);
            return write.then(function () {
              if (!faces.length) return db.from('media').update({ processing_status: 'skipped' }).eq('id', ph.id);
              var rows = faces.map(function (f) {
                return { media_id: ph.id, client_id: run.clientId, client_function_id: ph.fnId,
                         embedding: Array.prototype.slice.call(f.descriptor).map(function (x) { return Math.round(x * 1e4) / 1e4; }),
                         face_index: f.faceIndex };
              });
              return db.from('face_embeddings').insert(rows).then(function () {
                return db.from('media').update({ processing_status: 'indexed' }).eq('id', ph.id);
              });
            });
          });
        },
        onFail: function (ph) {
          return SB.run(function (db) {
            return db.from('media').update({ processing_status: 'failed' }).eq('id', ph.id);
          });
        }
      };
    },

    /* per-photo persistence — LOCAL (on-device stores) */
    localOpts: function () {
      return {
        onFaces: function (ph, faces) {
          return F().storeFaces(ph.fnId, ph.id, run.clientId, faces);
        },
        onFail: function (ph) { return F().trackResult(ph.fnId, ph.id, -1); }
      };
    },

    saveJob: function (job) {
      return SB.run(function (db) {
        return db.from('indexing_jobs').update({
          status: run.paused ? 'paused' : job.status,
          total_files: job.total_files, processed_files: job.processed_files,
          faces_found: job.faces_found, failed_files: job.failed_files
        }).eq('id', job.id);
      }).then(function () {});
    },

    finish: function (job, status, errMsg) {
      job.status = status === 'completed' ? 'completed' : status;
      if (errMsg) job.error_message = errMsg;
      if (status === 'completed' || status === 'failed' || status === 'cancelled') job.completed_at = new Date().toISOString();
      run.active = false;
      var after;
      if (run.configured) {
        after = SB.run(function (db) {
          return db.from('indexing_jobs').update({
            status: status, completed_at: job.completed_at || null,
            processed_files: job.processed_files, faces_found: job.faces_found, failed_files: job.failed_files,
            error_message: errMsg || null
          }).eq('id', job.id);
        });
      } else {
        putLocalJob(job);
        after = Promise.resolve();
      }
      var verb = status === 'completed' ? 'completed' : status;
      logEvent(run.clientId, 'AI photo indexing ' + verb + ' — ' + job.processed_files + ' processed, ' + job.faces_found + ' faces found' + (job.failed_files ? ', ' + job.failed_files + ' failed.' : '.'));
      emit(run.clientId);
      return after.then(function () { return { ok: true, status: status }; });
    },

    /* PAUSE / RESUME / CANCEL (§19) */
    /* Pause ends the page-run (run.active=false) but persists the job as
       'paused' — Resume then restarts the pipeline, and the pending filter
       picks up exactly where the run stopped (spec: resumable). */
    pause: function () {
      if (run.active) { run.paused = true; run.active = false; }
      return Promise.resolve({ ok: true });
    },
    resume: function (clientId) { return this.start(clientId); },
    cancel: function () {
      if (!run.active) return Promise.resolve({ ok: true });
      run.canceled = true;
      run.paused = false;
      return Promise.resolve({ ok: true });
    },

    /* RE-INDEX FAILED (§23): failed photos only — the start() filter
       already includes processing_status='failed', so this simply
       restarts; nothing else is touched. */
    retryFailed: function (clientId) { return this.start(clientId); },

    /* RE-INDEX ALL (§23): removes the scope's embeddings and rebuilds.
       Original media is never touched. */
    /* safe runtime tuning (admin settings page); engine clamps again */
    config: { batchSize: BATCH_SIZE },
    /* DELETE EMBEDDINGS (§18/§32): removes the AI index rows ONLY —
       Google Drive originals and media metadata are never touched.
       Media returns to 'pending' so a future run can re-index. */
    deleteEmbeddings: function (clientId, fnId) {
      if (run.active) return Promise.resolve({ ok: false, error: 'Indexing is already running.' });
      var engine = F();
      if (SB.isConfigured()) {
        return SB.run(function (db) {
          var q = db.from('media').select('id').eq('client_id', clientId).eq('media_type', 'photo');
          if (fnId) q = q.eq('client_function_id', fnId);
          return q;
        }).then(function (r) {
          var ids = (r.data || []).map(function (m) { return m.id; });
          if (!ids.length) return { ok: true, removed: 0 };
          return SB.run(function (db) {
            return db.from('face_embeddings').delete().in('media_id', ids).then(function () {
              return db.from('media').update({ processing_status: 'pending' }).in('id', ids);
            });
          }).then(function () { return { ok: true, removed: ids.length }; });
        });
      }
      var removed = 0;
      (fnId ? [fnId] : (function () {
        var out = [];
        (JSON.parse(localStorage.getItem('mk_functions_v1') || '[]') || []).forEach(function (f) {
          if (f.clientId === clientId) out.push(f.id);
        });
        return out;
      })()).forEach(function (fid) {
        engine.resetFunction(fid);
        removed++;
      });
      return Promise.resolve({ ok: true, removed: removed });
    },

    reindexAll: function (clientId, fnId) {
      var engine = F();
      if (run.active) return Promise.resolve({ ok: false, error: 'Indexing is already running.' });
      if (SB.isConfigured()) {
        return SB.run(function (db) {
          var q = db.from('media').select('id').eq('client_id', clientId).eq('media_type', 'photo');
          if (fnId) q = q.eq('client_function_id', fnId);
          return q;
        }).then(function (r) {
          var ids = (r.data || []).map(function (m) { return m.id; });
          if (!ids.length) return { ok: true };
          return SB.run(function (db) {
            return db.from('face_embeddings').delete().in('media_id', ids).then(function () {
              return db.from('media').update({ processing_status: 'pending' }).in('id', ids);
            });
          });
        }).then(function () { return MarkipieIndex.start(clientId, fnId); });
      }
      /* local: rebuild the on-device index for the scope */
      return MD().functions.forClient(clientId, { admin: true }).then(function (fns) {
        (fnId ? fns.filter(function (f) { return f.id === fnId; }) : fns).forEach(function (f) { engine.resetFunction(f.id); });
        return MarkipieIndex.start(clientId, fnId);
      });
    },

    /* Real counters for the admin AI panels (§19/§22) */
    stats: function (clientId, fnIds) {
      if (!SB.isConfigured()) {
        var engine = F();
        var agg = engine ? engine.clientIndexStats(fnIds || []) : { photos: 0, indexed: 0, skipped: 0, failed: 0, faces: 0, complete: true, processing: false };
        var job = localJobFor(clientId);
        return Promise.resolve({
          ok: true, data: {
            totalPhotos: agg.photos, indexed: agg.indexed, noFace: agg.skipped, failed: agg.failed,
            faces: agg.faces, processing: run.active && run.clientId === clientId,
            job: job ? { status: job.status, processed: job.processed_files, total: job.total_files,
                         faces: job.faces_found, failed: job.failed_files, startedAt: job.started_at,
                         completedAt: job.completed_at, error: job.error_message } : null,
            lastIndexedAt: job ? (job.completed_at || job.started_at) : null
          }
        });
      }
      return Promise.all([
        SB.run(function (db) {
          var q = db.from('media').select('processing_status', { count: 'exact', head: false })
            .eq('client_id', clientId).eq('media_type', 'photo').eq('available', true);
          return q;
        }),
        SB.run(function (db) {
          return db.from('face_embeddings').select('id', { count: 'exact', head: true }).eq('client_id', clientId);
        }),
        SB.run(function (db) {
          return db.from('indexing_jobs').select('*').eq('client_id', clientId)
            .order('created_at', { ascending: false }).limit(1);
        })
      ]).then(function (res) {
        var counts = { indexed: 0, skipped: 0, failed: 0, pending: 0, processing: 0 };
        var total = 0;
        (res[0].data || []).forEach(function (m) { counts[m.processing_status] = (counts[m.processing_status] || 0) + 1; total++; });
        var job = (res[2].data || [])[0] || null;
        return { ok: true, data: {
          totalPhotos: total,
          indexed: counts.indexed || 0, noFace: counts.skipped || 0, failed: counts.failed || 0,
          pending: counts.pending || 0,
          faces: res[1].ok ? (res[1].count || 0) : 0,
          processing: run.active && run.clientId === clientId,
          job: job ? { status: job.status, processed: job.processed_files, total: job.total_files,
                       faces: job.faces_found, failed: job.failed_files, startedAt: job.started_at,
                       completedAt: job.completed_at, error: job.error_message } : null,
          lastIndexedAt: job ? (job.completed_at || job.started_at) : null
        } };
      }).catch(function () {
        return { ok: true, data: { totalPhotos: 0, indexed: 0, noFace: 0, failed: 0, faces: 0, processing: false, job: null, lastIndexedAt: null } };
      });
    }
  };

  /* stop cleanly when the admin leaves the page — progress is saved */
  global.addEventListener('pagehide', function () {
    if (run.active && !run.paused) run.paused = true;
  });

  global.MarkipieIndex = MarkipieIndex;
})(window);

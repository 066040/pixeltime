/* PixelTime — uygulama */
(function () {
  'use strict';

  /* ================= Ayarlar ================= */
  var CFG = window.PT_CONFIG || {};
  var BIRDS = window.PT_BIRDS, DATA = window.PT_DATA;
  var TEST = /[?&]test\b/.test(location.search) || (function () { try { return localStorage.getItem('pt_test') === '1'; } catch (e) { return false; } })();
  var BLOCK_MS = TEST ? 1e3 : 25 * 60e3;          // 1 kare = 25 dk odak (test: 1 sn)
  var BREAK_MS = TEST ? 2e3 : 5 * 60e3;
  var LONG_BREAK_MS = TEST ? 3e3 : 15 * 60e3;     // her 4 pomodoroda bir
  var LEAVE_GRACE_MS = 2000;
  var DAILY_MAX = TEST ? 9999 : 28;               // günde en fazla 28 kare (~12 saat)
  var N = TEST ? 4 : 16, CELLS = N * N;           // kişisel tuval (test: 16 kare)
  var KEY = TEST ? 'pixeltime_test' : 'pixeltime_v2';
  /* Maildeki linkten dönüş: #access_token=...&type=recovery gibi. Supabase'in hazır mailleri sadece link içeriyor. */
  var AUTH_HASH = /(^|[#&])(access_token|error_description|error_code)=/.test(location.hash) ? location.hash : null;
  var AUTH_TYPE = AUTH_HASH ? (AUTH_HASH.match(/[#&]type=([a-z_]+)/) || [])[1] : null;
  var SERVER = !TEST && !!(CFG.supabaseUrl && CFG.supabaseKey);
  var SUPA_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var SEASON = 1;
  var TAG = '#pixeltime';
  var GOALS = [4, 6, 8, 10, 12, 16];

  /* Portre sırası her hesapta farklıdır: hesabın tohumuna göre karıştırılır. Pixel bu sırada yok (PixelTime Saat'e özel). */
  function revealFor(seed) {
    var ids = BIRDS.list.map(function (b) { return b.id; });
    return shuffled(ids.length, 'kuslar:' + seed).map(function (i) { return ids[i]; });
  }
  var REVEAL = [];

  /* ================= Kayıt ================= */
  function fresh() {
    return { seed: rnd(), profile: null, profileSynced: false, blocks: [], canvasNo: 1, active: null, goal: 8,
      fails: 0, pomStreak: 0, breakDue: false, mode: TEST ? 'kronometre' : 'pomodoro', team: null, teamState: null, pendingJoin: null, email: null,
      pixelSeen: false, pro: false, pixelCanvas: false, isPublic: true, sound: true };
  }
  var st;
  try { st = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { st = fresh(); }
  var def = fresh(); for (var k in def) if (!(k in st)) st[k] = def[k];
  if (st.profile) {
    if (st.profile.bird !== 'pixel' || !st.pro) st.profile.bird = BIRDS.fix(st.profile.bird);
    if (!('color2' in st.profile)) st.profile.color2 = null;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  REVEAL = revealFor(st.seed);

  /* ================= Yardımcılar ================= */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rnd() { return Math.random().toString(36).slice(2, 10); }
  function uuid() { return (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + rnd() + rnd()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mmss(ms) { ms = Math.max(0, Math.ceil(ms / 1000)); return pad(Math.floor(ms / 60)) + ':' + pad(ms % 60); }
  function hms(ms) { var s = Math.floor(Math.max(0, ms) / 1000), h = Math.floor(s / 3600); return (h ? h + ':' : '') + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60); }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function okBlocks() { return st.blocks.filter(function (b) { return !b.rejected; }); }
  /* Hediye kareler portreyi açar ama çalışma sayılmaz (saat, gün, seri hesabına girmez) */
  function studyBlocks() { return okBlocks().filter(function (b) { return b.mode !== 'hediye'; }); }
  function todayCount() { var t = dayKey(Date.now()); return studyBlocks().filter(function (b) { return dayKey(b.started_at) === t; }).length; }
  function hours(n) { return (n * 25 / 60).toFixed(1).replace('.', ',').replace(',0', ''); }
  function trLow(s) { return String(s || '').replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase(); }
  function toast(msg, kind, ms) {
    var el = $('toast'); el.textContent = msg; el.className = 'toast show ' + (kind || '');
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.className = 'toast ' + (kind || ''); }, ms || 3800);
  }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function shuffled(n, seed) {
    var a = [], x = hashStr(String(seed)) || 1;
    for (var i = 0; i < n; i++) a.push(i);
    function r() { x = (x + 0x6D2B79F5) | 0; var t = Math.imul(x ^ (x >>> 15), 1 | x); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(r() * (j + 1)), tmp = a[j]; a[j] = a[k]; a[k] = tmp; }
    return a;
  }
  function bird(id) { return BIRDS.get(id) || BIRDS.get('muhabbet'); }
  function birdName(id) { return bird(id).name; }
  function catName(c) { for (var i = 0; i < BIRDS.cats.length; i++) if (BIRDS.cats[i][0] === c) return BIRDS.cats[i][1]; return ''; }
  function ring(c1, c2) { return '--r1:' + esc(c1 || '#2b7a3a') + ';--r2:' + esc(c2 || c1 || '#2b7a3a'); }
  /* Profil kuşu: gerçek fotoğraf, kenarlık tek renk ya da gradyan */
  function av(id, c1, c2, size) {
    var b = bird(id);
    return '<span class="av" style="' + ring(c1, c2) + (size ? ';width:' + size + 'px;height:' + size + 'px' : '') + '"><span class="ph" data-ph="' + esc(b.id) + '"><b>' + esc(b.name.charAt(0)) + '</b></span></span>';
  }

  /* ================= Gerçek kuş fotoğrafları =================
     Wikimedia yalnızca standart genişlikleri (120, 250, 330, 500, 960…) serbestçe verir; başka genişlikler kısıtlanır. */
  var PHK = 'pt_photos_v3', phc = {};
  try { phc = JSON.parse(localStorage.getItem(PHK)) || {}; } catch (e) {}
  var phWait = {};
  function stdW(w) { return w <= 250 ? 250 : w <= 330 ? 330 : w <= 500 ? 500 : 960; }
  function wikiThumb(t) {
    if (t in phc) return Promise.resolve(phc[t]);
    if (phWait[t]) return phWait[t];
    var keep = function (u) { if (u) { phc[t] = u; try { localStorage.setItem(PHK, JSON.stringify(phc)); } catch (e) {} } return u; };
    var rest = function () {
      return fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(t))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { return j && j.thumbnail && j.thumbnail.source || null; });
    };
    var action = function () {
      return fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=500&titles=' + encodeURIComponent(t))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { var p = j && j.query && j.query.pages, k; for (k in p) if (p[k].thumbnail) return p[k].thumbnail.source; return null; });
    };
    phWait[t] = rest().catch(function () { return null; }).then(function (u) { return u || action().catch(function () { return null; }); })
      .then(keep).then(function (u) { if (!u) delete phWait[t]; return u; });
    return phWait[t];
  }
  /* Denenecek adresler: standart boyut, sonra Wikipedia'nın verdiği hali */
  function photoUrls(id, w) {
    var b = BIRDS.get(id); if (!b) return Promise.resolve([]);
    if (b.src) return Promise.resolve([b.src]);
    if (b.local) return Promise.resolve(['img/kuslar/' + b.id + '.jpg']);
    return wikiThumb(b.wiki).then(function (u) {
      if (!u) return [];
      var s = /\/\d+px-/.test(u) ? u.replace(/\/\d+px-/, '/' + stdW(w || 330) + 'px-') : u;
      return s === u ? [u] : [s, u];
    });
  }
  function photo(id, w) { return photoUrls(id, w).then(function (l) { return l[0] || null; }); }
  function loadFirst(urls, cors) {
    return new Promise(function (ok) {
      (function next(i) {
        if (i >= urls.length) return ok(null);
        var im = new Image(); if (cors) im.crossOrigin = 'anonymous'; im.decoding = 'async';
        im.onload = function () { ok(im); }; im.onerror = function () { next(i + 1); }; im.src = urls[i];
      })(0);
    });
  }
  var lazyIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { lazyIO.unobserve(en.target); loadPh(en.target, en.target.getAttribute('data-lz')); } });
  }, { rootMargin: '300px' }) : null;
  function loadPh(el, id) {
    photoUrls(id, 330).then(function (l) { return loadFirst(l, false); }).then(function (im) {
      if (!im) return;
      var b = BIRDS.get(id);
      if (b) im.style.objectPosition = (b.fx * 100) + '% ' + (b.fy * 100) + '%';
      im.alt = ''; el.innerHTML = ''; el.appendChild(im); el.classList.add('ok');
    });
  }
  function hydrate(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-ph]'), function (el) {
      var id = el.getAttribute('data-ph'); el.removeAttribute('data-ph');
      if (lazyIO && el.closest('.birds')) { el.setAttribute('data-lz', id); lazyIO.observe(el); return; }
      loadPh(el, id);
    });
  }
  new MutationObserver(function () { hydrate(document.body); }).observe(document.body, { childList: true, subtree: true });

  /* ================= İkonlar ================= */
  var ICON = {
    calis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
    ekip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.2 4.4 1.8 5 4.9"/></svg>',
    siralama: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 21V12h4v9M10 21V5h4v16M16 21v-6h4v6"/></svg>',
    koleksiyon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7"/><rect x="13.5" y="3.5" width="7" height="7"/><rect x="3.5" y="13.5" width="7" height="7"/><rect x="13.5" y="13.5" width="7" height="7"/></svg>',
    profil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/></svg>'
  };
  var TABS = [['calis', '#/', 'Çalış'], ['ekip', '#/ekip', 'Ekip'], ['siralama', '#/siralama', 'Sıralama'], ['koleksiyon', '#/koleksiyon', 'Koleksiyon']];
  $('tabs').innerHTML = TABS.map(function (t) { return '<a href="' + t[1] + '" data-r="' + t[0] + '">' + t[2] + '</a>'; }).join('');
  $('bnav').innerHTML = TABS.map(function (t) { return '<a href="' + t[1] + '" data-r="' + t[0] + '">' + ICON[t[0]] + '<span>' + t[2] + '</span></a>'; }).join('');

  /* ================= Kuş resimleri ve tuval ================= */
  var imgs = {}, fullCache = {};
  function birdImage(id) {
    if (imgs[id]) return imgs[id].ready ? imgs[id].img : null;
    var rec = imgs[id] = { img: null, ready: false, failed: false };
    photoUrls(id, 960).then(function (l) { return loadFirst(l, true); }).then(function (im) {
      if (!im) { rec.failed = true; delete imgs[id]; return; }
      rec.img = im; rec.ready = true; fullCache = {}; drawAll();
    });
    return null;
  }
  function fullImage(px, id) {
    var key = id + ':' + px; if (fullCache[key]) return fullCache[key];
    var im = birdImage(id); if (!im) return null;
    var c = document.createElement('canvas'); c.width = c.height = px;
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, side = Math.min(iw, ih);
    var b = BIRDS.get(id) || {}, fx = b.fx == null ? 0.5 : b.fx, fy = b.fy == null ? 0.35 : b.fy;
    c.getContext('2d').drawImage(im, (iw - side) * fx, (ih - side) * fy, side, side, 0, 0, px, px);
    return (fullCache[key] = c);
  }
  var pulse = 0, pulseIdx = -1;
  /* side: kenar kare sayısı · opened: açılan kare · seed: açılış sırası · owners: kare sahibi renkleri */
  /* Açılış sırası: ortadan dışa doğru, biraz rastgele. İlk kareler çimen değil kuşun kendisi olsun. */
  var orderCache = {};
  function revealOrder(n, seed) {
    var key = n + ':' + seed; if (orderCache[key]) return orderCache[key];
    var side = Math.round(Math.sqrt(n)), x = hashStr('sira:' + seed) || 1, c = (side - 1) / 2, dmax = Math.sqrt(2) * c || 1, cells = [];
    function r() { x = (x + 0x6D2B79F5) | 0; var t = Math.imul(x ^ (x >>> 15), 1 | x); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    for (var p = 0; p < n; p++) {
      var dx = (p % side) - c, dy = Math.floor(p / side) - c * 0.9;   /* kafalar genelde biraz yukarıda */
      cells.push({ p: p, k: Math.sqrt(dx * dx + dy * dy) / dmax * 0.62 + r() * 0.38 });
    }
    cells.sort(function (a, b) { return a.k - b.k; });
    return (orderCache[key] = cells.map(function (o) { return o.p; }));
  }
  function drawCanvas(cv, side, opened, seed, birdId, owners, highlight) {
    if (!cv) return;
    var cell = Math.max(8, Math.floor(800 / side)), px = cell * side;
    if (cv.width !== px) { cv.width = cv.height = px; }
    var g = cv.getContext('2d'), img = fullImage(px, birdId), order = revealOrder(side * side, seed);
    var gap = side > 24 ? 1 : side > 8 ? 2 : 4;
    g.fillStyle = '#e3e8dc'; g.fillRect(0, 0, px, px);
    var shown = {};
    for (var i = 0; i < Math.min(opened, order.length); i++) shown[order[i]] = i + 1;
    for (var p = 0; p < side * side; p++) {
      var x = (p % side) * cell, y = Math.floor(p / side) * cell;
      if (shown[p]) {
        if (img) g.drawImage(img, x, y, cell, cell, x, y, cell, cell);
        else { g.fillStyle = '#bcc7b6'; g.fillRect(x, y, cell, cell); }
        var col = owners && owners[shown[p] - 1];
        if (col && cell >= 10) { g.strokeStyle = col; g.lineWidth = Math.max(1, cell / 12); g.strokeRect(x + g.lineWidth / 2, y + g.lineWidth / 2, cell - g.lineWidth, cell - g.lineWidth); }
      } else {
        g.fillStyle = '#d3dbcc'; g.fillRect(x + gap / 2, y + gap / 2, cell - gap, cell - gap);
      }
    }
    if (highlight != null && highlight >= 0 && highlight < order.length && pulse > 0) {
      var hp = order[highlight], hx = (hp % side) * cell, hy = Math.floor(hp / side) * cell;
      g.strokeStyle = 'rgba(63,95,158,' + pulse + ')'; g.lineWidth = Math.max(4, cell / 8);
      g.strokeRect(hx + g.lineWidth / 2, hy + g.lineWidth / 2, cell - g.lineWidth, cell - g.lineWidth);
    }
    cv._meta = { side: side, order: order, opened: opened };
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function flash(idx) { pulseIdx = idx; pulse = 1; (function step() { pulse -= 0.02; drawAll(); if (pulse > 0) requestAnimationFrame(step); })(); }

  function canvasBird(no) { return st.pro && st.pixelCanvas ? 'pixel' : REVEAL[(no - 1) % REVEAL.length]; }
  function personal() {
    var n = okBlocks().length, base = (st.canvasNo - 1) * CELLS, opened = Math.max(0, Math.min(CELLS, n - base));
    return { opened: opened, full: opened >= CELLS, seed: st.seed + ':' + st.canvasNo, bird: canvasBird(st.canvasNo) };
  }
  function finishedCanvases() { return Math.floor(okBlocks().length / CELLS); }
  function teamBird(t) { return REVEAL[hashStr(String(t.id)) % REVEAL.length]; }
  function drawAll() {
    var pc = $('pcanvas');
    if (pc) { var P = personal(); drawCanvas(pc, N, P.opened, P.seed, P.bird, null, pulseIdx); }
    var tc = $('tcanvas');
    if (tc && st.team && st.teamState) drawTeam(tc);
  }

  /* ================= Ekranı açık tut ================= */
  /* 1) Wake Lock API (Chrome, Safari 16.4+).
     2) Olmazsa ya da reddedilirse: sessiz, döngüdeki 1 karelik görüntü (eski iPad/iPhone ve ana ekran uygulaması için).
     Oturum sürerken ekran kendiliğinden kararırsa "uygulamadan çıkıldı" sayılmasın diye. */
  var lock = null, wanted = false, vid = null;
  function vidOn() {
    if (!vid) {
      vid = document.createElement('video');
      vid.setAttribute('playsinline', ''); vid.setAttribute('muted', ''); vid.muted = true; vid.loop = true;
      vid.setAttribute('aria-hidden', 'true'); vid.src = 'media/uyanik.mp4';
      vid.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:0;bottom:0';
      document.body.appendChild(vid);
    }
    var p = vid.play(); if (p && p.catch) p.catch(function () {});
  }
  function wake() {
    wanted = true;
    if (lock) return;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(function (l) {
        lock = l;
        l.addEventListener('release', function () { lock = null; if (wanted && !document.hidden) wake(); });
        if (vid) vid.pause();
      }).catch(vidOn);
    } else vidOn();
  }
  function unwake() { wanted = false; if (lock) { lock.release().catch(function () {}); lock = null; } if (vid) vid.pause(); }

  /* ================= Zamanlayıcı ================= */
  function canWork() {
    if (!st.profile) { location.hash = '#/profil'; return false; }
    if (todayCount() >= DAILY_MAX) { toast('Bugün 12 saat çalıştın, günlük sınıra ulaştın. Yarın devam.'); return false; }
    return true;
  }
  function startWork() {
    if (st.active || !canWork()) return;
    var done = finishedCanvases();
    if (personal().full) { st.canvasNo = Math.max(st.canvasNo + 1, done + 1); pulseIdx = -1; save(); renderWork(); }
    var now = Date.now(); st.breakDue = false;
    st.active = st.mode === 'kronometre'
      ? { kind: 'watch', start: now, credited: 0, beat: now, leftAt: null }
      : { kind: 'work', start: now, end: now + BLOCK_MS, leftAt: null };
    save(); wake(); renderTimer();
  }
  function startBreak() {
    if (st.active) return;
    var long = st.pomStreak > 0 && st.pomStreak % 4 === 0, now = Date.now(); st.breakDue = false;
    st.active = { kind: 'break', start: now, end: now + (long ? LONG_BREAK_MS : BREAK_MS), long: long };
    save(); wake(); renderTimer();
  }
  function addBlock(s, e, mode) {
    var P0 = personal(), before = todayCount();
    st.blocks.push({ client_id: uuid(), started_at: new Date(s).toISOString(), ended_at: new Date(e).toISOString(), mode: mode, synced: false });
    save();
    if (P0.opened < CELLS) flash(P0.opened);
    if (st.teamState) st.teamState.opened.push(me());
    if (before < st.goal && todayCount() >= st.goal) setTimeout(function () { toast('Günlük hedefine ulaştın.', 'good', 5000); }, 1600);
    return personal();
  }
  function celebrate(P, extra) {
    if (P.full) toast('Portre tamamlandı: ' + birdName(P.bird) + '.', 'good', 5000);
    else toast('Bir kare açıldı · ' + P.opened + '/' + CELLS + (extra || ''), 'good');
    ding();
  }
  function completeWork() {
    var a = st.active; st.active = null; st.pomStreak++; st.breakDue = true;
    var P = addBlock(a.start, a.end, 'pomodoro');
    unwake(); renderTimer(); renderMe(); celebrate(P, ' · Mola zamanı'); sync();
  }
  function stopWatch(reason) {
    var a = st.active; if (!a || a.kind !== 'watch') return;
    st.active = null; save(); unwake(); renderTimer(); renderMe();
    var got = a.credited;
    if (reason) toast((got ? got + ' kare kaydedildi. ' : '') + 'Oturum bozuldu: ' + reason, 'bad', 5000);
    else toast(got ? 'Oturum bitti. ' + got + ' kare açtın.' : 'Oturum bitti. 25 dakika dolmadığı için kare açılmadı.', got ? 'good' : '', 5000);
  }
  function fail(reason) {
    var a = st.active; if (!a) return;
    if (a.kind === 'watch') return stopWatch(reason);
    st.active = null;
    if (a.kind === 'work') { st.fails++; st.pomStreak = 0; }
    save(); unwake(); renderTimer();
    if (a.kind === 'work') toast('Oturum bozuldu: ' + reason, 'bad', 5000);
  }
  function giveUp() {
    var a = st.active; if (!a) return;
    if (a.kind === 'break') { st.active = null; save(); unwake(); renderTimer(); return; }
    if (a.kind === 'watch') return stopWatch(null);
    if (!confirm('Yarım kalan pomodoro kare açmaz. Bırakmak istiyor musun?')) return;
    fail('pomodoro yarıda bırakıldı.');
  }
  function tick() {
    var a = st.active; if (!a || document.hidden) return;
    var now = Date.now();
    if (a.kind === 'work' && now >= a.end) return completeWork();
    if (a.kind === 'break' && now >= a.end) { st.active = null; save(); unwake(); renderTimer(); toast('Mola bitti.'); ding(); return; }
    if (a.kind === 'watch') {
      var k = Math.floor((now - a.start) / BLOCK_MS);
      while (a.credited < k) {
        if (todayCount() >= DAILY_MAX) { stopWatch(null); toast('Bugün 12 saat çalıştın, günlük sınıra ulaştın.'); return; }
        var s = a.start + a.credited * BLOCK_MS; a.credited++;
        var P = addBlock(s, s + BLOCK_MS, 'kronometre');
        celebrate(P); sync(); renderMe(); renderTimer();
      }
      if (now - a.beat > 2000) { a.beat = now; save(); }
    }
    paintClock();
  }
  setInterval(tick, 250);

  document.addEventListener('visibilitychange', function () {
    var a = st.active; if (!a) return;
    if (a.kind === 'break') { if (!document.hidden) { wake(); tick(); } return; }
    if (document.hidden) { a.leftAt = Date.now(); save(); }
    else if (a.leftAt && Date.now() - a.leftAt > LEAVE_GRACE_MS) fail('çalışırken uygulamadan çıkıldı.');
    else { a.leftAt = null; save(); wake(); tick(); }
  });
  (function recover() {
    var a = st.active; if (!a) return;
    st.active = null;
    if (a.kind === 'work') { st.fails++; st.pomStreak = 0; setTimeout(function () { toast('Oturum bozuldu: çalışırken uygulama kapandı.', 'bad', 5000); }, 400); }
    if (a.kind === 'watch') {
      var until = Math.min(a.leftAt || a.beat, a.beat), k = Math.floor((until - a.start) / BLOCK_MS);
      while (a.credited < k) { var s = a.start + a.credited * BLOCK_MS; a.credited++; addBlock(s, s + BLOCK_MS, 'kronometre'); }
      setTimeout(function () { toast('Kronometre durdu: uygulama kapandı.' + (a.credited ? ' ' + a.credited + ' kare kaydedildi.' : ''), 'bad', 5000); }, 400);
    }
    save();
  })();

  var actx = null;
  function ding() {
    if (st.sound === false) return;
    try { if (navigator.vibrate) navigator.vibrate([90, 60, 90]); } catch (e) {}
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      [[0, 659], [0.16, 880]].forEach(function (n) {
        var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + n[0];
        o.type = 'sine'; o.frequency.value = n[1];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.55);
      });
    } catch (e) {}
  }

  /* ================= Sunucu ================= */
  var sb = null, user = null, ready = null, syncing = false;
  function me() { return user ? user.id : 'me'; }
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function client() {
    if (sb) return Promise.resolve(sb);
    return (window.supabase ? Promise.resolve() : loadScript(SUPA_JS)).then(function () {
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
      watchAuth();
      return sb;
    });
  }
  function server(noAnon) {
    if (!SERVER) return Promise.reject(new Error('yerel'));
    if (ready) return ready;
    ready = client().then(function () { return sb.auth.getSession(); }).then(function (r) {
      user = r.data && r.data.session ? r.data.session.user : null;
      if (user) return adopt(user).then(function () { return user; });
      if (noAnon) { ready = null; return null; }
      return sb.auth.signInAnonymously().then(function (r2) { if (r2.error) throw r2.error; user = r2.data.user; return adopt(user).then(function () { return user; }); });
    }).catch(function (e) { ready = null; throw e; });
    return ready;
  }
  function chk(r) { if (r.error) throw r.error; return r.data; }
  /* Bu cihazdaki kayıtlar hangi hesaba ait? (st.uid). Oturum başka bir hesaba geçtiyse
     (giriş, mail linki, şifre sıfırlama linki) eski hesabın verisi yeni hesaba karışmasın:
     yerel kayıt sıfırlanır, yeni hesabınki sunucudan getirilir. */
  function adopt(u) {
    if (!u) return Promise.resolve(false);
    if (!st.uid) { st.uid = u.id; if (u.email) st.email = u.email; save(); return Promise.resolve(false); }
    if (st.uid === u.id) return Promise.resolve(false);
    var keep = { sound: st.sound, goal: st.goal, pendingJoin: st.pendingJoin };
    st = fresh(); for (var k in keep) st[k] = keep[k];
    st.uid = u.id; st.email = u.email || null; REVEAL = revealFor(st.seed); save();
    return restore().catch(function (e) { console.warn('geri yükleme', e); }).then(function () {
      if (u.email) toast('Bu cihazda artık ' + u.email + ' hesabı açık.', 'good', 6000);
      render(); return true;
    });
  }
  function pushProfile() {
    if (!st.profile) return Promise.resolve();
    return server().then(function () {
      var p = st.profile;
      return sb.from('profiles').upsert({ id: user.id, nickname: p.nickname, bird: p.bird === 'pixel' ? 'muhabbet' : p.bird, color: p.color, color2: p.color2 || null, is_public: st.isPublic !== false, seed: st.seed,
        exam: p.exam || null, city: p.city || null, school: p.school || null }).then(chk);
    }).then(function () { st.profileSynced = true; save(); });
  }
  /* Başka cihazdan e-postayla girildiyse profili ve kareleri sunucudan geri getir */
  function restore() {
    if (!user) return Promise.resolve(false);
    return sb.from('profiles').select('nickname,bird,color,color2,exam,city,school,is_public,seed').eq('id', user.id).maybeSingle().then(chk).then(function (p) {
      if (!p) return false;
      st.profile = { nickname: p.nickname, bird: BIRDS.fix(p.bird), color: p.color, color2: p.color2 || null, exam: p.exam || '', city: p.city || '', school: p.school || '' };
      st.profileSynced = true; st.email = user.email || st.email; st.pixelSeen = true; st.isPublic = p.is_public !== false;
      if (p.seed) { st.seed = p.seed; REVEAL = revealFor(st.seed); }
      return sb.from('blocks').select('client_id,started_at,ended_at,mode').order('started_at').limit(10000).then(chk).then(function (rows) {
        var have = {}; st.blocks.forEach(function (b) { have[b.client_id] = 1; });
        (rows || []).forEach(function (r) { if (!have[r.client_id]) st.blocks.push({ client_id: r.client_id, started_at: r.started_at, ended_at: r.ended_at, mode: r.mode, synced: true }); });
        st.blocks.sort(function (a, b) { return a.started_at < b.started_at ? -1 : 1; });
        st.canvasNo = Math.max(st.canvasNo, finishedCanvases() + 1);
        save(); return true;
      });
    });
  }
  /* Saatten (ya da başka cihazdan) gelen yeni kareleri çek: siteye 1 hafta sonra girsen de hepsi burada */
  function pullBlocks() {
    if (!user) return Promise.resolve();
    var since = st.pulledAt || '1970-01-01T00:00:00Z';
    return sb.from('blocks').select('client_id,started_at,ended_at,mode,created_at').gt('created_at', since).order('created_at').limit(1000).then(chk).then(function (rows) {
      if (!rows || !rows.length) return;
      var have = {}, added = 0, fromClock = 0;
      st.blocks.forEach(function (b) { have[b.client_id] = 1; });
      rows.forEach(function (r) {
        if (!have[r.client_id]) { st.blocks.push({ client_id: r.client_id, started_at: r.started_at, ended_at: r.ended_at, mode: r.mode, synced: true }); added++; if (r.mode === 'saat') fromClock++; }
      });
      st.pulledAt = rows[rows.length - 1].created_at;
      if (added) {
        st.blocks.sort(function (a, b) { return a.started_at < b.started_at ? -1 : 1; });
        save(); render();
        if (fromClock) toast('Saatinden ' + fromClock + ' kare geldi.', 'good', 5000);
      } else save();
    });
  }
  /* Bu hesaba bağlı PixelTime Saat'ler. Saati olan Pixel'i açar. */
  function refreshDevices() {
    if (!user) return Promise.resolve();
    return sb.rpc('my_devices').then(chk).then(function (list) {
      st.devices = list || [];
      if (st.devices.length && !st.pro) { st.pro = true; toast('PixelTime Saat bağlı. Pixel açıldı.', 'good'); render(); }
      save();
    });
  }
  function sync() {
    renderSync();
    if (!SERVER || syncing || !navigator.onLine || !st.profile) return Promise.resolve();
    syncing = true; renderSync();
    return (st.profileSynced ? server() : pushProfile()).then(function () {
      var list = st.blocks.filter(function (b) { return !b.synced; }).slice(0, 60);
      if (!list.length) return;
      return sb.rpc('record_blocks', { p_blocks: list.map(function (b) { return { client_id: b.client_id, started_at: b.started_at, ended_at: b.ended_at, mode: b.mode }; }) })
        .then(chk).then(function (res) {
          var acc = {}, rej = {};
          (res.accepted || []).forEach(function (id) { acc[id] = 1; });
          (res.rejected || []).forEach(function (r) { rej[r.client_id] = r.reason; });
          st.blocks.forEach(function (b) { if (acc[b.client_id]) b.synced = true; if (rej[b.client_id]) { b.synced = true; b.rejected = rej[b.client_id]; } });
          save();
        });
    }).then(pullBlocks).then(refreshDevices).then(function () { return refreshTeam(); })
      .catch(function (e) { console.warn('senkron', e); })
      .then(function () { syncing = false; renderSync(); });
  }
  window.addEventListener('online', sync);
  window.addEventListener('offline', renderSync);
  function renderSync() {
    var el = $('sync'), wait = st.blocks.filter(function (b) { return !b.synced; }).length;
    if (TEST) { el.textContent = 'Test modu'; el.className = 'sync off'; return; }
    if (!SERVER) { el.textContent = 'Bu cihazda kayıtlı'; el.className = 'sync'; return; }
    if (!navigator.onLine) { el.textContent = 'Çevrimdışı · ' + wait + ' kare bekliyor'; el.className = 'sync off'; return; }
    if (syncing) { el.textContent = 'Kaydediliyor'; el.className = 'sync wait'; return; }
    if (wait) { el.textContent = wait + ' kare gönderilecek'; el.className = 'sync wait'; return; }
    el.textContent = 'Kaydedildi'; el.className = 'sync ok';
  }

  /* ================= Ekip ================= */
  function refreshTeam() {
    if (!SERVER || !user) return Promise.resolve();
    return sb.from('profiles').select('team_id').eq('id', user.id).maybeSingle().then(chk).then(function (p) {
      if (!p || !p.team_id) { st.team = null; st.teamState = null; save(); return; }
      return sb.rpc('team_state', { p_team: p.team_id }).then(chk).then(function (s) {
        st.team = s.team; st.teamState = { members: s.members || [], opened: s.opened || [] }; save();
        if (route() === 'ekip') renderTeam();
      });
    });
  }
  function drawTeam(cv) {
    var t = st.team, s = st.teamState, col = {};
    s.members.forEach(function (m) { col[m.id] = m.color; });
    if (st.profile) col.me = st.profile.color;
    drawCanvas(cv, t.side, Math.min(s.opened.length, t.cells), 'team:' + t.id, teamBird(t), s.opened.map(function (id) { return col[id] || '#8a8478'; }));
  }

  /* ================= Sayfalar ================= */
  function route() { var h = location.hash.replace(/^#\/?/, '').split('?')[0]; if (/^(access_token|error|type)=|&/.test(h)) return 'calis'; return h || 'calis'; }
  function render() {
    var r = route();
    if (!st.profile && r !== 'pixel' && r !== 'yardim') r = 'profil';
    if (dirty && dirty() && r !== 'profil' && !confirm('Profilde kaydedilmemiş değişiklikler var. Kaydetmeden çıkılsın mı?')) { history.replaceState(null, '', '#/profil'); return; }
    dirty = null; closeMenu();
    if (st.active && st.active.kind !== 'break' && r !== 'calis') { r = 'calis'; if (location.hash !== '#/') history.replaceState(null, '', '#/'); }
    ['tabs', 'bnav'].forEach(function (id) {
      Array.prototype.forEach.call($(id).children, function (a) { var on = a.getAttribute('data-r') === r; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    });
    document.body.classList.toggle('guest', !st.profile);
    if (/^u\//.test(r)) renderPublic(r.slice(2));
    else ({ calis: renderWork, ekip: renderTeam, siralama: renderBoard, koleksiyon: renderCollection, profil: renderProfile, ayarlar: renderSettings, yardim: renderHelp, pixel: renderPixel }[r] || renderWork)();
    renderMe(); renderSync(); window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);
  var dirty = null;
  function renderMe() {
    var p = st.profile, el = $('me');
    $('acct').hidden = !p; if (!p) return;
    el.innerHTML = '<span>' + esc(p.nickname) + '</span>' + av(p.bird, p.color, p.color2, 34) + '<svg class="chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
    el.setAttribute('aria-label', 'Hesap menüsü: ' + p.nickname);
  }
  /* Hesap menüsü: profil, ayarlar, yardım, çıkış */
  function openMenu() {
    var m = $('menu');
    m.innerHTML = '<a role="menuitem" href="#/profil">Profil</a><a role="menuitem" href="#/ayarlar">Ayarlar</a><a role="menuitem" href="#/yardim">Yardım</a><a role="menuitem" href="#/pixel">Pixel\'in anısına</a>' +
      '<hr><button type="button" role="menuitem" id="mOut">Çıkış yap</button>';
    m.hidden = false; $('me').setAttribute('aria-expanded', 'true');
    $('mOut').addEventListener('click', function () { closeMenu(); logout(); });
    var first = m.querySelector('a'); if (first) first.focus();
  }
  function closeMenu() { var m = $('menu'); if (!m || m.hidden) return; m.hidden = true; $('me').setAttribute('aria-expanded', 'false'); }
  $('me').addEventListener('click', function (e) { e.stopPropagation(); if ($('menu').hidden) openMenu(); else closeMenu(); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.acct')) closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  function logout() {
    var warn = SERVER && st.email ? 'Bu cihazdan çıkış yapılacak. Aynı e-postayla tekrar girebilirsin.'
      : 'Hesabına e-posta eklemediğin için çıkış yaparsan bu cihazdaki tüm kayıtların (kareler, portreler, profil) silinir ve geri getirilemez. Devam edilsin mi?';
    if (!confirm(warn)) return;
    var done = function () { try { localStorage.removeItem(KEY); localStorage.removeItem('pt_test'); } catch (e) {} location.href = location.pathname; };
    if (SERVER && sb) sb.auth.signOut().then(done, done); else done();
  }
  function head(kicker, title, lead) {
    return '<header class="phead"><p class="kicker">' + kicker + '</p><h1>' + title + '</h1>' + (lead ? '<p class="lead">' + lead + '</p>' : '') + '</header>';
  }

  /* ---------- Çalış ---------- */
  function greet() {
    var h = new Date().getHours(), n = todayCount(), g = st.goal, name = st.profile ? st.profile.nickname : '';
    if (n >= g) return 'Bugünkü hedef tamam, ' + name + '.';
    if (n === 0) return (h < 6 ? 'Geç saatte çalışıyorsun, ' : h < 12 ? 'Günaydın, ' : h < 18 ? 'İyi çalışmalar, ' : 'İyi akşamlar, ') + name + '.';
    return 'Hedefine ' + (g - n) + ' kare kaldı.';
  }
  function renderWork() {
    var P = personal();
    $('view').innerHTML =
      head('Sezon ' + SEASON + ' · Portre No. ' + st.canvasNo, '<span id="greet">' + esc(greet()) + '</span>') +
      (SERVER && !TEST && !st.email ? '<p class="nudge"><span>Kayıtların şu an sadece bu cihazda. Hesabını kaydet, telefonun değişse de kaybolmasın.</span><button type="button" class="btn small primary" id="bSaveAcc">Hesabını kaydet</button></p>' : '') +
      (SERVER && st.email && st.needPw ? '<p class="nudge"><span>E-postan doğrulandı. Kaydı başlattığın ekranda tamamlanmadıysa şifreni buradan belirle.</span><button type="button" class="btn small primary" id="bSetPw">Şifre belirle</button></p>' : '') +
      '<div class="work">' +
      '<section class="plate" aria-label="Portre">' +
      '<div class="mat"><canvas id="pcanvas" class="pt" role="img" aria-label="Portre tuvali"></canvas></div>' +
      '<div class="caption"><div><strong id="pname"></strong><em id="platin"></em></div><span class="num" id="pprog"></span></div>' +
      '<div class="meter" aria-hidden="true"><i id="pbar"></i></div>' +
      '<div class="actions" id="pact"></div>' +
      '</section>' +
      '<section class="card timer" aria-label="Zamanlayıcı">' +
      '<div class="seg" id="seg" role="radiogroup" aria-label="Çalışma şekli"><button type="button" role="radio" data-m="pomodoro">Pomodoro</button><button type="button" role="radio" data-m="kronometre">Kronometre</button></div>' +
      '<div class="clock" id="clock" aria-live="off"></div><p class="sub" id="sub"></p>' +
      '<button type="button" id="bStart" class="btn primary"></button>' +
      '<button type="button" id="bBreak" class="btn" hidden></button>' +
      '<button type="button" id="bStop" class="btn" hidden></button>' +
      '<p id="rule" class="rule" hidden>Oturum sürerken uygulamadan çıkarsan ya da ekranı kapatırsan oturum bozulur ve kare açılmaz.</p>' +
      '<div class="today"><div class="row"><span>Bugün</span><span class="num"><b id="sToday">0</b> / ' + st.goal + ' kare</span></div><div class="ticks" id="dots"></div></div>' +
      '</section></div>' +
      (st.team ? '<p class="note">Açtığın her kare <b>' + esc(st.team.name) + '</b> ekibinin tuvaline de işleniyor. <a href="#/ekip">Ekip tuvali</a></p>' : '');
    Array.prototype.forEach.call($('seg').children, function (b) {
      b.addEventListener('click', function () { if (st.active) return; st.mode = b.getAttribute('data-m'); save(); renderTimer(); });
    });
    if ($('bSaveAcc')) $('bSaveAcc').addEventListener('click', function () { authModal('register'); });
    if ($('bSetPw')) $('bSetPw').addEventListener('click', function () { authModal('password'); });
    $('bStart').addEventListener('click', startWork);
    $('bBreak').addEventListener('click', startBreak);
    $('bStop').addEventListener('click', giveUp);
    renderTimer();
  }
  function renderTimer() {
    var a = st.active, working = a && a.kind !== 'break';
    document.body.classList.toggle('focus', !!working);
    if (!$('clock')) return;
    var P = personal(), watch = st.mode === 'kronometre', b = bird(P.bird);
    Array.prototype.forEach.call($('seg').children, function (x) { var on = x.getAttribute('data-m') === st.mode; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); x.disabled = !!a; });
    $('bStart').hidden = !!a;
    $('bStart').textContent = (P.full ? 'Sıradaki portreye geç ve ' : '') + (watch ? 'kronometreyi başlat' : 'pomodoro başlat'); $('bStart').textContent = $('bStart').textContent.charAt(0).toUpperCase() + $('bStart').textContent.slice(1);
    $('bBreak').hidden = !!a || P.full || !st.breakDue || st.mode !== 'pomodoro';
    $('bBreak').textContent = st.pomStreak % 4 === 0 ? '15 dakika uzun mola' : '5 dakika mola';
    $('bStop').hidden = !a;
    $('bStop').textContent = a && a.kind === 'break' ? 'Molayı bitir' : a && a.kind === 'watch' ? 'Oturumu bitir' : 'Bırak';
    $('rule').hidden = !working;
    $('greet').textContent = working ? 'Odak oturumu sürüyor.' : a ? 'Mola. Gözlerini dinlendir.' : greet();
    var n = todayCount();
    $('sToday').textContent = n;
    var dots = ''; for (var i = 0; i < Math.max(st.goal, Math.min(n, 28)); i++) dots += '<i class="' + (i < n ? (i < st.goal ? 'on' : 'over') : '') + '"></i>';
    $('dots').innerHTML = dots;
    var ratio = P.opened / CELLS;
    $('pname').textContent = P.full ? b.name : P.bird === 'pixel' ? 'Pixel' : ratio >= 0.5 ? 'Gizli tür · ' + catName(b.cat) : 'Gizli tür';
    $('platin').textContent = P.full || P.bird === 'pixel' ? b.latin : '';
    $('pprog').textContent = P.opened + ' / ' + CELLS;
    $('pbar').style.width = (ratio * 100) + '%';
    $('pact').innerHTML = (P.opened ? '<button type="button" class="btn ghost small" id="bShare">' + ICON.share + 'Tuvali paylaş</button>' : '') +
      (P.full ? '<button type="button" class="btn primary small" id="bNext">Sıradaki portreye geç</button>' : '');
    if ($('bNext')) $('bNext').addEventListener('click', function () { st.canvasNo++; save(); pulseIdx = -1; renderWork(); });
    if ($('bShare')) $('bShare').addEventListener('click', function () { shareCanvas('personal'); });
    paintClock(); drawAll();
  }
  function paintClock() {
    var c = $('clock'); if (!c) return;
    var a = st.active, sub = $('sub'), now = Date.now();
    if (!a) { c.textContent = st.mode === 'kronometre' ? '00:00' : mmss(BLOCK_MS); sub.textContent = st.mode === 'kronometre' ? 'Kesintisiz her 25 dakika bir kare açar.' : '25 dakika odak, bir kare.'; return; }
    if (a.kind === 'watch') {
      var el = now - a.start; c.textContent = hms(el);
      sub.textContent = 'Sıradaki kareye ' + mmss(BLOCK_MS - el % BLOCK_MS) + (a.credited ? ' · bu oturumda ' + a.credited + ' kare' : '');
      return;
    }
    c.textContent = mmss(a.end - now);
    sub.textContent = a.kind === 'break' ? (a.long ? 'Uzun mola' : 'Kısa mola') : 'Süre bitince bir kare açılacak.';
  }

  /* ---------- Ekip ---------- */
  var teamUi = { action: 'katil', sort: 'kare' };
  function renderTeam() {
    var v = $('view');
    var intro = 'Ekip kurulunca kişi sayısına göre büyüyen ortak bir portre açılır. Üyelerin açtığı her kare bu portreye işlenir ve kendi kenarlık rengiyle görünür.';
    if (!SERVER) {
      v.innerHTML = head('Ekip', 'Birlikte bir portre açın.', intro) +
        '<div class="card narrow"><p class="muted">' + (TEST ? 'Test modunda ekipler kapalı.' : 'Ekipler, site sunucuya bağlandığında açılacak. Şimdilik kendi portren üzerinde çalışabilirsin.') + '</p></div>';
      return;
    }
    if (!st.team) {
      if (st.pendingJoin) teamUi.action = 'katil';
      v.innerHTML = head('Ekip', 'Birlikte bir portre açın.', intro) +
        '<div class="card narrow form">' +
        '<div class="field"><label for="tAction">Ne yapmak istiyorsun?</label><select id="tAction"><option value="katil"' + (teamUi.action === 'katil' ? ' selected' : '') + '>Bir ekibe katıl</option><option value="kur"' + (teamUi.action === 'kur' ? ' selected' : '') + '>Yeni ekip kur</option></select></div>' +
        '<div id="tForm"></div></div>';
      var paint = function () {
        var f = $('tForm');
        if (teamUi.action === 'katil') {
          f.innerHTML = '<div class="field"><label for="tCode">Davet kodu</label><input type="text" id="tCode" maxlength="6" value="' + esc(st.pendingJoin || '') + '" placeholder="Örneğin G3JN49" autocapitalize="characters" class="code-in"></div>' +
            '<p class="hint">Kodu ekibi kuran kişiden al. Aynı anda tek bir ekipte olabilirsin.</p><button type="button" class="btn primary" id="tJoin">Ekibe katıl</button>';
          $('tJoin').addEventListener('click', function () {
            var c = $('tCode').value.trim().toUpperCase(); if (c.length !== 6) return toast('Davet kodu 6 karakter olmalı.', 'bad');
            busy(this); server().then(function () { return st.profileSynced ? null : pushProfile(); })
              .then(function () { return sb.rpc('join_team', { p_code: c }).then(chk); })
              .then(function () { st.pendingJoin = null; save(); return refreshTeam(); }).then(function () { toast('Ekibe katıldın.', 'good'); renderTeam(); })
              .catch(function (e) { toast(errText(e), 'bad'); renderTeam(); });
          });
        } else {
          f.innerHTML = '<div class="field"><label for="tName">Ekip adı</label><input type="text" id="tName" maxlength="30" placeholder="Örneğin Gece Vardiyası"></div>' +
            '<div class="field"><label for="tSize">Kişi sayısı</label><select id="tSize">' + [2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<option value="' + n + '"' + (n === 4 ? ' selected' : '') + '>' + n + ' kişi</option>'; }).join('') + '</select></div>' +
            '<p class="hint" id="tCalc"></p><button type="button" class="btn primary" id="tCreate">Ekibi kur</button>';
          var calc = function () { var n = +$('tSize').value, s = Math.round(16 * Math.sqrt(n)); $('tCalc').textContent = 'Ekip portresi ' + s * s + ' kare olur. Herkes günde 4 saat çalışırsa yaklaşık bir ayda tamamlanır.'; };
          $('tSize').addEventListener('change', calc); calc();
          $('tCreate').addEventListener('click', function () {
            var name = $('tName').value.trim(); if (name.length < 2) return toast('Ekibine bir ad ver.', 'bad');
            busy(this); server().then(function () { return st.profileSynced ? null : pushProfile(); })
              .then(function () { return sb.rpc('create_team', { p_name: name, p_size: +$('tSize').value }).then(chk); })
              .then(refreshTeam).then(function () { toast('Ekip kuruldu. Davet kodunu paylaş.', 'good'); renderTeam(); })
              .catch(function (e) { toast(errText(e), 'bad'); renderTeam(); });
          });
        }
      };
      $('tAction').addEventListener('change', function () { teamUi.action = this.value; paint(); });
      paint();
      return;
    }
    var t = st.team, s = st.teamState || { members: [], opened: [] }, opened = Math.min(s.opened.length, t.cells);
    var link = location.origin + location.pathname + '?ekip=' + t.code, tb = bird(teamBird(t)), full = opened >= t.cells;
    v.innerHTML = head('Ekip · ' + s.members.length + ' / ' + t.size + ' kişi', esc(t.name)) +
      '<div class="work">' +
      '<section class="plate" aria-label="Ekip portresi"><div class="mat"><canvas id="tcanvas" class="pt" role="img" aria-label="Ekip portresi"></canvas></div>' +
      '<div class="caption"><div><strong>' + (full ? esc(tb.name) : 'Ekip portresi') + '</strong><em>' + (full ? esc(tb.latin) : 'Bir kareye dokun, kimin açtığını gör.') + '</em></div><span class="num">' + opened + ' / ' + t.cells + '</span></div>' +
      '<div class="meter" aria-hidden="true"><i style="width:' + (opened / t.cells * 100) + '%"></i></div>' +
      '<div class="actions">' + (opened ? '<button type="button" class="btn ghost small" id="tShareImg">' + ICON.share + 'Tuvali paylaş</button>' : '') + '</div></section>' +
      '<div class="stack">' +
      '<section class="card"><p class="label">Davet kodu</p><p class="code">' + esc(t.code) + '</p>' +
      (s.members.length < t.size ? '<button type="button" class="btn primary" id="tShare">Davet linkini gönder</button>' : '<p class="muted small">Ekip dolu.</p>') + '</section>' +
      '<section class="card"><div class="cardhead"><h2>Üyeler</h2><div class="field inline"><label for="tSort">Sırala</label><select id="tSort"><option value="kare"' + (teamUi.sort === 'kare' ? ' selected' : '') + '>En çok kare</option><option value="ad"' + (teamUi.sort === 'ad' ? ' selected' : '') + '>Takma ad</option></select></div></div>' +
      '<ol class="rows" id="tMembers"></ol></section>' +
      '<button type="button" class="btn quiet small" id="tLeave">Ekipten ayrıl</button></div></div>';
    var members = function () {
      var list = s.members.slice().sort(function (a, b) { return teamUi.sort === 'ad' ? a.nickname.localeCompare(b.nickname, 'tr') : b.count - a.count; });
      $('tMembers').innerHTML = list.map(function (m) {
        return '<li' + (m.id === me() ? ' class="mine"' : '') + '><a class="rowlink" href="#/u/' + esc(m.id) + '">' + av(m.bird, m.color, m.color2, 36) + '<span class="name"><b>' + esc(m.nickname) + '</b></span><span class="num">' + m.count + '<small>kare</small></span></a></li>';
      }).join('');
    };
    members();
    $('tSort').addEventListener('change', function () { teamUi.sort = this.value; members(); });
    drawAll();
    $('tcanvas').addEventListener('click', function (e) {
      var m = this._meta; if (!m) return;
      var r = this.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * m.side), y = Math.floor((e.clientY - r.top) / r.height * m.side);
      var idx = m.order.indexOf(y * m.side + x);
      if (idx < 0 || idx >= m.opened) return toast('Bu kare henüz açılmadı.');
      var uid = s.opened[idx], mem = s.members.filter(function (q) { return q.id === uid; })[0];
      toast((mem ? mem.nickname : (st.profile ? st.profile.nickname : 'Bir üye')) + ' açtı.');
    });
    if ($('tShareImg')) $('tShareImg').addEventListener('click', function () { shareCanvas('team'); });
    if ($('tShare')) $('tShare').addEventListener('click', function () {
      var text = 'PixelTime\'da "' + t.name + '" ekibine katıl, portremizi birlikte açalım. Davet kodu: ' + t.code + ' ' + TAG;
      if (navigator.share) navigator.share({ title: 'PixelTime', text: text, url: link }).catch(function () {});
      else { copy(text + ' ' + link); toast('Davet linki kopyalandı.', 'good'); }
    });
    $('tLeave').addEventListener('click', function () {
      if (!confirm('Ekipten ayrılmak istiyor musun? Açtığın kareler ekip portresinde kalır.')) return;
      busy(this); sb.rpc('leave_team').then(chk).then(function () { st.team = null; st.teamState = null; save(); renderTeam(); })
        .catch(function (e) { toast(errText(e), 'bad'); renderTeam(); });
    });
  }

  /* ---------- Sıralama ---------- */
  var board = { scope: 'kisi', period: 'hafta', exam: '' };
  function renderBoard() {
    var v = $('view');
    var opt = function (list, cur) { return list.map(function (s) { return '<option value="' + s[0] + '"' + (cur === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join(''); };
    v.innerHTML = head('Sıralama', 'Türkiye genelinde en çok çalışanlar.') +
      '<div class="filters" role="group" aria-label="Sıralama filtreleri">' +
      '<div class="field"><label for="bScope">Kategori</label><select id="bScope">' + opt([['kisi', 'Kişiler'], ['okul', 'Okullar'], ['sehir', 'Şehirler'], ['ekip', 'Ekipler']], board.scope) + '</select></div>' +
      '<div class="field"><label for="bPeriod">Dönem</label><select id="bPeriod">' + opt([['hafta', 'Bu hafta'], ['ay', 'Bu ay'], ['hepsi', 'Tüm zamanlar']], board.period) + '</select></div>' +
      '<div class="field"><label for="bExam">Sınav</label><select id="bExam">' + opt([['', 'Tüm sınavlar']].concat(DATA.exams.map(function (x) { return [x, x]; })), board.exam) + '</select></div>' +
      '</div><section class="card" id="bList"></section>';
    ['bScope', 'bPeriod', 'bExam'].forEach(function (id) {
      $(id).addEventListener('change', function () { board.scope = $('bScope').value; board.period = $('bPeriod').value; board.exam = $('bExam').value; renderBoard(); });
    });
    $('bExam').disabled = board.scope === 'ekip';
    var out = $('bList');
    if (!SERVER) { out.innerHTML = '<p class="muted">Sıralamalar site sunucuya bağlandığında açılacak.' + (TEST ? ' Test modunda kapalı.' : '') + ' Şimdiye kadar <b>' + studyBlocks().length + ' kare</b>, yani ' + hours(studyBlocks().length) + ' saat çalıştın.</p>'; return; }
    out.innerHTML = '<p class="muted">Yükleniyor…</p>';
    var since = new Date(), d = since.getDay();
    if (board.period === 'hafta') { since.setDate(since.getDate() - (d === 0 ? 6 : d - 1)); since.setHours(0, 0, 0, 0); }
    else if (board.period === 'ay') { since.setDate(1); since.setHours(0, 0, 0, 0); }
    else since = new Date(2020, 0, 1);
    server().then(function () { return sb.rpc('leaderboard', { p_scope: board.scope, p_since: since.toISOString(), p_exam: board.exam || null }).then(chk); })
      .then(function (rows) {
        if (!rows || !rows.length) { out.innerHTML = '<p class="muted">Bu filtrelerle henüz kayıt yok.</p>'; return; }
        var mine = st.profile ? (board.scope === 'kisi' ? st.profile.nickname : board.scope === 'okul' ? st.profile.school : board.scope === 'sehir' ? st.profile.city : st.team && st.team.name) : null;
        out.innerHTML = '<div class="thead"><span>Sıra</span><span>' + { kisi: 'Kişi', okul: 'Okul', sehir: 'Şehir', ekip: 'Ekip' }[board.scope] + '</span><span>Kare</span></div><ol class="rows ranked">' + rows.map(function (r, i) {
          var isMe = mine && trLow(mine) === trLow(r.label);
          var inner = '<span class="rank">' + (i + 1) + '</span>' + (r.bird ? av(r.bird, r.color, r.color2, 36) : '') +
            '<span class="name"><b>' + esc(r.label) + '</b>' + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</span><span class="num">' + r.total + '<small>' + hours(r.total) + ' saat</small></span>';
          return '<li' + (isMe ? ' class="mine"' : '') + '>' + (r.uid ? '<a class="rowlink" href="#/u/' + esc(r.uid) + '">' + inner + '</a>' : inner) + '</li>';
        }).join('') + '</ol>';
      }).catch(function (e) { out.innerHTML = '<p class="muted">Sıralama yüklenemedi. Bağlantını kontrol edip sayfayı yenile.</p>'; console.warn(e); });
  }

  /* ---------- Profil ---------- */
  var PRESETS = [['#2b7a3a', null], ['#f4c521', null], ['#3a62d0', null], ['#17231b', null], ['#b5462f', null], ['#2f6b4f', null], ['#3f5f9e', '#9b6bd6'], ['#e0a03a', '#b5462f'], ['#2f8f9e', '#2f6b4f'], ['#17231b', '#8a8478'], ['#f4c521', '#2b7a3a'], ['#3a62d0', '#9b6bd6']];
  function renderProfile() {
    var p = st.profile || { nickname: '', bird: 'muhabbet', color: '#2b7a3a', color2: null, exam: '', city: '', school: '' };
    var first = !st.profile, draft = { bird: p.bird, color: p.color, color2: p.color2 || null };
    var pickable = BIRDS.list.slice(); if (st.pro) pickable.unshift(BIRDS.pixel);
    var form =
      '<section class="card form" aria-label="Profil bilgileri">' +
      '<div class="field"><label for="fNick">Takma ad</label><input type="text" id="fNick" maxlength="20" value="' + esc(p.nickname) + '" placeholder="Örneğin Mühendis" autocomplete="nickname"><p class="hint">Gerçek adın gerekmez. Sıralamada bu ad görünür.</p></div>' +
      '<fieldset class="field"><legend>Profil kuşu</legend>' +
      '<div class="pickbar"><input type="search" id="fFind" placeholder="Tür ara" aria-label="Tür ara" autocomplete="off">' +
      '<select id="fCat" aria-label="Kategori"><option value="">Tüm kategoriler</option>' + BIRDS.cats.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="birds" id="fBirds">' + pickable.map(function (b) {
        return '<button type="button" data-b="' + b.id + '" data-cat="' + b.cat + '" data-n="' + esc(trLow(b.name + ' ' + b.latin)) + '"' + (b.id === p.bird ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' +
          '<span class="ph" data-ph="' + b.id + '"><b>' + esc(b.name.charAt(0)) + '</b></span><span class="bn">' + esc(b.name) + '</span><span class="bl">' + esc(b.latin) + '</span></button>';
      }).join('') + '</div><p class="muted small" id="fNone" hidden>Bu adla bir tür bulunamadı.</p>' +
      '<p class="credit">' + BIRDS.list.length + ' tür · Fotoğraflar: Wikipedia / Wikimedia Commons</p></fieldset>' +
      '<fieldset class="field"><legend>Kenarlık</legend>' +
      '<div class="ringrow"><div class="preview"><span id="fAv"></span><div><b id="fPrevName"></b><span class="muted small" id="fPrevBird"></span></div></div>' +
      '<div class="ringctl"><select id="fRing" aria-label="Kenarlık türü"><option value="tek">Tek renk</option><option value="gradyan">Gradyan</option></select>' +
      '<label class="swatch"><input type="color" id="fC1" aria-label="Birinci renk"><span>1. renk</span></label>' +
      '<label class="swatch" id="fC2w"><input type="color" id="fC2" aria-label="İkinci renk"><span>2. renk</span></label></div></div>' +
      '<div class="presets" id="fPresets" aria-label="Hazır kenarlıklar">' + PRESETS.map(function (x, i) { return '<button type="button" data-i="' + i + '" aria-label="Hazır kenarlık ' + (i + 1) + '" style="background:linear-gradient(135deg,' + x[0] + ',' + (x[1] || x[0]) + ')"></button>'; }).join('') + '</div></fieldset>' +
      '<div class="grid2f"><div class="field"><label for="fExam">Sınav</label><select id="fExam"><option value="">Belirtmek istemiyorum</option>' + DATA.exams.map(function (x) { return '<option' + (x === p.exam ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="fCity">Şehir</label><select id="fCity"><option value="">Belirtmek istemiyorum</option>' + DATA.cities.map(function (x) { return '<option' + (x === p.city ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="grid2f"><div class="field"><label for="fSchool">Okul <span class="opt">isteğe bağlı</span></label><input type="text" id="fSchool" maxlength="80" value="' + esc(p.school) + '" placeholder="Örneğin Ankara Fen Lisesi"></div>' +
      (first ? '<div class="field"><label for="fGoal">Günlük hedef</label><select id="fGoal">' + goalOptions() + '</select></div>' : '<div></div>') + '</div>' +
      (first ? '' : '<p class="savestate" id="fState" role="status"></p>') +
      '<button type="button" class="btn primary" id="fSave">' + (first ? 'Hesabı oluştur' : 'Değişiklikleri kaydet') + '</button>' +
      (first && SERVER ? '<p class="hint center">Zaten hesabın var mı? <a href="#" id="fLogin">Giriş yap</a></p>' : '') +
      '</section>';
    $('view').innerHTML = first
      ? '<div class="onboard"><div class="obtext">' + head('Sezon ' + SEASON + ' · Kayıt', 'Çalıştıkça bir portre ortaya çıkar.', 'Kesintisiz geçen her 25 dakika, gizli bir kuş portresinin bir karesini açar. Telefonu bıraktığın süre görünür olur; ekibinle, okulunla, şehrinle birlikte.') +
        '<ol class="steps"><li><span><b>Oturumu başlat.</b> Pomodoro ya da kronometre. Oturum sürerken uygulamadan çıkılırsa kare açılmaz.</span></li><li><span><b>Kareler birikir.</b> Her portre 256 kareden oluşur, tamamlanınca koleksiyonuna girer.</span></li><li><span><b>Birlikte çalış.</b> Ekip kur, sıralamada okulunu ve şehrini temsil et.</span></li></ol></div>' + form + '</div>'
      : head('Profil', esc(p.nickname), 'Görünüşün ve bilgilerin. Değişiklikler <b>Kaydet</b>\'e basınca geçerli olur.') + '<div class="profile">' + form + '<div class="stack">' + statsBlock() + proBlock() + '<a class="card linkcard" href="#/u/' + (user ? user.id : 'ben') + '"><b>Profilim başkalarına nasıl görünüyor?</b><span class="muted small">' + (st.isPublic ? 'Profilin herkese açık.' : 'Profilin gizli.') + ' Ayarlardan değiştirebilirsin.</span></a></div></div>';

    var orig = JSON.stringify(p);
    function current() { return { nickname: $('fNick').value.trim().replace(/\s+/g, ' '), bird: draft.bird, color: draft.color, color2: draft.color2, exam: $('fExam').value, city: $('fCity').value, school: $('fSchool').value.trim().slice(0, 80) }; }
    function isDirty() { return !first && JSON.stringify(current()) !== orig; }
    dirty = isDirty;
    function state() {
      if (first) return;
      var d = isDirty();
      $('fSave').disabled = !d; $('fSave').textContent = d ? 'Değişiklikleri kaydet' : 'Kaydedildi';
      $('fState').textContent = d ? 'Kaydedilmemiş değişiklikler var.' : '';
    }
    function prev() {
      $('fAv').innerHTML = av(draft.bird, draft.color, draft.color2, 64);
      $('fPrevName').textContent = $('fNick').value.trim() || 'Takma adın';
      $('fPrevBird').textContent = birdName(draft.bird);
      $('fRing').value = draft.color2 ? 'gradyan' : 'tek';
      $('fC1').value = draft.color; $('fC2').value = draft.color2 || draft.color;
      $('fC2w').hidden = !draft.color2;
      state();
    }
    function filter() {
      var q = trLow($('fFind').value.trim()), c = $('fCat').value, n = 0;
      Array.prototype.forEach.call($('fBirds').children, function (x) {
        var ok = (!c || x.getAttribute('data-cat') === c || x.getAttribute('data-cat') === 'pro') && (!q || x.getAttribute('data-n').indexOf(q) >= 0);
        x.hidden = !ok; if (ok) n++;
      });
      $('fNone').hidden = n > 0;
    }
    $('fFind').addEventListener('input', filter);
    $('fCat').addEventListener('change', filter);
    $('fBirds').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      draft.bird = b.getAttribute('data-b');
      Array.prototype.forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); prev();
    });
    $('fRing').addEventListener('change', function () { draft.color2 = this.value === 'gradyan' ? (draft.color2 || '#9b6bd6') : null; prev(); });
    $('fC1').addEventListener('input', function () { draft.color = this.value; prev(); });
    $('fC2').addEventListener('input', function () { draft.color2 = this.value; prev(); });
    $('fPresets').addEventListener('click', function (e) { var i = e.target.getAttribute('data-i'); if (i == null) return; draft.color = PRESETS[i][0]; draft.color2 = PRESETS[i][1]; prev(); });
    $('fNick').addEventListener('input', prev);
    ['fExam', 'fCity'].forEach(function (id) { $(id).addEventListener('change', state); });
    $('fSchool').addEventListener('input', state);
    $('fSave').addEventListener('click', function () {
      var nick = $('fNick').value.trim().replace(/\s+/g, ' ');
      if (nick.length < 2) { $('fNick').focus(); return toast('Takma adın en az 2 harf olmalı.', 'bad'); }
      st.profile = current(); st.profile.nickname = nick;
      if ($('fGoal')) st.goal = +$('fGoal').value || 8;
      dirty = null;
      st.profileSynced = false; save();
      if (SERVER) pushProfile().then(sync).catch(function (e) { console.warn(e); });
      if (first) {
        go(st.pendingJoin && SERVER ? '#/ekip' : '#/');
        if (st.pendingClaim && SERVER) { st.pixelSeen = true; save(); setTimeout(function () { proModal(st.pendingClaim); }, 400); }
        else if (!st.pixelSeen) pixelWelcome();
      }
      else { toast('Profilin kaydedildi.', 'good'); render(); }
    });
    if ($('fLogin')) $('fLogin').addEventListener('click', function (e) { e.preventDefault(); authModal('login'); });
    if ($('bCard')) $('bCard').addEventListener('click', seasonCard);
    if ($('bPro')) $('bPro').addEventListener('click', proModal);
    if ($('bPixelCanvas')) $('bPixelCanvas').addEventListener('change', function () { st.pixelCanvas = this.checked; save(); toast(this.checked ? 'Çalış sayfasında artık Pixel\'in portresi açılıyor.' : 'Sıradaki kuş portresine dönüldü.', 'good'); });
    prev();
  }
  function stats() {
    var b = studyBlocks(), days = {}, best = 0;
    b.forEach(function (x) { var d = dayKey(x.started_at); days[d] = (days[d] || 0) + 1; });
    Object.keys(days).forEach(function (d) { if (days[d] > best) best = days[d]; });
    var streak = 0, cur = new Date(); if (!days[dayKey(cur)]) cur.setDate(cur.getDate() - 1);
    while (days[dayKey(cur)]) { streak++; cur.setDate(cur.getDate() - 1); }
    return { total: b.length, hours: hours(b.length), best: best, streak: streak, birds: finishedCanvases(), fails: st.fails };
  }
  function statsBlock() {
    var s = stats();
    return '<section class="card"><h2>Sezon ' + SEASON + '</h2><dl class="stats"><div><dt>Kare</dt><dd>' + s.total + '</dd></div><div><dt>Saat</dt><dd>' + s.hours + '</dd></div><div><dt>Seri</dt><dd>' + s.streak + '<small> gün</small></dd></div>' +
      '<div><dt>En iyi gün</dt><dd>' + s.best + '</dd></div><div><dt>Portre</dt><dd>' + s.birds + '</dd></div><div><dt>Bozulan oturum</dt><dd>' + s.fails + '</dd></div></dl>' +
      '<button type="button" class="btn ghost" id="bCard">' + ICON.share + 'Sezon kartımı oluştur</button></section>';
  }
  function goalOptions() { return GOALS.map(function (g) { return '<option value="' + g + '"' + (g === st.goal ? ' selected' : '') + '>' + g + ' kare · yaklaşık ' + hours(g) + ' saat</option>'; }).join(''); }
  function proBlock() {
    if (st.pro) return '<section class="card pro"><p class="label">PixelTime Saat</p><h2>Pixel senin.</h2><p class="muted">Pixel\'i profil kuşu olarak seçebilir, portresi üzerinde çalışabilirsin.</p>' +
      deviceList() +
      '<label class="check"><input type="checkbox" id="bPixelCanvas"' + (st.pixelCanvas ? ' checked' : '') + '> Pixel\'in portresi üzerinde çalış</label>' +
      (SERVER ? '<button type="button" class="btn quiet" id="bPro">Başka bir saat bağla</button>' : '') + '</section>';
    return '<section class="card pro"><div class="pro-mark"><img src="img/pixel-logo-kucuk.svg" alt="" width="56" height="56"><span class="lockic">' + ICON.lock + '</span></div>' +
      '<p class="label">PixelTime Saat ile</p><h2>Pixel\'in portresi</h2><p class="muted">Pixel\'in portresi üzerinde çalışmak ve Pixel\'i profil kuşu yapmak, PixelTime Saat sahiplerine özeldir.</p>' +
      '<button type="button" class="btn ghost" id="bPro">Saatini bağla</button></section>';
  }
  function deviceList() {
    var l = st.devices || []; if (!l.length) return '';
    return '<ul class="devs">' + l.map(function (d) {
      var seen = d.last_seen ? new Date(d.last_seen) : null;
      return '<li><b>' + esc(d.serial) + '</b><span>' + (seen ? 'Son bağlantı ' + seen.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) + ' ' + seen.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Henüz internete bağlanmadı') +
        ' · saatten ' + (d.blocks || 0) + ' kare (' + hours(d.blocks || 0) + ' saat)</span>' +
        '<button type="button" class="btn quiet small" data-release="' + esc(d.serial) + '">Saati bu hesaptan kaldır</button></li>';
    }).join('') + '</ul>';
  }
  /* Saati hesaptan kaldır: satış/hediye ya da başka hesaba bağlamak için. Kareler hesapta kalır. */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-release]'); if (!b || !sb) return;
    var serial = b.getAttribute('data-release');
    if (!confirm(serial + ' bu hesaptan kaldırılsın mı?\n\nSaatten gelen kareler hesabında kalır. Saat, kodu girilerek başka bir hesaba bağlanabilir.')) return;
    busy(b);
    sb.rpc('release_device', { p_serial: serial }).then(chk).then(refreshDevices).then(function () {
      st.pro = !!(st.devices && st.devices.length);
      if (!st.pro && st.profile && st.profile.bird === 'pixel') { st.profile.bird = 'muhabbet'; st.profileSynced = false; }
      save(); toast('Saat bu hesaptan kaldırıldı.', 'good'); render(); sync();
    }).catch(function (er) { toast(errText(er), 'bad'); render(); });
  });
  function proModal(preset) {
    var m = $('modal');
    m.innerHTML = '<div class="sheet form" role="dialog" aria-modal="true" aria-labelledby="mT"><button type="button" class="x" aria-label="Kapat">×</button><p class="label">PixelTime Saat</p><h2 id="mT">Saatini bağla</h2>' +
      '<p class="muted small">Kod, saatin kutusundaki kartta ve saatin ekranında (Ayarlar → Bağlan) yazar. Saat bağlanınca çalışmaların kendiliğinden buraya gelir; Pixel\'in portresi ve Pixel profil kuşu açılır.</p>' +
      '<div class="field"><label for="mCode">Kod</label><input type="text" id="mCode" autocapitalize="characters" class="code-in" maxlength="12" value="' + esc(preset || '') + '"></div>' +
      (TEST ? '<p class="hint">Test modunda kod: PIXEL</p>' : '') + '<button type="button" class="btn primary" id="mGo">Kodu doğrula</button></div>';
    m.hidden = false;
    var close = function () { m.hidden = true; m.innerHTML = ''; };
    m.querySelector('.x').addEventListener('click', close);
    m.onclick = function (e) { if (e.target === m) close(); };
    $('mGo').addEventListener('click', function () {
      var c = $('mCode').value.trim().toUpperCase();
      if (TEST && c === 'PIXEL') { st.pro = true; save(); close(); toast('Pixel açıldı.', 'good'); render(); return; }
      if (!SERVER) return toast('Saat bağlama, site sunucuya bağlanınca açılacak.', '', 5000);
      if (c.replace(/[^A-Z0-9]/g, '').length < 6) return toast('Kodu eksiksiz yaz.', 'bad');
      var btn = this; busy(btn);
      server().then(function () { return st.profileSynced ? null : pushProfile(); }).then(function () { return sb.rpc('claim_device', { p_code: c }); }).then(chk).then(function (r) {
        st.pro = true; st.pendingClaim = null; save(); close();
        toast(r.gift ? 'Saatin bağlandı. Hoş geldin hediyesi: ' + r.gift + ' kare açıldı!' : 'Saatin bağlandı (' + r.serial + '). Pixel açıldı.', 'good', 6000);
        pullBlocks().catch(function () {}).then(refreshDevices).catch(function () {}).then(render);
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = 'Kodu doğrula';
        var m = (e && e.message || '').toLowerCase();
        toast(/bulunamadi/.test(m) ? 'Bu kodla bir saat bulunamadı. Kodu kontrol et.' : /baska hesapta/.test(m) ? 'Bu saat başka bir hesaba bağlı.' : errText(e), 'bad', 5000);
      });
    });
  }
  function accountBlock() {
    if (!SERVER) return '<section class="card"><h2>Hesap</h2><p class="muted">Kayıtların şu an yalnızca bu cihazda tutuluyor. Site sunucuya bağlandığında e-posta ve şifreyle hesabını kaydedip başka cihazdan girebileceksin.</p></section>';
    return '<section class="card form"><h2>Hesap</h2><p class="muted">' +
      (st.email ? 'Hesabın <b>' + esc(st.email) + '</b> adresine bağlı. Başka cihazdan bu e-posta ve şifrenle girebilirsin.'
        : 'Hesabın şu an yalnızca bu cihazda. Telefonun değişirse ya da tarayıcı verileri silinirse kayıtların kaybolabilir.') +
      '</p>' + (st.email ? '<button type="button" class="btn ghost" id="bPw">' + (st.needPw ? 'Şifre belirle' : 'Şifreyi değiştir') + '</button>' : '<button type="button" class="btn primary" id="bBackup">Hesabını kaydet</button>') + '</section>';
  }
  /* ================= Giriş, kayıt, şifre =================
     Akış: herkes önce anonim hesapla başlar (kayıtlar kaybolmasın diye). "Hesabını kaydet" anonim hesaba
     e-posta + şifre bağlar. Doğrulama hem linkle hem 6 haneli kodla çalışır; iPhone'da ana ekrana eklenmiş
     uygulamada link Safari'de açıldığı için kod daha güvenli yoldur. */
  var AUTH_TITLES = { register: 'Hesabını kaydet', login: 'Giriş yap', forgot: 'Şifremi unuttum', code: 'Şifresiz giriş', password: 'Yeni şifre belirle' };
  function pwOk(a, b) {
    if (a.length < 8) { toast('Şifre en az 8 karakter olmalı.', 'bad'); return false; }
    if (b != null && a !== b) { toast('Şifreler aynı değil.', 'bad'); return false; }
    return true;
  }
  function authErr(e) {
    var m = ((e && (e.message || e.error_description || e.code)) || '').toLowerCase();
    if (/invalid login credentials/.test(m)) return 'E-posta ya da şifre yanlış.';
    if (/email not confirmed/.test(m)) return 'E-postan henüz doğrulanmamış. Gelen kutundaki kodu gir.';
    if (/expired|invalid.*(otp|token)|token.*(expired|invalid)|otp_expired/.test(m)) return 'Kod yanlış ya da süresi dolmuş. Yeni kod iste.';
    if (/already (been )?registered|already exists|email_exists/.test(m)) return 'Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.';
    if (/rate limit|too many|security purposes|over_email_send_rate_limit/.test(m)) return 'Çok sık denedin. Bir dakika bekleyip tekrar dene.';
    if (/signups not allowed|user not found|not found/.test(m)) return 'Bu e-postayla bir hesap bulunamadı.';
    if (/henuz dogrulanmadi/.test(m)) return 'E-postan henüz doğrulanmamış görünüyor. Maildeki linke tıkladığından emin ol.';
    if (/should be different|same_password/.test(m)) return 'Yeni şifre eskisinden farklı olmalı.';
    if (/weak|password should/.test(m)) return 'Şifre çok zayıf. Harf ve rakam karıştır, en az 8 karakter olsun.';
    return errText(e);
  }
  function codeField() {
    return '<div class="field"><label for="aCode">E-postana gelen kod</label><input type="text" id="aCode" class="code-in otp" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="______"><p class="hint">Mail gelmediyse spam/gereksiz klasörüne bak. Maildeki linke de tıklayabilirsin.</p></div>';
  }
  function pwFields(label, twice) {
    return '<div class="field"><label for="aPw">' + label + '</label><input type="password" id="aPw" autocomplete="new-password" minlength="8" placeholder="En az 8 karakter"></div>' +
      (twice ? '<div class="field"><label for="aPw2">Şifre tekrar</label><input type="password" id="aPw2" autocomplete="new-password" minlength="8"></div>' : '');
  }
  function authModal(kind, preset) {
    var m = $('modal'), email = preset || st.email || '';
    var close = function () { m.hidden = true; m.innerHTML = ''; };
    function shell(title, body, foot) {
      m.innerHTML = '<div class="sheet form auth" role="dialog" aria-modal="true" aria-labelledby="mT"><button type="button" class="x" aria-label="Kapat">×</button><h2 id="mT">' + title + '</h2>' + body + (foot ? '<p class="alt">' + foot + '</p>' : '') + '</div>';
      m.hidden = false;
      m.querySelector('.x').addEventListener('click', close);
      m.onclick = function (e) { if (e.target === m) close(); };
      Array.prototype.forEach.call(m.querySelectorAll('[data-go]'), function (a) { a.addEventListener('click', function (e) { e.preventDefault(); var em = $('aEmail'); authModal(a.getAttribute('data-go'), em ? em.value.trim() : email); }); });
      var f = m.querySelector('input'); if (f) setTimeout(function () { f.focus(); }, 50);
    }
    function emailField() { return '<div class="field"><label for="aEmail">E-posta</label><input type="email" id="aEmail" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="ornek@mail.com" value="' + esc(email) + '"></div>'; }
    function readEmail() { var v = ($('aEmail') ? $('aEmail').value : email).trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(v)) { toast('Geçerli bir e-posta yaz.', 'bad'); return null; } return v; }
    function run(btn, label, p) {
      var t = btn.textContent; busy(btn);
      return p.then(function (r) { if (r && r.error) throw r.error; return r; }).catch(function (e) { btn.disabled = false; btn.textContent = label || t; toast(authErr(e), 'bad', 5000); throw e; });
    }
    function bind(id, fn) { var b = $(id); b.addEventListener('click', function () { fn(b); }); m.querySelector('.sheet').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); b.click(); } }); }
    /* Bu cihazda başka bir hesap açıkken farklı e-postayla giriş: önce sor */
    function switchOk(em) {
      if (!user || (user.email && user.email.toLowerCase() === em)) return true;
      if (user.email) return confirm('Bu cihazda şu an ' + user.email + ' hesabı açık.\n\n' + em + ' hesabına geçilsin mi? ' + user.email + ' hesabının kareleri kaybolmaz, sonra tekrar girebilirsin.');
      var n = okBlocks().length;
      if (!st.profile && !n) return true;
      return confirm('Bu cihazdaki kayıtların (' + n + ' kare) henüz bir e-postaya bağlı değil. ' + em + ' hesabına geçersen bu kayıtlar o hesaba taşınmaz ve kaybolur.\n\nKorumak istiyorsan İptal de ve önce Profil → Hesabını kaydet ile yeni hesap aç. Yine de geçilsin mi?');
    }
    /* Geçmeden önce eski hesabın gönderilmemiş karelerini gönder */
    function flush() { return user && user.email ? sync() : Promise.resolve(); }
    function code() { return ($('aCode').value || '').replace(/\D/g, ''); }
    /* Doğrulama kodu adımı: ok(code) kodu sunucuda doğrular */
    /* Mailde link varsa linke tıklanır; kod varsa kod yazılır. linkDone: linke tıklandıktan sonra burada devam etmek için. */
    function codeStep(title, lead, verify, resend, linkDone) {
      shell(title, '<p class="muted small">' + lead + '</p>' +
        (linkDone ? '<button type="button" class="btn ghost" id="aLink">Linke tıkladım, kontrol et</button>' +
          '<details class="codebox"><summary>Mailde 6 haneli kod mu var?</summary>' + codeField() + '<button type="button" class="btn ghost" id="aGo">Kodu doğrula</button></details>'
          : codeField() + '<button type="button" class="btn primary" id="aGo">Doğrula</button>'),
        '<a href="#" id="aResend">Tekrar gönder</a>');
      if (linkDone) $('aLink').addEventListener('click', function () { run(this, 'Linke tıkladım, kontrol et', linkDone()).catch(function () {}); });
      bind('aGo', function (b) { var c = code(); if (c.length < 6) return toast('Kodu eksiksiz yaz.', 'bad'); run(b, 'Doğrula', verify(c)).catch(function () {}); });
      $('aResend').addEventListener('click', function (e) { e.preventDefault(); resend().then(function (r) { if (r && r.error) throw r.error; toast('Tekrar gönderildi.', 'good'); }).catch(function (er) { toast(authErr(er), 'bad'); }); });
    }
    /* E-posta doğrulandı: şifre daha önce (başka sekmede) belirlendiyse tekrar sorma */
    function afterVerify() {
      return sb.auth.getUser().then(function (r) {
        var u = r.data && r.data.user; user = u || user;
        st.email = u && u.email || st.email; save();
        if (u && u.user_metadata && u.user_metadata.pw_set) return signedIn('Hesabın kaydedildi. Artık her cihazdan girebilirsin.');
        authModal('password');
      });
    }
    function signedIn(msg) {
      return sb.auth.getUser().then(function (r) {
        user = r.data && r.data.user || user; ready = Promise.resolve(user);
        return adopt(user).then(function (switched) {
          st.email = user && user.email || st.email; st.needPw = false; save();
          return switched || st.profile ? false : restore();
        });
      }).then(function () { close(); toast(msg, 'good', 5000); render(); sync(); });
    }

    if (kind === 'register') {
      /* E-posta + şifre en başta alınır. Supabase şifreyi ancak e-posta doğrulanınca kabul ettiği için:
         mail gider → kullanıcı linke tıklar (hangi sekme/cihaz olursa olsun) → bu pencere doğrulamayı kendisi fark eder,
         şifreyi kaydeder ve biter. Şifre ikinci kez sorulmaz. */
      shell(AUTH_TITLES.register, '<p class="muted small">Kareler, portreler ve saatlerin bu hesaba bağlanır. Telefonun değişse bile e-posta ve şifrenle her cihazdan girersin.</p>' +
        emailField() + pwFields('Şifre', true) + '<button type="button" class="btn primary" id="aGo">Doğrulama maili gönder</button>',
        'Zaten hesabın var mı? <a href="#" data-go="login">Giriş yap</a>');
      bind('aGo', function (b) {
        var em = readEmail(); if (!em) return; var pw = $('aPw').value; if (!pwOk(pw, $('aPw2').value)) return;
        email = em; st.needPw = true; save();
        var finish = function () {
          return sb.auth.updateUser({ password: pw, data: { pw_set: true } }).then(function (r) { if (r.error) throw r.error; st.needPw = false; save(); return signedIn('Hesabın kaydedildi. Artık her cihazdan e-posta ve şifrenle girebilirsin.'); });
        };
        run(b, 'Doğrulama maili gönder', server().then(function () { return sb.auth.updateUser({ email: em }, { emailRedirectTo: location.origin + location.pathname }); })).then(function () {
          var poll = null, busyPoll = false;
          var check = function () {
            return sb.auth.getUser().then(function (r) {
              var u = r.data && r.data.user;
              if (!u || u.email !== em) throw new Error('henuz dogrulanmadi');
              if (poll) { clearInterval(poll); poll = null; }
              return finish();
            });
          };
          codeStep('Mailine bak', '<b>' + esc(em) + '</b> adresine bir doğrulama linki gönderdik. Linke tıkladığında bu ekran kendiliğinden tamamlanır, buraya dönmen yeterli.<span class="waiting" aria-live="polite">Doğrulama bekleniyor</span>',
            function (c) { return sb.auth.verifyOtp({ email: em, token: c, type: 'email_change' }).then(function (r) { if (r.error) throw r.error; if (poll) { clearInterval(poll); poll = null; } return finish(); }); },
            function () { return sb.auth.updateUser({ email: em }); },
            check);
          /* Her 4 saniyede bir: linke tıklandı mı? Pencere kapanınca durur. */
          poll = setInterval(function () {
            if (!$('aLink')) { clearInterval(poll); poll = null; return; }
            if (busyPoll) return; busyPoll = true;
            check().catch(function () {}).then(function () { busyPoll = false; });
          }, 4000);
        }).catch(function () {});
      });
    } else if (kind === 'login') {
      shell(AUTH_TITLES.login, emailField() + '<div class="field"><label for="aPw">Şifre</label><input type="password" id="aPw" autocomplete="current-password"></div>' +
        '<button type="button" class="btn primary" id="aGo">Giriş yap</button>',
        '<a href="#" data-go="forgot">Şifremi unuttum</a> · <a href="#" data-go="code">Şifresiz, mail linkiyle gir</a>');
      bind('aGo', function (b) {
        var em = readEmail(); if (!em) return; var pw = $('aPw').value; if (!pw) return toast('Şifreni yaz.', 'bad');
        if (!switchOk(em)) return;
        run(b, 'Giriş yap', client().then(flush).then(function () { return sb.auth.signInWithPassword({ email: em, password: pw }); }))
          .then(function () { return signedIn('Tekrar hoş geldin.'); }).catch(function () {});
      });
    } else if (kind === 'code') {
      shell(AUTH_TITLES.code, '<p class="muted small">E-postana tek kullanımlık bir giriş linki gönderelim, şifresiz gir.</p>' + emailField() + '<button type="button" class="btn primary" id="aGo">Linki gönder</button>',
        '<a href="#" data-go="login">Şifreyle giriş</a>');
      bind('aGo', function (b) {
        var em = readEmail(); if (!em) return; if (!switchOk(em)) return;
        var send = function () { return sb.auth.signInWithOtp({ email: em, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } }); };
        run(b, 'Linki gönder', client().then(flush).then(send)).then(function () {
          codeStep('Mailine bak', '<b>' + esc(em) + '</b> adresine bir giriş linki gönderdik. Linke tıklayınca açılan sayfada giriş yapmış olursun. Mailde kod varsa aşağıya yaz.',
            function (c) { return sb.auth.verifyOtp({ email: em, token: c, type: 'email' }).then(function (r) { if (r.error) throw r.error; return signedIn('Tekrar hoş geldin.'); }); }, send);
        }).catch(function () {});
      });
    } else if (kind === 'forgot') {
      shell(AUTH_TITLES.forgot, '<p class="muted small">E-postana bir link gönderelim. Linke tıklayınca yeni şifreni belirleyeceğin pencere açılır.</p>' + emailField() + '<button type="button" class="btn primary" id="aGo">Linki gönder</button>',
        '<a href="#" data-go="login">Girişe dön</a>');
      bind('aGo', function (b) {
        var em = readEmail(); if (!em) return; if (!switchOk(em)) return;
        var send = function () { return sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname }); };
        run(b, 'Linki gönder', client().then(flush).then(send)).then(function () {
          shell('Mailine bak', '<p class="muted small"><b>' + esc(em) + '</b> adresine bir link gönderdik. Linke tıkla, açılan sayfada yeni şifreni belirle.</p><details class="codebox"><summary>Mailde 6 haneli kod mu var?</summary>' + codeField() + pwFields('Yeni şifre', true) +
            '<button type="button" class="btn primary" id="aGo">Şifreyi değiştir</button></details>', '<a href="#" id="aResend">Linki tekrar gönder</a>');
          $('aResend').addEventListener('click', function (e) { e.preventDefault(); send().then(function (r) { if (r && r.error) throw r.error; toast('Tekrar gönderildi.', 'good'); }).catch(function (er) { toast(authErr(er), 'bad'); }); });
          bind('aGo', function (b2) {
            var c = code(), pw = $('aPw').value; if (c.length < 6) return toast('Kodu eksiksiz yaz.', 'bad'); if (!pwOk(pw, $('aPw2').value)) return;
            run(b2, 'Şifreyi değiştir', sb.auth.verifyOtp({ email: em, token: c, type: 'recovery' }).then(function (r) { if (r.error) throw r.error; return sb.auth.updateUser({ password: pw }); }))
              .then(function () { return signedIn('Şifren değişti, giriş yaptın.'); }).catch(function () {});
          });
        }).catch(function () {});
      });
    } else if (kind === 'password') {
      shell(st.needPw ? 'Son adım: şifreni belirle' : AUTH_TITLES.password, '<p class="muted small">' + (st.needPw ? 'E-postan doğrulandı' + (st.email ? ' (' + esc(st.email) + ')' : '') + '. Başka cihazdan girerken bu şifreyi kullanacaksın.' : (st.email ? esc(st.email) + ' hesabı için yeni şifre.' : '')) + '</p>' + pwFields(st.needPw ? 'Şifre' : 'Yeni şifre', true) + '<button type="button" class="btn primary" id="aGo">Kaydet</button>');
      bind('aGo', function (b) {
        var pw = $('aPw').value; if (!pwOk(pw, $('aPw2').value)) return;
        var firstTime = st.needPw;
        run(b, 'Kaydet', server().then(function () { return sb.auth.updateUser({ password: pw, data: { pw_set: true } }); })).then(function () {
          st.needPw = false; save(); close(); toast(firstTime ? 'Hesabın kaydedildi. Artık her cihazdan girebilirsin.' : 'Şifren kaydedildi.', 'good', 5000); render(); sync();
        }).catch(function () {});
      });
    }
  }
  /* Linkten dönüş: şifre sıfırlama linki ya da kayıt linki tıklandıysa şifre belirleme penceresini aç */
  function watchAuth() {
    if (!sb || watchAuth.on) return; watchAuth.on = true;
    sb.auth.onAuthStateChange(function (ev, session) {
      if (session && session.user) {
        user = session.user;
        if (st.uid && st.uid !== user.id) { var u = user; setTimeout(function () { ready = Promise.resolve(u); adopt(u).then(function () { sync(); }); }, 0); }
        else if (user.email && st.email !== user.email) { st.email = user.email; save(); }
      }
      if (ev === 'PASSWORD_RECOVERY') setTimeout(function () { authModal('password'); }, 300);
    });
  }

  /* ---------- Koleksiyon ---------- */
  function collectionItems(seed, count) {
    var order = revealFor(seed), out = [];
    for (var i = 0; i < count; i++) out.push({ no: i + 1, bird: order[i % order.length], seed: seed + ':' + (i + 1) });
    return out;
  }
  function figureHtml(it, clickable) {
    var b = bird(it.bird);
    return '<figure' + (clickable ? ' tabindex="0" role="button" data-no="' + it.no + '" aria-label="' + esc(b.name) + ' portresi, paylaş"' : '') + '><span class="ph" data-ph="' + b.id + '"><b>' + esc(b.name.charAt(0)) + '</b></span><figcaption><span class="no">No. ' + it.no + '</span><b>' + esc(b.name) + '</b><em>' + esc(b.latin) + '</em></figcaption></figure>';
  }
  function renderCollection() {
    var done = finishedCanvases(), items = collectionItems(st.seed, done), P = personal();
    $('view').innerHTML = head('Koleksiyon', done ? done + ' portre tamamlandı.' : 'Henüz tamamlanmış portre yok.', 'Her portre ' + CELLS + ' kareden oluşur. Tamamlananlar burada birikir; birine dokunup paylaşım kartını oluşturabilirsin. Kuşların sırası her hesapta farklıdır.') +
      '<section class="card"><div class="cardhead"><h2>Şu an açılan</h2><a class="btn ghost small" href="#/">Çalışmaya dön</a></div><p class="muted">Portre No. ' + st.canvasNo + ' · ' + P.opened + ' / ' + CELLS + ' kare · tamamlanınca türü açılır.</p><div class="meter"><i style="width:' + (P.opened / CELLS * 100) + '%"></i></div></section>' +
      (done ? '<section class="collection big" id="cGrid">' + items.slice().reverse().map(function (it) { return figureHtml(it, true); }).join('') + '</section>' : '');
    if (!done) return;
    var open = function (el) { var no = +el.getAttribute('data-no'); if (no) shareCanvas('collection', items[no - 1]); };
    $('cGrid').addEventListener('click', function (e) { var f = e.target.closest('figure'); if (f) open(f); });
    $('cGrid').addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('figure')) { e.preventDefault(); open(e.target); } });
  }

  /* ---------- Başka bir kullanıcının profili ---------- */
  function renderPublic(id) {
    var v = $('view');
    var paint = function (d) {
      if (!d) { v.innerHTML = head('Profil', 'Profil bulunamadı.') + '<a class="btn ghost" href="#/siralama">Sıralamaya dön</a>'; return; }
      if (d.private) { v.innerHTML = head('Profil', 'Bu profil gizli.', 'Kullanıcı profilini yalnızca kendisine açık tutuyor.') + '<a class="btn ghost" href="#/siralama">Sıralamaya dön</a>'; return; }
      var count = Math.floor((d.total || 0) / CELLS), items = d.seed ? collectionItems(d.seed, count) : [];
      v.innerHTML = '<header class="phead pubhead">' + av(d.bird, d.color, d.color2, 88) + '<div><p class="kicker">' + esc([d.exam, d.city, d.school].filter(Boolean).join(' · ') || 'PixelTime') + '</p><h1>' + esc(d.nickname) + '</h1></div></header>' +
        '<section class="card"><dl class="stats"><div><dt>Kare</dt><dd>' + (d.total || 0) + '</dd></div><div><dt>Saat</dt><dd>' + hours(d.total || 0) + '</dd></div><div><dt>Portre</dt><dd>' + count + '</dd></div></dl></section>' +
        '<h2 class="sect">Koleksiyon</h2>' + (items.length ? '<section class="collection big">' + items.slice().reverse().map(function (it) { return figureHtml(it, false); }).join('') + '</section>' : '<p class="muted">Henüz tamamlanmış portre yok.</p>');
    };
    if (id === 'ben' || (user && id === user.id)) {
      return paint({ nickname: st.profile.nickname, bird: st.profile.bird, color: st.profile.color, color2: st.profile.color2, exam: st.profile.exam, city: st.profile.city, school: st.profile.school, total: studyBlocks().length, seed: st.seed });
    }
    if (!SERVER) return paint(null);
    v.innerHTML = '<p class="muted">Yükleniyor…</p>';
    server().then(function () { return sb.rpc('public_profile', { p_id: id }).then(chk); }).then(paint)
      .catch(function (e) { console.warn(e); paint(null); });
  }

  /* ---------- Ayarlar ---------- */
  function renderSettings() {
    $('view').innerHTML = head('Hesap', 'Ayarlar') +
      '<div class="settings">' +
      '<section class="card form"><h2>Çalışma</h2>' +
      '<div class="field"><label for="sGoal">Günlük hedef</label><select id="sGoal">' + goalOptions() + '</select><p class="hint">Çalış sayfasındaki kutucuklar bu hedefe göre dolar.</p></div>' +
      '<label class="check"><input type="checkbox" id="sSound"' + (st.sound !== false ? ' checked' : '') + '> Kare açılınca ses ve titreşim</label></section>' +
      '<section class="card form"><h2>Gizlilik</h2>' +
      '<div class="field"><label for="sPublic">Profil görünürlüğü</label><select id="sPublic"><option value="1"' + (st.isPublic ? ' selected' : '') + '>Herkese açık</option><option value="0"' + (!st.isPublic ? ' selected' : '') + '>Gizli</option></select>' +
      '<p class="hint" id="sPubHint"></p></div></section>' +
      accountBlock() +
      '<section class="card"><h2>Oturum</h2><p class="muted">' + (SERVER && st.email ? 'Bu cihazdan çıkış yapınca aynı e-postayla tekrar girebilirsin.' : 'E-posta eklemeden çıkış yaparsan bu cihazdaki kayıtların silinir.') + '</p><button type="button" class="btn ghost danger" id="sOut">Çıkış yap</button></section>' +
      '</div>';
    var hint = function () { $('sPubHint').textContent = $('sPublic').value === '1' ? 'Diğer kullanıcılar sıralamadan profiline girip koleksiyonunu ve toplam saatini görebilir. Gerçek adın hiçbir yerde görünmez.' : 'Profiline kimse bakamaz. Sıralamada takma adın yerine "Gizli kullanıcı" yazar.'; };
    hint();
    $('sGoal').addEventListener('change', function () { st.goal = +this.value; save(); toast('Günlük hedef kaydedildi.', 'good'); });
    $('sSound').addEventListener('change', function () { st.sound = this.checked; save(); });
    $('sPublic').addEventListener('change', function () { st.isPublic = this.value === '1'; st.profileSynced = false; save(); hint(); if (SERVER) pushProfile().catch(function (e) { console.warn(e); }); toast('Gizlilik ayarı kaydedildi.', 'good'); });
    if ($('bBackup')) $('bBackup').addEventListener('click', function () { authModal('register'); });
    if ($('bPw')) $('bPw').addEventListener('click', function () { authModal('password'); });
    $('sOut').addEventListener('click', logout);
  }

  /* ---------- Yardım ---------- */
  function renderHelp() {
    var qa = [
      ['Kare nasıl açılır?', 'Pomodoro ya da kronometreyle kesintisiz geçen her 25 dakika bir kare açar. Bir portre ' + CELLS + ' kareden oluşur.'],
      ['Oturum neden bozuldu?', 'Oturum sürerken uygulamadan 2 saniyeden uzun çıkılırsa, ekran kapanırsa ya da uygulama kapanırsa o kare açılmaz. Kronometrede o ana kadar dolan kareler kaydedilir.'],
      ['Günde kaç kare açabilirim?', 'En fazla 28 kare, yani yaklaşık 12 saat. Günlük hedefini Ayarlar\'dan değiştirebilirsin.'],
      ['Hangi kuş çıkacak?', 'Portreler tamamlanana kadar gizlidir; yarıya gelince kategorisi görünür. Kuşların sırası her hesapta farklıdır.'],
      ['Ekip nasıl çalışır?', 'Ekip 2-10 kişidir. Üyelerin açtığı her kare, kişi sayısına göre büyüyen ortak ekip portresine de işlenir.'],
      ['Sıralama neye göre?', 'Seçtiğin dönemde açılan kare sayısına göre. Kişi, okul, şehir ve ekip olarak; sınava göre de filtrelenebilir.'],
      ['Profilimi kim görebilir?', 'Profilin herkese açıksa diğer kullanıcılar takma adını, kuşunu, toplam saatini ve koleksiyonunu görebilir. Ayarlar\'dan gizli yapabilirsin.'],
      ['Kayıtlarım nerede tutuluyor?', 'İnternetsizken bu cihazda tutulur, bağlanınca eşitlenir. E-posta eklersen başka cihazdan da girebilirsin.'],
      ['PixelTime Saat nedir?', 'Masaya koyulan, telefonsuz çalışmak için yapılmış bir çalışma saati. Sahipleri Pixel\'in portresi üzerinde çalışabilir ve Pixel\'i profil kuşu yapabilir.'],
      ['Paylaşımda hangi etiket?', 'Portre ve sezon kartlarını paylaşırken ' + TAG + ' etiketini kullan.']
    ];
    $('view').innerHTML = head('Yardım', 'Sık sorulanlar') + '<div class="faq">' + qa.map(function (x) { return '<details><summary>' + esc(x[0]) + '</summary><p>' + esc(x[1]) + '</p></details>'; }).join('') + '</div>' +
      '<p class="muted small" style="margin-top:24px">Cevabını bulamadığın bir şey olursa Instagram hesabımızdan yazabilirsin. Hesabımız yakında açılıyor.</p>';
  }

  /* ---------- Kayıttan sonra: Pixel'le tanışma (bir kez) ---------- */
  function pixelWelcome() {
    st.pixelSeen = true; save();
    var m = $('modal');
    m.innerHTML = '<div class="sheet welcome" role="dialog" aria-modal="true" aria-labelledby="mT">' +
      '<figure class="photo"><img src="img/pixel.jpg" alt="Pixel, gri muhabbet kuşu" width="1320" height="1500"></figure>' +
      '<div><p class="label">Hoş geldin</p><h2 id="mT">Önce Pixel\'le tanış.</h2>' +
      '<p>PixelTime, adını ve logosunu gri muhabbet kuşu Pixel\'den alıyor. Bu site onun anısına kuruldu.</p>' +
      '<p class="muted small">Pixel\'in portresi üzerinde çalışmak ve onu profil kuşun yapmak, PixelTime Saat sahiplerine özel.</p>' +
      '<button type="button" class="btn primary" id="mGo">Çalışmaya başla</button></div></div>';
    m.hidden = false;
    var close = function () { m.hidden = true; m.innerHTML = ''; };
    $('mGo').addEventListener('click', close);
  }

  /* ---------- Pixel'in anısına ---------- */
  function renderPixel() {
    $('view').innerHTML = '<article class="memorial">' +
      '<figure class="photo"><img src="img/pixel.jpg" alt="Pixel, gri muhabbet kuşu" width="1320" height="1500"></figure>' +
      '<div class="mtext"><p class="kicker">Pixel\'in anısına</p><h1>Pixel</h1><p class="latin">Melopsittacus undulatus</p>' +
      '<p>PixelTime adını gri muhabbet kuşu Pixel\'den alıyor. Logodaki kuş da o; bu fotoğraftan çizildi.</p>' +
      '<p>Burada çalışılan her saat, onun anısına.</p>' +
      '<a class="btn primary" href="#/">Çalışmaya dön</a></div></article>';
  }

  /* ================= Paylaşım görselleri ================= */
  var FS = '"Bitter",Georgia,serif', FU = '"IBM Plex Sans",system-ui,sans-serif', FM = '"IBM Plex Mono",ui-monospace,monospace';
  function loadImg(src) { return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  function baseCard(W, H, logo) {
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d');
    g.fillStyle = '#e8ece3'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#183522'; g.fillRect(0, 0, W, 24); g.fillRect(0, H - 24, W, 24);
    g.fillStyle = '#f4c521'; g.fillRect(0, 24, W, 6); g.fillRect(0, H - 30, W, 6);
    g.strokeStyle = '#183522'; g.lineWidth = 3; g.strokeRect(40, 60, W - 80, H - 120);
    g.beginPath(); g.arc(145, 143, 66, 0, 7); g.fillStyle = '#f4c521'; g.fill();
    if (logo) g.drawImage(logo, 100, 100, 90, 90 * logo.height / logo.width);
    g.fillStyle = '#17231b'; g.font = '600 64px ' + FS; g.textBaseline = 'alphabetic'; g.fillText('PixelTime', 220, 168);
    return { c: c, g: g };
  }
  function shareCanvas(kind, item) {
    var isTeam = kind === 'team', isCol = kind === 'collection', P = isCol ? { opened: CELLS, full: true, bird: item.bird } : personal(), t = st.team, s = st.teamState;
    var src = isCol ? document.createElement('canvas') : $(isTeam ? 'tcanvas' : 'pcanvas'); if (!src) return;
    if (isCol) {
      if (!birdImage(item.bird)) {
        if ((item.tries = (item.tries || 0) + 1) > 40) { toast('Kuşun fotoğrafı yüklenemedi. İnternet bağlantını kontrol et.', 'bad'); item.tries = 0; return; }
        if (item.tries === 1) toast('Kart hazırlanıyor…');
        setTimeout(function () { shareCanvas(kind, item); }, 200); return;
      }
      item.tries = 0;
      drawCanvas(src, N, CELLS, item.seed, item.bird);
    }
    var full = isTeam ? s.opened.length >= t.cells : P.full, bid = isTeam ? teamBird(t) : P.bird, b = bird(bid);
    var opened = isTeam ? Math.min(s.opened.length, t.cells) : P.opened, cells = isTeam ? t.cells : CELLS;
    loadImg('img/pixel-logo-kucuk.svg').then(function (logo) {
      var W = 1080, H = 1350, k = baseCard(W, H, logo), g = k.g;
      g.fillStyle = '#56655b'; g.font = '400 32px ' + FU; g.textAlign = 'right'; g.fillText('Sezon ' + SEASON, W - 90, 160); g.textAlign = 'left';
      g.fillStyle = '#ffffff'; g.fillRect(140, 250, 800, 800); g.strokeStyle = '#17231b'; g.lineWidth = 2; g.strokeRect(140, 250, 800, 800);
      g.drawImage(src, 170, 280, 740, 740);
      g.fillStyle = '#17231b'; g.font = '600 52px ' + FS;
      g.fillText(full ? b.name : (isTeam ? t.name : 'Portre No. ' + st.canvasNo), 140, 1130);
      if (isCol || (full && !isTeam)) { g.textAlign = 'right'; g.fillStyle = '#56655b'; g.font = '400 30px ' + FU; g.fillText('Portre No. ' + (isCol ? item.no : st.canvasNo), W - 90, 205); g.textAlign = 'left'; g.fillStyle = '#17231b'; g.font = '600 52px ' + FS; }
      g.font = 'italic 500 34px ' + FS; g.fillStyle = '#56655b';
      g.fillText(full ? b.latin : (isTeam ? 'Ekip portresi' : 'Gizli tür'), 140, 1180);
      g.textAlign = 'right'; g.font = '500 40px ' + FM; g.fillStyle = '#17231b'; g.fillText(opened + ' / ' + cells, 940, 1130);
      g.font = '400 30px ' + FU; g.fillStyle = '#56655b'; g.fillText(hours(opened) + ' saat odak', 940, 1180);
      g.textAlign = 'left'; g.fillStyle = '#2b7a3a'; g.font = '500 34px ' + FM; g.fillText(TAG, 90, H - 80);
      g.textAlign = 'right'; g.fillStyle = '#56655b'; g.font = '400 30px ' + FU; g.fillText(location.host + location.pathname.replace(/index\.html$/, ''), W - 90, H - 80);
      showImage(k.c, 'Tuvalini paylaş', 'pixeltime-portre.png', 'PixelTime\'da portremi açıyorum. ' + TAG);
    });
  }
  function seasonCard() {
    var p = st.profile; if (!p) return;
    var s = stats(), P = personal(), done = finishedCanvases();
    var items = collectionItems(st.seed, done);
    /* En fazla 9 kare: tamamlananların son 8'i (ya da 9'u) + sürüyorsa gizli portre */
    var showOpen = !P.full && P.opened > 0, slots = 9 - (showOpen ? 1 : 0);
    var extra = Math.max(0, items.length - slots);
    var tiles = items.slice(-slots);
    var src = null;
    if (!done) { src = document.createElement('canvas'); drawCanvas(src, N, P.opened, P.seed, P.bird); }
    var pics = tiles.map(function (it) { return photoUrls(it.bird, 330).then(function (l) { return loadFirst(l, true); }); });
    Promise.all([loadImg('img/pixel-logo-kucuk.svg'), photoUrls(p.bird, 500).then(function (l) { return loadFirst(l, true); })].concat(pics)).then(function (r) {
      var logo = r[0], pic = r[1], W = 1080, H = 1920, k = baseCard(W, H, logo), g = k.g;
      g.fillStyle = '#56655b'; g.font = '400 32px ' + FU; g.textAlign = 'right'; g.fillText('Sezon ' + SEASON + ' kartı', W - 90, 160); g.textAlign = 'left';
      var cx = 190, cy = 360, R = 100;
      var grd = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); grd.addColorStop(0, p.color); grd.addColorStop(1, p.color2 || p.color);
      g.beginPath(); g.arc(cx, cy, R + 10, 0, 7); g.fillStyle = grd; g.fill();
      g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip(); g.fillStyle = '#d3dbcc'; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      if (pic) { var sd = Math.min(pic.width, pic.height), pb = bird(p.bird); g.drawImage(pic, (pic.width - sd) * pb.fx, (pic.height - sd) * pb.fy, sd, sd, cx - R, cy - R, 2 * R, 2 * R); }
      g.restore();
      g.fillStyle = '#17231b'; g.font = '600 76px ' + FS; g.fillText(p.nickname, 330, 360);
      g.fillStyle = '#56655b'; g.font = '400 32px ' + FU; g.fillText([p.exam, p.city, p.school].filter(Boolean).join(' · ') || birdName(p.bird), 330, 412);
      var rows = [[s.total, 'kare'], [s.hours, 'saat odak'], [s.streak, 'gün üst üste'], [s.birds, 'portre']];
      g.strokeStyle = '#cbd4c4'; g.lineWidth = 2;
      rows.forEach(function (row, i) {
        var x = 90 + (i % 2) * 460, y = 500 + Math.floor(i / 2) * 175;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 420, y); g.stroke();
        g.fillStyle = '#17231b'; g.font = '500 80px ' + FM; g.fillText(String(row[0]), x, y + 92);
        g.fillStyle = '#56655b'; g.font = '400 30px ' + FU; g.fillText(row[1], x, y + 136);
      });

      var top = 900;
      if (!done) {
        /* Henüz biten portre yok: ilk portre, ne kadar açıldığıyla */
        g.fillStyle = '#17231b'; g.font = '700 40px ' + FS; g.fillText('İlk portrem yolda', 140, top + 10);
        g.fillStyle = '#ffffff'; g.fillRect(215, top + 50, 650, 650); g.strokeStyle = '#183522'; g.lineWidth = 2; g.strokeRect(215, top + 50, 650, 650);
        g.drawImage(src, 240, top + 75, 600, 600);
        g.fillStyle = '#56655b'; g.font = '400 32px ' + FU; g.textAlign = 'center';
        g.fillText('Gizli tür · ' + P.opened + ' / ' + CELLS + ' kare açıldı', W / 2, top + 760); g.textAlign = 'left';
      } else {
        g.fillStyle = '#17231b'; g.font = '700 40px ' + FS; g.fillText('Koleksiyonum', 140, top + 10);
        var n = tiles.length + (showOpen ? 1 : 0), cols = n <= 1 ? 1 : n <= 4 ? 2 : 3, rowsN = Math.ceil(n / cols), gapx = 28, capH = 58;
        var y0 = top + 56, avail = H - 150 - y0;   /* alttaki etiket satırına kadar */
        var size = Math.floor(Math.min(cols === 1 ? 520 : (W - 240 - (cols - 1) * gapx) / cols, (avail - rowsN * (capH + 14)) / rowsN));
        var gridW = cols * size + (cols - 1) * gapx, x0 = (W - gridW) / 2;
        var cellAt = function (i) { return { x: x0 + (i % cols) * (size + gapx), y: y0 + Math.floor(i / cols) * (size + capH + 14) }; };
        tiles.forEach(function (it, i) {
          var c = cellAt(i), b = bird(it.bird), im = r[2 + i];
          g.fillStyle = '#ffffff'; g.fillRect(c.x - 8, c.y - 8, size + 16, size + 16); g.strokeStyle = '#183522'; g.lineWidth = 2; g.strokeRect(c.x - 8, c.y - 8, size + 16, size + 16);
          g.fillStyle = '#d3dbcc'; g.fillRect(c.x, c.y, size, size);
          if (im) { var sd = Math.min(im.width, im.height); g.drawImage(im, (im.width - sd) * b.fx, (im.height - sd) * b.fy, sd, sd, c.x, c.y, size, size); }
          g.fillStyle = '#17231b'; g.font = '600 ' + (size < 260 ? 25 : 30) + 'px ' + FU; g.textAlign = 'center';
          g.fillText(b.name, c.x + size / 2, c.y + size + 44, size + 10); g.textAlign = 'left';
        });
        if (extra) {
          var c0 = cellAt(0); g.fillStyle = '#f4c521'; g.beginPath(); g.arc(c0.x + 4, c0.y + 4, 44, 0, 7); g.fill();
          g.fillStyle = '#17231b'; g.font = '700 30px ' + FU; g.textAlign = 'center'; g.fillText('+' + extra, c0.x + 4, c0.y + 15); g.textAlign = 'left';
        }
        if (showOpen) {
          var c = cellAt(tiles.length);
          g.fillStyle = '#183522'; g.fillRect(c.x - 8, c.y - 8, size + 16, size + 16);
          g.strokeStyle = '#f4c521'; g.lineWidth = 3; g.setLineDash([12, 10]); g.strokeRect(c.x + 6, c.y + 6, size - 12, size - 12); g.setLineDash([]);
          g.fillStyle = '#f4c521'; g.font = '700 ' + Math.round(size * 0.42) + 'px ' + FS; g.textAlign = 'center'; g.fillText('?', c.x + size / 2, c.y + size * 0.6);
          g.fillStyle = '#ffffff'; g.font = '500 ' + (size < 260 ? 24 : 30) + 'px ' + FM; g.fillText(P.opened + ' / ' + CELLS, c.x + size / 2, c.y + size * 0.85);
          g.fillStyle = '#17231b'; g.font = '600 ' + (size < 260 ? 25 : 30) + 'px ' + FU; g.fillText('Sıradaki', c.x + size / 2, c.y + size + 44); g.textAlign = 'left';
        }
      }
      g.fillStyle = '#2b7a3a'; g.font = '500 34px ' + FM; g.fillText(TAG, 90, H - 80);
      g.textAlign = 'right'; g.fillStyle = '#56655b'; g.font = '400 30px ' + FU; g.fillText(location.host + location.pathname.replace(/index\.html$/, ''), W - 90, H - 80);
      showImage(k.c, 'Sezon kartın', 'pixeltime-sezon-karti.png', 'PixelTime sezon kartım. ' + TAG);
    });
  }
  function showImage(c, title, file, text) {
    var url = c.toDataURL('image/png'), m = $('modal'); $('toast').className = 'toast';
    m.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="mT"><button type="button" class="x" aria-label="Kapat">×</button><h2 id="mT">' + title + '</h2>' +
      '<img class="shot" src="' + url + '" alt="' + title + '"><p class="hint">Paylaşırken <b>' + TAG + '</b> etiketini kullan.</p>' +
      '<div class="two"><button type="button" class="btn primary" id="mShare">Paylaş</button><a class="btn ghost" download="' + file + '" href="' + url + '">İndir</a></div></div>';
    m.hidden = false;
    var close = function () { m.hidden = true; m.innerHTML = ''; };
    m.querySelector('.x').addEventListener('click', close);
    m.onclick = function (e) { if (e.target === m) close(); };
    $('mShare').addEventListener('click', function () {
      c.toBlob(function (blob) {
        var f = new File([blob], file, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: 'PixelTime', text: text }).catch(function () {});
        else { var a = document.createElement('a'); a.href = url; a.download = file; a.click(); copy(text); toast('Görsel indirildi, paylaşım metni kopyalandı.', 'good'); }
      });
    });
  }

  /* ================= Küçük yardımcılar ================= */
  function go(h) { if (location.hash === h || (h === '#/' && !location.hash)) render(); else location.hash = h; }
  function busy(btn) { btn.disabled = true; btn.textContent = 'Bekle…'; }
  function copy(t) { try { navigator.clipboard.writeText(t); } catch (e) {} }
  function errText(e) {
    var m = (e && (e.message || e.error_description)) || '';
    var map = { 'zaten bir ekiptesin': 'Zaten bir ekiptesin.', 'ekip bulunamadi': 'Bu kodla bir ekip bulunamadı. Kodu kontrol et.', 'ekip dolu': 'Bu ekip dolu.', 'profil yok': 'Önce profilini kaydet.', 'giris gerekli': 'Bağlantı kurulamadı. Tekrar dene.', 'ekip 2-10 kisi olmali': 'Ekip 2 ile 10 kişi arasında olmalı.', 'rate limit': 'Çok sık denedin. Biraz bekleyip tekrar dene.' };
    for (var k in map) if (m.toLowerCase().indexOf(k) >= 0) return map[k];
    if (!navigator.onLine) return 'İnternet yok. Bağlanınca tekrar dene.';
    return 'Bir sorun oldu. Tekrar dene.';
  }
  function setTest(on) { try { localStorage.setItem('pt_test', on ? '1' : '0'); } catch (x) {} location.href = location.pathname; }

  /* ================= Başlat ================= */
  var q = location.search.match(/[?&]ekip=([A-Za-z0-9]{6})/);
  if (q) { st.pendingJoin = q[1].toUpperCase(); save(); if (!st.team) location.hash = '#/ekip'; }
  /* Saatin ekranındaki / kutusundaki QR: ?saat=KOD → profil varsa bağlama penceresi kod dolu açılır */
  var qs = location.search.match(/[?&]saat=([A-Za-z0-9-]{6,12})/);
  if (qs) {
    st.pendingClaim = qs[1].toUpperCase(); save();
    history.replaceState(null, '', location.pathname + location.hash);
    if (st.profile && SERVER) setTimeout(function () { proModal(st.pendingClaim); }, 600);
  }
  if (TEST) {
    var tb = $('testbar'); tb.hidden = false;
    tb.innerHTML = '<span><b>Test modu</b> · kronometrede her saniye 1 kare · tuval 16 kare<span class="long"> · kayıtlar gerçek hesaptan ayrı</span></span><button type="button" id="tbOff">Kapat</button>';
    $('tbOff').addEventListener('click', function () { setTest(false); });
  }
  (function () {   /* logoya 5 kez dokun: test modu aç/kapat */
    var n = 0, t = 0, el = document.querySelector('.brand');
    el.addEventListener('click', function (e) {
      var now = Date.now(); n = now - t < 800 ? n + 1 : 1; t = now;
      if (n >= 3) e.preventDefault();
      if (n >= 5) { toast(TEST ? 'Test modu kapanıyor' : 'Test modu açılıyor'); setTimeout(function () { setTest(!TEST); }, 600); }
    });
  })();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0 && !TEST) navigator.serviceWorker.register('sw.js').catch(function () {});
  birdImage(personal().bird);
  render();
  if (SERVER) {
    var fromLink = /[?&]code=/.test(location.search) || !!AUTH_HASH;
    if (fromLink || (!st.profile)) server(true).then(function (u) {
      if (AUTH_HASH) {
        history.replaceState(null, '', location.pathname + '#/');
        if (/error/.test(AUTH_HASH) && !u) { toast('Bu linkin süresi dolmuş ya da daha önce kullanılmış. Yeniden iste.', 'bad', 6000); return; }
        if (u && u.email) { st.email = u.email; save(); }
        if (AUTH_TYPE === 'recovery') setTimeout(function () { authModal('password'); }, 300);
        else if (AUTH_TYPE === 'email_change' || AUTH_TYPE === 'signup') toast('E-postan doğrulandı. Kaydı başlattığın ekrana dönebilirsin, orada kendiliğinden tamamlanır.', 'good', 8000);
        else if (u && u.email) toast('E-postan doğrulandı.', 'good');
        render();
      }
      if (!u) return;
      if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
      return (st.profile ? Promise.resolve(false) : restore()).then(function (ok) { if (ok) { toast('Tekrar hoş geldin, ' + st.profile.nickname + '.', 'good'); render(); } });
    }).catch(function (e) { console.warn(e); });
    if (st.profile) sync();
  }
})();

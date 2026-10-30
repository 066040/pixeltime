/* PixelTime — uygulama */
(function () {
  'use strict';

  /* ================= Ayarlar ================= */
  var CFG = window.PT_CONFIG || {};
  var BIRDS = window.PT_BIRDS, DATA = window.PT_DATA;
  var TEST = /[?&]test\b/.test(location.search) || (function () { try { return localStorage.getItem('pt_test') === '1'; } catch (e) { return false; } })();
  var BLOCK_MS = TEST ? 1e3 : 25 * 60e3;          // 1 kare = 25 dk odak
  var BREAK_MS = TEST ? 2e3 : 5 * 60e3;
  var LONG_BREAK_MS = TEST ? 3e3 : 15 * 60e3;     // her 4 pomodoroda bir
  var LEAVE_GRACE_MS = 2000;
  var DAILY_MAX = TEST ? 9999 : 28;               // günde en fazla 28 kare (~12 saat)
  var N = TEST ? 4 : 16, CELLS = N * N;           // kişisel tuval
  var KEY = TEST ? 'pixeltime_test' : 'pixeltime_v2';
  var SERVER = !TEST && !!(CFG.supabaseUrl && CFG.supabaseKey);
  var SUPA_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var SEASON = 1;
  /* Her biten tuvalden sonra sıradaki kuş açılır. İlki her zaman Pixel. */
  var REVEAL = ['pixel', 'kanarya', 'ara-kirmizi', 'baykus', 'kolibri', 'flamingo', 'tukan', 'yalicapkini', 'kakadu', 'tavus',
    'muhabbet-mavi', 'kartal', 'penguen', 'ibibik', 'sultan', 'kardinal', 'peceli-baykus', 'lori', 'arikusu', 'kugu',
    'mavi-alakarga', 'deniz-papagani', 'sumbul-ara', 'horoz', 'kizilgerdan', 'gunes-konuru', 'balikcil', 'saksagan', 'kirlangic', 'yesilbas',
    'kelaynak', 'mandarin', 'kel-kartal', 'gouldian', 'ketzal', 'altin-sulun', 'kakapo', 'mavi-bastankara', 'tacli-turna', 'pabuc-gaga',
    'kizil-ibis', 'lapland-baykus', 'iskender', 'sariasma', 'gokkuzgun', 'kral-penguen', 'cennet-kusu', 'gokdogan', 'siyah-kugu', 'moluk-kakadu',
    'ipekkuyruk', 'kukumav', 'gergedan-kusu', 'sumsukkusu', 'peri-citkusu', 'harpi', 'kizilkuyruk', 'kara-kakadu', 'tepeli-pelikan', 'devekusu'];
  var GOALS = [4, 6, 8, 10, 12, 16];

  /* ================= Kayıt ================= */
  function fresh() {
    return { seed: rnd(), profile: null, profileSynced: false, blocks: [], canvasNo: 1, active: null, goal: 8,
      fails: 0, pomStreak: 0, breakDue: false, mode: 'pomodoro', team: null, teamState: null, pendingJoin: null, email: null };
  }
  var st;
  try { st = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { st = fresh(); }
  var def = fresh(); for (var k in def) if (!(k in st)) st[k] = def[k];
  if (st.profile && !BIRDS.get(st.profile.bird)) st.profile.bird = 'muhabbet-mavi';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  /* ================= Yardımcılar ================= */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rnd() { return Math.random().toString(36).slice(2, 10); }
  function uuid() { return (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + rnd() + rnd()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mmss(ms) { ms = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(ms / 60) + ':' + pad(ms % 60); }
  function hms(ms) { var s = Math.floor(Math.max(0, ms) / 1000), h = Math.floor(s / 3600); return (h ? h + ':' + pad(Math.floor(s % 3600 / 60)) : Math.floor(s / 60)) + ':' + pad(s % 60); }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function okBlocks() { return st.blocks.filter(function (b) { return !b.rejected; }); }
  function todayCount() { var t = dayKey(Date.now()); return okBlocks().filter(function (b) { return dayKey(b.started_at) === t; }).length; }
  function hours(n) { return (n * 25 / 60).toFixed(1).replace('.', ',').replace(',0', ''); }
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
  function av(id, color, size) { return '<span class="av" data-ph="' + esc(id) + '" style="--ring:' + esc(color || '#ffffff') + (size ? ';width:' + size + 'px;height:' + size + 'px' : '') + '">' + BIRDS.svg(id, { branch: false }) + '</span>'; }

  /* ================= Gerçek kuş fotoğrafları (Wikipedia) ================= */
  var PHK = 'pt_photos_v1', phc = {};
  try { phc = JSON.parse(localStorage.getItem(PHK)) || {}; } catch (e) {}
  var phWait = {};
  function photo(id, w) {
    w = w || 400;
    if (id === 'pixel') return Promise.resolve('img/pixel.jpg');
    var t = BIRDS.wiki[id]; if (!t) return Promise.resolve(null);
    var sized = function (u) { return u ? u.replace(/\/(\d+)px-/, '/' + w + 'px-') : null; };
    if (t in phc) return Promise.resolve(sized(phc[t]));
    if (!phWait[t]) phWait[t] = fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(t))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { var u = j && j.thumbnail && j.thumbnail.source || null; phc[t] = u; try { localStorage.setItem(PHK, JSON.stringify(phc)); } catch (e) {} return u; })
      .catch(function () { delete phWait[t]; return null; });
    return phWait[t].then(sized);
  }
  function hydrate(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-ph]'), function (el) {
      var id = el.getAttribute('data-ph'); el.removeAttribute('data-ph');
      if (lazyIO && el.closest('.birds')) { el.setAttribute('data-lz', id); lazyIO.observe(el); return; }
      load(el, id);
    });
  }
  var lazyIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (!en.isIntersecting) return;
      lazyIO.unobserve(en.target); load(en.target, en.target.getAttribute('data-lz'));
    });
  }, { rootMargin: '200px' }) : null;
  function load(el, id) {
    photo(id).then(function (u) {
      if (!u) return;
      var im = new Image(); im.alt = birdName(id); im.decoding = 'async';
      im.onload = function () { el.innerHTML = ''; el.appendChild(im); };
      im.src = u;
    });
  }
  new MutationObserver(function () { hydrate(document.body); }).observe(document.body, { childList: true, subtree: true });
  function trLow(s) { return String(s).replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase(); }
  function birdName(id) { var b = BIRDS.get(id); return b ? b.name : ''; }

  /* ================= İkonlar ================= */
  var ICON = {
    calis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
    ekip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.2 4.4 1.8 5 4.9"/></svg>',
    siralama: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 21V12h4v9M10 21V5h4v16M16 21v-6h4v6"/></svg>',
    profil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 4c-4 0-7 3-7 7v2l-3 3h6"/><path d="M14 4c3 0 6 2.5 6 6.5 0 5-4 9.5-9 9.5"/><circle cx="14.5" cy="9" r="1" fill="currentColor"/></svg>'
  };
  var TABS = [['calis', '#/', 'Çalış'], ['ekip', '#/ekip', 'Ekibim'], ['siralama', '#/siralama', 'Sıralama'], ['profil', '#/profil', 'Profilim']];
    $('tabs').innerHTML = $('bnav').innerHTML = TABS.map(function (t) { return '<a href="' + t[1] + '" data-r="' + t[0] + '">' + ICON[t[0]] + '<span>' + t[2] + '</span></a>'; }).join('');

  /* ================= Gökyüzü: günlük hedefe göre geceden şafağa ================= */
  function mix(a, b, t) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    var r = Math.round((x >> 16) + ((y >> 16) - (x >> 16)) * t), g = Math.round(((x >> 8) & 255) + (((y >> 8) & 255) - ((x >> 8) & 255)) * t), bl = Math.round((x & 255) + ((y & 255) - (x & 255)) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }
  function paintSky() { /* ferah tasarımda arka plan sabit */ }

  /* ================= Kuş resimleri ve tuval ================= */
  var imgs = {}, fullCache = {};
  function birdImage(id) {
    if (imgs[id]) return imgs[id].ready ? imgs[id].img : null;
    var rec = imgs[id] = { img: null, ready: false };
    function useSvg() { var im = new Image(); im.onload = function () { rec.img = im; rec.ready = true; fullCache = {}; drawAll(); }; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BIRDS.svg(id, { scene: true, size: 800 })); }
    photo(id, 800).then(function (u) {
      if (!u) return useSvg();
      var im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = function () { rec.img = im; rec.ready = true; fullCache = {}; drawAll(); };
      im.onerror = useSvg; im.src = u;
    });
    return null;
  }
  function fullImage(px, id) {
    var key = id + ':' + px; if (fullCache[key]) return fullCache[key];
    var im = birdImage(id); if (!im) return null;
    var c = document.createElement('canvas'); c.width = c.height = px;
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, side = Math.min(iw, ih);
    c.getContext('2d').drawImage(im, (iw - side) / 2, (ih - side) / 2, side, side, 0, 0, px, px);
    return (fullCache[key] = c);
  }
  var pulse = 0, pulseIdx = -1;
  /* side: kenar kare sayısı · opened: açılan kare · seed: açılış sırası · owners: kare sahibi renkleri */
  function drawCanvas(cv, side, opened, seed, birdId, owners, highlight) {
    if (!cv) return;
    var cell = Math.max(8, Math.floor(760 / side)), px = cell * side;
    if (cv.width !== px) { cv.width = cv.height = px; }
    var g = cv.getContext('2d'), img = fullImage(px, birdId), order = shuffled(side * side, seed);
    var gap = side > 24 ? 1 : side > 8 ? 2.5 : 6, rad = side > 24 ? 1 : side > 8 ? 4 : 14;
    g.clearRect(0, 0, px, px);
    var shown = {};
    for (var i = 0; i < Math.min(opened, order.length); i++) shown[order[i]] = i + 1;
    for (var p = 0; p < side * side; p++) {
      var x = (p % side) * cell, y = Math.floor(p / side) * cell;
      if (shown[p]) {
        if (img) g.drawImage(img, x, y, cell, cell, x, y, cell, cell);
        else { g.fillStyle = '#cfd6e8'; g.fillRect(x, y, cell, cell); }
        var col = owners && owners[shown[p] - 1];
        if (col && cell >= 10) { g.strokeStyle = col; g.lineWidth = Math.max(1, cell / 10); g.strokeRect(x + g.lineWidth / 2, y + g.lineWidth / 2, cell - g.lineWidth, cell - g.lineWidth); }
      } else {
        g.fillStyle = 'rgba(255,255,255,0.07)';
        rr(g, x + gap / 2, y + gap / 2, cell - gap, cell - gap, rad); g.fill();
      }
    }
    if (highlight != null && highlight >= 0 && highlight < order.length && pulse > 0) {
      var hp = order[highlight], hx = (hp % side) * cell, hy = Math.floor(hp / side) * cell;
      g.strokeStyle = 'rgba(255,211,110,' + pulse + ')'; g.lineWidth = Math.max(4, cell / 7);
      g.strokeRect(hx + g.lineWidth / 2, hy + g.lineWidth / 2, cell - g.lineWidth, cell - g.lineWidth);
    }
    cv._meta = { side: side, order: order, opened: opened };
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function flash(idx) { pulseIdx = idx; pulse = 1; (function step() { pulse -= 0.02; drawAll(); if (pulse > 0) requestAnimationFrame(step); })(); }

  function personal() {
    var n = okBlocks().length, base = (st.canvasNo - 1) * CELLS, opened = Math.max(0, Math.min(CELLS, n - base));
    return { opened: opened, full: opened >= CELLS, seed: st.seed + ':' + st.canvasNo, bird: REVEAL[(st.canvasNo - 1) % REVEAL.length] };
  }
  function finishedCanvases() { return Math.floor(okBlocks().length / CELLS); }
  function drawAll() {
    var pc = $('pcanvas');
    if (pc) { var P = personal(); drawCanvas(pc, N, P.opened, P.seed, P.bird, null, pulseIdx); }
    var tc = $('tcanvas');
    if (tc && st.team && st.teamState) drawTeam(tc);
  }

  /* ================= Ekranı açık tut ================= */
  var lock = null;
  function wake() { if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {}); }
  function unwake() { if (lock) { lock.release().catch(function () {}); lock = null; } }

  /* ================= Zamanlayıcı ================= */
  function canWork() {
    if (!st.profile) { location.hash = '#/profil'; return false; }
    if (todayCount() >= DAILY_MAX) { toast('Bugün 12 saat çalıştın, sınıra ulaştın. Yarın devam!'); return false; }
    return true;
  }
  function startWork() {
    if (st.active || !canWork()) return;
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
    var P = personal();
    if (before < st.goal && todayCount() >= st.goal) setTimeout(function () { toast('Günlük hedefine ulaştın, harikasın!', 'good', 5000); }, 1600);
    paintSky();
    return P;
  }
  function celebrate(P, extra) {
    if (P.full) toast(birdName(P.bird) + ' ortaya çıktı! Koleksiyonuna eklendi.', 'good', 5000);
    else toast('Bir kare açıldı: ' + P.opened + '/' + CELLS + (extra || ''), 'good');
    ding();
  }
  function completeWork() {
    var a = st.active; st.active = null; st.pomStreak++; st.breakDue = true;
    var P = addBlock(a.start, a.end, 'pomodoro');
    unwake(); renderTimer(); renderMe(); celebrate(P, '. Mola zamanı.'); sync();
  }
  function stopWatch(reason) {
    var a = st.active; if (!a || a.kind !== 'watch') return;
    st.active = null; save(); unwake(); renderTimer(); renderMe();
    var got = a.credited;
    if (reason) toast((got ? got + ' kare kaydedildi ama ' : '') + 'Pixel kaçtı! ' + reason, 'bad', 5000);
    else toast(got ? 'Bitti. Bu oturumda ' + got + ' kare açtın.' : 'Bitti. 25 dakika dolmadığı için kare açılmadı.', got ? 'good' : '', 5000);
  }
  function fail(reason) {
    var a = st.active; if (!a) return;
    if (a.kind === 'watch') return stopWatch(reason);
    st.active = null;
    if (a.kind === 'work') { st.fails++; st.pomStreak = 0; }
    save(); unwake(); renderTimer();
    if (a.kind === 'work') toast('Pixel kaçtı! ' + reason, 'bad', 5000);
  }
  function giveUp() {
    var a = st.active; if (!a) return;
    if (a.kind === 'break') { st.active = null; save(); unwake(); renderTimer(); return; }
    if (a.kind === 'watch') return stopWatch(null);
    if (!confirm('Yarım kalan pomodoro kare açmaz. Bırakmak istiyor musun?')) return;
    fail('Pomodoro yarıda bırakıldı.');
  }
  function tick() {
    var a = st.active; if (!a || document.hidden) return;
    var now = Date.now();
    if (a.kind === 'work' && now >= a.end) return completeWork();
    if (a.kind === 'break' && now >= a.end) { st.active = null; save(); unwake(); renderTimer(); toast('Mola bitti. Hazırsan devam!'); ding(); return; }
    if (a.kind === 'watch') {
      var k = Math.floor((now - a.start) / BLOCK_MS);
      while (a.credited < k) {
        if (todayCount() >= DAILY_MAX) { stopWatch(null); toast('Bugün 12 saat çalıştın, sınıra ulaştın. Yarın devam!'); return; }
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
    else if (a.leftAt && Date.now() - a.leftAt > LEAVE_GRACE_MS) fail('Çalışırken uygulamadan çıkıldı.');
    else { a.leftAt = null; save(); wake(); tick(); }
  });
  (function recover() {
    var a = st.active; if (!a) return;
    st.active = null;
    if (a.kind === 'work') { st.fails++; st.pomStreak = 0; setTimeout(function () { toast('Pixel kaçtı! Çalışırken uygulama kapandı.', 'bad', 5000); }, 400); }
    if (a.kind === 'watch') {
      var until = Math.min(a.leftAt || a.beat, a.beat), k = Math.floor((until - a.start) / BLOCK_MS);
      while (a.credited < k) { var s = a.start + a.credited * BLOCK_MS; a.credited++; addBlock(s, s + BLOCK_MS, 'kronometre'); }
      setTimeout(function () { toast('Kronometre durdu: uygulama kapandı.' + (a.credited ? ' ' + a.credited + ' kare kaydedildi.' : ''), 'bad', 5000); }, 400);
    }
    save();
  })();

  var actx = null;
  function ding() {
    try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); } catch (e) {}
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      [[0, 784], [0.14, 988], [0.28, 1319]].forEach(function (n) {
        var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + n[0];
        o.type = 'sine'; o.frequency.value = n[1];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.4);
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
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
      return sb;
    });
  }
  function server(noAnon) {
    if (!SERVER) return Promise.reject(new Error('yerel'));
    if (ready) return ready;
    ready = client().then(function () { return sb.auth.getSession(); }).then(function (r) {
      user = r.data && r.data.session ? r.data.session.user : null;
      if (user) return user;
      if (noAnon) { ready = null; return null; }
      return sb.auth.signInAnonymously().then(function (r2) { if (r2.error) throw r2.error; user = r2.data.user; return user; });
    }).catch(function (e) { ready = null; throw e; });
    return ready;
  }
  function chk(r) { if (r.error) throw r.error; return r.data; }
  function pushProfile() {
    if (!st.profile) return Promise.resolve();
    return server().then(function () {
      var p = st.profile;
      return sb.from('profiles').upsert({ id: user.id, nickname: p.nickname, bird: p.bird, color: p.color,
        exam: p.exam || null, city: p.city || null, school: p.school || null }).then(chk);
    }).then(function () { st.profileSynced = true; save(); });
  }
  /* Başka cihazdan e-postayla girildiyse profili ve kareleri sunucudan geri getir */
  function restore() {
    if (!user) return Promise.resolve(false);
    return sb.from('profiles').select('nickname,bird,color,exam,city,school').eq('id', user.id).maybeSingle().then(chk).then(function (p) {
      if (!p) return false;
      st.profile = { nickname: p.nickname, bird: BIRDS.get(p.bird) ? p.bird : 'muhabbet-mavi', color: p.color, exam: p.exam || '', city: p.city || '', school: p.school || '' };
      st.profileSynced = true; st.email = user.email || st.email;
      return sb.from('blocks').select('client_id,started_at,ended_at,mode').order('started_at').limit(10000).then(chk).then(function (rows) {
        var have = {}; st.blocks.forEach(function (b) { have[b.client_id] = 1; });
        (rows || []).forEach(function (r) { if (!have[r.client_id]) st.blocks.push({ client_id: r.client_id, started_at: r.started_at, ended_at: r.ended_at, mode: r.mode, synced: true }); });
        st.blocks.sort(function (a, b) { return a.started_at < b.started_at ? -1 : 1; });
        st.canvasNo = Math.max(st.canvasNo, finishedCanvases() + 1);
        save(); return true;
      });
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
    }).then(function () { return refreshTeam(); })
      .catch(function (e) { console.warn('senkron', e); })
      .then(function () { syncing = false; renderSync(); });
  }
  window.addEventListener('online', sync);
  window.addEventListener('offline', renderSync);
  function renderSync() {
    var el = $('sync'), wait = st.blocks.filter(function (b) { return !b.synced; }).length;
    if (TEST) { el.textContent = 'Test modu'; el.className = 'sync off'; return; }
    if (!SERVER) { el.textContent = 'Bu cihazda kayıtlı'; el.className = 'sync'; return; }
    if (!navigator.onLine) { el.textContent = 'Çevrimdışı, ' + wait + ' kare bekliyor'; el.className = 'sync off'; return; }
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
    drawCanvas(cv, t.side, Math.min(s.opened.length, t.cells), 'team:' + t.id, 'pixel', s.opened.map(function (id) { return col[id] || '#999999'; }));
  }

  /* ================= Sayfalar ================= */
  function route() { var h = location.hash.replace(/^#\/?/, '').split('?')[0]; return h || 'calis'; }
  function render() {
    var r = route();
    if (!st.profile && r !== 'pixel') r = 'profil';
    if (st.active && st.active.kind !== 'break' && r !== 'calis') { r = 'calis'; if (location.hash !== '#/') history.replaceState(null, '', '#/'); }
    ['tabs', 'bnav'].forEach(function (id) { Array.prototype.forEach.call($(id).children, function (a) { a.classList.toggle('on', a.getAttribute('data-r') === r); a.setAttribute('aria-current', a.getAttribute('data-r') === r ? 'page' : 'false'); }); });
    ({ calis: renderWork, ekip: renderTeam, siralama: renderBoard, profil: renderProfile, pixel: renderPixel }[r] || renderWork)();
    renderMe(); renderSync(); paintSky(); window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);
  function renderMe() {
    var p = st.profile, el = $('me');
    el.hidden = !p; if (!p) return;
    el.innerHTML = '<b>' + esc(p.nickname) + '</b>' + av(p.bird, p.color);
    el.title = 'Bugün ' + todayCount() + ' kare';
  }

  /* ---------- Çalış ---------- */
  function greet() {
    var h = new Date().getHours(), n = todayCount(), g = st.goal;
    var name = st.profile ? st.profile.nickname : '';
    if (n >= g) return 'Bugünkü hedefin tamam, ' + name + '.';
    if (n === 0) return (h < 6 ? 'Gece kuşu musun, ' : h < 12 ? 'Günaydın, ' : h < 18 ? 'Merhaba, ' : 'İyi akşamlar, ') + name + '.';
    return 'Hedefine ' + (g - n) + ' kare kaldı.';
  }
  function renderWork() {
    var P = personal();
    $('view').innerHTML =
      '<h1 class="h1" id="greet">' + esc(greet()) + '</h1>' +
      '<div class="work" style="margin-top:16px">' +
      '<section>' +
      '<div class="window"><canvas id="pcanvas" class="pt" aria-label="Tuval: ' + esc(birdName(P.bird)) + '"></canvas>' +
      '<div class="windowbar"><strong id="pname"></strong><span id="pprog"></span></div><div class="meter"><i id="pbar"></i></div><div id="nextwrap"></div></div>' +
      '</section>' +
      '<section class="sheet" id="sheet">' +
      '<div class="seg" id="seg" role="tablist"><button data-m="pomodoro" role="tab">Pomodoro</button><button data-m="kronometre" role="tab">Kronometre</button></div>' +
      '<div class="clock" id="clock" aria-live="off"></div><div class="sub" id="sub"></div>' +
      '<button id="bStart" class="btn go"></button>' +
      '<button id="bBreak" class="btn soft" hidden></button>' +
      '<button id="bStop" class="btn soft" hidden></button>' +
      '<p id="rule" class="rule" hidden>Uygulamadan çıkarsan ya da ekranı kapatırsan Pixel kaçar ve kare açılmaz. Telefonu ekranı açık bırak.</p>' +
      '<div class="today"><div>Bugün <b id="sToday">0</b> / ' + st.goal + ' kare</div><div class="dots" id="dots"></div></div>' +
      (TEST ? '<span class="testtag">Test modu: 1 saniye 25 dakika sayılıyor</span>' : '') +
      '</section></div>' +
      (st.team ? '<div class="section"><div class="panel small">Açtığın her kare <b>' + esc(st.team.name) + '</b> ekibinin tuvaline de ekleniyor. <a href="#/ekip">Ekip tuvaline bak</a></div></div>' : '');
    $('seg').addEventListener('click', function (e) {
      var m = e.target.getAttribute('data-m'); if (!m || st.active) return;
      st.mode = m; save(); renderTimer();
    });
    $('bStart').addEventListener('click', startWork);
    $('bBreak').addEventListener('click', startBreak);
    $('bStop').addEventListener('click', giveUp);
    renderTimer();
  }
  function renderTimer() {
    var a = st.active, working = a && a.kind !== 'break';
    document.body.classList.toggle('focus', !!working);
    if (!$('clock')) return;
    var P = personal(), watch = st.mode === 'kronometre';
    Array.prototype.forEach.call($('seg').children, function (b) { var on = b.getAttribute('data-m') === st.mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); b.disabled = !!a; });
    $('bStart').hidden = !!a || P.full;
    $('bStart').textContent = watch ? 'Kronometreyi başlat' : 'Pomodoro başlat';
    $('bBreak').hidden = !!a || P.full || !st.breakDue || st.mode !== 'pomodoro';
    $('bBreak').textContent = st.pomStreak % 4 === 0 ? '15 dakika uzun mola ver' : '5 dakika mola ver';
    $('bStop').hidden = !a;
    $('bStop').textContent = a && a.kind === 'break' ? 'Molayı bitir' : a && a.kind === 'watch' ? 'Bitir' : 'Bırak';
    $('rule').hidden = !working;
    $('greet').textContent = working ? (a.kind === 'watch' ? 'Odaktasın. Her 25 dakika bir kare.' : 'Odaktasın. Telefonu bırak.') : a ? 'Mola. Biraz su iç, gözlerini dinlendir.' : greet();
    var n = todayCount();
    $('sToday').textContent = n;
    var dots = ''; for (var i = 0; i < Math.max(st.goal, Math.min(n, 28)); i++) dots += '<i class="' + (i < n ? (i < st.goal ? 'on' : 'over') : '') + '"></i>';
    $('dots').innerHTML = dots;
    $('pname').textContent = (P.full ? '' : 'Gizli kuş ') + (P.full || P.opened > CELLS * 0.6 ? birdName(P.bird) : '?');
    $('pname').textContent = P.full ? birdName(P.bird) : P.opened > CELLS * 0.6 ? birdName(P.bird) + ' gibi görünüyor' : 'Tuval ' + st.canvasNo + ': gizli kuş';
    $('pprog').textContent = P.opened + ' / ' + CELLS + ' kare';
    $('pbar').style.width = (P.opened / CELLS * 100) + '%';
    $('nextwrap').innerHTML = P.full
      ? '<div style="padding:8px 6px 4px;display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn dark small" id="bCard2" style="width:100%">Kartımı oluştur</button><button class="btn go small" id="bNext" style="width:100%">Sıradaki kuşa geç</button></div>'
      : '';
    if ($('bNext')) $('bNext').addEventListener('click', function () { st.canvasNo++; save(); pulseIdx = -1; renderWork(); });
    if ($('bCard2')) $('bCard2').addEventListener('click', seasonCard);
    paintClock(); drawAll(); paintSky();
  }
  function paintClock() {
    var c = $('clock'); if (!c) return;
    var a = st.active, sub = $('sub'), now = Date.now();
    c.classList.remove('long');
    if (!a) { c.textContent = st.mode === 'kronometre' ? '0:00' : mmss(BLOCK_MS); sub.textContent = st.mode === 'kronometre' ? 'Kesintisiz her 25 dakika bir kare açar' : '25 dakika odak, bir kare'; return; }
    if (a.kind === 'watch') {
      var el = now - a.start; c.textContent = hms(el); if (el >= 3600e3) c.classList.add('long');
      sub.textContent = 'Sıradaki kareye ' + mmss(BLOCK_MS - el % BLOCK_MS) + (a.credited ? ', bu oturumda ' + a.credited + ' kare' : '');
      return;
    }
    c.textContent = mmss(a.end - now);
    sub.textContent = a.kind === 'break' ? (a.long ? 'Uzun mola' : 'Kısa mola') : 'Bitince bir kare açılacak';
  }

  /* ---------- Ekibim ---------- */
  function teamHowTo() {
    return '<p class="muted" style="margin-bottom:6px">Ekip kurunca kişi sayısına göre büyüyen ortak bir tuval açılır. Herkesin açtığı her kare bu tuvale de eklenir. Ekip kalabalıklaştıkça Pixel daha büyük ve detaylı çıkar.</p>';
  }
  function renderTeam() {
    var v = $('view');
    if (!SERVER) {
      v.innerHTML = '<h1 class="h1">Ekibim</h1><div class="section grid2"><div class="panel">' + teamHowTo() +
        '<div class="note" style="margin-top:12px">' + (TEST ? 'Test modunda ekipler kapalı.' : 'Ekipler, site sunucuya bağlanınca açılacak.') + '</div></div><div></div></div>';
      return;
    }
    if (!st.team) {
      var code = st.pendingJoin || '';
      v.innerHTML = '<h1 class="h1">Ekibim</h1><p class="lead">Arkadaşlarınla tek bir büyük tuvali birlikte aç.</p>' +
        '<div class="section grid2">' +
        '<div class="panel form"><h2 style="font:800 21px var(--font)">Ekibe katıl</h2>' +
        '<label for="tCode">Davet kodu</label><input type="text" id="tCode" maxlength="6" value="' + esc(code) + '" placeholder="Örneğin G3JN49" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:4px;font-weight:700">' +
        '<button class="btn go" id="tJoin">Ekibe katıl</button><p class="muted small" style="margin-top:10px">Kodu ekibi kuran arkadaşından al. Aynı anda bir ekipte olabilirsin.</p></div>' +
        '<div class="panel tint form"><h2 style="font:800 21px var(--font)">Ekip kur</h2>' + teamHowTo() +
        '<label for="tName">Ekip adı</label><input type="text" id="tName" maxlength="30" placeholder="Örneğin Gece Kuşları">' +
        '<label for="tSize">Kaç kişisiniz?</label><select id="tSize">' + [2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<option' + (n === 4 ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>' +
        '<p class="muted small" id="tCalc" style="margin-top:8px"></p><button class="btn line" id="tCreate">Ekibi kur</button></div></div>';
      var calc = function () { var n = +$('tSize').value, s = Math.round(16 * Math.sqrt(n)); $('tCalc').textContent = 'Ekip tuvali ' + s * s + ' kare olur. Herkes günde 4 saat çalışırsa yaklaşık bir ayda tamamlanır.'; };
      $('tSize').addEventListener('change', calc); calc();
      $('tCreate').addEventListener('click', function () {
        var name = $('tName').value.trim(); if (name.length < 2) return toast('Ekibine bir ad ver.', 'bad');
        busy(this); server().then(function () { return st.profileSynced ? null : pushProfile(); })
          .then(function () { return sb.rpc('create_team', { p_name: name, p_size: +$('tSize').value }).then(chk); })
          .then(refreshTeam).then(function () { toast('Ekip kuruldu. Davet kodunu arkadaşlarına gönder.', 'good'); renderTeam(); })
          .catch(function (e) { toast(errText(e), 'bad'); renderTeam(); });
      });
      $('tJoin').addEventListener('click', function () {
        var c = $('tCode').value.trim().toUpperCase(); if (c.length !== 6) return toast('Davet kodu 6 karakter olmalı.', 'bad');
        busy(this); server().then(function () { return st.profileSynced ? null : pushProfile(); })
          .then(function () { return sb.rpc('join_team', { p_code: c }).then(chk); })
          .then(function () { st.pendingJoin = null; save(); return refreshTeam(); }).then(function () { toast('Ekibe katıldın.', 'good'); renderTeam(); })
          .catch(function (e) { toast(errText(e), 'bad'); renderTeam(); });
      });
      return;
    }
    var t = st.team, s = st.teamState || { members: [], opened: [] }, opened = Math.min(s.opened.length, t.cells);
    var link = location.origin + location.pathname + '?ekip=' + t.code;
    v.innerHTML = '<h1 class="h1">' + esc(t.name) + '</h1><p class="lead">' + opened + ' / ' + t.cells + ' kare açıldı. Bir kareye dokun, kimin açtığını gör.</p>' +
      '<div class="section work"><div class="window"><canvas id="tcanvas" class="pt" aria-label="Ekip tuvali"></canvas><div class="meter"><i style="width:' + (opened / t.cells * 100) + '%"></i></div></div>' +
      '<div><div class="panel" style="text-align:center"><div class="muted small" style="margin-bottom:8px">Davet kodu</div><div class="code">' + esc(t.code) + '</div>' +
      '<p class="muted small" style="margin-top:8px">' + s.members.length + ' / ' + t.size + ' kişi</p>' +
      (s.members.length < t.size ? '<button class="btn go" id="tShare">Davet linkini gönder</button>' : '<p class="note small" style="margin-top:8px">Ekip dolu.</p>') + '</div>' +
      '<div class="section"><h2>Üyeler</h2><ul class="list">' +
      s.members.slice().sort(function (a, b) { return b.count - a.count; }).map(function (m) {
        return '<li' + (m.id === me() ? ' class="mine"' : '') + '>' + av(m.bird, m.color, 40) + '<div class="name"><b>' + esc(m.nickname) + '</b></div><div class="num">' + m.count + '<small>kare</small></div></li>';
      }).join('') + '</ul></div>' +
      '<button class="btn line small" id="tLeave" style="margin-top:14px">Ekipten ayrıl</button></div></div>';
    drawAll();
    $('tcanvas').addEventListener('click', function (e) {
      var m = this._meta; if (!m) return;
      var r = this.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * m.side), y = Math.floor((e.clientY - r.top) / r.height * m.side);
      var idx = m.order.indexOf(y * m.side + x);
      if (idx < 0 || idx >= m.opened) return toast('Bu kare henüz açılmadı.');
      var uid = s.opened[idx], mem = s.members.filter(function (q) { return q.id === uid; })[0];
      toast((mem ? mem.nickname : (st.profile ? st.profile.nickname : 'Biri')) + ' açtı.');
    });
    if ($('tShare')) $('tShare').addEventListener('click', function () {
      var text = 'PixelTime\'da "' + t.name + '" ekibine katıl, birlikte çalışıp Pixel\'i ortaya çıkaralım. Davet kodu: ' + t.code;
      if (navigator.share) navigator.share({ title: 'PixelTime', text: text, url: link }).catch(function () {});
      else { copy(text + ' ' + link); toast('Davet linki kopyalandı.', 'good'); }
    });
    $('tLeave').addEventListener('click', function () {
      if (!confirm('Ekipten ayrılmak istiyor musun? Açtığın kareler ekip tuvalinde kalır.')) return;
      busy(this); sb.rpc('leave_team').then(chk).then(function () { st.team = null; st.teamState = null; save(); renderTeam(); })
        .catch(function (e) { toast(errText(e), 'bad'); renderTeam(); });
    });
  }

  /* ---------- Sıralama ---------- */
  var board = { scope: 'kisi', period: 'hafta' };
  function renderBoard() {
    var v = $('view');
    var scopes = [['kisi', 'Kişiler'], ['okul', 'Okullar'], ['sehir', 'Şehirler'], ['ekip', 'Ekipler']];
    var periods = [['hafta', 'Bu hafta'], ['ay', 'Bu ay'], ['hepsi', 'Tüm zamanlar']];
    v.innerHTML = '<h1 class="h1">Sıralama</h1><p class="lead">Türkiye genelinde en çok kare açanlar.</p>' +
      '<div class="section" style="max-width:720px"><div class="chips" id="bScope">' + scopes.map(function (s) { return '<button data-v="' + s[0] + '"' + (board.scope === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>'; }).join('') + '</div>' +
      '<div class="chips" id="bPeriod">' + periods.map(function (s) { return '<button data-v="' + s[0] + '"' + (board.period === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>'; }).join('') + '</div>' +
      '<div class="panel" id="bList"></div></div>';
    $('bScope').addEventListener('click', function (e) { var x = e.target.getAttribute('data-v'); if (x) { board.scope = x; renderBoard(); } });
    $('bPeriod').addEventListener('click', function (e) { var x = e.target.getAttribute('data-v'); if (x) { board.period = x; renderBoard(); } });
    var out = $('bList');
    if (!SERVER) { out.innerHTML = '<p class="muted">Sıralamalar site sunucuya bağlanınca açılacak.' + (TEST ? ' Test modunda kapalı.' : '') + ' Şimdiye kadar <b style="color:var(--text)">' + okBlocks().length + ' kare</b> açtın, yani ' + hours(okBlocks().length) + ' saat çalıştın.</p>'; return; }
    out.innerHTML = '<p class="muted">Yükleniyor</p>';
    var since = new Date(), d = since.getDay();
    if (board.period === 'hafta') { since.setDate(since.getDate() - (d === 0 ? 6 : d - 1)); since.setHours(0, 0, 0, 0); }
    else if (board.period === 'ay') { since.setDate(1); since.setHours(0, 0, 0, 0); }
    else since = new Date(2020, 0, 1);
    server().then(function () { return sb.rpc('leaderboard', { p_scope: board.scope, p_since: since.toISOString() }).then(chk); })
      .then(function (rows) {
        if (!rows || !rows.length) { out.innerHTML = '<p class="muted">Bu dönemde henüz kimse kare açmadı. İlk sen aç.</p>'; return; }
        var mine = st.profile ? (board.scope === 'kisi' ? st.profile.nickname : board.scope === 'okul' ? st.profile.school : board.scope === 'sehir' ? st.profile.city : st.team && st.team.name) : null;
        out.innerHTML = '<ul class="list">' + rows.map(function (r, i) {
          var isMe = mine && String(mine).toLocaleLowerCase('tr') === String(r.label).toLocaleLowerCase('tr');
          return '<li' + (isMe ? ' class="mine"' : '') + '><span class="rank' + (i < 3 ? ' top' : '') + '">' + (i + 1) + '</span>' + (r.bird ? av(r.bird, r.color, 40) : '') +
            '<div class="name"><b>' + esc(r.label) + '</b>' + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div><div class="num">' + r.total + '<small>' + hours(r.total) + ' saat</small></div></li>';
        }).join('') + '</ul>';
      }).catch(function (e) { out.innerHTML = '<p class="muted">Sıralama yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.</p>'; console.warn(e); });
  }

  /* ---------- Profil ---------- */
  function renderProfile() {
    var p = st.profile || { nickname: '', bird: 'muhabbet-mavi', color: '#ffd36e', exam: '', city: '', school: '' };
    var first = !st.profile, draft = { bird: p.bird, color: p.color };
    $('view').innerHTML =
      (first ? '<h1 class="h1">Çalıştıkça bir kuş ortaya çıkar.</h1><p class="lead">Her 25 dakikalık odak, gizli bir kuşun bir karesini açar. İlk kuş Pixel. Başlamak için kendine bir takma ad ve bir kuş seç.</p>'
        : '<h1 class="h1">Profilim</h1>') +
      '<div class="section grid2"><div class="panel form">' +
      '<label for="fNick" style="margin-top:0">Takma ad <small>(gerçek adın gerekmez)</small></label><input type="text" id="fNick" maxlength="20" value="' + esc(p.nickname) + '" placeholder="Örneğin Mühendis" autocomplete="off">' +
      '<label for="fFind">Kuşun <small>(' + BIRDS.list.length + ' tür arasından seç)</small></label>' +
      '<input type="search" id="fFind" placeholder="Kuş ara: kartal, kanarya, baykuş…" autocomplete="off">' +
      '<div class="bcats" id="fCats"><button type="button" class="on" data-cat="">Hepsi</button>' + BIRDS.cats.map(function (c) { return '<button type="button" data-cat="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>' +
      '<div class="birds" id="fBirds">' + BIRDS.list.map(function (b) {
        return '<button type="button" data-b="' + b.id + '" data-cat="' + (b.cat || '') + '" data-n="' + esc(trLow(b.name)) + '"' + (b.id === p.bird ? ' class="on"' : '') + ' aria-label="' + esc(b.name) + '"><span class="ph" data-ph="' + b.id + '">' + BIRDS.svg(b.id, { branch: false }) + '</span>' + esc(b.name) + '</button>';
      }).join('') + '</div>' +
      '<p class="credit">Kuş fotoğrafları Wikipedia ve Wikimedia Commons\'tan.</p>' +
      '<label>Rengin <small>(kuşunun halkası ve ekip tuvalindeki karelerin)</small></label><div class="colors" id="fColors">' +
      DATA.colors.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '"' + (c === p.color ? ' class="on"' : '') + ' aria-label="Renk ' + c + '"></button>'; }).join('') +
      '<label class="pick" title="İstediğin rengi seç"><input type="color" id="fColor" value="' + esc(p.color) + '" aria-label="İstediğin rengi seç"></label></div>' +
      '<div class="preview"><span class="av" id="fAv"></span><div><b id="fPrevName"></b><div class="muted small" id="fPrevBird"></div></div></div>' +
      '<label for="fExam">Hazırlandığın sınav <small>(isteğe bağlı)</small></label><select id="fExam"><option value="">Seçmedim</option>' + DATA.exams.map(function (x) { return '<option' + (x === p.exam ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
      '<div class="row2"><div><label for="fCity">Şehir <small>(isteğe bağlı)</small></label><select id="fCity"><option value="">Seçmedim</option>' + DATA.cities.map(function (x) { return '<option' + (x === p.city ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="fSchool">Okul <small>(isteğe bağlı)</small></label><input type="text" id="fSchool" maxlength="80" value="' + esc(p.school) + '" placeholder="Örneğin Ankara Fen Lisesi"></div></div>' +
      '<label for="fGoal">Günlük hedefin</label><select id="fGoal">' + GOALS.map(function (g) { return '<option value="' + g + '"' + (g === st.goal ? ' selected' : '') + '>' + g + ' kare, yaklaşık ' + hours(g) + ' saat</option>'; }).join('') + '</select>' +
      '<p class="muted small" style="margin-top:8px">Ana sayfadaki noktalar hedefine ne kadar kaldığını gösterir.</p>' +
      '<button class="btn dark" id="fSave">' + (first ? 'Başla' : 'Değişiklikleri kaydet') + '</button>' +
      (first && SERVER ? '<p class="muted small" style="margin-top:14px;text-align:center">Başka bir cihazda hesabın var mı? <a href="#" id="fLogin" style="color:var(--night);font-weight:600">E-postanla giriş yap</a></p>' : '') +
      '</div><div>' + (first ? intro() : statsBlock() + collectionBlock() + accountBlock()) + '</div></div>';
    function prev() {
      $('fAv').innerHTML = BIRDS.svg(draft.bird, { branch: false }); $('fAv').setAttribute('data-ph', draft.bird); $('fAv').style.setProperty('--ring', draft.color); hydrate($('fAv').parentNode);
      $('fPrevName').textContent = $('fNick').value.trim() || 'Takma adın';
      $('fPrevBird').textContent = birdName(draft.bird);
    }
    var bCat = '';
    function bFilter() {
      var q = trLow($('fFind').value.trim()), n = 0;
      Array.prototype.forEach.call($('fBirds').children, function (x) {
        var ok = (!bCat || x.getAttribute('data-cat') === bCat) && (!q || x.getAttribute('data-n').indexOf(q) >= 0);
        x.hidden = !ok; if (ok) n++;
      });
      $('fNone').hidden = n > 0;
    }
    $('fBirds').insertAdjacentHTML('afterend', '<p class="muted small" id="fNone" hidden>Bu isimde bir kuş bulamadık.</p>');
    $('fFind').addEventListener('input', bFilter);
    $('fCats').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      bCat = b.getAttribute('data-cat');
      Array.prototype.forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); }); bFilter();
    });
    $('fBirds').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      draft.bird = b.getAttribute('data-b');
      Array.prototype.forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); }); prev();
    });
    $('fColors').addEventListener('click', function (e) {
      var c = e.target.getAttribute('data-c'); if (!c) return;
      draft.color = c; $('fColor').value = c;
      Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x.getAttribute('data-c') === c); }); prev();
    });
    $('fColor').addEventListener('input', function () {
      draft.color = this.value;
      Array.prototype.forEach.call($('fColors').querySelectorAll('button'), function (x) { x.classList.remove('on'); }); prev();
    });
    $('fNick').addEventListener('input', prev);
    $('fSave').addEventListener('click', function () {
      var nick = $('fNick').value.trim().replace(/\s+/g, ' ');
      if (nick.length < 2) { $('fNick').focus(); return toast('Takma adın en az 2 harf olmalı.', 'bad'); }
      st.profile = { nickname: nick, bird: draft.bird, color: draft.color, exam: $('fExam').value, city: $('fCity').value, school: $('fSchool').value.trim().slice(0, 80) };
      st.goal = +$('fGoal').value || 8;
      st.profileSynced = false; save();
      if (SERVER) pushProfile().then(sync).catch(function (e) { console.warn(e); });
      toast(first ? 'Hoş geldin, ' + nick + '. İlk kareyi açmaya hazırsın.' : 'Profilin kaydedildi.', 'good');
      go(first && st.pendingJoin && SERVER ? '#/ekip' : first ? '#/' : location.hash || '#/');
    });
    if ($('fLogin')) $('fLogin').addEventListener('click', function (e) { e.preventDefault(); emailModal('login'); });
    if ($('bCard')) $('bCard').addEventListener('click', seasonCard);
    if ($('bBackup')) $('bBackup').addEventListener('click', function () { emailModal('backup'); });
    prev();
  }
  function intro() {
    return '<div class="panel tint"><h2 style="font:800 21px var(--font);margin-bottom:10px">Nasıl çalışır?</h2>' +
      '<ul class="list"><li><div class="name"><b>25 dakika = 1 kare</b><small>Pomodoro ya da kronometreyle çalış. Her 25 dakika gizli kuşun bir karesini açar.</small></div></li>' +
      '<li><div class="name"><b>Telefonu bırak</b><small>Çalışırken uygulamadan çıkarsan Pixel kaçar, o kare açılmaz.</small></div></li>' +
      '<li><div class="name"><b>Kuş koleksiyonu</b><small>Bir tuvali bitirince kuş koleksiyonuna girer, sıradaki gizli kuş açılır.</small></div></li>' +
      '<li><div class="name"><b>Ekip ve sıralama</b><small>Arkadaşlarınla büyük bir tuvali birlikte aç, okulunu ve şehrini yukarı taşı.</small></div></li></ul></div>';
  }
  function stats() {
    var b = okBlocks(), days = {}, best = 0;
    b.forEach(function (x) { var d = dayKey(x.started_at); days[d] = (days[d] || 0) + 1; });
    Object.keys(days).forEach(function (d) { if (days[d] > best) best = days[d]; });
    var streak = 0, cur = new Date(); if (!days[dayKey(cur)]) cur.setDate(cur.getDate() - 1);
    while (days[dayKey(cur)]) { streak++; cur.setDate(cur.getDate() - 1); }
    return { total: b.length, hours: hours(b.length), best: best, streak: streak, birds: finishedCanvases(), fails: st.fails };
  }
  function statsBlock() {
    var s = stats();
    return '<div class="stats"><div><b>' + s.total + '</b><span>kare</span></div><div><b>' + s.hours + '</b><span>saat</span></div><div><b>' + s.streak + '</b><span>günlük seri</span></div>' +
      '<div><b>' + s.best + '</b><span>en iyi gün</span></div><div><b>' + s.birds + '</b><span>kuş</span></div><div><b>' + s.fails + '</b><span>kaçan Pixel</span></div></div>' +
      '<button class="btn go" id="bCard">Sezon kartımı oluştur</button>';
  }
  function collectionBlock() {
    var done = finishedCanvases(), show = Math.min(REVEAL.length, Math.max(done + 3, 6)), h = '';
    for (var i = 0; i < show; i++) {
      var id = REVEAL[i], got = i < done, next = i === done;
      h += '<figure class="' + (got ? '' : 'locked') + (next ? ' next' : '') + '"><span class="ph"' + (got ? ' data-ph="' + id + '"' : '') + '>' + BIRDS.svg(id === 'pixel' ? 'muhabbet-yesil' : id, { branch: false }) + '</span><figcaption>' + (got ? esc(birdName(id)) : next ? 'Şu an açılıyor' : 'Gizli') + '</figcaption></figure>';
    }
    return '<div class="section"><h2>Koleksiyonum</h2><p class="muted small" style="margin-bottom:10px">' + (done ? done + ' kuş topladın.' : 'Henüz kuş toplamadın. İlk tuvali bitirince Pixel koleksiyonuna girer.') + '</p><div class="collection">' + h + '</div></div>';
  }
  function accountBlock() {
    if (!SERVER) return '';
    return '<div class="section"><h2>Hesabını koru</h2><div class="panel small"><p class="muted">' +
      (st.email ? 'Hesabın <b style="color:var(--text)">' + esc(st.email) + '</b> adresine bağlı. Başka cihazdan bu e-postayla girebilirsin.'
        : 'Hesabın şu an sadece bu cihazda. Telefonun değişirse ya da tarayıcı verileri silinirse karelerin kaybolabilir. E-postanı ekle, her cihazdan gir.') +
      '</p>' + (st.email ? '' : '<button class="btn line small" id="bBackup" style="margin-top:12px">E-posta ekle</button>') + '</div></div>';
  }
  function emailModal(kind) {
    var m = $('modal');
    m.innerHTML = '<div class="sheet form"><button class="x" aria-label="Kapat">✕</button><h2 style="font:800 21px var(--font);margin-bottom:6px">' + (kind === 'login' ? 'E-postanla giriş yap' : 'E-posta ekle') + '</h2>' +
      '<p class="muted small">' + (kind === 'login' ? 'Daha önce hesabına eklediğin e-postayı yaz. Sana bir giriş linki göndereceğiz.' : 'E-postana bir onay linki göndereceğiz. Linke tıklayınca hesabın bu adrese bağlanır.') + '</p>' +
      '<label for="mEmail">E-posta</label><input type="email" id="mEmail" autocomplete="email" placeholder="ornek@mail.com"><button class="btn dark" id="mSend">Link gönder</button></div>';
    m.hidden = false;
    var close = function () { m.hidden = true; m.innerHTML = ''; };
    m.querySelector('.x').addEventListener('click', close);
    m.onclick = function (e) { if (e.target === m) close(); };
    $('mSend').addEventListener('click', function () {
      var email = $('mEmail').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Geçerli bir e-posta yaz.', 'bad');
      var btn = this; busy(btn);
      var redirect = location.origin + location.pathname;
      var p = kind === 'login'
        ? client().then(function () { return sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false, emailRedirectTo: redirect } }); })
        : server().then(function () { return sb.auth.updateUser({ email: email }, { emailRedirectTo: redirect }); });
      p.then(chk).then(function () { if (kind === 'backup') { st.email = email; save(); } close(); toast('Link gönderildi. E-postanı kontrol et.', 'good', 6000); })
        .catch(function (e) { btn.disabled = false; btn.textContent = 'Link gönder'; toast(/not found|Signups not allowed/i.test(e.message || '') ? 'Bu e-postayla bir hesap bulunamadı.' : errText(e), 'bad'); });
    });
  }

  /* ---------- Pixel'i tanı ---------- */
  function renderPixel() {
    $('view').innerHTML = '<div class="grid2" style="align-items:center"><div class="pxgal"><div class="window"><img src="img/pixel.jpg" alt="Pixel, dizüstü bilgisayarın üstünde" style="width:100%;display:block;border-radius:12px"></div><div class="window"><img src="img/pixel-2.jpg" alt="Pixel, kafesindeki tünekte" style="width:100%;display:block;border-radius:12px"></div></div>' +
      '<div><h1 class="h1">Pixel</h1><p class="lead" style="margin-top:10px">PixelTime adını, sahibinin gri muhabbet kuşu Pixel\'den alıyor. Herkesin ilk tuvalinde ortaya çıkan kuş o; tuvalde gördüğün fotoğraf da onun kendi fotoğrafı.</p>' +
      '<p class="lead" style="margin-top:10px">Burada açılan her kare, onu biraz daha görünür kılıyor.</p><a class="btn go" href="#/" style="max-width:280px;margin-top:20px">Çalışmaya dön</a></div></div>';
  }

  /* ================= Sezon kartı ================= */
  function seasonCard() {
    var p = st.profile; if (!p) return;
    var s = stats(), W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'), FD = 'Nunito,system-ui,sans-serif', FB = 'Nunito,system-ui,sans-serif';
    var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#cfe6f8'); bg.addColorStop(0.5, '#eaf3fb'); bg.addColorStop(1, '#ffffff');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.textAlign = 'left'; g.fillStyle = '#23253a';
    g.font = '800 64px ' + FD; g.fillText('PixelTime', 90, 150);
    g.font = '500 36px ' + FB; g.fillStyle = '#6b6f88'; g.fillText('Sezon ' + SEASON + ' kartım', 90, 205);
    var a = new Image(), done = 0, birdImg = new Image();
    function draw() {
      if (++done < 2) return;
      g.save(); g.beginPath(); g.arc(W - 200, 160, 110, 0, 7); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 12; g.strokeStyle = p.color; g.stroke(); g.clip();
      g.drawImage(a, W - 310, 50, 220, 220); g.restore();
      g.fillStyle = '#23253a'; g.font = '800 112px ' + FD; g.fillText(p.nickname, 90, 420);
      g.font = '500 38px ' + FB; g.fillStyle = '#6b6f88'; g.fillText([p.exam, p.city, p.school].filter(Boolean).join(', ') || birdName(p.bird), 90, 480);
      var rows = [[s.total, 'kare açtım'], [s.hours, 'saat odaklandım'], [s.streak, 'gün üst üste'], [s.birds, 'kuş topladım']];
      rows.forEach(function (r, i) {
        var x = 90 + (i % 2) * 460, y = 580 + Math.floor(i / 2) * 260;
        g.fillStyle = ['#ffffff', '#fff4d6', '#fdeceb', '#e2f5ed'][i]; rr(g, x, y, 440, 230, 40); g.fill();
        g.fillStyle = '#23253a'; g.font = '800 112px ' + FD; g.fillText(String(r[0]), x + 40, y + 140);
        g.fillStyle = '#6b6f88'; g.font = '500 34px ' + FB; g.fillText(r[1], x + 44, y + 195);
      });
      var P = personal(), mini = document.createElement('canvas');
      drawCanvas(mini, N, P.opened, P.seed, P.bird);
      g.save(); rr(g, 90, 1130, 520, 520, 44); g.clip(); g.drawImage(mini, 90, 1130, 520, 520); g.restore();
      g.fillStyle = '#23253a'; g.font = '800 44px ' + FD;
      wrap(P.full ? birdName(P.bird) + ' ortaya çıktı.' : 'Gizli kuşun %' + Math.round(P.opened / CELLS * 100) + '\'i açıldı.', 650, 1200, 340, 56);
      g.fillStyle = '#5f7fcf'; g.font = '500 34px ' + FB; wrap(st.team ? st.team.name + ' ekibiyle çalışıyorum.' : 'Sen de katıl, birlikte çalışalım.', 650, 1420, 340, 44);
      g.fillStyle = '#6b6f88'; g.font = '500 34px ' + FB; g.textAlign = 'center';
      g.fillText(location.host + location.pathname.replace(/index\.html$/, ''), W / 2, H - 90);
      showCard(c);
    }
    function wrap(t, x, y, w, lh) { var ws = t.split(' '), line = ''; ws.forEach(function (wd) { var test = line ? line + ' ' + wd : wd; if (g.measureText(test).width > w && line) { g.fillText(line, x, y); line = wd; y += lh; } else line = test; }); g.fillText(line, x, y); }
    a.onload = draw; birdImg.onload = draw;
    var svgSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BIRDS.svg(p.bird, { size: 400, branch: false }));
    photo(p.bird, 400).then(function (u) {
      if (u) { a.crossOrigin = 'anonymous'; a.onerror = function () { a.onerror = null; a.removeAttribute('crossorigin'); a.src = svgSrc; }; a.src = u; } else a.src = svgSrc;
    });
    birdImg.src = svgSrc;
    var P0 = personal(); birdImage(P0.bird);
  }
  function showCard(c) {
    var url = c.toDataURL('image/png'), m = $('modal');
    m.innerHTML = '<div class="sheet"><button class="x" aria-label="Kapat">✕</button><h2 style="font:800 21px var(--font);margin:0 40px 12px 0">Sezon kartın</h2>' +
      '<img src="' + url + '" alt="Sezon kartın"><button class="btn go" id="mShare">Paylaş</button><a class="btn soft" download="pixeltime-kartim.png" href="' + url + '">Resmi indir</a></div>';
    m.hidden = false;
    var close = function () { m.hidden = true; m.innerHTML = ''; };
    m.querySelector('.x').addEventListener('click', close);
    m.onclick = function (e) { if (e.target === m) close(); };
    $('mShare').addEventListener('click', function () {
      c.toBlob(function (blob) {
        var file = new File([blob], 'pixeltime-kartim.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'PixelTime', text: 'PixelTime sezon kartım' }).catch(function () {});
        else { var a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); toast('Kart indirildi. Hikâyende paylaşabilirsin.', 'good'); }
      });
    });
  }

  /* ================= Küçük yardımcılar ================= */
  function go(h) { if (location.hash === h || (h === '#/' && !location.hash)) render(); else location.hash = h; }
  function busy(btn) { btn.disabled = true; btn.textContent = 'Bekle'; }
  function copy(t) { try { navigator.clipboard.writeText(t); } catch (e) {} }
  function errText(e) {
    var m = (e && (e.message || e.error_description)) || '';
    var map = { 'zaten bir ekiptesin': 'Zaten bir ekiptesin.', 'ekip bulunamadi': 'Bu kodla bir ekip bulunamadı. Kodu kontrol et.', 'ekip dolu': 'Bu ekip dolu.', 'profil yok': 'Önce profilini kaydet.', 'giris gerekli': 'Bağlantı kurulamadı. Tekrar dene.', 'ekip 2-10 kisi olmali': 'Ekip 2 ile 10 kişi arasında olmalı.', 'rate limit': 'Çok sık denedin. Biraz bekleyip tekrar dene.' };
    for (var k in map) if (m.toLowerCase().indexOf(k) >= 0) return map[k];
    if (!navigator.onLine) return 'İnternet yok. Bağlanınca tekrar dene.';
    return 'Bir sorun oldu. Tekrar dene.';
  }

  /* ================= Başlat ================= */
  var q = location.search.match(/[?&]ekip=([A-Za-z0-9]{6})/);
  if (q) { st.pendingJoin = q[1].toUpperCase(); save(); if (!st.team) location.hash = '#/ekip'; }
  (function () {   /* logoya 5 kez dokun: test modu aç/kapat */
    var n = 0, t = 0, el = document.querySelector('.brand img');
    el.addEventListener('click', function (e) {
      var now = Date.now(); n = now - t < 800 ? n + 1 : 1; t = now;
      if (n >= 3) e.preventDefault();
      if (n >= 5) { try { localStorage.setItem('pt_test', TEST ? '0' : '1'); } catch (x) {} toast(TEST ? 'Test modu kapandı' : 'Test modu açıldı'); setTimeout(function () { location.href = location.pathname; }, 700); }
    });
  })();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0 && !TEST) navigator.serviceWorker.register('sw.js').catch(function () {});
  REVEAL.slice(0, 1).forEach(birdImage); birdImage(personal().bird);
  render();
  if (SERVER) {
    var fromLink = /[?&]code=/.test(location.search);
    if (fromLink || (!st.profile)) server(true).then(function (u) {
      if (!u) return;
      if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
      return (st.profile ? Promise.resolve(false) : restore()).then(function (ok) { if (ok) { toast('Tekrar hoş geldin, ' + st.profile.nickname + '.', 'good'); render(); } });
    }).catch(function (e) { console.warn(e); });
    if (st.profile) sync();
  }
})();

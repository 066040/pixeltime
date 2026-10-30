/* PixelTime — uygulama */
(function () {
  'use strict';

  /* ================= Ayarlar ================= */
  var CFG = window.PT_CONFIG || {};
  var BIRDS = window.PT_BIRDS, DATA = window.PT_DATA;
  var TEST = /[?&]test\b/.test(location.search) || (function () { try { return localStorage.getItem('pt_test') === '1'; } catch (e) { return false; } })();           // ?test → 1 sn blok, 16 kare, sunucuya gitmez
  var BLOCK_MS = TEST ? 1e3 : 25 * 60e3;                    // 1 kare = 25 dk odak
  var BREAK_MS = TEST ? 2e3 : 5 * 60e3;
  var LONG_BREAK_MS = TEST ? 3e3 : 15 * 60e3;               // her 4 pomodoroda bir uzun mola
  var LEAVE_GRACE_MS = 2000;
  var DAILY_MAX = TEST ? 9999 : 28;                         // günde en fazla 28 kare (~12 saat)
  var N = TEST ? 4 : 16, CELLS = N * N;                     // kişisel tuval
  var KEY = TEST ? 'pixeltime_test' : 'pixeltime_v2';
  var SERVER = !TEST && !!(CFG.supabaseUrl && CFG.supabaseKey);
  var SUPA_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var SEASON = 1;

  /* ================= Kayıt ================= */
  function fresh() {
    return { seed: rnd(), profile: null, profileSynced: false, blocks: [], canvasNo: 1, active: null,
      fails: 0, pomStreak: 0, breakDue: false, mode: 'pomodoro', team: null, teamState: null, pendingJoin: null };
  }
  var st;
  try { st = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { st = fresh(); }
  var def = fresh(); for (var k in def) if (!(k in st)) st[k] = def[k];
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  /* ================= Yardımcılar ================= */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rnd() { return Math.random().toString(36).slice(2, 10); }
  function uuid() { return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + rnd() + rnd()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mmss(ms) { ms = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(ms / 60) + ':' + pad(ms % 60); }
  function hms(ms) { var s = Math.floor(Math.max(0, ms) / 1000), h = Math.floor(s / 3600); return (h ? h + ':' + pad(Math.floor(s % 3600 / 60)) : Math.floor(s / 60)) + ':' + pad(s % 60); }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function okBlocks() { return st.blocks.filter(function (b) { return !b.rejected; }); }
  function todayCount() { var t = dayKey(Date.now()); return okBlocks().filter(function (b) { return dayKey(b.started_at) === t; }).length; }
  function hours(n) { return (n * 25 / 60).toFixed(1).replace('.', ','); }
  function toast(msg, kind, ms) {
    var el = $('toast'); el.textContent = msg; el.className = 'toast show ' + (kind || '');
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.className = 'toast'; }, ms || 3800);
  }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function shuffled(n, seed) {
    var a = [], x = hashStr(String(seed)) || 1;
    for (var i = 0; i < n; i++) a.push(i);
    function r() { x = (x + 0x6D2B79F5) | 0; var t = Math.imul(x ^ (x >>> 15), 1 | x); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(r() * (j + 1)), tmp = a[j]; a[j] = a[k]; a[k] = tmp; }
    return a;
  }
  function birdBox(id, color, cls) { return '<span class="' + (cls || 'mini') + '" style="border-color:' + esc(color || '#5f78b0') + '">' + BIRDS.svg(id) + '</span>'; }

  /* ================= Pixel resmi ve tuval çizimi ================= */
  var pixelImg = new Image(), pixelReady = false, fullCache = {};
  pixelImg.onload = function () { pixelReady = true; fullCache = {}; drawAll(); };
  pixelImg.src = 'logo.svg';
  function fullImage(px) {
    if (!pixelReady) return null;
    if (fullCache[px]) return fullCache[px];
    var c = document.createElement('canvas'); c.width = c.height = px;
    var g = c.getContext('2d');
    g.fillStyle = '#e3ebf3'; g.fillRect(0, 0, px, px);
    var w = px * 0.92, h = w * pixelImg.height / pixelImg.width;
    g.drawImage(pixelImg, (px - w) / 2, (px - h) / 2 + px * 0.02, w, h);
    return (fullCache[px] = c);
  }
  /* side: kare sayısı (kenar), opened: açılan kare sayısı, seed: açılış sırası, owners: kare sahiplerinin renkleri */
  function drawCanvas(cv, side, opened, seed, owners, highlight) {
    if (!cv) return;
    var cell = Math.max(8, Math.floor(720 / side)), px = cell * side;
    if (cv.width !== px) { cv.width = cv.height = px; }
    var g = cv.getContext('2d'), img = fullImage(px), order = shuffled(side * side, seed);
    var dark = document.body.classList.contains('focus'), gap = side > 24 ? 1 : side > 8 ? 2 : 4;
    g.clearRect(0, 0, px, px);
    var shown = {};
    for (var i = 0; i < Math.min(opened, order.length); i++) shown[order[i]] = i + 1;
    for (var p = 0; p < side * side; p++) {
      var x = (p % side) * cell, y = Math.floor(p / side) * cell;
      if (shown[p]) {
        if (img) g.drawImage(img, x, y, cell, cell, x, y, cell, cell);
        else { g.fillStyle = '#c3c9cf'; g.fillRect(x, y, cell, cell); }
        var col = owners && owners[shown[p] - 1];
        if (col && cell >= 10) { g.strokeStyle = col; g.lineWidth = Math.max(1, cell / 12); g.strokeRect(x + g.lineWidth / 2, y + g.lineWidth / 2, cell - g.lineWidth, cell - g.lineWidth); }
      } else {
        g.fillStyle = dark ? '#1f3a55' : '#e6eef5';
        g.fillRect(x + gap / 2, y + gap / 2, cell - gap, cell - gap);
      }
    }
    if (highlight != null && highlight >= 0 && highlight < order.length) {
      var hp = order[highlight], hx = (hp % side) * cell, hy = Math.floor(hp / side) * cell;
      g.strokeStyle = 'rgba(255,210,63,' + (pulse > 0 ? pulse : 0) + ')'; g.lineWidth = Math.max(3, cell / 6);
      g.strokeRect(hx + g.lineWidth / 2, hy + g.lineWidth / 2, cell - g.lineWidth, cell - g.lineWidth);
    }
    cv._meta = { side: side, cell: cell, order: order, opened: opened };
  }
  var pulse = 0, pulseIdx = -1;
  function flash(idx) { pulseIdx = idx; pulse = 1; (function step() { pulse -= 0.025; drawAll(); if (pulse > 0) requestAnimationFrame(step); })(); }

  /* Kişisel tuval durumu */
  function personal() {
    var n = okBlocks().length, base = (st.canvasNo - 1) * CELLS, opened = Math.max(0, Math.min(CELLS, n - base));
    return { opened: opened, full: opened >= CELLS, canNext: n >= st.canvasNo * CELLS, seed: st.seed + ':' + st.canvasNo };
  }
  function drawAll() {
    var pc = $('pcanvas');
    if (pc) { var P = personal(); drawCanvas(pc, N, P.opened, P.seed, null, pulseIdx); }
    var tc = $('tcanvas');
    if (tc && st.teamState) drawTeam(tc);
  }

  /* ================= Ekranı açık tut ================= */
  var lock = null;
  function wake() { if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {}); }
  function unwake() { if (lock) { lock.release().catch(function () {}); lock = null; } }

  /* ================= Zamanlayıcı ================= */
  function canWork() {
    if (!st.profile) { location.hash = '#/profil'; return false; }
    if (todayCount() >= DAILY_MAX) { toast('Bugünlük sınıra ulaştın (12 saat). Dinlen, yarın devam!'); return false; }
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
    var P0 = personal().opened;
    st.blocks.push({ client_id: uuid(), started_at: new Date(s).toISOString(), ended_at: new Date(e).toISOString(), mode: mode, synced: false });
    save();
    if (P0 < CELLS) flash(P0);
    if (st.teamState) { st.teamState.opened.push(me()); st.teamState._local = true; }
    return personal();
  }
  function completeWork() {
    var a = st.active; st.active = null; st.pomStreak++; st.breakDue = true;
    var P = addBlock(a.start, a.end, 'pomodoro');
    unwake(); renderTimer(); renderHello();
    toast(P.full ? 'Pixel ortaya çıktı! 🎉' : 'Bir kare açıldı! ' + P.opened + '/' + CELLS + '. Mola zamanı.', 'good');
    beep(); sync();
  }
  function stopWatch(reason) {
    var a = st.active; if (!a || a.kind !== 'watch') return;
    st.active = null; save(); unwake(); renderTimer(); renderHello();
    var got = a.credited;
    if (reason) toast((got ? got + ' kare kazandın ama ' : '') + 'Pixel kaçtı! ' + reason, 'bad', 5000);
    else toast(got ? 'Bitti! Bu oturumda ' + got + ' kare açtın.' : 'Bitti. 25 dakikayı doldurmadığın için kare açılmadı.', got ? 'good' : '', 5000);
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
    if (!confirm('Pomodoro yarıda kalırsa kare açılmaz. Vazgeçmek istiyor musun?')) return;
    fail('Pomodoro yarıda bırakıldı.');
  }
  function tick() {
    var a = st.active; if (!a || document.hidden) return;
    var now = Date.now();
    if (a.kind === 'work' && now >= a.end) return completeWork();
    if (a.kind === 'break' && now >= a.end) { st.active = null; save(); unwake(); renderTimer(); toast('Mola bitti. Hazırsan devam!'); beep(); return; }
    if (a.kind === 'watch') {
      var k = Math.floor((now - a.start) / BLOCK_MS);
      while (a.credited < k) {
        if (todayCount() >= DAILY_MAX) { stopWatch(null); toast('Bugünlük sınıra ulaştın. Dinlen, yarın devam!'); return; }
        var s = a.start + a.credited * BLOCK_MS; a.credited++;
        var P = addBlock(s, s + BLOCK_MS, 'kronometre');
        toast(P.full ? 'Pixel ortaya çıktı! 🎉' : 'Bir kare açıldı! ' + P.opened + '/' + CELLS, 'good'); beep(); sync();
        renderHello(); renderTimer();
      }
      if (now - a.beat > 2000) { a.beat = now; save(); }
    }
    paintClock();
  }
  setInterval(tick, 250);

  /* Uygulamadan çıkma kuralı */
  document.addEventListener('visibilitychange', function () {
    var a = st.active;
    if (!a) return;
    if (a.kind === 'break') { if (!document.hidden) { wake(); tick(); } return; }
    if (document.hidden) { a.leftAt = Date.now(); save(); }
    else if (a.leftAt && Date.now() - a.leftAt > LEAVE_GRACE_MS) fail('Çalışırken uygulamadan çıkıldı.');
    else { a.leftAt = null; save(); wake(); tick(); }
  });
  /* Sayfa yeniden açıldığında yarım kalan çalışma (şarj bitti, uygulama kapandı) */
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
  function beep() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18].forEach(function (d, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.frequency.value = i ? 1320 : 880; o.type = 'square'; g.gain.value = 0.06;
        o.connect(g); g.connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + 0.12);
      });
    } catch (e) {}
  }

  /* ================= Sunucu ================= */
  var sb = null, user = null, ready = null, syncing = false;
  function me() { return user ? user.id : 'me'; }
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function server() {
    if (!SERVER) return Promise.reject(new Error('yerel'));
    if (ready) return ready;
    ready = (window.supabase ? Promise.resolve() : loadScript(SUPA_JS)).then(function () {
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
      return sb.auth.getSession();
    }).then(function (r) {
      user = r.data && r.data.session ? r.data.session.user : null;
      if (user) return user;
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
          if (st.blocks.some(function (b) { return !b.synced; })) return null;
        });
    }).then(function () { return refreshTeam(); })
      .catch(function (e) { console.warn('senkron', e); })
      .then(function () { syncing = false; renderSync(); if (route() === 'calis') renderTimer(); });
  }
  window.addEventListener('online', sync);
  window.addEventListener('offline', renderSync);
  function renderSync() {
    var el = $('sync'), wait = st.blocks.filter(function (b) { return !b.synced; }).length;
    if (TEST) { el.textContent = 'Test modu'; el.className = 'sync off'; return; }
    if (!SERVER) { el.textContent = 'Yerel mod · cihazda kayıtlı'; el.className = 'sync local'; return; }
    if (!navigator.onLine) { el.textContent = 'Çevrimdışı · ' + wait + ' kare bekliyor'; el.className = 'sync off'; return; }
    if (syncing) { el.textContent = 'Kaydediliyor...'; el.className = 'sync wait'; return; }
    if (wait) { el.textContent = wait + ' kare gönderilecek'; el.className = 'sync wait'; return; }
    el.textContent = 'Her şey kayıtlı'; el.className = 'sync ok';
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
    var owners = s.opened.map(function (id) { return col[id] || '#999999'; });
    drawCanvas(cv, t.side, Math.min(s.opened.length, t.cells), 'team:' + t.id, owners);
  }

  /* ================= Sayfalar ================= */
  function route() { var h = location.hash.replace(/^#\/?/, '').split('?')[0]; return h || 'calis'; }
  function render() {
    var r = route();
    if (!st.profile && r !== 'pixel') r = 'profil';
    if (st.active && st.active.kind !== 'break' && r !== 'calis') { r = 'calis'; if (location.hash !== '#/') history.replaceState(null, '', '#/'); }
    Array.prototype.forEach.call(document.querySelectorAll('#tabs a'), function (a) { a.classList.toggle('on', a.getAttribute('data-r') === r); });
    ({ calis: renderWork, ekip: renderTeam, siralama: renderBoard, profil: renderProfile, pixel: renderPixel }[r] || renderWork)();
    renderHello(); renderSync(); window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  function renderHello() {
    var p = st.profile, el = $('hello');
    if (!p) { el.innerHTML = '<div><strong>Çalış, Pixel\'i ortaya çıkar!</strong><small>Her 25 dakika, Pixel\'den bir kare.</small></div>'; return; }
    var n = todayCount();
    el.innerHTML = '<div><strong>Merhaba, ' + esc(p.nickname) + '!</strong><small>Bugün ' + n + ' kare · toplam ' + okBlocks().length + ' kare</small></div>' + birdBox(p.bird, p.color, 'av');
  }

  /* ---------- Çalış ---------- */
  function renderWork() {
    var P = personal();
    $('view').innerHTML =
      '<div class="cols">' +
      '<section class="box"><h2>Pixel\'in Tuvali <small>Tuval ' + st.canvasNo + ' · <span id="pprog">' + P.opened + ' / ' + CELLS + '</span></small></h2><div class="in">' +
      '<canvas id="pcanvas" class="pt" aria-label="Kişisel tuval"></canvas>' +
      '<div class="barwrap"><div class="bar" id="pbar" style="width:' + (P.opened / CELLS * 100) + '%"></div></div>' +
      '<div id="nextwrap"></div></div></section>' +
      '<div class="stack timer">' +
      '<section class="box"><h2>Zamanlayıcı</h2><div class="in">' +
      '<div class="seg" id="seg"><button data-m="pomodoro">Pomodoro</button><button data-m="kronometre">Kronometre</button></div>' +
      '<div class="mode" id="mode"></div><div class="clock" id="clock"></div><div class="sub" id="sub"></div>' +
      '<button id="bStart" class="btn primary"></button>' +
      '<button id="bBreak" class="btn blue" hidden></button>' +
      '<button id="bStop" class="btn ghost" hidden></button>' +
      '<p id="rule" class="rule" hidden><b>Dikkat:</b> Çalışırken uygulamadan çıkarsan ya da ekranı kapatırsan Pixel kaçar. Telefonu ekranı açık şekilde bir kenara bırak.</p>' +
      '<div class="stats"><div><b id="sToday">0</b><span>bugün</span></div><div><b id="sTotal">0</b><span>toplam kare</span></div><div><b id="sHours">0</b><span>saat</span></div></div>' +
      (TEST ? '<span class="testtag">TEST MODU · 1 sn = 25 dk</span>' : '') +
      '<p class="tip" id="tip"></p>' +
      '</div></section>' +
      (st.team ? '<section class="box"><h2 class="green">' + esc(st.team.name) + '</h2><div class="in small">Açtığın her kare ekip tuvaline de ekleniyor. <a href="#/ekip">Ekip tuvaline bak »</a></div></section>' : '') +
      '</div></div>';
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
    if (!$('clock')) { document.body.classList.toggle('focus', !!st.active && st.active.kind !== 'break'); return; }
    var a = st.active, P = personal(), working = a && a.kind !== 'break';
    document.body.classList.toggle('focus', !!working);
    Array.prototype.forEach.call($('seg').children, function (b) { b.classList.toggle('on', b.getAttribute('data-m') === st.mode); b.disabled = !!a; });
    var watch = st.mode === 'kronometre';
    $('mode').textContent = !a ? (P.full ? 'Pixel tamamlandı!' : 'Hazır') : a.kind === 'break' ? (a.long ? 'Uzun mola' : 'Mola') : a.kind === 'watch' ? 'Kronometre' : 'Odak';
    $('bStart').hidden = !!a || P.full;
    $('bStart').textContent = watch ? 'Kronometreyi Başlat' : 'Pomodoro Başlat';
    $('bBreak').hidden = !!a || P.full || !st.breakDue || st.mode !== 'pomodoro';
    $('bBreak').textContent = (st.pomStreak % 4 === 0 ? '15 dk Uzun Mola' : '5 dk Mola');
    $('bStop').hidden = !a;
    $('bStop').textContent = a && a.kind === 'break' ? 'Molayı Bitir' : a && a.kind === 'watch' ? 'Bitir' : 'Vazgeç';
    $('bStop').className = 'btn ' + (a && a.kind === 'watch' ? 'orange' : 'ghost');
    $('rule').hidden = !working;
    $('tip').innerHTML = watch
      ? '<b>Kronometre:</b> Saat ileri sayar. Kesintisiz geçen her 25 dakikada bir kare açılır. Bitir dediğinde yarım kalan süre sayılmaz.'
      : '<b>Pomodoro:</b> 25 dakika çalış, bir kare aç, 5 dakika mola ver. Her 4 pomodoroda bir 15 dakika uzun mola.';
    $('sToday').textContent = todayCount();
    $('sTotal').textContent = okBlocks().length;
    $('sHours').textContent = hours(okBlocks().length);
    $('pprog').textContent = P.opened + ' / ' + CELLS;
    $('pbar').style.width = (P.opened / CELLS * 100) + '%';
    $('nextwrap').innerHTML = P.full
      ? '<div class="info" style="margin-top:10px"><b>Pixel ortaya çıktı!</b> Bu tuvali bitirdin. ' +
        (P.canNext ? '' : '') + '<button class="btn primary" id="bNext">Yeni Tuvale Başla</button><button class="btn orange" id="bCard2">Sezon Kartımı Oluştur</button></div>'
      : '';
    if ($('bNext')) $('bNext').addEventListener('click', function () { st.canvasNo++; save(); pulseIdx = -1; renderTimer(); drawAll(); });
    if ($('bCard2')) $('bCard2').addEventListener('click', seasonCard);
    paintClock(); drawAll();
  }
  function paintClock() {
    var c = $('clock'); if (!c) return;
    var a = st.active, sub = $('sub'), now = Date.now();
    c.classList.remove('long');
    if (!a) { c.textContent = st.mode === 'kronometre' ? '0:00' : mmss(BLOCK_MS); sub.textContent = st.mode === 'kronometre' ? 'Her 25 dakika = 1 kare' : '25 dakika = 1 kare'; return; }
    if (a.kind === 'watch') {
      var el = now - a.start; c.textContent = hms(el); if (el >= 3600e3) c.classList.add('long');
      sub.textContent = 'Sonraki kareye ' + mmss(BLOCK_MS - el % BLOCK_MS) + (a.credited ? ' · bu oturumda ' + a.credited + ' kare' : '');
      return;
    }
    c.textContent = mmss(a.end - now);
    sub.textContent = a.kind === 'break' ? 'Biraz su iç, gözlerini dinlendir.' : 'Bitince bir kare açılacak';
  }

  /* ---------- Ekibim ---------- */
  function renderTeam() {
    var v = $('view');
    if (!SERVER) {
      v.innerHTML = '<div class="cols"><section class="box"><h2>Ekibim</h2><div class="in"><p class="info">Ekipler, herkesin aynı tuvali birlikte açtığı ortak bir alan. Bunun için sitenin sunucuya bağlı olması gerekiyor.' +
        (TEST ? ' Test modunda ekipler kapalı.' : ' Sunucu bağlanınca bu sayfa açılacak.') + '</p>' + teamHowTo() + '</div></section><div></div></div>';
      return;
    }
    if (!st.team) {
      var code = st.pendingJoin || '';
      v.innerHTML = '<div class="cols">' +
        '<section class="box"><h2>Ekip Kur</h2><div class="in form">' + teamHowTo() +
        '<label>Ekip adı</label><input type="text" id="tName" maxlength="30" placeholder="örn. Gece Kuşları">' +
        '<label>Kaç kişisiniz? <small>(2-10)</small></label><select id="tSize">' + [2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<option' + (n === 4 ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>' +
        '<p class="small muted" id="tCalc" style="margin-top:6px"></p>' +
        '<button class="btn primary" id="tCreate">Ekibi Kur</button></div></section>' +
        '<section class="box first"><h2 class="orange">Ekibe Katıl</h2><div class="in form">' +
        '<label>Davet kodu</label><input type="text" id="tCode" maxlength="6" value="' + esc(code) + '" placeholder="örn. G3JN49" style="text-transform:uppercase;letter-spacing:3px;font-weight:bold">' +
        '<button class="btn orange" id="tJoin">Katıl</button>' +
        '<p class="small muted" style="margin-top:8px">Kodu ekibi kuran arkadaşından al. Bir seferde tek ekipte olabilirsin.</p></div></section></div>';
      var calc = function () { var n = +$('tSize').value, s = Math.round(16 * Math.sqrt(n)); $('tCalc').textContent = 'Ekip tuvali ' + s * s + ' kare olacak. Herkes günde 4 saat çalışırsa yaklaşık 1 ayda Pixel ortaya çıkar.'; };
      $('tSize').addEventListener('change', calc); calc();
      $('tCreate').addEventListener('click', function () {
        var name = $('tName').value.trim(); if (name.length < 2) return toast('Ekibe bir ad ver.', 'bad');
        busy(this); server().then(function () { return st.profileSynced ? null : pushProfile(); })
          .then(function () { return sb.rpc('create_team', { p_name: name, p_size: +$('tSize').value }).then(chk); })
          .then(function () { return refreshTeam(); }).then(function () { toast('Ekip kuruldu! Kodu arkadaşlarına gönder.', 'good'); renderTeam(); })
          .catch(function (e) { toast(errText(e), 'bad'); renderTeam(); });
      });
      $('tJoin').addEventListener('click', function () {
        var c = $('tCode').value.trim().toUpperCase(); if (c.length !== 6) return toast('Davet kodu 6 karakter olmalı.', 'bad');
        busy(this); server().then(function () { return st.profileSynced ? null : pushProfile(); })
          .then(function () { return sb.rpc('join_team', { p_code: c }).then(chk); })
          .then(function () { st.pendingJoin = null; save(); return refreshTeam(); }).then(function () { toast('Ekibe katıldın!', 'good'); renderTeam(); })
          .catch(function (e) { toast(errText(e), 'bad'); renderTeam(); });
      });
      return;
    }
    var t = st.team, s = st.teamState || { members: [], opened: [] }, opened = Math.min(s.opened.length, t.cells);
    var link = location.origin + location.pathname + '?ekip=' + t.code;
    v.innerHTML = '<div class="cols">' +
      '<section class="box"><h2>' + esc(t.name) + ' <small>' + opened + ' / ' + t.cells + ' kare</small></h2><div class="in">' +
      '<canvas id="tcanvas" class="pt" aria-label="Ekip tuvali"></canvas>' +
      '<div class="barwrap"><div class="bar" style="width:' + (opened / t.cells * 100) + '%"></div></div>' +
      '<p class="small muted" style="margin-top:8px">Karelerin çerçeve rengi, o kareyi açan arkadaşının rengi. Bir kareye dokunursan kimin açtığını görürsün.</p></div></section>' +
      '<div class="stack">' +
      '<section class="box"><h2 class="orange">Davet Et</h2><div class="in" style="text-align:center"><div class="code">' + esc(t.code) + '</div>' +
      '<p class="small muted" style="margin-top:8px">' + s.members.length + ' / ' + t.size + ' kişi</p>' +
      (s.members.length < t.size ? '<button class="btn orange" id="tShare">Davet Linkini Gönder</button>' : '<p class="info small" style="margin-top:8px">Ekip dolu.</p>') + '</div></section>' +
      '<section class="box"><h2 class="green">Üyeler</h2><div class="in" style="padding:0"><table class="list"><tbody>' +
      s.members.slice().sort(function (a, b) { return b.count - a.count; }).map(function (m) {
        return '<tr' + (m.id === me() ? ' class="me"' : '') + '><td><div class="who">' + birdBox(m.bird, m.color) + '<div>' + esc(m.nickname) + '</div></div></td><td class="num">' + m.count + ' kare</td></tr>';
      }).join('') + '</tbody></table></div></section>' +
      '<button class="btn ghost" id="tLeave">Ekipten Ayrıl</button></div></div>';
    drawAll();
    $('tcanvas').addEventListener('click', function (e) {
      var m = this._meta; if (!m) return;
      var r = this.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * m.side), y = Math.floor((e.clientY - r.top) / r.height * m.side);
      var idx = m.order.indexOf(y * m.side + x);
      if (idx < 0 || idx >= m.opened) return toast('Bu kare henüz açılmadı.');
      var uid = s.opened[idx], mem = s.members.filter(function (q) { return q.id === uid; })[0];
      toast((mem ? mem.nickname : (uid === 'me' && st.profile ? st.profile.nickname : 'Biri')) + ' açtı.');
    });
    if ($('tShare')) $('tShare').addEventListener('click', function () {
      var text = 'PixelTime\'da "' + t.name + '" ekibine katıl! Birlikte çalışıp Pixel\'i ortaya çıkaralım. Davet kodu: ' + t.code;
      if (navigator.share) navigator.share({ title: 'PixelTime', text: text, url: link }).catch(function () {});
      else { copy(text + ' ' + link); toast('Davet linki kopyalandı.', 'good'); }
    });
    $('tLeave').addEventListener('click', function () {
      if (!confirm('Ekipten ayrılmak istediğine emin misin? Açtığın kareler ekip tuvalinde kalır.')) return;
      busy(this); sb.rpc('leave_team').then(chk).then(function () { st.team = null; st.teamState = null; save(); renderTeam(); })
        .catch(function (e) { toast(errText(e), 'bad'); renderTeam(); });
    });
  }
  function teamHowTo() {
    return '<p class="small" style="margin-bottom:6px"><b>Nasıl çalışır?</b> Ekip kurduğunda kişi sayısına göre büyük bir Pixel tuvali açılır. Ekipteki herkesin açtığı her kare bu tuvale eklenir. Ekip ne kadar kalabalıksa Pixel o kadar büyük ve detaylı çıkar.</p>';
  }

  /* ---------- Sıralama ---------- */
  var board = { scope: 'kisi', period: 'hafta' };
  function renderBoard() {
    var v = $('view');
    var scopes = [['kisi', 'Kişiler'], ['okul', 'Okullar'], ['sehir', 'Şehirler'], ['ekip', 'Ekipler']];
    var periods = [['hafta', 'Bu hafta'], ['ay', 'Bu ay'], ['hepsi', 'Tüm zamanlar']];
    v.innerHTML = '<section class="box"><h2>Sıralama <small>Türkiye geneli</small></h2><div class="in">' +
      '<div class="seg" id="bScope">' + scopes.map(function (s) { return '<button data-v="' + s[0] + '"' + (board.scope === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>'; }).join('') + '</div>' +
      '<div class="seg" id="bPeriod">' + periods.map(function (s) { return '<button data-v="' + s[0] + '"' + (board.period === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>'; }).join('') + '</div>' +
      '<div id="bList"></div></div></section>';
    $('bScope').addEventListener('click', function (e) { var x = e.target.getAttribute('data-v'); if (x) { board.scope = x; renderBoard(); } });
    $('bPeriod').addEventListener('click', function (e) { var x = e.target.getAttribute('data-v'); if (x) { board.period = x; renderBoard(); } });
    var out = $('bList');
    if (!SERVER) { out.innerHTML = '<p class="info">Sıralamalar, sitenin sunucuya bağlı olmasıyla açılır.' + (TEST ? ' Test modunda kapalı.' : '') + ' Şimdilik kendi istatistiklerin: <b>' + okBlocks().length + ' kare</b>, <b>' + hours(okBlocks().length) + ' saat</b>.</p>'; return; }
    out.innerHTML = '<p class="muted">Yükleniyor...</p>';
    var since = new Date(), d = since.getDay();
    if (board.period === 'hafta') { since.setDate(since.getDate() - (d === 0 ? 6 : d - 1)); since.setHours(0, 0, 0, 0); }
    else if (board.period === 'ay') { since.setDate(1); since.setHours(0, 0, 0, 0); }
    else since = new Date(2020, 0, 1);
    server().then(function () { return sb.rpc('leaderboard', { p_scope: board.scope, p_since: since.toISOString() }).then(chk); })
      .then(function (rows) {
        if (!rows || !rows.length) { out.innerHTML = '<p class="info">Bu dönemde henüz kimse kare açmamış. İlk sen ol!</p>'; return; }
        var mine = st.profile ? (board.scope === 'kisi' ? st.profile.nickname : board.scope === 'okul' ? st.profile.school : board.scope === 'sehir' ? st.profile.city : st.team && st.team.name) : null;
        out.innerHTML = '<table class="list"><thead><tr><th>#</th><th>' + { kisi: 'Kişi', okul: 'Okul', sehir: 'Şehir', ekip: 'Ekip' }[board.scope] + '</th><th style="text-align:right">Kare</th></tr></thead><tbody>' +
          rows.map(function (r, i) {
            var isMe = mine && String(mine).toLocaleLowerCase('tr') === String(r.label).toLocaleLowerCase('tr');
            return '<tr' + (isMe ? ' class="me"' : '') + '><td class="rank">' + (i + 1) + '</td><td><div class="who">' + (r.bird ? birdBox(r.bird, r.color) : '') +
              '<div>' + esc(r.label) + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div></div></td><td class="num">' + r.total + '<small class="muted" style="display:block;font-weight:normal">' + hours(r.total) + ' saat</small></td></tr>';
          }).join('') + '</tbody></table>';
      }).catch(function (e) { out.innerHTML = '<p class="info">Sıralama şu an yüklenemedi. İnternet bağlantını kontrol et.</p>'; console.warn(e); });
  }

  /* ---------- Profil ---------- */
  function renderProfile() {
    var p = st.profile || { nickname: '', bird: 'muhabbet-gri', color: '#5f78b0', exam: '', city: '', school: '' };
    var first = !st.profile;
    var draft = { bird: p.bird, color: p.color };
    $('view').innerHTML = '<div class="cols">' +
      '<section class="box"><h2>' + (first ? 'PixelTime\'a Hoş Geldin!' : 'Profilim') + '</h2><div class="in form">' +
      (first ? '<p class="info">Birkaç küçük bilgiyle başlayalım. Gerçek adını yazmana gerek yok, takma ad yeterli.</p>' : '') +
      '<label>Takma adın</label><input type="text" id="fNick" maxlength="20" value="' + esc(p.nickname) + '" placeholder="örn. Mühendis" autocomplete="off">' +
      '<label>Kuşunu seç</label><div class="birds" id="fBirds">' + BIRDS.list.map(function (b) {
        return '<button type="button" data-b="' + b.id + '"' + (b.id === p.bird ? ' class="on"' : '') + ' title="' + esc(b.name) + '">' + BIRDS.svg(b.id) + esc(b.name) + '</button>';
      }).join('') + '</div>' +
      '<label>Kare rengin <small>(sıralamada ve ekip tuvalinde kuşunun çerçevesi)</small></label><div class="colors" id="fColors">' +
      DATA.colors.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '"' + (c === p.color ? ' class="on"' : '') + ' aria-label="' + c + '"></button>'; }).join('') +
      '<input type="color" id="fColor" value="' + esc(p.color) + '" title="İstediğin rengi seç"></div>' +
      '<div class="preview"><span class="av" id="fAv"></span><div><b id="fPrevName"></b><div class="small muted" id="fPrevBird"></div></div></div>' +
      '<label>Hangi sınava hazırlanıyorsun? <small>(isteğe bağlı)</small></label><select id="fExam"><option value="">Seçme</option>' + DATA.exams.map(function (x) { return '<option' + (x === p.exam ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
      '<div class="row2"><div><label>Şehir <small>(isteğe bağlı)</small></label><select id="fCity"><option value="">Seçme</option>' + DATA.cities.map(function (x) { return '<option' + (x === p.city ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div><label>Okul <small>(isteğe bağlı)</small></label><input type="text" id="fSchool" maxlength="80" value="' + esc(p.school) + '" placeholder="örn. Ankara Fen Lisesi"></div></div>' +
      '<p class="small muted" style="margin-top:6px">Şehir ve okul, sıralamalarda okulunu ve şehrini temsil etmen için. Boş bırakabilirsin.</p>' +
      '<button class="btn primary" id="fSave">' + (first ? 'Başla!' : 'Kaydet') + '</button></div></section>' +
      '<div class="stack">' + (first ? pixelStory() : statsBox()) + '</div></div>';
    function prev() {
      $('fAv').innerHTML = BIRDS.svg(draft.bird); $('fAv').style.borderColor = draft.color;
      $('fPrevName').textContent = $('fNick').value.trim() || 'Takma adın';
      $('fPrevBird').textContent = (BIRDS.get(draft.bird) || {}).name || '';
    }
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
      st.profileSynced = false; save();
      if (SERVER) pushProfile().then(sync).catch(function (e) { console.warn(e); });
      toast(first ? 'Hoş geldin, ' + nick + '! İlk kareni açmaya hazırsın.' : 'Profil kaydedildi.', 'good');
      go(first && st.pendingJoin && SERVER ? '#/ekip' : first ? '#/' : location.hash || '#/');
    });
    if ($('bCard')) $('bCard').addEventListener('click', seasonCard);
    prev();
  }
  function stats() {
    var b = okBlocks(), days = {}, best = 0, bestDay = null;
    b.forEach(function (x) { var d = dayKey(x.started_at); days[d] = (days[d] || 0) + 1; });
    Object.keys(days).forEach(function (d) { if (days[d] > best) { best = days[d]; bestDay = d; } });
    var streak = 0, cur = new Date(); if (!days[dayKey(cur)]) cur.setDate(cur.getDate() - 1);
    while (days[dayKey(cur)]) { streak++; cur.setDate(cur.getDate() - 1); }
    var watch = b.filter(function (x) { return x.mode === 'kronometre'; }).length;
    return { total: b.length, hours: hours(b.length), best: best, bestDay: bestDay, streak: streak, days: Object.keys(days).length, watch: watch, canvases: Math.floor(b.length / CELLS), fails: st.fails };
  }
  function statsBox() {
    var s = stats();
    return '<section class="box"><h2 class="green">İstatistiklerim</h2><div class="in"><table class="list"><tbody>' +
      '<tr><td>Toplam kare</td><td class="num">' + s.total + '</td></tr>' +
      '<tr><td>Toplam çalışma</td><td class="num">' + s.hours + ' saat</td></tr>' +
      '<tr><td>Seri</td><td class="num">' + s.streak + ' gün</td></tr>' +
      '<tr><td>En verimli gün</td><td class="num">' + s.best + ' kare</td></tr>' +
      '<tr><td>Tamamlanan Pixel</td><td class="num">' + s.canvases + '</td></tr>' +
      '<tr><td>Kaçan Pixel</td><td class="num">' + s.fails + '</td></tr>' +
      '</tbody></table><button class="btn orange" id="bCard">Sezon Kartımı Oluştur</button></div></section>';
  }
  function pixelStory() {
    return '<section class="box"><h2 class="orange">PixelTime nedir?</h2><div class="in small">' +
      '<p>Çalıştığın her <b>25 dakika</b>, Pixel\'in tuvalinden bir kare açar. Bütün kareleri açınca Pixel ortaya çıkar.</p>' +
      '<p><b>Pomodoro</b> ya da <b>kronometre</b> ile çalışabilirsin. Çalışırken uygulamadan çıkarsan Pixel kaçar, o kare açılmaz.</p>' +
      '<p>Arkadaşlarınla <b>ekip</b> kurup büyük bir tuvali birlikte açabilir, okulunu ve şehrini <b>sıralamada</b> yukarı taşıyabilirsin.</p></div></section>';
  }

  /* ---------- Pixel'in anısına ---------- */
  function renderPixel() {
    $('view').innerHTML = '<section class="box" style="max-width:560px;margin:0 auto"><h2>Pixel\'in anısına</h2><div class="in" style="text-align:center">' +
      '<img src="logo.svg" alt="Pixel" style="width:220px;max-width:70%;margin:6px auto 10px;display:block">' +
      '<p>PixelTime, adını sahibinin kuşu <b>Pixel</b>\'den alıyor.</p><p class="muted">Bu sitede açılan her kare, onu biraz daha ortaya çıkarıyor.</p>' +
      '<a class="btn primary" href="#/" style="max-width:260px;margin:14px auto 0">Çalışmaya Dön</a></div></section>';
  }

  /* ================= Sezon kartı ================= */
  function seasonCard() {
    var p = st.profile; if (!p) return;
    var s = stats(), W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'), F = '"Trebuchet MS",Verdana,Arial,sans-serif';
    var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#6ab6ee'); bg.addColorStop(0.5, '#2a80c8'); bg.addColorStop(1, '#16507f');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.07)'; for (var i = 0; i < 22; i++) g.fillRect(0, i * 90, W, 40);
    function rr(x, y, w, h, r, fill, stroke) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 6; g.stroke(); } }
    g.textAlign = 'center'; g.fillStyle = '#fff';
    g.font = 'bold 84px ' + F; g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 10; g.fillText('PixelTime', W / 2, 150);
    g.font = 'bold 40px ' + F; g.fillStyle = '#ffd23f'; g.fillText('SEZON ' + SEASON + ' KARTIM', W / 2, 215); g.shadowBlur = 0;
    rr(90, 270, W - 180, 1480, 36, '#ffffff');
    var birdImg = new Image();
    birdImg.onload = function () {
      rr(W / 2 - 150, 320, 300, 300, 28, '#e3ebf3', p.color);
      g.drawImage(birdImg, W / 2 - 140, 330, 280, 280);
      g.fillStyle = '#23384d'; g.font = 'bold 72px ' + F; g.fillText(p.nickname, W / 2, 710);
      g.fillStyle = '#5d7387'; g.font = '36px ' + F; g.fillText([p.exam, p.city].filter(Boolean).join(' · ') || (BIRDS.get(p.bird) || {}).name, W / 2, 765);
      var rows = [[s.total, 'kare açtım'], [s.hours, 'saat çalıştım'], [s.streak, 'günlük seri'], [s.best, 'kare en iyi günümde']];
      rows.forEach(function (r, i) {
        var x = 150 + (i % 2) * 400, y = 830 + Math.floor(i / 2) * 230;
        rr(x, y, 380, 200, 24, '#eef6fc');
        g.fillStyle = '#1d5f9c'; g.font = 'bold 96px ' + F; g.fillText(String(r[0]), x + 190, y + 112);
        g.fillStyle = '#5d7387'; g.font = '32px ' + F; g.fillText(r[1], x + 190, y + 165);
      });
      var mini = document.createElement('canvas'); var P = personal();
      drawCanvas(mini, N, s.total >= CELLS * st.canvasNo ? CELLS : P.opened, P.seed);
      g.drawImage(mini, W / 2 - 170, 1300, 340, 340);
      g.fillStyle = '#5d7387'; g.font = '32px ' + F;
      g.fillText(s.canvases ? s.canvases + ' kez Pixel\'i ortaya çıkardım!' : 'Pixel\'in %' + Math.round(P.opened / CELLS * 100) + '\'ini ortaya çıkardım', W / 2, 1700);
      g.fillStyle = '#fff'; g.font = 'bold 40px ' + F; g.fillText(st.team ? 'Ekibim: ' + st.team.name : 'Sen de katıl!', W / 2, 1830);
      g.font = '30px ' + F; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(location.host + location.pathname.replace(/index\.html$/, ''), W / 2, 1880);
      showCard(c);
    };
    birdImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BIRDS.svg(p.bird, 280));
  }
  function showCard(c) {
    var url = c.toDataURL('image/png'), m = $('modal');
    m.innerHTML = '<section class="box"><h2 class="orange">Sezon Kartın <a href="#" id="mClose" style="color:#fff;text-decoration:none;font-size:18px">✕</a></h2><div class="in">' +
      '<img src="' + url + '" alt="Sezon kartı"><button class="btn primary" id="mShare">Paylaş</button><a class="btn ghost" download="pixeltime-sezon-kartim.png" href="' + url + '">Resmi İndir</a></div></section>';
    m.hidden = false;
    $('mClose').addEventListener('click', function (e) { e.preventDefault(); m.hidden = true; m.innerHTML = ''; });
    m.addEventListener('click', function (e) { if (e.target === m) { m.hidden = true; m.innerHTML = ''; } });
    $('mShare').addEventListener('click', function () {
      c.toBlob(function (blob) {
        var file = new File([blob], 'pixeltime-sezon-kartim.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'PixelTime', text: 'PixelTime sezon kartım!' }).catch(function () {});
        else { var a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); toast('Kart indirildi. Hikâyende paylaşabilirsin!', 'good'); }
      });
    });
  }

  /* ================= Küçük yardımcılar ================= */
  function go(h) { if (location.hash === h || (h === '#/' && !location.hash)) render(); else location.hash = h; }
  function busy(btn) { btn.disabled = true; btn.textContent = 'Bekle...'; }
  function copy(t) { try { navigator.clipboard.writeText(t); } catch (e) {} }
  function errText(e) {
    var m = (e && (e.message || e.error_description)) || '';
    var map = { 'zaten bir ekiptesin': 'Zaten bir ekiptesin.', 'ekip bulunamadi': 'Bu kodla bir ekip bulunamadı.', 'ekip dolu': 'Bu ekip dolu.', 'profil yok': 'Önce profilini kaydet.', 'giris gerekli': 'Bağlantı kurulamadı, tekrar dene.', 'ekip 2-10 kisi olmali': 'Ekip 2-10 kişi olmalı.' };
    for (var k in map) if (m.indexOf(k) >= 0) return map[k];
    if (!navigator.onLine) return 'İnternet yok. Bağlanınca tekrar dene.';
    return 'Bir sorun oldu, tekrar dene.';
  }

  /* ================= Başlat ================= */
  var q = location.search.match(/[?&]ekip=([A-Za-z0-9]{6})/);
  if (q) { st.pendingJoin = q[1].toUpperCase(); save(); if (!st.team) location.hash = '#/ekip'; }
  (function () {   /* BETA rozetine 5 kez dokun: test modu aç/kapat */
    var n = 0, t = 0, el = document.querySelector('.beta'); if (!el) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', function () {
      var now = Date.now(); n = now - t < 800 ? n + 1 : 1; t = now;
      if (n >= 5) { try { localStorage.setItem('pt_test', TEST ? '0' : '1'); } catch (e) {} toast(TEST ? 'Test modu kapandı' : 'Test modu açıldı'); setTimeout(function () { location.href = location.pathname; }, 700); }
    });
  })();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0 && !TEST) navigator.serviceWorker.register('sw.js').catch(function () {});
  render();
  if (SERVER && st.profile) sync();
})();

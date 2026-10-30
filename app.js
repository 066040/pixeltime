/* PixelTime — kişisel tuval (çevrimdışı çalışır) */
(function () {
  'use strict';

  /* ---------- Ayarlar ---------- */
  var TEST = /[?&]test\b/.test(location.search);   // adresin sonuna ?test eklenirse: 1 sn pomodoro, 2 sn mola, 16 kare
  var POMO_MS = TEST ? 1e3 : 25 * 60e3;
  var BREAK_MS = TEST ? 2e3 : 5 * 60e3;
  var LEAVE_GRACE_MS = 2000;                           // çok kısa kesintiye tolerans
  var DAILY_MAX = TEST ? 9999 : 28;                                 // günde en fazla 28 pomodoro (~12 saat)
  var KEY = 'pixeltime_v1';

  /* Sunucu (Supabase) henüz bağlı değil. Bağlanınca bu fonksiyon gönderecek. */
  function sendToServer(sessions) {
    return Promise.resolve(false);                     // false = gönderilmedi, sırada kalsın
  }

  /* ---------- Pixel, 16x16 ---------- */
  var PAL = { '.': '#e3ebf3', G: '#c3c9cf', D: '#8f969e', W: '#eef0f2', L: '#dce0e4', K: '#262a30', S: '#e9ebee',
    E: '#111317', B: '#cbbd9c', C: '#8ea2cc', Q: '#5f78b0', T: '#2c313a', R: '#6b4a31', r: '#8b6545',
    F: '#efb7a8', V: '#6e9a48', v: '#8fbd63', s: '#2a2d32' };
  var ART = [
    '................',
    '......DDDD......',
    '.....GGGGGG.....',
    '....WWEDDDDD....',
    '...CWWWGGGGGG...',
    '..BBWWWDDKKKD...',
    '..BWQWWGKSKKG...',
    '...BWWWLKKSKKG..',
    '....sWsLKSKKSG..',
    '.....LLLLKSKKKG.',
    '.....LLLLGKKSKG.',
    '......LLLGKSKKK.',
    '......FLFGKKKT.v',
    'rrrrrrFrFrrKTrVv',
    'RRRRRRRRRRRTTRR.',
    '...........TT...'
  ];
  var N = TEST ? 4 : 16, CELLS = N * N;   // test: 4x4 = 16 kare, normal: 16x16 = 256 kare

  /* ---------- Kayıt ---------- */
  function fresh() { return { canvas: 1, order: shuffle(), revealed: 0, done: 0, sessions: [], queue: [], active: null, finished: 0 }; }
  function shuffle() {
    var a = []; for (var i = 0; i < CELLS; i++) a.push(i);
    for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; }
    return a;
  }
  var st;
  try { st = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { st = fresh(); }
  if (!st.order || st.order.length !== CELLS) { st.order = shuffle(); st.revealed = Math.min(st.revealed || 0, CELLS); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  /* ---------- Yardımcılar ---------- */
  function $(id) { return document.getElementById(id); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function dayOf(t) { var d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function todayCount() { var t = today(); return st.sessions.filter(function (s) { return s.ok && dayOf(s.start) === t; }).length; }
  function mmss(ms) { ms = Math.max(0, Math.ceil(ms / 1000)); var m = Math.floor(ms / 60), s = ms % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function toast(msg, kind) {
    var el = $('toast'); el.textContent = msg; el.className = 'toast show ' + (kind || '');
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.className = 'toast'; }, 4000);
  }

  /* ---------- Tuval ---------- */
  var cv = $('canvas'), cx = cv.getContext('2d'), CELL = 640 / N, GAP = N > 8 ? 3 : 6, lastNew = -1, pulse = 0;
  cv.width = cv.height = N * CELL;

  /* Gerçek Pixel çizimi: kareler bu resmin parçalarını açar */
  var full = document.createElement('canvas'), fullReady = false;
  full.width = full.height = N * CELL;
  (function () {
    var img = new Image();
    img.onload = function () {
      var g = full.getContext('2d'), S = full.width;
      g.fillStyle = '#e3ebf3'; g.fillRect(0, 0, S, S);
      var w = S * 0.92, h = w * img.height / img.width;          // ortala, alttan biraz pay bırak
      g.drawImage(img, (S - w) / 2, (S - h) / 2 + S * 0.02, w, h);
      fullReady = true; draw();
    };
    img.src = 'logo.svg';
  })();
  function draw() {
    var shown = {};
    for (var i = 0; i < st.revealed; i++) shown[st.order[i]] = true;
    cx.clearRect(0, 0, cv.width, cv.height);
    for (var p = 0; p < CELLS; p++) {
      var x = p % N, y = Math.floor(p / N);
      if (shown[p]) {
        if (fullReady) cx.drawImage(full, x * CELL, y * CELL, CELL, CELL, x * CELL, y * CELL, CELL, CELL);
        else { cx.fillStyle = N === 16 ? PAL[ART[y][x]] : '#c3c9cf'; cx.fillRect(x * CELL, y * CELL, CELL, CELL); }
      } else {
        cx.fillStyle = document.body.classList.contains('focus') ? '#262b31' : '#ece6dc';
        cx.fillRect(x * CELL + GAP / 2, y * CELL + GAP / 2, CELL - GAP, CELL - GAP);
      }
    }
    if (lastNew >= 0 && pulse > 0) {
      var lx = lastNew % N, ly = Math.floor(lastNew / N);
      cx.strokeStyle = 'rgba(95,120,176,' + pulse + ')'; cx.lineWidth = 3;
      cx.strokeRect(lx * CELL + 1.5, ly * CELL + 1.5, CELL - 3, CELL - 3);
    }
  }
  function animateNew(cell) {
    lastNew = cell; pulse = 1;
    (function step() { pulse -= 0.02; draw(); if (pulse > 0) requestAnimationFrame(step); })();
  }

  /* ---------- Ekranı açık tut ---------- */
  var lock = null;
  function wake() { if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {}); }
  function unwake() { if (lock) { lock.release().catch(function () {}); lock = null; } }

  /* ---------- Pomodoro ---------- */
  function start() {
    if (st.active) return;
    if (st.revealed >= CELLS) return;
    if (todayCount() >= DAILY_MAX) { toast('Bugünlük sınıra ulaştın. Yarın devam!'); return; }
    var now = Date.now();
    st.active = { kind: 'work', start: now, end: now + POMO_MS, leftAt: null };
    save(); wake(); render();
  }
  function startBreak() {
    var now = Date.now();
    st.active = { kind: 'break', start: now, end: now + BREAK_MS, leftAt: null };
    save(); wake(); render();
  }
  function fail(reason) {
    var a = st.active; if (!a) return;
    if (a.kind === 'work') st.sessions.push({ id: a.start, start: a.start, end: Date.now(), ok: false, reason: reason });
    st.active = null; save(); unwake(); render();
    if (a.kind === 'work') toast('Pixel kaçtı! ' + reason, 'bad');
  }
  function giveUp() { if (st.active && st.active.kind === 'break') { st.active = null; save(); unwake(); render(); return; } fail('Pomodoro yarıda bırakıldı.'); }
  function complete() {
    var a = st.active;
    if (a.kind === 'break') { st.active = null; save(); unwake(); render(); toast('Mola bitti. Hazırsan devam!'); return; }
    var s = { id: a.start, start: a.start, end: a.end, ok: true, canvas: st.canvas };
    st.sessions.push(s); st.queue.push(s.id); st.done++;
    var cell = st.order[st.revealed]; st.revealed++;
    st.active = null; save(); unwake(); render(); animateNew(cell);
    if (st.revealed >= CELLS) { st.finished++; save(); toast('Pixel tamamlandı! 🎉', 'good'); }
    else toast('Bir kare açıldı! ' + st.revealed + '/' + CELLS, 'good');
    trySync();
  }
  function newCanvas() {
    st.canvas++; st.order = shuffle(); st.revealed = 0; save(); render();
  }

  /* Uygulamadan çıkma kuralı */
  document.addEventListener('visibilitychange', function () {
    var a = st.active; if (!a || a.kind !== 'work') { if (!document.hidden && st.active) wake(); return; }
    if (document.hidden) { a.leftAt = Date.now(); save(); }
    else {
      if (a.leftAt && Date.now() - a.leftAt > LEAVE_GRACE_MS) fail('Pomodoro sırasında uygulamadan çıkıldı.');
      else { a.leftAt = null; save(); wake(); }
    }
  });

  /* Sayfa kapanıp yeniden açılırsa (şarj bitti, kapatıldı, yenilendi) */
  if (st.active) {
    if (st.active.kind === 'work') {
      var a0 = st.active;
      st.sessions.push({ id: a0.start, start: a0.start, end: Date.now(), ok: false, reason: 'Uygulama kapandı.' });
      setTimeout(function () { toast('Pixel kaçtı! Pomodoro sırasında uygulama kapandı.', 'bad'); }, 300);
    }
    st.active = null; save();
  }

  /* ---------- Senkron ---------- */
  var syncing = false;
  function trySync() {
    if (syncing || !st.queue.length || !navigator.onLine) { renderSync(); return; }
    syncing = true;
    var ids = st.queue.slice(), list = st.sessions.filter(function (s) { return ids.indexOf(s.id) >= 0; });
    sendToServer(list).then(function (ok) {
      if (ok) { st.queue = st.queue.filter(function (id) { return ids.indexOf(id) < 0; }); save(); }
    }).catch(function () {}).then(function () { syncing = false; renderSync(); });
  }
  window.addEventListener('online', trySync);
  window.addEventListener('offline', renderSync);
  function renderSync() {
    var el = $('sync');
    if (!navigator.onLine) { el.textContent = 'Çevrimdışı · ' + st.queue.length + ' pomodoro cihazda bekliyor'; el.className = 'sync off'; }
    else if (st.queue.length) { el.textContent = st.queue.length + ' pomodoro cihazda kayıtlı'; el.className = 'sync wait'; }
    else { el.textContent = 'Her şey kayıtlı'; el.className = 'sync ok'; }
  }

  /* ---------- Ekran ---------- */
  function render() {
    var a = st.active, full = st.revealed >= CELLS;
    document.body.classList.toggle('focus', !!a && a.kind === 'work');
    document.body.classList.toggle('resting', !!a && a.kind === 'break');
    $('progress').textContent = st.revealed + ' / ' + CELLS;
    $('bar').style.width = (st.revealed / CELLS * 100) + '%';
    $('today').textContent = todayCount();
    $('total').textContent = st.done;
    $('hours').textContent = (st.done * 25 / 60).toFixed(1);
    $('canvasNo').textContent = st.canvas;
    $('startBtn').hidden = !!a || full;
    $('stopBtn').hidden = !a;
    $('stopBtn').textContent = a && a.kind === 'break' ? 'Molayı bitir' : 'Vazgeç';
    $('breakBtn').hidden = !!a || full || !st.sessions.length || !st.sessions[st.sessions.length - 1].ok;
    $('newBtn').hidden = !full || !!a;
    $('rule').hidden = !(a && a.kind === 'work');
    $('mode').textContent = !a ? (full ? 'Pixel tamamlandı!' : 'Hazır') : a.kind === 'work' ? 'Odak' : 'Mola';
    tick(); draw(); renderSync();
  }
  function tick() {
    var a = st.active;
    if (!a) { $('clock').textContent = mmss(POMO_MS); return; }
    var left = a.end - Date.now();
    $('clock').textContent = mmss(left);
    if (left <= 0 && !document.hidden) complete();
  }
  setInterval(function () { if (st.active) tick(); }, 250);

  $('startBtn').addEventListener('click', start);
  $('stopBtn').addEventListener('click', giveUp);
  $('breakBtn').addEventListener('click', startBreak);
  $('newBtn').addEventListener('click', newCanvas);
  if (TEST) $('testTag').hidden = false;

  /* Çevrimdışı çalışma için */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});

  render(); trySync();
})();

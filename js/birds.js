/* PixelTime kuş avatarları — Pixel'in çizim tarzında, parametrik SVG */
(function (root) {
  'use strict';

  /* Her kuş: gövde, karın, baş, kanat, kuyruk, gaga renkleri + özellikler */
  var BIRDS = [
    { id: 'muhabbet-yesil', name: 'Muhabbet (yeşil)', body: '#7cc243', belly: '#9ad65e', head: '#f2e14b', wing: '#3d6b22', wingPat: 'scallop', scallop: '#f2e14b', tail: '#2f5aa8', beak: '#e8c98c', beakType: 'hook', cere: '#5c7ed6', cheek: '#4a64c8', spots: true, barHead: true },
    { id: 'muhabbet-mavi', name: 'Muhabbet (mavi)', body: '#5aa6e8', belly: '#7dbcf0', head: '#f4f4f4', wing: '#2b4f7a', wingPat: 'scallop', scallop: '#f4f4f4', tail: '#22417a', beak: '#e8c98c', beakType: 'hook', cere: '#5c7ed6', cheek: '#4a64c8', spots: true, barHead: true },
    { id: 'muhabbet-sari', name: 'Muhabbet (sarı)', body: '#f5dc4c', belly: '#fae67a', head: '#fff1a0', wing: '#d8b43a', wingPat: 'scallop', scallop: '#fff3b0', tail: '#c9a52a', beak: '#e8c98c', beakType: 'hook', cere: '#c9a7ff', cheek: '#e6e6f2', spots: false, barHead: false },
    { id: 'muhabbet-gri', name: 'Muhabbet (gri)', body: '#c3c9cf', belly: '#dce0e4', head: '#eef0f2', wing: '#262a30', wingPat: 'scallop', scallop: '#f3f4f5', tail: '#1f2226', beak: '#cbbd9c', beakType: 'hook', cere: '#8ea2cc', cheek: '#5f78b0', spots: true, barHead: true },
    { id: 'sultan', name: 'Sultan papağanı', body: '#a7a7a3', belly: '#bdbdb8', head: '#f3dc5a', wing: '#8a8a86', wingPat: 'patch', patch: '#f4f4f0', tail: '#7a7a76', beak: '#9a8f86', beakType: 'hook', cheek: '#f08a3c', crest: 'cockatiel', crestColor: '#f3dc5a' },
    { id: 'kanarya', name: 'Kanarya', body: '#ffd83d', belly: '#ffe680', head: '#ffd83d', wing: '#f2c21c', wingPat: 'bars', bars: '#e0ab10', tail: '#e6b416', beak: '#f2d7b0', beakType: 'short' },
    { id: 'jako', name: 'Jako', body: '#9aa0a6', belly: '#b3b8bd', head: '#a9aeb3', wing: '#7d838a', wingPat: 'scallop', scallop: '#b7bcc1', tail: '#d2302b', beak: '#2a2a2a', beakType: 'hook', face: '#eef0f2' },
    { id: 'ara-kirmizi', name: 'Ara (kırmızı)', body: '#d8312c', belly: '#e04a3c', head: '#e23a30', wing: '#2b6fc6', wingPat: 'stripe', stripe: '#f2c230', tail: '#2b6fc6', beak: '#f2ece0', beakType: 'hook', beakTip: '#2a2a2a', face: '#ffffff' },
    { id: 'ara-mavi', name: 'Ara (mavi-sarı)', body: '#2f8fd8', belly: '#f2c230', head: '#2f8fd8', wing: '#2470b8', wingPat: 'stripe', stripe: '#3aa0e8', tail: '#2470b8', beak: '#2a2a2a', beakType: 'hook', face: '#ffffff', crown: '#5cbf3a' },
    { id: 'kakadu', name: 'Kakadu', body: '#f6f6f2', belly: '#ffffff', head: '#f6f6f2', wing: '#e8e8e2', wingPat: 'patch', patch: '#fff2b0', tail: '#e6e6de', beak: '#3a3a3a', beakType: 'hook', crest: 'cockatoo', crestColor: '#f7d43a' },
    { id: 'amazon', name: 'Amazon papağanı', body: '#3fae49', belly: '#5cc463', head: '#3fae49', wing: '#2b8a35', wingPat: 'patch', patch: '#d8312c', tail: '#2b8a35', beak: '#9a8f86', beakType: 'hook', crown: '#f2d43a', face: '#60c8e8' },
    { id: 'lovebird', name: 'Cennet papağanı', body: '#58b848', belly: '#7ccc5c', head: '#f08a3c', wing: '#3e9a34', wingPat: 'none', tail: '#4a7ad8', beak: '#d8312c', beakType: 'hook', face: '#f6c14a' },
    { id: 'karga', name: 'Karga', body: '#2b2d33', belly: '#353840', head: '#25272c', wing: '#1c1e22', wingPat: 'bars', bars: '#3a3e48', tail: '#1c1e22', beak: '#1a1a1a', beakType: 'long' },
    { id: 'kartal', name: 'Kartal', body: '#6b4a31', belly: '#7d5a3e', head: '#f6f4ee', wing: '#4b3222', wingPat: 'scallop', scallop: '#7d5a3e', tail: '#f6f4ee', beak: '#f2c230', beakType: 'raptor', brow: true },
    { id: 'sahin', name: 'Şahin', body: '#a26b3e', belly: '#efe0c8', head: '#8c5a33', wing: '#6b4527', wingPat: 'bars', bars: '#3e2a18', tail: '#a26b3e', beak: '#3a3a3a', beakType: 'raptor', cere: '#f2c230', mask: '#2e2a26', brow: true },
    { id: 'baykus', name: 'Baykuş', body: '#a9845c', belly: '#e8d6b8', head: '#a9845c', wing: '#86643f', wingPat: 'spots', spotC: '#efe2c8', tail: '#86643f', beak: '#5a4a3a', beakType: 'raptor', owl: true, crest: 'tufts', crestColor: '#86643f' },
    { id: 'kar-baykusu', name: 'Kar baykuşu', body: '#f6f6f2', belly: '#ffffff', head: '#f6f6f2', wing: '#e6e6de', wingPat: 'spots', spotC: '#3a3a3a', tail: '#e6e6de', beak: '#3a3a3a', beakType: 'raptor', owl: true, eyeC: '#f2c230' },
    { id: 'serce', name: 'Serçe', body: '#a9825a', belly: '#d9cbb4', head: '#8d8d8d', wing: '#7a5232', wingPat: 'bars', bars: '#e9dcc4', tail: '#6b4a31', beak: '#3a3a3a', beakType: 'short', bib: '#2a2a2a', crown: '#7a5232' },
    { id: 'kirlangic', name: 'Kırlangıç', body: '#1f3a6b', belly: '#f4efe6', head: '#1f3a6b', wing: '#16294d', wingPat: 'none', tail: '#16294d', tailType: 'fork', beak: '#1a1a1a', beakType: 'short', face: '#c8442c' },
    { id: 'marti', name: 'Martı', body: '#f6f6f6', belly: '#ffffff', head: '#ffffff', wing: '#a9b3bc', wingPat: 'tip', tip: '#1a1a1a', tail: '#ffffff', beak: '#f2c230', beakType: 'long', beakTip: '#d8312c' },
    { id: 'guvercin', name: 'Güvercin', body: '#8e97a6', belly: '#a2abb8', head: '#7d8696', wing: '#a9b1bd', wingPat: 'bars', bars: '#3a3f48', tail: '#6b7280', beak: '#3a3a3a', beakType: 'short', neck: '#5fa88e' },
    { id: 'flamingo', name: 'Flamingo', body: '#f59ab0', belly: '#f8b4c4', head: '#f59ab0', wing: '#ec7896', wingPat: 'tip', tip: '#1a1a1a', tail: '#ec7896', beak: '#f6f0e8', beakType: 'bent', beakTip: '#1a1a1a', legs: 'long', legC: '#ec7896' },
    { id: 'leylek', name: 'Leylek', body: '#f6f6f2', belly: '#ffffff', head: '#f6f6f2', wing: '#1a1a1a', wingPat: 'none', tail: '#f6f6f2', beak: '#d8312c', beakType: 'long', legs: 'long', legC: '#d8312c' },
    { id: 'tavus', name: 'Tavus kuşu', body: '#1f5fb0', belly: '#2a74c8', head: '#1f6fc8', wing: '#b48a52', wingPat: 'bars', bars: '#6b4a31', tail: '#2f8a4a', tailType: 'peacock', beak: '#9a8f86', beakType: 'short', crest: 'peacock', crestColor: '#1f6fc8', face: '#ffffff' },
    { id: 'penguen', name: 'Penguen', body: '#22252b', belly: '#ffffff', head: '#22252b', wing: '#16181c', wingPat: 'none', tail: '#16181c', beak: '#f08a3c', beakType: 'long', neck: '#f2c230', penguin: true },
    { id: 'tukan', name: 'Tukan', body: '#1f2126', belly: '#1f2126', head: '#1f2126', wing: '#16181c', wingPat: 'none', tail: '#16181c', beak: '#f59a1c', beakType: 'toucan', beakTip: '#d8312c', face: '#ffffff', bib: '#ffffff' },
    { id: 'kolibri', name: 'Kolibri', body: '#2fa86a', belly: '#d8efe0', head: '#2fa86a', wing: '#5a6a78', wingPat: 'none', tail: '#1f6b46', beak: '#1a1a1a', beakType: 'needle', bib: '#d8314c' },
    { id: 'kizilgerdan', name: 'Kızılgerdan', body: '#8d7558', belly: '#f2efe8', head: '#8d7558', wing: '#6e5a42', wingPat: 'none', tail: '#6e5a42', beak: '#2a2a2a', beakType: 'short', bib: '#e8742c' },
    { id: 'saka', name: 'Saka', body: '#c49a62', belly: '#f2ece0', head: '#f2f2f2', wing: '#1a1a1a', wingPat: 'stripe', stripe: '#f2d43a', tail: '#1a1a1a', beak: '#f2e0c8', beakType: 'short', face: '#d8312c', crown: '#1a1a1a' },
    { id: 'kardinal', name: 'Kardinal', body: '#d8312c', belly: '#e24a40', head: '#d8312c', wing: '#b0221e', wingPat: 'none', tail: '#b0221e', beak: '#f08a3c', beakType: 'short', crest: 'cardinal', crestColor: '#d8312c', mask: '#1a1a1a' },
    { id: 'bulbul', name: 'Bülbül', body: '#9a7a5a', belly: '#e8dccb', head: '#9a7a5a', wing: '#7f6248', wingPat: 'none', tail: '#a8643a', beak: '#5a4a3a', beakType: 'short' },
    { id: 'ordek', name: 'Yeşilbaş ördek', body: '#b8aa98', belly: '#c9bca9', head: '#2a7a4a', wing: '#8a7a68', wingPat: 'stripe', stripe: '#3a5fc8', tail: '#2a2a2a', beak: '#f2d43a', beakType: 'duck', neck: '#ffffff', bib: '#7a4a32' }
  ];

  var uid = 0;
  function birdSVG(id, size) {
    var b = byId(id) || BIRDS[0];
    var u = 'b' + (++uid);
    var px = size ? ' width="' + size + '" height="' + size + '"' : '';
    var s = [];
    s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"' + px + ' role="img" aria-label="' + b.name + '">');
    s.push('<defs><clipPath id="' + u + 'c"><path d="' + BODY + '"/></clipPath><clipPath id="' + u + 'w"><path d="' + WING + '"/></clipPath></defs>');

    /* bacaklar ve ayaklar */
    var legC = b.legC || '#d99a8a';
    if (b.legs === 'long') s.push('<path d="M47 80 L46 97 M55 80 L56 97" stroke="' + legC + '" stroke-width="2.6" stroke-linecap="round"/>');
    else if (!b.penguin) s.push('<g fill="' + legC + '"><path d="M44 82 l-3 7 h3 l1-5z"/><path d="M48 83 l0 7 h3 l-1-6z"/><path d="M54 82 l-2 7 h3 l1-6z"/></g>');

    /* kuyruk */
    if (b.tailType === 'fork') s.push('<path d="M60 74 L84 96 L74 88 L80 99 L58 80Z" fill="' + b.tail + '"/>');
    else if (b.tailType === 'peacock') {
      s.push('<path d="M58 70 C80 64 98 80 96 99 L60 92Z" fill="' + b.tail + '"/>');
      [[74, 82], [86, 88], [82, 96], [92, 95]].forEach(function (p) { s.push('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.4" fill="#f2c230"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="2" fill="#1f4fa0"/>'); });
    } else if (!b.penguin) {
      var long = b.id.indexOf('muhabbet') === 0 || b.id === 'sultan' || b.id.indexOf('ara') === 0;
      s.push('<path d="' + (long ? 'M58 72 L66 68 L86 99 L78 100Z' : 'M58 72 L66 68 L78 90 L70 92Z') + '" fill="' + b.tail + '"/>');
    }

    /* tepelik (arkada kalanlar) */
    if (b.crest === 'cockatoo') s.push('<g fill="' + b.crestColor + '"><path d="M40 20 C38 8 44 2 52 4 C48 8 46 14 46 20Z"/><path d="M44 20 C46 8 54 4 60 8 C54 10 50 15 49 21Z"/><path d="M48 22 C54 12 62 12 66 16 C60 17 55 20 52 24Z"/></g>');
    if (b.crest === 'cockatiel') s.push('<path d="M38 18 C36 8 40 2 46 0 C44 6 44 12 46 18 C48 10 52 6 56 6 C52 10 50 16 48 21Z" fill="' + b.crestColor + '"/>');
    if (b.crest === 'cardinal') s.push('<path d="M40 18 L52 4 L54 20Z" fill="' + b.crestColor + '"/>');
    if (b.crest === 'peacock') s.push('<g stroke="' + b.crestColor + '" stroke-width="1.2"><path d="M42 18 L38 6 M46 17 L46 5 M50 18 L54 6"/></g><g fill="' + b.crestColor + '"><circle cx="38" cy="6" r="2"/><circle cx="46" cy="5" r="2"/><circle cx="54" cy="6" r="2"/></g>');
    if (b.crest === 'tufts') s.push('<path d="M32 22 L30 10 L40 18Z M52 18 L58 8 L60 22Z" fill="' + b.crestColor + '"/>');

    /* gövde + karın + baş */
    s.push('<path d="' + BODY + '" fill="' + b.body + '"/>');
    s.push('<g clip-path="url(#' + u + 'c)">');
    s.push('<ellipse cx="' + (b.penguin ? 42 : 44) + '" cy="64" rx="' + (b.penguin ? 16 : 15) + '" ry="22" fill="' + b.belly + '"/>');
    s.push('<path d="M10 0 H70 V36 C60 40 50 40 40 42 C30 44 20 40 10 40Z" fill="' + b.head + '"/>');
    if (b.barHead) for (var i = 0; i < 5; i++) s.push('<path d="M' + (38 + i % 2 * 3) + ' ' + (16 + i * 4.5) + ' q4 -2.5 8 0 t8 0 t8 0" fill="none" stroke="#2a2d32" stroke-width="1.1" opacity=".75"/>');
    if (b.crown) s.push('<path d="M26 0 H64 V20 C54 18 40 16 26 20Z" fill="' + b.crown + '"/>');
    if (b.neck) s.push('<path d="M20 38 C34 46 52 44 66 36 L66 42 C52 50 34 52 20 44Z" fill="' + b.neck + '"/>');
    if (b.bib) s.push('<ellipse cx="34" cy="44" rx="9" ry="7" fill="' + b.bib + '"/>');
    if (b.face) s.push('<ellipse cx="32" cy="32" rx="9" ry="11" fill="' + b.face + '"/>');
    if (b.owl) s.push('<ellipse cx="35" cy="30" rx="13" ry="12" fill="' + b.belly + '" stroke="' + b.wing + '" stroke-width="1.6"/>');
    s.push('</g>');

    /* kanat */
    if (!b.penguin || true) {
      s.push('<path d="' + WING + '" fill="' + b.wing + '"/>');
      s.push('<g clip-path="url(#' + u + 'w)">');
      if (b.wingPat === 'scallop') for (var r = 0; r < 7; r++) for (var c = 0; c < 3; c++)
        s.push('<path d="M' + (50 + c * 7 + (r % 2) * 3.5) + ' ' + (46 + r * 6) + ' q3.5 -4 7 0" fill="none" stroke="' + b.scallop + '" stroke-width="1.3" stroke-linecap="round"/>');
      if (b.wingPat === 'bars') for (var k = 0; k < 3; k++) s.push('<path d="M48 ' + (56 + k * 9) + ' L76 ' + (50 + k * 9) + '" stroke="' + b.bars + '" stroke-width="2.4"/>');
      if (b.wingPat === 'patch') s.push('<ellipse cx="60" cy="52" rx="8" ry="6" fill="' + b.patch + '"/>');
      if (b.wingPat === 'stripe') s.push('<path d="M48 54 L78 46 L78 54 L48 62Z" fill="' + b.stripe + '"/>');
      if (b.wingPat === 'tip') s.push('<path d="M54 76 L80 70 L80 100 L54 100Z" fill="' + b.tip + '"/>');
      if (b.wingPat === 'spots') [[56, 50], [64, 56], [58, 62], [66, 66], [60, 72]].forEach(function (p) { s.push('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.6" fill="' + b.spotC + '"/>'); });
      s.push('</g>');
      s.push('<path d="' + WING + '" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1"/>');
    }

    /* yanak, benekler, maske */
    if (b.mask) s.push('<path d="M24 28 L44 30 L42 36 L26 36Z" fill="' + b.mask + '"/>');
    if (b.cheek) s.push('<ellipse cx="31" cy="38" rx="3.2" ry="4" fill="' + b.cheek + '"/>');
    if (b.spots) s.push('<g fill="#2a2d32"><circle cx="28" cy="45" r="1.4"/><circle cx="33" cy="47" r="1.4"/><circle cx="38" cy="46" r="1.4"/></g>');

    /* göz */
    if (b.owl) {
      s.push('<circle cx="30" cy="29" r="5" fill="' + (b.eyeC || '#f2a81c') + '"/><circle cx="30" cy="29" r="2.6" fill="#111"/><circle cx="31" cy="28" r=".9" fill="#fff"/>');
      s.push('<circle cx="41" cy="29" r="5" fill="' + (b.eyeC || '#f2a81c') + '"/><circle cx="41" cy="29" r="2.6" fill="#111"/><circle cx="42" cy="28" r=".9" fill="#fff"/>');
    } else {
      s.push('<circle cx="36" cy="25" r="4.6" fill="#ffffff"/><circle cx="36" cy="25" r="3.6" fill="#111214"/><circle cx="37.4" cy="23.6" r="1.2" fill="#ffffff"/>');
      if (b.brow) s.push('<path d="M31 21 L42 22" stroke="' + b.wing + '" stroke-width="2.2" stroke-linecap="round"/>');
    }

    /* gaga */
    s.push(beak(b));
    s.push('</svg>');
    return s.join('');
  }

  var BODY = 'M40 12 C52 10 62 18 64 32 C68 44 70 60 66 72 C62 82 52 86 44 85 C34 84 28 76 27 66 C26 56 24 50 24 40 C22 26 28 14 40 12Z';
  var WING = 'M50 38 C62 36 72 48 74 62 C76 74 72 86 66 96 C58 88 52 76 49 64 C47 54 46 44 50 38Z';

  function beak(b) {
    var c = b.beak, t = b.beakTip, o = [];
    switch (b.beakType) {
      case 'hook': o.push('<path d="M27 26 C19 26 17 34 21 39 C22 34 25 31 29 30Z" fill="' + c + '"/>'); if (t) o.push('<path d="M20 34 C19 37 20 38 21 39 C21 37 22 35 23 34Z" fill="' + t + '"/>'); break;
      case 'raptor': o.push('<path d="M28 25 C20 24 16 30 19 37 C20 33 23 31 29 31Z" fill="' + c + '"/>'); break;
      case 'short': o.push('<path d="M26 26 L17 30 L26 32Z" fill="' + c + '"/>'); break;
      case 'long': o.push('<path d="M27 25 L6 30 L27 32Z" fill="' + c + '"/>'); if (t) o.push('<path d="M10 29 L6 30 L10 31Z" fill="' + t + '"/>'); break;
      case 'bent': o.push('<path d="M27 25 L14 26 L10 34 L14 33 L27 32Z" fill="' + c + '"/>'); if (t) o.push('<path d="M14 26 L10 34 L14 33Z" fill="' + t + '"/>'); break;
      case 'toucan': o.push('<path d="M28 20 C14 18 2 24 2 32 C10 30 18 34 28 34Z" fill="' + c + '"/>'); if (t) o.push('<path d="M2 32 C4 26 7 24 9 24 C7 27 6 30 6 31Z" fill="' + t + '"/>'); break;
      case 'needle': o.push('<path d="M27 27 L2 30 L27 31Z" fill="' + c + '"/>'); break;
      case 'duck': o.push('<path d="M27 26 C18 26 10 28 10 31 C10 33 18 33 27 33Z" fill="' + c + '"/>'); break;
    }
    if (b.cere) o.push('<ellipse cx="27" cy="25.5" rx="3" ry="2" fill="' + b.cere + '"/>');
    return o.join('');
  }

  function byId(id) { for (var i = 0; i < BIRDS.length; i++) if (BIRDS[i].id === id) return BIRDS[i]; return null; }

  root.PT_BIRDS = { list: BIRDS, svg: birdSVG, get: byId };
})(typeof window !== 'undefined' ? window : globalThis);

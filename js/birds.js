/* PixelTime kuşları — gölgeli, katmanlı tüylü parametrik SVG çizim motoru */
(function (root) {
  'use strict';

  /* ---------- Duruşlar ----------
     h: baş (x, y, yarıçap), b: gövde elipsi (x, y, rx, ry, açı), legs: bacak boyu, tail: kuyruk yönü (derece) */
  var POSE = {
    upright: { h: [40, 30, 13], b: [51, 57, 17, 25, -14], tailDir: 62 },
    perch:   { h: [33, 38, 12], b: [53, 58, 22, 16, 24], tailDir: 34 },
    raptor:  { h: [40, 27, 13], b: [52, 57, 19, 26, -10], tailDir: 70 },
    owl:     { h: [46, 31, 18], b: [50, 62, 21, 24, 0], tailDir: 80 },
    penguin: { h: [45, 24, 12], b: [50, 58, 18, 30, -4], tailDir: 95 },
    tall:    { h: [28, 17, 8], b: [58, 47, 20, 13, 12], tailDir: 20 },
    duck:    { h: [32, 34, 11], b: [56, 60, 24, 15, 6], tailDir: 10 },
    swan:    { h: [30, 20, 8], b: [58, 62, 24, 14, 4], tailDir: 0 }
  };

  /* ---------- Türler ----------
     body/belly/head: renkler · wing: kanat · prim: uçuş tüyleri · tail · beak · iris
     pat: kanat deseni (scallop|bars|spots|plain|stripe) · headPat: barring|cap · extra özellikler */
  var BIRDS = [
    { id: 'pixel', name: 'Pixel', hidden: true, pose: 'upright', body: '#b9c1c9', belly: '#dde2e6', head: '#eef0f2', crown: '#e6e9ec', wing: '#262a30', prim: '#1b1e22', pat: 'scallop', patC: '#eef0f2', tail: '#2a3038', tailLen: 40, beak: '#d6c7a2', beakType: 'parrot', cere: '#8ea2cc', cheek: '#5f78b0', spots: true, headPat: 'barring', iris: '#f2f2f2' },
    { id: 'muhabbet-yesil', name: 'Muhabbet (yeşil)', pose: 'upright', body: '#78c043', belly: '#8fd257', head: '#f3e04e', crown: '#f3e04e', wing: '#2f3a1e', prim: '#22301a', pat: 'scallop', patC: '#e7d84a', tail: '#2f5aa8', tailLen: 40, beak: '#e3cf98', beakType: 'parrot', cere: '#5c7ed6', cheek: '#4a64c8', spots: true, headPat: 'barring', iris: '#f2f2f2' },
    { id: 'muhabbet-mavi', name: 'Muhabbet (mavi)', pose: 'upright', body: '#5aa6e8', belly: '#7ab9ef', head: '#f6f6f6', crown: '#f6f6f6', wing: '#253247', prim: '#1b2638', pat: 'scallop', patC: '#f2f2f2', tail: '#22417a', tailLen: 40, beak: '#e3cf98', beakType: 'parrot', cere: '#5c7ed6', cheek: '#4a64c8', spots: true, headPat: 'barring', iris: '#f2f2f2' },
    { id: 'muhabbet-sari', name: 'Muhabbet (sarı)', pose: 'upright', body: '#f6dc4a', belly: '#fae77c', head: '#fff3a6', crown: '#fff3a6', wing: '#e3be36', prim: '#d4ad2a', pat: 'scallop', patC: '#fff5c2', tail: '#d8b42c', tailLen: 40, beak: '#ead9b0', beakType: 'parrot', cere: '#c9a7ff', cheek: '#e8e8f4', iris: '#d04040' },
    { id: 'muhabbet-beyaz', name: 'Muhabbet (beyaz)', pose: 'upright', body: '#eef2f6', belly: '#ffffff', head: '#ffffff', crown: '#ffffff', wing: '#c9d6e4', prim: '#b4c4d6', pat: 'scallop', patC: '#ffffff', tail: '#b9c9da', tailLen: 40, beak: '#ead9b0', beakType: 'parrot', cere: '#e8b8c8', cheek: '#dfe6f2', iris: '#c03838' },
    { id: 'muhabbet-mor', name: 'Muhabbet (mor)', pose: 'upright', body: '#7b62c8', belly: '#9179d8', head: '#f4f2fa', crown: '#f4f2fa', wing: '#2c2640', prim: '#211c32', pat: 'scallop', patC: '#f0eef8', tail: '#3c2f78', tailLen: 40, beak: '#e3cf98', beakType: 'parrot', cere: '#5c7ed6', cheek: '#5a48b8', spots: true, headPat: 'barring', iris: '#f2f2f2' },
    { id: 'sultan', name: 'Sultan papağanı', pose: 'upright', body: '#9c9c98', belly: '#b4b4b0', head: '#f4dc5a', crown: '#f4dc5a', wing: '#8a8a86', prim: '#6c6c68', pat: 'plain', patch: '#f6f6f2', tail: '#7a7a76', tailLen: 44, beak: '#8f857c', beakType: 'parrot', cheek: '#f08a3c', crest: 'cockatiel', crestC: '#f0d24e', iris: '#2a1c14' },
    { id: 'sultan-beyaz', name: 'Sultan (lutino)', pose: 'upright', body: '#fbf3d6', belly: '#fff8e2', head: '#fbe26a', crown: '#fbe26a', wing: '#f6ebc6', prim: '#ece0b4', pat: 'plain', tail: '#f2e6be', tailLen: 44, beak: '#e8d8c0', beakType: 'parrot', cheek: '#f08a3c', crest: 'cockatiel', crestC: '#f8dc56', iris: '#b02828' },
    { id: 'kanarya', name: 'Kanarya', pose: 'perch', body: '#ffd53a', belly: '#ffe679', head: '#ffd53a', wing: '#f2c11c', prim: '#d9a710', pat: 'plain', tail: '#e2b014', tailLen: 22, beak: '#f2d7b0', beakType: 'seed', iris: '#1a1a1a' },
    { id: 'kanarya-kirmizi', name: 'Kanarya (kırmızı)', pose: 'perch', body: '#f2793c', belly: '#f79a62', head: '#f06c30', wing: '#e0622a', prim: '#c24f20', pat: 'plain', tail: '#c95224', tailLen: 22, beak: '#f2d7b0', beakType: 'seed', iris: '#1a1a1a' },
    { id: 'zebra', name: 'Zebra ispinozu', pose: 'perch', body: '#9a9a96', belly: '#efe4d4', head: '#9a9a96', wing: '#8a7f74', prim: '#6e655c', pat: 'spots', patC: '#f6f6f6', tail: '#2a2a2a', tailLen: 18, tailPat: 'zebra', beak: '#e8542c', beakType: 'seed', cheek: '#e8823c', bib: '#5a5a58', iris: '#1a1a1a' },
    { id: 'jako', name: 'Jako', pose: 'upright', body: '#9399a0', belly: '#a9aeb4', head: '#a3a8ae', crown: '#a3a8ae', wing: '#7b8189', prim: '#4c5157', pat: 'scallop', patC: '#b7bcc2', tail: '#d42f2a', tailLen: 20, beak: '#26282b', beakType: 'parrotBig', face: '#e9ebed', iris: '#f2e8b0' },
    { id: 'ara-kirmizi', name: 'Ara (kırmızı)', pose: 'upright', body: '#d72f2a', belly: '#e04034', head: '#e23a30', crown: '#e23a30', wing: '#2b6fc6', prim: '#1f4f9c', pat: 'stripe', patC: '#f2c230', tail: '#d72f2a', tailLen: 50, beak: '#efe7da', beakType: 'parrotBig', beakTip: '#26282b', face: '#ffffff', iris: '#f2e070' },
    { id: 'ara-mavi', name: 'Ara (mavi-sarı)', pose: 'upright', body: '#2f8fd8', belly: '#f3c02e', head: '#2f8fd8', crown: '#5cbf3a', wing: '#2470b8', prim: '#1a4f90', pat: 'plain', tail: '#2470b8', tailLen: 50, beak: '#26282b', beakType: 'parrotBig', face: '#ffffff', bib: '#1c2836', iris: '#f2e070' },
    { id: 'sumbul-ara', name: 'Sümbül arası', pose: 'upright', body: '#2b3fa8', belly: '#3550bc', head: '#2e46b2', crown: '#2e46b2', wing: '#26399a', prim: '#1a2970', pat: 'plain', tail: '#26399a', tailLen: 50, beak: '#26282b', beakType: 'parrotBig', eyeRing: '#f6d23a', iris: '#2a1c14', jaw: '#f6d23a' },
    { id: 'kakadu', name: 'Kakadu', pose: 'upright', body: '#f7f7f3', belly: '#ffffff', head: '#f7f7f3', crown: '#f7f7f3', wing: '#ecece4', prim: '#dedcd0', pat: 'plain', tail: '#e8e8de', tailLen: 26, beak: '#33363a', beakType: 'parrotBig', crest: 'cockatoo', crestC: '#f6d23a', iris: '#2a1c14', eyeRing: '#dfe8f2' },
    { id: 'pembe-kakadu', name: 'Pembe kakadu', pose: 'upright', body: '#ababb0', belly: '#e88aa0', head: '#f0a6b6', crown: '#f6d0d8', wing: '#9fa0a6', prim: '#7f8086', pat: 'plain', tail: '#8f9096', tailLen: 26, beak: '#efe2d8', beakType: 'parrotBig', crest: 'galah', crestC: '#f6d0d8', iris: '#2a1c14', eyeRing: '#e05070' },
    { id: 'amazon', name: 'Amazon papağanı', pose: 'upright', body: '#3eaa48', belly: '#56bf5e', head: '#3eaa48', crown: '#f2d43a', wing: '#2b8a35', prim: '#1f5fa8', pat: 'plain', patch: '#d8312c', tail: '#2b8a35', tailLen: 24, beak: '#8f857c', beakType: 'parrotBig', face: '#62c8e8', iris: '#f0a020' },
    { id: 'eclectus', name: 'Eklektus', pose: 'upright', body: '#3fb04a', belly: '#4cc057', head: '#45b850', crown: '#45b850', wing: '#36a040', prim: '#2a5cc0', pat: 'plain', tail: '#36a040', tailLen: 24, beak: '#f08a1c', beakType: 'parrotBig', beakTip: '#f6d23a', iris: '#f2c240' },
    { id: 'gunes-konuru', name: 'Güneş konuru', pose: 'upright', body: '#f8b62c', belly: '#fb9c2a', head: '#f8d03a', crown: '#f8d03a', wing: '#f2b830', prim: '#3a8a3a', pat: 'stripe', patC: '#3aa04a', tail: '#3a8a3a', tailLen: 34, beak: '#2a2a2a', beakType: 'parrot', face: '#fb8a2a', eyeRing: '#f6f6f6', iris: '#3a2a1a' },
    { id: 'quaker', name: 'Keşiş papağanı', pose: 'upright', body: '#7ccc54', belly: '#b9c4b4', head: '#7ccc54', crown: '#7ccc54', wing: '#58aa3a', prim: '#2f6fb0', pat: 'plain', tail: '#58aa3a', tailLen: 34, beak: '#e8c890', beakType: 'parrot', face: '#c4ccc0', bib: '#b4beb0', iris: '#2a1c14' },
    { id: 'lori', name: 'Gökkuşağı lorisi', pose: 'upright', body: '#3aa84a', belly: '#e8662a', head: '#2a4cc8', crown: '#2a4cc8', wing: '#2f9a40', prim: '#1f6a30', pat: 'plain', tail: '#3aa84a', tailLen: 34, beak: '#e84a2a', beakType: 'parrot', bib: '#f6c43a', iris: '#e84a2a' },
    { id: 'cennet', name: 'Cennet papağanı', pose: 'upright', body: '#5cb848', belly: '#7ccc5c', head: '#f08a3c', crown: '#3e9a34', wing: '#3e9a34', prim: '#2c7a26', pat: 'plain', tail: '#4a7ad8', tailLen: 20, beak: '#d8312c', beakType: 'parrot', face: '#f6c14a', eyeRing: '#ffffff', iris: '#2a1c14' },
    { id: 'rosella', name: 'Rozella', pose: 'upright', body: '#e0322c', belly: '#f2d43a', head: '#e0322c', crown: '#e0322c', wing: '#1c1e22', prim: '#2a5cc0', pat: 'scallop', patC: '#7cc040', tail: '#2a6fc8', tailLen: 40, beak: '#efe7da', beakType: 'parrot', cheek: '#f6f6f6', cheekBig: true, iris: '#2a1c14' },
    { id: 'kea', name: 'Kea', pose: 'upright', body: '#6c7a3a', belly: '#7a8842', head: '#76843e', crown: '#76843e', wing: '#5a6830', prim: '#2a5aa8', pat: 'scallop', patC: '#3e4a20', tail: '#5a6830', tailLen: 26, beak: '#33363a', beakType: 'kea', iris: '#2a1c14' },
    { id: 'karga', name: 'Karga', pose: 'perch', body: '#25272c', belly: '#2e3138', head: '#22242a', wing: '#1c1e22', prim: '#14161a', pat: 'plain', tail: '#17191d', tailLen: 26, beak: '#17181a', beakType: 'crow', iris: '#1a1a1a', sheen: '#4a5a8a' },
    { id: 'saksagan', name: 'Saksağan', pose: 'perch', body: '#1f2126', belly: '#f6f6f6', head: '#1f2126', wing: '#1c1e22', prim: '#1a2a5a', pat: 'plain', patch: '#f6f6f6', tail: '#1e2c5a', tailLen: 40, beak: '#17181a', beakType: 'crow', iris: '#1a1a1a', sheen: '#3a5aa0' },
    { id: 'alakarga', name: 'Alakarga', pose: 'perch', body: '#c8a690', belly: '#d8c0ae', head: '#c8a690', wing: '#b09078', prim: '#1f2126', pat: 'plain', patch: '#3a6ad8', tail: '#1f2126', tailLen: 24, beak: '#2a2a2a', beakType: 'crow', crown: '#d8c6b8', mask: '#1f2126', iris: '#a8c8e8' },
    { id: 'mavi-alakarga', name: 'Mavi alakarga', pose: 'perch', body: '#5a8fd8', belly: '#e8eef4', head: '#5a8fd8', wing: '#3f78c8', prim: '#2a5ab0', pat: 'bars', patC: '#1f2126', tail: '#3f78c8', tailLen: 28, beak: '#1f2126', beakType: 'crow', crest: 'jay', crestC: '#5a8fd8', bib: '#e8eef4', necklace: '#1f2126', iris: '#1a1a1a' },
    { id: 'kartal', name: 'Kartal', pose: 'raptor', body: '#5e3f28', belly: '#6e4b30', head: '#f8f6f0', crown: '#f8f6f0', wing: '#4a3020', prim: '#2e1e14', pat: 'scallop', patC: '#7a5636', tail: '#f8f6f0', tailLen: 26, beak: '#f2c230', beakType: 'raptor', brow: true, iris: '#f2d040', legs: '#f2c230' },
    { id: 'sahin', name: 'Şahin', pose: 'raptor', body: '#9a643a', belly: '#efe0c8', head: '#8a5a33', crown: '#8a5a33', wing: '#6b4527', prim: '#3a2616', pat: 'bars', patC: '#3e2a18', tail: '#9a643a', tailLen: 26, tailPat: 'bars', beak: '#3a3a3a', beakType: 'raptor', cere: '#f2c230', brow: true, bellyPat: 'streak', iris: '#3a2a1a', legs: '#f2c230' },
    { id: 'kerkenez', name: 'Kerkenez', pose: 'raptor', body: '#c06a3a', belly: '#f2d8b8', head: '#8a98a8', crown: '#8a98a8', wing: '#c06a3a', prim: '#2a2a2a', pat: 'spots', patC: '#3a2618', tail: '#8a98a8', tailLen: 28, tailPat: 'tipband', beak: '#5a6070', beakType: 'raptor', cere: '#f2c230', mask: '#3a3a40', maskType: 'moustache', bellyPat: 'spots', iris: '#3a2a1a', eyeRing: '#f2c230', legs: '#f2c230' },
    { id: 'baykus', name: 'Baykuş', pose: 'owl', body: '#a8845c', belly: '#e8d6b8', head: '#a8845c', crown: '#a8845c', wing: '#86643f', prim: '#5a4228', pat: 'spots', patC: '#efe2c8', tail: '#86643f', tailLen: 12, beak: '#4a3a2a', beakType: 'owl', owl: true, crest: 'tufts', crestC: '#86643f', bellyPat: 'streak', iris: '#f2a81c', legs: '#d8c4a4' },
    { id: 'kar-baykusu', name: 'Kar baykuşu', pose: 'owl', body: '#f6f6f2', belly: '#ffffff', head: '#f6f6f2', crown: '#f6f6f2', wing: '#ecece6', prim: '#d8d8d0', pat: 'spots', patC: '#3a3a3a', tail: '#ecece6', tailLen: 12, beak: '#2a2a2a', beakType: 'owl', owl: true, bellyPat: 'spots', iris: '#f2c230', legs: '#ffffff' },
    { id: 'peceli-baykus', name: 'Peçeli baykuş', pose: 'owl', body: '#d8a868', belly: '#fbf6ee', head: '#d8a868', crown: '#d8a868', wing: '#c89858', prim: '#9a7444', pat: 'spots', patC: '#7a7a7a', tail: '#c89858', tailLen: 12, beak: '#e8d8c8', beakType: 'owl', owl: true, heart: true, iris: '#1a1a1a', legs: '#efe4d8' },
    { id: 'serce', name: 'Serçe', pose: 'perch', body: '#a9825a', belly: '#d9cbb4', head: '#8d8d8d', crown: '#7a5232', wing: '#7a5232', prim: '#4a3220', pat: 'bars', patC: '#e9dcc4', tail: '#6b4a31', tailLen: 20, beak: '#3a3a3a', beakType: 'seed', bib: '#2a2a2a', cheek: '#e8e4dc', cheekBig: true, iris: '#1a1a1a' },
    { id: 'kirlangic', name: 'Kırlangıç', pose: 'perch', body: '#1f3a6b', belly: '#f4efe6', head: '#1f3a6b', wing: '#16294d', prim: '#0f1c36', pat: 'plain', tail: '#16294d', tailLen: 34, tailType: 'fork', beak: '#1a1a1a', beakType: 'small', face: '#c8442c', iris: '#1a1a1a' },
    { id: 'kizilgerdan', name: 'Kızılgerdan', pose: 'perch', body: '#8d7558', belly: '#f2efe8', head: '#8d7558', wing: '#6e5a42', prim: '#4e3e2c', pat: 'plain', tail: '#6e5a42', tailLen: 20, beak: '#2a2a2a', beakType: 'small', bib: '#ea742c', face: '#ea742c', iris: '#1a1a1a' },
    { id: 'karatavuk', name: 'Karatavuk', pose: 'perch', body: '#1c1d20', belly: '#24262a', head: '#1c1d20', wing: '#16171a', prim: '#101113', pat: 'plain', tail: '#141518', tailLen: 26, beak: '#f6a81c', beakType: 'small', eyeRing: '#f6a81c', iris: '#1a1a1a' },
    { id: 'bulbul', name: 'Bülbül', pose: 'perch', body: '#9a7a5a', belly: '#e8dccb', head: '#9a7a5a', wing: '#7f6248', prim: '#5e4632', pat: 'plain', tail: '#a8643a', tailLen: 24, beak: '#5a4a3a', beakType: 'small', iris: '#1a1a1a', eyeRing: '#e8dccb' },
    { id: 'saka', name: 'Saka', pose: 'perch', body: '#c49a62', belly: '#f2ece0', head: '#f2f2f2', crown: '#1a1a1a', wing: '#1a1a1a', prim: '#141414', pat: 'stripe', patC: '#f2d43a', tail: '#1a1a1a', tailLen: 18, beak: '#f2e0c8', beakType: 'seed', face: '#d8312c', iris: '#1a1a1a' },
    { id: 'kardinal', name: 'Kardinal', pose: 'perch', body: '#d6302a', belly: '#e2483e', head: '#d6302a', wing: '#b0221e', prim: '#8a1a16', pat: 'plain', tail: '#b0221e', tailLen: 24, beak: '#f08a3c', beakType: 'seed', crest: 'cardinal', crestC: '#d6302a', mask: '#1a1a1a', iris: '#1a1a1a' },
    { id: 'agackakan', name: 'Ağaçkakan', pose: 'raptor', body: '#1c1d20', belly: '#f2efe8', head: '#1c1d20', crown: '#d8312c', wing: '#1c1d20', prim: '#121314', pat: 'spots', patC: '#f6f6f6', tail: '#1c1d20', tailLen: 20, beak: '#3a3a3a', beakType: 'chisel', face: '#f6f6f6', mask: '#1c1d20', maskType: 'moustache', iris: '#1a1a1a' },
    { id: 'yalicapkini', name: 'Yalıçapkını', pose: 'perch', body: '#1f8ac8', belly: '#ea7a2c', head: '#1f7ab8', crown: '#1f7ab8', wing: '#1a6aa8', prim: '#14507e', pat: 'spots', patC: '#5ac0f0', tail: '#2aa0e0', tailLen: 12, beak: '#1f1f1f', beakType: 'dagger', face: '#ea7a2c', bib: '#f6f6f6', iris: '#1a1a1a' },
    { id: 'arikusu', name: 'Arıkuşu', pose: 'perch', body: '#2aa88a', belly: '#3ab8d8', head: '#a8582a', crown: '#a8582a', wing: '#c8a43a', prim: '#2a8a6a', pat: 'plain', tail: '#2aa88a', tailLen: 30, beak: '#1f1f1f', beakType: 'curve', bib: '#f6d23a', mask: '#1a1a1a', iris: '#d8312c' },
    { id: 'ibibik', name: 'İbibik', pose: 'perch', body: '#e0a070', belly: '#ecc0a0', head: '#e0a070', wing: '#1f1f1f', prim: '#1a1a1a', pat: 'bars', patC: '#f6f6f6', tail: '#1f1f1f', tailLen: 20, tailPat: 'bars', beak: '#3a3a3a', beakType: 'curve', crest: 'hoopoe', crestC: '#e0a070', iris: '#1a1a1a' },
    { id: 'kolibri', name: 'Kolibri', pose: 'perch', body: '#2aa86a', belly: '#d8efe0', head: '#2aa86a', wing: '#5a6a78', prim: '#3e4a56', pat: 'plain', tail: '#1f6b46', tailLen: 18, beak: '#1a1a1a', beakType: 'needle', bib: '#d8314c', iris: '#1a1a1a' },
    { id: 'tukan', name: 'Tukan', pose: 'perch', body: '#1f2126', belly: '#1f2126', head: '#1f2126', wing: '#16181c', prim: '#101215', pat: 'plain', tail: '#16181c', tailLen: 28, beak: '#f59a1c', beakType: 'toucan', beakTip: '#d8312c', face: '#ffffff', bib: '#f8f2c8', eyeRing: '#6ac0e0', iris: '#3aa0e0' },
    { id: 'guvercin', name: 'Güvercin', pose: 'perch', body: '#8e97a6', belly: '#a2abb8', head: '#7d8696', wing: '#a9b1bd', prim: '#5a6270', pat: 'bars', patC: '#3a3f48', tail: '#6b7280', tailLen: 22, tailPat: 'tipband', beak: '#3a3a3a', beakType: 'small', cere: '#efeff2', neck: '#5fa88e', iris: '#f08a1c', legs: '#d8564a' },
    { id: 'marti', name: 'Martı', pose: 'perch', body: '#f6f6f6', belly: '#ffffff', head: '#ffffff', wing: '#a9b3bc', prim: '#1a1a1a', pat: 'plain', tail: '#ffffff', tailLen: 22, beak: '#f2c230', beakType: 'gull', beakTip: '#d8312c', iris: '#f2e070', legs: '#f2b48c' },
    { id: 'deniz-papagani', name: 'Deniz papağanı', pose: 'penguin', body: '#1c1d20', belly: '#ffffff', head: '#1c1d20', wing: '#16171a', prim: '#101113', pat: 'plain', tail: '#16171a', tailLen: 8, beak: '#f0662a', beakType: 'puffin', face: '#f2f2f0', iris: '#1a1a1a', eyeRing: '#e8542c', legs: '#f0662a' },
    { id: 'penguen', name: 'Penguen', pose: 'penguin', body: '#22252b', belly: '#ffffff', head: '#22252b', wing: '#16181c', prim: '#101215', pat: 'plain', tail: '#16181c', tailLen: 8, beak: '#22252b', beakType: 'dagger', beakTip: '#f08a3c', neck: '#f6c23a', iris: '#1a1a1a', legs: '#2a2a2a' },
    { id: 'flamingo', name: 'Flamingo', pose: 'tall', body: '#f59ab0', belly: '#f8b4c4', head: '#f59ab0', wing: '#ec7896', prim: '#1a1a1a', pat: 'plain', tail: '#ec7896', tailLen: 14, beak: '#f6f0e8', beakType: 'flamingo', beakTip: '#1a1a1a', iris: '#f2c230', legs: '#ec7896', neckC: '#f59ab0' },
    { id: 'leylek', name: 'Leylek', pose: 'tall', body: '#f6f6f2', belly: '#ffffff', head: '#f6f6f2', wing: '#f6f6f2', prim: '#1a1a1a', pat: 'plain', tail: '#f6f6f2', tailLen: 14, beak: '#d8312c', beakType: 'stork', iris: '#1a1a1a', legs: '#d8312c', neckC: '#f6f6f2' },
    { id: 'balikcil', name: 'Gri balıkçıl', pose: 'tall', body: '#9aa4ae', belly: '#e8ecef', head: '#f2f4f6', wing: '#8a949e', prim: '#3a4048', pat: 'plain', tail: '#8a949e', tailLen: 14, beak: '#e8c040', beakType: 'stork', crest: 'heron', crestC: '#1f2126', mask: '#1f2126', maskType: 'stripe', iris: '#f2e070', legs: '#b8a888', neckC: '#e8ecef' },
    { id: 'tavus', name: 'Tavus kuşu', pose: 'perch', body: '#1f5fb0', belly: '#2a74c8', head: '#1f6fc8', wing: '#b48a52', prim: '#6b4a31', pat: 'bars', patC: '#6b4a31', tail: '#2f8a4a', tailLen: 46, tailType: 'peacock', beak: '#9a8f86', beakType: 'small', crest: 'peacock', crestC: '#1f6fc8', face: '#ffffff', iris: '#1a1a1a' },
    { id: 'yesilbas', name: 'Yeşilbaş ördek', pose: 'duck', body: '#b8aa98', belly: '#c9bca9', head: '#1f7a4a', wing: '#8a7a68', prim: '#4a4038', pat: 'stripe', patC: '#3a5fc8', tail: '#2a2a2a', tailLen: 10, beak: '#f2d43a', beakType: 'duck', neck: '#ffffff', bib: '#7a4a32', iris: '#1a1a1a', legs: '#f08a3c', sheen: '#3ab88a' },
    { id: 'kugu', name: 'Kuğu', pose: 'swan', neckC: '#ffffff', body: '#f8f8f6', belly: '#ffffff', head: '#ffffff', wing: '#efefeb', prim: '#e2e2dc', pat: 'plain', tail: '#efefeb', tailLen: 10, beak: '#f08a3c', beakType: 'swan', iris: '#1a1a1a', legs: '#2a2a2a' },
    { id: 'horoz', name: 'Horoz', pose: 'raptor', body: '#c84a2a', belly: '#1f2126', head: '#e0702a', crown: '#e0702a', wing: '#a83a20', prim: '#2a4a3a', pat: 'plain', tail: '#1f3a32', tailLen: 40, tailType: 'rooster', beak: '#e8c040', beakType: 'small', crest: 'comb', crestC: '#e0201a', jaw: '#e0201a', iris: '#f08a1c', legs: '#e8c040' }
  ];

  /* ---------- Yardımcılar ---------- */
  var uid = 0;
  function rot(x, y, cx, cy, deg) { var r = deg * Math.PI / 180, dx = x - cx, dy = y - cy; return [cx + dx * Math.cos(r) - dy * Math.sin(r), cy + dx * Math.sin(r) + dy * Math.cos(r)]; }
  function f(n) { return Math.round(n * 10) / 10; }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function c(v) { return Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt))); }
    return '#' + ((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1);
  }
  function byId(id) { for (var i = 0; i < BIRDS.length; i++) if (BIRDS[i].id === id) return BIRDS[i]; return null; }

  /* ---------- Çizim ----------
     opt.size: piksel · opt.scene: arka planlı büyük sahne · opt.branch: dal (varsayılan açık) */
  function birdSVG(id, opt) {
    if (typeof opt === 'number') opt = { size: opt };
    opt = opt || {};
    var b = byId(id) || BIRDS[1], P = POSE[b.pose] || POSE.upright;
    var u = 'k' + (++uid) + '_', o = [];
    var hx = P.h[0], hy = P.h[1], hr = P.h[2], bx = P.b[0], by = P.b[1], brx = P.b[2], bry = P.b[3], ba = P.b[4];
    var tall = b.pose === 'tall', longNeck = tall || b.pose === 'swan', ground = tall || b.pose === 'penguin' || b.pose === 'duck' || b.pose === 'swan';
    var groundY = tall ? 97 : 88, branchY = 86;
    var vb = opt.scene ? '-6 -4 112 112' : '0 0 100 100';
    var px = opt.size ? ' width="' + opt.size + '" height="' + opt.size + '"' : '';
    o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"' + px + ' role="img" aria-label="' + b.name + '">');

    /* gradyanlar */
    o.push('<defs>' +
      '<radialGradient id="' + u + 'lit" cx="0.3" cy="0.25" r="0.85"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>' +
      '<linearGradient id="' + u + 'wing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + shade(b.wing, 0.12) + '"/><stop offset="1" stop-color="' + shade(b.wing, -0.22) + '"/></linearGradient>' +
      '<linearGradient id="' + u + 'beak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + shade(b.beak, 0.18) + '"/><stop offset="1" stop-color="' + shade(b.beak, -0.18) + '"/></linearGradient>' +
      '<linearGradient id="' + u + 'wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a7350"/><stop offset=".5" stop-color="#6e4c32"/><stop offset="1" stop-color="#4a3222"/></linearGradient>' +
      '<linearGradient id="' + u + 'tail" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + shade(b.tail, 0.08) + '"/><stop offset="1" stop-color="' + shade(b.tail, -0.25) + '"/></linearGradient>' +
      (opt.scene ? '<linearGradient id="' + u + 'sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe4f6"/><stop offset="1" stop-color="#f4f8fb"/></linearGradient>' : '') +
      '<clipPath id="' + u + 'clip"><ellipse cx="' + bx + '" cy="' + by + '" rx="' + brx + '" ry="' + bry + '" transform="rotate(' + ba + ' ' + bx + ' ' + by + ')"/><circle cx="' + hx + '" cy="' + hy + '" r="' + hr + '"/>' + neckPath() + '</clipPath>' +
      '</defs>');

    if (opt.scene) {
      o.push('<rect x="-6" y="-4" width="112" height="112" fill="url(#' + u + 'sky)"/>');
      o.push('<g opacity=".55"><ellipse cx="18" cy="16" rx="12" ry="4" fill="#fff"/><ellipse cx="82" cy="26" rx="14" ry="4.5" fill="#fff"/></g>');
    }
    function neckPath() {
      if (longNeck) return '';
      if (false) return '<path d="M' + (hx - 3) + ' ' + (hy + 4) + ' C' + (hx - 6) + ' ' + (hy + 26) + ' ' + (bx - 22) + ' ' + (by - 14) + ' ' + (bx - 14) + ' ' + (by - 8) + ' L' + (bx - 6) + ' ' + (by - 12) + ' C' + (bx - 18) + ' ' + (by - 18) + ' ' + (hx + 6) + ' ' + (hy + 22) + ' ' + (hx + 5) + ' ' + (hy + 3) + 'Z"/>';
      return '<path d="M' + (hx - hr * 0.7) + ' ' + (hy + hr * 0.5) + ' L' + (hx + hr * 0.75) + ' ' + (hy - hr * 0.35) + ' L' + (bx + brx * 0.3) + ' ' + (by - bry * 0.5) + ' L' + (bx - brx * 0.6) + ' ' + (by - bry * 0.2) + 'Z"/>';
    }

    /* kuyruk */
    var tb = rot(bx + brx * 0.35, by + bry * 0.75, bx, by, ba), td = P.tailDir * Math.PI / 180, L = b.tailLen || 24;
    var tx = Math.cos(td), ty = Math.sin(td);
    function feather(sx, sy, len, ang, w, fill, edge) {
      var a = ang * Math.PI / 180, ex = sx + Math.cos(a) * len, ey = sy + Math.sin(a) * len, nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
      return '<path d="M' + f(sx + nx * 0.5) + ' ' + f(sy + ny * 0.5) + ' Q' + f(sx + Math.cos(a) * len * 0.6 + nx) + ' ' + f(sy + Math.sin(a) * len * 0.6 + ny) + ' ' + f(ex) + ' ' + f(ey) +
        ' Q' + f(sx + Math.cos(a) * len * 0.6 - nx) + ' ' + f(sy + Math.sin(a) * len * 0.6 - ny) + ' ' + f(sx - nx * 0.5) + ' ' + f(sy - ny * 0.5) + 'Z" fill="' + fill + '"' + (edge ? ' stroke="' + edge + '" stroke-width=".5"' : '') + '/>';
    }
    if (b.tailType === 'peacock') {
      o.push('<path d="M' + f(tb[0]) + ' ' + f(tb[1] - 4) + ' C' + f(tb[0] + 30) + ' ' + f(tb[1] - 14) + ' 112 ' + f(tb[1] + 10) + ' 106 108 L' + f(tb[0] + 8) + ' 108Z" fill="url(#' + u + 'tail)"/>');
      [[0.35, 0.3], [0.6, 0.35], [0.5, 0.62], [0.78, 0.6], [0.7, 0.85], [0.9, 0.85], [0.4, 0.85]].forEach(function (p) {
        var x = tb[0] + 6 + p[0] * 40, y = tb[1] + p[1] * (108 - tb[1]);
        o.push('<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="3.4" ry="4" fill="#d8b440"/><ellipse cx="' + f(x) + '" cy="' + f(y + 0.4) + '" rx="2.2" ry="2.7" fill="#2a8a8a"/><ellipse cx="' + f(x) + '" cy="' + f(y + 0.8) + '" rx="1.2" ry="1.5" fill="#1a2a6a"/>');
      });
    } else if (b.tailType === 'rooster') {
      for (var rq = 0; rq < 5; rq++) o.push('<path d="M' + f(tb[0]) + ' ' + f(tb[1] - 8) + ' C' + f(tb[0] + 10 + rq * 3) + ' ' + f(tb[1] - 30 + rq * 3) + ' ' + f(tb[0] + 30 + rq * 2) + ' ' + f(tb[1] - 20 + rq * 4) + ' ' + f(tb[0] + 26 + rq * 3) + ' ' + f(tb[1] + 8 + rq * 3) + '" fill="none" stroke="' + (rq % 2 ? shade(b.tail, 0.25) : b.tail) + '" stroke-width="' + (3.4 - rq * 0.3) + '" stroke-linecap="round"/>');
    } else {
      var ang = P.tailDir, n = b.tailType === 'fork' ? 2 : 3;
      if (b.tailType === 'fork') {
        o.push(feather(tb[0], tb[1], L, ang - 8, 2.6, 'url(#' + u + 'tail)'));
        o.push(feather(tb[0], tb[1], L * 0.95, ang + 10, 2.6, shade(b.tail, -0.15)));
      } else {
        for (var ti = 0; ti < n; ti++) o.push(feather(tb[0], tb[1], L * (1 - Math.abs(ti - 1) * 0.12), ang + (ti - 1) * 7, 3 + L * 0.05, ti === 1 ? 'url(#' + u + 'tail)' : shade(b.tail, -0.12), shade(b.tail, -0.35)));
        if (b.tailPat === 'bars' || b.tailPat === 'zebra') for (var tk = 1; tk < 5; tk++) {
          var px1 = tb[0] + tx * L * tk / 5, py1 = tb[1] + ty * L * tk / 5;
          o.push('<path d="M' + f(px1 - ty * 4) + ' ' + f(py1 + tx * 4) + ' L' + f(px1 + ty * 4) + ' ' + f(py1 - tx * 4) + '" stroke="' + (b.tailPat === 'zebra' ? '#f6f6f6' : shade(b.tail, -0.45)) + '" stroke-width="1.3"/>');
        }
        if (b.tailPat === 'tipband') { var px2 = tb[0] + tx * L * 0.82, py2 = tb[1] + ty * L * 0.82; o.push('<path d="M' + f(px2 - ty * 5) + ' ' + f(py2 + tx * 5) + ' L' + f(px2 + ty * 5) + ' ' + f(py2 - tx * 5) + '" stroke="#1f2126" stroke-width="2.4"/>'); }
      }
    }

    /* tepelik (başın arkasında kalanlar) */
    var cr = b.crestC || b.head;
    if (b.crest === 'cockatiel') o.push('<path d="M' + f(hx - 2) + ' ' + f(hy - hr * 0.8) + ' C' + f(hx - 6) + ' ' + f(hy - hr * 2) + ' ' + f(hx + 2) + ' ' + f(hy - hr * 2.6) + ' ' + f(hx + 8) + ' ' + f(hy - hr * 2.5) + ' C' + f(hx + 2) + ' ' + f(hy - hr * 2) + ' ' + f(hx + 2) + ' ' + f(hy - hr * 1.4) + ' ' + f(hx + 6) + ' ' + f(hy - hr * 0.9) + 'Z" fill="' + cr + '"/><path d="M' + f(hx + 2) + ' ' + f(hy - hr * 0.9) + ' C' + f(hx + 4) + ' ' + f(hy - hr * 1.8) + ' ' + f(hx + 10) + ' ' + f(hy - hr * 2.2) + ' ' + f(hx + 14) + ' ' + f(hy - hr * 2) + ' C' + f(hx + 9) + ' ' + f(hy - hr * 1.6) + ' ' + f(hx + 8) + ' ' + f(hy - hr * 1.2) + ' ' + f(hx + 8) + ' ' + f(hy - hr * 0.7) + 'Z" fill="' + shade(cr, -0.08) + '"/>');
    if (b.crest === 'cockatoo' || b.crest === 'galah') for (var ci = 0; ci < 5; ci++) {
      var ca = -110 + ci * 18 + (b.crest === 'galah' ? 10 : 0), cl = (b.crest === 'galah' ? 7 : 16) - Math.abs(ci - 1) * 1.5;
      o.push(feather(hx + 2 + ci * 1.5, hy - hr * 0.75, cl, ca + 30, 2.4, ci % 2 ? cr : shade(cr, -0.1)));
    }
    if (b.crest === 'cardinal' || b.crest === 'jay') o.push('<path d="M' + f(hx - 4) + ' ' + f(hy - hr * 0.8) + ' L' + f(hx + 10) + ' ' + f(hy - hr * 1.9) + ' L' + f(hx + 8) + ' ' + f(hy - hr * 0.4) + 'Z" fill="' + shade(cr, -0.05) + '"/>');
    if (b.crest === 'hoopoe') for (var hi = 0; hi < 6; hi++) o.push('<g>' + feather(hx - 4 + hi * 2.4, hy - hr * 0.7, 11 - Math.abs(hi - 2.5) * 1.2, -100 + hi * 9, 1.8, cr) + '<circle cx="' + f(hx - 4 + hi * 2.4 + Math.cos((-100 + hi * 9) * Math.PI / 180) * (10 - Math.abs(hi - 2.5) * 1.2)) + '" cy="' + f(hy - hr * 0.7 + Math.sin((-100 + hi * 9) * Math.PI / 180) * (10 - Math.abs(hi - 2.5) * 1.2)) + '" r="1.1" fill="#1a1a1a"/></g>');
    if (b.crest === 'heron') o.push('<path d="M' + f(hx + 4) + ' ' + f(hy - 2) + ' C' + f(hx + 14) + ' ' + f(hy - 4) + ' ' + f(hx + 20) + ' ' + f(hy) + ' ' + f(hx + 24) + ' ' + f(hy + 2) + '" stroke="' + cr + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>');
    if (b.crest === 'peacock') for (var pi = 0; pi < 4; pi++) { var pxx = hx - 3 + pi * 3; o.push('<path d="M' + pxx + ' ' + f(hy - hr * 0.9) + ' L' + (pxx - 2 + pi) + ' ' + f(hy - hr * 1.9) + '" stroke="' + cr + '" stroke-width=".8"/><ellipse cx="' + (pxx - 2 + pi) + '" cy="' + f(hy - hr * 2) + '" rx="1.3" ry="1.7" fill="' + cr + '"/>'); }
    if (b.crest === 'tufts') o.push('<path d="M' + f(hx - hr * 0.75) + ' ' + f(hy - hr * 0.55) + ' L' + f(hx - hr * 0.95) + ' ' + f(hy - hr * 1.35) + ' L' + f(hx - hr * 0.3) + ' ' + f(hy - hr * 0.85) + 'Z M' + f(hx + hr * 0.75) + ' ' + f(hy - hr * 0.55) + ' L' + f(hx + hr * 0.95) + ' ' + f(hy - hr * 1.35) + ' L' + f(hx + hr * 0.3) + ' ' + f(hy - hr * 0.85) + 'Z" fill="' + shade(cr, -0.1) + '"/>');
    if (b.crest === 'comb') for (var mi = 0; mi < 4; mi++) o.push('<circle cx="' + f(hx - 6 + mi * 4) + '" cy="' + f(hy - hr * 0.95 - (mi === 1 || mi === 2 ? 2.4 : 1)) + '" r="3" fill="' + cr + '"/>');

    /* bacaklar (gövdenin arkasında) */
    var legC = b.legs || '#d99a8a';
    var l1 = rot(bx - brx * 0.12, by + bry * 0.86, bx, by, ba), l2 = rot(bx + brx * 0.18, by + bry * 0.8, bx, by, ba);
    if (tall) {
      o.push('<path d="M' + f(l1[0]) + ' ' + f(l1[1]) + ' L' + f(l1[0] - 1) + ' 77 L' + f(l1[0] + 1) + ' ' + groundY + ' M' + f(l2[0]) + ' ' + f(l2[1]) + ' L' + f(l2[0] + 2) + ' 77 L' + f(l2[0] - 2) + ' ' + groundY + '" stroke="' + legC + '" stroke-width="1.6" fill="none" stroke-linejoin="round"/>');
      o.push('<circle cx="' + f(l1[0] - 1) + '" cy="77" r="1.3" fill="' + shade(legC, -0.15) + '"/><circle cx="' + f(l2[0] + 2) + '" cy="77" r="1.3" fill="' + shade(legC, -0.15) + '"/>');
    }

    /* uzun boyun */
    if (longNeck) {
      var nc = b.neckC || b.body;
      var nd = b.pose === 'swan'
        ? 'M' + hx + ' ' + (hy + 4) + ' C' + (hx + 10) + ' ' + (hy + 14) + ' ' + (hx - 8) + ' ' + (hy + 26) + ' ' + (bx - 16) + ' ' + (by - 4)
        : 'M' + hx + ' ' + (hy + 4) + ' C' + (hx - 6) + ' ' + (hy + 18) + ' ' + (bx - 26) + ' ' + (by - 6) + ' ' + (bx - 14) + ' ' + (by - 4);
      o.push('<path d="' + nd + '" stroke="' + shade(nc, -0.12) + '" stroke-width="' + (b.pose === 'swan' ? 6.4 : 5.4) + '" fill="none" stroke-linecap="round"/>');
      o.push('<path d="' + nd + '" stroke="' + nc + '" stroke-width="' + (b.pose === 'swan' ? 5 : 4) + '" fill="none" stroke-linecap="round"/>');
    }
    /* bacak üst kısımları gövdenin arkasında */
    var fy = branchY - 2.4;
    if (!tall && opt.branch !== false && !ground) [l1, l2].forEach(function (lp, i) {
      o.push('<path d="M' + f(lp[0]) + ' ' + f(lp[1] - 4) + ' L' + f(lp[0] + (i ? 2 : 0)) + ' ' + f(fy) + '" stroke="' + legC + '" stroke-width="1.8" stroke-linecap="round"/>');
    });
    /* gövde + baş: düz renk, sonra gölge katmanı */
    o.push('<g clip-path="url(#' + u + 'clip)">');
    o.push('<rect x="0" y="0" width="100" height="100" fill="' + b.body + '"/>');
    if (b.sheen) o.push('<ellipse cx="' + (bx + 4) + '" cy="' + (by - 4) + '" rx="' + brx + '" ry="' + (bry * 0.6) + '" fill="' + b.sheen + '" opacity=".22"/>');
    var bel = rot(bx - brx * 0.35, by + bry * 0.15, bx, by, ba);
    o.push('<ellipse cx="' + f(bel[0]) + '" cy="' + f(bel[1]) + '" rx="' + f(brx * 0.72) + '" ry="' + f(bry * 0.85) + '" fill="' + b.belly + '" transform="rotate(' + ba + ' ' + f(bel[0]) + ' ' + f(bel[1]) + ')"/>');
    if (b.bellyPat === 'streak') for (var si = 0; si < 9; si++) { var sx = bel[0] - brx * 0.4 + (si % 3) * brx * 0.35, sy = bel[1] - bry * 0.3 + Math.floor(si / 3) * bry * 0.32; o.push('<path d="M' + f(sx) + ' ' + f(sy) + ' l.6 3.4" stroke="' + shade(b.body, -0.25) + '" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>'); }
    if (b.bellyPat === 'spots') for (var sj = 0; sj < 10; sj++) { var qx = bel[0] - brx * 0.45 + (sj % 4) * brx * 0.3, qy = bel[1] - bry * 0.35 + Math.floor(sj / 4) * bry * 0.35; o.push('<path d="M' + f(qx) + ' ' + f(qy) + ' q1.2 1.4 2.4 0" stroke="' + shade(b.body, -0.35) + '" stroke-width="1" fill="none"/>'); }
    /* baş rengi: boyun çizgisinin üstü */
    var headTop = longNeck ? '<circle cx="' + hx + '" cy="' + hy + '" r="' + (hr + 1) + '" fill="' + b.head + '"/>'
      : '<path d="M0 0 H100 V' + f(hy + hr * 0.45) + ' C' + f(hx + hr * 1.6) + ' ' + f(hy + hr * 0.9) + ' ' + f(hx + hr * 0.4) + ' ' + f(hy + hr * 1.25) + ' ' + f(hx - hr * 1.4) + ' ' + f(hy + hr * 1.1) + ' L0 ' + f(hy + hr * 1.1) + 'Z" fill="' + b.head + '"/>';
    o.push(headTop);
    if (b.pose === 'penguin' || b.pose === 'owl') { /* göğüs gövde rengini taşır */ }
    if (b.crown) o.push('<path d="M0 0 H100 V' + f(hy - hr * 0.35) + ' C' + f(hx + hr * 0.6) + ' ' + f(hy - hr * 0.55) + ' ' + f(hx - hr * 0.4) + ' ' + f(hy - hr * 0.6) + ' ' + f(hx - hr * 1.2) + ' ' + f(hy - hr * 0.35) + ' L0 ' + f(hy - hr * 0.35) + 'Z" fill="' + b.crown + '"/>');
    if (b.headPat === 'barring') for (var bi = 0; bi < 6; bi++) {
      var yy = hy - hr * 0.75 + bi * hr * 0.3, xs = hx - hr * 0.35 + bi * 0.6;
      o.push('<path d="M' + f(xs) + ' ' + f(yy) + ' q' + f(hr * 0.18) + ' -1.3 ' + f(hr * 0.36) + ' 0 t' + f(hr * 0.36) + ' 0 t' + f(hr * 0.36) + ' 0 t' + f(hr * 0.36) + ' 0" fill="none" stroke="#25282d" stroke-width="' + f(hr * 0.075) + '" opacity=".8"/>');
    }
    if (b.neck) o.push('<path d="M0 ' + f(hy + hr * 0.95) + ' C' + f(hx) + ' ' + f(hy + hr * 1.4) + ' ' + f(hx + hr * 1.5) + ' ' + f(hy + hr * 1.1) + ' 100 ' + f(hy + hr * 0.6) + ' V' + f(hy + hr * 0.95) + ' C' + f(hx + hr * 1.5) + ' ' + f(hy + hr * 1.5) + ' ' + f(hx) + ' ' + f(hy + hr * 1.8) + ' 0 ' + f(hy + hr * 1.4) + 'Z" fill="' + b.neck + '" opacity=".9"/>');
    if (b.bib) o.push('<ellipse cx="' + f(hx - hr * 0.35) + '" cy="' + f(hy + hr * 1.1) + '" rx="' + f(hr * 0.75) + '" ry="' + f(hr * 0.6) + '" fill="' + b.bib + '"/>');
    if (b.necklace) o.push('<path d="M' + f(hx - hr * 1.1) + ' ' + f(hy + hr * 0.6) + ' Q' + f(hx) + ' ' + f(hy + hr * 1.8) + ' ' + f(hx + hr * 1.2) + ' ' + f(hy + hr * 0.5) + '" stroke="' + b.necklace + '" stroke-width="1.6" fill="none"/>');
    if (b.face) o.push('<ellipse cx="' + f(hx - hr * 0.45) + '" cy="' + f(hy + hr * 0.05) + '" rx="' + f(hr * 0.6) + '" ry="' + f(hr * 0.75) + '" fill="' + b.face + '"/>');
    if (b.owl) {
      o.push('<ellipse cx="' + f(hx - hr * 0.38) + '" cy="' + f(hy + 1) + '" rx="' + f(hr * 0.52) + '" ry="' + f(hr * 0.6) + '" fill="' + shade(b.belly, 0.2) + '"/><ellipse cx="' + f(hx + hr * 0.3) + '" cy="' + f(hy + 1) + '" rx="' + f(hr * 0.52) + '" ry="' + f(hr * 0.6) + '" fill="' + shade(b.belly, 0.2) + '"/>');
      if (b.heart) o.push('<path d="M' + f(hx - hr * 0.04) + ' ' + f(hy + hr * 0.75) + ' C' + f(hx - hr * 1.1) + ' ' + f(hy + hr * 0.2) + ' ' + f(hx - hr * 1.05) + ' ' + f(hy - hr * 0.85) + ' ' + f(hx - hr * 0.1) + ' ' + f(hy - hr * 0.5) + ' C' + f(hx + hr * 0.85) + ' ' + f(hy - hr * 0.85) + ' ' + f(hx + hr * 0.95) + ' ' + f(hy + hr * 0.2) + ' ' + f(hx - hr * 0.04) + ' ' + f(hy + hr * 0.75) + 'Z" fill="#fffaf2" stroke="' + shade(b.body, -0.1) + '" stroke-width="1"/>');
    }
    /* tüy dokusu */
    for (var fi = 0; fi < 7; fi++) {
      var fp = rot(bx - brx * 0.5 + (fi % 3) * brx * 0.3, by - bry * 0.1 + Math.floor(fi / 3) * bry * 0.3, bx, by, ba);
      o.push('<path d="M' + f(fp[0]) + ' ' + f(fp[1]) + ' q1.6 1.6 3.2 0" stroke="#000" stroke-opacity=".07" stroke-width=".8" fill="none"/>');
    }
    o.push('<rect x="0" y="0" width="100" height="100" fill="url(#' + u + 'lit)"/>');
    o.push('</g>');

    /* kanat */
    o.push('<g transform="rotate(' + ba + ' ' + bx + ' ' + by + ')">');
    var wx = bx, wy = by, wr = brx, wh = bry;
    var wingD = 'M' + f(wx - wr * 0.15) + ' ' + f(wy - wh * 0.78) + ' C' + f(wx + wr * 0.7) + ' ' + f(wy - wh * 0.8) + ' ' + f(wx + wr * 1.12) + ' ' + f(wy - wh * 0.1) + ' ' + f(wx + wr * 0.95) + ' ' + f(wy + wh * 0.45) +
      ' C' + f(wx + wr * 0.85) + ' ' + f(wy + wh * 0.9) + ' ' + f(wx + wr * 0.7) + ' ' + f(wy + wh * 1.25) + ' ' + f(wx + wr * 0.62) + ' ' + f(wy + wh * 1.42) +
      ' C' + f(wx + wr * 0.2) + ' ' + f(wy + wh * 1.0) + ' ' + f(wx - wr * 0.15) + ' ' + f(wy + wh * 0.5) + ' ' + f(wx - wr * 0.3) + ' ' + f(wy - wh * 0.05) +
      ' C' + f(wx - wr * 0.42) + ' ' + f(wy - wh * 0.45) + ' ' + f(wx - wr * 0.35) + ' ' + f(wy - wh * 0.7) + ' ' + f(wx - wr * 0.15) + ' ' + f(wy - wh * 0.78) + 'Z';
    if (b.pose === 'penguin') wingD = 'M' + f(wx + wr * 0.2) + ' ' + f(wy - wh * 0.55) + ' C' + f(wx + wr * 0.9) + ' ' + f(wy - wh * 0.4) + ' ' + f(wx + wr * 0.9) + ' ' + f(wy + wh * 0.3) + ' ' + f(wx + wr * 0.6) + ' ' + f(wy + wh * 0.75) + ' C' + f(wx + wr * 0.35) + ' ' + f(wy + wh * 0.3) + ' ' + f(wx + wr * 0.05) + ' ' + f(wy - wh * 0.2) + ' ' + f(wx + wr * 0.2) + ' ' + f(wy - wh * 0.55) + 'Z';
    o.push('<clipPath id="' + u + 'wc"><path d="' + wingD + '"/></clipPath>');
    o.push('<path d="' + wingD + '" fill="url(#' + u + 'wing)"/>');
    o.push('<g clip-path="url(#' + u + 'wc)">');
    /* uçuş tüyleri (kanat ucunda) */
    if (b.pose !== 'penguin') {
      for (var pk = 0; pk < 5; pk++) {
        var sxp = wx + wr * (0.05 + pk * 0.16), syp = wy + wh * (0.15 + pk * 0.05);
        o.push(feather(sxp, syp, wh * 1.35, 74 - pk * 4, wr * 0.13, shade(b.prim, pk % 2 ? -0.06 : 0.06), shade(b.prim, 0.35)));
      }
    }
    var pc = b.patC || shade(b.wing, 0.35);
    if (b.pat === 'scallop') for (var r = 0; r < 6; r++) for (var c = 0; c < 4; c++) {
      var sx2 = wx - wr * 0.3 + c * wr * 0.32 + (r % 2) * wr * 0.16, sy2 = wy - wh * 0.62 + r * wh * 0.2;
      o.push('<path d="M' + f(sx2) + ' ' + f(sy2) + ' q' + f(wr * 0.16) + ' ' + f(-wh * 0.13) + ' ' + f(wr * 0.32) + ' 0" fill="none" stroke="' + pc + '" stroke-width="' + f(wr * 0.07) + '" stroke-linecap="round"/>');
    }
    if (b.pat === 'bars') for (var k = 0; k < 3; k++) o.push('<path d="M' + f(wx - wr * 0.4) + ' ' + f(wy - wh * 0.2 + k * wh * 0.28) + ' L' + f(wx + wr * 1.1) + ' ' + f(wy - wh * 0.32 + k * wh * 0.28) + '" stroke="' + pc + '" stroke-width="' + f(wr * 0.12) + '"/>');
    if (b.pat === 'stripe') o.push('<path d="M' + f(wx - wr * 0.4) + ' ' + f(wy - wh * 0.05) + ' L' + f(wx + wr * 1.1) + ' ' + f(wy - wh * 0.25) + ' L' + f(wx + wr * 1.1) + ' ' + f(wy - wh * 0.05) + ' L' + f(wx - wr * 0.4) + ' ' + f(wy + wh * 0.15) + 'Z" fill="' + pc + '"/>');
    if (b.pat === 'spots') for (var sp = 0; sp < 9; sp++) o.push('<circle cx="' + f(wx - wr * 0.1 + (sp % 3) * wr * 0.32 + (Math.floor(sp / 3) % 2) * wr * 0.15) + '" cy="' + f(wy - wh * 0.5 + Math.floor(sp / 3) * wh * 0.25) + '" r="' + f(wr * 0.07) + '" fill="' + pc + '"/>');
    if (b.patch) o.push('<ellipse cx="' + f(wx + wr * 0.3) + '" cy="' + f(wy - wh * 0.35) + '" rx="' + f(wr * 0.45) + '" ry="' + f(wh * 0.18) + '" fill="' + b.patch + '"/>');
    o.push('<path d="' + wingD + '" fill="url(#' + u + 'lit)" opacity=".7"/>');
    o.push('</g>');
    o.push('<path d="' + wingD + '" fill="none" stroke="' + shade(b.wing, -0.4) + '" stroke-opacity=".55" stroke-width=".7"/>');
    o.push('</g>');

    /* yüz detayları */
    if (b.mask) {
      if (b.maskType === 'moustache') o.push('<path d="M' + f(hx - hr * 0.6) + ' ' + f(hy + hr * 0.15) + ' q' + f(hr * 0.15) + ' ' + f(hr * 0.6) + ' ' + f(hr * 0.35) + ' ' + f(hr * 0.75) + ' l' + f(hr * 0.12) + ' ' + f(-hr * 0.2) + ' q' + f(-hr * 0.1) + ' ' + f(-hr * 0.35) + ' ' + f(-hr * 0.2) + ' ' + f(-hr * 0.55) + 'Z" fill="' + b.mask + '"/>');
      else if (b.maskType === 'stripe') o.push('<path d="M' + f(hx - hr * 0.3) + ' ' + f(hy - hr * 0.25) + ' L' + f(hx + hr * 1.2) + ' ' + f(hy - hr * 0.45) + '" stroke="' + b.mask + '" stroke-width="' + f(hr * 0.25) + '" stroke-linecap="round"/>');
      else o.push('<path d="M' + f(hx - hr * 1.05) + ' ' + f(hy - hr * 0.35) + ' L' + f(hx + hr * 0.2) + ' ' + f(hy - hr * 0.35) + ' Q' + f(hx + hr * 0.3) + ' ' + f(hy + hr * 0.1) + ' ' + f(hx - hr * 0.2) + ' ' + f(hy + hr * 0.15) + ' L' + f(hx - hr * 1.0) + ' ' + f(hy + hr * 0.2) + 'Z" fill="' + b.mask + '"/>');
    }
    if (b.cheek) o.push('<ellipse cx="' + f(hx - hr * 0.45) + '" cy="' + f(hy + hr * 0.42) + '" rx="' + f(hr * (b.cheekBig ? 0.38 : 0.2)) + '" ry="' + f(hr * (b.cheekBig ? 0.32 : 0.27)) + '" fill="' + b.cheek + '"/>');
    if (b.jaw) o.push('<path d="M' + f(hx - hr * 0.95) + ' ' + f(hy + hr * 0.35) + ' q' + f(hr * 0.2) + ' ' + f(hr * 0.35) + ' ' + f(hr * 0.5) + ' ' + f(hr * 0.2) + '" stroke="' + b.jaw + '" stroke-width="' + f(hr * 0.22) + '" fill="none" stroke-linecap="round"/>');
    if (b.spots) for (var ss = 0; ss < 4; ss++) o.push('<circle cx="' + f(hx - hr * 0.85 + ss * hr * 0.32) + '" cy="' + f(hy + hr * (0.82 + (ss % 2) * 0.1)) + '" r="' + f(hr * 0.09) + '" fill="#202328"/>');

    /* göz */
    var ex = b.owl ? 0 : hx - hr * 0.3, ey = hy - hr * 0.22, er = hr * 0.2;
    function eye(x, y, r) {
      var s = '';
      if (b.eyeRing) s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r * 1.55) + '" fill="' + b.eyeRing + '"/>';
      s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r * 1.15) + '" fill="#ffffff" opacity=".9"/>';
      s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + (b.iris || '#1a1a1a') + '"/>';
      s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r * (b.iris && b.iris !== '#1a1a1a' ? 0.6 : 0.85)) + '" fill="#0d0e10"/>';
      s += '<circle cx="' + f(x + r * 0.35) + '" cy="' + f(y - r * 0.4) + '" r="' + f(r * 0.32) + '" fill="#ffffff"/>';
      return s;
    }
    if (b.owl) { o.push(eye(hx - hr * 0.38, hy, hr * 0.26)); o.push(eye(hx + hr * 0.3, hy, hr * 0.26)); }
    else o.push(eye(ex, ey, er));
    if (b.brow) o.push('<path d="M' + f(ex - er * 2) + ' ' + f(ey - er * 1.4) + ' Q' + f(ex) + ' ' + f(ey - er * 2.2) + ' ' + f(ex + er * 2.4) + ' ' + f(ey - er * 1.2) + '" stroke="' + shade(b.head, -0.25) + '" stroke-width="' + f(er * 0.9) + '" fill="none" stroke-linecap="round"/>');

    /* gaga */
    o.push(beak(b, hx, hy, hr, u));

    /* dal ya da zemin + ayaklar */
    if (opt.branch !== false && !ground) {
      o.push('<path d="M4 ' + (branchY - 1) + ' C30 ' + (branchY - 3) + ' 60 ' + (branchY - 1) + ' 96 ' + (branchY - 4) + ' L96 ' + (branchY + 1.5) + ' C60 ' + (branchY + 4) + ' 30 ' + (branchY + 2) + ' 4 ' + (branchY + 4) + 'Z" fill="url(#' + u + 'wood)"/>');
      o.push('<path d="M10 ' + (branchY - 1.2) + ' C34 ' + (branchY - 3) + ' 62 ' + (branchY - 1.2) + ' 92 ' + (branchY - 3.6) + '" stroke="#b08a64" stroke-width=".7" fill="none" opacity=".8"/>');
      o.push('<path d="M20 ' + (branchY + 1) + ' l6 .3 M48 ' + (branchY + 1.5) + ' l7 -.2 M70 ' + (branchY) + ' l5 .2" stroke="#3a2618" stroke-width=".6" opacity=".6"/>');
      o.push('<path d="M82 ' + (branchY - 3) + ' C86 ' + (branchY - 10) + ' 90 ' + (branchY - 13) + ' 95 ' + (branchY - 15) + '" stroke="url(#' + u + 'wood)" stroke-width="1.8" fill="none" stroke-linecap="round"/>');
      o.push('<path d="M95 ' + (branchY - 15) + ' c3 -6 8 -6 10 -5 c-2 4 -6 7 -10 5Z" fill="#6e9a48"/><path d="M90 ' + (branchY - 12) + ' c-1 -6 2 -10 5 -11 c1 4 -1 8 -5 11Z" fill="#82ad59"/>');
      [l1, l2].forEach(function (lp, i) {
        var lx = lp[0] + (i ? 2 : 0);
        o.push('<path d="M' + f(lx) + ' ' + f(fy) + ' q-3 .2 -4 2.6 M' + f(lx) + ' ' + f(fy) + ' q-1 1.4 -1.2 3.4 M' + f(lx) + ' ' + f(fy) + ' q2.2 .8 2.4 3" stroke="' + shade(legC, -0.12) + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>');
      });
    } else if (ground) {
      o.push('<ellipse cx="' + (bx - 2) + '" cy="' + groundY + '" rx="' + (brx + 4) + '" ry="2.2" fill="#000" opacity=".12"/>');
      if (!tall) [l1, l2].forEach(function (lp, i) {
        var lx = lp[0] + (i ? 3 : -1);
        o.push('<path d="M' + f(lp[0]) + ' ' + f(lp[1]) + ' L' + f(lx) + ' ' + (groundY - 1) + '" stroke="' + legC + '" stroke-width="2" stroke-linecap="round"/><path d="M' + f(lx - 4) + ' ' + groundY + ' L' + f(lx + 2) + ' ' + groundY + '" stroke="' + legC + '" stroke-width="2.2" stroke-linecap="round"/>');
      });
      else o.push('<path d="M' + f(l1[0] - 3) + ' ' + groundY + ' h6 M' + f(l2[0] - 5) + ' ' + groundY + ' h6" stroke="' + legC + '" stroke-width="1.3" stroke-linecap="round"/>');
    }
    o.push('</svg>');
    return o.join('');
  }

  function beak(b, hx, hy, hr, u) {
    var x = hx - hr * 0.92, y = hy + hr * 0.02, s = hr / 13, g = 'url(#' + u + 'beak)', t = b.beakTip, o = [];
    function P(d) { return d.replace(/(-?\d+\.?\d*)/g, function (m) { return f(parseFloat(m) * s); }); }
    function at(d) { return '<path transform="translate(' + f(x) + ' ' + f(y) + ')" d="' + P(d) + '"'; }
    switch (b.beakType) {
      case 'parrot':
        o.push(at('M2 -5 C-6 -6 -9 2 -6 9 C-5 4 -2 1 3 0Z') + ' fill="' + g + '"/>', at('M1 1 C-3 2 -4 5 -3 7 C-1 6 1 4 3 3Z') + ' fill="' + shade(b.beak, -0.22) + '"/>'); break;
      case 'parrotBig':
        o.push(at('M3 -7 C-9 -9 -13 3 -8 13 C-7 6 -3 2 4 1Z') + ' fill="' + g + '"/>', at('M2 2 C-4 3 -6 7 -4 10 C-1 9 2 6 4 4Z') + ' fill="' + shade(b.beak, -0.25) + '"/>');
        if (t) o.push(at('M-8 6 C-9 9 -8.5 11.5 -8 13 C-7 10 -6.5 8 -6 7Z') + ' fill="' + t + '"/>'); break;
      case 'kea':
        o.push(at('M3 -5 C-8 -6 -12 4 -10 14 C-8 6 -4 2 4 1Z') + ' fill="' + g + '"/>'); break;
      case 'raptor':
        o.push(at('M3 -5 C-6 -6 -10 1 -7 8 C-6 4 -3 2 4 1Z') + ' fill="' + g + '"/>', at('M-7 5 C-8 7 -7.5 8 -7 8 C-6.5 7 -6 6 -5.5 5.5Z') + ' fill="#2a2a2a"/>'); break;
      case 'owl':
        o.push(at('M8 -1 C4 -2 3 3 6 8 C8 5 10 3 10 1Z') + ' fill="' + g + '"/>'); break;
      case 'seed':
        o.push(at('M2 -4 L-7 0 L2 1Z') + ' fill="' + g + '"/>', at('M2 1 L-6 0.6 L2 4Z') + ' fill="' + shade(b.beak, -0.15) + '"/>'); break;
      case 'small':
        o.push(at('M2 -3 L-7 0 L2 0.6Z') + ' fill="' + g + '"/>', at('M2 0.6 L-6 0.4 L2 2.6Z') + ' fill="' + shade(b.beak, -0.15) + '"/>');
        if (t) o.push(at('M-4 -0.8 L-7 0 L-4 0.6Z') + ' fill="' + t + '"/>'); break;
      case 'crow':
        o.push(at('M2 -4 C-5 -4 -12 -1 -14 1 L2 1Z') + ' fill="' + g + '"/>', at('M2 1 L-13 1.2 C-8 3 -2 4 2 4Z') + ' fill="' + shade(b.beak, -0.1) + '"/>'); break;
      case 'chisel': case 'dagger':
        o.push(at('M2 -3 L-17 0 L2 0.4Z') + ' fill="' + g + '"/>', at('M2 0.4 L-16 0.3 L2 3Z') + ' fill="' + shade(b.beak, -0.15) + '"/>');
        if (t) o.push(at('M-10 -1.3 L-17 0 L-10 1.6Z') + ' fill="' + t + '"/>'); break;
      case 'needle':
        o.push(at('M2 -1.6 L-22 0 L2 1.2Z') + ' fill="' + g + '"/>'); break;
      case 'curve':
        o.push(at('M2 -2.5 C-6 -2 -14 1 -18 6 C-12 3 -4 1.5 2 1.5Z') + ' fill="' + g + '"/>'); break;
      case 'gull':
        o.push(at('M2 -3 C-6 -3 -11 -1 -13 1 L2 1Z') + ' fill="' + g + '"/>', at('M2 1 L-12 1 C-11 3 -9 4 -8 3 C-4 3 0 3.5 2 3.5Z') + ' fill="' + shade(b.beak, -0.1) + '"/>');
        if (t) o.push(at('M-9 1.4 L-8 3.2 L-7 1.4Z') + ' fill="' + t + '"/>'); break;
      case 'toucan':
        o.push(at('M3 -9 C-12 -12 -26 -6 -30 3 C-20 0 -8 2 3 3Z') + ' fill="' + g + '"/>', at('M3 3 C-8 3 -20 2 -29 4 C-18 9 -6 8 3 7Z') + ' fill="' + shade(b.beak, -0.1) + '"/>');
        if (t) o.push(at('M-30 3 C-28 -2 -24 -5 -20 -6 C-24 -2 -26 1 -27 3Z') + ' fill="' + t + '"/>'); break;
      case 'puffin':
        o.push(at('M2 -7 C-6 -6 -11 0 -11 3 L2 3Z') + ' fill="' + g + '"/>', at('M2 3 L-11 3 C-8 6 -2 8 2 8Z') + ' fill="' + shade(b.beak, -0.1) + '"/>', at('M2 -6 L2 7 L-1 6 L-1 -5Z') + ' fill="#5a6070"/>'); break;
      case 'flamingo':
        o.push(at('M2 -2.5 L-8 -2 C-10 1 -10 6 -8 9 L-6 9 C-7 6 -6 3 2 2.5Z') + ' fill="' + g + '"/>');
        if (t) o.push(at('M-8 4 C-10 6 -9 8 -8 9 L-6 9 C-6.5 7 -6.5 5.5 -6 4Z') + ' fill="' + t + '"/>'); break;
      case 'stork':
        o.push(at('M2 -2 L-26 0.5 L2 2.4Z') + ' fill="' + g + '"/>'); break;
      case 'duck':
        o.push(at('M2 -3.5 C-6 -3.5 -12 -2 -13 0.5 C-12 2 -6 2.5 2 2Z') + ' fill="' + g + '"/>', at('M-11 -1 L-13 0.5 L-11 1Z') + ' fill="#2a2a2a"/>'); break;
      case 'swan':
        o.push(at('M2 -3.5 C-6 -3.5 -12 -2 -13 0.5 C-12 2 -6 2.5 2 2Z') + ' fill="' + g + '"/>', at('M2 -4 C0 -3 0 2 2 3 L5 3 L5 -4Z') + ' fill="#1f1f1f"/>'); break;
    }
    if (b.cere) o.push('<ellipse cx="' + f(x + 1.5 * s) + '" cy="' + f(y - 4.3 * s) + '" rx="' + f(3.2 * s) + '" ry="' + f(2.1 * s) + '" fill="' + b.cere + '"/>');
    return o.join('');
  }

  root.PT_BIRDS = { list: BIRDS.filter(function (x) { return !x.hidden; }), all: BIRDS, svg: birdSVG, get: byId };
})(typeof window !== 'undefined' ? window : globalThis);

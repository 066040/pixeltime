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
    { id: 'muhabbet-yesil', name: 'Muhabbet kuşu', pose: 'upright', body: '#78c043', belly: '#8fd257', head: '#f3e04e', crown: '#f3e04e', wing: '#2f3a1e', prim: '#22301a', pat: 'scallop', patC: '#e7d84a', tail: '#2f5aa8', tailLen: 40, beak: '#e3cf98', beakType: 'parrot', cere: '#5c7ed6', cheek: '#4a64c8', spots: true, headPat: 'barring', iris: '#f2f2f2' },
    { id: 'muhabbet-mavi', hidden: true, name: 'Muhabbet (mavi)', pose: 'upright', body: '#5aa6e8', belly: '#7ab9ef', head: '#f6f6f6', crown: '#f6f6f6', wing: '#253247', prim: '#1b2638', pat: 'scallop', patC: '#f2f2f2', tail: '#22417a', tailLen: 40, beak: '#e3cf98', beakType: 'parrot', cere: '#5c7ed6', cheek: '#4a64c8', spots: true, headPat: 'barring', iris: '#f2f2f2' },
    { id: 'muhabbet-sari', hidden: true, name: 'Muhabbet (sarı)', pose: 'upright', body: '#f6dc4a', belly: '#fae77c', head: '#fff3a6', crown: '#fff3a6', wing: '#e3be36', prim: '#d4ad2a', pat: 'scallop', patC: '#fff5c2', tail: '#d8b42c', tailLen: 40, beak: '#ead9b0', beakType: 'parrot', cere: '#c9a7ff', cheek: '#e8e8f4', iris: '#d04040' },
    { id: 'muhabbet-beyaz', hidden: true, name: 'Muhabbet (beyaz)', pose: 'upright', body: '#eef2f6', belly: '#ffffff', head: '#ffffff', crown: '#ffffff', wing: '#c9d6e4', prim: '#b4c4d6', pat: 'scallop', patC: '#ffffff', tail: '#b9c9da', tailLen: 40, beak: '#ead9b0', beakType: 'parrot', cere: '#e8b8c8', cheek: '#dfe6f2', iris: '#c03838' },
    { id: 'muhabbet-mor', hidden: true, name: 'Muhabbet (mor)', pose: 'upright', body: '#7b62c8', belly: '#9179d8', head: '#f4f2fa', crown: '#f4f2fa', wing: '#2c2640', prim: '#211c32', pat: 'scallop', patC: '#f0eef8', tail: '#3c2f78', tailLen: 40, beak: '#e3cf98', beakType: 'parrot', cere: '#5c7ed6', cheek: '#5a48b8', spots: true, headPat: 'barring', iris: '#f2f2f2' },
    { id: 'sultan', name: 'Sultan papağanı', pose: 'upright', body: '#9c9c98', belly: '#b4b4b0', head: '#f4dc5a', crown: '#f4dc5a', wing: '#8a8a86', prim: '#6c6c68', pat: 'plain', patch: '#f6f6f2', tail: '#7a7a76', tailLen: 44, beak: '#8f857c', beakType: 'parrot', cheek: '#f08a3c', crest: 'cockatiel', crestC: '#f0d24e', iris: '#2a1c14' },
    { id: 'sultan-beyaz', hidden: true, name: 'Sultan (lutino)', pose: 'upright', body: '#fbf3d6', belly: '#fff8e2', head: '#fbe26a', crown: '#fbe26a', wing: '#f6ebc6', prim: '#ece0b4', pat: 'plain', tail: '#f2e6be', tailLen: 44, beak: '#e8d8c0', beakType: 'parrot', cheek: '#f08a3c', crest: 'cockatiel', crestC: '#f8dc56', iris: '#b02828' },
    { id: 'kanarya', name: 'Kanarya', pose: 'perch', body: '#ffd53a', belly: '#ffe679', head: '#ffd53a', wing: '#f2c11c', prim: '#d9a710', pat: 'plain', tail: '#e2b014', tailLen: 22, beak: '#f2d7b0', beakType: 'seed', iris: '#1a1a1a' },
    { id: 'kanarya-kirmizi', hidden: true, name: 'Kanarya (kırmızı)', pose: 'perch', body: '#f2793c', belly: '#f79a62', head: '#f06c30', wing: '#e0622a', prim: '#c24f20', pat: 'plain', tail: '#c95224', tailLen: 22, beak: '#f2d7b0', beakType: 'seed', iris: '#1a1a1a' },
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
  function byId(id) { for (var i = 0; i < BIRDS.length; i++) if (BIRDS[i].id === id) return BIRDS[i]; return null; }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function c(v) { return Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt))); }
    return '#' + ((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1);
  }
  var BEAK = { parrot: 'hook', parrotBig: 'hook', kea: 'hook', raptor: 'hook', owl: 'owl', seed: 'small', small: 'small', crow: 'mid', gull: 'mid',
    chisel: 'long', dagger: 'long', needle: 'needle', stork: 'long', curve: 'curve', toucan: 'toucan', puffin: 'puffin', flamingo: 'bent', duck: 'duck', swan: 'duck' };

  /* Pixel — fotoğraftan çizim (gri muhabbet kuşu), sağa bakıyor */
  function pixelSVG(opt) {
    opt = opt || {};
    var s = [], P = opt.prefix || 'px';
    var SIL = 'M246 62 C276 62 296 80 300 104 C302 116 300 128 296 140 C304 160 312 196 310 236 C308 290 286 330 248 342 C220 350 190 342 176 318 C160 290 156 240 160 200 C163 170 172 148 186 126 C192 88 214 62 246 62Z';
    var FACE = 'M262 66 C284 70 300 90 300 112 C300 130 296 146 294 160 C292 172 286 182 276 186 C262 190 248 182 244 168 C240 150 242 126 246 104 C249 86 254 70 262 66Z';
    var WING = 'M188 152 C210 160 222 196 220 240 C218 286 206 320 188 346 C174 324 164 290 162 250 C160 210 170 170 188 152Z';
    s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"' + (opt.size ? ' width="' + opt.size + '" height="' + opt.size + '"' : '') + ' role="img" aria-label="Pixel">');
    s.push('<defs>' +
      '<linearGradient id="' + P + 'sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf0fb"/><stop offset="1" stop-color="#fdf8f4"/></linearGradient>' +
      '<linearGradient id="' + P + 'body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#959da8"/><stop offset=".6" stop-color="#adb4bd"/><stop offset="1" stop-color="#c2c8cf"/></linearGradient>' +
      '<radialGradient id="' + P + 'chest" cx=".7" cy=".45" r=".55"><stop offset="0" stop-color="#cfd3d8"/><stop offset="1" stop-color="#cfd3d8" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + P + 'beak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0d98e"/><stop offset="1" stop-color="#cdaa52"/></linearGradient>' +
      '<linearGradient id="' + P + 'wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a98366"/><stop offset=".6" stop-color="#7e5b42"/><stop offset="1" stop-color="#5e4230"/></linearGradient>' +
      '<linearGradient id="' + P + 'tail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b424d"/><stop offset="1" stop-color="#20252c"/></linearGradient>' +
      '<linearGradient id="' + P + 'fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f5f5f3" stop-opacity="0"/><stop offset=".35" stop-color="#f5f5f3"/></linearGradient>' +
      '<linearGradient id="' + P + 'mg" gradientUnits="userSpaceOnUse" x1="236" y1="0" x2="276" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>' +
      '<mask id="' + P + 'm" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400"><rect width="400" height="400" fill="url(#' + P + 'mg)"/><rect x="236" y="60" width="80" height="40" fill="#fff" opacity=".35"/></mask>' +
      '<clipPath id="' + P + 'sil"><path d="' + SIL + '"/></clipPath>' +
      '<clipPath id="' + P + 'wc"><path d="' + WING + '"/></clipPath>' +
      '</defs>');
    if (opt.bg !== false) {
      s.push('<rect width="400" height="400" fill="url(#' + P + 'sky)"/>');
      s.push('<circle cx="78" cy="92" r="44" fill="#e2e8f8"/><circle cx="342" cy="58" r="22" fill="#f8e7e1"/>');
    }
    /* kuyruk */
    s.push('<path d="M184 316 L206 324 L178 400 L150 400Z" fill="url(#' + P + 'tail)"/><path d="M190 322 L199 325 L172 400 L163 400Z" fill="#5d6778" opacity=".8"/>');
    /* gövde silüeti */
    s.push('<path d="' + SIL + '" fill="url(#' + P + 'body)"/>');
    s.push('<g clip-path="url(#' + P + 'sil)">');
    s.push('<rect width="400" height="400" fill="url(#' + P + 'chest)"/>');
    /* göğüs dokusu */
    for (var i = 0; i < 14; i++) {
      var x = 240 + (i % 4) * 15 + (Math.floor(i / 4) % 2) * 7, y = 214 + Math.floor(i / 4) * 24;
      s.push('<path d="M' + x + ' ' + y + ' q5 4 10 0" stroke="#8a929c" stroke-width="1.3" fill="none" opacity=".4" stroke-linecap="round"/>');
    }
    /* baş ve ense: açık zemin + ince dalgalı siyah çizgiler */
    s.push('<path d="M150 40 H320 V150 C290 168 250 176 214 178 C196 180 176 176 150 168Z" fill="#efefec"/>');
    s.push('<path d="M262 66 C286 70 300 90 300 112 C298 104 288 96 272 92Z" fill="#f2e7c8" opacity=".7"/>');
    s.push('<g mask="url(#' + P + 'm)">');
    for (var r = 0; r < 24; r++) {
      var yy = 58 + r * 5, amp = 2.2, x0 = 150, d = 'M' + x0 + ' ' + yy;
      for (var k = 0; k < 9; k++) d += ' q9 ' + (k % 2 ? amp : -amp) + ' 18 0';
      var op = r > 20 ? 0.6 : 0.95;
      s.push('<path d="' + d + '" stroke="#24272d" stroke-width="1.5" fill="none" opacity="' + op + '" transform="rotate(' + (6 + r * 0.6) + ' 230 ' + yy + ')"/>');
    }
    s.push('</g>');
    /* yüz: beyaz, çizgiler alına doğru soluyor */

    s.push('</g>');
    /* kanat: siyah tüyler, açık renk pullar */
    s.push('<path d="' + WING + '" fill="#2b2f36"/>');
    s.push('<g clip-path="url(#' + P + 'wc)">');
    for (var row = 0; row < 18; row++) for (var col = 0; col < 6; col++) {
      var cx = 158 + col * 12 + (row % 2) * 6, cy = 158 + row * 10;
      s.push('<path d="M' + (cx - 6) + ' ' + cy + ' Q' + cx + ' ' + (cy + 8) + ' ' + (cx + 6) + ' ' + cy + '" stroke="#e6e8ea" stroke-width="1.7" fill="none" stroke-linecap="round"/>');
    }
    s.push('<path d="M150 300 L240 280 L240 360 L150 360Z" fill="#2b2f36" opacity=".55"/>');
    for (var p = 0; p < 4; p++) s.push('<path d="M' + (180 + p * 9) + ' 296 L' + (172 + p * 6) + ' 352" stroke="#7a828d" stroke-width="1.3"/>');
    s.push('</g>');
    s.push('<path d="' + WING + '" fill="none" stroke="#1d2025" stroke-width="1.6" opacity=".8"/>');
    /* boğaz benekleri */
    [[256, 178, 3.6], [270, 184, 4], [284, 180, 3.8], [245, 170, 3]].forEach(function (d) { s.push('<ellipse cx="' + d[0] + '" cy="' + d[1] + '" rx="' + d[2] + '" ry="' + (d[2] * 1.2).toFixed(1) + '" fill="#1d2025"/>'); });
    /* mavi yanak lekesi */
    s.push('<path d="M287 142 C292 143 294 151 292 159 C290 164 284 163 283 157 C282 150 283 142 287 142Z" fill="#5f7fcf"/>');
    /* göz */
    s.push('<circle cx="270" cy="100" r="7.5" fill="#f3f3f1"/><circle cx="270" cy="100" r="5.6" fill="#141518"/><circle cx="272" cy="97.6" r="1.9" fill="#fff"/>');
    /* burun (lila) ve gaga */
    s.push('<path d="M290 102 C296 98 305 100 307 107 C308 113 302 117 296 116 C290 115 287 108 290 102Z" fill="#a89ee8"/>');
    s.push('<path d="M294 116 C304 114 312 121 311 132 C310 142 303 150 296 154 C299 146 299 136 293 130 C289 126 289 118 294 116Z" fill="url(#' + P + 'beak)"/>');
    /* dal */
    s.push('<path d="M36 344 C140 336 260 338 370 330 C376 334 377 348 371 352 C260 360 140 360 38 362 C32 358 31 348 36 344Z" fill="url(#' + P + 'wood)"/>');
    s.push('<path d="M56 345 C150 339 260 341 360 334" stroke="#c4a184" stroke-width="2" fill="none" opacity=".7"/>');
    s.push('<path d="M330 338 C340 318 352 306 370 298" stroke="#7e5b42" stroke-width="6" fill="none" stroke-linecap="round"/>');
    s.push('<path d="M370 298 c10 -16 26 -18 32 -14 c-6 14 -20 20 -32 14Z" fill="#9cc58a"/><path d="M360 304 c-6 -16 2 -28 12 -32 c4 12 -2 24 -12 32Z" fill="#b6d6a4"/>');
    /* ayaklar */
    [[222, 338], [262, 336]].forEach(function (f) {
      s.push('<path d="M' + f[0] + ' ' + (f[1] - 12) + ' L' + f[0] + ' ' + (f[1] + 2) + '" stroke="#e8a9a6" stroke-width="8" stroke-linecap="round"/>');
      s.push('<path d="M' + f[0] + ' ' + (f[1] + 2) + ' q-11 2 -13 15 M' + f[0] + ' ' + (f[1] + 2) + ' q-1 8 -3 19 M' + f[0] + ' ' + (f[1] + 2) + ' q10 4 11 17" stroke="#e8a9a6" stroke-width="6" fill="none" stroke-linecap="round"/>');
    });
    s.push('</svg>');
    return s.join('');
  }


  /* ---------- Şirin kuş ----------
     Yuvarlak gövde (baş ve gövde tek parça), büyük gözler, küçük kanatlar. opt.size, opt.scene */
  function birdSVG(id, opt) {
    if (typeof opt === 'number') opt = { size: opt };
    opt = opt || {};
    if (id === 'pixel') return pixelSVG({ size: opt.size, bg: !!opt.scene, prefix: 'px' + (++uid) });
    var b = byId(id) || BIRDS[1], u = 'c' + (++uid), o = [];
    var bt = BEAK[b.beakType] || 'small', tall = b.pose === 'tall', owl = !!b.owl, peng = b.pose === 'penguin';
    var vb = opt.scene ? '-30 -30 160 160' : '0 0 100 100';
    o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"' + (opt.size ? ' width="' + opt.size + '" height="' + opt.size + '"' : '') + ' role="img" aria-label="' + b.name + '">');
    var BODY = 'M50 14 C72 14 82 32 82 54 C82 78 68 90 50 90 C32 90 18 78 18 54 C18 32 28 14 50 14Z';
    o.push('<defs><clipPath id="' + u + 'b"><path d="' + BODY + '"/></clipPath>' +
      '<radialGradient id="' + u + 'g" cx=".35" cy=".28" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient>' +
      (opt.scene ? '<linearGradient id="' + u + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf0fb"/><stop offset="1" stop-color="#fdf8f4"/></linearGradient>' : '') + '</defs>');
    if (opt.scene) o.push('<rect x="-30" y="-30" width="160" height="160" fill="url(#' + u + 's)"/><circle cx="-6" cy="0" r="16" fill="#e2e8f8"/><circle cx="112" cy="-12" r="9" fill="#f8e7e1"/>' +
      '<path d="M-24 104 C20 100 80 101 124 97 L124 104 C80 108 20 109 -24 110Z" fill="#8a654a"/>');

    /* kuyruk (arkada) */
    var tl = Math.min(26, (b.tailLen || 20) * 0.5), tc = b.tail;
    if (b.tailType === 'peacock') {
      o.push('<path d="M50 70 C10 64 -4 30 8 10 C20 34 34 48 50 56 C66 48 80 34 92 10 C104 30 90 64 50 70Z" fill="' + tc + '"/>');
      [[14, 22], [86, 22], [24, 40], [76, 40], [50, 30]].forEach(function (p) { o.push('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="#e8c84a"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.4" fill="#1f5fb0"/>'); });
    } else if (b.tailType === 'rooster') {
      o.push('<path d="M66 70 C90 40 104 52 98 80 C92 66 84 66 74 80Z" fill="' + tc + '"/><path d="M68 76 C92 56 100 70 92 92 C88 80 80 80 72 88Z" fill="' + shade(tc, 0.25) + '"/>');
    } else if (b.tailType === 'fork') {
      o.push('<path d="M62 78 L80 100 L70 90 L64 100 Z" fill="' + tc + '"/><path d="M58 80 L56 102 L52 92 Z" fill="' + shade(tc, -0.1) + '"/>');
    } else if (!peng) {
      o.push('<path d="M58 78 C66 82 ' + (70 + tl * 0.4) + ' ' + (82 + tl) + ' ' + (68 + tl * 0.3) + ' ' + (86 + tl) + ' C' + (62 + tl * 0.2) + ' ' + (86 + tl * 0.8) + ' 56 86 52 82Z" fill="' + tc + '"/>');
    }
    /* tepelik (arkada) */
    var cc = b.crestC || b.head || b.body;
    if (b.crest === 'cockatiel') o.push('<path d="M48 18 C44 6 50 -2 58 -2 C54 4 54 10 56 16Z" fill="' + cc + '"/><path d="M52 17 C54 6 62 2 68 4 C62 8 60 12 58 18Z" fill="' + shade(cc, -0.08) + '"/>');
    if (b.crest === 'cockatoo' || b.crest === 'galah') for (var ci = 0; ci < 5; ci++) o.push('<path d="M' + (38 + ci * 6) + ' 20 C' + (34 + ci * 7) + ' ' + (b.crest === 'galah' ? 8 : 2) + ' ' + (40 + ci * 7) + ' ' + (b.crest === 'galah' ? 6 : -2) + ' ' + (46 + ci * 6) + ' 18Z" fill="' + (ci % 2 ? cc : shade(cc, -0.1)) + '"/>');
    if (b.crest === 'cardinal' || b.crest === 'jay') o.push('<path d="M42 20 L56 0 L60 20Z" fill="' + cc + '"/>');
    if (b.crest === 'hoopoe') for (var hi = 0; hi < 5; hi++) o.push('<path d="M' + (36 + hi * 7) + ' 20 L' + (30 + hi * 9) + ' 2 L' + (40 + hi * 7) + ' 18Z" fill="' + cc + '"/><circle cx="' + (30 + hi * 9) + '" cy="3" r="2" fill="#1f1f1f"/>');
    if (b.crest === 'peacock') for (var pi = 0; pi < 3; pi++) o.push('<path d="M' + (44 + pi * 6) + ' 16 L' + (42 + pi * 8) + ' 4" stroke="' + cc + '" stroke-width="1.4"/><circle cx="' + (42 + pi * 8) + '" cy="3" r="2.6" fill="' + cc + '"/>');
    if (b.crest === 'tufts') o.push('<path d="M26 26 L22 6 L38 18Z M74 26 L78 6 L62 18Z" fill="' + shade(cc, -0.1) + '"/>');
    if (b.crest === 'comb') o.push('<path d="M38 18 C36 8 44 6 46 12 C46 4 54 4 54 12 C56 6 64 8 62 18Z" fill="' + cc + '"/>');
    if (b.crest === 'heron') o.push('<path d="M56 18 C66 12 76 12 84 16" stroke="' + cc + '" stroke-width="2" fill="none" stroke-linecap="round"/>');

    /* bacaklar */
    var lc = b.legs || '#f0a77c';
    if (tall) o.push('<path d="M42 86 L40 108 M58 86 L60 108" stroke="' + lc + '" stroke-width="2.6" stroke-linecap="round"/>');

    /* gövde */
    o.push('<path d="' + BODY + '" fill="' + b.body + '"/>');
    o.push('<g clip-path="url(#' + u + 'b)">');
    var bellyC = b.belly;
    o.push('<ellipse cx="50" cy="' + (peng ? 62 : 70) + '" rx="' + (peng ? 24 : 22) + '" ry="' + (peng ? 30 : 22) + '" fill="' + bellyC + '"/>');
    if (b.head && b.head !== b.body) o.push('<path d="M0 0 H100 V44 C80 52 64 54 50 54 C36 54 20 52 0 44Z" fill="' + b.head + '"/>');
    if (b.crown) o.push('<path d="M0 0 H100 V26 C80 22 64 20 50 20 C36 20 20 22 0 26Z" fill="' + b.crown + '"/>');
    if (b.headPat === 'barring') for (var r = 0; r < 4; r++) o.push('<path d="M26 ' + (22 + r * 5) + ' q6 -3 12 0 t12 0 t12 0 t12 0" stroke="#2a2d32" stroke-width="1.6" fill="none" opacity=".75"/>');
    if (b.neck) o.push('<path d="M0 50 C30 60 70 60 100 50 V56 C70 66 30 66 0 56Z" fill="' + b.neck + '"/>');
    if (b.bib) o.push('<path d="M36 62 C42 58 58 58 64 62 C62 72 56 76 50 76 C44 76 38 72 36 62Z" fill="' + b.bib + '"/>');
    if (b.necklace) o.push('<path d="M26 54 Q50 70 74 54" stroke="' + b.necklace + '" stroke-width="2.4" fill="none"/>');
    if (b.face) o.push('<ellipse cx="50" cy="42" rx="20" ry="14" fill="' + b.face + '"/>');
    if (b.mask) o.push('<path d="M20 38 C34 32 66 32 80 38 L80 48 C66 44 34 44 20 48Z" fill="' + b.mask + '"/>');
    if (b.bellyPat === 'streak') for (var si = 0; si < 6; si++) o.push('<path d="M' + (38 + (si % 3) * 12) + ' ' + (64 + Math.floor(si / 3) * 10) + ' l0 4" stroke="' + shade(b.body, -0.3) + '" stroke-width="1.6" stroke-linecap="round"/>');
    if (b.bellyPat === 'spots') for (var sj = 0; sj < 6; sj++) o.push('<path d="M' + (36 + (sj % 3) * 12) + ' ' + (64 + Math.floor(sj / 3) * 10) + ' q2 2 4 0" stroke="' + shade(b.body, -0.4) + '" stroke-width="1.4" fill="none"/>');
    o.push('<rect width="100" height="100" fill="url(#' + u + 'g)"/>');
    o.push('</g>');

    /* kanatlar */
    var wc = b.wing, pc = b.patC || shade(wc, 0.4);
    [['M20 50 C10 56 10 74 22 82 C26 72 26 60 20 50Z', 1], ['M80 50 C90 56 90 74 78 82 C74 72 74 60 80 50Z', -1]].forEach(function (w) {
      o.push('<path d="' + w[0] + '" fill="' + wc + '"/>');
      if (b.pat === 'scallop' || b.pat === 'bars' || b.pat === 'stripe' || b.pat === 'spots') {
        var x0 = w[1] > 0 ? 18 : 82, sgn = w[1];
        for (var k = 0; k < 3; k++) {
          if (b.pat === 'spots') o.push('<circle cx="' + (x0 - sgn * 0.5) + '" cy="' + (60 + k * 7) + '" r="1.5" fill="' + pc + '"/>');
          else o.push('<path d="M' + (x0 - sgn * 2.5) + ' ' + (58 + k * 7) + ' q' + (sgn * 2.5) + ' ' + (b.pat === 'scallop' ? 3 : 0) + ' ' + (sgn * 5) + ' 0" stroke="' + pc + '" stroke-width="' + (b.pat === 'stripe' ? 2.6 : 1.5) + '" fill="none" stroke-linecap="round"/>');
        }
      }
    });

    /* göz */
    var ey = owl ? 40 : 40, ex = owl ? 13 : 11, er = owl ? 10 : 8.4;
    [50 - ex, 50 + ex].forEach(function (x) {
      if (owl) o.push('<circle cx="' + x + '" cy="' + ey + '" r="' + (er + 3) + '" fill="' + shade(b.belly, 0.25) + '"/>');
      if (b.eyeRing) o.push('<circle cx="' + x + '" cy="' + ey + '" r="' + (er + 2.2) + '" fill="' + b.eyeRing + '"/>');
      o.push('<circle cx="' + x + '" cy="' + ey + '" r="' + er + '" fill="#ffffff"/>');
      if (owl && b.iris) o.push('<circle cx="' + (x + 1) + '" cy="' + (ey + 0.5) + '" r="' + (er * 0.72) + '" fill="' + b.iris + '"/>');
      o.push('<circle cx="' + (x + 1.2) + '" cy="' + (ey + 0.8) + '" r="' + (er * 0.52) + '" fill="#1b1c22"/>');
      o.push('<circle cx="' + (x + 3) + '" cy="' + (ey - 1.6) + '" r="' + (er * 0.22) + '" fill="#ffffff"/>');
      if (b.brow) o.push('<path d="M' + (x - 8) + ' ' + (ey - 9) + ' L' + (x + 8) + ' ' + (ey - 7 + (x < 50 ? 2 : -2)) + '" stroke="' + shade(b.head || b.body, -0.35) + '" stroke-width="2.6" stroke-linecap="round"/>');
    });
    /* yanak */
    if (b.cheek) o.push('<ellipse cx="29" cy="55" rx="' + (b.cheekBig ? 6 : 4.5) + '" ry="' + (b.cheekBig ? 5 : 5.5) + '" fill="' + b.cheek + '"/><ellipse cx="71" cy="55" rx="' + (b.cheekBig ? 6 : 4.5) + '" ry="' + (b.cheekBig ? 5 : 5.5) + '" fill="' + b.cheek + '"/>');
    else o.push('<ellipse cx="30" cy="54" rx="5" ry="3" fill="#ff9aa8" opacity=".35"/><ellipse cx="70" cy="54" rx="5" ry="3" fill="#ff9aa8" opacity=".35"/>');
    if (b.spots) o.push('<g fill="#25282e"><circle cx="42" cy="62" r="1.8"/><circle cx="50" cy="64" r="1.8"/><circle cx="58" cy="62" r="1.8"/></g>');
    if (b.jaw) o.push('<path d="M42 56 Q50 62 58 56" stroke="' + b.jaw + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>');

    /* gaga */
    var bc = b.beak, tc2 = b.beakTip, d = shade(bc, -0.2);
    var BK = {
      hook: '<path d="M44 46 C44 42 56 42 56 46 C56 52 52 58 50 60 C48 58 44 52 44 46Z" fill="' + bc + '"/><path d="M47 51 C49 54 51 54 53 51" stroke="' + d + '" stroke-width="1.2" fill="none"/>',
      small: '<path d="M45 47 L55 47 L50 54Z" fill="' + bc + '"/>',
      mid: '<path d="M44 46 L56 46 L50 58Z" fill="' + bc + '"/><path d="M44 46 L56 46" stroke="' + d + '" stroke-width="1"/>',
      long: '<path d="M46 46 L54 46 L50 70Z" fill="' + bc + '"/>' + (tc2 ? '<path d="M48.5 62 L51.5 62 L50 70Z" fill="' + tc2 + '"/>' : ''),
      needle: '<path d="M48 47 L52 47 L50 72Z" fill="' + bc + '"/>',
      curve: '<path d="M46 46 L54 46 C54 56 50 64 42 68 C46 62 48 56 46 46Z" fill="' + bc + '"/>',
      toucan: '<path d="M40 44 C40 40 60 40 60 44 C60 56 54 70 50 74 C46 70 40 56 40 44Z" fill="' + bc + '"/>' + (tc2 ? '<path d="M46 66 C48 72 52 72 54 66 C52 70 48 70 46 66Z" fill="' + tc2 + '"/>' : ''),
      puffin: '<path d="M43 45 C43 40 57 40 57 45 C57 54 53 60 50 62 C47 60 43 54 43 45Z" fill="' + bc + '"/><path d="M44 47 C48 49 52 49 56 47" stroke="#f6d23a" stroke-width="1.6" fill="none"/>',
      bent: '<path d="M46 45 L54 45 L54 54 C54 60 50 64 46 64 C48 60 48 56 46 52Z" fill="' + bc + '"/>' + (tc2 ? '<path d="M47 58 C48 62 50 63 46 64 C49 62 50 60 50 58Z" fill="' + tc2 + '"/>' : ''),
      duck: '<path d="M41 46 C41 43 59 43 59 46 C59 52 54 55 50 55 C46 55 41 52 41 46Z" fill="' + bc + '"/>',
      owl: '<path d="M47 47 L53 47 L50 54Z" fill="' + bc + '"/>'
    };
    o.push(BK[bt] || BK.small);
    if (b.cere) o.push('<ellipse cx="50" cy="44.5" rx="5" ry="2.4" fill="' + b.cere + '"/>');

    /* ayaklar */
    if (!tall) o.push('<g fill="' + lc + '"><path d="M38 88 C38 94 34 96 32 96 L46 96 C44 96 42 94 42 88Z"/><path d="M58 88 C58 94 54 96 54 96 L68 96 C66 96 62 94 62 88Z"/></g>');
    else o.push('<path d="M34 108 L46 108 M54 108 L66 108" stroke="' + lc + '" stroke-width="2.6" stroke-linecap="round"/>');
    o.push('</svg>');
    return o.join('');
  }


  /* ---------- Logo: Pixel'in sade ikonu ---------- */
  function logoSVG(size) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"' + (size ? ' width="' + size + '" height="' + size + '"' : '') + ' role="img" aria-label="PixelTime">' +
      '<defs><clipPath id="lg-c"><rect width="64" height="64" rx="18"/></clipPath><clipPath id="lg-h"><path d="M12 64 C9 46 10 30 17 20 C24 10 38 8 47 14 C54 19 56 27 54 34 C58 42 58 54 54 64Z"/></clipPath></defs>' +
      '<g clip-path="url(#lg-c)"><rect width="64" height="64" fill="#e3e7fb"/>' +
      '<path d="M12 64 C9 46 10 30 17 20 C24 10 38 8 47 14 C54 19 56 27 54 34 C58 42 58 54 54 64Z" fill="#b3b9c2"/>' +
      '<g clip-path="url(#lg-h)"><path d="M0 0 H64 V36 C50 42 30 42 0 34Z" fill="#f1f1ee"/>' +
      '<path d="M8 17 Q16 13 24 16 M6 22 Q15 18 24 21 M6 27 Q15 23 25 26 M7 32 Q16 28 26 31 M9 37 Q17 33 27 36" stroke="#2a2d33" stroke-width="2.1" fill="none" stroke-linecap="round"/>' +
      '<path d="M8 40 C14 50 18 58 22 64 L8 64Z" fill="#2b2f36"/></g></g>' +
      '<circle cx="40" cy="22" r="2.8" fill="#16171b"/><circle cx="41" cy="21" r="1" fill="#fff"/>' +
      '<path d="M48 20 C52 18 56 20 56 24 C56 27 52 28 49 27Z" fill="#a89ee8"/>' +
      '<path d="M49 27 C54 27 57 31 56 35 C55 38 52 40 49 41 C50 38 50 34 47 31Z" fill="#e7c766"/>' +
      '<ellipse cx="45.5" cy="33" rx="2.2" ry="3.3" fill="#5f7fcf"/>' +
      '<g fill="#2a2d33"><circle cx="38" cy="39.5" r="1.5"/><circle cx="42.5" cy="41.5" r="1.5"/><circle cx="47" cy="40.5" r="1.4"/></g>' +
      '</svg>';
  }

  var WIKI = {"muhabbet-yesil": "Budgerigar", "muhabbet-mavi": "Budgerigar", "muhabbet-sari": "Budgerigar", "muhabbet-beyaz": "Budgerigar", "muhabbet-mor": "Budgerigar", "sultan": "Cockatiel", "sultan-beyaz": "Cockatiel", "kanarya": "Domestic_canary", "kanarya-kirmizi": "Domestic_canary", "zebra": "Zebra_finch", "jako": "Grey_parrot", "ara-kirmizi": "Scarlet_macaw", "ara-mavi": "Blue-and-yellow_macaw", "sumbul-ara": "Hyacinth_macaw", "kakadu": "Sulphur-crested_cockatoo", "pembe-kakadu": "Galah", "amazon": "Turquoise-fronted_amazon", "eclectus": "Moluccan_eclectus", "gunes-konuru": "Sun_parakeet", "quaker": "Monk_parakeet", "lori": "Rainbow_lorikeet", "cennet": "Rosy-faced_lovebird", "rosella": "Eastern_rosella", "kea": "Kea", "karga": "Hooded_crow", "saksagan": "Eurasian_magpie", "alakarga": "Eurasian_jay", "mavi-alakarga": "Blue_jay", "kartal": "Golden_eagle", "sahin": "Long-legged_buzzard", "kerkenez": "Common_kestrel", "baykus": "Eurasian_eagle-owl", "kar-baykusu": "Snowy_owl", "peceli-baykus": "Barn_owl", "serce": "House_sparrow", "kirlangic": "Barn_swallow", "kizilgerdan": "European_robin", "karatavuk": "Common_blackbird", "bulbul": "Common_nightingale", "saka": "European_goldfinch", "kardinal": "Northern_cardinal", "agackakan": "Great_spotted_woodpecker", "yalicapkini": "Common_kingfisher", "arikusu": "European_bee-eater", "ibibik": "Eurasian_hoopoe", "kolibri": "Ruby-throated_hummingbird", "tukan": "Toco_toucan", "guvercin": "Rock_dove", "marti": "Yellow-legged_gull", "deniz-papagani": "Atlantic_puffin", "penguen": "Emperor_penguin", "flamingo": "Greater_flamingo", "leylek": "White_stork", "balikcil": "Grey_heron", "tavus": "Indian_peafowl", "yesilbas": "Mallard", "kugu": "Mute_swan", "horoz": "Chicken"};
  root.PT_BIRDS = { wiki: WIKI, logo: logoSVG, list: BIRDS.filter(function (x) { return !x.hidden; }), all: BIRDS, svg: birdSVG, get: byId };
})(typeof window !== 'undefined' ? window : globalThis);

/* PixelTime kuşları — yalnızca gerçek fotoğraflar.
   Her kuşun fotoğrafı:
     1) img/kuslar/<id>.jpg varsa (local: true) o kullanılır,
     2) yoksa Wikipedia'daki makalenin ana fotoğrafı kullanılır.
   Yeni kuş eklemek: fotoğrafı img/kuslar/<id>.jpg olarak koy, aşağıya bir satır ekle, local: true yaz. */
(function (root) {
  'use strict';

  var CATS = [['papagan', 'Papağanlar'], ['otucu', 'Ötücüler'], ['yirtici', 'Yırtıcılar ve baykuşlar'], ['su', 'Su kuşları'], ['diger', 'Diğerleri']];

  /* [id, Türkçe ad, Latince ad, kategori, Wikipedia başlığı] */
  var LIST = [
    ['muhabbet', 'Muhabbet kuşu', 'Melopsittacus undulatus', 'papagan', 'Budgerigar'],
    ['sultan', 'Sultan papağanı', 'Nymphicus hollandicus', 'papagan', 'Cockatiel'],
    ['jako', 'Jako', 'Psittacus erithacus', 'papagan', 'Grey_parrot'],
    ['ara-kirmizi', 'Kırmızı ara', 'Ara macao', 'papagan', 'Scarlet_macaw'],
    ['ara-mavi', 'Mavi-sarı ara', 'Ara ararauna', 'papagan', 'Blue-and-yellow_macaw'],
    ['sumbul-ara', 'Sümbül arası', 'Anodorhynchus hyacinthinus', 'papagan', 'Hyacinth_macaw'],
    ['kakadu', 'Sarı tepeli kakadu', 'Cacatua galerita', 'papagan', 'Sulphur-crested_cockatoo'],
    ['pembe-kakadu', 'Pembe kakadu', 'Eolophus roseicapilla', 'papagan', 'Galah'],
    ['lori', 'Gökkuşağı lorisi', 'Trichoglossus moluccanus', 'papagan', 'Rainbow_lorikeet'],
    ['cennet', 'Cennet papağanı', 'Agapornis roseicollis', 'papagan', 'Rosy-faced_lovebird'],
    ['gunes-konuru', 'Güneş konuru', 'Aratinga solstitialis', 'papagan', 'Sun_parakeet'],
    ['kesis', 'Keşiş papağanı', 'Myiopsitta monachus', 'papagan', 'Monk_parakeet'],
    ['yakali-papagan', 'Yakalı yeşil papağan', 'Psittacula krameri', 'papagan', 'Rose-ringed_parakeet'],
    ['kea', 'Kea', 'Nestor notabilis', 'papagan', 'Kea'],
    ['kakapo', 'Kakapo', 'Strigops habroptilus', 'papagan', 'Kākāpō'],

    ['kanarya', 'Kanarya', 'Serinus canaria', 'otucu', 'Domestic_canary'],
    ['gouldian', 'Gouldian ispinozu', 'Chloebia gouldiae', 'otucu', 'Gouldian_finch'],
    ['saka', 'Saka', 'Carduelis carduelis', 'otucu', 'European_goldfinch'],
    ['kizilgerdan', 'Kızılgerdan', 'Erithacus rubecula', 'otucu', 'European_robin'],
    ['bulbul', 'Bülbül', 'Luscinia megarhynchos', 'otucu', 'Common_nightingale'],
    ['serce', 'Serçe', 'Passer domesticus', 'otucu', 'House_sparrow'],
    ['kirlangic', 'Kır kırlangıcı', 'Hirundo rustica', 'otucu', 'Barn_swallow'],
    ['mavi-bastankara', 'Mavi baştankara', 'Cyanistes caeruleus', 'otucu', 'Eurasian_blue_tit'],
    ['karatavuk', 'Karatavuk', 'Turdus merula', 'otucu', 'Common_blackbird'],
    ['sigircik', 'Sığırcık', 'Sturnus vulgaris', 'otucu', 'Common_starling'],
    ['kardinal', 'Kardinal', 'Cardinalis cardinalis', 'otucu', 'Northern_cardinal'],
    ['alakarga', 'Alakarga', 'Garrulus glandarius', 'otucu', 'Eurasian_jay'],
    ['mavi-alakarga', 'Mavi alakarga', 'Cyanocitta cristata', 'otucu', 'Blue_jay'],
    ['saksagan', 'Saksağan', 'Pica pica', 'otucu', 'Eurasian_magpie'],
    ['karga', 'Leş kargası', 'Corvus cornix', 'otucu', 'Hooded_crow'],
    ['kuzgun', 'Kuzgun', 'Corvus corax', 'otucu', 'Common_raven'],

    ['kartal', 'Kaya kartalı', 'Aquila chrysaetos', 'yirtici', 'Golden_eagle'],
    ['kel-kartal', 'Kel kartal', 'Haliaeetus leucocephalus', 'yirtici', 'Bald_eagle'],
    ['gokdogan', 'Gökdoğan', 'Falco peregrinus', 'yirtici', 'Peregrine_falcon'],
    ['kerkenez', 'Kerkenez', 'Falco tinnunculus', 'yirtici', 'Common_kestrel'],
    ['puhu', 'Puhu', 'Bubo bubo', 'yirtici', 'Eurasian_eagle-owl'],
    ['kar-baykusu', 'Kar baykuşu', 'Bubo scandiacus', 'yirtici', 'Snowy_owl'],
    ['peceli-baykus', 'Peçeli baykuş', 'Tyto alba', 'yirtici', 'Barn_owl'],
    ['kukumav', 'Kukumav', 'Athene noctua', 'yirtici', 'Little_owl'],

    ['flamingo', 'Flamingo', 'Phoenicopterus roseus', 'su', 'Greater_flamingo'],
    ['leylek', 'Ak leylek', 'Ciconia ciconia', 'su', 'White_stork'],
    ['balikcil', 'Gri balıkçıl', 'Ardea cinerea', 'su', 'Grey_heron'],
    ['kugu', 'Kuğu', 'Cygnus olor', 'su', 'Mute_swan'],
    ['yesilbas', 'Yeşilbaş', 'Anas platyrhynchos', 'su', 'Mallard'],
    ['mandarin', 'Mandarin ördeği', 'Aix galericulata', 'su', 'Mandarin_duck'],
    ['deniz-papagani', 'Deniz papağanı', 'Fratercula arctica', 'su', 'Atlantic_puffin'],
    ['penguen', 'İmparator penguen', 'Aptenodytes forsteri', 'su', 'Emperor_penguin'],
    ['yalicapkini', 'Yalıçapkını', 'Alcedo atthis', 'su', 'Common_kingfisher'],
    ['pelikan', 'Ak pelikan', 'Pelecanus onocrotalus', 'su', 'Great_white_pelican'],
    ['kelaynak', 'Kelaynak', 'Geronticus eremita', 'su', 'Northern_bald_ibis'],
    ['turna', 'Turna', 'Grus grus', 'su', 'Common_crane'],

    ['tavus', 'Tavus kuşu', 'Pavo cristatus', 'diger', 'Indian_peafowl'],
    ['ibibik', 'İbibik', 'Upupa epops', 'diger', 'Eurasian_hoopoe'],
    ['arikusu', 'Arıkuşu', 'Merops apiaster', 'diger', 'European_bee-eater'],
    ['tukan', 'Tukan', 'Ramphastos toco', 'diger', 'Toco_toucan'],
    ['kolibri', 'Yakut boğazlı kolibri', 'Archilochus colubris', 'diger', 'Ruby-throated_hummingbird'],
    ['agackakan', 'Büyük alaca ağaçkakan', 'Dendrocopos major', 'diger', 'Great_spotted_woodpecker'],
    ['guvercin', 'Kaya güvercini', 'Columba livia', 'diger', 'Rock_dove'],
    ['ketzal', 'Ketzal', 'Pharomachrus mocinno', 'diger', 'Resplendent_quetzal'],
    ['altin-sulun', 'Altın sülün', 'Chrysolophus pictus', 'diger', 'Golden_pheasant'],
    ['pabuc-gaga', 'Pabuç gagalı leylek', 'Balaeniceps rex', 'diger', 'Shoebill']
  ];

  var BIRDS = LIST.map(function (r) { return { id: r[0], name: r[1], latin: r[2], cat: r[3], wiki: r[4], local: !!r[5] }; });

  /* Pixel: PixelTime Saat sahiplerine özel. Seçim listesinde yoktur. */
  var PIXEL = { id: 'pixel', name: 'Pixel', latin: 'Melopsittacus undulatus', cat: 'pro', src: 'img/pixel-portre.jpg', pro: true };

  /* Eski sürümden kalan kuş adları */
  var OLD = { 'muhabbet-yesil': 'muhabbet', 'muhabbet-mavi': 'muhabbet', 'muhabbet-sari': 'muhabbet', 'muhabbet-beyaz': 'muhabbet', 'muhabbet-mor': 'muhabbet',
    'sultan-beyaz': 'sultan', 'kanarya-kirmizi': 'kanarya', quaker: 'kesis', baykus: 'puhu', sahin: 'kartal' };

  function get(id) {
    if (id === 'pixel') return PIXEL;
    for (var i = 0; i < BIRDS.length; i++) if (BIRDS[i].id === id) return BIRDS[i];
    return null;
  }
  function fix(id) { return get(id) ? id : (OLD[id] && get(OLD[id]) ? OLD[id] : 'muhabbet'); }

  root.PT_BIRDS = { list: BIRDS, cats: CATS, pixel: PIXEL, get: get, fix: fix };
})(typeof window !== 'undefined' ? window : globalThis);

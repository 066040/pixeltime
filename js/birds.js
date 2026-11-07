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
    ['eklektus', 'Eklektus papağanı', 'Eclectus roratus', 'papagan', 'Moluccan_eclectus'],
    ['amazon-mavi', 'Mavi alınlı amazon', 'Amazona aestiva', 'papagan', 'Turquoise-fronted_amazon'],
    ['amazon-sari', 'Sarı başlı amazon', 'Amazona oratrix', 'papagan', 'Yellow-headed_amazon'],
    ['kaika', 'Kara başlı kaika', 'Pionites melanocephalus', 'papagan', 'Black-headed_parrot'],
    ['senegal', 'Senegal papağanı', 'Poicephalus senegalus', 'papagan', 'Senegal_parrot'],
    ['bourke', 'Bourke papağanı', 'Neopsephotus bourkii', 'papagan', "Bourke's_parrot"],
    ['kizil-rozella', 'Kızıl rozella', 'Platycercus elegans', 'papagan', 'Crimson_rosella'],
    ['dogu-rozella', 'Doğu rozellası', 'Platycercus eximius', 'papagan', 'Eastern_rosella'],
    ['kral-papagan', 'Avustralya kral papağanı', 'Alisterus scapularis', 'papagan', 'Australian_king_parrot'],
    ['prenses', 'Prenses papağanı', 'Polytelis alexandrae', 'papagan', 'Princess_parrot'],
    ['yesil-yanak', 'Yeşil yanaklı konur', 'Pyrrhura molinae', 'papagan', 'Green-cheeked_parakeet'],
    ['nanday', 'Nanday konuru', 'Aratinga nenday', 'papagan', 'Nanday_parakeet'],
    ['iskender', 'İskender papağanı', 'Psittacula eupatria', 'papagan', 'Alexandrine_parakeet'],
    ['cizgili-muhabbet', 'Çizgili muhabbet', 'Bolborhynchus lineola', 'papagan', 'Lineolated_parakeet'],
    ['papagancik', 'Pasifik papağancığı', 'Forpus coelestis', 'papagan', 'Pacific_parrotlet'],
    ['fischer', 'Fischer cennet papağanı', 'Agapornis fischeri', 'papagan', "Fischer's_lovebird"],
    ['maskeli-cennet', 'Maskeli cennet papağanı', 'Agapornis personatus', 'papagan', 'Yellow-collared_lovebird'],
    ['kara-kakadu', 'Kırmızı kuyruklu kara kakadu', 'Calyptorhynchus banksii', 'papagan', 'Red-tailed_black_cockatoo'],
    ['gang-gang', 'Gang-gang kakadusu', 'Callocephalon fimbriatum', 'papagan', 'Gang-gang_cockatoo'],
    ['mitchell', 'Pembe tepeli kakadu', 'Lophochroa leadbeateri', 'papagan', 'Pink_cockatoo'],
    ['semsiye-kakadu', 'Şemsiye kakadu', 'Cacatua alba', 'papagan', 'White_cockatoo'],
    ['palmiye-kakadu', 'Palmiye kakadusu', 'Probosciger aterrimus', 'papagan', 'Palm_cockatoo'],
    ['ara-yesil', 'Kırmızı-yeşil ara', 'Ara chloropterus', 'papagan', 'Red-and-green_macaw'],
    ['ara-asker', 'Asker arası', 'Ara militaris', 'papagan', 'Military_macaw'],
    ['ara-kucuk', 'Kızıl omuzlu küçük ara', 'Diopsittaca nobilis', 'papagan', 'Red-shouldered_macaw'],

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
    ['florya', 'Florya', 'Chloris chloris', 'otucu', 'European_greenfinch'],
    ['ispinoz', 'İspinoz', 'Fringilla coelebs', 'otucu', 'Common_chaffinch'],
    ['sakrak', 'Şakrak', 'Pyrrhula pyrrhula', 'otucu', 'Eurasian_bullfinch'],
    ['bastankara', 'Büyük baştankara', 'Parus major', 'otucu', 'Great_tit'],
    ['kuyruklu-bastankara', 'Uzun kuyruklu baştankara', 'Aegithalos caudatus', 'otucu', 'Long-tailed_tit'],
    ['citkusu', 'Çıtkuşu', 'Troglodytes troglodytes', 'otucu', 'Eurasian_wren'],
    ['sariasma', 'Sarıasma', 'Oriolus oriolus', 'otucu', 'Eurasian_golden_oriole'],
    ['orumcekkusu', 'Kızılsırtlı örümcekkuşu', 'Lanius collurio', 'otucu', 'Red-backed_shrike'],
    ['tarlakusu', 'Tarlakuşu', 'Alauda arvensis', 'otucu', 'Eurasian_skylark'],
    ['kuyruksallayan', 'Ak kuyruksallayan', 'Motacilla alba', 'otucu', 'White_wagtail'],
    ['kizilkuyruk', 'Kızılkuyruk', 'Phoenicurus phoenicurus', 'otucu', 'Common_redstart'],
    ['taskusu', 'Taşkuşu', 'Saxicola rubicola', 'otucu', 'European_stonechat'],
    ['ardic', 'Öter ardıç', 'Turdus philomelos', 'otucu', 'Song_thrush'],
    ['pembe-sigircik', 'Pembe sığırcık', 'Pastor roseus', 'otucu', 'Rosy_starling'],
    ['sivaci', 'Sıvacıkuşu', 'Sitta europaea', 'otucu', 'Eurasian_nuthatch'],
    ['zebra', 'Zebra ispinozu', 'Taeniopygia castanotis', 'otucu', 'Zebra_finch'],
    ['amerikan-saka', 'Amerikan sakası', 'Spinus tristis', 'otucu', 'American_goldfinch'],
    ['civit', 'Çivit kirazkuşu', 'Passerina cyanea', 'otucu', 'Indigo_bunting'],
    ['boyali', 'Boyalı kirazkuşu', 'Passerina ciris', 'otucu', 'Painted_bunting'],
    ['peri', 'Peri çıtkuşu', 'Malurus cyaneus', 'otucu', 'Superb_fairywren'],
    ['cennet-kusu', 'Raggiana cennet kuşu', 'Paradisaea raggiana', 'otucu', 'Raggiana_bird-of-paradise'],
    ['lirkusu', 'Lirkuşu', 'Menura novaehollandiae', 'otucu', 'Superb_lyrebird'],
    ['ekin-kargasi', 'Ekin kargası', 'Corvus frugilegus', 'otucu', 'Rook_(bird)'],
    ['kucuk-karga', 'Küçük karga', 'Coloeus monedula', 'otucu', 'Western_jackdaw'],
    ['dag-kargasi', 'Kırmızı gagalı dağ kargası', 'Pyrrhocorax pyrrhocorax', 'otucu', 'Red-billed_chough'],

    ['kartal', 'Kaya kartalı', 'Aquila chrysaetos', 'yirtici', 'Golden_eagle'],
    ['kel-kartal', 'Kel kartal', 'Haliaeetus leucocephalus', 'yirtici', 'Bald_eagle'],
    ['gokdogan', 'Gökdoğan', 'Falco peregrinus', 'yirtici', 'Peregrine_falcon'],
    ['kerkenez', 'Kerkenez', 'Falco tinnunculus', 'yirtici', 'Common_kestrel'],
    ['puhu', 'Puhu', 'Bubo bubo', 'yirtici', 'Eurasian_eagle-owl'],
    ['kar-baykusu', 'Kar baykuşu', 'Bubo scandiacus', 'yirtici', 'Snowy_owl'],
    ['peceli-baykus', 'Peçeli baykuş', 'Tyto alba', 'yirtici', 'Barn_owl'],
    ['kukumav', 'Kukumav', 'Athene noctua', 'yirtici', 'Little_owl'],
    ['sahin', 'Şahin', 'Buteo buteo', 'yirtici', 'Common_buzzard'],
    ['atmaca', 'Atmaca', 'Accipiter nisus', 'yirtici', 'Eurasian_sparrowhawk'],
    ['caylak', 'Kızıl çaylak', 'Milvus milvus', 'yirtici', 'Red_kite'],
    ['balik-kartali', 'Balık kartalı', 'Pandion haliaetus', 'yirtici', 'Osprey'],
    ['harpi', 'Harpi kartalı', 'Harpia harpyja', 'yirtici', 'Harpy_eagle'],
    ['steller', 'Steller deniz kartalı', 'Haliaeetus pelagicus', 'yirtici', "Steller's_sea_eagle"],
    ['akdogan', 'Akdoğan', 'Falco rusticolus', 'yirtici', 'Gyrfalcon'],
    ['sakalli-akbaba', 'Sakallı akbaba', 'Gypaetus barbatus', 'yirtici', 'Bearded_vulture'],
    ['kizil-akbaba', 'Kızıl akbaba', 'Gyps fulvus', 'yirtici', 'Griffon_vulture'],
    ['kral-akbaba', 'Kral akbaba', 'Sarcoramphus papa', 'yirtici', 'King_vulture'],
    ['sekreter', 'Sekreter kuşu', 'Sagittarius serpentarius', 'yirtici', 'Secretarybird'],
    ['kulakli-baykus', 'Kulaklı orman baykuşu', 'Asio otus', 'yirtici', 'Long-eared_owl'],
    ['alaca-baykus', 'Alaca baykuş', 'Strix aluco', 'yirtici', 'Tawny_owl'],

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
    ['karabatak', 'Karabatak', 'Phalacrocorax carbo', 'su', 'Great_cormorant'],
    ['marti', 'Gümüş martı', 'Larus michahellis', 'su', 'Yellow-legged_gull'],
    ['ak-balikcil', 'Büyük ak balıkçıl', 'Ardea alba', 'su', 'Great_egret'],
    ['kasikci', 'Kaşıkçı', 'Platalea leucorodia', 'su', 'Eurasian_spoonbill'],
    ['kizil-ibis', 'Kızıl ibis', 'Eudocimus ruber', 'su', 'Scarlet_ibis'],
    ['albatros', 'Gezgin albatros', 'Diomedea exulans', 'su', 'Wandering_albatross'],
    ['kral-penguen', 'Kral penguen', 'Aptenodytes patagonicus', 'su', 'King_penguin'],
    ['kaya-penguen', 'Kaya pengueni', 'Eudyptes chrysocome', 'su', 'Southern_rockhopper_penguin'],
    ['elmabas', 'Elmabaş patka', 'Aythya ferina', 'su', 'Common_pochard'],
    ['angit', 'Angıt', 'Tadorna ferruginea', 'su', 'Ruddy_shelduck'],
    ['bahri', 'Bahri', 'Podiceps cristatus', 'su', 'Great_crested_grebe'],
    ['sakarmeke', 'Sakarmeke', 'Fulica atra', 'su', 'Eurasian_coot'],
    ['sumsuk', 'Mavi ayaklı sümsükkuşu', 'Sula nebouxii', 'su', 'Blue-footed_booby'],
    ['firkateyn', 'Firkateyn kuşu', 'Fregata magnificens', 'su', 'Magnificent_frigatebird'],
    ['tepeli-pelikan', 'Tepeli pelikan', 'Pelecanus crispus', 'su', 'Dalmatian_pelican'],
    ['kara-kugu', 'Kara kuğu', 'Cygnus atratus', 'su', 'Black_swan'],
    ['uzunbacak', 'Uzunbacak', 'Himantopus himantopus', 'su', 'Black-winged_stilt'],

    ['tavus', 'Tavus kuşu', 'Pavo cristatus', 'diger', 'Indian_peafowl'],
    ['ibibik', 'İbibik', 'Upupa epops', 'diger', 'Eurasian_hoopoe'],
    ['arikusu', 'Arıkuşu', 'Merops apiaster', 'diger', 'European_bee-eater'],
    ['tukan', 'Tukan', 'Ramphastos toco', 'diger', 'Toco_toucan'],
    ['kolibri', 'Yakut boğazlı kolibri', 'Archilochus colubris', 'diger', 'Ruby-throated_hummingbird'],
    ['agackakan', 'Büyük alaca ağaçkakan', 'Dendrocopos major', 'diger', 'Great_spotted_woodpecker'],
    ['guvercin', 'Kaya güvercini', 'Columba livia', 'diger', 'Rock_dove'],
    ['ketzal', 'Ketzal', 'Pharomachrus mocinno', 'diger', 'Resplendent_quetzal'],
    ['altin-sulun', 'Altın sülün', 'Chrysolophus pictus', 'diger', 'Golden_pheasant'],
    ['pabuc-gaga', 'Pabuç gagalı leylek', 'Balaeniceps rex', 'diger', 'Shoebill'],
    ['devekusu', 'Devekuşu', 'Struthio camelus', 'diger', 'Common_ostrich'],
    ['emu', 'Emu', 'Dromaius novaehollandiae', 'diger', 'Emu'],
    ['kivi', 'Kahverengi kivi', 'Apteryx mantelli', 'diger', 'North_Island_brown_kiwi'],
    ['kazuar', 'Kazuar', 'Casuarius casuarius', 'diger', 'Southern_cassowary'],
    ['kookaburra', 'Gülen kookaburra', 'Dacelo novaeguineae', 'diger', 'Laughing_kookaburra'],
    ['gokkuzgun', 'Gökkuzgun', 'Coracias garrulus', 'diger', 'European_roller'],
    ['guguk', 'Guguk kuşu', 'Cuculus canorus', 'diger', 'Common_cuckoo'],
    ['ebabil', 'Ebabil', 'Apus apus', 'diger', 'Common_swift'],
    ['cobanaldatan', 'Çobanaldatan', 'Caprimulgus europaeus', 'diger', 'European_nightjar'],
    ['hindi', 'Yaban hindisi', 'Meleagris gallopavo', 'diger', 'Wild_turkey'],
    ['keklik', 'Kınalı keklik', 'Alectoris chukar', 'diger', 'Chukar_partridge'],
    ['bildircin', 'Bıldırcın', 'Coturnix coturnix', 'diger', 'Common_quail'],
    ['toy', 'Toy', 'Otis tarda', 'diger', 'Great_bustard'],
    ['boynuzgaga', 'Büyük boynuzgaga', 'Buceros bicornis', 'diger', 'Great_hornbill'],
    ['tacli-guvercin', 'Taçlı güvercin', 'Goura victoria', 'diger', 'Victoria_crowned_pigeon'],
    ['nikobar', 'Nikobar güvercini', 'Caloenas nicobarica', 'diger', 'Nicobar_pigeon'],
    ['kumru', 'Kumru', 'Streptopelia decaocto', 'diger', 'Eurasian_collared_dove'],
    ['hoatzin', 'Hoatzin', 'Opisthocomus hoazin', 'diger', 'Hoatzin'],
    ['yesil-agackakan', 'Yeşil ağaçkakan', 'Picus viridis', 'diger', 'European_green_woodpecker'],
    ['tacli-turna', 'Taçlı turna', 'Balearica regulorum', 'diger', 'Grey_crowned_crane']
  ];

  /* Kırpma odağı: [yatay, dikey], 0 = sol/üst, 1 = sağ/alt. Kare kırpılırken kuşun kafası dışarıda kalmasın diye.
     Listede olmayanlar için varsayılan [0.5, 0.35] (kafalar genelde fotoğrafın üst yarısında). */
  var FOCUS = {
    kakadu: [0.5, 0], sultan: [0.5, 0.1], penguen: [0.5, 0.15], 'pabuc-gaga': [0.5, 0.1], ketzal: [0.5, 0.15], hoatzin: [0.5, 0.1]
  };

  var BIRDS = LIST.map(function (r) {
    var f = FOCUS[r[0]] || [0.5, 0.35];
    return { id: r[0], name: r[1], latin: r[2], cat: r[3], wiki: r[4], local: !!r[5], fx: f[0], fy: f[1] };
  });

  /* Pixel: PixelTime Saat sahiplerine özel. Seçim listesinde yoktur. */
  var PIXEL = { id: 'pixel', name: 'Pixel', latin: 'Melopsittacus undulatus', cat: 'pro', src: 'img/pixel-portre.jpg', pro: true, fx: 0.5, fy: 0.35 };

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

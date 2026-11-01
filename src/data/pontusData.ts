export type RarityTier = 'gold' | 'olive' | 'bronze' | 'iron';
export type ItemCategory = 'weapon' | 'regalia' | 'amphora' | 'charter';
export type EquipSlot = 'crown' | 'weapon' | 'seal';

export interface InventoryItem {
  id: string;
  name: string;
  greekTitle: string;
  category: ItemCategory;
  equipSlot?: EquipSlot;
  rarity: RarityTier;
  valueStaters: number;
  originPolis: string;
  artType:
    | 'stater'
    | 'akinakes'
    | 'diadem'
    | 'amphora'
    | 'kopis'
    | 'seal_ring'
    | 'charter'
    | 'theriac'
    | 'phalera'
    | 'ram';
  description: string;
  stats: {
    authority?: number;
    fleet?: number;
    favor?: number;
    incomePerTurn?: number;
  };
  equipped?: boolean;
}

export interface EncounterChoice {
  id: string;
  label: string;
  subtext: string;
  type: 'primary' | 'secondary' | 'sacrificial';
  requiredStaters?: number;
  requiredAuthority?: number;
  requiredItemArt?: string;
  outcomeText: string;
  deltas: {
    staters?: number;
    authority?: number;
    fleet?: number;
    favor?: number;
  };
  rewardItem?: InventoryItem;
}

export interface RoleplayEncounter {
  id: string;
  chapter: string;
  location: string;
  yearBC: number;
  title: string;
  omenTag: {
    label: string;
    tone: 'boon' | 'omen' | 'rank';
  };
  narrative: string;
  speaker: string;
  speakerTitle: string;
  choices: EncounterChoice[];
}

export interface EuxinePolis {
  id: string;
  name: string;
  greekName: string;
  region: string;
  coords: { x: number; y: number }; // SVG viewBox 0..800, 0..460
  status: 'Трибутарий' | 'Союзный Полис' | 'Спорная Гавань' | 'Царская Столица';
  loyalty: number; // 0..100
  garrisonTriremes: number;
  tributeStaters: number;
  resourceExport: string;
  description: string;
  treatySigned: boolean;
}

export interface EnactedDecree {
  id: string;
  title: string;
  targetPolis: string;
  sphere: 'Морская Подать' | 'Священный Закон' | 'Военный Набор' | 'Хлебная Монополия';
  strictness: 'Милость Эллинам' | 'Царский Канон' | 'Железная Воля';
  oathClauses: string[];
  inscriptionText: string;
  turnEnacted: number;
  sealSigil: 'EUPATOR' | 'STRATIOS' | 'EUXINUS';
}

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'diadem-mithridates',
    name: 'Золотая Диадема Евпатора',
    greekTitle: 'ΔΙΑΔΗΜΑ ΒΑΣΙΛΕΩΣ',
    category: 'regalia',
    equipSlot: 'crown',
    rarity: 'gold',
    valueStaters: 650,
    originPolis: 'Синопа',
    artType: 'diadem',
    description:
      'Чеканный золотой венец в виде переплетенных ветвей понтийского дуба и лавра. Укрепляет царский авторитет среди эллинских архонтов и персидских сатрапов.',
    stats: {
      authority: 12,
      favor: 6,
      incomePerTurn: 45,
    },
    equipped: true,
  },
  {
    id: 'scythian-akinakes',
    name: 'Скифский Акинак из Пантикапея',
    greekTitle: 'ΑΚΙΝΑΚΗΣ ΣΚΥΘΙΚΟΣ',
    category: 'weapon',
    equipSlot: 'weapon',
    rarity: 'gold',
    valueStaters: 480,
    originPolis: 'Пантикапей',
    artType: 'akinakes',
    description:
      'Короткий меч с ножнами, обложенными золотой пластиной с рельефом грифона, терзающего лань. Выкован боспорскими мастерами для царской стражи.',
    stats: {
      authority: 8,
      fleet: 4,
    },
    equipped: true,
  },
  {
    id: 'sinope-seal-ring',
    name: 'Сердоликовый Перстень-Печать',
    greekTitle: 'ΣΦΡΑΓΙΣ ΣΙΝΩΠΗΣ',
    category: 'regalia',
    equipSlot: 'seal',
    rarity: 'olive',
    valueStaters: 340,
    originPolis: 'Синопа',
    artType: 'seal_ring',
    description:
      'Гемма из глубокого темно-красного сардера с профилем Зевса Стратия и восьмилучевой звездой Понтийского дома. Скрепляет дипломатические клятвы.',
    stats: {
      authority: 7,
      favor: 8,
      incomePerTurn: 30,
    },
    equipped: true,
  },
  {
    id: 'theriac-mithridatium',
    name: 'Сосуд с Митридатиумом (Териак)',
    greekTitle: 'ΑΝΤΙΔΟΤΟΣ ΕΥΠΑΤΟΡΟΣ',
    category: 'amphora',
    rarity: 'olive',
    valueStaters: 420,
    originPolis: 'Амис',
    artType: 'theriac',
    description:
      'Запечатанный воском алебастровый сосуд со знаменитым противоядием из 54 трав понтийских предгорий и причерноморских степей.',
    stats: {
      favor: 14,
      authority: 5,
    },
    equipped: false,
  },
  {
    id: 'chalybian-kopis',
    name: 'Халибский Стальной Копис',
    greekTitle: 'ΚΟΠΙΣ ΧΑΛΥΒΩΝ',
    category: 'weapon',
    equipSlot: 'weapon',
    rarity: 'bronze',
    valueStaters: 260,
    originPolis: 'Трапезунд',
    artType: 'kopis',
    description:
      'Изогнутый клинок из знаменитого закаленного железа племени халибов, добытого из черноморского магнетитового песка.',
    stats: {
      authority: 10,
      fleet: 2,
    },
    equipped: false,
  },
  {
    id: 'bosporan-charter',
    name: 'Хлебная Грамота Перисада',
    greekTitle: 'ΣΙΤΙΚΗ ΣΥΝΘΗΚΗ',
    category: 'charter',
    equipSlot: 'seal',
    rarity: 'bronze',
    valueStaters: 310,
    originPolis: 'Пантикапей',
    artType: 'charter',
    description:
      'Свинцовая и пергаментная табличка, дарующая беспошлинный вывоз меотийской пшеницы через Кimmerийский Боспор в гавани Синопы.',
    stats: {
      incomePerTurn: 75,
      authority: 4,
    },
    equipped: false,
  },
  {
    id: 'sinopean-amphora',
    name: 'Клейменая Амфора Синопы',
    greekTitle: 'ΑΜΦΟΡΕΥΣ ΕΛΑΙΟΥ',
    category: 'amphora',
    rarity: 'iron',
    valueStaters: 140,
    originPolis: 'Синопа',
    artType: 'amphora',
    description:
      'Остродонная керамическая амфора с клеймом астинома и орлом, когтящим дельфина. Наполнена отборным оливковым маслом для жертвенных возлияний.',
    stats: {
      favor: 9,
    },
    equipped: false,
  },
  {
    id: 'trireme-embolon',
    name: 'Бронзовый Таран «Эмболон»',
    greekTitle: 'ΕΜΒΟΛΟΝ ΤΡΙΗΡΟΥΣ',
    category: 'weapon',
    rarity: 'bronze',
    valueStaters: 390,
    originPolis: 'Херсонес',
    artType: 'ram',
    description:
      'Трехлопастной литой бронзовый носовой таран флагманской пентеры с изображением трезубца Посейдона.',
    stats: {
      fleet: 6,
      authority: 5,
    },
    equipped: false,
  },
];

export const MARKET_CATALOG: InventoryItem[] = [
  {
    id: 'colchian-fleece-phalera',
    name: 'Колхидская Фалера Золотого Руна',
    greekTitle: 'ΦΑΛΑΡΑ ΚΟΛΧΙΔΟΣ',
    category: 'regalia',
    equipSlot: 'crown',
    rarity: 'gold',
    valueStaters: 520,
    originPolis: 'Фасис',
    artType: 'phalera',
    description:
      'Тисненый золотой диск из долины реки Фасис, созданный колхидскими торевтами. Символ богатства восточного берега Эвксинского Понта.',
    stats: {
      authority: 15,
      incomePerTurn: 60,
    },
  },
  {
    id: 'gold-stater-hoard',
    name: 'Ковчег Статеров с Пегасом',
    greekTitle: 'ΣΤΑΤΗΡΕΣ ΠΟΝΤΟΥ',
    category: 'charter',
    equipSlot: 'seal',
    rarity: 'gold',
    valueStaters: 450,
    originPolis: 'Амис',
    artType: 'stater',
    description:
      'Полновесные золотые статеры царского монетного двора Амиса с изображением пьющего Пегаса и родовой звезды Ахеменидов.',
    stats: {
      incomePerTurn: 95,
      authority: 6,
    },
  },
  {
    id: 'sacred-olive-amphora',
    name: 'Священный Кратер Диониса',
    greekTitle: 'ΚΡΑΤΗΡ ΔΙΟΝΥΣΟΥ',
    category: 'amphora',
    rarity: 'olive',
    valueStaters: 290,
    originPolis: 'Ольвия',
    artType: 'amphora',
    description:
      'Чернолаковый сосуд с накладным золоченым венком плюща для скрепления братских союзов с причерноморскими полисами.',
    stats: {
      favor: 16,
      authority: 6,
    },
  },
];

export const EUXINE_POLEIS: EuxinePolis[] = [
  {
    id: 'sinope',
    name: 'Синопа',
    greekName: 'ΣΙΝΩΠΗ',
    region: 'Южный берег Понта (Пафлагония)',
    coords: { x: 425, y: 365 },
    status: 'Царская Столица',
    loyalty: 94,
    garrisonTriremes: 8,
    tributeStaters: 180,
    resourceExport: 'Корабельный лес, киноварь и оливковое масло',
    description:
      'Древнейшая милетская колония и неприступная морская столица Понтийского царства с двумя военными гаванями и царским акрополем.',
    treatySigned: true,
  },
  {
    id: 'amisus',
    name: 'Амис',
    greekName: 'ΑΜΙΣΟΣ',
    region: 'Понтийское побережье (Темискира)',
    coords: { x: 525, y: 382 },
    status: 'Царская Столица',
    loyalty: 89,
    garrisonTriremes: 5,
    tributeStaters: 155,
    resourceExport: 'Чеканный статер, серебро и понтийское железо',
    description:
      'Процветающий торговый эмпорий и второй царский дворец, где сходятся караванные пути из Малой Азии и морские маршруты Боспора.',
    treatySigned: true,
  },
  {
    id: 'trapezus',
    name: 'Трапезунд',
    greekName: 'ΤΡΑΠΕΖΟΥΣ',
    region: 'Юго-восточный Понт (Халибия)',
    coords: { x: 645, y: 375 },
    status: 'Трибутарий',
    loyalty: 76,
    garrisonTriremes: 3,
    tributeStaters: 110,
    resourceExport: 'Халибская сталь, мед и горный строевой кедр',
    description:
      'Укрепленный порт на скалистом плато у подножия Понтийских гор, снабжающий царскую фалангу лучшим закаленным оружием.',
    treatySigned: false,
  },
  {
    id: 'phasis',
    name: 'Фасис (Колхида)',
    greekName: 'ΦΑΣΙΣ ΚΟΛΧΙΣ',
    region: 'Восточный берег Эвксинского Понта',
    coords: { x: 715, y: 290 },
    status: 'Союзный Полис',
    loyalty: 71,
    garrisonTriremes: 2,
    tributeStaters: 145,
    resourceExport: 'Речное золото, колхидский лен и корабельная смола',
    description:
      'Врата легендарной Колхиды в устье полноводного Фасиса, откуда вывозят золотой песок и тончайшее полотно для парусов.',
    treatySigned: false,
  },
  {
    id: 'panticapaeum',
    name: 'Пантикапей',
    greekName: 'ΠΑΝΤΙΚΑΠΑΙΟΝ',
    region: 'Киммерийский Боспор (Таврика)',
    coords: { x: 485, y: 125 },
    status: 'Союзный Полис',
    loyalty: 82,
    garrisonTriremes: 4,
    tributeStaters: 165,
    resourceExport: 'Меотийская пшеница, осетрина и скифское золото',
    description:
      'Акрополь на горе Митридат, контролирующий пролив из Эвксинского Понта в Меотиду и житницу всего эллинского мира.',
    treatySigned: true,
  },
  {
    id: 'chersonesus',
    name: 'Херсонес Таврический',
    greekName: 'ΧΕΡΣΟΝΗΣΟΣ',
    region: 'Юго-западная Таврика',
    coords: { x: 355, y: 155 },
    status: 'Союзный Полис',
    loyalty: 78,
    garrisonTriremes: 3,
    tributeStaters: 95,
    resourceExport: 'Виноградное вино, соль и каменная кладка',
    description:
      'Дорийский полис у Гераклейского полуострова, обратившийся к Понтийскому царю за защитой от набегов степных скифов Палака.',
    treatySigned: true,
  },
  {
    id: 'olbia',
    name: 'Ольвия Понтийская',
    greekName: 'ΟΛΒΙΑ ΠΟΝΤΙΚΗ',
    region: 'Лиман Гипаниса и Борисфена',
    coords: { x: 255, y: 98 },
    status: 'Спорная Гавань',
    loyalty: 58,
    garrisonTriremes: 1,
    tributeStaters: 85,
    resourceExport: 'Степное зерно, меха и янтарь северных рек',
    description:
      'Богатый северный полис в устье Борисфена, теснимый сарматскими всадниками и ожидающий понтийской эскадры.',
    treatySigned: false,
  },
];

export const ROLEPLAY_ENCOUNTERS: RoleplayEncounter[] = [
  {
    id: 'embassy-chersonesus',
    chapter: 'Эпизод I · Таврический Пролив',
    location: 'Акрополь Синопы · Совет Стратегов',
    yearBC: 110,
    title: 'Посольство из Херсонеса Таврического',
    omenTag: {
      label: 'ВОЕННЫЙ ДОГОВОР',
      tone: 'rank',
    },
    speaker: 'Диофант, сын Асклепиодора',
    speakerTitle: 'Понтийский стратег и наварх Эвксинского флота',
    narrative:
      'На рассвете в военную гавань Синопы вошла быстроходная триемиолия из Таврики. Послы Херсонеса возложили на базальтовый алтарь лавровые ветви: скифский царь Палак осадил их стены. Они просят прислать понтийский экспедиционный корпус и готовы признать протекторат Понтийского дома.',
    choices: [
      {
        id: 'send-diophantus',
        label: 'Снарядить эскадру Диофанта',
        subtext: 'Потребуется 250 статеров на жалованье гоплитам · +14 Авторитет, +4 Флот',
        type: 'primary',
        requiredStaters: 250,
        outcomeText:
          'Флот Диофанта высаживается в Таврике, разбивает конницу Палака и возводит крепость Евпаторий. Херсонес и Пантикапей славят имя царя!',
        deltas: {
          staters: -250,
          authority: 14,
          fleet: 4,
          favor: 6,
        },
      },
      {
        id: 'demand-grain-tribute',
        label: 'Потребовать хлебную подать вперед',
        subtext: 'Укрепить казну (+180 статеров), но охладить пыл союзников (-5 Авторитет)',
        type: 'secondary',
        outcomeText:
          'Архонты Херсонеса скрепя сердце отгружают золото и зерно в трюмы синопских кораблей, но ропщут на суровость понтийских сборщиков.',
        deltas: {
          staters: 180,
          authority: -5,
          fleet: 1,
        },
      },
      {
        id: 'consult-zeus-stratios',
        label: 'Зажечь костер Зевсу Стратию на вершине горы',
        subtext: 'Священное жертвоприношение вина и благовоний (-80 статеров · +15 Воля Богов)',
        type: 'sacrificial',
        requiredStaters: 80,
        outcomeText:
          'Пламя жертвенного костра взметнулось к тучам над Понтом. Жрецы предрекли триумф над степными владыками, воодушевив моряков.',
        deltas: {
          staters: -80,
          favor: 15,
          authority: 6,
        },
      },
    ],
  },
  {
    id: 'colchian-gold-ship',
    chapter: 'Эпизод II · Берега Фасиса',
    location: 'Порт Амиса · Таможенная Стела',
    yearBC: 107,
    title: 'Корабль с золотым песком Колхиды',
    omenTag: {
      label: ' ДАРЫ ФАСИСА',
      tone: 'boon',
    },
    speaker: 'Моаферн Колхидский',
    speakerTitle: 'Наместник восточных берегов и царский родственник',
    narrative:
      'Из туманного устья Фасиса прибыла груженая бирема. Горные племена сванов собрали в овечьи шкуры самородное речное золото, однако вифинские откупщики пытаются перекупить груз прямо на рейде, предлагая серебряные тетрадрахмы.',
    choices: [
      {
        id: 'mint-royal-staters',
        label: 'Переплавить золото в царские статеры',
        subtext: 'Чеканка на монетном дворе Амиса (+320 статеров, +6 Авторитет)',
        type: 'primary',
        outcomeText:
          'Монетные мастера Амиса отчеканили сверкающие золотые статеры с крылатым Пегасом. Казна царства пополнилась чистым металлом.',
        deltas: {
          staters: 320,
          authority: 6,
        },
      },
      {
        id: 'build-colchian-triremes',
        label: 'Закупить колхидский лес, лен и смолу',
        subtext: 'Вложить груз в кораблестроение (-120 статеров · +6 Трирем во флот)',
        type: 'secondary',
        requiredStaters: 120,
        outcomeText:
          'На верфях Синопы и Амиса заложены шесть новых быстроходных трирем из векового колхидского кедра.',
        deltas: {
          staters: -120,
          fleet: 6,
          authority: 5,
        },
      },
      {
        id: 'arrest-bithynian-agents',
        label: 'Конфисковать ладью вифинских лазутчиков',
        subtext: 'Жесткий указ (+190 статеров, +8 Авторитет, -6 Воля Богов)',
        type: 'sacrificial',
        outcomeText:
          'Царская стража захватила судно контрабандистов у мыса Ясона. Чужеземные купцы трепещут перед законами Понта.',
        deltas: {
          staters: 190,
          authority: 8,
          favor: -6,
        },
      },
    ],
  },
  {
    id: 'banquet-theriac',
    chapter: 'Эпизод III · Тайны Царского Двора',
    location: 'Дворец в Синопе · Зал Пиршеств',
    yearBC: 102,
    title: 'Чаша с кипрским вином на пиру послов',
    omenTag: {
      label: 'ТАЙНОЕ ЗНАМЕНИЕ',
      tone: 'omen',
    },
    speaker: 'Кратеuas Ризователь',
    speakerTitle: 'Придворный врач и хранитель ботанического сада',
    narrative:
      'Во время ночного симпосия с посланниками Азии придворный врач Кратеuas незаметно коснулся вашего локтя: в серебряном ритоне с фалернским вином обнаружен след аконита. Заговорщик среди гостей ждет, пока вы поднесете чашу к устам.',
    choices: [
      {
        id: 'drink-with-theriac',
        label: 'Осушить чашу на глазах послов (Иммунитет Евпатора)',
        subtext: 'Демонстрация неуязвимости царя (+18 Авторитет, +10 Воля Богов)',
        type: 'primary',
        outcomeText:
          'Вы спокойно осушили кубок до дна! Ежедневный прием териака сделал яд бессильным. Послы в священном ужасе склонили головы перед любимцем богов.',
        deltas: {
          authority: 18,
          favor: 10,
        },
      },
      {
        id: 'swap-goblet-accuse',
        label: 'Приказать заговорщику выпить из ритона',
        subtext: 'Суровое правосудие и конфискация даров (+240 статеров, +8 Авторитет)',
        type: 'sacrificial',
        outcomeText:
          'Побледневший подкупленный гость уронил кубок на мраморный пол и сознался в заговоре. Его караван перешел в царскую сокровищницу.',
        deltas: {
          staters: 240,
          authority: 8,
          favor: -3,
        },
      },
      {
        id: 'pour-libation-hecate',
        label: 'Совершить возлияние подземным богам',
        subtext: 'Дипломатическая тонкость (+9 Воля Богов, +6 Авторитет)',
        type: 'secondary',
        outcomeText:
          'Вы вылили вино на угли жаровни во славу Гекаты и Персефоны. Пламя вспыхнуло багровым светом, выдав замысел недругов без открытого скандала.',
        deltas: {
          favor: 9,
          authority: 6,
          staters: 60,
        },
      },
    ],
  },
  {
    id: 'bosporan-succession',
    chapter: 'Эпизод IV · Наследие Спартокидов',
    location: 'Пантикапей · Акрополь Боспора',
    yearBC: 106,
    title: 'Скипетр Боспорского Царства',
    omenTag: {
      label: 'ДЕРЖАВНЫЙ СОЮЗ',
      tone: 'boon',
    },
    speaker: 'Перисад V Боспорский',
    speakerTitle: 'Последний басилевс из династии Спартокидов',
    narrative:
      'Престарелый царь Перисад V передает через наварха скрепленный золотой печатью свиток: он завещает корону Киммерийского Боспора Понтийскому дому, чтобы объединить северный и южный берега Эвксинского моря в единую морскую державу.',
    choices: [
      {
        id: 'accept-bosporan-crown',
        label: 'Принять корону Боспора и освободить гавани от пошлин',
        subtext: 'Инвестировать 200 статеров · +16 Авторитет, +5 Флот, +8 Воля Богов',
        type: 'primary',
        requiredStaters: 200,
        outcomeText:
          'Черное море стало внутренним озером Понтийской державы! Флотилии Пантикапея и Фанагории влились в ваш военный флот.',
        deltas: {
          staters: -200,
          authority: 16,
          fleet: 5,
          favor: 8,
        },
      },
      {
        id: 'levy-grain-armada',
        label: 'Обложить боспорских купцов чрезвычайным сбором',
        subtext: 'Немедленный приток золота (+360 статеров, -4 Авторитет)',
        type: 'secondary',
        outcomeText:
          'Сотни зерновозов из Меотиды уплатили десятину золотом в казну Синопы.',
        deltas: {
          staters: 360,
          authority: -4,
          fleet: 2,
        },
      },
    ],
  },
];

export const INITIAL_DECREES: EnactedDecree[] = [
  {
    id: 'decree-euxine-peace',
    title: 'Эдикт о Безопасности Морей (ΠΕΡΙ ΤΗΣ ΕΥΞΕΙΝΟΥ ΕΙΡΗΝΗΣ)',
    targetPolis: 'Все полисы Понта',
    sphere: 'Морская Подать',
    strictness: 'Царский Канон',
    oathClauses: [
      'Охрана зерновых караванов триремами Синопы',
      'Освобождение храмов Зевса Стратия от портовой десятины',
    ],
    inscriptionText:
      'Всякий корабль под знаком восьмилучевой звезды и полумесяца находится под защитой Понтийского басилевса от Боспора до Фасиса.',
    turnEnacted: 1,
    sealSigil: 'EUPATOR',
  },
  {
    id: 'decree-chersonesus-shield',
    title: 'Симмахия с Херсонесом Таврическим',
    targetPolis: 'Херсонес Таврический',
    sphere: 'Военный Набор',
    strictness: 'Милость Эллинам',
    oathClauses: [
      'Постоянный гарнизон гоплитов в акрополе',
      'Совместная чеканка бронзового обола',
    ],
    inscriptionText:
      'Да пребудет нерушимым клятвенный союз между народом Херсонеса и царским домом Синопы на вечные времена.',
    turnEnacted: 2,
    sealSigil: 'STRATIOS',
  },
];

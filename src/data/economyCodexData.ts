import {
  AgoraContract,
  CharacterEconomyProfile,
  CharacterInventoryItem,
  CharacterSheet,
  GlobalEconomyState,
  OikosEstate,
  OikosEstateTier,
  PoliticalEconomyPendulum,
  ResidencyStatus,
  SlaveMarketRegime,
  TechneSpecialty,
  WealthTierId,
} from '../types/rpTypes';

export function generateOperationCode(): string {
  const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
  return `PN-${randomDigits}`;
}

export function formatVkOperationStamp(params: {
  characterName: string;
  polisName: string;
  locationHashtag: string;
  code: string;
  summary: string;
}): string {
  const cleanCharTag =
    '#' +
    params.characterName
      .split(/[ ,()]+/)[0]
      .replace(/[^a-zA-Zа-яА-ЯёЁ0-9_]/g, '');
  const cleanPolisTag =
    '#' + params.polisName.replace(/[^a-zA-Zа-яА-ЯёЁ0-9_]/g, '_');
  const locTag = params.locationHashtag.startsWith('#')
    ? params.locationHashtag
    : `#${params.locationHashtag}`;
  return `${cleanCharTag} ${cleanPolisTag} ${locTag} [КОД: ${params.code}]\nОперация: ${params.summary}`;
}

export interface EstateCatalogTemplate {
  id: string;
  name: string;
  tier: OikosEstateTier;
  category:
    | 'Земельный надел (Клерос)'
    | 'Городская эргастерия'
    | 'Морское судно / Рудник';
  recommendedPolisId: string;
  purchaseValueDrachmas: number;
  baseManualIncome: number;
  incomePerSlave: number;
  maxSlaves: number;
  description: string;
  allowsNonCitizenWithoutProxenia: boolean;
}

export const OIKOS_ESTATE_CATALOG: EstateCatalogTemplate[] = [
  // Уровень I (Малое хозяйство — 300 драхм, до 2 рабов или ручной труд аутургоса)
  {
    id: 'est-t1-olive-kleros',
    name: 'Малый оливковый клерос и давильня (Ур. I)',
    tier: 1,
    category: 'Земельный надел (Клерос)',
    recommendedPolisId: 'sinope',
    purchaseValueDrachmas: 300,
    baseManualIncome: 55,
    incomePerSlave: 50,
    maxSlaves: 2,
    description:
      'Небольшой надел террасной земли близ Синопы. Позволяет хозяину трудиться своими руками (+55 др.) или поставить до 2 рабов (+100 др. валовой ренты).',
    allowsNonCitizenWithoutProxenia: false,
  },
  {
    id: 'est-t1-pottery-stall',
    name: 'Гончарная мастерская и лавка амфор (Ур. I)',
    tier: 1,
    category: 'Городская эргастерия',
    recommendedPolisId: 'sinope',
    purchaseValueDrachmas: 300,
    baseManualIncome: 55,
    incomePerSlave: 50,
    maxSlaves: 2,
    description:
      'Городская ремесленная лавка в квартале гончаров. Доступна как гражданам, так и приезжим метекам! Даёт +55 др. личным трудом или +100 др. с 2 рабами.',
    allowsNonCitizenWithoutProxenia: true,
  },
  {
    id: 'est-t1-fishing-bark',
    name: 'Прибрежная рыбацкая и каботажная ладья (Ур. I)',
    tier: 1,
    category: 'Морское судно / Рудник',
    recommendedPolisId: 'opiu',
    purchaseValueDrachmas: 300,
    baseManualIncome: 60,
    incomePerSlave: 52,
    maxSlaves: 2,
    description:
      'Малое палубное судно для ловли тунца и перевозок вдоль Синопского полуострова. Идеально для неместных мореходов и граждан.',
    allowsNonCitizenWithoutProxenia: true,
  },

  // Уровень II (Среднее хозяйство — 800 драхм, до 5 рабов, без рабов стоит в простое!)
  {
    id: 'est-t2-chalybian-forge',
    name: 'Оружейная эргастерия халибской ковки (Ур. II)',
    tier: 2,
    category: 'Городская эргастерия',
    recommendedPolisId: 'kratopol',
    purchaseValueDrachmas: 800,
    baseManualIncome: 0,
    incomePerSlave: 54,
    maxSlaves: 5,
    description:
      'Средняя кузница с двумя горнами. В одиночку хозяин не справится (без рабов доход 0 др.), но при штате в 5 рабов приносит +270 др. за цикл.',
    allowsNonCitizenWithoutProxenia: true,
  },
  {
    id: 'est-t2-vineyard-estate',
    name: 'Винодельческое поместье и погреба (Ур. II)',
    tier: 2,
    category: 'Земельный надел (Клерос)',
    recommendedPolisId: 'opiu',
    purchaseValueDrachmas: 800,
    baseManualIncome: 0,
    incomePerSlave: 52,
    maxSlaves: 5,
    description:
      'Обширные виноградники на солнечных склонах. Требуют от 1 до 5 рабов (до +260 др. валовой ренты). Владение землёй — привилегия граждан или проксенов.',
    allowsNonCitizenWithoutProxenia: false,
  },
  {
    id: 'est-t2-weaving-ergasterion',
    name: 'Ткацкая и красильная мануфактура (Ур. II)',
    tier: 2,
    category: 'Городская эргастерия',
    recommendedPolisId: 'nikomedion',
    purchaseValueDrachmas: 800,
    baseManualIncome: 0,
    incomePerSlave: 54,
    maxSlaves: 5,
    description:
      'Мастерская по выделке тонких гиматиев и окраске шерсти. Открыта для покупки как гражданами, так и богатыми переселенцами (метеками).',
    allowsNonCitizenWithoutProxenia: true,
  },

  // Уровень III (Крупное предприятие — 2 000 драхм, до 10 рабов)
  {
    id: 'est-t3-merchant-trihemiolia',
    name: 'Купеческий корабль «Понтийский Навклер» (Ур. III)',
    tier: 3,
    category: 'Морское судно / Рудник',
    recommendedPolisId: 'sinope',
    purchaseValueDrachmas: 2000,
    baseManualIncome: 0,
    incomePerSlave: 60,
    maxSlaves: 10,
    description:
      'Крупное морское торговое судно для дальних рейсов по Эвксинскому Понту. Вмещает до 10 рабов-гребцов и грузчиков (+600 др. валовой выручки).',
    allowsNonCitizenWithoutProxenia: true,
  },
  {
    id: 'est-t3-silver-iron-mine',
    name: 'Горный рудник и плавильня в предгорьях (Ур. III)',
    tier: 3,
    category: 'Морское судно / Рудник',
    recommendedPolisId: 'kratopol',
    purchaseValueDrachmas: 2000,
    baseManualIncome: 0,
    incomePerSlave: 58,
    maxSlaves: 10,
    description:
      'Тяжёлые штольни по добыче железа, киновари и серебра. При полной загрузке 10 рабами приносят +580 др. за цикл.',
    allowsNonCitizenWithoutProxenia: false,
  },
];

export interface WealthPresetConfig {
  id: WealthTierId;
  title: string;
  subtitle: string;
  badgeText: string;
  defaultDrachmas: number;
  itemBudgetDrachmas: number;
  defaultSlavesCount: number;
  defaultHasOverseer: boolean;
  defaultEstateTemplateIds: string[];
  defaultTechneLevel: number;
  localStatusTitle: string;
  nonLocalStatusTitle: string;
  localPositionTitle: string;
  nonLocalPositionTitle: string;
  description: string;
  starterItems: Array<{
    name: string;
    category: CharacterInventoryItem['category'];
    quantity: number;
    unit: string;
    purchasePriceDrachmas: number;
    marketPriceDrachmas: number;
    acquisitionMethod: string;
  }>;
}

export interface RandomStarterGoodTemplate {
  id: string;
  name: string;
  category: CharacterInventoryItem['category'];
  unit: string;
  unitPriceDrachmas: number;
  marketUnitPriceDrachmas: number;
  originHint: string;
}

export const RANDOM_STARTER_GOODS_POOL: RandomStarterGoodTemplate[] = [
  {
    id: 'rg-olive-amphora',
    name: 'Клеймёные амфоры синопского оливкового масла',
    category: 'Караванный товар',
    unit: 'амф.',
    unitPriceDrachmas: 20,
    marketUnitPriceDrachmas: 30,
    originHint: 'Закуплено на давильнях Синопы',
  },
  {
    id: 'rg-chalybian-ingots',
    name: 'Связка криц халибского железа и стальных заготовок',
    category: 'Материалы и сырьё',
    unit: 'связка',
    unitPriceDrachmas: 30,
    marketUnitPriceDrachmas: 45,
    originHint: 'Выменяно у рудокопов Кратополя',
  },
  {
    id: 'rg-opiu-cedar',
    name: 'Тёсаный корабельный кедр и бочонки горной смолы',
    category: 'Материалы и сырьё',
    unit: 'партия',
    unitPriceDrachmas: 25,
    marketUnitPriceDrachmas: 38,
    originHint: 'Лесопильни и фактории Опиу',
  },
  {
    id: 'rg-nikomedion-wool',
    name: 'Тюки тонкорунной шерсти и крашеного льна',
    category: 'Караванный товар',
    unit: 'тюк',
    unitPriceDrachmas: 28,
    marketUnitPriceDrachmas: 42,
    originHint: 'Ткацкие ряды Никомедиона',
  },
  {
    id: 'rg-salted-pelamida',
    name: 'Дубовые бочки солёной понтийской пеламиды и тунца',
    category: 'Караванный товар',
    unit: 'бочка',
    unitPriceDrachmas: 15,
    marketUnitPriceDrachmas: 24,
    originHint: 'Рыбные засольни Южного Порта',
  },
  {
    id: 'rg-sinope-minium',
    name: 'Запечатанные горшки синопской киновари (красной охры)',
    category: 'Караванный товар',
    unit: 'горшок',
    unitPriceDrachmas: 35,
    marketUnitPriceDrachmas: 52,
    originHint: 'Редкий краситель из пещер Пафлагонии',
  },
  {
    id: 'rg-hoplite-panoply',
    name: 'Походный бронзовый шлем, щит-гоплон и копис',
    category: 'Личное снаряжение',
    unit: 'компл.',
    unitPriceDrachmas: 80,
    marketUnitPriceDrachmas: 110,
    originHint: 'Личное воинское снаряжение',
  },
  {
    id: 'rg-artisan-tools',
    name: 'Клеймёный сундук ремесленного инструмента и меха',
    category: 'Личное снаряжение',
    unit: 'компл.',
    unitPriceDrachmas: 60,
    marketUnitPriceDrachmas: 85,
    originHint: 'Инструмент мастера для работы в эргастерии',
  },
  {
    id: 'rg-paphlagonian-wine',
    name: 'Выдержанное пафлагонское вино с горным мёдом',
    category: 'Караванный товар',
    unit: 'амф.',
    unitPriceDrachmas: 22,
    marketUnitPriceDrachmas: 34,
    originHint: 'Винодельни солнечных склонов',
  },
  {
    id: 'rg-pack-mule',
    name: 'Выносливый вьючный мул с кожаными перемётными сумами',
    category: 'Корабль / Повозка',
    unit: 'гол.',
    unitPriceDrachmas: 75,
    marketUnitPriceDrachmas: 105,
    originHint: 'Куплен на караванном дворе для перевозок',
  },
  {
    id: 'rg-poor-bundle',
    name: 'Дорожный шерстяной гиматий, ременная сума, кремни и бронзовый нож',
    category: 'Личное снаряжение',
    unit: 'компл.',
    unitPriceDrachmas: 15,
    marketUnitPriceDrachmas: 22,
    originHint: 'Нехитрый скарб свободного человека',
  },
  {
    id: 'rg-grain-sacks',
    name: 'Мешки отборной пшеницы и ячменя',
    category: 'Материалы и сырьё',
    unit: 'медимн',
    unitPriceDrachmas: 14,
    marketUnitPriceDrachmas: 22,
    originHint: 'Хлебные амбары полиса',
  },
];

export function rollRandomGoodsForBudget(
  budgetDrachmas: number,
  polisName: string
): CharacterInventoryItem {
  const safeBudget = Math.max(15, budgetDrachmas);
  // Pick candidates whose unit price fits into safeBudget
  const candidates = RANDOM_STARTER_GOODS_POOL.filter(
    (g) => g.unitPriceDrachmas <= safeBudget + 15
  );
  const chosen =
    candidates[Math.floor(Math.random() * candidates.length)] ||
    RANDOM_STARTER_GOODS_POOL[0];

  const qty = Math.max(1, Math.round(safeBudget / chosen.unitPriceDrachmas));
  const actualTotalMarket = qty * chosen.marketUnitPriceDrachmas;

  return {
    id: `inv-rnd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: chosen.name,
    category: chosen.category,
    quantity: qty,
    unit: chosen.unit,
    acquisitionMethod: `Случайный стартовый товар на сумму ~${ actualTotalMarket } др. (${chosen.originHint})`,
    purchasePriceDrachmas: chosen.unitPriceDrachmas,
    marketPriceDrachmas: chosen.marketUnitPriceDrachmas,
    originPolis: polisName,
  };
}

export const WEALTH_PRESETS: WealthPresetConfig[] = [
  {
    id: 'destitute',
    title: '1. Бедняк / Голытьба (Фет — «Ничего кроме плаща и рук»)',
    subtitle: 'Поденщик, матрос, беглый скиталец или начинающий ремесленник',
    badgeText: '45 др. · Товар на ~30 др. · 0 рабов · Навык 1 ур.',
    defaultDrachmas: 45,
    itemBudgetDrachmas: 30,
    defaultSlavesCount: 0,
    defaultHasOverseer: false,
    defaultEstateTemplateIds: [],
    defaultTechneLevel: 1,
    localStatusTitle: 'Малоимущий гражданин (Фет / Аутургос)',
    nonLocalStatusTitle: 'Пришлый скиталец без имущества (Ксен)',
    localPositionTitle: 'Поденщик и береговой работник',
    nonLocalPositionTitle: 'Иноземный странник в поисках найма',
    description:
      'Ни земли, ни рабов: в кошеле пара десятков драхм да нехитрый товар или инструмент на ~30 др. Живёт трудом своих рук, ремеслом 1 уровня и выполнением заказов на Агоре.',
    starterItems: [
      {
        name: 'Дорожный шерстяной гиматий, посох и связка солёной рыбы',
        category: 'Личное снаряжение',
        quantity: 1,
        unit: 'компл.',
        purchasePriceDrachmas: 20,
        marketPriceDrachmas: 30,
        acquisitionMethod: 'Скромное стартовое имущество бедняка (~30 др.)',
      },
    ],
  },
  {
    id: 'artisan',
    title: '2. Малоимущий Труженик / Рядовой Воин',
    subtitle: 'Самостоятельный ремесленник, пахарь-аутургос или гоплит ополчения',
    badgeText: '130 др. · Товар на ~90 др. · 0–1 раб · Навык 1–2 ур.',
    defaultDrachmas: 130,
    itemBudgetDrachmas: 90,
    defaultSlavesCount: 0,
    defaultHasOverseer: false,
    defaultEstateTemplateIds: [],
    defaultTechneLevel: 2,
    localStatusTitle: 'Свободный гражданин-труженик (Аутургос)',
    nonLocalStatusTitle: 'Осевший ремесленник или воин (Метек)',
    localPositionTitle: 'Мастер ручного труда и воин ополчения',
    nonLocalPositionTitle: 'Приезжий умелец / Наёмный копьеносец',
    description:
      'Твёрдо стоит на ногах, но ещё не имеет собственного поместья: располагает кошелем на 130 драхм, случайным товаром или снаряжением на ~90 драхм и крепким ремесленным навыком.',
    starterItems: [
      {
        name: 'Клеймёный сундук ремесленного инструмента и запас сырья',
        category: 'Личное снаряжение',
        quantity: 1,
        unit: 'компл.',
        purchasePriceDrachmas: 65,
        marketPriceDrachmas: 90,
        acquisitionMethod: 'Рабочее имущество труженика на сумму ~90 др.',
      },
    ],
  },
  {
    id: 'oikos_citizen',
    title: '3. Средний Класс / Лавочник с Мастерской (Месой)',
    subtitle: 'Хозяин малой лавки или надела (Ур. I) с 1 рабом-подмастерьем',
    badgeText: '240 др. · Товар на ~150 др. · 1 раб · Малое дело (Ур. I)',
    defaultDrachmas: 240,
    itemBudgetDrachmas: 150,
    defaultSlavesCount: 1,
    defaultHasOverseer: false,
    defaultEstateTemplateIds: ['est-t1-pottery-stall'],
    defaultTechneLevel: 2,
    localStatusTitle: 'Полноправный гражданин среднего достатка (Зевгит)',
    nonLocalStatusTitle: 'Торговый метек с городской лавкой',
    localPositionTitle: 'Владелец малой мастерской и гоплит',
    nonLocalPositionTitle: 'Приезжий купец и хозяин лавки',
    description:
      'Опора полиса: имеет малую мастерскую или надел I уровня, 1 помощника-раба, 240 драхм оборотных средств и партию случайного товара на сумму ~150 драхм.',
    starterItems: [
      {
        name: 'Партия клеймёных синопских амфор с маслом первого отжима',
        category: 'Караванный товар',
        quantity: 5,
        unit: 'амф.',
        purchasePriceDrachmas: 22,
        marketPriceDrachmas: 30,
        acquisitionMethod: 'Стартовый товар среднего класса на сумму ~150 др.',
      },
    ],
  },
  {
    id: 'magnate',
    title: '4. Зажиточный Домохозяин / Купец (Умеренно зажиточный)',
    subtitle: 'Крепкий Ойкос (Ур. I) с 2–3 рабами и товаром для караванов (без олигархии)',
    badgeText: '420 др. · Товар на ~240 др. · 2–3 раба · Ойкос (Ур. I)',
    defaultDrachmas: 420,
    itemBudgetDrachmas: 240,
    defaultSlavesCount: 2,
    defaultHasOverseer: false,
    defaultEstateTemplateIds: ['est-t1-olive-kleros'],
    defaultTechneLevel: 3,
    localStatusTitle: 'Состоятельный гражданин полиса (Хозяин Ойкоса)',
    nonLocalStatusTitle: 'Состоятельный купец-метек (Приплыл с рабами и кладью)',
    localPositionTitle: 'Владелец клероса и караванный пайщик',
    nonLocalPositionTitle: 'Заморский торговый гость со своим делом',
    description:
      'Верхняя планка для старта без читерства: зажиточный гражданин или купец, у которого есть хозяйство I уровня, 2–3 раба (дающих ренту и свободное время «схоле»), 420 драхм и ходовой товар на ~240 драхм.',
    starterItems: [
      {
        name: 'Караванная партия амфор масла и тюков тонкой шерсти',
        category: 'Караванный товар',
        quantity: 8,
        unit: 'партий',
        purchasePriceDrachmas: 22,
        marketPriceDrachmas: 30,
        acquisitionMethod: 'Купеческий запас зажиточного дома на сумму ~240 др.',
      },
    ],
  },
];

export interface OriginModifierPreset {
  id: string;
  label: string;
  residency: ResidencyStatus;
  originStoryTag: string;
  slavesBonusDelta: number;
  drachmasBonusDelta: number;
  extraItem?: {
    name: string;
    category: CharacterInventoryItem['category'];
    quantity: number;
    unit: string;
    purchasePriceDrachmas: number;
    marketPriceDrachmas: number;
    acquisitionMethod: string;
  };
  createsStarterDebt?: boolean;
}

export const ORIGIN_STORY_MODIFIERS: OriginModifierPreset[] = [
  {
    id: 'local_hereditary',
    label: 'Местный: Коренной гражданин полиса (Наследный дом и права)',
    residency: 'Местный гражданин (Полит)',
    originStoryTag: 'Коренной гражданин полиса по праву рождения',
    slavesBonusDelta: 0,
    drachmasBonusDelta: 0,
  },
  {
    id: 'nonlocal_arrived_with_slaves',
    label: 'Неместный: Приплыл на судне с рабами и товаром',
    residency: 'Приезжий / Неместный (Метек / Ксен)',
    originStoryTag: 'Приплыл из-за моря со своими рабами и купеческой кладью',
    slavesBonusDelta: 2,
    drachmasBonusDelta: 80,
    extraItem: {
      name: 'Заморский груз амфор и сундук переселенца с корабля',
      category: 'Караванный товар',
      quantity: 6,
      unit: 'амфор',
      purchasePriceDrachmas: 25,
      marketPriceDrachmas: 38,
      acquisitionMethod: 'Привезено с собой на корабле при прибытии в Понт',
    },
  },
  {
    id: 'nonlocal_armenian_caravan',
    label: 'Неместный: Прибыл с караваном из Армении / Востока со свитой',
    residency: 'Приезжий / Неместный (Метек / Ксен)',
    originStoryTag: 'Прибыл с восточным караваном через горные перевалы',
    slavesBonusDelta: 2,
    drachmasBonusDelta: 120,
    extraItem: {
      name: 'Вьючные мулы и тюк восточных пряностей / тканей',
      category: 'Восточная роскошь',
      quantity: 4,
      unit: 'тюка',
      purchasePriceDrachmas: 45,
      marketPriceDrachmas: 75,
      acquisitionMethod: 'Привезено с караваном из предгорий Малой/Великой Армении',
    },
  },
  {
    id: 'nonlocal_mercenary_exile',
    label: 'Неместный: Военный изгнанник / Наёмник с боевым трофеем',
    residency: 'Приезжий / Неместный (Метек / Ксен)',
    originStoryTag: 'Прибыл морем как закалённый воин и искатель удачи',
    slavesBonusDelta: 1,
    drachmasBonusDelta: 40,
    extraItem: {
      name: 'Боевой щит-гоплон, халибский копис и пленный оруженосец',
      category: 'Личное снаряжение',
      quantity: 1,
      unit: 'компл.',
      purchasePriceDrachmas: 110,
      marketPriceDrachmas: 150,
      acquisitionMethod: 'Добыто в прежних походах до прибытия в полис',
    },
  },
  {
    id: 'local_indebted_oikos',
    label: 'Местный: Обедневший род с долговым камнем «Орос» на участке',
    residency: 'Местный гражданин (Полит)',
    originStoryTag: 'Гражданин древнего рода, чей участок обременён долговым камнем Орос',
    slavesBonusDelta: 0,
    drachmasBonusDelta: -50,
    createsStarterDebt: true,
  },
  {
    id: 'freedman_climber',
    label: 'Вольноотпущенник: Выкупил свободу и открыл своё дело',
    residency: 'Вольноотпущенник / Кабальный',
    originStoryTag: 'Вольноотпущенник (апелевфер), пробившийся собственным трудом',
    slavesBonusDelta: 0,
    drachmasBonusDelta: 30,
  },
];

export interface TechneRecipe {
  id: string;
  name: string;
  specialty: TechneSpecialty;
  minLevel: number;
  inputDescription: string;
  materialCostDrachmas: number;
  baseOutputName: string;
  outputCategory: CharacterInventoryItem['category'];
  outputUnit: string;
  normalMarketValue: number;
  masterpieceMarketValue: number;
  xpGain: number;
}

export const TECHNE_RECIPES: TechneRecipe[] = [
  {
    id: 'rec-forge-spears',
    name: 'Ковка партии гоплитских наконечников и кописов',
    specialty: 'Кузнечное дело и броня (Халибия)',
    minLevel: 1,
    inputDescription: 'Древесный уголь (Опиу) + Железная руда (Кратополь)',
    materialCostDrachmas: 65,
    baseOutputName: 'Партия закалённых халибских кописов и копий',
    outputCategory: 'Караванный товар',
    outputUnit: 'связка',
    normalMarketValue: 120,
    masterpieceMarketValue: 230,
    xpGain: 25,
  },
  {
    id: 'rec-forge-thorax',
    name: 'Чеканка бронзового панциря и шлема фракийского типа',
    specialty: 'Кузнечное дело и броня (Халибия)',
    minLevel: 3,
    inputDescription: 'Халибская сталь (Кратополь) + Кожа и медь (Синопа)',
    materialCostDrachmas: 160,
    baseOutputName: 'Доспех фалангита с бронзовой чеканкой',
    outputCategory: 'Личное снаряжение',
    outputUnit: 'компл.',
    normalMarketValue: 290,
    masterpieceMarketValue: 560,
    xpGain: 50,
  },
  {
    id: 'rec-ship-rigging',
    name: 'Выделка корабельных канатов, вёсел и смолёной обшивки',
    specialty: 'Корабельное плотничество (Синопа)',
    minLevel: 1,
    inputDescription: 'Корабельный кедр и смола (Опиу) + Пенька (Синопа)',
    materialCostDrachmas: 70,
    baseOutputName: 'Комплект корабельного такелажа и вёсел для биремы',
    outputCategory: 'Караванный товар',
    outputUnit: 'компл.',
    normalMarketValue: 130,
    masterpieceMarketValue: 250,
    xpGain: 25,
  },
  {
    id: 'rec-ship-ram',
    name: 'Отливка носового тарана «Эмболон» и килевой балки',
    specialty: 'Корабельное плотничество (Синопа)',
    minLevel: 3,
    inputDescription: 'Вековой кедр (Опиу) + Литая бронза (Кратополь)',
    materialCostDrachmas: 190,
    baseOutputName: 'Корабельный бронзовый таран «Эмболон»',
    outputCategory: 'Корабль / Повозка',
    outputUnit: 'шт.',
    normalMarketValue: 340,
    masterpieceMarketValue: 650,
    xpGain: 55,
  },
  {
    id: 'rec-wine-amphorae',
    name: 'Обжиг клеймёных амфор и розлив выдержанного масла/вина',
    specialty: 'Виноделие, масло и амфоры',
    minLevel: 1,
    inputDescription: 'Красная глина и оливки (Синопа) + Виноградное сусло (Опиу)',
    materialCostDrachmas: 55,
    baseOutputName: 'Партия клеймёных экспортных амфор с маслом и вином',
    outputCategory: 'Караванный товар',
    outputUnit: 'партия (10 амфор)',
    normalMarketValue: 110,
    masterpieceMarketValue: 210,
    xpGain: 25,
  },
  {
    id: 'rec-purple-himatia',
    name: 'Окраска тонких шерстяных гиматиев и золотое шитьё',
    specialty: 'Ткачество, пурпур и ювелирка',
    minLevel: 2,
    inputDescription: 'Тонкорунная шерсть и лён (Никомедион) + Киноварь (Синопа)',
    materialCostDrachmas: 95,
    baseOutputName: 'Партия багряных понтийских гиматиев для знати',
    outputCategory: 'Караванный товар',
    outputUnit: 'тюк',
    normalMarketValue: 175,
    masterpieceMarketValue: 340,
    xpGain: 35,
  },
  {
    id: 'rec-theriac-balm',
    name: 'Составление понтийского противоядия (Териак) и целебных мазей',
    specialty: 'Врачевание и териаки',
    minLevel: 2,
    inputDescription: 'Горный мёд и травы (Опиу / Кратополь) + Алабастровые сосуды',
    materialCostDrachmas: 85,
    baseOutputName: 'Запечатанные сосуды с понтийским териаком и бальзамом',
    outputCategory: 'Караванный товар',
    outputUnit: 'ковчежец',
    normalMarketValue: 160,
    masterpieceMarketValue: 310,
    xpGain: 35,
  },
];

export interface ArmenianSyndicateGood {
  id: string;
  name: string;
  category: CharacterInventoryItem['category'];
  unit: string;
  syndicateWholesalePrice: number; // Для армян и членов синдиката (-40%)
  regularImportPrice: number; // Для остальных купцов
  resellMarketValue: number;
  description: string;
}

export const ARMENIAN_SYNDICATE_GOODS: ArmenianSyndicateGood[] = [
  {
    id: 'arm-silk-caravan',
    name: 'Парфянский и восточный шёлк-сырец (Караван Арташата)',
    category: 'Восточная роскошь',
    unit: 'тюк',
    syndicateWholesalePrice: 120,
    regularImportPrice: 200,
    resellMarketValue: 250,
    description:
      'Редчайшие ткани с Великого караванного пути через Великую Армению. Члены Армянского Синдиката получают по квоте без посреднической наценки.',
  },
  {
    id: 'arm-nisayan-steed',
    name: 'Кровный армянский и нисейский верховой скакун',
    category: 'Корабль / Повозка',
    unit: 'конь',
    syndicateWholesalePrice: 180,
    regularImportPrice: 300,
    resellMarketValue: 360,
    description:
      'Выносливый боевой конь из горных табунов Малой и Великой Армении. Ценится стратегами, всадниками и послами.',
  },
  {
    id: 'arm-incense-gems',
    name: 'Араратский обсидиан, лазурит и благовонный ладан',
    category: 'Восточная роскошь',
    unit: 'ларчик',
    syndicateWholesalePrice: 95,
    regularImportPrice: 160,
    resellMarketValue: 205,
    description:
      'Восточные благовония для храмовых жертвоприношений и резные самоцветы для перстней-печатей.',
  },
];

export const INITIAL_GLOBAL_ECONOMY: GlobalEconomyState = {
  treasuryDrachmas: 3600,
  slaveMarketRegime: 'normal',
  slaveMarketPool: 24,
  politicalPendulum: 'balanced',
  operationLogs: [
    {
      id: 'op-seed-1',
      code: 'PN-48291034',
      characterId: 'char-diophantus',
      characterName: 'Диофант, сын Митридата',
      polisName: 'Синопа',
      locationHashtag: '#Южный_Порт',
      operationType: 'rent',
      summary:
        'Сбор ренты с морского пая и оливкового клероса за вычетом налога Эйсфора в Казну Синопы (+195 др.)',
      drachmasDelta: 195,
      createdAt: '110 г. до н.э. · Начало навигации',
      status: 'verified',
    },
  ],
  agoraContracts: [
    {
      id: 'contract-1',
      title: 'Поставка 20 связок корабельного леса и смолы для верфей',
      employerName: 'Казначейство и Коллегия Навклеров Синопы',
      employerType: 'Государство (Казначей / Стратег)',
      polisId: 'sinope',
      locationHashtag: '#Верфи_Синопы',
      description:
        'Требуется заготовить и осмолить брёвна пафлагонского кедра для ремонта военных триер в гавани Синопы.',
      rewardDrachmas: 140,
      techneXpReward: 30,
      requiredTechneLevel: 1,
      status: 'open',
      expiresLabel: 'Срочный подряд (до конца месяца)',
    },
    {
      id: 'contract-2',
      title: 'Ковка партии наконечников копий для гарнизона Кратополя',
      employerName: 'Стратег Понта · Военное ведомство',
      employerType: 'Государство (Казначей / Стратег)',
      polisId: 'kratopol',
      locationHashtag: '#Кузницы_Кратополя',
      description:
        'Выковать партию стальных наконечников и втоков из халибского железа для городской стражи.',
      rewardDrachmas: 165,
      techneXpReward: 35,
      requiredTechneLevel: 1,
      status: 'open',
      expiresLabel: 'Военный заказ',
    },
    {
      id: 'contract-3',
      title: 'Сопровождение вьючного каравана с тканями и серебром',
      employerName: 'Трапеза Армянского Торгового Синдиката',
      employerType: 'Армянский Синдикат',
      polisId: 'nikomedion',
      locationHashtag: '#Агора_Никомедиона',
      description:
        'Охрана купеческих мулов на горном переходе от разбойников и передача запечатанных свитков менялам.',
      rewardDrachmas: 150,
      techneXpReward: 25,
      requiredTechneLevel: 1,
      status: 'open',
      expiresLabel: 'Контракт Синдиката',
    },
  ],
};

export function getSlaveUnitPrice(
  regime: SlaveMarketRegime,
  pendulum: PoliticalEconomyPendulum
): number {
  const base =
    regime === 'peace_deficit' ? 240 : regime === 'war_flood' ? 75 : 150;
  if (pendulum === 'oligarchy') return Math.round(base * 0.85);
  if (pendulum === 'demos') return Math.round(base * 1.1);
  return base;
}

export function getSimpleEconomyCycleIncome(
  wealthTierId?: WealthTierId
): {
  amountDrachmas: number;
  drachmasPerCycle: number;
  tierLabel: string;
  activityLabel: string;
} {
  switch (wealthTierId) {
    case 'destitute':
      return {
        amountDrachmas: 45,
        drachmasPerCycle: 45,
        tierLabel: 'I. Бедняк / Наёмный труженик',
        activityLabel: 'Поденная служба, охрана и работа в гавани',
      };
    case 'artisan':
      return {
        amountDrachmas: 75,
        drachmasPerCycle: 75,
        tierLabel: 'II. Свободный ремесленник / Лавочник',
        activityLabel: 'Ремесленное жалование и торговая выручка лавки',
      };
    case 'magnate':
      return {
        amountDrachmas: 150,
        drachmasPerCycle: 150,
        tierLabel: 'IV. Зажиточный домохозяин / Навклер',
        activityLabel: 'Твёрдый сюжетный доход родового дома и паёв',
      };
    case 'oikos_citizen':
    default:
      return {
        amountDrachmas: 110,
        drachmasPerCycle: 110,
        tierLabel: 'III. Крепкий домохозяин средней руки',
        activityLabel: 'Стабильный доход семейного дела и службы полису',
      };
  }
}

export function getDefaultCharacterEconomy(
  char?: Partial<CharacterSheet>
): CharacterEconomyProfile {
  const isArmenian = Boolean(
    char?.nationality?.toLowerCase().includes('армян')
  );
  return {
    economyMode: 'simple',
    economyModeLocked: false,
    residencyStatus: 'Местный гражданин (Полит)',
    originStoryTag: 'Коренной гражданин полиса',
    wealthTierId: 'oikos_citizen',
    slavesCount: 2,
    hasOverseer: false,
    estates: [
      {
        id: 'est-default-1',
        name: 'Малый оливковый клерос и давильня (Ур. I)',
        tier: 1,
        category: 'Земельный надел (Клерос)',
        polisId: char?.currentPolisId || 'sinope',
        purchaseValueDrachmas: 300,
        baseManualIncome: 55,
        incomePerSlave: 50,
        maxSlaves: 2,
        assignedSlaves: 2,
      },
    ],
    techneSpecialty: 'Виноделие, масло и амфоры',
    techneLevel: 2,
    techneXp: 30,
    craftsThisCycle: 0,
    horosDebts: [],
    isArmenianSyndicateMember: isArmenian,
  };
}

/**
 * Полный расчёт капитала, ренты Ойкоса, прогрессивного содержания рабов
 * и налога на роскошь (Эйсфора) — закрывает эксплойт с укрыванием наличных!
 */
export function calculateCharacterWealthAndTax(
  character: CharacterSheet,
  pendulum: PoliticalEconomyPendulum = 'balanced',
  slaveRegime: SlaveMarketRegime = 'normal'
) {
  const econ = character.economy || getDefaultCharacterEconomy(character);
  const inventoryValue = (character.inventory || []).reduce(
    (sum, i) => sum + i.marketPriceDrachmas * i.quantity,
    0
  );
  const estatesValue = (econ.estates || []).reduce(
    (sum, e) => sum + e.purchaseValueDrachmas,
    0
  );
  const slaveUnitVal = getSlaveUnitPrice(slaveRegime, pendulum);
  const slavesValue = (econ.slavesCount || 0) * slaveUnitVal;
  const totalDebt = (econ.horosDebts || []).reduce(
    (sum, d) => sum + d.totalOwedDrachmas,
    0
  );

  // Полный капитал учитывает наличные + товары + стоимость Ойкоса + стоимость рабов
  const fullGrossCapital =
    character.drachmas + inventoryValue + estatesValue + slavesValue;

  // Валовой доход от владений Ойкоса при распределении имеющихся рабов
  let remainingSlaves = econ.slavesCount || 0;
  let grossEstateRent = 0;
  let manualLaborAvailable = false;

  for (const est of econ.estates || []) {
    const assigned = Math.min(est.maxSlaves, remainingSlaves);
    remainingSlaves -= assigned;
    if (assigned > 0) {
      grossEstateRent += assigned * est.incomePerSlave;
    } else if (est.tier === 1) {
      manualLaborAvailable = true;
    }
  }

  if ((econ.estates || []).length === 0 || econ.slavesCount === 0) {
    manualLaborAvailable = true;
  }

  // Прогрессивное содержание рабов (1-5: 10 др., 6-10: 20 др., 11-15: 35 др.)
  let slaveUpkeep = 0;
  for (let i = 1; i <= (econ.slavesCount || 0); i++) {
    if (i <= 5) slaveUpkeep += 10;
    else if (i <= 10) slaveUpkeep += 20;
    else slaveUpkeep += 35;
  }
  if (pendulum === 'oligarchy') {
    slaveUpkeep = Math.round(slaveUpkeep * 0.8);
  } else if (pendulum === 'demos') {
    slaveUpkeep = Math.round(slaveUpkeep * 1.15);
  }

  const overseerCost = econ.hasOverseer ? 30 : 0;
  const metoikionTax =
    econ.residencyStatus === 'Приезжий / Неместный (Метек / Ксен)' ? 12 : 0;

  // Прогрессивный налог Эйсфора (считается от ПОЛНОГО КАПИТАЛА, а не только кошеля!)
  let eisphoraRatePercent = 0;
  let liturgyStatus = 'Освобождён от литургий (Малый/Средний достаток)';
  if (fullGrossCapital >= 4000) {
    eisphoraRatePercent = pendulum === 'demos' ? 28 : 25;
    liturgyStatus = 'Обязательная Литургия (Триерархия / Хорегия по Ст. 25)';
  } else if (fullGrossCapital >= 1500) {
    eisphoraRatePercent = pendulum === 'demos' ? 14 : 10;
    liturgyStatus = 'Плательщик военного налога (Эйсфора 10%)';
  }

  const eisphoraTaxAmount = Math.round(
    (grossEstateRent * eisphoraRatePercent) / 100
  );

  // Проценты по долговым камням Орос
  const debtInterestPayment = (econ.horosDebts || []).reduce(
    (sum, d) =>
      sum + Math.round((d.principalDrachmas * d.interestRatePercent) / 100),
    0
  );

  const totalUpkeepAndTaxes =
    slaveUpkeep +
    overseerCost +
    metoikionTax +
    eisphoraTaxAmount +
    debtInterestPayment;

  const netRentIncome = grossEstateRent - totalUpkeepAndTaxes;

  // Риск побега/восстания рабов при >5 рабах без надсмотрщика
  const slaveRevoltRiskPercent =
    econ.slavesCount <= 5
      ? 0
      : econ.hasOverseer
        ? Math.min(8, (econ.slavesCount - 5) * 1)
        : Math.min(35, (econ.slavesCount - 5) * 4);

  return {
    inventoryValue,
    estatesValue,
    slavesValue,
    totalDebt,
    fullGrossCapital,
    grossEstateRent,
    slaveUpkeep,
    overseerCost,
    metoikionTax,
    eisphoraRatePercent,
    eisphoraTaxAmount,
    debtInterestPayment,
    totalUpkeepAndTaxes,
    netRentIncome,
    manualLaborAvailable,
    liturgyStatus,
    slaveRevoltRiskPercent,
  };
}

/**
 * Генератор стартового достатка, происхождения (местный / неместный) и имущества
 */
export function buildGeneratedStarterPackage(params: {
  presetId: WealthTierId;
  originModifierId: string;
  polisId: string;
  polisName: string;
  nationality: string;
  economyMode?: 'simple' | 'advanced';
  customSlavesCount?: number;
  customDrachmas?: number;
  customTechneSpecialty?: TechneSpecialty;
  customTechneLevel?: number;
  customEstateTemplateIds?: string[];
  customRandomItem?: CharacterInventoryItem;
}): {
  drachmas: number;
  status: string;
  position: string;
  economy: CharacterEconomyProfile;
  inventory: CharacterInventoryItem[];
} {
  const preset =
    WEALTH_PRESETS.find((p) => p.id === params.presetId) || WEALTH_PRESETS[2];
  const modifier =
    ORIGIN_STORY_MODIFIERS.find((m) => m.id === params.originModifierId) ||
    ORIGIN_STORY_MODIFIERS[0];

  const isLocal = modifier.residency === 'Местный гражданин (Полит)';
  const status = isLocal ? preset.localStatusTitle : preset.nonLocalStatusTitle;
  const position = isLocal
    ? preset.localPositionTitle
    : preset.nonLocalPositionTitle;

  const drachmas =
    params.customDrachmas !== undefined
      ? Math.max(0, Math.round(params.customDrachmas))
      : Math.max(10, preset.defaultDrachmas + modifier.drachmasBonusDelta);

  const slavesCount =
    params.customSlavesCount !== undefined
      ? Math.max(0, Math.min(15, Math.round(params.customSlavesCount)))
      : Math.max(
          0,
          Math.min(15, preset.defaultSlavesCount + modifier.slavesBonusDelta)
        );

  const chosenEstateIds =
    params.customEstateTemplateIds !== undefined
      ? params.customEstateTemplateIds.slice(0, 2)
      : preset.defaultEstateTemplateIds.slice(0, 2);

  let remainingSlavesToAssign = slavesCount;
  const estates: OikosEstate[] = chosenEstateIds
    .map((tplId, idx) => {
      const tpl = OIKOS_ESTATE_CATALOG.find((e) => e.id === tplId);
      if (!tpl) return null;
      const assigned = Math.min(tpl.maxSlaves, remainingSlavesToAssign);
      remainingSlavesToAssign -= assigned;
      return {
        id: `est-init-${Date.now()}-${idx}`,
        name: tpl.name,
        tier: tpl.tier,
        category: tpl.category,
        polisId: params.polisId,
        purchaseValueDrachmas: tpl.purchaseValueDrachmas,
        baseManualIncome: tpl.baseManualIncome,
        incomePerSlave: tpl.incomePerSlave,
        maxSlaves: tpl.maxSlaves,
        assignedSlaves: assigned,
      };
    })
    .filter((e): e is OikosEstate => e !== null);

  const primaryGoodsItem: CharacterInventoryItem =
    params.customRandomItem ||
    rollRandomGoodsForBudget(preset.itemBudgetDrachmas, params.polisName);

  const inventory: CharacterInventoryItem[] = [
    {
      ...primaryGoodsItem,
      originPolis: params.polisName,
    },
  ];

  if (modifier.extraItem) {
    inventory.push({
      id: `inv-gen-mod-${Date.now()}`,
      name: modifier.extraItem.name,
      category: modifier.extraItem.category,
      quantity: modifier.extraItem.quantity,
      unit: modifier.extraItem.unit,
      acquisitionMethod: modifier.extraItem.acquisitionMethod,
      purchasePriceDrachmas: modifier.extraItem.purchasePriceDrachmas,
      marketPriceDrachmas: modifier.extraItem.marketPriceDrachmas,
      originPolis: params.polisName,
    });
  }

  // Отразим наличие рабов в имущественной ведомости, если выбран продвинутый режим или указаны рабы
  const resolvedMode = params.economyMode || 'simple';
  if (resolvedMode === 'advanced' && slavesCount > 0) {
    inventory.push({
      id: `inv-gen-slaves-${Date.now()}`,
      name: `Штат рабов Ойкоса (${slavesCount} чел.)`,
      category: 'Рабы и свита',
      quantity: slavesCount,
      unit: 'душ',
      acquisitionMethod:
        isLocal
          ? 'Дворовые и ремесленные рабы семейного Ойкоса'
          : 'Привезены с собой при прибытии в Понт / куплены на рынке Синопы',
      purchasePriceDrachmas: 140,
      marketPriceDrachmas: 150,
      originPolis: params.polisName,
    });
  }

  const isArmenian = params.nationality.toLowerCase().includes('армян');
  const finalTechneLevel = Math.max(
    1,
    Math.min(5, params.customTechneLevel ?? preset.defaultTechneLevel)
  );

  const economy: CharacterEconomyProfile = {
    economyMode: resolvedMode,
    economyModeLocked: resolvedMode === 'advanced',
    residencyStatus: modifier.residency,
    originStoryTag: modifier.originStoryTag,
    wealthTierId: params.presetId,
    slavesCount,
    hasOverseer: slavesCount > 5 || preset.defaultHasOverseer,
    estates,
    techneSpecialty:
      params.customTechneSpecialty || 'Виноделие, масло и амфоры',
    techneLevel: finalTechneLevel,
    techneXp: (finalTechneLevel - 1) * 100,
    craftsThisCycle: 0,
    horosDebts:
      resolvedMode === 'advanced' && modifier.createsStarterDebt
        ? [
            {
              id: `horos-init-${Date.now()}`,
              creditorName: 'Трапеза Синопы (Родовой залог)',
              principalDrachmas: 250,
              interestRatePercent: 10,
              totalOwedDrachmas: 275,
              pledgedEstateName:
                estates[0]?.name || 'Семейный надел с долговым камнем Орос',
              issuedAtLabel: 'До начала РП · Наследный долг',
              isBondageThreat: true,
            },
          ]
        : [],
    isArmenianSyndicateMember:
      isArmenian || params.originModifierId === 'nonlocal_armenian_caravan',
  };

  return {
    drachmas,
    status,
    position,
    economy,
    inventory,
  };
}

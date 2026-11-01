import React, { useState, useRef, useEffect } from 'react';
import { sound } from '../utils/sound';
import {
  isSupabaseConfigured,
  loadPersistedState,
  pullStateFromSupabase,
  pushStateToSupabase,
  savePersistedState,
} from '../utils/supabaseSync';
import {
  Compass,
  MapPin,
  Layers,
  Move,
  Plus,
  RotateCcw,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export interface SinopeDistrictZone {
  id: string;
  name: string;
  category:
    | 'Торговля и Ремесло'
    | 'Власть и Войско'
    | 'Жилые Кварталы'
    | 'Культ и Культура'
    | 'Порт и Пригороды';
  points: string; // Exact SVG polygon points on 1920x1080 canvas
  labelPos: { x: number; y: number; rotate?: number; fontSize?: number };
  description: string;
  rpHint: string;
}

/**
 * Exact 1920x1080 pixel coordinates measured directly from /assets/aistudio/image_7caa5b80.png.
 * Every polygon strictly follows its dark-teal boundary on the original drawing with ZERO overlaps.
 */
export const INITIAL_SINOPE_DISTRICTS: SinopeDistrictZone[] = [
  {
    id: 'zerno',
    name: 'ЗЕРНО',
    category: 'Порт и Пригороды',
    points: '176,703 406,741 395,796 190,859',
    labelPos: { x: 288, y: 782, rotate: 0, fontSize: 34 },
    description:
      'Западные житницы, зерновые амбары и мельничные дворы на материковом подходе к Синопе. Сюда приходят зерновые обозы из долины Опиу.',
    rpHint: 'Оптовая скупка пшеницы и ячменя, снаряжение сухопутных обозов.',
  },
  {
    id: 'raby',
    name: 'РАБЫ',
    category: 'Торговля и Ремесло',
    points: '418,599 554,570 630,629 488,745',
    labelPos: { x: 522, y: 652, rotate: -32, fontSize: 34 },
    description:
      'Внешний укреплённый квартал невольничьих бараков, каменоломщиков и гребцов за первой линией западной стены.',
    rpHint: 'Наём гребцов на вёсла бирем и рабочих для каменоломен и лесопилок.',
  },
  {
    id: 'tyurma',
    name: 'ТЮРЬМА',
    category: 'Власть и Войско',
    points: '560,564 596,540 615,567 579,591',
    labelPos: { x: 588, y: 566, rotate: -28, fontSize: 12 },
    description:
      'Каменный каземат у северного изгиба стены, где содержатся морские разбойники, должники и нарушители законов Понта.',
    rpHint: 'Допросы пленников, выкуп задержанных или побеги в РП.',
  },
  {
    id: 'vera',
    name: 'ВЕРА',
    category: 'Культ и Культура',
    points: '701,495 776,480 784,535 714,554',
    labelPos: { x: 744, y: 518, rotate: -12, fontSize: 24 },
    description:
      'Священный участок у западных городских ворот: храмы покровителей мореплавания, алтари для принесения клятв и жертвенники.',
    rpHint: 'Торжественные клятвы при заключении союзов и городские процессии.',
  },
  {
    id: 'ohra',
    name: 'ОХРА',
    category: 'Торговля и Ремесло',
    points: '726,581 835,526 877,560 762,627',
    labelPos: { x: 802, y: 576, rotate: -24, fontSize: 25 },
    description:
      'Знаменитые склады и растирочные дворы синопской красной охры (киновари и сурика), которой красят носы кораблей и расписывают храмы.',
    rpHint: 'Монопольная торговля дорогой корабельной краской и пигментами.',
  },
  {
    id: 'agora',
    name: 'АГОРА',
    category: 'Торговля и Ремесло',
    points: '795,467 911,444 916,502 801,523',
    labelPos: { x: 856, y: 486, rotate: -12, fontSize: 26 },
    description:
      'Сердце полиса Синопы: крытые стои купцов, меняльные столы трапезитов, трибуна ораторов и главная площадь гражданских собраний.',
    rpHint: 'Заключение всех торговых сделок, публичные речи и споры партий.',
  },
  {
    id: 'remeslo',
    name: 'РЕМЕСЛО',
    category: 'Торговля и Ремесло',
    points: '808,529 916,508 918,560 826,542',
    labelPos: { x: 868, y: 534, rotate: -8, fontSize: 16 },
    description:
      'Тесный ряд гончарных печей (где обжигают клеймёные синопские амфоры), медников, канатчиков и парусных мастеров.',
    rpHint: 'Заказ ремесленных изделий, тары для масла и корабельной оснастки.',
  },
  {
    id: 'nisheta',
    name: 'НИЩЕТА',
    category: 'Жилые Кварталы',
    points: '908,366 938,326 1046,286 1057,319',
    labelPos: { x: 988, y: 326, rotate: -20, fontSize: 20 },
    description:
      'Крутой северный береговой склон, продуваемый морскими ветрами: хижины подёнщиков, рыбаков и безземельной бедноты.',
    rpHint: 'Тайные встречи, вербовка отчаянных матросов и уличных осведомителей.',
  },
  {
    id: 'narod',
    name: 'НАРОД',
    category: 'Жилые Кварталы',
    points: '908,384 1057,336 1085,412 916,442',
    labelPos: { x: 996, y: 392, rotate: -14, fontSize: 30 },
    description:
      'Многолюдный жилой квартал свободного демоса Синопы: дома моряков, мелких лавочников, кормчих и городских граждан.',
    rpHint: 'Опора демократической партии; здесь формируется общественное мнение.',
  },
  {
    id: 'aristokratiya',
    name: 'АРИСТОКРАТИЯ',
    category: 'Жилые Кварталы',
    points: '918,448 1015,428 1020,462 921,481',
    labelPos: { x: 969, y: 455, rotate: -12, fontSize: 13 },
    description:
      'Мощёная улица белокаменных особняков с внутренними двориками-перистилями, где живут старейшие ионийские роды и богатейшие навклеры.',
    rpHint: 'Закрытые симпосии, заговоры знати и династические союзы.',
  },
  {
    id: 'goplity',
    name: 'ГОПЛИТЫ',
    category: 'Власть и Войско',
    points: '922,487 1021,468 1032,558 924,562',
    labelPos: { x: 976, y: 518, rotate: -8, fontSize: 20 },
    description:
      'Казармы гражданского ополчения и наёмных гоплитов, арсенал щитов и плац у спуска к Южному Порту.',
    rpHint: 'Воинские учения, сбор стражи и охрана внутреннего периметра.',
  },
  {
    id: 'yuzhny_port',
    name: 'ЮЖНЫЙ ПОРТ',
    category: 'Порт и Пригороды',
    points: '925,571 1102,571 1127,643 931,601',
    labelPos: { x: 1024, y: 598, rotate: 4, fontSize: 20 },
    description:
      'Главная защищённая волноломами гавань Синопы, судостроительные стапели, портовая таможня и причалы для торговых бирем.',
    rpHint: 'Отправка и приём морских караванов, постройка судов на верфи.',
  },
  {
    id: 'gvardiya',
    name: 'ГВАРДИЯ',
    category: 'Власть и Войско',
    points: '1054,275 1135,250 1152,297 1069,323',
    labelPos: { x: 1102, y: 286, rotate: -14, fontSize: 17 },
    description:
      'Северо-восточный бастион и казармы отборной стражи Акрополя, контролирующей верхние стены перешейка.',
    rpHint: 'Военный гарнизон столицы и сторожевые башни.',
  },
  {
    id: 'muzyka',
    name: 'МУЗЫКА',
    category: 'Культ и Культура',
    points: '1074,332 1156,307 1182,456 1104,463',
    labelPos: { x: 1128, y: 392, rotate: 68, fontSize: 24 },
    description:
      'Квартал искусств, Одеон для состязаний кифаредов и поэтов, а также лучшие пиршественные дома восточной части города.',
    rpHint: 'Празднества, выступления рапсодов и светские приёмы.',
  },
  {
    id: 'vlast',
    name: 'ВЛАСТЬ',
    category: 'Власть и Войско',
    points: '1025,428 1115,458 1147,567 1038,558',
    labelPos: { x: 1082, y: 502, rotate: 45, fontSize: 26 },
    description:
      'Административная цитадель Синопы: Булевтерий (Совет), Пританей со священным очагом, государственная казна и судебные палаты.',
    rpHint: 'Принятие законов, суд, распределение государственных подрядов.',
  },
  {
    id: 'filosofiya',
    name: 'ФИЛОСОФИЯ',
    category: 'Культ и Культура',
    points: '1125,468 1179,468 1206,598 1158,598',
    labelPos: { x: 1165, y: 533, rotate: 76, fontSize: 18 },
    description:
      'Тенистые портики мудрецов, риторские школы и библиотека у восточной стены — место споров киников и стоиков.',
    rpHint: 'Обучение наукам, составление хроник, свитков и указов.',
  },
  {
    id: 'vino',
    name: 'ВИНО',
    category: 'Порт и Пригороды',
    points: '1207,360 1354,314 1382,428 1235,476',
    labelPos: { x: 1294, y: 398, rotate: -14, fontSize: 34 },
    description:
      'Солнечные склоны за восточной стеной перешейка: виноградники, каменные давильни и прохладные погреба с пифосами.',
    rpHint: 'Производство вина, загородные виллы и купеческие склады.',
  },
  {
    id: 'malaya_olimpiya',
    name: 'МАЛАЯ ОЛИМПИЯ',
    category: 'Культ и Культура',
    points: '1546,224 1680,211 1688,302 1550,315',
    labelPos: { x: 1617, y: 263, rotate: -4, fontSize: 20 },
    description:
      'Священная кипарисовая роща, гимнасий и стадион на возвышенности мыса Бозтепе, где проводятся знаменитые атлетические и конные «Старые игры».',
    rpHint: 'Атлетические состязания, гонки колесниц и вручение лавровых венков победителям.',
  },
];

function getDefaultDistrictsForPolis(
  polisId: string,
  polisName: string
): SinopeDistrictZone[] {
  if (polisId === 'sinope') {
    return INITIAL_SINOPE_DISTRICTS;
  }
  return [
    {
      id: `${polisId}-agora`,
      name: 'АГОРА И ТОРГ',
      category: 'Торговля и Ремесло',
      points: '640,380 940,360 950,540 650,550',
      labelPos: { x: 795, y: 455, rotate: -4, fontSize: 28 },
      description: `Центральная торговая площадь и меновые ряды полиса ${polisName}.`,
      rpHint: 'Торговля сырьём, караваны и собрания граждан.',
    },
    {
      id: `${polisId}-harbor`,
      name: 'ГАВАНЬ И ВЕРФИ',
      category: 'Порт и Пригороды',
      points: '970,370 1280,390 1260,570 965,545',
      labelPos: { x: 1120, y: 468, rotate: 4, fontSize: 26 },
      description: `Причалы, склады амфор и корабельные навесы полиса ${polisName}.`,
      rpHint: 'Погрузка морских судов и каботажные рейсы.',
    },
    {
      id: `${polisId}-acropolis`,
      name: 'АКРОПОЛЬ',
      category: 'Власть и Войско',
      points: '720,210 1120,210 1110,340 730,340',
      labelPos: { x: 920, y: 275, rotate: 0, fontSize: 28 },
      description: `Верхняя укреплённая цитадель, гарнизон и совет старейшин полиса ${polisName}.`,
      rpHint: 'Резиденция властей и городской гарнизон.',
    },
  ];
}

function parsePolygonPoints(pointsStr: string): Array<{ x: number; y: number }> {
  return pointsStr
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [xStr, yStr] = pair.split(',');
      return {
        x: Math.round(Number(xStr) || 0),
        y: Math.round(Number(yStr) || 0),
      };
    })
    .filter((pt) => !Number.isNaN(pt.x) && !Number.isNaN(pt.y));
}

function serializePolygonPoints(pts: Array<{ x: number; y: number }>): string {
  return pts.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(' ');
}

function computePolygonCentroid(pts: Array<{ x: number; y: number }>): {
  x: number;
  y: number;
} {
  if (pts.length === 0) return { x: 960, y: 540 };
  const sum = pts.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return {
    x: Math.round(sum.x / pts.length),
    y: Math.round(sum.y / pts.length),
  };
}

interface SinopeCityMapInteractiveProps {
  isGmMode: boolean;
  polisId?: string;
  polisName?: string;
}

export const SinopeCityMapInteractive: React.FC<
  SinopeCityMapInteractiveProps
> = ({ isGmMode, polisId = 'sinope', polisName = 'Синопа' }) => {
  const isSinope = polisId === 'sinope';

  const [districts, setDistricts] = useState<SinopeDistrictZone[]>(() => {
    const persisted = loadPersistedState();
    const byPolis = persisted?.cityDistrictsByPolis?.[polisId];
    if (Array.isArray(byPolis) && byPolis.length > 0) {
      return byPolis as SinopeDistrictZone[];
    }
    if (
      isSinope &&
      persisted?.sinopeDistricts &&
      Array.isArray(persisted.sinopeDistricts) &&
      persisted.sinopeDistricts.length > 0
    ) {
      return persisted.sinopeDistricts as SinopeDistrictZone[];
    }
    return getDefaultDistrictsForPolis(polisId, polisName);
  });

  // Pull latest districts from Supabase on mount if configured
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    pullStateFromSupabase().then((remote) => {
      if (!remote) return;
      const remotePolisDistricts = remote.cityDistrictsByPolis?.[polisId];
      if (Array.isArray(remotePolisDistricts) && remotePolisDistricts.length > 0) {
        setDistricts(remotePolisDistricts as SinopeDistrictZone[]);
      } else if (
        isSinope &&
        Array.isArray(remote.sinopeDistricts) &&
        remote.sinopeDistricts.length > 0
      ) {
        setDistricts(remote.sinopeDistricts as SinopeDistrictZone[]);
      }
    });
  }, [polisId, isSinope]);

  // Persist districts locally and push to Supabase whenever modified
  useEffect(() => {
    const current = loadPersistedState() || {};
    const existingByPolis = current.cityDistrictsByPolis || {};
    const nextPayload = {
      ...current,
      ...(isSinope ? { sinopeDistricts: districts } : {}),
      cityDistrictsByPolis: {
        ...existingByPolis,
        [polisId]: districts,
      },
    };
    savePersistedState(nextPayload);
    if (isSupabaseConfigured()) {
      void pushStateToSupabase(nextPayload);
    }
  }, [districts, polisId, isSinope]);

  const [hoveredDistrictId, setHoveredDistrictId] = useState<string | null>(
    null
  );
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(
    districts[0]?.id || 'agora'
  );

  // Visual theme of the base blueprint: Pontic Dark Gold vs. Original Blueprint Colors
  const [mapColorMode, setMapColorMode] = useState<'pontic_dark' | 'original'>(
    'pontic_dark'
  );

  // GM Boundary Editor state
  const [isEditingBoundaries, setIsEditingBoundaries] =
    useState<boolean>(false);
  const [draggingVertex, setDraggingVertex] = useState<{
    districtId: string;
    vertexIndex: number;
  } | null>(null);
  const [draggingLabelDistrictId, setDraggingLabelDistrictId] = useState<
    string | null
  >(null);

  // Interactive Zoom & Pan state for Mobile/Desktop usability
  const [cityZoom, setCityZoom] = useState<number>(1);
  const [cityPan, setCityPan] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPanningCity, setIsPanningCity] = useState<boolean>(false);
  const [cityPanStart, setCityPanStart] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const svgRef = useRef<SVGSVGElement | null>(null);

  // IMPORTANT: Selected district for the bottom Inspector panel ONLY changes on CLICK (`selectedDistrictId`),
  // NEVER on `hoveredDistrictId`. This eliminates any DOM height changes or cursor jitter cycles!
  const selectedDistrict =
    districts.find((d) => d.id === selectedDistrictId) || districts[0];

  const hoveredDistrict = districts.find((d) => d.id === hoveredDistrictId);

  const viewW = Math.round(1920 / cityZoom);
  const viewH = Math.round(1080 / cityZoom);
  const maxCityPanX = Math.max(0, 1920 - viewW);
  const maxCityPanY = Math.max(0, 1080 - viewH);
  const focusCityX = selectedDistrict?.labelPos?.x ?? 960;
  const focusCityY = selectedDistrict?.labelPos?.y ?? 540;
  const viewX = Math.max(
    0,
    Math.min(maxCityPanX, Math.round(focusCityX - viewW / 2 + cityPan.x))
  );
  const viewY = Math.max(
    0,
    Math.min(maxCityPanY, Math.round(focusCityY - viewH / 2 + cityPan.y))
  );

  const getSvgCoords = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = Math.round(
      viewX + ((e.clientX - rect.left) / rect.width) * viewW
    );
    const y = Math.round(
      viewY + ((e.clientY - rect.top) / rect.height) * viewH
    );
    return {
      x: Math.max(10, Math.min(1910, x)),
      y: Math.max(10, Math.min(1070, y)),
    };
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isGmMode || !isEditingBoundaries) return;
    if (!draggingVertex && !draggingLabelDistrictId) return;

    const coords = getSvgCoords(e);

    if (draggingVertex) {
      setDistricts((prev) =>
        prev.map((d) => {
          if (d.id !== draggingVertex.districtId) return d;
          const pts = parsePolygonPoints(d.points);
          if (
            draggingVertex.vertexIndex < 0 ||
            draggingVertex.vertexIndex >= pts.length
          ) {
            return d;
          }
          pts[draggingVertex.vertexIndex] = coords;
          return {
            ...d,
            points: serializePolygonPoints(pts),
          };
        })
      );
    } else if (draggingLabelDistrictId) {
      setDistricts((prev) =>
        prev.map((d) =>
          d.id === draggingLabelDistrictId
            ? {
                ...d,
                labelPos: {
                  ...d.labelPos,
                  x: coords.x,
                  y: coords.y,
                },
              }
            : d
        )
      );
    }
  };

  const handleSvgPointerUp = () => {
    if (draggingVertex || draggingLabelDistrictId) {
      sound.playStoneTap();
    }
    setDraggingVertex(null);
    setDraggingLabelDistrictId(null);
  };

  const handleInsertVertexAfter = (districtId: string, index: number) => {
    sound.playStoneTap();
    setDistricts((prev) =>
      prev.map((d) => {
        if (d.id !== districtId) return d;
        const pts = parsePolygonPoints(d.points);
        const curr = pts[index];
        const next = pts[(index + 1) % pts.length];
        if (!curr || !next) return d;
        const mid = {
          x: Math.round((curr.x + next.x) / 2),
          y: Math.round((curr.y + next.y) / 2),
        };
        const updated = [
          ...pts.slice(0, index + 1),
          mid,
          ...pts.slice(index + 1),
        ];
        return {
          ...d,
          points: serializePolygonPoints(updated),
        };
      })
    );
  };

  const handleDeleteVertex = (districtId: string, index: number) => {
    setDistricts((prev) =>
      prev.map((d) => {
        if (d.id !== districtId) return d;
        const pts = parsePolygonPoints(d.points);
        if (pts.length <= 3) return d;
        sound.playStoneTap();
        const updated = pts.filter((_, idx) => idx !== index);
        return {
          ...d,
          points: serializePolygonPoints(updated),
        };
      })
    );
  };

  const handleAddNewDistrict = () => {
    sound.playWaxSeal();
    const newId = `district-${Date.now()}`;
    const newZone: SinopeDistrictZone = {
      id: newId,
      name: 'НОВЫЙ РАЙОН',
      category: 'Торговля и Ремесло',
      points: '820,620 960,620 960,710 820,710',
      labelPos: { x: 890, y: 665, rotate: 0, fontSize: 22 },
      description:
        'Новый городской квартал, размеченный Гейм-Мастером. Перетащите угловые точки на карте, чтобы задать точные границы.',
      rpHint: 'Доступно для застройки и ролевых сцен.',
    };
    setDistricts((prev) => [...prev, newZone]);
    setSelectedDistrictId(newId);
    setIsEditingBoundaries(true);
  };

  const handleDeleteSelectedDistrict = () => {
    if (districts.length <= 1) return;
    sound.playStoneTap();
    const remaining = districts.filter((d) => d.id !== selectedDistrict.id);
    setDistricts(remaining);
    setSelectedDistrictId(remaining[0].id);
  };

  const handleResetDistrictsToDefault = () => {
    sound.playWaxSeal();
    const defaults = getDefaultDistrictsForPolis(polisId, polisName);
    setDistricts(defaults);
    setSelectedDistrictId(defaults[0]?.id || 'agora');
  };

  const getCategoryPalette = (
    cat: SinopeDistrictZone['category'],
    isHighlighted: boolean,
    isOriginalMode: boolean
  ) => {
    if (isOriginalMode) {
      return {
        fill: isHighlighted
          ? 'rgba(212, 175, 55, 0.38)'
          : 'rgba(11, 15, 20, 0.04)',
        stroke: isHighlighted ? '#D4AF37' : 'rgba(15, 76, 92, 0.65)',
        text: isHighlighted ? '#0B0F14' : 'transparent',
      };
    }

    switch (cat) {
      case 'Торговля и Ремесло':
        return {
          fill: isHighlighted
            ? 'rgba(229, 193, 88, 0.42)'
            : 'rgba(212, 175, 55, 0.14)',
          stroke: isHighlighted ? '#FFF3B0' : '#E5C158',
          text: isHighlighted ? '#FFF9D2' : '#F3E5AB',
        };
      case 'Власть и Войско':
        return {
          fill: isHighlighted
            ? 'rgba(192, 57, 43, 0.44)'
            : 'rgba(139, 38, 53, 0.20)',
          stroke: isHighlighted ? '#FFB4A9' : '#E57368',
          text: isHighlighted ? '#FFF0EE' : '#F3E5AB',
        };
      case 'Культ и Культура':
        return {
          fill: isHighlighted
            ? 'rgba(142, 189, 162, 0.44)'
            : 'rgba(78, 135, 101, 0.18)',
          stroke: isHighlighted ? '#C5F5D8' : '#8EBDA2',
          text: isHighlighted ? '#E8FFF1' : '#F3E5AB',
        };
      case 'Порт и Пригороды':
        return {
          fill: isHighlighted
            ? 'rgba(92, 173, 226, 0.42)'
            : 'rgba(56, 118, 168, 0.18)',
          stroke: isHighlighted ? '#BCE6FF' : '#7FB8E6',
          text: isHighlighted ? '#F0FAFF' : '#F3E5AB',
        };
      default:
        return {
          fill: isHighlighted
            ? 'rgba(243, 229, 171, 0.38)'
            : 'rgba(194, 178, 128, 0.14)',
          stroke: isHighlighted ? '#F3E5AB' : '#C2B280',
          text: isHighlighted ? '#FFFFFF' : '#E2DAC2',
        };
    }
  };

  const selectedVertices = parsePolygonPoints(selectedDistrict.points);

  return (
    <div className="p-4 sm:p-5 rounded bg-[#121820] border-2 border-[#D4AF37]/80 space-y-4 shadow-[0_12px_36px_rgba(0,0,0,0.75)]">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#263140] pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-epigraphic uppercase tracking-widest text-[#E5C158]">
            <Compass className="w-4 h-4" />
            <span>
              Интерактивный План Города · {polisName}{' '}
              {isSinope ? '(42.026566, 35.151104)' : ''}
            </span>
          </div>
          <h4 className="font-display text-xl sm:text-2xl font-bold text-[#F3E5AB] mt-0.5">
            {isSinope
              ? `Карта Города Синопы: ${districts.length} Кварталов`
              : `Карта Кварталов Полиса ${polisName}`}
          </h4>
          <p className="text-xs text-[#C2B280] mt-0.5">
            Наведите курсор для подсветки или кликните на любой квартал, чтобы зафиксировать его описание ниже. Все границы кварталов точно совпадают с чертежом и не пересекаются.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isSinope && (
            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setMapColorMode((prev) =>
                  prev === 'pontic_dark' ? 'original' : 'pontic_dark'
                );
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded text-xs font-epigraphic flex items-center gap-1.5 cursor-pointer border transition-colors ${
                mapColorMode === 'original'
                  ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37]'
                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:text-[#F3E5AB]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {mapColorMode === 'pontic_dark'
                  ? 'Показать светлый оригинал чертежа'
                  : 'Стиль: Тёмный обсидиан и золото Понта'}
              </span>
            </button>
          )}

          {isGmMode && (
            <button
              type="button"
              onClick={() => {
                sound.playWaxSeal();
                setIsEditingBoundaries(!isEditingBoundaries);
              }}
              className={`min-h-[38px] px-3.5 py-1.5 rounded text-xs font-epigraphic flex items-center gap-1.5 cursor-pointer border transition-colors ${
                isEditingBoundaries
                  ? 'bg-[#8B2635] text-[#F3E5AB] border-[#E5C158] votive-glow'
                  : 'bg-[#1B232E] text-[#E5C158] border-[#D4AF37]/70 hover:bg-[#263140]'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>
                {isEditingBoundaries
                  ? 'Редактор границ районов: ВКЛ'
                  : 'Редактировать границы районов (ГМ)'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* GM District Boundary Editor Toolbar */}
      {isGmMode && isEditingBoundaries && (
        <div className="p-3.5 rounded bg-[#1B232E] border border-[#D4AF37] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs">
              <span className="font-epigraphic uppercase text-[#E5C158] font-bold">
                Режим редактирования границ (Админ / ГМ):{' '}
              </span>
              <span className="text-[#E2DAC2]">
                Перетаскивайте золотые кружки (вершины) выбранного квартала{' '}
                <strong className="text-[#F3E5AB]">
                  «{selectedDistrict.name}»
                </strong>{' '}
                прямо на карте. Нажмите на бирюзовый кружок с «+» на ребре, чтобы добавить новый угол.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddNewDistrict}
                className="px-3 py-1.5 rounded bg-[#263140] hover:bg-[#314054] border border-[#D4AF37] text-xs font-epigraphic text-[#E5C158] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Новый район</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteSelectedDistrict}
                disabled={districts.length <= 1}
                className="px-3 py-1.5 rounded bg-[#2A151B] hover:bg-[#3D1D26] border border-[#8B2635] text-xs font-epigraphic text-[#F1A9B2] flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить «{selectedDistrict.name}»</span>
              </button>

              <button
                type="button"
                onClick={handleResetDistrictsToDefault}
                className="px-3 py-1.5 rounded bg-[#121820] hover:bg-[#263140] border border-[#9A7B38]/60 text-xs font-epigraphic text-[#C2B280] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сбросить границы к эталону</span>
              </button>
            </div>
          </div>

          {/* Inline Editor for Selected District Name, Label Rotation & Vertices */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1 border-t border-[#263140]">
            <div className="wax-recess px-2.5 py-1.5">
              <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                Название квартала
              </label>
              <input
                type="text"
                value={selectedDistrict.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setDistricts((prev) =>
                    prev.map((d) =>
                      d.id === selectedDistrict.id ? { ...d, name: val } : d
                    )
                  );
                }}
                className="w-full bg-transparent text-xs font-bold text-[#F3E5AB] focus:outline-none"
              />
            </div>

            <div className="wax-recess px-2.5 py-1.5">
              <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                Категория зоны
              </label>
              <select
                value={selectedDistrict.category}
                onChange={(e) => {
                  const cat = e.target
                    .value as SinopeDistrictZone['category'];
                  setDistricts((prev) =>
                    prev.map((d) =>
                      d.id === selectedDistrict.id ? { ...d, category: cat } : d
                    )
                  );
                }}
                className="w-full bg-[#0B0F14] text-xs text-[#E2DAC2] focus:outline-none"
              >
                <option value="Торговля и Ремесло">Торговля и Ремесло</option>
                <option value="Власть и Войско">Власть и Войско</option>
                <option value="Жилые Кварталы">Жилые Кварталы</option>
                <option value="Культ и Культура">Культ и Культура</option>
                <option value="Порт и Пригороды">Порт и Пригороды</option>
              </select>
            </div>

            <div className="wax-recess px-2.5 py-1.5">
              <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                Наклон надписи ({selectedDistrict.labelPos.rotate || 0}°)
              </label>
              <input
                type="range"
                min={-90}
                max={90}
                value={selectedDistrict.labelPos.rotate || 0}
                onChange={(e) => {
                  const rot = Number(e.target.value);
                  setDistricts((prev) =>
                    prev.map((d) =>
                      d.id === selectedDistrict.id
                        ? {
                            ...d,
                            labelPos: { ...d.labelPos, rotate: rot },
                          }
                        : d
                    )
                  );
                }}
                className="w-full accent-[#D4AF37]"
              />
            </div>

            <div className="wax-recess px-2.5 py-1.5 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                  Углов полигона: {selectedVertices.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const centroid = computePolygonCentroid(selectedVertices);
                    setDistricts((prev) =>
                      prev.map((d) =>
                        d.id === selectedDistrict.id
                          ? {
                              ...d,
                              labelPos: {
                                ...d.labelPos,
                                x: centroid.x,
                                y: centroid.y,
                              },
                            }
                          : d
                      )
                    );
                  }}
                  className="text-[11px] font-epigraphic text-[#E5C158] hover:underline cursor-pointer"
                >
                  Центрировать надпись
                </button>
              </div>
              {selectedVertices.length > 3 && (
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteVertex(
                      selectedDistrict.id,
                      selectedVertices.length - 1
                    )
                  }
                  className="px-2 py-1 rounded bg-[#2A151B] text-[#F1A9B2] text-[10px] font-epigraphic cursor-pointer"
                  title="Удалить последнюю угловую точку"
                >
                  -1 угол
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed-Height Single-Line Status Strip — NEVER changes height on hover (prevents layout shift / cursor loop) */}
      <div className="h-11 px-3.5 rounded bg-[#1B232E] border border-[#9A7B38]/60 flex items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          <span className="px-2 py-0.5 rounded bg-[#263140] border border-[#D4AF37]/60 text-[11px] font-epigraphic text-[#E5C158] shrink-0">
            {hoveredDistrict
              ? `Наведено: ${hoveredDistrict.name}`
              : `Выбрано: ${selectedDistrict.name}`}
          </span>
          <span className="text-xs text-[#E2DAC2] truncate">
            {(hoveredDistrict || selectedDistrict).description}
          </span>
        </div>
        <span className="text-[11px] font-epigraphic text-[#8EBDA2] shrink-0 hidden sm:inline">
          {hoveredDistrictId
            ? '● Подсветка зоны'
            : 'Кликните на зону для фиксации'}
        </span>
      </div>

      {/* Main Interactive 1920x1080 SVG Canvas — 100% Pixel-Aligned with /assets/aistudio/image_7caa5b80.png */}
      <div className="wax-recess p-2 overflow-hidden relative border border-[#D4AF37]/50">
        {/* Zoom & Pan Toolbar for Mobile & Desktop */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-epigraphic text-[#C2B280]">
            Масштаб кварталов: <strong className="text-[#E5C158]">{Math.round(cityZoom * 100)}%</strong>{' '}
            {cityZoom > 1 ? '(перетаскивайте карту для обзора)' : '(приблизьте для мелких кварталов на телефоне)'}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setCityPan({ x: 0, y: 0 });
                setCityZoom((z) => Math.max(1, Number((z - 0.45).toFixed(2))));
              }}
              disabled={cityZoom <= 1}
              className="min-h-[38px] px-2.5 py-1 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#9A7B38]/60 text-xs font-epigraphic text-[#E5C158] flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title="Отдалить план города"
            >
              <ZoomOut className="w-4 h-4" />
              <span>−</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setCityPan({ x: 0, y: 0 });
                setCityZoom((z) => Math.min(2.8, Number((z + 0.45).toFixed(2))));
              }}
              disabled={cityZoom >= 2.8}
              className="min-h-[38px] px-2.5 py-1 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#D4AF37] text-xs font-epigraphic text-[#E5C158] flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title={`Приблизить план к кварталу «${selectedDistrict.name}»`}
            >
              <ZoomIn className="w-4 h-4" />
              <span>+ Приблизить</span>
            </button>

            {cityZoom > 1 && (
              <button
                type="button"
                onClick={() => {
                  sound.playStoneTap();
                  setCityZoom(1);
                  setCityPan({ x: 0, y: 0 });
                }}
                className="min-h-[38px] px-2.5 py-1 rounded bg-[#121820] hover:bg-[#263140] border border-[#263140] text-xs font-epigraphic text-[#C2B280] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>100%</span>
              </button>
            )}
          </div>
        </div>

        <svg
          ref={svgRef}
          viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
          onPointerDown={(e) => {
            if (cityZoom <= 1 || (isGmMode && isEditingBoundaries)) return;
            setIsPanningCity(true);
            setCityPanStart({ x: e.clientX, y: e.clientY });
          }}
          onPointerMove={(e) => {
            if (isPanningCity && cityZoom > 1 && !(isGmMode && isEditingBoundaries)) {
              const dx = (cityPanStart.x - e.clientX) * (viewW / 340);
              const dy = (cityPanStart.y - e.clientY) * (viewH / 220);
              setCityPanStart({ x: e.clientX, y: e.clientY });
              setCityPan((prev) => ({
                x: Math.max(-maxCityPanX, Math.min(maxCityPanX, prev.x + dx)),
                y: Math.max(-maxCityPanY, Math.min(maxCityPanY, prev.y + dy)),
              }));
              return;
            }
            handleSvgPointerMove(e);
          }}
          onPointerUp={() => {
            setIsPanningCity(false);
            handleSvgPointerUp();
          }}
          onPointerLeave={() => {
            setIsPanningCity(false);
            handleSvgPointerUp();
          }}
          className={`w-full h-auto min-h-[220px] select-none rounded block touch-pan-y ${
            isGmMode && isEditingBoundaries
              ? 'cursor-crosshair'
              : cityZoom > 1
                ? 'cursor-grab active:cursor-grabbing'
                : ''
          }`}
          role="img"
          aria-label={`Интерактивная карта города ${polisName}`}
        >
          <defs>
            {/* Dark Obsidian & Antique Bronze Filter that transforms the white/cyan original drawing into Pontic Dark Luxury while keeping 100% pixel accuracy */}
            <filter
              id="ponticDarkBlueprintFilter"
              colorInterpolationFilters="sRGB"
            >
              <feColorMatrix
                type="matrix"
                values="
                  -0.22 -0.35 -0.15 0 0.82
                  -0.18 -0.28 -0.14 0 0.69
                  -0.12 -0.18 -0.05 0 0.48
                   0     0     0    1 0
                "
              />
            </filter>

            <filter id="zoneGlow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="6"
                floodColor="#E5C158"
                floodOpacity="0.9"
              />
            </filter>
          </defs>

          {/* Base Background */}
          <rect width="1920" height="1080" fill="#0B131E" />

          {/* Exact 1920x1080 Original Architectural Blueprint of Sinope */}
          {isSinope && (
            <image
              href={`${import.meta.env.BASE_URL}assets/aistudio/image_7caa5b80.png`}
              x="0"
              y="0"
              width="1920"
              height="1080"
              preserveAspectRatio="none"
              filter={
                mapColorMode === 'pontic_dark'
                  ? 'url(#ponticDarkBlueprintFilter)'
                  : undefined
              }
              opacity={mapColorMode === 'pontic_dark' ? 0.92 : 0.96}
            />
          )}

          {/* ALL INTERACTIVE DISTRICTS (Zero Overlaps, 100% Aligned with Original Lines) */}
          {districts.map((zone) => {
            const isHovered = hoveredDistrictId === zone.id;
            const isSelected = selectedDistrictId === zone.id;
            const isHighlighted = isHovered || isSelected;
            const palette = getCategoryPalette(
              zone.category,
              isHighlighted,
              mapColorMode === 'original' && isSinope
            );

            return (
              <g
                key={zone.id}
                onMouseEnter={() => setHoveredDistrictId(zone.id)}
                onMouseLeave={() => setHoveredDistrictId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playStoneTap();
                  setCityPan({ x: 0, y: 0 });
                  setSelectedDistrictId(zone.id);
                }}
                className="cursor-pointer"
              >
                <polygon
                  points={zone.points}
                  fill={palette.fill}
                  stroke={palette.stroke}
                  strokeWidth={isSelected ? 4.5 : isHovered ? 3.8 : 2.2}
                  strokeLinejoin="round"
                  filter={isHighlighted ? 'url(#zoneGlow)' : undefined}
                />

                {/* District Title (Rendered with High-Contrast Dark Stroke Outline so Yellow Text Never Blends) */}
                {(mapColorMode === 'pontic_dark' ||
                  !isSinope ||
                  isHighlighted) && (
                  <text
                    x={zone.labelPos.x}
                    y={zone.labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={
                      isHighlighted
                        ? '#FFE885'
                        : mapColorMode === 'original' && isSinope
                          ? '#FFF9D2'
                          : palette.text
                    }
                    stroke="#05080D"
                    strokeWidth={isHighlighted ? '7.5' : '6'}
                    strokeLinejoin="round"
                    fontFamily="Cinzel, serif"
                    fontSize={zone.labelPos.fontSize || 22}
                    fontWeight="700"
                    letterSpacing="0.05em"
                    transform={
                      zone.labelPos.rotate
                        ? `rotate(${zone.labelPos.rotate}, ${zone.labelPos.x}, ${zone.labelPos.y})`
                        : undefined
                    }
                    className="pointer-events-none select-none"
                    style={{
                      paintOrder: 'stroke fill',
                      textShadow:
                        '0 2px 6px rgba(0,0,0,0.98), 0 0 12px rgba(11,15,20,0.95)',
                    }}
                  >
                    {zone.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* GM BOUNDARY EDITOR HANDLES (Vertices + Midpoints + Label Handle for Selected District) */}
          {isGmMode && isEditingBoundaries && selectedDistrict && (
            <g>
              {/* Midpoint '+' Handles to insert a new corner vertex */}
              {selectedVertices.map((pt, idx) => {
                const nextPt =
                  selectedVertices[(idx + 1) % selectedVertices.length];
                if (!nextPt) return null;
                const midX = Math.round((pt.x + nextPt.x) / 2);
                const midY = Math.round((pt.y + nextPt.y) / 2);

                return (
                  <g
                    key={`mid-${selectedDistrict.id}-${idx}`}
                    transform={`translate(${midX}, ${midY})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInsertVertexAfter(selectedDistrict.id, idx);
                    }}
                    className="cursor-pointer"
                  >
                    <circle
                      r="10"
                      fill="#1F7A7A"
                      stroke="#FFF9D2"
                      strokeWidth="2"
                    />
                    <text
                      x="0"
                      y="1"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#FFFFFF"
                      fontSize="14"
                      fontWeight="700"
                      className="pointer-events-none"
                    >
                      +
                    </text>
                  </g>
                );
              })}

              {/* Corner Vertex Drag Handles */}
              {selectedVertices.map((pt, idx) => (
                <g
                  key={`vertex-${selectedDistrict.id}-${idx}`}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    (e.target as Element).releasePointerCapture?.(e.pointerId);
                    setDraggingVertex({
                      districtId: selectedDistrict.id,
                      vertexIndex: idx,
                    });
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleDeleteVertex(selectedDistrict.id, idx);
                  }}
                  className="cursor-move"
                >
                  <circle r="18" fill="transparent" />
                  <circle
                    r="11"
                    fill="#E5C158"
                    stroke="#0B0F14"
                    strokeWidth="3"
                  />
                  <text
                    x="0"
                    y="0.5"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#0B0F14"
                    fontFamily="Cinzel, serif"
                    fontSize="10"
                    fontWeight="700"
                    className="pointer-events-none"
                  >
                    {idx + 1}
                  </text>
                </g>
              ))}

              {/* Draggable District Label Position Handle */}
              <g
                transform={`translate(${selectedDistrict.labelPos.x}, ${selectedDistrict.labelPos.y})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingLabelDistrictId(selectedDistrict.id);
                }}
                className="cursor-move"
              >
                <rect
                  x="-14"
                  y="-14"
                  width="28"
                  height="28"
                  rx="4"
                  fill="#8B2635"
                  fillOpacity="0.9"
                  stroke="#FFF3B0"
                  strokeWidth="2"
                />
                <text
                  x="0"
                  y="1"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#FFF3B0"
                  fontSize="11"
                  fontWeight="700"
                  className="pointer-events-none"
                >
                  TXT
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Selected District Inspector + District Selector List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-1">
        {/* Left 7 cols: Selected District Inspector (Updates on CLICK only, preventing any hover layout shift!) */}
        <div className="lg:col-span-7 p-4 rounded bg-[#1B232E] border border-[#D4AF37]/60 space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#263140] pb-2">
            <span className="font-epigraphic text-xs uppercase text-[#E5C158] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Выбранный квартал ({polisName})</span>
            </span>
            <span className="text-[11px] font-epigraphic text-[#8EBDA2]">
              {selectedDistrict.category}
            </span>
          </div>

          <h5 className="font-display text-xl font-bold text-[#F3E5AB]">
            Квартал «{selectedDistrict.name}»
          </h5>

          {isGmMode && isEditingBoundaries ? (
            <div className="space-y-2 pt-1">
              <div className="wax-recess p-2">
                <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-0.5">
                  Описание квартала (ГМ)
                </label>
                <textarea
                  rows={2}
                  value={selectedDistrict.description}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDistricts((prev) =>
                      prev.map((d) =>
                        d.id === selectedDistrict.id
                          ? { ...d, description: val }
                          : d
                      )
                    );
                  }}
                  className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none resize-none"
                />
              </div>
              <div className="wax-recess p-2">
                <label className="block text-[10px] font-epigraphic uppercase text-[#E5C158] mb-0.5">
                  Возможности для РП и Экономики (ГМ)
                </label>
                <input
                  type="text"
                  value={selectedDistrict.rpHint}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDistricts((prev) =>
                      prev.map((d) =>
                        d.id === selectedDistrict.id ? { ...d, rpHint: val } : d
                      )
                    );
                  }}
                  className="w-full bg-transparent text-xs text-[#E5C158] focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed min-h-[42px]">
                {selectedDistrict.description}
              </p>

              <div className="wax-recess p-2.5 text-xs text-[#E5C158]">
                <strong className="text-[#C2B280] uppercase font-epigraphic block text-[10px] mb-0.5">
                  Возможности для РП и Экономики:
                </strong>
                {selectedDistrict.rpHint}
              </div>
            </>
          )}
        </div>

        {/* Right 5 cols: All Districts Selector Grid */}
        <div className="lg:col-span-5 p-4 rounded bg-[#1B232E] border border-[#263140] space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#263140] pb-2">
            <span className="font-epigraphic text-xs uppercase text-[#F3E5AB]">
              Все кварталы ({districts.length})
            </span>
            <span className="text-[11px] text-[#C2B280]">
              Кликните для выбора
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {districts.map((d) => {
              const isSelected = selectedDistrict.id === d.id;
              const isHovered = hoveredDistrictId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onMouseEnter={() => setHoveredDistrictId(d.id)}
                  onMouseLeave={() => setHoveredDistrictId(null)}
                  onClick={() => {
                    sound.playStoneTap();
                    setCityPan({ x: 0, y: 0 });
                    setSelectedDistrictId(d.id);
                  }}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-epigraphic cursor-pointer border transition-colors ${
                    isSelected
                      ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37]'
                      : isHovered
                        ? 'bg-[#1B232E] text-[#F3E5AB] border-[#E5C158]/70'
                        : 'bg-[#121820] text-[#C2B280] border-[#263140] hover:border-[#9A7B38] hover:text-[#F3E5AB]'
                  }`}
                >
                  {d.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

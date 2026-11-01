import React, { useState } from 'react';
import {
  CharacterSheet,
  PolisBuilding,
  PolisData,
  PolisRpEvent,
} from '../types/rpTypes';
import { PLAYER_FACTIONS_LIST } from '../data/initialRpData';
import {
  LaurelHeaderDivider,
  LaurelWreathBadge,
  WaxSealBadge,
} from './PonticPrimitives';
import { SinopeCityMapInteractive } from './SinopeCityMapInteractive';
import { sound } from '../utils/sound';
import {
  Building2,
  Compass,
  Edit3,
  Eye,
  Lock,
  Move,
  PlusCircle,
  ScrollText,
  ShieldAlert,
  Trash2,
  Users,
  Check,
  Map,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

interface PontusMapPolisViewProps {
  poleis: PolisData[];
  selectedPolisId: string;
  onSelectPolis: (polisId: string) => void;
  livingCharacters: CharacterSheet[];
  isGmMode: boolean;
  onInspectCharacterInRegistry: (charId: string) => void;
  onGmUpdatePolis: (polisId: string, updates: Partial<PolisData>) => void;
  onGmAddPolisOnMap: (
    name: string,
    region: string,
    coords: { x: number; y: number }
  ) => void;
}

const DISTRICTS: PolisBuilding['district'][] = [
  'Акрополь',
  'Агора и Рынок',
  'Гавань и Верфи',
  'Ремесленный Квартал',
  'Храмовый Участок',
];

export const PontusMapPolisView: React.FC<PontusMapPolisViewProps> = ({
  poleis,
  selectedPolisId,
  onSelectPolis,
  livingCharacters,
  isGmMode,
  onInspectCharacterInRegistry,
  onGmUpdatePolis,
  onGmAddPolisOnMap,
}) => {
  const [polisTab, setPolisTab] = useState<
    'overview_events' | 'city_map_buildings' | 'npc_factions' | 'players_in_rp'
  >('overview_events');

  // GM Interactive Map Editor tool mode
  const [gmMapTool, setGmMapTool] = useState<
    'select' | 'move_selected' | 'add_new'
  >('select');
  const [newPolisNameInput, setNewPolisNameInput] = useState(
    'Арменион (Пристань)'
  );
  const [newPolisRegionInput, setNewPolisRegionInput] = useState(
    'Побережье Синопского полуострова'
  );

  // GM Polis text edit state
  const [editingDescription, setEditingDescription] = useState(false);
  const [shortDescDraft, setShortDescDraft] = useState('');
  const [fullDescDraft, setFullDescDraft] = useState('');

  // GM Add Event state
  const [newEventDate, setNewEventDate] = useState(
    '110 г. до н.э. · Новая запись'
  );
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventSummary, setNewEventSummary] = useState('');

  // GM Add Building state
  const [newBldName, setNewBldName] = useState('');
  const [newBldDistrict, setNewBldDistrict] =
    useState<PolisBuilding['district']>('Агора и Рынок');
  const [newBldOwner, setNewBldOwner] = useState('Городская община');
  const [newBldDesc, setNewBldDesc] = useState('');

  // GM Add NPC Faction state
  const [newNpcName, setNewNpcName] = useState('');
  const [newNpcStance, setNewNpcStance] = useState('');
  const [newNpcSupportedPlayerFaction, setNewNpcSupportedPlayerFaction] =
    useState(PLAYER_FACTIONS_LIST[0]);

  // Interactive Zoom & Pan state for Mobile/Desktop usability
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapPan, setMapPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const selectedPolis =
    poleis.find((p) => p.id === selectedPolisId) || poleis[0];

  const playersInSelectedPolis = livingCharacters.filter(
    (c) => c.currentPolisId === selectedPolis.id
  );

  const viewWidth = Math.round(800 / mapZoom);
  const viewHeight = Math.round(480 / mapZoom);
  const maxPanX = Math.max(0, 800 - viewWidth);
  const maxPanY = Math.max(0, 480 - viewHeight);
  const focusX = selectedPolis?.coords?.x ?? 400;
  const focusY = selectedPolis?.coords?.y ?? 240;
  const viewMinX = Math.max(
    0,
    Math.min(maxPanX, Math.round(focusX - viewWidth / 2 + mapPan.x))
  );
  const viewMinY = Math.max(
    0,
    Math.min(maxPanY, Math.round(focusY - viewHeight / 2 + mapPan.y))
  );

  const handleSvgMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isGmMode || gmMapTool === 'select') return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = Math.round(
      viewMinX + ((e.clientX - rect.left) / rect.width) * viewWidth
    );
    const y = Math.round(
      viewMinY + ((e.clientY - rect.top) / rect.height) * viewHeight
    );

    if (gmMapTool === 'move_selected') {
      sound.playStoneTap();
      onGmUpdatePolis(selectedPolis.id, {
        coords: {
          x: Math.max(40, Math.min(760, x)),
          y: Math.max(35, Math.min(445, y)),
        },
      });
    } else if (gmMapTool === 'add_new') {
      sound.playWaxSeal();
      onGmAddPolisOnMap(
        newPolisNameInput.trim() || 'Новый Полис',
        newPolisRegionInput.trim() || 'Окрестности Синопы',
        { x: Math.max(40, Math.min(760, x)), y: Math.max(35, Math.min(445, y)) }
      );
      setGmMapTool('select');
    }
  };

  const handleStartEditDesc = () => {
    setShortDescDraft(selectedPolis.shortSummary);
    setFullDescDraft(selectedPolis.fullDescription);
    setEditingDescription(true);
  };

  const handleSaveDesc = () => {
    sound.playWaxSeal();
    onGmUpdatePolis(selectedPolis.id, {
      shortSummary: shortDescDraft,
      fullDescription: fullDescDraft,
    });
    setEditingDescription(false);
  };

  const handleAddRpEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    sound.playWaxSeal();
    const nextEvent: PolisRpEvent = {
      id: `ev-${Date.now()}`,
      dateLabel: newEventDate.trim() || '110 г. до н.э.',
      title: newEventTitle.trim(),
      summary: newEventSummary.trim(),
      participants: playersInSelectedPolis.map((p) => p.name),
    };
    onGmUpdatePolis(selectedPolis.id, {
      rpEvents: [nextEvent, ...selectedPolis.rpEvents],
    });
    setNewEventTitle('');
    setNewEventSummary('');
  };

  const handleAddBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBldName.trim()) return;
    sound.playStoneTap();
    const nextBld: PolisBuilding = {
      id: `bld-${Date.now()}`,
      name: newBldName.trim(),
      district: newBldDistrict,
      ownerOrController: newBldOwner.trim() || 'Граждане полиса',
      description: newBldDesc.trim() || 'Городская постройка.',
      productionHint: 'Доступно для взаимодействия в РП.',
    };
    onGmUpdatePolis(selectedPolis.id, {
      buildings: [...selectedPolis.buildings, nextBld],
    });
    setNewBldName('');
    setNewBldDesc('');
  };

  const handleAddNpcFaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNpcName.trim()) return;
    sound.playWaxSeal();
    onGmUpdatePolis(selectedPolis.id, {
      npcFactions: [
        ...selectedPolis.npcFactions,
        {
          id: `npc-${Date.now()}`,
          name: newNpcName.trim(),
          influencePercent: 25,
          publicStance:
            newNpcStance.trim() || 'Отстаивают интересы своего цеха.',
          supportedPlayerFaction: newNpcSupportedPlayerFaction,
          gmNotes: 'Добавлено Гейм-Мастером.',
        },
      ],
    });
    setNewNpcName('');
    setNewNpcStance('');
  };

  return (
    <div className="space-y-6">
      {/* Top Interactive Map of the Sinop Peninsula & Pontus (42.026566, 35.151104) */}
      <div className="stele-panel p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#263140] pb-3.5">
          <div className="flex items-center gap-3.5">
            <LaurelWreathBadge size="md" tone="gold">
              <Compass className="w-5 h-5 text-[#E5C158]" />
            </LaurelWreathBadge>
            <div>
              <p className="font-epigraphic text-xs uppercase tracking-widest text-[#C2B280]">
                Окрестности Понта · Синопский Полуостров (42.026566° N, 35.151104° E)
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#F3E5AB] mt-0.5">
                Карта Понта: Синопа, Никомедион, Опиу и Кратополь
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-epigraphic">
            <span className="text-[#C2B280]">
              Полисов Понта:{' '}
              <strong className="text-[#F3E5AB]">{poleis.length}</strong>
            </span>
          </div>
        </div>

        {/* GM Interactive Map Editor Toolbar */}
        {isGmMode && (
          <div className="mt-3 p-3 rounded bg-[#1B232E] border border-[#D4AF37] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-epigraphic text-xs uppercase text-[#E5C158] font-bold flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                <span>Интерактивный Редактор Карты (Режим ГМ Активен):</span>
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setGmMapTool('select')}
                  className={`px-3 py-1.5 rounded text-xs font-epigraphic cursor-pointer border ${
                    gmMapTool === 'select'
                      ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37]'
                      : 'bg-[#121820] text-[#C2B280] border-[#263140]'
                  }`}
                >
                  Обычный выбор
                </button>

                <button
                  type="button"
                  onClick={() => setGmMapTool('move_selected')}
                  className={`px-3 py-1.5 rounded text-xs font-epigraphic flex items-center gap-1 cursor-pointer border ${
                    gmMapTool === 'move_selected'
                      ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37]'
                      : 'bg-[#121820] text-[#C2B280] border-[#263140]'
                  }`}
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>Переместить «{selectedPolis.name}» кликом</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGmMapTool('add_new')}
                  className={`px-3 py-1.5 rounded text-xs font-epigraphic flex items-center gap-1 cursor-pointer border ${
                    gmMapTool === 'add_new'
                      ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37]'
                      : 'bg-[#121820] text-[#C2B280] border-[#263140]'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Поставить новый полис на карту</span>
                </button>
              </div>
            </div>

            {gmMapTool === 'move_selected' && (
              <p className="text-xs text-[#8EBDA2]">
                Кликните в любую точку Синопского полуострова на карте ниже, чтобы перенести маркер полиса{' '}
                <strong>{selectedPolis.name}</strong>.
              </p>
            )}

            {gmMapTool === 'add_new' && (
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <div className="wax-recess px-2.5 py-1.5 flex-1 w-full">
                  <input
                    type="text"
                    value={newPolisNameInput}
                    onChange={(e) => setNewPolisNameInput(e.target.value)}
                    placeholder="Название нового полиса / заставы"
                    className="w-full bg-transparent text-xs text-[#F3E5AB] focus:outline-none"
                  />
                </div>
                <div className="wax-recess px-2.5 py-1.5 flex-1 w-full">
                  <input
                    type="text"
                    value={newPolisRegionInput}
                    onChange={(e) => setNewPolisRegionInput(e.target.value)}
                    placeholder="Описание района"
                    className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none"
                  />
                </div>
                <span className="text-xs font-epigraphic text-[#E5C158] shrink-0">
                  → Кликните на карту для размещения!
                </span>
              </div>
            )}
          </div>
        )}

        {/* Interactive SVG Map of the Sinop Peninsula & Pontus (Matching user's reference maps) */}
        <div className="mt-4 wax-recess p-2 sm:p-3 overflow-hidden relative">
          {/* Mobile & Desktop Map Zoom Controls Bar */}
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-epigraphic text-[#C2B280]">
              Масштаб карты: <strong className="text-[#E5C158]">{Math.round(mapZoom * 100)}%</strong>{' '}
              {mapZoom > 1 ? '(перетаскивайте карту пальцем или мышью)' : '(увеличьте на телефоне для удобного клика)'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  sound.playStoneTap();
                  setMapPan({ x: 0, y: 0 });
                  setMapZoom((z) => Math.max(1, Number((z - 0.35).toFixed(2))));
                }}
                disabled={mapZoom <= 1}
                className="min-h-[38px] px-2.5 py-1 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#9A7B38]/60 text-xs font-epigraphic text-[#E5C158] flex items-center gap-1 cursor-pointer disabled:opacity-40"
                title="Отдалить карту"
              >
                <ZoomOut className="w-4 h-4" />
                <span>−</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playStoneTap();
                  setMapPan({ x: 0, y: 0 });
                  setMapZoom((z) => Math.min(2.4, Number((z + 0.35).toFixed(2))));
                }}
                disabled={mapZoom >= 2.4}
                className="min-h-[38px] px-2.5 py-1 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#D4AF37] text-xs font-epigraphic text-[#E5C158] flex items-center gap-1 cursor-pointer disabled:opacity-40"
                title={`Приблизить карту к точке «${selectedPolis.name}»`}
              >
                <ZoomIn className="w-4 h-4" />
                <span>+ Крупнее</span>
              </button>

              {mapZoom > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playStoneTap();
                    setMapZoom(1);
                    setMapPan({ x: 0, y: 0 });
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
            viewBox={`${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}`}
            onClick={handleSvgMapClick}
            onPointerDown={(e) => {
              if (mapZoom <= 1) return;
              setIsPanning(true);
              setPanStart({ x: e.clientX, y: e.clientY });
            }}
            onPointerMove={(e) => {
              if (!isPanning || mapZoom <= 1) return;
              const dx = (panStart.x - e.clientX) * (viewWidth / 340);
              const dy = (panStart.y - e.clientY) * (viewHeight / 240);
              setPanStart({ x: e.clientX, y: e.clientY });
              setMapPan((prev) => ({
                x: Math.max(-maxPanX, Math.min(maxPanX, prev.x + dx)),
                y: Math.max(-maxPanY, Math.min(maxPanY, prev.y + dy)),
              }));
            }}
            onPointerUp={() => setIsPanning(false)}
            onPointerLeave={() => setIsPanning(false)}
            className={`w-full h-auto min-h-[240px] max-h-[460px] select-none touch-pan-y ${
              isGmMode && gmMapTool !== 'select'
                ? 'cursor-crosshair'
                : mapZoom > 1
                  ? 'cursor-grab active:cursor-grabbing'
                  : ''
            }`}
            role="img"
            aria-label="Карта окрестностей Понта и Синопского полуострова (42.026566, 35.151104)"
          >
            <defs>
              <radialGradient id="sinopSeaBay" cx="55%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#16293D" />
                <stop offset="65%" stopColor="#0E1926" />
                <stop offset="100%" stopColor="#090F17" />
              </radialGradient>
              <linearGradient id="pontusGoldTerritory" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7C6521" stopOpacity="0.88" />
                <stop offset="55%" stopColor="#5E4B16" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#43350F" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="germenaPurpleTerritory" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4B3E5E" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#2F263D" stopOpacity="0.82" />
              </linearGradient>
              <linearGradient id="inlandGreyTerritory" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B4544" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#232B2B" stopOpacity="0.85" />
              </linearGradient>
              <pattern id="cartoGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="0.4"
                  strokeOpacity="0.16"
                />
              </pattern>
            </defs>

            {/* Sea Basin Background */}
            <rect width="800" height="480" fill="url(#sinopSeaBay)" />
            <rect width="800" height="480" fill="url(#cartoGrid)" />

            {/* 1. Neighboring Northwestern Cape: ГЕРМЕНА (Inceburun / Erfelek Northwest Headland) */}
            <path
              d="M 295 255
                 L 310 210
                 L 305 165
                 C 312 130, 355 112, 395 120
                 C 425 126, 442 155, 430 185
                 L 448 205
                 L 445 258
                 L 335 258
                 Z"
              fill="url(#germenaPurpleTerritory)"
              stroke="#9D84B8"
              strokeWidth="1.6"
              strokeOpacity="0.65"
            />

            {/* 2. Southern & Southwestern Mountain Hinterland (Grey zone on reference map) */}
            <path
              d="M 225 320
                 L 265 280
                 L 295 255
                 L 445 258
                 L 450 328
                 L 495 368
                 L 535 372
                 L 548 415
                 L 455 425
                 L 432 458
                 L 375 455
                 L 325 432
                 L 315 398
                 L 365 380
                 L 345 340
                 L 225 320 Z"
              fill="url(#inlandGreyTerritory)"
              stroke="#7C8784"
              strokeWidth="1.5"
              strokeOpacity="0.55"
            />

            {/* 3. PRIMARY GOLDEN TERRITORY: ПОНТ (Sinop Peninsula 42.026566, 35.151104 + Opiu on the western yellow border + Nikomedion + Kratopol) */}
            <path
              d="M 442 205
                 L 495 212
                 L 525 232
                 L 552 225
                 C 572 195, 602 172, 636 166
                 C 646 195, 642 235, 624 252
                 C 598 262, 565 258, 540 252
                 L 526 285
                 L 532 365
                 L 502 382
                 L 446 332
                 L 438 256
                 Z"
              fill="url(#pontusGoldTerritory)"
              stroke="#E5C158"
              strokeWidth="2.4"
            />

            {/* Internal Roads & Coastal Sea Routes of Pontus */}
            <g
              stroke="#F3E5AB"
              strokeWidth="1.4"
              strokeOpacity="0.55"
              strokeDasharray="4 4"
              fill="none"
            >
              {/* Land road: Sinope (562,222) -> Nikomedion (516,258) -> Opiu (452,304) */}
              <path d="M 562 222 L 516 258 L 452 304" />
              {/* Land road: Nikomedion (516,258) -> Kratopol (518,362) */}
              <path d="M 516 258 L 518 362" />
            </g>

            {/* Sea Cabotage Route: Sinope Eastern Harbor -> Kratopol Bay */}
            <path
              d="M 572 234 C 605 278, 585 342, 526 362"
              stroke="#8EBDA2"
              strokeWidth="1.5"
              strokeOpacity="0.65"
              strokeDasharray="5 4"
              fill="none"
            />

            {/* Territory Title: ПОНТ (With High-Contrast Dark Stroke Outline so Yellow Text Never Blends) */}
            <g transform="translate(565, 118)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fill="#FFE17D"
                stroke="#06090E"
                strokeWidth="6"
                strokeLinejoin="round"
                fontFamily="Playfair Display, serif"
                fontSize="38"
                fontWeight="700"
                letterSpacing="0.12em"
                style={{ paintOrder: 'stroke fill' }}
              >
                ПОНТ
              </text>
              <text
                x="0"
                y="18"
                textAnchor="middle"
                fill="#F3E5AB"
                stroke="#06090E"
                strokeWidth="3.5"
                strokeLinejoin="round"
                fontFamily="Cinzel, serif"
                fontSize="10"
                fontWeight="700"
                letterSpacing="0.18em"
                style={{ paintOrder: 'stroke fill' }}
              >
                СИНОПСКИЙ ПОЛУОСТРОВ · 42.0265° N, 35.1511° E
              </text>
            </g>

            {/* Neighbor Title: ГЕРМЕНА */}
            <g transform="translate(215, 145)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fill="#D4BFFF"
                stroke="#06090E"
                strokeWidth="5"
                strokeLinejoin="round"
                fontFamily="Playfair Display, serif"
                fontSize="26"
                fontWeight="700"
                letterSpacing="0.08em"
                style={{ paintOrder: 'stroke fill' }}
              >
                Гермена
              </text>
              <text
                x="0"
                y="16"
                textAnchor="middle"
                fill="#E2DAC2"
                stroke="#06090E"
                strokeWidth="3"
                strokeLinejoin="round"
                fontFamily="Cinzel, serif"
                fontSize="9"
                letterSpacing="0.15em"
                style={{ paintOrder: 'stroke fill' }}
              >
                СОСЕДНЯЯ ОБЛАСТЬ
              </text>
            </g>

            {/* Non-interactive neighbor fort markers (as shown on reference map) */}
            <g transform="translate(382, 212)" opacity="0.85">
              <rect
                x="-5"
                y="-5"
                width="10"
                height="10"
                fill="#8B2635"
                stroke="#0B0F14"
                strokeWidth="2"
              />
              <text
                x="0"
                y="-9"
                textAnchor="middle"
                fill="#E6D6FF"
                stroke="#06090E"
                strokeWidth="3"
                strokeLinejoin="round"
                fontFamily="Source Sans 3, sans-serif"
                fontSize="9.5"
                fontWeight="600"
                style={{ paintOrder: 'stroke fill' }}
              >
                Цитадель Гермены
              </text>
            </g>

            {/* Boztepe Peninsula Tip Label — High Contrast Dark Outline */}
            <text
              x="595"
              y="212"
              textAnchor="middle"
              fill="#FFF3B0"
              stroke="#06090E"
              strokeWidth="4"
              strokeLinejoin="round"
              fontFamily="Cinzel, serif"
              fontSize="10"
              fontWeight="700"
              transform="rotate(-28, 595, 212)"
              style={{ paintOrder: 'stroke fill' }}
            >
              Мыс Синопы
            </text>

            {/* Interactive Polis Nodes of Pontus */}
            {poleis.map((polis) => {
              const isSelected = polis.id === selectedPolis.id;
              const playersCount = livingCharacters.filter(
                (c) => c.currentPolisId === polis.id
              ).length;

              return (
                <g
                  key={polis.id}
                  transform={`translate(${polis.coords.x}, ${polis.coords.y})`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    sound.playStoneTap();
                    setMapPan({ x: 0, y: 0 });
                    onSelectPolis(polis.id);
                  }}
                  className="cursor-pointer"
                >
                  {/* Enlarged Mobile Touch Hitbox */}
                  <circle r="34" fill="transparent" />

                  {/* Active Selection Halo */}
                  {isSelected && (
                    <circle
                      r="22"
                      fill="none"
                      stroke="#FFE17D"
                      strokeWidth="2.2"
                      strokeDasharray="3 2"
                    />
                  )}

                  {/* Square Fort / Polis Icon matching reference map + Classical Gold Rim */}
                  <rect
                    x={isSelected ? -9.5 : -7.5}
                    y={isSelected ? -9.5 : -7.5}
                    width={isSelected ? 19 : 15}
                    height={isSelected ? 19 : 15}
                    rx="2"
                    fill="#0B0F14"
                    stroke={isSelected ? '#FFE17D' : '#D4AF37'}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                  />
                  <rect
                    x={isSelected ? -4.5 : -3.5}
                    y={isSelected ? -4.5 : -3.5}
                    width={isSelected ? 9 : 7}
                    height={isSelected ? 9 : 7}
                    fill={isSelected ? '#FFE17D' : '#C0392B'}
                  />

                  {/* City Name Plaque with High-Contrast Dark Stroke on Yellow Text */}
                  <g transform="translate(0, -21)">
                    <rect
                      x="-68"
                      y="-16"
                      width="136"
                      height="21"
                      rx="3"
                      fill={isSelected ? '#151D28' : '#080B10'}
                      fillOpacity="0.96"
                      stroke={isSelected ? '#FFE17D' : '#D4AF37'}
                      strokeWidth={isSelected ? '1.6' : '1.2'}
                    />
                    <text
                      x="0"
                      y="-2"
                      textAnchor="middle"
                      fill={isSelected ? '#FFE17D' : '#FFF6CC'}
                      stroke="#05070A"
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                      fontFamily="Cinzel, serif"
                      fontSize="11"
                      fontWeight="700"
                      style={{ paintOrder: 'stroke fill' }}
                    >
                      {polis.name} {playersCount > 0 ? `(${playersCount})` : ''}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Polis Quick Selector Buttons */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            {poleis.map((p) => {
              const active = p.id === selectedPolis.id;
              const pCount = livingCharacters.filter(
                (c) => c.currentPolisId === p.id
              ).length;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    sound.playStoneTap();
                    setMapPan({ x: 0, y: 0 });
                    onSelectPolis(p.id);
                  }}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded text-xs font-epigraphic whitespace-nowrap shrink-0 cursor-pointer border transition-colors ${
                    active
                      ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37] votive-glow'
                      : 'bg-[#121820] text-[#C2B280] border-[#263140] hover:text-[#F3E5AB]'
                  }`}
                >
                  {p.name} · {pCount} игр. в РП
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Polis Card & Internal Polis View */}
      <div className="stele-panel p-4 sm:p-6 space-y-5">
        <LaurelHeaderDivider label={`Полис Понта · ${selectedPolis.greekName}`} />

        {/* Polis Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-[#263140] pb-4">
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-epigraphic text-[#C2B280]">
              <span>{selectedPolis.region}</span>
              {selectedPolis.realLatLng && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#8EBDA2]">{selectedPolis.realLatLng}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="text-[#E5C158]">{selectedPolis.rulingBody}</span>
            </div>
            <div className="flex items-center gap-3">
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#F3E5AB]">
                Полис {selectedPolis.name}
              </h3>
              {isGmMode && !editingDescription && (
                <button
                  type="button"
                  onClick={handleStartEditDesc}
                  className="px-2.5 py-1 rounded bg-[#1B232E] border border-[#D4AF37]/60 text-xs font-epigraphic text-[#E5C158] flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Редактировать описание (ГМ)</span>
                </button>
              )}
            </div>

            {!editingDescription ? (
              <>
                <p className="text-sm font-semibold text-[#E5C158]/90 pt-1">
                  {selectedPolis.shortSummary}
                </p>
                <p className="text-sm text-[#E2DAC2] leading-relaxed pt-1">
                  {selectedPolis.fullDescription}
                </p>
              </>
            ) : (
              <div className="space-y-2.5 pt-2">
                <div className="wax-recess p-2">
                  <label className="block text-[10px] font-epigraphic text-[#C2B280]">
                    Краткое описание полиса
                  </label>
                  <input
                    type="text"
                    value={shortDescDraft}
                    onChange={(e) => setShortDescDraft(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#F3E5AB] focus:outline-none"
                  />
                </div>
                <div className="wax-recess p-2">
                  <label className="block text-[10px] font-epigraphic text-[#C2B280]">
                    Полное описание полиса
                  </label>
                  <textarea
                    rows={3}
                    value={fullDescDraft}
                    onChange={(e) => setFullDescDraft(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDesc}
                    className="px-3 py-1.5 rounded btn-golden-stater text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Сохранить изменения</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingDescription(false)}
                    className="px-3 py-1.5 rounded btn-basalt-stele text-xs cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sub-Navigation inside the Polis Card */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0B0F14] p-1.5 rounded border border-[#5E481E] shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setPolisTab('overview_events');
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded-xs text-xs font-epigraphic flex items-center gap-1.5 cursor-pointer transition-colors ${
                polisTab === 'overview_events'
                  ? 'bg-[#263140] text-[#E5C158] border border-[#D4AF37]/60'
                  : 'text-[#C2B280] hover:text-[#F3E5AB]'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>События РП ({selectedPolis.rpEvents.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setPolisTab('city_map_buildings');
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded-xs text-xs font-epigraphic flex items-center gap-1.5 cursor-pointer transition-colors ${
                polisTab === 'city_map_buildings'
                  ? 'bg-[#263140] text-[#E5C158] border border-[#D4AF37]/60'
                  : 'text-[#C2B280] hover:text-[#F3E5AB]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>
                Карта Полиса и Постройки ({selectedPolis.buildings.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setPolisTab('npc_factions');
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded-xs text-xs font-epigraphic flex items-center gap-1.5 cursor-pointer transition-colors ${
                polisTab === 'npc_factions'
                  ? 'bg-[#263140] text-[#E5C158] border border-[#D4AF37]/60'
                  : 'text-[#C2B280] hover:text-[#F3E5AB]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Фракции NPC ({selectedPolis.npcFactions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setPolisTab('players_in_rp');
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded-xs text-xs font-epigraphic flex items-center gap-1.5 cursor-pointer transition-colors ${
                polisTab === 'players_in_rp'
                  ? 'bg-[#263140] text-[#E5C158] border border-[#D4AF37]/60'
                  : 'text-[#C2B280] hover:text-[#F3E5AB]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Игроки в РП ({playersInSelectedPolis.length})</span>
            </button>
          </div>
        </div>

        {/* Always-Visible Summary Strip: Players currently in RP in this Polis */}
        <div className="p-3.5 rounded bg-[#1B232E] border border-[#9A7B38]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-epigraphic text-xs uppercase text-[#E5C158] font-bold flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>Сейчас находятся в РП в полисе {selectedPolis.name}:</span>
            </span>
            {playersInSelectedPolis.length === 0 ? (
              <span className="text-xs text-[#C2B280]">
                Ни одной активной анкеты в городе (переместите персонажа из вкладки «Профиль»)
              </span>
            ) : (
              playersInSelectedPolis.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => {
                    sound.playStoneTap();
                    onInspectCharacterInRegistry(pl.id);
                  }}
                  className="px-2.5 py-1 rounded bg-[#121820] hover:bg-[#263140] border border-[#D4AF37]/50 text-xs text-[#F3E5AB] flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{pl.name}</span>
                  {pl.isPlayerOwned && (
                    <span className="text-[10px] text-[#8EBDA2] font-bold">
                      (ВЫ)
                    </span>
                  )}
                  <span className="text-[10px] text-[#C2B280]">
                    ({pl.position})
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Interactive City District Map — Automatically shown when Sinope is selected or when inspecting the City Map tab of any Polis */}
        {(selectedPolis.id === 'sinope' ||
          polisTab === 'city_map_buildings') && (
          <SinopeCityMapInteractive
            key={selectedPolis.id}
            isGmMode={isGmMode}
            polisId={selectedPolis.id}
            polisName={selectedPolis.name}
          />
        )}

        {/* TAB 1: RP Events & Local Commodities */}
        {polisTab === 'overview_events' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 space-y-3.5">
              <h4 className="font-display text-lg font-bold text-[#F3E5AB]">
                Произошедшие События РП в полисе {selectedPolis.name}
              </h4>

              {isGmMode && (
                <form
                  onSubmit={handleAddRpEvent}
                  className="p-3.5 rounded bg-[#1B232E] border border-[#D4AF37] space-y-2.5"
                >
                  <span className="block font-epigraphic text-xs uppercase text-[#E5C158]">
                    + Записать новое событие РП в хронику полиса (ГМ):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="wax-recess px-2.5 py-1.5">
                      <input
                        type="text"
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        placeholder="Дата / Месяц"
                        className="w-full bg-transparent text-xs text-[#C2B280] focus:outline-none"
                      />
                    </div>
                    <div className="wax-recess px-2.5 py-1.5">
                      <input
                        type="text"
                        required
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                        placeholder="Заголовок события в РП *"
                        className="w-full bg-transparent text-xs text-[#F3E5AB] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="wax-recess p-2">
                    <textarea
                      rows={2}
                      required
                      value={newEventSummary}
                      onChange={(e) => setNewEventSummary(e.target.value)}
                      placeholder="Краткое описание того, что произошло в отыгрыше..."
                      className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded btn-golden-stater text-xs cursor-pointer"
                  >
                    Добавить событие в полис
                  </button>
                </form>
              )}

              {selectedPolis.rpEvents.length === 0 ? (
                <div className="wax-recess p-5 text-center text-xs text-[#C2B280]">
                  В этом полисе пока нет зафиксированных событий РП.
                </div>
              ) : (
                selectedPolis.rpEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded bg-[#1B232E] border border-[#263140] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-epigraphic text-[#C2B280]">
                      <span>{ev.dateLabel}</span>
                      {isGmMode && (
                        <button
                          type="button"
                          onClick={() =>
                            onGmUpdatePolis(selectedPolis.id, {
                              rpEvents: selectedPolis.rpEvents.filter(
                                (item) => item.id !== ev.id
                              ),
                            })
                          }
                          className="text-[#F1A9B2] hover:underline cursor-pointer"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                    <h5 className="font-display text-base font-bold text-[#F3E5AB]">
                      {ev.title}
                    </h5>
                    <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                      {ev.summary}
                    </p>
                    {ev.participants.length > 0 && (
                      <p className="text-xs text-[#E5C158] pt-1">
                        Участники РП: {ev.participants.join(', ')}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="lg:col-span-5 space-y-3">
              <h4 className="font-display text-lg font-bold text-[#F3E5AB]">
                Местные Ресурсы и Товары Полиса
              </h4>
              <div className="space-y-2.5">
                {selectedPolis.resources.map((res) => (
                  <div
                    key={res.id}
                    className="wax-recess p-3.5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-[10px] font-epigraphic uppercase text-[#8EBDA2]">
                        {res.category} · {res.abundance}
                      </span>
                      <p className="text-sm font-bold text-[#F3E5AB]">
                        {res.name}
                      </p>
                    </div>
                    <div className="text-right tabular-nums shrink-0 text-xs">
                      <span className="block font-bold text-[#E5C158]">
                        Закупка: {res.localBuyPrice} др.
                      </span>
                      <span className="block text-[#C2B280]">
                        Рынок Понта: {res.avgMarketPrice} др.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Internal Polis Map (Districts & Buildings) */}
        {polisTab === 'city_map_buildings' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-display text-xl font-bold text-[#F3E5AB]">
                Внутренняя Карта-Схема Полиса {selectedPolis.name}: Кварталы и Постройки
              </h4>
              <p className="text-xs text-[#C2B280]">
                Постройки города, ремесленные эргастерии, верфи и храмовые участки, доступные для отыгрыша и экономики.
              </p>
            </div>

            {isGmMode && (
              <form
                onSubmit={handleAddBuilding}
                className="p-3.5 rounded bg-[#1B232E] border border-[#D4AF37] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end"
              >
                <div>
                  <label className="block text-[10px] font-epigraphic text-[#E5C158] uppercase mb-1">
                    Квартал полиса
                  </label>
                  <div className="wax-recess px-2.5 py-1.5">
                    <select
                      value={newBldDistrict}
                      onChange={(e) =>
                        setNewBldDistrict(
                          e.target.value as PolisBuilding['district']
                        )
                      }
                      className="w-full bg-[#0B0F14] text-xs text-[#E2DAC2] focus:outline-none"
                    >
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-epigraphic text-[#C2B280] uppercase mb-1">
                    Название постройки *
                  </label>
                  <div className="wax-recess px-2.5 py-1.5">
                    <input
                      type="text"
                      required
                      value={newBldName}
                      onChange={(e) => setNewBldName(e.target.value)}
                      placeholder="Напр.: Литейная мастерская"
                      className="w-full bg-transparent text-xs text-[#F3E5AB] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-epigraphic text-[#C2B280] uppercase mb-1">
                    Владелец / Контроль
                  </label>
                  <div className="wax-recess px-2.5 py-1.5">
                    <input
                      type="text"
                      value={newBldOwner}
                      onChange={(e) => setNewBldOwner(e.target.value)}
                      placeholder="Кто владеет"
                      className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-epigraphic text-[#C2B280] uppercase mb-1">
                    Описание и функции
                  </label>
                  <div className="wax-recess px-2.5 py-1.5">
                    <input
                      type="text"
                      value={newBldDesc}
                      onChange={(e) => setNewBldDesc(e.target.value)}
                      placeholder="Что производит / даёт"
                      className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="min-h-[36px] px-3 py-1.5 rounded btn-golden-stater text-xs cursor-pointer"
                >
                  + Построить (ГМ)
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DISTRICTS.map((districtName) => {
                const districtBuildings = selectedPolis.buildings.filter(
                  (b) => b.district === districtName
                );
                return (
                  <div
                    key={districtName}
                    className="wax-recess p-4 border border-[#9A7B38]/40 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-[#263140] pb-2">
                      <span className="font-epigraphic text-xs font-bold uppercase text-[#E5C158]">
                        {districtName}
                      </span>
                      <span className="text-[11px] font-epigraphic text-[#C2B280]">
                        Объектов: {districtBuildings.length}
                      </span>
                    </div>

                    {districtBuildings.length === 0 ? (
                      <p className="text-xs text-[#7C786A] py-2">
                        В этом квартале пока не отмечено особых построек.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {districtBuildings.map((bld) => (
                          <div
                            key={bld.id}
                            className="p-3 rounded bg-[#1B232E] border border-[#263140] space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-display text-sm font-bold text-[#F3E5AB]">
                                {bld.name}
                              </h5>
                              {isGmMode && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onGmUpdatePolis(selectedPolis.id, {
                                      buildings: selectedPolis.buildings.filter(
                                        (x) => x.id !== bld.id
                                      ),
                                    })
                                  }
                                  className="text-[#F1A9B2] hover:text-white cursor-pointer"
                                  title="Удалить постройку (ГМ)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] font-epigraphic text-[#C2B280]">
                              Владелец: {bld.ownerOrController}
                            </p>
                            <p className="text-xs text-[#E2DAC2] leading-relaxed">
                              {bld.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: NPC Factions & Secret Player Faction Support (GM-Only Visibility) */}
        {polisTab === 'npc_factions' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-display text-xl font-bold text-[#F3E5AB]">
                Фракции NPC в полисе {selectedPolis.name}
              </h4>
              <p className="text-xs text-[#C2B280]">
                Городские группировки, цехи и советы старейшин. Сведения о том, какую фракцию игроков они тайно поддерживают, доступны только в режиме Гейм-Мастера (ГМ).
              </p>
            </div>

            {isGmMode && (
              <form
                onSubmit={handleAddNpcFaction}
                className="p-3.5 rounded bg-[#1B232E] border border-[#D4AF37] grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end"
              >
                <div>
                  <label className="block text-[10px] font-epigraphic text-[#E5C158] uppercase mb-1">
                    Название фракции NPC *
                  </label>
                  <div className="wax-recess px-2.5 py-1.5">
                    <input
                      type="text"
                      required
                      value={newNpcName}
                      onChange={(e) => setNewNpcName(e.target.value)}
                      placeholder="Напр.: Гильдия Кормчих"
                      className="w-full bg-transparent text-xs text-[#F3E5AB] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-epigraphic text-[#C2B280] uppercase mb-1">
                    Публичная позиция
                  </label>
                  <div className="wax-recess px-2.5 py-1.5">
                    <input
                      type="text"
                      value={newNpcStance}
                      onChange={(e) => setNewNpcStance(e.target.value)}
                      placeholder="Чего добиваются в городе"
                      className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-epigraphic text-[#E5C158] uppercase mb-1">
                    Кого из игроков поддерживают (ГМ)
                  </label>
                  <div className="wax-recess px-2.5 py-1.5">
                    <select
                      value={newNpcSupportedPlayerFaction}
                      onChange={(e) =>
                        setNewNpcSupportedPlayerFaction(e.target.value)
                      }
                      className="w-full bg-[#0B0F14] text-xs text-[#E2DAC2] focus:outline-none"
                    >
                      {PLAYER_FACTIONS_LIST.map((pf) => (
                        <option key={pf} value={pf}>
                          {pf}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="min-h-[36px] px-3 py-1.5 rounded btn-golden-stater text-xs cursor-pointer"
                >
                  + Добавить фракцию NPC
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedPolis.npcFactions.map((npc) => (
                <div
                  key={npc.id}
                  className="p-4 rounded bg-[#1B232E] border border-[#263140] space-y-3"
                >
                  <div>
                    <span className="text-xs font-epigraphic text-[#E5C158]">
                      Влияние в полисе: {npc.influencePercent}%
                    </span>
                    <h5 className="font-display text-lg font-bold text-[#F3E5AB]">
                      {npc.name}
                    </h5>
                  </div>

                  <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                    <strong className="text-[#C2B280]">Открытая позиция:</strong>{' '}
                    {npc.publicStance}
                  </p>

                  {isGmMode ? (
                    <div className="p-3 rounded bg-[#0B0F14] border border-[#D4AF37] space-y-2">
                      <div className="flex items-center justify-between text-xs font-epigraphic text-[#E5C158]">
                        <span>СЕКРЕТНО (ТОЛЬКО ДЛЯ ГМ):</span>
                        <span>Тайная симпатия NPC</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-epigraphic text-[#C2B280] mb-1">
                          Какую фракцию игроков поддерживают:
                        </label>
                        <select
                          value={npc.supportedPlayerFaction}
                          onChange={(e) => {
                            sound.playStoneTap();
                            const updated = selectedPolis.npcFactions.map(
                              (item) =>
                                item.id === npc.id
                                  ? {
                                      ...item,
                                      supportedPlayerFaction: e.target.value,
                                    }
                                  : item
                            );
                            onGmUpdatePolis(selectedPolis.id, {
                              npcFactions: updated,
                            });
                          }}
                          className="w-full bg-[#1B232E] border border-[#9A7B38] rounded px-2.5 py-1.5 text-xs text-[#8EBDA2] font-semibold focus:outline-none cursor-pointer"
                        >
                          {PLAYER_FACTIONS_LIST.map((pf) => (
                            <option key={pf} value={pf}>
                              {pf}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-[#C2B280] italic">
                        Заметка ГМ: {npc.gmNotes}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded bg-[#0B0F14]/70 border border-[#263140] flex items-center gap-2 text-xs text-[#7C786A]">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Какую партию игроков тайно поддерживает эта фракция NPC — скрыто (включите «Режим ГМ» в шапке).
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Detailed Cards of Active Players in this Polis */}
        {polisTab === 'players_in_rp' && (
          <div className="space-y-4">
            <h4 className="font-display text-xl font-bold text-[#F3E5AB]">
              Персонажи игроков, находящиеся в РП в полисе {selectedPolis.name} ({playersInSelectedPolis.length})
            </h4>
            {playersInSelectedPolis.length === 0 ? (
              <div className="wax-recess p-6 text-center text-sm text-[#C2B280]">
                В настоящее время в полисе {selectedPolis.name} нет активных персонажей игроков.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playersInSelectedPolis.map((char) => (
                  <div
                    key={char.id}
                    className="p-4 rounded bg-[#1B232E] border border-[#9A7B38]/60 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-epigraphic text-[#C2B280]">
                        <span>{char.nationality}</span>
                        <span className="text-[#E5C158] font-bold tabular-nums">
                          {char.drachmas} драхм
                        </span>
                      </div>
                      <h5 className="font-display text-lg font-bold text-[#F3E5AB] mt-0.5">
                        {char.name}{' '}
                        {char.isPlayerOwned && (
                          <span className="text-xs font-epigraphic text-[#8EBDA2]">
                            (Моя анкета)
                          </span>
                        )}
                      </h5>
                      <p className="text-xs text-[#E5C158] mt-0.5">
                        {char.status} · {char.position}
                      </p>
                      <p className="text-xs text-[#C2B280] mt-0.5">
                        Партия / Род: {char.nobleHouseOrParty}
                      </p>
                      <p className="text-xs text-[#E2DAC2] mt-2 line-clamp-2">
                        {char.appearance}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#263140] flex items-center justify-between">
                      <span className="text-xs text-[#C2B280]">
                        Имущества в описи: {char.inventory.length} ед.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playStoneTap();
                          onInspectCharacterInRegistry(char.id);
                        }}
                        className="px-3 py-1.5 rounded btn-basalt-stele text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Открыть анкету</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

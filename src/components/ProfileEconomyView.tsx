import React, { useState } from 'react';
import {
  CharacterInventoryItem,
  CharacterKeyEvent,
  CharacterSheet,
  GlobalEconomyState,
  PolisData,
  PolisResource,
  PropertyCategory,
} from '../types/rpTypes';
import { PLAYER_FACTIONS_LIST } from '../data/initialRpData';
import {
  formatVkOperationStamp,
  generateOperationCode,
  INITIAL_GLOBAL_ECONOMY,
} from '../data/economyCodexData';
import { EconomyCodexPanel } from './EconomyCodexPanel';
import {
  LaurelHeaderDivider,
  LaurelWreathBadge,
  WaxSealBadge,
} from './PonticPrimitives';
import { sound } from '../utils/sound';
import { uploadPortraitWithSupabaseFallback } from '../utils/supabaseSync';
import {
  Coins,
  MapPin,
  PackagePlus,
  Ship,
  ShoppingBag,
  TrendingUp,
  Edit3,
  Check,
  Trash2,
  ArrowRight,
  Skull,
  UserPlus,
  ImagePlus,
  Award,
  Sparkles,
  PlusCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Copy,
} from 'lucide-react';

interface ProfileEconomyViewProps {
  character: CharacterSheet | undefined;
  poleis: PolisData[];
  globalEconomy?: GlobalEconomyState;
  onUpdateGlobalEconomy?: (next: GlobalEconomyState) => void;
  onRecordPolisChronicle?: (
    polisId: string,
    title: string,
    summary: string
  ) => void;
  isGmMode?: boolean;
  debugAdminEnabled?: boolean;
  onToggleDebugAdmin?: () => void;
  onGoToCreateNewPersonalSheet: () => void;
  onOpenPendingRegistry?: () => void;
  onUpdateCharacterMeta: (
    charId: string,
    updates: Partial<CharacterSheet>
  ) => void;
  onBuyPolisResource: (
    charId: string,
    resource: PolisResource,
    quantity: number
  ) => void;
  onSellInventoryItem: (
    charId: string,
    itemId: string,
    sellPricePerUnit: number
  ) => void;
  onSendCaravan: (
    charId: string,
    itemId: string,
    destPolisId: string,
    travelWithCaravan: boolean
  ) => void;
  onAddCustomInventoryItem: (
    charId: string,
    item: Omit<CharacterInventoryItem, 'id'>
  ) => void;
  onDeleteInventoryItem: (charId: string, itemId: string) => void;
  onJumpToPolisCard: (polisId: string) => void;
  onBuryMyCharacter: (
    charId: string,
    deathDate: string,
    deathCause: string,
    epitaph: string
  ) => void;
}

export const ProfileEconomyView: React.FC<ProfileEconomyViewProps> = ({
  character,
  poleis,
  globalEconomy = INITIAL_GLOBAL_ECONOMY,
  onUpdateGlobalEconomy,
  onRecordPolisChronicle,
  isGmMode = false,
  debugAdminEnabled = false,
  onToggleDebugAdmin,
  onGoToCreateNewPersonalSheet,
  onOpenPendingRegistry,
  onUpdateCharacterMeta,
  onBuyPolisResource,
  onSellInventoryItem,
  onSendCaravan,
  onAddCustomInventoryItem,
  onDeleteInventoryItem,
  onJumpToPolisCard,
  onBuryMyCharacter,
}) => {
  // If the player hasn't created their personal character sheet yet (or sent their previous character to the Graveyard):
  if (!character) {
    return (
      <div className="stele-panel p-6 sm:p-10 text-center space-y-5 border-2 border-[#D4AF37]">
        <LaurelHeaderDivider label="Личная Анкета и Новое Начало" />
        <div className="flex justify-center">
          <LaurelWreathBadge size="lg" tone="gold">
            <UserPlus className="w-6 h-6 text-[#E5C158]" />
          </LaurelWreathBadge>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F3E5AB]">
          У вас ещё нет своей активной анкеты персонажа
        </h2>
        <p className="max-w-xl mx-auto text-sm sm:text-base text-[#E2DAC2] leading-relaxed">
          По правилам ролевой у каждого игрока может быть <strong>одна своя живая анкета</strong>, привязанная к вашему аккаунту (ВК ID). Если вы впервые в Понтийском царстве или ваш прежний герой покоится в Некрополе — создайте своего персонажа для участия в жизни полисов!
        </p>
        <div className="pt-2 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              sound.playCoinClink();
              onGoToCreateNewPersonalSheet();
            }}
            className="min-h-[48px] px-6 py-3 rounded btn-golden-stater text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Создать Новую Свою Анкету</span>
          </button>

          {onToggleDebugAdmin && (
            <button
              type="button"
              onClick={() => {
                sound.playWaxSeal();
                onToggleDebugAdmin();
              }}
              className={`group inline-flex flex-col items-center gap-1 p-1.5 rounded-full transition-transform active:scale-95 cursor-pointer ${
                debugAdminEnabled
                  ? 'ring-2 ring-[#E5C158] shadow-[0_0_18px_rgba(229,193,88,0.55)]'
                  : 'opacity-85 hover:opacity-100'
              }`}
              title="Отладка: нажмите на восковую печать для включения/выключения админского доступа"
            >
              <WaxSealBadge sigil="EUPATOR" size="sm" />
              {debugAdminEnabled && (
                <span className="px-2 py-0.5 rounded bg-[#8B2635] border border-[#E5C158] text-[10px] font-epigraphic text-[#F3E5AB]">
                  Админ-отладка: ВКЛ
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  const [editingMeta, setEditingMeta] = useState(false);
  const [editingInlineAge, setEditingInlineAge] = useState(false);
  const [ageInput, setAgeInput] = useState<number>(character.age || 28);
  const [statusInput, setStatusInput] = useState(character.status);
  const [positionInput, setPositionInput] = useState(character.position);
  const [partyInput, setPartyInput] = useState(character.nobleHouseOrParty);

  // Portrait edit drawer
  const [showPortraitEdit, setShowPortraitEdit] = useState(false);
  const [portraitUrlDraft, setPortraitUrlDraft] = useState(
    character.portraitUrl || ''
  );

  // Biography edit state
  const [editingBio, setEditingBio] = useState(false);
  const [appearanceDraft, setAppearanceDraft] = useState(character.appearance);
  const [personalityDraft, setPersonalityDraft] = useState(
    character.personality
  );
  const [backstoryDraft, setBackstoryDraft] = useState(character.backstory);

  // Key Events (Вехи судьбы и изменения персонажа) form state
  const [showAddKeyEvent, setShowAddKeyEvent] = useState(false);
  const [keTitle, setKeTitle] = useState('');
  const [keDate, setKeDate] = useState('110 г. до н.э. · Новая веха');
  const [keAddedBy, setKeAddedBy] = useState<CharacterKeyEvent['addedBy']>(
    isGmMode ? 'ГМ (Ивент / Событие РП)' : 'Игрок (Развитие персонажа)'
  );
  const [keDesc, setKeDesc] = useState('');
  const [keChangeNote, setKeChangeNote] = useState('');

  // Bury modal inside Profile
  const [showBuryModal, setShowBuryModal] = useState(false);
  const [deathDate, setDeathDate] = useState('110 г. до н.э.');
  const [deathCause, setDeathCause] = useState('Пал в бою при защите каравана');
  const [epitaph, setEpitaph] = useState(
    '«Достойно прожил среди эллинов Синопы и друзей, оставив по себе добрую память»'
  );

  // Local resource purchase qty
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});

  // Caravan planner state
  const [caravanItemId, setCaravanItemId] = useState<string>(
    character.inventory[0]?.id || ''
  );
  const [destPolisId, setDestPolisId] = useState<string>(
    poleis.find((p) => p.id !== character.currentPolisId)?.id || 'kratopol'
  );
  const [travelWithCaravan, setTravelWithCaravan] = useState<boolean>(true);
  const [hireCaravanGuards, setHireCaravanGuards] = useState<boolean>(true);
  const [caravanFeedback, setCaravanFeedback] = useState<string | null>(null);
  const [caravanStampText, setCaravanStampText] = useState<string | null>(null);

  // Add custom item form state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] =
    useState<PropertyCategory>('Материалы и сырьё');
  const [customQty, setCustomQty] = useState<number>(5);
  const [customUnit, setCustomUnit] = useState<string>('партий');
  const [customMethod, setCustomMethod] = useState<string>(
    'Куплено по сделке в РП / Наследство / Добыто'
  );
  const [customBuyPrice, setCustomBuyPrice] = useState<number>(30);
  const [customMarketPrice, setCustomMarketPrice] = useState<number>(45);
  const [customDeductDrachmas, setCustomDeductDrachmas] =
    useState<boolean>(false);

  const currentPolis =
    poleis.find((p) => p.id === character.currentPolisId) || poleis[0];

  const totalMarketValuation = character.inventory.reduce(
    (sum, i) => sum + i.marketPriceDrachmas * i.quantity,
    0
  );
  const totalNetWorth = character.drachmas + totalMarketValuation;

  const handleSaveMeta = () => {
    sound.playWaxSeal();
    const clampedAge = Math.max(1, Math.min(150, Math.round(Number(ageInput) || character.age || 28)));
    onUpdateCharacterMeta(character.id, {
      age: clampedAge,
      status: statusInput,
      position: positionInput,
      nobleHouseOrParty: partyInput,
    });
    setEditingMeta(false);
    setEditingInlineAge(false);
  };

  const handleSaveInlineAge = () => {
    sound.playWaxSeal();
    const clampedAge = Math.max(1, Math.min(150, Math.round(Number(ageInput) || character.age || 28)));
    onUpdateCharacterMeta(character.id, {
      age: clampedAge,
    });
    setEditingInlineAge(false);
  };

  const handlePortraitFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadPortraitWithSupabaseFallback(file);
      sound.playWaxSeal();
      setPortraitUrlDraft(url);
      onUpdateCharacterMeta(character.id, {
        portraitUrl: url,
      });
      setShowPortraitEdit(false);
    } catch {
      // Ignore upload error
    }
  };

  const handleSaveBio = () => {
    sound.playWaxSeal();
    onUpdateCharacterMeta(character.id, {
      appearance: appearanceDraft.trim() || character.appearance,
      personality: personalityDraft.trim() || character.personality,
      backstory: backstoryDraft.trim() || character.backstory,
    });
    setEditingBio(false);
  };

  const handleAddKeyEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keTitle.trim() || !keDesc.trim()) return;
    sound.playWaxSeal();
    const newEvent: CharacterKeyEvent = {
      id: `ke-${Date.now()}`,
      title: keTitle.trim(),
      dateLabel: keDate.trim() || '110 г. до н.э.',
      addedBy: keAddedBy,
      description: keDesc.trim(),
      characterChangeNote: keChangeNote.trim() || undefined,
    };
    onUpdateCharacterMeta(character.id, {
      keyEvents: [...(character.keyEvents || []), newEvent],
    });
    setKeTitle('');
    setKeDesc('');
    setKeChangeNote('');
    setShowAddKeyEvent(false);
  };

  const handleDeleteKeyEvent = (eventId: string) => {
    sound.playStoneTap();
    onUpdateCharacterMeta(character.id, {
      keyEvents: (character.keyEvents || []).filter((ev) => ev.id !== eventId),
    });
  };

  const handleAddCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    sound.playCoinClink();

    if (customDeductDrachmas) {
      const totalCost = customBuyPrice * customQty;
      onUpdateCharacterMeta(character.id, {
        drachmas: Math.max(0, character.drachmas - totalCost),
      });
    }

    onAddCustomInventoryItem(character.id, {
      name: customName.trim(),
      category: customCategory,
      quantity: Math.max(1, Number(customQty) || 1),
      unit: customUnit.trim() || 'ед.',
      acquisitionMethod: customMethod.trim() || 'Записано владельцем анкеты',
      purchasePriceDrachmas: Math.max(0, Number(customBuyPrice) || 0),
      marketPriceDrachmas: Math.max(1, Number(customMarketPrice) || 1),
      originPolis: currentPolis.name,
    });

    setCustomName('');
    setShowAddCustom(false);
  };

  const selectedCaravanItem =
    character.inventory.find((i) => i.id === caravanItemId) ||
    character.inventory[0];

  const destPolis = poleis.find((p) => p.id === destPolisId) || poleis[0];

  const caravanUnitPayout = selectedCaravanItem
    ? Math.round(selectedCaravanItem.marketPriceDrachmas * 1.2)
    : 0;
  const caravanTotalPayout = selectedCaravanItem
    ? caravanUnitPayout * selectedCaravanItem.quantity
    : 0;

  const isFrozenPending = character.approvalStatus === 'pending';
  const isRejected = character.approvalStatus === 'rejected';

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Frozen / Pending Approval Notice Banner */}
      {(isFrozenPending || isRejected) && (
        <div
          className={`p-4 sm:p-5 rounded border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isRejected
              ? 'bg-[#2A151B]/90 border-[#C0392B]'
              : 'bg-[#1B232E] border-[#E5C158] votive-glow'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#121820] border border-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
              {isRejected ? (
                <AlertTriangle className="w-5 h-5 text-[#F1A9B2]" />
              ) : (
                <Clock className="w-5 h-5 text-[#E5C158]" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-epigraphic text-xs uppercase tracking-wider font-bold text-[#E5C158]">
                  {isRejected
                    ? 'Анкета возвращена ГМом на доработку'
                    : 'Анкета заморожена · Ожидает одобрения ГМа'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                {isRejected
                  ? character.rejectionReason ||
                    'Гейм-Мастер попросил уточнить биографию или детали анкеты. Отредактируйте профиль ниже для повторной проверки.'
                  : 'После создания персонаж не сразу вступает в игру, а сначала замораживается для проверки и одобрения Гейм-Мастером (или Создателем). Вы уже можете прикрепить портрет и дополнить биографию, а торговля на рынке и отправка караванов откроются сразу после одобрения анкеты.'}
              </p>
            </div>
          </div>

          {isGmMode && onOpenPendingRegistry && (
            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                onOpenPendingRegistry();
              }}
              className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded btn-golden-stater text-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Перейти в «Проверка Анкет»</span>
            </button>
          )}
        </div>
      )}

      {/* Top Personal Character Sheet Card */}
      <div className="stele-panel p-5 sm:p-8">
        <LaurelHeaderDivider label="Единственная Личная Анкета Игрока · Понт" />

        <div className="mt-4 flex flex-col xl:flex-row xl:items-start justify-between gap-6 border-b border-[#263140] pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
            {/* Dedicated Vertical Character Portrait Showcase Frame */}
            <div className="flex flex-col items-center shrink-0 w-36 sm:w-44">
              <div className="relative w-36 h-44 sm:w-44 sm:h-52 rounded-md border-2 border-[#D4AF37] overflow-hidden bg-gradient-to-b from-[#151D28] to-[#0B0F14] shadow-[0_8px_28px_rgba(0,0,0,0.75),0_0_20px_rgba(212,175,55,0.2)] flex flex-col items-center justify-center">
                {character.portraitUrl ? (
                  <img
                    src={character.portraitUrl}
                    alt={character.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-3 text-center flex flex-col items-center justify-center space-y-2">
                    <LaurelWreathBadge
                      size="lg"
                      tone="gold"
                      title="Место для портрета персонажа"
                    >
                      <span>{character.name.charAt(0)}</span>
                    </LaurelWreathBadge>
                    <span className="font-epigraphic text-[10px] uppercase tracking-wider text-[#E5C158] block">
                      Место для портрета
                    </span>
                    <span className="text-[11px] text-[#C2B280] leading-tight block">
                      Нажмите кнопку ниже, чтобы загрузить образ героя
                    </span>
                  </div>
                )}

                {/* Corner Classical Accents */}
                <span className="pointer-events-none absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l border-[#E5C158]/70" />
                <span className="pointer-events-none absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t border-r border-[#E5C158]/70" />
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b border-l border-[#E5C158]/70" />
                <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r border-[#E5C158]/70" />
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playStoneTap();
                  setPortraitUrlDraft(character.portraitUrl || '');
                  setShowPortraitEdit(!showPortraitEdit);
                }}
                className="mt-2.5 min-h-[38px] w-full px-3 py-1.5 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#D4AF37]/70 text-xs font-epigraphic text-[#E5C158] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <ImagePlus className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {character.portraitUrl ? 'Сменить портрет' : '+ Портрет героя'}
                </span>
              </button>
            </div>

            <div className="text-center sm:text-left space-y-2 pt-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-epigraphic text-[#C2B280]">
                <span className="text-[#8EBDA2] font-bold">МОЯ АНКЕТА (1/1)</span>
                <span aria-hidden="true">·</span>
                <span>{character.nationality}</span>
                <span aria-hidden="true">·</span>
                {!editingInlineAge ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playStoneTap();
                      setAgeInput(character.age || 28);
                      setEditingInlineAge(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#D4AF37]/50 text-[#F3E5AB] cursor-pointer transition-colors"
                    title="Нажмите, чтобы изменить возраст персонажа"
                  >
                    <span>
                      {character.gender}, {character.age} лет
                    </span>
                    <Edit3 className="w-3 h-3 text-[#E5C158]" />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1B232E] border border-[#E5C158]">
                    <span>{character.gender},</span>
                    <input
                      type="number"
                      min={1}
                      max={150}
                      value={ageInput}
                      onChange={(e) => setAgeInput(Number(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveInlineAge();
                        } else if (e.key === 'Escape') {
                          setEditingInlineAge(false);
                        }
                      }}
                      className="w-14 px-1.5 py-0.5 rounded bg-[#0B0F14] border border-[#D4AF37] text-xs font-bold text-[#F3E5AB] text-center tabular-nums focus:outline-none"
                      autoFocus
                    />
                    <span>лет</span>
                    <button
                      type="button"
                      onClick={handleSaveInlineAge}
                      className="px-1.5 py-0.5 rounded bg-[#D4AF37] text-[#0B0F14] font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                      title="Сохранить возраст"
                    >
                      <Check className="w-3 h-3" />
                      <span>ОК</span>
                    </button>
                  </span>
                )}
                <span aria-hidden="true">·</span>
                {isFrozenPending ? (
                  <span className="px-2 py-0.5 rounded bg-[#E5C158]/20 border border-[#E5C158] text-[#E5C158] font-bold">
                    На проверке у ГМ
                  </span>
                ) : isRejected ? (
                  <span className="px-2 py-0.5 rounded bg-[#8B2635]/40 border border-[#C0392B] text-[#F1A9B2] font-bold">
                    Требует правок
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-[#2E5A44]/40 border border-[#4E8765] text-[#8EBDA2] font-bold">
                    Одобрена в игру
                  </span>
                )}
              </div>

              <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#F3E5AB]">
                {character.name}
              </h2>

              <p className="text-xs sm:text-sm text-[#C2B280] max-w-xl leading-relaxed">
                {character.status} ·{' '}
                <strong className="text-[#E5C158]">{character.position}</strong>{' '}
                · {character.nobleHouseOrParty}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-start xl:items-end gap-2.5 w-full xl:w-auto pt-2 xl:pt-0">
            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setShowBuryModal(true);
              }}
              className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded btn-sacrificial text-xs flex items-center justify-center gap-2 cursor-pointer"
              title="Если отправить свою анкету на кладбище, откроется создание нового персонажа"
            >
              <Skull className="w-4 h-4 shrink-0" />
              <span>Отправить на Кладбище (Создать нового)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playWaxSeal();
                onToggleDebugAdmin?.();
              }}
              className={`group inline-flex items-center gap-2 p-1 rounded-full transition-all active:scale-95 cursor-pointer ${
                debugAdminEnabled
                  ? 'ring-2 ring-[#E5C158] shadow-[0_0_18px_rgba(229,193,88,0.55)] bg-[#8B2635]/30 pr-3'
                  : 'opacity-90 hover:opacity-100'
              }`}
              title="Отладка: нажмите на восковую печать под надписью «Отправить на Кладбище», чтобы временно включить или выключить админский доступ"
            >
              <WaxSealBadge sigil="EUPATOR" size="sm" />
              {debugAdminEnabled && (
                <span className="text-[10px] font-epigraphic font-bold text-[#E5C158] uppercase tracking-wider">
                  Админ-доступ (Отладка): ВКЛ
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Portrait Upload / URL Drawer */}
        {showPortraitEdit && (
          <div className="mt-5 p-4 rounded bg-[#1B232E] border border-[#D4AF37] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-epigraphic text-xs uppercase text-[#E5C158]">
                Прикрепить или обновить портрет персонажа в профиле:
              </span>
              <button
                type="button"
                onClick={() => setShowPortraitEdit(false)}
                className="text-xs text-[#C2B280] hover:text-white cursor-pointer"
              >
                Закрыть
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <label className="min-h-[42px] px-4 py-2 rounded btn-golden-stater text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                <ImagePlus className="w-4 h-4" />
                <span>Загрузить файл изображения</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePortraitFileUpload}
                  className="hidden"
                />
              </label>

              <div className="wax-recess px-3 py-2 flex-1">
                <input
                  type="text"
                  value={portraitUrlDraft}
                  onChange={(e) => setPortraitUrlDraft(e.target.value)}
                  placeholder="Или вставьте прямую ссылку (URL) на изображение..."
                  className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playWaxSeal();
                  onUpdateCharacterMeta(character.id, {
                    portraitUrl: portraitUrlDraft.trim() || undefined,
                  });
                  setShowPortraitEdit(false);
                }}
                className="min-h-[42px] px-4 py-2 rounded btn-basalt-stele text-xs cursor-pointer shrink-0"
              >
                Сохранить ссылку
              </button>
            </div>
          </div>
        )}

        {/* Location Transfer & Status Grid — Generous Horizontal & Vertical Breathing Room */}
        <div className="mt-7 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Left 5 cols: Current Polis Location (Auto-synced to Map Polis Card!) */}
          <div className="lg:col-span-5 bg-[#1B232E] border border-[#D4AF37]/50 rounded p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-epigraphic text-xs uppercase tracking-wider text-[#E5C158]">
                  Текущее Местоположение в Понте
                </span>
                <MapPin className="w-4 h-4 text-[#E5C158] shrink-0" />
              </div>
              <p className="text-xs sm:text-sm text-[#C2B280] mt-2 leading-relaxed">
                Выбор полиса автоматически переносит вашу анкету в карточку этого города на Карте Понта (Синопа, Никомедион, Опиу, Кратополь):
              </p>

              <div className="mt-4 wax-recess px-3.5 py-2.5">
                <select
                  value={character.currentPolisId}
                  onChange={(e) => {
                    sound.playStoneTap();
                    onUpdateCharacterMeta(character.id, {
                      currentPolisId: e.target.value,
                    });
                  }}
                  className="w-full bg-[#0B0F14] text-sm font-bold text-[#F3E5AB] focus:outline-none cursor-pointer"
                >
                  {poleis.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.greekName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-[#263140] flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs sm:text-sm text-[#8EBDA2]">
                В карточке полиса: <strong>{currentPolis.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playStoneTap();
                  onJumpToPolisCard(character.currentPolisId);
                }}
                className="min-h-[40px] w-full sm:w-auto px-3.5 py-1.5 rounded btn-basalt-stele text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Карточка полиса</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right 7 cols: Status, Office, Noble House / Party & Economic Summary */}
          <div className="lg:col-span-7 bg-[#1B232E] border border-[#263140] rounded p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#263140] pb-3.5">
              <span className="font-epigraphic text-xs uppercase tracking-wider text-[#C2B280]">
                Гражданский Статус, Возраст, Должность и Партия / Род
              </span>
              {!editingMeta ? (
                <button
                  type="button"
                  onClick={() => {
                    setAgeInput(character.age || 28);
                    setStatusInput(character.status);
                    setPositionInput(character.position);
                    setPartyInput(character.nobleHouseOrParty);
                    setEditingMeta(true);
                  }}
                  className="min-h-[36px] text-xs font-epigraphic text-[#E5C158] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Изменить титулы и возраст</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveMeta}
                  className="min-h-[38px] px-3 py-1.5 rounded btn-golden-stater text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Сохранить</span>
                </button>
              )}
            </div>

            {!editingMeta ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 my-1">
                <div className="wax-recess p-3.5 sm:p-4 space-y-1">
                  <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                    Возраст
                  </span>
                  <span className="block text-sm font-semibold text-[#F3E5AB] tabular-nums">
                    {character.age} лет
                  </span>
                </div>
                <div className="wax-recess p-3.5 sm:p-4 space-y-1">
                  <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                    Сословие / Статус
                  </span>
                  <span className="block text-sm font-semibold text-[#F3E5AB]">
                    {character.status}
                  </span>
                </div>
                <div className="wax-recess p-3.5 sm:p-4 space-y-1">
                  <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                    Должность / Занятие
                  </span>
                  <span className="block text-sm font-semibold text-[#E5C158]">
                    {character.position}
                  </span>
                </div>
                <div className="wax-recess p-3.5 sm:p-4 space-y-1">
                  <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                    Знатный Род / Партия
                  </span>
                  <span className="block text-xs sm:text-sm font-semibold text-[#E2DAC2] line-clamp-2">
                    {character.nobleHouseOrParty}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 my-1">
                <div className="wax-recess px-3 py-2.5">
                  <label className="block text-[10px] font-epigraphic text-[#C2B280] mb-1">
                    Возраст (лет)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={150}
                    value={ageInput}
                    onChange={(e) => setAgeInput(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-bold text-[#F3E5AB] tabular-nums focus:outline-none"
                  />
                </div>
                <div className="wax-recess px-3 py-2.5">
                  <label className="block text-[10px] font-epigraphic text-[#C2B280] mb-1">
                    Статус
                  </label>
                  <input
                    type="text"
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#F3E5AB] focus:outline-none"
                  />
                </div>
                <div className="wax-recess px-3 py-2.5">
                  <label className="block text-[10px] font-epigraphic text-[#C2B280] mb-1">
                    Должность
                  </label>
                  <input
                    type="text"
                    value={positionInput}
                    onChange={(e) => setPositionInput(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#E5C158] focus:outline-none"
                  />
                </div>
                <div className="wax-recess px-3 py-2.5">
                  <label className="block text-[10px] font-epigraphic text-[#C2B280] mb-1">
                    Род / Партия
                  </label>
                  <select
                    value={partyInput}
                    onChange={(e) => setPartyInput(e.target.value)}
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
            )}

            <div className="pt-4 border-t border-[#263140] grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 text-left">
              <div className="p-2.5 rounded bg-[#121820]/70 border border-[#263140]">
                <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                  Кошель (Наличные)
                </span>
                <span className="font-epigraphic text-base sm:text-lg font-bold text-[#E5C158] tabular-nums mt-0.5 block">
                  {character.drachmas.toLocaleString('ru-RU')} драхм
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#121820]/70 border border-[#263140]">
                <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                  Оценка имущества у купцов
                </span>
                <span className="font-epigraphic text-base sm:text-lg font-bold text-[#F3E5AB] tabular-nums mt-0.5 block">
                  {totalMarketValuation.toLocaleString('ru-RU')} драхм
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#121820]/70 border border-[#263140]">
                <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                  Общее состояние (Капитал)
                </span>
                <span className="font-epigraphic text-base sm:text-lg font-bold text-[#8EBDA2] tabular-nums mt-0.5 block">
                  {totalNetWorth.toLocaleString('ru-RU')} драхм
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Экономический Кодекс Понта 2.0: Ойкос, Рабы, Навык Технэ, Агора, Кабала (Орос) и Генератор Достатка */}
      <EconomyCodexPanel
        character={character}
        poleis={poleis}
        globalEconomy={globalEconomy}
        isGmMode={isGmMode}
        onUpdateCharacter={onUpdateCharacterMeta}
        onUpdateGlobalEconomy={(next) => onUpdateGlobalEconomy?.(next)}
        onRecordPolisChronicle={onRecordPolisChronicle}
      />

      {/* Biography (Appearance, Personality, Backstory) + Key Character Events & Turning Points */}
      <div className="stele-panel p-5 sm:p-8 space-y-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#263140] pb-5">
          <div>
            <p className="font-epigraphic text-xs uppercase tracking-widest text-[#C2B280]">
              Личный Свиток Героя · Жизнеописание и Развитие Характера
            </p>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F3E5AB] mt-1">
              Биография, Внешность и Ключевые События Персонажа
            </h3>
          </div>

          {!editingBio ? (
            <button
              type="button"
              onClick={() => {
                setAppearanceDraft(character.appearance);
                setPersonalityDraft(character.personality);
                setBackstoryDraft(character.backstory);
                setEditingBio(true);
              }}
              className="min-h-[42px] w-full sm:w-auto px-4 py-2 rounded btn-basalt-stele text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#E5C158] shrink-0" />
              <span>Редактировать биографию и внешность</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveBio}
                className="min-h-[42px] px-4 py-2 rounded btn-golden-stater text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Сохранить биографию</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingBio(false)}
                className="min-h-[42px] px-3.5 py-2 rounded btn-basalt-stele text-xs cursor-pointer"
              >
                Отмена
              </button>
            </div>
          )}
        </div>

        {/* 1. Biography Columns */}
        {!editingBio ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            <div className="p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-2">
              <span className="font-epigraphic text-xs uppercase text-[#E5C158] block">
                Внешность и Приметы
              </span>
              <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                {character.appearance}
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-2">
              <span className="font-epigraphic text-xs uppercase text-[#E5C158] block">
                Характер и Нрав
              </span>
              <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                {character.personality}
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-2">
              <span className="font-epigraphic text-xs uppercase text-[#E5C158] block">
                Предыстория (Биография до начала РП)
              </span>
              <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                {character.backstory}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            <div className="wax-recess p-3.5">
              <label className="block font-epigraphic text-xs uppercase text-[#E5C158] mb-1.5">
                Внешность
              </label>
              <textarea
                rows={4}
                value={appearanceDraft}
                onChange={(e) => setAppearanceDraft(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] focus:outline-none resize-none"
              />
            </div>
            <div className="wax-recess p-3.5">
              <label className="block font-epigraphic text-xs uppercase text-[#E5C158] mb-1.5">
                Характер
              </label>
              <textarea
                rows={4}
                value={personalityDraft}
                onChange={(e) => setPersonalityDraft(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] focus:outline-none resize-none"
              />
            </div>
            <div className="wax-recess p-3.5">
              <label className="block font-epigraphic text-xs uppercase text-[#E5C158] mb-1.5">
                Предыстория
              </label>
              <textarea
                rows={4}
                value={backstoryDraft}
                onChange={(e) => setBackstoryDraft(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* 2. Key Character Events & Turning Points (Right After Biography!) */}
        <div className="pt-7 mt-2 border-t border-[#263140] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-epigraphic uppercase text-[#E5C158]">
                <Award className="w-4 h-4 shrink-0" />
                <span>После Биографии · Летопись Изменений и Достижений в РП</span>
              </div>
              <h4 className="font-display text-lg sm:text-xl font-bold text-[#F3E5AB]">
                Ключевые События Персонажа ({(character.keyEvents || []).length})
              </h4>
              <p className="text-xs sm:text-sm text-[#C2B280] leading-relaxed">
                Сюда игрок вписывает, как и почему начал меняться его персонаж по ходу отыгрыша, а ГМ (или сам игрок) вносит участие и победы в ивентах (например, «Выиграл „Старые игры“ в Малой Олимпии»).
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playCoinClink();
                setShowAddKeyEvent(!showAddKeyEvent);
              }}
              className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded btn-golden-stater text-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>+ Добавить Ключевое Событие / Ивент</span>
            </button>
          </div>

          {showAddKeyEvent && (
            <form
              onSubmit={handleAddKeyEventSubmit}
              className="p-4 rounded bg-[#1B232E] border-2 border-[#D4AF37] space-y-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-base font-bold text-[#F3E5AB] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E5C158]" />
                  <span>Новая запись о ключевом событии или перемене в характере</span>
                </span>

                {/* Quick Example Presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-[#C2B280]">Быстрый пример:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setKeTitle('Выиграл «Старые игры» в Малой Олимпии');
                      setKeAddedBy('ГМ (Ивент / Событие РП)');
                      setKeDesc(
                        'Победил в состязаниях в священной роще Синопы и был увенчан лавровым венком перед лицом всего полиса.'
                      );
                      setKeChangeNote(
                        'Обрёл почёт среди граждан и уверенность в собственных силах.'
                      );
                    }}
                    className="px-2 py-0.5 rounded bg-[#263140] text-[#E5C158] border border-[#D4AF37]/50 cursor-pointer hover:bg-[#314054]"
                  >
                    «Старые игры» (Ивент ГМ)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKeTitle('Перелом взглядов после предательства компаньона');
                      setKeAddedBy('Игрок (Развитие персонажа)');
                      setKeDesc(
                        'Столкнувшись с обманом на торгах, персонаж перестал доверять устным обещаниям и начал действовать жёстче.'
                      );
                      setKeChangeNote(
                        'Стал расчётливее, замкнутее и требовательнее к союзникам.'
                      );
                    }}
                    className="px-2 py-0.5 rounded bg-[#263140] text-[#8EBDA2] border border-[#4E8765]/50 cursor-pointer hover:bg-[#314054]"
                  >
                    Перемена характера (Игрок)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                    Название события / ивента *
                  </label>
                  <div className="wax-recess px-3 py-2">
                    <input
                      type="text"
                      required
                      value={keTitle}
                      onChange={(e) => setKeTitle(e.target.value)}
                      placeholder="Напр.: Выиграл «Старые игры» / Перелом в судьбе"
                      className="w-full bg-transparent text-sm text-[#F3E5AB] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                    Дата или момент в РП
                  </label>
                  <div className="wax-recess px-3 py-2">
                    <input
                      type="text"
                      value={keDate}
                      onChange={(e) => setKeDate(e.target.value)}
                      placeholder="Напр.: 110 г. до н.э. · Лето"
                      className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                    Кто добавляет веху
                  </label>
                  <div className="wax-recess px-3 py-2">
                    <select
                      value={keAddedBy}
                      onChange={(e) =>
                        setKeAddedBy(
                          e.target.value as CharacterKeyEvent['addedBy']
                        )
                      }
                      className="w-full bg-[#0B0F14] text-sm text-[#E5C158] focus:outline-none cursor-pointer"
                    >
                      <option value="Игрок (Развитие персонажа)">
                        Игрок (Развитие персонажа)
                      </option>
                      <option value="ГМ (Ивент / Событие РП)">
                        ГМ (Ивент / Событие РП)
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                    Что произошло и почему начал меняться персонаж *
                  </label>
                  <div className="wax-recess p-2.5">
                    <textarea
                      rows={3}
                      required
                      value={keDesc}
                      onChange={(e) => setKeDesc(e.target.value)}
                      placeholder="Опишите событие, испытание или участие в ивенте..."
                      className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                    Как это изменило характер, статус или цели героя
                  </label>
                  <div className="wax-recess p-2.5">
                    <textarea
                      rows={3}
                      value={keChangeNote}
                      onChange={(e) => setKeChangeNote(e.target.value)}
                      placeholder="Напр.: Стал смелее выступать в Совете / Приобрёл славу в Синопе..."
                      className="w-full bg-transparent text-xs sm:text-sm text-[#8EBDA2] focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddKeyEvent(false)}
                  className="px-3.5 py-1.5 rounded btn-basalt-stele text-xs cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded btn-golden-stater text-xs cursor-pointer"
                >
                  Записать в Ключевые События
                </button>
              </div>
            </form>
          )}

          {/* List of Key Events */}
          {(!character.keyEvents || character.keyEvents.length === 0) ? (
            <div className="wax-recess p-5 text-center text-xs text-[#C2B280]">
              У персонажа пока нет записанных ключевых событий после биографии. Нажмите «+ Добавить Ключевое Событие / Ивент», чтобы зафиксировать развитие характера или победу на ивенте!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {character.keyEvents.map((ev, index) => {
                const isGmEvent = ev.addedBy.startsWith('ГМ');
                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded border space-y-2 ${
                      isGmEvent
                        ? 'bg-[#1B232E] border-[#D4AF37]/80 votive-glow'
                        : 'bg-[#1B232E] border-[#4E8765]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-epigraphic">
                        <span className="px-2 py-0.5 rounded bg-[#0B0F14] text-[#E5C158] border border-[#9A7B38]/50">
                          Веха #{index + 1} · {ev.dateLabel}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            isGmEvent
                              ? 'bg-[#D4AF37]/20 text-[#E5C158] border border-[#D4AF37]/50'
                              : 'bg-[#2E5A44]/40 text-[#8EBDA2] border border-[#4E8765]/50'
                          }`}
                        >
                          {ev.addedBy}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteKeyEvent(ev.id)}
                        className="text-[#C2B280] hover:text-[#F1A9B2] cursor-pointer p-1"
                        title="Удалить запись"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h5 className="font-display text-base sm:text-lg font-bold text-[#F3E5AB]">
                      {ev.title}
                    </h5>

                    <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                      {ev.description}
                    </p>

                    {ev.characterChangeNote && (
                      <div className="wax-recess p-2.5 text-xs text-[#8EBDA2]">
                        <strong className="font-epigraphic uppercase text-[10px] text-[#C2B280] block mb-0.5">
                          Как изменился персонаж / Итог:
                        </strong>
                        {ev.characterChangeNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Property & Inventory Ledger */}
      <div className="stele-panel p-5 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#263140] pb-5">
          <div>
            <p className="font-epigraphic text-xs uppercase tracking-widest text-[#C2B280]">
              Имущественная Ведомость · Происхождение Товаров и Оценка Торговцев
            </p>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F3E5AB] mt-1">
              Инвентарь, Мастерские, Материалы и Грузы ({character.inventory.length})
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playStoneTap();
              setShowAddCustom(!showAddCustom);
            }}
            className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded btn-golden-stater text-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <PackagePlus className="w-4 h-4 shrink-0" />
            <span>+ Внести Имущество / Постройку / Товар</span>
          </button>
        </div>

        {showAddCustom && (
          <form
            onSubmit={handleAddCustomSubmit}
            className="mt-4 p-4 rounded bg-[#1B232E] border border-[#D4AF37] space-y-3.5"
          >
            <h4 className="font-display text-base font-bold text-[#F3E5AB]">
              Запись нового имущества в профиль (приобретено в РП, построено или куплено)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2">
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Наименование имущества / ресурса / мастерской *
                </label>
                <div className="wax-recess px-3 py-2">
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Напр.: Кузнечная эргастерия / 20 амфор вина / Судно..."
                    className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Категория
                </label>
                <div className="wax-recess px-3 py-2">
                  <select
                    value={customCategory}
                    onChange={(e) =>
                      setCustomCategory(e.target.value as PropertyCategory)
                    }
                    className="w-full bg-[#0B0F14] text-sm text-[#E2DAC2] focus:outline-none"
                  >
                    <option value="Материалы и сырьё">Материалы и сырьё</option>
                    <option value="Караванный товар">Караванный товар</option>
                    <option value="Мастерская / Земля">Мастерская / Земля</option>
                    <option value="Корабль / Повозка">Корабль / Повозка</option>
                    <option value="Личное снаряжение">Личное снаряжение</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="w-20">
                  <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                    Кол-во
                  </label>
                  <div className="wax-recess px-2 py-2">
                    <input
                      type="number"
                      min={1}
                      value={customQty}
                      onChange={(e) => setCustomQty(Number(e.target.value))}
                      className="w-full bg-transparent text-sm text-[#E2DAC2] text-center focus:outline-none tabular-nums"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                    Ед. изм.
                  </label>
                  <div className="wax-recess px-2.5 py-2">
                    <input
                      type="text"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      placeholder="амфор / тюков"
                      className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Каким образом или у кого приобретено *
                </label>
                <div className="wax-recess px-3 py-2">
                  <input
                    type="text"
                    required
                    value={customMethod}
                    onChange={(e) => setCustomMethod(e.target.value)}
                    placeholder="Напр.: Куплено у купца в Синопе / Построено в РП"
                    className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Цена приобретения за 1 ед. (Драхм)
                </label>
                <div className="wax-recess px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={customBuyPrice}
                    onChange={(e) => setCustomBuyPrice(Number(e.target.value))}
                    className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Средняя рыночная цена у торговцев (за 1 ед.)
                </label>
                <div className="wax-recess px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    value={customMarketPrice}
                    onChange={(e) => setCustomMarketPrice(Number(e.target.value))}
                    className="w-full bg-transparent text-sm text-[#E5C158] font-bold focus:outline-none tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-[#C2B280] cursor-pointer">
                <input
                  type="checkbox"
                  checked={customDeductDrachmas}
                  onChange={(e) => setCustomDeductDrachmas(e.target.checked)}
                  className="accent-[#D4AF37]"
                />
                <span>
                  Списать стоимость приобретения ({customBuyPrice * customQty}{' '}
                  драхм) из текущего кошеля
                </span>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className="min-h-[38px] px-3 py-1.5 rounded btn-basalt-stele text-xs cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="min-h-[38px] px-4 py-1.5 rounded btn-golden-stater text-xs cursor-pointer"
                >
                  Записать в Инвентарь
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-3">
          {character.inventory.length === 0 ? (
            <div className="wax-recess p-6 text-center text-sm text-[#C2B280]">
              В инвентаре персонажа пока нет записей. Закупите местные ресурсы полиса ниже или внесите имущество!
            </div>
          ) : (
            character.inventory.map((item) => {
              const totalPurchase = item.purchasePriceDrachmas * item.quantity;
              const totalMarket = item.marketPriceDrachmas * item.quantity;
              const profitDiff = totalMarket - totalPurchase;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded bg-[#1B232E] border border-[#263140] hover:border-[#9A7B38] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-epigraphic text-[#C2B280]">
                      <span className="text-[#E5C158]">{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>Полис происхождения: {item.originPolis}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#F3E5AB] font-bold tabular-nums">
                        Количество: {item.quantity} {item.unit}
                      </span>
                    </div>

                    <h4 className="font-display text-lg font-bold text-[#F3E5AB]">
                      {item.name}
                    </h4>

                    <p className="text-xs sm:text-sm text-[#E2DAC2]">
                      <strong className="text-[#C2B280]">
                        Как / за сколько приобретено:
                      </strong>{' '}
                      {item.acquisitionMethod}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-[#C2B280] italic">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row lg:items-center gap-3 shrink-0">
                    <div className="wax-recess px-3.5 py-2.5 grid grid-cols-3 gap-3 text-xs tabular-nums">
                      <div>
                        <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                          Затрачено
                        </span>
                        <span className="font-bold text-[#E2DAC2]">
                          {item.purchasePriceDrachmas} др./ед.
                        </span>
                        <span className="block text-[11px] text-[#7C786A]">
                          Всего: {totalPurchase} др.
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                          Рынок купцов
                        </span>
                        <span className="font-bold text-[#E5C158]">
                          {item.marketPriceDrachmas} др./ед.
                        </span>
                        <span className="block text-[11px] text-[#C2B280]">
                          Всего: {totalMarket} др.
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                          Выгода / Маржа
                        </span>
                        <span
                          className={`font-bold ${
                            profitDiff >= 0 ? 'text-[#8EBDA2]' : 'text-[#F1A9B2]'
                          }`}
                        >
                          {profitDiff >= 0 ? `+${profitDiff}` : profitDiff} др.
                        </span>
                        <span className="block text-[11px] text-[#7C786A]">
                          При сбыте
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        disabled={isFrozenPending}
                        onClick={() => {
                          sound.playCoinClink();
                          onSellInventoryItem(
                            character.id,
                            item.id,
                            item.marketPriceDrachmas
                          );
                        }}
                        className="min-h-[42px] flex-1 sm:flex-initial px-3.5 py-2 rounded btn-basalt-stele text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Продать купцам по средней рыночной цене"
                      >
                        <Coins className="w-3.5 h-3.5 text-[#E5C158] shrink-0" />
                        <span>Сбыть (+{totalMarket} др.)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playStoneTap();
                          onDeleteInventoryItem(character.id, item.id);
                        }}
                        className="min-h-[42px] px-3 py-2 rounded bg-[#121820] hover:bg-[#8B2635] border border-[#263140] text-[#C2B280] hover:text-[#F3E5AB] cursor-pointer transition-colors"
                        title="Списать / удалить запись"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Split: 1) Local Polis Resources Market & 2) Caravan Trade Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-6 stele-panel p-5 sm:p-6 space-y-5">
          <div className="border-b border-[#263140] pb-4">
            <div className="flex items-center gap-2 text-xs font-epigraphic text-[#E5C158] uppercase">
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>Сырьевой Рынок Полиса: {currentPolis.name}</span>
            </div>
            <h3 className="font-display text-xl font-bold text-[#F3E5AB] mt-1">
              Закупка Городских Материалов для Производства и Караванов
            </h3>
            <p className="text-xs sm:text-sm text-[#C2B280] mt-1.5 leading-relaxed">
              Закупайте местное сырьё по внутренней цене города ({currentPolis.name}), чтобы строить мастерские или отправлять караваны в другие полисы Понта.
            </p>
          </div>

          <div className="space-y-4">
            {currentPolis.resources.map((res) => {
              const qty = buyQuantities[res.id] || 5;
              const totalCost = res.localBuyPrice * qty;
              const canAfford =
                character.drachmas >= totalCost && !isFrozenPending;

              return (
                <div
                  key={res.id}
                  className="p-4 rounded bg-[#1B232E] border border-[#263140] space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] font-epigraphic text-[#8EBDA2] block">
                        {res.category} · {res.abundance} в полисе{' '}
                        {currentPolis.name}
                      </span>
                      <h4 className="font-display text-base sm:text-lg font-bold text-[#F3E5AB] mt-0.5">
                        {res.name}
                      </h4>
                    </div>
                    <div className="sm:text-right tabular-nums shrink-0 pt-1 sm:pt-0">
                      <span className="block text-xs font-epigraphic text-[#E5C158] font-bold">
                        Местная цена: {res.localBuyPrice} др. / {res.unit}
                      </span>
                      <span className="block text-[11px] text-[#C2B280]">
                        Средняя у купцов Понта: {res.avgMarketPrice} др.
                      </span>
                    </div>
                  </div>

                  {/* Mobile-safe Purchase Row — Never Overflows Viewport */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#263140]/70">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#C2B280]">Партия:</span>
                      <div className="wax-recess px-2.5 py-1.5 w-20">
                        <input
                          type="number"
                          min={1}
                          max={200}
                          value={qty}
                          onChange={(e) =>
                            setBuyQuantities((prev) => ({
                              ...prev,
                              [res.id]: Math.max(
                                1,
                                Number(e.target.value) || 1
                              ),
                            }))
                          }
                          className="w-full bg-transparent text-xs text-center font-bold text-[#F3E5AB] focus:outline-none tabular-nums"
                        />
                      </div>
                      <span className="text-xs text-[#C2B280]">{res.unit}</span>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => {
                        sound.playCoinClink();
                        onBuyPolisResource(character.id, res, qty);
                      }}
                      className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded btn-golden-stater text-xs flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isFrozenPending
                        ? 'Доступно после одобрения ГМ'
                        : `Закупить за ${totalCost} драхм`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 6 cols: Caravan & Maritime Expedition Dispatcher */}
        <div className="lg:col-span-6 stele-panel p-5 sm:p-6 space-y-5">
          <div className="border-b border-[#263140] pb-3">
            <div className="flex items-center gap-2 text-xs font-epigraphic text-[#E5C158] uppercase">
              <Ship className="w-4 h-4" />
              <span>Караванная Контора Полуострова</span>
            </div>
            <h3 className="font-display text-xl font-bold text-[#F3E5AB] mt-0.5">
              Снарядить Торговый Караван в Другой Полис Понта
            </h3>
            <p className="text-xs text-[#C2B280] mt-1">
              Отправьте партию сырья или товаров из вашего инвентаря в Синопу, Никомедион, Опиу или Кратополь: целевые купцы платят на +20% выше средней рыночной цены, а событие фиксируется в хронике города!
            </p>
          </div>

          {character.inventory.length === 0 ? (
            <div className="wax-recess p-5 text-center text-xs text-[#C2B280]">
              Сначала закупите местные ресурсы полиса слева, чтобы погрузить их в караван.
            </div>
          ) : (
            <div className="space-y-3.5">
              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  1. Выберите груз из вашего инвентаря
                </label>
                <div className="wax-recess px-3 py-2">
                  <select
                    value={selectedCaravanItem?.id || ''}
                    onChange={(e) => setCaravanItemId(e.target.value)}
                    className="w-full bg-[#0B0F14] text-sm text-[#E2DAC2] focus:outline-none cursor-pointer"
                  >
                    {character.inventory.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.quantity} {i.unit} · закупка{' '}
                        {i.purchasePriceDrachmas} др.)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  2. Целевой полис назначения (Синопа, Никомедион, Опиу, Кратополь)
                </label>
                <div className="wax-recess px-3 py-2">
                  <select
                    value={destPolisId}
                    onChange={(e) => setDestPolisId(e.target.value)}
                    className="w-full bg-[#0B0F14] text-sm text-[#E2DAC2] focus:outline-none cursor-pointer"
                  >
                    {poleis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.region})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCaravanItem && (
                <div className="p-3.5 rounded bg-[#1B232E] border border-[#D4AF37]/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#C2B280]">Маршрут каравана:</span>
                    <span className="font-epigraphic font-bold text-[#F3E5AB]">
                      {currentPolis.name} → {destPolis.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between tabular-nums">
                    <span className="text-[#C2B280]">Цена покупки вами:</span>
                    <span className="text-[#E2DAC2]">
                      {selectedCaravanItem.purchasePriceDrachmas *
                        selectedCaravanItem.quantity}{' '}
                      драхм
                    </span>
                  </div>
                  <div className="flex items-center justify-between tabular-nums">
                    <span className="text-[#C2B280]">
                      Выплата купцов в полисе {destPolis.name}:
                    </span>
                    <span className="font-epigraphic text-sm font-bold text-[#E5C158]">
                      +{caravanTotalPayout} драхм ({caravanUnitPayout} др./ед.)
                    </span>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs text-[#E2DAC2] cursor-pointer">
                <input
                  type="checkbox"
                  checked={travelWithCaravan}
                  onChange={(e) => setTravelWithCaravan(e.target.checked)}
                  className="accent-[#D4AF37]"
                />
                <span>
                  Лично сопровождать караван (переместить персонажа в полис{' '}
                  <strong>{destPolis.name}</strong>)
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[#E5C158] cursor-pointer p-2.5 rounded bg-[#1B232E] border border-[#D4AF37]/50">
                <input
                  type="checkbox"
                  checked={hireCaravanGuards}
                  onChange={(e) => setHireCaravanGuards(e.target.checked)}
                  className="accent-[#D4AF37]"
                />
                <span>
                  Нанять вооружённый конвой наёмников (<strong>-45 драхм</strong>) — снижает риск нападения разбойников в пути с 20% до 0%
                </span>
              </label>

              <button
                type="button"
                disabled={!selectedCaravanItem || isFrozenPending}
                onClick={() => {
                  if (!selectedCaravanItem || isFrozenPending) return;
                  sound.playCoinClink();

                  const guardCost = hireCaravanGuards ? 45 : 0;
                  const banditRoll = !hireCaravanGuards && Math.random() < 0.2;
                  const code = generateOperationCode();

                  if (banditRoll) {
                    const lossSummary = `Караван с грузом «${selectedCaravanItem.name}» по пути из ${currentPolis.name} в ${destPolis.name} подвергся налёту разбойников (отсутствовал конвой охраны)! Груз разграблен.`;
                    const stamp = formatVkOperationStamp({
                      characterName: character.name,
                      polisName: destPolis.name,
                      locationHashtag: `#Тракт_${destPolis.name}`,
                      code,
                      summary: lossSummary,
                    });
                    onDeleteInventoryItem(character.id, selectedCaravanItem.id);
                    onUpdateGlobalEconomy?.({
                      ...globalEconomy,
                      operationLogs: [
                        {
                          id: `op-caravan-${Date.now()}`,
                          code,
                          characterId: character.id,
                          characterName: character.name,
                          polisName: destPolis.name,
                          locationHashtag: `#Тракт_${destPolis.name}`,
                          operationType: 'caravan',
                          summary: lossSummary,
                          drachmasDelta: 0,
                          createdAt: new Date().toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }),
                          status: 'active',
                        },
                        ...(globalEconomy.operationLogs || []),
                      ],
                    });
                    setCaravanFeedback(lossSummary);
                    setCaravanStampText(stamp);
                    return;
                  }

                  onSendCaravan(
                    character.id,
                    selectedCaravanItem.id,
                    destPolisId,
                    travelWithCaravan
                  );

                  if (guardCost > 0) {
                    onUpdateCharacterMeta(character.id, {
                      drachmas: Math.max(
                        0,
                        character.drachmas + caravanTotalPayout - guardCost
                      ),
                    });
                  }

                  const netPayout = caravanTotalPayout - guardCost;
                  const summary = `Торговый караван из ${currentPolis.name} в ${destPolis.name}: доставлен груз «${selectedCaravanItem.name}» (${selectedCaravanItem.quantity} ${selectedCaravanItem.unit}). Выручка: +${caravanTotalPayout} др.${guardCost > 0 ? `, конвой охраны: -${guardCost} др. (чистыми +${netPayout} др.)` : ''}`;
                  const stamp = formatVkOperationStamp({
                    characterName: character.name,
                    polisName: destPolis.name,
                    locationHashtag: `#Гавань_${destPolis.name}`,
                    code,
                    summary,
                  });

                  onUpdateGlobalEconomy?.({
                    ...globalEconomy,
                    treasuryDrachmas:
                      globalEconomy.treasuryDrachmas +
                      Math.round(caravanTotalPayout * 0.05),
                    operationLogs: [
                      {
                        id: `op-caravan-${Date.now()}`,
                        code,
                        characterId: character.id,
                        characterName: character.name,
                        polisName: destPolis.name,
                        locationHashtag: `#Гавань_${destPolis.name}`,
                        operationType: 'caravan',
                        summary,
                        drachmasDelta: netPayout,
                        createdAt: new Date().toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                        status: 'active',
                      },
                      ...(globalEconomy.operationLogs || []),
                    ],
                  });

                  setCaravanFeedback(
                    `Караван успешно прибыл в ${destPolis.name}! Чистая выручка: +${netPayout} драхм. Код операции: ${code}`
                  );
                  setCaravanStampText(stamp);
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded btn-golden-stater text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>
                  {isFrozenPending
                    ? 'Караваны доступны после одобрения анкеты ГМ'
                    : `Отправить Караван (+${
                        caravanTotalPayout - (hireCaravanGuards ? 45 : 0)
                      } др. чистыми)`}
                </span>
              </button>

              {caravanFeedback && (
                <div className="p-3 rounded bg-[#2E5A44]/30 border border-[#4E8765] text-xs text-[#A3D9B8] space-y-2">
                  <div>{caravanFeedback}</div>
                  {caravanStampText && (
                    <div className="p-2 rounded bg-[#0B0F14] border border-[#D4AF37]/50 flex items-center justify-between gap-2">
                      <pre className="text-[11px] font-mono text-[#F3E5AB] whitespace-pre-wrap">
                        {caravanStampText}
                      </pre>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(caravanStampText);
                          sound.playStoneTap();
                        }}
                        className="px-2.5 py-1 rounded btn-golden-stater text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Копировать в ВК</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal to Bury Personal Character from Profile */}
      {showBuryModal && (
        <div className="fixed inset-0 z-50 bg-[#0B0F14]/85 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="w-full max-w-lg stele-panel border-2 border-[#C0392B] p-5 space-y-4">
            <h3 className="font-display text-xl font-bold text-[#F1A9B2] flex items-center gap-2">
              <Skull className="w-5 h-5" />
              <span>Отправить «{character.name}» на Кладбище</span>
            </h3>
            <p className="text-xs text-[#E5C158]">
              Сразу после отправки на Кладбище откроется создание вашей новой личной анкеты!
            </p>
            <div className="space-y-3">
              <div className="wax-recess px-3 py-2">
                <input
                  type="text"
                  value={deathDate}
                  onChange={(e) => setDeathDate(e.target.value)}
                  placeholder="Дата гибели"
                  className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                />
              </div>
              <div className="wax-recess px-3 py-2">
                <input
                  type="text"
                  value={deathCause}
                  onChange={(e) => setDeathCause(e.target.value)}
                  placeholder="Причина смерти"
                  className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                />
              </div>
              <div className="wax-recess p-2.5">
                <textarea
                  rows={2}
                  value={epitaph}
                  onChange={(e) => setEpitaph(e.target.value)}
                  placeholder="Эпитафия"
                  className="w-full bg-transparent text-sm italic text-[#F3E5AB] focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBuryModal(false)}
                className="px-4 py-2 rounded btn-basalt-stele text-xs cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playWaxSeal();
                  setShowBuryModal(false);
                  onBuryMyCharacter(
                    character.id,
                    deathDate,
                    deathCause,
                    epitaph
                  );
                }}
                className="px-4 py-2 rounded btn-sacrificial text-xs cursor-pointer"
              >
                Отправить на Кладбище и Создать Нового
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

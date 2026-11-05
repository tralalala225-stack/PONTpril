import React, { useState, useEffect } from 'react';
import {
  CharacterEconomyProfile,
  CharacterInventoryItem,
  CharacterSheet,
  EconomyOperationLogEntry,
  GlobalEconomyState,
  PolisData,
} from '../types/rpTypes';
import { NATIONALITIES_DATA } from '../data/nationalitiesData';
import { PLAYER_FACTIONS_LIST } from '../data/initialRpData';
import {
  formatVkOperationStamp,
  getDefaultCharacterEconomy,
} from '../data/economyCodexData';
import { StarterWealthGeneratorBox } from './EconomyCodexPanel';
import {
  LaurelHeaderDivider,
  LaurelWreathBadge,
  MeanderDivider,
  WaxSealBadge,
} from './PonticPrimitives';
import { sound } from '../utils/sound';
import { uploadPortraitWithSupabaseFallback } from '../utils/supabaseSync';
import {
  Skull,
  UserCheck,
  UserPlus,
  Search,
  MapPin,
  Dices,
  RotateCcw,
  Eye,
  X,
  AlertTriangle,
  ImagePlus,
  Trash2,
  Edit3,
  Check,
  ScrollText,
  Copy,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface RegistryGraveyardViewProps {
  characters: CharacterSheet[];
  poleis: PolisData[];
  myLivingCharacter: CharacterSheet | undefined;
  isGmMode: boolean;
  globalEconomy?: GlobalEconomyState;
  onApproveOperationCode?: (opId: string, gmNote?: string) => void;
  onRevertOperationCode?: (
    entry: EconomyOperationLogEntry,
    gmNote?: string
  ) => void;
  prefillNewChar: {
    name: string;
    gender: 'Мужской' | 'Женский';
    age?: number;
    nationality: string;
    currentPolisId?: string;
    nobleHouseOrParty?: string;
    drachmas?: number;
    status?: string;
    position?: string;
    economy?: CharacterEconomyProfile;
    inventory?: CharacterInventoryItem[];
    appearance: string;
    personality: string;
    backstory: string;
    portraitUrl?: string;
  } | null;
  onClearPrefill: () => void;
  onOpenMyProfile: () => void;
  onCreateCharacter: (
    newChar: Omit<CharacterSheet, 'id' | 'createdAt'>,
    asPlayerOwned: boolean
  ) => void;
  onUpdateCharacterAge?: (charId: string, newAge: number) => void;
  onBuryCharacter: (
    charId: string,
    deathDate: string,
    deathCause: string,
    epitaph: string
  ) => void;
  onRestoreCharacter: (charId: string) => void;
  onDeleteCharacter: (charId: string) => void;
  onJumpToPolis: (polisId: string) => void;
}

export const RegistryGraveyardView: React.FC<RegistryGraveyardViewProps> = ({
  characters,
  poleis,
  myLivingCharacter,
  isGmMode,
  globalEconomy,
  onApproveOperationCode,
  onRevertOperationCode,
  prefillNewChar,
  onClearPrefill,
  onOpenMyProfile,
  onCreateCharacter,
  onUpdateCharacterAge,
  onBuryCharacter,
  onRestoreCharacter,
  onDeleteCharacter,
  onJumpToPolis,
}) => {
  const [subTab, setSubTab] = useState<
    'living' | 'graveyard' | 'economy_codes' | 'create'
  >(myLivingCharacter ? 'living' : 'create');
  const [searchQuery, setSearchQuery] = useState('');
  const [polisFilter, setPolisFilter] = useState<string>('all');
  const [selectedSheetId, setSelectedSheetId] = useState<string>(
    myLivingCharacter?.id || characters[0]?.id || ''
  );

  // Economy codes registry filters
  const [codeSearchQuery, setCodeSearchQuery] = useState('');
  const [codeStatusFilter, setCodeStatusFilter] = useState<
    'all' | 'active' | 'verified' | 'reverted'
  >('all');
  const [codeTypeFilter, setCodeTypeFilter] = useState<string>('all');
  const [copiedOpId, setCopiedOpId] = useState<string | null>(null);

  // Bury modal state
  const [buryTargetId, setBuryTargetId] = useState<string | null>(null);
  const [deathDate, setDeathDate] = useState('110 г. до н.э. · Осенняя навигация');
  const [deathCause, setDeathCause] = useState('Пал в бою при защите каравана');
  const [epitaph, setEpitaph] = useState(
    '«Достойно прожил среди эллинов Синопы и друзей, оставив по себе добрую память»'
  );

  // Inline age edit inside Registry Dossier
  const [editingDossierAgeId, setEditingDossierAgeId] = useState<string | null>(null);
  const [dossierAgeDraft, setDossierAgeDraft] = useState<number>(28);

  // New Character Form State
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'Мужской' | 'Женский'>('Мужской');
  const [newAge, setNewAge] = useState<number>(28);
  const [newNat, setNewNat] = useState<string>(NATIONALITIES_DATA[0].name);
  const [newPolisId, setNewPolisId] = useState<string>(poleis[0]?.id || 'sinope');
  const [newStatus, setNewStatus] = useState<string>('Полноправный гражданин среднего достатка (Зевгит)');
  const [newPosition, setNewPosition] = useState<string>(
    'Владелец малой мастерской и гоплит'
  );
  const [newParty, setNewParty] = useState<string>(PLAYER_FACTIONS_LIST[0]);
  const [newDrachmas, setNewDrachmas] = useState<number>(240);
  const [newAppearance, setNewAppearance] = useState<string>(
    NATIONALITIES_DATA[0].appearances[0]
  );
  const [newPersonality, setNewPersonality] = useState<string>(
    NATIONALITIES_DATA[0].temperaments[0]
  );
  const [newBackstory, setNewBackstory] = useState<string>(
    NATIONALITIES_DATA[0].backstories[0]
  );
  const [starterItemName, setStarterItemName] = useState<string>(
    'Клеймёные амфоры синопского оливкового масла (5 амф.)'
  );
  const [starterItemMethod, setStarterItemMethod] = useState<string>(
    'Случайный стартовый товар на сумму ~150 др. (Закуплено на давильнях Синопы)'
  );
  const [generatedEconomy, setGeneratedEconomy] =
    useState<CharacterEconomyProfile | null>(null);
  const [generatedInventory, setGeneratedInventory] = useState<
    CharacterInventoryItem[] | null
  >(null);
  const [newPortraitUrl, setNewPortraitUrl] = useState<string>('');

  const handleCreatePortraitFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadPortraitWithSupabaseFallback(file);
      sound.playStoneTap();
      setNewPortraitUrl(url);
    } catch {
      // Ignore upload error
    }
  };

  useEffect(() => {
    if (prefillNewChar) {
      setNewName(prefillNewChar.name);
      setNewGender(prefillNewChar.gender);
      if (typeof prefillNewChar.age === 'number' && prefillNewChar.age > 0) {
        setNewAge(prefillNewChar.age);
      }
      setNewNat(prefillNewChar.nationality);
      if (prefillNewChar.currentPolisId) {
        setNewPolisId(prefillNewChar.currentPolisId);
      }
      if (prefillNewChar.nobleHouseOrParty) {
        setNewParty(prefillNewChar.nobleHouseOrParty);
      }
      if (typeof prefillNewChar.drachmas === 'number') {
        setNewDrachmas(prefillNewChar.drachmas);
      }
      if (prefillNewChar.status) {
        setNewStatus(prefillNewChar.status);
      }
      if (prefillNewChar.position) {
        setNewPosition(prefillNewChar.position);
      }
      if (prefillNewChar.economy) {
        setGeneratedEconomy(prefillNewChar.economy);
      }
      if (prefillNewChar.inventory && prefillNewChar.inventory.length > 0) {
        setGeneratedInventory(prefillNewChar.inventory);
        setStarterItemName(
          prefillNewChar.inventory
            .map((i) => `${i.name} (${i.quantity} ${i.unit})`)
            .join('; ')
        );
        setStarterItemMethod(prefillNewChar.inventory[0].acquisitionMethod);
      }
      setNewAppearance(prefillNewChar.appearance);
      setNewPersonality(prefillNewChar.personality);
      setNewBackstory(prefillNewChar.backstory);
      if (prefillNewChar.portraitUrl) {
        setNewPortraitUrl(prefillNewChar.portraitUrl);
      }
      setSubTab('create');
      onClearPrefill();
    }
  }, [prefillNewChar, onClearPrefill]);

  const livingCharacters = characters.filter(
    (c) =>
      !c.isDeceased &&
      c.approvalStatus !== 'pending' &&
      c.approvalStatus !== 'rejected'
  );
  const pendingCount = characters.filter(
    (c) =>
      !c.isDeceased &&
      (c.approvalStatus === 'pending' || c.approvalStatus === 'rejected')
  ).length;
  const deceasedCharacters = characters.filter((c) => c.isDeceased);

  const displayedList = (
    subTab === 'graveyard' ? deceasedCharacters : livingCharacters
  ).filter((c) => {
    const matchesPolis =
      polisFilter === 'all' || c.currentPolisId === polisFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.nationality.toLowerCase().includes(q) ||
      c.position.toLowerCase().includes(q) ||
      c.nobleHouseOrParty.toLowerCase().includes(q);
    return matchesPolis && matchesQuery;
  });

  const inspectedChar =
    characters.find((c) => c.id === selectedSheetId) ||
    displayedList[0] ||
    livingCharacters[0];

  const getPolisName = (polisId: string) =>
    poleis.find((p) => p.id === polisId)?.name || polisId;

  const handleQuickNameRandom = () => {
    sound.playCoinClink();
    const natObj =
      NATIONALITIES_DATA.find((n) => n.name === newNat) || NATIONALITIES_DATA[0];
    const pool =
      newGender === 'Мужской' ? natObj.maleNames : natObj.femaleNames;
    const first = pool[Math.floor(Math.random() * pool.length)];
    const fam =
      natObj.familyOrPatronymics[
        Math.floor(Math.random() * natObj.familyOrPatronymics.length)
      ];
    setNewName(`${first}, ${fam}`);
    setNewAppearance(
      natObj.appearances[Math.floor(Math.random() * natObj.appearances.length)]
    );
    setNewPersonality(
      natObj.temperaments[
        Math.floor(Math.random() * natObj.temperaments.length)
      ]
    );
    setNewBackstory(
      natObj.backstories[Math.floor(Math.random() * natObj.backstories.length)]
    );
  };

  // Player can create their own personal character ONLY if they don't currently have a living one!
  // (Or in GM Mode they can add an extra sheet for another RP player/NPC)
  const canCreatePersonalSheet = !myLivingCharacter;

  const handleSubmitNewCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (!canCreatePersonalSheet && !isGmMode) return;

    sound.playWaxSeal();

    const finalInventory: CharacterInventoryItem[] =
      generatedInventory && generatedInventory.length > 0
        ? generatedInventory
        : starterItemName.trim()
          ? [
              {
                id: `inv-init-${Date.now()}`,
                name: starterItemName.trim(),
                category: 'Караванный товар',
                quantity: 1,
                unit: 'партия',
                acquisitionMethod:
                  starterItemMethod.trim() || 'Стартовое имущество анкеты',
                purchasePriceDrachmas: 250,
                marketPriceDrachmas: 320,
                originPolis: getPolisName(newPolisId),
              },
            ]
          : [];

    onCreateCharacter(
      {
        name: newName.trim(),
        portraitUrl: newPortraitUrl.trim() || undefined,
        gender: newGender,
        age: Number(newAge) || 25,
        nationality: newNat,
        currentPolisId: newPolisId,
        status: newStatus.trim() || 'Свободный житель',
        position: newPosition.trim() || 'Путешественник',
        nobleHouseOrParty: newParty,
        drachmas: Number(newDrachmas) ?? 500,
        appearance: newAppearance.trim(),
        personality: newPersonality.trim(),
        backstory: newBackstory.trim(),
        keyEvents: [],
        economy:
          generatedEconomy ||
          getDefaultCharacterEconomy({
            nationality: newNat,
            currentPolisId: newPolisId,
          }),
        isDeceased: false,
        inventory: finalInventory,
      },
      canCreatePersonalSheet
    );

    setNewName('');
    setNewPortraitUrl('');
    setSubTab('living');
  };

  const confirmBury = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buryTargetId) return;
    const wasMyCharacter = myLivingCharacter?.id === buryTargetId;
    sound.playWaxSeal();
    onBuryCharacter(buryTargetId, deathDate, deathCause, epitaph);
    setBuryTargetId(null);
    // If the player just buried their ONLY personal character, take them straight to Create New Character!
    if (wasMyCharacter) {
      setSubTab('create');
    } else {
      setSubTab('graveyard');
    }
  };

  return (
    <div className="space-y-5">
      {/* Banner if the player buried their character and needs to create a new one */}
      {!myLivingCharacter && (
        <div className="p-4 rounded bg-[#8B2635]/30 border-2 border-[#C4AD83] votive-glow flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LaurelWreathBadge size="md" tone="crimson">
              <Skull className="w-4 h-4 text-[#E6E0D0]" />
            </LaurelWreathBadge>
            <div>
              <span className="font-epigraphic text-xs uppercase text-[#C4AD83] font-bold">
                Ваша прежняя анкета покоится на Кладбище (в Некрополе)!
              </span>
              <p className="text-xs sm:text-sm text-[#E2DAC2]">
                По правилам ролевой у игрока может быть только 1 своя живая анкета. Создайте нового персонажа ниже, чтобы продолжить игру!
              </p>
            </div>
          </div>
          {subTab !== 'create' && (
            <button
              type="button"
              onClick={() => {
                sound.playCoinClink();
                setSubTab('create');
              }}
              className="min-h-[44px] px-5 py-2 rounded btn-golden-stater text-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              + Создать Новую Свою Анкету
            </button>
          )}
        </div>
      )}

      {/* Top Registry Header & Mode Switcher */}
      <div className="stele-panel p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#263140] pb-4">
          <div className="flex items-center gap-3.5">
            <LaurelWreathBadge size="md" tone="gold">
              <span>П</span>
            </LaurelWreathBadge>
            <div>
              <p className="font-epigraphic text-xs uppercase tracking-widest text-[#C2B280]">
                Гражданские Списки Полисов Понта и Некрополь
              </p>
              <h2 className="font-display text-2xl font-bold text-[#E6E0D0] mt-0.5">
                Реестр Анкет Игроков и Кладбище Персонажей
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setSubTab('living');
              }}
              className={`min-h-[42px] px-4 py-2 rounded text-xs font-epigraphic flex items-center gap-2 cursor-pointer border transition-colors ${
                subTab === 'living'
                  ? 'bg-[#263140] text-[#C4AD83] border-[#9E8658]'
                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:text-[#E6E0D0]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Живые Анкеты ({livingCharacters.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setSubTab('graveyard');
              }}
              className={`min-h-[42px] px-4 py-2 rounded text-xs font-epigraphic flex items-center gap-2 cursor-pointer border transition-colors ${
                subTab === 'graveyard'
                  ? 'bg-[#8B2635] text-[#E6E0D0] border-[#C0392B]'
                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:text-[#E6E0D0]'
              }`}
            >
              <Skull className="w-4 h-4" />
              <span>Кладбище / Некрополь ({deceasedCharacters.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setSubTab('economy_codes');
              }}
              className={`min-h-[42px] px-4 py-2 rounded text-xs font-epigraphic flex items-center gap-2 cursor-pointer border transition-colors ${
                subTab === 'economy_codes'
                  ? 'bg-[#263140] text-[#C4AD83] border-[#9E8658] votive-glow'
                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:text-[#E6E0D0]'
              }`}
            >
              <ScrollText className="w-4 h-4 text-[#C4AD83]" />
              <span>
                Коды Экономики PN ({(globalEconomy?.operationLogs || []).length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playCoinClink();
                setSubTab('create');
              }}
              className="min-h-[42px] px-4 py-2 rounded btn-golden-stater text-xs flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {canCreatePersonalSheet
                  ? '+ Создать Свою Анкету'
                  : isGmMode
                    ? '+ Добавить Анкету (ГМ)'
                    : 'Смена Своей Анкеты'}
              </span>
            </button>
          </div>
        </div>

        {/* SubTab: Economy Operation Codes Registry (PN-XXXXXXXX) */}
        {subTab === 'economy_codes' ? (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded bg-[#1B232E] border border-[#9E8658]/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-epigraphic text-xs uppercase text-[#C4AD83] font-bold flex items-center gap-1.5">
                  <ScrollText className="w-4 h-4 shrink-0" />
                  <span>
                    Общий Реестр Экономических Кодов «PN-XXXXXXXX» · Сверка с Беседами ВК
                  </span>
                </span>
                <p className="text-xs text-[#E2DAC2] leading-relaxed">
                  Все полученные игроками доходы (простая и продвинутая экономика), покупки на рынке, караваны, ковка и сделки получают уникальный восьмизначный код <code className="text-[#C4AD83]">PN-XXXXXXXX</code>. Администрация (в режиме ГМ) может одобрить код после проверки РП-поста в ВК или отклонить с автоматическим откатом драхм и товара.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs font-epigraphic">
                <span className="px-2.5 py-1 rounded bg-[#121820] border border-[#263140] text-[#C4AD83]">
                  Всего записей: {(globalEconomy?.operationLogs || []).length}
                </span>
                <span className="px-2.5 py-1 rounded bg-[#2E5A44]/30 border border-[#4E8765] text-[#8EBDA2]">
                  Одобрено ГМ:{' '}
                  {
                    (globalEconomy?.operationLogs || []).filter(
                      (op) => op.status === 'verified'
                    ).length
                  }
                </span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="wax-recess px-3 py-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#C2B280] shrink-0" />
                <input
                  type="text"
                  value={codeSearchQuery}
                  onChange={(e) => setCodeSearchQuery(e.target.value)}
                  placeholder="Поиск по коду PN-..., имени или описанию..."
                  className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] placeholder-[#7C786A] focus:outline-none"
                />
              </div>

              <div className="wax-recess px-3 py-2">
                <select
                  value={codeStatusFilter}
                  onChange={(e) =>
                    setCodeStatusFilter(
                      e.target.value as 'all' | 'active' | 'verified' | 'reverted'
                    )
                  }
                  className="w-full bg-[#0B0F14] text-xs sm:text-sm text-[#E2DAC2] focus:outline-none cursor-pointer"
                >
                  <option value="all">Все статусы проверки</option>
                  <option value="active">Ожидают сверки поста ВК</option>
                  <option value="verified">✓ Одобрено ГМом</option>
                  <option value="reverted">✕ Отклонено (Откат)</option>
                </select>
              </div>

              <div className="wax-recess px-3 py-2">
                <select
                  value={codeTypeFilter}
                  onChange={(e) => setCodeTypeFilter(e.target.value)}
                  className="w-full bg-[#0B0F14] text-xs sm:text-sm text-[#E2DAC2] focus:outline-none cursor-pointer"
                >
                  <option value="all">Все типы экономических операций</option>
                  <option value="simple_cycle">Простая экономика (Доход за цикл)</option>
                  <option value="rent">Рента Ойкоса и поместья</option>
                  <option value="manual_labor">Ручной труд (Аутургос)</option>
                  <option value="craft">Ремесло «Технэ» (Ковка)</option>
                  <option value="market_trade">Рынок полиса (Покупка / Продажа)</option>
                  <option value="caravan">Караваны между полисами</option>
                  <option value="contract">Подряды Агоры</option>
                  <option value="slave_market">Невольничий рынок</option>
                  <option value="horos_debt">Долговой камень Орос</option>
                  <option value="syndicate">Армянский Синдикат</option>
                  <option value="treasury_payout">Выплаты Казны</option>
                </select>
              </div>
            </div>

            {/* Operation Codes List */}
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {(() => {
                const logs = (globalEconomy?.operationLogs || []).filter((op) => {
                  const matchesStatus =
                    codeStatusFilter === 'all' || op.status === codeStatusFilter;
                  const matchesType =
                    codeTypeFilter === 'all' || op.operationType === codeTypeFilter;
                  const q = codeSearchQuery.trim().toLowerCase();
                  const matchesQuery =
                    !q ||
                    op.code.toLowerCase().includes(q) ||
                    op.characterName.toLowerCase().includes(q) ||
                    op.summary.toLowerCase().includes(q) ||
                    op.polisName.toLowerCase().includes(q);
                  return matchesStatus && matchesType && matchesQuery;
                });

                if (logs.length === 0) {
                  return (
                    <div className="wax-recess p-6 text-center text-sm text-[#C2B280]">
                      По выбранным фильтрам кодов экономических операций не найдено.
                    </div>
                  );
                }

                return logs.map((op) => (
                  <div
                    key={op.id}
                    className={`p-3.5 rounded border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                      op.status === 'reverted'
                        ? 'bg-[#2A151B]/50 border-[#C0392B] opacity-80'
                        : op.status === 'verified'
                          ? 'bg-[#121820] border-[#4E8765]'
                          : 'bg-[#121820] border-[#9E8658]/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span className="px-2 py-0.5 rounded bg-[#0B0F14] border border-[#9E8658] text-[#C4AD83] font-bold">
                          {op.code}
                        </span>
                        <span className="font-display font-bold text-[#E6E0D0] text-sm">
                          {op.characterName}
                        </span>
                        <span className="text-[#8EBDA2]">
                          {op.locationHashtag}
                        </span>
                        <span className="text-[#7C786A]">{op.createdAt}</span>
                        <span
                          className={`font-epigraphic font-bold tabular-nums ${
                            op.drachmasDelta >= 0
                              ? 'text-[#8EBDA2]'
                              : 'text-[#F1A9B2]'
                          }`}
                        >
                          {op.drachmasDelta >= 0
                            ? `+${op.drachmasDelta} др.`
                            : `${op.drachmasDelta} др.`}
                        </span>

                        {op.status === 'verified' && (
                          <span className="px-2 py-0.5 rounded bg-[#2E5A44]/40 border border-[#4E8765] text-[#8EBDA2] text-[10px] font-epigraphic">
                            ✓ Одобрено ГМ{op.approvedBy ? ` (${op.approvedBy})` : ''}
                          </span>
                        )}
                        {op.status === 'reverted' && (
                          <span className="px-2 py-0.5 rounded bg-[#8B2635] text-[#E6E0D0] text-[10px] font-epigraphic">
                            ✕ Отклонено / Откат{op.revertedBy ? ` (${op.revertedBy})` : ''}
                          </span>
                        )}
                        {op.status === 'active' && (
                          <span className="px-2 py-0.5 rounded bg-[#C4AD83]/15 border border-[#C4AD83]/50 text-[#C4AD83] text-[10px] font-epigraphic">
                            На проверке поста ВК
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#E2DAC2] leading-relaxed">
                        {op.summary}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const text = formatVkOperationStamp({
                            characterName: op.characterName,
                            polisName: op.polisName,
                            locationHashtag: op.locationHashtag,
                            code: op.code,
                            summary: op.summary,
                          });
                          navigator.clipboard?.writeText(text);
                          sound.playStoneTap();
                          setCopiedOpId(op.id);
                          setTimeout(() => setCopiedOpId(null), 2000);
                        }}
                        className="min-h-[36px] px-3 py-1.5 rounded bg-[#1B232E] border border-[#263140] text-xs font-epigraphic text-[#C2B280] hover:text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedOpId === op.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#8EBDA2]" />
                            <span className="text-[#8EBDA2]">Скопировано</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#C4AD83]" />
                            <span>Клеймо ВК</span>
                          </>
                        )}
                      </button>

                      {isGmMode && op.status !== 'reverted' && (
                        <>
                          {op.status !== 'verified' && onApproveOperationCode && (
                            <button
                              type="button"
                              onClick={() => {
                                sound.playOracleChime();
                                onApproveOperationCode(op.id);
                              }}
                              className="min-h-[36px] px-3 py-1.5 rounded bg-[#2E5A44]/50 hover:bg-[#2E5A44] border border-[#4E8765] text-xs font-epigraphic text-[#8EBDA2] hover:text-white flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Одобрить код</span>
                            </button>
                          )}

                          {onRevertOperationCode && (
                            <button
                              type="button"
                              onClick={() => {
                                sound.playWaxSeal();
                                onRevertOperationCode(op);
                              }}
                              className="min-h-[36px] px-3 py-1.5 rounded bg-[#2A151B] hover:bg-[#8B2635] border border-[#C0392B] text-xs font-epigraphic text-[#F1A9B2] hover:text-white flex items-center gap-1.5 cursor-pointer"
                              title="Отклонить код и откатить начисленные драхмы/товар у персонажа"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Отклонить (Откат)</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        ) : subTab === 'create' ? (
          <div className="mt-5 space-y-4">
            {/* Rule Guard if player already has 1 living personal sheet and is NOT in GM mode */}
            {!canCreatePersonalSheet && !isGmMode ? (
              <div className="p-5 rounded bg-[#1B232E] border-2 border-[#9E8658] space-y-4">
                <div className="flex items-start gap-3.5">
                  <AlertTriangle className="w-6 h-6 text-[#C4AD83] shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <h3 className="font-display text-xl font-bold text-[#E6E0D0]">
                      Своя живая анкета может быть только одна!
                    </h3>
                    <p className="text-sm text-[#E2DAC2] leading-relaxed">
                      Сейчас ваша единственная личная анкета —{' '}
                      <strong className="text-[#C4AD83]">
                        {myLivingCharacter?.name}
                      </strong>{' '}
                      (находится в полисе{' '}
                      <strong>
                        {getPolisName(myLivingCharacter?.currentPolisId || 'sinope')}
                      </strong>
                      ). По правилам ролевой, чтобы создать нового своего персонажа, необходимо сначала отправить текущего на <strong>Кладбище (Некрополь)</strong>.
                    </p>
                    <p className="text-xs text-[#C2B280]">
                      Примечание: если вы Гейм-Мастер и хотите внести в реестр анкету другого игрока или NPC, включите переключатель «Режим ГМ» в верхней панели.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (myLivingCharacter) {
                        sound.playStoneTap();
                        setBuryTargetId(myLivingCharacter.id);
                      }
                    }}
                    className="min-h-[44px] px-4 py-2 rounded btn-sacrificial text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Skull className="w-4 h-4" />
                    <span>
                      Отправить «{myLivingCharacter?.name}» на Кладбище и создать нового
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubTab('living')}
                    className="min-h-[44px] px-4 py-2 rounded btn-basalt-stele text-xs cursor-pointer"
                  >
                    Вернуться к списку анкет
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitNewCharacter} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#1B232E] p-3.5 rounded border border-[#9A7B38]/50">
                  <div className="flex items-center gap-3">
                    <LaurelWreathBadge size="sm" tone="gold">
                      <span>I</span>
                    </LaurelWreathBadge>
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#E6E0D0]">
                        {canCreatePersonalSheet
                          ? 'Создание Вашей Личной Анкеты в Понте'
                          : 'Добавление Анкеты Игрока / Жителя в Реестр (Режим ГМ)'}
                      </h3>
                      <p className="text-xs text-[#C2B280]">
                        Выберите народность и нажмите «Сгенерировать по канону» или впишите полностью свой образ.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickNameRandom}
                    className="min-h-[40px] px-3.5 py-2 rounded btn-basalt-stele text-xs flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Dices className="w-4 h-4 text-[#C4AD83]" />
                    <span>Сгенерировать Имя и Предысторию по Народу</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Народность персонажа
                    </label>
                    <div className="wax-recess px-3 py-2">
                      <select
                        value={newNat}
                        onChange={(e) => setNewNat(e.target.value)}
                        className="w-full bg-[#0B0F14] text-sm text-[#E2DAC2] focus:outline-none cursor-pointer"
                      >
                        {NATIONALITIES_DATA.map((n) => (
                          <option key={n.id} value={n.name}>
                            {n.name}
                          </option>
                        ))}
                        <option value="Смешанное / Иноземное происхождение">
                          Смешанное / Иноземное происхождение
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Пол и Возраст
                    </label>
                    <div className="flex gap-2">
                      <div className="wax-recess px-2.5 py-2 flex-1">
                        <select
                          value={newGender}
                          onChange={(e) =>
                            setNewGender(e.target.value as 'Мужской' | 'Женский')
                          }
                          className="w-full bg-[#0B0F14] text-sm text-[#E2DAC2] focus:outline-none cursor-pointer"
                        >
                          <option value="Мужской">Мужской</option>
                          <option value="Женский">Женский</option>
                        </select>
                      </div>
                      <div className="wax-recess px-2.5 py-2 w-24">
                        <input
                          type="number"
                          min={14}
                          max={90}
                          value={newAge}
                          onChange={(e) => setNewAge(Number(e.target.value))}
                          className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none text-center tabular-nums"
                          title="Возраст лет"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Начальный Полис Понта
                    </label>
                    <div className="wax-recess px-3 py-2">
                      <select
                        value={newPolisId}
                        onChange={(e) => setNewPolisId(e.target.value)}
                        className="w-full bg-[#0B0F14] text-sm text-[#E2DAC2] focus:outline-none cursor-pointer"
                      >
                        {poleis.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Стартовый кошель (Драхмы)
                    </label>
                    <div className="wax-recess px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={50000}
                        value={newDrachmas}
                        onChange={(e) => setNewDrachmas(Number(e.target.value))}
                        className="w-full bg-transparent text-sm text-[#C4AD83] font-bold focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Полное Имя и Прозвище / Род *
                    </label>
                    <div className="wax-recess px-3 py-2">
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Напр.: Гераклид, сын Посидея из Синопы"
                        className="w-full bg-transparent text-sm text-[#E2DAC2] placeholder-[#7C786A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Социальный Статус и Должность
                    </label>
                    <div className="wax-recess px-3 py-2">
                      <input
                        type="text"
                        value={newPosition}
                        onChange={(e) => setNewPosition(e.target.value)}
                        placeholder="Напр.: Навклер, Астином, Лохаг, Кузнец..."
                        className="w-full bg-transparent text-sm text-[#E2DAC2] placeholder-[#7C786A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Знатный Род или Партия
                    </label>
                    <div className="wax-recess px-3 py-2">
                      <select
                        value={newParty}
                        onChange={(e) => setNewParty(e.target.value)}
                        className="w-full bg-[#0B0F14] text-sm text-[#E2DAC2] focus:outline-none cursor-pointer"
                      >
                        {PLAYER_FACTIONS_LIST.map((pf) => (
                          <option key={pf} value={pf}>
                            {pf}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Внешность и Приметы
                    </label>
                    <div className="wax-recess p-2.5">
                      <textarea
                        rows={3}
                        value={newAppearance}
                        onChange={(e) => setNewAppearance(e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Характер и Убеждения
                    </label>
                    <div className="wax-recess p-2.5">
                      <textarea
                        rows={3}
                        value={newPersonality}
                        onChange={(e) => setNewPersonality(e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Предыстория (Кем является в РП)
                    </label>
                    <div className="wax-recess p-2.5">
                      <textarea
                        rows={3}
                        value={newBackstory}
                        onChange={(e) => setNewBackstory(e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Генератор и Конструктор Начального Достатка, Происхождения (Местный / Неместный — приплыл с рабами и т.д.) и Ойкоса */}
                <StarterWealthGeneratorBox
                  polisId={newPolisId}
                  polisName={getPolisName(newPolisId)}
                  nationality={newNat}
                  onApplyGeneratedPackage={(pkg) => {
                    setNewDrachmas(pkg.drachmas);
                    setNewStatus(pkg.status);
                    setNewPosition(pkg.position);
                    setGeneratedEconomy(pkg.economy);
                    setGeneratedInventory(pkg.inventory);
                    if (pkg.inventory[0]) {
                      setStarterItemName(
                        pkg.inventory.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join('; ')
                      );
                      setStarterItemMethod(pkg.inventory[0].acquisitionMethod);
                    }
                  }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div>
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Стартовое имущество в инвентарь (или сгенерированный пакет выше)
                    </label>
                    <div className="wax-recess px-3 py-2">
                      <input
                        type="text"
                        value={starterItemName}
                        onChange={(e) => {
                          setStarterItemName(e.target.value);
                          setGeneratedInventory(null);
                        }}
                        placeholder="Напр.: Мастерская в порту, 15 медимнов зерна или конь"
                        className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Как или за какую сумму приобретено
                    </label>
                    <div className="wax-recess px-3 py-2">
                      <input
                        type="text"
                        value={starterItemMethod}
                        onChange={(e) => setStarterItemMethod(e.target.value)}
                        placeholder="Напр.: Наследство семьи / Приплыл на корабле с рабами"
                        className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Portrait Attachment in Character Creation */}
                <div className="p-3.5 rounded bg-[#1B232E] border border-[#9A7B38]/60 flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                  {newPortraitUrl ? (
                    <div className="relative w-20 h-20 rounded border-2 border-[#9E8658] overflow-hidden shrink-0 bg-[#0B0F14]">
                      <img
                        src={newPortraitUrl}
                        alt="Портрет персонажа"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewPortraitUrl('')}
                        className="absolute top-1 right-1 p-1 rounded bg-[#0B0F14]/85 text-[#F1A9B2] hover:text-white cursor-pointer"
                        title="Убрать изображение"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded border border-dashed border-[#9A7B38] bg-[#0B0F14] flex flex-col items-center justify-center text-[#7C786A] shrink-0">
                      <ImagePlus className="w-6 h-6 text-[#C2B280]" />
                      <span className="text-[9px] font-epigraphic mt-1">
                        Портрет
                      </span>
                    </div>
                  )}

                  <div className="flex-1 w-full space-y-2">
                    <span className="block font-epigraphic text-xs uppercase text-[#C4AD83]">
                      Изображение / Портрет Персонажа (Отобразится в Профиле и Реестре):
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="px-3 py-1.5 rounded btn-basalt-stele text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                        <ImagePlus className="w-3.5 h-3.5 text-[#C4AD83]" />
                        <span>Загрузить с устройства</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCreatePortraitFileUpload}
                          className="hidden"
                        />
                      </label>
                      <div className="wax-recess px-3 py-1.5 flex-1">
                        <input
                          type="text"
                          value={newPortraitUrl}
                          onChange={(e) => setNewPortraitUrl(e.target.value)}
                          placeholder="Или вставьте ссылку (URL) на изображение..."
                          className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {generatedEconomy?.economyMode === 'advanced' && (
                  <div className="p-3 rounded bg-[#8B2635]/30 border border-[#C0392B] text-xs text-[#F1A9B2] flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Внимание:</strong> вы выбрали для анкеты <strong>Продвинутую экономику</strong>. После создания анкеты переключиться обратно на Простую экономику будет невозможно! Если вы хотите начать без сложной бухгалтерии, переключите генератор выше на «Простую экономику».
                    </span>
                  </div>
                )}

                <div className="p-3 rounded bg-[#1B232E] border border-[#9E8658]/60 text-xs text-[#E2DAC2]">
                  <strong className="text-[#C4AD83] font-epigraphic uppercase">
                    Порядок вступления в игру:
                  </strong>{' '}
                  после нажатия кнопки создания ваша анкета сначала попадает во вкладку{' '}
                  <strong className="text-[#E6E0D0]">«Проверка Анкет»</strong> (заморожена до одобрения одним ГМом), после чего автоматически появляется в общем Реестре и открывает доступ к рынку, караванам и голосованиям.
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSubTab('living')}
                    className="min-h-[44px] px-4 py-2 rounded btn-basalt-stele text-xs cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-6 py-2 rounded btn-golden-stater text-xs cursor-pointer"
                  >
                    {canCreatePersonalSheet
                      ? 'Отправить Анкету на Проверку ГМ'
                      : 'Внести Анкету в Реестр'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* SubTab: Living Registry or Graveyard */
          <div className="mt-4 space-y-4">
            {pendingCount > 0 && subTab === 'living' && (
              <div className="p-3 rounded bg-[#1B232E] border border-[#C4AD83]/60 text-xs text-[#E2DAC2] flex items-center justify-between gap-2">
                <span>
                  Сейчас во вкладке <strong className="text-[#C4AD83]">«Проверка Анкет»</strong> ожидают одобрения ГМа анкет: <strong>{pendingCount}</strong>. После одобрения они появятся в этом списке живых персонажей.
                </span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="wax-recess px-3 py-2 flex-1 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#C2B280] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по имени, народу, должности или роду..."
                  className="w-full bg-transparent text-sm text-[#E2DAC2] placeholder-[#7C786A] focus:outline-none"
                />
              </div>

              <div className="wax-recess px-3 py-2 sm:w-64">
                <select
                  value={polisFilter}
                  onChange={(e) => setPolisFilter(e.target.value)}
                  className="w-full bg-[#0B0F14] text-sm text-[#E2DAC2] focus:outline-none cursor-pointer"
                >
                  <option value="all">Все 4 полиса Понта</option>
                  {poleis.map((p) => (
                    <option key={p.id} value={p.id}>
                      Полис: {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left 5 cols: Character Cards List */}
              <div className="lg:col-span-5 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {displayedList.length === 0 ? (
                  <div className="wax-recess p-6 text-center text-sm text-[#C2B280]">
                    {subTab === 'graveyard'
                      ? 'В Некрополе по данному запросу нет павших анкет.'
                      : 'Анкеты не найдены.'}
                  </div>
                ) : (
                  displayedList.map((char) => {
                    const isSelected = inspectedChar?.id === char.id;
                    return (
                      <div
                        key={char.id}
                        onClick={() => {
                          sound.playStoneTap();
                          setSelectedSheetId(char.id);
                        }}
                        className={`p-3.5 rounded border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1B232E] border-[#9E8658] votive-glow'
                            : 'bg-[#121820] border-[#263140] hover:border-[#9A7B38]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-epigraphic text-[#C2B280]">
                              <span>{char.nationality.split(' ')[0]}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#C4AD83]">
                                {getPolisName(char.currentPolisId)}
                              </span>
                              {char.isPlayerOwned && !char.isDeceased ? (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-[#8EBDA2] font-bold">
                                    МОЯ АНКЕТА
                                    {char.ownerVkName || char.economy?.ownerVkName
                                      ? ` (${
                                          char.ownerVkName ||
                                          char.economy?.ownerVkName
                                        })`
                                      : ''}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-[#C4AD83]">
                                    Анкета:{' '}
                                    {char.ownerVkName ||
                                      char.economy?.ownerVkName ||
                                      (char.ownerVkId || char.economy?.ownerVkId
                                        ? `id${
                                            char.ownerVkId ||
                                            char.economy?.ownerVkId
                                          }`
                                        : 'Участник ВК')}
                                  </span>
                                </>
                              )}
                            </div>
                            <h3 className="font-display text-base font-bold text-[#E6E0D0] mt-0.5 truncate">
                              {char.name}
                            </h3>
                            <p className="text-xs text-[#C2B280] truncate">
                              {char.position}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {char.isDeceased ? (
                              <Skull className="w-4 h-4 text-[#F1A9B2]" />
                            ) : (
                              <span className="font-epigraphic text-xs font-bold text-[#C4AD83] tabular-nums">
                                {char.drachmas} др.
                              </span>
                            )}
                            {isGmMode && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sound.playStoneTap();
                                  onDeleteCharacter(char.id);
                                }}
                                className="p-1.5 rounded bg-[#2A151B] hover:bg-[#4A1C26] border border-[#8B2635] text-[#F1A9B2] hover:text-white cursor-pointer"
                                title="Удалить анкету навсегда (ГМ)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {char.isDeceased && char.epitaph && (
                          <p className="mt-2 text-xs italic text-[#F1A9B2]/90 line-clamp-2 border-t border-[#8B2635]/40 pt-1.5">
                            {char.epitaph}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right 7 cols: Full Character Sheet Dossier */}
              <div className="lg:col-span-7">
                {inspectedChar ? (
                  <div className="bg-[#1B232E] border border-[#9A7B38]/60 rounded p-4 sm:p-6 space-y-4">
                    <LaurelHeaderDivider
                      label={
                        inspectedChar.isPlayerOwned
                          ? `Личная Анкета Игрока${
                              inspectedChar.ownerVkName ||
                              inspectedChar.economy?.ownerVkName
                                ? ` · ${
                                    inspectedChar.ownerVkName ||
                                    inspectedChar.economy?.ownerVkName
                                  }`
                                : ''
                            }`
                          : `Анкета: ${
                              inspectedChar.ownerVkName ||
                              inspectedChar.economy?.ownerVkName ||
                              (inspectedChar.ownerVkId ||
                              inspectedChar.economy?.ownerVkId
                                ? `id${
                                    inspectedChar.ownerVkId ||
                                    inspectedChar.economy?.ownerVkId
                                  }`
                                : 'Участник ВК')
                            }`
                      }
                    />

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#263140] pb-3.5">
                      <div className="flex items-start gap-3.5">
                        {inspectedChar.portraitUrl ? (
                          <div className="w-20 h-20 rounded border-2 border-[#9E8658] overflow-hidden shrink-0 bg-[#0B0F14]">
                            <img
                              src={inspectedChar.portraitUrl}
                              alt={inspectedChar.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <LaurelWreathBadge
                            size="lg"
                            tone={
                              inspectedChar.isDeceased
                                ? 'crimson'
                                : inspectedChar.isPlayerOwned
                                  ? 'gold'
                                  : 'olive'
                            }
                          >
                            <span>{inspectedChar.name.charAt(0)}</span>
                          </LaurelWreathBadge>
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-epigraphic text-[#C2B280]">
                            <span>{inspectedChar.nationality}</span>
                            <span aria-hidden="true">·</span>
                            {(inspectedChar.isPlayerOwned || isGmMode) &&
                            onUpdateCharacterAge ? (
                              editingDossierAgeId === inspectedChar.id ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#121820] border border-[#C4AD83]">
                                  <span>{inspectedChar.gender},</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={150}
                                    value={dossierAgeDraft}
                                    onChange={(e) =>
                                      setDossierAgeDraft(Number(e.target.value))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const clamped = Math.max(
                                          1,
                                          Math.min(
                                            150,
                                            Math.round(
                                              Number(dossierAgeDraft) ||
                                                inspectedChar.age ||
                                                28
                                            )
                                          )
                                        );
                                        sound.playWaxSeal();
                                        onUpdateCharacterAge(
                                          inspectedChar.id,
                                          clamped
                                        );
                                        setEditingDossierAgeId(null);
                                      } else if (e.key === 'Escape') {
                                        setEditingDossierAgeId(null);
                                      }
                                    }}
                                    className="w-14 px-1.5 py-0.5 rounded bg-[#0B0F14] border border-[#9E8658] text-xs font-bold text-[#E6E0D0] text-center tabular-nums focus:outline-none"
                                    autoFocus
                                  />
                                  <span>лет</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const clamped = Math.max(
                                        1,
                                        Math.min(
                                          150,
                                          Math.round(
                                            Number(dossierAgeDraft) ||
                                              inspectedChar.age ||
                                              28
                                          )
                                        )
                                      );
                                      sound.playWaxSeal();
                                      onUpdateCharacterAge(
                                        inspectedChar.id,
                                        clamped
                                      );
                                      setEditingDossierAgeId(null);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-[#9E8658] text-[#0B0F14] font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>ОК</span>
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    sound.playStoneTap();
                                    setDossierAgeDraft(inspectedChar.age || 28);
                                    setEditingDossierAgeId(inspectedChar.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#121820] hover:bg-[#263140] border border-[#9E8658]/50 text-[#E6E0D0] cursor-pointer transition-colors"
                                  title="Нажмите, чтобы изменить возраст"
                                >
                                  <span>
                                    {inspectedChar.gender}, {inspectedChar.age} лет
                                  </span>
                                  <Edit3 className="w-3 h-3 text-[#C4AD83]" />
                                </button>
                              )
                            ) : (
                              <span>
                                {inspectedChar.gender}, {inspectedChar.age} лет
                              </span>
                            )}
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                inspectedChar.isDeceased
                                  ? 'text-[#F1A9B2]'
                                  : 'text-[#8EBDA2]'
                              }
                            >
                              {inspectedChar.isDeceased
                                ? 'ПОКОИТСЯ В НЕКРОПОЛЕ'
                                : inspectedChar.isPlayerOwned
                                  ? 'МОЯ ЖИВАЯ АНКЕТА'
                                  : 'АКТИВЕН В РП'}
                            </span>
                          </div>
                          <h3 className="font-display text-2xl font-bold text-[#E6E0D0] mt-1">
                            {inspectedChar.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-[#C4AD83] font-epigraphic mt-0.5">
                            {inspectedChar.status} · {inspectedChar.position}
                          </p>
                          <p className="text-xs text-[#C2B280] mt-0.5">
                            Род / Партия: {inspectedChar.nobleHouseOrParty}
                          </p>
                        </div>
                      </div>

                      <WaxSealBadge
                        sigil={inspectedChar.isDeceased ? 'STRATIOS' : 'EUPATOR'}
                        size="md"
                      />
                    </div>

                    {inspectedChar.isDeceased && (
                      <div className="p-3.5 rounded bg-[#8B2635]/25 border border-[#C0392B] space-y-1">
                        <p className="font-epigraphic text-xs uppercase text-[#F1A9B2] font-bold">
                          Надгробная Стела Некрополя · {inspectedChar.deathDate}
                        </p>
                        <p className="text-xs sm:text-sm text-[#E2DAC2]">
                          <strong>Обстоятельства гибели:</strong>{' '}
                          {inspectedChar.deathCause}
                        </p>
                        <p className="text-xs sm:text-sm italic text-[#E6E0D0] pt-1">
                          {inspectedChar.epitaph}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="wax-recess p-3 flex items-center justify-between">
                        <div>
                          <span className="block font-epigraphic text-[10px] uppercase text-[#C2B280]">
                            Текущий Полис в РП
                          </span>
                          <span className="font-display text-base font-bold text-[#E6E0D0]">
                            {getPolisName(inspectedChar.currentPolisId)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playStoneTap();
                            onJumpToPolis(inspectedChar.currentPolisId);
                          }}
                          className="px-2.5 py-1.5 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#9A7B38]/60 text-xs font-epigraphic text-[#C4AD83] flex items-center gap-1 cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>На карту</span>
                        </button>
                      </div>

                      <div className="wax-recess p-3 flex items-center justify-between">
                        <div>
                          <span className="block font-epigraphic text-[10px] uppercase text-[#C2B280]">
                            Наличная Казна и Имущество
                          </span>
                          <span className="font-epigraphic text-base font-bold text-[#C4AD83] tabular-nums">
                            {inspectedChar.drachmas.toLocaleString('ru-RU')} драхм
                          </span>
                        </div>
                        <span className="text-xs font-epigraphic text-[#C2B280]">
                          Активов: {inspectedChar.inventory.length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-epigraphic text-xs uppercase text-[#C2B280]">
                          Внешность и Облачение:
                        </span>
                        <p className="text-[#E2DAC2] mt-0.5 leading-relaxed">
                          {inspectedChar.appearance}
                        </p>
                      </div>
                      <div>
                        <span className="font-epigraphic text-xs uppercase text-[#C2B280]">
                          Характер и Нрав:
                        </span>
                        <p className="text-[#E2DAC2] mt-0.5 leading-relaxed">
                          {inspectedChar.personality}
                        </p>
                      </div>
                      <div>
                        <span className="font-epigraphic text-xs uppercase text-[#C2B280]">
                          Предыстория и Деяния:
                        </span>
                        <p className="text-[#E2DAC2] mt-0.5 leading-relaxed">
                          {inspectedChar.backstory}
                        </p>
                      </div>

                      {inspectedChar.keyEvents &&
                        inspectedChar.keyEvents.length > 0 && (
                          <div className="pt-2 border-t border-[#263140] space-y-2">
                            <span className="block font-epigraphic text-xs uppercase text-[#C4AD83]">
                              Ключевые События и Изменения Персонажа ({inspectedChar.keyEvents.length}):
                            </span>
                            <div className="space-y-2">
                              {inspectedChar.keyEvents.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="wax-recess p-2.5 space-y-1 text-xs"
                                >
                                  <div className="flex items-center justify-between text-[10px] font-epigraphic text-[#C2B280]">
                                    <span>{ev.dateLabel}</span>
                                    <span className="text-[#C4AD83]">
                                      {ev.addedBy}
                                    </span>
                                  </div>
                                  <p className="font-bold text-[#E6E0D0]">
                                    {ev.title}
                                  </p>
                                  <p className="text-[#E2DAC2]">
                                    {ev.description}
                                  </p>
                                  {ev.characterChangeNote && (
                                    <p className="text-[#8EBDA2] italic">
                                      Итог: {ev.characterChangeNote}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>

                    <MeanderDivider />

                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      {!inspectedChar.isDeceased ? (
                        <>
                          {inspectedChar.isPlayerOwned ? (
                            <button
                              type="button"
                              onClick={() => {
                                sound.playCoinClink();
                                onOpenMyProfile();
                              }}
                              className="min-h-[42px] px-4 py-2 rounded btn-golden-stater text-xs flex items-center gap-2 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Перейти в Мой Профиль и Экономику</span>
                            </button>
                          ) : (
                            <span className="text-xs font-epigraphic text-[#C4AD83] px-3 py-1.5 rounded bg-[#121820] border border-[#9E8658]/50">
                              Анкета:{' '}
                              <strong className="text-[#E6E0D0]">
                                {inspectedChar.ownerVkName ||
                                  inspectedChar.economy?.ownerVkName ||
                                  (inspectedChar.ownerVkId ||
                                  inspectedChar.economy?.ownerVkId
                                    ? `id${
                                        inspectedChar.ownerVkId ||
                                        inspectedChar.economy?.ownerVkId
                                      }`
                                    : 'Участник ВК')}
                              </strong>
                            </span>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            {(inspectedChar.isPlayerOwned || isGmMode) && (
                              <button
                                type="button"
                                onClick={() => {
                                  sound.playStoneTap();
                                  setBuryTargetId(inspectedChar.id);
                                }}
                                className="min-h-[42px] px-4 py-2 rounded btn-sacrificial text-xs flex items-center gap-2 cursor-pointer"
                              >
                                <Skull className="w-4 h-4" />
                                <span>
                                  {inspectedChar.isPlayerOwned
                                    ? 'Отправить Мою Анкету на Кладбище (и создать нового)'
                                    : 'Отправить на Кладбище (ГМ)'}
                                </span>
                              </button>
                            )}

                            {isGmMode && (
                              <button
                                type="button"
                                onClick={() => {
                                  sound.playStoneTap();
                                  onDeleteCharacter(inspectedChar.id);
                                }}
                                className="min-h-[42px] px-3.5 py-2 rounded bg-[#2A151B] hover:bg-[#4A1C26] border border-[#8B2635] text-xs font-epigraphic text-[#F1A9B2] hover:text-white flex items-center gap-1.5 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Удалить анкету (ГМ)</span>
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        isGmMode && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                sound.playOracleChime();
                                onRestoreCharacter(inspectedChar.id);
                                setSubTab('living');
                              }}
                              className="min-h-[42px] px-4 py-2 rounded btn-basalt-stele text-xs flex items-center gap-2 cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4 text-[#C4AD83]" />
                              <span>Вернуть Анкету в Живой Реестр (ГМ)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                sound.playStoneTap();
                                onDeleteCharacter(inspectedChar.id);
                              }}
                              className="min-h-[42px] px-4 py-2 rounded bg-[#2A151B] hover:bg-[#4A1C26] border border-[#8B2635] text-xs font-epigraphic text-[#F1A9B2] hover:text-white flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Удалить из Кладбища навсегда (ГМ)</span>
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Send Character to Graveyard (Necropolis) */}
      {buryTargetId && (
        <div className="fixed inset-0 z-50 bg-[#0B0F14]/85 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="w-full max-w-lg stele-panel border-2 border-[#C0392B] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#263140] pb-3">
              <div className="flex items-center gap-2 text-[#F1A9B2]">
                <Skull className="w-5 h-5" />
                <h3 className="font-display text-xl font-bold">
                  Перенос Анкеты на Кладбище (Некрополь)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBuryTargetId(null)}
                className="p-1 text-[#C2B280] hover:text-[#E6E0D0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {myLivingCharacter?.id === buryTargetId && (
              <div className="p-3 rounded bg-[#1B232E] border border-[#9E8658]/60 text-xs text-[#C4AD83]">
                После переноса вашей анкеты на Кладбище сразу откроется окно создания нового персонажа!
              </div>
            )}

            <form onSubmit={confirmBury} className="space-y-3.5">
              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Дата и событие гибели в РП
                </label>
                <div className="wax-recess px-3 py-2">
                  <input
                    type="text"
                    required
                    value={deathDate}
                    onChange={(e) => setDeathDate(e.target.value)}
                    className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Причина смерти (как погиб персонаж)
                </label>
                <div className="wax-recess px-3 py-2">
                  <input
                    type="text"
                    required
                    value={deathCause}
                    onChange={(e) => setDeathCause(e.target.value)}
                    className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Эпитафия на мраморной стеле
                </label>
                <div className="wax-recess p-2.5">
                  <textarea
                    rows={2}
                    required
                    value={epitaph}
                    onChange={(e) => setEpitaph(e.target.value)}
                    className="w-full bg-transparent text-sm italic text-[#E6E0D0] focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setBuryTargetId(null)}
                  className="min-h-[42px] px-4 py-2 rounded btn-basalt-stele text-xs cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded btn-sacrificial text-xs cursor-pointer"
                >
                  Увековечить на Кладбище и Создать Нового
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

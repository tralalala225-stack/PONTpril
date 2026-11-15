import React, { useState, useEffect } from 'react';
import {
  ActiveEconomicLawEffect,
  CharacterSheet,
  EconomicLawCategory,
  EconomicLawModifiers,
  ElectionCandidate,
  GameMemberRole,
  OfficeElection,
  PendingPoliticalProposal,
  PoliticalBill,
  PoliticalFactionEntry,
  PoliticalModerationNotice,
  PoliticalOffice,
  PoliticalProposalActionType,
  PoliticsState,
  SacredCalendarDayStatus,
  TechneSpecialty,
} from '../types/rpTypes';
import {
  INITIAL_POLITICS_STATE,
  PLAYER_FACTIONS_LIST,
} from '../data/initialRpData';
import {
  ECONOMIC_LAW_PRESETS,
  INITIAL_GLOBAL_ECONOMY,
} from '../data/economyCodexData';
import {
  LaurelHeaderDivider,
  LaurelWreathBadge,
  MeanderDivider,
  WaxSealBadge,
} from './PonticPrimitives';
import { sound } from '../utils/sound';
import {
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Crown,
  Edit3,
  FileText,
  Landmark,
  PlusCircle,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserCheck,
  Users,
  Vote,
  X,
  XCircle,
} from 'lucide-react';

interface PoliticsViewProps {
  politics: PoliticsState;
  livingApprovedCharacters?: CharacterSheet[];
  myApprovedCharacter: CharacterSheet | undefined;
  currentGmDisplayName?: string;
  currentUserRole?: GameMemberRole;
  userRole?: GameMemberRole;
  currentUserId: string | null;
  gameMembersList?: Array<{ userId: string; role: GameMemberRole }>;
  isGmMode: boolean;
  onUpdatePolitics: (next: PoliticsState) => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const PoliticsView: React.FC<PoliticsViewProps> = ({
  politics,
  livingApprovedCharacters = [],
  myApprovedCharacter,
  currentGmDisplayName,
  currentUserRole,
  userRole,
  currentUserId,
  gameMembersList = [],
  isGmMode,
  onUpdatePolitics,
}) => {
  const resolvedRole: GameMemberRole = currentUserRole || userRole || 'player';
  const offices = politics?.offices || [];
  const pendingProposals = politics?.pendingProposals || [];
  const bills = politics?.bills || [];
  const elections = politics?.elections || [];
  const factions: PoliticalFactionEntry[] =
    politics?.factions && politics.factions.length > 0
      ? politics.factions
      : INITIAL_POLITICS_STATE.factions || [];
  const activeModerationNotices = (politics?.moderationNotices || []).filter(
    (n) => n.expiresAtTimestamp > Date.now()
  );

  // Effective permission from Supabase game_members (creator keeps instant execution internally, displayed as GM)
  const isCreator = resolvedRole === 'creator';
  const isGm = resolvedRole === 'gm' || isGmMode;
  const canInitiateOrSignGmAction = isCreator || isGm;
  const effectiveSignerId =
    currentUserId || `local-gm-${isCreator ? 'creator' : 'session'}`;
  const effectiveSignerName =
    currentGmDisplayName ||
    myApprovedCharacter?.name ||
    (currentUserId ? `ГМ (${currentUserId.slice(0, 6)})` : 'Гейм-Мастер');

  // 7-Day Voting Cooldown, Vacation & Voting Freeze calculation for character sheets
  const charApprovedAt =
    myApprovedCharacter?.approvedAtTimestamp ||
    myApprovedCharacter?.economy?.approvedAtTimestamp;
  const votingCooldownRemainingMs =
    charApprovedAt && Date.now() - charApprovedAt < SEVEN_DAYS_MS
      ? SEVEN_DAYS_MS - (Date.now() - charApprovedAt)
      : 0;
  const isUnderVotingCooldown = votingCooldownRemainingMs > 0;
  const isMyVotingFrozen = Boolean(
    myApprovedCharacter?.economy?.votingRightsFrozen
  );
  const isMyCharacterOnVacation = Boolean(
    myApprovedCharacter?.economy?.vacationUntilTimestamp &&
      myApprovedCharacter.economy.vacationUntilTimestamp > Date.now()
  );
  const canMyCharacterCastVote =
    Boolean(myApprovedCharacter) &&
    !isUnderVotingCooldown &&
    !isMyVotingFrozen &&
    !isMyCharacterOnVacation;

  // Sacred Calendar of the Hieropoios & Session Hours (10:00–23:00 MSK)
  const sacredCalendar = politics?.sacredCalendar ||
    INITIAL_POLITICS_STATE.sacredCalendar || {
      status: 'ordinary' as SacredCalendarDayStatus,
      title: 'Обычный присутственный день (Сессии Гелиэи 10:00–23:00 МСК)',
      note: 'Плановые собрания, дебаты, выборы и суды Гелиэи проводятся в штатном порядке.',
      updatedBy: 'Коллегия Иеропоя',
      updatedAt: '110 г. до н.э.',
    };

  const canManageSacredCalendar =
    canInitiateOrSignGmAction ||
    /иеропой|архонт|председатель гелиэи/i.test(
      `${myApprovedCharacter?.position || ''} ${myApprovedCharacter?.status || ''}`
    );

  // Check if current Moscow time is within 10:00..23:00 MSK
  const mskHourNum = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      hour12: false,
    }).format(new Date())
  );
  const isMskSessionWindowOpen = mskHourNum >= 10 && mskHourNum < 23;
  const mskTimeFormatted = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  // Helper: Check Branch Incompatibility (Archeia vs Heliaia Leadership per Section 3 of Codex)
  const isArcheiaOfficeTitle = (title: string): boolean =>
    /архонт|симбул|полемарх|наварх|тамий|казначей/i.test(title);
  const isHeliaiaLeadershipTitle = (title: string): boolean =>
    /председатель гелиэи|заместитель председателя|президиум гелиэи/i.test(title);

  const getBranchIncompatibilityWarning = (
    holderNameRaw: string,
    targetOfficeTitle: string,
    excludeOfficeId?: string
  ): string | null => {
    const cleanName = holderNameRaw.trim().toLowerCase();
    if (
      !cleanName ||
      cleanName.includes('вакантно') ||
      cleanName.includes('ожидает')
    ) {
      return null;
    }
    const targetIsArcheia = isArcheiaOfficeTitle(targetOfficeTitle);
    const targetIsHeliaia = isHeliaiaLeadershipTitle(targetOfficeTitle);
    if (!targetIsArcheia && !targetIsHeliaia) return null;

    for (const off of offices) {
      if (excludeOfficeId && off.id === excludeOfficeId) continue;
      const existingHolder = (off.holderName || '').trim().toLowerCase();
      if (!existingHolder || existingHolder !== cleanName) continue;

      if (targetIsArcheia && isHeliaiaLeadershipTitle(off.title)) {
        return `⚠ Несовместимость ветвей власти (Раздел 3 Кодекса): «${holderNameRaw}» уже занимает руководящий пост в Гелиэе («${off.title}»). Одновременно входить в Архею и руководство Гелиэи запрещено!`;
      }
      if (targetIsHeliaia && isArcheiaOfficeTitle(off.title)) {
        return `⚠ Несовместимость ветвей власти (Раздел 3 Кодекса): «${holderNameRaw}» уже занимает пост в Архее («${off.title}»). Одновременно входить в Архею и руководство Гелиэи запрещено!`;
      }
    }
    return null;
  };

  // Helper: Check 14-day Candidacy Census for a character name
  const getCandidate14DayCensusWarning = (
    candidateNameRaw: string
  ): string | null => {
    const clean = candidateNameRaw.trim().toLowerCase();
    if (!clean) return null;
    const matchedChar = livingApprovedCharacters.find(
      (c) => c.name.trim().toLowerCase() === clean
    );
    if (!matchedChar) return null;
    const appTs =
      matchedChar.approvedAtTimestamp ||
      matchedChar.economy?.approvedAtTimestamp;
    if (!appTs) return null;
    const elapsed = Date.now() - appTs;
    if (elapsed < FOURTEEN_DAYS_MS) {
      const remMs = FOURTEEN_DAYS_MS - elapsed;
      return `⚠ Ценз 14 суток для кандидатов (Раздел 2 Кодекса): с момента одобрения анкеты «${matchedChar.name}» прошло менее 14 суток (осталось: ${formatCooldownRemaining(remMs)}). Требуется спецдопуск ГМа.`;
    }
    return null;
  };

  const formatCooldownRemaining = (ms: number): string => {
    const totalMinutes = Math.max(1, Math.ceil(ms / (60 * 1000)));
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    if (days >= 1) {
      return `${days} дн. ${hours} ч.`;
    }
    return `${hours} ч. ${minutes} мин.`;
  };

  const formatNoticeExpiryRemaining = (expiresAt: number): string => {
    const diff = Math.max(0, expiresAt - Date.now());
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.max(1, Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000)));
    return `${hours} ч. ${minutes} мин.`;
  };

  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTs(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const clampVotingHours = (raw: number): number => {
    const n = Math.round(Number(raw) || 24);
    return Math.max(1, Math.min(96, n));
  };

  const formatDurationHoursLabel = (hours: number): string => {
    const h = clampVotingHours(hours);
    const days = Math.floor(h / 24);
    const remHours = h % 24;
    if (days > 0 && remHours === 0) {
      const dayWord = days === 1 ? 'день' : 'дня';
      return `${h} ч. (${days} ${dayWord})`;
    }
    if (days > 0) {
      return `${h} ч. (${days} дн. ${remHours} ч.)`;
    }
    return `${h} ч.`;
  };

  const formatVotingRemaining = (endsAt: number): string => {
    const diff = Math.max(0, endsAt - nowTs);
    if (diff <= 0) return 'Время вышло';
    const totalMinutes = Math.max(1, Math.ceil(diff / (60 * 1000)));
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    if (days >= 1) {
      return `${days} дн. ${hours} ч. ${minutes} мин.`;
    }
    if (hours >= 1) {
      return `${hours} ч. ${minutes} мин.`;
    }
    return `${minutes} мин.`;
  };

  const VOTING_HOUR_PRESETS = [1, 3, 6, 12, 24, 48, 72, 96];

  const [copiedId, setCopiedId] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [expandedNoticeIds, setExpandedNoticeIds] = useState<string[]>([]);

  // Sacred Calendar Editor State
  const [showSacredCalendarEditor, setShowSacredCalendarEditor] =
    useState<boolean>(false);
  const [calStatusDraft, setCalStatusDraft] = useState<SacredCalendarDayStatus>(
    sacredCalendar.status
  );
  const [calTitleDraft, setCalTitleDraft] = useState<string>(
    sacredCalendar.title
  );
  const [calNoteDraft, setCalNoteDraft] = useState<string>(sacredCalendar.note);

  const handleSaveSacredCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSacredCalendar) return;
    sound.playOracleChime();
    onUpdatePolitics({
      ...politics,
      sacredCalendar: {
        status: calStatusDraft,
        title:
          calTitleDraft.trim() ||
          (calStatusDraft === 'sacred_feast'
            ? 'Священный праздник жреческого календаря'
            : calStatusDraft === 'emergency'
              ? 'Чрезвычайное положение Республики'
              : 'Обычный присутственный день (10:00–23:00 МСК)'),
        note:
          calNoteDraft.trim() ||
          (calStatusDraft === 'sacred_feast'
            ? 'По Разделу 4 Кодекса плановые собрания, суды и казни не назначаются на запретные праздничные дни жреческого календаря.'
            : 'Официальные сессии, дебаты и переклички проводятся с 10:00 до 23:00 МСК.'),
        updatedBy:
          myApprovedCharacter?.name || effectiveSignerName || 'Иеропой',
        updatedAt: new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    });
    setShowSacredCalendarEditor(false);
    setFeedbackBanner('Жреческий календарь Иеропоя и режим сессий обновлены.');
  };

  // Faction Management States
  const [showAddFaction, setShowAddFaction] = useState(false);
  const [newFactionName, setNewFactionName] = useState('');
  const [newFactionInfluence, setNewFactionInfluence] = useState<number>(15);
  const [newFactionLeader, setNewFactionLeader] = useState('Синопа · Совет партии');
  const [newFactionDesc, setNewFactionDesc] = useState('');

  // Office Edit / Add States
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
  const [editHolderName, setEditHolderName] = useState('');
  const [editFaction, setEditFaction] = useState('');
  const [editPolisName, setEditPolisName] = useState('');
  const [editPowers, setEditPowers] = useState('');
  const [editTerm, setEditTerm] = useState('');

  const [showAddOffice, setShowAddOffice] = useState(false);
  const [newOfficeTitle, setNewOfficeTitle] = useState('');
  const [newOfficeGreek, setNewOfficeGreek] = useState('');
  const [newOfficeHolder, setNewOfficeHolder] = useState('');
  const [newOfficeFaction, setNewOfficeFaction] = useState(
    PLAYER_FACTIONS_LIST[0]
  );
  const [newOfficePolis, setNewOfficePolis] = useState('Синопа');
  const [newOfficePowers, setNewOfficePowers] = useState('');

  // Bill Creation State
  const [showAddBill, setShowAddBill] = useState(false);
  const [billNumber, setBillNumber] = useState('Законопроект № 16');
  const [billTitle, setBillTitle] = useState('');
  const [billCategory, setBillCategory] = useState('Торговля и Пошлины');
  const [billSummary, setBillSummary] = useState('');
  const [billFullText, setBillFullText] = useState('');
  const [billDurationHours, setBillDurationHours] = useState<number>(24);
  const [editingBillTimerId, setEditingBillTimerId] = useState<string | null>(
    null
  );
  const [draftBillTimerHours, setDraftBillTimerHours] = useState<number>(24);

  // Bill Economic Effect (Buffs & Debuffs) Builder State
  const [billHasEconEffect, setBillHasEconEffect] = useState<boolean>(true);
  const [billEconPresetId, setBillEconPresetId] = useState<string>(
    ECONOMIC_LAW_PRESETS[0].id
  );
  const [billEconCategory, setBillEconCategory] =
    useState<EconomicLawCategory>(ECONOMIC_LAW_PRESETS[0].category);
  const [billBuffSummary, setBillBuffSummary] = useState<string>(
    ECONOMIC_LAW_PRESETS[0].buffSummary
  );
  const [billDebuffSummary, setBillDebuffSummary] = useState<string>(
    ECONOMIC_LAW_PRESETS[0].debuffSummary
  );
  const [billModSimpleIncome, setBillModSimpleIncome] = useState<number>(
    ECONOMIC_LAW_PRESETS[0].modifiers.simpleIncomeBonusDrachmas || 0
  );
  const [billModEstateRent, setBillModEstateRent] = useState<number>(
    ECONOMIC_LAW_PRESETS[0].modifiers.estateRentPercentDelta || 0
  );
  const [billModSlaveUpkeep, setBillModSlaveUpkeep] = useState<number>(
    ECONOMIC_LAW_PRESETS[0].modifiers.slaveUpkeepPercentDelta || 0
  );
  const [billModSlavePrice, setBillModSlavePrice] = useState<number>(
    ECONOMIC_LAW_PRESETS[0].modifiers.slavePricePercentDelta || 0
  );
  const [billModEisphora, setBillModEisphora] = useState<number>(
    ECONOMIC_LAW_PRESETS[0].modifiers.eisphoraTaxRateDelta || 0
  );
  const [billModDiobelia, setBillModDiobelia] = useState<number>(
    ECONOMIC_LAW_PRESETS[0].modifiers.diobeliaPayoutDelta || 0
  );
  const [billModCraftCost, setBillModCraftCost] = useState<number>(
    ECONOMIC_LAW_PRESETS[0].modifiers.craftCostPercentDelta || 0
  );
  const [billModMasterpiece, setBillModMasterpiece] = useState<number>(
    ECONOMIC_LAW_PRESETS[0].modifiers.craftMasterpieceChanceBonus || 0
  );
  const [billModCaravanProfit, setBillModCaravanProfit] = useState<number>(
    ECONOMIC_LAW_PRESETS[0].modifiers.caravanProfitPercentDelta || 0
  );
  const [billModBoostedTechne, setBillModBoostedTechne] = useState<string>(
    ECONOMIC_LAW_PRESETS[0].modifiers.boostedTechneSpecialty || ''
  );

  const handleSelectBillEconPreset = (presetId: string) => {
    sound.playStoneTap();
    setBillEconPresetId(presetId);
    const tpl = ECONOMIC_LAW_PRESETS.find((p) => p.id === presetId);
    if (!tpl) return;
    setBillEconCategory(tpl.category);
    setBillBuffSummary(tpl.buffSummary);
    setBillDebuffSummary(tpl.debuffSummary);
    setBillModSimpleIncome(tpl.modifiers.simpleIncomeBonusDrachmas || 0);
    setBillModEstateRent(tpl.modifiers.estateRentPercentDelta || 0);
    setBillModSlaveUpkeep(tpl.modifiers.slaveUpkeepPercentDelta || 0);
    setBillModSlavePrice(tpl.modifiers.slavePricePercentDelta || 0);
    setBillModEisphora(tpl.modifiers.eisphoraTaxRateDelta || 0);
    setBillModDiobelia(tpl.modifiers.diobeliaPayoutDelta || 0);
    setBillModCraftCost(tpl.modifiers.craftCostPercentDelta || 0);
    setBillModMasterpiece(tpl.modifiers.craftMasterpieceChanceBonus || 0);
    setBillModCaravanProfit(tpl.modifiers.caravanProfitPercentDelta || 0);
    setBillModBoostedTechne(tpl.modifiers.boostedTechneSpecialty || '');
    if (!billTitle.trim()) {
      setBillTitle(tpl.title);
    }
  };

  // Election Creation State
  const [showAddElection, setShowAddElection] = useState(false);
  const [electionOfficeTitle, setElectionOfficeTitle] = useState(
    'Стратег Синопы'
  );
  const [electionTerm, setElectionTerm] = useState('110 г. до н.э.');
  const [electionDesc, setElectionDesc] = useState('');
  const [electionDurationHours, setElectionDurationHours] =
    useState<number>(48);
  const [editingElectionTimerId, setEditingElectionTimerId] = useState<
    string | null
  >(null);
  const [draftElectionTimerHours, setDraftElectionTimerHours] =
    useState<number>(48);
  const [draftCandidates, setDraftCandidates] = useState<ElectionCandidate[]>(
    []
  );
  const [candName, setCandName] = useState('');
  const [candFaction, setCandFaction] = useState(PLAYER_FACTIONS_LIST[0]);
  const [candPolis, setCandPolis] = useState('Синопа');
  const [candAge, setCandAge] = useState(32);
  const [candSlogan, setCandSlogan] = useState('');
  const [candProgram, setCandProgram] = useState('');
  const [candBio, setCandBio] = useState('');
  const [candPromise, setCandPromise] = useState('');

  // Inspected Candidate Modal (to view candidate's program, bio, promises)
  const [inspectedCandidate, setInspectedCandidate] = useState<{
    candidate: ElectionCandidate;
    electionTitle: string;
    electionId: string;
  } | null>(null);

  /**
   * Executes a political payload immediately onto `PoliticsState` and records a 24-hour moderation notice
   * whenever an office, bill, or election is deleted or modified.
   */
  const applyPoliticalPayload = (
    base: PoliticsState,
    actionType: PoliticalProposalActionType,
    payload: Record<string, unknown>,
    gmNamesWhoApproved: string[] = [effectiveSignerName]
  ): PoliticsState => {
    const baseOffices = base.offices || [];
    const baseBills = base.bills || [];
    const baseElections = base.elections || [];
    const existingNotices = (base.moderationNotices || []).filter(
      (n) => n.expiresAtTimestamp > Date.now()
    );

    const buildNotice = (params: {
      targetCategory: 'office' | 'bill' | 'election';
      summaryTitle: string;
      archivedDetails: string;
    }): PoliticalModerationNotice => ({
      id: `mod-notice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      actionType,
      targetCategory: params.targetCategory,
      summaryTitle: params.summaryTitle,
      archivedDetails: params.archivedDetails,
      gmNames: gmNamesWhoApproved.length > 0 ? gmNamesWhoApproved : ['Коллегия ГМов'],
      createdAtTimestamp: Date.now(),
      expiresAtTimestamp: Date.now() + TWENTY_FOUR_HOURS_MS,
    });

    switch (actionType) {
      case 'update_office': {
        const officeId = String(payload.officeId || '');
        const updates = (payload.updates || {}) as Partial<PoliticalOffice>;
        const oldOffice = baseOffices.find((o) => o.id === officeId);
        const notice = oldOffice
          ? buildNotice({
              targetCategory: 'office',
              summaryTitle: `Изменена должность «${oldOffice.title}» (${oldOffice.polisName})`,
              archivedDetails: `Прежний магистрат: ${oldOffice.holderName} (${oldOffice.faction})\nНовое назначение: ${updates.holderName || oldOffice.holderName} (${updates.faction || oldOffice.faction})\nПолномочия (архив): ${oldOffice.powersAndDuties}`,
            })
          : null;
        return {
          ...base,
          offices: baseOffices.map((o) =>
            o.id === officeId ? { ...o, ...updates } : o
          ),
          moderationNotices: notice
            ? [notice, ...existingNotices]
            : existingNotices,
        };
      }
      case 'add_office': {
        const office = payload.office as PoliticalOffice;
        if (!office) return base;
        return {
          ...base,
          offices: [...baseOffices, office],
        };
      }
      case 'delete_office': {
        const officeId = String(payload.officeId || '');
        const deletedOffice = baseOffices.find((o) => o.id === officeId);
        const isProtected =
          deletedOffice &&
          (Boolean(deletedOffice.isSupremeFixed) ||
            deletedOffice.id === 'office-archon-pontida' ||
            deletedOffice.id === 'office-chairman-heliaia' ||
            deletedOffice.title.toLowerCase().includes('председатель гелиэи') ||
            deletedOffice.title.toLowerCase().includes('архонт'));
        if (isProtected) {
          return base;
        }
        const notice = deletedOffice
          ? buildNotice({
              targetCategory: 'office',
              summaryTitle: `Упразднена должность «${deletedOffice.title}» (${deletedOffice.polisName})`,
              archivedDetails: `Должность: ${deletedOffice.title} (${deletedOffice.greekTitle})\nПолис: ${deletedOffice.polisName}\nЗанимал на момент удаления: ${deletedOffice.holderName} (${deletedOffice.faction})\nПолномочия: ${deletedOffice.powersAndDuties}`,
            })
          : null;
        return {
          ...base,
          offices: baseOffices.filter(
            (o) =>
              o.id !== officeId ||
              o.isSupremeFixed ||
              o.id === 'office-archon-pontida' ||
              o.id === 'office-chairman-heliaia'
          ),
          moderationNotices: notice
            ? [notice, ...existingNotices]
            : existingNotices,
        };
      }
      case 'create_bill': {
        const rawBill = payload.bill as PoliticalBill;
        if (!rawBill) return base;
        const durationH = clampVotingHours(
          rawBill.votingDurationHours || 24
        );
        const startTs = Date.now();
        const billWithTimer: PoliticalBill = {
          ...rawBill,
          votingDurationHours: durationH,
          votingStartsAtTimestamp: startTs,
          votingEndsAtTimestamp: startTs + durationH * 60 * 60 * 1000,
        };
        return {
          ...base,
          bills: [billWithTimer, ...baseBills],
        };
      }
      case 'delete_bill': {
        const billId = String(payload.billId || '');
        const deletedBill = baseBills.find((b) => b.id === billId);
        const votesFor = (deletedBill?.votes || []).filter((v) => v.choice === 'for').length;
        const votesAgainst = (deletedBill?.votes || []).filter((v) => v.choice === 'against').length;
        const notice = deletedBill
          ? buildNotice({
              targetCategory: 'bill',
              summaryTitle: `Снят и удалён законопроект «${deletedBill.numberLabel}: ${deletedBill.title}»`,
              archivedDetails: `Категория: ${deletedBill.category} · Автор: ${deletedBill.authorName}\nГолоса на момент снятия: ЗА — ${votesFor}, ПРОТИВ — ${votesAgainst}\nПолный текст законопроекта:\n${deletedBill.fullText}`,
            })
          : null;
        const baseEcon = base.globalEconomy || INITIAL_GLOBAL_ECONOMY;
        const filteredEconLaws = (
          baseEcon.activeEconomicLaws ||
          INITIAL_GLOBAL_ECONOMY.activeEconomicLaws ||
          []
        ).filter((l) => l.sourceBillId !== billId);

        return {
          ...base,
          bills: baseBills.filter((b) => b.id !== billId),
          globalEconomy: {
            ...baseEcon,
            activeEconomicLaws: filteredEconLaws,
          },
          moderationNotices: notice
            ? [notice, ...existingNotices]
            : existingNotices,
        };
      }
      case 'conclude_bill': {
        const billId = String(payload.billId || '');
        const finalStatus = payload.status as 'passed' | 'rejected';
        const targetBill = baseBills.find((b) => b.id === billId);
        const notice = targetBill
          ? buildNotice({
              targetCategory: 'bill',
              summaryTitle: `Завершено голосование по закону «${targetBill.title}» (${finalStatus === 'passed' ? 'ПРИНЯТ И ВВЕДЁН В ДЕЙСТВИЕ' : 'ОТКЛОНЁН'})`,
              archivedDetails: `${targetBill.numberLabel}: ${targetBill.title}\nТекст: ${targetBill.fullText}${targetBill.economicEffect ? `\nЭкономический эффект: БАФФ: ${targetBill.economicEffect.buffSummary} | ДЕБАФФ: ${targetBill.economicEffect.debuffSummary}` : ''}`,
            })
          : null;

        const baseEcon = base.globalEconomy || INITIAL_GLOBAL_ECONOMY;
        const existingEconLaws =
          baseEcon.activeEconomicLaws !== undefined
            ? baseEcon.activeEconomicLaws
            : INITIAL_GLOBAL_ECONOMY.activeEconomicLaws || [];

        let nextEconLaws = existingEconLaws.filter(
          (l) => l.sourceBillId !== billId
        );

        if (finalStatus === 'passed' && targetBill?.economicEffect) {
          const enactedLaw: ActiveEconomicLawEffect = {
            id: `law-bill-${targetBill.id}`,
            title:
              targetBill.economicEffect.title ||
              `${targetBill.numberLabel}: ${targetBill.title}`,
            category: targetBill.economicEffect.category || 'fiscal_social',
            sourceLabel:
              targetBill.economicEffect.sourceLabel || targetBill.numberLabel,
            sourceBillId: targetBill.id,
            buffSummary: targetBill.economicEffect.buffSummary,
            debuffSummary: targetBill.economicEffect.debuffSummary,
            modifiers: targetBill.economicEffect.modifiers,
            enactedAt: '110 г. до н.э. · Принят голосованием Гелиэи',
            isActive: true,
          };
          nextEconLaws = [enactedLaw, ...nextEconLaws];
        }

        return {
          ...base,
          bills: baseBills.map((b) =>
            b.id === billId ? { ...b, status: finalStatus } : b
          ),
          globalEconomy: {
            ...baseEcon,
            activeEconomicLaws: nextEconLaws,
          },
          moderationNotices: notice
            ? [notice, ...existingNotices]
            : existingNotices,
        };
      }
      case 'create_election': {
        const rawElection = payload.election as OfficeElection;
        if (!rawElection) return base;
        const durationH = clampVotingHours(
          rawElection.votingDurationHours || 48
        );
        const startTs = Date.now();
        const electionWithTimer: OfficeElection = {
          ...rawElection,
          votingDurationHours: durationH,
          votingStartsAtTimestamp: startTs,
          votingEndsAtTimestamp: startTs + durationH * 60 * 60 * 1000,
        };
        return {
          ...base,
          elections: [electionWithTimer, ...baseElections],
        };
      }
      case 'delete_election': {
        const electionId = String(payload.electionId || '');
        const deletedElection = baseElections.find((el) => el.id === electionId);
        const candSummary = (deletedElection?.candidates || [])
          .map((c) => `• ${c.name} (${c.faction}) — ${c.slogan}`)
          .join('\n');
        const notice = deletedElection
          ? buildNotice({
              targetCategory: 'election',
              summaryTitle: `Удалено голосование на выборах «${deletedElection.officeTitle}»`,
              archivedDetails: `Выборная должность: ${deletedElection.officeTitle} (${deletedElection.termLabel})\nВсего подано голосов: ${(deletedElection.votes || []).length}\nОписание: ${deletedElection.description}\nКандидаты в бюллетене:\n${candSummary || 'Нет кандидатов'}`,
            })
          : null;
        return {
          ...base,
          elections: baseElections.filter((el) => el.id !== electionId),
          moderationNotices: notice
            ? [notice, ...existingNotices]
            : existingNotices,
        };
      }
      case 'conclude_election': {
        const electionId = String(payload.electionId || '');
        const targetEl = baseElections.find((el) => el.id === electionId);
        const notice = targetEl
          ? buildNotice({
              targetCategory: 'election',
              summaryTitle: `Завершены выборы на должность «${targetEl.officeTitle}»`,
              archivedDetails: `Выборы: ${targetEl.officeTitle} (${targetEl.termLabel}) · Всего голосов: ${(targetEl.votes || []).length}`,
            })
          : null;
        return {
          ...base,
          elections: baseElections.map((el) =>
            el.id === electionId ? { ...el, status: 'concluded' } : el
          ),
          moderationNotices: notice
            ? [notice, ...existingNotices]
            : existingNotices,
        };
      }
      default:
        return base;
    }
  };

  /**
   * Core 3-GM Governance Engine (internal creator fast-path preserved, UI displays only GM):
   */
  const submitGovernanceChange = (
    actionType: PoliticalProposalActionType,
    title: string,
    description: string,
    payload: Record<string, unknown>
  ) => {
    if (!canInitiateOrSignGmAction) return;

    if (isCreator) {
      sound.playOracleChime();
      const updated = applyPoliticalPayload(politics, actionType, payload, [
        effectiveSignerName,
      ]);
      onUpdatePolitics(updated);
      setFeedbackBanner(
        `Изменение «${title}» утверждено решением Коллегии ГМов и вступило в силу.`
      );
      return;
    }

    sound.playWaxSeal();
    const newProposal: PendingPoliticalProposal = {
      id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      actionType,
      title,
      description,
      payload,
      createdByUserId: effectiveSignerId,
      createdByGmName: effectiveSignerName,
      createdAt: new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      approvals: [
        {
          userId: effectiveSignerId,
          gmDisplayName: effectiveSignerName,
          role: 'gm',
          approvedAt: new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ],
    };

    onUpdatePolitics({
      ...politics,
      pendingProposals: [newProposal, ...pendingProposals],
    });
    setFeedbackBanner(
      `Создано предложение ГМа «${title}» (Подтверждено: 1 из 3 ГМов). Для вступления в силу нужны подписи ещё двух ГМов.`
    );
  };

  const handleCoSignProposal = (proposalId: string) => {
    if (!canInitiateOrSignGmAction) return;
    const target = pendingProposals.find((p) => p.id === proposalId);
    if (!target) return;

    if (isCreator) {
      sound.playOracleChime();
      const gmNames = Array.from(
        new Set([
          ...(target.approvals || []).map(
            (a) => a.gmDisplayName || `ГМ (${a.userId.slice(0, 6)})`
          ),
          effectiveSignerName,
        ])
      );
      const withRemainingProposals = {
        ...politics,
        pendingProposals: pendingProposals.filter(
          (p) => p.id !== proposalId
        ),
      };
      const applied = applyPoliticalPayload(
        withRemainingProposals,
        target.actionType,
        target.payload,
        gmNames
      );
      onUpdatePolitics(applied);
      setFeedbackBanner(
        `Предложение «${target.title}» утверждено Коллегией ГМов и вступило в силу!`
      );
      return;
    }

    // Check if this GM already signed
    const alreadySigned = (target.approvals || []).some(
      (a) => a.userId.toLowerCase() === effectiveSignerId.toLowerCase()
    );
    if (alreadySigned) {
      setFeedbackBanner(
        'Ваш аккаунт ГМа уже поставил печать под этим изменением. Требуются подписи других ГМов (всего 3 разных ГМа).'
      );
      return;
    }

    const updatedApprovals = [
      ...(target.approvals || []),
      {
        userId: effectiveSignerId,
        gmDisplayName: effectiveSignerName,
        role: 'gm' as GameMemberRole,
        approvedAt: new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ];

    if (updatedApprovals.length >= 3) {
      sound.playOracleChime();
      const gmNames = updatedApprovals.map(
        (a) => a.gmDisplayName || `ГМ (${a.userId.slice(0, 6)})`
      );
      const withoutProposal = {
        ...politics,
        pendingProposals: pendingProposals.filter(
          (p) => p.id !== proposalId
        ),
      };
      const applied = applyPoliticalPayload(
        withoutProposal,
        target.actionType,
        target.payload,
        gmNames
      );
      onUpdatePolitics(applied);
      setFeedbackBanner(
        `Собрано 3 из 3 подписей ГМов! Изменение «${target.title}» вступило в законную силу.`
      );
    } else {
      sound.playWaxSeal();
      onUpdatePolitics({
        ...politics,
        pendingProposals: pendingProposals.map((p) =>
          p.id === proposalId ? { ...p, approvals: updatedApprovals } : p
        ),
      });
      setFeedbackBanner(
        `Добавлена печать ГМа (${updatedApprovals.length}/3) для «${target.title}».`
      );
    }
  };

  const handleCancelProposal = (proposalId: string) => {
    sound.playStoneTap();
    onUpdatePolitics({
      ...politics,
      pendingProposals: pendingProposals.filter(
        (p) => p.id !== proposalId
      ),
    });
  };

  // Player Voting Handlers (Strictly 1 vote per approved living character, after 7-day cooldown, not frozen, not on vacation, while voting timer is open)
  const handleCastBillVote = (billId: string, choice: 'for' | 'against') => {
    if (!myApprovedCharacter || !canMyCharacterCastVote) return;
    const targetBill = bills.find((b) => b.id === billId);
    if (
      !targetBill ||
      targetBill.status !== 'active' ||
      (targetBill.votingEndsAtTimestamp &&
        Date.now() >= targetBill.votingEndsAtTimestamp)
    ) {
      return;
    }
    sound.playWaxSeal();
    const updatedBills = bills.map((bill) => {
      if (bill.id !== billId || bill.status !== 'active') return bill;
      const otherVotes = (bill.votes || []).filter(
        (v) => v.characterId !== myApprovedCharacter.id
      );
      return {
        ...bill,
        votes: [
          ...otherVotes,
          {
            characterId: myApprovedCharacter.id,
            characterName: myApprovedCharacter.name,
            choice,
            votedAt: '110 г. до н.э.',
          },
        ],
      };
    });
    onUpdatePolitics({
      ...politics,
      bills: updatedBills,
    });
  };

  const handleCastElectionVote = (
    electionId: string,
    candidateId: string | 'none_of_the_above'
  ) => {
    if (!myApprovedCharacter || !canMyCharacterCastVote) return;
    const targetElection = elections.find((el) => el.id === electionId);
    if (
      !targetElection ||
      targetElection.status !== 'active' ||
      (targetElection.votingEndsAtTimestamp &&
        Date.now() >= targetElection.votingEndsAtTimestamp)
    ) {
      return;
    }
    sound.playWaxSeal();
    const updatedElections = elections.map((el) => {
      if (el.id !== electionId || el.status !== 'active') return el;
      const otherVotes = (el.votes || []).filter(
        (v) => v.characterId !== myApprovedCharacter.id
      );
      return {
        ...el,
        votes: [
          ...otherVotes,
          {
            characterId: myApprovedCharacter.id,
            characterName: myApprovedCharacter.name,
            candidateId,
            votedAt: '110 г. до н.э.',
          },
        ],
      };
    });
    onUpdatePolitics({
      ...politics,
      elections: updatedElections,
    });
  };

  const handleSetBillVotingHours = (billId: string, hoursRaw: number) => {
    if (!canInitiateOrSignGmAction) return;
    const hours = clampVotingHours(hoursRaw);
    const startTs = Date.now();
    const endTs = startTs + hours * 60 * 60 * 1000;
    sound.playWaxSeal();
    onUpdatePolitics({
      ...politics,
      bills: bills.map((b) =>
        b.id === billId
          ? {
              ...b,
              status: 'active',
              votingDurationHours: hours,
              votingStartsAtTimestamp: startTs,
              votingEndsAtTimestamp: endTs,
            }
          : b
      ),
    });
    setEditingBillTimerId(null);
    setFeedbackBanner(
      `Время голосования по законопроекту установлено на ${formatDurationHoursLabel(
        hours
      )}.`
    );
  };

  const handleSetElectionVotingHours = (
    electionId: string,
    hoursRaw: number
  ) => {
    if (!canInitiateOrSignGmAction) return;
    const hours = clampVotingHours(hoursRaw);
    const startTs = Date.now();
    const endTs = startTs + hours * 60 * 60 * 1000;
    sound.playWaxSeal();
    onUpdatePolitics({
      ...politics,
      elections: elections.map((el) =>
        el.id === electionId
          ? {
              ...el,
              status: 'active',
              votingDurationHours: hours,
              votingStartsAtTimestamp: startTs,
              votingEndsAtTimestamp: endTs,
            }
          : el
      ),
    });
    setEditingElectionTimerId(null);
    setFeedbackBanner(
      `Время голосования на выборах установлено на ${formatDurationHoursLabel(
        hours
      )}.`
    );
  };

  // Faction Management Handlers (GM Mode)
  const handleUpdateFactionInfluence = (factionId: string, newPct: number) => {
    if (!canInitiateOrSignGmAction) return;
    const clamped = Math.max(0, Math.min(100, Math.round(newPct)));
    onUpdatePolitics({
      ...politics,
      factions: factions.map((f) =>
        f.id === factionId ? { ...f, influencePercent: clamped } : f
      ),
    });
  };

  const handleDeleteFaction = (factionId: string) => {
    if (!canInitiateOrSignGmAction) return;
    sound.playStoneTap();
    onUpdatePolitics({
      ...politics,
      factions: factions.filter((f) => f.id !== factionId),
    });
  };

  const handleAddFactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactionName.trim() || !canInitiateOrSignGmAction) return;
    sound.playWaxSeal();
    const created: PoliticalFactionEntry = {
      id: `fac-${Date.now()}`,
      name: newFactionName.trim(),
      influencePercent: Math.max(
        1,
        Math.min(100, Number(newFactionInfluence) || 15)
      ),
      description:
        newFactionDesc.trim() ||
        'Политическая фракция и объединение граждан Понта.',
      leaderOrBase: newFactionLeader.trim() || 'Синопа',
    };
    onUpdatePolitics({
      ...politics,
      factions: [...factions, created],
    });
    setNewFactionName('');
    setNewFactionDesc('');
    setShowAddFaction(false);
  };

  const isSupremeProtectedOffice = (o: PoliticalOffice) =>
    Boolean(o.isSupremeFixed) ||
    o.id === 'office-archon-pontida' ||
    o.id === 'office-chairman-heliaia' ||
    o.title.toLowerCase().includes('председатель гелиэи') ||
    o.title.toLowerCase().includes('архонт');

  const supremeOffices = offices.filter((o) => isSupremeProtectedOffice(o));
  const archonOffice = supremeOffices[0] || offices[0];
  const otherOffices = offices.filter((o) => !isSupremeProtectedOffice(o));

  const startEditOffice = (office: PoliticalOffice) => {
    sound.playStoneTap();
    setEditingOfficeId(office.id);
    setEditHolderName(office.holderName);
    setEditFaction(office.faction);
    setEditPolisName(office.polisName);
    setEditPowers(office.powersAndDuties);
    setEditTerm(office.termLabel);
  };

  const saveEditOffice = (office: PoliticalOffice) => {
    submitGovernanceChange(
      'update_office',
      `Изменение должности «${office.title}»`,
      `Назначение: ${editHolderName} (${editFaction}), полис: ${editPolisName}`,
      {
        officeId: office.id,
        updates: {
          holderName: editHolderName.trim() || office.holderName,
          faction: editFaction,
          polisName: editPolisName.trim() || office.polisName,
          powersAndDuties: editPowers.trim() || office.powersAndDuties,
          termLabel: editTerm.trim() || office.termLabel,
        },
      }
    );
    setEditingOfficeId(null);
  };

  const handleCreateNewOfficeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficeTitle.trim()) return;
    const createdOffice: PoliticalOffice = {
      id: `office-${Date.now()}`,
      title: newOfficeTitle.trim(),
      greekTitle:
        newOfficeGreek.trim() || newOfficeTitle.trim().toUpperCase(),
      isSupremeFixed: false,
      holderName: newOfficeHolder.trim() || 'Вакантно (ожидает выборов)',
      faction: newOfficeFaction,
      polisName: newOfficePolis.trim() || 'Синопа',
      powersAndDuties:
        newOfficePowers.trim() ||
        'Государственная магистратура союза полисов Понта.',
      termLabel: '110 г. до н.э.',
    };
    submitGovernanceChange(
      'add_office',
      `Учреждение новой должности «${createdOffice.title}»`,
      `Добавление магистратуры в полисе ${createdOffice.polisName} (занимает: ${createdOffice.holderName})`,
      { office: createdOffice }
    );
    setNewOfficeTitle('');
    setNewOfficeGreek('');
    setNewOfficeHolder('');
    setNewOfficePowers('');
    setShowAddOffice(false);
  };

  const handleCreateNewBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billTitle.trim() || !billFullText.trim()) return;
    const durationH = clampVotingHours(billDurationHours);
    const now = Date.now();

    const modifiers: EconomicLawModifiers = {
      simpleIncomeBonusDrachmas: Number(billModSimpleIncome) || 0,
      estateRentPercentDelta: Number(billModEstateRent) || 0,
      slaveUpkeepPercentDelta: Number(billModSlaveUpkeep) || 0,
      slavePricePercentDelta: Number(billModSlavePrice) || 0,
      eisphoraTaxRateDelta: Number(billModEisphora) || 0,
      diobeliaPayoutDelta: Number(billModDiobelia) || 0,
      craftCostPercentDelta: Number(billModCraftCost) || 0,
      craftMasterpieceChanceBonus: Number(billModMasterpiece) || 0,
      caravanProfitPercentDelta: Number(billModCaravanProfit) || 0,
      boostedTechneSpecialty: billModBoostedTechne
        ? (billModBoostedTechne as TechneSpecialty)
        : undefined,
    };

    const createdBill: PoliticalBill = {
      id: `bill-${now}`,
      numberLabel: billNumber.trim() || 'Законопроект Гелиэи',
      title: billTitle.trim(),
      category: billCategory.trim() || 'Общий закон',
      summary: billSummary.trim() || billTitle.trim(),
      fullText: billFullText.trim(),
      authorName:
        myApprovedCharacter?.name || archonOffice?.holderName || 'Президиум Гелиэи',
      status: 'active',
      createdAt: '110 г. до н.э.',
      votingDurationHours: durationH,
      votingStartsAtTimestamp: now,
      votingEndsAtTimestamp: now + durationH * 60 * 60 * 1000,
      economicEffect: billHasEconEffect
        ? {
            title: `${billNumber.trim() || 'Закон'}: ${billTitle.trim()}`,
            category: billEconCategory,
            sourceLabel: billNumber.trim() || 'Закон Гелиэи',
            buffSummary:
              billBuffSummary.trim() ||
              'Положительные экономические модификаторы закона',
            debuffSummary:
              billDebuffSummary.trim() ||
              'Балансирующие издержки и налоговая нагрузка закона',
            modifiers,
          }
        : undefined,
      votes: [],
    };
    submitGovernanceChange(
      'create_bill',
      `Вынесение законопроекта «${createdBill.title}» (${formatDurationHoursLabel(
        durationH
      )})`,
      `${createdBill.numberLabel}: ${
        createdBill.summary
      } · Время голосования: ${formatDurationHoursLabel(durationH)}`,
      { bill: createdBill }
    );
    setBillTitle('');
    setBillSummary('');
    setBillFullText('');
    setShowAddBill(false);
  };

  const handleAddDraftCandidate = () => {
    if (!candName.trim() || !candProgram.trim()) return;
    sound.playStoneTap();
    const nextCand: ElectionCandidate = {
      id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: candName.trim(),
      faction: candFaction,
      polisName: candPolis.trim() || 'Синопа',
      age: Number(candAge) || 30,
      slogan: candSlogan.trim() || 'За процветание полисов Понта!',
      program: candProgram.trim(),
      biographySummary:
        candBio.trim() || 'Уважаемый гражданин и участник собраний полиса.',
      keyPromises: candPromise.trim()
        ? candPromise
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean)
        : ['Защита интересов граждан и честная торговля'],
    };
    setDraftCandidates((prev) => [...prev, nextCand]);
    setCandName('');
    setCandSlogan('');
    setCandProgram('');
    setCandBio('');
    setCandPromise('');
  };

  const handleCreateElectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!electionOfficeTitle.trim() || draftCandidates.length === 0) return;
    const durationH = clampVotingHours(electionDurationHours);
    const now = Date.now();
    const createdElection: OfficeElection = {
      id: `election-${now}`,
      officeId: `office-${now}`,
      officeTitle: electionOfficeTitle.trim(),
      termLabel: electionTerm.trim() || '110 г. до н.э.',
      description:
        electionDesc.trim() ||
        'Всеобщее голосование граждан Понта. Доступен выбор любого кандидата или вариант «Ни один из кандидатов».',
      status: 'active',
      votingDurationHours: durationH,
      votingStartsAtTimestamp: now,
      votingEndsAtTimestamp: now + durationH * 60 * 60 * 1000,
      candidates: draftCandidates,
      votes: [],
    };
    submitGovernanceChange(
      'create_election',
      `Открытие выборов «${createdElection.officeTitle}» (${formatDurationHoursLabel(
        durationH
      )})`,
      `Кандидатов: ${
        draftCandidates.length
      } (+ «Ни один из кандидатов») · Время голосования: ${formatDurationHoursLabel(
        durationH
      )}`,
      { election: createdElection }
    );
    setDraftCandidates([]);
    setShowAddElection(false);
  };

  return (
    <div className="space-y-8">
      {/* Top Governance & Supabase game_members Role Header */}
      <div className="stele-panel p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#263140] pb-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <LaurelWreathBadge size="md" tone="gold">
              <Landmark className="w-5 h-5 text-[#C4AD83]" />
            </LaurelWreathBadge>
            <div>
              <p className="font-epigraphic text-xs uppercase tracking-widest text-[#C2B280]">
                Государственное Устройство Понтиды · Консенсус 3 ГМов
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#E6E0D0] mt-0.5">
                Политика Понта: Архонт, Партии, Магистратуры и Народные Голосования
              </h2>
            </div>
          </div>

          {/* Current User Role & Auth UUID in game_members */}
          <div className="p-3 rounded bg-[#1B232E] border border-[#9E8658]/60 flex flex-wrap items-center gap-3 text-xs">
            <div>
              <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                Ваша роль в `public.game_members`:
              </span>
              <span
                className={`font-epigraphic font-bold ${
                  isCreator || isGm ? 'text-[#8EBDA2]' : 'text-[#E6E0D0]'
                }`}
              >
                {isCreator || resolvedRole === 'gm'
                  ? 'ГЕЙМ-МАСТЕР (Требуется 3 подписи ГМов)'
                  : isGmMode
                    ? 'ГМ-РЕЖИМ (Требуется 3 подписи ГМов)'
                    : 'ГРАЖДАНИН / ИГРОК (Право голоса)'}
              </span>
            </div>

            {currentUserId && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(currentUserId);
                  sound.playStoneTap();
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }}
                className="px-2.5 py-1.5 rounded bg-[#121820] hover:bg-[#263140] border border-[#9A7B38]/60 text-[11px] font-mono text-[#C4AD83] flex items-center gap-1.5 cursor-pointer"
                title="Скопировать ваш user.id для таблицы public.game_members в Supabase"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>
                  {copiedId
                    ? 'UUID скопирован!'
                    : `Мой ID: ${currentUserId.slice(0, 8)}...`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Rule Explanation Strip */}
        <div className="p-3.5 rounded bg-[#1B232E] border border-[#263140] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5 text-[#E2DAC2]">
            <ShieldAlert className="w-4 h-4 text-[#C4AD83] shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Закон Трёх Печатей ГМа:</strong> Один ГМ не может единолично изменить должности или закрыть голосование — для вступления изменения в силу требуются подтверждения <strong>трёх человек с правом ГМа (`gm`)</strong>. При удалении или изменении должности, закона или выборов уведомление с архивом висит <strong>24 часа</strong>.
            </span>
          </div>
          {gameMembersList.length > 0 && (
            <span className="font-epigraphic text-[#8EBDA2] shrink-0">
              В `game_members`: {gameMembersList.length} участн.
            </span>
          )}
        </div>

        {/* Sacred Calendar of the Hieropoios & Session Hours Widget (Section 3 & 4 of Codex) */}
        <div
          className={`p-4 rounded border-2 space-y-3 ${
            sacredCalendar.status === 'sacred_feast'
              ? 'bg-[#2A151B]/75 border-[#C0392B]'
              : sacredCalendar.status === 'emergency'
                ? 'bg-[#261E14] border-[#C4AD83]'
                : 'bg-[#121820] border-[#4E8765]/80'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-epigraphic">
                <span
                  className={`px-2.5 py-0.5 rounded border font-bold uppercase ${
                    sacredCalendar.status === 'sacred_feast'
                      ? 'bg-[#8B2635]/50 border-[#F1A9B2] text-[#F1A9B2]'
                      : sacredCalendar.status === 'emergency'
                        ? 'bg-[#C4AD83]/20 border-[#C4AD83] text-[#C4AD83]'
                        : 'bg-[#2E5A44]/40 border-[#8EBDA2] text-[#8EBDA2]'
                  }`}
                >
                  {sacredCalendar.status === 'sacred_feast'
                    ? '⛩ Запретный Праздничный День (Суды и плановые сессии запрещены)'
                    : sacredCalendar.status === 'emergency'
                      ? '⚡ Чрезвычайное Положение (Экстренные сессии)'
                      : '🏛 Обычный Присутственный День Полиса'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded border font-mono text-[11px] ${
                    isMskSessionWindowOpen
                      ? 'bg-[#1B232E] border-[#4E8765] text-[#8EBDA2]'
                      : 'bg-[#1B232E] border-[#8B2635] text-[#F1A9B2]'
                  }`}
                >
                  Время МСК: {mskTimeFormatted} (
                  {isMskSessionWindowOpen
                    ? 'Сессионное окно 10:00–23:00 МСК открыто'
                    : 'Вне часов сессий 10:00–23:00 МСК'}
                  )
                </span>
              </div>
              <h4 className="font-display text-base sm:text-lg font-bold text-[#E6E0D0]">
                Жреческий Календарь Иеропоя: {sacredCalendar.title}
              </h4>
              <p className="text-xs text-[#E2DAC2] leading-relaxed">
                {sacredCalendar.note}{' '}
                <span className="text-[#C2B280]">
                  (Установил: {sacredCalendar.updatedBy} ·{' '}
                  {sacredCalendar.updatedAt})
                </span>
              </p>
            </div>

            {canManageSacredCalendar && (
              <button
                type="button"
                onClick={() => {
                  sound.playStoneTap();
                  setCalStatusDraft(sacredCalendar.status);
                  setCalTitleDraft(sacredCalendar.title);
                  setCalNoteDraft(sacredCalendar.note);
                  setShowSacredCalendarEditor(!showSacredCalendarEditor);
                }}
                className="min-h-[38px] px-3.5 py-1.5 rounded btn-basalt-stele text-xs font-epigraphic text-[#C4AD83] shrink-0 cursor-pointer"
              >
                {showSacredCalendarEditor
                  ? 'Скрыть календарь'
                  : '⛩ Изменить день календаря (Иеропой / ГМ)'}
              </button>
            )}
          </div>

          {showSacredCalendarEditor && canManageSacredCalendar && (
            <form
              onSubmit={handleSaveSacredCalendar}
              className="p-3.5 rounded bg-[#1B232E] border border-[#C4AD83] space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-1">
                    Статус дня по Календарю Иеропоя
                  </label>
                  <div className="wax-recess px-2.5 py-1.5">
                    <select
                      value={calStatusDraft}
                      onChange={(e) => {
                        const nextSt = e.target.value as SacredCalendarDayStatus;
                        setCalStatusDraft(nextSt);
                        if (nextSt === 'sacred_feast') {
                          setCalTitleDraft(
                            'Священный Праздник Зевса Стратия и Дионисий'
                          );
                          setCalNoteDraft(
                            'По Разделу 4 Кодекса плановые собрания, суды и казни не назначаются на запретные праздничные дни жреческого календаря, кроме чрезвычайных ситуаций.'
                          );
                        } else if (nextSt === 'emergency') {
                          setCalTitleDraft(
                            'Чрезвычайная сессия Гелиэи и Археи'
                          );
                          setCalNoteDraft(
                            'Объявлен режим чрезвычайной ситуации: допускаются внеплановые заседания.'
                          );
                        } else {
                          setCalTitleDraft(
                            'Обычный присутственный день (Сессии 10:00–23:00 МСК)'
                          );
                          setCalNoteDraft(
                            'Плановые собрания, дебаты, выборы и суды Гелиэи проводятся в штатном порядке.'
                          );
                        }
                      }}
                      className="w-full bg-[#0B0F14] text-xs font-bold text-[#C4AD83] focus:outline-none"
                    >
                      <option value="ordinary">
                        Обычный присутственный день (10:00–23:00 МСК)
                      </option>
                      <option value="sacred_feast">
                        Священный праздник (Запрет плановых сессий, судов и казней)
                      </option>
                      <option value="emergency">
                        Чрезвычайное положение (Экстренные заседания)
                      </option>
                    </select>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-1">
                    Название дня / праздника
                  </label>
                  <div className="wax-recess px-2.5 py-1.5">
                    <input
                      type="text"
                      value={calTitleDraft}
                      onChange={(e) => setCalTitleDraft(e.target.value)}
                      className="w-full bg-transparent text-xs text-[#E6E0D0] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="wax-recess px-2.5 py-1.5">
                <input
                  type="text"
                  value={calNoteDraft}
                  onChange={(e) => setCalNoteDraft(e.target.value)}
                  placeholder="Пояснение Иеропоя..."
                  className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSacredCalendarEditor(false)}
                  className="px-3 py-1.5 rounded btn-basalt-stele text-xs cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded btn-golden-stater text-xs cursor-pointer"
                >
                  Утвердить в Календаре Иеропоя
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 7-Day Voting Cooldown Notice Banner (if current player's character was approved < 7 days ago) */}
        {myApprovedCharacter && isUnderVotingCooldown && (
          <div className="p-4 rounded bg-[#1B232E] border-2 border-[#C4AD83] votive-glow flex items-start gap-3 text-xs">
            <Clock className="w-5 h-5 text-[#C4AD83] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-epigraphic uppercase text-[#C4AD83] font-bold">
                Ценз новых граждан (Ст. 8 Конституции · Защита от твинков на выборах)
              </span>
              <p className="text-[#E2DAC2] leading-relaxed">
                Ваша анкета «<strong>{myApprovedCharacter.name}</strong>» недавно прошла проверку ГМа. Новые анкеты не могут голосовать в Народном Собрании и на выборах первые <strong>7 дней</strong> после одобрения — до открытия вашего права голоса осталось:{' '}
                <strong className="text-[#C4AD83]">
                  {formatCooldownRemaining(votingCooldownRemainingMs)}
                </strong>
                .
              </p>
            </div>
          </div>
        )}

        {feedbackBanner && (
          <div className="p-3.5 rounded bg-[#2E5A44]/30 border border-[#4E8765] flex items-center justify-between gap-3 text-xs text-[#A3D9B8]">
            <span>{feedbackBanner}</span>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-[#C2B280] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 24-Hour Moderation Notices (when 3 GMs deleted or modified an office, bill, or election) */}
        {activeModerationNotices.length > 0 && (
          <div className="p-4 rounded bg-[#1B232E] border-2 border-[#C4AD83] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-epigraphic text-xs uppercase text-[#C4AD83] font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  Летопись Решений Трёх ГМов за последние 24 часа ({activeModerationNotices.length}):
                </span>
              </span>
              <span className="text-[11px] text-[#C2B280] font-epigraphic">
                Уведомление автоматически скрывается через 24 часа
              </span>
            </div>

            <div className="space-y-2.5">
              {activeModerationNotices.map((notice) => {
                const isExpanded = expandedNoticeIds.includes(notice.id);
                return (
                  <div
                    key={notice.id}
                    className="wax-recess p-3.5 border border-[#9E8658]/70 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-epigraphic">
                          <span className="text-[#C4AD83] font-bold">
                            Утвердили ГМы: {notice.gmNames.join(', ')}
                          </span>
                          <span aria-hidden="true" className="text-[#7C786A]">
                            ·
                          </span>
                          <span className="text-[#8EBDA2]">
                            Исчезнет через: {formatNoticeExpiryRemaining(notice.expiresAtTimestamp)}
                          </span>
                        </div>
                        <h4 className="font-display text-sm sm:text-base font-bold text-[#E6E0D0]">
                          {notice.summaryTitle}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playStoneTap();
                          setExpandedNoticeIds((prev) =>
                            prev.includes(notice.id)
                              ? prev.filter((id) => id !== notice.id)
                              : [...prev, notice.id]
                          );
                        }}
                        className="min-h-[34px] px-3 py-1 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#9E8658]/60 text-xs font-epigraphic text-[#C4AD83] flex items-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer"
                      >
                        <span>
                          {isExpanded
                            ? 'Свернуть подробности'
                            : 'Развернуть и посмотреть'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="p-3 rounded bg-[#0B0F14] border border-[#263140] text-xs text-[#E2DAC2] whitespace-pre-line leading-relaxed">
                        {notice.archivedDetails}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending 3-GM Proposals Queue */}
        {pendingProposals.length > 0 && (
          <div className="p-4 rounded bg-[#1B232E] border-2 border-[#9E8658] space-y-3 votive-glow">
            <div className="flex items-center justify-between gap-2">
              <span className="font-epigraphic text-xs uppercase text-[#C4AD83] font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>
                  Ожидают подтверждения трёх ГМов (
                  {pendingProposals.length}):
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingProposals.map((prop) => {
                const count = (prop.approvals || []).length;
                return (
                  <div
                    key={prop.id}
                    className="wax-recess p-3.5 border border-[#9A7B38]/70 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-epigraphic text-[#C4AD83] font-bold">
                          Печатей ГМа: {count} из 3 · Создано в {prop.createdAt}
                        </span>
                        <h4 className="font-display text-base font-bold text-[#E6E0D0] mt-0.5">
                          {prop.title}
                        </h4>
                        <p className="text-xs text-[#C2B280] mt-0.5">
                          {prop.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {[1, 2, 3].map((slot) => (
                          <span
                            key={slot}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-epigraphic font-bold border ${
                              slot <= count
                                ? 'bg-[#9E8658] text-[#0B0F14] border-[#FFF3B0]'
                                : 'bg-[#0B0F14] text-[#7C786A] border-[#263140]'
                            }`}
                          >
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-[#8EBDA2] font-mono">
                      Подписали ГМы:{' '}
                      {(prop.approvals || [])
                        .map(
                          (a) =>
                            a.gmDisplayName || `ГМ (${a.userId.slice(0, 8)})`
                        )
                        .join(', ')}
                    </div>

                    {canInitiateOrSignGmAction && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCoSignProposal(prop.id)}
                          className="min-h-[38px] px-3.5 py-1.5 rounded btn-golden-stater text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Подтвердить печатью ГМа ({count}/3)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancelProposal(prop.id)}
                          className="min-h-[38px] px-3 py-1.5 rounded btn-basalt-stele text-xs text-[#F1A9B2] cursor-pointer"
                        >
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SECTION 0: POLITICAL FACTIONS & INFLUENCE REGULATION                  */}
      {/* ===================================================================== */}
      <div className="stele-panel p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#263140] pb-4">
          <div>
            <p className="font-epigraphic text-xs uppercase tracking-widest text-[#C4AD83]">
              Политические Силы и Партии Понта
            </p>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#E6E0D0] mt-0.5">
              Партии, Роды и Распределение Влияния в Полисах ({factions.length})
            </h3>
          </div>

          {canInitiateOrSignGmAction && (
            <button
              type="button"
              onClick={() => {
                sound.playCoinClink();
                setShowAddFaction(!showAddFaction);
              }}
              className="min-h-[42px] px-4 py-2 rounded btn-golden-stater text-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Добавить Партию (ГМ)</span>
            </button>
          )}
        </div>

        {canInitiateOrSignGmAction && showAddFaction && (
          <form
            onSubmit={handleAddFactionSubmit}
            className="p-4 rounded bg-[#1B232E] border border-[#9E8658] space-y-3"
          >
            <h4 className="font-display text-base font-bold text-[#E6E0D0]">
              Добавить новую политическую партию или фракцию
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="wax-recess px-3 py-2">
                <input
                  type="text"
                  required
                  value={newFactionName}
                  onChange={(e) => setNewFactionName(e.target.value)}
                  placeholder="Название партии *"
                  className="w-full bg-transparent text-xs sm:text-sm text-[#E6E0D0] focus:outline-none"
                />
              </div>
              <div className="wax-recess px-3 py-2">
                <input
                  type="text"
                  value={newFactionLeader}
                  onChange={(e) => setNewFactionLeader(e.target.value)}
                  placeholder="Опора / Лидер (напр. Синопа · Агора)"
                  className="w-full bg-transparent text-xs sm:text-sm text-[#C4AD83] focus:outline-none"
                />
              </div>
              <div className="wax-recess px-3 py-2 flex items-center gap-2">
                <span className="text-xs font-epigraphic text-[#C2B280]">
                  Влияние (%):
                </span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newFactionInfluence}
                  onChange={(e) => setNewFactionInfluence(Number(e.target.value))}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-[#8EBDA2] focus:outline-none tabular-nums"
                />
              </div>
            </div>
            <div className="wax-recess p-2.5">
              <input
                type="text"
                value={newFactionDesc}
                onChange={(e) => setNewFactionDesc(e.target.value)}
                placeholder="Краткое описание идеологии и целей партии..."
                className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddFaction(false)}
                className="px-3.5 py-1.5 rounded btn-basalt-stele text-xs cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded btn-golden-stater text-xs cursor-pointer"
              >
                Сохранить партию
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {factions.map((fac) => (
            <div
              key={fac.id}
              className="p-4 rounded bg-[#1B232E] border border-[#263140] flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-epigraphic text-[#C4AD83]">
                      {fac.leaderOrBase}
                    </span>
                    <h4 className="font-display text-base sm:text-lg font-bold text-[#E6E0D0]">
                      {fac.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-0.5 rounded bg-[#121820] border border-[#9E8658]/60 font-epigraphic text-xs font-bold text-[#C4AD83] tabular-nums">
                      Влияние: {fac.influencePercent}%
                    </span>
                    {canInitiateOrSignGmAction && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFaction(fac.id)}
                        className="p-1.5 rounded bg-[#2A151B] hover:bg-[#4A1C26] border border-[#8B2635] text-[#F1A9B2] hover:text-white cursor-pointer"
                        title="Удалить партию (ГМ)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#C2B280] leading-relaxed">
                  {fac.description}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <div className="h-2 w-full rounded bg-[#0B0F14] overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, fac.influencePercent)}%` }}
                    className="h-full bg-[#9E8658] transition-all"
                  />
                </div>

                {canInitiateOrSignGmAction && (
                  <div className="flex items-center justify-between gap-3 pt-1 text-xs">
                    <span className="font-epigraphic text-[11px] text-[#C2B280]">
                      Регулировка влияния (ГМ):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateFactionInfluence(
                            fac.id,
                            fac.influencePercent - 5
                          )
                        }
                        className="px-2 py-0.5 rounded bg-[#121820] border border-[#263140] text-[#E6E0D0] hover:border-[#9E8658] cursor-pointer"
                      >
                        -5%
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={fac.influencePercent}
                        onChange={(e) =>
                          handleUpdateFactionInfluence(
                            fac.id,
                            Number(e.target.value)
                          )
                        }
                        className="w-24 accent-[#C4AD83] cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateFactionInfluence(
                            fac.id,
                            fac.influencePercent + 5
                          )
                        }
                        className="px-2 py-0.5 rounded bg-[#121820] border border-[#263140] text-[#E6E0D0] hover:border-[#9E8658] cursor-pointer"
                      >
                        +5%
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: SUPREME ARCHON OF PONTUS & OTHER STATE / POLIS OFFICES     */}
      {/* ===================================================================== */}
      <div className="stele-panel p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#263140] pb-4">
          <div>
            <p className="font-epigraphic text-xs uppercase tracking-widest text-[#C4AD83]">
              I. Высшие Магистратуры и Должности Понтийской Республики
            </p>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#E6E0D0] mt-0.5">
              Великий Архонт, Председатель Гелиэи и Государственные Должности ({offices.length})
            </h3>
          </div>

          {canInitiateOrSignGmAction && (
            <button
              type="button"
              onClick={() => {
                sound.playCoinClink();
                setShowAddOffice(!showAddOffice);
              }}
              className="min-h-[44px] px-4 py-2 rounded btn-golden-stater text-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Добавить Должность</span>
            </button>
          )}
        </div>

        {/* Add New Office Form */}
        {canInitiateOrSignGmAction && showAddOffice && (
          <form
            onSubmit={handleCreateNewOfficeSubmit}
            className="p-4 rounded bg-[#1B232E] border-2 border-[#9E8658] space-y-3.5"
          >
            <h4 className="font-display text-base font-bold text-[#E6E0D0]">
              Учредить новую должность в Понтиде (Коллегия ГМов)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Название должности *
                </label>
                <div className="wax-recess px-3 py-2">
                  <input
                    type="text"
                    required
                    value={newOfficeTitle}
                    onChange={(e) => setNewOfficeTitle(e.target.value)}
                    placeholder="Напр.: Казначей Священной Казны"
                    className="w-full bg-transparent text-sm text-[#E6E0D0] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Кто занимает должность
                </label>
                <div className="wax-recess px-3 py-2">
                  <input
                    type="text"
                    value={newOfficeHolder}
                    onChange={(e) => setNewOfficeHolder(e.target.value)}
                    placeholder="Имя персонажа или Вакантно"
                    className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Полис / Область
                </label>
                <div className="wax-recess px-3 py-2">
                  <input
                    type="text"
                    value={newOfficePolis}
                    onChange={(e) => setNewOfficePolis(e.target.value)}
                    placeholder="Синопа / Все полисы"
                    className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Партия или род
                </label>
                <div className="wax-recess px-3 py-2">
                  <select
                    value={newOfficeFaction}
                    onChange={(e) => setNewOfficeFaction(e.target.value)}
                    className="w-full bg-[#0B0F14] text-sm text-[#E2DAC2] focus:outline-none"
                  >
                    {PLAYER_FACTIONS_LIST.map((pf) => (
                      <option key={pf} value={pf}>
                        {pf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  Полномочия и обязанности
                </label>
                <div className="wax-recess px-3 py-2">
                  <input
                    type="text"
                    value={newOfficePowers}
                    onChange={(e) => setNewOfficePowers(e.target.value)}
                    placeholder="За что отвечает магистрат..."
                    className="w-full bg-transparent text-sm text-[#E2DAC2] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddOffice(false)}
                className="min-h-[40px] px-4 py-1.5 rounded btn-basalt-stele text-xs cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-5 py-1.5 rounded btn-golden-stater text-xs cursor-pointer"
              >
                Утвердить должность (ГМ)
              </button>
            </div>
          </form>
        )}

        {/* 1A. Supreme Fixed Cards: ВЕЛИКИЙ АРХОНТ & ПРЕДСЕДАТЕЛЬ ГЕЛИЭИ (Cannot be deleted!) */}
        {supremeOffices.length > 0 && (
          <div className="space-y-4">
            {supremeOffices.map((supOffice) => {
              const isChairmanHeliaia =
                supOffice.id === 'office-chairman-heliaia' ||
                supOffice.title.toLowerCase().includes('председатель гелиэи');
              return (
                <div
                  key={supOffice.id}
                  className="p-5 sm:p-6 rounded-lg bg-[#1B232E] border-2 border-[#9E8658] votive-glow space-y-4"
                >
                  <LaurelHeaderDivider
                    label={
                      isChairmanHeliaia
                        ? 'Неубираемая Высшая Должность Кодекса · ПРЕДСЕДАТЕЛЬ ГЕЛИЭИ'
                        : 'Верховная Неубираемая Магистратура Кодекса · ВЕЛИКИЙ АРХОНТ ПОНТА'
                    }
                  />

                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <LaurelWreathBadge size="lg" tone="gold">
                        <Crown className="w-6 h-6 text-[#C4AD83]" />
                      </LaurelWreathBadge>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-epigraphic text-[#C4AD83]">
                          <span>{supOffice.greekTitle}</span>
                          <span aria-hidden="true">·</span>
                          <span>{supOffice.polisName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#8EBDA2]">
                            Постоянная высшая должность по Кодексу (не подлежит удалению)
                          </span>
                        </div>

                        <h4 className="font-display text-2xl sm:text-3xl font-bold text-[#E6E0D0]">
                          {supOffice.title}:{' '}
                          <span className="text-[#C4AD83]">
                            {supOffice.holderName}
                          </span>
                        </h4>

                        <p className="text-xs sm:text-sm font-epigraphic text-[#C2B280]">
                          Партия / Фракция: {supOffice.faction} ·{' '}
                          {supOffice.termLabel}
                        </p>
                        <p className="text-sm text-[#E2DAC2] leading-relaxed pt-1 max-w-3xl">
                          {supOffice.powersAndDuties}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start">
                      {canInitiateOrSignGmAction &&
                        editingOfficeId !== supOffice.id && (
                          <button
                            type="button"
                            onClick={() => startEditOffice(supOffice)}
                            className="min-h-[42px] px-4 py-2 rounded btn-basalt-stele text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#C4AD83]" />
                            <span>
                              {isChairmanHeliaia
                                ? 'Изменить Председателя'
                                : 'Изменить Архонта'}
                            </span>
                          </button>
                        )}
                      <WaxSealBadge
                        sigil={isChairmanHeliaia ? 'EUXINUS' : 'EUPATOR'}
                        size="md"
                      />
                    </div>
                  </div>

                  {editingOfficeId === supOffice.id && (
                    <div className="p-4 rounded bg-[#121820] border border-[#9E8658] space-y-3 mt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-1">
                            Действующий магистрат ({supOffice.title})
                          </label>
                          <div className="wax-recess px-3 py-1.5">
                            <input
                              type="text"
                              value={editHolderName}
                              onChange={(e) => setEditHolderName(e.target.value)}
                              className="w-full bg-transparent text-xs text-[#E6E0D0] focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-1">
                            Партия / Фракция
                          </label>
                          <div className="wax-recess px-3 py-1.5">
                            <select
                              value={editFaction}
                              onChange={(e) => setEditFaction(e.target.value)}
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
                        <div>
                          <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-1">
                            Срок / Титул
                          </label>
                          <div className="wax-recess px-3 py-1.5">
                            <input
                              type="text"
                              value={editTerm}
                              onChange={(e) => setEditTerm(e.target.value)}
                              className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="wax-recess p-2.5">
                        <textarea
                          rows={2}
                          value={editPowers}
                          onChange={(e) => setEditPowers(e.target.value)}
                          className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none resize-none"
                        />
                      </div>
                      {getBranchIncompatibilityWarning(
                        editHolderName,
                        supOffice.title,
                        supOffice.id
                      ) && (
                        <div className="p-2.5 rounded bg-[#8B2635]/40 border border-[#C0392B] text-xs text-[#F1A9B2] font-semibold">
                          {getBranchIncompatibilityWarning(
                            editHolderName,
                            supOffice.title,
                            supOffice.id
                          )}
                        </div>
                      )}
                      {getCandidate14DayCensusWarning(editHolderName) && (
                        <div className="p-2.5 rounded bg-[#261E14] border border-[#C4AD83] text-xs text-[#C4AD83]">
                          {getCandidate14DayCensusWarning(editHolderName)}
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingOfficeId(null)}
                          className="px-3.5 py-1.5 rounded btn-basalt-stele text-xs cursor-pointer"
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEditOffice(supOffice)}
                          className="px-4 py-1.5 rounded btn-golden-stater text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Сохранить изменения (ГМ)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 1B. Other State & Polis Offices Grid (Editable & Deletable) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {otherOffices.map((office) => {
            const isEditing = editingOfficeId === office.id;
            return (
              <div
                key={office.id}
                className="p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] hover:border-[#9A7B38] transition-colors flex flex-col justify-between space-y-3.5"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-epigraphic text-[#C4AD83]">
                        {office.greekTitle} · {office.polisName}
                      </span>
                      <h4 className="font-display text-lg sm:text-xl font-bold text-[#E6E0D0] mt-0.5">
                        {office.title}
                      </h4>
                    </div>

                    {canInitiateOrSignGmAction && !isEditing && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditOffice(office)}
                          className="p-2 rounded bg-[#121820] hover:bg-[#263140] border border-[#9A7B38]/60 text-[#C4AD83] cursor-pointer"
                          title="Изменить должность"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            submitGovernanceChange(
                              'delete_office',
                              `Упразднение должности «${office.title}»`,
                              `Удаление магистратуры (${office.holderName}) из реестра должностей`,
                              { officeId: office.id }
                            )
                          }
                          className="p-2 rounded bg-[#2A151B] hover:bg-[#4A1C26] border border-[#8B2635] text-[#F1A9B2] cursor-pointer"
                          title="Удалить должность"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="wax-recess p-3 space-y-1">
                    <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                      Действующий магистрат:
                    </span>
                    <p className="font-display text-base font-bold text-[#C4AD83]">
                      {office.holderName}
                    </p>
                    <p className="text-xs text-[#C2B280]">{office.faction}</p>
                  </div>

                  <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                    {office.powersAndDuties}
                  </p>
                </div>

                {isEditing && (
                  <div className="p-3.5 rounded bg-[#121820] border border-[#9E8658] space-y-2.5 pt-3">
                    <div className="wax-recess px-2.5 py-1.5">
                      <label className="block text-[10px] font-epigraphic text-[#C2B280]">
                        Кто занимает должность
                      </label>
                      <input
                        type="text"
                        value={editHolderName}
                        onChange={(e) => setEditHolderName(e.target.value)}
                        className="w-full bg-transparent text-xs text-[#E6E0D0] focus:outline-none"
                      />
                    </div>
                    <div className="wax-recess px-2.5 py-1.5">
                      <label className="block text-[10px] font-epigraphic text-[#C2B280]">
                        Партия / Фракция
                      </label>
                      <select
                        value={editFaction}
                        onChange={(e) => setEditFaction(e.target.value)}
                        className="w-full bg-[#0B0F14] text-xs text-[#E2DAC2] focus:outline-none"
                      >
                        {PLAYER_FACTIONS_LIST.map((pf) => (
                          <option key={pf} value={pf}>
                            {pf}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="wax-recess p-2">
                      <label className="block text-[10px] font-epigraphic text-[#C2B280]">
                        Полномочия
                      </label>
                      <textarea
                        rows={2}
                        value={editPowers}
                        onChange={(e) => setEditPowers(e.target.value)}
                        className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none resize-none"
                      />
                    </div>
                    {getBranchIncompatibilityWarning(
                      editHolderName,
                      office.title,
                      office.id
                    ) && (
                      <div className="p-2.5 rounded bg-[#8B2635]/40 border border-[#C0392B] text-xs text-[#F1A9B2] font-semibold">
                        {getBranchIncompatibilityWarning(
                          editHolderName,
                          office.title,
                          office.id
                        )}
                      </div>
                    )}
                    {getCandidate14DayCensusWarning(editHolderName) && (
                      <div className="p-2.5 rounded bg-[#261E14] border border-[#C4AD83] text-xs text-[#C4AD83]">
                        {getCandidate14DayCensusWarning(editHolderName)}
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingOfficeId(null)}
                        className="px-3 py-1 rounded btn-basalt-stele text-xs cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEditOffice(office)}
                        className="px-3.5 py-1 rounded btn-golden-stater text-xs cursor-pointer"
                      >
                        Сохранить (ГМ)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 2 (BELOW OFFICES): BILL VOTING («ЗА» / «ПРОТИВ») & ELECTIONS  */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 6 COLS: ГОЛОСОВАНИЕ ЗА ЗАКОНОПРОЕКТ (Строго «За» или «Против») */}
        <div className="lg:col-span-6 stele-panel p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#263140] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-epigraphic uppercase text-[#C4AD83]">
                <Scale className="w-4 h-4" />
                <span>II. Народное Собрание · Законопроекты</span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#E6E0D0] mt-0.5">
                Голосование за Законопроект («За» / «Против»)
              </h3>
              <p className="text-xs text-[#C2B280] mt-1">
                Каждая одобренная живая анкета игрока имеет 1 голос. Варианты голосования по законопроекту: строго «За» или «Против».
              </p>
            </div>

            {canInitiateOrSignGmAction && (
              <button
                type="button"
                onClick={() => {
                  sound.playCoinClink();
                  setShowAddBill(!showAddBill);
                }}
                className="min-h-[42px] px-3.5 py-2 rounded btn-golden-stater text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Вынести Законопроект</span>
              </button>
            )}
          </div>

          {canInitiateOrSignGmAction && showAddBill && (
            <form
              onSubmit={handleCreateNewBillSubmit}
              className="p-4 rounded bg-[#1B232E] border border-[#9E8658] space-y-3"
            >
              <h4 className="font-display text-base font-bold text-[#E6E0D0]">
                Новый законопроект на голосование
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="wax-recess px-2.5 py-1.5">
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="Законопроект № 16"
                    className="w-full bg-transparent text-xs text-[#C4AD83] focus:outline-none"
                  />
                </div>
                <div className="wax-recess px-2.5 py-1.5">
                  <input
                    type="text"
                    value={billCategory}
                    onChange={(e) => setBillCategory(e.target.value)}
                    placeholder="Категория (Торговля, Войско...)"
                    className="w-full bg-transparent text-xs text-[#C2B280] focus:outline-none"
                  />
                </div>
              </div>
              <div className="wax-recess px-2.5 py-1.5">
                <input
                  type="text"
                  required
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  placeholder="Название законопроекта *"
                  className="w-full bg-transparent text-xs text-[#E6E0D0] focus:outline-none"
                />
              </div>
              <div className="wax-recess p-2">
                <textarea
                  rows={3}
                  required
                  value={billFullText}
                  onChange={(e) => setBillFullText(e.target.value)}
                  placeholder="Полный текст законопроекта для голосования..."
                  className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none resize-none"
                />
              </div>

              {/* Voting Duration Selector (1 to 96 hours / up to 4 days) */}
              <div className="p-3 rounded bg-[#121820] border border-[#9E8658]/60 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-epigraphic text-xs uppercase text-[#C4AD83] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Время голосования (от 1 часа до 4 дней / 96 ч.):
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={96}
                      value={billDurationHours}
                      onChange={(e) =>
                        setBillDurationHours(
                          clampVotingHours(Number(e.target.value))
                        )
                      }
                      className="w-16 px-2 py-1 rounded bg-[#0B0F14] border border-[#9E8658] text-xs font-bold text-[#E6E0D0] text-center tabular-nums focus:outline-none"
                    />
                    <span className="text-xs font-epigraphic text-[#8EBDA2]">
                      {formatDurationHoursLabel(billDurationHours)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {VOTING_HOUR_PRESETS.map((presetH) => (
                    <button
                      key={presetH}
                      type="button"
                      onClick={() => {
                        sound.playStoneTap();
                        setBillDurationHours(presetH);
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-epigraphic cursor-pointer border transition-colors ${
                        billDurationHours === presetH
                          ? 'bg-[#9E8658] text-[#0B0F14] font-bold border-[#FFF3B0]'
                          : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:border-[#9E8658]'
                      }`}
                    >
                      {presetH >= 24 && presetH % 24 === 0
                        ? `${presetH} ч. (${presetH / 24} дн.)`
                        : `${presetH} ч.`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Economic Effect Package (Buffs & Debuffs on Passage) */}
              <div className="p-3.5 rounded bg-[#121820] border border-[#9E8658]/70 space-y-3">
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="font-epigraphic text-xs uppercase text-[#C4AD83] font-bold">
                    ⚖ Экономический пакет закона (Баффы и Дебаффы при принятии Гелиэей)
                  </span>
                  <input
                    type="checkbox"
                    checked={billHasEconEffect}
                    onChange={(e) => setBillHasEconEffect(e.target.checked)}
                    className="w-4 h-4 accent-[#C4AD83]"
                  />
                </label>

                {billHasEconEffect && (
                  <div className="space-y-3 pt-1 border-t border-[#263140]">
                    <div>
                      <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-1">
                        Быстрый выбор сбалансированного шаблона закона (Бафф + Дебафф):
                      </label>
                      <div className="wax-recess px-2.5 py-1.5">
                        <select
                          value={billEconPresetId}
                          onChange={(e) =>
                            handleSelectBillEconPreset(e.target.value)
                          }
                          className="w-full bg-[#0B0F14] text-xs text-[#E6E0D0] focus:outline-none cursor-pointer"
                        >
                          {ECONOMIC_LAW_PRESETS.map((pr) => (
                            <option key={pr.id} value={pr.id}>
                              {pr.title} ({pr.categoryLabel})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="wax-recess p-2 border border-[#4E8765]/50">
                        <label className="block text-[10px] font-epigraphic uppercase text-[#8EBDA2] mb-0.5 font-bold">
                          ▲ Описание Баффа (Плюсы закона)
                        </label>
                        <input
                          type="text"
                          value={billBuffSummary}
                          onChange={(e) => setBillBuffSummary(e.target.value)}
                          className="w-full bg-transparent text-xs text-[#E6E0D0] focus:outline-none"
                        />
                      </div>
                      <div className="wax-recess p-2 border border-[#8B2635]/60">
                        <label className="block text-[10px] font-epigraphic uppercase text-[#F1A9B2] mb-0.5 font-bold">
                          ▼ Описание Дебаффа (Издержки / Пошлины)
                        </label>
                        <input
                          type="text"
                          value={billDebuffSummary}
                          onChange={(e) => setBillDebuffSummary(e.target.value)}
                          className="w-full bg-transparent text-xs text-[#E6E0D0] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="wax-recess px-2 py-1.5">
                        <label className="block text-[10px] text-[#C2B280]">
                          Простая экон. (др./цикл)
                        </label>
                        <input
                          type="number"
                          value={billModSimpleIncome}
                          onChange={(e) =>
                            setBillModSimpleIncome(Number(e.target.value) || 0)
                          }
                          className="w-full bg-transparent text-xs font-bold text-[#C4AD83] focus:outline-none"
                        />
                      </div>
                      <div className="wax-recess px-2 py-1.5">
                        <label className="block text-[10px] text-[#C2B280]">
                          Рента Ойкоса (%)
                        </label>
                        <input
                          type="number"
                          value={billModEstateRent}
                          onChange={(e) =>
                            setBillModEstateRent(Number(e.target.value) || 0)
                          }
                          className="w-full bg-transparent text-xs font-bold text-[#C4AD83] focus:outline-none"
                        />
                      </div>
                      <div className="wax-recess px-2 py-1.5">
                        <label className="block text-[10px] text-[#C2B280]">
                          Налог Эйсфора (% п.п.)
                        </label>
                        <input
                          type="number"
                          value={billModEisphora}
                          onChange={(e) =>
                            setBillModEisphora(Number(e.target.value) || 0)
                          }
                          className="w-full bg-transparent text-xs font-bold text-[#C4AD83] focus:outline-none"
                        />
                      </div>
                      <div className="wax-recess px-2 py-1.5">
                        <label className="block text-[10px] text-[#C2B280]">
                          Диобелия гражданам (др.)
                        </label>
                        <input
                          type="number"
                          value={billModDiobelia}
                          onChange={(e) =>
                            setBillModDiobelia(Number(e.target.value) || 0)
                          }
                          className="w-full bg-transparent text-xs font-bold text-[#C4AD83] focus:outline-none"
                        />
                      </div>
                      <div className="wax-recess px-2 py-1.5">
                        <label className="block text-[10px] text-[#C2B280]">
                          Содерж. рабов (%)
                        </label>
                        <input
                          type="number"
                          value={billModSlaveUpkeep}
                          onChange={(e) =>
                            setBillModSlaveUpkeep(Number(e.target.value) || 0)
                          }
                          className="w-full bg-transparent text-xs font-bold text-[#C4AD83] focus:outline-none"
                        />
                      </div>
                      <div className="wax-recess px-2 py-1.5">
                        <label className="block text-[10px] text-[#C2B280]">
                          Цена рабов на рынке (%)
                        </label>
                        <input
                          type="number"
                          value={billModSlavePrice}
                          onChange={(e) =>
                            setBillModSlavePrice(Number(e.target.value) || 0)
                          }
                          className="w-full bg-transparent text-xs font-bold text-[#C4AD83] focus:outline-none"
                        />
                      </div>
                      <div className="wax-recess px-2 py-1.5">
                        <label className="block text-[10px] text-[#C2B280]">
                          Сырьё ремесла Технэ (%)
                        </label>
                        <input
                          type="number"
                          value={billModCraftCost}
                          onChange={(e) =>
                            setBillModCraftCost(Number(e.target.value) || 0)
                          }
                          className="w-full bg-transparent text-xs font-bold text-[#C4AD83] focus:outline-none"
                        />
                      </div>
                      <div className="wax-recess px-2 py-1.5">
                        <label className="block text-[10px] text-[#C2B280]">
                          Шанс Шедевра (+%)
                        </label>
                        <input
                          type="number"
                          value={billModMasterpiece}
                          onChange={(e) =>
                            setBillModMasterpiece(Number(e.target.value) || 0)
                          }
                          className="w-full bg-transparent text-xs font-bold text-[#C4AD83] focus:outline-none"
                        />
                      </div>
                      <div className="wax-recess px-2 py-1.5">
                        <label className="block text-[10px] text-[#C2B280]">
                          Прибыль караванов (%)
                        </label>
                        <input
                          type="number"
                          value={billModCaravanProfit}
                          onChange={(e) =>
                            setBillModCaravanProfit(Number(e.target.value) || 0)
                          }
                          className="w-full bg-transparent text-xs font-bold text-[#C4AD83] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBill(false)}
                  className="px-3 py-1.5 rounded btn-basalt-stele text-xs cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded btn-golden-stater text-xs cursor-pointer"
                >
                  Вынести на голосование (ГМ)
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {bills.map((bill) => {
              const billVotes = bill.votes || [];
              const votesFor = billVotes.filter((v) => v.choice === 'for');
              const votesAgainst = billVotes.filter(
                (v) => v.choice === 'against'
              );
              const totalVotes = billVotes.length;
              const forPercent =
                totalVotes > 0
                  ? Math.round((votesFor.length / totalVotes) * 100)
                  : 0;
              const myVote = billVotes.find(
                (v) => v.characterId === myApprovedCharacter?.id
              );
              const isBillTimerExpired = Boolean(
                bill.votingEndsAtTimestamp && nowTs >= bill.votingEndsAtTimestamp
              );
              const isBillVotingOpen =
                bill.status === 'active' && !isBillTimerExpired;
              const isEconLawActive = Boolean(
                (
                  politics.globalEconomy?.activeEconomicLaws ??
                  INITIAL_GLOBAL_ECONOMY.activeEconomicLaws ??
                  []
                ).some((l) => l.sourceBillId === bill.id && l.isActive)
              );

              return (
                <div
                  key={bill.id}
                  className="p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-epigraphic">
                        <span className="text-[#C4AD83] font-bold">
                          {bill.numberLabel}
                        </span>
                        <span aria-hidden="true" className="text-[#7C786A]">
                          ·
                        </span>
                        <span className="text-[#C2B280]">{bill.category}</span>
                        <span aria-hidden="true" className="text-[#7C786A]">
                          ·
                        </span>
                        <span
                          className={
                            isBillVotingOpen
                              ? 'text-[#8EBDA2] font-bold'
                              : bill.status === 'passed' ||
                                  (isBillTimerExpired &&
                                    votesFor.length > votesAgainst.length)
                                ? 'text-[#C4AD83] font-bold'
                                : 'text-[#F1A9B2] font-bold'
                          }
                        >
                          {isBillVotingOpen
                            ? 'ГОЛОСОВАНИЕ ОТКРЫТО'
                            : isBillTimerExpired
                              ? `ВРЕМЯ ВЫШЛО (${
                                  votesFor.length > votesAgainst.length
                                    ? 'ПРИНЯТ'
                                    : 'ОТКЛОНЁН'
                                })`
                              : bill.status === 'passed'
                                ? 'ПРИНЯТ СОБРАНИЕМ'
                                : 'ОТКЛОНЁН'}
                        </span>
                      </div>
                      <h4 className="font-display text-lg font-bold text-[#E6E0D0] mt-1">
                        {bill.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canInitiateOrSignGmAction && (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playStoneTap();
                            setDraftBillTimerHours(
                              bill.votingDurationHours || 24
                            );
                            setEditingBillTimerId(
                              editingBillTimerId === bill.id ? null : bill.id
                            );
                          }}
                          className="px-2.5 py-1.5 rounded bg-[#121820] hover:bg-[#263140] border border-[#9E8658]/60 text-[11px] font-epigraphic text-[#C4AD83] flex items-center gap-1 cursor-pointer"
                          title="Установить время голосования в часах (от 1 ч. до 4 дней)"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Время (ч.)</span>
                        </button>
                      )}
                      {canInitiateOrSignGmAction && (
                        <button
                          type="button"
                          onClick={() =>
                            submitGovernanceChange(
                              'delete_bill',
                              `Удаление законопроекта «${bill.title}»`,
                              'Снятие законопроекта с повестки собрания',
                              { billId: bill.id }
                            )
                          }
                          className="p-1.5 rounded bg-[#2A151B] text-[#F1A9B2] hover:text-white cursor-pointer"
                          title="Удалить законопроект"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Voting Timer Status Strip */}
                  {bill.votingEndsAtTimestamp && (
                    <div
                      className={`px-3 py-2 rounded border text-xs font-epigraphic flex flex-wrap items-center justify-between gap-2 ${
                        isBillTimerExpired
                          ? 'bg-[#2A151B]/60 border-[#8B2635] text-[#F1A9B2]'
                          : 'bg-[#121820] border-[#9E8658]/60 text-[#C4AD83]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {isBillTimerExpired
                            ? 'Срок голосования истёк — приём голосов закрыт'
                            : `До конца голосования: ${formatVotingRemaining(
                                bill.votingEndsAtTimestamp
                              )}`}
                        </span>
                      </span>
                      {bill.votingDurationHours && (
                        <span className="text-[11px] text-[#C2B280]">
                          Установлено:{' '}
                          {formatDurationHoursLabel(bill.votingDurationHours)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* GM Inline Timer Setter (1 to 96 hours) */}
                  {canInitiateOrSignGmAction &&
                    editingBillTimerId === bill.id && (
                      <div className="p-3 rounded bg-[#121820] border border-[#9E8658] space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-epigraphic text-[#C4AD83]">
                            Установить время голосования (от 1 ч. до 96 ч. / 4 дней):
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={96}
                              value={draftBillTimerHours}
                              onChange={(e) =>
                                setDraftBillTimerHours(
                                  clampVotingHours(Number(e.target.value))
                                )
                              }
                              className="w-16 px-2 py-1 rounded bg-[#0B0F14] border border-[#9E8658] text-xs font-bold text-[#E6E0D0] text-center tabular-nums focus:outline-none"
                            />
                            <span className="text-xs font-epigraphic text-[#8EBDA2]">
                              {formatDurationHoursLabel(draftBillTimerHours)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {VOTING_HOUR_PRESETS.map((presetH) => (
                            <button
                              key={presetH}
                              type="button"
                              onClick={() => setDraftBillTimerHours(presetH)}
                              className={`px-2 py-1 rounded text-[11px] font-epigraphic cursor-pointer border ${
                                draftBillTimerHours === presetH
                                  ? 'bg-[#9E8658] text-[#0B0F14] font-bold border-[#FFF3B0]'
                                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140]'
                              }`}
                            >
                              {presetH >= 24 && presetH % 24 === 0
                                ? `${presetH} ч. (${presetH / 24} дн.)`
                                : `${presetH} ч.`}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingBillTimerId(null)}
                            className="px-3 py-1 rounded btn-basalt-stele text-xs cursor-pointer"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSetBillVotingHours(
                                bill.id,
                                draftBillTimerHours
                              )
                            }
                            className="px-3.5 py-1 rounded btn-golden-stater text-xs cursor-pointer"
                          >
                            Запустить таймер ({draftBillTimerHours} ч.)
                          </button>
                        </div>
                      </div>
                    )}

                  <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                    {bill.fullText}
                  </p>

                  {/* Economic Buff & Debuff Preview Block on Bill Card */}
                  {bill.economicEffect && (
                    <div className="p-3 rounded bg-[#121820] border border-[#9E8658]/60 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-epigraphic text-[11px] uppercase tracking-wider text-[#C4AD83] font-bold">
                          ⚖ Экономический эффект закона при принятии:
                        </span>
                        {isEconLawActive && (
                          <span className="px-2 py-0.5 rounded bg-[#2E5A44]/50 border border-[#8EBDA2] text-[10px] font-epigraphic text-[#8EBDA2] font-bold">
                            ★ Действует в Ойкосе и Казне
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-[#182B22]/60 border border-[#4E8765]/50">
                          <span className="block font-epigraphic text-[10px] uppercase text-[#8EBDA2] font-bold">
                            ▲ Бафф (Плюсы):
                          </span>
                          <span className="text-[#E2DAC2]">
                            {bill.economicEffect.buffSummary}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-[#2A151B]/60 border border-[#8B2635]/60">
                          <span className="block font-epigraphic text-[10px] uppercase text-[#F1A9B2] font-bold">
                            ▼ Дебафф (Издержки):
                          </span>
                          <span className="text-[#E2DAC2]">
                            {bill.economicEffect.debuffSummary}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vote Tallies Bar + 5-Vote Heliaia Quorum Indicator */}
                  <div className="wax-recess p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-epigraphic tabular-nums">
                      <span className="text-[#8EBDA2] font-bold">
                        ЗА: {votesFor.length} ({forPercent}%)
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                          totalVotes >= 5
                            ? 'bg-[#2E5A44]/40 border-[#8EBDA2] text-[#8EBDA2]'
                            : 'bg-[#261E14] border-[#C4AD83]/60 text-[#C4AD83]'
                        }`}
                      >
                        Кворум Гелиэи: {totalVotes} / 5 голосов{' '}
                        {totalVotes >= 5 ? '✓ Набран' : '(нужно мин. 5)'}
                      </span>
                      <span className="text-[#F1A9B2] font-bold">
                        ПРОТИВ: {votesAgainst.length} (
                        {totalVotes > 0 ? 100 - forPercent : 0}%)
                      </span>
                    </div>

                    <div className="h-2.5 w-full rounded bg-[#0B0F14] overflow-hidden flex">
                      <div
                        style={{ width: `${forPercent}%` }}
                        className="bg-[#4E8765] h-full transition-all"
                      />
                      <div
                        style={{
                          width: `${totalVotes > 0 ? 100 - forPercent : 0}%`,
                        }}
                        className="bg-[#8B2635] h-full transition-all"
                      />
                    </div>

                    {/* Automatic Quorum & Timer Verdict Banner */}
                    {bill.status === 'active' &&
                      (isBillTimerExpired || totalVotes >= 5) && (
                        <div
                          className={`p-2 rounded border text-[11px] font-epigraphic ${
                            totalVotes < 5
                              ? 'bg-[#2A151B]/60 border-[#C0392B] text-[#F1A9B2]'
                              : votesFor.length > votesAgainst.length
                                ? 'bg-[#182B22]/70 border-[#4E8765] text-[#8EBDA2]'
                                : 'bg-[#2A151B]/60 border-[#C0392B] text-[#F1A9B2]'
                          }`}
                        >
                          {totalVotes < 5
                            ? `⚠ Итог по Кодексу: Кворум не набран (${totalVotes} из 5 минимальных голосов). Законопроект не может быть принят без кворума.`
                            : votesFor.length > votesAgainst.length
                              ? `✓ Итог по Кодексу: Кворум набран (${totalVotes}/5), большинство голосов «ЗА» (${forPercent}%) — Закон готов к утверждению Председателем Гелиэи / ГМ!`
                              : `✕ Итог по Кодексу: Кворум набран (${totalVotes}/5), большинство «ПРОТИВ» — Законопроект подлежит отклонению.`}
                        </div>
                      )}

                    {billVotes.length > 0 && (
                      <div className="pt-1 text-[11px] text-[#C2B280] space-y-0.5">
                        {votesFor.length > 0 && (
                          <p>
                            <strong className="text-[#8EBDA2]">За:</strong>{' '}
                            {votesFor.map((v) => v.characterName).join(', ')}
                          </p>
                        )}
                        {votesAgainst.length > 0 && (
                          <p>
                            <strong className="text-[#F1A9B2]">Против:</strong>{' '}
                            {votesAgainst
                              .map((v) => v.characterName)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Strictly Two Buttons: «За» or «Против» (with 7-day cooldown, vacation, and voting-freeze checks) */}
                  {isBillVotingOpen && (
                    <div className="pt-1">
                      {myApprovedCharacter ? (
                        isUnderVotingCooldown ? (
                          <div className="p-3 rounded bg-[#121820] border border-[#C4AD83]/60 text-xs text-[#C4AD83] flex items-center gap-2">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span>
                              Новые анкеты не могут голосовать первые 7 дней после одобрения — осталось:{' '}
                              <strong>
                                {formatCooldownRemaining(votingCooldownRemainingMs)}
                              </strong>
                            </span>
                          </div>
                        ) : isMyVotingFrozen ? (
                          <div className="p-3 rounded bg-[#2A151B]/60 border border-[#C0392B] text-xs text-[#F1A9B2] flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            <span>
                              ❄ Ваше право голоса временно заморожено из-за невыполнения нормы активности (Раздел 2 Кодекса).
                            </span>
                          </div>
                        ) : isMyCharacterOnVacation ? (
                          <div className="p-3 rounded bg-[#121820] border border-[#8EBDA2]/60 text-xs text-[#8EBDA2] flex items-center gap-2">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span>
                              🏖 Ваша анкета находится в официальном отпуске. Чтобы голосовать, завершите отпуск во вкладке «Моя Анкета».
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => handleCastBillVote(bill.id, 'for')}
                              className={`min-h-[44px] px-4 py-2.5 rounded text-xs font-epigraphic font-bold flex items-center justify-center gap-2 cursor-pointer border transition-all ${
                                myVote?.choice === 'for'
                                  ? 'bg-[#2E5A44] text-[#E6E0D0] border-[#8EBDA2] votive-glow'
                                  : 'bg-[#121820] text-[#8EBDA2] border-[#4E8765]/60 hover:bg-[#1E3B2C]'
                              }`}
                            >
                              <ThumbsUp className="w-4 h-4" />
                              <span>
                                Голосовать «ЗА»{' '}
                                {myVote?.choice === 'for' ? '(Ваш голос)' : ''}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleCastBillVote(bill.id, 'against')
                              }
                              className={`min-h-[44px] px-4 py-2.5 rounded text-xs font-epigraphic font-bold flex items-center justify-center gap-2 cursor-pointer border transition-all ${
                                myVote?.choice === 'against'
                                  ? 'bg-[#8B2635] text-[#E6E0D0] border-[#F1A9B2] votive-glow'
                                  : 'bg-[#121820] text-[#F1A9B2] border-[#8B2635]/60 hover:bg-[#3A161E]'
                              }`}
                            >
                              <ThumbsDown className="w-4 h-4" />
                              <span>
                                Голосовать «ПРОТИВ»{' '}
                                {myVote?.choice === 'against'
                                  ? '(Ваш голос)'
                                  : ''}
                              </span>
                            </button>
                          </div>
                        )
                      ) : (
                        <p className="text-xs text-[#C4AD83] font-epigraphic">
                          Голосовать могут только игроки с живой одобренной ГМом анкетой.
                        </p>
                      )}
                    </div>
                  )}

                  {/* GM / Presidium Conclude Bill & Enact Economic Buffs/Debuffs Controls */}
                  {canInitiateOrSignGmAction && bill.status === 'active' && (
                    <div className="pt-2 border-t border-[#263140] flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-epigraphic text-[#C2B280]">
                        Решение Президиума Гелиэи / ГМ по итогам голосования:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            submitGovernanceChange(
                              'conclude_bill',
                              `Утверждение закона «${bill.title}» (ПРИНЯТ)`,
                              `Закон принят Гелиэей и вступает в действие${bill.economicEffect ? ' вместе с экономическими баффами/дебаффами' : ''}`,
                              { billId: bill.id, status: 'passed' }
                            )
                          }
                          className="px-3 py-1.5 rounded bg-[#2E5A44] hover:bg-[#396E53] border border-[#8EBDA2] text-[11px] font-epigraphic text-[#E6E0D0] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            Принять закон
                            {bill.economicEffect ? ' (вкл. баффы/дебаффы)' : ''}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            submitGovernanceChange(
                              'conclude_bill',
                              `Отклонение законопроекта «${bill.title}»`,
                              'Законопроект отклонён по итогам голосования',
                              { billId: bill.id, status: 'rejected' }
                            )
                          }
                          className="px-3 py-1.5 rounded bg-[#2A151B] hover:bg-[#4A1C26] border border-[#8B2635] text-[11px] font-epigraphic text-[#F1A9B2] flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Отклонить</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT 6 COLS: ГОЛОСОВАНИЕ ЗА ДОЛЖНОСТЬ (Кандидаты с программами + «Ни один из кандидатов») */}
        <div className="lg:col-span-6 stele-panel p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#263140] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-epigraphic uppercase text-[#C4AD83]">
                <Vote className="w-4 h-4" />
                <span>III. Выборы Магистратов · Программы Кандидатов</span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#E6E0D0] mt-0.5">
                Голосование за Должность
              </h3>
              <p className="text-xs text-[#C2B280] mt-1">
                Нажмите на любого кандидата, чтобы открыть его предвыборную программу, биографию и обещания. Также доступен вариант «Ни один из кандидатов».
              </p>
            </div>

            {canInitiateOrSignGmAction && (
              <button
                type="button"
                onClick={() => {
                  sound.playCoinClink();
                  setShowAddElection(!showAddElection);
                }}
                className="min-h-[42px] px-3.5 py-2 rounded btn-golden-stater text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Назначить Выборы</span>
              </button>
            )}
          </div>

          {canInitiateOrSignGmAction && showAddElection && (
            <form
              onSubmit={handleCreateElectionSubmit}
              className="p-4 rounded bg-[#1B232E] border border-[#9E8658] space-y-3"
            >
              <h4 className="font-display text-base font-bold text-[#E6E0D0]">
                Открыть выборы на должность
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="wax-recess px-2.5 py-1.5">
                  <input
                    type="text"
                    required
                    value={electionOfficeTitle}
                    onChange={(e) => setElectionOfficeTitle(e.target.value)}
                    placeholder="Выборная должность *"
                    className="w-full bg-transparent text-xs text-[#E6E0D0] focus:outline-none"
                  />
                </div>
                <div className="wax-recess px-2.5 py-1.5">
                  <input
                    type="text"
                    value={electionTerm}
                    onChange={(e) => setElectionTerm(e.target.value)}
                    placeholder="Срок (напр. 110 г. до н.э.)"
                    className="w-full bg-transparent text-xs text-[#C4AD83] focus:outline-none"
                  />
                </div>
              </div>

              {/* Add Candidate Sub-form */}
              <div className="p-3 rounded bg-[#121820] border border-[#9A7B38]/60 space-y-2.5">
                <span className="block font-epigraphic text-xs uppercase text-[#C4AD83]">
                  Добавить кандидата в бюллетень ({draftCandidates.length} добавлено):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="wax-recess px-2.5 py-1.5">
                    <input
                      type="text"
                      value={candName}
                      onChange={(e) => setCandName(e.target.value)}
                      placeholder="Имя кандидата"
                      className="w-full bg-transparent text-xs text-[#E6E0D0] focus:outline-none"
                    />
                  </div>
                  <div className="wax-recess px-2.5 py-1.5">
                    <input
                      type="text"
                      value={candSlogan}
                      onChange={(e) => setCandSlogan(e.target.value)}
                      placeholder="Краткий девиз кандидата"
                      className="w-full bg-transparent text-xs text-[#C4AD83] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="wax-recess p-2">
                  <textarea
                    rows={2}
                    value={candProgram}
                    onChange={(e) => setCandProgram(e.target.value)}
                    placeholder="Предвыборная программа кандидата (откроется при клике на кандидата)..."
                    className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none resize-none"
                  />
                </div>
                <div className="wax-recess px-2.5 py-1.5">
                  <input
                    type="text"
                    value={candPromise}
                    onChange={(e) => setCandPromise(e.target.value)}
                    placeholder="Ключевые обещания через точку с запятой (;)"
                    className="w-full bg-transparent text-xs text-[#C2B280] focus:outline-none"
                  />
                </div>
                {getBranchIncompatibilityWarning(
                  candName,
                  electionOfficeTitle
                ) && (
                  <div className="p-2 rounded bg-[#8B2635]/40 border border-[#C0392B] text-xs text-[#F1A9B2] font-semibold">
                    {getBranchIncompatibilityWarning(
                      candName,
                      electionOfficeTitle
                    )}
                  </div>
                )}
                {getCandidate14DayCensusWarning(candName) && (
                  <div className="p-2 rounded bg-[#261E14] border border-[#C4AD83] text-xs text-[#C4AD83]">
                    {getCandidate14DayCensusWarning(candName)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAddDraftCandidate}
                  className="px-3 py-1.5 rounded btn-basalt-stele text-xs text-[#C4AD83] cursor-pointer"
                >
                  + Включить кандидата в список
                </button>

                {draftCandidates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {draftCandidates.map((c) => (
                      <span
                        key={c.id}
                        className="px-2 py-0.5 rounded bg-[#1B232E] border border-[#9E8658]/50 text-[11px] text-[#E6E0D0]"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Election Voting Duration Selector (1 to 96 hours / up to 4 days) */}
              <div className="p-3 rounded bg-[#121820] border border-[#9E8658]/60 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-epigraphic text-xs uppercase text-[#C4AD83] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Время голосования (от 1 часа до 4 дней / 96 ч.):
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={96}
                      value={electionDurationHours}
                      onChange={(e) =>
                        setElectionDurationHours(
                          clampVotingHours(Number(e.target.value))
                        )
                      }
                      className="w-16 px-2 py-1 rounded bg-[#0B0F14] border border-[#9E8658] text-xs font-bold text-[#E6E0D0] text-center tabular-nums focus:outline-none"
                    />
                    <span className="text-xs font-epigraphic text-[#8EBDA2]">
                      {formatDurationHoursLabel(electionDurationHours)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {VOTING_HOUR_PRESETS.map((presetH) => (
                    <button
                      key={presetH}
                      type="button"
                      onClick={() => {
                        sound.playStoneTap();
                        setElectionDurationHours(presetH);
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-epigraphic cursor-pointer border transition-colors ${
                        electionDurationHours === presetH
                          ? 'bg-[#9E8658] text-[#0B0F14] font-bold border-[#FFF3B0]'
                          : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:border-[#9E8658]'
                      }`}
                    >
                      {presetH >= 24 && presetH % 24 === 0
                        ? `${presetH} ч. (${presetH / 24} дн.)`
                        : `${presetH} ч.`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddElection(false)}
                  className="px-3 py-1.5 rounded btn-basalt-stele text-xs cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={draftCandidates.length === 0}
                  className="px-4 py-1.5 rounded btn-golden-stater text-xs cursor-pointer disabled:opacity-40"
                >
                  Открыть выборы (ГМ)
                </button>
              </div>
            </form>
          )}

          <div className="space-y-5">
            {elections.map((election) => {
              const electionVotes = election.votes || [];
              const electionCandidates = election.candidates || [];
              const totalVotes = electionVotes.length;
              const myVote = electionVotes.find(
                (v) => v.characterId === myApprovedCharacter?.id
              );
              const noneVotes = electionVotes.filter(
                (v) => v.candidateId === 'none_of_the_above'
              );
              const nonePercent =
                totalVotes > 0
                  ? Math.round((noneVotes.length / totalVotes) * 100)
                  : 0;
              const isElectionTimerExpired = Boolean(
                election.votingEndsAtTimestamp &&
                  nowTs >= election.votingEndsAtTimestamp
              );
              const isElectionVotingOpen =
                election.status === 'active' && !isElectionTimerExpired;

              return (
                <div
                  key={election.id}
                  className="p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-epigraphic text-[#C4AD83] font-bold">
                        {election.termLabel} · Всего голосов: {totalVotes} ·{' '}
                        <span
                          className={
                            isElectionVotingOpen
                              ? 'text-[#8EBDA2]'
                              : 'text-[#F1A9B2]'
                          }
                        >
                          {isElectionVotingOpen
                            ? 'ГОЛОСОВАНИЕ ОТКРЫТО'
                            : isElectionTimerExpired
                              ? 'ВРЕМЯ ГОЛОСОВАНИЯ ИСТЕКЛО'
                              : 'ЗАВЕРШЕНО'}
                        </span>
                      </span>
                      <h4 className="font-display text-xl font-bold text-[#E6E0D0] mt-0.5">
                        Выборы: {election.officeTitle}
                      </h4>
                      <p className="text-xs text-[#C2B280] mt-1">
                        {election.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canInitiateOrSignGmAction && (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playStoneTap();
                            setDraftElectionTimerHours(
                              election.votingDurationHours || 48
                            );
                            setEditingElectionTimerId(
                              editingElectionTimerId === election.id
                                ? null
                                : election.id
                            );
                          }}
                          className="px-2.5 py-1.5 rounded bg-[#121820] hover:bg-[#263140] border border-[#9E8658]/60 text-[11px] font-epigraphic text-[#C4AD83] flex items-center gap-1 cursor-pointer"
                          title="Установить время голосования в часах (от 1 ч. до 4 дней)"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Время (ч.)</span>
                        </button>
                      )}
                      {canInitiateOrSignGmAction && (
                        <button
                          type="button"
                          onClick={() =>
                            submitGovernanceChange(
                              'delete_election',
                              `Удаление выборов «${election.officeTitle}»`,
                              'Завершение и удаление выборного бюллетеня',
                              { electionId: election.id }
                            )
                          }
                          className="p-1.5 rounded bg-[#2A151B] text-[#F1A9B2] hover:text-white cursor-pointer"
                          title="Удалить выборы"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Election Voting Timer Strip */}
                  {election.votingEndsAtTimestamp && (
                    <div
                      className={`px-3 py-2 rounded border text-xs font-epigraphic flex flex-wrap items-center justify-between gap-2 ${
                        isElectionTimerExpired
                          ? 'bg-[#2A151B]/60 border-[#8B2635] text-[#F1A9B2]'
                          : 'bg-[#121820] border-[#9E8658]/60 text-[#C4AD83]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {isElectionTimerExpired
                            ? 'Срок голосования на выборах истёк — приём голосов закрыт'
                            : `До конца голосования: ${formatVotingRemaining(
                                election.votingEndsAtTimestamp
                              )}`}
                        </span>
                      </span>
                      {election.votingDurationHours && (
                        <span className="text-[11px] text-[#C2B280]">
                          Установлено:{' '}
                          {formatDurationHoursLabel(
                            election.votingDurationHours
                          )}
                        </span>
                      )}
                    </div>
                  )}

                  {/* GM Inline Election Timer Setter (1 to 96 hours) */}
                  {canInitiateOrSignGmAction &&
                    editingElectionTimerId === election.id && (
                      <div className="p-3 rounded bg-[#121820] border border-[#9E8658] space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-epigraphic text-[#C4AD83]">
                            Установить время выборов (от 1 ч. до 96 ч. / 4 дней):
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={96}
                              value={draftElectionTimerHours}
                              onChange={(e) =>
                                setDraftElectionTimerHours(
                                  clampVotingHours(Number(e.target.value))
                                )
                              }
                              className="w-16 px-2 py-1 rounded bg-[#0B0F14] border border-[#9E8658] text-xs font-bold text-[#E6E0D0] text-center tabular-nums focus:outline-none"
                            />
                            <span className="text-xs font-epigraphic text-[#8EBDA2]">
                              {formatDurationHoursLabel(draftElectionTimerHours)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {VOTING_HOUR_PRESETS.map((presetH) => (
                            <button
                              key={presetH}
                              type="button"
                              onClick={() => setDraftElectionTimerHours(presetH)}
                              className={`px-2 py-1 rounded text-[11px] font-epigraphic cursor-pointer border ${
                                draftElectionTimerHours === presetH
                                  ? 'bg-[#9E8658] text-[#0B0F14] font-bold border-[#FFF3B0]'
                                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140]'
                              }`}
                            >
                              {presetH >= 24 && presetH % 24 === 0
                                ? `${presetH} ч. (${presetH / 24} дн.)`
                                : `${presetH} ч.`}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingElectionTimerId(null)}
                            className="px-3 py-1 rounded btn-basalt-stele text-xs cursor-pointer"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSetElectionVotingHours(
                                election.id,
                                draftElectionTimerHours
                              )
                            }
                            className="px-3.5 py-1 rounded btn-golden-stater text-xs cursor-pointer"
                          >
                            Запустить таймер ({draftElectionTimerHours} ч.)
                          </button>
                        </div>
                      </div>
                    )}

                  {isElectionVotingOpen &&
                    myApprovedCharacter &&
                    isUnderVotingCooldown && (
                      <div className="p-3 rounded bg-[#121820] border border-[#C4AD83]/60 text-xs text-[#C4AD83] flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>
                          Новые анкеты не могут голосовать первые 7 дней после одобрения — осталось:{' '}
                          <strong>
                            {formatCooldownRemaining(votingCooldownRemainingMs)}
                          </strong>
                        </span>
                      </div>
                    )}

                  {isElectionVotingOpen &&
                    myApprovedCharacter &&
                    isMyVotingFrozen && (
                      <div className="p-3 rounded bg-[#2A151B]/80 border border-[#8B2635] text-xs text-[#F1A9B2] flex items-center gap-2">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>
                          ❄ Ваше право голоса временно заморожено из-за неактивности (менее 2 ролевых постов за 14 дней).
                        </span>
                      </div>
                    )}

                  {isElectionVotingOpen &&
                    myApprovedCharacter &&
                    isMyCharacterOnVacation && (
                      <div className="p-3 rounded bg-[#1B232E] border border-[#C4AD83]/60 text-xs text-[#C4AD83] flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>
                          🏖 Ваш персонаж находится в оформленном отпуске (Раздел 2 Кодекса). Завершите отпуск в анкете, чтобы голосовать на выборах.
                        </span>
                      </div>
                    )}

                  {/* Candidates List */}
                  <div className="space-y-3">
                    {electionCandidates.map((cand) => {
                      const candVotes = electionVotes.filter(
                        (v) => v.candidateId === cand.id
                      );
                      const pct =
                        totalVotes > 0
                          ? Math.round((candVotes.length / totalVotes) * 100)
                          : 0;
                      const isMyChoice = myVote?.candidateId === cand.id;

                      return (
                        <div
                          key={cand.id}
                          className={`wax-recess p-3.5 border transition-all space-y-2.5 ${
                            isMyChoice
                              ? 'border-[#9E8658] votive-glow'
                              : 'border-[#5E481E]/80 hover:border-[#9E8658]/60'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                            <div
                              onClick={() => {
                                sound.playStoneTap();
                                setInspectedCandidate({
                                  candidate: cand,
                                  electionTitle: election.officeTitle,
                                  electionId: election.id,
                                });
                              }}
                              className="cursor-pointer group flex-1"
                            >
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-epigraphic text-[#C2B280]">
                                <span className="text-[#C4AD83] font-bold">
                                  Полис {cand.polisName}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{cand.faction}</span>
                              </div>

                              <h5 className="font-display text-base sm:text-lg font-bold text-[#E6E0D0] group-hover:text-[#C4AD83] transition-colors mt-0.5 flex items-center gap-2">
                                <span>{cand.name}</span>
                                <span className="text-xs font-epigraphic text-[#C4AD83] underline">
                                  [Открыть программу]
                                </span>
                              </h5>

                              <p className="text-xs italic text-[#E2DAC2] mt-1">
                                {cand.slogan}
                              </p>
                            </div>

                            <div className="flex flex-wrap sm:flex-col items-end justify-between gap-2 shrink-0">
                              <span className="font-epigraphic text-xs font-bold text-[#C4AD83] tabular-nums">
                                Голосов: {candVotes.length} ({pct}%)
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    sound.playStoneTap();
                                    setInspectedCandidate({
                                      candidate: cand,
                                      electionTitle: election.officeTitle,
                                      electionId: election.id,
                                    });
                                  }}
                                  className="min-h-[38px] px-3 py-1.5 rounded btn-basalt-stele text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-[#C4AD83]" />
                                  <span>Программа</span>
                                </button>

                                {isElectionVotingOpen &&
                                  myApprovedCharacter &&
                                  canMyCharacterCastVote && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCastElectionVote(
                                          election.id,
                                          cand.id
                                        )
                                      }
                                      className={`min-h-[38px] px-3.5 py-1.5 rounded text-xs font-epigraphic font-bold cursor-pointer ${
                                        isMyChoice
                                          ? 'btn-golden-stater'
                                          : 'bg-[#263140] text-[#E6E0D0] border border-[#9E8658]/60 hover:bg-[#314054]'
                                      }`}
                                    >
                                      {isMyChoice
                                        ? 'Выбран вами'
                                        : 'Голосовать'}
                                    </button>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="h-1.5 w-full rounded bg-[#0B0F14] overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full bg-[#9E8658] transition-all"
                            />
                          </div>

                          {candVotes.length > 0 && (
                            <p className="text-[11px] text-[#8EBDA2]">
                              Поддержали:{' '}
                              {candVotes.map((v) => v.characterName).join(', ')}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {/* MANDATORY OPTION: «Ни один из кандидатов» */}
                    <div
                      className={`wax-recess p-3.5 border transition-all space-y-2 ${
                        myVote?.candidateId === 'none_of_the_above'
                          ? 'border-[#C0392B] bg-[#8B2635]/20'
                          : 'border-[#8B2635]/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div>
                          <span className="font-epigraphic text-xs uppercase text-[#F1A9B2] font-bold">
                            Протестный вариант бюллетеня
                          </span>
                          <h5 className="font-display text-base font-bold text-[#E6E0D0]">
                            Ни один из кандидатов (Против всех)
                          </h5>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-epigraphic text-xs font-bold text-[#F1A9B2] tabular-nums">
                            Голосов: {noneVotes.length} ({nonePercent}%)
                          </span>

                          {isElectionVotingOpen &&
                            myApprovedCharacter &&
                            canMyCharacterCastVote && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCastElectionVote(
                                    election.id,
                                    'none_of_the_above'
                                  )
                                }
                                className={`min-h-[38px] px-3.5 py-1.5 rounded text-xs font-epigraphic font-bold cursor-pointer border ${
                                  myVote?.candidateId === 'none_of_the_above'
                                    ? 'bg-[#8B2635] text-[#E6E0D0] border-[#F1A9B2]'
                                    : 'bg-[#121820] text-[#F1A9B2] border-[#8B2635] hover:bg-[#2A151B]'
                                }`}
                              >
                                {myVote?.candidateId === 'none_of_the_above'
                                  ? 'Ваш выбор: Против всех'
                                  : 'Ни один из кандидатов'}
                              </button>
                            )}
                        </div>
                      </div>

                      {noneVotes.length > 0 && (
                        <p className="text-[11px] text-[#F1A9B2]">
                          Проголосовали против всех:{' '}
                          {noneVotes.map((v) => v.characterName).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal: Candidate Program, Bio & Promises */}
      {inspectedCandidate && (
        <div
          className="fixed inset-0 z-50 bg-[#0B0F14]/85 backdrop-blur-xs p-4 flex items-center justify-center"
          onClick={() => setInspectedCandidate(null)}
        >
          <div
            className="w-full max-w-2xl stele-panel border-2 border-[#9E8658] p-5 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#263140] pb-4">
              <div>
                <span className="font-epigraphic text-xs uppercase text-[#C4AD83]">
                  Предвыборный Свиток Кандидата · {inspectedCandidate.electionTitle}
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#E6E0D0] mt-1">
                  {inspectedCandidate.candidate.name}
                </h3>
                <p className="text-xs font-epigraphic text-[#C2B280] mt-1">
                  Полис: {inspectedCandidate.candidate.polisName} · Возраст:{' '}
                  {inspectedCandidate.candidate.age} лет · Фракция:{' '}
                  {inspectedCandidate.candidate.faction}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedCandidate(null)}
                className="p-1.5 rounded bg-[#1B232E] text-[#C2B280] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded bg-[#1B232E] border border-[#9E8658]/60 text-sm italic text-[#E6E0D0]">
              {inspectedCandidate.candidate.slogan}
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-epigraphic text-xs uppercase text-[#C4AD83] mb-1.5">
                  Биография и Заслуги перед Понтом:
                </h4>
                <p className="text-sm text-[#E2DAC2] leading-relaxed wax-recess p-3.5">
                  {inspectedCandidate.candidate.biographySummary}
                </p>
              </div>

              <div>
                <h4 className="font-epigraphic text-xs uppercase text-[#C4AD83] mb-1.5">
                  Подробная Предвыборная Программа:
                </h4>
                <div className="wax-recess p-4 text-sm text-[#E2DAC2] leading-relaxed whitespace-pre-line">
                  {inspectedCandidate.candidate.program}
                </div>
              </div>

              {(inspectedCandidate.candidate.keyPromises || []).length > 0 && (
                <div>
                  <h4 className="font-epigraphic text-xs uppercase text-[#8EBDA2] mb-1.5">
                    Клятвенные Обещания Избирателям:
                  </h4>
                  <ul className="space-y-1.5 wax-recess p-3.5 text-xs sm:text-sm text-[#E6E0D0]">
                    {(inspectedCandidate.candidate.keyPromises || []).map((pr, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Award className="w-4 h-4 text-[#C4AD83] shrink-0 mt-0.5" />
                        <span>{pr}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-[#263140]">
              <button
                type="button"
                onClick={() => setInspectedCandidate(null)}
                className="min-h-[42px] px-4 py-2 rounded btn-basalt-stele text-xs cursor-pointer"
              >
                Закрыть программу
              </button>
              {myApprovedCharacter && canMyCharacterCastVote && (
                <button
                  type="button"
                  onClick={() => {
                    handleCastElectionVote(
                      inspectedCandidate.electionId,
                      inspectedCandidate.candidate.id
                    );
                    setInspectedCandidate(null);
                  }}
                  className="min-h-[42px] px-5 py-2 rounded btn-golden-stater text-xs flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Отдать голос за «{inspectedCandidate.candidate.name}»
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

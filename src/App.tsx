/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  INITIAL_CHARACTERS,
  INITIAL_POLEIS,
  INITIAL_LAW_CHAPTERS,
  INITIAL_WIKI_SECTIONS,
  INITIAL_POLITICS_STATE,
} from './data/initialRpData';
import { INITIAL_GLOBAL_ECONOMY } from './data/economyCodexData';
import {
  CharacterInventoryItem,
  CharacterSheet,
  GameMemberRole,
  LawChapter,
  PolisData,
  PolisResource,
  PoliticsState,
} from './types/rpTypes';
import { OnboardingModal } from './components/OnboardingModal';
import { RegistryGraveyardView } from './components/RegistryGraveyardView';
import { PendingApprovalRegistryView } from './components/PendingApprovalRegistryView';
import { PoliticsView } from './components/PoliticsView';
import { ProfileEconomyView } from './components/ProfileEconomyView';
import { PontusMapPolisView } from './components/PontusMapPolisView';
import { WikiLawsView } from './components/WikiLawsView';
import { LaurelWreathBadge } from './components/PonticPrimitives';
import { sound } from './utils/sound';
import {
  deleteCharacterFromSupabase,
  deleteLawArticleFromSupabase,
  detectVkUserIdFromEnvironment,
  ensureAnonymousAuthSession,
  fetchUserRoleFromGameMembers,
  formatVkEmail,
  getStoredVkId,
  isSupabaseConfigured,
  loadPersistedState,
  normalizeVkIdInput,
  pullStateFromSupabase,
  pushStateToSupabase,
  savePersistedState,
  signInOrSignUpWithVkId,
  signOutVkSession,
  syncSingleCharacterToSupabase,
  toUuid,
} from './utils/supabaseSync';
import {
  CheckCircle2,
  Coins,
  Compass,
  Copy,
  Crown,
  KeyRound,
  Landmark,
  LogOut,
  MapPin,
  PlusCircle,
  Scale,
  ShieldCheck,
  Skull,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

type ActiveSection =
  | 'profile'
  | 'pending_registry'
  | 'registry'
  | 'politics'
  | 'map'
  | 'laws_wiki';

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('profile');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [isGmMode, setIsGmMode] = useState<boolean>(false);
  const [debugAdminEnabled, setDebugAdminEnabled] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<GameMemberRole>('player');
  const [currentUserId, setCurrentUserId] = useState<string>('local-user');
  const [gameMembersList, setGameMembersList] = useState<
    Array<{ userId: string; role: GameMemberRole }>
  >([]);

  // VK ID 1-Button Login State
  const [currentVkId, setCurrentVkId] = useState<string | null>(() =>
    getStoredVkId()
  );
  const [showVkModal, setShowVkModal] = useState<boolean>(false);
  const [vkIdDraft, setVkIdDraft] = useState<string>(
    () => getStoredVkId() || ''
  );
  const [vkAuthBusy, setVkAuthBusy] = useState<boolean>(false);
  const [vkAuthMessage, setVkAuthMessage] = useState<string | null>(null);
  const [copiedUuid, setCopiedUuid] = useState<boolean>(false);

  const isSupabaseHydratedRef = useRef<boolean>(!isSupabaseConfigured());
  const skipNextRemotePushRef = useRef<boolean>(false);

  // Core Data State (with Supabase as Primary Backend + Local Cache)
  const [characters, setCharacters] = useState<CharacterSheet[]>(() => {
    const saved = loadPersistedState();
    const defaultSeedUuid = toUuid(INITIAL_CHARACTERS[0]?.id);
    if (saved?.characters && saved.characters.length > 0) {
      return saved.characters.map((c) =>
        (c.id === 'char-diophantus' || toUuid(c.id) === defaultSeedUuid) &&
        !c.ownerUserId
          ? { ...c, isPlayerOwned: false }
          : c
      );
    }
    return INITIAL_CHARACTERS;
  });

  const [poleis, setPoleis] = useState<PolisData[]>(() => {
    const saved = loadPersistedState();
    if (saved?.poleis && saved.poleis.length > 0) {
      return saved.poleis.map((p) => {
        const freshDefault = INITIAL_POLEIS.find((ip) => ip.id === p.id);
        return freshDefault ? { ...p, coords: freshDefault.coords } : p;
      });
    }
    return INITIAL_POLEIS;
  });

  const [lawChapters, setLawChapters] = useState<LawChapter[]>(() => {
    const saved = loadPersistedState();
    return saved?.lawChapters && saved.lawChapters.length > 0
      ? saved.lawChapters
      : INITIAL_LAW_CHAPTERS;
  });

  const [politics, setPolitics] = useState<PoliticsState>(() => {
    const saved = loadPersistedState();
    return saved?.politics && saved.politics.offices?.length
      ? saved.politics
      : INITIAL_POLITICS_STATE;
  });

  const [wikiSections] = useState(INITIAL_WIKI_SECTIONS);

  // Establish VK ID or Anonymous Auth session (`authenticated` role + user.id in auth.users), check game_members role, and pull state from Supabase
  useEffect(() => {
    const envVk = detectVkUserIdFromEnvironment();
    if (envVk.vkId) {
      setCurrentVkId(envVk.vkId);
      setVkIdDraft(envVk.vkId);
    }

    if (!isSupabaseConfigured()) {
      isSupabaseHydratedRef.current = true;
      return;
    }

    let active = true;
    let resolvedRole: GameMemberRole = 'player';
    ensureAnonymousAuthSession()
      .then(async (session) => {
        if (active && session?.user?.user_metadata?.vk_id) {
          setCurrentVkId(session.user.user_metadata.vk_id);
        }
        const roleInfo = await fetchUserRoleFromGameMembers();
        resolvedRole = roleInfo.role;
        if (active) {
          setUserRole(roleInfo.role);
          if (roleInfo.userId) setCurrentUserId(roleInfo.userId);
          setGameMembersList(roleInfo.members || []);
          if (roleInfo.role === 'gm' || roleInfo.role === 'creator') {
            setIsGmMode(true);
          } else {
            setIsGmMode(false);
          }
        }
        return pullStateFromSupabase();
      })
      .then((remote) => {
        if (!active) return;
        if (remote) {
          skipNextRemotePushRef.current = true;
          if (remote.characters?.length) setCharacters(remote.characters);
          if (remote.poleis?.length) setPoleis(remote.poleis);
          if (remote.lawChapters?.length) setLawChapters(remote.lawChapters);
          if (remote.politics?.offices?.length) setPolitics(remote.politics);
        } else if (resolvedRole === 'gm' || resolvedRole === 'creator') {
          // Seed initial state into Supabase ONLY if user has GM/Creator privileges
          const current = loadPersistedState() || {};
          void pushStateToSupabase(
            {
              ...current,
              characters,
              poleis,
              lawChapters,
              politics,
            },
            { canPushGlobalTables: true }
          );
        }
      })
      .finally(() => {
        if (active) {
          isSupabaseHydratedRef.current = true;
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // 1-Button VK ID Sign-In Handler (`<vk_id>@mail.ru` + password `<vk_id>`)
  const handleOneClickVkLogin = async (explicitVkId?: string) => {
    const targetRaw =
      explicitVkId !== undefined
        ? explicitVkId
        : detectVkUserIdFromEnvironment().vkId || vkIdDraft;
    const cleanVk = normalizeVkIdInput(targetRaw);

    if (!cleanVk) {
      setShowVkModal(true);
      setVkAuthMessage('Укажите ваш цифровой ID профиля ВК для входа в 1 клик.');
      return;
    }

    setVkAuthBusy(true);
    setVkAuthMessage(null);
    sound.playWaxSeal();

    const res = await signInOrSignUpWithVkId(cleanVk, cleanVk);
    if (res.error) {
      setVkAuthBusy(false);
      setVkAuthMessage(res.error);
      setShowVkModal(true);
      return;
    }

    setCurrentVkId(res.vkId);
    setVkIdDraft(res.vkId);
    if (res.session?.user?.id) {
      setCurrentUserId(res.session.user.id);
    }

    // Refresh role from game_members and state from Supabase for this VK account
    if (isSupabaseConfigured()) {
      const roleInfo = await fetchUserRoleFromGameMembers();
      setUserRole(roleInfo.role);
      if (roleInfo.userId) setCurrentUserId(roleInfo.userId);
      setGameMembersList(roleInfo.members || []);
      if (roleInfo.role === 'gm' || roleInfo.role === 'creator') {
        setIsGmMode(true);
      } else if (!debugAdminEnabled) {
        setIsGmMode(false);
      }

      const remote = await pullStateFromSupabase();
      if (remote) {
        skipNextRemotePushRef.current = true;
        if (remote.characters?.length) setCharacters(remote.characters);
        if (remote.poleis?.length) setPoleis(remote.poleis);
        if (remote.lawChapters?.length) setLawChapters(remote.lawChapters);
        if (remote.politics?.offices?.length) setPolitics(remote.politics);
      }
    }

    setVkAuthBusy(false);
    setVkAuthMessage(
      `Вы успешно вошли через ВК ID: ${res.email} (пароль: ${res.vkId})`
    );
  };

  // Persist state locally and push to Supabase after initial hydration
  useEffect(() => {
    const existing = loadPersistedState() || {};
    const nextPayload = {
      ...existing,
      characters,
      poleis,
      lawChapters,
      politics,
    };
    savePersistedState(nextPayload);
    if (skipNextRemotePushRef.current) {
      skipNextRemotePushRef.current = false;
      return;
    }
    if (isSupabaseConfigured() && isSupabaseHydratedRef.current) {
      const canPushGlobal = userRole === 'gm' || userRole === 'creator';
      void pushStateToSupabase(nextPayload, {
        canPushGlobalTables: canPushGlobal,
      });
    }
  }, [characters, poleis, lawChapters, politics, userRole]);

  // Selected Map Polis
  const [selectedMapPolisId, setSelectedMapPolisId] = useState<string>('sinope');

  // Prefill from Onboarding Generator or "Create New Personal Sheet" CTA
  const [prefillNewChar, setPrefillNewChar] = useState<{
    name: string;
    gender: 'Мужской' | 'Женский';
    age?: number;
    nationality: string;
    currentPolisId?: string;
    nobleHouseOrParty?: string;
    drachmas?: number;
    status?: string;
    position?: string;
    economy?: CharacterSheet['economy'];
    inventory?: CharacterInventoryItem[];
    appearance: string;
    personality: string;
    backstory: string;
    portraitUrl?: string;
  } | null>(null);

  const livingCharacters = useMemo(
    () => characters.filter((c) => !c.isDeceased),
    [characters]
  );

  // Approved living characters for map & public RP lists
  const approvedLivingCharacters = useMemo(
    () =>
      livingCharacters.filter(
        (c) => c.approvalStatus !== 'pending' && c.approvalStatus !== 'rejected'
      ),
    [livingCharacters]
  );

  // Pending / frozen character sheets count for badge
  const pendingApprovalCount = useMemo(
    () =>
      livingCharacters.filter(
        (c) => c.approvalStatus === 'pending' || c.approvalStatus === 'rejected'
      ).length,
    [livingCharacters]
  );

  // Strictly 1 personal living character sheet per player
  const myLivingCharacter = useMemo(
    () => livingCharacters.find((c) => c.isPlayerOwned),
    [livingCharacters]
  );

  // Approved living personal character for voting in Politics (1 vote per approved living character)
  const myApprovedCharacter = useMemo(
    () =>
      myLivingCharacter &&
      myLivingCharacter.approvalStatus !== 'pending' &&
      myLivingCharacter.approvalStatus !== 'rejected'
        ? myLivingCharacter
        : undefined,
    [myLivingCharacter]
  );

  const myCharPolisName = useMemo(
    () =>
      poleis.find((p) => p.id === myLivingCharacter?.currentPolisId)?.name ||
      'Синопа',
    [poleis, myLivingCharacter]
  );

  // Admin privileges are granted ONLY if the user has 'gm' or 'creator' in Supabase `game_members`,
  // OR if temporary debug admin mode was enabled via the wax seal under "Отправить на Кладбище" in Profile.
  const hasAdminPrivileges =
    userRole === 'gm' || userRole === 'creator' || debugAdminEnabled;

  const effectiveIsGmMode = hasAdminPrivileges && isGmMode;

  const effectiveRole: GameMemberRole =
    userRole === 'creator' || debugAdminEnabled
      ? 'creator'
      : userRole === 'gm'
        ? 'gm'
        : 'player';

  const handleToggleDebugAdmin = () => {
    const next = !debugAdminEnabled;
    setDebugAdminEnabled(next);
    if (next) {
      setIsGmMode(true);
    } else if (userRole === 'player') {
      setIsGmMode(false);
      if (activeSection === 'pending_registry') {
        setActiveSection('profile');
      }
    }
  };

  // Handlers: Onboarding -> Registry Create
  const handleApplyOnboardingPreset = (preset: {
    name: string;
    gender: 'Мужской' | 'Женский';
    age?: number;
    nationality: string;
    currentPolisId?: string;
    nobleHouseOrParty?: string;
    drachmas?: number;
    status?: string;
    position?: string;
    economy?: CharacterSheet['economy'];
    inventory?: CharacterInventoryItem[];
    appearance: string;
    personality: string;
    backstory: string;
    portraitUrl?: string;
  }) => {
    setPrefillNewChar(preset);
    setShowOnboarding(false);
    setActiveSection('registry');
  };

  // Trigger opening the Create New Personal Character Tab in Registry
  const handleGoToCreateNewPersonalSheet = () => {
    setPrefillNewChar({
      name: '',
      gender: 'Мужской',
      nationality: 'Эллины Понта (Синопейцы и Ионийцы)',
      appearance: '',
      personality: '',
      backstory: '',
    });
    setActiveSection('registry');
  };

  // Handlers: Registry & Graveyard & Frozen Approval Queue
  const handleCreateCharacter = (
    newCharData: Omit<CharacterSheet, 'id' | 'createdAt'>,
    asPlayerOwned: boolean
  ) => {
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : toUuid(`char-${Date.now()}`);
    const shouldBePlayerOwned = asPlayerOwned || !myLivingCharacter;

    // Newly created characters are frozen ('pending') until approved by 1 GM or Creator
    const initialApprovalStatus =
      effectiveRole === 'creator' ? 'approved' : 'pending';

    const created: CharacterSheet = {
      ...newCharData,
      id: newId,
      isPlayerOwned: shouldBePlayerOwned,
      approvalStatus: initialApprovalStatus,
      createdAt: '110 г. до н.э. · Новая запись',
    };

    if (isSupabaseConfigured()) {
      void syncSingleCharacterToSupabase(created);
    }

    setCharacters((prev) => {
      const normalized = shouldBePlayerOwned
        ? prev.map((c) =>
            !c.isDeceased && c.isPlayerOwned ? { ...c, isPlayerOwned: false } : c
          )
        : prev;
      return [created, ...normalized];
    });

    setSelectedMapPolisId(created.currentPolisId);
    setActiveSection(hasAdminPrivileges ? 'pending_registry' : 'profile');
  };

  const handleApproveCharacter = (charId: string, approverLabel: string) => {
    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== charId) return c;
        const updated: CharacterSheet = {
          ...c,
          approvalStatus: 'approved',
          approvedBy: approverLabel,
          gmApprovalNote: approverLabel,
          rejectionReason: undefined,
        };
        if (isSupabaseConfigured()) {
          void syncSingleCharacterToSupabase(updated, { canEditAny: true });
        }
        return updated;
      })
    );
  };

  const handleRejectCharacter = (charId: string, reason: string) => {
    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== charId) return c;
        const updated: CharacterSheet = {
          ...c,
          approvalStatus: 'rejected',
          gmApprovalNote: reason,
          rejectionReason: reason,
        };
        if (isSupabaseConfigured()) {
          void syncSingleCharacterToSupabase(updated, { canEditAny: true });
        }
        return updated;
      })
    );
  };

  const handleBuryCharacter = (
    charId: string,
    deathDate: string,
    deathCause: string,
    epitaph: string
  ) => {
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === charId
          ? {
              ...c,
              isDeceased: true,
              deathDate,
              deathCause,
              epitaph,
            }
          : c
      )
    );
  };

  const handleRestoreCharacter = (charId: string) => {
    setCharacters((prev) => {
      const target = prev.find((c) => c.id === charId);
      const alreadyHasLivingPersonal = prev.some(
        (c) => !c.isDeceased && c.isPlayerOwned && c.id !== charId
      );
      return prev.map((c) => {
        if (c.id !== charId) return c;
        return {
          ...c,
          isDeceased: false,
          // Keep 1-personal-character invariant even if GM restores an old sheet
          isPlayerOwned: target?.isPlayerOwned && !alreadyHasLivingPersonal,
        };
      });
    });
  };

  const handleDeleteCharacter = (charId: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== charId));
    if (isSupabaseConfigured()) {
      void deleteCharacterFromSupabase(charId);
    }
  };

  // Handlers: Profile & Economy
  const handleUpdateCharacterMeta = (
    charId: string,
    updates: Partial<CharacterSheet>
  ) => {
    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== charId) return c;
        const updated = { ...c, ...updates };
        if (isSupabaseConfigured()) {
          void syncSingleCharacterToSupabase(updated, {
            canEditAny: hasAdminPrivileges,
          });
        }
        return updated;
      })
    );
    if (updates.currentPolisId) {
      setSelectedMapPolisId(updates.currentPolisId);
    }
  };

  const handleBuyPolisResource = (
    charId: string,
    resource: PolisResource,
    quantity: number
  ) => {
    const totalCost = resource.localBuyPrice * quantity;
    const targetChar = characters.find((c) => c.id === charId);
    const polisName =
      poleis.find((p) => p.id === targetChar?.currentPolisId)?.name || 'Синопа';

    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== charId || c.drachmas < totalCost) return c;
        const newItem: CharacterInventoryItem = {
          id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: resource.name,
          category: resource.category,
          quantity,
          unit: resource.unit,
          acquisitionMethod: `Закуплено на сырьевом рынке полиса ${polisName} по ${resource.localBuyPrice} др./ед. (всего ${totalCost} драхм)`,
          purchasePriceDrachmas: resource.localBuyPrice,
          marketPriceDrachmas: resource.avgMarketPrice,
          originPolis: polisName,
        };
        return {
          ...c,
          drachmas: c.drachmas - totalCost,
          inventory: [newItem, ...c.inventory],
        };
      })
    );
  };

  const handleSellInventoryItem = (
    charId: string,
    itemId: string,
    sellPricePerUnit: number
  ) => {
    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== charId) return c;
        const item = c.inventory.find((i) => i.id === itemId);
        if (!item) return c;
        const payout = sellPricePerUnit * item.quantity;
        return {
          ...c,
          drachmas: c.drachmas + payout,
          inventory: c.inventory.filter((i) => i.id !== itemId),
        };
      })
    );
  };

  const handleSendCaravan = (
    charId: string,
    itemId: string,
    destPolisId: string,
    travelWithCaravan: boolean
  ) => {
    const char = characters.find((c) => c.id === charId);
    if (!char) return;
    const item = char.inventory.find((i) => i.id === itemId);
    if (!item) return;

    const unitPayout = Math.round(item.marketPriceDrachmas * 1.2);
    const totalPayout = unitPayout * item.quantity;
    const fromPolis =
      poleis.find((p) => p.id === char.currentPolisId)?.name || 'Синопа';
    const toPolis =
      poleis.find((p) => p.id === destPolisId)?.name || 'Никомедион';

    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== charId) return c;
        return {
          ...c,
          drachmas: c.drachmas + totalPayout,
          currentPolisId: travelWithCaravan ? destPolisId : c.currentPolisId,
          inventory: c.inventory.filter((i) => i.id !== itemId),
        };
      })
    );

    // Record caravan arrival in destination Polis RP Events
    setPoleis((prev) =>
      prev.map((p) => {
        if (p.id !== destPolisId) return p;
        return {
          ...p,
          rpEvents: [
            {
              id: `ev-caravan-${Date.now()}`,
              dateLabel: '110 г. до н.э. · Торговый Рейс',
              title: `Прибытие каравана из полиса ${fromPolis} (${char.name})`,
              summary: `Доставлен груз: «${item.name}» (${item.quantity} ${item.unit}). Сделка с купцами ${toPolis} принесла ${totalPayout} драхм.`,
              participants: [char.name],
            },
            ...p.rpEvents,
          ],
        };
      })
    );

    if (travelWithCaravan) {
      setSelectedMapPolisId(destPolisId);
    }
  };

  const handleAddCustomInventoryItem = (
    charId: string,
    item: Omit<CharacterInventoryItem, 'id'>
  ) => {
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === charId
          ? {
              ...c,
              inventory: [
                { ...item, id: `inv-custom-${Date.now()}` },
                ...c.inventory,
              ],
            }
          : c
      )
    );
  };

  const handleDeleteInventoryItem = (charId: string, itemId: string) => {
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === charId
          ? { ...c, inventory: c.inventory.filter((i) => i.id !== itemId) }
          : c
      )
    );
  };

  // Handlers: GM Map & Polis Updates
  const handleGmUpdatePolis = (polisId: string, updates: Partial<PolisData>) => {
    setPoleis((prev) =>
      prev.map((p) => (p.id === polisId ? { ...p, ...updates } : p))
    );
  };

  const handleGmAddPolisOnMap = (
    name: string,
    region: string,
    coords: { x: number; y: number }
  ) => {
    const newId = `polis-${Date.now()}`;
    const newPolis: PolisData = {
      id: newId,
      name,
      greekName: name.toUpperCase(),
      region,
      coords,
      realLatLng: 'Окрестности Синопского полуострова',
      shortSummary:
        'Новое поселение или укреплённая гавань, нанесённая Гейм-Мастером на карту Понта.',
      fullDescription:
        'Новая точка интереса для ролевого отыгрыша, торговли и дипломатии в окрестностях Синопы. ГМ может отредактировать описание, добавить постройки и фракции NPC.',
      rulingBody: 'Совет колонии и гарнизон',
      resources: [
        {
          id: `res-${Date.now()}`,
          name: 'Местное сырьё и припасы',
          category: 'Материалы и сырьё',
          unit: 'партия',
          localBuyPrice: 20,
          avgMarketPrice: 34,
          abundance: 'Норма',
        },
      ],
      buildings: [
        {
          id: `bld-${Date.now()}`,
          name: 'Укреплённая пристань и меновой двор',
          district: 'Гавань и Верфи',
          ownerOrController: 'Община полиса',
          description: 'Причал для приёма торговых судов и караванов.',
          productionHint: 'Открыто для торговли.',
        },
      ],
      npcFactions: [
        {
          id: `npc-${Date.now()}`,
          name: 'Местная община поселенцев',
          influencePercent: 100,
          publicStance:
            'Заинтересованы в подвозе инструментов, зерна и охране.',
          supportedPlayerFaction: 'Нейтралитет / Вне фракций',
          gmNotes: 'Новый полис на карте Понта.',
        },
      ],
      rpEvents: [],
    };

    setPoleis((prev) => [...prev, newPolis]);
    setSelectedMapPolisId(newId);
  };

  // Handler: GM Add, Edit & Delete Law Article
  const handleAddLawArticle = (
    chapterId: string,
    articleNumber: string,
    title: string,
    text: string,
    clauses: string[]
  ) => {
    setLawChapters((prev) =>
      prev.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              articles: [
                ...c.articles,
                {
                  id: `art-${Date.now()}`,
                  number: articleNumber,
                  title,
                  text,
                  clauses,
                },
              ],
            }
          : c
      )
    );
  };

  const handleUpdateLawArticle = (
    chapterId: string,
    articleId: string,
    updates: {
      number: string;
      title: string;
      text: string;
      clauses: string[];
    }
  ) => {
    setLawChapters((prev) =>
      prev.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              articles: c.articles.map((a) =>
                a.id === articleId ? { ...a, ...updates } : a
              ),
            }
          : c
      )
    );
  };

  const handleDeleteLawArticle = (chapterId: string, articleId: string) => {
    setLawChapters((prev) =>
      prev.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              articles: c.articles.filter((a) => a.id !== articleId),
            }
          : c
      )
    );
    if (isSupabaseConfigured()) {
      void deleteLawArticleFromSupabase(articleId);
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    sound.enabled = next;
    setSoundEnabled(next);
    if (next) sound.playStoneTap();
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#E2DAC2] pb-24 md:pb-12 overflow-x-hidden">
      {/* Onboarding Modal with Giant Skip Training Button */}
      {showOnboarding && (
        <OnboardingModal
          onSkipOrClose={() => setShowOnboarding(false)}
          onApplyPresetToNewCharacter={handleApplyOnboardingPreset}
        />
      )}

      {/* Top Navigation Bar — Responsive & Overflow-Safe */}
      <header className="sticky top-0 z-30 bg-[#121820]/95 backdrop-blur-md border-b border-[#D4AF37]/30 px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 xl:gap-5">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              sound.playStoneTap();
              setActiveSection('profile');
            }}
            className="font-epigraphic text-sm sm:text-lg font-bold tracking-widest text-[#F3E5AB] whitespace-nowrap shrink-0"
          >
            PONTUS EUXINUS
          </a>

          {/* Zone 2: 6 Desktop Navigation Links */}
          <nav className="hidden md:flex flex-wrap items-center gap-4 lg:gap-6 text-xs font-epigraphic tracking-wider">
            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setActiveSection('profile');
              }}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                activeSection === 'profile'
                  ? 'text-[#E5C158] border-[#E5C158]'
                  : 'text-[#C2B280] border-transparent hover:text-[#F3E5AB]'
              }`}
            >
              Профиль и Экономика
            </button>

            {hasAdminPrivileges && (
              <button
                type="button"
                onClick={() => {
                  sound.playStoneTap();
                  setActiveSection('pending_registry');
                }}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeSection === 'pending_registry'
                    ? 'text-[#E5C158] border-[#E5C158]'
                    : 'text-[#C2B280] border-transparent hover:text-[#F3E5AB]'
                }`}
              >
                <span>Проверка Анкет</span>
                {pendingApprovalCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#E5C158] text-[#0B0F14] text-[10px] font-bold">
                    {pendingApprovalCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setActiveSection('registry');
              }}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                activeSection === 'registry'
                  ? 'text-[#E5C158] border-[#E5C158]'
                  : 'text-[#C2B280] border-transparent hover:text-[#F3E5AB]'
              }`}
            >
              Реестр и Кладбище
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setActiveSection('politics');
              }}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                activeSection === 'politics'
                  ? 'text-[#E5C158] border-[#E5C158]'
                  : 'text-[#C2B280] border-transparent hover:text-[#F3E5AB]'
              }`}
            >
              Политика
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setActiveSection('map');
              }}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                activeSection === 'map'
                  ? 'text-[#E5C158] border-[#E5C158]'
                  : 'text-[#C2B280] border-transparent hover:text-[#F3E5AB]'
              }`}
            >
              Карта и Полисы
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setActiveSection('laws_wiki');
              }}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                activeSection === 'laws_wiki'
                  ? 'text-[#E5C158] border-[#E5C158]'
                  : 'text-[#C2B280] border-transparent hover:text-[#F3E5AB]'
              }`}
            >
              Законы и Вики
            </button>
          </nav>

          {/* Zone 3: Primary Action Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playCoinClink();
                setShowOnboarding(true);
              }}
              className="min-h-[38px] px-3 sm:px-4 py-1.5 sm:py-2 rounded btn-golden-stater text-[11px] sm:text-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              Обучение и Генератор
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Toolbar Below Header: Single Personal Character Status + GM Mode Switch */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4">
        <div className="stele-panel px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Current Personal Character Quick Info (Strictly 1 Personal Sheet) */}
          <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
            <LaurelWreathBadge size={24}>
              <span className="text-[10px] font-bold text-[#E5C158]">I</span>
            </LaurelWreathBadge>
            <span className="font-epigraphic uppercase text-[#C2B280]">
              Ваша личная анкета (макс. 1):
            </span>

            {myLivingCharacter ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    sound.playStoneTap();
                    setActiveSection('profile');
                  }}
                  className="font-display text-sm font-bold text-[#F3E5AB] hover:text-[#E5C158] cursor-pointer truncate max-w-[180px] sm:max-w-none"
                >
                  {myLivingCharacter.name}
                </button>
                <span aria-hidden="true" className="text-[#7C786A]">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sound.playStoneTap();
                    setSelectedMapPolisId(myLivingCharacter.currentPolisId);
                    setActiveSection('map');
                  }}
                  className="font-epigraphic text-[#E5C158] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>Полис: {myCharPolisName}</span>
                </button>
                <span aria-hidden="true" className="text-[#7C786A]">
                  ·
                </span>
                <span className="font-epigraphic font-bold text-[#8EBDA2] tabular-nums">
                  {myLivingCharacter.drachmas.toLocaleString('ru-RU')} драхм
                </span>
                {myLivingCharacter.approvalStatus === 'pending' && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSection(
                        hasAdminPrivileges ? 'pending_registry' : 'profile'
                      )
                    }
                    className="px-2 py-0.5 rounded bg-[#E5C158]/20 border border-[#E5C158] text-[10px] font-epigraphic text-[#E5C158] cursor-pointer"
                  >
                    На проверке ГМ
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#D47A6A] font-epigraphic flex items-center gap-1">
                  <Skull className="w-3.5 h-3.5 shrink-0" />
                  Персонаж в Некрополе — требуется новая анкета
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sound.playCoinClink();
                    handleGoToCreateNewPersonalSheet();
                  }}
                  className="px-2.5 py-1 rounded btn-golden-stater text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Создать нового персонажа</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: 1-Button VK ID Login, Role-Restricted GM Mode Toggle & Sound Toggle */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                const envVk = detectVkUserIdFromEnvironment();
                if (envVk.fromVkLaunchParams && envVk.vkId && !currentVkId) {
                  void handleOneClickVkLogin(envVk.vkId);
                } else {
                  setShowVkModal(true);
                }
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded text-xs font-epigraphic flex items-center justify-center gap-1.5 cursor-pointer border transition-colors ${
                currentVkId
                  ? 'bg-[#1D3557] text-[#F3E5AB] border-[#E5C158]'
                  : 'btn-golden-stater'
              }`}
              title="Автовход в 1 клик через ВК ID (<id>@mail.ru / пароль: ID)"
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span>
                {currentVkId
                  ? `ВК: ${currentVkId}@mail.ru`
                  : 'Войти через ВК ID (1 клик)'}
              </span>
            </button>

            {hasAdminPrivileges ? (
              <button
                type="button"
                onClick={() => {
                  sound.playWaxSeal();
                  setIsGmMode(!isGmMode);
                }}
                className={`min-h-[38px] flex-1 sm:flex-initial px-3 py-1.5 rounded text-xs font-epigraphic flex items-center justify-center gap-1.5 cursor-pointer border transition-colors ${
                  effectiveIsGmMode
                    ? 'bg-[#8B2635] text-[#F3E5AB] border-[#E5C158] votive-glow'
                    : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:text-[#F3E5AB]'
                }`}
                title="Включает секретные данные фракций NPC, проверку анкет, интерактивный редактор карты и редактирование законов"
              >
                <Crown className="w-3.5 h-3.5 text-[#E5C158] shrink-0" />
                <span>
                  {debugAdminEnabled
                    ? effectiveIsGmMode
                      ? 'Админ (Отладка): ВКЛ'
                      : 'Админ (Отладка): Пауза'
                    : userRole === 'creator'
                      ? effectiveIsGmMode
                        ? 'Роль: Создатель (ГМ ВКЛ)'
                        : 'Роль: Создатель'
                      : effectiveIsGmMode
                        ? 'Режим ГМ: ВКЛ'
                        : 'Включить Режим ГМ'}
                </span>
              </button>
            ) : (
              <span
                className="min-h-[38px] px-3 py-1.5 rounded bg-[#151C25] border border-[#263140] text-xs font-epigraphic text-[#9A9587] flex items-center gap-1.5 select-none"
                title="Обычный аккаунт игрока (админ-функции доступны только ролям GM и Creator в game_members)"
              >
                <Users className="w-3.5 h-3.5 text-[#8EBDA2] shrink-0" />
                <span>Роль: Игрок</span>
              </span>
            )}

            <button
              type="button"
              onClick={toggleSound}
              className="min-h-[38px] px-2.5 py-1.5 rounded bg-[#1B232E] border border-[#263140] text-xs font-epigraphic text-[#C2B280] hover:text-[#F3E5AB] flex items-center gap-1 cursor-pointer shrink-0"
              title="Звуковой отклик"
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-[#E5C158]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-[#7C786A]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 1-Button VK ID Auth Modal (`<vk_id>@mail.ru` / password = `<vk_id>`) */}
      {showVkModal && (
        <div
          className="fixed inset-0 z-50 bg-[#0B0F14]/85 backdrop-blur-xs p-4 flex items-center justify-center"
          onClick={() => setShowVkModal(false)}
        >
          <div
            className="w-full max-w-md stele-panel border-2 border-[#D4AF37] p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#263140] pb-3">
              <div>
                <span className="font-epigraphic text-[11px] uppercase text-[#E5C158]">
                  Авторизация ВК Mini Apps · Supabase Auth
                </span>
                <h3 className="font-display text-xl font-bold text-[#F3E5AB] mt-0.5">
                  Вход в 1 клик по ID профиля ВК
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVkModal(false)}
                className="p-1.5 rounded bg-[#1B232E] text-[#C2B280] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#C2B280] leading-relaxed">
              При запуске внутри ВК ваш <code className="text-[#E5C158]">vk_user_id</code> подхватывается автоматически. Для входа или смены аккаунта введите ваш ID ВК (или <code className="text-[#E5C158]">id@mail.ru</code>) — логин <code className="text-[#F3E5AB]">{formatVkEmail(vkIdDraft || '123456789')}</code> и пароль <code className="text-[#F3E5AB]">{normalizeVkIdInput(vkIdDraft) || '123456789'}</code> подставятся сами в 1 кнопку:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleOneClickVkLogin(vkIdDraft);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                  ID профиля ВК или id@mail.ru
                </label>
                <div className="wax-recess px-3 py-2">
                  <input
                    type="text"
                    required
                    value={vkIdDraft}
                    onChange={(e) => setVkIdDraft(e.target.value)}
                    placeholder="Например: 245819203 или 245819203@mail.ru"
                    className="w-full bg-transparent text-sm text-[#F3E5AB] focus:outline-none"
                  />
                </div>
              </div>

              {vkIdDraft.trim() && (
                <div className="p-2.5 rounded bg-[#1B232E] border border-[#263140] text-xs space-y-1 font-mono">
                  <div className="text-[#C2B280]">
                    Логин Supabase:{' '}
                    <span className="text-[#E5C158]">
                      {formatVkEmail(vkIdDraft)}
                    </span>
                  </div>
                  <div className="text-[#C2B280]">
                    Пароль Supabase:{' '}
                    <span className="text-[#8EBDA2]">
                      {normalizeVkIdInput(vkIdDraft)}
                    </span>
                  </div>
                </div>
              )}

              {vkAuthMessage && (
                <div className="p-3 rounded bg-[#1B232E] border border-[#D4AF37] text-xs text-[#F3E5AB]">
                  {vkAuthMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={vkAuthBusy}
                className="w-full min-h-[44px] px-4 py-2.5 rounded btn-golden-stater text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {vkAuthBusy
                    ? 'Входим в Supabase...'
                    : 'Войти / Авто-регистрация в 1 клик'}
                </span>
              </button>
            </form>

            {/* Current Supabase UUID & Role for game_members */}
            <div className="p-3 rounded bg-[#0B0F14] border border-[#263140] space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-epigraphic text-[#C2B280]">
                  Текущая роль в `game_members`:
                </span>
                <span className="font-epigraphic font-bold text-[#E5C158] uppercase">
                  {effectiveRole}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-[#8EBDA2] truncate">
                  UUID: {currentUserId}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(currentUserId);
                    sound.playStoneTap();
                    setCopiedUuid(true);
                    setTimeout(() => setCopiedUuid(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#9A7B38]/60 text-[11px] text-[#E5C158] flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedUuid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8EBDA2]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedUuid ? 'Скопировано' : 'Копировать UUID'}</span>
                </button>
              </div>

              {currentVkId && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playStoneTap();
                      signOutVkSession();
                      setCurrentVkId(null);
                      setVkIdDraft('');
                      setVkAuthMessage('Вы вышли из аккаунта ВК ID.');
                    }}
                    className="text-[11px] font-epigraphic text-[#F1A9B2] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Сменить аккаунт ВК</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Stage */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-5">
        {activeSection === 'profile' && (
          <ProfileEconomyView
            character={myLivingCharacter}
            poleis={poleis}
            globalEconomy={politics.globalEconomy || INITIAL_GLOBAL_ECONOMY}
            onUpdateGlobalEconomy={(nextEcon) =>
              setPolitics((prev) => ({
                ...prev,
                globalEconomy: nextEcon,
              }))
            }
            onRecordPolisChronicle={(polisId, title, summary) => {
              setPoleis((prev) =>
                prev.map((p) =>
                  p.id === polisId
                    ? {
                        ...p,
                        rpEvents: [
                          {
                            id: `ev-econ-${Date.now()}`,
                            dateLabel: '110 г. до н.э. · Экономика',
                            title,
                            summary,
                            participants: myLivingCharacter
                              ? [myLivingCharacter.name]
                              : [],
                          },
                          ...p.rpEvents,
                        ],
                      }
                    : p
                )
              );
            }}
            isGmMode={effectiveIsGmMode}
            debugAdminEnabled={debugAdminEnabled}
            onToggleDebugAdmin={handleToggleDebugAdmin}
            onGoToCreateNewPersonalSheet={handleGoToCreateNewPersonalSheet}
            onOpenPendingRegistry={() => setActiveSection('pending_registry')}
            onUpdateCharacterMeta={handleUpdateCharacterMeta}
            onBuyPolisResource={handleBuyPolisResource}
            onSellInventoryItem={handleSellInventoryItem}
            onSendCaravan={handleSendCaravan}
            onAddCustomInventoryItem={handleAddCustomInventoryItem}
            onDeleteInventoryItem={handleDeleteInventoryItem}
            onJumpToPolisCard={(polisId) => {
              setSelectedMapPolisId(polisId);
              setActiveSection('map');
            }}
            onBuryMyCharacter={(charId, deathDate, deathCause, epitaph) => {
              handleBuryCharacter(charId, deathDate, deathCause, epitaph);
            }}
          />
        )}

        {activeSection === 'pending_registry' && hasAdminPrivileges && (
          <PendingApprovalRegistryView
            characters={characters}
            poleis={poleis}
            isGmOrCreator={hasAdminPrivileges && effectiveIsGmMode}
            currentUserRole={effectiveRole}
            currentUserId={currentUserId}
            onApproveCharacter={(charId, gmNote) =>
              handleApproveCharacter(
                charId,
                gmNote || 'Одобрено Гейм-Мастером'
              )
            }
            onRejectCharacter={handleRejectCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onOpenCreateCharacter={handleGoToCreateNewPersonalSheet}
            onJumpToPolis={(polisId) => {
              setSelectedMapPolisId(polisId);
              setActiveSection('map');
            }}
          />
        )}

        {activeSection === 'registry' && (
          <RegistryGraveyardView
            characters={characters}
            poleis={poleis}
            myLivingCharacter={myLivingCharacter}
            isGmMode={effectiveIsGmMode}
            prefillNewChar={prefillNewChar}
            onClearPrefill={() => setPrefillNewChar(null)}
            onOpenMyProfile={() => setActiveSection('profile')}
            onCreateCharacter={handleCreateCharacter}
            onUpdateCharacterAge={(charId, newAge) =>
              handleUpdateCharacterMeta(charId, { age: newAge })
            }
            onBuryCharacter={handleBuryCharacter}
            onRestoreCharacter={handleRestoreCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onJumpToPolis={(polisId) => {
              setSelectedMapPolisId(polisId);
              setActiveSection('map');
            }}
          />
        )}

        {activeSection === 'politics' && (
          <PoliticsView
            politics={politics}
            livingApprovedCharacters={approvedLivingCharacters}
            myApprovedCharacter={myApprovedCharacter}
            currentUserRole={effectiveRole}
            currentUserId={currentUserId}
            gameMembersList={
              gameMembersList.length > 0
                ? gameMembersList
                : currentUserId
                  ? [{ userId: currentUserId, role: effectiveRole }]
                  : []
            }
            isGmMode={effectiveIsGmMode}
            onUpdatePolitics={setPolitics}
          />
        )}

        {activeSection === 'map' && (
          <PontusMapPolisView
            poleis={poleis}
            selectedPolisId={selectedMapPolisId}
            onSelectPolis={(id) => setSelectedMapPolisId(id)}
            livingCharacters={approvedLivingCharacters}
            isGmMode={effectiveIsGmMode}
            onInspectCharacterInRegistry={() => {
              setActiveSection('registry');
            }}
            onGmUpdatePolis={handleGmUpdatePolis}
            onGmAddPolisOnMap={handleGmAddPolisOnMap}
          />
        )}

        {activeSection === 'laws_wiki' && (
          <WikiLawsView
            lawChapters={lawChapters}
            wikiSections={wikiSections}
            isGmMode={effectiveIsGmMode}
            onAddLawArticle={handleAddLawArticle}
            onUpdateLawArticle={handleUpdateLawArticle}
            onDeleteLawArticle={handleDeleteLawArticle}
            onOpenOnboardingGuide={() => setShowOnboarding(true)}
          />
        )}
      </main>

      {/* Fixed Mobile Bottom Navigation Bar (<768px) */}
      <nav
        aria-label="Мобильная навигация"
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121820]/98 backdrop-blur-md border-t border-[#D4AF37]/30 grid ${
          hasAdminPrivileges ? 'grid-cols-6' : 'grid-cols-5'
        } items-center h-15 px-1`}
      >
        <button
          type="button"
          onClick={() => {
            sound.playStoneTap();
            setActiveSection('profile');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeSection === 'profile' ? 'text-[#E5C158]' : 'text-[#C2B280]'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span className="text-[9px] font-epigraphic mt-0.5 truncate max-w-full">
            Профиль
          </span>
        </button>

        {hasAdminPrivileges && (
          <button
            type="button"
            onClick={() => {
              sound.playStoneTap();
              setActiveSection('pending_registry');
            }}
            className={`min-h-[44px] relative flex flex-col items-center justify-center cursor-pointer ${
              activeSection === 'pending_registry'
                ? 'text-[#E5C158]'
                : 'text-[#C2B280]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[9px] font-epigraphic mt-0.5 truncate max-w-full">
              Проверка
            </span>
            {pendingApprovalCount > 0 && (
              <span className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full bg-[#E5C158] text-[#0B0F14] text-[8px] font-bold flex items-center justify-center">
                {pendingApprovalCount}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            sound.playStoneTap();
            setActiveSection('registry');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeSection === 'registry' ? 'text-[#E5C158]' : 'text-[#C2B280]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[9px] font-epigraphic mt-0.5 truncate max-w-full">
            Реестр
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playStoneTap();
            setActiveSection('politics');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeSection === 'politics' ? 'text-[#E5C158]' : 'text-[#C2B280]'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span className="text-[9px] font-epigraphic mt-0.5 truncate max-w-full">
            Политика
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playStoneTap();
            setActiveSection('map');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeSection === 'map' ? 'text-[#E5C158]' : 'text-[#C2B280]'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span className="text-[9px] font-epigraphic mt-0.5 truncate max-w-full">
            Карта
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playStoneTap();
            setActiveSection('laws_wiki');
          }}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeSection === 'laws_wiki' ? 'text-[#E5C158]' : 'text-[#C2B280]'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span className="text-[9px] font-epigraphic mt-0.5 truncate max-w-full">
            Законы
          </span>
        </button>
      </nav>
    </div>
  );
}

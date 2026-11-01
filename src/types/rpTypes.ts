export type NationalityId =
  | 'hellenes'
  | 'scythians'
  | 'persians'
  | 'armenians'
  | 'heniochi_colchians'
  | 'chalybes_paphlagonians';

export type GameMemberRole = 'player' | 'gm' | 'creator';

export type CharacterApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface NationalityPreset {
  id: NationalityId;
  name: string;
  greekSubtitle: string;
  homeland: string;
  summary: string;
  maleNames: string[];
  femaleNames: string[];
  familyOrPatronymics: string[];
  appearances: string[];
  temperaments: string[];
  backstories: string[];
}

export type PropertyCategory =
  | 'Материалы и сырьё'
  | 'Караванный товар'
  | 'Мастерская / Земля'
  | 'Корабль / Повозка'
  | 'Личное снаряжение';

export interface CharacterInventoryItem {
  id: string;
  name: string;
  category: PropertyCategory;
  quantity: number;
  unit: string;
  acquisitionMethod: string; // Каким образом или за какую сумму приобретено
  purchasePriceDrachmas: number; // Сумма приобретения за 1 ед.
  marketPriceDrachmas: number; // Средняя рыночная стоимость у торговцев за 1 ед.
  originPolis: string;
  notes?: string;
}

export interface CharacterKeyEvent {
  id: string;
  title: string; // Напр.: Выиграл «Старые игры» в Малой Олимпии
  dateLabel: string; // Напр.: 110 г. до н.э. · Таргелион
  addedBy: 'Игрок (Развитие персонажа)' | 'ГМ (Ивент / Событие РП)';
  description: string; // Как и почему начал меняться персонаж / описание ивента
  characterChangeNote?: string; // Как именно изменились взгляды, характер или положение
}

export interface CharacterSheet {
  id: string;
  ownerUserId?: string;
  isPlayerOwned?: boolean; // Своя личная анкета игрока (может быть только 1 живая!)
  approvalStatus?: CharacterApprovalStatus; // 'pending' (заморожена после создания) | 'approved' | 'rejected'
  gmApprovalNote?: string; // Комментарий ГМа при проверке анкеты
  approvedByGmId?: string;
  portraitUrl?: string; // Прикреплённое изображение / портрет персонажа (Data URL или ссылка)
  name: string;
  gender: 'Мужской' | 'Женский';
  age: number;
  nationality: string;
  currentPolisId: string;
  status: string;
  position: string;
  nobleHouseOrParty: string;
  drachmas: number;
  appearance: string;
  personality: string;
  backstory: string;
  keyEvents: CharacterKeyEvent[];
  inventory: CharacterInventoryItem[];
  isDeceased: boolean;
  deathDate?: string;
  deathCause?: string;
  epitaph?: string;
  createdAt: string;
}

export interface PolisResource {
  id: string;
  name: string;
  category: PropertyCategory;
  unit: string;
  localBuyPrice: number;
  avgMarketPrice: number;
  abundance: 'Избыток' | 'Норма' | 'Дефицит';
}

export interface PolisBuilding {
  id: string;
  name: string;
  district:
    | 'Акрополь'
    | 'Агора и Рынок'
    | 'Гавань и Верфи'
    | 'Ремесленный Квартал'
    | 'Храмовый Участок';
  ownerOrController: string;
  description: string;
  productionHint: string;
}

export interface PolisNpcFaction {
  id: string;
  name: string;
  influencePercent: number;
  publicStance: string;
  supportedPlayerFaction: string; // Видно и редактируется только в режиме ГМ
  gmNotes: string;
}

export interface PolisRpEvent {
  id: string;
  dateLabel: string;
  title: string;
  summary: string;
  participants: string[];
}

export interface PolisData {
  id: string;
  name: string;
  greekName: string;
  region: string;
  realLatLng?: string;
  coords: { x: number; y: number }; // 0..800, 0..480 on the Sinope Peninsula map
  shortSummary: string;
  fullDescription: string;
  rulingBody: string;
  resources: PolisResource[];
  buildings: PolisBuilding[];
  npcFactions: PolisNpcFaction[];
  rpEvents: PolisRpEvent[];
}

export interface LawArticle {
  id: string;
  number: string;
  title: string;
  text: string;
  clauses?: string[];
}

export interface LawChapter {
  id: string;
  romanNumeral: string;
  title: string;
  subtitle: string;
  articles: LawArticle[];
}

export interface WikiSection {
  id: string;
  category:
    | 'Основы РП'
    | 'Экономика и Караваны'
    | 'Устройство Полисов'
    | 'Партии и Роды'
    | 'Боевая Система';
  title: string;
  summary: string;
  content: string[];
}

// ============================================================================
// ПОЛИТИКА ПОНТИДЫ: ДОЛЖНОСТИ, КОНСЕНСУС 3 ГМов / СОЗДАТЕЛЯ И ГОЛОСОВАНИЯ
// ============================================================================

export interface PoliticalOffice {
  id: string;
  title: string; // Напр.: «Архонт Понтиды»
  greekTitle: string;
  isSupremeFixed?: boolean; // Архонта Понтиды нельзя удалить (только изменить занимающего и описание)
  holderName: string;
  holderCharacterId?: string;
  faction: string;
  polisName: string;
  powersAndDuties: string;
  termLabel: string;
}

export type PoliticalProposalActionType =
  | 'update_office'
  | 'add_office'
  | 'delete_office'
  | 'create_bill'
  | 'delete_bill'
  | 'conclude_bill'
  | 'create_election'
  | 'delete_election'
  | 'conclude_election';

export interface GmApprovalSignature {
  userId: string;
  role: GameMemberRole;
  approvedAt: string;
}

export interface PendingPoliticalProposal {
  id: string;
  actionType: PoliticalProposalActionType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  createdByUserId: string;
  createdAt: string;
  approvals: GmApprovalSignature[]; // Для вступления в силу нужны 3 разных userId с ролью gm (или мгновенно от creator)
}

export interface PoliticalBillVote {
  characterId: string;
  characterName: string;
  choice: 'for' | 'against'; // Строго «За» или «Против»
  votedAt: string;
}

export interface PoliticalBill {
  id: string;
  numberLabel: string;
  title: string;
  category: string;
  summary: string;
  fullText: string;
  authorName: string;
  status: 'active' | 'passed' | 'rejected';
  createdAt: string;
  votes: PoliticalBillVote[];
}

export interface ElectionCandidate {
  id: string;
  characterId?: string;
  name: string;
  faction: string;
  polisName: string;
  age: number;
  slogan: string;
  program: string; // Подробная предвыборная программа кандидата
  biographySummary: string;
  keyPromises: string[];
}

export interface OfficeElectionVote {
  characterId: string;
  characterName: string;
  candidateId: string | 'none_of_the_above'; // Либо ID кандидата, либо «Ни один из кандидатов»
  votedAt: string;
}

export interface OfficeElection {
  id: string;
  officeId: string;
  officeTitle: string;
  termLabel: string;
  description: string;
  status: 'active' | 'concluded';
  candidates: ElectionCandidate[];
  votes: OfficeElectionVote[];
}

export interface PoliticsState {
  offices: PoliticalOffice[];
  pendingProposals: PendingPoliticalProposal[];
  bills: PoliticalBill[];
  elections: OfficeElection[];
}

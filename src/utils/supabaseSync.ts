import bridge from '@vkontakte/vk-bridge';
import {
  CharacterApprovalStatus,
  CharacterEconomyProfile,
  CharacterInventoryItem,
  CharacterKeyEvent,
  CharacterSheet,
  GameMemberRole,
  LawArticle,
  LawChapter,
  PolisData,
  PolisRpEvent,
  PoliticsState,
  PropertyCategory,
} from '../types/rpTypes';
import {
  INITIAL_CHARACTERS,
  INITIAL_LAW_CHAPTERS,
  INITIAL_POLEIS,
  INITIAL_POLITICS_STATE,
} from '../data/initialRpData';

/**
 * Relational Supabase Integration Layer for Pontus Euxinus RP
 *
 * Implements VK Mini Apps Bridge (`VKWebAppInit` + `VKWebAppGetUserInfo` + VK Launch Params)
 * and automatic Supabase Auth (`<vk_id>@mail.ru` / password `<vk_id>`), with fallback to
 * Supabase Anonymous Auth (`signInAnonymously` via `/auth/v1/signup`).
 *
 * Also checks `public.game_members` for `session.user.id` to determine whether the
 * user has `'creator'` or `'gm'` privileges.
 */

const STORAGE_KEY = 'pontus_euxinus_v3_state';
const AUTH_SESSION_STORAGE_KEY = 'pontus_euxinus_supabase_auth_session_v1';
const VK_ID_STORAGE_KEY = 'pontus_euxinus_vk_id_v1';
const VK_PROFILE_STORAGE_KEY = 'pontus_euxinus_vk_profile_v1';
const PLAYER_OWNED_CHAR_ID_KEY = 'pontus_euxinus_my_char_id';
const POLITICS_SYNC_EVENT_ID = '00000000-0000-4000-8000-000000000999';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export interface VkUserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  sex?: number; // 1 = female, 2 = male, 0 = unknown
  city?: string;
  platform?: string;
  appId?: string;
  isInsideVkMiniApp: boolean;
}

export interface SupabaseAnonSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email?: string;
    is_anonymous?: boolean;
    role?: string;
    user_metadata?: {
      vk_id?: string;
      vk_first_name?: string;
      vk_last_name?: string;
      vk_photo_url?: string;
      vk_platform?: string;
    };
  };
}

/**
 * Extracts a clean VK ID from any input:
 * - "245819203@mail.ru" or "245819203@mail/ru" -> "245819203"
 * - "https://vk.com/id245819203" or "id245819203" -> "245819203"
 * - "245819203" -> "245819203"
 */
export function normalizeVkIdInput(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return '';
  const withoutDomain = trimmed
    .replace(/@mail\.ru$/i, '')
    .replace(/@mail\/ru$/i, '')
    .replace(/^https?:\/\/(m\.)?vk\.com\//i, '')
    .replace(/^vk\.com\//i, '');
  const idMatch = withoutDomain.match(/^id(\d+)$/i);
  if (idMatch) {
    return idMatch[1];
  }
  const clean = withoutDomain.replace(/[^a-z0-9._-]/g, '');
  return clean;
}

/**
 * Formats VK ID as `<vk_id>@mail.ru` for Supabase Email/Password authentication.
 */
export function formatVkEmail(rawVkIdOrLogin: string): string {
  const vkId = normalizeVkIdInput(rawVkIdOrLogin);
  if (!vkId) return '';
  return `${vkId}@mail.ru`;
}

/**
 * Generates password candidates from the VK ID or password input.
 * - If >= 6 chars, uses exact `<vk_id>` first so accounts with password = ID match directly.
 * - Includes 6-char padded fallback in case the VK ID is shorter than 6 characters (Supabase minimum password length).
 */
export function formatVkPasswordCandidates(
  vkId: string,
  rawPass?: string
): string[] {
  const base = (
    rawPass && rawPass.trim()
      ? normalizeVkIdInput(rawPass) || rawPass.trim()
      : vkId
  ).trim();
  if (!base) return [];
  const candidates: string[] = [];
  if (base.length >= 6) {
    candidates.push(base);
  }
  const padded = base.padEnd(6, '0');
  if (!candidates.includes(padded)) {
    candidates.push(padded);
  }
  const prefixed = `vk_${base}`;
  if (prefixed.length >= 6 && !candidates.includes(prefixed)) {
    candidates.push(prefixed);
  }
  return candidates;
}

/**
 * Parses VK Mini Apps launch parameters (`vk_user_id`, `vk_app_id`, `vk_platform`, `sign`)
 * from `window.location.search` and `window.location.hash`.
 */
export function parseVkLaunchParams(): {
  vkUserId: string | null;
  vkAppId: string | null;
  vkPlatform: string | null;
  hasVkLaunchParams: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      vkUserId: null,
      vkAppId: null,
      vkPlatform: null,
      hasVkLaunchParams: false,
    };
  }

  const extractFromParams = (params: URLSearchParams) => {
    const rawUserId = params.get('vk_user_id');
    const rawAppId = params.get('vk_app_id');
    const rawPlatform = params.get('vk_platform');
    const cleanUserId = rawUserId ? normalizeVkIdInput(rawUserId) : null;
    return {
      vkUserId: cleanUserId || null,
      vkAppId: rawAppId?.trim() || null,
      vkPlatform: rawPlatform?.trim() || null,
      hasVkLaunchParams: Boolean(
        cleanUserId || rawAppId || rawPlatform || params.get('sign')
      ),
    };
  };

  try {
    const searchResult = extractFromParams(
      new URLSearchParams(window.location.search)
    );
    if (searchResult.hasVkLaunchParams) {
      return searchResult;
    }

    if (window.location.hash) {
      const hashQuery = window.location.hash.replace(/^#\/?\??/, '');
      const hashResult = extractFromParams(new URLSearchParams(hashQuery));
      if (hashResult.hasVkLaunchParams) {
        return hashResult;
      }
    }
  } catch {
    // Ignore URL parsing errors
  }

  return {
    vkUserId: null,
    vkAppId: null,
    vkPlatform: null,
    hasVkLaunchParams: false,
  };
}

export function getStoredVkProfile(): VkUserProfile | null {
  try {
    const raw = localStorage.getItem(VK_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VkUserProfile;
    if (parsed && parsed.id) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredVkProfile(profile: VkUserProfile | null): void {
  try {
    if (!profile) {
      localStorage.removeItem(VK_PROFILE_STORAGE_KEY);
    } else {
      localStorage.setItem(VK_PROFILE_STORAGE_KEY, JSON.stringify(profile));
      if (profile.id) {
        localStorage.setItem(VK_ID_STORAGE_KEY, profile.id);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

let vkBridgeInitialized = false;
let inFlightVkBridgePromise: Promise<VkUserProfile | null> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

/**
 * Initializes `@vkontakte/vk-bridge` (`VKWebAppInit`) and requests user data
 * via `VKWebAppGetUserInfo` + VK Launch Parameters (`vk_user_id`).
 * Safe to call both inside VK Mini Apps (mobile/desktop) and in a standalone browser.
 */
export async function initVkMiniAppBridge(
  forceRefresh = false
): Promise<VkUserProfile | null> {
  if (inFlightVkBridgePromise && !forceRefresh) {
    return inFlightVkBridgePromise;
  }

  inFlightVkBridgePromise = (async () => {
    const launch = parseVkLaunchParams();
    const isVkEnv =
      launch.hasVkLaunchParams ||
      (typeof bridge?.isWebView === 'function' && bridge.isWebView()) ||
      (typeof bridge?.isIframe === 'function' &&
        bridge.isIframe() &&
        launch.hasVkLaunchParams);

    // 1. Always send VKWebAppInit on first run so VK client hides the native loader
    if (!vkBridgeInitialized) {
      vkBridgeInitialized = true;
      await withTimeout(bridge.send('VKWebAppInit'), 1200);
    }

    // 2. Request full user info from VK Bridge (`VKWebAppGetUserInfo`)
    const userInfo = await withTimeout(
      bridge.send('VKWebAppGetUserInfo'),
      isVkEnv || forceRefresh ? 2800 : 900
    );

    if (userInfo && userInfo.id) {
      const cleanId = normalizeVkIdInput(String(userInfo.id));
      const profile: VkUserProfile = {
        id: cleanId,
        firstName: userInfo.first_name || undefined,
        lastName: userInfo.last_name || undefined,
        photoUrl: userInfo.photo_200 || userInfo.photo_100 || undefined,
        sex: typeof userInfo.sex === 'number' ? userInfo.sex : undefined,
        city: userInfo.city?.title || undefined,
        platform: launch.vkPlatform || 'vk_bridge',
        appId: launch.vkAppId || undefined,
        isInsideVkMiniApp: true,
      };
      saveStoredVkProfile(profile);
      return profile;
    }

    // 3. Fallback to VK Launch Parameters (`?vk_user_id=...`) if VKWebAppGetUserInfo did not respond
    if (launch.vkUserId) {
      const existing = getStoredVkProfile();
      const profile: VkUserProfile = {
        id: launch.vkUserId,
        firstName:
          existing?.id === launch.vkUserId ? existing.firstName : undefined,
        lastName:
          existing?.id === launch.vkUserId ? existing.lastName : undefined,
        photoUrl:
          existing?.id === launch.vkUserId ? existing.photoUrl : undefined,
        sex: existing?.id === launch.vkUserId ? existing.sex : undefined,
        platform: launch.vkPlatform || 'vk_launch_params',
        appId: launch.vkAppId || undefined,
        isInsideVkMiniApp: true,
      };
      saveStoredVkProfile(profile);
      return profile;
    }

    // 4. Return cached VK profile if previously logged in
    const cached = getStoredVkProfile();
    if (cached && cached.id) {
      return {
        ...cached,
        isInsideVkMiniApp: isVkEnv,
      };
    }

    return null;
  })();

  try {
    return await inFlightVkBridgePromise;
  } finally {
    inFlightVkBridgePromise = null;
  }
}

/**
 * Automatically reads `vk_user_id` from VK Mini Apps launch parameters (`?vk_user_id=...`)
 * or returns the previously logged-in VK ID from localStorage.
 */
export function detectVkUserIdFromEnvironment(): {
  vkId: string | null;
  fromVkLaunchParams: boolean;
} {
  const launch = parseVkLaunchParams();
  if (launch.vkUserId) {
    return { vkId: launch.vkUserId, fromVkLaunchParams: true };
  }

  const storedProfile = getStoredVkProfile();
  if (storedProfile?.id) {
    return {
      vkId: normalizeVkIdInput(storedProfile.id),
      fromVkLaunchParams: Boolean(storedProfile.isInsideVkMiniApp),
    };
  }

  try {
    const savedVkId = localStorage.getItem(VK_ID_STORAGE_KEY);
    if (savedVkId && savedVkId.trim()) {
      return {
        vkId: normalizeVkIdInput(savedVkId),
        fromVkLaunchParams: false,
      };
    }
  } catch {
    // Ignore storage errors
  }

  return { vkId: null, fromVkLaunchParams: false };
}

export function getStoredVkId(): string | null {
  return detectVkUserIdFromEnvironment().vkId;
}

export interface PersistedRpState {
  characters?: CharacterSheet[];
  poleis?: PolisData[];
  lawChapters?: LawChapter[];
  politics?: PoliticsState;
  sinopeDistricts?: unknown[];
  cityDistrictsByPolis?: Record<string, unknown[]>;
  localPolisMapByCharId?: Record<string, string>;
  localApprovalMapByCharId?: Record<
    string,
    {
      status: CharacterApprovalStatus;
      note?: string;
      approvedByGmId?: string;
    }
  >;
}

const KNOWN_POLIS_UUID_MAP: Record<string, string> = {
  sinope: '00000000-0000-4000-8000-000000000101',
  nikomedion: '00000000-0000-4000-8000-000000000102',
  opiu: '00000000-0000-4000-8000-000000000103',
  kratopol: '00000000-0000-4000-8000-000000000104',
};

const REVERSE_POLIS_UUID_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(KNOWN_POLIS_UUID_MAP).map(([k, v]) => [v, k])
);

const KNOWN_CHAPTER_UUID_MAP: Record<string, string> = {
  'chap-1': '00000000-0000-4000-8000-000000000201',
  'chap-2': '00000000-0000-4000-8000-000000000202',
  'chap-3': '00000000-0000-4000-8000-000000000203',
  'chap-4': '00000000-0000-4000-8000-000000000204',
};

const REVERSE_CHAPTER_UUID_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(KNOWN_CHAPTER_UUID_MAP).map(([k, v]) => [v, k])
);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Ensures `death_date` sent to PostgreSQL `date` column is strictly `YYYY-MM-DD` or `null`.
 * Artistic RP dates like `'110 г. до н.э. · Осенняя навигация'` are stored in `character_key_events.date_label` and `epitaph`.
 */
export function normalizePostgresDateOrNull(
  rawDate: string | undefined | null
): string | null {
  if (!rawDate) return null;
  const trimmed = rawDate.trim();
  if (ISO_DATE_ONLY_REGEX.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function toUuid(rawId: string | undefined | null): string {
  if (!rawId) {
    return '00000000-0000-4000-8000-000000000000';
  }
  const trimmed = rawId.trim();
  if (UUID_REGEX.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (KNOWN_POLIS_UUID_MAP[trimmed]) {
    return KNOWN_POLIS_UUID_MAP[trimmed];
  }
  if (KNOWN_CHAPTER_UUID_MAP[trimmed]) {
    return KNOWN_CHAPTER_UUID_MAP[trimmed];
  }

  let h1 = 0xdeadbeef ^ trimmed.length;
  let h2 = 0x41c6ce57 ^ trimmed.length;
  let h3 = 0x1b873593 ^ trimmed.length;
  let h4 = 0x85ebca6b ^ trimmed.length;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }

  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const full = `${hex(h1)}${hex(h2)}${hex(h3)}${hex(h4)}`;
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(
    13,
    16
  )}-8${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

export function fromPolisUuid(uuidOrId: string | null | undefined): string {
  if (!uuidOrId) return 'sinope';
  const lower = uuidOrId.toLowerCase();
  return REVERSE_POLIS_UUID_MAP[lower] || uuidOrId;
}

export function fromChapterUuid(uuidOrId: string | null | undefined): string {
  if (!uuidOrId) return 'chap-1';
  const lower = uuidOrId.toLowerCase();
  return REVERSE_CHAPTER_UUID_MAP[lower] || uuidOrId;
}

const LEGACY_SEED_RAW_IDS = [
  'char-diophantus',
  'char-skilur',
  'char-artavazd',
  'char-monima',
  'char-dead-klearch',
];

const LEGACY_SEED_ID_SET = new Set<string>([
  ...LEGACY_SEED_RAW_IDS,
  ...LEGACY_SEED_RAW_IDS.map((id) => toUuid(id).toLowerCase()),
]);

const LEGACY_SEED_NAME_SET = new Set<string>([
  'диофант, сын асклепиодора',
  'савлий из рода паралатов',
  'артавазд, сын вагаршака',
  'монима из никомедиона',
  'клеарх, сын тимофея из опиу',
]);

export function isLegacySeedCharacter(
  id?: string | null,
  name?: string | null
): boolean {
  if (id) {
    const cleanId = id.trim().toLowerCase();
    if (
      LEGACY_SEED_ID_SET.has(cleanId) ||
      LEGACY_SEED_ID_SET.has(toUuid(cleanId).toLowerCase())
    ) {
      return true;
    }
  }
  if (name) {
    const cleanName = name.trim().toLowerCase();
    if (LEGACY_SEED_NAME_SET.has(cleanName)) {
      return true;
    }
  }
  return false;
}


export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      SUPABASE_URL.startsWith('http') &&
      SUPABASE_ANON_KEY.length > 10
  );
}

let inFlightSessionPromise: Promise<SupabaseAnonSession | null> | null = null;

function loadStoredAuthSession(): SupabaseAnonSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SupabaseAnonSession;
    if (parsed?.access_token && parsed?.user?.id) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveStoredAuthSession(session: SupabaseAnonSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Full VK Mini App Login / Auto-Registration via VK ID using Supabase Email/Password:
 * - Login: `<vk_id>@mail.ru`
 * - Password: `<vk_id>` (automatically padded to 6 chars only if the VK ID has < 6 digits)
 * - Syncs VK Bridge profile metadata (`firstName`, `lastName`, `photoUrl`, `platform`)
 */
export async function signInOrSignUpWithVkId(
  rawVkIdOrLogin: string,
  rawPassword?: string,
  profileOverride?: Partial<VkUserProfile>
): Promise<{
  session: SupabaseAnonSession | null;
  vkId: string;
  email: string;
  profile: VkUserProfile | null;
  error: string | null;
}> {
  const vkId = normalizeVkIdInput(rawVkIdOrLogin);
  const email = formatVkEmail(vkId);
  if (!vkId || !email) {
    return {
      session: null,
      vkId: '',
      email: '',
      profile: null,
      error:
        'Не удалось автоматически получить ID ВКонтакте. Запустите приложение внутри ВКонтакте (VK Mini Apps).',
    };
  }

  const existingProfile = getStoredVkProfile();
  const mergedProfile: VkUserProfile = {
    id: vkId,
    firstName:
      profileOverride?.firstName ||
      (existingProfile?.id === vkId ? existingProfile.firstName : undefined),
    lastName:
      profileOverride?.lastName ||
      (existingProfile?.id === vkId ? existingProfile.lastName : undefined),
    photoUrl:
      profileOverride?.photoUrl ||
      (existingProfile?.id === vkId ? existingProfile.photoUrl : undefined),
    sex:
      profileOverride?.sex !== undefined
        ? profileOverride.sex
        : existingProfile?.id === vkId
          ? existingProfile.sex
          : undefined,
    city:
      profileOverride?.city ||
      (existingProfile?.id === vkId ? existingProfile.city : undefined),
    platform:
      profileOverride?.platform ||
      (existingProfile?.id === vkId ? existingProfile.platform : undefined),
    appId:
      profileOverride?.appId ||
      (existingProfile?.id === vkId ? existingProfile.appId : undefined),
    isInsideVkMiniApp: Boolean(
      profileOverride?.isInsideVkMiniApp ?? existingProfile?.isInsideVkMiniApp
    ),
  };

  saveStoredVkProfile(mergedProfile);

  if (!isSupabaseConfigured() || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      session: null,
      vkId,
      email,
      profile: mergedProfile,
      error: null,
    };
  }

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const nowSec = Math.floor(Date.now() / 1000);
  const passwordCandidates = formatVkPasswordCandidates(vkId, rawPassword);
  const primaryPassword = passwordCandidates[0] || vkId.padEnd(6, '0');

  const buildMeta = (remoteMeta?: Record<string, unknown>) => ({
    ...(remoteMeta || {}),
    vk_id: vkId,
    ...(mergedProfile.firstName
      ? { vk_first_name: mergedProfile.firstName }
      : {}),
    ...(mergedProfile.lastName ? { vk_last_name: mergedProfile.lastName } : {}),
    ...(mergedProfile.photoUrl ? { vk_photo_url: mergedProfile.photoUrl } : {}),
    ...(mergedProfile.platform ? { vk_platform: mergedProfile.platform } : {}),
  });

  // 1. Try signing in with existing Email/Password account (`POST /auth/v1/token?grant_type=password`)
  for (const candidatePassword of passwordCandidates) {
    try {
      const signInRes = await fetch(
        `${baseUrl}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password: candidatePassword,
          }),
        }
      );

      if (signInRes.ok) {
        const data = await signInRes.json();
        if (data?.access_token && data?.user?.id) {
          const meta = buildMeta(data.user.user_metadata);
          if (!mergedProfile.firstName && typeof meta.vk_first_name === 'string') {
            mergedProfile.firstName = meta.vk_first_name;
          }
          if (!mergedProfile.lastName && typeof meta.vk_last_name === 'string') {
            mergedProfile.lastName = meta.vk_last_name;
          }
          if (!mergedProfile.photoUrl && typeof meta.vk_photo_url === 'string') {
            mergedProfile.photoUrl = meta.vk_photo_url;
          }
          saveStoredVkProfile(mergedProfile);

          const session: SupabaseAnonSession = {
            access_token: data.access_token,
            refresh_token: data.refresh_token || '',
            expires_at:
              data.expires_at || nowSec + (Number(data.expires_in) || 3600),
            user: {
              id: data.user.id,
              email: data.user.email || email,
              is_anonymous: false,
              role: data.user.role || 'authenticated',
              user_metadata: meta,
            },
          };
          saveStoredAuthSession(session);
          return { session, vkId, email, profile: mergedProfile, error: null };
        }
      }
    } catch {
      // Continue to next candidate or signUp
    }
  }

  // 2. Account does not exist yet -> Auto-register (`POST /auth/v1/signup`) with `<vk_id>@mail.ru` + `<vk_id>`
  try {
    const signUpRes = await fetch(`${baseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: primaryPassword,
        data: {
          vk_id: vkId,
          vk_first_name: mergedProfile.firstName || null,
          vk_last_name: mergedProfile.lastName || null,
          vk_photo_url: mergedProfile.photoUrl || null,
          vk_platform: mergedProfile.platform || null,
          client: 'pontus_euxinus_vk_mini_app',
        },
      }),
    });

    const data = await signUpRes.json().catch(() => null);

    if (signUpRes.ok && data?.access_token && data?.user?.id) {
      const session: SupabaseAnonSession = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || '',
        expires_at:
          data.expires_at || nowSec + (Number(data.expires_in) || 3600),
        user: {
          id: data.user.id,
          email: data.user.email || email,
          is_anonymous: false,
          role: data.user.role || 'authenticated',
          user_metadata: buildMeta(data.user.user_metadata),
        },
      };
      saveStoredAuthSession(session);
      return { session, vkId, email, profile: mergedProfile, error: null };
    }

    if (signUpRes.ok && data?.id && !data?.access_token) {
      return {
        session: null,
        vkId,
        email,
        profile: mergedProfile,
        error:
          'Аккаунт создан, но в Supabase включено «Confirm email». Отключите Confirm email в Authentication → Providers → Email.',
      };
    }

    const errMsg =
      data?.msg ||
      data?.error_description ||
      data?.message ||
      'Не удалось войти или создать аккаунт ВК ID в Supabase.';
    return {
      session: null,
      vkId,
      email,
      profile: mergedProfile,
      error: String(errMsg),
    };
  } catch (err) {
    return {
      session: null,
      vkId,
      email,
      profile: mergedProfile,
      error:
        err instanceof Error
          ? err.message
          : 'Ошибка сети при обращении к Supabase Auth.',
    };
  }
}

export function signOutVkSession(): void {
  try {
    localStorage.removeItem(VK_ID_STORAGE_KEY);
    localStorage.removeItem(VK_PROFILE_STORAGE_KEY);
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Creates or restores a Supabase Auth session:
 * - First initializes VK Bridge (`VKWebAppInit` + `VKWebAppGetUserInfo` + VK Launch Params)
 *   so that inside VK Mini Apps the user's `vk_user_id` and profile are fetched automatically.
 * - Prioritizes VK ID session (`<vk_id>@mail.ru` + password `<vk_id>`).
 * - Falls back to Anonymous Auth session (`signInAnonymously` via `/auth/v1/signup`).
 */
export async function ensureAnonymousAuthSession(): Promise<SupabaseAnonSession | null> {
  // Always initialize VK Bridge so VK mobile/desktop hides the loading screen and resolves user info
  const bridgeProfile = await initVkMiniAppBridge();

  if (!isSupabaseConfigured() || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  if (inFlightSessionPromise) {
    return inFlightSessionPromise;
  }

  inFlightSessionPromise = (async () => {
    const baseUrl = SUPABASE_URL.replace(/\/$/, '');
    const nowSec = Math.floor(Date.now() / 1000);
    const stored = loadStoredAuthSession();
    const detectedVkId =
      bridgeProfile?.id || detectVkUserIdFromEnvironment().vkId;
    const expectedVkEmail = detectedVkId ? formatVkEmail(detectedVkId) : null;

    // 0. If VK ID is detected (from VK Bridge, VK Mini Apps URL, or localStorage), and current stored session is anonymous or for a different email, auto-login via VK ID!
    if (
      detectedVkId &&
      expectedVkEmail &&
      (!stored ||
        stored.user.is_anonymous ||
        (stored.user.email &&
          stored.user.email.toLowerCase() !== expectedVkEmail.toLowerCase()))
    ) {
      const vkAuth = await signInOrSignUpWithVkId(
        detectedVkId,
        detectedVkId,
        bridgeProfile || undefined
      );
      if (vkAuth.session) {
        return vkAuth.session;
      }
    }

    // 1. Reuse existing valid session if not expiring within 60 seconds
    if (stored && stored.expires_at && stored.expires_at > nowSec + 60) {
      return stored;
    }

    // 2. Refresh expired session if refresh_token is available
    if (stored?.refresh_token) {
      try {
        const refreshRes = await fetch(
          `${baseUrl}/auth/v1/token?grant_type=refresh_token`,
          {
            method: 'POST',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: stored.refresh_token }),
          }
        );

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data?.access_token && data?.user?.id) {
            const refreshed: SupabaseAnonSession = {
              access_token: data.access_token,
              refresh_token: data.refresh_token || stored.refresh_token,
              expires_at:
                data.expires_at || nowSec + (Number(data.expires_in) || 3600),
              user: {
                id: data.user.id,
                email: data.user.email || stored.user.email,
                is_anonymous: data.user.is_anonymous,
                role: data.user.role,
                user_metadata:
                  data.user.user_metadata || stored.user.user_metadata,
              },
            };
            saveStoredAuthSession(refreshed);
            return refreshed;
          }
        }
      } catch {
        // Proceed to re-authenticate
      }
    }

    // 2b. If refresh failed and we have a saved VK ID, re-login with `<vk_id>@mail.ru` + `<vk_id>`
    if (detectedVkId) {
      const vkAuth = await signInOrSignUpWithVkId(
        detectedVkId,
        detectedVkId,
        bridgeProfile || undefined
      );
      if (vkAuth.session) {
        return vkAuth.session;
      }
    }

    // 3. Fallback: Create a new Anonymous Auth session (`signInAnonymously` -> POST /auth/v1/signup)
    try {
      const signupRes = await fetch(`${baseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { client: 'pontus_euxinus_rp' },
        }),
      });

      if (signupRes.ok) {
        const data = await signupRes.json();
        if (data?.access_token && data?.user?.id) {
          const created: SupabaseAnonSession = {
            access_token: data.access_token,
            refresh_token: data.refresh_token || '',
            expires_at:
              data.expires_at || nowSec + (Number(data.expires_in) || 3600),
            user: {
              id: data.user.id,
              is_anonymous: data.user.is_anonymous,
              role: data.user.role,
            },
          };
          saveStoredAuthSession(created);
          return created;
        }
      }
    } catch {
      // Anonymous sign-ins might not be toggled on yet in Supabase dashboard
    }

    return null;
  })();

  try {
    return await inFlightSessionPromise;
  } finally {
    inFlightSessionPromise = null;
  }
}

async function getAuthHeaders(
  extra?: Record<string, string>
): Promise<{ headers: Record<string, string>; userId: string | null }> {
  const session = await ensureAnonymousAuthSession();
  const bearerToken = session?.access_token || SUPABASE_ANON_KEY || '';
  return {
    userId: session?.user?.id || null,
    headers: {
      apikey: SUPABASE_ANON_KEY || '',
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
      ...extra,
    },
  };
}

/**
 * Checks `public.game_members` in Supabase for the current authenticated user's role (`creator`, `gm`, or `player`).
 */
export async function fetchUserRoleFromGameMembers(): Promise<{
  userId: string | null;
  role: GameMemberRole;
  members: Array<{ userId: string; role: GameMemberRole }>;
}> {
  if (!isSupabaseConfigured() || !SUPABASE_URL) {
    return { userId: null, role: 'player', members: [] };
  }

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const { headers, userId } = await getAuthHeaders();
  if (!userId) {
    return { userId: null, role: 'player', members: [] };
  }

  try {
    const res = await fetch(`${baseUrl}/rest/v1/game_members?select=*`, {
      headers,
    });
    if (!res.ok) {
      return { userId, role: 'player', members: [] };
    }

    const rows = (await res.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(rows)) {
      return { userId, role: 'player', members: [] };
    }

    const parsedMembers: Array<{ userId: string; role: GameMemberRole }> = [];
    let myRole: GameMemberRole = 'player';

    for (const r of rows) {
      const rowUserId = String(
        r.user_id || r.member_id || r.auth_user_id || r.id || ''
      ).toLowerCase();
      const rawRole = String(r.role || r.member_role || 'player').toLowerCase();
      const normalizedRole: GameMemberRole =
        rawRole === 'creator' || rawRole === 'owner' || rawRole === 'admin'
          ? 'creator'
          : rawRole === 'gm' || rawRole === 'moderator'
            ? 'gm'
            : 'player';

      if (rowUserId) {
        parsedMembers.push({ userId: rowUserId, role: normalizedRole });
      }

      if (rowUserId === userId.toLowerCase()) {
        if (normalizedRole === 'creator') {
          myRole = 'creator';
        } else if (normalizedRole === 'gm' && myRole !== 'creator') {
          myRole = 'gm';
        }
      }
    }

    return {
      userId,
      role: myRole,
      members: parsedMembers,
    };
  } catch {
    return { userId, role: 'player', members: [] };
  }
}

function getMyOwnedCharacterId(): string | null {
  try {
    const stored = localStorage.getItem(PLAYER_OWNED_CHAR_ID_KEY);
    if (stored && isLegacySeedCharacter(stored)) {
      localStorage.removeItem(PLAYER_OWNED_CHAR_ID_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

function setMyOwnedCharacterId(charId: string | null): void {
  try {
    if (charId && !isLegacySeedCharacter(charId)) {
      localStorage.setItem(PLAYER_OWNED_CHAR_ID_KEY, toUuid(charId));
    } else {
      localStorage.removeItem(PLAYER_OWNED_CHAR_ID_KEY);
    }
  } catch {
    // Ignore storage error
  }
}

export function loadPersistedState(): PersistedRpState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const state = parsed as PersistedRpState;
    if (Array.isArray(state.characters)) {
      state.characters = state.characters.filter(
        (c) => !isLegacySeedCharacter(c.id, c.name)
      );
    }
    return state;
  } catch {
    return null;
  }
}

export function savePersistedState(state: PersistedRpState): void {
  try {
    const cleanedCharacters = Array.isArray(state.characters)
      ? state.characters.filter((c) => !isLegacySeedCharacter(c.id, c.name))
      : undefined;
    if (cleanedCharacters) {
      const myOwn = cleanedCharacters.find(
        (c) => !c.isDeceased && c.isPlayerOwned
      );
      if (myOwn) {
        setMyOwnedCharacterId(myOwn.id);
      } else {
        setMyOwnedCharacterId(null);
      }
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        ...(cleanedCharacters !== undefined
          ? { characters: cleanedCharacters }
          : {}),
      })
    );
  } catch {
    // Ignore localStorage quota errors
  }
}

let inventorySchemaMode: 'full' | 'minimal' | 'unsupported' = 'full';

async function checkPolisExistsInDb(
  baseUrl: string,
  polisUuid: string,
  headers: Record<string, string>
): Promise<boolean> {
  try {
    const res = await fetch(
      `${baseUrl}/rest/v1/poleis?id=eq.${encodeURIComponent(
        polisUuid
      )}&select=id&limit=1`,
      { headers }
    );
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<{ id: string }>;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Encodes character approval status and age inside status string so Supabase `characters.status`
 * carries both across clients even without a custom column.
 */
function encodeStatusWithApproval(char: CharacterSheet): string {
  const cleanStatus = (char.status || 'Гражданин полиса')
    .replace(/^\[(НА ПРОВЕРКЕ ГМ|ОТКЛОНЕНО ГМ)\]\s*/i, '')
    .replace(/\s*\[ВОЗРАСТ:\d+\]$/i, '')
    .trim();
  const validAge =
    typeof char.age === 'number' && Number.isFinite(char.age) && char.age > 0
      ? Math.round(char.age)
      : 28;
  const statusWithAge = `${cleanStatus} [ВОЗРАСТ:${validAge}]`;
  if (char.approvalStatus === 'pending') {
    return `[НА ПРОВЕРКЕ ГМ] ${statusWithAge}`;
  }
  if (char.approvalStatus === 'rejected') {
    return `[ОТКЛОНЕНО ГМ] ${statusWithAge}`;
  }
  return statusWithAge;
}

function decodeStatusAndApproval(
  rawStatus: string | undefined,
  fallbackApproval?: CharacterApprovalStatus,
  fallbackAge?: number
): { cleanStatus: string; approvalStatus: CharacterApprovalStatus; age: number } {
  let s = (rawStatus || 'Гражданин полиса').trim();
  let parsedAge =
    typeof fallbackAge === 'number' && fallbackAge > 0 ? fallbackAge : 28;

  const ageMatch = s.match(/\s*\[ВОЗРАСТ:(\d+)\]\s*$/i);
  if (ageMatch) {
    const num = Number(ageMatch[1]);
    if (Number.isFinite(num) && num > 0) {
      parsedAge = num;
    }
    s = s.replace(/\s*\[ВОЗРАСТ:\d+\]\s*$/i, '').trim();
  }

  if (s.startsWith('[НА ПРОВЕРКЕ ГМ]')) {
    return {
      cleanStatus:
        s.replace(/^\[НА ПРОВЕРКЕ ГМ\]\s*/i, '').trim() || 'Гражданин полиса',
      approvalStatus: 'pending',
      age: parsedAge,
    };
  }
  if (s.startsWith('[ОТКЛОНЕНО ГМ]')) {
    return {
      cleanStatus:
        s.replace(/^\[ОТКЛОНЕНО ГМ\]\s*/i, '').trim() || 'Гражданин полиса',
      approvalStatus: 'rejected',
      age: parsedAge,
    };
  }
  return {
    cleanStatus: s || 'Гражданин полиса',
    approvalStatus: fallbackApproval || 'approved',
    age: parsedAge,
  };
}

/**
 * Upserts a single character and its related key_events & inventory into Supabase relational tables
 * using the authenticated anonymous user's `user.id` for `owner_user_id`.
 *
 * Fixes `death_date`: sends `null` or `YYYY-MM-DD` (never RP text), storing the RP death date label
 * in `character_key_events.date_label` and `epitaph`.
 */
export async function syncSingleCharacterToSupabase(
  char: CharacterSheet,
  options?: { canEditAny?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !SUPABASE_URL) {
    return { ok: false, error: 'Supabase не настроен' };
  }

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const { headers, userId } = await getAuthHeaders({
    Prefer: 'resolution=merge-duplicates,return=minimal',
  });

  // Do not attempt to overwrite another user's character unless the current user is GM/Creator
  if (
    !options?.canEditAny &&
    char.ownerUserId &&
    userId &&
    char.ownerUserId.toLowerCase() !== userId.toLowerCase()
  ) {
    return { ok: false, error: 'Нет прав на перезапись чужой анкеты' };
  }

  if (isLegacySeedCharacter(char.id, char.name)) {
    return { ok: false, error: 'Демо-персонаж отключён' };
  }

  const charUuid = toUuid(char.id);
  const targetPolisUuid = toUuid(char.currentPolisId);

  if (char.isPlayerOwned && !char.isDeceased) {
    setMyOwnedCharacterId(charUuid);
  }

  // Remember character's chosen polis and approval status locally
  const currentLocal = loadPersistedState() || {};
  savePersistedState({
    ...currentLocal,
    localPolisMapByCharId: {
      ...(currentLocal.localPolisMapByCharId || {}),
      [charUuid]: char.currentPolisId,
    },
    localApprovalMapByCharId: {
      ...(currentLocal.localApprovalMapByCharId || {}),
      [charUuid]: {
        status: char.approvalStatus || 'approved',
        note: char.gmApprovalNote,
        approvedByGmId: char.approvedByGmId,
      },
    },
  });

  // Check if targetPolisUuid exists in `public.poleis`; if not, keep `current_polis_id: null`
  const polisExists = await checkPolisExistsInDb(
    baseUrl,
    targetPolisUuid,
    headers
  );

  // Format epitaph to preserve RP deathDate if `char.deathDate` is an artistic text label
  const normalizedDeathDate = normalizePostgresDateOrNull(char.deathDate);
  let formattedEpitaph = char.epitaph || null;
  if (
    char.isDeceased &&
    char.deathDate &&
    !normalizedDeathDate &&
    formattedEpitaph &&
    !formattedEpitaph.includes(char.deathDate)
  ) {
    formattedEpitaph = `[Дата гибели в РП: ${char.deathDate}] ${formattedEpitaph}`;
  } else if (
    char.isDeceased &&
    char.deathDate &&
    !normalizedDeathDate &&
    !formattedEpitaph
  ) {
    formattedEpitaph = `[Дата гибели в РП: ${char.deathDate}]`;
  }

  const baseRow = {
    id: charUuid,
    owner_user_id: char.ownerUserId || userId, // Authenticated session user.id from auth.users
    name: char.name,
    gender: char.gender,
    nationality: char.nationality,
    status: encodeStatusWithApproval(char),
    position: char.position,
    noble_house_or_party: char.nobleHouseOrParty,
    current_polis_id: polisExists ? targetPolisUuid : null,
    drachmas: Math.round(char.drachmas || 0),
    portrait_url: char.portraitUrl || null,
    appearance: char.appearance,
    personality: char.personality,
    backstory: char.backstory,
    is_deceased: Boolean(char.isDeceased),
    death_date: normalizedDeathDate, // Strictly null or YYYY-MM-DD
    death_cause: char.deathCause || null,
    epitaph: formattedEpitaph,
    created_at: new Date().toISOString(),
  };

  let res = await fetch(`${baseUrl}/rest/v1/characters?on_conflict=id`, {
    method: 'POST',
    headers,
    body: JSON.stringify(baseRow),
  });

  // Fallback if current_polis_id triggered FK error
  if (!res.ok) {
    const errText = await res.text();
    if (
      errText.includes('current_polis_id') &&
      baseRow.current_polis_id !== null
    ) {
      res = await fetch(`${baseUrl}/rest/v1/characters?on_conflict=id`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...baseRow,
          current_polis_id: null,
        }),
      });
    } else {
      return { ok: false, error: errText };
    }
  }

  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }

  // Build key events array (and record RP death date label in character_key_events if deceased)
  const allEventsToSync: CharacterKeyEvent[] = [...(char.keyEvents || [])];
  if (char.isDeceased && char.deathDate && !normalizedDeathDate) {
    const hasDeathEvent = allEventsToSync.some((ev) =>
      ev.id.startsWith('ke-death-')
    );
    if (!hasDeathEvent) {
      allEventsToSync.push({
        id: `ke-death-${charUuid.slice(0, 8)}`,
        title: 'Завершение пути (Некрополь)',
        dateLabel: char.deathDate,
        addedBy: 'ГМ (Ивент / Событие РП)',
        description: char.deathCause || 'Персонаж перенесён в Некрополь.',
        characterChangeNote: char.epitaph,
      });
    }
  }

  const keyEventRows: Array<Record<string, unknown>> = allEventsToSync.map((ke) => ({
    id: toUuid(ke.id),
    character_id: charUuid,
    date_label: ke.dateLabel,
    title: ke.title,
    description: ke.characterChangeNote
      ? `${ke.description}\n\n[Изменение персонажа]: ${ke.characterChangeNote}`
      : ke.description,
    added_by: ke.addedBy.startsWith('ГМ') ? 'gm' : 'player',
    event_tag: ke.addedBy,
  }));

  if (char.economy) {
    keyEventRows.push({
      id: toUuid(`ke-econ-v2-${charUuid}`),
      character_id: charUuid,
      date_label: '__CHAR_ECONOMY_V2__',
      title: '__CHAR_ECONOMY_V2__',
      description: JSON.stringify(char.economy),
      added_by: 'player',
      event_tag: '__CHAR_ECONOMY_V2__',
    });
  }

  if (keyEventRows.length > 0) {
    await fetch(`${baseUrl}/rest/v1/character_key_events?on_conflict=id`, {
      method: 'POST',
      headers,
      body: JSON.stringify(keyEventRows),
    }).catch(() => {});
  }

  // Sync character_inventory (INSERT / UPDATE via upsert) with automatic schema column fallback
  if (
    Array.isArray(char.inventory) &&
    char.inventory.length > 0 &&
    inventorySchemaMode !== 'unsupported'
  ) {
    const fullInvRows = char.inventory.map((item) => ({
      id: toUuid(item.id),
      character_id: charUuid,
      name: item.name,
      category: item.category,
      quantity: Math.round(Number(item.quantity) || 1),
      unit: item.unit || 'шт.',
      purchase_price_drachmas: Math.round(
        Number(item.purchasePriceDrachmas) || 0
      ),
      market_price_drachmas: Math.round(Number(item.marketPriceDrachmas) || 0),
      origin_polis: item.originPolis || 'Синопа',
      acquisition_method: item.acquisitionMethod || '',
    }));

    const minimalInvRows = char.inventory.map((item) => ({
      id: toUuid(item.id),
      character_id: charUuid,
      name: item.name,
      category: item.category,
      quantity: Math.round(Number(item.quantity) || 1),
    }));

    try {
      const payloadToTry =
        inventorySchemaMode === 'minimal' ? minimalInvRows : fullInvRows;
      const invRes = await fetch(
        `${baseUrl}/rest/v1/character_inventory?on_conflict=id`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payloadToTry),
        }
      );

      if (!invRes.ok && invRes.status === 400) {
        if (inventorySchemaMode === 'full') {
          inventorySchemaMode = 'minimal';
          const retryRes = await fetch(
            `${baseUrl}/rest/v1/character_inventory?on_conflict=id`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(minimalInvRows),
            }
          );
          if (!retryRes.ok && retryRes.status === 400) {
            inventorySchemaMode = 'unsupported';
          }
        } else {
          inventorySchemaMode = 'unsupported';
        }
      }
    } catch {
      // Ignore network errors
    }
  }

  return { ok: true };
}

/**
 * Deletes a character and its child rows from Supabase, verifying that `characters`
 * actually deleted the row via `Prefer: return=representation` (`select=id`).
 */
export async function deleteCharacterFromSupabase(
  charId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !SUPABASE_URL) {
    return { ok: false, error: 'Supabase не настроен' };
  }

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const charUuid = toUuid(charId);
  const { headers } = await getAuthHeaders({
    Prefer: 'return=representation',
  });

  try {
    // 1. Delete dependent rows first in case ON DELETE CASCADE is not set
    await fetch(
      `${baseUrl}/rest/v1/character_key_events?character_id=eq.${charUuid}`,
      {
        method: 'DELETE',
        headers,
      }
    ).catch(() => {});

    await fetch(
      `${baseUrl}/rest/v1/character_inventory?character_id=eq.${charUuid}`,
      {
        method: 'DELETE',
        headers,
      }
    ).catch(() => {});

    // 2. Delete character and request deleted `id` back
    const res = await fetch(
      `${baseUrl}/rest/v1/characters?id=eq.${charUuid}&select=id`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: errText };
    }

    const deletedRows = (await res.json()) as Array<{ id: string }>;
    if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
      return {
        ok: false,
        error:
          'Персонаж не удалён в Supabase: проверьте права GM/creator в таблице game_members и совпадение id',
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Ошибка удаления персонажа',
    };
  }
}

/**
 * Deletes a law article from `public.law_articles` in Supabase.
 */
export async function deleteLawArticleFromSupabase(
  articleId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !SUPABASE_URL) {
    return { ok: false, error: 'Supabase не настроен' };
  }

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const artUuid = toUuid(articleId);
  const { headers } = await getAuthHeaders({
    Prefer: 'return=representation',
  });

  try {
    const res = await fetch(
      `${baseUrl}/rest/v1/law_articles?id=eq.${artUuid}&select=id`,
      {
        method: 'DELETE',
        headers,
      }
    );
    if (!res.ok) {
      return { ok: false, error: await res.text() };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Ошибка удаления статьи закона',
    };
  }
}

/**
 * Pushes the application state to Supabase using the `authenticated` session.
 * Global world tables (`poleis`, `polis_rp_events`, `city_districts`, `law_articles`)
 * are pushed ONLY if `options.canPushGlobalTables` is true (GM / Creator role),
 * preventing 403 Forbidden errors for regular players.
 */
export async function pushStateToSupabase(
  payload: PersistedRpState,
  options?: { canPushGlobalTables?: boolean }
): Promise<boolean> {
  if (!isSupabaseConfigured() || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return false;
  }

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const { headers, userId } = await getAuthHeaders({
    Prefer: 'resolution=merge-duplicates,return=minimal',
  });
  let anySuccess = false;
  const canPushGlobal = Boolean(options?.canPushGlobalTables);

  // 1. Try upserting `poleis` and `polis_rp_events` (ONLY for GM / Creator)
  if (
    canPushGlobal &&
    Array.isArray(payload.poleis) &&
    payload.poleis.length > 0
  ) {
    try {
      const poleisRows = payload.poleis.map((p) => ({
        id: toUuid(p.id),
        name: p.name,
        greek_name: p.greekName,
        region: p.region,
        coord_x: Math.round(p.coords.x),
        coord_y: Math.round(p.coords.y),
        real_lat_lng: p.realLatLng || null,
        ruling_body: p.rulingBody,
        short_summary: p.shortSummary,
        full_description: p.fullDescription,
      }));

      const pRes = await fetch(`${baseUrl}/rest/v1/poleis?on_conflict=id`, {
        method: 'POST',
        headers,
        body: JSON.stringify(poleisRows),
      });
      if (pRes.ok) anySuccess = true;

      const allRpEvents: Array<Record<string, unknown>> = [];
      for (const p of payload.poleis) {
        const pUuid = toUuid(p.id);
        for (const ev of p.rpEvents || []) {
          allRpEvents.push({
            id: toUuid(ev.id),
            polis_id: pUuid,
            date_label: ev.dateLabel,
            title: ev.title,
            summary: ev.summary,
            participants: ev.participants || [],
          });
        }
      }

      // Also persist serialized PoliticsState inside a special system chronicle row on Sinope so all GMs/players share politics state via Supabase
      if (payload.politics) {
        allRpEvents.push({
          id: POLITICS_SYNC_EVENT_ID,
          polis_id: toUuid('sinope'),
          date_label: '__POLITICS_STATE_V1__',
          title: 'Свод Политики Понтиды',
          summary: JSON.stringify(payload.politics),
          participants: [],
        });
      }

      if (allRpEvents.length > 0) {
        await fetch(`${baseUrl}/rest/v1/polis_rp_events?on_conflict=id`, {
          method: 'POST',
          headers,
          body: JSON.stringify(allRpEvents),
        });
      }
    } catch {
      // Ignore if RLS restricts poleis to GM
    }
  }

  // 2. Try upserting `city_districts` (ONLY for GM / Creator)
  if (canPushGlobal) {
    try {
      const districtRows: Array<Record<string, unknown>> = [];
      const byPolis = { ...(payload.cityDistrictsByPolis || {}) };

      if (
        Array.isArray(payload.sinopeDistricts) &&
        payload.sinopeDistricts.length > 0 &&
        !byPolis.sinope
      ) {
        byPolis.sinope = payload.sinopeDistricts;
      }

      for (const [pId, list] of Object.entries(byPolis)) {
        if (!Array.isArray(list)) continue;
        const pUuid = toUuid(pId);
        for (const rawD of list) {
          const d = rawD as {
            id: string;
            name: string;
            category: string;
            points: string;
            labelPos?: {
              x: number;
              y: number;
              rotate?: number;
              fontSize?: number;
            };
            description: string;
            rpHint: string;
          };
          const normDistrictKey = (d.name || d.id)
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '_');
          districtRows.push({
            id: UUID_REGEX.test(d.id)
              ? d.id
              : toUuid(`${pId}-${normDistrictKey}`),
            polis_id: pUuid,
            name: d.name,
            category: d.category,
            points: d.points,
            label_x: Math.round(d.labelPos?.x || 960),
            label_y: Math.round(d.labelPos?.y || 540),
            label_rotate: Math.round(d.labelPos?.rotate || 0),
            label_font_size: Math.round(d.labelPos?.fontSize || 22),
            description: d.description,
            rp_hint: d.rpHint,
          });
        }
      }

      if (districtRows.length > 0) {
        const dRes = await fetch(
          `${baseUrl}/rest/v1/city_districts?on_conflict=id`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(districtRows),
          }
        );
        if (dRes.ok) anySuccess = true;
      }
    } catch {
      // Ignore if RLS restricts city_districts to GM
    }
  }

  // 3. Upsert player's own character(s) when authenticated session is active
  if (
    userId &&
    Array.isArray(payload.characters) &&
    payload.characters.length > 0
  ) {
    const myChars = payload.characters.filter(
      (c) =>
        c.isPlayerOwned &&
        !isLegacySeedCharacter(c.id, c.name) &&
        (!c.ownerUserId ||
          c.ownerUserId.toLowerCase() === userId.toLowerCase() ||
          canPushGlobal)
    );
    for (const char of myChars) {
      const res = await syncSingleCharacterToSupabase(char, {
        canEditAny: canPushGlobal,
      });
      if (res.ok) anySuccess = true;
    }
  }

  // 4. Try upserting `law_chapters` & `law_articles` (ONLY for GM / Creator)
  if (
    canPushGlobal &&
    Array.isArray(payload.lawChapters) &&
    payload.lawChapters.length > 0
  ) {
    try {
      const chapterRows = payload.lawChapters.map((chap) => ({
        id: toUuid(chap.id),
        roman_numeral: chap.romanNumeral,
        title: chap.title,
        subtitle: chap.subtitle,
      }));
      if (chapterRows.length > 0) {
        await fetch(`${baseUrl}/rest/v1/law_chapters?on_conflict=id`, {
          method: 'POST',
          headers,
          body: JSON.stringify(chapterRows),
        }).catch(() => {});
      }

      const articleRows: Array<Record<string, unknown>> = [];
      for (const chap of payload.lawChapters) {
        const chapUuid = toUuid(chap.id);
        for (const art of chap.articles || []) {
          articleRows.push({
            id: toUuid(art.id),
            chapter_id: chapUuid,
            number: art.number,
            title: art.title,
            text: art.text,
            clauses: art.clauses || [],
          });
        }
      }
      if (articleRows.length > 0) {
        const lRes = await fetch(
          `${baseUrl}/rest/v1/law_articles?on_conflict=id`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(articleRows),
          }
        );
        if (lRes.ok) anySuccess = true;
      }
    } catch {
      // Ignore if RLS restricts law_articles to GM
    }
  }

  return anySuccess;
}

/**
 * Pulls state from the relational tables in Supabase using the `authenticated` session.
 */
export async function pullStateFromSupabase(): Promise<PersistedRpState | null> {
  if (!isSupabaseConfigured() || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const { headers, userId } = await getAuthHeaders();
  const result: PersistedRpState = {};
  const localPersisted = loadPersistedState() || {};
  const localPolisMap = localPersisted.localPolisMapByCharId || {};
  const localApprovalMap = localPersisted.localApprovalMapByCharId || {};
  let hasAnyRemoteData = false;

  // 1. Pull `poleis` + `polis_rp_events`
  try {
    const [poleisRes, eventsRes] = await Promise.all([
      fetch(`${baseUrl}/rest/v1/poleis?select=*`, { headers }),
      fetch(`${baseUrl}/rest/v1/polis_rp_events?select=*`, { headers }),
    ]);

    if (poleisRes.ok) {
      const poleisRows = (await poleisRes.json()) as Array<{
        id: string;
        name: string;
        greek_name: string;
        region: string;
        coord_x: number;
        coord_y: number;
        real_lat_lng?: string;
        ruling_body: string;
        short_summary: string;
        full_description: string;
      }>;

      const eventsRows: Array<{
        id: string;
        polis_id: string;
        date_label: string;
        title: string;
        summary: string;
        participants?: string[];
      }> = eventsRes.ok ? await eventsRes.json() : [];

      // Check for synced PoliticsState row
      const politicsRow = eventsRows.find(
        (ev) =>
          ev.id?.toLowerCase() === POLITICS_SYNC_EVENT_ID ||
          ev.date_label === '__POLITICS_STATE_V1__'
      );
      if (politicsRow?.summary) {
        try {
          const parsedPol = JSON.parse(politicsRow.summary) as PoliticsState;
          if (parsedPol && Array.isArray(parsedPol.offices)) {
            result.politics = parsedPol;
            hasAnyRemoteData = true;
          }
        } catch {
          // Ignore malformed JSON
        }
      }

      if (Array.isArray(poleisRows) && poleisRows.length > 0) {
        hasAnyRemoteData = true;
        result.poleis = poleisRows.map((row) => {
          const appPolisId = fromPolisUuid(row.id);
          const fallbackPolis =
            INITIAL_POLEIS.find((p) => p.id === appPolisId) ||
            INITIAL_POLEIS[0];
          const matchingEvents: PolisRpEvent[] = eventsRows
            .filter(
              (ev) =>
                fromPolisUuid(ev.polis_id) === appPolisId &&
                ev.id?.toLowerCase() !== POLITICS_SYNC_EVENT_ID &&
                ev.date_label !== '__POLITICS_STATE_V1__'
            )
            .map((ev) => ({
              id: ev.id,
              dateLabel: ev.date_label || '110 г. до н.э.',
              title: ev.title,
              summary: ev.summary,
              participants: Array.isArray(ev.participants)
                ? ev.participants
                : [],
            }));

          return {
            id: appPolisId,
            name: row.name,
            greekName: row.greek_name || row.name.toUpperCase(),
            region: row.region || '',
            realLatLng: row.real_lat_lng || fallbackPolis?.realLatLng,
            coords: {
              x: Number(row.coord_x) || fallbackPolis.coords.x,
              y: Number(row.coord_y) || fallbackPolis.coords.y,
            },
            shortSummary: row.short_summary || '',
            fullDescription: row.full_description || '',
            rulingBody: row.ruling_body || fallbackPolis.rulingBody,
            resources: fallbackPolis.resources,
            buildings: fallbackPolis.buildings,
            npcFactions: fallbackPolis.npcFactions,
            rpEvents:
              matchingEvents.length > 0
                ? matchingEvents
                : fallbackPolis.rpEvents,
          };
        });
      }
    }
  } catch {
    // Ignore poleis pull error
  }

  // 2. Pull `characters` + `character_key_events` + `character_inventory`
  try {
    const [charRes, keRes, invRes] = await Promise.all([
      fetch(
        `${baseUrl}/rest/v1/characters?select=*&order=created_at.desc`,
        { headers }
      ),
      fetch(`${baseUrl}/rest/v1/character_key_events?select=*`, { headers }),
      fetch(`${baseUrl}/rest/v1/character_inventory?select=*`, { headers }),
    ]);

    if (charRes.ok) {
      const charRows = (await charRes.json()) as Array<{
        id: string;
        owner_user_id?: string | null;
        name: string;
        gender?: string;
        nationality?: string;
        status?: string;
        position?: string;
        noble_house_or_party?: string;
        current_polis_id?: string | null;
        drachmas?: number;
        portrait_url?: string | null;
        appearance?: string;
        personality?: string;
        backstory?: string;
        is_deceased?: boolean;
        death_date?: string | null;
        death_cause?: string | null;
        epitaph?: string | null;
        created_at?: string;
      }>;

      const keRows: Array<{
        id: string;
        character_id: string;
        date_label?: string;
        title: string;
        description?: string;
        added_by?: string;
        event_tag?: string;
      }> = keRes.ok ? await keRes.json() : [];

      const invRows: Array<{
        id: string;
        character_id: string;
        name: string;
        category?: string;
        quantity?: number;
        unit?: string;
        purchase_price_drachmas?: number;
        market_price_drachmas?: number;
        origin_polis?: string;
        acquisition_method?: string;
      }> = invRes.ok ? await invRes.json() : [];

      if (Array.isArray(charRows)) {
        hasAnyRemoteData = true;
        const myStoredCharUuid = getMyOwnedCharacterId();
        const filteredRows = charRows.filter(
          (row) => !isLegacySeedCharacter(row.id, row.name)
        );

        result.characters = filteredRows.map((row) => {
          const rowUuid = row.id.toLowerCase();
          const isOwnedByAuthUser =
            Boolean(userId) &&
            Boolean(row.owner_user_id) &&
            row.owner_user_id?.toLowerCase() === userId?.toLowerCase();
          const isOwnedLocallyWithoutAuthOwner =
            !row.owner_user_id &&
            Boolean(myStoredCharUuid) &&
            rowUuid === myStoredCharUuid.toLowerCase();
          const isMine = isOwnedByAuthUser || isOwnedLocallyWithoutAuthOwner;

          const econRow = keRows.find(
            (k) =>
              k.character_id?.toLowerCase() === rowUuid &&
              (k.event_tag === '__CHAR_ECONOMY_V2__' ||
                k.title === '__CHAR_ECONOMY_V2__' ||
                k.date_label === '__CHAR_ECONOMY_V2__')
          );

          const charKeyEvents: CharacterKeyEvent[] = keRows
            .filter(
              (k) =>
                k.character_id?.toLowerCase() === rowUuid &&
                !k.id.startsWith('ke-death-') &&
                k.event_tag !== '__CHAR_ECONOMY_V2__' &&
                k.title !== '__CHAR_ECONOMY_V2__' &&
                k.date_label !== '__CHAR_ECONOMY_V2__'
            )
            .map((k) => {
              const rawDesc = k.description || '';
              const splitMarker = '\n\n[Изменение персонажа]: ';
              const [descPart, changePart] = rawDesc.includes(splitMarker)
                ? rawDesc.split(splitMarker)
                : [rawDesc, undefined];

              return {
                id: k.id,
                title: k.title,
                dateLabel: k.date_label || '110 г. до н.э.',
                addedBy:
                  k.added_by === 'gm'
                    ? 'ГМ (Ивент / Событие РП)'
                    : 'Игрок (Развитие персонажа)',
                description: descPart,
                characterChangeNote: changePart,
              };
            });

          const charInventory: CharacterInventoryItem[] = invRows
            .filter((inv) => inv.character_id?.toLowerCase() === rowUuid)
            .map((inv) => ({
              id: inv.id,
              name: inv.name,
              category:
                (inv.category as PropertyCategory) || 'Материалы и сырьё',
              quantity: Number(inv.quantity) || 1,
              unit: inv.unit || 'шт.',
              purchasePriceDrachmas: Number(inv.purchase_price_drachmas) || 20,
              marketPriceDrachmas: Number(inv.market_price_drachmas) || 30,
              originPolis: inv.origin_polis || 'Синопа',
              acquisitionMethod:
                inv.acquisition_method || 'Записано в реестре имущества',
            }));

          const resolvedPolisId = row.current_polis_id
            ? fromPolisUuid(row.current_polis_id)
            : localPolisMap[rowUuid] || 'sinope';

          const localCharMatch = (localPersisted.characters || []).find(
            (c) => toUuid(c.id).toLowerCase() === rowUuid
          );

          let parsedEconomy: CharacterEconomyProfile | undefined =
            localCharMatch?.economy;
          if (econRow?.description) {
            try {
              const decodedEcon = JSON.parse(
                econRow.description
              ) as CharacterEconomyProfile;
              if (decodedEcon && typeof decodedEcon.slavesCount === 'number') {
                parsedEconomy = decodedEcon;
              }
            } catch {
              // Ignore malformed economy JSON
            }
          }

          const { cleanStatus, approvalStatus, age } = decodeStatusAndApproval(
            row.status,
            localApprovalMap[rowUuid]?.status,
            localCharMatch?.age
          );

          // Extract artistic RP death date if encoded in epitaph
          let extractedDeathDate = row.death_date || undefined;
          let cleanEpitaph = row.epitaph || undefined;
          if (cleanEpitaph) {
            const match = cleanEpitaph.match(
              /^\[Дата гибели в РП:\s*([^\]]+)\]\s*(.*)$/
            );
            if (match) {
              extractedDeathDate = match[1];
              cleanEpitaph = match[2] || undefined;
            }
          }

          return {
            id: row.id,
            ownerUserId: row.owner_user_id || undefined,
            isPlayerOwned: isMine && !row.is_deceased,
            approvalStatus,
            gmApprovalNote: localApprovalMap[rowUuid]?.note,
            approvedByGmId: localApprovalMap[rowUuid]?.approvedByGmId,
            portraitUrl: row.portrait_url || undefined,
            name: row.name || 'Без имени',
            gender: row.gender === 'Женский' ? 'Женский' : 'Мужской',
            age,
            nationality:
              row.nationality || 'Эллины Понта (Синопейцы и Ионийцы)',
            currentPolisId: resolvedPolisId,
            status: cleanStatus,
            position: row.position || 'Морской купец',
            nobleHouseOrParty:
              row.noble_house_or_party || 'Нейтралитет / Вне фракций',
            drachmas: Number(row.drachmas) ?? 400,
            appearance: row.appearance || '',
            personality: row.personality || '',
            backstory: row.backstory || '',
            keyEvents: charKeyEvents,
            inventory: charInventory,
            economy: parsedEconomy,
            isDeceased: Boolean(row.is_deceased),
            deathDate: extractedDeathDate,
            deathCause: row.death_cause || undefined,
            epitaph: cleanEpitaph,
            createdAt: row.created_at
              ? new Date(row.created_at).toLocaleDateString('ru-RU')
              : '110 г. до н.э.',
          };
        });
      }
    }
  } catch {
    // Ignore characters pull error
  }

  // 3. Pull `city_districts`
  try {
    const distRes = await fetch(`${baseUrl}/rest/v1/city_districts?select=*`, {
      headers,
    });
    if (distRes.ok) {
      const distRows = (await distRes.json()) as Array<{
        id: string;
        polis_id: string;
        name: string;
        category: string;
        points: string;
        label_x: number;
        label_y: number;
        label_rotate?: number;
        label_font_size?: number;
        description?: string;
        rp_hint?: string;
      }>;

      if (Array.isArray(distRows) && distRows.length > 0) {
        hasAnyRemoteData = true;
        const grouped: Record<string, unknown[]> = {};
        const seenByPolis: Record<string, Set<string>> = {};
        for (const r of distRows) {
          const pId = fromPolisUuid(r.polis_id);
          if (!grouped[pId]) grouped[pId] = [];
          if (!seenByPolis[pId]) seenByPolis[pId] = new Set();
          const normName = (r.name || '').trim().toUpperCase();
          if (normName && seenByPolis[pId].has(normName)) continue;
          if (normName) seenByPolis[pId].add(normName);

          grouped[pId].push({
            id: r.id,
            name: r.name,
            category: r.category,
            points: r.points,
            labelPos: {
              x: Number(r.label_x) || 960,
              y: Number(r.label_y) || 540,
              rotate: Number(r.label_rotate) || 0,
              fontSize: Number(r.label_font_size) || 22,
            },
            description: r.description || '',
            rpHint: r.rp_hint || '',
          });
        }
        result.cityDistrictsByPolis = grouped;
        if (grouped.sinope) {
          result.sinopeDistricts = grouped.sinope;
        }
      }
    }
  } catch {
    // Ignore city_districts pull error
  }

  // 4. Pull `law_articles`
  try {
    const lawRes = await fetch(`${baseUrl}/rest/v1/law_articles?select=*`, {
      headers,
    });
    if (lawRes.ok) {
      const lawRows = (await lawRes.json()) as Array<{
        id: string;
        chapter_id: string;
        number: string;
        title: string;
        text: string;
        clauses?: string[];
      }>;

      if (Array.isArray(lawRows) && lawRows.length > 0) {
        hasAnyRemoteData = true;
        result.lawChapters = INITIAL_LAW_CHAPTERS.map((chap) => {
          const matching: LawArticle[] = lawRows
            .filter((r) => fromChapterUuid(r.chapter_id) === chap.id)
            .map((r) => ({
              id: r.id,
              number: r.number,
              title: r.title,
              text: r.text,
              clauses: Array.isArray(r.clauses) ? r.clauses : [],
            }));
          return {
            ...chap,
            articles: matching.length > 0 ? matching : chap.articles,
          };
        });
      }
    }
  } catch {
    // Ignore law_articles pull error
  }

  if (!hasAnyRemoteData) {
    return null;
  }

  const merged: PersistedRpState = {
    ...localPersisted,
    ...result,
    politics:
      result.politics || localPersisted.politics || INITIAL_POLITICS_STATE,
  };
  savePersistedState(merged);
  return merged;
}

/**
 * Uploads a character portrait image to Supabase Storage bucket `character-portraits`
 * using the authenticated session token, or falls back to local Data URL.
 */
export async function uploadPortraitWithSupabaseFallback(
  file: File
): Promise<string> {
  if (isSupabaseConfigured() && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const { headers } = await getAuthHeaders();
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `portraits/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const baseUrl = SUPABASE_URL.replace(/\/$/, '');
      const uploadUrl = `${baseUrl}/storage/v1/object/character-portraits/${filePath}`;

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': file.type || 'image/png',
          'x-upsert': 'true',
        },
        body: file,
      });

      if (res.ok) {
        return `${baseUrl}/storage/v1/object/public/character-portraits/${filePath}`;
      }
    } catch {
      // Fallback to local FileReader below
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const maxLen = 10 * 1024 * 1024;
    if (file.size > maxLen) {
      reject(new Error('Image too large'));
      return;
    }
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

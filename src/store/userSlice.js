import { createSlice } from '@reduxjs/toolkit';
import usersData from '../data/users.json';
import {
  createUser,
  createBot,
  buildDefaultBots,
  determineRank,
  sanitizeUser
} from '../models/userModel';
import { apiClient, API_ENDPOINTS } from '../utils/apiClient';

const STORAGE_KEY = 'scrabbleUsers';
const CURRENT_USER_KEY = 'currentUser';

const hasWindow = typeof window !== 'undefined';
const storage = hasWindow ? window.localStorage : null;

const readStorage = (key) => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Storage read error for ${key}:`, error);
    return null;
  }
};

const writeStorage = (key, value) => {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Storage write error for ${key}:`, error);
  }
};

const normalizeUserShape = (rawUser) => {
  if (!rawUser) return null;
  
  // Username veya name alanından username oluştur
  const username = rawUser.username || rawUser.name;
  if (!username || username.trim() === '') {
    console.warn('Invalid user data: missing username/name', rawUser);
    return null;
  }

  const merged = {
    ...rawUser,
    username, // name alanından da username oluşturabilir
    gamesWon: rawUser.gamesWon ?? rawUser.wins ?? 0,
    gamesLost: rawUser.gamesLost ?? rawUser.losses ?? 0,
    totalScore: rawUser.totalScore ?? 0,
    gamesPlayed: rawUser.gamesPlayed ?? rawUser.played ?? 0,
    bestScore: rawUser.bestScore ?? 0,
    password: rawUser.isBot ? null : rawUser.password,
    isBot: Boolean(rawUser.isBot)
  };

  const builder = merged.isBot ? createBot : createUser;

  return builder({
    id: merged.id,
    username: merged.username,
    email: merged.email,
    password: merged.password,
    totalScore: merged.totalScore,
    gamesPlayed: merged.gamesPlayed,
    gamesWon: merged.gamesWon,
    gamesLost: merged.gamesLost,
    bestScore: merged.bestScore,
    isOnline: merged.isOnline ?? false,
    createdAt: merged.createdAt,
    lastLogin: merged.lastLogin,
    currentGame: merged.currentGame ?? null,
    waitingForMatch: merged.waitingForMatch ?? false,
    avatar: merged.avatar,
    streak: merged.streak ?? 0,
    elo: merged.elo ?? 1200,
    botMeta: merged.botMeta,
    difficulty: merged.botMeta?.difficulty,
    strategy: merged.botMeta?.strategy,
    flavorText: merged.botMeta?.flavorText
  });
};

const ensureBotRoster = (users) => {
  const humans = users.filter((user) => !user.isBot);
  const currentBots = users.filter((user) => user.isBot);
  const defaultBots = buildDefaultBots();

  const mergedBots = defaultBots.map((defaultBot) => {
    const existing = currentBots.find(
      (bot) => bot.id === defaultBot.id || (bot.username && bot.username === defaultBot.username)
    );

    if (!existing) {
      return defaultBot;
    }

    const score = existing.totalScore ?? defaultBot.totalScore;
    const wins = existing.gamesWon ?? defaultBot.gamesWon;

    return {
      ...existing,
      totalScore: score,
      gamesWon: wins,
      gamesPlayed: existing.gamesPlayed ?? defaultBot.gamesPlayed,
      gamesLost: existing.gamesLost ?? existing.gamesPlayed ?? defaultBot.gamesLost ?? 0,
      rank: determineRank({ totalScore: score, gamesWon: wins }),
      botMeta: existing.botMeta ?? defaultBot.botMeta
    };
  });

  return [...humans, ...mergedBots];
};

const buildDefaultUsers = () => {
  const humans = (usersData.users || []).map((user) => normalizeUserShape(user));
  const botsFromData = (usersData.bots || []).map((bot) => normalizeUserShape({ ...bot, isBot: true }));
  const combined = [...humans, ...botsFromData];
  return ensureBotRoster(combined);
};

const normalizeHumans = (records = []) =>
  records
    .map((record) => normalizeUserShape({ ...record, isBot: record.isBot ?? false }))
    .filter((user) => Boolean(user) && !user.isBot);

const normalizeBots = (records = []) =>
  records
    .map((record) => normalizeUserShape({ ...record, isBot: true }))
    .filter((user) => Boolean(user) && user.isBot);

const fetchCollection = async (endpoint) => {
  try {
    const data = await apiClient.get(endpoint);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(`API fetch failed for ${endpoint}:`, error);
    return [];
  }
};

const seedCollection = async (endpoint, records) => {
  const created = await Promise.all(
    records.map(async (record) => {
      try {
        return await apiClient.post(endpoint, record);
      } catch (error) {
        console.warn(`Seeding failed for ${endpoint}:`, error);
        return null;
      }
    })
  );

  return created.filter(Boolean);
};

const ensureRemoteBots = async (currentBots) => {
  // Botları artık API'den çekmiyoruz, sadece local'den oluşturuyoruz
  const defaultBots = buildDefaultBots();
  return normalizeBots(defaultBots);
};

const ensureRemoteHumans = async (currentHumans) => {
  let normalizedHumans = normalizeHumans(currentHumans);

  if (normalizedHumans.length) {
    return normalizedHumans;
  }

  const defaults = buildDefaultUsers().filter((user) => !user.isBot);
  if (!defaults.length) {
    return normalizedHumans;
  }

  const created = await seedCollection(API_ENDPOINTS.USERS, defaults);
  const normalizedCreated = normalizeHumans(created);
  return normalizedCreated.length ? normalizedCreated : defaults;
};

const loadUsers = () => {
  const stored = readStorage(STORAGE_KEY);
  if (Array.isArray(stored) && stored.length) {
    const normalized = stored
      .map((user) => normalizeUserShape(user))
      .filter(Boolean);
    return ensureBotRoster(normalized);
  }

  const defaults = buildDefaultUsers();
  writeStorage(STORAGE_KEY, defaults);
  return defaults;
};

const loadCurrentUser = (users) => {
  const stored = readStorage(CURRENT_USER_KEY);
  if (!stored) return null;

  const matched = users.find((user) => user.id === stored.id);
  return matched ? sanitizeUser(matched) : null;
};

const persistUsers = (users) => {
  writeStorage(STORAGE_KEY, users);
};

const persistCurrentUser = (user) => {
  if (!user) {
    if (storage) {
      storage.removeItem(CURRENT_USER_KEY);
    }
    return;
  }
  writeStorage(CURRENT_USER_KEY, sanitizeUser(user));
};

const buildDemoUser = () => {
  const demo = createUser({
    id: 'demo-user',
    username: 'Demo Player',
    email: 'demo@scrabble.com',
    password: 'demo',
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    bestScore: 0,
    isOnline: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    waitingForMatch: false,
    currentGame: null
  });

  return {
    ...sanitizeUser(demo),
    isDemo: true
  };
};

// --- Matchmaking helpers -------------------------------------------------

const rankNames = (() => {
  // import RANK_LEVELS dynamically to avoid circular import; replicate order from model
  // If model changes, keep this in sync.
  return [
    'Acemi',
    'Çırak',
    'Stajyer',
    'Kaşifi',
    'Kelimeci',
    'Avcı',
    'Uzman',
    'Bilge',
    'Şampiyon',
    'Usta'
  ];
})();

const rankIndex = (rank) => rankNames.findIndex((r) => r === rank);

const eligibleRanksFor = (rank) => {
  const idx = rankIndex(rank);
  if (idx === -1) return [];
  const last = rankNames.length - 1;

  // Special cases per spec
  if (idx === 0) {
    // Acemi matches with Çırak and Stajyer only
    return [rankNames[1], rankNames[2]].filter(Boolean);
  }

  if (idx === last) {
    // Usta matches with Şampiyon and Bilge only
    return [rankNames[last - 1], rankNames[last - 2]].filter(Boolean);
  }

  // General case: one below, same, one above
  const below = rankNames[idx - 1];
  const same = rankNames[idx];
  const above = rankNames[idx + 1];
  return [below, same, above].filter(Boolean);
};

const generateGameId = () => `game-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

// Try to find a waiting human opponent matching rank rules
const findHumanOpponent = (users, currentUser) => {
  const eligible = eligibleRanksFor(currentUser.rank);
  return users.find((u) =>
    u.id !== currentUser.id &&
    !u.isBot &&
    u.isOnline &&
    u.waitingForMatch &&
    eligible.includes(u.rank)
  );
};

// Find a bot with eligible rank (prefer closest rank)
const findBotOpponent = (bots, currentUser) => {
  const eligible = eligibleRanksFor(currentUser.rank);
  // prefer bot with same rank, then nearby
  const byPreference = [...eligible];
  for (const rank of byPreference) {
    const match = bots.find((b) => b.rank === rank);
    if (match) return match;
  }
  // fallback to any bot
  return bots.length ? bots[Math.floor(Math.random() * bots.length)] : null;
};

// --- Matchmaking thunks --------------------------------------------------

export const startMatchmaking = (options = {}) => async (dispatch, getState) => {
  const { roomId = null } = options;
  dispatch(setLoading(true));
  dispatch(setError(null));

  const { currentUser, users } = getState().user;
  if (!currentUser) {
    const err = 'Oturum açılmış kullanıcı yok.';
    dispatch(setError(err));
    dispatch(setLoading(false));
    return { success: false, error: err };
  }

  try {
    // mark current user as waiting
    const updatedCurrent = { ...currentUser, waitingForMatch: true, isOnline: true };

    // optimistic local update
    const optimisticUsers = users.map((u) => (u.id === updatedCurrent.id ? updatedCurrent : u));
    dispatch(setUsers(optimisticUsers));
    dispatch(setCurrentUser(updatedCurrent));

    // try to sync to API (best-effort)
    try {
      await apiClient.put(`${API_ENDPOINTS.USERS}/${updatedCurrent.id}`, updatedCurrent);
    } catch (err) {
      console.warn('Cannot persist waiting state to API:', err);
    }

    // fetch fresh roster (attempt)
    let roster = users;
    try {
      const remoteUsers = await fetchCollection(API_ENDPOINTS.USERS);
      roster = normalizeHumans(remoteUsers).concat(buildDefaultBots());
    } catch (err) {
      // ignore, use local roster
    }

    // find human opponent
    const opponent = findHumanOpponent(roster, updatedCurrent);

    if (opponent) {
      // create game and update both users
      const gameId = generateGameId();
      const now = new Date().toISOString();

      const me = {
        ...updatedCurrent,
        waitingForMatch: false,
        currentGame: {
          id: gameId,
          opponentId: opponent.id,
          opponentIsBot: false,
          startedAt: now,
          boardId: roomId
        }
      };
      const them = {
        ...opponent,
        waitingForMatch: false,
        currentGame: {
          id: gameId,
          opponentId: me.id,
          opponentIsBot: false,
          startedAt: now,
          boardId: roomId
        }
      };

      const newUsers = roster.map((u) => (u.id === me.id ? me : u.id === them.id ? them : u));
      dispatch(setUsers(newUsers));
      dispatch(setCurrentUser(me));

      // persist both
      try {
        await Promise.all([
          apiClient.put(`${API_ENDPOINTS.USERS}/${me.id}`, me),
          apiClient.put(`${API_ENDPOINTS.USERS}/${them.id}`, them)
        ]);
      } catch (err) {
        console.warn('Failed to persist matched users to API:', err);
      }

      dispatch(setLoading(false));
      return {
        success: true,
        match: {
          gameId,
          opponent: sanitizeUser(them),
          opponentIsBot: false,
          boardId: roomId,
          startedAt: now
        }
      };
    }

    // no human found => fallback to bot
    const bots = roster.filter((r) => r.isBot);
    const bot = findBotOpponent(bots, updatedCurrent);

    if (!bot) {
      // no bot available
      dispatch(setLoading(false));
      return { success: false, error: 'Rakip bulunamadı ve bot yok.' };
    }

    const gameId = generateGameId();
    const now = new Date().toISOString();

    const meFinal = {
      ...updatedCurrent,
      waitingForMatch: false,
      currentGame: {
        id: gameId,
        opponentId: bot.id,
        opponentIsBot: true,
        startedAt: now,
        boardId: roomId
      }
    };
    const botFinal = {
      ...bot,
      currentGame: {
        id: gameId,
        opponentId: meFinal.id,
        opponentIsBot: true,
        startedAt: now,
        boardId: roomId
      },
      isOnline: true
    };

    const newUsers = roster.map((u) => (u.id === meFinal.id ? meFinal : u.id === botFinal.id ? botFinal : u));
    dispatch(setUsers(newUsers));
    dispatch(setCurrentUser(meFinal));

    // persist (sadece kullanıcı, bot local'de kalacak)
    try {
      await apiClient.put(`${API_ENDPOINTS.USERS}/${meFinal.id}`, meFinal);
    } catch (err) {
      console.warn('Failed to persist bot match to API:', err);
    }

    dispatch(setLoading(false));
    return {
      success: true,
      match: {
        gameId,
        opponent: sanitizeUser(botFinal),
        opponentIsBot: true,
        boardId: roomId,
        startedAt: now
      }
    };
  } catch (error) {
    console.error('Matchmaking error:', error);
    dispatch(setError('Eşleştirme sırasında hata oluştu.'));
    dispatch(setLoading(false));
    return { success: false, error: 'Eşleştirme sırasında hata oluştu.' };
  }
};


const initialUsers = loadUsers();
const initialCurrentUser = loadCurrentUser(initialUsers);

const initialState = {
  users: initialUsers,
  currentUser: initialCurrentUser,
  isAuthenticated: Boolean(initialCurrentUser),
  loading: false,
  error: null
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUsers(state, action) {
      state.users = ensureBotRoster(action.payload.map((user) => normalizeUserShape(user)).filter(Boolean));
      persistUsers(state.users);
    },
    setCurrentUser(state, action) {
      state.currentUser = action.payload ? sanitizeUser(action.payload) : null;
      state.isAuthenticated = Boolean(action.payload);
      persistCurrentUser(state.currentUser);
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    }
  }
});

export const { setUsers, setCurrentUser, setLoading, setError } = userSlice.actions;

export const initializeUsers = () => async (dispatch) => {
  dispatch(setLoading(true));
  dispatch(setError(null));

  try {
    const remoteHumansRaw = await fetchCollection(API_ENDPOINTS.USERS);

    const humans = await ensureRemoteHumans(remoteHumansRaw);
    const bots = await ensureRemoteBots([]); // Botlar local'den gelecek

    const roster = ensureBotRoster([...humans, ...bots]);

    dispatch(setUsers(roster));

    const cachedCurrent = loadCurrentUser(roster);
    dispatch(setCurrentUser(cachedCurrent || null));

    return { success: true, count: roster.length };
  } catch (error) {
    console.error('initializeUsers error:', error);
    const fallback = buildDefaultUsers();
    dispatch(setUsers(fallback));
    const friendlyError = 'Sunucudan kullanıcı verileri alınamadı, yerel veriler yüklendi.';
    dispatch(setError(friendlyError));
    return { success: false, error: friendlyError };
  } finally {
    dispatch(setLoading(false));
  }
};

export const loginUser = ({ identifier, password }) => async (dispatch, getState) => {
  dispatch(setLoading(true));
  dispatch(setError(null));

  try {
    const trimmedIdentifier = identifier?.trim().toLowerCase();

    if (!trimmedIdentifier) {
      const error = 'Kullanıcı adı veya e-posta alanı boş bırakılamaz!';
      dispatch(setError(error));
      return { success: false, error };
    }

    if (trimmedIdentifier === 'demo' && password === 'demo') {
      const demoUser = {
        ...buildDemoUser(),
        lastLogin: new Date().toISOString()
      };

      dispatch(setCurrentUser(demoUser));
      return { success: true, user: demoUser };
    }

    const { users } = getState().user;
    const user = users.find((candidate) => {
      if (candidate.isBot) return false;
      const usernameMatches = candidate.username?.toLowerCase() === trimmedIdentifier;
      const emailMatches = candidate.email?.toLowerCase() === trimmedIdentifier;
      const passwordMatches = candidate.password === password;
      return passwordMatches && (usernameMatches || emailMatches);
    });

    if (!user) {
      const error = 'Kullanıcı adı veya şifre hatalı!';
      dispatch(setError(error));
      return { success: false, error };
    }

    const updatedSnapshot = normalizeUserShape({
      ...user,
      lastLogin: new Date().toISOString(),
      isOnline: true
    });

    let syncedUser = { ...updatedSnapshot, password: updatedSnapshot.password ?? user.password };

    try {
      const apiResponse = await apiClient.put(`${API_ENDPOINTS.USERS}/${user.id}`, syncedUser);
      const normalizedResponse = normalizeUserShape(apiResponse);
      syncedUser = {
        ...normalizedResponse,
        password: normalizedResponse.password ?? user.password
      };
    } catch (syncError) {
      console.warn('Giriş senkronizasyonu sırasında API hatası:', syncError);
    }

    const updatedUsers = getState()
      .user
      .users
      .map((candidate) => (candidate.id === user.id ? syncedUser : candidate));

    dispatch(setUsers(updatedUsers));
    dispatch(setCurrentUser(syncedUser));

    return { success: true, user: sanitizeUser(syncedUser) };
  } catch (error) {
    console.error('Login error:', error);
    const friendlyError = 'Giriş sırasında bir hata oluştu!';
    dispatch(setError(friendlyError));
    return { success: false, error: friendlyError };
  } finally {
    dispatch(setLoading(false));
  }
};

export const registerUser = ({ username, email, password }) => async (dispatch, getState) => {
  dispatch(setLoading(true));
  dispatch(setError(null));

  const trimmedUsername = username?.trim() || '';
  const normalizedUsername = trimmedUsername.toLowerCase();
  const trimmedEmail = email?.trim() || '';
  const normalizedEmail = trimmedEmail.toLowerCase();

  try {
    const { users } = getState().user;

    const usernameTaken = users.some(
      (user) => !user.isBot && user.username?.toLowerCase() === normalizedUsername
    );

    if (usernameTaken) {
      const error = 'Bu kullanıcı adı zaten kullanılıyor!';
      dispatch(setError(error));
      return { success: false, error };
    }

    const emailTaken = users.some(
      (user) => !user.isBot && user.email?.toLowerCase() === normalizedEmail
    );

    if (emailTaken) {
      const error = 'Bu email adresi zaten kayıtlı!';
      dispatch(setError(error));
      return { success: false, error };
    }

    const newUser = createUser({
      username: trimmedUsername,
      email: normalizedEmail,
      password,
      totalScore: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      bestScore: 0,
      isOnline: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      waitingForMatch: false,
      currentGame: null
    });

    let persistedUser = newUser;

    try {
      const apiResponse = await apiClient.post(API_ENDPOINTS.USERS, newUser);
      const normalizedResponse = normalizeUserShape(apiResponse);
      persistedUser = {
        ...normalizedResponse,
        password: normalizedResponse.password ?? newUser.password
      };
    } catch (syncError) {
      console.warn('Kayıt senkronizasyonu sırasında API hatası:', syncError);
    }

    const updatedUsers = [...users, persistedUser];

    dispatch(setUsers(updatedUsers));
    dispatch(setCurrentUser(persistedUser));

    return { success: true, user: sanitizeUser(persistedUser) };
  } catch (error) {
    console.error('Register error:', error);
    const friendlyError = 'Kayıt sırasında bir hata oluştu!';
    dispatch(setError(friendlyError));
    return { success: false, error: friendlyError };
  } finally {
    dispatch(setLoading(false));
  }
};

export const logoutUser = () => async (dispatch, getState) => {
  const { currentUser, users } = getState().user;

  if (!currentUser) {
    dispatch(setCurrentUser(null));
    return;
  }

  if (currentUser.isDemo) {
    dispatch(setCurrentUser(null));
    return;
  }

  const target = users.find((user) => user.id === currentUser.id);

  if (!target) {
    dispatch(setCurrentUser(null));
    return;
  }

  const snapshot = normalizeUserShape({
    ...target,
    isOnline: false,
    lastLogin: new Date().toISOString()
  });

  let syncedUser = { ...snapshot, password: snapshot.password ?? target.password };

  try {
    const apiResponse = await apiClient.put(`${API_ENDPOINTS.USERS}/${target.id}`, syncedUser);
    const normalizedResponse = normalizeUserShape(apiResponse);
    syncedUser = {
      ...normalizedResponse,
      password: normalizedResponse.password ?? target.password
    };
  } catch (syncError) {
    console.warn('Çıkış senkronizasyonu sırasında API hatası:', syncError);
  }

  const updatedUsers = users.map((user) =>
    user.id === target.id ? syncedUser : user
  );

  dispatch(setUsers(updatedUsers));
  dispatch(setCurrentUser(null));
};

export const updateUserStats = (newStats) => async (dispatch, getState) => {
  dispatch(setError(null));

  const { currentUser, users } = getState().user;
  if (!currentUser) {
    const error = 'Kullanıcı oturumu bulunamadı.';
    dispatch(setError(error));
    return { success: false, error };
  }

  const target = users.find((user) => user.id === currentUser.id);
  if (!target) {
    const error = 'Kullanıcı bulunamadı.';
    dispatch(setError(error));
    return { success: false, error };
  }

  const merged = {
    ...target,
    ...newStats
  };

  merged.gamesWon = merged.gamesWon ?? target.gamesWon ?? 0;
  merged.gamesPlayed = merged.gamesPlayed ?? target.gamesPlayed ?? 0;
  merged.totalScore = merged.totalScore ?? target.totalScore ?? 0;
  merged.bestScore = merged.bestScore ?? target.bestScore ?? 0;
  merged.gamesLost = merged.gamesLost ?? Math.max(merged.gamesPlayed - merged.gamesWon, 0);
  merged.rank = determineRank({ totalScore: merged.totalScore, gamesWon: merged.gamesWon });

  let syncedUser = normalizeUserShape(merged);
  syncedUser = { ...syncedUser, password: syncedUser.password ?? target.password };

  let apiError = false;

  try {
    const apiResponse = await apiClient.put(`${API_ENDPOINTS.USERS}/${target.id}`, syncedUser);
    const normalizedResponse = normalizeUserShape(apiResponse);
    syncedUser = {
      ...normalizedResponse,
      password: normalizedResponse.password ?? target.password
    };
  } catch (error) {
    apiError = true;
    console.error('İstatistik senkronizasyonu sırasında API hatası:', error);
    dispatch(setError('İstatistikler sunucuya kaydedilemedi, yerel veriler güncellendi.'));
  }

  const updatedUsers = users.map((user) =>
    user.id === target.id ? syncedUser : user
  );

  dispatch(setUsers(updatedUsers));
  dispatch(setCurrentUser(syncedUser));

  return apiError
    ? { success: false, user: sanitizeUser(syncedUser), error: 'Sunucuya kaydedilemedi.' }
    : { success: true, user: sanitizeUser(syncedUser) };
};

export const selectUsers = (state) => state.user.users;
export const selectBots = (state) => state.user.users.filter((user) => user.isBot);
export const selectCurrentUser = (state) => state.user.currentUser;
export const selectIsAuthenticated = (state) => state.user.isAuthenticated;
export const selectAuthLoading = (state) => state.user.loading;
export const selectAuthError = (state) => state.user.error;

export default userSlice.reducer;

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const {
  db,
  findUserByEmail,
  getUserById,
  getAllUsers,
  createUser,
  updateBalance,
  createItem,
  getAllItems,
  getItem,
  createCase,
  getCase,
  getAllCases,
  addCaseItem,
  getCaseItems,
  addCaseHistory,
  getCaseHistoryByUser
} = require('./db');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET';
const ADMIN_KEY = process.env.ADMIN_KEY || 'supersecretadminkey';
const BALANCE_ADMIN_EMAIL = 'egemeric92@gmail.com';
const RESERVED_ADMIN_NAME = 'donk';
const PORT = Number(process.env.PORT || 3000);
const battleLobbies = new Map();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
  if (!storedValue || !String(storedValue).includes(':')) return false;
  const [salt, originalHash] = String(storedValue).split(':');
  const targetLength = Buffer.from(originalHash, 'hex').length;
  const candidateHash = crypto.scryptSync(String(password), salt, targetLength).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(candidateHash, 'hex'));
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: Boolean(user.is_admin)
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');
  if (!token) return res.status(401).json({ error: 'giris gerekli' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getUserById(payload.id);
    if (!user) return res.status(401).json({ error: 'kullanici bulunamadi' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'gecersiz token' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'admin gerekli' });
  }
  next();
}

function balanceManagerMiddleware(req, res, next) {
  if (String(req.user?.email || '').toLowerCase() !== BALANCE_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'bu alan sadece ozel admin hesabina acik' });
  }
  next();
}

function calculateItemPayout(item) {
  return Number(((Number(item.base_price || 0) * Number(item.payout_percent || 0)) / 100).toFixed(2));
}

function chooseWeightedItem(items) {
  const normalized = (Array.isArray(items) ? items : [])
    .map(item => ({ ...item, quantity: Number(item.quantity || 0) }))
    .filter(item => item.quantity > 0);

  const totalWeight = normalized.reduce((sum, item) => sum + item.quantity, 0);
  if (!totalWeight) return null;

  let random = Math.random() * totalWeight;
  for (const item of normalized) {
    random -= item.quantity;
    if (random <= 0) return item;
  }

  return normalized[normalized.length - 1] || null;
}

function openCaseForUser(userId, caseId) {
  const user = getUserById(userId);
  const kasa = getCase(Number(caseId));
  if (!user) {
    const err = new Error('kullanici bulunamadi');
    err.status = 404;
    throw err;
  }
  if (!kasa) {
    const err = new Error('kasa bulunamadi');
    err.status = 404;
    throw err;
  }
  if (Number(user.balance) < Number(kasa.price)) {
    const err = new Error('yetersiz bakiye');
    err.status = 400;
    throw err;
  }

  const items = getCaseItems(kasa.id);
  const winningItem = chooseWeightedItem(items);
  if (!winningItem) {
    const err = new Error('kasa ici item yok');
    err.status = 400;
    throw err;
  }

  const payout = calculateItemPayout(winningItem);
  const balance = Number((Number(user.balance) - Number(kasa.price) + payout).toFixed(2));

  db.prepare('BEGIN').run();
  try {
    updateBalance(user.id, balance);
    addCaseHistory(user.id, kasa.id, winningItem.id, payout);
    db.prepare('COMMIT').run();
  } catch (error) {
    db.prepare('ROLLBACK').run();
    throw error;
  }

  return {
    case: kasa,
    item: {
      id: winningItem.id,
      name: winningItem.name,
      payout,
      probability: null,
      item_rarity: winningItem.rarity
    },
    payout,
    balance
  };
}

function getBattleTeamForSeat(seat, playerCount) {
  const teamSize = playerCount === 4 ? 2 : 1;
  return seat <= teamSize ? 1 : 2;
}

function normalizeBattleCaseEntries(rawEntries) {
  return (Array.isArray(rawEntries) ? rawEntries : [])
    .map(entry => ({
      caseId: Number(entry.caseId),
      quantity: Math.max(0, Number(entry.quantity) || 0)
    }))
    .filter(entry => entry.caseId && entry.quantity > 0);
}

function expandBattleCases(entries) {
  const expandedCases = [];
  let totalCost = 0;

  for (const entry of entries) {
    const kasa = getCase(entry.caseId);
    if (!kasa) {
      const err = new Error('kasa bulunamadi');
      err.status = 404;
      throw err;
    }

    totalCost += Number((Number(kasa.price) * entry.quantity).toFixed(2));
    for (let i = 0; i < entry.quantity; i += 1) {
      expandedCases.push({
        id: kasa.id,
        name: kasa.name,
        price: Number(kasa.price)
      });
    }
  }

  return {
    expandedCases,
    totalCost: Number(totalCost.toFixed(2))
  };
}

function buildBattleRoundsForCase(caseId, playerCount, participants) {
  const kasa = getCase(caseId);
  const items = getCaseItems(caseId);
  if (!kasa) {
    const err = new Error('kasa bulunamadi');
    err.status = 404;
    throw err;
  }
  if (!items.length) {
    const err = new Error('kasa ici item yok');
    err.status = 400;
    throw err;
  }

  const rounds = [];
  for (let seat = 1; seat <= playerCount; seat += 1) {
    const participant = participants.find(entry => Number(entry.seat) === seat);
    const won = chooseWeightedItem(items);
    const payout = calculateItemPayout(won);
    rounds.push({
      seat,
      team: getBattleTeamForSeat(seat, playerCount),
      player_name: participant?.player_name || `Oyuncu ${seat}`,
      isBot: Boolean(participant?.isBot),
      payout,
      item_name: won.name,
      item: {
        id: won.id,
        name: won.name,
        rarity: won.rarity
      }
    });
  }

  return {
    case: {
      id: kasa.id,
      name: kasa.name,
      price: Number(kasa.price)
    },
    rounds
  };
}

function summarizeBattleLobby(lobby, currentUserId = 0) {
  const occupiedSeats = new Set(lobby.participants.map(participant => Number(participant.seat)));
  const slots = [];

  for (let seat = 1; seat <= lobby.playerCount; seat += 1) {
    const participant = lobby.participants.find(entry => Number(entry.seat) === seat);
    slots.push(participant || {
      seat,
      team: getBattleTeamForSeat(seat, lobby.playerCount),
      player_name: 'Bos Slot',
      isBot: false,
      isEmpty: true
    });
  }

  const openSeats = lobby.playerCount - occupiedSeats.size;
  const isParticipant = lobby.participants.some(participant => Number(participant.userId || 0) === Number(currentUserId || 0));

  return {
    id: lobby.id,
    status: lobby.status,
    creatorId: lobby.creatorId,
    creatorName: lobby.creatorName,
    playerCount: lobby.playerCount,
    mode: lobby.playerCount === 4 ? '2v2' : '1v1',
    totalCost: lobby.totalCost,
    totalRounds: lobby.totalRounds,
    caseEntries: lobby.caseEntries,
    balance: lobby.balance,
    slots,
    participants: lobby.participants,
    openSeats,
    isParticipant,
    canJoin: lobby.status === 'waiting' && openSeats > 0 && !isParticipant,
    canAddBot: lobby.status === 'waiting' && openSeats > 0 && Number(currentUserId || 0) === Number(lobby.creatorId),
    canOpen: lobby.status === 'ready' && isParticipant
  };
}

function createBattleResult(lobby) {
  const battleCases = lobby.expandedCases.map((battleCase, index) => ({
    roundNumber: index + 1,
    ...buildBattleRoundsForCase(battleCase.id, lobby.playerCount, lobby.participants)
  }));

  const rounds = battleCases.flatMap(entry => entry.rounds);
  const playerTotals = new Map();

  rounds.forEach(round => {
    const current = playerTotals.get(round.seat) || {
      seat: round.seat,
      player_name: round.player_name,
      team: round.team,
      total: 0,
      isBot: round.isBot
    };
    current.total = Number((current.total + Number(round.payout || 0)).toFixed(2));
    playerTotals.set(round.seat, current);
  });

  const teams = [1, 2].map(teamId => {
    const players = Array.from(playerTotals.values()).filter(player => Number(player.team) === teamId);
    return {
      id: teamId,
      name: teamId === 1 ? 'Takim 1' : 'Takim 2',
      total: Number(players.reduce((sum, player) => sum + Number(player.total || 0), 0).toFixed(2)),
      players
    };
  });

  const totalPayout = Number(rounds.reduce((sum, round) => sum + Number(round.payout || 0), 0).toFixed(2));
  const winnerTeam = teams[0].total >= teams[1].total ? teams[0] : teams[1];
  const realWinners = lobby.participants.filter(
    participant => !participant.isBot && Number(getBattleTeamForSeat(participant.seat, lobby.playerCount)) === Number(winnerTeam.id)
  );
  const winnerCount = Math.max(1, Array.isArray(winnerTeam.players) ? winnerTeam.players.length : 0);
  const winnerShare = Number((totalPayout / winnerCount).toFixed(2));
  const winnerUserIds = realWinners
    .map(participant => Number(participant.userId || 0))
    .filter(Boolean);

  db.prepare('BEGIN').run();
  try {
    realWinners.forEach(participant => {
      const user = getUserById(participant.userId);
      if (!user) return;
      const nextBalance = Number((Number(user.balance) + winnerShare).toFixed(2));
      updateBalance(user.id, nextBalance);
    });
    db.prepare('COMMIT').run();
  } catch (error) {
    db.prepare('ROLLBACK').run();
    throw error;
  }

  return {
    id: lobby.id,
    playerCount: lobby.playerCount,
    mode: lobby.playerCount === 4 ? '2v2' : '1v1',
    totalCost: lobby.totalCost,
    totalPayout,
    winnerShare,
    winnerUserIds,
    battleCases,
    rounds,
    teams,
    winnerTeam,
    balance: null
  };
}

function decorateBattleResultForUser(result, userId) {
  if (!result) return result;

  const normalizedUserId = Number(userId || 0);
  const winnerUserIds = Array.isArray(result.winnerUserIds) ? result.winnerUserIds.map(id => Number(id || 0)) : [];
  const won = normalizedUserId > 0 && winnerUserIds.includes(normalizedUserId);
  const userBalance = normalizedUserId > 0 ? getUserById(normalizedUserId)?.balance : null;

  return {
    ...result,
    battleReward: won ? Number(result.winnerShare || 0) : 0,
    balance: userBalance ?? result.balance ?? null
  };
}

function tryResolveBattleLobby(lobby) {
  const occupiedSeats = new Set(lobby.participants.map(participant => Number(participant.seat)));
  if (occupiedSeats.size < lobby.playerCount) return null;

  lobby.status = 'ready';
  lobby.result = createBattleResult(lobby);
  return lobby.result;
}

app.post('/register', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const adminKey = String(req.body?.adminKey || '');

  if (!name || !email || !password) return res.status(400).json({ error: 'isim, email ve sifre gerekli' });
  if (name.length < 2) return res.status(400).json({ error: 'isim cok kisa' });
  if (name.toLowerCase() === RESERVED_ADMIN_NAME) {
    return res.status(400).json({ error: 'bu isim rezerve, baska bir isim sec' });
  }
  if (password.length < 3) return res.status(400).json({ error: 'sifre cok kisa' });
  if (findUserByEmail(email)) return res.status(400).json({ error: 'email zaten kayitli' });

  const isAdmin = adminKey && adminKey === ADMIN_KEY ? 1 : 0;
  createUser(name, email, hashPassword(password), isAdmin);
  return res.json({ message: 'kayit basarili' });
});

app.post('/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = findUserByEmail(email);

  const isLegacyDemoLogin = user && user.email === 'test@test.com' && password === 'test';
  const validPassword = user && (isLegacyDemoLogin || verifyPassword(password, user.password));

  if (!user || !validPassword) {
    return res.status(401).json({ error: 'email veya sifre hatali' });
  }

  if (isLegacyDemoLogin) {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), user.id);
  }

  return res.json({
    token: signToken(user),
    user: getUserById(user.id)
  });
});

app.get('/me', authMiddleware, (req, res) => {
  res.json(getUserById(req.user.id));
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/admin/users', authMiddleware, adminMiddleware, balanceManagerMiddleware, (req, res) => {
  res.json(getAllUsers());
});

app.post('/admin/users/:id/balance', authMiddleware, adminMiddleware, balanceManagerMiddleware, (req, res) => {
  const userId = Number(req.params.id);
  const amount = Number(req.body?.amount);

  if (!userId) return res.status(400).json({ error: 'gecersiz kullanici' });
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'gecersiz miktar' });

  const targetUser = getUserById(userId);
  if (!targetUser) return res.status(404).json({ error: 'kullanici bulunamadi' });

  const nextBalance = Number((Number(targetUser.balance) + amount).toFixed(2));
  updateBalance(userId, nextBalance);

  res.json({
    message: 'bakiye eklendi',
    user: getUserById(userId)
  });
});

app.get('/items', (req, res) => {
  res.json(getAllItems());
});

app.get('/cases', (req, res) => {
  res.json(getAllCases());
});

app.get('/cases/:id', (req, res) => {
  const kasa = getCase(Number(req.params.id));
  if (!kasa) return res.status(404).json({ error: 'kasa bulunamadi' });
  res.json(kasa);
});

app.post('/cases/:id/open', authMiddleware, (req, res) => {
  try {
    res.json(openCaseForUser(req.user.id, req.params.id));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'kasa acilamadi' });
  }
});

app.post('/cases/open', authMiddleware, (req, res) => {
  try {
    res.json(openCaseForUser(req.user.id, req.body?.caseId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'kasa acilamadi' });
  }
});

app.get('/cases/:id/odds', (req, res) => {
  const caseId = Number(req.params.id);
  const kasa = getCase(caseId);
  if (!kasa) return res.status(404).json({ error: 'kasa yok' });

  const items = getCaseItems(caseId);
  if (!items || items.length === 0) return res.status(400).json({ error: 'kasa ici item yok' });

  const totalWeight = items.reduce((sum, itm) => sum + Number(itm.quantity || 0), 0);
  const odds = items.map(itm => ({
    item_id: itm.id,
    id: itm.id,
    name: itm.name,
    item_rarity: itm.rarity,
    probability: Number(((Number(itm.quantity || 0) / totalWeight) * 100).toFixed(2)),
    payout: calculateItemPayout(itm)
  }));

  res.json({ case_id: caseId, totalWeight, odds });
});

app.get('/history', authMiddleware, (req, res) => {
  res.json(getCaseHistoryByUser(req.user.id));
});

app.post('/community-cases', authMiddleware, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!name || !items.length) return res.status(400).json({ error: 'eksik bilgi' });

  const normalizedItems = items
    .map(item => ({
      id: Number(item.id),
      quantity: Number(item.quantity || 0)
    }))
    .filter(item => item.id && item.quantity > 0);

  if (!normalizedItems.length) {
    return res.status(400).json({ error: 'gecerli item secimi yok' });
  }

  const totalWeight = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
  if (totalWeight > 100) {
    return res.status(400).json({ error: "toplam oran 100'u gecemez" });
  }

  const expectedValue = normalizedItems.reduce((sum, entry) => {
    const item = getItem(entry.id);
    if (!item) return sum;
    return sum + ((entry.quantity / totalWeight) * calculateItemPayout(item));
  }, 0);
  const price = Math.max(1, Number((expectedValue * 1.12).toFixed(2)));

  const result = createCase(name, price, req.user.name || req.user.email);
  normalizedItems.forEach(item => addCaseItem(result.lastInsertRowid, item.id, item.quantity));

  res.json({
    message: 'kasa olusturuldu',
    caseId: result.lastInsertRowid,
    price
  });
});

app.get('/battle-lobbies', authMiddleware, (req, res) => {
  const lobbies = Array.from(battleLobbies.values()).map(lobby => summarizeBattleLobby(lobby, req.user.id));
  res.json(lobbies);
});

app.get('/battle-lobbies/:id', authMiddleware, (req, res) => {
  const lobby = battleLobbies.get(String(req.params.id));
  if (!lobby) return res.status(404).json({ error: 'savas bulunamadi' });
  res.json({
    ...summarizeBattleLobby(lobby, req.user.id),
    result: decorateBattleResultForUser(lobby.result, req.user.id)
  });
});

app.post('/battle-lobbies', authMiddleware, (req, res) => {
  const requestedCount = Number(req.body?.playerCount) || 2;
  const playerCount = requestedCount >= 4 ? 4 : 2;
  const caseEntries = normalizeBattleCaseEntries(req.body?.caseEntries);
  if (!caseEntries.length) {
    return res.status(400).json({ error: 'en az bir kasa secmelisin' });
  }

  let expanded;
  try {
    expanded = expandBattleCases(caseEntries);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'kasa hatasi' });
  }

  const freshUser = getUserById(req.user.id);
  if (Number(freshUser.balance) < expanded.totalCost) {
    return res.status(400).json({ error: `${expanded.totalCost}$ icin yeterli bakiye yok` });
  }

  const nextBalance = Number((Number(freshUser.balance) - expanded.totalCost).toFixed(2));
  updateBalance(freshUser.id, nextBalance);

  const lobby = {
    id: crypto.randomUUID(),
    status: 'waiting',
    creatorId: freshUser.id,
    creatorName: freshUser.name || freshUser.email,
    playerCount,
    totalCost: expanded.totalCost,
    totalRounds: expanded.expandedCases.length,
    caseEntries,
    expandedCases: expanded.expandedCases,
    balance: nextBalance,
    participants: [
      {
        seat: 1,
        team: getBattleTeamForSeat(1, playerCount),
        userId: freshUser.id,
        player_name: freshUser.name || freshUser.email,
        isBot: false,
        isCreatorSeat: true
      }
    ],
    result: null
  };

  battleLobbies.set(String(lobby.id), lobby);
  res.json(summarizeBattleLobby(lobby, freshUser.id));
});

app.post('/battle-lobbies/:id/join', authMiddleware, (req, res) => {
  const lobby = battleLobbies.get(String(req.params.id));
  if (!lobby) return res.status(404).json({ error: 'savas bulunamadi' });
  if (lobby.status !== 'waiting') return res.status(400).json({ error: 'savas zaten basladi' });

  const alreadyJoined = lobby.participants.some(participant => Number(participant.userId || 0) === Number(req.user.id));
  if (alreadyJoined) {
    return res.status(400).json({ error: 'zaten katildin' });
  }

  const freshUser = getUserById(req.user.id);
  if (Number(freshUser.balance) < Number(lobby.totalCost)) {
    return res.status(400).json({ error: `${lobby.totalCost}$ icin yeterli bakiye yok` });
  }

  const occupiedSeats = new Set(lobby.participants.map(participant => Number(participant.seat)));
  let targetSeat = null;
  for (let seat = 2; seat <= lobby.playerCount; seat += 1) {
    if (!occupiedSeats.has(seat)) {
      targetSeat = seat;
      break;
    }
  }
  if (!targetSeat) return res.status(400).json({ error: 'bos koltuk kalmadi' });

  const nextBalance = Number((Number(freshUser.balance) - Number(lobby.totalCost)).toFixed(2));
  updateBalance(freshUser.id, nextBalance);

  lobby.participants.push({
    seat: targetSeat,
    team: getBattleTeamForSeat(targetSeat, lobby.playerCount),
    userId: freshUser.id,
    player_name: freshUser.name || freshUser.email,
    isBot: false,
    isCreatorSeat: false
  });

  try {
    tryResolveBattleLobby(lobby);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'savas baslatilamadi' });
  }

  res.json({
    ...summarizeBattleLobby(lobby, req.user.id),
    result: decorateBattleResultForUser(lobby.result, req.user.id)
  });
});

app.post('/battle-lobbies/:id/add-bot', authMiddleware, (req, res) => {
  const lobby = battleLobbies.get(String(req.params.id));
  if (!lobby) return res.status(404).json({ error: 'savas bulunamadi' });
  if (lobby.status !== 'waiting') return res.status(400).json({ error: 'savas zaten basladi' });
  if (Number(req.user.id) !== Number(lobby.creatorId)) {
    return res.status(403).json({ error: 'sadece savasi kuran bot ekleyebilir' });
  }

  const occupiedSeats = new Set(lobby.participants.map(participant => Number(participant.seat)));
  const requestedSeat = Number(req.body?.seat);
  let targetSeat = null;

  if (requestedSeat) {
    if (requestedSeat < 2 || requestedSeat > lobby.playerCount) {
      return res.status(400).json({ error: 'gecersiz koltuk secimi' });
    }
    if (occupiedSeats.has(requestedSeat)) {
      return res.status(400).json({ error: 'secilen koltuk dolu' });
    }
    targetSeat = requestedSeat;
  } else {
    for (let seat = 2; seat <= lobby.playerCount; seat += 1) {
      if (!occupiedSeats.has(seat)) {
        targetSeat = seat;
        break;
      }
    }
  }

  if (!targetSeat) {
    return res.status(400).json({ error: 'bos koltuk kalmadi' });
  }

  lobby.participants.push({
    seat: targetSeat,
    team: getBattleTeamForSeat(targetSeat, lobby.playerCount),
    userId: null,
    player_name: `Bot ${targetSeat - 1}`,
    isBot: true,
    isCreatorSeat: false
  });

  try {
    tryResolveBattleLobby(lobby);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'savas baslatilamadi' });
  }

  res.json({
    ...summarizeBattleLobby(lobby, req.user.id),
    result: decorateBattleResultForUser(lobby.result, req.user.id)
  });
});

app.post('/battle', authMiddleware, (req, res) => {
  const requestedCount = Number(req.body?.playerCount) || 2;
  const playerCount = requestedCount >= 4 ? 4 : 2;
  const caseEntries = normalizeBattleCaseEntries(req.body?.caseEntries);
  if (!caseEntries.length) return res.status(400).json({ error: 'en az bir kasa secmelisin' });

  let expanded;
  try {
    expanded = expandBattleCases(caseEntries);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'battle baslatilamadi' });
  }

  const user = getUserById(req.user.id);
  if (Number(user.balance) < expanded.totalCost) {
    return res.status(400).json({ error: `${expanded.totalCost}$ icin yeterli bakiye yok` });
  }

  const pseudoLobby = {
    id: crypto.randomUUID(),
    playerCount,
    totalCost: expanded.totalCost,
    expandedCases: expanded.expandedCases,
    participants: Array.from({ length: playerCount }, (_, index) => ({
      seat: index + 1,
      team: getBattleTeamForSeat(index + 1, playerCount),
      userId: index === 0 ? user.id : null,
      player_name: index === 0 ? (user.name || user.email) : `Bot ${index}`,
      isBot: index !== 0
    }))
  };

  const nextBalance = Number((Number(user.balance) - expanded.totalCost).toFixed(2));
  updateBalance(user.id, nextBalance);

  try {
    const result = createBattleResult(pseudoLobby);
    res.json(decorateBattleResultForUser(result, user.id));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'battle kaydedilemedi' });
  }
});

app.get('/admin/items', authMiddleware, adminMiddleware, (req, res) => {
  res.json(getAllItems());
});

app.post('/admin/items', authMiddleware, adminMiddleware, (req, res) => {
  const { name, base_price, weight, payout_percent, rarity } = req.body || {};
  if (!name || base_price == null || weight == null || payout_percent == null) {
    return res.status(400).json({ error: 'eksik bilgi' });
  }

  createItem(name, base_price, weight, payout_percent, rarity || 'common');
  res.json({ message: 'item olusturuldu' });
});

app.get('/admin/cases', authMiddleware, adminMiddleware, (req, res) => {
  res.json(getAllCases());
});

app.post('/admin/cases', authMiddleware, adminMiddleware, (req, res) => {
  const { name, price, items } = req.body || {};
  if (!name || price == null || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'eksik bilgi' });
  }

  const result = createCase(name, price, req.user.name || req.user.email);
  items.forEach(item => {
    if (typeof item === 'object' && item.id && item.quantity) {
      addCaseItem(result.lastInsertRowid, Number(item.id), Number(item.quantity));
      return;
    }
    if (item) addCaseItem(result.lastInsertRowid, Number(item), 1);
  });

  res.json({ message: 'kasa olusturuldu', caseId: result.lastInsertRowid });
});

app.post('/balance/deposit', authMiddleware, (req, res) => {
  const amount = Number(req.body?.amount);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'gecersiz miktar' });
  const newBalance = Number((Number(req.user.balance) + amount).toFixed(2));
  updateBalance(req.user.id, newBalance);
  res.json({ message: 'bakiye yuklendi', balance: newBalance });
});

app.post('/balance/withdraw', authMiddleware, (req, res) => {
  const amount = Number(req.body?.amount);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'gecersiz miktar' });
  if (Number(req.user.balance) < amount) return res.status(400).json({ error: 'yetersiz bakiye' });
  const newBalance = Number((Number(req.user.balance) - amount).toFixed(2));
  updateBalance(req.user.id, newBalance);
  res.json({ message: 'bakiye cekildi', balance: newBalance });
});

app.listen(PORT, () => {
  console.log(`Sunucu calisiyor http://localhost:${PORT}`);
});

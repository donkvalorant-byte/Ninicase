// API base URL
const API_BASE = '';
const BALANCE_ADMIN_EMAIL = 'egemeric92@gmail.com';
const RESERVED_ADMIN_NAME = 'Donk';
let availableCases = [];
let availableItems = [];
let selectedBattleEntries = {};
let battleLobbyPollId = null;
let battleRoomPollId = null;
let renderedBattleResultKey = null;

// ==============================
// Utility functions
// ==============================
function showMessage(message, type = 'success') {
    const msgDiv = document.getElementById('message');
    if (msgDiv) {
        msgDiv.className = type;
        msgDiv.textContent = message;
        setTimeout(() => {
            if (msgDiv.textContent === message) {
                msgDiv.textContent = '';
            }
        }, 5000);
    } else {
        console[type === 'error' ? 'error' : 'log'](message);
    }
}

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function clearToken() {
    localStorage.removeItem('token');
}

function setStoredBattleState(key, value) {
    const serialized = JSON.stringify(value);
    sessionStorage.setItem(key, serialized);
    localStorage.setItem(key, serialized);
}

function getStoredBattleState(key) {
    let rawValue = sessionStorage.getItem(key);
    if (!rawValue) {
        rawValue = localStorage.getItem(key);
        if (rawValue) {
            sessionStorage.setItem(key, rawValue);
        }
    }

    if (!rawValue) return null;

    try {
        return JSON.parse(rawValue);
    } catch (error) {
        console.error(`${key} parse error`, error);
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
        return null;
    }
}

function clearStoredBattleState(key) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
}

function persistActiveBattleResult(result) {
    if (!result) return;
    setStoredBattleState('activeBattleResult', result);
}

function persistActiveBattleLobby(lobby) {
    if (!lobby) return;
    setStoredBattleState('activeBattleLobby', lobby);
}

function clearActiveBattleContext() {
    clearStoredBattleState('activeBattleResult');
    clearStoredBattleState('activeBattleLobby');
}

function getCurrentUser() {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
    } catch (e) {
        return null;
    }
}

async function apiRequest(endpoint, options = {}) {
    const url = API_BASE + endpoint;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, config);
        let data = {};
        try {
            data = await response.json();
        } catch (_) {
            data = {};
        }

        if (!response.ok) {
            throw new Error(data.error || data.message || 'API hatasi');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==============================
// Auth functions
// ==============================
async function login(email, password) {
    const data = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    return data;
}

async function register(name, email, password, adminKey = '') {
    const data = await apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, adminKey })
    });
    return data;
}

function logout() {
    clearToken();
    window.location.href = 'index.html';
}

// ==============================
// Helpers
// ==============================
function formatMoney(value) {
    const num = Number(value || 0);
    if (Number.isInteger(num)) return `${num}`;
    return `${num.toFixed(2).replace(/\.00$/, '')}`;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInOutQuint(t) {
    return t < 0.5
        ? 16 * Math.pow(t, 5)
        : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
}

function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

function easeOutExpo(t) {
    if (t >= 1) return 1;
    return 1 - Math.pow(2, -10 * t);
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isDonkName(name) {
    return String(name || '').trim().toLowerCase() === RESERVED_ADMIN_NAME.toLowerCase();
}

function getDisplayNameMarkup(name, fallback = 'Oyuncu') {
    const resolved = String(name || fallback).trim() || fallback;
    const safe = escapeHtml(resolved);
    if (isDonkName(resolved)) {
        return `<span class="donk-name">${safe}</span>`;
    }
    return safe;
}

function getRarityClass(rarity) {
    return `rarity-${(rarity || 'common').toLowerCase()}`;
}

function getItemImageByName(name) {
    if (!name) return 'image.png';
    if (String(name).trim() === 'Doge Portresi') return 'doge.png';
    if (String(name).trim() === 'Stitch') return 'stitch.png';
    if (String(name).trim() === 'Kitty') return 'kitty.png';
    if (String(name).trim() === 'Draculara') return 'draculara.jpg';
    if (String(name).trim().toLowerCase() === 'parol') return 'parol.png';
    if (String(name).trim().toLowerCase() === 'lyrica') return 'lyrica.png';
    if (String(name).trim().toLowerCase() === 'cocaine') return 'cocaine.png';
    if (String(name).trim().toLowerCase() === 'weed') return 'weed.png';
    if (String(name).trim() === 'Vozol 1k') return '1k.webp';
    if (String(name).trim() === 'Vozol 15k') return '15k.png';
    if (String(name).trim() === 'Vozol 25k') return '25k.png';
    if (String(name).trim() === 'Vozol 50k') return '50k.png';
    if (String(name).trim() === 'Vozol 6k') return '6k.png';
    if (String(name).trim() === 'Vozol 10k') return '10k.png';
    return 'image.png';
}

function getCaseImageByName(name) {
    const normalizedName = String(name || '').trim().toUpperCase();
    if (normalizedName === 'VOZOL GEAR') return 'vozol case.webp';
    if (normalizedName === '%10 DRUGS') return 'drugs.jpg';
    if (normalizedName === 'MANITAYA HEDIYE') return 'manit.jpeg';
    return 'image.png';
}

function getCaseImagePosition(name) {
    const normalizedName = String(name || '').trim().toUpperCase();
    if (normalizedName === 'MANITAYA HEDIYE') return '74% center';
    return 'center';
}

function getCaseThemeClass(name) {
    const normalizedName = String(name || '').trim().toUpperCase();
    if (normalizedName === 'MANITAYA HEDIYE') return 'case-theme-sweetpink';
    return '';
}

function getItemFitClassByName(name) {
    const normalizedName = String(name || '').trim();
    if (normalizedName === 'Doge Portresi' || normalizedName === 'Stitch' || normalizedName === 'Kitty' || normalizedName === 'Draculara' || normalizedName === 'weed' || normalizedName === 'cocaine' || normalizedName === 'lyrica' || normalizedName === 'parol' || normalizedName === 'Vozol 1k' || normalizedName === 'Vozol 15k' || normalizedName === 'Vozol 25k' || normalizedName === 'Vozol 50k' || normalizedName === 'Vozol 6k' || normalizedName === 'Vozol 10k') {
        return 'item-fit-contain';
    }
    return '';
}

const COIN_ICON_HTML = '<img src="money.gif" alt="coin" class="coin-icon" />';

function deriveBattlePlayers(result) {
    const map = new Map();
    (result.rounds || []).forEach(round => {
        const key = `${round.seat}-${round.player_name}`;
        if (!map.has(key)) {
            map.set(key, {
                seat: round.seat,
                player_name: round.player_name,
                team: Number(round.team || 0),
                total: 0,
                items: []
            });
        }
        const player = map.get(key);
        const itemData = round.item || {};
        const itemName = itemData.name || round.item_name || 'Item';
        player.total += Number(round.payout || 0);
        player.items.push({
            name: itemName,
            payout: Number(round.payout || 0)
        });
    });

    return Array.from(map.values()).sort((a, b) => a.seat - b.seat);
}

function renderUpcomingCases(result) {
    const container = document.getElementById('upcomingCasesList');
    const indicator = document.getElementById('roundIndicator');
    if (!container || !indicator) return;

    const defaultImage = result.case?.image || getCaseImageByName(result.case?.name) || 'image.png';
    const baseCases = (result.battleCases || []).slice(0, 5).map(entry => ({
        name: entry.case?.name || result.case?.name || 'Kasa',
        price: Number(entry.case?.price ?? result.case?.price ?? 0),
        image: entry.case?.image || getCaseImageByName(entry.case?.name) || result.case?.image || defaultImage
    }));
    while (baseCases.length < 5) {
        baseCases.push({
            name: result.case?.name || 'Kasa',
            price: Number(result.case?.price ?? 0),
            image: defaultImage
        });
    }

    const currentRound = Math.min(Math.max(result.rounds?.length || 1, 1), baseCases.length);
    const totalRounds = baseCases.length;
    const highlightIndex = Math.max(0, currentRound - 1);

    container.innerHTML = baseCases.map((c, index) => {
        const imageUrl = escapeHtml(c.image || defaultImage);
        const statusClass = index === highlightIndex ? 'is-current' : 'is-future';
        return `
            <div class="next-case-card ${statusClass}">
                <div class="next-case-art" style="background-image:url('${imageUrl}');"></div>
                <div class="next-case-meta">
                    <strong>${escapeHtml(c.name)}</strong>
                    <span>${COIN_ICON_HTML}&nbsp;${formatMoney(c.price)}</span>
                </div>
            </div>
        `;
    }).join('');
    indicator.textContent = `${currentRound} / ${totalRounds}`;
}

function renderJackpotBar(value) {
    const container = document.getElementById('jackpotBar');
    if (!container) return;
    container.innerHTML = `
        <div class="jackpot-value" data-jackpot-value="${Number(value || 0)}">${COIN_ICON_HTML}&nbsp;${formatMoney(value)}</div>
    `;
}

function animateDisplayedMoney(element, nextValue, options = {}) {
    if (!element) return;

    const targetValue = Number(nextValue || 0);
    const duration = Number(options.duration || 720);
    const valueAttr = options.valueAttr || 'data-total-value';
    const targetAttr = options.targetAttr || `${valueAttr}Target`;
    const frameAttr = options.frameAttr || 'data-money-raf';
    const prefixHtml = options.prefixHtml || `${COIN_ICON_HTML}&nbsp;`;

    const existingFrame = Number(element.dataset[frameAttr] || 0);
    if (existingFrame) {
        cancelAnimationFrame(existingFrame);
    }

    const startValue = Number(element.dataset[valueAttr] || 0);
    element.dataset[targetAttr] = String(targetValue);
    if (Math.abs(targetValue - startValue) < 0.01) {
        element.dataset[valueAttr] = String(targetValue);
        element.innerHTML = `${prefixHtml}${formatMoney(targetValue)}`;
        delete element.dataset[frameAttr];
        refreshHeaderUserInfo();
        refreshHeaderUserInfo();
        return;
    }

    let startTime = null;

    const tick = timestamp => {
        if (!startTime) startTime = timestamp;
        const progress = clamp((timestamp - startTime) / duration, 0, 1);
        const eased = easeOutQuart(progress);
        const currentValue = startValue + ((targetValue - startValue) * eased);

        element.dataset[valueAttr] = String(currentValue);
        element.innerHTML = `${prefixHtml}${formatMoney(currentValue)}`;

        if (progress < 1) {
            element.dataset[frameAttr] = String(requestAnimationFrame(tick));
            return;
        }

        element.dataset[valueAttr] = String(targetValue);
        element.innerHTML = `${prefixHtml}${formatMoney(targetValue)}`;
        delete element.dataset[frameAttr];
    };

    element.dataset[frameAttr] = String(requestAnimationFrame(tick));
}

function updateDisplayedLaneTotal(lane, payoutDelta) {
    const totalEl = lane?.querySelector('.player-total');
    if (!totalEl) return;
    const currentValue = Number(totalEl.dataset.totalValueTarget ?? totalEl.dataset.totalValue ?? 0);
    const nextValue = currentValue + Number(payoutDelta || 0);
    animateDisplayedMoney(totalEl, nextValue, {
        duration: 860,
        valueAttr: 'totalValue',
        targetAttr: 'totalValueTarget',
        frameAttr: 'totalRaf',
        prefixHtml: `${COIN_ICON_HTML}&nbsp;`
    });
}

function updateDisplayedJackpotTotal(payoutDelta) {
    const jackpotValueEl = document.querySelector('.jackpot-value');
    if (!jackpotValueEl) return;
    const currentValue = Number(jackpotValueEl.dataset.jackpotValueTarget ?? jackpotValueEl.dataset.jackpotValue ?? 0);
    const nextValue = currentValue + Number(payoutDelta || 0);
    animateDisplayedMoney(jackpotValueEl, nextValue, {
        duration: 980,
        valueAttr: 'jackpotValue',
        targetAttr: 'jackpotValueTarget',
        frameAttr: 'jackpotRaf',
        prefixHtml: `${COIN_ICON_HTML}&nbsp;`
    });
}

function renderSpinner(result) {
    const track = document.getElementById('spinnerTrack');
    if (!track) return;

    const items = (result.rounds || []).map(round => {
        const item = round.item || {};
        return {
            name: item.name || round.item_name || 'Item',
            payout: Number(round.payout || 0),
            image: getItemImageByName(item.name || round.item_name)
        };
    });

    if (!items.length) {
        track.innerHTML = '<div class="spinner-placeholder">Sonuclar bekleniyor...</div>';
        return;
    }

    const repeated = [...items, ...items];
    track.innerHTML = repeated.map(item => `
        <div class="spinner-card">
            <div class="spinner-card-image" style="background-image:url('${escapeHtml(item.image)}');"></div>
            <div class="spinner-card-name">${escapeHtml(item.name)}</div>
            <div class="spinner-card-price">${COIN_ICON_HTML}&nbsp;${formatMoney(item.payout)}</div>
        </div>
    `).join('');
    track.style.animation = 'spinnerScroll 12s linear infinite';
}

function renderPlayerLanes(players) {
    const container = document.getElementById('playerSlotsGrid');
    if (!container) return;

    if (!players.length) {
        container.innerHTML = '<p class="empty-note">Battle verisi yukleniyor...</p>';
        return;
    }

    const teamPositions = new Map();
    const playersByTeam = players.reduce((acc, player) => {
        const teamId = Number(player.team || 0);
        if (!acc.has(teamId)) acc.set(teamId, []);
        acc.get(teamId).push(player);
        return acc;
    }, new Map());

    playersByTeam.forEach(teamPlayers => {
        teamPlayers
            .sort((a, b) => a.seat - b.seat)
            .forEach((player, index, arr) => {
                let position = 'solo';
                if (arr.length > 1) {
                    position = index === 0 ? 'start' : index === arr.length - 1 ? 'end' : 'middle';
                }
                teamPositions.set(player.seat, position);
            });
    });

    container.innerHTML = players.map(player => {
        const initials = escapeHtml(player.player_name ? player.player_name.charAt(0) : '?');
        const teamPosition = teamPositions.get(player.seat) || 'solo';

        return `
            <article class="player-lane ${player.seat === 1 ? 'player-lane-winner' : ''} team-${teamPosition}" data-seat="${player.seat}" data-team="${player.team || ''}">
                <div class="player-top-module">
                    <div class="player-reel-area">
                        <span class="player-opening-label">Hazirlaniyor...</span>
                        <div class="player-reel-window">
                            <div class="player-reel-track"></div>
                            <div class="player-reel-indicator" aria-hidden="true"></div>
                        </div>
                    </div>
                    <div class="player-header ${player.seat === 1 ? 'is-active' : ''}">
                        <div class="player-avatar-wrap">
                            <div class="player-avatar">${initials}</div>
                        </div>
                        <div class="player-info">
                            <strong>${getDisplayNameMarkup(player.player_name)}</strong>
                            <span class="player-total">${COIN_ICON_HTML}&nbsp;${formatMoney(player.total)}</span>
                            <div class="battle-user-reward" data-seat-reward="${player.seat}"></div>
                        </div>
                        <div class="player-badge-slot">
                            <span class="player-badge">#${player.seat}</span>
                        </div>
                    </div>
                </div>
                <div class="player-current-result">
                    <div class="result-label">Son Cikan Item</div>
                    <div class="player-result-card">
                        <div class="player-result-art" style="background-image:url('image.png');"></div>
                        <div class="player-result-info">
                            <div class="player-result-name">Bekleniyor...</div>
                            <div class="player-result-payout">${COIN_ICON_HTML}&nbsp;0</div>
                        </div>
                    </div>
                </div>
                <div class="player-history">
                </div>
            </article>
        `;
    }).join('');

    requestAnimationFrame(() => {
        renderTeamHeaderBridges();
    });
}

function renderTeamHeaderBridges() {
    const shell = document.getElementById('playersSlotsShell');
    if (!shell || window.innerWidth <= 1180) return;

    shell.querySelectorAll('.team-header-bridge').forEach(node => node.remove());

    const lanes = Array.from(shell.querySelectorAll('.player-lane'));
    if (!lanes.length) return;

    const lanesByTeam = new Map();
    lanes.forEach(lane => {
        const teamId = Number(lane.dataset.team || 0);
        if (!teamId) return;
        if (!lanesByTeam.has(teamId)) lanesByTeam.set(teamId, []);
        lanesByTeam.get(teamId).push(lane);
    });

    const shellRect = shell.getBoundingClientRect();

    lanesByTeam.forEach(teamLanes => {
        if (teamLanes.length < 2) return;

        const ordered = [...teamLanes].sort((a, b) => Number(a.dataset.seat || 0) - Number(b.dataset.seat || 0));
        const firstHeader = ordered[0].querySelector('.player-header');
        const lastHeader = ordered[ordered.length - 1].querySelector('.player-header');
        if (!firstHeader || !lastHeader) return;

        const firstRect = firstHeader.getBoundingClientRect();
        const lastRect = lastHeader.getBoundingClientRect();
        const bridge = document.createElement('div');
        const combinedWidth = (lastRect.right - firstRect.left);
        const targetWidth = Math.max(120, combinedWidth - 82);
        const centerX = ((firstRect.left + lastRect.right) / 2) - shellRect.left;

        bridge.className = 'team-header-bridge';
        bridge.style.width = `${targetWidth}px`;
        bridge.style.height = `${Math.round(firstRect.height)}px`;
        bridge.style.left = `${centerX - (targetWidth / 2) - 34}px`;
        bridge.style.top = `${firstRect.top - shellRect.top}px`;
        shell.appendChild(bridge);
    });
}

function getCaseSequence(result) {
    if (Array.isArray(result.battleCases) && result.battleCases.length) {
        return result.battleCases;
    }

    const rounds = Array.isArray(result.rounds) ? [...result.rounds] : [];
    if (!rounds.length) return [];

    const seats = [...new Set(rounds.map(r => Number(r.seat) || 0))].sort((a, b) => a - b);
    const playerCount = result.playerCount || seats.length || 1;
    const fallbackCases = [];

    for (let i = 0; i < rounds.length; i += playerCount) {
        const slice = rounds.slice(i, i + playerCount);
        fallbackCases.push({
            roundNumber: fallbackCases.length + 1,
            case: result.case || { name: 'Kasa', price: result.case?.price || 0 },
            rounds: slice
        });
    }

    if (!fallbackCases.length) {
        return [{
            roundNumber: 1,
            case: result.case || { name: 'Kasa', price: 0 },
            rounds
        }];
    }

    return fallbackCases;
}

function getVisualItems(result) {
    const visuals = [];
    (result.rounds || []).forEach(round => {
        const item = round.item || {};
        if (item.name) {
            visuals.push({
                name: item.name,
                payout: Number(item.payout || 0),
                image: getItemImageByName(item.name)
            });
        }
    });
    if (!visuals.length) {
        visuals.push({ name: 'Kasa', payout: 0, image: 'image.png' });
    }
    return visuals;
}

function buildVisualPoolForCase(caseInfo, fallbackVisuals = []) {
    const sources = Array.isArray(caseInfo?.items) && caseInfo.items.length
        ? caseInfo.items
        : fallbackVisuals.map(item => ({ name: item.name, payout: item.payout, image: item.image }));

    if (!sources.length) {
        return [{
            label: 'Kasa',
            name: 'Kasa',
            image: 'image.png',
            visualWeight: 1
        }];
    }

    const baseEntries = sources.map(item => {
        const baseChance = Math.max(Number(item.chance ?? item.weight ?? item.quantity ?? item.probability ?? 0), 0);
        return {
            label: item.name || 'Kasa',
            name: item.name || 'Kasa',
            payout: Number(item.payout ?? item.price ?? item.base_price ?? 0),
            image: item.image || getItemImageByName(item.name),
            rarity: item.rarity || item.item_rarity,
            baseChance
        };
    });

    const totalChance = baseEntries.reduce((sum, entry) => sum + entry.baseChance, 0);
    const normalizedEntries = baseEntries.map(entry => ({
        ...entry,
        probability: totalChance > 0 ? entry.baseChance / totalChance : 1 / baseEntries.length
    }));

    return normalizedEntries.map(entry => ({
        ...entry,
        visualWeight: Math.max(Math.pow(entry.probability, 0.6), 0.08) + 0.02
    }));
}

function getBattleCasePrice(caseInfo) {
    return Number(caseInfo?.price ?? 0);
}

function getBattleItemPayout(item) {
    return Number(item?.payout ?? item?.price ?? item?.base_price ?? 0);
}

function getBattleResultPayoutMarkup(item) {
    if (item?.isStar) return '';
    return `${COIN_ICON_HTML}&nbsp;${formatMoney(getBattleItemPayout(item))}`;
}

function getBattleWinningItem(round) {
    const item = round?.item || {};
    return {
        ...item,
        name: item.name || round?.item_name || 'Kasa',
        payout: Number(round?.payout ?? item?.payout ?? item?.price ?? item?.base_price ?? 0),
        image: item.image || getItemImageByName(item.name || round?.item_name)
    };
}

function createStarReelEntry(totalPremiumProbability = 0) {
    const normalizedPremiumChance = clamp(Number(totalPremiumProbability || 0), 0, 1);
    return {
        label: 'STAR',
        name: '__STAR__',
        image: '',
        isStar: true,
        visualWeight: 0.008 + (normalizedPremiumChance * 0.018)
    };
}

function splitVisualPoolByPremium(caseInfo, visualPool = []) {
    const premiumThreshold = getBattleCasePrice(caseInfo) * 5;
    const premiumPool = [];
    const normalPool = [];

    (Array.isArray(visualPool) ? visualPool : []).forEach(item => {
        const normalized = {
            ...item,
            label: item.label || item.name || 'Item',
            name: item.name || item.label || 'Item',
            payout: getBattleItemPayout(item),
            image: item.image || getItemImageByName(item.name)
        };

        if (premiumThreshold > 0 && normalized.payout >= premiumThreshold) {
            premiumPool.push({
                ...normalized,
                isPremium: true
            });
            return;
        }

        normalPool.push(normalized);
    });

    const totalPremiumProbability = premiumPool.reduce((sum, item) => {
        return sum + Number(item.probability || 0);
    }, 0);
    const starEntry = premiumPool.length ? createStarReelEntry(totalPremiumProbability) : null;

    return {
        premiumThreshold,
        premiumPool,
        normalPool,
        starEntry,
        normalVisualPool: starEntry ? [...normalPool, starEntry] : normalPool
    };
}

async function startBattlePlayback(result) {
    try {
        const sequence = getCaseSequence(result);
        if (!sequence.length) return;
        const lanes = Array.from(document.querySelectorAll('.player-lane'));
        if (!lanes.length) return;
        lanes.forEach(clearLaneHistory);
        const visuals = getVisualItems(result);
        const oddsCache = new Map();

        for (let caseIndex = 0; caseIndex < sequence.length; caseIndex++) {
            const battleCase = sequence[caseIndex];
            let caseVisualSource = battleCase.case;

            if (battleCase.case?.id) {
                if (!oddsCache.has(battleCase.case.id)) {
                    try {
                        const oddsResponse = await apiRequest(`/cases/${battleCase.case.id}/odds`);
                        oddsCache.set(battleCase.case.id, oddsResponse?.odds || []);
                    } catch (error) {
                        console.warn('Battle odds fetch failed, fallback visuals will be used:', error);
                        oddsCache.set(battleCase.case.id, null);
                    }
                }

                const oddsItems = oddsCache.get(battleCase.case.id);
                if (Array.isArray(oddsItems) && oddsItems.length) {
                    caseVisualSource = {
                        ...battleCase.case,
                        items: oddsItems
                    };
                }
            }

            const visualPool = buildVisualPoolForCase(caseVisualSource, visuals);
            updateCaseLabels(caseIndex, sequence.length, battleCase.case);
            await playBattleCaseSequence(battleCase, visualPool);
            await wait(BATTLE_ROUND_TIMINGS.caseGap);
        }

        applyBattleOutcomeFocus(result);
        await playLaneJackpotPayout(result);
    } catch (error) {
        console.error('Battle playback error:', error);
    }
}

function getBattleWinnerTeamId(result) {
    let winnerTeamId = Number(result?.winnerTeam?.id || 0);

    if (!winnerTeamId && Array.isArray(result?.teams) && result.teams.length) {
        const sortedTeams = [...result.teams]
            .map(team => ({
                ...team,
                total: Number(team.total || 0)
            }))
            .sort((a, b) => b.total - a.total);
        winnerTeamId = Number(sortedTeams[0]?.id || 0);
    }

    return winnerTeamId;
}

async function playLaneJackpotPayout(result) {
    const totalPayout = Number(result?.totalPayout || 0);
    const winnerShare = Number(result?.winnerShare || 0);
    const jackpotEl = document.querySelector('#jackpotBar .jackpot-value') || document.querySelector('.jackpot-value');
    const winnerTeamId = getBattleWinnerTeamId(result);

    if (!jackpotEl || !winnerTeamId || totalPayout <= 0 || winnerShare <= 0) {
        return;
    }

    const winnerCards = Array.from(document.querySelectorAll('.player-lane')).filter(lane => {
        return Number(lane.dataset.team || 0) === winnerTeamId;
    });

    if (!winnerCards.length) {
        return;
    }

    await wait(1900);
    await animateBattleJackpotPayout({
        jackpotEl,
        winnerCards,
        winnerShare,
        totalPayout,
        userWon: Number(result?.battleReward || 0) > 0,
        finalBalance: Number(result?.balance || 0),
        battleReward: Number(result?.battleReward || 0)
    });
}

function applyBattleOutcomeFocus(result) {
    const lanes = Array.from(document.querySelectorAll('.player-lane'));
    if (!lanes.length) return;

    const winnerTeamId = getBattleWinnerTeamId(result);
    if (!winnerTeamId) return;

    lanes.forEach(lane => {
        const laneTeam = Number(lane.dataset.team || 0);
        lane.classList.remove('player-lane-loser', 'player-lane-winner-focus');

        if (!laneTeam) return;
        if (laneTeam === winnerTeamId) {
            lane.classList.add('player-lane-winner-focus');
        } else {
            lane.classList.add('player-lane-loser');
        }
    });
}

const BATTLE_ROUND_TIMINGS = {
    prepareDelay: 90,
    spinDuration: 5120,
    revealDelay: 180,
    settleDelay: 1180,
    caseGap: 520
};

async function playBattleCaseSequence(battleCase, visualPool) {
    const lanes = Array.from(document.querySelectorAll('.player-lane'));
    const laneStates = lanes.map((lane, laneIndex) =>
        prepareLaneForCaseRound(lane, battleCase, laneIndex, visualPool)
    ).filter(Boolean);

    if (!laneStates.length) return;

    await runBattleRoundTimeline(laneStates, BATTLE_ROUND_TIMINGS);
}

function animateLaneForCaseRound(lane, battleCase, laneIndex, visualPool) {
    return new Promise(resolve => {
        const seat = Number(lane.dataset.seat);
        const round = (battleCase.rounds || []).find(r => Number(r.seat) === seat);
        const winningItem = round?.item || { name: 'Kasa', payout: 0 };
        const track = lane.querySelector('.player-reel-track');
        const reelWindow = lane.querySelector('.player-reel-window');
        const resultSection = lane.querySelector('.player-current-result');
        const resultNameEl = lane.querySelector('.player-result-name');
        const resultPayoutEl = lane.querySelector('.player-result-payout');
        const resultArtEl = lane.querySelector('.player-result-art');

        if (!track || !reelWindow || !resultNameEl || !resultPayoutEl) {
            resolve();
            return;
        }

        resultNameEl.textContent = 'Aciliyor...';
        resultPayoutEl.innerHTML = '';
        resultSection?.classList.remove('result-highlight');

        const trackData = buildLaneTrackForRound(winningItem, visualPool, laneIndex);
        track.innerHTML = trackData.html;
        track.dataset.winIndex = trackData.winIndex;

        const cards = track.querySelectorAll('.player-reel-card');
        if (!cards.length) {
            resolve();
            return;
        }

        const winIndex = Math.min(trackData.winIndex, cards.length - 1);
        const computedGap = parseFloat(getComputedStyle(track).gap) || 12;
        const cardWidth = cards[0].getBoundingClientRect().width || 70;
        const windowWidth = reelWindow.getBoundingClientRect().width || 240;
        const slotWidth = cardWidth + computedGap;
        const finalTranslate = (windowWidth / 2) - (cardWidth / 2) - winIndex * slotWidth;
        const startTranslate = finalTranslate + windowWidth * (1.5 + laneIndex * 0.08);

        track.style.transition = 'none';
        track.style.transform = `translateX(${startTranslate}px)`;

        const spinDuration = 1500 + (laneIndex % 2) * 120;
        const settleDuration = 700;
        const laneDelay = laneIndex * 80;
        lane.classList.add('lane-animating');

        setTimeout(() => {
            let startTime = null;

            const animate = timestamp => {
                if (!startTime) startTime = timestamp;
                const progress = clamp((timestamp - startTime) / spinDuration, 0, 1);
                const eased = easeInOutCubic(progress);
                const currentTranslate = startTranslate + (finalTranslate - startTranslate) * eased;
                track.style.transform = `translateX(${currentTranslate}px)`;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                    return;
                }

                cards.forEach((cardEl, cardIndex) => {
                    cardEl.classList.toggle('player-reel-card-active', cardIndex === winIndex);
                });

                resultNameEl.textContent = escapeHtml(winningItem.name || 'Kasa');
                resultPayoutEl.innerHTML = getBattleResultPayoutMarkup(winningItem);
                if (resultArtEl) {
                    resultArtEl.style.backgroundImage = `url('${escapeHtml(getItemImageByName(winningItem.name))}')`;
                }
                resultSection?.classList.add('result-highlight');
                appendHistoryEntry(lane, winningItem);

                setTimeout(() => {
                    lane.classList.remove('lane-animating');
                    resolve();
                }, settleDuration);
            };

            requestAnimationFrame(animate);
        }, laneDelay);
    });
}

function prepareLaneForCaseRound(lane, battleCase, laneIndex, visualPool) {
    const seat = Number(lane.dataset.seat);
    const round = (battleCase.rounds || []).find(r => Number(r.seat) === seat);
    const winningItem = round?.item || { name: 'Kasa', payout: 0 };
    const track = lane.querySelector('.player-reel-track');
    const reelWindow = lane.querySelector('.player-reel-window');
    const resultSection = lane.querySelector('.player-current-result');
    const resultNameEl = lane.querySelector('.player-result-name');
    const resultPayoutEl = lane.querySelector('.player-result-payout');
    const resultArtEl = lane.querySelector('.player-result-art');

    if (!track || !reelWindow || !resultNameEl || !resultPayoutEl) {
        return null;
    }

    resultNameEl.textContent = 'Aciliyor...';
    resultPayoutEl.innerHTML = '';
    resultSection?.classList.remove('result-highlight');

    const trackData = buildLaneTrackForRound(winningItem, visualPool, laneIndex);
    track.innerHTML = trackData.html;
    track.dataset.winIndex = trackData.winIndex;

    const cards = Array.from(track.querySelectorAll('.player-reel-card'));
    if (!cards.length) {
        return null;
    }

    cards.forEach(cardEl => {
        cardEl.classList.remove('player-reel-card-active');
    });

    const winIndex = Math.min(trackData.winIndex, cards.length - 1);
    const computedGap = parseFloat(getComputedStyle(track).gap) || 12;
    const cardWidth = cards[0].getBoundingClientRect().width || 70;
    const windowWidth = reelWindow.getBoundingClientRect().width || 240;
    const slotWidth = cardWidth + computedGap;
    const finalTranslate = (windowWidth / 2) - (cardWidth / 2) - winIndex * slotWidth;
    const startTranslate = finalTranslate + windowWidth * 1.7;

    track.style.transition = 'none';
    track.style.transform = `translateX(${startTranslate}px)`;

    return {
        lane,
        cards,
        track,
        winIndex,
        winningItem,
        resultSection,
        resultNameEl,
        resultPayoutEl,
        resultArtEl,
        startTranslate,
        finalTranslate
    };
}

function runBattleRoundTimeline(laneStates, timings) {
    return new Promise(resolve => {
        const timelineStart = performance.now();
        let hasRevealed = false;

        laneStates.forEach(({ lane }) => {
            lane.classList.add('lane-animating');
        });

        const frame = timestamp => {
            const elapsedSinceStart = timestamp - timelineStart;
            const spinElapsed = Math.max(0, elapsedSinceStart - timings.prepareDelay);
            const progress = clamp(spinElapsed / timings.spinDuration, 0, 1);
            const eased = easeInOutQuint(progress);

            laneStates.forEach(({ track, startTranslate, finalTranslate }) => {
                const currentTranslate = startTranslate + (finalTranslate - startTranslate) * eased;
                track.style.transform = `translateX(${currentTranslate}px)`;
            });

            if (elapsedSinceStart < timings.prepareDelay || progress < 1) {
                requestAnimationFrame(frame);
                return;
            }

            if (!hasRevealed) {
                hasRevealed = true;

                laneStates.forEach((state) => {
                    state.cards.forEach((cardEl, cardIndex) => {
                        cardEl.classList.toggle('player-reel-card-active', cardIndex === state.winIndex);
                    });

                    state.resultNameEl.textContent = escapeHtml(state.winningItem.name || 'Kasa');
                    state.resultPayoutEl.innerHTML = getBattleResultPayoutMarkup(state.winningItem);
                    if (state.resultArtEl) {
                        state.resultArtEl.style.backgroundImage = `url('${escapeHtml(getItemImageByName(state.winningItem.name))}')`;
                    }
                    state.resultSection?.classList.add('result-highlight');
                    appendHistoryEntry(state.lane, state.winningItem);
                });
                window.setTimeout(() => {
                    laneStates.forEach(({ lane }) => {
                        lane.classList.remove('lane-animating');
                    });
                    resolve();
                }, timings.revealDelay + timings.settleDelay);
            }
        };

        requestAnimationFrame(frame);
    });
}

function buildLaneTrackForRound(winningItem, visualPool, laneIndex) {
    const fillerCount = 32;
    const landingBefore = 4;
    const landingAfter = 5;
    const continuationCount = 12;
    const pool = visualPool.length ? visualPool : [{
        label: winningItem.name || 'Kasa',
        name: winningItem.name || 'Kasa',
        image: getItemImageByName(winningItem.name),
        visualWeight: 1
    }];

    const trackItems = [];
    for (let idx = 0; idx < fillerCount; idx++) {
        trackItems.push(pickWeightedCandidate(pool));
    }

    for (let i = 0; i < landingBefore; i++) {
        trackItems.push(pickWeightedCandidate(pool, winningItem.name));
    }

    if (Math.random() < 0.3) {
        const nearMiss = pickAlmostWinCandidate(pool, winningItem.name);
        if (nearMiss) {
            trackItems.push(nearMiss);
        }
    }

    trackItems.push({
        label: winningItem.name || 'Kasa',
        name: winningItem.name || 'Kasa',
        image: getItemImageByName(winningItem.name),
        isWinner: true
    });

    for (let i = 0; i < landingAfter; i++) {
        trackItems.push(pickWeightedCandidate(pool, winningItem.name));
    }

    for (let i = 0; i < continuationCount; i++) {
        trackItems.push(pickWeightedCandidate(pool));
    }

    const winIndex = trackItems.findIndex(item => item.isWinner);

    return {
        html: trackItems.map((item, index) => `
            <div class="player-reel-card" data-reel-index="${index}">
                <div class="mini-art" style="background-image:url('${escapeHtml(item.image)}');"></div>
                <span>${escapeHtml(item.label)}</span>
            </div>
        `).join(''),
        winIndex: winIndex >= 0 ? winIndex : trackItems.length - landingAfter - 1
    };
}

function pickWeightedCandidate(pool, excludeName) {
    const candidates = excludeName ? pool.filter(item => item.name !== excludeName) : pool;
    if (!candidates.length) {
        return pool[0];
    }

    const totalWeight = candidates.reduce((sum, item) => sum + (item.visualWeight || 0), 0);
    let roll = Math.random() * (totalWeight || 1);

    for (const item of candidates) {
        roll -= (item.visualWeight || 0);
        if (roll <= 0) {
            if (item.isStar && Math.random() < 0.9) {
                const fallbackCandidates = candidates.filter(candidate => !candidate.isStar);
                if (fallbackCandidates.length) {
                    return pickWeightedCandidate(fallbackCandidates, excludeName);
                }
            }
            return item;
        }
    }

    return candidates[candidates.length - 1];
}

function pickAlmostWinCandidate(pool, excludeName) {
    const filtered = pool.filter(item => item.name !== excludeName);
    if (!filtered.length) return null;
    const sorted = [...filtered].sort((a, b) => (a.visualWeight || 0) - (b.visualWeight || 0));
    const subset = sorted.slice(0, Math.max(2, Math.min(4, sorted.length)));
    return subset[Math.floor(Math.random() * subset.length)];
}

function renderLaneReelCard(item, index) {
    const cardClasses = [
        'player-reel-card',
        item.isStar ? 'player-reel-card-star' : '',
        item.isPremium ? 'player-reel-card-premium' : '',
        item.name === 'Doge Portresi' ? 'player-reel-card-doge' : ''
    ].filter(Boolean).join(' ');
    const artFitClass = getItemFitClassByName(item.name);

    if (item.isStar) {
        return `
            <div class="${cardClasses}" data-reel-index="${index}">
                <div class="mini-art mini-art-star" style="background-image:url('star.gif');"></div>
                <span>${escapeHtml(item.label || 'STAR')}</span>
            </div>
        `;
    }

    return `
        <div class="${cardClasses}" data-reel-index="${index}">
            <div class="mini-art ${artFitClass}" style="background-image:url('${escapeHtml(item.image || getItemImageByName(item.name))}');"></div>
            <span>${escapeHtml(item.label || item.name || 'Item')}</span>
        </div>
    `;
}

function buildLaneTrackForRound(winningItem, visualPool, laneIndex) {
    const fillerCount = 52;
    const landingBefore = 4;
    const landingAfter = 5;
    const continuationCount = 16;
    const pool = visualPool.length ? visualPool : [{
        label: winningItem.label || winningItem.name || 'Kasa',
        name: winningItem.name || 'Kasa',
        image: winningItem.image || getItemImageByName(winningItem.name),
        isPremium: !!winningItem.isPremium,
        isStar: !!winningItem.isStar,
        visualWeight: 1
    }];

    const trackItems = [];
    for (let idx = 0; idx < fillerCount; idx++) {
        trackItems.push(pickWeightedCandidate(pool));
    }

    for (let i = 0; i < landingBefore; i++) {
        trackItems.push(pickWeightedCandidate(pool, winningItem.name));
    }

    if (Math.random() < 0.3) {
        const nearMiss = pickAlmostWinCandidate(pool, winningItem.name);
        if (nearMiss) {
            trackItems.push(nearMiss);
        }
    }

    trackItems.push({
        label: winningItem.label || winningItem.name || 'Kasa',
        name: winningItem.name || 'Kasa',
        image: winningItem.image || getItemImageByName(winningItem.name),
        isPremium: !!winningItem.isPremium,
        isStar: !!winningItem.isStar,
        isWinner: true
    });

    for (let i = 0; i < landingAfter; i++) {
        trackItems.push(pickWeightedCandidate(pool, winningItem.name));
    }

    for (let i = 0; i < continuationCount; i++) {
        trackItems.push(pickWeightedCandidate(pool));
    }

    const winIndex = trackItems.findIndex(item => item.isWinner);

    return {
        html: trackItems.map((item, index) => renderLaneReelCard(item, index)).join(''),
        winIndex: winIndex >= 0 ? winIndex : trackItems.length - landingAfter - 1
    };
}

function prepareLaneSpinState(context, caseInfo, visualPool, landingItem) {
    const lane = context.lane;
    const track = lane.querySelector('.player-reel-track');
    const reelWindow = lane.querySelector('.player-reel-window');
    const resultSection = lane.querySelector('.player-current-result');
    const resultNameEl = lane.querySelector('.player-result-name');
    const resultPayoutEl = lane.querySelector('.player-result-payout');

    if (!track || !reelWindow || !resultNameEl || !resultPayoutEl) {
        return null;
    }

    resultNameEl.textContent = 'Aciliyor...';
    resultPayoutEl.innerHTML = '';
    resultSection?.classList.remove('result-highlight');

    const trackData = buildLaneTrackForRound(landingItem, visualPool, context.laneIndex);
    track.innerHTML = trackData.html;
    track.dataset.winIndex = String(trackData.winIndex);

    const cards = Array.from(track.querySelectorAll('.player-reel-card'));
    if (!cards.length) {
        return null;
    }

    const winIndex = Math.min(trackData.winIndex, cards.length - 1);
    const trackStyles = getComputedStyle(track);
    const computedGap = parseFloat(trackStyles.gap) || 12;
    const trackPaddingTop = parseFloat(trackStyles.paddingTop) || 0;
    const cardHeight = cards[0].getBoundingClientRect().height || 132;
    const windowHeight = reelWindow.getBoundingClientRect().height || 188;
    const slotHeight = cardHeight + computedGap;
    const finalTranslate = (windowHeight / 2) - (cardHeight / 2) - trackPaddingTop - winIndex * slotHeight;
    const settleOffsetRange = Math.min(slotHeight * 0.24, 26);
    const settleDirectionSeed = (context.laneIndex + String(landingItem?.name || '').length) % 2 === 0 ? 1 : -1;
    const settleOffset = settleOffsetRange * settleDirectionSeed;
    const nearFinalTranslate = finalTranslate + settleOffset;
    const startTranslate = finalTranslate + Math.max(slotHeight * 20, windowHeight * 8.5);

    cards.forEach(cardEl => cardEl.classList.remove('player-reel-card-active'));
    track.style.transition = 'none';
    track.style.transform = `translateY(${startTranslate}px)`;

    return {
        ...context,
        track,
        reelWindow,
        cards,
        winIndex,
        startTranslate,
        finalTranslate,
        nearFinalTranslate
    };
}

function runLaneSpinGroup(laneStates, timings) {
    return new Promise(resolve => {
        const timelineStart = performance.now();

        laneStates.forEach(({ lane }) => {
            lane.classList.add('lane-animating');
        });

        const frame = timestamp => {
            const elapsedSinceStart = timestamp - timelineStart;
            const spinElapsed = Math.max(0, elapsedSinceStart - timings.prepareDelay);
            const spinProgress = clamp(spinElapsed / timings.spinDuration, 0, 1);
            const spinEased = easeInOutQuint(spinProgress);
            const settleElapsed = Math.max(0, spinElapsed - timings.spinDuration);
            const settleProgress = clamp(settleElapsed / timings.settleDelay, 0, 1);
            const settleEased = easeOutExpo(settleProgress);

            laneStates.forEach(({ track, startTranslate, nearFinalTranslate, finalTranslate }) => {
                const mainTranslate = startTranslate + (nearFinalTranslate - startTranslate) * spinEased;
                const currentTranslate = settleProgress > 0
                    ? nearFinalTranslate + (finalTranslate - nearFinalTranslate) * settleEased
                    : mainTranslate;
                track.style.transform = `translateY(${currentTranslate}px)`;
            });

            if (elapsedSinceStart < timings.prepareDelay || spinProgress < 1 || settleProgress < 1) {
                requestAnimationFrame(frame);
                return;
            }

            laneStates.forEach(({ cards, winIndex }) => {
                cards.forEach((cardEl, cardIndex) => {
                    cardEl.classList.toggle('player-reel-card-active', cardIndex === winIndex);
                });
            });

            window.setTimeout(() => {
                laneStates.forEach(({ lane }) => {
                    lane.classList.remove('lane-animating');
                });
                resolve();
            }, timings.revealDelay);
        };

        requestAnimationFrame(frame);
    });
}

function finalizeLaneRoundResult(lane, winningItem) {
    const resultSection = lane.querySelector('.player-current-result');
    const resultNameEl = lane.querySelector('.player-result-name');
    const resultPayoutEl = lane.querySelector('.player-result-payout');
    const resultArtEl = lane.querySelector('.player-result-art');
    const label = lane.querySelector('.player-opening-label');

    if (resultNameEl) {
        resultNameEl.textContent = winningItem.name || 'Kasa';
    }
    if (resultPayoutEl) {
        resultPayoutEl.innerHTML = getBattleResultPayoutMarkup(winningItem);
    }
    if (resultArtEl) {
        resultArtEl.style.backgroundImage = `url('${escapeHtml(getItemImageByName(winningItem.name))}')`;
    }

    resultSection?.classList.add('result-highlight');
    appendHistoryEntry(lane, winningItem);
    lane.classList.remove('premium-star-landed', 'premium-subreel-active');
    lane.querySelector('.player-reel-window')?.classList.remove('is-premium-mode');
    if (label) {
        label.textContent = winningItem.name || 'Kasa';
    }
}

async function playBattleCaseSequence(battleCase, visualPool) {
    const lanes = Array.from(document.querySelectorAll('.player-lane'));
    if (!lanes.length) return;

    const {
        premiumThreshold,
        premiumPool,
        normalVisualPool,
        starEntry
    } = splitVisualPoolByPremium(battleCase.case, visualPool);

    const laneContexts = lanes.map((lane, laneIndex) => {
        const seat = Number(lane.dataset.seat);
        const round = (battleCase.rounds || []).find(r => Number(r.seat) === seat);
        const winningItem = round ? getBattleWinningItem(round) : { name: 'Kasa', payout: 0 };
        const isPremiumWinner = premiumPool.length > 0 && getBattleItemPayout(winningItem) >= premiumThreshold;

        return {
            lane,
            laneIndex,
            winningItem,
            isPremiumWinner,
            normalLandingItem: isPremiumWinner
                ? starEntry
                : {
                    label: winningItem.name || 'Kasa',
                    name: winningItem.name || 'Kasa',
                    payout: getBattleItemPayout(winningItem),
                    image: getItemImageByName(winningItem.name)
                }
        };
    });

    const normalStates = laneContexts.map(context =>
        prepareLaneSpinState(context, battleCase.case, normalVisualPool, context.normalLandingItem)
    ).filter(Boolean);

    if (!normalStates.length) return;

    await runLaneSpinGroup(normalStates, BATTLE_ROUND_TIMINGS);

    const premiumContexts = laneContexts.filter(context => context.isPremiumWinner);
    premiumContexts.forEach(context => {
        console.log('STAR TRIGGERED', context.winningItem);
        context.lane.classList.add('premium-star-landed');
        context.lane.querySelector('.player-reel-window')?.classList.add('is-premium-mode');
        const label = context.lane.querySelector('.player-opening-label');
        if (label) label.textContent = 'STAR';
    });

    if (premiumContexts.length) {
        await wait(1850);

        const premiumStates = premiumContexts.map(context => {
            context.lane.classList.add('premium-subreel-active');
            const label = context.lane.querySelector('.player-opening-label');
            if (label) label.textContent = 'PREMIUM';

            return prepareLaneSpinState(context, battleCase.case, premiumPool, {
                label: context.winningItem.name || 'Premium',
                name: context.winningItem.name || 'Premium',
                payout: getBattleItemPayout(context.winningItem),
                image: getItemImageByName(context.winningItem.name),
                isPremium: true
            });
        }).filter(Boolean);

        if (premiumStates.length) {
            await runLaneSpinGroup(premiumStates, {
                prepareDelay: BATTLE_ROUND_TIMINGS.prepareDelay,
                spinDuration: BATTLE_ROUND_TIMINGS.spinDuration,
                revealDelay: BATTLE_ROUND_TIMINGS.revealDelay,
                settleDelay: BATTLE_ROUND_TIMINGS.settleDelay,
                caseGap: 0
            });
            await wait(1150);
        }
    }

    laneContexts.forEach(context => {
        finalizeLaneRoundResult(context.lane, context.winningItem);
    });
}

function animateLaneForCaseRound(lane, battleCase, laneIndex, visualPool) {
    return new Promise(async resolve => {
        const {
            premiumThreshold,
            premiumPool,
            normalVisualPool,
            starEntry
        } = splitVisualPoolByPremium(battleCase.case, visualPool);
        const seat = Number(lane.dataset.seat);
        const round = (battleCase.rounds || []).find(r => Number(r.seat) === seat);
        const winningItem = round ? getBattleWinningItem(round) : { name: 'Kasa', payout: 0 };
        const isPremiumWinner = premiumPool.length > 0 && getBattleItemPayout(winningItem) >= premiumThreshold;

        const normalState = prepareLaneSpinState({
            lane,
            laneIndex,
            winningItem
        }, battleCase.case, normalVisualPool, isPremiumWinner ? starEntry : {
            label: winningItem.name || 'Kasa',
            name: winningItem.name || 'Kasa',
            payout: getBattleItemPayout(winningItem),
            image: getItemImageByName(winningItem.name)
        });

        if (!normalState) {
            resolve();
            return;
        }

        await runLaneSpinGroup([normalState], BATTLE_ROUND_TIMINGS);

        if (isPremiumWinner) {
            console.log('STAR TRIGGERED', winningItem);
            lane.classList.add('premium-star-landed');
            lane.querySelector('.player-reel-window')?.classList.add('is-premium-mode');
            const label = lane.querySelector('.player-opening-label');
            if (label) label.textContent = 'STAR';
            await wait(1850);

            const premiumState = prepareLaneSpinState({
                lane,
                laneIndex,
                winningItem
            }, battleCase.case, premiumPool, {
                label: winningItem.name || 'Premium',
                name: winningItem.name || 'Premium',
                payout: getBattleItemPayout(winningItem),
                image: getItemImageByName(winningItem.name),
                isPremium: true
            });

            if (premiumState) {
                lane.classList.add('premium-subreel-active');
                if (label) label.textContent = 'PREMIUM';
                await runLaneSpinGroup([premiumState], {
                    prepareDelay: BATTLE_ROUND_TIMINGS.prepareDelay,
                    spinDuration: BATTLE_ROUND_TIMINGS.spinDuration,
                    revealDelay: BATTLE_ROUND_TIMINGS.revealDelay,
                    settleDelay: BATTLE_ROUND_TIMINGS.settleDelay,
                    caseGap: 0
                });
                await wait(1150);
            }
        }

        finalizeLaneRoundResult(lane, winningItem);
        resolve();
    });
}

function appendHistoryEntry(lane, item) {
    const history = lane.querySelector('.player-history');
    if (!history) return;
    if (history.querySelector('.history-empty')) {
        history.innerHTML = '';
    }
    const imageUrl = escapeHtml(getItemImageByName(item.name));
    const fitClass = getItemFitClassByName(item.name);
    const entryHtml = `
        <div class="player-history-card">
            <div class="player-history-art ${fitClass}" style="background-image:url('${imageUrl}');"></div>
            <div class="player-history-body">
                <strong>${escapeHtml(item.name || 'Kasa')}</strong>
                <span>${COIN_ICON_HTML}&nbsp;${formatMoney(item.payout || 0)}</span>
            </div>
        </div>
    `;
    history.insertAdjacentHTML('afterbegin', entryHtml);
    updateDisplayedLaneTotal(lane, getBattleItemPayout(item));
    updateDisplayedJackpotTotal(getBattleItemPayout(item));
    history.querySelectorAll('.player-history-card').forEach((card, index) => {
        card.dataset.historyIndex = String(index + 1);
    });
}

function clearLaneHistory(lane) {
    const history = lane.querySelector('.player-history');
    const resultNameEl = lane.querySelector('.player-result-name');
    const resultPayoutEl = lane.querySelector('.player-result-payout');
    const resultSection = lane.querySelector('.player-current-result');
    const totalEl = lane.querySelector('.player-total');
    const rewardEl = lane.querySelector('[data-seat-reward]');
    if (history) {
        history.innerHTML = '';
    }
    if (totalEl) {
        totalEl.dataset.totalValue = '0';
        totalEl.innerHTML = `${COIN_ICON_HTML}&nbsp;0`;
    }
    if (resultNameEl) {
        resultNameEl.textContent = 'Bekleniyor...';
    }
    if (resultPayoutEl) {
        resultPayoutEl.innerHTML = '';
    }
    if (rewardEl) {
        rewardEl.textContent = '';
    }
    resultSection?.classList.remove('result-highlight');
}

function updateCaseLabels(caseIndex, totalCases, caseInfo) {
    const labelText = `Kasa ${caseIndex + 1}/${totalCases}`;
    const caseName = caseInfo?.name ? ` â€¢ ${escapeHtml(caseInfo.name)}` : '';
    document.querySelectorAll('.player-opening-label').forEach(label => {
        label.textContent = `${labelText}${caseName}`;
    });
}

function renderBattlePage(result) {
    const resultKey = `${result?.id || 'battle'}:${result?.winnerTeam?.id || 0}:${result?.totalPayout || 0}:${result?.winnerShare || 0}`;
    if (renderedBattleResultKey === resultKey) {
        return;
    }
    renderedBattleResultKey = resultKey;

    if (battleRoomPollId) {
        clearInterval(battleRoomPollId);
        battleRoomPollId = null;
    }
    clearStoredBattleState('activeBattleLobby');
    const titleEl = document.querySelector('.case-opening-title');
    const subtitleEl = document.querySelector('.case-opening-subtitle');
    const labelEl = document.querySelector('.case-opening-label');
    const players = deriveBattlePlayers(result).map(player => ({
        ...player,
        total: 0
    }));
    const battleMessage = document.getElementById('battleMessage');
    if (titleEl) {
        titleEl.textContent = 'Savas Alani';
    }
    if (subtitleEl) {
        subtitleEl.textContent = 'Her oyuncu kendi kasasini aciyor';
    }
    if (labelEl) {
        labelEl.textContent = 'KASA ACILISI';
    }
    if (battleMessage) {
        battleMessage.textContent = '';
        battleMessage.classList.remove('is-waiting');
    }
    renderUpcomingCases(result);
    renderJackpotBar(0);
    renderPlayerLanes(players);
    startBattlePlayback(result);
}

function buildLobbyPlayers(lobby) {
    const slots = Array.isArray(lobby?.slots) ? lobby.slots : [];
    return slots.map(slot => ({
        seat: Number(slot.seat || 0),
        team: Number(slot.team || 0),
        player_name: slot.player_name || 'Bos Slot',
        total: 0
    }));
}

function renderLobbySlotBotActions(lobby, actionAttr) {
    if (!lobby?.canAddBot) return '';

    const slots = Array.isArray(lobby?.slots) ? lobby.slots : [];
    const emptySlots = slots.filter(slot => slot?.isEmpty && Number(slot.seat) >= 2);
    if (!emptySlots.length) return '';

    return emptySlots.map(slot => `
        <button type="button" class="battle-lobby-btn battle-lobby-btn-small" ${actionAttr}="bot" data-seat="${Number(slot.seat)}">
            ${Number(slot.seat)}. Oyuncuya Bot Ekle
        </button>
    `).join('');
}
function renderBattleLobbyRoom(lobby) {
    renderedBattleResultKey = null;
    const titleEl = document.querySelector('.case-opening-title');
    const subtitleEl = document.querySelector('.case-opening-subtitle');
    const labelEl = document.querySelector('.case-opening-label');
    const messageEl = document.getElementById('battleMessage');

    if (titleEl) {
        titleEl.textContent = `${lobby.mode || 'Battle'} Lobisi`;
    }
    if (subtitleEl) {
        subtitleEl.textContent = `Oyuncular dolunca savas ayni ekranda baslayacak`;
    }
    if (labelEl) {
        labelEl.textContent = 'SAVAS LOBISI';
    }

    renderJackpotBar(Number(lobby.totalCost || 0));
    renderPlayerLanes(buildLobbyPlayers(lobby));

    if (!messageEl) return;

    const waitingText = lobby.canAddBot
        ? 'Bos slotlara oyuncu bekleniyor. Istersen istedigin koltuga ayri ayri bot ekleyebilirsin.'
        : 'Savas kurucusunun oyunculari tamamlamasi bekleniyor.';

    messageEl.classList.add('is-waiting');
    messageEl.innerHTML = `
        <div>
            <strong>${getDisplayNameMarkup(lobby.creatorName || 'Oyuncu')}</strong> tarafindan kurulan ${escapeHtml(lobby.mode || 'Battle')} odasi
            hazir bekliyor. ${Number(lobby.totalRounds || 0)} round, ${formatMoney(lobby.totalCost || 0)} giris.
        </div>
        <div>${waitingText}</div>
        <div class="battle-lobby-actions">
            ${renderLobbySlotBotActions(lobby, 'data-battle-room-action')}
            <button type="button" class="battle-lobby-btn" data-battle-room-action="refresh">Yenile</button>
        </div>
    `;

    messageEl.querySelectorAll('[data-battle-room-action]').forEach(button => {
        button.onclick = async event => {
            const action = event.currentTarget.dataset.battleRoomAction;
            const seat = Number(event.currentTarget.dataset.seat || 0);
            event.currentTarget.disabled = true;

            try {
                if (action === 'bot') {
                    const response = await apiRequest(`/battle-lobbies/${lobby.id}/add-bot`, {
                        method: 'POST',
                        body: JSON.stringify({ seat })
                    });
                    if (response?.result) {
                        persistActiveBattleResult(response.result);
                        clearStoredBattleState('activeBattleLobby');
                        renderBattlePage(normalizeBattleResult(response.result));
                        return;
                    }

                    persistActiveBattleLobby(response);
                    renderBattleLobbyRoom(response);
                    return;
                }

                const detail = await apiRequest(`/battle-lobbies/${lobby.id}`);
                if (detail?.result) {
                    persistActiveBattleResult(detail.result);
                    clearStoredBattleState('activeBattleLobby');
                    renderBattlePage(normalizeBattleResult(detail.result));
                    return;
                }

                persistActiveBattleLobby(detail);
                renderBattleLobbyRoom(detail);
            } catch (error) {
                showMessage(error.message, 'error');
            } finally {
                event.currentTarget.disabled = false;
            }
        };
    });
}
function ensureFeaturedItems(items) {
    const featuredItems = [...items];

    if (!featuredItems.find(item => String(item.name || '').toLowerCase() === 'parol')) {
        featuredItems.unshift({
            id: Date.now() - 3,
            name: 'parol',
            base_price: 0,
            weight: 1,
            payout_percent: 100,
            rarity: 'common',
            image: 'parol.png'
        });
    }

    if (!featuredItems.find(item => String(item.name || '').toLowerCase() === 'lyrica')) {
        featuredItems.unshift({
            id: Date.now() - 2,
            name: 'lyrica',
            base_price: 1000,
            weight: 1,
            payout_percent: 100,
            rarity: 'epic',
            image: 'lyrica.png'
        });
    }

    if (!featuredItems.find(item => String(item.name || '').toLowerCase() === 'cocaine')) {
        featuredItems.unshift({
            id: Date.now() - 1,
            name: 'cocaine',
            base_price: 3000,
            weight: 1,
            payout_percent: 100,
            rarity: 'legendary',
            image: 'cocaine.png'
        });
    }

    if (!featuredItems.find(item => String(item.name || '').toLowerCase() === 'weed')) {
        featuredItems.unshift({
            id: Date.now(),
            name: 'weed',
            base_price: 2000,
            weight: 1,
            payout_percent: 100,
            rarity: 'legendary',
            image: 'weed.png'
        });
    }

    if (!featuredItems.find(item => item.name === 'Vozol 25k')) {
        featuredItems.unshift({
            id: Date.now() + 1,
            name: 'Vozol 25k',
            base_price: 1300,
            weight: 1,
            payout_percent: 100,
            rarity: 'legendary',
            image: '25k.png'
        });
    }

    if (!featuredItems.find(item => item.name === 'Vozol 15k')) {
        featuredItems.unshift({
            id: Date.now() + 2,
            name: 'Vozol 15k',
            base_price: 150,
            weight: 1,
            payout_percent: 100,
            rarity: 'rare',
            image: '15k.png'
        });
    }

    if (!featuredItems.find(item => item.name === 'Vozol 50k')) {
        featuredItems.unshift({
            id: Date.now() + 3,
            name: 'Vozol 50k',
            base_price: 1500,
            weight: 1,
            payout_percent: 100,
            rarity: 'legendary',
            image: '50k.png'
        });
    }

    if (!featuredItems.find(item => item.name === 'Vozol 1k')) {
        featuredItems.unshift({
            id: Date.now() + 4,
            name: 'Vozol 1k',
            base_price: 50,
            weight: 1,
            payout_percent: 100,
            rarity: 'rare',
            image: '1k.webp'
        });
    }

    if (!featuredItems.find(item => item.name === 'Vozol 6k')) {
        featuredItems.unshift({
            id: Date.now() + 5,
            name: 'Vozol 6k',
            base_price: 75,
            weight: 1,
            payout_percent: 100,
            rarity: 'rare',
            image: '6k.png'
        });
    }

    if (!featuredItems.find(item => item.name === 'Vozol 10k')) {
        featuredItems.unshift({
            id: Date.now() + 6,
            name: 'Vozol 10k',
            base_price: 100,
            weight: 1,
            payout_percent: 100,
            rarity: 'rare',
            image: '10k.png'
        });
    }

    return featuredItems;
}

function getCaseShowcaseItems(caseData) {
    const items = Array.isArray(caseData?.items) ? [...caseData.items] : [];
    return items
        .sort((a, b) => Number(b.payout ?? b.base_price ?? 0) - Number(a.payout ?? a.base_price ?? 0))
        .slice(0, 3);
}

function renderCaseHero(caseData) {
    const imageUrl = escapeHtml(getCaseImageByName(caseData?.name));
    const imagePosition = escapeHtml(getCaseImagePosition(caseData?.name));
    return `<div class="case-card-minimal-visual case-card-minimal-visual-empty" style="background-image:url('${imageUrl}'); background-size:cover; background-position:${imagePosition}; background-repeat:no-repeat;"></div>`;
}

function getWeightedRandomItem(items) {
    const normalized = (Array.isArray(items) ? items : []).map(item => ({
        ...item,
        chance: Number(item.chance ?? item.probability ?? item.weight ?? 0)
    })).filter(item => item.chance > 0);

    if (!normalized.length) return null;

    const total = normalized.reduce((sum, item) => sum + item.chance, 0);
    if (total <= 0) {
        return normalized[Math.floor(Math.random() * normalized.length)];
    }

    let roll = Math.random() * total;
    for (const item of normalized) {
        roll -= item.chance;
        if (roll <= 0) return item;
    }

    return normalized[normalized.length - 1];
}

function pickVisualSpinItem(items) {
    const normalized = (Array.isArray(items) ? items : []).map(item => {
        const probability = Number(item.chance ?? item.probability ?? 0);
        const visualWeight = Math.pow(Math.max(probability, 0.01), 1.35);
        return {
            ...item,
            probability,
            visualWeight
        };
    });

    if (!normalized.length) {
        return {
            name: 'Item',
            payout: 0,
            image: 'image.png',
            item_rarity: 'common'
        };
    }

    const total = normalized.reduce((sum, item) => sum + item.visualWeight, 0);
    if (total <= 0) {
        return normalized[Math.floor(Math.random() * normalized.length)];
    }

    let roll = Math.random() * total;
    for (const item of normalized) {
        roll -= item.visualWeight;
        if (roll <= 0) return item;
    }

    return normalized[normalized.length - 1];
}

function generateSpinnerReel(items, totalItems, winningItem, winningIndex) {
    if (!winningItem) return [];

    const sourceItems = (Array.isArray(items) && items.length) ? items : [winningItem];
    const clampedIndex = Math.max(0, Math.min(totalItems - 1, winningIndex));
    const reel = [];

    for (let i = 0; i < totalItems; i++) {
        if (i === clampedIndex) {
            reel.push({
                ...winningItem,
                __isWinner: true,
                image: winningItem.image || getItemImageByName(winningItem.name)
            });
            continue;
        }

        const filler = pickVisualSpinItem(sourceItems);
        reel.push({
            ...filler,
            __isWinner: false,
            image: filler.image || getItemImageByName(filler.name)
        });
    }

    return reel;
}

function normalizeWinningItem(raw, odds) {
    if (!raw) return null;

    const nested = raw.item && typeof raw.item === 'object' ? raw.item : {};
    const directId = raw.item_id ?? raw.id ?? nested.id ?? nested.item_id;
    const directName = raw.item_name ?? raw.name ?? nested.name ?? nested.item_name;
    const directPayout = raw.payout ?? raw.price ?? raw.base_price ?? nested.payout ?? nested.price ?? nested.base_price ?? 0;
    const directRarity = raw.item_rarity ?? raw.rarity ?? nested.item_rarity ?? nested.rarity ?? 'common';

    let matched = odds.find(item =>
        (directId != null && item.id != null && String(item.id) === String(directId)) ||
        (directName && item.name && item.name.toLowerCase() === String(directName).toLowerCase())
    );

    if (!matched && directPayout != null) {
        matched = odds.find(item => Number(item.payout) === Number(directPayout));
    }

    if (!matched) {
        matched = {
            id: directId ?? `server-${Date.now()}`,
            name: directName ?? odds[0]?.name ?? 'Item',
            payout: directPayout,
            probability: raw.probability ?? nested.probability ?? 0,
            item_rarity: directRarity
        };
    }

    const normalizedItem = {
        ...matched,
        id: directId ?? matched.id,
        payout: Number(directPayout ?? matched.payout ?? 0),
        name: directName ?? matched.name ?? 'Item',
        item_rarity: directRarity ?? matched.item_rarity ?? 'common'
    };

    return {
        ...normalizedItem,
        image: getItemImageByName(normalizedItem.name)
    };
}

async function refreshHeaderUserInfo() {
    try {
        const userData = await apiRequest('/me');
        const emailEl = document.getElementById('userEmail');
        const balanceEl = document.getElementById('userBalance');

        if (emailEl) emailEl.innerHTML = getDisplayNameMarkup(userData.name || userData.email);
        if (balanceEl) balanceEl.textContent = formatMoney(userData.balance);
        return userData;
    } catch (error) {
        console.error('User refresh error:', error);
        return null;
    }
}

function updateHeaderBalance(balance) {
    const balanceEl = document.getElementById('userBalance');
    if (!balanceEl || balance == null || Number.isNaN(Number(balance))) return;
    balanceEl.textContent = formatMoney(balance);
}

function getDisplayedHeaderBalance() {
    const balanceEl = document.getElementById('userBalance');
    if (!balanceEl) return null;
    return parseMoneyText(balanceEl.textContent);
}

// ==============================
// Page specific functions
// ==============================
function initLoginPage() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                await login(email, password);
                window.location.href = 'dashboard.html';
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }
}

function initRegisterPage() {
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const adminKey = document.getElementById('adminKey').value;

            try {
                await register(name, email, password, adminKey);
                showMessage('Kayit basarili! Simdi giris yapabilirsiniz.');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }
}

async function initDashboardPage() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const userData = await apiRequest('/me');
        document.getElementById('userEmail').innerHTML = getDisplayNameMarkup(userData.name || userData.email);
        document.getElementById('userBalance').textContent = formatMoney(userData.balance);

        if (userData.is_admin) {
            const adminLink = document.getElementById('adminLink');
            if (adminLink) adminLink.style.display = 'inline-block';
        }
    } catch (error) {
        showMessage(error.message, 'error');
    }

    try {
        const history = await apiRequest('/history');
        const historyDiv = document.getElementById('historyList');
        if (historyDiv) {
            historyDiv.innerHTML = history.map(h => `
                <div class="history-item">
                    <strong>${escapeHtml(h.case_name)}</strong> - ${escapeHtml(h.item_name)} (+${formatMoney(h.payout)})
                    <small>${new Date(h.created_at).toLocaleString()}</small>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('History error:', error);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

function collectBattleRounds(result) {
    if (Array.isArray(result.rounds) && result.rounds.length) {
        return result.rounds;
    }

    if (Array.isArray(result.battleCases)) {
        return result.battleCases.flatMap(bc => Array.isArray(bc.rounds) ? bc.rounds : []);
    }

    return [];
}

function normalizeBattleResult(result) {
    const rounds = collectBattleRounds(result);
    const primaryCase = result.case || result.battleCases?.[0]?.case;

    return {
        ...result,
        rounds,
        case: primaryCase || result.case,
        mode: result.mode || (result.playerCount === 4 ? '2v2' : result.playerCount === 2 ? '1v1' : result.mode)
    };
}

async function showCasePreview(caseId) {
    try {
        const caseData = await apiRequest(`/cases/${caseId}`);
        const itemsResponse = await apiRequest(`/cases/${caseId}/odds`);
        const items = (itemsResponse.odds || [])
            .slice()
            .sort((a, b) => {
                const payoutDiff = Number(b.payout || 0) - Number(a.payout || 0);
                if (payoutDiff !== 0) return payoutDiff;
                return Number(b.probability || 0) - Number(a.probability || 0);
            });

        const previewCaseName = document.getElementById('previewCaseName');
        const previewItems = document.getElementById('previewItems');

        if (previewCaseName) {
            previewCaseName.textContent = `${caseData.name} Icerigi`;
        }

        if (previewItems) {
            previewItems.innerHTML = items.map(item => `
                <div class="preview-item">
                    <div class="preview-item-art ${getItemFitClassByName(item.name)}" style="background-image:url('${escapeHtml(getItemImageByName(item.name))}')"></div>
                    <div class="preview-item-info">
                        <h4 class="${getRarityClass(item.item_rarity)}">${escapeHtml(item.name)}</h4>
                        <p>${COIN_ICON_HTML}&nbsp;${formatMoney(item.payout)}</p>
                        <small>Cikma orani: %${item.probability}</small>
                    </div>
                </div>
            `).join('');
        }

        const previewModal = document.getElementById('casePreviewModal');
        if (previewModal) previewModal.style.display = 'block';
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

function toggleAdminCasesTab(userData) {
    const adminTab = document.getElementById('adminPlayersTab');
    if (!adminTab) return;
    const canSeeBalancePanel = Boolean(
        userData?.is_admin &&
        String(userData?.email || '').toLowerCase() === BALANCE_ADMIN_EMAIL
    );
    adminTab.style.display = canSeeBalancePanel ? 'flex' : 'none';
}

function initCasePreviewModal() {
    const previewModal = document.getElementById('casePreviewModal');
    if (!previewModal || previewModal.dataset.bound === '1') return;

    previewModal.dataset.bound = '1';

    previewModal.addEventListener('click', event => {
        if (event.target === previewModal) {
            previewModal.style.display = 'none';
        }
    });

    previewModal.querySelector('.close')?.addEventListener('click', () => {
        previewModal.style.display = 'none';
    });
}

// ==============================
// Case opening animation
// ==============================
let activeOpeningState = null;

function ensureOpeningStyles() {
    if (document.getElementById('openingDynamicStyles')) return;

    const style = document.createElement('style');
    style.id = 'openingDynamicStyles';
    style.textContent = `
        #openingModal.opening-overlay {
            position: fixed;
            inset: 0;
            background: rgba(8, 10, 20, 0.86);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 24px;
            box-sizing: border-box;
        }

        #openingModal .opening-shell {
            width: min(1100px, 96vw);
            background: linear-gradient(180deg, #141826 0%, #0f1320 100%);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            box-shadow: 0 20px 70px rgba(0,0,0,0.4);
            overflow: hidden;
            color: #fff;
        }

        #openingModal .opening-topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 18px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.07);
            gap: 16px;
        }

        #openingModal .opening-title-wrap {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        #openingModal .opening-case-icon {
            width: 56px;
            height: 56px;
            border-radius: 14px;
            background: rgba(255,255,255,0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
        }

        #openingModal .opening-case-name {
            font-size: 28px;
            font-weight: 800;
            line-height: 1.1;
            margin: 0;
        }

        #openingModal .opening-case-price {
            margin-top: 4px;
            opacity: 0.9;
            font-size: 18px;
            color: #a9b8ff;
            font-weight: 700;
        }

        #openingModal .opening-close-btn {
            border: 0;
            background: rgba(255,255,255,0.08);
            color: #fff;
            width: 42px;
            height: 42px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 22px;
        }

        #openingModal .opening-reel-section {
            position: relative;
            padding: 24px 20px 18px;
        }

        #openingModal .opening-reel-window {
            position: relative;
            height: 210px;
            overflow: hidden;
            border-radius: 18px;
            background:
                linear-gradient(90deg, rgba(7,10,17,0.95) 0%, rgba(20,24,38,0.35) 8%, rgba(20,24,38,0.12) 50%, rgba(20,24,38,0.35) 92%, rgba(7,10,17,0.95) 100%),
                linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%);
            border: 1px solid rgba(255,255,255,0.08);
        }

        #openingModal .opening-reel-track {
            position: absolute;
            top: 50%;
            left: 0;
            display: flex;
            align-items: center;
            gap: 18px;
            transform: translate3d(0, -50%, 0);
            will-change: transform;
            padding: 0 24px;
        }

        #openingModal .opening-center-line {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 2px;
            transform: translateX(-50%);
            background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.95) 18%, rgba(255,255,255,0.95) 82%, rgba(255,255,255,0.05) 100%);
            box-shadow: 0 0 18px rgba(255,255,255,0.25);
            pointer-events: none;
            z-index: 3;
        }

        #openingModal .opening-item-card {
            width: 148px;
            height: 148px;
            border-radius: 18px;
            flex: 0 0 auto;
            background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 100%);
            border: 1px solid rgba(255,255,255,0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 8px 30px rgba(0,0,0,0.22);
        }

        #openingModal .opening-item-card.is-winner {
            box-shadow: 0 0 0 1px rgba(255,214,92,0.6), 0 0 28px rgba(255,214,92,0.22), 0 12px 30px rgba(0,0,0,0.3);
        }

        #openingModal .opening-item-icon {
            width: 82px;
            height: 82px;
            border-radius: 16px;
            background: rgba(255,255,255,0.10);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 46px;
            user-select: none;
        }

        #openingModal .opening-result {
            padding: 0 20px 24px;
            min-height: 74px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #openingModal .opening-result-card {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
            transition: opacity 260ms ease, transform 260ms ease;
            text-align: center;
            pointer-events: none;
        }

        #openingModal .opening-result-card.visible {
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        #openingModal .opening-result-name {
            font-size: 30px;
            font-weight: 800;
            margin-bottom: 4px;
        }

        #openingModal .opening-result-price {
            font-size: 28px;
            font-weight: 900;
            color: #ffd64f;
        }

        #openingModal .rarity-common { color: #d4d8df; }
        #openingModal .rarity-uncommon { color: #7de38d; }
        #openingModal .rarity-rare { color: #63a7ff; }
        #openingModal .rarity-epic { color: #c78cff; }
        #openingModal .rarity-legendary { color: #ffd64f; }
        #openingModal .rarity-mythic { color: #ff8b8b; }
    `;
    document.head.appendChild(style);

    if (!document.getElementById('battleShowdownTheme')) {
        const themeStyle = document.createElement('style');
        themeStyle.id = 'battleShowdownTheme';
        themeStyle.textContent = `
            #battleShowdownModal {
                background: rgba(1, 12, 40, 0.95);
            }
            #battleShowdownModal .battle-showdown-shell {
                background: linear-gradient(180deg, #132f6f 0%, #060e34 90%);
                border-color: rgba(255,255,255,0.12);
                box-shadow: 0 35px 90px rgba(0,0,0,0.55);
                padding: 32px;
            }
            #battleShowdownModal .battle-showdown-title {
                font-size: 30px;
                letter-spacing: 0.1em;
            }
            #battleShowdownModal .battle-showdown-sub {
                font-size: 0.95rem;
                color: rgba(255,255,255,0.7);
            }
            #battleShowdownModal .battle-columns {
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 12px;
            }
            #battleShowdownModal .battle-column {
                background: rgba(7,19,55,0.95);
                border: 1px solid rgba(255,255,255,0.15);
                min-height: 230px;
                box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
            }
            #battleShowdownModal .battle-column-head strong {
                font-size: 1.45rem;
                color: #ffd64f;
            }
            #battleShowdownModal .battle-column-head span {
                font-size: 0.85rem;
                color: rgba(255,255,255,0.58);
            }
            #battleShowdownModal .battle-roller-window {
                height: 150px;
                border-radius: 16px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.08);
            }
            #battleShowdownModal .battle-player-row {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }
            #battleShowdownModal .battle-user-card {
                background: rgba(3,17,45,0.85);
                border-color: rgba(255,255,255,0.06);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            }
            #battleShowdownModal .battle-user-card .battle-user-badge {
                background: rgba(255,255,255,0.08);
                color: #c3d2ff;
            }
        `;
        document.head.appendChild(themeStyle);
    }
}

function ensureOpeningModal() {
    ensureOpeningStyles();

    let modal = document.getElementById('openingModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'openingModal';
    modal.className = 'opening-overlay';
    modal.innerHTML = `
        <div class="opening-shell">
            <div class="opening-topbar">
                <div class="opening-title-wrap">
                    <div class="opening-case-icon">*</div>
                    <div>
                        <h2 id="openingCaseName" class="opening-case-name">Case</h2>
                <div id="openingCasePrice" class="opening-case-price">0</div>
                    </div>
                </div>
                <button type="button" class="opening-close-btn" id="openingCloseBtn">x</button>
            </div>

            <div class="opening-reel-section">
                <div class="opening-reel-window" id="openingReelWindow">
                    <div class="opening-center-line"></div>
                    <div class="opening-reel-track" id="openingReelTrack"></div>
                </div>
            </div>

            <div class="opening-result">
                <div class="opening-result-card" id="openingResultCard">
                    <div id="openingResultName" class="opening-result-name"></div>
                    <div id="openingResultPrice" class="opening-result-price"></div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeOpeningModal();
        }
    });

    const closeBtn = modal.querySelector('#openingCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeOpeningModal);
    }

    return modal;
}

function closeOpeningModal() {
    const modal = document.getElementById('openingModal');
    if (modal) {
        modal.style.display = 'none';
    }

    if (activeOpeningState && activeOpeningState.rafId) {
        cancelAnimationFrame(activeOpeningState.rafId);
    }

    activeOpeningState = null;
}

function buildSpinSequence(items, winningItem) {
    if (!winningItem) return [];

    const minLoops = 40;
    const maxLoops = 54;
    const loops = Math.floor(Math.random() * (maxLoops - minLoops + 1)) + minLoops;
    const trailing = 12;
    const totalItems = loops + 1 + trailing;
    const winningIndex = Math.min(Math.max(0, loops), totalItems - 1);

    return generateSpinnerReel(items, totalItems, winningItem, winningIndex);
}

function renderSpinTrack(track, sequence) {
    track.innerHTML = sequence.map(item => `
        <div class="opening-item-card" data-winner="${item.__isWinner ? '1' : '0'}">
            <div class="opening-item-icon" style="background-image:url('${escapeHtml(item.image || getItemImageByName(item.name))}'); background-size:70px 70px; background-repeat:no-repeat; background-position:center;"></div>
        </div>
    `).join('');
}

function isJackpotDrop(payout, casePrice) {
    return Number(casePrice || 0) > 0 && Number(payout || 0) >= Number(casePrice) * 5;
}

function launchConfettiBurstFromElement(sourceEl, pieceCount = 26) {
    if (!sourceEl) return;

    const rect = sourceEl.getBoundingClientRect();
    if (!rect.width && !rect.height) return;

    const originX = rect.left + (rect.width / 2);
    const originY = rect.top + (rect.height / 2);
    const layer = document.createElement('div');
    layer.style.position = 'fixed';
    layer.style.left = '0';
    layer.style.top = '0';
    layer.style.width = '100vw';
    layer.style.height = '100vh';
    layer.style.pointerEvents = 'none';
    layer.style.zIndex = '9999';
    document.body.appendChild(layer);

    const colors = ['#ffd84a', '#ff8f3f', '#56ccf2', '#6ee7b7', '#f472b6', '#ffffff'];

    for (let i = 0; i < pieceCount; i++) {
        const piece = document.createElement('span');
        const size = 6 + Math.random() * 8;
        piece.style.position = 'absolute';
        piece.style.left = `${originX}px`;
        piece.style.top = `${originY}px`;
        piece.style.width = `${size}px`;
        piece.style.height = `${size * (0.7 + Math.random() * 0.8)}px`;
        piece.style.borderRadius = `${Math.max(2, size / 3)}px`;
        piece.style.background = colors[i % colors.length];
        piece.style.boxShadow = '0 0 10px rgba(255,255,255,0.18)';
        piece.style.opacity = '0.95';
        layer.appendChild(piece);

        const spread = (Math.random() - 0.5) * 240;
        const rise = 55 + Math.random() * 65;
        const settleX = spread * (0.8 + Math.random() * 0.35);
        const fallY = 150 + Math.random() * 120;
        const rotate = -320 + Math.random() * 640;
        const scale = 0.82 + Math.random() * 0.38;

        piece.animate([
            { transform: 'translate(-50%, -50%) scale(0.7) rotate(0deg)', opacity: 0 },
            { transform: `translate(calc(-50% + ${spread * 0.32}px), calc(-50% - ${rise}px)) scale(${scale}) rotate(${rotate * 0.28}deg)`, opacity: 1, offset: 0.26 },
            { transform: `translate(calc(-50% + ${settleX}px), calc(-50% + ${fallY * 0.42}px)) scale(${scale * 0.96}) rotate(${rotate * 0.72}deg)`, opacity: 0.92, offset: 0.72 },
            { transform: `translate(calc(-50% + ${settleX}px), calc(-50% + ${fallY}px)) scale(${scale * 0.88}) rotate(${rotate}deg)`, opacity: 0 }
        ], {
            duration: 1550 + Math.random() * 550,
            easing: 'cubic-bezier(0.16, 0.78, 0.22, 1)',
            fill: 'forwards'
        });
    }

    window.setTimeout(() => {
        layer.remove();
    }, 2400);
}

function revealSpinResult(winningItem) {
    const resultCard = document.getElementById('openingResultCard');
    const resultName = document.getElementById('openingResultName');
    const resultPrice = document.getElementById('openingResultPrice');

    if (!resultCard || !resultName || !resultPrice) return;

    resultName.className = `opening-result-name ${getRarityClass(winningItem.item_rarity)}`;
    resultName.textContent = winningItem.name;
    resultPrice.textContent = formatMoney(winningItem.payout);

    requestAnimationFrame(() => {
        resultCard.classList.add('visible');
    });
}

async function tryOpenCaseOnServer(caseId, odds) {
    const candidateCalls = [
        () => apiRequest(`/cases/${caseId}/open`, { method: 'POST' }),
        () => apiRequest(`/cases/${caseId}/spin`, { method: 'POST' }),
        () => apiRequest(`/open/${caseId}`, { method: 'POST' }),
        () => apiRequest(`/cases/open/${caseId}`, { method: 'POST' }),
        () => apiRequest(`/open-case/${caseId}`, {
            method: 'POST',
            body: JSON.stringify({ caseId })
        }),
        () => apiRequest('/open-case', {
            method: 'POST',
            body: JSON.stringify({ caseId })
        }),
        () => apiRequest('/cases/open', {
            method: 'POST',
            body: JSON.stringify({ caseId })
        })
    ];

    for (const requestFn of candidateCalls) {
        try {
            const response = await requestFn();
            const rawWinner =
                response.item ||
                response.reward ||
                response.result?.item ||
                response.result ||
                response.drop ||
                response.openedItem ||
                response.data?.item ||
                response.data ||
                response;

            return {
                source: 'server',
                response,
                winningItem: normalizeWinningItem(rawWinner, odds),
                balance: response.balance
            };
        } catch (error) {
            const msg = String(error.message || '').toLowerCase();
            const harmless =
                msg.includes('not found') ||
                msg.includes('404') ||
                msg.includes('cannot post') ||
                msg.includes('api hatasi');

            if (!harmless) {
                throw error;
            }
        }
    }

    const fallbackItem = getWeightedRandomItem(odds) || (Array.isArray(odds) ? odds[0] : null);
    const normalizedFallback = fallbackItem ? normalizeWinningItem(fallbackItem, odds) : null;
    return {
        source: 'fallback',
        response: null,
        winningItem: normalizedFallback || fallbackItem
    };
}

async function showSlotMachine(caseId) {
    try {
        const modal = ensureOpeningModal();
        const track = document.getElementById('openingReelTrack');
        const reelWindow = document.getElementById('openingReelWindow');
        const resultCard = document.getElementById('openingResultCard');
        const caseNameEl = document.getElementById('openingCaseName');
        const casePriceEl = document.getElementById('openingCasePrice');

        if (!modal || !track || !reelWindow || !resultCard || !caseNameEl || !casePriceEl) {
            showMessage('Acilis ekrani olusturulamadi.', 'error');
            return;
        }

        if (activeOpeningState && activeOpeningState.rafId) {
            cancelAnimationFrame(activeOpeningState.rafId);
        }
        activeOpeningState = null;

        const caseData = await apiRequest(`/cases/${caseId}`);
        const itemsResponse = await apiRequest(`/cases/${caseId}/odds`);
        const odds = (itemsResponse.odds || []).map(item => ({
            ...item,
            payout: Number(item.payout || 0),
            probability: Number(item.probability || 0)
        }));

        if (!odds.length) {
            showMessage('Bu kasada item bulunamadi.', 'error');
            return;
        }

        caseNameEl.textContent = caseData.name || 'Case';
        casePriceEl.textContent = formatMoney(caseData.price || 0);

        resultCard.classList.remove('visible');
        document.getElementById('openingResultName').textContent = '';
        document.getElementById('openingResultPrice').textContent = '';

        modal.style.display = 'flex';

        const openResult = await tryOpenCaseOnServer(caseId, odds);
        const winningItem = openResult.winningItem;

        if (!winningItem) {
            throw new Error('Kazanan item alinamadi.');
        }

        const sequence = buildSpinSequence(odds, winningItem);
        renderSpinTrack(track, sequence);

        const winnerElement = track.querySelector('[data-winner="1"]');
        if (!winnerElement) {
            throw new Error('Kazanan item elementi olusturulamadi.');
        }

        const windowRect = reelWindow.getBoundingClientRect();
        const winnerRect = winnerElement.getBoundingClientRect();

        const currentTrackMatrix = new DOMMatrixReadOnly(getComputedStyle(track).transform);
        const currentTrackX = currentTrackMatrix.m41;

        const centerX = windowRect.width / 2;
        const winnerCenterXWithinTrack = (winnerRect.left - windowRect.left) - currentTrackX + (winnerRect.width / 2);

        const exactCenterX = centerX - winnerCenterXWithinTrack;

        // Ilk durus tam ortada olmasin: biraz sag/sol sapmayla dursun
        const randomStopOffset = (Math.random() * 54) - 27; // -27px ile +27px arasi
        const nearStopX = exactCenterX + randomStopOffset;

        const extraStartDistance = clamp(windowRect.width * 2.2, 1500, 2800);
        const startX = nearStopX + extraStartDistance;

        track.style.transform = `translate3d(${startX}px, -50%, 0)`;

        const spinDuration = 6000;
        const settleDuration = 420;
        let spinStartTime = null;
        let settleStartTime = null;

        const settleToCenter = (timestamp, fromX) => {
            if (!settleStartTime) settleStartTime = timestamp;

            const elapsed = timestamp - settleStartTime;
            const progress = clamp(elapsed / settleDuration, 0, 1);
            const eased = easeOutCubic(progress);
            const x = fromX + (exactCenterX - fromX) * eased;

            track.style.transform = `translate3d(${x}px, -50%, 0)`;

            if (progress < 1) {
                activeOpeningState = {
                    rafId: requestAnimationFrame((nextTs) => settleToCenter(nextTs, fromX))
                };
                return;
            }

            const finalWindowRect = reelWindow.getBoundingClientRect();
            const finalWinnerRect = winnerElement.getBoundingClientRect();
            const winnerCenterOnScreen = (finalWinnerRect.left - finalWindowRect.left) + (finalWinnerRect.width / 2);
            const correction = (finalWindowRect.width / 2) - winnerCenterOnScreen;

            track.style.transform = `translate3d(${exactCenterX + correction}px, -50%, 0)`;

            winnerElement.classList.add('is-winner');
            activeOpeningState = null;

            requestAnimationFrame(() => {
                revealSpinResult(winningItem);
                if (isJackpotDrop(winningItem.payout, caseData.price)) {
                    launchConfettiBurstFromElement(winnerElement, 34);
                }
                if (openResult.source === 'server' && openResult.balance != null) {
                    updateHeaderBalance(openResult.balance);
                } else {
                    refreshHeaderUserInfo();
                }

                if (openResult.source === 'fallback') {
                    showMessage('Not: Sunucu acma endpointi bulunamadi. Animasyon fallback ile calisti.', 'error');
                }
            });
        };

        const animate = (timestamp) => {
            if (!spinStartTime) spinStartTime = timestamp;

            const elapsed = timestamp - spinStartTime;
            const progress = clamp(elapsed / spinDuration, 0, 1);

            // Basta yavas, ortada daha hizli, sonda tekrar yavas
            let finalProgress = progress;
if (progress > 0.95) {
    const slow = (progress - 0.95) / 0.05;
    finalProgress = 0.95 + slow * slow * 0.05;
}
const eased = easeInOutCubic(finalProgress);

            const x = startX + (nearStopX - startX) * eased;
            track.style.transform = `translate3d(${x}px, -50%, 0)`;

            if (progress < 1) {
                activeOpeningState = {
                    rafId: requestAnimationFrame(animate)
                };
                return;
            }

            activeOpeningState = {
                rafId: requestAnimationFrame((nextTs) => settleToCenter(nextTs, nearStopX))
            };
        };

        activeOpeningState = {
            rafId: requestAnimationFrame(animate)
        };
    } catch (error) {
        console.error(error);
        showMessage(error.message || 'Kasa acilirken bir hata olustu.', 'error');
    }
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function setAnimatedMoneyContent(element, value) {
    if (!element) return;
    if (typeof value === 'string' && value.includes('<')) {
        element.innerHTML = value;
        return;
    }
    element.textContent = String(value);
}

function animateMoneyValue(element, fromValue, toValue, duration = 520, formatter = formatMoney) {
    if (!element) return Promise.resolve();

    if (Math.abs(Number(toValue) - Number(fromValue)) < 0.01) {
        setAnimatedMoneyContent(element, formatter(Number(toValue)));
        return Promise.resolve();
    }

    return new Promise(resolve => {
        let startTime = null;

        const frame = timestamp => {
            if (!startTime) startTime = timestamp;
            const progress = clamp((timestamp - startTime) / duration, 0, 1);
            const eased = easeOutCubic(progress);
            const current = Number(fromValue) + ((Number(toValue) - Number(fromValue)) * eased);
            setAnimatedMoneyContent(element, formatter(current));

            if (progress < 1) {
                requestAnimationFrame(frame);
                return;
            }

            setAnimatedMoneyContent(element, formatter(Number(toValue)));
            resolve();
        };

        requestAnimationFrame(frame);
    });
}

function parseMoneyText(value) {
    return Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
}

function animateHeaderBalance(fromValue, toValue, duration = 900) {
    const balanceEl = document.getElementById('userBalance');
    if (!balanceEl) return Promise.resolve();

    return new Promise(resolve => {
        let startTime = null;

        const frame = timestamp => {
            if (!startTime) startTime = timestamp;
            const progress = clamp((timestamp - startTime) / duration, 0, 1);
            const eased = easeOutCubic(progress);
            const current = Number(fromValue) + ((Number(toValue) - Number(fromValue)) * eased);
            balanceEl.textContent = formatMoney(current);

            if (progress < 1) {
                requestAnimationFrame(frame);
                return;
            }

            balanceEl.textContent = formatMoney(toValue);
            resolve();
        };

        requestAnimationFrame(frame);
    });
}

function launchMoneyStream(fromEl, toEl, symbol = 'money.gif', pieces = 12) {
    if (!fromEl || !toEl) return;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const startX = fromRect.left + (fromRect.width / 2);
    const startY = fromRect.top + (fromRect.height / 2);
    const endX = toRect.left + (toRect.width / 2);
    const endY = toRect.top + (toRect.height / 2);

    const layer = document.createElement('div');
    layer.style.position = 'fixed';
    layer.style.left = '0';
    layer.style.top = '0';
    layer.style.width = '100vw';
    layer.style.height = '100vh';
    layer.style.pointerEvents = 'none';
    layer.style.zIndex = '9998';
    document.body.appendChild(layer);

    for (let i = 0; i < pieces; i++) {
        const token = document.createElement(symbol === 'money.gif' ? 'img' : 'span');
        if (symbol === 'money.gif') {
            token.src = 'money.gif';
            token.alt = 'money';
        } else {
            token.textContent = symbol;
        }
        token.style.position = 'absolute';
        token.style.left = `${startX}px`;
        token.style.top = `${startY}px`;
        token.style.transform = 'translate(-50%, -50%)';
        token.style.width = `${120 + Math.random() * 30}px`;
        token.style.height = 'auto';
        token.style.filter = 'drop-shadow(0 0 10px rgba(255,214,79,0.22))';
        layer.appendChild(token);

        const delay = i * 45;
        const midX = startX + ((endX - startX) * (0.35 + Math.random() * 0.3)) + ((Math.random() * 70) - 35);
        const midY = Math.min(startY, endY) - (30 + Math.random() * 55);

        token.animate([
            { transform: 'translate(-50%, -50%) scale(0.85)', left: `${startX}px`, top: `${startY}px`, opacity: 0 },
            { transform: 'translate(-50%, -50%) scale(1)', left: `${midX}px`, top: `${midY}px`, opacity: 1, offset: 0.45 },
            { transform: 'translate(-50%, -50%) scale(0.92)', left: `${endX}px`, top: `${endY}px`, opacity: 0 }
        ], {
            duration: 2800 + Math.random() * 320,
            delay,
            easing: 'cubic-bezier(0.2, 0.82, 0.2, 1)',
            fill: 'forwards'
        });
    }

    window.setTimeout(() => layer.remove(), 4200);
}

async function animateBattleJackpotPayout({
    jackpotEl,
    winnerCards,
    winnerShare,
    totalPayout,
    userWon,
    finalBalance,
    battleReward
}) {
    if (!jackpotEl || !winnerCards.length) return;

    const rewardTargets = winnerCards
        .map(card => ({
            card,
            rewardEl: card.querySelector('[data-seat-reward]')
        }))
        .filter(Boolean);

    rewardTargets.forEach(({ rewardEl }) => {
        if (rewardEl) rewardEl.textContent = '+0';
    });

    const startBalance = Number(finalBalance || 0) - Number(battleReward || 0);
    const balancePromise = userWon
        ? animateHeaderBalance(startBalance, Number(finalBalance || 0), 3100)
        : Promise.resolve();

    rewardTargets.forEach(({ card }) => {
        launchMoneyStream(jackpotEl, card, 'money.gif', 12);
    });

    const rewardPromises = rewardTargets.map(({ rewardEl }) =>
        animateMoneyValue(rewardEl, 0, Number(winnerShare || 0), 2950, value => `+${formatMoney(value)}`)
    );
    const jackpotPromise = animateMoneyValue(
        jackpotEl,
        Number(totalPayout || 0),
        0,
        3050,
        value => `${COIN_ICON_HTML}&nbsp;${formatMoney(value)}`
    );

    await Promise.all([jackpotPromise, balancePromise, ...rewardPromises]);
    jackpotEl.innerHTML = `${COIN_ICON_HTML}&nbsp;${formatMoney(0)}`;

    rewardTargets.forEach(({ rewardEl }) => {
        if (rewardEl) rewardEl.textContent = `+${formatMoney(winnerShare)}`;
    });
}

async function playBattleRoundAnimation({ caseName, headerLabel, odds, winningItem, casePrice = 0 }) {
    const modal = ensureOpeningModal();
    const track = document.getElementById('openingReelTrack');
    const reelWindow = document.getElementById('openingReelWindow');
    const resultCard = document.getElementById('openingResultCard');
    const caseNameEl = document.getElementById('openingCaseName');
    const casePriceEl = document.getElementById('openingCasePrice');

    if (!modal || !track || !reelWindow || !resultCard || !caseNameEl || !casePriceEl) {
        throw new Error('Acilis ekrani olusturulamadi.');
    }

    if (activeOpeningState && activeOpeningState.rafId) {
        cancelAnimationFrame(activeOpeningState.rafId);
    }
    activeOpeningState = null;

    caseNameEl.textContent = caseName;
    casePriceEl.textContent = headerLabel;
    resultCard.classList.remove('visible');
    document.getElementById('openingResultName').textContent = '';
    document.getElementById('openingResultPrice').textContent = '';
    modal.style.display = 'flex';

    const sequence = buildSpinSequence(odds, winningItem);
    renderSpinTrack(track, sequence);

    const winnerElement = track.querySelector('[data-winner="1"]');
    if (!winnerElement) {
        throw new Error('Kazanan item elementi olusturulamadi.');
    }

    const windowRect = reelWindow.getBoundingClientRect();
    const winnerRect = winnerElement.getBoundingClientRect();
    const currentTrackMatrix = new DOMMatrixReadOnly(getComputedStyle(track).transform);
    const currentTrackX = currentTrackMatrix.m41;
    const centerX = windowRect.width / 2;
    const winnerCenterXWithinTrack = (winnerRect.left - windowRect.left) - currentTrackX + (winnerRect.width / 2);
    const exactCenterX = centerX - winnerCenterXWithinTrack;
    const randomStopOffset = (Math.random() * 54) - 27;
    const nearStopX = exactCenterX + randomStopOffset;
    const extraStartDistance = clamp(windowRect.width * 2.2, 1500, 2800);
    const startX = nearStopX + extraStartDistance;

    track.style.transform = `translate3d(${startX}px, -50%, 0)`;

    await new Promise(resolve => {
        const spinDuration = 6000;
        const settleDuration = 420;
        let spinStartTime = null;
        let settleStartTime = null;

        const settleToCenter = (timestamp, fromX) => {
            if (!settleStartTime) settleStartTime = timestamp;

            const elapsed = timestamp - settleStartTime;
            const progress = clamp(elapsed / settleDuration, 0, 1);
            const eased = easeOutCubic(progress);
            const x = fromX + (exactCenterX - fromX) * eased;

            track.style.transform = `translate3d(${x}px, -50%, 0)`;

            if (progress < 1) {
                activeOpeningState = {
                    rafId: requestAnimationFrame(nextTs => settleToCenter(nextTs, fromX))
                };
                return;
            }

            const finalWindowRect = reelWindow.getBoundingClientRect();
            const finalWinnerRect = winnerElement.getBoundingClientRect();
            const winnerCenterOnScreen = (finalWinnerRect.left - finalWindowRect.left) + (finalWinnerRect.width / 2);
            const correction = (finalWindowRect.width / 2) - winnerCenterOnScreen;

            track.style.transform = `translate3d(${exactCenterX + correction}px, -50%, 0)`;
            winnerElement.classList.add('is-winner');
            activeOpeningState = null;

            requestAnimationFrame(async () => {
                revealSpinResult(winningItem);
                if (isJackpotDrop(winningItem.payout, casePrice)) {
                    launchConfettiBurstFromElement(winnerElement, 34);
                }
                await wait(1700);
                resolve();
            });
        };

        const animate = timestamp => {
            if (!spinStartTime) spinStartTime = timestamp;

            const elapsed = timestamp - spinStartTime;
            const progress = clamp(elapsed / spinDuration, 0, 1);
            let finalProgress = progress;

            if (progress > 0.95) {
                const slow = (progress - 0.95) / 0.05;
                finalProgress = 0.95 + slow * slow * 0.05;
            }

            const eased = easeInOutCubic(finalProgress);
            const x = startX + (nearStopX - startX) * eased;
            track.style.transform = `translate3d(${x}px, -50%, 0)`;

            if (progress < 1) {
                activeOpeningState = {
                    rafId: requestAnimationFrame(animate)
                };
                return;
            }

            activeOpeningState = {
                rafId: requestAnimationFrame(nextTs => settleToCenter(nextTs, nearStopX))
            };
        };

        activeOpeningState = {
            rafId: requestAnimationFrame(animate)
        };
    });
}

async function playBattleOpeningSequence(result) {
    const rounds = result.rounds || [];
    if (!rounds.length) {
        throw new Error('Battle rounds yok');
    }

    const battleCaseId = result.case?.id;
    if (!battleCaseId) {
        throw new Error('Battle case id missing');
    }

    const caseData = await apiRequest(`/cases/${battleCaseId}`);
    const itemsResponse = await apiRequest(`/cases/${battleCaseId}/odds`);
    const odds = (itemsResponse.odds || []).map(item => ({
        ...item,
        payout: Number(item.payout || 0),
        probability: Number(item.probability || 0)
    }));

    for (let index = 0; index < rounds.length; index++) {
        const round = rounds[index];
        const winningItem = normalizeWinningItem(round, odds);

        await playBattleRoundAnimation({
            caseName: `${caseData.name} â€¢ ${round.player_name}`,
            headerLabel: `Round ${index + 1}/${rounds.length} â€¢ ${formatMoney(caseData.price)}`,
            odds,
            winningItem,
            casePrice: caseData.price
        });
    }

    await wait(350);
    closeOpeningModal();
}

function ensureBattleShowdownStyles() {
    if (document.getElementById('battleShowdownStyles')) return;

    const style = document.createElement('style');
    style.id = 'battleShowdownStyles';
    style.textContent = `
        #battleShowdownModal {
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: rgba(9, 12, 31, 0.92);
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }

        #battleShowdownModal .battle-showdown-shell {
            width: min(1180px, 96vw);
            max-height: 92vh;
            overflow: auto;
            background: linear-gradient(180deg, #1d2147 0%, #161937 100%);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 24px;
            padding: 22px;
            color: #fff;
            box-shadow: 0 30px 90px rgba(0,0,0,0.34);
        }

        #battleShowdownModal .battle-showdown-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 18px;
        }

        #battleShowdownModal .battle-showdown-title {
            font-size: 28px;
            font-weight: 800;
            margin: 0;
        }

        #battleShowdownModal .battle-showdown-sub {
            margin-top: 4px;
            color: rgba(255,255,255,0.72);
        }

        #battleShowdownModal .battle-showdown-close {
            width: 42px;
            height: 42px;
            border: 0;
            border-radius: 12px;
            cursor: pointer;
            background: rgba(255,255,255,0.08);
            color: #fff;
            font-size: 22px;
        }

        #battleShowdownModal .battle-versus {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 16px;
            align-items: center;
            margin-bottom: 16px;
        }

        #battleShowdownModal .battle-team-score {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            padding: 16px;
            text-align: center;
        }

        #battleShowdownModal .battle-team-score.is-winner {
            border-color: rgba(255,214,92,0.7);
            box-shadow: 0 0 0 1px rgba(255,214,92,0.35);
        }

        #battleShowdownModal .battle-team-score strong {
            display: block;
            margin-top: 6px;
            font-size: 1.7rem;
        }

        #battleShowdownModal .battle-versus-mark {
            color: rgba(255,255,255,0.74);
            font-weight: 800;
            letter-spacing: 0.18em;
        }

        #battleShowdownModal .battle-columns {
            display: grid;
            grid-template-columns: repeat(var(--battle-columns, 2), minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 18px;
        }

        #battleShowdownModal .battle-column {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            overflow: hidden;
        }

        #battleShowdownModal .battle-column.winner {
            border-color: rgba(255,214,92,0.7);
            box-shadow: 0 0 0 1px rgba(255,214,92,0.26);
        }

        #battleShowdownModal .battle-column-head {
            padding: 14px 14px 0;
            text-align: center;
        }

        #battleShowdownModal .battle-column-head strong {
            display: block;
            margin-top: 6px;
            font-size: 1.05rem;
        }

        #battleShowdownModal .battle-roller-window {
            position: relative;
            height: 420px;
            overflow: hidden;
            margin: 14px;
            border-radius: 18px;
            background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%);
            border: 1px solid rgba(255,255,255,0.06);
        }

        #battleShowdownModal .battle-roller-window::after {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            height: 3px;
            transform: translateY(-50%);
            background: linear-gradient(90deg, rgba(255,214,92,0.05), rgba(255,214,92,0.95), rgba(255,214,92,0.05));
            box-shadow: 0 0 24px rgba(255,214,92,0.32);
            z-index: 2;
        }

        #battleShowdownModal .battle-roller-track {
            position: absolute;
            left: 14px;
            right: 14px;
            top: 0;
            display: flex;
            flex-direction: column;
            gap: 12px;
            will-change: transform;
        }

        #battleShowdownModal .battle-roller-item {
            height: 128px;
            border-radius: 18px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.08);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 12px;
        }

        #battleShowdownModal .battle-roller-item.is-winner {
            box-shadow: 0 0 0 1px rgba(255,214,92,0.6), 0 0 28px rgba(255,214,92,0.24);
        }

        #battleShowdownModal .battle-roller-icon {
            width: 58px;
            height: 58px;
            border-radius: 16px;
            background: rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            margin-bottom: 10px;
        }

        #battleShowdownModal .battle-player-row {
            display: grid;
            grid-template-columns: repeat(var(--battle-columns, 2), minmax(0, 1fr));
            gap: 16px;
        }

        #battleShowdownModal .battle-user-card {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px;
            border-radius: 16px;
            background: rgba(255,255,255,0.07);
            border: 1px solid rgba(255,255,255,0.08);
        }

        #battleShowdownModal .battle-user-card.winner {
            border-color: rgba(255,214,92,0.7);
        }

        #battleShowdownModal .battle-user-badge {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,214,92,0.14);
            color: #ffd64f;
            font-weight: 800;
        }
    `;
    document.head.appendChild(style);
}

function ensureBattleShowdownModal() {
    ensureBattleShowdownStyles();

    let modal = document.getElementById('battleShowdownModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'battleShowdownModal';
    modal.innerHTML = `
        <div class="battle-showdown-shell">
            <div class="battle-showdown-top">
                <div>
                    <h2 class="battle-showdown-title" id="battleShowdownTitle">Battle</h2>
                    <div class="battle-showdown-sub" id="battleShowdownSubtitle"></div>
                </div>
                <button class="battle-showdown-close" type="button" id="battleShowdownClose">x</button>
            </div>
            <div class="battle-versus" id="battleVersusBoard"></div>
            <div class="battle-columns" id="battleColumns"></div>
            <div class="battle-player-row" id="battlePlayerRow"></div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#battleShowdownClose')?.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    return modal;
}

function buildVerticalSpinSequence(items, winningItem) {
    const sequence = [];
    const loops = 72 + Math.floor(Math.random() * 24);

    for (let i = 0; i < loops; i++) {
        const randomItem = pickVisualSpinItem(items);
        sequence.push({ ...randomItem, image: getItemImageByName(randomItem.name) });
    }

    sequence.push({ ...winningItem, __isWinner: true, image: getItemImageByName(winningItem.name) });

    for (let i = 0; i < 8; i++) {
        const randomItem = pickVisualSpinItem(items);
        sequence.push({ ...randomItem, image: getItemImageByName(randomItem.name) });
    }

    return sequence;
}

function getBattleParticipantLabel(round) {
    return round.seat === 1 ? 'Sen' : `Bot ${round.seat - 1}`;
}

function getItemVisualSymbol(rarity) {
    switch ((rarity || '').toLowerCase()) {
        case 'legendary':
            return 'âœ¦';
        case 'epic':
            return 'â¬Ÿ';
        case 'rare':
            return 'â—†';
        default:
            return 'â—ˆ';
    }
}

async function animateBattleColumn(columnEl, odds, winningItem, duration, casePrice = 0) {
    const windowEl = columnEl.querySelector('.battle-roller-window');
    const trackEl = columnEl.querySelector('.battle-roller-track');
    if (!windowEl || !trackEl) return;

    const sequence = buildVerticalSpinSequence(odds, winningItem);
    trackEl.innerHTML = sequence.map(item => {
        const iconImage = escapeHtml(getItemImageByName(item.name));
        return `
        <div class="battle-roller-item" data-winner="${item.__isWinner ? '1' : '0'}">
            <div class="battle-roller-icon" style="background-image:url('${iconImage}'); background-repeat:no-repeat; background-position:center; background-size:70px 70px;">
                ${getItemVisualSymbol(item.item_rarity || item.rarity || 'common')}
            </div>
            <strong class="${getRarityClass(item.item_rarity || item.rarity || 'common')}">${escapeHtml(item.name)}</strong>
            <span>${formatMoney(item.payout)}</span>
        </div>
        `;
    }).join('');

    const winnerEl = trackEl.querySelector('[data-winner="1"]');
    if (!winnerEl) return;

    const trackStyle = window.getComputedStyle(trackEl);
    const trackGap = Number.parseFloat(trackStyle.rowGap || trackStyle.gap || '0') || 0;
    const itemHeight = winnerEl.offsetHeight + trackGap;
    const winnerIndex = Array.from(trackEl.children).indexOf(winnerEl);
    const windowHeight = windowEl.clientHeight;
    const exactY = (windowHeight / 2) - (winnerIndex * itemHeight) - (winnerEl.offsetHeight / 2);
    const startDistance = Math.max(windowHeight * 5.8, itemHeight * 22);
    const startY = exactY + startDistance;

    trackEl.style.transform = `translate3d(0, ${startY}px, 0)`;

    await new Promise(resolve => {
        let startTime = null;

        const frame = timestamp => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = clamp(elapsed / duration, 0, 1);
            const eased = easeInOutCubic(progress);
            const y = startY + (exactY - startY) * eased;

            trackEl.style.transform = `translate3d(0, ${y}px, 0)`;

            if (progress < 1) {
                requestAnimationFrame(frame);
                return;
            }

            winnerEl.classList.add('is-winner');
            if (isJackpotDrop(winningItem.payout, casePrice)) {
                launchConfettiBurstFromElement(winnerEl, 30);
            }
            resolve();
        };

        requestAnimationFrame(frame);
    });
}

async function playTeamBattleAnimation(result) {
    const modal = ensureBattleShowdownModal();
    const titleEl = document.getElementById('battleShowdownTitle');
    const subtitleEl = document.getElementById('battleShowdownSubtitle');
    const versusEl = document.getElementById('battleVersusBoard');
    const columnsEl = document.getElementById('battleColumns');
    const playerRowEl = document.getElementById('battlePlayerRow');

    const itemsResponse = await apiRequest(`/cases/${result.case.id}/odds`);
    const odds = (itemsResponse.odds || []).map(item => ({
        ...item,
        payout: Number(item.payout || 0),
        probability: Number(item.probability || 0)
    }));

    if (!modal || !titleEl || !subtitleEl || !versusEl || !columnsEl || !playerRowEl) return;

    titleEl.textContent = `${result.mode} ${result.case.name}`;
    subtitleEl.textContent = `Takim toplami daha yuksek olan tum havuzu alir. Toplam odul ${formatMoney(result.totalPayout)}.`;

    const [teamOne, teamTwo] = result.teams || [];
    versusEl.innerHTML = `
        <div class="battle-team-score" data-team-score="1">
            <span>${escapeHtml(teamOne?.name || 'Takim 1')}</span>
            <strong>?</strong>
        </div>
        <div class="battle-versus-mark">VS</div>
        <div class="battle-team-score" data-team-score="2">
            <span>${escapeHtml(teamTwo?.name || 'Takim 2')}</span>
            <strong>?</strong>
        </div>
    `;

    columnsEl.style.setProperty('--battle-columns', String(result.rounds.length));
    playerRowEl.style.setProperty('--battle-columns', String(result.rounds.length));

    columnsEl.innerHTML = result.rounds.map(round => `
        <div class="battle-column" data-seat="${round.seat}">
            <div class="battle-column-head">
                <span>${escapeHtml(getBattleParticipantLabel(round))}</span>
                <strong>${getDisplayNameMarkup(round.player_name)}</strong>
            </div>
            <div class="battle-roller-window">
                <div class="battle-roller-track"></div>
            </div>
        </div>
    `).join('');

    playerRowEl.innerHTML = result.rounds.map(round => `
        <div class="battle-user-card" data-seat-card="${round.seat}">
            <div class="battle-user-badge">${round.seat}</div>
            <div>
                <strong>${getDisplayNameMarkup(round.player_name)}</strong>
                <div data-seat-result="${round.seat}">Kasasi donuyor...</div>
                <div class="battle-user-reward" data-seat-reward="${round.seat}"></div>
            </div>
        </div>
    `).join('');

    modal.style.display = 'flex';
    const sharedDuration = 6200 + Math.floor(Math.random() * 700);

    await Promise.all(result.rounds.map(async round => {
        const columnEl = columnsEl.querySelector(`[data-seat="${round.seat}"]`);
        const winningItem = normalizeWinningItem({
            id: round.item.id,
            name: round.item.name,
            payout: round.item.payout,
            rarity: round.item.rarity,
            item_rarity: round.item.rarity
        }, odds);

        await animateBattleColumn(columnEl, odds, winningItem, sharedDuration, result.case?.price || 0);
    }));

    for (const team of result.teams || []) {
        const scoreEl = versusEl.querySelector(`[data-team-score="${team.id}"] strong`);
        const scoreCard = versusEl.querySelector(`[data-team-score="${team.id}"]`);
        if (scoreEl) scoreEl.textContent = formatMoney(team.total);
        if (scoreCard && Number(team.id) === Number(result.winnerTeam?.id)) {
            scoreCard.classList.add('is-winner');
        }
    }

    for (const round of result.rounds) {
        const seatCard = playerRowEl.querySelector(`[data-seat-card="${round.seat}"]`);
        const seatResult = playerRowEl.querySelector(`[data-seat-result="${round.seat}"]`);
        const columnEl = columnsEl.querySelector(`[data-seat="${round.seat}"]`);

        if (seatResult) {
            seatResult.textContent = `${round.item.name} â€¢ ${formatMoney(round.payout)}`;
        }

        if (seatCard && Number(round.team) === Number(result.winnerTeam?.id)) {
            seatCard.classList.add('winner');
        }

        if (columnEl && Number(round.team) === Number(result.winnerTeam?.id)) {
            columnEl.classList.add('winner');
        }
    }

    const jackpotEl = document.querySelector('#jackpotBar .jackpot-value') || document.querySelector('.jackpot-value');
    const winnerCards = Array.from(playerRowEl.querySelectorAll('.battle-user-card.winner'));

    if (jackpotEl && winnerCards.length && Number(result.totalPayout || 0) > 0) {
        await animateBattleJackpotPayout({
            jackpotEl,
            winnerCards,
            winnerShare: Number(result.winnerShare || 0),
            totalPayout: Number(result.totalPayout || 0),
            userWon: Number(result.battleReward || 0) > 0,
            finalBalance: Number(result.balance || 0),
            battleReward: Number(result.battleReward || 0)
        });
        jackpotEl.innerHTML = `${COIN_ICON_HTML}&nbsp;${formatMoney(0)}`;
    }

    await wait(1400);
    modal.style.display = 'none';
}

// ==============================
// Cases Builder Overrides
// ==============================
async function initCasesPage() {
    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    const userData = await refreshHeaderUserInfo();
    toggleAdminCasesTab(userData);

    try {
        const [cases, rawItems] = await Promise.all([
            apiRequest('/cases'),
            apiRequest('/items')
        ]);
        availableCases = cases;
        availableItems = ensureFeaturedItems(rawItems);
        initCasePreviewModal();
        renderCaseCatalog(cases);
        bindCaseQtyButtons();
        renderCommunityItemLibrary(availableItems);
        initBattlePanel();
        initSidebarTabs();
        initCommunityCaseCreator();
        initAdminBalancePanel(Boolean(
            userData?.is_admin &&
            String(userData?.email || '').toLowerCase() === BALANCE_ADMIN_EMAIL
        ));
        await refreshBattleLobbies();
        startBattleLobbyPolling();
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

function initBattlePanel() {
    const startBtn = document.getElementById('startBattleBtn');
    if (!startBtn) return;

    renderSelectedCases();

    startBtn.onclick = async () => {
        const playerCount = Number(document.getElementById('battlePlayers')?.value || 2);
        const caseEntries = Object.entries(selectedBattleEntries)
            .map(([caseId, quantity]) => ({ caseId: Number(caseId), quantity: Number(quantity) }))
            .filter(entry => entry.quantity > 0);
        const optimisticTotalCost = caseEntries.reduce((sum, entry) => {
            const caseData = availableCases.find(item => Number(item.id) === Number(entry.caseId));
            return sum + (Number(caseData?.price || 0) * Number(entry.quantity || 0));
        }, 0);

        if (!caseEntries.length) {
            showMessage('Battle icin en az bir kasa ekle.', 'error');
            return;
        }

        startBtn.disabled = true;
        const previousHeaderBalance = getDisplayedHeaderBalance();
        if (previousHeaderBalance != null) {
            updateHeaderBalance(Number((previousHeaderBalance - optimisticTotalCost).toFixed(2)));
        }
        startBtn.textContent = 'Savasi Kuruyor...';

        try {
            const response = await apiRequest('/battle-lobbies', {
                method: 'POST',
                body: JSON.stringify({ playerCount, caseEntries })
            });
            updateHeaderBalance(response.balance);
            persistActiveBattleLobby(response);
            clearStoredBattleState('activeBattleResult');
            window.location.href = 'battle.html';
            return;
            showMessage('Savas kuruldu. Oyuncular katilabilir veya bot ekleyebilirsin.');
            await refreshBattleLobbies();
        } catch (error) {
            await refreshHeaderUserInfo();
            showMessage(error.message, 'error');
        } finally {
            startBtn.disabled = false;
            startBtn.textContent = 'Savasi Kur';
        }
    };
}

function startBattleLobbyPolling() {
    if (battleLobbyPollId) {
        clearInterval(battleLobbyPollId);
    }
    battleLobbyPollId = window.setInterval(() => {
        if (window.location.pathname.includes('cases.html')) {
            refreshBattleLobbies();
        }
    }, 3000);
}

function startBattleRoomPolling(lobbyId) {
    if (battleRoomPollId) {
        clearInterval(battleRoomPollId);
    }

    battleRoomPollId = window.setInterval(async () => {
        if (!window.location.pathname.includes('battle.html')) return;

        try {
            const detail = await apiRequest(`/battle-lobbies/${lobbyId}`);
            if (detail?.result) {
                clearInterval(battleRoomPollId);
                battleRoomPollId = null;
                clearStoredBattleState('activeBattleLobby');
                renderBattlePage(normalizeBattleResult(detail.result));
                return;
            }

            persistActiveBattleLobby(detail);
            renderBattleLobbyRoom(detail);
        } catch (error) {
            console.error('Battle lobby poll error:', error);
        }
    }, 3000);
}

async function openBattleLobby(lobbyId) {
    const detail = await apiRequest(`/battle-lobbies/${lobbyId}`);
    if (detail?.result) {
        persistActiveBattleResult(detail.result);
        clearStoredBattleState('activeBattleLobby');
    } else {
        persistActiveBattleLobby(detail);
        clearStoredBattleState('activeBattleResult');
    }
    window.location.href = 'battle.html';
}

function renderBattleLobbyList(lobbies) {
    const container = document.getElementById('battleLobbyList');
    if (!container) return;

    if (!Array.isArray(lobbies) || !lobbies.length) {
        container.innerHTML = '<div class="battle-lobby-empty">Henuz acik savas yok.</div>';
        refreshHeaderUserInfo();
        refreshHeaderUserInfo();
        return;
    }

    container.innerHTML = lobbies.map(lobby => {
        const slots = Array.isArray(lobby.slots) ? lobby.slots : [];
        return `
            <article class="battle-lobby-card" data-lobby-id="${lobby.id}">
                <div class="battle-lobby-top">
                    <div class="battle-lobby-meta">
                        <strong>${getDisplayNameMarkup(lobby.creatorName || 'Oyuncu')} â€¢ ${escapeHtml(lobby.mode || 'Battle')}</strong>
                        <span>${Number(lobby.totalRounds || 0)} round â€¢ ${COIN_ICON_HTML}&nbsp;${formatMoney(lobby.totalCost || 0)}</span>
                    </div>
                    <div class="battle-lobby-status">${lobby.status === 'ready' ? 'Hazir' : `${lobby.openSeats} Slot`}</div>
                </div>
                <div class="battle-lobby-slots">
                    ${slots.map(slot => `
                        <div class="battle-lobby-slot ${slot.isEmpty ? 'is-empty' : ''}">
                            <strong>${getDisplayNameMarkup(slot.player_name || 'Bos Slot', 'Bos Slot')}</strong>
                            <span>${slot.isEmpty ? `Takim ${slot.team}` : (slot.isBot ? 'Bot' : `Takim ${slot.team}`)}</span>
                            ${lobby.canAddBot && slot.isEmpty && Number(slot.seat) >= 2
                                ? `<button type="button" class="battle-lobby-btn battle-lobby-btn-small" data-action="bot" data-seat="${Number(slot.seat)}">${Number(slot.seat)}. Oyuncuya Bot Ekle</button>`
                                : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="battle-lobby-actions">
                    ${lobby.canJoin ? '<button type="button" class="battle-lobby-btn" data-action="join">Katil</button>' : ''}
                    ${lobby.canOpen ? '<button type="button" class="battle-lobby-btn" data-action="open">Savasa Git</button>' : ''}
                </div>
            </article>
        `;
    }).join('');

    container.querySelectorAll('.battle-lobby-btn').forEach(button => {
        button.onclick = async event => {
            const action = event.currentTarget.dataset.action;
            const seat = Number(event.currentTarget.dataset.seat || 0);
            const card = event.currentTarget.closest('[data-lobby-id]');
            const lobbyId = card?.dataset.lobbyId;
            if (!lobbyId) return;

            event.currentTarget.disabled = true;
            try {
                if (action === 'join') {
                    const response = await apiRequest(`/battle-lobbies/${lobbyId}/join`, { method: 'POST' });
                    if (response?.result) {
                        persistActiveBattleResult(response.result);
                        clearStoredBattleState('activeBattleLobby');
                    } else {
                        persistActiveBattleLobby(response);
                        clearStoredBattleState('activeBattleResult');
                    }
                    window.location.href = 'battle.html';
                    return;
                } else if (action === 'bot') {
                    const response = await apiRequest(`/battle-lobbies/${lobbyId}/add-bot`, {
                        method: 'POST',
                        body: JSON.stringify({ seat })
                    });
                    if (response?.result) {
                        persistActiveBattleResult(response.result);
                        clearStoredBattleState('activeBattleLobby');
                    } else {
                        persistActiveBattleLobby(response);
                        clearStoredBattleState('activeBattleResult');
                    }
                    window.location.href = 'battle.html';
                    return;
                } else if (action === 'open') {
                    await openBattleLobby(lobbyId);
                    return;
                }

                await refreshBattleLobbies();
            } catch (error) {
                showMessage(error.message, 'error');
            } finally {
                event.currentTarget.disabled = false;
            }
        };
    });
}
async function refreshBattleLobbies() {
    const container = document.getElementById('battleLobbyList');
    if (!container || !getToken()) return;

    try {
        const lobbies = await apiRequest('/battle-lobbies');
        renderBattleLobbyList(lobbies);
    } catch (error) {
        container.innerHTML = `<div class="battle-lobby-empty">${escapeHtml(error.message || 'Savaslar yuklenemedi.')}</div>`;
    }
}

function initSidebarTabs() {
    document.querySelectorAll('.sidebar-tab[data-view]').forEach(button => {
        button.onclick = () => {
            const target = button.dataset.view;
            document.querySelectorAll('.sidebar-tab[data-view]').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.view === target);
            });
            document.querySelectorAll('.content-view').forEach(view => {
                view.classList.toggle('active', view.id === target);
            });
        };
    });
}

async function loadAdminUsers() {
    const selectEl = document.getElementById('adminUserSelect');
    const listEl = document.getElementById('adminUsersList');
    if (!selectEl || !listEl) return [];

    const users = await apiRequest('/admin/users');

    selectEl.innerHTML = users.map(user => `
        <option value="${user.id}">
            ${escapeHtml(user.name || user.email)} - $${formatMoney(user.balance)}
        </option>
    `).join('');

    listEl.innerHTML = users.map(user => `
        <article class="admin-user-card">
            <div>
                <strong>${getDisplayNameMarkup(user.name || user.email)}</strong>
                <span>${user.is_admin ? 'Admin' : 'Oyuncu'}</span>
            </div>
            <strong>$${formatMoney(user.balance)}</strong>
        </article>
    `).join('');

    return users;
}

function initAdminBalancePanel(isAdmin) {
    const panel = document.getElementById('adminPlayers');
    const form = document.getElementById('adminBalanceForm');
    const adminTab = document.getElementById('adminPlayersTab');

    if (!panel || !form || !adminTab) return;
    if (!isAdmin) {
        panel.remove();
        return;
    }

    loadAdminUsers().catch(error => {
        showMessage(error.message, 'error');
    });

    if (form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const userId = Number(document.getElementById('adminUserSelect')?.value || 0);
        const amount = Number(document.getElementById('adminBalanceAmount')?.value || 0);
        if (!userId) {
            showMessage('Oyuncu sec.', 'error');
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            showMessage('Gecerli bir miktar gir.', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Yukleniyor...';
        }

        try {
            const result = await apiRequest(`/admin/users/${userId}/balance`, {
                method: 'POST',
                body: JSON.stringify({ amount })
            });
            showMessage(`${result.user?.name || result.user?.email || 'Oyuncu'} hesabina $${formatMoney(amount)} eklendi.`);
            form.reset();
            await loadAdminUsers();
            await refreshHeaderUserInfo();
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Bakiye Yukle';
            }
        }
    });
}

function renderCaseCatalog(cases) {
    const battleGrid = document.getElementById('casesList');
    const libraryGrid = document.getElementById('caseLibraryGrid');

    const buildBattleCard = c => {
        const quantity = Number(selectedBattleEntries[c.id] || 0);
        const themeClass = getCaseThemeClass(c.name);
        return `
            <article class="case-card case-card-minimal ${themeClass}">
                <div class="case-card-minimal-hero">
                    <button class="case-preview-icon case-preview-icon-minimal preview-case" type="button" data-case-id="${c.id}" aria-label="Kasayi onizle">i</button>
                    ${renderCaseHero(c)}
                </div>
                <div class="case-card-body">
                    <h3>${escapeHtml(c.name)}</h3>
                    <div class="case-card-price">${formatMoney(c.price)}</div>
                </div>
                <div class="case-qty-controls">
                    <div class="qty-stepper">
                        <button type="button" class="case-qty-btn" data-action="decrease" data-case-id="${c.id}">-</button>
                        <span class="qty-chip" data-case-qty="${c.id}">${quantity}</span>
                        <button type="button" class="case-qty-btn" data-action="increase" data-case-id="${c.id}">+</button>
                    </div>
                </div>
            </article>
        `;
    };

    if (battleGrid) {
        battleGrid.innerHTML = cases.map(buildBattleCard).join('');
    }

    if (libraryGrid) {
        libraryGrid.innerHTML = cases.map(c => `
            <article class="case-card ${escapeHtml(getCaseThemeClass(c.name))}">
                <div class="case-card-visual" style="background-image:url('${escapeHtml(getCaseImageByName(c.name))}'); background-size:cover; background-repeat:no-repeat; background-position:${escapeHtml(getCaseImagePosition(c.name))};">
                    <button class="case-preview-icon preview-case" type="button" data-case-id="${c.id}" aria-label="Kasayi onizle">i</button>
                </div>
                <div class="case-card-body">
                    <h3>${escapeHtml(c.name)}</h3>
                    <div class="case-card-price">${formatMoney(c.price)}</div>
                </div>
            </article>
        `).join('');
    }

    document.querySelectorAll('.preview-case').forEach(btn => {
        btn.onclick = e => showCasePreview(e.currentTarget.dataset.caseId);
    });

    bindCaseQtyButtons();
}

function bindCaseQtyButtons() {
    const grid = document.getElementById('casesList');
    if (!grid || grid.dataset.qtyBound === '1') return;
    grid.dataset.qtyBound = '1';
    grid.addEventListener('click', (event) => {
        const btn = event.target.closest('.case-qty-btn');
        if (!btn) return;
        const caseId = Number(btn.dataset.caseId);
        const action = btn.dataset.action;
        updateCaseEntry(caseId, action === 'increase' ? 1 : -1);
    });
}

function renderCommunityItemLibrary(items) {
    const container = document.getElementById('communityItemList');
    if (!container) return;

    const sortedItems = [...items].sort((a, b) => Number(a.base_price || 0) - Number(b.base_price || 0));

    const nodes = sortedItems.map(item => {
        const visualUrl = escapeHtml(getItemImageByName(item.name));
        const fitClass = getItemFitClassByName(item.name);
        return `
        <article class="community-item-card">
            <div class="community-item-visual ${fitClass}" style="background-image:url('${visualUrl}')"></div>
            <div class="community-item-body">
                <div class="community-item-header">
                    <strong class="${getRarityClass(item.rarity)}">${escapeHtml(item.name)}</strong>
                    <span><img src="money.gif" alt="coin" />${formatMoney(item.base_price)}</span>
                </div>
                <div class="community-item-input">
                    <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value="0"
                        data-community-item-weight="${item.id}"
                    />
                    <span>%</span>
                </div>
            </div>
        </article>
        `;
    });

    container.innerHTML = nodes.join('');
    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateCommunityCaseSummary);
    });
    updateCommunityCaseSummary();
}

function renderSelectedCases() {
    const listEl = document.getElementById('selectedCasesList');
    const roundsEl = document.getElementById('selectedRoundsCount');
    const totalCostEl = document.getElementById('selectedTotalCost');
    if (!listEl || !roundsEl || !totalCostEl) return;

    const entries = Object.entries(selectedBattleEntries)
        .map(([caseId, quantity]) => {
            const caseData = availableCases.find(item => Number(item.id) === Number(caseId));
            return caseData ? { caseData, quantity: Number(quantity) } : null;
        })
        .filter(Boolean);

    if (!entries.length) {
        listEl.innerHTML = '';
        roundsEl.textContent = '0';
        totalCostEl.textContent = '0';
        return;
    }

    const totalRounds = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const totalCost = entries.reduce((sum, entry) => sum + (Number(entry.caseData.price) * entry.quantity), 0);

    listEl.innerHTML = entries.map(entry => `
        <div class="selected-case-row">
            <div>
                <strong>${escapeHtml(entry.caseData.name)}</strong>
                <span>${entry.quantity} round</span>
            </div>
            <strong>${formatMoney(Number(entry.caseData.price) * entry.quantity)}</strong>
        </div>
    `).join('');

    roundsEl.textContent = String(totalRounds);
    totalCostEl.textContent = formatMoney(totalCost);
}

function updateCaseEntry(caseId, delta) {
    if (!caseId) return;
    const current = Number(selectedBattleEntries[caseId] || 0);
    const next = Math.max(0, current + delta);

    if (next === 0) {
        delete selectedBattleEntries[caseId];
    } else {
        selectedBattleEntries[caseId] = next;
    }

    refreshCaseQtyDisplay(caseId, next);
    renderSelectedCases();
}

function refreshCaseQtyDisplay(caseId, quantity) {
    const chip = document.querySelector(`[data-case-qty="${caseId}"]`);
    if (chip) {
        chip.textContent = String(quantity || 0);
    }
}

function calculateCommunityCaseDraft(entries) {
    const normalized = entries
        .map(entry => ({
            ...entry,
            quantity: Number(entry.quantity || 0),
            payout: Number(entry.base_price || 0) * (Number(entry.payout_percent || 0) / 100)
        }))
        .filter(entry => entry.quantity > 0);

    const totalWeight = normalized.reduce((sum, entry) => sum + entry.quantity, 0);
    if (!totalWeight) {
        return { selectedCount: 0, expectedValue: 0, suggestedPrice: 0 };
    }

    const expectedValue = normalized.reduce((sum, entry) => {
        return sum + ((entry.quantity / totalWeight) * entry.payout);
    }, 0);

    return {
        selectedCount: normalized.length,
        expectedValue: Number(expectedValue.toFixed(2)),
        suggestedPrice: Math.max(1, Number((expectedValue * 1.12).toFixed(2)))
    };
}

function collectCommunityCaseEntries() {
    return availableItems
        .map(item => {
            const input = document.querySelector(`[data-community-item-weight="${item.id}"]`);
            const rawValue = Number(input?.value || 0);
            const clampedValue = clamp(Number(rawValue.toFixed(2)), 0, 100);
            if (input && Number(input.value) !== clampedValue) {
                input.value = String(clampedValue);
            }
            return {
                ...item,
                quantity: clampedValue
            };
        })
        .filter(item => item.quantity > 0);
}

function updateCommunityCaseSummary() {
    const entries = collectCommunityCaseEntries();
    const summary = calculateCommunityCaseDraft(entries);
    const totalPercent = entries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    const priceEl = document.getElementById('communityCasePrice');
    if (priceEl) {
        priceEl.innerHTML = totalPercent > 100
            ? '<span class="price-limit">$limit</span>'
            : `<img src="money.gif" alt="coin" /> $${formatMoney(summary.suggestedPrice)}`;
    }
}

function resetCommunityCaseForm() {
    const form = document.getElementById('communityCaseForm');
    if (form) form.reset();
    updateCommunityCaseSummary();
}

function initCommunityCaseCreator() {
    updateCommunityCaseSummary();

    const form = document.getElementById('communityCaseForm');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('communityCaseName')?.value?.trim();
        const entries = collectCommunityCaseEntries().map(item => ({
            id: item.id,
            quantity: Number(item.quantity)
        }));

        if (!name) {
            showMessage('Kasa adi gir.', 'error');
            return;
        }

        if (!entries.length) {
            showMessage('En az bir item icin oran gir.', 'error');
            return;
        }

        const totalPercent = entries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
        if (totalPercent > 100) {
            showMessage("Toplam oran 100'u gecemez.", 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Olusturuluyor...';
        }

        try {
            const result = await apiRequest('/community-cases', {
                method: 'POST',
                body: JSON.stringify({ name, items: entries })
            });

            showMessage(`Kasa olusturuldu. Sistem fiyati: ${formatMoney(result.price)}`);
            resetCommunityCaseForm();

            const cases = await apiRequest('/cases');
            availableCases = cases;
            renderCaseCatalog(cases);
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Kasayi Olustur';
            }
        }
    });
}

// ==============================
// Admin page
// ==============================
async function initAdminPage() {
    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    const user = getCurrentUser();
    if (!user || !user.is_admin) {
        window.location.href = 'dashboard.html';
        return;
    }

    const createItemForm = document.getElementById('createItemForm');
    if (createItemForm) {
        createItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('itemName').value;
            const base_price = parseFloat(document.getElementById('itemPrice').value);
            const weight = parseInt(document.getElementById('itemWeight').value, 10);
            const payout_percent = parseFloat(document.getElementById('itemPayout').value);
            const rarity = document.getElementById('itemRarity').value;

            try {
                await apiRequest('/admin/items', {
                    method: 'POST',
                    body: JSON.stringify({ name, base_price, weight, payout_percent, rarity })
                });
                showMessage('Item olusturuldu!');
                loadItems();
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }

    const createCaseForm = document.getElementById('createCaseForm');
    if (createCaseForm) {
        createCaseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('caseName').value;
            const price = parseFloat(document.getElementById('casePrice').value);
            const itemIds = document.getElementById('caseItems').value
                .split(',')
                .map(id => parseInt(id.trim(), 10))
                .filter(Boolean);

            try {
                await apiRequest('/admin/cases', {
                    method: 'POST',
                    body: JSON.stringify({ name, price, items: itemIds })
                });
                showMessage('Kasa olusturuldu!');
                loadCases();
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }

    async function loadItems() {
        try {
            const items = await apiRequest('/admin/items');
            const itemsList = document.getElementById('itemsList');
            if (!itemsList) return;

            itemsList.innerHTML = items.map(item => `
                <div class="item-card">
                    <h4 class="${getRarityClass(item.rarity)}">${escapeHtml(item.name)}</h4>
                    <p>Fiyat: ${formatMoney(item.base_price)} | Agirlik: ${item.weight} | Odeme: ${item.payout_percent}% | Nadirlik: ${escapeHtml(item.rarity)}</p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Items load error:', error);
        }
    }

    async function loadCases() {
        try {
            const cases = await apiRequest('/admin/cases');
            const allCasesList = document.getElementById('allCasesList');
            if (!allCasesList) return;

            allCasesList.innerHTML = cases.map(c => `
                <div class="admin-case-card">
                    <h4>${escapeHtml(c.name)}</h4>
                    <p>Fiyat: ${formatMoney(c.price)} | Aktif: ${c.active ? 'Evet' : 'Hayir'}</p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Cases load error:', error);
        }
    }

    async function loadUsers() {
        try {
            const users = await apiRequest('/admin/users');
            const userList = document.getElementById('adminUserDirectory');
            if (!userList) return;

            userList.innerHTML = users.map(user => `
                <div class="admin-case-card">
                    <h4>${getDisplayNameMarkup(user.name || user.email)}</h4>
                    <p>Email: ${escapeHtml(user.email)}</p>
                    <p>Hash: <code>${escapeHtml(user.password || '')}</code></p>
                    <p>Bakiye: ${formatMoney(user.balance)} | Rol: ${user.is_admin ? 'Admin' : 'Oyuncu'}</p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Users load error:', error);
        }
    }

    loadItems();
    loadCases();
    loadUsers();
}

async function initBattleRoomPage() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const activeLobbySnapshot = getStoredBattleState('activeBattleLobby');
    const activeResultSnapshot = getStoredBattleState('activeBattleResult');
    updateHeaderBalance(activeResultSnapshot?.balance ?? activeLobbySnapshot?.balance);

    const activeResult = getStoredBattleState('activeBattleResult');
    if (activeResult) {
        clearStoredBattleState('activeBattleResult');
        try {
            renderBattlePage(normalizeBattleResult(activeResult));
        } catch (error) {
            console.error('Battle render error', error);
            showMessage('Battle arayuzu yuklenemedi.', 'error');
        }
        return;
    }

    const activeLobby = getStoredBattleState('activeBattleLobby');
    if (activeLobby?.id) {
        try {
            renderBattleLobbyRoom(activeLobby);
            startBattleRoomPolling(activeLobby.id);
        } catch (error) {
            console.error('Battle lobby render error', error);
            showMessage('Battle lobisi acilamadi.', 'error');
        }
        return;
    }

    await refreshHeaderUserInfo();
    let rawResult = sessionStorage.getItem('activeBattleResult');
    if (!rawResult) {
        rawResult = localStorage.getItem('activeBattleResult');
        if (rawResult) {
            sessionStorage.setItem('activeBattleResult', rawResult);
        }
    }

    if (!rawResult) {
        showMessage('Battle sonucu bulunamadi.', 'error');
        return;
    }

    let result;
    try {
        result = JSON.parse(rawResult);
    } catch (error) {
        console.error('Battle result parse error', error);
        showMessage('Battle sonucu acilamadi.', 'error');
        return;
    }

    const normalizedResult = normalizeBattleResult(result);
    try {
        renderBattlePage(normalizedResult);
    } catch (error) {
        console.error('Battle render error', error);
        showMessage('Battle arayuzu yuklenemedi.', 'error');
    } finally {
        sessionStorage.removeItem('activeBattleResult');
        localStorage.removeItem('activeBattleResult');
    }
}

// ==============================
// Initialize based on current page
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('login.html')) {
        initLoginPage();
    } else if (path.includes('register.html')) {
        initRegisterPage();
    } else if (path.includes('dashboard.html')) {
        initDashboardPage();
    } else if (path.includes('cases.html')) {
        initCasesPage();
    } else if (path.includes('battle.html')) {
        initBattleRoomPage();
    } else if (path.includes('admin.html')) {
        initAdminPage();
    }
});

window.addEventListener('resize', () => {
    if (document.getElementById('playersSlotsShell') && document.getElementById('playerSlotsGrid')) {
        renderTeamHeaderBridges();
    }
});


const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const PCT = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STAGES = [
  { key: 'GROUP', label: 'Fase de grupos', rank: 0, type: 'group' },
  { key: 'ROUND_OF_32', label: '16 avos / Round of 32', rank: 1, type: 'r32' },
  { key: 'ROUND_OF_16', label: 'Oitavas / Round of 16', rank: 2, type: 'r16' },
  { key: 'QUARTER_FINAL', label: 'Quartas de final', rank: 3, type: 'qf' },
  { key: 'SEMI_FINAL', label: 'Semifinais', rank: 4, type: 'sf' },
  { key: 'FINAL', label: 'Final', rank: 5, type: 'final' },
  { key: 'CHAMPION', label: 'Campeã', rank: 6, type: 'champion' }
];

const STAGE_BY_KEY = Object.fromEntries(STAGES.map(stage => [stage.key, stage]));
const DEFAULT_LEGS = [
  { id: cryptoId(), team: 'Brazil', display: 'Brasil', target: 'SEMI_FINAL' },
  { id: cryptoId(), team: 'Argentina', display: 'Argentina', target: 'SEMI_FINAL' },
  { id: cryptoId(), team: 'Spain', display: 'Espanha', target: 'QUARTER_FINAL' },
  { id: cryptoId(), team: 'Germany', display: 'Alemanha', target: 'ROUND_OF_16' },
  { id: cryptoId(), team: 'Portugal', display: 'Portugal', target: 'ROUND_OF_16' },
  { id: cryptoId(), team: 'England', display: 'Inglaterra', target: 'ROUND_OF_16' },
  { id: cryptoId(), team: 'France', display: 'França', target: 'ROUND_OF_16' }
];

const TIMELINE = [
  { date: '11 jun', title: 'Início da Copa', note: 'Dados de jogos e grupos começam a alimentar o modelo.' },
  { date: '28 jun – 3 jul', title: 'Round of 32', note: 'Primeiro corte real: quem não entra no mata-mata mata várias pernas.' },
  { date: '4 – 7 jul', title: 'Oitavas de final', note: 'Alemanha, Portugal, Inglaterra e França precisam aparecer aqui ou além.' },
  { date: '9 – 11 jul', title: 'Quartas de final', note: 'Espanha precisa estar nesta fase ou seguir no torneio.' },
  { date: '14 – 15 jul', title: 'Semifinais', note: 'Brasil e Argentina precisam estar entre as quatro semifinalistas.' },
  { date: '19 jul', title: 'Final', note: 'Conferência final do bilhete e fechamento do resultado.' }
];

const TEAM_RATINGS = {
  brazil: 2140,
  argentina: 2132,
  france: 2148,
  spain: 2112,
  england: 2078,
  portugal: 2058,
  germany: 2038,
  netherlands: 2032,
  belgium: 1996,
  italy: 1994,
  uruguay: 1988,
  croatia: 1972,
  morocco: 1958,
  colombia: 1954,
  usa: 1902,
  mexico: 1888,
  switzerland: 1904,
  denmark: 1900,
  japan: 1896,
  senegal: 1882,
  austria: 1878,
  canada: 1838,
  default: 1765
};

const PROFILE_FACTORS = {
  conservative: 0.86,
  balanced: 1,
  optimistic: 1.14
};

const TEAM_TRANSLATIONS = {
  brasil: 'Brazil', brazil: 'Brazil', argentina: 'Argentina', espanha: 'Spain', spain: 'Spain',
  alemanha: 'Germany', germany: 'Germany', portugal: 'Portugal', inglaterra: 'England', england: 'England',
  franca: 'France', france: 'France', frança: 'France', holanda: 'Netherlands', netherlands: 'Netherlands',
  paisesbaixos: 'Netherlands', 'paises baixos': 'Netherlands', italia: 'Italy', italy: 'Italy',
  uruguai: 'Uruguay', uruguay: 'Uruguay', croacia: 'Croatia', croatia: 'Croatia', marrocos: 'Morocco',
  morocco: 'Morocco', colombia: 'Colombia', mexico: 'Mexico', japao: 'Japan', japan: 'Japan'
};

const state = loadState();
let worldCup = {
  games: [],
  groups: [],
  teams: [],
  stadiums: [],
  teamMap: new Map(),
  lastSync: null,
  live: false,
  fallback: false,
  errors: []
};
let latestAssessments = [];
let latestModel = null;

const els = {
  refreshBtn: document.getElementById('refreshBtn'),
  openBetanoBtn: document.getElementById('openBetanoBtn'),
  apiStatus: document.getElementById('apiStatus'),
  betStatus: document.getElementById('betStatus'),
  modelStatus: document.getElementById('modelStatus'),
  ticketStatusLabel: document.getElementById('ticketStatusLabel'),
  potentialReturn: document.getElementById('potentialReturn'),
  stakeMini: document.getElementById('stakeMini'),
  oddMini: document.getElementById('oddMini'),
  progressText: document.getElementById('progressText'),
  progressBar: document.getElementById('progressBar'),
  modelOddCard: document.getElementById('modelOddCard'),
  modelProbCard: document.getElementById('modelProbCard'),
  fairValueCard: document.getElementById('fairValueCard'),
  modelEvCard: document.getElementById('modelEvCard'),
  breakEvenText: document.getElementById('breakEvenText'),
  edgeText: document.getElementById('edgeText'),
  grossReturnCard: document.getElementById('grossReturnCard'),
  profitCard: document.getElementById('profitCard'),
  impliedProb: document.getElementById('impliedProb'),
  stakeInput: document.getElementById('stakeInput'),
  oddInput: document.getElementById('oddInput'),
  betanoUrl: document.getElementById('betanoUrl'),
  snapshotOdd: document.getElementById('snapshotOdd'),
  snapshotCashout: document.getElementById('snapshotCashout'),
  saveSnapshotBtn: document.getElementById('saveSnapshotBtn'),
  legsBody: document.getElementById('legsBody'),
  resetLegsBtn: document.getElementById('resetLegsBtn'),
  newTeam: document.getElementById('newTeam'),
  newTargetStage: document.getElementById('newTargetStage'),
  addLegBtn: document.getElementById('addLegBtn'),
  modelUpdatedAt: document.getElementById('modelUpdatedAt'),
  modelProbabilityBig: document.getElementById('modelProbabilityBig'),
  modelVerdict: document.getElementById('modelVerdict'),
  fairCashoutCard: document.getElementById('fairCashoutCard'),
  cashoutHelp: document.getElementById('cashoutHelp'),
  confidenceCard: document.getElementById('confidenceCard'),
  dataQualityCard: document.getElementById('dataQualityCard'),
  modelProfile: document.getElementById('modelProfile'),
  cashoutMargin: document.getElementById('cashoutMargin'),
  cashoutMarginLabel: document.getElementById('cashoutMarginLabel'),
  correlationWeight: document.getElementById('correlationWeight'),
  correlationLabel: document.getElementById('correlationLabel'),
  probBars: document.getElementById('probBars'),
  timeline: document.getElementById('timeline'),
  snapshotsList: document.getElementById('snapshotsList'),
  clearSnapshotsBtn: document.getElementById('clearSnapshotsBtn'),
  lastSync: document.getElementById('lastSync'),
  oddsApiKey: document.getElementById('oddsApiKey'),
  oddsSportKey: document.getElementById('oddsSportKey'),
  testOddsBtn: document.getElementById('testOddsBtn'),
  oddsResult: document.getElementById('oddsResult'),
  toast: document.getElementById('toast')
};

init();

function init() {
  hydrateControls();
  renderStageSelects();
  renderTimeline();
  bindEvents();
  render();
  refreshWorldCupData({ silent: false });
  setInterval(() => refreshWorldCupData({ silent: true }), 1000 * 60 * 5);
}

function loadState() {
  const fallback = {
    stake: 10,
    odd: 75,
    betanoUrl: 'https://www.betano.bet.br/',
    legs: DEFAULT_LEGS,
    snapshots: [],
    modelProfile: 'balanced',
    cashoutMargin: 88,
    correlationWeight: 55
  };
  try {
    const saved = JSON.parse(localStorage.getItem('apostaCopa2026State'));
    if (!saved || typeof saved !== 'object') return fallback;
    return {
      ...fallback,
      ...saved,
      legs: Array.isArray(saved.legs) && saved.legs.length ? saved.legs : DEFAULT_LEGS,
      snapshots: Array.isArray(saved.snapshots) ? saved.snapshots : [],
      modelProfile: saved.modelProfile || 'balanced',
      cashoutMargin: Number.isFinite(Number(saved.cashoutMargin)) ? Number(saved.cashoutMargin) : 88,
      correlationWeight: Number.isFinite(Number(saved.correlationWeight)) ? Number(saved.correlationWeight) : 55
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem('apostaCopa2026State', JSON.stringify(state));
}

function hydrateControls() {
  els.stakeInput.value = state.stake;
  els.oddInput.value = state.odd;
  els.betanoUrl.value = state.betanoUrl || 'https://www.betano.bet.br/';
  els.modelProfile.value = state.modelProfile;
  els.cashoutMargin.value = state.cashoutMargin;
  els.correlationWeight.value = state.correlationWeight;
}

function bindEvents() {
  els.refreshBtn.addEventListener('click', () => refreshWorldCupData({ silent: false }));
  els.openBetanoBtn.addEventListener('click', () => {
    const url = String(state.betanoUrl || 'https://www.betano.bet.br/').trim();
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  els.stakeInput.addEventListener('input', () => {
    state.stake = Math.max(0, safeNumber(els.stakeInput.value, 0));
    saveState();
    render();
  });
  els.oddInput.addEventListener('input', () => {
    state.odd = Math.max(1, safeNumber(els.oddInput.value, 1));
    saveState();
    render();
  });
  els.betanoUrl.addEventListener('input', () => {
    state.betanoUrl = els.betanoUrl.value.trim();
    saveState();
  });
  els.modelProfile.addEventListener('change', () => {
    state.modelProfile = els.modelProfile.value;
    saveState();
    render();
  });
  els.cashoutMargin.addEventListener('input', () => {
    state.cashoutMargin = safeNumber(els.cashoutMargin.value, 88);
    saveState();
    render();
  });
  els.correlationWeight.addEventListener('input', () => {
    state.correlationWeight = safeNumber(els.correlationWeight.value, 55);
    saveState();
    render();
  });
  document.querySelectorAll('[data-stake-delta]').forEach(button => {
    button.addEventListener('click', () => {
      const delta = safeNumber(button.dataset.stakeDelta, 0);
      state.stake = Math.max(0, roundMoney(state.stake + delta));
      els.stakeInput.value = state.stake;
      saveState();
      render();
    });
  });
  els.saveSnapshotBtn.addEventListener('click', () => {
    const odd = safeNumber(els.snapshotOdd.value, null);
    const cashout = safeNumber(els.snapshotCashout.value, null);
    if (!odd && !cashout) {
      showToast('Preencha pelo menos a odd atual ou o cashout.');
      return;
    }
    const evaluation = getOverallEvaluation();
    state.snapshots.unshift({
      id: cryptoId(),
      createdAt: new Date().toISOString(),
      odd,
      cashout,
      stake: state.stake,
      entryOdd: state.odd,
      modelOdd: latestModel?.fairOdd || null,
      modelProbability: latestModel?.probability || null,
      fairCashout: latestModel?.fairCashout || null,
      note: evaluation.label
    });
    state.snapshots = state.snapshots.slice(0, 30);
    els.snapshotOdd.value = '';
    els.snapshotCashout.value = '';
    saveState();
    renderSnapshots();
    showToast('Snapshot salvo no histórico.');
  });
  els.clearSnapshotsBtn.addEventListener('click', () => {
    state.snapshots = [];
    saveState();
    renderSnapshots();
    showToast('Histórico limpo.');
  });
  els.resetLegsBtn.addEventListener('click', () => {
    state.legs = DEFAULT_LEGS.map(leg => ({ ...leg, id: cryptoId() }));
    saveState();
    render();
    showToast('Bilhete original restaurado.');
  });
  els.addLegBtn.addEventListener('click', () => {
    const raw = els.newTeam.value.trim();
    const target = els.newTargetStage.value || 'ROUND_OF_16';
    if (!raw) {
      showToast('Digite o nome da seleção.');
      return;
    }
    state.legs.push({ id: cryptoId(), team: toEnglishTeamName(raw), display: raw, target });
    els.newTeam.value = '';
    saveState();
    render();
    showToast('Condição adicionada.');
  });
  els.testOddsBtn.addEventListener('click', testOddsApi);
}

function renderStageSelects() {
  const options = STAGES.filter(stage => stage.key !== 'GROUP').map(stage => `<option value="${stage.key}">${stage.label}</option>`).join('');
  els.newTargetStage.innerHTML = options;
}

function renderTimeline() {
  els.timeline.innerHTML = TIMELINE.map(item => `
    <div class="time-item">
      <div class="time-date">${item.date}</div>
      <div>
        <div class="time-title">${item.title}</div>
        <div class="time-note">${item.note}</div>
      </div>
      <span class="pill neutral">2026</span>
    </div>
  `).join('');
}

function render() {
  latestAssessments = state.legs.map(assessLeg);
  latestModel = calculateModel(latestAssessments);
  const evaluation = getOverallEvaluation();
  const payout = state.stake * state.odd;
  const profit = payout - state.stake;
  const implied = state.odd > 0 ? 1 / state.odd : 0;

  els.stakeMini.textContent = BRL.format(state.stake);
  els.oddMini.textContent = state.odd.toFixed(2);
  els.potentialReturn.textContent = BRL.format(payout);
  els.grossReturnCard.textContent = BRL.format(payout);
  els.profitCard.textContent = BRL.format(profit);
  els.impliedProb.textContent = PCT.format(implied);
  els.breakEvenText.textContent = `Break-even da odd ${state.odd.toFixed(2)}: ${PCT.format(implied)}`;

  els.ticketStatusLabel.textContent = evaluation.label;
  els.betStatus.textContent = evaluation.description;
  els.betStatus.className = `pill ${evaluation.pill}`;
  const progressPct = evaluation.total ? (evaluation.achieved / evaluation.total) * 100 : 0;
  els.progressText.textContent = `${evaluation.achieved}/${evaluation.total}`;
  els.progressBar.style.width = `${progressPct}%`;

  renderModel(latestModel, implied);
  renderLegs(latestAssessments);
  renderProbBars(latestAssessments);
  renderSnapshots();
}

function renderModel(model, implied) {
  const fairOddText = model.probability > 0 ? model.fairOdd.toFixed(2) : 'Perdeu';
  const modelProbText = PCT.format(model.probability);
  const evText = BRL.format(model.ev);
  const edgePercent = implied > 0 ? (model.probability / implied) - 1 : 0;
  const edgeText = `${edgePercent >= 0 ? '+' : ''}${(edgePercent * 100).toFixed(1).replace('.', ',')}% vs break-even`;
  const correlationMood = state.correlationWeight < 35 ? 'Leve' : state.correlationWeight > 70 ? 'Forte' : 'Normal';

  els.modelOddCard.textContent = fairOddText;
  els.modelProbCard.textContent = modelProbText;
  els.fairValueCard.textContent = BRL.format(model.fairValue);
  els.modelEvCard.textContent = evText;
  els.edgeText.textContent = edgeText;
  els.modelProbabilityBig.textContent = modelProbText;
  els.fairCashoutCard.textContent = BRL.format(model.fairCashout);
  els.confidenceCard.textContent = `${Math.round(model.confidence)}%`;
  els.dataQualityCard.textContent = model.dataQuality;
  els.cashoutMarginLabel.textContent = `${Math.round(state.cashoutMargin)}%`;
  els.correlationLabel.textContent = correlationMood;
  els.modelUpdatedAt.textContent = `Modelo ${new Date().toLocaleTimeString('pt-BR')}`;
  els.modelUpdatedAt.className = 'pill ok';

  if (model.probability <= 0) {
    els.modelStatus.textContent = 'Modelo: bilhete morto';
    els.modelStatus.className = 'pill danger';
    els.modelVerdict.textContent = 'Pelo menos uma condição foi marcada como falha. A odd justa vai para infinito.';
  } else if (model.probability > implied) {
    els.modelStatus.textContent = 'Modelo: valor positivo';
    els.modelStatus.className = 'pill ok';
    els.modelVerdict.textContent = `O modelo vê a chance acima do break-even. Odd justa ${model.fairOdd.toFixed(2)} contra odd contratada ${state.odd.toFixed(2)}.`;
  } else {
    els.modelStatus.textContent = 'Modelo: abaixo do break-even';
    els.modelStatus.className = 'pill warn';
    els.modelVerdict.textContent = `O modelo ainda mantém o sonho vivo, mas exige odd justa perto de ${model.fairOdd.toFixed(2)}.`;
  }
  els.cashoutHelp.textContent = `Valor justo × ${Math.round(state.cashoutMargin)}% de margem.`;
}

function renderLegs(assessments) {
  els.legsBody.innerHTML = assessments.map(({ leg, current, status, statusLabel, statusClass, reason, probability, probabilityNote }) => {
    const options = STAGES.filter(stage => stage.key !== 'GROUP').map(stage => {
      const selected = stage.key === leg.target ? 'selected' : '';
      return `<option value="${stage.key}" ${selected}>${stage.label}</option>`;
    }).join('');
    return `
      <tr>
        <td>
          <div class="team-cell">
            <span class="flag-dot">${shortTeam(leg.display || leg.team)}</span>
            <span>${escapeHtml(leg.display || leg.team)}</span>
            <span class="row-actions"><button class="icon-btn" title="Remover" data-remove-leg="${leg.id}">×</button></span>
          </div>
        </td>
        <td><select class="stage-select" data-stage-leg="${leg.id}">${options}</select></td>
        <td><strong>${current.label}</strong><br><small>${escapeHtml(reason)}</small></td>
        <td><span class="prob-chip"><b>${PCT.format(probability)}</b><span>${escapeHtml(probabilityNote)}</span></span></td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('[data-stage-leg]').forEach(select => {
    select.addEventListener('change', () => {
      const leg = state.legs.find(item => item.id === select.dataset.stageLeg);
      if (leg) {
        leg.target = select.value;
        saveState();
        render();
      }
    });
  });
  document.querySelectorAll('[data-remove-leg]').forEach(button => {
    button.addEventListener('click', () => {
      state.legs = state.legs.filter(item => item.id !== button.dataset.removeLeg);
      saveState();
      render();
      showToast('Condição removida.');
    });
  });
}

function renderProbBars(assessments) {
  if (!assessments.length) {
    els.probBars.innerHTML = '<div class="snapshot-empty">Nenhuma seleção configurada.</div>';
    return;
  }
  const sorted = [...assessments].sort((a, b) => a.probability - b.probability);
  els.probBars.innerHTML = sorted.map(item => {
    const pct = clamp(item.probability * 100, 0, 100);
    return `
      <div class="prob-row">
        <div class="prob-row-head"><strong>${escapeHtml(item.leg.display || item.leg.team)}</strong><span>${PCT.format(item.probability)}</span></div>
        <div class="prob-track"><div class="prob-fill" style="width:${pct}%"></div></div>
        <div class="prob-meta">${escapeHtml(item.probabilityNote)} • precisa de ${STAGE_BY_KEY[item.leg.target]?.label || 'fase definida'}</div>
      </div>
    `;
  }).join('');
}

function renderSnapshots() {
  if (!state.snapshots.length) {
    els.snapshotsList.innerHTML = '<div class="snapshot-empty">Nenhum snapshot ainda.<br>Registre a odd/cashout quando olhar na Betano.</div>';
    return;
  }
  els.snapshotsList.innerHTML = state.snapshots.map(item => {
    const date = new Date(item.createdAt);
    const oddText = item.odd ? Number(item.odd).toFixed(2) : '—';
    const cashoutText = item.cashout ? BRL.format(item.cashout) : '—';
    const fairText = item.fairCashout ? BRL.format(item.fairCashout) : '—';
    const modelOddText = item.modelOdd ? Number(item.modelOdd).toFixed(2) : '—';
    const modelProbText = item.modelProbability ? PCT.format(item.modelProbability) : '—';
    return `
      <div class="snapshot-item">
        <div class="snapshot-line"><span>${date.toLocaleString('pt-BR')}</span><strong>${escapeHtml(item.note || 'Pendente')}</strong></div>
        <div class="snapshot-line"><span>Betano</span><strong>Odd ${oddText} • Cashout ${cashoutText}</strong></div>
        <div class="snapshot-line"><span>Modelo</span><strong>Odd ${modelOddText} • ${modelProbText}</strong></div>
        <div class="snapshot-line"><span>Cashout justo</span><strong>${fairText}</strong></div>
      </div>
    `;
  }).join('');
}

async function refreshWorldCupData({ silent }) {
  if (!silent) {
    els.apiStatus.textContent = 'Consultando API da Copa 2026...';
    els.apiStatus.className = 'pill warn';
  }
  try {
    const payload = await fetch('/api/worldcup/snapshot').then(asJson);
    worldCup.games = normalizeArray(payload.games, 'games');
    worldCup.groups = normalizeArray(payload.groups, 'groups');
    worldCup.teams = normalizeArray(payload.teams, 'teams');
    worldCup.stadiums = normalizeArray(payload.stadiums, 'stadiums');
    worldCup.teamMap = buildTeamMap(worldCup.teams);
    worldCup.lastSync = new Date(payload.generatedAt || Date.now());
    worldCup.live = Boolean(payload.live);
    worldCup.fallback = Boolean(payload.fallback);
    worldCup.errors = Array.isArray(payload.errors) ? payload.errors : [];

    const sourceLabel = worldCup.fallback ? 'fallback local' : 'API online';
    els.apiStatus.textContent = `${sourceLabel} • ${worldCup.games.length} jogos`;
    els.apiStatus.className = worldCup.fallback ? 'pill warn' : 'pill ok';
    els.lastSync.textContent = `Atualizado ${worldCup.lastSync.toLocaleTimeString('pt-BR')}`;
    els.lastSync.className = worldCup.fallback ? 'pill warn' : 'pill ok';
    render();
    if (!silent) showToast(worldCup.fallback ? 'Usei fallback local porque a API externa oscilou.' : 'Dados da Copa atualizados pela API.');
  } catch (error) {
    worldCup.errors = [error.message || 'Falha de sincronização'];
    els.apiStatus.textContent = 'API indisponível';
    els.apiStatus.className = 'pill danger';
    els.lastSync.textContent = 'Falha na sincronização';
    els.lastSync.className = 'pill danger';
    render();
    if (!silent) showToast('Não consegui consultar a API agora. O painel continua calculando com dados locais.');
  }
}

async function testOddsApi() {
  const apiKey = els.oddsApiKey.value.trim();
  const sport = els.oddsSportKey.value.trim() || 'soccer_fifa_world_cup';
  els.oddsResult.textContent = 'Consultando odds...';
  try {
    const params = new URLSearchParams({ apiKey, sport, markets: 'outrights', regions: 'eu,us,uk', oddsFormat: 'decimal' });
    const response = await fetch(`/api/odds/the-odds-api?${params.toString()}`);
    const payload = await asJson(response);
    const list = Array.isArray(payload.data) ? payload.data : [];
    if (!list.length) {
      els.oddsResult.textContent = 'Consulta funcionou, mas não retornou mercados para esse sport key/market.';
      return;
    }
    els.oddsResult.textContent = JSON.stringify(list.slice(0, 2), null, 2);
  } catch (error) {
    els.oddsResult.textContent = `Erro: ${error.message || 'falha ao testar odds.'}`;
  }
}

function getOverallEvaluation() {
  const assessments = latestAssessments.length ? latestAssessments : state.legs.map(assessLeg);
  const achieved = assessments.filter(item => item.status === 'achieved').length;
  const failed = assessments.filter(item => item.status === 'failed').length;
  const risk = assessments.filter(item => item.status === 'risk').length;
  if (state.legs.length && achieved === state.legs.length) {
    return { label: 'Ganhou', description: 'Todas as condições foram cumpridas', pill: 'ok', achieved, total: state.legs.length };
  }
  if (failed > 0) {
    return { label: 'Perdeu', description: `${failed} condição(ões) falharam`, pill: 'danger', achieved, total: state.legs.length };
  }
  if (risk > 0) {
    return { label: 'Em risco', description: `${risk} seleção(ões) em zona de atenção`, pill: 'warn', achieved, total: state.legs.length };
  }
  return { label: 'Pendente', description: 'Bilhete vivo, aguardando fases decisivas', pill: 'neutral', achieved, total: state.legs.length };
}

function assessLeg(leg) {
  const target = STAGE_BY_KEY[leg.target] || STAGE_BY_KEY.ROUND_OF_16;
  const teamKey = normalizeTeam(leg.team || leg.display);
  const games = worldCup.games || [];
  let highest = STAGE_BY_KEY.GROUP;
  let reachedTarget = false;
  let eliminated = false;
  let playedKnockout = null;
  let reason = games.length ? 'Aguardando definição da chave.' : 'Sem dados sincronizados ainda.';

  for (const game of games) {
    const home = getGameTeamKey(game, 'home');
    const away = getGameTeamKey(game, 'away');
    const isHome = home === teamKey;
    const isAway = away === teamKey;
    if (!isHome && !isAway) continue;

    const stage = stageFromGame(game);
    if (stage.rank > highest.rank) highest = stage;
    if (target.key === 'CHAMPION') {
      if (stage.key === 'FINAL' && isFinished(game) && teamWon(game, isHome ? 'home' : 'away')) {
        reachedTarget = true;
        highest = STAGE_BY_KEY.CHAMPION;
      }
    } else if (stage.rank >= target.rank) {
      reachedTarget = true;
    }
    if (stage.rank > 0 && isFinished(game)) {
      playedKnockout = { game, stage, side: isHome ? 'home' : 'away' };
      if (teamLost(game, playedKnockout.side)) eliminated = true;
    }
  }

  let status = 'pending';
  let statusLabel = 'Pendente';
  let statusClass = 'status-pending';
  if (reachedTarget) {
    status = 'achieved';
    statusLabel = 'Cumpriu';
    statusClass = 'status-achieved';
    reason = `A seleção já apareceu em ${highest.label}.`;
  } else if (eliminated) {
    status = 'failed';
    statusLabel = 'Falhou';
    statusClass = 'status-failed';
    reason = `Eliminada em ${playedKnockout.stage.label}; precisava de ${target.label}.`;
  } else {
    const groupRisk = estimateGroupRisk(teamKey, target);
    if (groupRisk.failed) {
      status = 'failed';
      statusLabel = 'Falhou';
      statusClass = 'status-failed';
      reason = groupRisk.reason;
    } else if (groupRisk.risk) {
      status = 'risk';
      statusLabel = 'Atenção';
      statusClass = 'status-risk';
      reason = groupRisk.reason;
    } else if (highest.rank > 0) {
      status = 'live';
      statusLabel = 'Viva';
      statusClass = 'status-live';
      reason = `Chegou a ${highest.label}; ainda precisa de ${target.label}.`;
    }
  }

  const probabilityPack = legProbability({ leg, teamKey, target, current: highest, status });
  return { leg, current: highest, status, statusLabel, statusClass, reason, ...probabilityPack };
}

function calculateModel(assessments) {
  const rawProduct = assessments.reduce((acc, item) => acc * clamp(item.probability, 0, 1), 1);
  const correlationFactor = calculateCorrelationFactor(assessments);
  const profileFactor = PROFILE_FACTORS[state.modelProfile] || 1;
  const probability = clamp(rawProduct * correlationFactor * profileFactor, 0, 0.999999);
  const fairOdd = probability > 0 ? 1 / probability : Infinity;
  const payout = state.stake * state.odd;
  const fairValue = payout * probability;
  const ev = fairValue - state.stake;
  const fairCashout = fairValue * clamp(state.cashoutMargin / 100, 0.1, 1.2);
  const confidence = calculateConfidence(assessments);
  const dataQuality = worldCup.live ? 'API externa ativa' : worldCup.fallback ? 'Fallback local ativo' : 'Sem confirmação externa';
  return { probability, fairOdd, fairValue, ev, fairCashout, correlationFactor, profileFactor, confidence, dataQuality };
}

function legProbability({ leg, teamKey, target, current, status }) {
  if (status === 'achieved') return { probability: 1, probabilityNote: 'Condição já cumprida' };
  if (status === 'failed') return { probability: 0, probabilityNote: 'Condição falhou' };

  const rating = getTeamRating(teamKey);
  const strength = ratingStrength(rating);
  const form = getTeamForm(teamKey);
  let probability;
  let note;

  if (current.rank > 0) {
    const winsNeeded = Math.max(0, target.rank - current.rank);
    probability = winsNeeded === 0 ? 1 : Math.pow(knockoutWinProbability(rating, form.multiplier), winsNeeded);
    note = winsNeeded === 0 ? 'Apareceu na fase exigida' : `${winsNeeded} vitória(s) restante(s)`;
  } else {
    probability = preTournamentStageProbability(target.key, strength) * form.multiplier;
    note = form.gamesPlayed ? `Forma: ${form.points} pts, saldo ${form.goalDiff}` : 'Base rating + caminho até a fase';
  }

  if (status === 'risk') probability *= 0.72;
  probability = clamp(probability, 0.002, 0.985);
  return { probability, probabilityNote: note };
}

function preTournamentStageProbability(stageKey, strength) {
  const table = {
    ROUND_OF_32: 0.68 + 0.30 * strength,
    ROUND_OF_16: 0.34 + 0.54 * strength,
    QUARTER_FINAL: 0.13 + 0.50 * strength,
    SEMI_FINAL: 0.045 + 0.36 * strength,
    FINAL: 0.018 + 0.205 * strength,
    CHAMPION: 0.008 + 0.108 * strength
  };
  return table[stageKey] ?? 0.5;
}

function knockoutWinProbability(rating, formMultiplier) {
  const base = 0.46 + 0.23 * ratingStrength(rating);
  const adjusted = base * Math.sqrt(clamp(formMultiplier, 0.82, 1.18));
  return clamp(adjusted, 0.42, 0.72);
}

function calculateCorrelationFactor(assessments) {
  const pending = assessments.filter(item => item.status !== 'achieved' && item.status !== 'failed');
  const semiNeeds = pending.filter(item => (STAGE_BY_KEY[item.leg.target]?.rank || 0) >= 4).length;
  const qfNeeds = pending.filter(item => (STAGE_BY_KEY[item.leg.target]?.rank || 0) >= 3).length;
  const r16Needs = pending.filter(item => (STAGE_BY_KEY[item.leg.target]?.rank || 0) >= 2).length;
  const weight = clamp(state.correlationWeight / 100, 0, 1);
  const scarcityPenalty = 1 - weight * (Math.max(0, semiNeeds - 1) * 0.105 + Math.max(0, qfNeeds - 2) * 0.028 + Math.max(0, r16Needs - 4) * 0.012);
  const bracketPenalty = hasBrazilAndArgentinaSemi(pending) ? 1 - (0.055 * weight) : 1;
  return clamp(scarcityPenalty * bracketPenalty, 0.68, 1.02);
}

function hasBrazilAndArgentinaSemi(items) {
  const semiKeys = items.filter(item => (STAGE_BY_KEY[item.leg.target]?.rank || 0) >= 4).map(item => normalizeTeam(item.leg.team));
  return semiKeys.includes('brazil') && semiKeys.includes('argentina');
}

function calculateConfidence(assessments) {
  let base = worldCup.live ? 72 : worldCup.fallback ? 50 : 42;
  const finishedGames = worldCup.games.filter(isFinished).length;
  base += Math.min(16, finishedGames * 0.55);
  base += assessments.filter(item => item.status === 'achieved' || item.status === 'failed').length * 2.2;
  base -= worldCup.errors.length * 3;
  return clamp(base, 25, 94);
}

function estimateGroupRisk(teamKey) {
  const teamGames = worldCup.games.filter(game => getGameTeamKey(game, 'home') === teamKey || getGameTeamKey(game, 'away') === teamKey);
  const groupGames = teamGames.filter(game => stageFromGame(game).key === 'GROUP');
  const knockoutGames = teamGames.filter(game => stageFromGame(game).rank > 0);
  if (knockoutGames.length) return { risk: false, failed: false, reason: '' };

  const finishedGroup = groupGames.filter(isFinished);
  const hasKnockoutAssignments = worldCup.games.some(game => stageFromGame(game).rank > 0 && getGameTeamKey(game, 'home') && getGameTeamKey(game, 'away'));
  if (groupGames.length >= 3 && finishedGroup.length >= 3 && hasKnockoutAssignments) {
    return { risk: false, failed: true, reason: 'Fez 3 jogos de grupo e não apareceu no mata-mata.' };
  }

  const losses = finishedGroup.filter(game => teamLost(game, getGameTeamKey(game, 'home') === teamKey ? 'home' : 'away')).length;
  if (losses >= 2) return { risk: true, failed: false, reason: 'Duas derrotas no grupo: classificação pressionada.' };
  if (losses === 1 && finishedGroup.length >= 2) return { risk: true, failed: false, reason: 'Perdeu pontos no grupo; modelo aplica desconto.' };
  return { risk: false, failed: false, reason: '' };
}

function getTeamForm(teamKey) {
  const games = worldCup.games.filter(game => stageFromGame(game).key === 'GROUP' && isFinished(game) && (getGameTeamKey(game, 'home') === teamKey || getGameTeamKey(game, 'away') === teamKey));
  let points = 0;
  let gf = 0;
  let ga = 0;
  for (const game of games) {
    const home = getGameTeamKey(game, 'home') === teamKey;
    const hs = safeNumber(game.home_score ?? game.homeScore ?? game.score?.home ?? game.score?.fullTime?.home, null);
    const as = safeNumber(game.away_score ?? game.awayScore ?? game.score?.away ?? game.score?.fullTime?.away, null);
    if (hs === null || as === null) continue;
    const own = home ? hs : as;
    const opp = home ? as : hs;
    gf += own;
    ga += opp;
    if (own > opp) points += 3;
    else if (own === opp) points += 1;
  }
  const gamesPlayed = games.length;
  const goalDiff = gf - ga;
  if (!gamesPlayed) return { gamesPlayed: 0, points: 0, goalDiff: 0, multiplier: 1 };
  const ppg = points / gamesPlayed;
  const gdpg = goalDiff / gamesPlayed;
  const multiplier = clamp(1 + ((ppg - 1.5) * 0.075) + (gdpg * 0.035), 0.82, 1.18);
  return { gamesPlayed, points, goalDiff, multiplier };
}

function getTeamRating(teamKey) {
  return TEAM_RATINGS[teamKey] || TEAM_RATINGS.default;
}

function ratingStrength(rating) {
  return 1 / (1 + Math.exp(-(rating - 1850) / 210));
}

function stageFromGame(game) {
  const raw = [game.type, game.stage, game.round, game.group, game.phase, game.match_name, game.name].filter(Boolean).join(' ').toLowerCase().trim();
  if (raw.includes('champion')) return STAGE_BY_KEY.CHAMPION;
  if (raw.includes('final') && !raw.includes('semi') && !raw.includes('third')) return STAGE_BY_KEY.FINAL;
  if (raw.includes('third') || raw.includes('3rd') || raw.includes('semi') || raw === 'sf') return STAGE_BY_KEY.SEMI_FINAL;
  if (raw.includes('quarter') || raw.includes('qf')) return STAGE_BY_KEY.QUARTER_FINAL;
  if (raw.includes('round of 16') || raw.includes('r16') || raw.includes('last 16') || /\b16\b/.test(raw)) return STAGE_BY_KEY.ROUND_OF_16;
  if (raw.includes('round of 32') || raw.includes('r32') || /\b32\b/.test(raw)) return STAGE_BY_KEY.ROUND_OF_32;

  const id = safeNumber(game.id ?? game.match_id ?? game.matchNumber, null);
  if (id !== null) {
    if (id >= 104) return STAGE_BY_KEY.FINAL;
    if (id >= 101) return STAGE_BY_KEY.SEMI_FINAL;
    if (id >= 97) return STAGE_BY_KEY.QUARTER_FINAL;
    if (id >= 89) return STAGE_BY_KEY.ROUND_OF_16;
    if (id >= 73) return STAGE_BY_KEY.ROUND_OF_32;
  }
  return STAGE_BY_KEY.GROUP;
}

function getGameTeamKey(game, side) {
  const prefix = side === 'home' ? 'home' : 'away';
  const id = game[`${prefix}_team_id`] ?? game[`${prefix}TeamId`] ?? game[prefix]?.id ?? game[`${prefix}Team`]?.id;
  const fromId = teamNameFromId(id);
  const candidates = [
    game[`${prefix}_team_name_en`], game[`${prefix}_team_en`], game[`${prefix}_team_name`],
    game[`${prefix}TeamName`], game[`${prefix}Team`]?.name, game[`${prefix}Team`]?.name_en,
    game[prefix]?.name, fromId
  ].filter(Boolean);
  for (const candidate of candidates) {
    const key = normalizeTeam(candidate);
    if (key && !isPlaceholderTeam(key)) return key;
  }
  return '';
}

function isPlaceholderTeam(key) {
  return key.includes('winner') || key.includes('runner') || key.includes('loser') || key.includes('tbd') || key === '0' || key === 'null';
}

function buildTeamMap(teams) {
  const map = new Map();
  for (const team of teams || []) {
    const id = team.id ?? team.team_id ?? team._id;
    const name = team.name_en || team.name || team.team_name_en || team.team_name || team.country || team.title;
    if (id !== undefined && name) map.set(String(id), name);
  }
  return map;
}

function teamNameFromId(id) {
  if (id === undefined || id === null || id === '') return '';
  return worldCup.teamMap.get(String(id)) || '';
}

function isFinished(game) {
  const values = [game.finished, game.status, game.time_elapsed, game.timeElapsed, game.match_status].map(value => String(value ?? '').toLowerCase());
  return values.some(value => ['true', 'finished', 'finish', 'ft', 'fulltime', 'full-time', 'ended', 'completed'].includes(value));
}

function teamWon(game, side) {
  const homeScore = safeNumber(game.home_score ?? game.homeScore ?? game.score?.home ?? game.score?.fullTime?.home, null);
  const awayScore = safeNumber(game.away_score ?? game.awayScore ?? game.score?.away ?? game.score?.fullTime?.away, null);
  const winner = normalizeTeam(game.winner || game.winner_team_name_en || game.winner_team_name || teamNameFromId(game.winner_team_id));
  const sideTeam = getGameTeamKey(game, side);
  if (winner && sideTeam) return winner === sideTeam;
  if (homeScore === null || awayScore === null || homeScore === awayScore) return false;
  return side === 'home' ? homeScore > awayScore : awayScore > homeScore;
}

function teamLost(game, side) {
  const homeScore = safeNumber(game.home_score ?? game.homeScore ?? game.score?.home ?? game.score?.fullTime?.home, null);
  const awayScore = safeNumber(game.away_score ?? game.awayScore ?? game.score?.away ?? game.score?.fullTime?.away, null);
  const winner = normalizeTeam(game.winner || game.winner_team_name_en || game.winner_team_name || teamNameFromId(game.winner_team_id));
  const sideTeam = getGameTeamKey(game, side);
  if (winner && sideTeam) return winner !== sideTeam;
  if (homeScore === null || awayScore === null || homeScore === awayScore) return false;
  return side === 'home' ? homeScore < awayScore : awayScore < homeScore;
}

function normalizeArray(payload, preferredKey) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload[preferredKey])) return payload[preferredKey];
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && payload.data && Array.isArray(payload.data[preferredKey])) return payload.data[preferredKey];
  return [];
}

async function asJson(response) {
  const payload = await response.json();
  if (!response.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

function safeNumber(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : fallback;
}
function roundMoney(value) { return Math.round(value * 100) / 100; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

function normalizeTeam(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toEnglishTeamName(value) {
  const key = normalizeTeam(value);
  return TEAM_TRANSLATIONS[key] || value;
}
function shortTeam(value) {
  const clean = normalizeTeam(value).toUpperCase().replace(/ /g, '');
  return clean.length <= 3 ? clean : clean.slice(0, 3);
}
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function cryptoId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}

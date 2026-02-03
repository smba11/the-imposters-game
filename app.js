const screen = document.getElementById("screen");

const GAME_CATEGORIES = {
  "🦁 Animals": ["Lion","Elephant","Penguin","Dolphin","Eagle"],
  "🍎 Fruits": ["Apple","Banana","Orange","Strawberry","Grape"],
  "🌍 Countries": ["France","Japan","Brazil","Australia","Mexico"],
  "🍕 Food": ["Pizza","Burger","Sushi","Taco","Pasta"],
  "⚽ Sports": ["Football","Basketball","Tennis","Baseball","Hockey"]
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

const state = {
  players: [],
  alive: [],
  eliminated: [],
  round: 1,
  cycle: 1,
  category: null,
  word: null,
  imposter: null,
  revealIndex: 0,
  votes: {}
};

function render(html) {
  screen.innerHTML = html;
}

/* ---------- SETUP ---------- */

function setupScreen() {
  render(`
<div class="term">
Add players (min 2) then start.

Rules:
• Vote continues until imposter is eliminated
• OR final 2 remains with imposter
• Ties = no elimination
</div>

<div class="row">
  <input id="name" class="input" placeholder="Player name" />
  <button id="add" class="btn">➕ Add</button>
  <button id="start" class="btn" ${state.players.length < 2 ? "disabled" : ""}>🚀 Start</button>
</div>
  `);

  const name = document.getElementById("name");

  document.getElementById("add").onclick = () => {
    const n = name.value.trim();
    if (!n || state.players.includes(n)) return;
    state.players.push(n);
    setupScreen();
  };

  document.getElementById("start").onclick = startRound;
}

/* ---------- ROUND ---------- */

function startRound() {
  state.category = pick(Object.keys(GAME_CATEGORIES));
  state.word = pick(GAME_CATEGORIES[state.category]);
  state.imposter = pick(state.players);
  state.alive = [...state.players];
  state.eliminated = [];
  state.cycle = 1;
  state.votes = {};
  state.revealIndex = 0;
  renderReveal();
}

/* ---------- REVEAL ---------- */

function renderReveal() {
  const p = state.alive[state.revealIndex];
  render(`
<div class="term">
📱 PASS PHONE

Player: ${p} (${state.revealIndex + 1}/${state.alive.length})
Category: ${state.category}
</div>

<div class="row">
  <button class="btn" id="reveal">👀 Reveal</button>
</div>
  `);

  document.getElementById("reveal").onclick = () => renderRole(p);
}

function renderRole(p) {
  const imp = p === state.imposter;
  render(`
<div class="term">
${imp ? "🕵️ YOU ARE THE IMPOSTER" : "✅ YOU ARE NOT THE IMPOSTER"}

Category: ${state.category}
${imp ? "Secret Word: ???" : "Secret Word: " + state.word}
</div>

<div class="row">
  <button class="btn" id="hide">🙈 Hide & Pass</button>
</div>
  `);

  document.getElementById("hide").onclick = () => {
    state.revealIndex++;
    state.revealIndex >= state.alive.length ? discussionScreen() : renderReveal();
  };
}

/* ---------- DISCUSSION ---------- */

function discussionScreen() {
  render(`
<div class="term">
💬 DISCUSSION – Cycle ${state.cycle}

Give one-word clues.
</div>

<div class="row">
  <button class="btn" id="vote">🗳️ Vote</button>
</div>
  `);

  document.getElementById("vote").onclick = votingScreen;
}

/* ---------- VOTING ---------- */

function votingScreen() {
  const voter = state.alive.find(p => !(p in state.votes));
  if (!voter) return resultsScreen();

  render(`
<div class="term">
🗳️ VOTING

Voter: ${voter}
</div>

<div class="row">
${state.alive.filter(p => p !== voter)
  .map(p => `<button class="btn voteBox" data-p="${p}">${p}</button>`).join("")}
</div>
  `);

  document.querySelectorAll(".voteBox").forEach(b => {
    b.onclick = () => {
      state.votes[voter] = b.dataset.p;
      votingScreen();
    };
  });
}

/* ---------- RESULTS + ANALYTICS ---------- */

function resultsScreen() {
  const tally = {};
  Object.values(state.votes).forEach(v => tally[v] = (tally[v] || 0) + 1);

  let top = -1;
  let topPlayers = [];

  for (const [name, count] of Object.entries(tally)) {
    if (count > top) {
      top = count;
      topPlayers = [name];
    } else if (count === top) {
      topPlayers.push(name);
    }
  }

  const voteLines = state.alive.map(p =>
    `${p}: ${tally[p] || 0} vote(s)`
  ).join("\n");

  // ---- TIE CASE ----
  if (topPlayers.length > 1) {
    render(`
<div class="term">
📊 VOTE ANALYTICS – Cycle ${state.cycle}

${voteLines}

Result: TIE – no one eliminated ⚠️
Remaining Players (${state.alive.length}):
${state.alive.join(", ")}
</div>

<div class="row">
  <button class="btn" id="next">➡️ Continue</button>
</div>
    `);

    document.getElementById("next").onclick = () => {
      state.votes = {};
      state.cycle++;
      discussionScreen();
    };
    return;
  }

  // ---- ELIMINATION ----
  const eliminated = topPlayers[0];
  state.alive = state.alive.filter(p => p !== eliminated);
  state.eliminated.push(eliminated);

  // ---- WIN CHECKS ----
  if (eliminated === state.imposter) {
    return endScreen("🎯 GROUP WINS! Imposter eliminated.", voteLines);
  }

  if (state.alive.length === 2 && state.alive.includes(state.imposter)) {
    return endScreen("🕵️ IMPOSTER WINS! Final 2.", voteLines);
  }

  render(`
<div class="term">
📊 VOTE ANALYTICS – Cycle ${state.cycle}

${voteLines}

Eliminated: ${eliminated} ❌
Remaining Players (${state.alive.length}):
${state.alive.join(", ")}
</div>

<div class="row">
  <button class="btn" id="next">➡️ Next Cycle</button>
</div>
  `);

  document.getElementById("next").onclick = () => {
    state.votes = {};
    state.cycle++;
    discussionScreen();
  };
}

/* ---------- END ---------- */

function endScreen(msg, voteLines) {
  render(`
<div class="term">
${msg}

Secret Word: ${state.word}
Imposter: ${state.imposter}

Final Vote Data:
${voteLines}

Eliminated Order:
${state.eliminated.join(" → ")}
</div>

<div class="row">
  <button class="btn" id="again">🔁 New Round</button>
</div>
  `);

  document.getElementById("again").onclick = startRound;
}

setupScreen();

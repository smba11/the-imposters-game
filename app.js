const screen = document.getElementById("screen");

const GAME_CATEGORIES = {
  "🦁 Animals": ["Lion","Elephant","Penguin","Dolphin","Eagle","Tiger","Giraffe","Zebra","Kangaroo","Panda"],
  "🍎 Fruits": ["Apple","Banana","Orange","Strawberry","Grape","Watermelon","Pineapple","Mango","Kiwi","Blueberry"],
  "🌍 Countries": ["France","Japan","Brazil","Australia","Mexico","Canada","India","Egypt","Italy","Germany"],
  "🍕 Food": ["Pizza","Burger","Sushi","Taco","Pasta","Salad","Sandwich","Steak","Soup","Donut"],
  "⚽ Sports": ["Football","Basketball","Tennis","Baseball","Hockey","Volleyball","Swimming","Golf","Boxing","Cricket"]
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

const state = {
  players: [],
  round: 1,

  // round state
  alive: [],
  eliminated: [],
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

/* =========================
   LOBBY (ADD PLAYERS)
========================= */

function goLobby() {
  // leaving a round just wipes round state but keeps player list
  state.alive = [];
  state.eliminated = [];
  state.cycle = 1;
  state.category = null;
  state.word = null;
  state.imposter = null;
  state.revealIndex = 0;
  state.votes = {};
  lobbyScreen();
}

function lobbyScreen() {
  const pills = state.players.map((p) => `
    <span class="pill">👤 ${esc(p)} <button class="btn" data-remove="${esc(p)}" style="padding:4px 8px;border-radius:10px;">✖</button></span>
  `).join("");

  render(`
<div class="term">
🎭 THE IMPOSTER GAME — LOBBY

Add players (min 2), then start.
</div>

<div class="row">
  <input id="name" class="input" placeholder="Player name..." />
  <button id="add" class="btn">➕ Add</button>
  <button id="start" class="btn" ${state.players.length < 2 ? "disabled" : ""}>🚀 Start Round</button>
  <button id="reset" class="btn">🧹 Reset All</button>
</div>

<div style="margin-top:12px;">
  <b>Players:</b><br/>
  ${pills || `<span class="pill">No players yet</span>`}
</div>

<div class="term" style="margin-top:12px;">
Rules:
• Pass the phone to reveal roles 📱
• Give one-word clues
• Vote players out
• Tie = no one eliminated
• Group wins if imposter eliminated ✅
• Imposter wins if they reach final 2 😈
</div>
  `);

  const nameEl = document.getElementById("name");
  nameEl.focus();

  document.getElementById("add").onclick = () => {
    const n = nameEl.value.trim();
    if (!n) return;
    if (state.players.includes(n)) return alert("That name is already used");
    state.players.push(n);
    nameEl.value = "";
    lobbyScreen();
  };

  nameEl.onkeydown = (e) => {
    if (e.key === "Enter") document.getElementById("add").click();
  };

  document.querySelectorAll("[data-remove]").forEach(btn => {
    btn.onclick = () => {
      const who = btn.getAttribute("data-remove");
      state.players = state.players.filter(p => p !== who);
      lobbyScreen();
    };
  });

  document.getElementById("start").onclick = () => {
    if (state.players.length < 2) return;
    startRound();
  };

  document.getElementById("reset").onclick = () => {
    state.players = [];
    state.round = 1;
    lobbyScreen();
  };
}

/* =========================
   ROUND START
========================= */

function startRound() {
  const cats = Object.keys(GAME_CATEGORIES);
  state.category = pick(cats);
  state.word = pick(GAME_CATEGORIES[state.category]);
  state.imposter = pick(state.players);

  state.alive = [...state.players];
  state.eliminated = [];
  state.cycle = 1;

  state.revealIndex = 0;
  state.votes = {};

  revealScreen();
}

/* =========================
   REVEAL (PASS PHONE)
========================= */

function revealScreen() {
  const p = state.alive[state.revealIndex];

  render(`
<div class="term">
📱 PASS THE PHONE

Player: ${esc(p)} (${state.revealIndex + 1}/${state.alive.length})
Category: ${esc(state.category)}

Tap Reveal to see your role.
Then hide it and pass the phone.
</div>

<div class="row">
  <button id="reveal" class="btn">👀 Reveal</button>
  <button id="leave" class="btn">⬅️ Back to Lobby</button>
</div>
  `);

  document.getElementById("reveal").onclick = () => roleScreen(p);
  document.getElementById("leave").onclick = () => goLobby();
}

function roleScreen(player) {
  const isImp = player === state.imposter;

  render(`
<div class="term">
${isImp ? "🕵️ YOU ARE THE IMPOSTER" : "✅ YOU ARE NOT THE IMPOSTER"}

Category: ${esc(state.category)}
${isImp ? "Secret Word: (you don’t know it 😈)" : `Secret Word: ${esc(state.word)}`}

Mission:
${isImp ? "• Blend in • Listen for clues • Don’t get caught" : "• Give 1-word clues • Catch the imposter"}
</div>

<div class="row">
  <button id="hide" class="btn">🙈 Hide & Pass</button>
  <button id="leave" class="btn">⬅️ Back to Lobby</button>
</div>
  `);

  document.getElementById("hide").onclick = () => {
    state.revealIndex++;
    if (state.revealIndex >= state.alive.length) discussionScreen();
    else revealScreen();
  };

  document.getElementById("leave").onclick = () => goLobby();
}

/* =========================
   DISCUSSION
========================= */

function discussionScreen() {
  render(`
<div class="term">
💬 DISCUSSION — Cycle ${state.cycle}

Do 2–3 rounds in real life:
• Each player says ONE word clue
• Don’t say the secret word
• Imposter tries to survive 😭
</div>

<div class="row">
  <button id="vote" class="btn">🗳️ Start Voting</button>
  <button id="leave" class="btn">⬅️ Back to Lobby</button>
</div>
  `);

  document.getElementById("vote").onclick = () => votingScreen();
  document.getElementById("leave").onclick = () => goLobby();
}

/* =========================
   VOTING (BOXES)
========================= */

function votingScreen() {
  const voter = state.alive.find(p => !(p in state.votes));
  if (!voter) return resultsScreen();

  const boxes = state.alive
    .filter(p => p !== voter)
    .map(p => `<button class="btn voteBox" data-name="${esc(p)}">👤 ${esc(p)}</button>`)
    .join("");

  render(`
<div class="term">
🗳️ VOTING — Cycle ${state.cycle}

Voter: ${esc(voter)}
Tap who you think is the imposter:
</div>

<div class="row">
  ${boxes}
</div>

<div class="row">
  <button id="leave" class="btn">⬅️ Back to Lobby</button>
</div>
  `);

  document.querySelectorAll(".voteBox").forEach(btn => {
    btn.onclick = () => {
      const suspect = btn.getAttribute("data-name");
      state.votes[voter] = suspect;
      votingScreen();
    };
  });

  document.getElementById("leave").onclick = () => goLobby();
}

/* =========================
   RESULTS + ANALYTICS
========================= */

function resultsScreen() {
  const tally = {};
  Object.values(state.votes).forEach(v => {
    tally[v] = (tally[v] || 0) + 1;
  });

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

  const votesCast = Object.keys(state.votes).length;

  const analyticsLines = state.alive.map(p => {
    const c = tally[p] || 0;
    const pct = votesCast ? Math.round((c / votesCast) * 100) : 0;
    return `${p}: ${c} vote(s) (${pct}%)`;
  }).join("\n");

  // TIE: skip elimination
  if (topPlayers.length > 1) {
    render(`
<div class="term">
📊 VOTE ANALYTICS — Cycle ${state.cycle}

${analyticsLines}

Result: ⚠️ TIE — no one eliminated
Remaining Players (${state.alive.length}):
${state.alive.join(", ")}
</div>

<div class="row">
  <button id="next" class="btn">➡️ Continue</button>
  <button id="leave" class="btn">⬅️ Back to Lobby</button>
</div>
    `);

    document.getElementById("next").onclick = () => {
      state.votes = {};
      state.cycle++;
      discussionScreen();
    };
    document.getElementById("leave").onclick = () => goLobby();
    return;
  }

  // elimination
  const eliminated = topPlayers[0];
  state.alive = state.alive.filter(p => p !== eliminated);
  state.eliminated.push(eliminated);

  // win checks
  if (eliminated === state.imposter) {
    return endScreen("🎯 GROUP WINS! Imposter eliminated ✅", analyticsLines);
  }
  if (state.alive.length === 2 && state.alive.includes(state.imposter)) {
    return endScreen("🕵️ IMPOSTER WINS! Final 2 reached 😈", analyticsLines);
  }

  // continue
  render(`
<div class="term">
📊 VOTE ANALYTICS — Cycle ${state.cycle}

${analyticsLines}

Eliminated: ❌ ${eliminated}
Remaining Players (${state.alive.length}):
${state.alive.join(", ")}
</div>

<div class="row">
  <button id="next" class="btn">➡️ Next Cycle</button>
  <button id="leave" class="btn">⬅️ Back to Lobby</button>
</div>
  `);

  document.getElementById("next").onclick = () => {
    state.votes = {};
    state.cycle++;
    discussionScreen();
  };
  document.getElementById("leave").onclick = () => goLobby();
}

/* =========================
   END OF ROUND
========================= */

function endScreen(message, analyticsLines) {
  render(`
<div class="term">
🏁 ROUND OVER

${message}

Category: ${state.category}
Secret Word: ${state.word}
Imposter: ${state.imposter}

Last Vote Data:
${analyticsLines}

Eliminated Order:
${state.eliminated.join(" → ") || "(none)"}
</div>

<div class="row">
  <button id="again" class="btn">🔁 New Round</button>
  <button id="lobby" class="btn">🏠 Back to Lobby</button>
</div>
  `);

  document.getElementById("again").onclick = () => {
    state.round++;
    startRound();
  };
  document.getElementById("lobby").onclick = () => goLobby();
}

/* boot */
lobbyScreen();

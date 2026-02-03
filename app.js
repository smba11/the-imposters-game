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
  category: null,
  word: null,
  imposter: null,

  alive: [],
  eliminated: [],
  cycle: 1, // voting cycles inside a single round

  revealIndex: 0,
  votes: {} // voter -> suspect
};

function render(html) {
  screen.innerHTML = html;
}

/* ---------------- Setup ---------------- */

function setupScreen() {
  const pills = state.players.map((p) => `<span class="pill">👤 ${esc(p)}</span>`).join("");

  render(`
    <div class="term">
Add players (min 2). Then start the round.

Rules:
• 1 imposter 🕵️ 
• Everyone else sees the secret word ✅
• Pass the phone to reveal roles privately 📱
• Discuss, then vote people out 🗳️
• Game ends when:
  - imposter is eliminated ✅ OR
  - 2 players remain and one is imposter 😈
    </div>

    <div class="row">
      <input id="name" class="input" placeholder="Player name..." />
      <button id="add" class="btn">➕ Add</button>
      <button id="start" class="btn" ${state.players.length < 2 ? "disabled" : ""}>🚀 Start Round</button>
      <button id="reset" class="btn">🧹 Reset</button>
    </div>

    <div style="margin-top:10px;">
      <b>Players:</b><br/>
      ${pills || `<span class="pill">No players yet</span>`}
    </div>
  `);

  const name = document.getElementById("name");
  name.focus();

  document.getElementById("add").onclick = () => {
    const n = name.value.trim();
    if (!n) return;
    if (state.players.includes(n)) return alert("Name already used");
    state.players.push(n);
    name.value = "";
    setupScreen();
  };

  document.getElementById("start").onclick = () => {
    if (state.players.length < 2) return;
    startRound();
  };

  document.getElementById("reset").onclick = () => {
    state.players = [];
    state.round = 1;
    setupScreen();
  };

  name.onkeydown = (e) => {
    if (e.key === "Enter") document.getElementById("add").click();
  };
}

/* ---------------- Round / Reveal ---------------- */ 

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

  renderReveal(); 
}

function renderReveal() {
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
      <button id="quit" class="btn">🛑 Quit</button>
    </div>
  `);

  document.getElementById("reveal").onclick = () => renderRole(p);
  document.getElementById("quit").onclick = () => setupScreen();
}

function renderRole(player) {
  const isImp = player === state.imposter;

  render(` 
    <div class="term">
${isImp ? "🕵️ YOU ARE THE IMPOSTER!" : "✅ YOU ARE NOT THE IMPOSTER"}

Category: ${esc(state.category)}
${isImp ? "Secret Word: (you don't know it 😈)" : `Secret Word: ${esc(state.word)}`}

Mission:
${isImp ? "• Blend in • Listen for clues • Don't get caught" : "• Give 1-word clues • Catch the imposter"}
    </div>

    <div class="row">
      <button id="hide" class="btn">🙈 Hide & Pass</button>
    </div>
  `);

  document.getElementById("hide").onclick = () => {
    state.revealIndex++;
    if (state.revealIndex >= state.alive.length) discussionScreen();
    else renderReveal();
  };
}

/* ---------------- Discussion / Voting ---------------- */

function discussionScreen() {
  render(`
    <div class="term">
💬 DISCUSSION TIME

In real life, do 2–3 rounds:
• Each player says ONE word clue
• Don't say the exact secret word
• Imposter tries to survive 😭

When ready, start voting (Cycle ${state.cycle}). 
    </div>

    <div class="row">
      <button id="vote" class="btn">🗳️ Start Voting</button>
      <button id="quit" class="btn">🛑 Quit Round</button>
    </div>
  `);

  document.getElementById("vote").onclick = () => votingScreen();
  document.getElementById("quit").onclick = () => setupScreen();
}

function votingScreen() {
  const voter = state.alive.find((p) => !(p in state.votes));
  if (!voter) return resultsScreen(); // end of this voting cycle

  const choices = state.alive
    .filter((p) => p !== voter)
    .map((p) => `<button class="btn voteBox" data-name="${esc(p)}">👤 ${esc(p)}</button>`)
    .join("");

  render(`
    <div class="term">
🗳️ VOTING (Cycle ${state.cycle})

Voter: ${esc(voter)}
Tap who you think is the imposter:
    </div>
 
    <div class="row">
      ${choices}
    </div>
  `);

  document.querySelectorAll(".voteBox").forEach((btn) => {
    btn.onclick = () => {
      const suspect = btn.getAttribute("data-name");
      state.votes[voter] = suspect;
      votingScreen(); 
    };
  });
}

/* ---------------- Results / Elimination Loop ---------------- */

function resultsScreen() {
  // Tally votes
  const tally = {};
  for (const suspect of Object.values(state.votes)) {
    tally[suspect] = (tally[suspect] || 0) + 1;
  }

  // Pick eliminated: highest votes; if tie, skip elimination
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

// 👉 TIE CASE: skip elimination
if (topPlayers.length > 1) {
  state.votes = {};
  state.cycle++;
  discussionScreen();
  return;
}

// Single clear elimination
const eliminated = topPlayers[0];

  }

  // Build tally lines (for remaining players)
  const votesCast = Object.keys(state.votes).length;
  const tallyLines = state.alive
    .map((p) => {
      const c = tally[p] || 0;
      const pct = votesCast ? Math.round((c / votesCast) * 100) : 0; 
      return `${p}: ${c} vote(s) (${pct}%)`;
    })
    .join("\n");

  // Apply elimination
  if (eliminated) {
    state.alive = state.alive.filter((p) => p !== eliminated);
    state.eliminated.push(eliminated);
  }

  // Win conditions
  if (eliminated === state.imposter) {
    return finalScreen("🎯 GROUP WINS! You voted out the imposter ✅", tallyLines, eliminated);
  }

  if (state.alive.length === 2 && state.alive.includes(state.imposter)) {
    return finalScreen("🕵️ IMPOSTER WINS! Made it to the final 2 😈", tallyLines, eliminated);
  }

  // Continue game
  render(`
    <div class="term">
📊 VOTE RESULTS (Cycle ${state.cycle})

${tallyLines || "(no votes)"}

Eliminated: ${eliminated ? eliminated : "(none)"} ❌
Remaining Players (${state.alive.length}): ${state.alive.join(", ")}

Next: discuss again, then vote again.
    </div>

    <div class="row">
      <button id="next" class="btn">➡️ Next Discussion</button>
      <button id="quit" class="btn">🛑 Quit Round</button>
    </div>
  `);

  document.getElementById("next").onclick = () => {
    state.votes = {};
    state.cycle++;
    discussionScreen();
  };

  document.getElementById("quit").onclick = () => setupScreen();
}

function finalScreen(message, tallyLines, eliminated) {
  render(`
    <div class="term">
🏁 ROUND OVER

${message}

Category: ${state.category}
Secret Word: ${state.word}
Imposter: ${state.imposter}

Last Vote Tally:
${tallyLines || "(no votes)"}

Eliminated This Cycle: ${eliminated ? eliminated : "(none)"}
Eliminated Total: ${state.eliminated.join(", ") || "(none)"}
    </div>

    <div class="row">
      <button id="again" class="btn">🔁 Next Round</button>
      <button id="reset" class="btn">🧹 Reset Players</button>
    </div>
  `);

  document.getElementById("again").onclick = () => {
    state.round++;
    startRound();
  };

  document.getElementById("reset").onclick = () => {
    state.players = [];
    state.round = 1;
    setupScreen();
  };
}

setupScreen();

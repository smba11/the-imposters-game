const screen = document.getElementById("screen");

const GAME_CATEGORIES = {
  "🦁 Animals": ["Lion","Elephant","Penguin","Dolphin","Eagle","Tiger","Giraffe","Zebra","Kangaroo","Panda"],
  "🍎 Fruits": ["Apple","Banana","Orange","Strawberry","Grape","Watermelon","Pineapple","Mango","Kiwi","Blueberry"],
  "🌍 Countries": ["France","Japan","Brazil","Australia","Mexico","Canada","India","Egypt","Italy","Germany"],
  "🍕 Food": ["Pizza","Burger","Sushi","Taco","Pasta","Salad","Sandwich","Steak","Soup","Donut"],
  "⚽ Sports": ["Football","Basketball","Tennis","Baseball","Hockey","Volleyball","Swimming","Golf","Boxing","Cricket"]
};

const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];
const esc = (s) => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const state = {
  players: [],
  round: 1,  
  category: null,
  word: null,
  imposter: null,
  revealIndex: 0,
  votes: {}
};

function render(html){ screen.innerHTML = html; }

function startRound(){ 
  const cats = Object.keys(GAME_CATEGORIES);
  state.category = pick(cats);
  state.word = pick(GAME_CATEGORIES[state.category]);
  state.imposter = pick(state.players);
  state.revealIndex = 0;
  state.votes = {};
  renderReveal();
}

function setupScreen(){
  const pills = state.players.map(p => `<span class="pill">👤 ${esc(p)}</span>`).join("");
  render(`
    <div class="term">
Add players (min 2). Then start the round.

Rules:
• 1 imposter 🕵️
• Everyone else sees the secret word ✅
• Pass the phone to reveal roles privately 📱
• Discuss, then vote 🗳️
    </div>

    <div class="row">
      <input id="name" class="input" placeholder="Player name..." /> 
      <button id="add" class="btn">➕ Add</button>
      <button id="start" class="btn" ${state.players.length<2 ? "disabled" : ""}>🚀 Start Round</button>
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
    if(!n) return;
    if(state.players.includes(n)) return alert("Name already used");
    state.players.push(n);
    name.value = "";
    setupScreen(); 
  };

  document.getElementById("start").onclick = () => {
    if(state.players.length < 2) return;
    startRound();
  };

  document.getElementById("reset").onclick = () => {
    state.players = [];
    state.round = 1;
    setupScreen();
  };

  name.onkeydown = (e) => { if(e.key === "Enter") document.getElementById("add").click(); };
}

function renderReveal(){
  const p = state.players[state.revealIndex];
  render(`
    <div class="term"> 
📱 PASS THE PHONE

Player: ${esc(p)} (${state.revealIndex+1}/${state.players.length})
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

function renderRole(player){
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
    if(state.revealIndex >= state.players.length) discussionScreen();
    else renderReveal();
  };  
}

function discussionScreen(){
  render(`
    <div class="term">
💬 DISCUSSION TIME

In real life, do 2–3 rounds:
• Each player says ONE word clue
• Don't say the exact secret word
• Imposter tries to survive 😭

When ready, start voting.
    </div>

    <div class="row">
      <button id="vote" class="btn">🗳️ Start Voting</button>
      <button id="quit" class="btn">🛑 Quit</button>
    </div>
  `);

  document.getElementById("vote").onclick = () => votingScreen();
  document.getElementById("quit").onclick = () => setupScreen();
}

function votingScreen(){
  const voter = state.players.find(p => !(p in state.votes));
  if(!voter) return resultsScreen();

  const options = state.players
    .filter(p => p !== voter)
    .map(p => `<option value="${esc(p)}">${esc(p)}</option>`)
    .join("");

  render(`
    <div class="term"> 
🗳️ VOTING

Voter: ${esc(voter)}
Pick who you think is the imposter.
    </div>
 
    <div class="row">
      <select id="suspect" class="input">${options}</select>
      <button id="cast" class="btn">✅ Vote</button>
    </div> 
  `);

  document.getElementById("cast").onclick = () => {
    const suspect = document.getElementById("suspect").value;
    state.votes[voter] = suspect;
    votingScreen();
  }; 
}

function resultsScreen(){
  const impVotes = Object.values(state.votes).filter(v => v === state.imposter).length;
  const groupWins = impVotes > (state.players.length/2);

  const lines = Object.entries(state.votes).map(([v,s]) => `${v} → ${s}`).join("\n");

  render(`
    <div class="term">
📊 RESULTS

${lines || "(no votes)"}
 
${groupWins ? "🎯 GROUP WINS! ✅" : "🕵️ IMPOSTER WINS! 😈"} 

Secret Word: ${esc(state.word)}
Imposter: ${esc(state.imposter)} 
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

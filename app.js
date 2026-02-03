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

  // ---------- TIE CASE ----------
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

  // ---------- ELIMINATION ----------
  const eliminated = topPlayers[0];
  state.alive = state.alive.filter(p => p !== eliminated);
  state.eliminated.push(eliminated);

  // ---------- WIN CHECKS ----------
  if (eliminated === state.imposter) {
    return endScreen("🎯 GROUP WINS! Imposter eliminated.", analyticsLines);
  }

  if (state.alive.length === 2 && state.alive.includes(state.imposter)) {
    return endScreen("🕵️ IMPOSTER WINS! Final 2 reached.", analyticsLines);
  }

  // ---------- CONTINUE ----------
  render(`
<div class="term">
📊 VOTE ANALYTICS — Cycle ${state.cycle}

${analyticsLines}

Eliminated: ❌ ${eliminated}
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

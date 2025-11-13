// static/app.js

async function api(path, body, method = "POST") {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : null
  });
  return await res.json();
}

function renderCard(card, hidden) {
  const div = document.createElement("div");
  if (hidden) {
    div.className = "card back";
    div.textContent = "RC";
    return div;
  }

  const [rank, suit] = card;
  const isRed = suit === "♥" || suit === "♦";
  div.className = "card " + (isRed ? "red" : "black");

  const corner = document.createElement("div");
  corner.className = "corner";
  corner.textContent = rank + suit;
  const centerSuit = document.createElement("div");
  centerSuit.className = "suit";
  centerSuit.textContent = suit;

  div.appendChild(corner);
  div.appendChild(centerSuit);
  return div;
}

function renderState(state) {
  // referencias
  const dealerCards = document.getElementById("dealer-cards");
  const playerCards = document.getElementById("player-cards");
  const dealerVal = document.getElementById("dealer-value");
  const playerVal = document.getElementById("player-value");
  const message = document.getElementById("message");
  const betAmount = document.getElementById("bet-amount");
  const bankAmount = document.getElementById("bank-amount");
  const btnMain = document.getElementById("btn-main");
  const btnDouble = document.getElementById("btn-double");
  const btnHit = document.getElementById("btn-hit");
  const btnStand = document.getElementById("btn-stand");
  const clearBet = document.getElementById("clear-bet");

  dealerCards.innerHTML = "";
  playerCards.innerHTML = "";

  // Dealer cards
  state.dealer.forEach((card, index) => {
    const hidden = state.dealer_hidden && index === 1;
    dealerCards.appendChild(renderCard(card, hidden));
  });

  // Player cards
  state.player.forEach(card => {
    playerCards.appendChild(renderCard(card, false));
  });

  // Values
  dealerVal.textContent = (state.dealer_hidden) ? "?" : (state.dealer_value || "");
  playerVal.textContent = state.player.length ? state.player_value : "";

  // Message
  message.textContent = state.message || "";

  // Bet / bank
  betAmount.textContent = "$" + state.bet;
  bankAmount.textContent = "$" + state.bank;

  // Actions
  const actions = state.allowed_actions || [];
  const can = a => actions.includes(a);

  btnDouble.disabled = !can("double");
  btnHit.disabled    = !can("hit");
  btnStand.disabled  = !can("stand");
  clearBet.disabled  = !can("clear_bet");

  if (state.phase === "BETTING") {
    btnMain.textContent = "DEAL";
    btnMain.disabled = !can("deal");
  } else if (state.phase === "END") {
    btnMain.textContent = "NEW ROUND";
    btnMain.disabled = !can("new_round");
  } else {
    btnMain.textContent = "DEAL";
    btnMain.disabled = true;
  }
}

async function loadState() {
  const state = await api("/api/state", null, "GET");
  renderState(state);
}

async function setup() {
  await loadState();

  // Chips
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", async () => {
      const amount = parseInt(chip.dataset.amount);
      const state = await api("/api/bet", { amount });
      renderState(state);
    });
  });

  document.getElementById("clear-bet").addEventListener("click", async () => {
    const state = await api("/api/clear_bet", {});
    renderState(state);
  });

  // botones laterales
  document.getElementById("btn-double").addEventListener("click", async () => {
    const state = await api("/api/double", {});
    renderState(state);
  });
  document.getElementById("btn-hit").addEventListener("click", async () => {
    const state = await api("/api/hit", {});
    renderState(state);
  });
  document.getElementById("btn-stand").addEventListener("click", async () => {
    const state = await api("/api/stand", {});
    renderState(state);
  });

  // botón principal
  document.getElementById("btn-main").addEventListener("click", async () => {
    const current = await api("/api/state", null, "GET");
    let state;
    if (current.phase === "BETTING") {
      state = await api("/api/deal", {});
    } else if (current.phase === "END") {
      state = await api("/api/new_round", {});
    } else {
      return;
    }
    renderState(state);
  });
}

setup();


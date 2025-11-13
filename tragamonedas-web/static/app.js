const API_URL = ""; 
// IMPORTANTE: aquí pega la URL de Render cuando lo subas
// Ej: const API_URL = "https://mi-slot.onrender.com";

let balance = 500;
let autoSpin = false;
let spinning = false;

const gridEl = document.getElementById("grid");
const statusEl = document.getElementById("status");
const betInput = document.getElementById("bet");
const spinBtn = document.getElementById("spinBtn");
const autoBtn = document.getElementById("autoBtn");
const balanceEl = document.getElementById("balance");

// Crear las 9 celdas
const cells = [];
for (let i = 0; i < 9; i++) {
  const div = document.createElement("div");
  div.className = "cell";
  div.textContent = "❔";
  gridEl.appendChild(div);
  cells.push(div);
}

function updateBalance() {
  balanceEl.textContent = "Saldo: " + balance;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function showGrid(grid) {
  const flat = grid.flat();
  flat.forEach((symbol, i) => {
    cells[i].textContent = symbol;
  });
}

async function spinOnce() {
  if (spinning) return;

  const bet = parseInt(betInput.value);

  if (bet > balance) {
    setStatus("Saldo insuficiente 💸");
    return;
  }

  spinning = true;
  setStatus("Girando...");
  balance -= bet;
  updateBalance();

  // Animación falsa mientras carga
  cells.forEach(c => {
    c.textContent = ["🍒","🍋","🍇","⭐","7️⃣"][Math.floor(Math.random()*5)];
  });

  const res = await fetch(`${API_URL}/spin`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ bet })
  });

  const data = await res.json();
  showGrid(data.grid);

  if (data.win > 0) {
    balance += data.win;
    setStatus(`🎉 ¡Ganaste ${data.win}!`);
  } else {
    setStatus("Sigue intentando...");
  }

  updateBalance();
  spinning = false;

  if (autoSpin && balance > 0) {
    setTimeout(spinOnce, 500);
  }
}

spinBtn.onclick = () => {
  autoSpin = false;
  autoBtn.textContent = "Auto-Spin OFF";
  spinOnce();
};

autoBtn.onclick = () => {
  autoSpin = !autoSpin;
  autoBtn.textContent = autoSpin ? "Auto-Spin ON" : "Auto-Spin OFF";
  if (autoSpin) spinOnce();
};

updateBalance();


// static/app.js

// --- Config ---
const API_URL = "/api/spin"; // en Render será el mismo dominio

const NUM_WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6,
  27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16,
  33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28,
  12, 35, 3, 26
];
const RED_SET = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const SEG_ANGLE = (Math.PI * 2) / NUM_WHEEL.length;

const canvas = document.getElementById("rouletteCanvas");
const ctx = canvas.getContext("2d");
const cx = canvas.width / 2;
const cy = canvas.height / 2;
const R_OUT = canvas.width * 0.48;
const R_IN  = canvas.width * 0.15;
const R_BALL = canvas.width * 0.33; // pista interna

let balance = 1000;
let selectedColor = null;           // "rojo", "negro", "verde"
let chipValues = [1, 5, 10, 50, 100];
let selectedChipIndex = 2;
let history = [];

let angle = 0;             // ángulo actual de la rueda
let spinning = false;
let startAngle = 0;
let targetAngle = 0;
let spinStartTime = 0;
let spinDuration = 2500;   // ms

let autoSpin = false;

const balanceSpan = document.getElementById("balance");
const historySpan = document.getElementById("history");
const resultText  = document.getElementById("resultText");
const btnSpin     = document.getElementById("btnSpin");
const btnAuto     = document.getElementById("btnAuto");

// --- cargar fichas dinámicamente ---
const chipsRow = document.getElementById("chipsRow");
chipValues.forEach((val, idx) => {
  const b = document.createElement("button");
  b.textContent = val;
  b.className = "btn chip";
  if (idx === selectedChipIndex) b.classList.add("selected");
  b.addEventListener("click", () => {
    selectedChipIndex = idx;
    updateChipSelection();
  });
  chipsRow.appendChild(b);
});

function updateChipSelection() {
  const btns = document.querySelectorAll(".btn.chip");
  btns.forEach((b, i) => {
    b.classList.toggle("selected", i === selectedChipIndex);
  });
}

function updateColorSelection() {
  document.querySelectorAll(".btn.color").forEach(btn => {
    const color = btn.dataset.color;
    btn.classList.toggle("selected", color === selectedColor);
  });
}

function numColor(n) {
  if (n === 0) return "verde";
  return RED_SET.has(n) ? "rojo" : "negro";
}

// --- Dibujo de la ruleta ---
function drawWheel() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // sectores
  for (let i = 0; i < NUM_WHEEL.length; i++) {
    const start = i * SEG_ANGLE;
    const end = start + SEG_ANGLE;
    const n = NUM_WHEEL[i];
    const col = n === 0 ? "#008c00" : (RED_SET.has(n) ? "#d40000" : "#111111");

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R_OUT, start, end);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();

    // borde
    ctx.strokeStyle = "#f2d88a";
    ctx.lineWidth = 2;
    ctx.stroke();

    // número
    ctx.save();
    const mid = start + SEG_ANGLE / 2;
    const rx = Math.cos(mid) * (R_OUT * 0.82);
    const ry = Math.sin(mid) * (R_OUT * 0.82);
    ctx.translate(rx, ry);
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), 0, 0);
    ctx.restore();
  }

  // aro interior
  ctx.beginPath();
  ctx.arc(0, 0, R_OUT, 0, Math.PI * 2);
  ctx.strokeStyle = "#f5e0a3";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, R_IN, 0, Math.PI * 2);
  ctx.fillStyle = "#e8c47a";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fff4c8";
  ctx.stroke();

  ctx.restore();

  // bola (siempre en la parte de arriba - puntero)
  const ballAngle = -Math.PI / 2; // arriba
  const bx = cx + Math.cos(ballAngle) * R_BALL;
  const by = cy + Math.sin(ballAngle) * R_BALL;

  ctx.beginPath();
  ctx.arc(bx + 2, by + 3, 9, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(bx, by, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(bx - 3, by - 3, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

// --- Animación ---
function animate(timestamp) {
  if (spinning) {
    if (!spinStartTime) spinStartTime = timestamp;
    const t = timestamp - spinStartTime;
    const k = Math.min(t / spinDuration, 1);
    // ease-out
    const ease = 1 - Math.pow(1 - k, 3);
    angle = startAngle + (targetAngle - startAngle) * ease;

    if (k >= 1) {
      spinning = false;
      spinStartTime = 0;
    }
  }

  drawWheel();
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// --- Lógica de apuestas / API ---
function setBalance(val) {
  balance = val;
  balanceSpan.textContent = balance;
}

function addToHistory(num) {
  history.unshift(num);
  if (history.length > 10) history.pop();
  historySpan.textContent = history.join("  ");
}

async function doSpin() {
  if (spinning) return;
  const bet = chipValues[selectedChipIndex];
  if (!selectedColor) {
    resultText.textContent = "Elige un color primero";
    return;
  }
  if (bet > balance) {
    resultText.textContent = "Saldo insuficiente";
    return;
  }

  btnSpin.disabled = true;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        balance,
        bet,
        color: selectedColor
      })
    });

    const data = await res.json();
    if (!res.ok) {
      resultText.textContent = data.error || "Error en el servidor";
      btnSpin.disabled = false;
      return;
    }

    // actualizar saldo
    setBalance(data.newBalance);
    addToHistory(data.number);

    // animar rueda para que caiga en el index ganador
    const targetIndex = data.index;

    const currentAngleNorm = angle % (Math.PI * 2);
    // queremos que el sector targetIndex quede arriba (puntero -PI/2)
    const baseTarget =
      -Math.PI / 2 - (targetIndex * SEG_ANGLE + SEG_ANGLE / 2);

    // añadir vueltas completas para que gire bonito
    const spins = 5; // vueltas completas
    const fullRotation = Math.PI * 2 * spins;

    startAngle = currentAngleNorm;
    // giramos en sentido horario (restamos)
    targetAngle = baseTarget - fullRotation;

    spinning = true;
    spinStartTime = 0;

    const colorTxt = data.color.toUpperCase();
    resultText.textContent =
      `Salió ${data.number} (${colorTxt})  ` +
      (data.win > 0 ? `+ $${data.win}` : "+$0");
  } catch (err) {
    console.error(err);
    resultText.textContent = "Error de conexión con el servidor";
  } finally {
    btnSpin.disabled = false;
  }
}

// --- Eventos ---
document.querySelectorAll(".btn.color").forEach(btn => {
  btn.addEventListener("click", () => {
    const color = btn.dataset.color;
    selectedColor = selectedColor === color ? null : color;
    updateColorSelection();
  });
});

btnSpin.addEventListener("click", () => {
  doSpin();
});

btnAuto.addEventListener("click", () => {
  autoSpin = !autoSpin;
  btnAuto.textContent = `AUTO SPIN: ${autoSpin ? "ON" : "OFF"}`;
});

setInterval(() => {
  if (autoSpin && !spinning) {
    doSpin();
  }
}, 4000);

setBalance(balance);
updateChipSelection();
updateColorSelection();
resultText.textContent = "Selecciona color y apuesta…";


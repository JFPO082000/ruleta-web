// =============================
// CONFIGURACIÓN RULETA EUROPEA
// =============================
const NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6,
  27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16,
  33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28,
  12, 35, 3, 26
];
const SLICES = NUMBERS.length;
const SEG_ANGLE = (Math.PI * 2) / SLICES;

function getColor(num) {
  if (num === 0) return "verde";
  const rojos = [
    32,19,21,25,34,27,36,30,23,
    5,16,1,14,9,18,7,12,3
  ];
  return rojos.includes(num) ? "rojo" : "negro";
}

// =============================
// CANVAS
// =============================
const canvas = document.getElementById("rouletteCanvas");
const ctx = canvas.getContext("2d");

// aseguramos canvas cuadrado
const SIZE = 380;
canvas.width = SIZE;
canvas.height = SIZE;

const CENTER = SIZE / 2;
const R_WHEEL = SIZE * 0.48;
const R_BALL = SIZE * 0.36;

// =============================
// ESTADO
// =============================
let wheelAngle = 0;
let ballAngle = 0;
let spinning = false;

let saldo = 1000;
let selectedColor = null;
let selectedBet = null;
let autoSpin = false;

let winnerIndex = null;
let winnerNumber = null;
let winnerColor = null;

// =============================
// ELEMENTOS UI
// =============================
const balanceSpan = document.getElementById("balance");
const historySpan = document.getElementById("history");
const resultText = document.getElementById("resultText");

const btnRojo = document.getElementById("btnRojo");
const btnNegro = document.getElementById("btnNegro");
const btnVerde = document.getElementById("btnVerde");

const btnSpin = document.getElementById("btnSpin");
const btnAuto = document.getElementById("btnAuto");
const chipsRow = document.getElementById("chipsRow");

// =============================
// FICHAS
// =============================
const CHIPS = [10, 20, 50, 100, 200, 500];
CHIPS.forEach(val => {
  const b = document.createElement("button");
  b.className = "btn chip";
  b.textContent = "$" + val;
  b.dataset.value = val;
  b.addEventListener("click", () => {
    document.querySelectorAll(".btn.chip").forEach(x => x.classList.remove("selected"));
    b.classList.add("selected");
    selectedBet = val;
    actualizarResultado();
  });
  chipsRow.appendChild(b);
});

// =============================
// DIBUJAR RULETA
// =============================
function drawWheel() {
  ctx.clearRect(0,0,SIZE,SIZE);

  // fondo
  const grad = ctx.createRadialGradient(
    CENTER, CENTER, SIZE*0.1,
    CENTER, CENTER, SIZE*0.6
  );
  grad.addColorStop(0, "#1b1b1b");
  grad.addColorStop(1, "#000000");
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,SIZE,SIZE);

  // ruleta
  ctx.save();
  ctx.translate(CENTER, CENTER);
  ctx.rotate(wheelAngle);

  for (let i = 0; i < SLICES; i++) {
    const start = i * SEG_ANGLE;
    const end   = start + SEG_ANGLE;
    const n = NUMBERS[i];
    const c = getColor(n);

    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,R_WHEEL,start,end);
    ctx.closePath();

    if (c === "rojo") ctx.fillStyle = "#b71c1c";
    else if (c === "negro") ctx.fillStyle = "#111";
    else ctx.fillStyle = "#0a7a0a";
    ctx.fill();

    // línea divisoria
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    ctx.stroke();

    // número
    ctx.save();
    ctx.rotate(start + SEG_ANGLE/2);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(String(n), R_WHEEL - 26, 5);
    ctx.restore();
  }

  // borde dorado
  ctx.beginPath();
  ctx.strokeStyle = "#e7c359";
  ctx.lineWidth = 6;
  ctx.arc(0,0,R_WHEEL+4,0,Math.PI*2);
  ctx.stroke();

  ctx.restore();

  drawBall();
}

// =============================
// DIBUJAR BOLA
// =============================
function drawBall() {
  const x = CENTER + Math.cos(ballAngle) * R_BALL;
  const y = CENTER + Math.sin(ballAngle) * R_BALL;

  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(x, y, SIZE*0.03, 0, Math.PI*2);
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 4;
  ctx.fill();
  ctx.shadowBlur = 0;
}

// =============================
// UTILIDADES
// =============================
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function actualizarResultado(msg) {
  if (msg) {
    resultText.textContent = msg;
    return;
  }
  if (!selectedColor && !selectedBet) {
    resultText.textContent = "Selecciona color y apuesta…";
  } else if (!selectedColor) {
    resultText.textContent = "Selecciona un color…";
  } else if (!selectedBet) {
    resultText.textContent = "Selecciona una ficha…";
  } else {
    resultText.textContent =
      `Listo: ${selectedColor.toUpperCase()} $${selectedBet}`;
  }
}

// =============================
// SELECCIÓN COLOR
// =============================
function seleccionarColor(color) {
  document.querySelectorAll(".btn.color").forEach(b => b.classList.remove("selected"));
  if (color === "rojo") btnRojo.classList.add("selected");
  if (color === "negro") btnNegro.classList.add("selected");
  if (color === "verde") btnVerde.classList.add("selected");
  selectedColor = color;
  actualizarResultado();
}

btnRojo.addEventListener("click", () => seleccionarColor("rojo"));
btnNegro.addEventListener("click", () => seleccionarColor("negro"));
btnVerde.addEventListener("click", () => seleccionarColor("verde"));

// =============================
// BOTONES
// =============================
btnSpin.addEventListener("click", () => {
  spin(false);
});
btnAuto.addEventListener("click", () => {
  autoSpin = !autoSpin;
  btnAuto.textContent = autoSpin ? "AUTO SPIN: ON" : "AUTO SPIN: OFF";
  if (autoSpin && !spinning) {
    spin(true);
  }
});

// =============================
// LÓGICA DE SPIN (con backend Flask)
// =============================
function spin(fromAuto) {
  if (spinning) return;

  if (!selectedColor || !selectedBet) {
    actualizarResultado();
    return;
  }
  if (saldo < selectedBet) {
    actualizarResultado("Saldo insuficiente.");
    autoSpin = false;
    btnAuto.textContent = "AUTO SPIN: OFF";
    return;
  }

  spinning = true;
  resultText.textContent = "Girando…";

  fetch("/api/spin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      balance: saldo,
      bet: selectedBet,
      color: selectedColor
    })
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        spinning = false;
        actualizarResultado(data.error);
        return;
      }

      winnerIndex  = data.index;
      winnerNumber = data.number;
      winnerColor  = data.color;
      saldo        = data.newBalance;
      balanceSpan.textContent = saldo;

      animateSpin();
    })
    .catch(err => {
      console.error(err);
      spinning = false;
      actualizarResultado("Error de conexión.");
    });
}

// =============================
// ANIMACIÓN DEL GIRO
// =============================
function animateSpin() {
  const targetAngle = winnerIndex * SEG_ANGLE + SEG_ANGLE/2;

  const startWheel = wheelAngle;
  const startBall  = ballAngle;

  const extraWheel = 4 * Math.PI * 2;
  const extraBall  = 7 * Math.PI * 2;

  const finalWheel = startWheel + extraWheel;
  const finalBall  = startBall + extraBall + targetAngle;

  const duration = 3400;
  const startTime = performance.now();

  function frame(now) {
    let t = (now - startTime) / duration;
    if (t > 1) t = 1;
    const e = easeOut(t);

    wheelAngle = startWheel + (finalWheel - startWheel) * e;
    ballAngle  = startBall  + (finalBall  - startBall)  * e;

    drawWheel();

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      finishSpin();
    }
  }

  requestAnimationFrame(frame);
}

// =============================
// FIN DE GIRO
// =============================
function finishSpin() {
  const base = ballAngle;
  const amp = 0.05;
  const bounces = 10;
  const duration = 500;
  const startTime = performance.now();

  function frame(now) {
    let t = (now - startTime) / duration;
    if (t > 1) t = 1;
    const d = 1 - t;
    const offset = Math.sin(t * bounces * Math.PI) * amp * d;

    ballAngle = base + offset;
    drawWheel();

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      showResult();
    }
  }

  requestAnimationFrame(frame);
}

// =============================
// MOSTRAR RESULTADO
// =============================
function showResult() {
  spinning = false;

  historySpan.textContent = `${winnerNumber} ${historySpan.textContent}`;

  if (winnerColor === selectedColor) {
    let ganancia = winnerColor === "verde" ? selectedBet * 35 : selectedBet;
    actualizarResultado(`¡Ganaste! Salió ${winnerNumber} (${winnerColor.toUpperCase()}) +$${ganancia}`);
  } else {
    actualizarResultado(`Perdiste. Salió ${winnerNumber} (${winnerColor.toUpperCase()}) -$${selectedBet}`);
  }

  if (autoSpin && saldo >= selectedBet) {
    setTimeout(() => spin(true), 800);
  } else if (saldo < selectedBet) {
    autoSpin = false;
    btnAuto.textContent = "AUTO SPIN: OFF";
  }
}

// =============================
// INICIO
// =============================
drawWheel();
actualizarResultado();


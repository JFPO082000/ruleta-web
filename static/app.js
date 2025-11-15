// -----------------------------------------------------------
//  CONFIGURACIÓN RULETA EUROPEA
// -----------------------------------------------------------
const NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6,
  27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29,
  7, 28, 12, 35, 3, 26
];
const SLICES = NUMBERS.length;
const SLICE_ANGLE = (Math.PI * 2) / SLICES;

function getColor(num) {
  if (num === 0) return "verde";
  const rojos = [
    32, 19, 21, 25, 34, 27, 36, 30, 23,
    5, 16, 1, 14, 9, 18, 7, 12, 3
  ];
  return rojos.includes(num) ? "rojo" : "negro";
}

// -----------------------------------------------------------
//  CANVAS
// -----------------------------------------------------------
const rgbCanvas = document.getElementById("rgbCanvas");
const rgbCtx = rgbCanvas.getContext("2d");

const rouletteCanvas = document.getElementById("rouletteCanvas");
const ctx = rouletteCanvas.getContext("2d");

const ballCanvas = document.getElementById("ballCanvas");
const ballCtx = ballCanvas.getContext("2d");

rgbCanvas.width = rgbCanvas.height = 420;
rouletteCanvas.width = rouletteCanvas.height = 420;
ballCanvas.width = ballCanvas.height = 420;

const CENTER = 210;
const R_WHEEL = 200;
const R_BALL = 125; // la bola queda un poco más hacia afuera

// -----------------------------------------------------------
//  ESTADO DEL JUEGO
// -----------------------------------------------------------
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

const saldoSpan = document.getElementById("saldo");
const historySpan = document.getElementById("history");
const resultDiv = document.getElementById("result");
const canvasWrapper = document.getElementById("canvasWrapper");

// sonidos opcionales (si no están los archivos, no pasa nada)
const spinSound = new Audio("/static/sounds/spin.mp3");
const winSound  = new Audio("/static/sounds/win.mp3");
const loseSound = new Audio("/static/sounds/lose.mp3");

// -----------------------------------------------------------
//  DIBUJO RULETA
// -----------------------------------------------------------
function drawWheel() {
    ctx.clearRect(0, 0, 460, 460);

    const slice = SLICE_ANGLE;

    // rotación base para que el 0 quede ARRIBA
    const rotationOffset = -Math.PI / 2;

    for (let i = 0; i < SLICES; i++) {
        const start = wheelAngle + rotationOffset + i * slice;
        const end = start + slice;
        const num = NUMBERS[i];

        // sector
        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, R_WHEEL, start, end);
        ctx.closePath();

        const col = getColor(num);
        ctx.fillStyle =
            col === "rojo" ? "#d00000" :
            col === "negro" ? "#000000" :
            "#0bb400";
        ctx.fill();

        // número
        ctx.save();
        ctx.translate(CENTER, CENTER);
        ctx.rotate(start + slice / 2);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillText(num.toString(), R_WHEEL - 40, 8);

        ctx.restore();
    }
}


// -----------------------------------------------------------
//  DIBUJO BOLA
// -----------------------------------------------------------
function drawBall() {
  ballCtx.clearRect(0, 0, 420, 420);

  const x = CENTER + Math.cos(ballAngle) * R_BALL;
  const y = CENTER + Math.sin(ballAngle) * R_BALL;

  ballCtx.beginPath();
  ballCtx.arc(x, y, 10, 0, Math.PI * 2);
  ballCtx.fillStyle = "#ffffff";
  ballCtx.fill();
}

// -----------------------------------------------------------
//  ANILLO RGB GIRATORIO
// -----------------------------------------------------------
function drawRGB() {
  rgbCtx.clearRect(0, 0, 420, 420);

  const segments   = 160;
  const ringRadius = R_WHEEL + 4;
  const time       = performance.now() / 6;

  for (let i = 0; i < segments; i++) {
    const start = (i / segments) * Math.PI * 2;
    const end   = ((i + 1) / segments) * Math.PI * 2;

    const hue = (i * 3 + time) % 360;

    rgbCtx.strokeStyle = `hsl(${hue}, 100%, 55%)`;
    rgbCtx.lineWidth = 4;

    rgbCtx.beginPath();
    rgbCtx.arc(CENTER, CENTER, ringRadius, start, end);
    rgbCtx.stroke();
  }

  requestAnimationFrame(drawRGB);
}
drawRGB();

// -----------------------------------------------------------
//  SELECCIÓN COLOR
// -----------------------------------------------------------
document.querySelectorAll(".color-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".color-btn")
      .forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedColor = btn.dataset.color;
    actualizarResultado();
  });
});

// -----------------------------------------------------------
//  SELECCIÓN FICHAS
// -----------------------------------------------------------
document.querySelectorAll(".chip-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chip-btn")
      .forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedBet = parseInt(btn.dataset.value);
    actualizarResultado();
  });
});

// -----------------------------------------------------------
//  BOTONES
// -----------------------------------------------------------
document.getElementById("spinBtn").onclick = () => spin(false);

document.getElementById("autoBtn").onclick = () => {
  autoSpin = !autoSpin;
  document.getElementById("autoBtn").textContent =
    autoSpin ? "AUTO SPIN: ON" : "AUTO SPIN: OFF";

  if (autoSpin && !spinning) spin(true);
};

// -----------------------------------------------------------
//  MENSAJES
// -----------------------------------------------------------
function actualizarResultado(msg) {
  if (msg) {
    resultDiv.textContent = msg;
    return;
  }

  if (!selectedColor && !selectedBet) {
    resultDiv.textContent = "Selecciona color y apuesta…";
  } else if (!selectedColor) {
    resultDiv.textContent = "Selecciona un color…";
  } else if (!selectedBet) {
    resultDiv.textContent = "Selecciona una ficha…";
  } else {
    resultDiv.textContent =
      `Apuesta lista: ${selectedColor.toUpperCase()} $${selectedBet}`;
  }
}

// -----------------------------------------------------------
//  SPIN – LLAMADA AL BACKEND
// -----------------------------------------------------------
function spin(fromAuto) {
  if (spinning) return;

  if (!selectedColor || !selectedBet) {
    actualizarResultado();
    return;
  }

  if (saldo < selectedBet) {
    actualizarResultado("Saldo insuficiente.");
    autoSpin = false;
    document.getElementById("autoBtn").textContent = "AUTO SPIN: OFF";
    return;
  }

  spinning = true;
  resultDiv.textContent = "Girando…";

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

      // Datos del backend
      winnerIndex  = data.index;
      winnerNumber = data.number;
      winnerColor  = data.color;
      saldo        = data.newBalance;
      saldoSpan.textContent = saldo;

      // Animación con destino EXACTO
      animateSpin();
    })
    .catch(err => {
      console.error(err);
      spinning = false;
      actualizarResultado("Error de conexión.");
    });
}

// -----------------------------------------------------------
//  ANIMACIÓN DEL GIRO (ruleta + bola sincronizadas)
// -----------------------------------------------------------
function animateSpin() {

    try { spinSound.currentTime = 0; spinSound.play(); } catch (e) {}

    // velocidades iniciales reales de casino
    let wheelSpeed = 0.25;
    let ballSpeed = -0.75;  // bola va al revés siempre

    // fricción física
    const frictionWheel = 0.992;
    const frictionBall = 0.985;

    spinning = true;

    function frame() {
        wheelAngle += wheelSpeed;
        ballAngle += ballSpeed;

        wheelSpeed *= frictionWheel;
        ballSpeed *= frictionBall;

        drawWheel();
        drawBall();

        // cuando la bola ya va lenta, calcular caída al número
        if (Math.abs(ballSpeed) < 0.020) {

            const target = (winnerIndex * SLICE_ANGLE) - Math.PI / 2;

            const diff = ((target - ballAngle) % (Math.PI * 2));

            // ajustar suavemente
            if (Math.abs(diff) < 0.03) {
                ballAngle = target;
                bounceBall(target);
                return;
            }

            ballAngle += diff * 0.08;
        }

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

// rebote final
function bounceBall(angle) {
    const amplitude = 0.05;
    const bounces = 10;
    const duration = 750;
    const start = performance.now();

    function bounce(now) {
        let t = (now - start) / duration;
        if (t > 1) t = 1;

        const decay = 1 - t;
        const offset = Math.sin(t * bounces * Math.PI) * amplitude * decay;

        ballAngle = angle + offset;

        drawWheel();
        drawBall();

        if (t < 1) {
            requestAnimationFrame(bounce);
        } else {
            showResult();
        }
    }

    requestAnimationFrame(bounce);
}



// -----------------------------------------------------------
//  FINAL DEL GIRO: rebote + zoom + resultado
// -----------------------------------------------------------
function finishSpin(targetRel) {
  const baseWheel = wheelAngle;
  const baseBall  = baseWheel + targetRel; // bola exactamente sobre el número

  const amplitude = 0.06;
  const bounces   = 10;
  const duration  = 500;
  const start     = performance.now();

  function bounceFrame(now) {
    let t = (now - start) / duration;
    if (t > 1) t = 1;

    const damp   = 1 - t;
    const offset = Math.sin(t * bounces * Math.PI) * amplitude * damp;

    wheelAngle = baseWheel;              // ruleta ya detenida
    ballAngle  = baseBall + offset;      // pequeño rebote sobre el mismo número

    drawWheel();
    drawBall();

    if (t < 1) {
      requestAnimationFrame(bounceFrame);
    } else {
      showResult();
    }
  }

  canvasWrapper.classList.add("zoomed");
  setTimeout(() => canvasWrapper.classList.remove("zoomed"), 600);

  requestAnimationFrame(bounceFrame);
}

// -----------------------------------------------------------
//  MOSTRAR RESULTADO
// -----------------------------------------------------------
function showResult() {
  spinning = false;

  historySpan.textContent = `${winnerNumber} ${historySpan.textContent}`;

  let mensaje;
  let ganó = (winnerColor === selectedColor);

  if (ganó) {
    try { winSound.currentTime = 0; winSound.play(); } catch (e) {}
    const ganancia = (winnerColor === "verde")
      ? selectedBet * 35
      : selectedBet;
    mensaje = `¡Ganaste! Salió ${winnerNumber} (${winnerColor.toUpperCase()}) +$${ganancia}`;
  } else {
    try { loseSound.currentTime = 0; loseSound.play(); } catch (e) {}
    mensaje = `Perdiste. Salió ${winnerNumber} (${winnerColor.toUpperCase()}) -$${selectedBet}`;
  }

  actualizarResultado(mensaje);

  if (autoSpin && saldo >= selectedBet) {
    setTimeout(() => spin(true), 800);
  } else if (saldo < selectedBet) {
    autoSpin = false;
    document.getElementById("autoBtn").textContent = "AUTO SPIN: OFF";
  }
}

// -----------------------------------------------------------
//  PRIMER DIBUJO
// -----------------------------------------------------------
drawWheel();
drawBall();
actualizarResultado();


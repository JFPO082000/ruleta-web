// -----------------------------------------------------------
//     🎯 RULETA EUROPEA – CLIENTE SINCRONIZADO CON BACKEND
// -----------------------------------------------------------

// Orden de números recibido del backend
let WHEEL_ORDER = [];

// Canvas settings
const CENTER = 230;
const R_WHEEL = 215;
const R_BALL  = 150;

// Física realista
const INITIAL_WHEEL_SPEED = 0.25;   // horario
const INITIAL_BALL_SPEED  = -0.78;  // antihorario
const FRICTION_WHEEL = 0.9925;
const FRICTION_BALL  = 0.985;

// ANGULO BASE PARA QUE EL 0 QUEDE ARRIBA
const ROT_OFFSET = -Math.PI / 2;

// Canvas
const rouletteCanvas = document.getElementById("rouletteCanvas");
const ctx = rouletteCanvas.getContext("2d");

// Ball canvas
const ballCanvas = document.getElementById("ballCanvas");
const ballCtx = ballCanvas.getContext("2d");

rouletteCanvas.width = rouletteCanvas.height = 460;
ballCanvas.width = ballCanvas.height = 460;

// Estado
let wheelAngle = 0;
let ballAngle = 0;
let spinning = false;

// Juego
let selectedColor = null;
let selectedBet   = null;
let autoSpin      = false;
let saldo         = 1000;

let winnerIndex  = null;
let winnerNumber = null;
let winnerColor  = null;

// DOM
const saldoSpan   = document.getElementById("balance");
const historySpan = document.getElementById("history");
const resultDiv   = document.getElementById("resultText");

// ---------------- COLOR ----------------
document.getElementById("btnRojo").onclick  = () => selectColor("rojo");
document.getElementById("btnNegro").onclick = () => selectColor("negro");
document.getElementById("btnVerde").onclick = () => selectColor("verde");

// ---------------- FICHAS ----------------
generateChips();

function generateChips() {
    const values = [10, 20, 50, 100, 200, 500];
    const row = document.getElementById("chipsRow");

    row.innerHTML = "";

    values.forEach(v => {
        const b = document.createElement("button");
        b.className = "chip-btn";
        b.dataset.value = v;
        b.textContent = `$${v}`;
        b.onclick = () => selectBet(v);
        row.appendChild(b);
    });
}

// ---------------- SELECCIÓN COLOR ----------------
function selectColor(c) {
    selectedColor = c;

    document.querySelectorAll(".color-btn")
      .forEach(b => b.classList.remove("selected"));

    if (c === "rojo")  document.getElementById("btnRojo").classList.add("selected");
    if (c === "negro") document.getElementById("btnNegro").classList.add("selected");
    if (c === "verde") document.getElementById("btnVerde").classList.add("selected");

    updateMessage();
}

// ---------------- SELECCIÓN FICHA ----------------
function selectBet(v) {
    selectedBet = v;

    document.querySelectorAll(".chip-btn")
      .forEach(b => b.classList.remove("selected"));

    document.querySelector(`[data-value="${v}"]`).classList.add("selected");

    updateMessage();
}

// ---------------- MENSAJE ----------------
function updateMessage(msg = null) {
    if (msg) { resultDiv.textContent = msg; return; }

    if (!selectedColor && !selectedBet)
        resultDiv.textContent = "Selecciona color y apuesta…";
    else if (!selectedColor)
        resultDiv.textContent = "Selecciona un color…";
    else if (!selectedBet)
        resultDiv.textContent = "Selecciona una ficha…";
    else
        resultDiv.textContent = `Apuesta lista: ${selectedColor.toUpperCase()} $${selectedBet}`;
}

// ---------------- SPIN ----------------
document.getElementById("btnSpin").onclick = () => spin(false);
document.getElementById("btnAuto").onclick = toggleAuto;

function toggleAuto() {
    autoSpin = !autoSpin;
    document.getElementById("btnAuto").textContent =
        autoSpin ? "AUTO SPIN: ON" : "AUTO SPIN: OFF";

    if (autoSpin && !spinning) spin(true);
}

function spin(fromAuto) {
    if (spinning) return;

    if (!selectedColor || !selectedBet) {
        updateMessage();
        return;
    }

    if (saldo < selectedBet) {
        updateMessage("Saldo insuficiente.");
        autoSpin = false;
        document.getElementById("btnAuto").textContent = "AUTO SPIN: OFF";
        return;
    }

    spinning = true;
    updateMessage("Girando…");

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

        winnerIndex  = data.index;
        winnerNumber = data.number;
        winnerColor  = data.color;
        saldo        = data.newBalance;

        saldoSpan.textContent = `$${saldo}`;

        // Orden del backend para dibujar
        WHEEL_ORDER = data.wheel;

        animateSpin();
    })
    .catch(() => {
        spinning = false;
        updateMessage("Error de conexión.");
    });
}

// ---------------- ANIMACIÓN RULETA + BOLA ----------------
function animateSpin() {
    let wheelSpeed = INITIAL_WHEEL_SPEED;
    let ballSpeed  = INITIAL_BALL_SPEED;

    const slice = (2 * Math.PI) / WHEEL_ORDER.length;

    function frame() {
        wheelAngle += wheelSpeed;
        ballAngle  += ballSpeed;

        wheelSpeed *= FRICTION_WHEEL;
        ballSpeed  *= FRICTION_BALL;

        drawWheel();
        drawBall();

        // Cuando la bola está lenta → alinearla con EXACTITUD
        if (Math.abs(ballSpeed) < 0.020) {

            const target = wheelAngle + ROT_OFFSET + winnerIndex * slice;

            let diff = ((target - ballAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

            if (Math.abs(diff) < 0.025) {
                ballAngle = target;
                bounceBall(target);
                return;
            }

            ballAngle += diff * 0.09;  // ajuste suave
        }

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

// ---------------- REBOTE FINAL ----------------
function bounceBall(angle) {
    const amp = 0.045;
    const bounces = 10;
    const duration = 700;
    const start = performance.now();

    function bounce(t) {
        let k = (t - start) / duration;
        if (k > 1) k = 1;

        const decay = 1 - k;
        const offset = Math.sin(k * bounces * Math.PI) * amp * decay;

        ballAngle = angle + offset;

        drawWheel();
        drawBall();

        if (k < 1) requestAnimationFrame(bounce);
        else showResult();
    }

    requestAnimationFrame(bounce);
}

// ---------------- RESULTADO ----------------
function showResult() {
    spinning = false;

    historySpan.textContent = `${winnerNumber}  ${historySpan.textContent}`;

    if (winnerColor === selectedColor) {
        const win = (winnerColor === "verde") ? selectedBet * 35 : selectedBet;
        updateMessage(`¡Ganaste! Salió ${winnerNumber} (${winnerColor}) +$${win}`);
    } else {
        updateMessage(`Perdiste. Salió ${winnerNumber} (${winnerColor}) -$${selectedBet}`);
    }

    if (autoSpin && saldo >= selectedBet) {
        setTimeout(() => spin(true), 900);
    }
}

// ---------------- DIBUJO RULETA ----------------
function drawWheel() {
    ctx.clearRect(0,0,460,460);

    const count = WHEEL_ORDER.length;
    const slice = (2 * Math.PI) / count;

    for (let i = 0; i < count; i++) {
        const start = wheelAngle + ROT_OFFSET + i * slice;
        const end   = start + slice;

        const num = WHEEL_ORDER[i];

        const color =
            num === 0 ? "#0bb400" :
            [32,19,21,25,34,27,36,30,23,5,16,1,14,9,18,7,12,3].includes(num)
            ? "#d00000"
            : "#000";

        // Sector
        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, R_WHEEL, start, end);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Número
        ctx.save();
        ctx.translate(CENTER, CENTER);
        ctx.rotate(start + slice / 2);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillText(num, R_WHEEL - 40, 8);
        ctx.restore();
    }
}

// ---------------- DIBUJO BOLA ----------------
function drawBall() {
    ballCtx.clearRect(0,0,460,460);

    const x = CENTER + Math.cos(ballAngle) * R_BALL;
    const y = CENTER + Math.sin(ballAngle) * R_BALL;

    ballCtx.beginPath();
    ballCtx.arc(x, y, 10, 0, Math.PI*2);
    ballCtx.fillStyle = "#fff";
    ballCtx.fill();
}

// ---------------- PRIMER FRAME ----------------
updateMessage();
drawWheel();
drawBall();

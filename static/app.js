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

rgbCanvas.width = rouletteCanvas.width = ballCanvas.width = 420;
rgbCanvas.height = rouletteCanvas.height = ballCanvas.height = 420;

const CENTER = 210;
const R_WHEEL = 200;
const R_BALL = 135;

// -----------------------------------------------------------
//  ESTADO DEL JUEGO
// -----------------------------------------------------------
let wheelAngle = 0;
let ballAngle  = 0;
let spinning   = false;

let saldo = 1000;
let selectedColor = null;
let selectedBet   = null;
let autoSpin      = false;

let winnerIndex = null;
let winnerNumber = null;
let winnerColor  = null;

const saldoSpan = document.getElementById("saldo");
const historySpan = document.getElementById("history");
const resultDiv = document.getElementById("result");
const canvasWrapper = document.getElementById("canvasWrapper");

// -----------------------------------------------------------
//  DIBUJO RULETA
// -----------------------------------------------------------
function drawWheel() {
    ctx.clearRect(0, 0, 420, 420);

    const slice = SLICE_ANGLE;

    for (let i = 0; i < SLICES; i++) {
        const start = wheelAngle + i * slice;
        const end = start + slice;
        const num = NUMBERS[i];

        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, R_WHEEL, start, end);
        ctx.closePath();

        const col = getColor(num);
        ctx.fillStyle =
            col === "rojo" ? "#d00000" :
            col === "negro" ? "#000" :
            "#0a8a0a";
        ctx.fill();

        // Número
        ctx.save();
        ctx.translate(CENTER, CENTER);
        ctx.rotate(start + slice / 2);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(num, R_WHEEL - 35, 8);
        ctx.restore();
    }
}

// -----------------------------------------------------------
//  DIBUJO RGB
// -----------------------------------------------------------
function drawRGB() {
    rgbCtx.clearRect(0, 0, 420, 420);

    const segments = 180;
    const ringRadius = R_WHEEL + 6;
    const time = performance.now() / 6;

    for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;

        const hue = (i * 3 + time) % 360;

        rgbCtx.strokeStyle = `hsl(${hue}, 90%, 60%)`;
        rgbCtx.lineWidth = 4;

        rgbCtx.beginPath();
        rgbCtx.arc(CENTER, CENTER, ringRadius, a1, a2);
        rgbCtx.stroke();
    }

    requestAnimationFrame(drawRGB);
}
drawRGB();

// -----------------------------------------------------------
//  DIBUJO BOLA
// -----------------------------------------------------------
function drawBall() {
    ballCtx.clearRect(0, 0, 420, 420);

    const x = CENTER + Math.cos(ballAngle) * R_BALL;
    const y = CENTER + Math.sin(ballAngle) * R_BALL;

    ballCtx.beginPath();
    ballCtx.arc(x, y, 10, 0, Math.PI * 2);
    ballCtx.fillStyle = "#fff";
    ballCtx.fill();
}

// -----------------------------------------------------------
//  SELECCIÓN
// -----------------------------------------------------------
document.querySelectorAll(".color-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedColor = btn.dataset.color;
        actualizarResultado();
    };
});

document.querySelectorAll(".chip-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedBet = parseInt(btn.dataset.value);
        actualizarResultado();
    };
});

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
    if (msg) return (resultDiv.textContent = msg);

    if (!selectedColor && !selectedBet)
        return resultDiv.textContent = "Selecciona color y apuesta…";
    if (!selectedColor)
        return resultDiv.textContent = "Selecciona un color…";
    if (!selectedBet)
        return resultDiv.textContent = "Selecciona una ficha…";

    resultDiv.textContent = `Apuesta lista: ${selectedColor.toUpperCase()} $${selectedBet}`;
}

// -----------------------------------------------------------
//  ENVÍO AL BACKEND
// -----------------------------------------------------------
function spin(autoCall) {
    if (spinning) return;

    if (!selectedColor || !selectedBet) return actualizarResultado();

    if (saldo < selectedBet) {
        actualizarResultado("Saldo insuficiente.");
        autoSpin = false;
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
        winnerIndex = data.index;
        winnerNumber = data.number;
        winnerColor  = data.color;
        saldo = data.newBalance;

        saldoSpan.textContent = `$${saldo}`;
        animateSpin();
    });
}

// -----------------------------------------------------------
//  ANIMACIÓN
// -----------------------------------------------------------
function animateSpin() {
    const target = winnerIndex * SLICE_ANGLE + SLICE_ANGLE / 2;

    const startWheel = wheelAngle;
    const startBall = ballAngle;

    const extraW = 5 * Math.PI * 2;
    const extraB = 9 * Math.PI * 2;

    const finalWheel = startWheel + extraW;
    const finalBall = 
        startBall + extraW + (target - ((startBall - startWheel) % (Math.PI*2))) + extraB;

    const duration = 3800;
    const start = performance.now();

    function easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function frame(now) {
        let t = (now - start) / duration;
        if (t > 1) t = 1;

        const e = easeOut(t);

        wheelAngle = startWheel + extraW * e;
        ballAngle = startBall + (finalBall - startBall) * e;

        drawWheel();
        drawBall();

        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            finishSpin();
        }
    }

    requestAnimationFrame(frame);
}

// -----------------------------------------------------------
//  FINAL (rebote + resultado)
// -----------------------------------------------------------
function finishSpin() {
    const base = ballAngle;
    const amp = 0.05;
    const bounce = 8;
    const duration = 500;

    const start = performance.now();

    function frame(now) {
        let t = (now - start) / duration;
        if (t > 1) t = 1;

        const d = 1 - t;
        const offset = Math.sin(t * bounce * Math.PI) * amp * d;

        ballAngle = base + offset;

        drawWheel();
        drawBall();

        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            showResult();
        }
    }

    canvasWrapper.classList.add("zoomed");
    setTimeout(() => canvasWrapper.classList.remove("zoomed"), 600);

    requestAnimationFrame(frame);
}

// -----------------------------------------------------------
//  RESULTADO FINAL
// -----------------------------------------------------------
function showResult() {
    spinning = false;

    historySpan.textContent = winnerNumber + " " + historySpan.textContent;

    if (winnerColor === selectedColor) {
        actualizarResultado(`¡Ganaste! Salió ${winnerNumber} (${winnerColor.toUpperCase()}) +$${selectedBet}`);
    } else {
        actualizarResultado(`Perdiste. Salió ${winnerNumber} (${winnerColor.toUpperCase()}) -$${selectedBet}`);
    }

    if (autoSpin && saldo >= selectedBet) {
        setTimeout(() => spin(true), 800);
    }
}

// -----------------------------------------------------------
//  PRIMER DIBUJO
// -----------------------------------------------------------
drawWheel();
drawBall();
actualizarResultado();

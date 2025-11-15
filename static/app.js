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
    const rojos = [32,19,21,25,34,27,36,30,23,5,16,1,14,9,18,7,12,3];
    return rojos.includes(num) ? "rojo" : "negro";
}

// -----------------------------------------------------------
// CANVAS
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
const R_BALL = 120;

// -----------------------------------------------------------
// ESTADO DEL JUEGO
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

const spinSound = new Audio("/static/sounds/spin.mp3");
const winSound  = new Audio("/static/sounds/win.mp3");
const loseSound = new Audio("/static/sounds/lose.mp3");

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
        const col = getColor(num);

        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, R_WHEEL, start, end);
        ctx.closePath();

        ctx.fillStyle =
            col === "rojo" ? "#d00000" :
            col === "negro" ? "#000" :
            "#0a8a0a";
        ctx.fill();

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
//  DIBUJO BOLA
// -----------------------------------------------------------
function drawBall() {
    ballCtx.clearRect(0, 0, 420, 420);

    const x = CENTER + Math.cos(ballAngle) * R_BALL;
    const y = CENTER + Math.sin(ballAngle) * R_BALL;

    ballCtx.beginPath();
    ballCtx.arc(x, y, 11, 0, Math.PI * 2);
    ballCtx.fillStyle = "#fff";
    ballCtx.fill();
}

// -----------------------------------------------------------
// ANILLO RGB GIRATORIO
// -----------------------------------------------------------
function drawRGB() {
    rgbCtx.clearRect(0,0,420,420);

    const segments = 140;
    const time = performance.now() / 7;
    const ringRadius = R_WHEEL + 4;

    for (let i = 0; i < segments; i++) {
        const start = (i / segments) * Math.PI * 2;
        const end = ((i + 1) / segments) * Math.PI * 2;

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
// BOTONES DE COLOR
// -----------------------------------------------------------
document.querySelectorAll(".color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedColor = btn.dataset.color;
        actualizarResultado();
    });
});

// -----------------------------------------------------------
// BOTONES DE FICHAS
// -----------------------------------------------------------
document.querySelectorAll(".chip-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedBet = parseInt(btn.dataset.value);
        actualizarResultado();
    });
});

// -----------------------------------------------------------
// BOTONES GIRAR Y AUTO
// -----------------------------------------------------------
document.getElementById("spinBtn").onclick = () => spin(false);

document.getElementById("autoBtn").onclick = () => {
    autoSpin = !autoSpin;
    document.getElementById("autoBtn").textContent =
        autoSpin ? "AUTO SPIN: ON" : "AUTO SPIN: OFF";
    if (autoSpin && !spinning) spin(true);
};

// -----------------------------------------------------------
// TEXTO DE RESULTADO
// -----------------------------------------------------------
function actualizarResultado(msg) {
    if (msg) return resultDiv.textContent = msg;

    if (!selectedColor && !selectedBet) resultDiv.textContent = "Selecciona color y apuesta…";
    else if (!selectedColor) resultDiv.textContent = "Selecciona un color…";
    else if (!selectedBet) resultDiv.textContent = "Selecciona una ficha…";
    else resultDiv.textContent =
        `Apuesta lista: ${selectedColor.toUpperCase()} $${selectedBet}`;
}

// -----------------------------------------------------------
// SPIN (con backend)
// -----------------------------------------------------------
function spin(autoCall) {
    if (spinning) return;
    if (!selectedColor || !selectedBet) return actualizarResultado();
    if (saldo < selectedBet) {
        autoSpin = false;
        return actualizarResultado("Saldo insuficiente.");
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
            return actualizarResultado(data.error);
        }

        winnerIndex = data.index;
        winnerNumber = data.number;
        winnerColor = data.color;

        saldo = data.newBalance;
        saldoSpan.textContent = `$${saldo}`;

        animateSpin();
    });
}

// -----------------------------------------------------------
// ANIMACIÓN RUEDA + BOLA
// -----------------------------------------------------------
function animateSpin() {
    try { spinSound.play(); } catch(e){}

    const target = winnerIndex * SLICE_ANGLE + SLICE_ANGLE / 2;

    const startWheel = wheelAngle;
    const startBall = ballAngle;

    const extraTurnsWheel = 3 * Math.PI * 2;
    const extraTurnsBall  = 6 * Math.PI * 2;

    const rel0 = ((startBall - startWheel) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
    const baseRelDelta = target - rel0;
    const totalBallDelta = extraTurnsWheel + baseRelDelta + extraTurnsBall;

    const duration = 3200;
    const start = performance.now();

    function easeOut(t){ return 1 - Math.pow(1-t, 3); }

    function frame(now){
        let t = (now - start) / duration;
        if (t > 1) t = 1;

        let e = easeOut(t);

        wheelAngle = startWheel + extraTurnsWheel * e;
        ballAngle  = startBall  + totalBallDelta * e;

        drawWheel();
        drawBall();

        if (t < 1) requestAnimationFrame(frame);
        else finishSpin();
    }

    requestAnimationFrame(frame);
}

// -----------------------------------------------------------
// FINAL: rebote + zoom + mostrar resultado
// -----------------------------------------------------------
function finishSpin() {

    const base = ballAngle;
    const amp = 0.06;
    const bounce = 12;
    const duration = 600;
    const start = performance.now();

    function frame(now){
        let t = (now - start) / duration;
        if (t > 1) t = 1;

        let damp = 1 - t;
        let off = Math.sin(t * bounce * Math.PI) * amp * damp;

        ballAngle = base + off;

        drawWheel();
        drawBall();

        if (t < 1) requestAnimationFrame(frame);
        else showResult();
    }

    canvasWrapper.classList.add("zoomed");
    setTimeout(() => canvasWrapper.classList.remove("zoomed"), 800);

    requestAnimationFrame(frame);
}

// -----------------------------------------------------------
// MOSTRAR RESULTADO FINAL
// -----------------------------------------------------------
function showResult() {
    spinning = false;

    historySpan.textContent = winnerNumber + " " + historySpan.textContent;

    if (winnerColor === selectedColor) {
        try { winSound.play(); } catch(e){}
        actualizarResultado(`¡Ganaste! Salió ${winnerNumber} (${winnerColor}) +$${selectedBet}`);
    } else {
        try { loseSound.play(); } catch(e){}
        actualizarResultado(`Perdiste. Salió ${winnerNumber} (${winnerColor}) -$${selectedBet}`);
    }

    if (autoSpin && saldo >= selectedBet) {
        setTimeout(() => spin(true), 800);
    }
}

// -----------------------------------------------------------
// PRIMER DIBUJO
// -----------------------------------------------------------
drawWheel();
drawBall();
actualizarResultado();


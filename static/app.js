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

function getColor(n) {
    if (n === 0) return "verde";
    const rojos = [
        32,19,21,25,34,27,36,30,23,
        5,16,1,14,9,18,7,12,3
    ];
    return rojos.includes(n) ? "rojo" : "negro";
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

rgbCanvas.width = 420;
rgbCanvas.height = 420;
rouletteCanvas.width = 420;
rouletteCanvas.height = 420;
ballCanvas.width = 420;
ballCanvas.height = 420;

const CENTER = 210;
const R_WHEEL = 200;
const R_BALL = 125;

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
// RUEDA
// -----------------------------------------------------------
function drawWheel() {
    ctx.clearRect(0,0,420,420);

    for (let i = 0; i < SLICES; i++) {
        const start = wheelAngle + i * SLICE_ANGLE;
        const end = start + SLICE_ANGLE;

        const n = NUMBERS[i];
        const color = getColor(n);

        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, R_WHEEL, start, end);
        ctx.closePath();

        ctx.fillStyle =
            color === "rojo"  ? "#d00000" :
            color === "negro" ? "#000" :
                                "#0a8a0a";

        ctx.fill();

        // número
        ctx.save();
        ctx.translate(CENTER, CENTER);
        ctx.rotate(start + SLICE_ANGLE / 2);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(n, R_WHEEL - 35, 7);
        ctx.restore();
    }
}

// -----------------------------------------------------------
// BOLA
// -----------------------------------------------------------
function drawBall() {
    ballCtx.clearRect(0,0,420,420);

    const x = CENTER + Math.cos(ballAngle) * R_BALL;
    const y = CENTER + Math.sin(ballAngle) * R_BALL;

    ballCtx.beginPath();
    ballCtx.arc(x, y, 10, 0, Math.PI * 2);
    ballCtx.fillStyle = "#fff";
    ballCtx.fill();
}

// -----------------------------------------------------------
// RGB RING
// -----------------------------------------------------------
function drawRGB() {
    rgbCtx.clearRect(0,0,420,420);

    const seg = 160;
    const time = performance.now() / 6;
    const radius = R_WHEEL + 4;

    for (let i = 0; i < seg; i++) {
        const start = (i/seg) * Math.PI * 2;
        const end   = ((i+1)/seg) * Math.PI * 2;

        const hue = (i*3 + time) % 360;

        rgbCtx.strokeStyle = `hsl(${hue}, 100%, 55%)`;
        rgbCtx.lineWidth = 4;
        rgbCtx.beginPath();
        rgbCtx.arc(CENTER, CENTER, radius, start, end);
        rgbCtx.stroke();
    }

    requestAnimationFrame(drawRGB);
}
drawRGB();

// -----------------------------------------------------------
// EVENTOS
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
// MENSAJE
// -----------------------------------------------------------
function actualizarResultado(msg=null) {
    if (msg) {
        resultDiv.textContent = msg;
        return;
    }
    if (!selectedColor)
        resultDiv.textContent = "Selecciona un color…";
    else if (!selectedBet)
        resultDiv.textContent = "Selecciona una apuesta…";
    else
        resultDiv.textContent = `Apuesta lista: ${selectedColor.toUpperCase()} $${selectedBet}`;
}

// -----------------------------------------------------------
// SPIN — CÁLCULO SIMPLE Y CORRECTO
// -----------------------------------------------------------
function spin(autoCall) {
    if (spinning) return;

    if (!selectedColor || !selectedBet)
        return actualizarResultado();

    if (saldo < selectedBet) {
        actualizarResultado("Saldo insuficiente");
        autoSpin = false;
        return;
    }

    spinning = true;
    resultDiv.textContent = "Girando…";

    fetch("/api/spin", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
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

        winnerIndex  = data.index;
        winnerNumber = data.number;
        winnerColor  = data.color;
        saldo        = data.newBalance;
        saldoSpan.textContent = `$${saldo}`;

        animateSpin();
    });
}

// -----------------------------------------------------------
// ANIMACIÓN
// -----------------------------------------------------------
function animateSpin() {
    try { spinSound.play(); } catch(e){}

    const extraWheel = 4 * Math.PI * 2;  
    const extraBall  = 8 * Math.PI * 2;  

    const targetAngle = winnerIndex * SLICE_ANGLE + SLICE_ANGLE/2;

    const startWheel = wheelAngle;
    const startBall  = ballAngle;

    const finalWheel = startWheel + extraWheel;
    const finalBall  = startBall + extraBall + targetAngle;

    const duration = 3500;
    const startTime = performance.now();

    function ease(t){ return 1 - Math.pow(1-t, 3); }

    function frame(now) {
        let t = (now-startTime) / duration;
        if (t>1) t=1;

        const e = ease(t);

        wheelAngle = startWheel + (finalWheel-startWheel) * e;
        ballAngle  = startBall  + (finalBall -startBall)  * e;

        drawWheel();
        drawBall();

        if (t<1) requestAnimationFrame(frame);
        else finishSpin();
    }

    requestAnimationFrame(frame);
}

// -----------------------------------------------------------
// FINAL SPIN
// -----------------------------------------------------------
function finishSpin() {

    const base = ballAngle;
    const amp = 0.05;
    const bounces = 12;
    const duration = 500;
    const startTime = performance.now();

    function frame(now){

        let t = (now-startTime)/duration;
        if (t>1) t=1;

        const d = 1-t;
        const offset = Math.sin(t*bounces*Math.PI) * amp * d;

        ballAngle = base + offset;

        drawWheel();
        drawBall();

        if (t<1) requestAnimationFrame(frame);
        else showResult();
    }

    canvasWrapper.classList.add("zoomed");
    setTimeout(()=>canvasWrapper.classList.remove("zoomed"),600);

    requestAnimationFrame(frame);
}

// -----------------------------------------------------------
// RESULTADO
// -----------------------------------------------------------
function showResult(){

    spinning = false;

    historySpan.textContent = winnerNumber + " " + historySpan.textContent;

    if (winnerColor === selectedColor){
        try { winSound.play(); } catch(e){}
        actualizarResultado(`¡Ganaste! Salió ${winnerNumber} (${winnerColor.toUpperCase()}) +$${selectedBet}`);
    } else {
        try { loseSound.play(); } catch(e){}
        actualizarResultado(`Perdiste. Salió ${winnerNumber} (${winnerColor.toUpperCase()}) -$${selectedBet}`);
    }

    if (autoSpin && saldo >= selectedBet){
        setTimeout(()=> spin(true),800);
    }
}

// -----------------------------------------------------------
// PRIMER FRAME
// -----------------------------------------------------------
drawWheel();
drawBall();
actualizarResultado();


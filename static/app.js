// -----------------------------------------------------------
//  RULETA EUROPEA – CLIENTE SINCRONIZADO CON BACKEND
// -----------------------------------------------------------

// Orden de números (valor inicial por si el backend tarda)
let WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6,
    27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
    16, 33, 1, 20, 14, 31, 9, 22, 18, 29,
    7, 28, 12, 35, 3, 26
];

// Coordenadas generales
const CENTER = 210;
const R_WHEEL = 200;
const R_BALL = 132;

// Velocidades realistas
const INITIAL_WHEEL_SPEED = 0.22;
const INITIAL_BALL_SPEED = -0.82;

const FRICTION_WHEEL = 0.9925;
const FRICTION_BALL = 0.985;

// Canvas
const rouletteCanvas = document.getElementById("rouletteCanvas");
const ctx = rouletteCanvas.getContext("2d");

// Bola en otro canvas (para estética)
const ballCanvas = document.getElementById("ballCanvas");
const ballCtx = ballCanvas.getContext("2d");

let wheelAngle = 0;
let ballAngle = 0;
let spinning = false;

// Estado juego
let saldo = 1000;
let selectedColor = null;
let selectedBet = null;
let autoSpin = false;

let winnerIndex = null;
let winnerNumber = null;
let winnerColor = null;

// DOM
const saldoSpan = document.getElementById("balance");
const historySpan = document.getElementById("history");
const resultDiv = document.getElementById("resultText");

// Botones color
document.getElementById("btnRojo").onclick = () => selectColor("rojo");
document.getElementById("btnNegro").onclick = () => selectColor("negro");
document.getElementById("btnVerde").onclick = () => selectColor("verde");

// Fichas dinámicas
generateChips();

// Spin
document.getElementById("btnSpin").onclick = () => spin(false);
document.getElementById("btnAuto").onclick = toggleAuto;


// -----------------------------------------------------------
//  GENERAR FICHAS (APUESTAS)
// -----------------------------------------------------------
function generateChips() {
    const values = [5, 10, 25, 50, 100, 200, 500];
    const row = document.getElementById("chipsRow");
    row.innerHTML = "";

    values.forEach(v => {
        let b = document.createElement("button");
        b.className = "chip-btn";
        b.dataset.value = v;
        b.textContent = `$${v}`;
        b.onclick = () => selectBet(v);
        row.appendChild(b);
    });
}


// -----------------------------------------------------------
// SELECCIÓN COLOR Y APUESTA
// -----------------------------------------------------------
function selectColor(c) {
    selectedColor = c;
    document.querySelectorAll(".btn.color").forEach(b => b.classList.remove("selected"));

    if (c === "rojo") document.getElementById("btnRojo").classList.add("selected");
    if (c === "negro") document.getElementById("btnNegro").classList.add("selected");
    if (c === "verde") document.getElementById("btnVerde").classList.add("selected");

    updateMessage();
}

function selectBet(v) {
    selectedBet = v;
    document.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("selected"));
    [...document.querySelectorAll(".chip-btn")].find(b => b.dataset.value == v).classList.add("selected");
    updateMessage();
}


// -----------------------------------------------------------
// MENSAJE
// -----------------------------------------------------------
function updateMessage(msg = null) {
    if (msg) return resultDiv.textContent = msg;

    if (!selectedColor && !selectedBet)
        return resultDiv.textContent = "Selecciona color y apuesta…";

    if (!selectedColor)
        return resultDiv.textContent = "Selecciona un color…";

    if (!selectedBet)
        return resultDiv.textContent = "Selecciona una ficha…";

    resultDiv.textContent = `Apuesta lista: ${selectedColor.toUpperCase()} $${selectedBet}`;
}


// -----------------------------------------------------------
// BOTÓN AUTO SPIN
// -----------------------------------------------------------
function toggleAuto() {
    autoSpin = !autoSpin;
    document.getElementById("btnAuto").textContent =
        autoSpin ? "AUTO SPIN: ON" : "AUTO SPIN: OFF";

    if (autoSpin && !spinning) spin(true);
}


// -----------------------------------------------------------
// ENVIAR PETICIÓN AL BACKEND
// -----------------------------------------------------------
function spin(fromAuto) {
    if (spinning) return;

    if (!selectedColor || !selectedBet) {
        updateMessage();
        return;
    }

    if (saldo < selectedBet) {
        updateMessage("Saldo insuficiente.");
        autoSpin = false;
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
        WHEEL_ORDER = data.wheel; // <<--- AHORA VIENE DEL BACKEND
        winnerIndex = data.index;
        winnerNumber = data.number;
        winnerColor = data.color;
        saldo = data.newBalance;

        saldoSpan.textContent = `$${saldo}`;

        animateSpin();
    })
    .catch(() => {
        spinning = false;
        updateMessage("Error de conexión.");
    });
}


// -----------------------------------------------------------
// ANIMACIÓN REALISTA DE RULETA + BOLA
// -----------------------------------------------------------
function animateSpin() {

    let wheelSpeed = INITIAL_WHEEL_SPEED;
    let ballSpeed = INITIAL_BALL_SPEED;

    function frame() {

        wheelAngle += wheelSpeed;
        ballAngle += ballSpeed;

        wheelSpeed *= FRICTION_WHEEL;
        ballSpeed *= FRICTION_BALL;

        drawWheel();
        drawBall();

        // Bola desacelerando → buscar caída exacta
        if (Math.abs(ballSpeed) < 0.015) {
            const slice = (Math.PI * 2) / WHEEL_ORDER.length;
            const targetAngle = winnerIndex * slice - Math.PI / 2;
            let diff = (targetAngle - ballAngle) % (Math.PI * 2);

            if (Math.abs(diff) < 0.03) {
                ballAngle = targetAngle;
                bounceBall(targetAngle);
                return;
            }

            ballAngle += diff * 0.08;
        }

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}


// -----------------------------------------------------------
// REBOTE FINAL DE BOLA
// -----------------------------------------------------------
function bounceBall(finalAngle) {
    const amp = 0.05;
    const bounce = 12;
    const duration = 680;
    const start = performance.now();

    function animate(now) {
        let t = (now - start) / duration;
        if (t > 1) t = 1;

        let decay = 1 - t;
        let offset = Math.sin(t * bounce * Math.PI) * amp * decay;

        ballAngle = finalAngle + offset;

        drawWheel();
        drawBall();

        if (t < 1) requestAnimationFrame(animate);
        else showResult();
    }

    requestAnimationFrame(animate);
}


// -----------------------------------------------------------
// MOSTRAR RESULTADO FINAL
// -----------------------------------------------------------
function showResult() {

    spinning = false;

    historySpan.textContent = `${winnerNumber} ` + historySpan.textContent;

    if (winnerColor === selectedColor) {
        let gain = winnerColor === "verde" ? selectedBet * 35 : selectedBet;
        updateMessage(`¡Ganaste! Salió ${winnerNumber} (${winnerColor})  +$${gain}`);
    } else {
        updateMessage(`Perdiste. Salió ${winnerNumber} (${winnerColor})  -$${selectedBet}`);
    }

    if (autoSpin && saldo >= selectedBet) {
        setTimeout(() => spin(true), 900);
    }
}


// -----------------------------------------------------------
// DIBUJO RULETA
// -----------------------------------------------------------
function drawWheel() {
    ctx.clearRect(0, 0, 420, 420);

    const slices = WHEEL_ORDER.length;
    const sliceAngle = (Math.PI * 2) / slices;

    for (let i = 0; i < slices; i++) {
        const start = wheelAngle + i * sliceAngle - Math.PI / 2;
        const end = start + sliceAngle;
        const num = WHEEL_ORDER[i];

        const color =
            num === 0 ? "#0bb400" :
            [32,19,21,25,34,27,36,30,23,5,16,1,14,9,18,7,12,3].includes(num)
            ? "#d00000"
            : "#000";

        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, R_WHEEL, start, end);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.save();
        ctx.translate(CENTER, CENTER);
        ctx.rotate(start + sliceAngle / 2);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(num, R_WHEEL - 36, 8);
        ctx.restore();
    }
}


// -----------------------------------------------------------
// DIBUJO BOLA
// -----------------------------------------------------------
function drawBall() {
    ballCtx.clearRect(0, 0, 420, 420);

    const x = CENTER + Math.cos(ballAngle) * R_BALL;
    const y = CENTER + Math.sin(ballAngle) * R_BALL;

    ballCtx.beginPath();
    ballCtx.arc(x, y, 12, 0, Math.PI * 2);
    ballCtx.fillStyle = "#fff";
    ballCtx.fill();
}


// -----------------------------------------------------------
// DIBUJO INICIAL
// -----------------------------------------------------------
drawWheel();
drawBall();
updateMessage();

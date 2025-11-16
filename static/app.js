// -----------------------------------------------------------
//     🔵 RULETA EUROPEA – CLIENTE SINCRONIZADO CON EL BACKEND
// -----------------------------------------------------------

// Los números vendrán del backend → se almacenan aquí:
let WHEEL_ORDER = [];

// Coordenadas generales
const CENTER = 210;
const R_WHEEL = 200;
const R_BALL  = 132;  // radio exacto donde cae la bola

// Velocidades base (natural casino)
const INITIAL_WHEEL_SPEED = 0.22;   // horario
const INITIAL_BALL_SPEED  = -0.82;  // antihorario

// Fricciones físicas realistas
const FRICTION_WHEEL = 0.9925;
const FRICTION_BALL  = 0.985;

// Canvas
const rouletteCanvas = document.getElementById("rouletteCanvas");
const ctx = rouletteCanvas.getContext("2d");

const ballCanvas = document.createElement("canvas");
ballCanvas.width = ballCanvas.height = 420;
ballCanvas.style.position = "absolute";
ballCanvas.style.left = "0";
ballCanvas.style.top  = "0";
document.getElementById("canvasWrapper").appendChild(ballCanvas);
const ballCtx = ballCanvas.getContext("2d");

// Animación
let wheelAngle = 0;
let ballAngle = 0;
let spinning = false;

// Estado de juego
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

// Fichas
generateChips();

// Spin
document.getElementById("btnSpin").onclick = () => spin(false);
document.getElementById("btnAuto").onclick = toggleAuto;


// -----------------------------------------------------------
//  GENERAR FICHAS
// -----------------------------------------------------------
function generateChips() {
    const chipValues = [5, 10, 25, 50, 100, 200, 500];
    const container = document.getElementById("chipsRow");
    container.innerHTML = "";

    chipValues.forEach(v => {
        const b = document.createElement("button");
        b.className = "btn chip";
        b.textContent = `$${v}`;
        b.dataset.value = v;
        b.onclick = () => selectBet(v);
        container.appendChild(b);
    });
}


// -----------------------------------------------------------
//  SELECCIÓN COLOR Y APUESTA
// -----------------------------------------------------------
function selectColor(c) {
    document.querySelectorAll(".btn.color").forEach(b => b.classList.remove("selected"));
    document.querySelector(`[data-color="${c}"]`);
    selectedColor = c;

    if (c === "rojo") document.getElementById("btnRojo").classList.add("selected");
    if (c === "negro") document.getElementById("btnNegro").classList.add("selected");
    if (c === "verde") document.getElementById("btnVerde").classList.add("selected");

    updateMessage();
}

function selectBet(v) {
    selectedBet = v;
    document.querySelectorAll(".btn.chip").forEach(b => b.classList.remove("selected"));
    [...document.querySelectorAll(".btn.chip")].find(b => b.dataset.value == v).classList.add("selected");
    updateMessage();
}


// -----------------------------------------------------------
//  MENSAJE
// -----------------------------------------------------------
function updateMessage(msg=null) {
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


// -----------------------------------------------------------
//  ENVIAR GIRO AL BACKEND
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
        WHEEL_ORDER = data.wheel;
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
//  ANIMACIÓN REALISTA DE CASINO
// -----------------------------------------------------------
function animateSpin() {

    let wheelSpeed = INITIAL_WHEEL_SPEED;   // horario
    let ballSpeed  = INITIAL_BALL_SPEED;    // antihorario

    function frame() {

        wheelAngle += wheelSpeed;
        ballAngle  += ballSpeed;

        // fricción
        wheelSpeed *= FRICTION_WHEEL;
        ballSpeed  *= FRICTION_BALL;

        drawWheel();
        drawBall();

        // cuando la bola ya está lenta, preparar caída exacta
        if (Math.abs(ballSpeed) < 0.015) {
            const targetAngle = (winnerIndex * (2 * Math.PI / WHEEL_ORDER.length)) - Math.PI / 2;
            const diff = (targetAngle - ballAngle) % (Math.PI * 2);

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
//  REBOTE FINAL DE LA BOLA (real)
–-----------------------------------------------------------
function bounceBall(finalAngle) {

    const amp = 0.05;
    const bounces = 12;
    const duration = 700;
    const start = performance.now();

    function bounce(now) {
        let t = (now - start) / duration;
        if (t > 1) t = 1;

        const decay = 1 - t;
        const offset = Math.sin(t * bounces * Math.PI) * amp * decay;

        ballAngle = finalAngle + offset;

        drawWheel();
        drawBall();

        if (t < 1) requestAnimationFrame(bounce);
        else showResult();
    }

    requestAnimationFrame(bounce);
}


// -----------------------------------------------------------
//  MOSTRAR RESULTADO
// -----------------------------------------------------------
function showResult() {

    spinning = false;

    historySpan.textContent = `${winnerNumber} ` + historySpan.textContent;

    if (winnerColor === selectedColor) {
        let gain = (winnerColor === "verde") ? selectedBet * 35 : selectedBet;
        updateMessage(`¡Ganaste! Salió ${winnerNumber} (${winnerColor})  +$${gain}`);
    } else {
        updateMessage(`Perdiste. Salió ${winnerNumber} (${winnerColor})  -$${selectedBet}`);
    }

    if (autoSpin && saldo >= selectedBet) {
        setTimeout(() => spin(true), 800);
    }
}


// -----------------------------------------------------------
//  DIBUJO DE RULETA
// -----------------------------------------------------------
function drawWheel() {
    ctx.clearRect(0,0,420,420);

    const slices = WHEEL_ORDER.length;
    const anglePerSlice = (Math.PI * 2) / slices;

    for (let i=0; i<slices; i++) {

        const start = wheelAngle + i * anglePerSlice - Math.PI / 2;
        const end   = start + anglePerSlice;

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

        // número
        ctx.save();
        ctx.translate(CENTER, CENTER);
        ctx.rotate(start + anglePerSlice / 2);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(num, R_WHEEL - 36, 8);
        ctx.restore();
    }
}


// -----------------------------------------------------------
//  DIBUJO DE BOLA
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
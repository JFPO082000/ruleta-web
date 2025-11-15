// ------------------------------------------
// CONFIGURACIÓN RULETA EUROPEA
// ------------------------------------------
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

// ------------------------------------------
// CANVAS
// ------------------------------------------
const rouletteCanvas = document.getElementById("rouletteCanvas");
const ballCanvas = document.getElementById("ballCanvas");
const ctx = rouletteCanvas.getContext("2d");
const ballCtx = ballCanvas.getContext("2d");

rouletteCanvas.width = rouletteCanvas.height = 420;
ballCanvas.width = ballCanvas.height = 420;

const CENTER = 210;
const R_WHEEL = 200;
const R_BALL = 165;

// ------------------------------------------
// ESTADO DEL JUEGO
// ------------------------------------------
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

// Sonidos (opcionales)
const spinSound = new Audio("/static/sounds/spin.mp3");
const winSound  = new Audio("/static/sounds/win.mp3");
const loseSound = new Audio("/static/sounds/lose.mp3");

// ------------------------------------------
// DIBUJO RULETA + BOLA
// ------------------------------------------
function drawWheel() {
    ctx.clearRect(0,0,420,420);
    const slice = SLICE_ANGLE;

    for (let i = 0; i < SLICES; i++) {
        const start = wheelAngle + i * slice;
        const end   = start + slice;
        const n = NUMBERS[i];
        const colorSector = getColor(n);

        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, R_WHEEL, start, end);
        ctx.closePath();

        if (colorSector === "rojo") ctx.fillStyle = "#d00000";
        else if (colorSector === "negro") ctx.fillStyle = "#000";
        else ctx.fillStyle = "#0a8a0a";

        ctx.fill();

        // número
        ctx.save();
        ctx.translate(CENTER, CENTER);
        ctx.rotate(start + slice / 2);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(n.toString(), R_WHEEL - 35, 8);
        ctx.restore();
    }
}

function drawBall() {
    ballCtx.clearRect(0,0,420,420);
    const x = CENTER + Math.cos(ballAngle) * R_BALL;
    const y = CENTER + Math.sin(ballAngle) * R_BALL;

    ballCtx.beginPath();
    ballCtx.arc(x, y, 11, 0, Math.PI * 2);
    ballCtx.fillStyle = "#fff";
    ballCtx.fill();
}

// ------------------------------------------
// ENTRADA: BOTONES DE COLOR Y APUESTA
// ------------------------------------------
document.querySelectorAll(".color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedColor = btn.dataset.color;
        actualizarResultado();
    });
});

document.querySelectorAll(".chip-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedBet = parseInt(btn.dataset.value);
        actualizarResultado();
    });
});

document.getElementById("spinBtn").addEventListener("click", () => {
    spin(false);
});

document.getElementById("autoBtn").addEventListener("click", () => {
    autoSpin = !autoSpin;
    document.getElementById("autoBtn").textContent = autoSpin ? "AUTO SPIN: ON" : "AUTO SPIN: OFF";
    if (autoSpin && !spinning) spin(true);
});

// ------------------------------------------
// MENSAJE PREVIO
// ------------------------------------------
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
        resultDiv.textContent = `Listo para girar – Color: ${selectedColor.toUpperCase()}, Apuesta: $${selectedBet}`;
    }
}

// ------------------------------------------
// SPIN – ANIMACIÓN CON RESULTADO PRECISO
// ------------------------------------------
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
    try { spinSound.currentTime = 0; spinSound.play(); } catch(e){}

    // Elegimos un índice ganador al azar
    winnerIndex = Math.floor(Math.random() * SLICES);
    winnerNumber = NUMBERS[winnerIndex];
    winnerColor = getColor(winnerNumber);

    // Calculamos el ángulo relativo deseado al final
    const relTarget = winnerIndex * SLICE_ANGLE + SLICE_ANGLE / 2;

    // Estado inicial
    const startWheel = wheelAngle;
    const startBall  = ballAngle;

    const rel0 = ((startBall - startWheel) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);

    // vueltas extra para que se vea pro
    const extraWheelTurns = 3 * 2 * Math.PI; // 3 vueltas
    const extraBallTurns  = 6 * 2 * Math.PI; // 6 vueltas

    const totalWheelDelta = extraWheelTurns;
    const baseRelDelta = relTarget - rel0;
    const totalRelDelta = baseRelDelta + extraBallTurns;

    const totalBallDelta = totalWheelDelta + totalRelDelta;

    const duration = 3200; // ms

    const start = performance.now();
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function frame(now) {
        let t = (now - start) / duration;
        if (t > 1) t = 1;
        const e = easeOut(t);

        wheelAngle = startWheel + totalWheelDelta * e;
        ballAngle  = startBall  + totalBallDelta * e;

        drawWheel();
        drawBall();

        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            finishSpin();
        }
    }

    resultDiv.textContent = "Girando…";
    requestAnimationFrame(frame);
}

// ------------------------------------------
// FIN DEL GIRO: REBOTE, ZOOM, PAGO
// ------------------------------------------
function finishSpin() {
    // Pequeño rebote de la bola
    const baseAngle = ballAngle;
    const amplitude = 0.07;
    const bounces = 12;
    const duration = 600;
    const start = performance.now();

    function bounceFrame(now) {
        let t = (now - start) / duration;
        if (t > 1) t = 1;
        const damp = 1 - t;
        const offset = Math.sin(t * bounces * Math.PI) * amplitude * damp;
        ballAngle = baseAngle + offset;

        drawWheel();
        drawBall();

        if (t < 1) {
            requestAnimationFrame(bounceFrame);
        } else {
            finalizeResult();
        }
    }

    // Zoom de la ruleta
    canvasWrapper.classList.add("zoomed");
    setTimeout(() => canvasWrapper.classList.remove("zoomed"), 700);

    requestAnimationFrame(bounceFrame);
}

function finalizeResult() {
    spinning = false;

    // Actualizar historial
    historySpan.textContent = winnerNumber + " " + historySpan.textContent;

    // Pago según color
    let ganancia = 0;
    if (winnerColor === selectedColor) {
        if (selectedColor === "verde") {
            ganancia = selectedBet * 35; // pago típico
        } else {
            ganancia = selectedBet;      // 1:1
        }
        saldo += ganancia;
        actualizarResultado(`¡Ganaste! Salió ${winnerNumber} (${winnerColor.toUpperCase()})  +$${ganancia}`);
        try { winSound.currentTime = 0; winSound.play(); } catch(e){}
    } else {
        saldo -= selectedBet;
        actualizarResultado(`Perdiste. Salió ${winnerNumber} (${winnerColor.toUpperCase()})  -$${selectedBet}`);
        try { loseSound.currentTime = 0; loseSound.play(); } catch(e){}
    }

    saldoSpan.textContent = `$${saldo}`;

    // Auto spin si sigue activado
    if (autoSpin && saldo >= selectedBet) {
        setTimeout(() => spin(true), 800);
    } else if (saldo < selectedBet) {
        autoSpin = false;
        document.getElementById("autoBtn").textContent = "AUTO SPIN: OFF";
    }
}

// ------------------------------------------
// DIBUJO INICIAL
// ------------------------------------------
drawWheel();
drawBall();
actualizarResultado();

// =============================
// CONFIGURACIÓN Y VARIABLES
// =============================
const canvas = document.getElementById("ruleta");
const ctx = canvas.getContext("2d");

canvas.width = 600;
canvas.height = 600;

let wheelAngle = 0;
let ballAngle = 0;
let spinning = false;
let targetNumber = null;
let autoSpin = false;

const WHEEL_NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6,
    27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16,
    33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const SEGMENT_ANGLE = 360 / WHEEL_NUMBERS.length;

// UI ELEMENTOS
const resultText = document.getElementById("resultado");
const historyText = document.getElementById("historial");
const saldoText = document.getElementById("saldo");
const autoBtn = document.getElementById("auto");

// =============================
// FUNCIONES DE UTILIDAD
// =============================

function angleToNumber(angle) {
    const deg = (angle % 360 + 360) % 360;
    const index = Math.floor(deg / SEGMENT_ANGLE);
    return WHEEL_NUMBERS[index];
}

// Easing para giro suave
function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
}

// =============================
// DIBUJAR RULETA
// =============================
function drawWheel() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = 260;

    // Fondo
    ctx.fillStyle = "#004d26";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ruleta
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((wheelAngle * Math.PI) / 180);

    // Sectores
    for (let i = 0; i < WHEEL_NUMBERS.length; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, (i * SEGMENT_ANGLE) * Math.PI / 180, ((i + 1) * SEGMENT_ANGLE) * Math.PI / 180);
        ctx.fillStyle = (WHEEL_NUMBERS[i] === 0) ? "#0a0" : (i % 2 === 0 ? "#d00" : "#000");
        ctx.fill();

        // Texto número
        ctx.save();
        ctx.rotate(((i + 0.5) * SEGMENT_ANGLE) * Math.PI / 180);
        ctx.fillStyle = "#fff";
        ctx.font = "22px Arial";
        ctx.textAlign = "center";
        ctx.fillText(WHEEL_NUMBERS[i], r - 35, 8);
        ctx.restore();
    }

    ctx.restore();

    drawBall();
}

// =============================
// DIBUJAR BOLA
// =============================
function drawBall() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const rBall = 190; // MÁS ADENTRO PARA NO TAPAR EL DISEÑO
    const angleRad = (ballAngle * Math.PI) / 180;

    const x = cx + rBall * Math.cos(angleRad);
    const y = cy + rBall * Math.sin(angleRad);

    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
}

// =============================
// ANIMACIÓN DEL GIRO
// =============================
async function spin() {
    if (spinning) return;
    spinning = true;

    resultText.innerText = "Girando…";

    // 1. Pedir número al backend
    const res = await fetch("/api/spin");
    const data = await res.json();
    targetNumber = data.resultado;

    // 2. Calcular ángulo objetivo exacto
    const targetIndex = WHEEL_NUMBERS.indexOf(targetNumber);
    const targetAngle = targetIndex * SEGMENT_ANGLE;

    const startWheel = wheelAngle;
    const startBall = wheelAngle + 720; // bola gira contrario

    const extraTurns = 4 * 360;
    const totalWheelRotate = extraTurns + (360 - targetAngle);

    const duration = 3000;
    const startTime = performance.now();

    function animate(time) {
        let t = (time - startTime) / duration;
        if (t > 1) t = 1;

        let eased = easeOut(t);

        wheelAngle = startWheel + totalWheelRotate * eased;
        ballAngle = startBall - totalWheelRotate * 1.2 * eased;

        drawWheel();

        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            finishSpin(targetNumber);
        }
    }

    requestAnimationFrame(animate);
}

// =============================
// AL TERMINAR EL GIRO
// =============================
function finishSpin(num) {
    spinning = false;

    resultText.innerText = `Salió ${num}`;

    historyText.innerText += " " + num;
}

// =============================
// AUTO SPIN
// =============================
autoBtn.onclick = () => {
    autoSpin = !autoSpin;
    autoBtn.innerText = autoSpin ? "AUTO SPIN: ON" : "AUTO SPIN: OFF";

    if (autoSpin) autoLoop();
};

function autoLoop() {
    if (!autoSpin) return;
    spin();
    setTimeout(autoLoop, 4000);
}

// =============================
// INICIAR
// =============================
drawWheel();


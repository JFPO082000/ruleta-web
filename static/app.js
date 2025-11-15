const rouletteCanvas = document.getElementById("rouletteCanvas");
const ballCanvas = document.getElementById("ballCanvas");
const ctx = rouletteCanvas.getContext("2d");
const ballCtx = ballCanvas.getContext("2d");

rouletteCanvas.width = 420;
rouletteCanvas.height = 420;
ballCanvas.width = 420;
ballCanvas.height = 420;

const NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6,
    27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
    16, 33, 1, 20, 14, 31, 9, 22, 18, 29,
    7, 28, 12, 35, 3, 26
];

let angle = 0;
let spinning = false;
let selectedBet = null;
let autoSpin = false;

// ----------------- BOTONES -------------------
document.querySelectorAll(".bet-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".bet-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedBet = parseInt(btn.dataset.value);
    });
});

document.getElementById("autoBtn").addEventListener("click", () => {
    autoSpin = !autoSpin;
    document.getElementById("autoBtn").textContent = autoSpin ? "AUTO SPIN: ON" : "AUTO SPIN: OFF";
    if (autoSpin && !spinning) startSpin();
});

document.getElementById("spinBtn").addEventListener("click", startSpin);

// ----------------- FUNCIONES -------------------
function drawRoulette() {
    const cx = 210, cy = 210, r = 200;
    const slice = (Math.PI * 2) / 37;

    ctx.clearRect(0, 0, 420, 420);

    for (let i = 0; i < NUMBERS.length; i++) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, angle + i * slice, angle + (i + 1) * slice);
        ctx.fillStyle = NUMBERS[i] === 0 ? "#0f0" : (i % 2 === 0 ? "red" : "black");
        ctx.fill();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + (i + 0.5) * slice);
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.fillText(NUMBERS[i], r - 35, 8);
        ctx.restore();
    }
}

let ballAngle = 0;
let ballSpeed = 0.32;

function drawBall() {
    const cx = 210, cy = 210;
    const r = 165;

    ballCtx.clearRect(0, 0, 420, 420);

    const bx = cx + Math.cos(ballAngle) * r;
    const by = cy + Math.sin(ballAngle) * r;

    ballCtx.beginPath();
    ballCtx.arc(bx, by, 12, 0, Math.PI * 2);
    ballCtx.fillStyle = "white";
    ballCtx.fill();
}

function startSpin() {
    if (spinning) return;
    if (!selectedBet) {
        alert("Selecciona una apuesta primero.");
        return;
    }

    spinning = true;
    ballSpeed = 0.32;
    angleSpeed = 0.12;

    spinAnimation();
}

let angleSpeed = 0.12;

function spinAnimation() {
    if (!spinning) return;

    angle += angleSpeed;
    ballAngle -= ballSpeed;

    angleSpeed *= 0.992;
    ballSpeed *= 0.985;

    drawRoulette();
    drawBall();

    if (angleSpeed < 0.002) {
        spinning = false;
        finishSpin();
        return;
    }

    requestAnimationFrame(spinAnimation);
}

function finishSpin() {
    const slice = (Math.PI * 2) / 37;

    let finalAngle = (ballAngle - angle) % (Math.PI * 2);
    if (finalAngle < 0) finalAngle += Math.PI * 2;

    const index = Math.floor(finalAngle / slice);
    const number = NUMBERS[index];

    // Mostrar resultado solo después de detenerse
    document.getElementById("result").textContent = `Salió ${number}`;
    document.getElementById("history").textContent += " " + number;

    if (autoSpin) startSpin();
}

drawRoulette();
drawBall();

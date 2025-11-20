// -----------------------------------------------------------
// 🔵 RULETA EUROPEA – CLIENTE SINCRONIZADO CON BACKEND
// -----------------------------------------------------------

// Números de la ruleta en orden. Ahora se inicializan aquí
// para que la ruleta se dibuje al cargar la página.
let WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6,
    27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
    16, 33, 1, 20, 14, 31, 9, 22, 18, 29,
    7, 28, 12, 35, 3, 26
];

// Coordenadas
const CENTER = 230;
const R_WHEEL = 210;

// Radios de la bola para el efecto de "caída"
const R_BALL_START = 195; // Radio inicial, en el borde exterior
const R_BALL_END = 150;   // Radio final, ajustado para no superponerse a los números

// Velocidades naturales
const INITIAL_WHEEL_SPEED = 0.22; // Positivo: Ruleta gira en sentido horario
const INITIAL_BALL_SPEED = -0.82;  // Negativo: Bola gira en sentido antihorario

const FRICTION_WHEEL = 0.9925;
const FRICTION_BALL = 0.985;

// -----------------------------------------------------------
// CANVAS
// -----------------------------------------------------------
const rouletteCanvas = document.getElementById("rouletteCanvas");
const ctx = rouletteCanvas.getContext("2d");

const rgbCanvas = document.getElementById("rgbCanvas");
const rgbCtx = rgbCanvas.getContext("2d");

const ballCanvas = document.getElementById("ballCanvas");
const ballCtx = ballCanvas.getContext("2d");

rouletteCanvas.width = rouletteCanvas.height = 460;
rgbCanvas.width = rgbCanvas.height = 460;
ballCanvas.width = ballCanvas.height = 460;

// Estado
const sounds = {
    click: new Audio('/static/sounds/click.wav'),
    win: new Audio('/static/sounds/win.wav'),
    lose: new Audio('/static/sounds/lose.wav')
};

let wheelAngle = 0;
let ballAngle = 0;
let ballRadius = R_BALL_START; // El radio de la bola ahora es variable
let spinning = false;

let saldo = 1000;
let selectedColor = null;
let selectedBet = null;
let autoSpin = false;

let winnerIndex = null;
let winnerNumber = null;
let winnerColor = null;
let lastWinAmount = 0;

// -----------------------------------------------------------
// DOM CORRECTO PARA TU HTML
// -----------------------------------------------------------
const saldoSpan = document.getElementById("balance");
const historySpan = document.getElementById("history");
const resultDiv = document.getElementById("resultText");

document.getElementById("btnRojo").onclick = () => selectColor("rojo");
document.getElementById("btnNegro").onclick = () => selectColor("negro");
document.getElementById("btnVerde").onclick = () => selectColor("verde");

document.getElementById("btnSpin").onclick = () => spin(false);
document.getElementById("btnAuto").onclick = toggleAuto;

generateChips();

// -----------------------------------------------------------
// GENERAR FICHAS
// -----------------------------------------------------------
function generateChips() {
    const values = [5, 10, 25, 50, 100, 200, 500];
    const container = document.getElementById("chipsRow");
    container.innerHTML = "";

    values.forEach(v => {
        const b = document.createElement("button");
        b.className = "chip-btn";
        b.dataset.value = v;
        b.textContent = "$" + v;
        b.onclick = () => selectBet(v);
        container.appendChild(b);
    });
}

// -----------------------------------------------------------
// SELECCIÓN COLOR Y APUESTA
// -----------------------------------------------------------
function selectColor(c) {
    document.querySelectorAll(".color-btn")
        .forEach(b => b.classList.remove("selected"));

    document.querySelector(`[data-color="${c}"]`).classList.add("selected");

    selectedColor = c;
    updateMessage();
}

function selectBet(v) {
    selectedBet = v;

    document.querySelectorAll(".chip-btn")
        .forEach(b => b.classList.remove("selected"));

    [...document.querySelectorAll(".chip-btn")]
        .find(b => b.dataset.value == v)
        .classList.add("selected");

    updateMessage();
}

// -----------------------------------------------------------
// MENSAJES
// -----------------------------------------------------------
function updateMessage(msg = null) {
    if (msg) return resultDiv.textContent = msg;

    if (!selectedColor && !selectedBet) resultDiv.textContent = "Selecciona color y apuesta…";
    else if (!selectedColor) resultDiv.textContent = "Selecciona un color…";
    else if (!selectedBet) resultDiv.textContent = "Selecciona una ficha…";
    else resultDiv.textContent = `Apuesta lista: ${selectedColor.toUpperCase()} $${selectedBet}`;
}

// -----------------------------------------------------------
// SPIN – LLAMADA AL BACKEND
// -----------------------------------------------------------
function spin(fromAuto) {
    if (spinning) return;

    if (!selectedColor || !selectedBet) return updateMessage();

    if (saldo < selectedBet) {
        updateMessage("Saldo insuficiente.");
        autoSpin = false;
        document.getElementById("btnAuto").textContent = "AUTO SPIN: OFF";
        return;
    }

    spinning = true;
    updateMessage("Girando…");
    
    // Deshabilitar botones durante el giro
    document.getElementById("btnSpin").disabled = true;
    document.getElementById("btnAuto").disabled = true;

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
            updateMessage(data.error);
            return;
        }

        winnerIndex = data.index;
        winnerNumber = data.number;
        winnerColor = data.color;
        lastWinAmount = data.win;
        saldo = data.newBalance;
        saldoSpan.textContent = "$" + saldo;

        animateSpin();
    })
    .catch(() => {
        spinning = false;
        updateMessage("Error de conexión.");
    });
}

// -----------------------------------------------------------
// ANIMACIÓN REALISTA
// -----------------------------------------------------------
function animateSpin() {
    let wheelSpeed = INITIAL_WHEEL_SPEED;
    let ballSpeed = INITIAL_BALL_SPEED;

    // Reiniciar la posición de la bola para la nueva animación
    ballAngle = 0;
    ballRadius = R_BALL_START;
    drawBall();

    // --- LÓGICA DE ANIMACIÓN REALISTA ---
    // 1. Calcular cuántos fotogramas tardará la bola en detenerse.
    let ballFrames = 0;
    let tempSpeed = INITIAL_BALL_SPEED;
    while (Math.abs(tempSpeed) > 0.001) { // Umbral de detención
        tempSpeed *= FRICTION_BALL;
        ballFrames++;
    }

    // 2. Calcular el ángulo final de la bola después de esos fotogramas.
    const finalBallAngle = ballAngle + INITIAL_BALL_SPEED * (1 - Math.pow(FRICTION_BALL, ballFrames)) / (1 - FRICTION_BALL);

    // 3. Calcular el ángulo objetivo de la ruleta para que el número ganador coincida.
    const targetWheelAngle = finalBallAngle - (winnerIndex * (2 * Math.PI / WHEEL_ORDER.length)) + Math.PI / 2;

    function frame() {
        wheelAngle += wheelSpeed;
        ballAngle += ballSpeed;

        wheelSpeed *= FRICTION_WHEEL;
        ballSpeed *= FRICTION_BALL;

        // La bola "cae" hacia el centro a medida que pierde velocidad
        const speedRatio = Math.max(0, Math.abs(ballSpeed) / Math.abs(INITIAL_BALL_SPEED));
        ballRadius = R_BALL_END + (R_BALL_START - R_BALL_END) * speedRatio;

        // --- SONIDO DE CLIC ---
        // Reproduce un clic basado en la velocidad de la bola
        if (speedRatio > 0.1 && Math.abs(ballSpeed) > Math.abs(wheelSpeed)) {
             // El % 0.1 simula la frecuencia de paso por las casillas
            if (Math.abs(ballAngle % 0.1) < 0.01) sounds.click.play();
        }

        drawWheel();
        drawBall();

        // Cuando la bola se detiene, ajustamos la ruleta a su posición final y rebotamos.
        if (Math.abs(ballSpeed) < 0.001) {
            wheelAngle = targetWheelAngle; // Ajuste final y preciso de la ruleta
            ballAngle = finalBallAngle;   // Ajuste final de la bola
            bounceBall(finalBallAngle);
            return;
        }

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

// -----------------------------------------------------------
// REBOTE REALISTA FINAL
// -----------------------------------------------------------
function bounceBall(finalAngle) {
    const amp = 0.05;
    const bounces = 10;
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
// MOSTRAR RESULTADO FINAL
// -----------------------------------------------------------
function showResult() {
    spinning = false;

    // Habilitar botones de nuevo
    document.getElementById("btnSpin").disabled = false;
    document.getElementById("btnAuto").disabled = false;

    // Crear un span para el nuevo número del historial con su color
    const historyEntry = document.createElement('span');
    historyEntry.textContent = winnerNumber;
    historyEntry.className = `history-entry color-${winnerColor}`;
    
    // Añadirlo al principio del historial
    historySpan.prepend(historyEntry);

    if (lastWinAmount > 0) {
        updateMessage(`¡GANASTE! Número ${winnerNumber} (${winnerColor}) +$${lastWinAmount}`);
        sounds.win.play();
    } else {
        updateMessage(`Perdiste. Número ${winnerNumber} (${winnerColor}) -$${selectedBet}`);
    }

    if (autoSpin && saldo >= selectedBet) {
        setTimeout(() => spin(true), 1500);
    } else if (autoSpin) {
        toggleAuto(); // Apagar si no hay saldo
        updateMessage("Auto-spin detenido. Saldo insuficiente.");
    }
}

// -----------------------------------------------------------
// AUTO SPIN
// -----------------------------------------------------------
function toggleAuto() {
    autoSpin = !autoSpin;
    document.getElementById("btnAuto").textContent = `AUTO SPIN: ${autoSpin ? "ON" : "OFF"}`;
    if (autoSpin && !spinning) spin(true);
}

// -----------------------------------------------------------
// DIBUJAR RULETA
// -----------------------------------------------------------
function drawWheel() {
    ctx.clearRect(0,0,460,460);

    const slices = WHEEL_ORDER.length;
    const anglePerSlice = (Math.PI * 2) / slices;

    for (let i = 0; i < slices; i++) {

        const start = wheelAngle + i * anglePerSlice - Math.PI / 2;
        const end   = start + anglePerSlice;

        const num = WHEEL_ORDER[i];
        const col =
            num === 0 ? "#0bb400" :
            // Corrección: Usar la misma lista de rojos que el backend
            [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(num)
            ? "#d00000" : "#000";

        // sector
        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, R_WHEEL, start, end);
        ctx.closePath();
        ctx.fillStyle = col;
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
// DIBUJAR BOLA
// -----------------------------------------------------------
function drawBall() {
    ballCtx.clearRect(0,0,460,460);

    const x = CENTER + Math.cos(ballAngle) * ballRadius;
    const y = CENTER + Math.sin(ballAngle) * ballRadius;

    ballCtx.beginPath();
    ballCtx.arc(x, y, 12, 0, Math.PI * 2);
    ballCtx.fillStyle = "#fff";
    ballCtx.fill();
}

// -----------------------------------------------------------
// INICIAR DIBUJOS
// -----------------------------------------------------------
drawWheel();
drawBall();
updateMessage();

/* -----------------------------------------------------------
   CONFIGURACIÓN INICIAL Y CONSTANTES
----------------------------------------------------------- */
const WHEEL_NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
    16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const NUMBER_OF_SECTORS = WHEEL_NUMBERS.length;
const SECTOR_ANGLE = (2 * Math.PI) / NUMBER_OF_SECTORS;

const CHIP_VALUES = [1, 5, 10, 25, 100, 500];

const rouletteCanvas = document.getElementById('rouletteCanvas');
const ballCanvas = document.getElementById('ballCanvas');
const ctxRoulette = rouletteCanvas.getContext('2d');
const ctxBall = ballCanvas.getContext('2d');

const btnSpin = document.getElementById('btnSpin');
const btnAuto = document.getElementById('btnAuto');
const resultText = document.getElementById('resultText');
const balanceEl = document.getElementById('balance');
const historyEl = document.getElementById('history');
const chipsRow = document.getElementById('chipsRow');
const canvasWrapper = document.getElementById('canvasWrapper');
const panel = document.querySelector('.panel');

let balance = 1000;
let selectedBet = 10;
let selectedColor = 'rojo';
let isSpinning = false;
let isAutoSpin = false;
let history = [];

let wheelAngle = 0;
let ballAngle = Math.random() * 2 * Math.PI;
let ballRadius = 180;
let ballVelocity = 0;

/* -----------------------------------------------------------
   INICIALIZACIÓN Y DIBUJO
----------------------------------------------------------- */

function getColorOf(n) {
    if (n === 0) return 'verde';
    return RED_NUMBERS.includes(n) ? 'rojo' : 'negro';
}

function drawWheel() {
    const radius = rouletteCanvas.width / 2;
    ctxRoulette.clearRect(0, 0, rouletteCanvas.width, rouletteCanvas.height);
    ctxRoulette.save();
    ctxRoulette.translate(radius, radius);
    ctxRoulette.rotate(wheelAngle);

    for (let i = 0; i < NUMBER_OF_SECTORS; i++) {
        const angle = i * SECTOR_ANGLE;
        const number = WHEEL_NUMBERS[i];
        const color = getColorOf(number);

        ctxRoulette.beginPath();
        ctxRoulette.moveTo(0, 0);
        ctxRoulette.arc(0, 0, radius - 10, angle - SECTOR_ANGLE / 2, angle + SECTOR_ANGLE / 2);
        ctxRoulette.closePath();

        if (color === 'rojo') ctxRoulette.fillStyle = '#d00000';
        else if (color === 'negro') ctxRoulette.fillStyle = '#222';
        else ctxRoulette.fillStyle = '#0bb400';
        ctxRoulette.fill();

        ctxRoulette.save();
        ctxRoulette.rotate(angle);
        ctxRoulette.textAlign = 'center';
        ctxRoulette.fillStyle = '#fff';
        ctxRoulette.font = 'bold 18px Arial';
        ctxRoulette.fillText(number, radius - 30, 0);
        ctxRoulette.restore();
    }
    ctxRoulette.restore();
}

function drawBall() {
    const radius = ballCanvas.width / 2;
    ctxBall.clearRect(0, 0, ballCanvas.width, ballCanvas.height);
    ctxBall.save();
    ctxBall.translate(radius, radius);

    const ballX = ballRadius * Math.cos(ballAngle);
    const ballY = ballRadius * Math.sin(ballAngle);

    ctxBall.beginPath();
    ctxBall.arc(ballX, ballY, 8, 0, 2 * Math.PI);
    ctxBall.fillStyle = '#ffffff';
    ctxBall.fill();
    ctxBall.strokeStyle = '#cccccc';
    ctxBall.lineWidth = 2;
    ctxBall.stroke();

    ctxBall.restore();
}

function updateUI() {
    balanceEl.textContent = `$${balance}`;
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.color === selectedColor);
    });
    document.querySelectorAll('.chip-btn').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.dataset.value) === selectedBet);
    });
}

function createChips() {
    CHIP_VALUES.forEach(value => {
        const chip = document.createElement('button');
        chip.className = 'chip-btn';
        chip.dataset.value = value;
        chip.textContent = `$${value}`;
        chip.onclick = () => {
            if (isSpinning) return;
            selectedBet = value;
            updateUI();
        };
        chipsRow.appendChild(chip);
    });
}

/* -----------------------------------------------------------
   LÓGICA DE ANIMACIÓN Y GIRO
----------------------------------------------------------- */

function spin() {
    if (isSpinning) return;
    if (balance < selectedBet) {
        resultText.textContent = "Saldo insuficiente.";
        return;
    }

    isSpinning = true;
    resultText.textContent = "Girando...";
    btnSpin.disabled = true;
    panel.classList.remove('win-effect', 'lose-effect');
    balanceEl.classList.remove('win-effect', 'lose-effect');

    fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            balance: balance,
            bet: selectedBet,
            color: selectedColor
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            resultText.textContent = data.error;
            isSpinning = false;
            btnSpin.disabled = false;
            return;
        }
        animateToResult(data);
    })
    .catch(error => {
        console.error('Error en la API:', error);
        resultText.textContent = "Error de conexión. Inténtalo de nuevo.";
        isSpinning = false;
        btnSpin.disabled = false;
    });
}

function animateToResult(result) {
    const { index, number, color, win, newBalance } = result;

    const targetAngle = -(index * SECTOR_ANGLE) - SECTOR_ANGLE / 2;
    const fullSpins = 5;
    const totalRotation = (fullSpins * 2 * Math.PI) + targetAngle;

    const duration = 6000; // Duración total de 6 segundos
    const zoomInTime = duration * 0.5; // El zoom empieza a mitad de camino
    const slowDownTime = duration * 0.8; // La bola empieza a frenar en el 80% del tiempo
    let startTime = null;

    // Velocidad inicial de la bola
    ballVelocity = 0.2;
    ballRadius = 180;

    function animationStep(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;

        // --- Animación de la ruleta ---
        const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
        const wheelProgress = Math.min(progress / duration, 1);
        wheelAngle = easeOutQuint(wheelProgress) * totalRotation;

        // --- Animación de la bola ---
        ballAngle += ballVelocity;

        // La bola empieza a frenar y a caer hacia el centro
        if (progress > slowDownTime) {
            const slowDownProgress = (progress - slowDownTime) / (duration - slowDownTime);
            ballVelocity = Math.max(0, 0.2 * (1 - easeOutQuint(slowDownProgress)));
            ballRadius = 180 - 100 * easeOutQuint(slowDownProgress); // Cae hacia el centro
        }

        // --- Efecto de zoom ---
        if (progress > zoomInTime) {
            canvasWrapper.classList.add('zoomed');
        }

        drawWheel();
        drawBall();

        if (progress < duration) {
            requestAnimationFrame(animationStep);
        } else {
            // Fin de la animación
            wheelAngle = targetAngle; // Clavar el ángulo final
            ballAngle = targetAngle + wheelAngle; // Alinear la bola con el número
            ballRadius = 80; // Posición final de la bola en el número
            drawWheel();
            drawBall();

            finishSpin(result);
        }
    }

    requestAnimationFrame(animationStep);
}

function finishSpin(result) {
    const { number, color, win, newBalance } = result;

    balance = newBalance;
    updateUI();

    if (win > 0) {
        resultText.textContent = `¡Ganaste $${win}! Salió ${number} ${color}.`;
        panel.classList.add('win-effect');
        balanceEl.classList.add('win-effect');
    } else {
        resultText.textContent = `Perdiste. Salió ${number} ${color}.`;
        panel.classList.add('lose-effect');
        balanceEl.classList.add('lose-effect');
    }

    updateHistory(number, color);

    setTimeout(() => {
        isSpinning = false;
        btnSpin.disabled = false;
        canvasWrapper.classList.remove('zoomed');
        if (isAutoSpin) {
            spin();
        } else {
            resultText.textContent = "Selecciona color y apuesta…";
        }
    }, 2500);
}

function updateHistory(number, colorName) {
    history.unshift({ number, colorName });
    if (history.length > 10) {
        history.pop();
    }

    historyEl.innerHTML = '';
    history.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = `history-entry color-${entry.colorName}`;
        entryDiv.textContent = entry.number;
        historyEl.appendChild(entryDiv);
    });
}

/* -----------------------------------------------------------
   MANEJADORES DE EVENTOS
----------------------------------------------------------- */

document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (isSpinning) return;
        selectedColor = btn.dataset.color;
        updateUI();
    });
});

btnSpin.addEventListener('click', spin);

btnAuto.addEventListener('click', () => {
    isAutoSpin = !isAutoSpin;
    btnAuto.textContent = `AUTO SPIN: ${isAutoSpin ? 'ON' : 'OFF'}`;
    btnAuto.classList.toggle('active', isAutoSpin); // Puedes añadir estilos para .active
    if (isAutoSpin && !isSpinning) {
        spin();
    }
});

/* -----------------------------------------------------------
   INICIALIZACIÓN
----------------------------------------------------------- */

function init() {
    // Bucle de animación base para cuando no está girando
    function idleAnimation() {
        if (!isSpinning) {
            drawWheel();
            drawBall();
        }
        requestAnimationFrame(idleAnimation);
    }

    createChips();
    updateUI();
    idleAnimation();

    // Seleccionar rojo y $10 por defecto
    document.querySelector('.color-btn[data-color="rojo"]').classList.add('selected');
    document.querySelector('.chip-btn[data-value="10"]').classList.add('selected');
}

init();


/* -----------------------------------------------------------
   EFECTO RGB EN EL BORDE (OPCIONAL)
----------------------------------------------------------- */
const rgbCanvas = document.getElementById('rgbCanvas');
const ctxRgb = rgbCanvas.getContext('2d');
let hue = 0;

function drawRgbGlow() {
    const radius = rgbCanvas.width / 2;
    const gradient = ctxRgb.createConicGradient(0, radius, radius);

    for (let i = 0; i <= 360; i += 30) {
        const color = `hsl(${(hue + i) % 360}, 100%, 50%)`;
        gradient.addColorStop(i / 360, color);
    }

    ctxRgb.clearRect(0, 0, rgbCanvas.width, rgbCanvas.height);
    ctxRgb.save();
    ctxRgb.translate(radius, radius);
    ctxRgb.rotate(Date.now() / 1000); // Rotación suave

    ctxRgb.beginPath();
    ctxRgb.arc(0, 0, radius, 0, 2 * Math.PI);
    ctxRgb.strokeStyle = gradient;
    ctxRgb.lineWidth = 6; // Ancho del borde RGB
    ctxRgb.filter = 'blur(10px)'; // Efecto de desenfoque para el glow
    ctxRgb.stroke();

    ctxRgb.restore();

    hue = (hue + 1) % 360;
    requestAnimationFrame(drawRgbGlow);
}

drawRgbGlow();
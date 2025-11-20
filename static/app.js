/* -----------------------------------------------------------
   CONFIGURACIÓN INICIAL Y CONSTANTES
----------------------------------------------------------- */

// Array que representa el orden de los números en una ruleta europea.
const WHEEL_NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
    16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];
// Array con todos los números que son de color rojo.
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
// Número total de sectores (casillas) en la ruleta.
const NUMBER_OF_SECTORS = WHEEL_NUMBERS.length;
// El ángulo (en radianes) que ocupa cada sector de la ruleta. Se calcula dividiendo el círculo completo (2 * PI) entre el número de sectores.
const SECTOR_ANGLE = (2 * Math.PI) / NUMBER_OF_SECTORS;

// Valores de las fichas de apuesta disponibles.
const CHIP_VALUES = [1, 5, 10, 25, 100, 500];

// Elementos del DOM (canvas) para la ruleta y la bola.
const rouletteCanvas = document.getElementById('rouletteCanvas');
const ballCanvas = document.getElementById('ballCanvas');
// Contextos 2D de los canvas, usados para dibujar.
const ctxRoulette = rouletteCanvas.getContext('2d');
const ctxBall = ballCanvas.getContext('2d');

// Elementos del DOM para la interacción del usuario (botones, textos, etc.).
const btnSpin = document.getElementById('btnSpin');
const btnAuto = document.getElementById('btnAuto');
const resultText = document.getElementById('resultText');
const balanceEl = document.getElementById('balance');
const historyEl = document.getElementById('history');
const chipsRow = document.getElementById('chipsRow');
const canvasWrapper = document.getElementById('canvasWrapper');
const panel = document.querySelector('.panel');

// --- Variables de estado del juego ---
// Saldo inicial del jugador.
let balance = 1000;
// Valor de la apuesta seleccionada por defecto.
let selectedBet = 10;
// Color de la apuesta seleccionado por defecto.
let selectedColor = 'rojo';
// Booleano que indica si la ruleta está girando.
let isSpinning = false;
// Booleano que indica si el modo de giro automático está activado.
let isAutoSpin = false;
// Array para almacenar el historial de los últimos resultados.
let history = [];

// --- Variables de estado de la animación ---
// Ángulo de rotación actual de la ruleta.
let wheelAngle = 0;
// Ángulo de posición actual de la bola.
let ballAngle = Math.random() * 2 * Math.PI;
// Radio de la órbita de la bola (distancia desde el centro).
let ballRadius = 180;
// Velocidad angular de la bola.
let ballVelocity = 0;

/* -----------------------------------------------------------
   INICIALIZACIÓN Y DIBUJO
----------------------------------------------------------- */

function getColorOf(n) {
    // Devuelve el color ('verde', 'rojo', 'negro') de un número dado.
    if (n === 0) return 'verde';
    return RED_NUMBERS.includes(n) ? 'rojo' : 'negro';
}

/**
 * Dibuja la ruleta en su canvas.
 * Esta función se llama en cada frame de la animación para actualizar la rotación.
 */
function drawWheel() {
    // Obtiene el radio del canvas (la mitad de su ancho).
    const radius = rouletteCanvas.width / 2;
    // Limpia el canvas antes de volver a dibujar.
    ctxRoulette.clearRect(0, 0, rouletteCanvas.width, rouletteCanvas.height);
    ctxRoulette.save();
    // Mueve el origen del contexto al centro del canvas para facilitar la rotación.
    ctxRoulette.translate(radius, radius);
    // Rota el canvas de la ruleta según el ángulo actual.
    ctxRoulette.rotate(wheelAngle);

    for (let i = 0; i < NUMBER_OF_SECTORS; i++) {
        const angle = i * SECTOR_ANGLE;
        const number = WHEEL_NUMBERS[i];
        const color = getColorOf(number);

        // Dibuja el sector (la "porción de tarta").
        ctxRoulette.beginPath();
        ctxRoulette.moveTo(0, 0);
        ctxRoulette.arc(0, 0, radius - 10, angle - SECTOR_ANGLE / 2, angle + SECTOR_ANGLE / 2);
        ctxRoulette.closePath();

        // Asigna el color de relleno según el número.
        if (color === 'rojo') ctxRoulette.fillStyle = '#d00000';
        else if (color === 'negro') ctxRoulette.fillStyle = '#222';
        else ctxRoulette.fillStyle = '#0bb400';
        ctxRoulette.fill();

        // Dibuja el número dentro del sector.
        ctxRoulette.save();
        ctxRoulette.rotate(angle);
        ctxRoulette.textAlign = 'center';
        ctxRoulette.fillStyle = '#fff';
        ctxRoulette.font = 'bold 18px Arial';
        ctxRoulette.fillText(number, radius - 30, 0);
        ctxRoulette.restore();
    }
    // Restaura el estado del contexto (deshace la traslación y rotación).
    ctxRoulette.restore();
}

/**
 * Dibuja la bola en su canvas.
 * Se llama en cada frame para actualizar la posición de la bola.
 */
function drawBall() {
    const radius = ballCanvas.width / 2;
    // Limpia el canvas de la bola.
    ctxBall.clearRect(0, 0, ballCanvas.width, ballCanvas.height);
    ctxBall.save();
    // Mueve el origen al centro.
    ctxBall.translate(radius, radius);

    // Calcula las coordenadas (x, y) de la bola basándose en su ángulo y radio orbital.
    const ballX = ballRadius * Math.cos(ballAngle);
    const ballY = ballRadius * Math.sin(ballAngle);

    // Dibuja el círculo que representa la bola.
    ctxBall.beginPath();
    ctxBall.arc(ballX, ballY, 8, 0, 2 * Math.PI);
    ctxBall.fillStyle = '#ffffff';
    ctxBall.fill();
    ctxBall.strokeStyle = '#cccccc';
    ctxBall.lineWidth = 2;
    ctxBall.stroke();

    // Restaura el estado del contexto.
    ctxBall.restore();
}

/**
 * Actualiza los elementos de la interfaz de usuario (saldo, botones seleccionados).
 */
function updateUI() {
    // Actualiza el texto del saldo.
    balanceEl.textContent = `$${balance}`;
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.color === selectedColor);
    });
    document.querySelectorAll('.chip-btn').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.dataset.value) === selectedBet);
    });
}

/**
 * Crea los botones de las fichas de apuesta y los añade al DOM.
 */
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

/**
 * Inicia el proceso de giro de la ruleta.
 */
function spin() {
    // No hacer nada si ya está girando.
    if (isSpinning) return;
    // Comprobar si el jugador tiene saldo suficiente.
    if (balance < selectedBet) {
        resultText.textContent = "Saldo insuficiente.";
        return;
    }
    // Establecer el estado a "girando".
    isSpinning = true;
    resultText.textContent = "Girando...";
    btnSpin.disabled = true;
    panel.classList.remove('win-effect', 'lose-effect');
    balanceEl.classList.remove('win-effect', 'lose-effect');

    fetch('/api/spin', {
        // Llama a la API del backend para obtener el resultado del giro.
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
        // Si la API devuelve un error (ej. saldo insuficiente), lo muestra.
        if (data.error) {
            resultText.textContent = data.error;
            isSpinning = false;
            btnSpin.disabled = false;
            return;
        }
        animateToResult(data);
        // Si la llamada es exitosa, inicia la animación hacia el resultado.
    })
    .catch(error => {
        console.error('Error en la API:', error);
        resultText.textContent = "Error de conexión. Inténtalo de nuevo.";
        isSpinning = false;
        btnSpin.disabled = false;
    });
}

/**
 * Realiza la animación de la ruleta y la bola hasta el resultado final.
 * @param {object} result - El objeto de resultado devuelto por la API.
 */
function animateToResult(result) {
    const { index, number, color, win, newBalance } = result;

    // Calcula el ángulo objetivo. Es el ángulo del centro del sector ganador.
    // Se resta SECTOR_ANGLE / 2 para apuntar al centro del sector.
    // El signo negativo es para que la rotación sea en sentido horario.
    const targetAngle = -(index * SECTOR_ANGLE) - SECTOR_ANGLE / 2;
    // Número de vueltas completas que dará la ruleta antes de detenerse.
    const fullSpins = 5;
    // La rotación total que debe realizar la ruleta.
    const totalRotation = (fullSpins * 2 * Math.PI) + targetAngle;

    // --- Parámetros de la animación ---
    const duration = 6000; // Duración total de la animación en milisegundos (6 segundos).
    const zoomInTime = duration * 0.5; // Momento en que comienza el zoom.
    const slowDownTime = duration * 0.8; // Momento en que la bola empieza a frenar y caer.
    let startTime = null;

    // --- Reseteo de la animación de la bola ---
    ballVelocity = 0.2;
    ballRadius = 180; // Radio exterior

    function animationStep(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;

        // --- Animación de la ruleta ---
        const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
        // Calcula el progreso de la animación de la ruleta (de 0 a 1).
        const wheelProgress = Math.min(progress / duration, 1);
        // Aplica una función de suavizado (ease-out) para que la ruleta desacelere al final.
        wheelAngle = easeOutQuint(wheelProgress) * totalRotation;

        // --- Animación de la bola ---
        ballAngle += ballVelocity;

        // Si ha pasado el tiempo de "slowDownTime", la bola empieza a frenar y caer.
        if (progress > slowDownTime) {
            const slowDownProgress = (progress - slowDownTime) / (duration - slowDownTime);
            // La velocidad de la bola disminuye usando la misma función de suavizado.
            ballVelocity = Math.max(0, 0.2 * (1 - easeOutQuint(slowDownProgress)));
            // El radio de la bola disminuye, haciendo que "caiga" hacia los números.
            ballRadius = 180 - 100 * easeOutQuint(slowDownProgress);
        }

        // Activa el efecto de zoom a mitad de la animación.
        if (progress > zoomInTime) {
            canvasWrapper.classList.add('zoomed');
        }

        drawWheel();
        drawBall();

        // Si la animación no ha terminado, solicita el siguiente frame.
        if (progress < duration) {
            requestAnimationFrame(animationStep);
        } else {
            // --- FIN DE LA ANIMACIÓN ---
            // Se asegura de que la ruleta y la bola estén en la posición exacta.
            wheelAngle = totalRotation; // La ruleta termina su rotación completa.
            ballAngle = targetAngle; // La bola se posiciona exactamente en el ángulo del sector ganador.
            ballRadius = 80; // La bola se queda en el radio interior, sobre el número.
            drawWheel();
            drawBall();
            // Llama a la función que finaliza la lógica del giro.
            finishSpin(result);
        }
    }

    requestAnimationFrame(animationStep);
}

/**
 * Finaliza el giro, actualiza el saldo, muestra el resultado y prepara el siguiente giro.
 * @param {object} result - El objeto de resultado de la API.
 */
function finishSpin(result) {
    const { number, color, win, newBalance } = result;

    // Actualiza el saldo y la UI.
    balance = newBalance;
    updateUI();

    // Muestra el mensaje de victoria o derrota y aplica los efectos visuales correspondientes.
    if (win > 0) {
        resultText.textContent = `¡Ganaste $${win}! Salió ${number} ${color}.`;
        panel.classList.add('win-effect');
        balanceEl.classList.add('win-effect');
    } else {
        resultText.textContent = `Perdiste. Salió ${number} ${color}.`;
        panel.classList.add('lose-effect');
        balanceEl.classList.add('lose-effect');
    }

    // Añade el resultado al historial.
    updateHistory(number, color);

    // Espera un momento antes de permitir un nuevo giro.
    setTimeout(() => {
        isSpinning = false;
        btnSpin.disabled = false;
        canvasWrapper.classList.remove('zoomed');
        // Si el modo auto-spin está activado, inicia un nuevo giro automáticamente.
        if (isAutoSpin) {
            spin();
        } else {
            resultText.textContent = "Selecciona color y apuesta…";
        }
    }, 2500);
}

/**
 * Actualiza el historial de resultados en la interfaz.
 * @param {number} number - El número ganador.
 * @param {string} colorName - El color del número ganador.
 */
function updateHistory(number, colorName) {
    // Añade el nuevo resultado al principio del array.
    history.unshift({ number, colorName });
    // Limita el historial a los últimos 10 resultados.
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

// Asigna el evento 'click' a los botones de selección de color.
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (isSpinning) return;
        selectedColor = btn.dataset.color;
        updateUI();
    });
});

// Asigna el evento 'click' al botón principal de giro.
btnSpin.addEventListener('click', spin);

// Asigna el evento 'click' al botón de auto-spin.
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
/**
 * Función principal que se ejecuta al cargar la página.
 * Configura el estado inicial del juego.
 */
function init() {
    // Inicia un bucle de animación "inactivo" que solo dibuja la ruleta y la bola en su estado estático.
    // Bucle de animación base para cuando no está girando
    function idleAnimation() {
        if (!isSpinning) {
            drawWheel();
            drawBall();
        }
        requestAnimationFrame(idleAnimation);
    }

    createChips();
    // Crea las fichas.
    updateUI();
    // Actualiza la UI con los valores iniciales.
    idleAnimation();

    // Selecciona el color 'rojo' y la apuesta de '$10' por defecto al cargar.
    document.querySelector('.color-btn[data-color="rojo"]').classList.add('selected');
    document.querySelector('.chip-btn[data-value="10"]').classList.add('selected');
}

init();


/* -----------------------------------------------------------
   EFECTO RGB EN EL BORDE (OPCIONAL)
----------------------------------------------------------- */
// Este bloque de código crea un efecto de borde brillante y animado alrededor de la ruleta.

const rgbCanvas = document.getElementById('rgbCanvas');
const ctxRgb = rgbCanvas.getContext('2d');
let hue = 0;

/**
 * Dibuja un borde con un gradiente cónico que cambia de color.
 */
function drawRgbGlow() {
    const radius = rgbCanvas.width / 2;
    // Crea un gradiente cónico (como un arcoíris circular).
    const gradient = ctxRgb.createConicGradient(0, radius, radius);

    for (let i = 0; i <= 360; i += 30) {
        const color = `hsl(${(hue + i) % 360}, 100%, 50%)`;
        gradient.addColorStop(i / 360, color);
    }

    // Dibuja el arco con el gradiente.
    ctxRgb.clearRect(0, 0, rgbCanvas.width, rgbCanvas.height);
    ctxRgb.save();
    ctxRgb.translate(radius, radius);
    ctxRgb.rotate(Date.now() / 1000); // Rotación suave del gradiente.

    ctxRgb.beginPath();
    ctxRgb.arc(0, 0, radius, 0, 2 * Math.PI);
    ctxRgb.strokeStyle = gradient;
    ctxRgb.lineWidth = 6; // Ancho del borde RGB
    ctxRgb.filter = 'blur(10px)'; // Efecto de desenfoque para el glow
    ctxRgb.stroke();

    ctxRgb.restore();

    // Incrementa el matiz (hue) para animar el color en el tiempo.
    hue = (hue + 1) % 360;
    requestAnimationFrame(drawRgbGlow);
}

// Inicia la animación del borde RGB.
drawRgbGlow();
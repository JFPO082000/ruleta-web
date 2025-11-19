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
const INITIAL_WHEEL_SPEED = 0.05; // Más lento y realista
const INITIAL_BALL_SPEED = -0.15;  // Más lento y realista

const FRICTION_WHEEL = 0.998; // Menos fricción para un giro más largo
const FRICTION_BALL = 0.995;  // Menos fricción para un giro más largo

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

// Función auxiliar para obtener el color de un número. Fuente única de verdad.
function getColorForNumber(num) {
    if (num === 0) return "verde";
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNumbers.includes(num) ? "rojo" : "negro";
}

function selectColor(c) {
    // 1. Quitar la clase 'selected' de todos los botones de color
    document.querySelectorAll(".color-btn")
        .forEach(b => b.classList.remove("selected"));

    // 2. CORRECCIÓN: Seleccionar el botón por su ID y añadir la clase 'selected'
    // Tu HTML usa id="btnRojo", etc. No "data-color".
    const buttonId = `btn${c.charAt(0).toUpperCase() + c.slice(1)}`;
    document.getElementById(buttonId).classList.add("selected");

    // 3. Guardar el color seleccionado
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

    function frame() {
        // Si la velocidad de la bola es casi cero, la bola se detiene y la ruleta empieza su alineación final.
        if (Math.abs(ballSpeed) < 0.001) {
            alignWheelToWinner();
            return;
        }

        // --- MOVIMIENTO INDEPENDIENTE ---
        // La bola y la ruleta se mueven y frenan por su cuenta.
        wheelAngle += wheelSpeed;
        ballAngle += ballSpeed;

        // La bola "cae" hacia el centro a medida que pierde velocidad
        const speedRatio = Math.max(0, Math.abs(ballSpeed) / Math.abs(INITIAL_BALL_SPEED));
        ballRadius = R_BALL_END + (R_BALL_START - R_BALL_END) * speedRatio;

        // --- SONIDO DE CLIC ---
        // Lo hacemos más espaciado para que suene mejor con la nueva velocidad
        if (speedRatio > 0.1 && Math.abs(ballAngle % 0.17) < 0.005) sounds.click.play();

        wheelSpeed *= FRICTION_WHEEL;
        ballSpeed *= FRICTION_BALL;

        drawWheel();
        drawBall();

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

// -----------------------------------------------------------
// FASE 2: LA RULETA SE ALINEA CON EL GANADOR
// -----------------------------------------------------------
function alignWheelToWinner() {
    // 1. La bola se detiene en la parte superior.
    ballAngle = -Math.PI / 2;
    ballRadius = R_BALL_END;
    drawBall();

    // 2. Calculamos el ángulo final exacto para la ruleta.
    // El centro del sector del número ganador debe quedar en -PI/2.
    const anglePerSlice = (2 * Math.PI) / WHEEL_ORDER.length;
    const targetAngle = -(winnerIndex * anglePerSlice + anglePerSlice / 2) + Math.PI / 2;

    // Guardamos la posición actual de la ruleta para una transición suave.
    const initialWheelAngle = wheelAngle;
    const duration = 1500; // La ruleta tarda 1.5s en detenerse.
    const start = performance.now();

    function alignFrame(now) {
        let t = (now - start) / duration;
        if (t > 1) t = 1;

        // Usamos una función de easing (ease-out) para que la desaceleración sea suave.
        const easedT = 1 - Math.pow(1 - t, 3);

        // --- CORRECCIÓN DE LA ANIMACIÓN ---
        // Calculamos la diferencia de ángulo por el camino más corto.
        let angleDifference = targetAngle - initialWheelAngle;
        if (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
        if (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;

        // El ángulo final real, considerando las vueltas que ya ha dado.
        const finalTargetAngle = initialWheelAngle + angleDifference;

        // Interpolamos suavemente desde el ángulo inicial al final usando el tiempo con easing.
        // Esto evita el "salto" y crea una desaceleración perfecta.
        wheelAngle = initialWheelAngle + (finalTargetAngle - initialWheelAngle) * easedT;

        drawWheel();
        drawBall(); // Volvemos a dibujar la bola para que permanezca estática.

        if (t < 1) {
            requestAnimationFrame(alignFrame);
        } else {
            showResult(); // La animación ha terminado por completo.
        }
    }
    requestAnimationFrame(alignFrame);
}

// -----------------------------------------------------------
// MOSTRAR RESULTADO FINAL
// -----------------------------------------------------------
function showResult() {
    spinning = false;

    // Habilitar botones de nuevo
    document.getElementById("btnSpin").disabled = false;
    document.getElementById("btnAuto").disabled = false;

    const panel = document.querySelector('.panel');

    // Limpiar efectos anteriores
    panel.classList.remove('win-effect', 'lose-effect');
    saldoSpan.classList.remove('win-effect', 'lose-effect');
    // Forzar reflow para que la animación se pueda repetir
    void panel.offsetWidth; 

    // Crear un span para el nuevo número del historial con su color
    const historyEntry = document.createElement('span');
    historyEntry.textContent = winnerNumber;
    historyEntry.className = `history-entry color-${winnerColor}`;
    
    // Añadirlo al principio del historial
    historySpan.prepend(historyEntry);

    if (lastWinAmount > 0) {
        updateMessage(`¡GANASTE! Número ${winnerNumber} (${winnerColor}) +$${lastWinAmount}`);
        sounds.win.play();
        panel.classList.add('win-effect');
        saldoSpan.classList.add('win-effect');
    } else {
        updateMessage(`Perdiste. Número ${winnerNumber} (${winnerColor}) -$${selectedBet}`);
        sounds.lose.play();
        panel.classList.add('lose-effect');
        saldoSpan.classList.add('lose-effect');
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
        // CORRECCIÓN: Usar la función centralizada para obtener el color correcto y consistente.
        const colorName = getColorForNumber(num);
        const col = colorName === 'rojo' ? '#d00000' : colorName === 'negro' ? '#000' : '#0bb400';
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

// -----------------------------------------------------------
// 🔵 RULETA EUROPEA – CON MOTOR DE FÍSICA MATTER.JS
// -----------------------------------------------------------

// Números de la ruleta en orden. Ahora se inicializan aquí
// para que la ruleta se dibuje al cargar la página.
let WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6,
    27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
    16, 33, 1, 20, 14, 31, 9, 22, 18, 29,
    7, 28, 12, 35, 3, 26
];

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

// Coordenadas y dimensiones
const CENTER = 230;
const R_WHEEL = 210;
const R_BALL_TRACK = 195; // Radio de la pista donde gira la bola
const R_NUMBERS = 150;    // Radio donde están los números

// -----------------------------------------------------------
// MOTOR DE FÍSICA MATTER.JS
// -----------------------------------------------------------
const { Engine, Runner, World, Bodies, Body, Events, Composite } = Matter;

let engine;
let world;
let runner;

let ballBody;
let wheelBody;
let pegs = []; // Los separadores entre números

// Variable para controlar la fase de "guía" final
let isGuiding = false;


// Estado
const sounds = {
    click: new Audio('/static/sounds/click.wav'),
    win: new Audio('/static/sounds/win.wav'),
    lose: new Audio('/static/sounds/lose.wav')
};

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
initPhysics(); // Inicializamos el mundo físico

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

        startPhysicsSpin();
    })
    .catch((err) => {
        spinning = false;
        console.error("Error en la API:", err);
        updateMessage("Error de conexión.");
    });
}

// -----------------------------------------------------------
// ANIMACIÓN REALISTA
// -----------------------------------------------------------
function initPhysics() {
    engine = Engine.create();
    world = engine.world;
    world.gravity.y = 0; // No queremos gravedad hacia abajo.

    // Creamos el cuerpo de la ruleta: un objeto grande y pesado.
    wheelBody = Bodies.circle(CENTER, CENTER, R_WHEEL, {
        isStatic: true, // Es estático para que no se mueva por colisiones, lo rotamos manualmente.
        frictionAir: 0.01, // Fricción del aire para que se detenga.
        label: 'wheel'
    });

    // Creamos los separadores (pegs) entre los números.
    const anglePerSlice = (2 * Math.PI) / WHEEL_ORDER.length;
    pegs = WHEEL_ORDER.map((_, i) => {
        const angle = i * anglePerSlice;
        const x = CENTER + Math.cos(angle) * (R_NUMBERS + 10);
        const y = CENTER + Math.sin(angle) * (R_NUMBERS + 10);
        return Bodies.circle(x, y, 4, {
            isStatic: true,
            restitution: 0.5, // Rebote
            label: 'peg'
        });
    });

    // Añadimos todo al mundo.
    World.add(world, [wheelBody, ...pegs]);

    // Bucle de actualización del motor.
    Events.on(engine, 'afterUpdate', () => {
        // Dibujamos la ruleta y la bola en cada frame según la data del motor.
        drawWheel();
        if (ballBody) drawBall();

        if (!spinning) return;

        // Fuerza que atrae la bola al centro (simula la caída).
        const pullForce = 0.0003;
        const vector = { x: CENTER - ballBody.position.x, y: CENTER - ballBody.position.y };
        const normalized = Matter.Vector.normalise(vector);
        const force = { x: normalized.x * pullForce, y: normalized.y * pullForce };
        Body.applyForce(ballBody, ballBody.position, force);

        // Rotamos los pegs junto con la ruleta.
        Composite.rotate(wheelBody, wheelBody.angularSpeed, { x: CENTER, y: CENTER });
        pegs.forEach(p => Body.rotate(p, wheelBody.angularSpeed, { x: CENTER, y: CENTER }));

        // Lógica para finalizar el giro de forma controlada.
        if (ballBody.speed < 0.2 && Matter.Vector.magnitude(vector) < R_BALL_TRACK - 20) {
            isGuiding = true;
        }

        if (isGuiding) {
            guideWheelToWinner();
        }

        // Condición de fin de la animación.
        if (isGuiding && wheelBody.angularSpeed < 0.0001 && ballBody.speed < 0.01) {
            spinning = false;
            isGuiding = false;
            Body.setAngularVelocity(wheelBody, 0); // Detener completamente.
            World.remove(world, ballBody);
            ballBody = null;
            showResult();
        }
    });

    // Sonido de colisión
    Events.on(engine, 'collisionStart', (event) => {
        if (!spinning) return;
        const pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            if ((pair.bodyA.label === 'ball' && pair.bodyB.label === 'peg') ||
                (pair.bodyA.label === 'peg' && pair.bodyB.label === 'ball')) {
                sounds.click.volume = Math.min(1, ballBody.speed / 5);
                if (sounds.click.volume > 0.1) sounds.click.play();
                break;
            }
        }
    });

    // Iniciamos el corredor del motor.
    runner = Runner.create();
    Runner.run(runner, engine);
}

function startPhysicsSpin() {
    // Creamos la bola en su posición inicial.
    ballBody = Bodies.circle(CENTER, CENTER - R_BALL_TRACK, 12, {
        restitution: 0.3,
        friction: 0.1,
        frictionAir: 0.005,
        label: 'ball'
    });
    World.add(world, ballBody);

    // Aplicamos fuerzas iniciales.
    Body.setAngularVelocity(wheelBody, 0.15); // Velocidad angular a la ruleta.
    Body.setVelocity(ballBody, { x: -12, y: 0 }); // Velocidad lineal a la bola.
}

function guideWheelToWinner() {
    // Esta función "guía" sutilmente la ruleta a su posición final.
    const anglePerSlice = (2 * Math.PI) / WHEEL_ORDER.length;
    const targetAngle = -(winnerIndex * anglePerSlice) - (anglePerSlice / 2);

    // Calculamos la diferencia de ángulo por el camino más corto.
    let angleDifference = targetAngle - (wheelBody.angle % (2 * Math.PI));
    if (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
    if (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;

    // Aplicamos una fuerza de torsión correctiva muy pequeña.
    const correctionForce = angleDifference * 0.0005;
    wheelBody.torque = correctionForce;
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

    const currentWheelAngle = wheelBody ? wheelBody.angle : 0;

    for (let i = 0; i < slices; i++) {
        const start = currentWheelAngle + i * anglePerSlice - Math.PI / 2;
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
    if (!ballBody) return;

    const { x, y } = ballBody.position;

    // Dibujamos la bola en la posición que nos da el motor de física.
    ballCtx.beginPath();
    ballCtx.arc(x, y, 12, 0, Math.PI * 2);
    ballCtx.fillStyle = "#fff";
    ballCtx.fill();
}

// -----------------------------------------------------------
// INICIAR DIBUJOS
// -----------------------------------------------------------
updateMessage();

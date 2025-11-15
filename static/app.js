//--------------------------------------------------
// CONFIGURACIÓN DE RULETA EUROPEA REAL
//--------------------------------------------------
const NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27,
    13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1,
    20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

// Colores reales de ruleta europea
function getColor(num) {
    if (num === 0) return "verde";
    const rojos = [32,19,21,25,34,27,36,30,23,5,16,1,14,9,18,7,12,3];
    return rojos.includes(num) ? "rojo" : "negro";
}

//--------------------------------------------------
// CANVAS SETUP
//--------------------------------------------------
const canvas = document.getElementById("ruleta");
const ctx = canvas.getContext("2d");

const CENTER = canvas.width / 2;
const R = CENTER - 10;
let angle = 0;
let speed = 0;
let spinning = false;

//--------------------------------------------------
// DIBUJO DE RULETA
//--------------------------------------------------
function drawWheel() {
    const slice = (2 * Math.PI) / NUMBERS.length;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Slices
    for (let i=0; i<NUMBERS.length; i++) {
        const start = angle + i * slice;
        const end   = start + slice;

        const n = NUMBERS[i];
        let colorSector = getColor(n);
        ctx.fillStyle = (colorSector === "rojo") ? "#d40000"
                     : (colorSector === "negro") ? "#000"
                     : "#0a8a0a";

        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, R, start, end);
        ctx.closePath();
        ctx.fill();

        // Texto
        ctx.save();
        ctx.fillStyle = "white";
        ctx.translate(CENTER, CENTER);
        ctx.rotate(start + slice / 2);
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillText(n.toString(), R - 35, 8);
        ctx.restore();
    }

    // bola
    let ballAngle = angle + 0.1;
    let bx = CENTER + Math.cos(ballAngle) * (R - 70);
    let by = CENTER + Math.sin(ballAngle) * (R - 70);

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(bx, by, 12, 0, Math.PI * 2);
    ctx.fill();
}

//--------------------------------------------------
// ANIMACIÓN
//--------------------------------------------------
function animate() {
    if (spinning) {
        angle += speed;
        speed *= 0.985;

        if (speed < 0.002) {
            spinning = false;
            showResult();
        }
    }

    drawWheel();
    requestAnimationFrame(animate);
}
animate();

//--------------------------------------------------
// INICIAR GIRO
//--------------------------------------------------
function spin() {
    if (spinning) return;

    speed = 0.25 + Math.random() * 0.25;
    spinning = true;

    document.getElementById("resultado").innerText = "Girando…";
}

//--------------------------------------------------
// CALCULAR RESULTADO
//--------------------------------------------------
function showResult() {
    const slice = (2 * Math.PI) / NUMBERS.length;

    let a = (angle % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
    let index = Math.floor(NUMBERS.length - (a / slice)) % NUMBERS.length;

    const num = NUMBERS[index];
    const color = getColor(num);

    document.getElementById("resultado").innerText =
        `Salió ${num} (${color.toUpperCase()})`;

    updateHistory(num);
}

//--------------------------------------------------
// HISTORIAL
//--------------------------------------------------
function updateHistory(n) {
    const h = document.getElementById("historial");
    h.innerText = n + "  " + h.innerText;
}

//--------------------------------------------------
// AUTO SPIN
//--------------------------------------------------
let autoSpin = false;

document.getElementById("auto").onclick = () => {
    autoSpin = !autoSpin;
    document.getElementById("auto").innerText =
        autoSpin ? "AUTO SPIN: ON" : "AUTO SPIN: OFF";

    if (autoSpin) autoLoop();
};

function autoLoop() {
    if (!autoSpin) return;
    spin();

    let apuesta = 10;
document.querySelectorAll(".chip").forEach(btn=>{
    btn.onclick = ()=>{
        apuesta = Number(btn.dataset.value);
        updateBetUI();
    };
});

function updateBetUI() {
    document.querySelectorAll(".chip").forEach(btn=>{
        btn.style.background = (Number(btn.dataset.value) === apuesta)
            ? "#ffd37a"
            : "#333";
    });
}
updateBetUI();

    setTimeout(autoLoop, 3500);
}

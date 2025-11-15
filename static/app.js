// ============================================================================
// CONFIGURACIÓN RULETA
// ============================================================================

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
    const redList = [32,19,21,25,34,27,36,30,23,5,16,1,14,9,18,7,12,3];
    return redList.includes(num) ? "rojo" : "negro";
}

// ============================================================================
// CANVAS
// ============================================================================

const rouletteCanvas = document.getElementById("rouletteCanvas");
const ballCanvas = document.getElementById("ballCanvas");
const ctx = rouletteCanvas.getContext("2d");
const ballCtx = ballCanvas.getContext("2d");

rouletteCanvas.width = rouletteCanvas.height = 420;
ballCanvas.width = ballCanvas.height = 420;

const CENTER = 210;
const R_WHEEL = 200;
const R_BALL = 140;

// ============================================================================
// ESTADO DEL JUEGO
// ============================================================================

let wheelAngle = 0;
let ballAngle = 0;

let spinning = false;
let autoSpin = false;

let selectedColor = null;
let selectedBet = null;

let saldo = 1000;

let winnerIndex = null;
let winnerNumber = null;
let winnerColor = null;

// ====== ZOOM REAL ======
let zoom_active = false;
let zoom_factor = 2.7;    // <<── AJUSTA AQUÍ TU NIVEL DE ZOOM

// ============================================================================
// ELEMENTOS DOM
// ============================================================================

const saldoSpan = document.getElementById("saldo");
const historySpan = document.getElementById("history");
const resultDiv = document.getElementById("result");

// sonidos opcionales
const spinSound = new Audio("/static/sounds/spin.mp3");
const winSound  = new Audio("/static/sounds/win.mp3");
const loseSound = new Audio("/static/sounds/lose.mp3");

// ============================================================================
// DIBUJAR RULETA
// ============================================================================

function drawWheel() {

    ctx.clearRect(0,0,420,420);

    // ========== APLICAR ZOOM REAL ==========
    ctx.save();
    if (zoom_active) {
        ctx.translate(CENTER, CENTER);
        ctx.scale(zoom_factor, zoom_factor);
        ctx.translate(-CENTER, -CENTER);
    }

    const slice = SLICE_ANGLE;

    for (let i = 0; i < SLICES; i++) {
        const start = wheelAngle + i * slice;
        const end   = start + slice;
        const num = NUMBERS[i];
        const col = getColor(num);

        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, R_WHEEL, start, end);
        ctx.closePath();

        ctx.fillStyle =
            (col === "rojo") ? "#d40000" :
            (col === "negro") ? "#000" :
            "#009a00";

        ctx.fill();

        // números
        ctx.save();
        ctx.translate(CENTER, CENTER);
        ctx.rotate(start + slice/2);
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(num, R_WHEEL - 32, 8);
        ctx.restore();
    }

    // restaurar zoom
    ctx.restore();

    // ================= RGB RING ================
    const time = performance.now() / 5;
    const ringRadius = R_WHEEL + 6;
    const segments = 140;

    for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;

        const hue = (i * 4 + time) % 360;

        ctx.beginPath();
        ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.lineWidth = 4;
        ctx.arc(CENTER, CENTER, ringRadius, a1, a2);
        ctx.stroke();
    }
}

// ============================================================================
// DIBUJAR BOLA
// ============================================================================

function drawBall() {

    ballCtx.clearRect(0,0,420,420);

    const x = CENTER + Math.cos(ballAngle) * R_BALL;
    const y = CENTER + Math.sin(ballAngle) * R_BALL;

    // sombra leve
    ballCtx.beginPath();
    ballCtx.arc(x+2, y+2, 11, 0, Math.PI*2);
    ballCtx.fillStyle = "rgba(0,0,0,0.3)";
    ballCtx.fill();

    // bola
    ballCtx.beginPath();
    ballCtx.arc(x, y, 10, 0, Math.PI * 2);
    ballCtx.fillStyle = "#fff";
    ballCtx.fill();
}

// ============================================================================
// SELECCIÓN DE COLOR
// ============================================================================

document.querySelectorAll(".color-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
        document.querySelectorAll(".color-btn").forEach(b=>b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedColor = btn.dataset.color;
        updateMsg();
    });
});

// ============================================================================
// SELECCIÓN DE APUESTA
// ============================================================================

document.querySelectorAll(".chip-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
        document.querySelectorAll(".chip-btn").forEach(b=>b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedBet = parseInt(btn.dataset.value);
        updateMsg();
    });
});

// ============================================================================
// MENSAJE DE ESTADO
// ============================================================================

function updateMsg(msg=null){
    if(msg){
        resultDiv.textContent = msg;
        return;
    }
    if(!selectedColor && !selectedBet){
        resultDiv.textContent = "Selecciona color y apuesta…";
    } else if(!selectedColor){
        resultDiv.textContent = "Selecciona un color…";
    } else if(!selectedBet){
        resultDiv.textContent = "Selecciona una ficha…";
    } else {
        resultDiv.textContent = `Listo para girar: ${selectedColor.toUpperCase()} $${selectedBet}`;
    }
}

// ============================================================================
// BOTONES
// ============================================================================

document.getElementById("spinBtn").addEventListener("click", ()=>spin(false));

document.getElementById("autoBtn").addEventListener("click", ()=>{
    autoSpin = !autoSpin;
    document.getElementById("autoBtn").textContent = autoSpin ? "AUTO SPIN: ON" : "AUTO SPIN: OFF";
    if(autoSpin && !spinning) spin(true);
});

// ============================================================================
// GIRO
// ============================================================================

async function spin(isAuto){

    if(spinning) return;

    if(!selectedColor || !selectedBet){
        updateMsg();
        return;
    }

    if(saldo < selectedBet){
        updateMsg("Saldo insuficiente.");
        autoSpin = false;
        document.getElementById("autoBtn").textContent = "AUTO SPIN: OFF";
        return;
    }

    spinning = true;
    spinSound.play().catch(()=>{});

    const resp = await fetch("/api/spin", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            balance: saldo,
            bet: selectedBet,
            color: selectedColor
        })
    });

    const data = await resp.json();

    winnerIndex  = data.index;
    winnerNumber = data.number;
    winnerColor  = data.color;

    const targetAngle = winnerIndex * SLICE_ANGLE + SLICE_ANGLE/2;

    const startWheel = wheelAngle;
    const startBall  = ballAngle;

    const rel0 = ((startBall - startWheel) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
    const relTarget = targetAngle;

    const extraWheel = 4 * Math.PI * 2;
    const extraBall  = 7 * Math.PI * 2;

    const wheelDelta = extraWheel;
    const relDelta   = relTarget - rel0 + extraBall;
    const ballDelta  = wheelDelta + relDelta;

    const duration = 3800;
    const start = performance.now();

    function easeOut(t){ return 1 - Math.pow(1-t,3); }

    function anim(now){
        let t = (now-start)/duration;
        if(t>1) t=1;
        let e = easeOut(t);

        wheelAngle = startWheel + wheelDelta * e;
        ballAngle  = startBall  + ballDelta  * e;

        drawWheel();
        drawBall();

        if(t<1){
            requestAnimationFrame(anim);
        } else {
            finishSpin(data);
        }
    }

    resultDiv.textContent = "Girando…";

    requestAnimationFrame(anim);
}

// ============================================================================
// FIN DEL GIRO
// ============================================================================

function finishSpin(data){

    // ZOOM IN
    zoom_active = true;

    setTimeout(()=>{
        zoom_active = false;
        drawWheel();
        drawBall();
    }, 900);

    // Pequeño rebote bola
    const base = ballAngle;
    const amp = 0.09;
    const bounces = 10;
    const dur = 500;
    const start = performance.now();

    function bounce(now){
        let t = (now-start)/dur;
        if(t>1) t=1;
        let damp = 1 - t;
        let off = Math.sin(t * bounces * Math.PI) * amp * damp;

        ballAngle = base + off;

        drawWheel();
        drawBall();

        if(t<1){
            requestAnimationFrame(bounce);
        } else {
            finalizeResult(data);
        }
    }

    requestAnimationFrame(bounce);
}

// ============================================================================
// RESULTADOS
// ============================================================================

function finalizeResult(data){

    spinning = false;

    const { number, color, win, newBalance } = data;

    historySpan.textContent = number + " " + historySpan.textContent;

    if(win > 0){
        saldo = newBalance;
        updateMsg(`¡Ganaste! Salió ${number} (${color.toUpperCase()}) +$${win}`);
        winSound.play().catch(()=>{});
    } else {
        saldo = newBalance;
        updateMsg(`Perdiste. Salió ${number} (${color.toUpperCase()}) -$${selectedBet}`);
        loseSound.play().catch(()=>{});
    }

    saldoSpan.textContent = `$${saldo}`;

    if(autoSpin && saldo >= selectedBet){
        setTimeout(()=>spin(true), 800);
    } else if(saldo < selectedBet){
        autoSpin = false;
        document.getElementById("autoBtn").textContent = "AUTO SPIN: OFF";
    }
}

// ============================================================================
// PRIMERA CARGA
// ============================================================================

drawWheel();
drawBall();
updateMsg();


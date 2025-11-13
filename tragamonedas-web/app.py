# main.py
import random
from typing import List
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Permitir peticiones desde cualquier origen (para que funcione en Web y App Inventor)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en producción puedes limitar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Símbolos del juego (emojis)
SYMBOLS = ["🍒", "🍋", "🍇", "🔔", "⭐", "7️⃣"]

# Tabla de pagos (multiplicador de la apuesta por línea)
PAYTABLE = {
    "🍒": 5,
    "🍋": 4,
    "🍇": 6,
    "🔔": 8,
    "⭐": 10,
    "7️⃣": 20,
}


class SpinRequest(BaseModel):
    bet: int


class SpinResponse(BaseModel):
    grid: List[List[str]]
    win: int


def generate_grid() -> List[List[str]]:
    """Genera un grid 3x3 de símbolos aleatorios."""
    return [[random.choice(SYMBOLS) for _ in range(3)] for _ in range(3)]


def calc_payout(grid: List[List[str]], bet: int) -> int:
    """Calcula el pago total en 5 líneas: 3 horizontales + 2 diagonales."""
    total_win = 0

    # 3 líneas horizontales
    for row in grid:
        if row[0] == row[1] == row[2]:
            symbol = row[0]
            total_win += bet * PAYTABLE.get(symbol, 0)

    # Diagonal principal
    if grid[0][0] == grid[1][1] == grid[2][2]:
        symbol = grid[0][0]
        total_win += bet * PAYTABLE.get(symbol, 0)

    # Diagonal inversa
    if grid[0][2] == grid[1][1] == grid[2][0]:
        symbol = grid[0][2]
        total_win += bet * PAYTABLE.get(symbol, 0)

    return total_win


@app.get("/")
def root():
    return {"message": "Slot API activa"}


@app.post("/spin", response_model=SpinResponse)
def spin(req: SpinRequest):
    # Seguridad mínima para evitar tonterías
    bet = max(1, min(req.bet, 10_000))

    grid = generate_grid()
    win = calc_payout(grid, bet)

    return SpinResponse(grid=grid, win=win)


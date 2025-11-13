from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import os

app = FastAPI()

# PERMITIR CUALQUIER ORIGEN (web + app inventor)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SERVIR CARPETA STATIC
app.mount("/static", StaticFiles(directory="static"), name="static")

# Símbolos
SYMBOLS = ["🍒", "🍋", "🍇", "🔔", "⭐", "7️⃣"]

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
    grid: list
    win: int

@app.get("/")
def serve_frontend():
    return FileResponse("static/index.html")

def generate_grid():
    return [[random.choice(SYMBOLS) for _ in range(3)] for _ in range(3)]

def calc_payout(grid, bet):
    total = 0

    # Líneas horizontales
    for row in grid:
        if row[0] == row[1] == row[2]:
            total += bet * PAYTABLE[row[0]]

    # Diagonal principal
    if grid[0][0] == grid[1][1] == grid[2][2]:
        total += bet * PAYTABLE[grid[0][0]]

    # Diagonal inversa
    if grid[0][2] == grid[1][1] == grid[2][0]:
        total += bet * PAYTABLE[grid[0][2]]

    return total

@app.post("/spin", response_model=SpinResponse)
def spin(req: SpinRequest):
    bet = max(1, min(req.bet, 10000))
    grid = generate_grid()
    win = calc_payout(grid, bet)
    return SpinResponse(grid=grid, win=win)



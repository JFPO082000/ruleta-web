# app.py
# Backend de Ruleta – Flask + API JSON
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import random
import os

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

# --------- LÓGICA DE RULETA ---------
NUM_WHEEL = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6,
    27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16,
    33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28,
    12, 35, 3, 26
]

RED_SET = {1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36}


def num_color(n: int) -> str:
    if n == 0:
        return "verde"
    return "rojo" if n in RED_SET else "negro"


# --------- RUTAS ---------

@app.route("/")
def index():
    # sirve la interfaz web
    return render_template("index.html")


@app.route("/api/spin", methods=["POST"])
def api_spin():
    """
    Espera JSON:
    {
      "balance": 1000,
      "bet": 10,
      "color": "rojo" | "negro" | "verde"
    }
    """
    data = request.get_json(force=True) or {}
    balance = int(data.get("balance", 1000))
    bet = int(data.get("bet", 0))
    color = data.get("color")

    if color not in ("rojo", "negro", "verde"):
        return jsonify({"error": "Color inválido"}), 400

    if bet <= 0:
        return jsonify({"error": "La apuesta debe ser mayor a 0"}), 400

    if bet > balance:
        return jsonify({"error": "Saldo insuficiente"}), 400

    balance -= bet

    # elegir sector ganador
    idx = random.randint(0, len(NUM_WHEEL) - 1)
    number = NUM_WHEEL[idx]
    result_color = num_color(number)

    win = bet * 2 if result_color == color else 0
    balance += win

    return jsonify({
        "index": idx,               # índice del sector ganador (0-36)
        "number": number,           # número ganador
        "color": result_color,      # "rojo"/"negro"/"verde"
        "win": win,                 # dinero ganado
        "newBalance": balance       # saldo actualizado
    })


if __name__ == "__main__":
    # para desarrollo local: python app.py
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)




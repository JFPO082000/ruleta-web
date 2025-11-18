# app.py
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import random
import os

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

# -----------------------------------------------------------
#  RULETA EUROPEA — ORDEN REAL OFICIAL (sentido horario)
# -----------------------------------------------------------
WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6,
    27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
    16, 33, 1, 20, 14, 31, 9, 22, 18, 29,
    7, 28, 12, 35, 3, 26
]

RED_NUMBERS = {
    1, 3, 5, 7, 9, 12, 14, 16,
    18, 19, 21, 23, 25, 27,
    30, 32, 34, 36
}


def color_of(n):
    if n == 0:
        return "verde"
    return "rojo" if n in RED_NUMBERS else "negro"


# -----------------------------------------------------------
#  RUTA PRINCIPAL
# -----------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


# -----------------------------------------------------------
#  API DE SPIN — DEVUELVE RESPUESTA EXACTA PARA EL JS
# -----------------------------------------------------------
@app.route("/api/spin", methods=["POST"])
def api_spin():
    data = request.get_json(force=True)

    balance = int(data["balance"])
    bet = int(data["bet"])
    color = data["color"]

    if bet > balance:
        return jsonify({"error": "Saldo insuficiente"}), 400

    # Elegir índice ganador REAL
    idx = random.randint(0, len(WHEEL_ORDER) - 1)
    number = WHEEL_ORDER[idx]
    result_color = color_of(number)

    # Ganancia
    win = 0
    if color == result_color:
        win = bet * (35 if color == "verde" else 1)

    new_balance = balance - bet + win

    return jsonify({
        "wheel": WHEEL_ORDER,
        "index": idx,
        "number": number,
        "color": result_color,
        "win": win,
        "newBalance": new_balance
    })


# -----------------------------------------------------------
#  INICIO SERVIDOR PARA DESARROLLO
# -----------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)

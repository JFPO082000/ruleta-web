import random
from kivy.app import App
from kivy.lang import Builder
from kivy.properties import NumericProperty, ListProperty, StringProperty, ColorProperty, BooleanProperty
from kivy.clock import Clock
from kivy.core.window import Window
from kivy.animation import Animation
from kivy.uix.image import Image

# --- CONFIG VISUAL ---
Window.size = (380, 700)
Window.clearcolor = (0.125, 0.125, 0.125, 1)  # #202020 color base

KV = r"""
#:import dp kivy.metrics.dp

<AnimatedSlot@Widget>:
    # Widget que contiene una imagen giratoria
    source: ""
    Image:
        id: img
        source: root.source
        allow_stretch: True
        keep_ratio: True
        size: root.size
        pos: root.pos
        opacity: 1

BoxLayout:
    orientation: "vertical"
    padding: dp(20)
    spacing: dp(15)
    canvas.before:
        Color:
            rgba: app.bg_color
        Rectangle:
            pos: self.pos
            size: self.size

    Label:
        text: "🎰 ROYAL SLOTS 🎰"
        font_size: dp(30)
        bold: True
        color: (0.67, 0.57, 0.36, 1)
        size_hint_y: 0.12

    # --- MATRIZ DE CARRETES 3x3 ---
    GridLayout:
        id: reels_grid
        cols: 3
        rows: 3
        spacing: dp(5)
        size_hint_y: 0.42
        canvas.before:
            Color:
                rgba: app.reel_border_color
            RoundedRectangle:
                pos: self.pos
                size: self.size
                radius: [dp(20),]
        AnimatedSlot:
            id: r1c1
            source: app.reels[0][0]
        AnimatedSlot:
            id: r1c2
            source: app.reels[0][1]
        AnimatedSlot:
            id: r1c3
            source: app.reels[0][2]
        AnimatedSlot:
            id: r2c1
            source: app.reels[1][0]
        AnimatedSlot:
            id: r2c2
            source: app.reels[1][1]
        AnimatedSlot:
            id: r2c3
            source: app.reels[1][2]
        AnimatedSlot:
            id: r3c1
            source: app.reels[2][0]
        AnimatedSlot:
            id: r3c2
            source: app.reels[2][1]
        AnimatedSlot:
            id: r3c3
            source: app.reels[2][2]

    Label:
        text: app.status
        font_size: dp(18)
        color: (1, 1, 1, 1)
        size_hint_y: 0.1

    # --- Apuesta + AutoSpin ---
    BoxLayout:
        size_hint_y: 0.1
        spacing: dp(10)
        Label:
            text: "💰 Apuesta:"
            color: (1, 1, 1, 1)
            font_size: dp(18)
            size_hint_x: 0.45
        TextInput:
            id: bet_input
            text: str(int(app.bet))
            input_filter: "int"
            font_size: dp(18)
            multiline: False
            background_color: (0.18, 0.18, 0.18, 1)
            foreground_color: (1, 1, 1, 1)
            cursor_color: (1, 1, 1, 1)
            size_hint_x: 0.35
            padding: [dp(10), dp(10)]
        ToggleButton:
            id: auto_btn
            text: "Auto-Spin OFF"
            font_size: dp(14)
            background_normal: ""
            background_color: (0.3, 0.3, 0.3, 1)
            color: (1, 1, 1, 1)
            on_state:
                app.toggle_autospin(self.state)

    # --- Botones principales ---
    BoxLayout:
        size_hint_y: 0.15
        spacing: dp(10)
        Button:
            text: "SPIN 🎡"
            bold: True
            font_size: dp(22)
            background_normal: ""
            background_color: (0.67, 0.57, 0.36, 1)
            color: (0, 0, 0, 1)
            on_release:
                app.update_bet(bet_input.text)
                app.do_spin()

        Button:
            text: "↻ Reiniciar"
            font_size: dp(18)
            background_normal: ""
            background_color: (0.3, 0.3, 0.3, 1)
            color: (1, 1, 1, 1)
            on_release: app.reset_game()

    Label:
        text: f"Saldo actual: [b]{int(app.balance)}[/b]"
        markup: True
        font_size: dp(20)
        color: (0.67, 0.57, 0.36, 1)
        size_hint_y: 0.1

    Label:
        text: "5 Líneas (3 horizontales + 2 diagonales) | Auto-Spin activo hasta saldo 0"
        font_size: dp(13)
        color: (0.8, 0.8, 0.8, 1)
        size_hint_y: 0.05
"""

# --- LÓGICA DEL JUEGO ---
SYMBOLS = [
    "images/cherry.png",
    "images/lemon.png",
    "images/grape.png",
    "images/bell.png",
    "images/star.png",
    "images/seven.png"
]

PAYTABLE = {
    "images/cherry.png": 5,
    "images/lemon.png": 4,
    "images/grape.png": 6,
    "images/bell.png": 8,
    "images/star.png": 10,
    "images.seven.png": 20
}


class SlotMachine:
    def spin(self):
        """Genera una matriz 3x3 de símbolos aleatorios."""
        return [[random.choice(SYMBOLS) for _ in range(3)] for _ in range(3)]

    def calc_payout(self, reels, bet):
        """Evalúa 5 líneas (3 horizontales + 2 diagonales)."""
        total_win = 0
        # Horizontales
        for row in reels:
            if row[0] == row[1] == row[2]:
                total_win += bet * PAYTABLE[row[0]]
        # Diagonales
        if reels[0][0] == reels[1][1] == reels[2][2]:
            total_win += bet * PAYTABLE[reels[0][0]]
        if reels[0][2] == reels[1][1] == reels[2][0]:
            total_win += bet * PAYTABLE[reels[0][2]]
        return total_win


# --- APP PRINCIPAL ---
class SlotApp(App):
    balance = NumericProperty(500)
    bet = NumericProperty(10)
    reels = ListProperty([[SYMBOLS[0]] * 3 for _ in range(3)])
    status = StringProperty("Pulsa SPIN para comenzar")
    spinning = False
    auto_spin = BooleanProperty(False)

    bg_color = ColorProperty((0.125, 0.125, 0.125, 1))
    reel_border_color = ColorProperty((0.2, 0.2, 0.2, 1))
    last_result_was_win = False

    def build(self):
        self.title = "Royal Slots"
        self.game = SlotMachine()
        return Builder.load_string(KV)

    def toggle_autospin(self, state):
        self.auto_spin = state == "down"
        self.root.ids.auto_btn.text = "Auto-Spin ON" if self.auto_spin else "Auto-Spin OFF"
        if self.auto_spin and not self.spinning:
            self.do_spin()

    def update_bet(self, value):
        try:
            amount = int(value)
            if 1 <= amount <= self.balance:
                self.bet = amount
            else:
                self.status = "Apuesta inválida ⚠️"
        except ValueError:
            self.status = "Escribe un número válido 💬"

    def can_spin(self):
        return (not self.spinning) and (self.balance >= self.bet)

    def do_spin(self):
        # Reinicia color si ganó antes
        if self.last_result_was_win:
            Animation(bg_color=(0.125, 0.125, 0.125, 1), duration=0.4).start(self)
            self.last_result_was_win = False

        if not self.can_spin():
            self.status = "Saldo insuficiente 💸"
            self.auto_spin = False
            self.root.ids.auto_btn.state = "normal"
            return

        self.spinning = True
        self.status = "Girando..."
        self.balance -= self.bet

        # Animar giro dinámico individual
        self.animate_reels()

    def animate_reels(self):
        """Hace que cada casilla gire con retardo y animación vertical."""
        for i in range(3):
            for j in range(3):
                delay = (i * 0.15) + (j * 0.08)
                Clock.schedule_once(lambda dt, r=i, c=j: self.spin_cell(r, c), delay)
        # Mostrar resultado final después del giro
        Clock.schedule_once(lambda dt: self._finalize_spin(), 1.8)

    def spin_cell(self, row, col):
        """Animación de un solo símbolo girando hacia abajo."""
        cell = self.root.ids[f"r{row+1}c{col+1}"]
        anim = Animation(y=cell.y - 50, opacity=0, duration=0.08) + Animation(
            y=cell.y, opacity=1, duration=0.08
        )
        new_symbol = random.choice(SYMBOLS)
        anim.bind(on_complete=lambda *a: setattr(cell, "source", new_symbol))
        anim.start(cell)

    def _finalize_spin(self):
        self.reels = self.game.spin()
        # Actualizar imágenes finales
        for i in range(3):
            for j in range(3):
                cell = self.root.ids[f"r{i+1}c{j+1}"]
                cell.source = self.reels[i][j]

        win = self.game.calc_payout(self.reels, self.bet)

        if win > 0:
            self.balance += win
            self.status = f"🎉 ¡Ganaste {win}! 🎉"
            self._win_effects()
            self.last_result_was_win = True
        else:
            self.status = "Sigue intentando..."
            self._lose_effect()

        self.spinning = False

        # Auto-spin
        if self.auto_spin and self.balance >= self.bet:
            Clock.schedule_once(lambda dt: self.do_spin(), 2)

    # --- EFECTOS VISUALES ---
    def _win_effects(self):
        Animation(bg_color=(0.0, 0.5, 0.0, 1), duration=0.3).start(self)
        anim_border = (
            Animation(reel_border_color=(0.67, 0.57, 0.36, 1), duration=0.1)
            + Animation(reel_border_color=(0.2, 0.2, 0.2, 1), duration=0.3)
        )
        anim_border.repeat = True
        anim_border.start(self)
        Clock.schedule_once(lambda dt: anim_border.stop(self), 1.4)

    def _lose_effect(self):
        anim_bg = (
            Animation(bg_color=(0.4, 0.0, 0.0, 1), duration=0.15)
            + Animation(bg_color=(0.125, 0.125, 0.125, 1), duration=0.4)
        )
        anim_bg.start(self)

    def reset_game(self):
        self.balance = 500
        self.bet = 10
        self.reels = [[SYMBOLS[0]] * 3 for _ in range(3)]
        self.status = "Juego reiniciado 🔄"
        self.bg_color = (0.125, 0.125, 0.125, 1)
        self.reel_border_color = (0.2, 0.2, 0.2, 1)
        self.last_result_was_win = False
        self.spinning = False
        self.auto_spin = False
        self.root.ids.auto_btn.text = "Auto-Spin OFF"
        self.root.ids.auto_btn.state = "normal"

if __name__ == "__main__":
    SlotApp().run()

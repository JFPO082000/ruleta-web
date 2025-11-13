# -*- coding: utf-8 -*-
# --------------------------------------------------------------
# BLACKJACK MÓVIL PROFESIONAL CON ANIMACIONES
# --------------------------------------------------------------
# - Layout vertical tipo celular (390x780)
# - Mesa semicircular, fichas, botones laterales, botón DEAL/NEW ROUND
# - Animaciones: slide-in, flip, pulso de apuesta, contador de saldo
# --------------------------------------------------------------

import pygame
import random
import math
import time
import sys

pygame.init()

# --------------------------------------------------------------
# CONFIGURACIÓN GENERAL
# --------------------------------------------------------------
BASE_W, BASE_H = 390, 780
window = pygame.display.set_mode((BASE_W, BASE_H))
pygame.display.set_caption("Blackjack - Mobile Animated")
clock = pygame.time.Clock()
FPS = 60

# Colores
COLOR_BG = (32, 32, 32)
COLOR_TABLE_EDGE = (210, 210, 210)
COLOR_TABLE = (45, 150, 130)
COLOR_TABLE_TEXT = (230, 240, 240)
COLOR_ACCENT = (171, 146, 92)
COLOR_CARD_FACE = (245, 245, 245)
COLOR_CARD_BACK = (171, 146, 92)
COLOR_CARD_BACK_INNER = (120, 100, 60)
COLOR_TEXT = (235, 235, 235)
COLOR_RED = (220, 70, 70)
COLOR_TRAY = (15, 15, 15)
COLOR_BUTTON_ENABLED = (230, 230, 230)
COLOR_BUTTON_DISABLED = (90, 90, 90)
COLOR_BUTTON_TEXT = (20, 20, 20)

# Fuentes
FONT_XS = pygame.font.SysFont("arial", 14)
FONT_S = pygame.font.SysFont("arial", 18)
FONT_M = pygame.font.SysFont("arial", 22, bold=True)
FONT_L = pygame.font.SysFont("arial", 30, bold=True)

# --------------------------------------------------------------
# UTILIDADES
# --------------------------------------------------------------
def draw_text(surface, text, font, color, pos, center=True):
    if not text:
        return
    img = font.render(text, True, color)
    rect = img.get_rect()
    if center:
        rect.center = pos
    else:
        rect.topleft = pos
    surface.blit(img, rect)

def lerp(a, b, t):
    return a + (b - a) * t

def ease_out(t):
    return 1 - (1 - t) ** 2

def ease_in_out(t):
    return t * t * (3 - 2 * t)

# --------------------------------------------------------------
# SISTEMA DE ANIMACIONES
# --------------------------------------------------------------
animations = []

class Animation:
    def __init__(self, duration):
        self.duration = duration
        self.start = time.time()
        self.finished = False

    def progress(self):
        p = (time.time() - self.start) / self.duration
        if p >= 1:
            p = 1
            self.finished = True
        return p

def add_animation(anim):
    animations.append(anim)

# Animación del saldo (sube/baja suavizado)
class MoneyAnim(Animation):
    def __init__(self, game, start, end, duration=0.6):
        super().__init__(duration)
        self.game = game
        self.start_val = start
        self.end_val = end

    def update(self):
        t = ease_in_out(self.progress())
        self.game.bank_display = int(lerp(self.start_val, self.end_val, t))

# Animación del mensaje central (pop + fade)
class TextPop(Animation):
    def __init__(self, ui, duration=0.6):
        super().__init__(duration)
        self.ui = ui

    def update(self):
        t = ease_out(self.progress())
        self.ui.msg_alpha = int(255 * t)
        self.ui.msg_scale = 1 + 0.4 * (1 - t)

# Pulso del círculo BET
class BetPulse(Animation):
    def __init__(self, ui, duration=0.5):
        super().__init__(duration)
        self.ui = ui

    def update(self):
        self.ui.bet_pulse = 1 - self.progress()

# Animación pequeña al presionar botón
class ButtonPress(Animation):
    def __init__(self, button, duration=0.2):
        super().__init__(duration)
        self.button = button

    def update(self):
        t = self.progress()
        self.button.scale = 1 - 0.12 * math.sin(t * math.pi)

# --------------------------------------------------------------
# CARTAS Y BARAJA
# --------------------------------------------------------------
CARD_W, CARD_H = 80, 115
SUITS = ["♠", "♥", "♦", "♣"]
RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]

def card_value(rank):
    if rank == "A":
        return 11
    if rank in ("J", "Q", "K"):
        return 10
    return int(rank)

class Deck:
    def __init__(self):
        self.cards = [(r, s) for s in SUITS for r in RANKS] * 4
        random.shuffle(self.cards)

    def draw(self):
        if not self.cards:
            self.__init__()
        return self.cards.pop()

def hand_value(hand):
    total = 0
    aces = 0
    for r, s in hand:
        total += card_value(r)
        if r == "A":
            aces += 1
    while total > 21 and aces > 0:
        total -= 10
        aces -= 1
    return total

def is_blackjack(hand):
    return len(hand) == 2 and hand_value(hand) == 21

# Sprite de carta (con slide y flip)
class CardSprite:
    def __init__(self, owner, card, index, face_up, delay):
        self.owner = owner  # "player" o "dealer"
        self.card = card
        self.index = index
        self.face_up_final = face_up
        self.face_up_now = face_up if face_up else False

        self.tx, self.ty = self._target_pos()
        self.sx, self.sy = BASE_W + 120, self.ty
        self.x, self.y = self.sx, self.sy

        self.delay = delay
        self.start = time.time()
        self.duration = 0.35

        self.flip_active = False
        self.flip_start = 0
        self.flip_duration = 0.4
        self.flip_scale = 1.0

    def _target_pos(self):
        spacing = 35
        base_x = BASE_W // 2 - spacing * 2
        y = 190 if self.owner == "dealer" else 330
        return base_x + self.index * spacing, y

    def start_flip(self):
        self.flip_active = True
        self.flip_start = time.time()

    def update(self):
        # Slide-in
        dt = time.time() - self.start
        if dt >= self.delay:
            t = min(1, (dt - self.delay) / self.duration)
            t_e = ease_out(t)
            self.x = lerp(self.sx, self.tx, t_e)
            self.y = lerp(self.sy, self.ty, t_e)

        # Flip
        if self.flip_active:
            tf = min(1, (time.time() - self.flip_start) / self.flip_duration)
            if tf < 0.5:
                self.flip_scale = lerp(1, 0, ease_out(tf * 2))
            else:
                if not self.face_up_now:
                    self.face_up_now = True
                self.flip_scale = lerp(0, 1, ease_out((tf - 0.5) * 2))
            if tf >= 1:
                self.flip_active = False

    def draw(self, surface):
        draw_card(surface, (self.x, self.y), self.card,
                  face_up=self.face_up_now, scale_x=self.flip_scale)

def draw_card(surface, center, card, face_up=True, scale_x=1.0):
    cx, cy = center
    w = max(4, int(CARD_W * max(scale_x, 0.05)))
    h = CARD_H
    rect = pygame.Rect(cx - w // 2, cy - h // 2, w, h)

    # Sombra
    shadow = pygame.Surface((w, h), pygame.SRCALPHA)
    pygame.draw.rect(shadow, (0, 0, 0, 160), (0, 0, w, h), border_radius=10)
    surface.blit(shadow, (rect.x + 3, rect.y + 4))

    if not face_up:
        pygame.draw.rect(surface, COLOR_CARD_BACK, rect, border_radius=10)
        inner = rect.inflate(-10, -10)
        pygame.draw.rect(surface, COLOR_CARD_BACK_INNER, inner, border_radius=8)
        draw_text(surface, "RC", FONT_M, (10, 10, 10), inner.center)
        return

    pygame.draw.rect(surface, COLOR_CARD_FACE, rect, border_radius=10)
    r, suit = card
    col = COLOR_RED if suit in ("♥", "♦") else (20, 20, 20)
    draw_text(surface, r, FONT_S, col, (rect.x + 12, rect.y + 8), center=False)
    draw_text(surface, suit, FONT_S, col, (rect.x + 12, rect.y + 28), center=False)
    draw_text(surface, suit, FONT_L, col, rect.center)

# --------------------------------------------------------------
# BOTONES Y FICHAS
# --------------------------------------------------------------
class Button:
    def __init__(self, rect, label, callback):
        self.rect = pygame.Rect(rect)
        self.label = label
        self.callback = callback
        self.enabled = True
        self.hover = False
        self.scale = 1.0

    def update(self, mouse_pos):
        self.hover = self.rect.collidepoint(mouse_pos)

    def draw(self, surface):
        w, h = self.rect.size
        sw = int(w * self.scale)
        sh = int(h * self.scale)
        x = self.rect.centerx - sw // 2
        y = self.rect.centery - sh // 2
        r = pygame.Rect(x, y, sw, sh)

        color = COLOR_BUTTON_ENABLED if self.enabled else COLOR_BUTTON_DISABLED
        if self.hover and self.enabled:
            color = (min(color[0] + 10, 255),
                     min(color[1] + 10, 255),
                     min(color[2] + 10, 255))
        pygame.draw.rect(surface, color, r, border_radius=14)
        draw_text(surface, self.label, FONT_S, COLOR_BUTTON_TEXT, r.center)

    def handle(self, event):
        if not self.enabled:
            return
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.rect.collidepoint(event.pos):
                add_animation(ButtonPress(self))
                self.callback()

class Chip:
    def __init__(self, pos, value, color):
        self.x, self.y = pos
        self.value = value
        self.color = color

    def draw(self, surface):
        pygame.draw.circle(surface, (0, 0, 0), (self.x, self.y), 30)
        pygame.draw.circle(surface, self.color, (self.x, self.y), 26)
        pygame.draw.circle(surface, (255, 255, 255), (self.x, self.y), 22, 3)
        draw_text(surface, str(self.value), FONT_M, (255, 255, 255), (self.x, self.y))

    def handle(self, event, game, ui):
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if math.hypot(event.pos[0] - self.x, event.pos[1] - self.y) <= 30:
                if game.state == "BETTING" and game.bet + self.value <= game.bank:
                    game.bet += self.value
                    add_animation(BetPulse(ui))
                elif game.state == "BETTING":
                    ui.set_message("NOT ENOUGH MONEY", COLOR_RED)

# --------------------------------------------------------------
# LÓGICA DE JUEGO
# --------------------------------------------------------------
class BlackjackGame:
    def __init__(self):
        self.deck = Deck()
        self.player = []
        self.dealer = []
        self.bet = 0
        self.bank = 500
        self.bank_display = self.bank
        self.state = "BETTING"   # BETTING, PLAYER, DEALER, END
        self.double_available = False

    def clear_hands(self):
        self.player = []
        self.dealer = []

    def start_round(self, ui):
        if self.bet == 0:
            ui.set_message("BET REQUIRED", COLOR_ACCENT)
            return
        if self.bet > self.bank:
            ui.set_message("NOT ENOUGH MONEY", COLOR_RED)
            return

        self.clear_hands()
        ui.clear_cards()

        order = [
            ("player", True),
            ("dealer", True),
            ("player", True),
            ("dealer", False)  # hole card
        ]
        delay = 0.0
        for owner, face_up in order:
            c = self.deck.draw()
            if owner == "player":
                self.player.append(c)
            else:
                self.dealer.append(c)
            ui.add_card(owner, c, face_up, delay)
            delay += 0.15

        self.state = "PLAYER"
        self.double_available = True
        ui.set_message("")

        if is_blackjack(self.player) or is_blackjack(self.dealer):
            self.resolve_blackjack(ui)

    def resolve_blackjack(self, ui):
        p = is_blackjack(self.player)
        d = is_blackjack(self.dealer)
        ui.reveal_hole()

        if p and d:
            ui.set_message("PUSH", COLOR_TEXT)
        elif p:
            win = int(self.bet * 1.5)
            ui.animate_money(self.bank, self.bank + win)
            self.bank += win
            ui.set_message("BLACKJACK!", COLOR_ACCENT)
        else:
            ui.animate_money(self.bank, self.bank - self.bet)
            self.bank -= self.bet
            ui.set_message("DEALER BLACKJACK", COLOR_RED)
        self.state = "END"

    def hit(self, ui):
        if self.state != "PLAYER":
            return
        c = self.deck.draw()
        self.player.append(c)
        ui.add_card("player", c, True, 0.0)
        self.double_available = False

        if hand_value(self.player) > 21:
            ui.animate_money(self.bank, self.bank - self.bet)
            self.bank -= self.bet
            ui.reveal_hole()
            ui.set_message("BUST", COLOR_RED)
            self.state = "END"

    def stand(self, ui):
        if self.state != "PLAYER":
            return
        ui.reveal_hole()
        self.state = "DEALER"
        pygame.time.delay(250)
        while hand_value(self.dealer) < 17:
            c = self.deck.draw()
            self.dealer.append(c)
            ui.add_card("dealer", c, True, 0.0)
            pygame.time.delay(250)
        self.resolve(ui)

    def double(self, ui):
        if self.state != "PLAYER" or not self.double_available:
            return
        if self.bet * 2 > self.bank:
            ui.set_message("NO MONEY", COLOR_RED)
            return
        ui.animate_money(self.bank, self.bank - self.bet)
        self.bank -= self.bet
        self.bet *= 2
        c = self.deck.draw()
        self.player.append(c)
        ui.add_card("player", c, True, 0.0)
        self.double_available = False
        if hand_value(self.player) > 21:
            ui.reveal_hole()
            ui.set_message("BUST", COLOR_RED)
            self.state = "END"
        else:
            self.stand(ui)

    def resolve(self, ui):
        pv = hand_value(self.player)
        dv = hand_value(self.dealer)
        if dv > 21:
            ui.animate_money(self.bank, self.bank + self.bet)
            self.bank += self.bet
            ui.set_message("DEALER BUST • YOU WIN", COLOR_ACCENT)
        elif pv > dv:
            ui.animate_money(self.bank, self.bank + self.bet)
            self.bank += self.bet
            ui.set_message("YOU WIN", COLOR_ACCENT)
        elif pv < dv:
            ui.animate_money(self.bank, self.bank - self.bet)
            self.bank -= self.bet
            ui.set_message("YOU LOSE", COLOR_RED)
        else:
            ui.set_message("PUSH", COLOR_TEXT)
        self.state = "END"

    def next_round(self, ui):
        self.state = "BETTING"
        self.player = []
        self.dealer = []
        self.bet = 0
        ui.clear_cards()
        ui.set_message("PLACE YOUR BET", COLOR_ACCENT)

# --------------------------------------------------------------
# INTERFAZ GRÁFICA
# --------------------------------------------------------------
class BlackjackUI:
    def __init__(self):
        self.game = BlackjackGame()
        self.dealer_sprites = []
        self.player_sprites = []

        # Mensaje central
        self.msg = "PLACE YOUR BET"
        self.msg_color = COLOR_ACCENT
        self.msg_alpha = 255
        self.msg_scale = 1.0

        # Pulso BET
        self.bet_pulse = 0.0

        # UI
        self.buttons_side = []
        self.button_bottom = None
        self.chips = []
        self.button_clear = None

        self.setup_ui()

    # ----- Configuración UI -----
    def setup_ui(self):
        # Botones laterales
        x = BASE_W - 100
        y0 = 300
        w, h, dy = 88, 42, 8
        self.buttons_side = [
            Button((x, y0, w, h), "DOUBLE", lambda: self.game.double(self)),
            Button((x, y0 + h + dy, w, h), "HIT", lambda: self.game.hit(self)),
            Button((x, y0 + 2 * (h + dy), w, h), "STAND", lambda: self.game.stand(self)),
        ]
        # Botón inferior
        self.button_bottom = Button(
            (BASE_W // 2 - 85, BASE_H - 110, 170, 46),
            "DEAL",
            lambda: self.game.start_round(self)
        )

        # Fichas
        cy = 520
        cx = BASE_W // 2
        self.chips = [
            Chip((cx - 100, cy), 5, (0, 0, 0)),
            Chip((cx - 40, cy), 25, (220, 60, 60)),
            Chip((cx + 20, cy), 100, (40, 150, 255)),
            Chip((cx + 80, cy), 500, (150, 80, 255)),
        ]

        # Botón CLEAR BET
        self.button_clear = Button(
            (cx - 80, cy + 40, 160, 36),
            "CLEAR BET",
            self.clear_bet
        )

    # ----- Control de apuesta -----
    def clear_bet(self):
        if self.game.state == "BETTING":
            self.game.bet = 0
            add_animation(BetPulse(self))

    # ----- Cartas -----
    def clear_cards(self):
        self.dealer_sprites.clear()
        self.player_sprites.clear()

    def add_card(self, owner, card, face_up, delay):
        if owner == "dealer":
            idx = len(self.dealer_sprites)
            sp = CardSprite("dealer", card, idx, face_up, delay)
            self.dealer_sprites.append(sp)
        else:
            idx = len(self.player_sprites)
            sp = CardSprite("player", card, idx, face_up, delay)
            self.player_sprites.append(sp)

    def reveal_hole(self):
        if len(self.dealer_sprites) > 1:
            self.dealer_sprites[1].start_flip()

    # ----- Mensajes / saldo -----
    def set_message(self, text, color=COLOR_ACCENT):
        self.msg = text
        self.msg_color = color
        self.msg_alpha = 255
        self.msg_scale = 1.0
        if text:
            add_animation(TextPop(self))

    def animate_money(self, start, end):
        add_animation(MoneyAnim(self.game, start, end))

    # ----- Eventos -----
    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            for chip in self.chips:
                chip.handle(event, self.game, self)
            self.button_clear.handle(event)
            for b in self.buttons_side:
                b.handle(event)
            self.button_bottom.handle(event)

    # ----- Estado de botones -----
    def update_buttons(self):
        st = self.game.state
        if st == "BETTING":
            for b in self.buttons_side:
                b.enabled = False
            self.button_bottom.enabled = True
            self.button_bottom.label = "DEAL"
            self.button_bottom.callback = lambda: self.game.start_round(self)
        elif st == "PLAYER":
            self.buttons_side[0].enabled = self.game.double_available
            self.buttons_side[1].enabled = True
            self.buttons_side[2].enabled = True
            self.button_bottom.enabled = False
        elif st == "END":
            for b in self.buttons_side:
                b.enabled = False
            self.button_bottom.enabled = True
            self.button_bottom.label = "NEW ROUND"
            self.button_bottom.callback = lambda: self.game.next_round(self)

    # ----- Update global -----
    def update(self):
        # Actualizar sprites de cartas
        for sp in self.dealer_sprites:
            sp.update()
        for sp in self.player_sprites:
            sp.update()

        # Animaciones globales
        for anim in animations[:]:
            anim.update()
            if anim.finished:
                animations.remove(anim)

        # Decaimiento del pulso BET
        if self.bet_pulse > 0:
            self.bet_pulse -= 0.05
            if self.bet_pulse < 0:
                self.bet_pulse = 0

    # ----- Dibujo -----
    def draw(self):
        s = window
        s.fill(COLOR_BG)

        # Mesa semicircular
        pygame.draw.circle(s, COLOR_TABLE_EDGE, (BASE_W // 2, -160), 380)
        pygame.draw.circle(s, COLOR_TABLE, (BASE_W // 2, -160), 366)

        draw_text(s, "BLACKJACK PAYS 3 TO 2", FONT_S, COLOR_TABLE_TEXT, (BASE_W // 2, 100))
        draw_text(s, "Dealer must draw to 16 and stand on 17", FONT_XS, COLOR_TABLE_TEXT, (BASE_W // 2, 122))
        draw_text(s, "Insurance pays 2 to 1", FONT_XS, COLOR_ACCENT, (BASE_W // 2, 145))

        # Cartas
        for sp in self.dealer_sprites:
            sp.draw(s)
        for sp in self.player_sprites:
            sp.draw(s)

        # Burbujas de totales
        if self.dealer_sprites:
            if self.game.state != "PLAYER" or (len(self.dealer_sprites) > 1 and self.dealer_sprites[1].face_up_now):
                dv = hand_value(self.game.dealer)
                pygame.draw.circle(s, (0, 0, 0), (BASE_W // 2 + 90, 180), 18)
                pygame.draw.circle(s, (25, 25, 25), (BASE_W // 2 + 90, 180), 18)
                draw_text(s, str(dv), FONT_XS, COLOR_TEXT, (BASE_W // 2 + 90, 180))

        if self.player_sprites:
            pv = hand_value(self.game.player)
            pygame.draw.circle(s, (0, 0, 0), (BASE_W // 2 + 90, 350), 18)
            pygame.draw.circle(s, (25, 25, 25), (BASE_W // 2 + 90, 350), 18)
            draw_text(s, str(pv), FONT_XS, COLOR_TEXT, (BASE_W // 2 + 90, 350))

        # Mensaje central
        if self.msg:
            msg_surface = FONT_M.render(self.msg, True, self.msg_color)
            msg_surface = pygame.transform.rotozoom(msg_surface, 0, self.msg_scale)
            msg_surface.set_alpha(self.msg_alpha)
            rect = msg_surface.get_rect(center=(BASE_W // 2, 250))
            s.blit(msg_surface, rect)

        # Círculo BET
        bet_center = (BASE_W // 2, 420)
        pygame.draw.circle(s, (20, 20, 20), bet_center, 36)
        pygame.draw.circle(s, COLOR_ACCENT, bet_center, 34, 3)
        draw_text(s, "BET", FONT_XS, COLOR_TEXT, (bet_center[0], bet_center[1] - 16))
        draw_text(s, f"${self.game.bet}", FONT_M, COLOR_TEXT, (bet_center[0], bet_center[1] + 8))

        # Pulso BET
        if self.bet_pulse > 0:
            t = self.bet_pulse
            r = int(45 + 10 * (1 - t))
            alpha = int(160 * t)
            pulse = pygame.Surface((r * 2, r * 2), pygame.SRCALPHA)
            pygame.draw.circle(pulse, (COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2], alpha), (r, r), r, 3)
            s.blit(pulse, (bet_center[0] - r, bet_center[1] - r))

        # Fichas
        for chip in self.chips:
            chip.draw(s)
        self.button_clear.draw(s)

        # Barra de saldo
        tray = pygame.Rect(0, BASE_H - 85, BASE_W, 85)
        pygame.draw.rect(s, COLOR_TRAY, tray)
        pill = pygame.Rect(BASE_W // 2 - 80, BASE_H - 70, 160, 45)
        pygame.draw.rect(s, (40, 40, 40), pill, border_radius=18)
        draw_text(s, f"${self.game.bank_display}", FONT_M, COLOR_TEXT, pill.center)

        # Botones
        self.update_buttons()
        mouse = pygame.mouse.get_pos()
        for b in self.buttons_side:
            b.update(mouse)
            b.draw(s)
        self.button_bottom.update(mouse)
        self.button_bottom.draw(s)

# --------------------------------------------------------------
# LOOP PRINCIPAL
# --------------------------------------------------------------
def main():
    ui = BlackjackUI()
    while True:
        dt = clock.tick(FPS) / 1000.0

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            ui.handle_event(event)

        ui.update()
        ui.draw()
        pygame.display.flip()

if __name__ == "__main__":
    main()

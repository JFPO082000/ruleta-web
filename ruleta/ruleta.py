# 🎰 Ruleta Casino – Android Deluxe 4K (Sync + Zoom + Offset Fixed)
# Fernando Edition 2025

import pygame, pygame_gui, random, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

pygame.init()
ANCHO, ALTO = 480, 880
pantalla = pygame.display.set_mode((ANCHO, ALTO))
pygame.display.set_caption("Ruleta Casino – Android Deluxe 4K")
manager = pygame_gui.UIManager((ANCHO, ALTO))

# -------- Colores --------
VERDE_FELT_DARK = (6, 70, 30)
DORADO = (230, 190, 90)
PANE = (30, 30, 31)
BLANCO = (255, 255, 255)

# -------- Fuentes --------
f_titulo = pygame.font.SysFont("Montserrat, Arial", 28, bold=True)
f_med    = pygame.font.SysFont("Montserrat, Arial", 18, bold=True)
f_small  = pygame.font.SysFont("Montserrat, Arial", 14, bold=True)

# -------- Ruleta europea (orden real) --------
NUM_WHEEL = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6,
    27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16,
    33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28,
    12, 35, 3, 26
]
RED_SET = {1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36}
SECTOR_ANGLE = 360 / len(NUM_WHEEL)

def num_color(n: int) -> str:
    if n == 0:
        return "verde"
    return "rojo" if n in RED_SET else "negro"


# -------- Crear ruleta 4K HD --------
def crear_rueda_4k(size=1200):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c, r = size // 2, size // 2

    # aro metálico exterior
    for i in range(int(size * 0.05)):
        tono = 180 + int(40 * math.sin(i / 8))
        d.ellipse(
            [i, i, size - i, size - i],
            outline=(tono, tono - 40, 50 + i // 3, 255)
        )

    try:
        fnt = ImageFont.truetype("arialbd.ttf", int(size * 0.045))
    except:
        fnt = ImageFont.load_default()

    # sectores + números (0 arriba)
    for i, n in enumerate(NUM_WHEEL):
        start = -90 + i * SECTOR_ANGLE
        col = (0, 140, 0) if n == 0 else ((220, 0, 0) if n in RED_SET else (15, 15, 15))
        d.pieslice([0, 0, size, size], start, start + SECTOR_ANGLE, fill=col)

        ang = math.radians(start + SECTOR_ANGLE / 2)
        tx = c + math.cos(ang) * r * 0.78
        ty = c + math.sin(ang) * r * 0.78
        t = str(n)
        bbox = fnt.getbbox(t)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text((tx - tw / 2, ty - th / 2), t, fill=BLANCO, font=fnt)

    # aros interiores
    d.ellipse(
        [size * 0.05, size * 0.05, size * 0.95, size * 0.95],
        outline=(245, 220, 130),
        width=int(size * 0.015)
    )
    d.ellipse(
        [c - size * 0.12, c - size * 0.12, c + size * 0.12, c + size * 0.12],
        fill=(232, 196, 122),
        outline=(255, 240, 190),
        width=3
    )

    img = img.filter(ImageFilter.GaussianBlur(0.4))
    img = img.resize((380, 380), Image.LANCZOS)
    return pygame.image.frombytes(img.tobytes(), img.size, img.mode)


rueda_base = crear_rueda_4k()
RUEDA_CENTRO = (ANCHO // 2, 260)

# pista interna
RADIO_BOLA = 118


# -------- UI --------
saldo = 1000
lbl_saldo = pygame_gui.elements.UILabel(
    pygame.Rect(ANCHO // 2 - 80, 480, 160, 24),
    f"Saldo: ${saldo}",
    manager
)

btn_rojo  = pygame_gui.elements.UIButton(pygame.Rect(50,  520, 100, 32), "ROJO",  manager)
btn_negro = pygame_gui.elements.UIButton(pygame.Rect(190, 520, 100, 32), "NEGRO", manager)
btn_verde = pygame_gui.elements.UIButton(pygame.Rect(330, 520, 100, 32), "VERDE", manager)

btn_spin = pygame_gui.elements.UIButton(pygame.Rect(ANCHO // 2 - 80, 760, 160, 60), "🎡 GIRAR", manager)
btn_auto = pygame_gui.elements.UIButton(pygame.Rect(ANCHO // 2 - 80, 710, 160, 40), "AUTO SPIN: OFF", manager)

chip_vals  = [1, 5, 10, 50, 100]
chip_sel   = 2
chip_rects = [pygame.Rect(45 + i * 80, 580, 60, 25) for i in range(5)]

historial   = []
color_sel   = None
monto       = chip_vals[chip_sel]

angulo_rueda = 0.0
bola_ang     = 0.0
vel_rueda    = 0.0
vel_bola     = 0.0

girando      = False
resultado    = ""

autospin     = False
tiempo_auto  = 0

zoom_activo  = False
zoom_t       = 0.0

# offset de corrección: la detección estaba corrido 3 sectores
OFFSET_SECTORES = 16    # si algún día ves que se corre, puedes cambiar este valor


# -------- Índice ganador usando ángulos + offset --------
def idx_from_ball_angle(ball_angle: float, wheel_angle: float) -> int:
    """
    ball_angle: ángulo de la pelota (bola_ang) en grados.
    wheel_angle: ángulo de la rueda (angulo_rueda).
    """
    # relativo a la rueda
    rel = (ball_angle - wheel_angle) % 360

    # 0° de la ruleta está en -90°, compensamos sumando 90
    rel_shift = (rel + 90) % 360

    idx_bruto = int(rel_shift / SECTOR_ANGLE)

    # corregimos el corrimiento de 3 sectores
    idx_real = (idx_bruto + OFFSET_SECTORES) % len(NUM_WHEEL)
    return idx_real


# -------- Comenzar giro --------
def comenzar_giro():
    global saldo, girando, vel_rueda, vel_bola, resultado, zoom_activo, zoom_t

    if color_sel is None:
        resultado = "⚠ Elige un color"
        return
    if monto > saldo:
        resultado = "⚠ Saldo insuficiente"
        return

    saldo -= monto
    lbl_saldo.set_text(f"Saldo: ${saldo}")

    vel_rueda = random.uniform(18, 22)
    vel_bola  = vel_rueda * 1.2

    girando     = True
    resultado   = ""
    zoom_activo = False
    zoom_t      = 0.0


# -------- Loop principal --------
clock = pygame.time.Clock()
running = True

while running:
    dt = clock.tick(60) / 1000

    for e in pygame.event.get():
        if e.type == pygame.QUIT:
            running = False

        manager.process_events(e)

        if e.type == pygame.MOUSEBUTTONDOWN:
            mx, my = e.pos
            for i, r in enumerate(chip_rects):
                if r.collidepoint(mx, my):
                    chip_sel = i
                    monto = chip_vals[i]

        if e.type == pygame_gui.UI_BUTTON_PRESSED:
            if e.ui_element == btn_rojo:
                color_sel = "rojo" if color_sel != "rojo" else None
            if e.ui_element == btn_negro:
                color_sel = "negro" if color_sel != "negro" else None
            if e.ui_element == btn_verde:
                color_sel = "verde" if color_sel != "verde" else None

            if e.ui_element == btn_spin and not girando:
                comenzar_giro()

            if e.ui_element == btn_auto:
                autospin = not autospin
                btn_auto.set_text(f"AUTO SPIN: {'ON' if autospin else 'OFF'}")

    # Auto spin
    if autospin and not girando and color_sel:
        if pygame.time.get_ticks() - tiempo_auto > 3800:
            comenzar_giro()
            tiempo_auto = pygame.time.get_ticks()

    # Física
    if girando:
        angulo_rueda += vel_rueda
        bola_ang     += vel_bola

        vel_rueda *= 0.986
        vel_bola  *= 0.984

        if vel_rueda < 0.3 and vel_bola < 0.3:
            girando = False

            # índice ganador con ángulo + offset
            idx = idx_from_ball_angle(bola_ang % 360, angulo_rueda % 360)
            num = NUM_WHEEL[idx]
            col = num_color(num).upper()

            ganado = monto * 2 if color_sel and num_color(num) == color_sel else 0
            saldo += ganado
            lbl_saldo.set_text(f"Saldo: ${saldo}")

            historial.insert(0, num)
            historial = historial[:8]

            resultado = f"Salió {num} ({col})  +${ganado}"

            zoom_activo = True
            zoom_t = 0.0

    manager.update(dt)

    # -------- DIBUJO --------
    pantalla.fill(VERDE_FELT_DARK)

    t = f_titulo.render("Ruleta Casino – Android Deluxe 4K", True, DORADO)
    pantalla.blit(t, (ANCHO // 2 - t.get_width() // 2, 20))

    # rueda
    rueda_rot = pygame.transform.rotate(rueda_base, angulo_rueda)
    rueda_rect = rueda_rot.get_rect(center=RUEDA_CENTRO)

    # bola (coordenadas reales)
    bx = RUEDA_CENTRO[0] + RADIO_BOLA * math.cos(math.radians(bola_ang))
    by = RUEDA_CENTRO[1] + RADIO_BOLA * math.sin(math.radians(bola_ang))

    # zoom hacia la bola
    if zoom_activo:
        zoom_t += dt
        if zoom_t > 0.6:
            zoom_t = 0.6
        k = zoom_t / 0.6
        k = 1 - (1 - k) ** 2

        factor = 1 + 0.7 * k   # zoom fuerte pero no exagerado

        w = int(rueda_rot.get_width() * factor)
        h = int(rueda_rot.get_height() * factor)
        zr = pygame.transform.smoothscale(rueda_rot, (w, h))

        offx = bx - RUEDA_CENTRO[0]
        offy = by - RUEDA_CENTRO[1]
        cx = RUEDA_CENTRO[0] - offx * k
        cy = RUEDA_CENTRO[1] - offy * k
        rect_z = zr.get_rect(center=(cx, cy))

        dark = pygame.Surface((ANCHO, ALTO), pygame.SRCALPHA)
        dark.fill((0, 0, 0, int(150 * k)))
        pantalla.blit(dark, (0, 0))
        pantalla.blit(zr, rect_z)
    else:
        pantalla.blit(rueda_rot, rueda_rect)

    # bola
    pygame.draw.circle(pantalla, (200, 200, 200), (int(bx) + 2, int(by) + 3), 10)
    pygame.draw.circle(pantalla, BLANCO, (int(bx), int(by)), 10)

    # panel
    panel = pygame.Rect(20, 480, 440, 150)
    pygame.draw.rect(pantalla, PANE, panel, border_radius=12)
    pygame.draw.rect(pantalla, DORADO, panel, 2, border_radius=12)

    # fichas
    for i, r in enumerate(chip_rects):
        color = DORADO if i == chip_sel else (80, 80, 80)
        pygame.draw.rect(pantalla, color, r, border_radius=6)
        pygame.draw.rect(pantalla, DORADO, r, 1, border_radius=6)
        tx = f_small.render(str(chip_vals[i]), True, BLANCO)
        pantalla.blit(tx, (r.centerx - tx.get_width() // 2,
                           r.centery - tx.get_height() // 2))

    # historial
    htxt = "Historial: " + " ".join(map(str, historial)) if historial else "Historial: —"
    pantalla.blit(f_small.render(htxt, True, BLANCO), (25, 650))

    # resultado
    if resultado:
        rtxt = f_med.render(resultado, True, DORADO)
        pantalla.blit(rtxt, (ANCHO // 2 - rtxt.get_width() // 2, 830))

    manager.draw_ui(pantalla)
    pygame.display.flip()

pygame.quit()

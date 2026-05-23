from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/home/oladhari/money/linkedin-emailer/advertisement"
W, H = 1080, 1920

BLUE      = (10, 102, 194)
BLUE_DARK = (6, 69, 130)
WHITE     = (255, 255, 255)
LIGHT     = (220, 235, 255)
GRAY      = (160, 175, 200)
RED       = (220, 50, 50)
BG_DARK   = (10, 15, 30)
BG_MID    = (18, 28, 52)
GREEN     = (40, 200, 120)
CHROME_BG = (248, 249, 250)
CHROME_BAR= (241, 243, 244)
LI_BLUE   = (10, 102, 194)

def try_font(size, bold=False):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def centered_text(d, text, y, font, color=WHITE, max_width=960):
    words = text.split()
    lines, line = [], ""
    for word in words:
        test = (line + " " + word).strip()
        bbox = d.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_width and line:
            lines.append(line)
            line = word
        else:
            line = test
    if line:
        lines.append(line)
    for ln in lines:
        bbox = d.textbbox((0, 0), ln, font=font)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) // 2, y), ln, font=font, fill=color)
        y += (bbox[3] - bbox[1]) + 14
    return y

def draw_envelope(d, x, y, size=40):
    ew, eh = size, int(size * 0.68)
    outline = 3
    d.rectangle([x - outline, y - outline, x + ew + outline, y + eh + outline], fill=RED)
    d.rectangle([x, y, x + ew, y + eh], fill=WHITE)
    mid = x + ew // 2
    tip = y + int(eh * 0.52)
    d.polygon([(x, y), (mid, tip), (x + ew, y)], fill=RED)

def draw_arrow_down(d, cx, y_start, y_end, color=GREEN, width=6):
    d.line([cx, y_start, cx, y_end - 20], fill=color, width=width)
    d.polygon([
        (cx, y_end),
        (cx - 18, y_end - 30),
        (cx + 18, y_end - 30),
    ], fill=color)

def slide_how_to():
    img = Image.new("RGB", (W, H), BG_DARK)
    d = ImageDraw.Draw(img)

    # Background gradient
    d.rectangle([0, 0, W, H // 2], fill=BG_DARK)
    d.rectangle([0, H // 2, W, H], fill=BG_MID)
    d.rectangle([0, 0, W, 10], fill=BLUE)
    d.rectangle([0, H - 10, W, H], fill=BLUE)

    # ── TITLE ────────────────────────────────────────────
    f_title = try_font(62, bold=True)
    f_sub   = try_font(38)
    f_step  = try_font(34, bold=True)
    f_label = try_font(30)

    centered_text(d, "How to use it", 70, f_title, WHITE)
    centered_text(d, "3 steps. 10 seconds.", 148, f_sub, GRAY)

    # ── STEP 1: Chrome browser mockup ─────────────────────
    step_y = 240

    # Step label
    d.ellipse([60, step_y, 110, step_y + 50], fill=BLUE)
    d.text((78, step_y + 8), "1", font=try_font(30, bold=True), fill=WHITE)
    d.text((128, step_y + 10), "Open any LinkedIn profile", font=f_step, fill=WHITE)

    # Browser window mockup
    bx, by = 60, step_y + 70
    bw, bh = W - 120, 130
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=14, fill=(30, 34, 40))
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=14, outline=(50, 60, 80), width=2)

    # URL bar
    d.rounded_rectangle([bx + 14, by + 14, bx + bw - 160, by + 56], radius=10, fill=(20, 25, 38))
    d.text((bx + 28, by + 21), "linkedin.com/in/pawelmisiura/", font=try_font(26), fill=(100, 180, 255))

    # Extension icon area (right side of toolbar)
    icon_cx = bx + bw - 72
    icon_cy = by + 35
    # Puzzle piece icon (generic extension icon)
    d.rounded_rectangle([icon_cx - 22, icon_cy - 22, icon_cx + 22, icon_cy + 22], radius=6, fill=(50, 60, 80))
    d.text((icon_cx - 10, icon_cy - 14), "⊞", font=try_font(28), fill=GRAY)

    # LinkedMail icon highlighted
    lm_cx = bx + bw - 130
    lm_cy = by + 35
    # Glowing circle behind it
    d.ellipse([lm_cx - 32, lm_cy - 32, lm_cx + 32, lm_cy + 32], fill=(10, 60, 130))
    d.ellipse([lm_cx - 28, lm_cy - 28, lm_cx + 28, lm_cy + 28], fill=BLUE)
    draw_envelope(d, lm_cx - 18, lm_cy - 12, size=36)

    # Pulsing ring around LinkedMail icon
    d.ellipse([lm_cx - 38, lm_cy - 38, lm_cx + 38, lm_cy + 38], outline=GREEN, width=3)

    # Tab strip
    d.rounded_rectangle([bx + 14, by + 70, bx + 260, by + 110], radius=8, fill=(20, 25, 38))
    d.text((bx + 28, by + 80), "Pawel Misiura | LinkedIn", font=try_font(22), fill=GRAY)

    # Arrow pointing to LinkedMail icon
    draw_arrow_down(d, lm_cx, by + bh + 10, by + bh + 80, color=GREEN, width=5)

    # Tooltip
    tt_x, tt_y = lm_cx - 160, by + bh + 85
    d.rounded_rectangle([tt_x, tt_y, tt_x + 320, tt_y + 70], radius=10, fill=(30, 40, 60))
    d.rounded_rectangle([tt_x, tt_y, tt_x + 320, tt_y + 70], radius=10, outline=GREEN, width=2)
    d.text((tt_x + 16, tt_y + 10), "LinkedMail AI", font=try_font(26, bold=True), fill=GREEN)
    d.text((tt_x + 16, tt_y + 40), "Cold Email Generator", font=try_font(22), fill=GRAY)

    # ── STEP 2: Extension popup mockup ────────────────────
    step2_y = step_y + 380

    d.ellipse([60, step2_y, 110, step2_y + 50], fill=BLUE)
    d.text((78, step2_y + 8), "2", font=try_font(30, bold=True), fill=WHITE)
    d.text((128, step2_y + 10), "Click the extension icon", font=f_step, fill=WHITE)

    # Popup card
    px, py = 120, step2_y + 70
    pw, ph = W - 240, 480
    d.rounded_rectangle([px, py, px + pw, py + ph], radius=18, fill=(20, 28, 50))
    d.rounded_rectangle([px, py, px + pw, py + ph], radius=18, outline=BLUE, width=2)

    # Popup header
    d.rounded_rectangle([px, py, px + pw, py + 56], radius=18, fill=BLUE)
    d.rounded_rectangle([px, py + 28, px + pw, py + 56], radius=0, fill=BLUE)
    draw_envelope(d, px + 16, py + 10, size=34)
    d.text((px + 62, py + 14), "LinkedMail AI", font=try_font(28, bold=True), fill=WHITE)
    # Free badge
    d.rounded_rectangle([px + pw - 90, py + 14, px + pw - 14, py + 42], radius=8, fill=(30, 50, 100))
    d.text((px + pw - 78, py + 18), "Free", font=try_font(22), fill=LIGHT)

    # Tone row
    ty = py + 72
    d.text((px + 16, ty), "TONE", font=try_font(20, bold=True), fill=GRAY)
    d.rounded_rectangle([px + 16, ty + 28, px + pw - 16, ty + 76], radius=10, fill=(30, 40, 65))
    d.text((px + 30, ty + 40), "Professional", font=try_font(28), fill=WHITE)
    d.text((px + pw - 50, ty + 40), "▾", font=try_font(28), fill=GRAY)

    # Purpose row
    pur_y = ty + 96
    d.text((px + 16, pur_y), "PURPOSE", font=try_font(20, bold=True), fill=GRAY)
    d.rounded_rectangle([px + 16, pur_y + 28, px + pw - 16, pur_y + 76], radius=10, fill=(30, 40, 65))
    d.text((px + 30, pur_y + 40), "Sales Outreach", font=try_font(28), fill=WHITE)
    d.text((px + pw - 50, pur_y + 40), "▾", font=try_font(28), fill=GRAY)

    # Generate button
    gen_y = pur_y + 96
    d.rounded_rectangle([px + 16, gen_y, px + pw - 16, gen_y + 64], radius=14, fill=BLUE)
    btn = "Generate Email"
    bbox = d.textbbox((0, 0), btn, font=try_font(30, bold=True))
    bw2 = bbox[2] - bbox[0]
    d.text((px + pw // 2 - bw2 // 2, gen_y + 16), btn, font=try_font(30, bold=True), fill=WHITE)

    # Usage
    usage_y = gen_y + 80
    d.text((px + 16, usage_y), "5 / 5 emails used this month", font=try_font(24), fill=GRAY)
    d.rounded_rectangle([px + pw - 220, usage_y - 4, px + pw - 16, usage_y + 38], radius=10, fill=(80, 30, 120))
    d.text((px + pw - 208, usage_y + 4), "Upgrade to Pro", font=try_font(20), fill=WHITE)

    # ── STEP 3: Result ─────────────────────────────────────
    step3_y = step2_y + 580

    d.ellipse([60, step3_y, 110, step3_y + 50], fill=GREEN)
    d.text((75, step3_y + 8), "3", font=try_font(30, bold=True), fill=WHITE)
    d.text((128, step3_y + 10), "Get your email in seconds!", font=f_step, fill=WHITE)

    # Result preview card
    rx, ry = 120, step3_y + 70
    rw = W - 240
    d.rounded_rectangle([rx, ry, rx + rw, ry + 200], radius=14, fill=(15, 40, 25))
    d.rounded_rectangle([rx, ry, rx + rw, ry + 200], radius=14, outline=GREEN, width=2)
    d.text((rx + 16, ry + 14), "Subject: Quick thought on your work at...", font=try_font(26), fill=LIGHT)
    d.line([rx + 16, ry + 52, rx + rw - 16, ry + 52], fill=(30, 70, 40), width=1)
    d.text((rx + 16, ry + 66),  "Hi Pawel,", font=try_font(26, bold=True), fill=GREEN)
    d.text((rx + 16, ry + 104), "I came across your profile and was", font=try_font(24), fill=WHITE)
    d.text((rx + 16, ry + 136), "impressed by your work helping CTOs...", font=try_font(24), fill=WHITE)
    d.text((rx + 16, ry + 168), "Would you be open to a quick call?", font=try_font(24), fill=LIGHT)

    # ── BOTTOM BRAND ──────────────────────────────────────
    centered_text(d, "linkedmailai.com", H - 80, try_font(36, bold=True), BLUE)

    img.save(f"{OUT}/00-how-to-click.png")
    print("00-how-to-click.png saved")

slide_how_to()

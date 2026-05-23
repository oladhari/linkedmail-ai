from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/home/oladhari/money/linkedin-emailer/advertisement"
W, H = 1080, 1920  # 9:16 portrait for YouTube Shorts

BLUE      = (10, 102, 194)
BLUE_DARK = (6, 69, 130)
WHITE     = (255, 255, 255)
LIGHT     = (220, 235, 255)
GRAY      = (160, 175, 200)
RED       = (220, 50, 50)
BG_DARK   = (10, 15, 30)
BG_MID    = (18, 28, 52)
GREEN     = (40, 200, 120)

def base_canvas():
    img = Image.new("RGB", (W, H), BG_DARK)
    d = ImageDraw.Draw(img)
    # Gradient-like background with two rects
    d.rectangle([0, 0, W, H // 2], fill=BG_DARK)
    d.rectangle([0, H // 2, W, H], fill=BG_MID)
    # Top accent bar
    d.rectangle([0, 0, W, 12], fill=BLUE)
    # Bottom accent bar
    d.rectangle([0, H - 12, W, H], fill=BLUE)
    return img, d

def draw_logo(d, x, y, size=56):
    # Envelope icon inline
    ex, ey = x, y
    ew, eh = size, int(size * 0.68)
    outline = 4
    d.rectangle([ex - outline, ey - outline, ex + ew + outline, ey + eh + outline], fill=RED)
    d.rectangle([ex, ey, ex + ew, ey + eh], fill=WHITE)
    mid = ex + ew // 2
    tip = ey + int(eh * 0.52)
    d.polygon([(ex, ey), (mid, tip), (ex + ew, ey)], fill=RED)

def try_font(size, bold=False):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def centered_text(d, text, y, font, color=WHITE, max_width=900):
    # Wrap and center text
    words = text.split()
    lines = []
    line = ""
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
        y += (bbox[3] - bbox[1]) + 16
    return y

def pill(d, text, cx, y, font, bg=BLUE, fg=WHITE, pad_x=40, pad_h=24):
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    rx0 = cx - tw // 2 - pad_x
    ry0 = y
    rx1 = cx + tw // 2 + pad_x
    ry1 = y + th + pad_h
    radius = (ry1 - ry0) // 2
    d.rounded_rectangle([rx0, ry0, rx1, ry1], radius=radius, fill=bg)
    d.text((cx - tw // 2, y + pad_h // 2), text, font=font, fill=fg)
    return ry1

# ─── SLIDE 1: Hook ───────────────────────────────────────────────────
def slide_hook():
    img, d = base_canvas()
    f_huge  = try_font(96, bold=True)
    f_large = try_font(58, bold=True)
    f_med   = try_font(44)
    f_small = try_font(36)

    # Big emoji-style clock icon via circle
    cx = W // 2
    d.ellipse([cx - 110, 180, cx + 110, 400], outline=RED, width=10)
    d.line([cx, 210, cx, 310], fill=RED, width=10)
    d.line([cx, 310, cx + 60, 350], fill=RED, width=10)

    y = 450
    centered_text(d, "Stop wasting", y, f_large, GRAY)
    y += 80
    centered_text(d, "30 minutes", y, f_huge, RED)
    y += 120
    centered_text(d, "on one cold email.", y, f_large, WHITE)

    y += 160
    d.line([W // 2 - 200, y, W // 2 + 200, y], fill=BLUE, width=3)
    y += 60

    centered_text(d, "There's a faster way.", y, f_med, LIGHT)

    # Logo + name at bottom
    draw_logo(d, W // 2 - 140, H - 220, size=60)
    f_logo = try_font(48, bold=True)
    bbox = d.textbbox((0, 0), "LinkedMail AI", font=f_logo)
    d.text((W // 2 - 60, H - 205), "LinkedMail AI", font=f_logo, fill=WHITE)

    img.save(f"{OUT}/01-hook.png")
    print("01-hook.png saved")

# ─── SLIDE 2: Problem ────────────────────────────────────────────────
def slide_problem():
    img, d = base_canvas()
    f_large = try_font(62, bold=True)
    f_med   = try_font(44)
    f_item  = try_font(40)

    centered_text(d, "The old way", 180, f_large, WHITE)
    centered_text(d, "is killing your time.", 260, f_med, GRAY)

    steps = [
        ("1", "Open LinkedIn profile"),
        ("2", "Research the company"),
        ("3", "Find a personal hook"),
        ("4", "Write the opener"),
        ("5", "Edit for tone"),
        ("6", "Send. Repeat × 20."),
    ]

    y = 440
    for num, text in steps:
        # Number circle
        cx, cy = 140, y + 28
        d.ellipse([cx - 36, cy - 36, cx + 36, cy + 36], fill=RED if num == "6" else BLUE)
        nb = d.textbbox((0, 0), num, font=try_font(32, bold=True))
        nw = nb[2] - nb[0]
        d.text((cx - nw // 2, cy - 18), num, font=try_font(32, bold=True), fill=WHITE)
        color = RED if num == "6" else WHITE
        d.text((200, y), text, font=f_item, fill=color)
        y += 100

    y += 40
    centered_text(d, "~30 min per email. Every. Time.", y, try_font(38), RED)

    draw_logo(d, W // 2 - 140, H - 220, size=60)
    d.text((W // 2 - 60, H - 205), "LinkedMail AI", font=try_font(48, bold=True), fill=WHITE)

    img.save(f"{OUT}/02-problem.png")
    print("02-problem.png saved")

# ─── SLIDE 3: Solution ───────────────────────────────────────────────
def slide_solution():
    img, d = base_canvas()
    f_huge  = try_font(100, bold=True)
    f_large = try_font(60, bold=True)
    f_med   = try_font(44)

    centered_text(d, "LinkedMail AI", 160, f_large, BLUE)

    draw_logo(d, W // 2 - 80, 280, size=160)

    centered_text(d, "10", 530, f_huge, WHITE)
    centered_text(d, "seconds.", 650, f_large, BLUE)
    centered_text(d, "That's all it takes.", 780, f_med, LIGHT)

    y = 940
    d.line([W // 2 - 200, y, W // 2 + 200, y], fill=BLUE, width=3)
    y += 60

    features = [
        "Open any LinkedIn profile",
        "Click the extension",
        "Get a personalized email",
    ]
    f_feat = try_font(40)
    for feat in features:
        # Checkmark circle
        d.ellipse([120, y, 180, y + 56], fill=GREEN)
        d.text((136, y + 8), "✓", font=try_font(36, bold=True), fill=WHITE)
        d.text((210, y + 4), feat, font=f_feat, fill=WHITE)
        y += 90

    img.save(f"{OUT}/03-solution.png")
    print("03-solution.png saved")

# ─── SLIDE 4: Demo (Options) ─────────────────────────────────────────
def slide_demo():
    img, d = base_canvas()
    f_large = try_font(58, bold=True)
    f_med   = try_font(40)
    f_sm    = try_font(34)

    centered_text(d, "You choose the style.", 160, f_large, WHITE)

    y = 320
    centered_text(d, "TONE", y, try_font(32, bold=True), GRAY)
    y += 60
    tones = ["Professional", "Friendly", "Direct", "Casual"]
    cols = [(W // 2 - 340, W // 2 - 20), (W // 2 + 20, W // 2 + 340)]
    tone_y = y
    for i, t in enumerate(tones):
        col = i % 2
        x0, x1 = cols[col]
        row = i // 2
        ry = tone_y + row * 110
        active = (t == "Professional")
        bg = BLUE if active else (30, 45, 80)
        d.rounded_rectangle([x0, ry, x1, ry + 80], radius=16, fill=bg)
        bbox = d.textbbox((0, 0), t, font=f_sm)
        tw = bbox[2] - bbox[0]
        cx = (x0 + x1) // 2
        d.text((cx - tw // 2, ry + 20), t, font=f_sm, fill=WHITE)
    y = tone_y + 240

    centered_text(d, "PURPOSE", y, try_font(32, bold=True), GRAY)
    y += 60
    purposes = ["Sales", "Recruiting", "Partnership", "Networking"]
    tone_y2 = y
    for i, p in enumerate(purposes):
        col = i % 2
        x0, x1 = cols[col]
        row = i // 2
        ry = tone_y2 + row * 110
        active = (p == "Sales")
        bg = BLUE if active else (30, 45, 80)
        d.rounded_rectangle([x0, ry, x1, ry + 80], radius=16, fill=bg)
        bbox = d.textbbox((0, 0), p, font=f_sm)
        tw = bbox[2] - bbox[0]
        cx = (x0 + x1) // 2
        d.text((cx - tw // 2, ry + 20), p, font=f_sm, fill=WHITE)
    y = tone_y2 + 260

    # Generate button
    d.rounded_rectangle([W // 2 - 280, y, W // 2 + 280, y + 100], radius=20, fill=BLUE)
    btn_text = "Generate Email"
    bbox = d.textbbox((0, 0), btn_text, font=try_font(44, bold=True))
    tw = bbox[2] - bbox[0]
    d.text((W // 2 - tw // 2, y + 24), btn_text, font=try_font(44, bold=True), fill=WHITE)

    y += 160
    centered_text(d, "Works on any public LinkedIn profile.", y, f_sm, GRAY)

    img.save(f"{OUT}/04-demo.png")
    print("04-demo.png saved")

# ─── SLIDE 5: Result ─────────────────────────────────────────────────
def slide_result():
    img, d = base_canvas()
    f_large = try_font(58, bold=True)
    f_med   = try_font(38)
    f_sm    = try_font(30)
    f_email = try_font(32)

    centered_text(d, "The result:", 160, f_large, WHITE)
    centered_text(d, "A real, personal email.", 250, f_med, BLUE)

    # Email card
    card_x, card_y = 60, 360
    card_w, card_h = W - 120, 860
    d.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h],
                         radius=24, fill=(20, 32, 60))
    d.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h],
                         radius=24, outline=BLUE, width=2)

    # Email header
    d.rectangle([card_x, card_y, card_x + card_w, card_y + 70], fill=BLUE)
    d.text((card_x + 24, card_y + 16), "Generated Email", font=try_font(34, bold=True), fill=WHITE)

    email_lines = [
        "Subject: Quick thought on your",
        "work at Acme Corp",
        "",
        "Hi Sarah,",
        "",
        "I came across your profile and was",
        "impressed by your transition from",
        "engineering to product at Acme.",
        "",
        "I'm reaching out because we help",
        "product teams like yours automate",
        "repetitive outreach — saving 5+",
        "hours per week.",
        "",
        "Would you be open to a quick",
        "15-minute call this week?",
        "",
        "Best,",
        "Oussama",
    ]

    ey = card_y + 90
    for line in email_lines:
        if line == "":
            ey += 18
            continue
        color = BLUE if line.startswith("Subject") else (LIGHT if line in ("Hi Sarah,", "Best,", "Oussama") else WHITE)
        d.text((card_x + 30, ey), line, font=f_email, fill=color)
        ey += 44

    centered_text(d, "No [Name] placeholders.", H - 300, f_med, GREEN)
    centered_text(d, "No generic openers.", H - 240, f_med, GREEN)

    img.save(f"{OUT}/05-result.png")
    print("05-result.png saved")

# ─── SLIDE 6: CTA ────────────────────────────────────────────────────
def slide_cta():
    img, d = base_canvas()
    f_huge  = try_font(90, bold=True)
    f_large = try_font(58, bold=True)
    f_med   = try_font(42)
    f_sm    = try_font(34)

    draw_logo(d, W // 2 - 90, 140, size=180)

    centered_text(d, "LinkedMail AI", 400, f_large, WHITE)

    y = 540
    d.line([W // 2 - 200, y, W // 2 + 200, y], fill=BLUE, width=3)
    y += 60

    centered_text(d, "Try it free today.", y, f_huge, WHITE)
    y += 130

    perks = [
        ("✓", "5 emails/month — free forever"),
        ("✓", "No credit card required"),
        ("✓", "Works in 10 seconds"),
    ]
    for icon, text in perks:
        full = f"{icon}  {text}"
        bbox = d.textbbox((0, 0), full, font=f_med)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) // 2, y), full, font=f_med, fill=GREEN)
        y += 80

    y += 30
    # CTA button
    d.rounded_rectangle([W // 2 - 340, y, W // 2 + 340, y + 110], radius=22, fill=BLUE)
    btn = "Add to Chrome — It's Free"
    bbox = d.textbbox((0, 0), btn, font=try_font(38, bold=True))
    tw = bbox[2] - bbox[0]
    d.text((W // 2 - tw // 2, y + 28), btn, font=try_font(38, bold=True), fill=WHITE)

    y += 150
    centered_text(d, "Pro plan: $19/month · Unlimited emails", y, f_sm, GRAY)

    y += 70
    centered_text(d, "linkedmailai.com", y, try_font(38, bold=True), BLUE)

    img.save(f"{OUT}/06-cta.png")
    print("06-cta.png saved")


# ─── RUN ALL ─────────────────────────────────────────────────────────
slide_hook()
slide_problem()
slide_solution()
slide_demo()
slide_result()
slide_cta()
print("\nAll 6 advertisement slides saved to:", OUT)

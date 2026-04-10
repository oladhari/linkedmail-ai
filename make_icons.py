from PIL import Image, ImageDraw, ImageFont
import math

def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Background: LinkedIn blue rounded square
    pad = int(size * 0.04)
    radius = int(size * 0.18)
    bg_color = (10, 102, 194)  # LinkedIn blue

    # Draw rounded rectangle background
    d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=radius, fill=bg_color)

    # Envelope dimensions
    env_left = int(size * 0.22)
    env_right = int(size * 0.78)
    env_top = int(size * 0.34)
    env_bottom = int(size * 0.66)
    mid_x = size // 2
    red = (220, 50, 50)
    white = (255, 255, 255)
    outline_w = max(2, int(size * 0.045))

    # Red outline border behind envelope
    d.rectangle([env_left - outline_w, env_top - outline_w,
                 env_right + outline_w, env_bottom + outline_w], fill=red)

    # White envelope body
    d.rectangle([env_left, env_top, env_right, env_bottom], fill=white)

    # Red flap (V shape on top half)
    flap_tip_y = int(size * 0.52)
    d.polygon([
        (env_left, env_top),
        (mid_x, flap_tip_y),
        (env_right, env_top)
    ], fill=red)

    # Side fold lines (light blue triangles for depth)
    fold_color = (210, 230, 250)
    d.polygon([
        (env_left, env_top),
        (env_left, env_bottom),
        (mid_x - int(size * 0.12), int(size * 0.60))
    ], fill=fold_color)
    d.polygon([
        (env_right, env_top),
        (env_right, env_bottom),
        (mid_x + int(size * 0.12), int(size * 0.60))
    ], fill=fold_color)

    return img

for size in [16, 48, 128]:
    img = make_icon(size)
    img.save(f"/home/oladhari/money/linkedin-emailer/extension/icons/icon{size}.png")
    print(f"icon{size}.png saved")

print("Done!")

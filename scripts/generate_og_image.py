"""Generate 1200x630 og:image for Freedoliapp.

Background: Petrol #1F5F63
Logo: logo_white.png centered, upper portion
Tagline: "Smart operations for Amazon FBA sellers" in Roboto white
Output: public/og-image.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LOGO_PATH = ROOT / "public" / "brand" / "freedoliapp" / "logo" / "logo_white.png"
OUT_PATH = ROOT / "public" / "og-image.png"

# Design spec
W, H = 1200, 630
PETROL = (0x1F, 0x5F, 0x63)
TURQUOISE = (0x6E, 0xCB, 0xC3)
WHITE = (0xFF, 0xFF, 0xFF)

# Canvas
img = Image.new("RGB", (W, H), PETROL)
draw = ImageDraw.Draw(img)

# Subtle accent bar on left (Turquoise)
draw.rectangle([(0, 0), (8, H)], fill=TURQUOISE)

# Logo — scale to ~560px wide (logo_white is 2048x425, aspect 4.819)
logo = Image.open(LOGO_PATH).convert("RGBA")
target_w = 560
target_h = int(target_w * logo.height / logo.width)
logo_resized = logo.resize((target_w, target_h), Image.LANCZOS)
logo_x = (W - target_w) // 2
logo_y = 190  # upper-middle
img.paste(logo_resized, (logo_x, logo_y), logo_resized)

# Tagline
tagline = "Smart operations for Amazon FBA sellers"
font_path = r"C:\Windows\Fonts\Roboto-Regular.ttf"
font_bold_path = r"C:\Windows\Fonts\Roboto-Bold.ttf"
font = ImageFont.truetype(font_bold_path, 38)

# Measure and center
bbox = draw.textbbox((0, 0), tagline, font=font)
text_w = bbox[2] - bbox[0]
text_h = bbox[3] - bbox[1]
text_x = (W - text_w) // 2
text_y = logo_y + target_h + 60
draw.text((text_x, text_y), tagline, font=font, fill=WHITE)

# Subtle domain at bottom
domain = "freedoliapp.com"
font_small = ImageFont.truetype(font_path, 22)
bbox_d = draw.textbbox((0, 0), domain, font=font_small)
dw = bbox_d[2] - bbox_d[0]
draw.text(((W - dw) // 2, H - 60), domain, font=font_small, fill=TURQUOISE)

img.save(OUT_PATH, "PNG", optimize=True)
print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.1f} KB, {W}x{H})")

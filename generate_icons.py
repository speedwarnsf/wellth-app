#!/usr/bin/env python3
"""Generate consistent gold outline icons for Wellth app."""
import subprocess, os, tempfile

ICONS_DIR = "/Users/macster/wellth-real/public/icons"
COLOR = "#D4B96A"
SIZE = 96

svgs = {
    "checkin": f'''<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 96 96" fill="none">
  <circle cx="48" cy="48" r="36" stroke="{COLOR}" stroke-width="3" fill="none"/>
  <polyline points="32,50 44,62 64,38" stroke="{COLOR}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',
    "tips": f'''<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 96 96" fill="none">
  <path d="M48 14 C32 14 20 27 20 42 C20 52 26 60 34 65 L34 72 L62 72 L62 65 C70 60 76 52 76 42 C76 27 64 14 48 14Z" stroke="{COLOR}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="36" y1="78" x2="60" y2="78" stroke="{COLOR}" stroke-width="3" stroke-linecap="round"/>
  <line x1="40" y1="84" x2="56" y2="84" stroke="{COLOR}" stroke-width="3" stroke-linecap="round"/>
</svg>''',
    "breathe": f'''<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 96 96" fill="none">
  <path d="M16 36 Q32 28 48 36 Q64 44 80 36" stroke="{COLOR}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M16 48 Q32 40 48 48 Q64 56 80 48" stroke="{COLOR}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M16 60 Q32 52 48 60 Q64 68 80 60" stroke="{COLOR}" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>''',
    "journal": f'''<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 96 96" fill="none">
  <path d="M48 78 L16 64 L16 20 L48 34Z" stroke="{COLOR}" stroke-width="3" fill="none" stroke-linejoin="round"/>
  <path d="M48 78 L80 64 L80 20 L48 34Z" stroke="{COLOR}" stroke-width="3" fill="none" stroke-linejoin="round"/>
  <line x1="48" y1="34" x2="48" y2="78" stroke="{COLOR}" stroke-width="3"/>
</svg>''',
    "hydration": f'''<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 96 96" fill="none">
  <path d="M48 12 C48 12 22 44 22 60 C22 74 34 84 48 84 C62 84 74 74 74 60 C74 44 48 12 48 12Z" stroke="{COLOR}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>''',
    "report": f'''<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 96 96" fill="none">
  <rect x="16" y="52" width="12" height="28" rx="1" stroke="{COLOR}" stroke-width="3" fill="none"/>
  <rect x="34" y="36" width="12" height="44" rx="1" stroke="{COLOR}" stroke-width="3" fill="none"/>
  <rect x="52" y="44" width="12" height="36" rx="1" stroke="{COLOR}" stroke-width="3" fill="none"/>
  <rect x="70" y="20" width="12" height="60" rx="1" stroke="{COLOR}" stroke-width="3" fill="none"/>
  <line x1="12" y1="82" x2="86" y2="82" stroke="{COLOR}" stroke-width="3" stroke-linecap="round"/>
</svg>''',
}

for name, svg in svgs.items():
    svg_path = os.path.join(tempfile.gettempdir(), f"{name}.svg")
    png_path = os.path.join(ICONS_DIR, f"{name}.png")
    with open(svg_path, "w") as f:
        f.write(svg)
    # Use rsvg-convert if available, else sips
    try:
        subprocess.run(["rsvg-convert", "-w", str(SIZE), "-h", str(SIZE), "-o", png_path, svg_path], check=True)
    except FileNotFoundError:
        # Try cairosvg python
        import cairosvg
        cairosvg.svg2png(bytestring=svg.encode(), write_to=png_path, output_width=SIZE, output_height=SIZE)
    print(f"Generated {name}.png")

print("Done!")

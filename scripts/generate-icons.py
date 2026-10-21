#!/usr/bin/env python3
"""Reproduce the original square-grid mark using Pillow (no network or fonts).

All grid strokes are one output pixel. The complete foreground fits the inner
maskable safe circle (radius 40%); solid white fills the full square canvas.
Run: python3 scripts/generate-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SIZES = {192: "icon-192.png", 512: "icon-512.png", 180: "apple-touch-icon.png"}


def draw_icon(size: int) -> Image.Image:
    image = Image.new("RGB", (size, size), "white")
    draw = ImageDraw.Draw(image)
    # A three-by-three Sudoku box and three offset pixel clues.
    positions = [round(size * value) for value in (0.24, 0.413333, 0.586667, 0.76)]
    start, end = positions[0], positions[-1]
    for position in positions:
        draw.line((position, start, position, end), fill="black", width=1)
        draw.line((start, position, end, position), fill="black", width=1)
    for column, row in ((0, 0), (2, 1), (1, 2)):
        x = round((positions[column] + positions[column + 1]) / 2)
        y = round((positions[row] + positions[row + 1]) / 2)
        half = round(size * 0.035)
        draw.rectangle((x - half, y - half, x + half, y + half), fill="black")
    return image


if __name__ == "__main__":
    destination = ROOT / "public" / "icons"
    destination.mkdir(parents=True, exist_ok=True)
    for size, name in SIZES.items():
        draw_icon(size).save(destination / name, optimize=True)
        print(f"{name}: {size}x{size}, opaque black/white, 1px grid")

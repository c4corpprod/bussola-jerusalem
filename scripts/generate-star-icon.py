"""
Gera ícones da Estrela de Davi para o app Android
Fundo escuro (#1a0a00) com estrela dourada (#c49a2a)
"""
from PIL import Image, ImageDraw
import math, os

def draw_star_of_david(draw, cx, cy, r, color, width=0):
    """Desenha uma Estrela de Davi (dois triângulos sobrepostos)"""
    # Triângulo apontando para cima
    t1 = []
    for i in range(3):
        angle = math.radians(-90 + i * 120)
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        t1.append((x, y))
    
    # Triângulo apontando para baixo
    t2 = []
    for i in range(3):
        angle = math.radians(90 + i * 120)
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        t2.append((x, y))
    
    if width == 0:
        draw.polygon(t1, fill=color)
        draw.polygon(t2, fill=color)
    else:
        draw.polygon(t1, outline=color, width=width)
        draw.polygon(t2, outline=color, width=width)

def create_icon(size, output_path):
    """Cria ícone com fundo escuro e Estrela de Davi dourada"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Fundo circular escuro
    bg_color = (26, 10, 0, 255)  # #1a0a00
    margin = int(size * 0.02)
    draw.ellipse([margin, margin, size - margin, size - margin], fill=bg_color)
    
    cx, cy = size // 2, size // 2
    
    # Brilho atrás da estrela (glow dourado)
    glow_color = (196, 154, 42, 40)  # Dourado semi-transparente
    for i in range(5, 0, -1):
        glow_r = int(size * 0.32) + i * int(size * 0.02)
        draw.ellipse([cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r], fill=glow_color)
    
    # Estrela de Davi dourada (preenchida)
    star_r = int(size * 0.32)
    gold = (196, 154, 42, 255)  # #c49a2a
    gold_light = (218, 182, 82, 255)  # Dourado mais claro
    
    draw_star_of_david(draw, cx, cy, star_r, gold)
    
    # Estrela interna menor (mais clara, para dar profundidade)
    inner_r = int(size * 0.18)
    draw_star_of_david(draw, cx, cy, inner_r, gold_light)
    
    # Contorno da estrela
    border_w = max(2, size // 60)
    draw_star_of_david(draw, cx, cy, star_r, (255, 215, 0, 255), width=border_w)
    
    img.save(output_path, 'PNG')
    print(f"  ✓ {output_path} ({size}x{size})")

def create_foreground(size, output_path):
    """Cria foreground adaptativo (108dp com safe zone 66dp)"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    cx, cy = size // 2, size // 2
    
    # A safe zone é ~61% do tamanho total (66/108)
    safe_r = int(size * 0.28)
    
    # Glow
    glow_color = (196, 154, 42, 30)
    for i in range(5, 0, -1):
        glow_r = safe_r + i * int(size * 0.015)
        draw.ellipse([cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r], fill=glow_color)
    
    gold = (196, 154, 42, 255)
    gold_light = (218, 182, 82, 255)
    
    draw_star_of_david(draw, cx, cy, safe_r, gold)
    inner_r = int(safe_r * 0.56)
    draw_star_of_david(draw, cx, cy, inner_r, gold_light)
    
    border_w = max(2, size // 80)
    draw_star_of_david(draw, cx, cy, safe_r, (255, 215, 0, 255), width=border_w)
    
    img.save(output_path, 'PNG')
    print(f"  ✓ {output_path} ({size}x{size})")

# Tamanhos dos ícones Android
base = r"c:\Users\ifoxn\Desktop\Bussula para Jerusalem\android\app\src\main\res"

icon_sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

foreground_sizes = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
}

print("🔯 Gerando ícones da Estrela de Davi...\n")

print("Ícones launcher:")
for folder, size in icon_sizes.items():
    path = os.path.join(base, folder)
    create_icon(size, os.path.join(path, 'ic_launcher.png'))
    create_icon(size, os.path.join(path, 'ic_launcher_round.png'))

print("\nÍcones foreground (adaptativo):")
for folder, size in foreground_sizes.items():
    path = os.path.join(base, folder)
    create_foreground(size, os.path.join(path, 'ic_launcher_foreground.png'))

print("\n✅ Todos os ícones gerados!")

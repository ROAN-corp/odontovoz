"""Archivos de ejemplo para los tutoriales: dos fotos de sonrisa dibujadas y un PDF de plan de ortodoncia (datos ficticios)."""
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
def foto(path, aparato):
    im = Image.new('RGB', (1200, 800), (236, 214, 208)); g = ImageDraw.Draw(im)
    g.rounded_rectangle((150, 200, 1050, 600), 190, fill=(196, 92, 98))   # labios
    g.rounded_rectangle((210, 270, 990, 540), 120, fill=(222, 120, 124))  # encía
    x = 235
    for i in range(10):
        w = 70 + (10 if 3 <= i <= 6 else 0); h = 150 + (15 if 3 <= i <= 6 else 0)
        y = 300 + (0 if 3 <= i <= 6 else 8) + (0 if aparato else (6 if i % 3 == 0 else 0))
        g.rounded_rectangle((x, y, x + w, y + h), 26, fill=(252, 250, 244), outline=(214, 210, 200), width=3)
        if aparato: g.rounded_rectangle((x + w // 2 - 14, y + h // 2 - 10, x + w // 2 + 14, y + h // 2 + 12), 5, fill=(150, 156, 164), outline=(90, 96, 104), width=2)
        x += w + 4
    if aparato: g.line((225, 392, 975, 392), fill=(110, 116, 124), width=6)
    g.text((30, 24), 'Foto de ejemplo', fill=(120, 90, 90))
    im.save(path, quality=88)
foto(os.path.join(d, 'foto1.jpg'), False); foto(os.path.join(d, 'foto2.jpg'), True)
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
c = canvas.Canvas(os.path.join(d, 'plan.pdf'), pagesize=A4); c.setFont('Helvetica-Bold', 20); c.drawString(60, 780, 'Plan de ortodoncia (ejemplo)')
c.setFont('Helvetica', 12)
for i, t in enumerate(['Paciente: ejemplo ficticio', 'Aparatología: brackets metálicos', 'Duración estimada: 24 meses', 'Controles cada 5 semanas', 'Retención: contención fija inferior']): c.drawString(60, 730 - i * 24, t)
c.save()

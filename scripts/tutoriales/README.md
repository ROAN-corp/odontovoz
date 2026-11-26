# Tutoriales con voz

Cada video se arma solo: el script abre la app, hace los pasos con un cursor visible, escribe subtítulos y le pone voz.

```bash
# una sola vez
pip install onnxruntime numpy pillow reportlab
apt-get install -y espeak-ng
# modelo de voz (Piper, es_MX-claude-high): bajar y descomprimir
#   https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-es_MX-claude-high.tar.bz2
export MODELO_TTS=/ruta/a/vits-piper-es_MX-claude-high
# servir la app (carpeta del repo)  y grabar
python3 -m http.server 8123 &
SALIDA=/ruta/salida node scripts/tutoriales/rec.js configurar    # también: agenda, ficha
```

Genera `tut-NOMBRE.mp4` y `poster-tut-NOMBRE.jpg`; copiarlos a `sitio/video/`.
Los guiones están en `t-NOMBRE.js` (`dice` = lo que se escucha, `muestra` = subtítulo si difiere, `hace` = pasos en pantalla).
Para volver a grabar tras cambios de la app, basta con ajustar el guion y correr de nuevo.

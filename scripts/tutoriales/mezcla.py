"""Pone cada frase de la voz en el segundo en que empieza en el video. Uso: python3 mezcla.py carpeta starts.json salida.wav"""
import json, sys, wave, numpy as np
od, st, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
SR = 22050; total = int((max(st) + 15) * SR); buf = np.zeros(total, dtype=np.int16)
for i, s in enumerate(st):
    w = wave.open('%s/seg_%d.wav' % (od, i)); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16); w.close(); o = int(s * SR); buf[o:o + len(a)] = a[:max(0, total - o)]
w = wave.open(out, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(buf.tobytes()); w.close()

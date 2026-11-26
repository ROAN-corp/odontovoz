"""Voz en off de los tutoriales: Piper (es_MX-claude-high) con onnxruntime + espeak-ng del sistema.
Uso: python3 tts.py segmentos.json carpeta_salida   (segmentos.json = lista de textos; escribe seg_N.wav y durs.json)
Necesita: pip install onnxruntime numpy · apt install espeak-ng · el modelo en MODELO (ver README)."""
import json, re, subprocess, wave, numpy as np, onnxruntime as ort, sys, os
D = os.environ.get('MODELO_TTS', 'vits-piper-es_MX-claude-high')
J = json.load(open(D + '/es_MX-claude-high.onnx.json')); M = J['phoneme_id_map']; SR = J['audio']['sample_rate']
sess = ort.InferenceSession(D + '/es_MX-claude-high.onnx', providers=['CPUExecutionProvider'])
def phon(text):
    out = []
    for part in re.findall(r'[^,.;:!?¿¡…]+|[,.;:!?]', text):
        if part in ',.;:!?': out.append(part); continue
        out.append(subprocess.run(['espeak-ng', '-v', 'es-419', '-q', '--ipa', part.strip()], capture_output=True, text=True).stdout.replace('\n', ' ').strip())
    return ' '.join(out)
def ids(ph):
    r = list(M['^'])
    for ch in ph:
        if ch in M: r += M[ch]; r += M['_']
    return r + M['$']
def say(text, out, length=1.08):
    x = np.array([ids(phon(text))], dtype=np.int64); l = np.array([x.shape[1]], dtype=np.int64)
    sc = np.array([J['inference']['noise_scale'], length, J['inference']['noise_w']], dtype=np.float32)
    a = sess.run(None, {'input': x, 'input_lengths': l, 'scales': sc})[0].squeeze()
    a = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    w = wave.open(out, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(a.tobytes()); w.close(); return len(a) / SR
if __name__ == '__main__':
    segs = json.load(open(sys.argv[1])); od = sys.argv[2]; os.makedirs(od, exist_ok=True); durs = []
    for i, t in enumerate(segs): durs.append(say(t, '%s/seg_%d.wav' % (od, i)))
    json.dump(durs, open(od + '/durs.json', 'w'))

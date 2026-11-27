#!/usr/bin/env python3
"""Protege los SQL viejos para que volver a correrlos NO pise versiones más nuevas.
Para cada función (y cada regla de acceso «create policy») que se define en un archivo y otra vez en un archivo POSTERIOR
(según tests/sql/orden.txt), la definición del archivo viejo pasa a crearse solo si todavía no existe. El último archivo que la define queda como está (es la versión final).
Se puede correr las veces que haga falta: no vuelve a tocar lo que ya está protegido.
Uso:  python3 scripts/guardar-sql.py      (después, bash tests/sql/probar.sh tiene que dar todo bien)"""
import re, pathlib
R = pathlib.Path(__file__).resolve().parents[1]; S = R / 'supabase'
orden = [l.strip() for l in (R / 'tests/sql/orden.txt').read_text().splitlines() if l.strip() and not l.startswith('#')]
RE = re.compile(r'^\s*create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\(', re.I)
def defs(texto):
    d = set()
    for l in texto.split('\n'):
        m = RE.match(l)
        if m: d.add(m.group(1))
    return d
txt = {f: (S / (f + '.sql')).read_text(encoding='utf-8') for f in orden}
D = {f: defs(t) for f, t in txt.items()}
for i, f in enumerate(orden):
    posteriores = set().union(*[D[g] for g in orden[i + 1:]]) if i + 1 < len(orden) else set()
    deben = D[f] & posteriores
    if not deben: continue
    L = txt[f].split('\n'); out = []; k = 0; hechos = []
    while k < len(L):
        m = RE.match(L[k])
        if m and m.group(1) in deben and not (out and out[-1].rstrip().endswith(('$pol$', '$fn$'))):
            n = m.group(1); j = k
            while j < len(L) and not re.match(r'^\s*(end\s+)?\$\$;\s*$', L[j]): j += 1
            while out and re.match(r'^\s*drop\s+function\s+if\s+exists\s+public\.' + n + r'\s*\(', out[-1], re.I): out.pop()
            out.append('/* %s solo se crea si todavía no existe: hay una versión más nueva en un archivo posterior y volver a correr este no tiene que pisarla (scripts/guardar-sql.py) */' % n)
            out.append("do $guard$ begin if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = '%s') then execute $fn$" % n)
            out += L[k:j + 1]; out.append('$fn$; end if; end $guard$;'); hechos.append(n); k = j + 1; continue
        out.append(L[k]); k += 1
    if hechos:
        (S / (f + '.sql')).write_text('\n'.join(out), encoding='utf-8'); print(f + '.sql: protegidas', ', '.join(hechos))

# ---- reglas de acceso (create policy) ----
PR = re.compile(r'^\s*create\s+policy\s+"?([^"\s]+)"?\s+on\s+([\w."]+)', re.I)
def pols(texto):
    d = set()
    for l in texto.split('\n'):
        m = PR.match(l)
        if m: d.add((m.group(2).replace('"', ''), m.group(1)))
    return d
txt = {f: (S / (f + '.sql')).read_text(encoding='utf-8') for f in orden}
D = {f: pols(t) for f, t in txt.items()}
for i, f in enumerate(orden):
    posteriores = set().union(*[D[g] for g in orden[i + 1:]]) if i + 1 < len(orden) else set()
    deben = D[f] & posteriores
    if not deben: continue
    L = txt[f].split('\n'); out = []; k = 0; hechos = []
    while k < len(L):
        m = PR.match(L[k])
        if m and (m.group(2).replace('"', ''), m.group(1)) in deben and not (out and out[-1].rstrip().endswith(('$pol$', '$fn$'))):
            nom, rel = m.group(1), m.group(2).replace('"', ''); j = k
            while j < len(L) and not L[j].rstrip().endswith(';'): j += 1
            out[:] = [x for x in out if not re.match(r'^\s*drop\s+policy\s+if\s+exists\s+"?' + re.escape(nom) + r'"?\s+on\s+' + re.escape(m.group(2)), x, re.I)]
            while out and out[-1].strip() == '': out.pop()
            esq, tab = (rel.split('.') + [None])[:2] if '.' in rel else ('public', rel)
            out.append('/* la regla %s de %s solo se crea si todavía no existe: hay una más nueva en un archivo posterior (scripts/guardar-sql.py) */' % (nom, rel))
            out.append("do $guard$ begin if not exists (select 1 from pg_policies where schemaname = '%s' and tablename = '%s' and policyname = '%s') then execute $pol$" % (esq, tab if tab else rel, nom))
            out += L[k:j + 1]; out.append('$pol$; end if; end $guard$;'); hechos.append(nom); k = j + 1; continue
        out.append(L[k]); k += 1
    if hechos:
        (S / (f + '.sql')).write_text('\n'.join(out), encoding='utf-8'); print(f + '.sql: reglas protegidas', ', '.join(hechos))

# ---- reglas que un archivo posterior QUITA (drop policy) y reemplaza por otras: no hay que volver a crearlas ----
DR = re.compile(r'^\s*drop\s+policy\s+if\s+exists\s+"?([^"\s]+)"?\s+on\s+([\w."]+)', re.I)
txt = {f: (S / (f + '.sql')).read_text(encoding='utf-8') for f in orden}
for i, f in enumerate(orden):
    creadas_despues = {}; quitadas_despues = set()
    for g in orden[i + 1:]:
        for l in txt[g].split('\n'):
            m = PR.match(l)
            if m: creadas_despues.setdefault(m.group(2).replace('"', ''), set()).add(m.group(1))
            m = DR.match(l)
            if m: quitadas_despues.add((m.group(2).replace('"', ''), m.group(1)))
    L = txt[f].split('\n'); out = []; k = 0; hechos = []
    while k < len(L):
        m = PR.match(L[k])
        if m and not (out and out[-1].rstrip().endswith(('$pol$', '$fn$'))):
            nom, rel = m.group(1), m.group(2).replace('"', '')
            nuevas = sorted(n for n in creadas_despues.get(rel, set()) if n != nom)
            if (rel, nom) in quitadas_despues and nom not in creadas_despues.get(rel, set()) and nuevas:
                j = k
                while j < len(L) and not L[j].rstrip().endswith(';'): j += 1
                esq, tab = rel.split('.') if '.' in rel else ('public', rel)
                out.append('/* la regla %s de %s solo se crea si todavía no están las reglas nuevas (%s): un archivo posterior la reemplaza (scripts/guardar-sql.py) */' % (nom, rel, ', '.join(nuevas)))
                out.append("do $guard$ begin if not exists (select 1 from pg_policies where schemaname = '%s' and tablename = '%s' and policyname in (%s)) then execute $pol$" % (esq, tab, ', '.join("'%s'" % n for n in nuevas)))
                out += L[k:j + 1]; out.append('$pol$; end if; end $guard$;'); hechos.append(nom); k = j + 1; continue
        out.append(L[k]); k += 1
    if hechos:
        (S / (f + '.sql')).write_text('\n'.join(out), encoding='utf-8'); print(f + '.sql: reglas reemplazadas protegidas', ', '.join(hechos))

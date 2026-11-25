#!/usr/bin/env python3
# Arma sitio/catalogos/rutiden.json (catálogo de insumos de Rutiden agrupado por categoría, marca y variantes)
# a partir de scripts/rutident/lista.txt (el listado que pasó la casa, sin precios). Correr: python3 scripts/rutident/build.py
import os, json, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
import re, collections, unicodedata
def parse(path='lista.txt'):
    rows=[]
    for l in open(path,encoding='utf8'):
        l=l.rstrip('\n')
        if not l.strip() or re.match(r'^\s*Codigo\s+Nombre',l): continue
        if re.match(r'^\s{8,}\S',l):
            m=re.match(r'^\s*(\S+)\s+(\S.*?)\s*$',l)
        else:
            m=re.match(r'^\s*(.+?)\s{2,}(\S.*?)\s*$',l) or re.match(r'^\s*(\d+)\s+(\S.*?)\s*$',l)
        if m: rows.append((m.group(1).strip(),re.sub(r'\s+',' ',m.group(2).strip())))
    return rows
def norm(s): return ''.join(c for c in unicodedata.normalize('NFD',s.upper()) if unicodedata.category(c)!='Mn')

import sys
rows=parse(os.path.join(HERE,'lista.txt'))
rows=[r for r in rows if not re.match(r'^(CLIENTES|FLETE|CURSO|LINEA .*descuento)',r[1],re.I)]
CATS=[
 ('comp','Composites y resinas','🦷'),('adh','Adhesivos, ácidos y selladores','💧'),('cem','Cementos, ionómeros y bases','🧱'),
 ('rest','Accesorios de restauración','🧷'),('aisl','Aislamiento (dique de goma)','🔵'),('fres','Fresas','🔩'),('pied','Piedras, discos y pulido','🪨'),('endo','Endodoncia','📍'),('impl','Implantes y componentes','🔧'),
 ('prot','Prótesis y laboratorio','🧪'),('impr','Impresión y modelos','🧴'),('orto','Ortodoncia','📐'),('inst','Instrumental','🛠️'),
 ('cirg','Cirugía y sutura','🩹'),('anes','Anestesia y agujas','💉'),('desc','Descartables y bioseguridad','🧤'),('prev','Blanqueamiento y prevención','✨'),
 ('equi','Equipamiento y aparatología','⚙️'),('otro','Otros insumos','📦')]
W={ # primera palabra -> categoría
 'comp':'COMPOSITE RESINA TETRIC FILTEK',
 'adh':'ADHESIVO ACIDO SELLADOR SILANO DESENSIBILIZANTE MONOBOND BARNIZ PRIMER',
 'cem':'AMALGAMA CEMENTO IONOMERO DYCAL THERACAL IRM EUGENOL CALCIMOL MTA HIDROXIDO BASE FORRO VARIOLINK THERABASE',
 'rest':'MATRICES CUNAS CUÑAS MICROBRUSH',
 'aisl':'CLAMP DIQUE GRAPA',
 'fres':'FRESA FRESAS FRESERO FRESON',
 'pied':'PIEDRA PULIDORES DISCO DISCOS PUMICE MANDRIL GOMA CEPILLITO BROCHITA TIRA TIRAS',
 'endo':'ACTIVADOR LIMAS CONOS GUTTA ENDO ENDO-PREP ENDOMETHASONE EDTA HIPOCLORITO LENTULOS OBSTURADOR TIRANERVIOS METAPASTE METAPEX LOCALIZADOR ENSANCHADORES POSTES FORMOCRESOL IODOFORMO DESVITALIZADOR DESOBSTURADOR PINS ESPACIADORES',
 'impl':'AVELLANADOR AVIO CILINDRO IMPLANTE PILAR TBASE UCLA ANALOGO TORNILLO SCANBODY CICATRIZANTE TRANSFER TORQUIMETRO DESTORNILLADOR LLAVE PERFORADOR OSTEOTOMOS TREFINA EXTRACTOR POSICIONADOR PROLONGADOR',
 'prot':'MONOMERO POLVO LIQUIDO OXIDO REFUERZO COMPOSICION ACONDICIONADOR ARO BAÑOMOL BANOMOL ACRILICO CORONA CUBETAS CUBETA YESO REVESTIMIENTO CERA ATACHES MACRO-LOCK CARACTERIZACION ZIR OPACO NEWCRYL NEWLAY DURALAY RESINLAY ACRY CERA-FILM CAZOLETA CLEARDICK PLACA PLACAS ESPONJA COMBO LOSETA ZOCALADOR VIBRADORA MICROARENADORA MECHERO',
 'impr':'ALGINATO SILICONA MOLDEX-CUBETAS MODELING',
 'orto':'BRACKETS LIGADURAS LIGADURA ARCO ARCOS ALAMBRE BANDA RESORTE TUBO CLIPS CLIP BOTON KLEPP ANILLO SEPARADOR EXPANSORES TOPES MODULO DOBLADOR BROCHE',
 'inst':'CAJA ESPATULA PINZA CURETA EXCAVADOR ELEVADOR FORCEPS ALICATE TIJERA SONDA EXPLORADOR ESPEJO ESPEJOS PERIOSTOTOMO SINDESMOTOMO CAVITADOR PORTA MANGO HOJA BISTURI CINCEL RASPADOR PERIOTOMO CUCHILLO SACABOCADO CURETAS TALLADOR PUNTA PUNTAS SUCTOR CANULA CANULAS SOPORTE SUJETA PARALELIZADOR ORGANIZADOR BANDEJA RECIPIENTE TAMBOR DESCARTADOR APLICADOR APLICADORES',
 'cirg':'SUTURA HUESO MEMBRANA HEMOSTAN ALVEOGYL GELATINA HEMODEN HEMOSUCTOR ELECTROBISTURI VISCOSTAT',
 'anes':'ANESTESIA AGUJAS JERINGA JERINGAS',
 'desc':'ALGODONERO CAPSULA CINTA BARBIJOS GUANTES GUANTE EYECTORES COMPRESAS GASA ALGODON BABEROS VASOS VASO CAMISOLIN CHALECO COFIA CUBRECALZADO TOALLITAS MASCARA PAPEL POUCH SOBRE ABREBOCA BARRERA DESINFECTANTE DETERGENTE ALCOHOL PALILLOS HILO',
 'prev':'BLANQUEADOR FLUOR PASTA CEPILLO CLORHEXIDINA ENJUAGUE BIOCAF CARIOSTATICO',
 'equi':'TURBINA MICROMOTOR CONTRA MOTOR SILLON LAMPARA COMPRESOR AUTOCLAVE AEROPULIDOR SCANNER IMPRESORA RX RVG MUEBLE BANQUETA ESTUFA LASER LUPA FOCO DUCHA BOMBA HELADERA LAVADORA SELLADORA TERMOFORMADORA DETECTOR PISTOLA FISIODISPENSER DISPENSER DISPENSADOR CAMARA NEGATOSCOPIO PIEZO CURADORA CALENTADOR DESTILADORA FLAMEADOR GABINETE LUBRICADORA MANGUERA MESA TRIPODE FUENTE ACOPLE ADAPTADOR ACEITE'}
FIRST={}
for k,ws in W.items():
    for w in ws.split(): FIRST[w]=k
BRANDS='MORELLI SWEDISH FIA BIOMED 3M MICRODONT BELKYS MEDESY WOODPECKER MODERN SHINYE COTISEN EAGLE VAICRIL VAICEL EIGHTEETH ROGIN VOCO ANGELUS TEDEQUIM PESCIO DOCHEM EVODEN HUFRIEDY ULTRADENT DICKINSON IVOCLAR SURGIMED RISTEA DENTSPLY BIO-ART TOKUYAMA COXO DENSELL TEALTH KETTENBACH KERR BISCO FGM SDI GC KULZER MAILLEFER MANI JET PANORAMA FORMA FORMAN DENTAMERICA DEDECO ULTRA KMD GACELA AVIO MEDESY LAMEDENT VIA COLTENE ORMCO TOMY BIOART MICROTECH FLEXI NSK SIRONA'.split()
BR=set(BRANDS)
def brand_of(name):
    t=[w.strip('.,()-') for w in re.split(r'\s+',norm(name))]
    for w in reversed(t):
        if w in BR: return w
    return ''
COLORS='AMARILLO AMARILLA AZUL GRIS MARRON PARDO ROJO ROJA ROSADO ROSA VERDE VIOLETA BLANCO BLANCA NEGRO NEGRA TRANSLUCIDO TRANSPARENTE NARANJA CELESTE DORADO PLATEADO'.split()
SHADE=re.compile(r'\b(?:[ABCD][1-4](?:\.5)?|OA[1-3]|BL[1-4]|0A[1-3])\b')
NUM=re.compile(r'(?<![\w.,/])(?<!X )(?<!X)(\d{1,4}(?:[.,]\d{1,2})?)(?![\w%.,/]|\s?(?:G|GR|GRS|ML|U|UNID|UNIDADES|MM|MM\.|CC|L|K|KG|MG|PZAS|CM|CAPAS|PIEZAS|%|\"|´))(?!\s?x\s)')
def family(name):
    n=norm(name); v=[]
    def sh(m): v.append(m.group(0)); return '·'
    n2=SHADE.sub(sh,n)
    for c in COLORS: n2=re.sub(r'\b'+c+r'\b',lambda m:(v.append(m.group(0)) or '·'),n2)
    n2=NUM.sub(lambda m:(v.append(m.group(1)) or '·'),n2)
    n2=re.sub(r'\bCOLOR\s*·','·',n2); n2=re.sub(r'(?:\s*·)+',' ·',n2); n2=re.sub(r'\s+',' ',n2).strip()
    return n2,v
def cat_of(name):
    w=norm(name).split()
    first=re.sub(r'[^A-Z0-9-]','',w[0]) if w else ''
    c=FIRST.get(first)
    if c: return c
    # por palabras clave dentro del nombre
    if re.search(r'\bCOMPOSITE|RESINA\b',norm(name)): return 'comp'
    return 'otro'
items=[]
for code,name in rows:
    items.append({'code':code,'name':name,'cat':cat_of(name),'brand':brand_of(name)})
# familias: misma categoría + mismo nombre enmascarado
fams=collections.OrderedDict()
for it in items:
    key,v=family(it['name']); k=(it['cat'],key)
    f=fams.setdefault(k,{'k':key,'cat':it['cat'],'items':[]}); f['items'].append((it,v))
out=[]; 
for (cat,key),f in fams.items():
    its=f['items']
    if len(its)>1 and key.count('·')>=1:
        # nombre amigable: la primera con los marcadores quitados
        base=re.sub(r'\s*·','',key).strip()
        out.append({'n':base,'c':cat,'b':its[0][0]['brand'],'v':[[i['code'],' '.join(v) or 'Unidad',i['name']] for i,v in its]})
    else:
        for i,v in its: out.append({'n':i['name'],'c':cat,'b':i['brand'],'v':[[i['code'],'',i['name']]]})

brands=sorted({f['b'] for f in out if f['b']}); bi={b:i+1 for i,b in enumerate(brands)}
fam=[]
for f in out:
    multi=len(f['v'])>1
    fam.append([f['n'],f['c'],bi.get(f['b'],0),[[v[0],v[1],v[2]] if multi else [v[0]] for v in f['v']]])
cats=[[c[0],c[1],c[2]] for c in CATS]
data={'v':1,'at':datetime.date.today().isoformat(),'src':'Listado de Rutiden (sin precios)','cats':cats,'brands':brands,'f':fam}
out_path=os.path.join(HERE,'..','..','sitio','catalogos','rutiden.json')
os.makedirs(os.path.dirname(out_path),exist_ok=True)
json.dump(data,open(out_path,'w',encoding='utf8'),ensure_ascii=False,separators=(',',':'))
print('productos',len(rows),'familias',len(fam),'marcas',len(brands),'bytes',os.path.getsize(out_path))

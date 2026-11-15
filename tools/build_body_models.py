#!/usr/bin/env python3
"""인체 장기 3D 모델 만들기: BodyParts3D(OBJ) → assets/models/<이름>.bin

자료: BodyParts3D, © The Database Center for Life Science, CC Attribution 4.0 International
      https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html  (partof_BP3D_4.0_obj_99.zip, partof_element_parts.txt)
      (partof_BP3D_4.0_obj_99.zip, partof_element_parts.txt, isa_BP3D_4.0_obj_99.zip)
쓰기: python3 tools/build_body_models.py <partof 압축을 푼 폴더> <partof_element_parts.txt> <isa 압축을 푼 폴더>   (pip install numpy fast-simplification)

몸 좌표(파일 안의 좌표): 1 = 10 cm, +x = 몸의 왼쪽(앞에서 보면 오른쪽), +y = 위, +z = 앞. 원점은 위(胃) 높이의 몸 가운데.
파일 형식: [uint32 JSON 길이][JSON][4바이트 맞춤][이진 데이터]
  JSON = { credit, meshes: [{ name, v(꼭짓점 수), i(인덱스 수), vo, io(이진 데이터 안 위치), min, max, center }], paths: { 이름: [[x,y,z]…] } }
  꼭짓점은 Uint16 ×3 (min~max 사이를 0~65535로), 인덱스는 Uint16 (꼭짓점이 65535개를 넘으면 Uint32)
"""
import sys, os, re, json, struct, collections
import numpy as np
import fast_simplification

SRC, PARTS, ISA = sys.argv[1], sys.argv[2], sys.argv[3]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'models')
CREDIT = 'BodyParts3D, © The Database Center for Life Science (CC BY 4.0)'

el = collections.defaultdict(list); cname = {}
for l in open(PARTS, encoding='utf-8').read().split('\n')[1:]:
    p = l.split('\t')
    if len(p) >= 3: el[p[0]].append(p[2]); cname[p[0]] = p[1]
byname = {v: k for k, v in cname.items()}

def load(e):
    V, F = [], []; nm = '?'
    for l in open(os.path.join(SRC, e + '.obj'), encoding='utf-8', errors='ignore'):
        if l.startswith('v '): V.append([float(x) for x in l.split()[1:4]])
        elif l.startswith('f '): F.append([int(t.split('/')[0]) - 1 for t in l.split()[1:4]])
        elif l.startswith('# English name'): nm = l.split(':', 1)[1].strip()
    return np.array(V, dtype=np.float64), np.array(F, dtype=np.int64), nm

def body(V):   # BodyParts3D(mm: x 왼쪽, y 뒤, z 위) → 몸 좌표
    return np.stack([V[:, 0] / 100, (V[:, 2] - 1100) / 100, -(V[:, 1] + 120) / 100], axis=1)

def organ(concept, keep=None, target=None):
    """concept(영어 이름)에 딸린 조각을 모아 하나로. keep: 조각 이름 정규식(없으면 전부). target: 삼각형 수 목표(조각 전체)"""
    Vs, Fs, off, tot = [], [], 0, 0; parts = []
    for e in sorted(set(el[byname[concept]])):
        if not os.path.exists(os.path.join(SRC, e + '.obj')): continue
        V, F, nm = load(e)
        if keep and not re.search(keep, nm): continue
        parts.append((V, F)); tot += len(F)
    for V, F in parts:
        if target and tot > target * 1.15 and len(F) > 300:
            V, F = fast_simplification.simplify(V.astype(np.float32), F.astype(np.int32), target_count=max(200, int(len(F) * target / tot)))
            V = V.astype(np.float64); F = F.astype(np.int64)
        Vs.append(V); Fs.append(F + off); off += len(V)
    return body(np.vstack(Vs)), np.vstack(Fs)

_names = None
def pick(pattern, target=None, exclude=None):
    """isa 폴더에서 조각 이름(영어)이 정규식에 맞는 것을 모아 하나로. target: 삼각형 수 목표"""
    global _names
    if _names is None:
        _names = {}
        for f in sorted(os.listdir(ISA)):
            if f.endswith('.obj'):
                m = re.search(r'English name : (.*)', open(os.path.join(ISA, f), encoding='utf-8', errors='ignore').read(2500))
                if m: _names[f[:-4]] = m.group(1).strip()
    parts, tot = [], 0
    for e, nm in _names.items():
        if re.search(pattern, nm) and not (exclude and re.search(exclude, nm)):
            V, F = [], []
            for l in open(os.path.join(ISA, e + '.obj'), encoding='utf-8', errors='ignore'):
                if l.startswith('v '): V.append([float(x) for x in l.split()[1:4]])
                elif l.startswith('f '): F.append([int(t.split('/')[0]) - 1 for t in l.split()[1:4]])
            parts.append((np.array(V, dtype=np.float64), np.array(F, dtype=np.int64))); tot += len(F)
    assert parts, pattern
    Vs, Fs, off = [], [], 0
    for V, F in parts:
        if target and tot > target * 1.15 and len(F) > 300:
            V, F = fast_simplification.simplify(V.astype(np.float32), F.astype(np.int32), target_count=max(200, int(len(F) * target / tot)))
            V = V.astype(np.float64); F = F.astype(np.int64)
        Vs.append(V); Fs.append(F + off); off += len(V)
    return body(np.vstack(Vs)), np.vstack(Fs)

def cut(mesh, keep):   # keep(꼭짓점 배열) → 참/거짓: 세 꼭짓점이 모두 참인 삼각형만 남겨요
    V, F = mesh; ok = keep(V); F = F[ok[F].all(axis=1)]; used = np.unique(F); remap = -np.ones(len(V), dtype=np.int64); remap[used] = np.arange(len(used))
    return V[used], remap[F]

def slices(V, axis, n, rev=False):   # 한 축을 따라 n 조각으로 나눠 조각마다 가운데 점
    t = V[:, axis]; lo, hi = t.min(), t.max(); pts = []
    for k in range(n):
        a, b = lo + (hi - lo) * k / n, lo + (hi - lo) * (k + 1) / n; m = (t >= a) & (t <= b)
        if m.sum() >= 3: pts.append(V[m].mean(axis=0))
    return pts[::-1] if rev else pts

def write(name, meshes, paths):
    meta = {'credit': CREDIT, 'meshes': [], 'paths': {k: [[round(float(x), 3) for x in p] for p in v] for k, v in paths.items()}}; blob = b''
    for nm, (V, F) in meshes.items():
        mn, mx = V.min(axis=0), V.max(axis=0); q = np.round((V - mn) / np.maximum(mx - mn, 1e-9) * 65535).astype('<u2')
        idx = F.astype('<u2' if len(V) <= 65535 else '<u4').reshape(-1)
        vo = len(blob); blob += q.tobytes(); blob += b'\0' * (-len(blob) % 4); io = len(blob); blob += idx.tobytes(); blob += b'\0' * (-len(blob) % 4)
        meta['meshes'].append({'name': nm, 'v': int(len(V)), 'i': int(idx.size), 'vo': vo, 'io': io, 'min': [round(float(x), 4) for x in mn], 'max': [round(float(x), 4) for x in mx], 'center': [round(float(x), 3) for x in V.mean(axis=0)]})
        print('  %-12s verts %6d tris %6d' % (nm, len(V), len(F)))
    js = json.dumps(meta, ensure_ascii=False, separators=(',', ':')).encode('utf-8'); js += b' ' * (-(4 + len(js)) % 4)
    os.makedirs(OUT, exist_ok=True); f = os.path.join(OUT, name + '.bin'); open(f, 'wb').write(struct.pack('<I', len(js)) + js + blob)
    print(name, os.path.getsize(f) // 1024, 'KB')

def digestive():
    M = collections.OrderedDict()
    M['esophagus'] = organ('esophagus')
    M['stomach'] = organ('stomach')
    M['liver'] = organ('liver', r'Hepatovenous segment|Caudate lobe', 14000)
    M['gallbladder'] = organ('gallbladder', None, 1200)
    M['pancreas'] = organ('pancreas', r'^Pancreas$', 2400)
    M['duodenum'] = organ('duodenum')
    sj, si = organ('jejunum'), organ('ileum')
    M['small'] = (np.vstack([sj[0], si[0]]), np.vstack([sj[1], si[1] + len(sj[0])]))
    lg = [organ('large intestine', k) for k in (r'Ileocecal', r'Ascending colon', r'Transverse colon', r'Descending colon')] + [organ('rectum')]
    Vs, Fs, off = [], [], 0
    for V, F in lg: Vs.append(V); Fs.append(F + off); off += len(V)
    M['large'] = (np.vstack(Vs), np.vstack(Fs))
    # 음식물이 지나가는 길 (입 쪽 → 항문 쪽)
    eso = slices(M['esophagus'][0], 1, 6, rev=True)
    st = M['stomach'][0]; duo = M['duodenum'][0]; dc = duo.mean(axis=0)
    pyl = st[np.argsort(np.linalg.norm(st - dc, axis=1))[:40]].mean(axis=0)
    ang = np.arctan2(duo[:, 1] - dc[1], duo[:, 0] - dc[0]); a0 = np.arctan2(pyl[1] - dc[1], pyl[0] - dc[0]); rel = (ang - a0) % (2 * np.pi)
    if (rel > np.pi).sum() > (rel < np.pi).sum(): rel = (a0 - ang) % (2 * np.pi)
    dpath = [duo[(rel >= a) & (rel < a + 0.9)].mean(axis=0) for a in np.arange(0, 5.4, 0.9) if ((rel >= a) & (rel < a + 0.9)).sum() >= 3]
    sm = M['small'][0]; mn, mx = sm.min(axis=0), sm.max(axis=0); zig = []; rows = 6
    for r in range(rows):
        y = mx[1] - (mx[1] - mn[1]) * (r + 0.5) / rows; band = sm[np.abs(sm[:, 1] - y) < (mx[1] - mn[1]) / rows / 2]
        if len(band) < 3: continue
        xa, xb = np.percentile(band[:, 0], [12, 88]); z = band[:, 2].mean(); row = [np.array([xb, y, z]), np.array([xa, y, z])]
        zig += row if r % 2 == 0 else row[::-1]
    if zig and zig[-1][0] > 0: zig.append(np.array([np.percentile(sm[:, 0], 12), mn[1] + 0.05, sm[:, 2].mean()]))   # 끝은 몸의 오른쪽 아래(막창자 쪽)
    asc, tr, de, rc = lg[1][0], lg[2][0], lg[3][0], lg[4][0]
    large = [lg[0][0].mean(axis=0)] + slices(asc, 1, 5) + slices(tr, 0, 7) + slices(de, 1, 9, rev=True) + slices(rc, 1, 4, rev=True)
    stomach = [eso[-1], st.mean(axis=0) * 0.5 + eso[-1] * 0.5, st.mean(axis=0), pyl]
    small = [pyl] + dpath + zig + [large[0]]
    write('digestive', M, {'esophagus': eso, 'stomach': stomach, 'small': small, 'large': large})   # 구간마다 앞 구간의 끝점에서 시작해요

def organs():   # 가슴 · 배의 다른 기관 (허파 겉모양은 자료에 없어요: 기관과 기관지만 있어요)
    M = collections.OrderedDict()
    M['heart'] = pick(r'^Wall of (ventricle|left atrium|right atrium)$', 9000)
    M['vessels'] = pick(r'^(Ascending aorta|Arch of aorta|Descending thoracic aorta|Abdominal aorta|Pulmonary trunk|Superior vena cava|Inferior vena cava)$', 5000)
    M['kidney_l'] = pick(r'^Left kidney$'); M['kidney_r'] = pick(r'^Right kidney$')
    M['ureters'] = pick(r'^(Left|Right) ureter$', 2000); M['bladder'] = pick(r'^Urinary bladder$'); M['spleen'] = pick(r'^Spleen$')
    M['trachea'] = pick(r'^(Trachea|Left main bronchus|Right main bronchus proper)$', 5000)
    write('organs', M, {})

def brain():
    M = collections.OrderedDict(); gy = r'(gyrus|lobule|lobe|[Ii]nsula|cuneus|[Pp]recuneus|operculum|pole|cortex)$'; no = r'artery|[Bb]ranch|vein|duct|liver|thymus|lung|thyroid|prostate'
    M['cerebrum_l'] = pick(r'[Ll]eft .*' + gy, 9000, no); M['cerebrum_r'] = pick(r'[Rr]ight .*' + gy, 9000, no)
    M['cerebellum'] = pick(r'^Cerebellum$', 6000)
    M['thalamus'] = pick(r'^(Left thalamus|Right thalamus|Hypothalamus)$', 2500)     # 간뇌 (시상 · 시상 하부)
    M['midbrain'] = pick(r'^Midbrain$', 2000); M['pons'] = pick(r'^Pons$', 2500); M['medulla'] = pick(r'^Medulla oblongata$', 2000)
    M['spinal_canal'] = pick(r'^Central canal of spinal cord$')     # 척수 자체는 자료에 없어요: 척수 가운데를 지나는 가는 관(길잡이로 써요)
    write('brain', M, {})

def skin():   # 몸 윤곽: 온몸, 그리고 머리~골반(팔 · 다리를 잘라 낸 것)
    M = collections.OrderedDict(); full = pick(r'^Skin$', 16000); M['skin'] = full
    M['skin_torso'] = cut(full, lambda V: (V[:, 1] > -4.3) & ((np.abs(V[:, 0]) < 1.95) | (V[:, 1] > 2.9)))
    write('body', M, {})

if __name__ == '__main__':
    todo = sys.argv[4:] or ['digestive', 'organs', 'brain', 'skin']
    for t in todo: globals()[t]()

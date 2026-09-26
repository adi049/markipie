"""Markipie wordmark geometry, reverse-engineered from the official logo (247x85 px reference).
All coordinates are in 'logo units' == pixels of the reference image (y down)."""
import math

def fmt(v):
    s = f"{v:.2f}".rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

def poly_path(pts, cw=True):
    """Polygon path, normalised to clockwise-on-screen (positive shoelace in y-down coords)."""
    area = 0.0
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % n]
        area += x1 * y2 - x2 * y1
    # In y-down screen coords, shoelace > 0 means clockwise as seen on screen.
    if (area > 0) != cw:
        pts = list(reversed(pts))
    d = 'M' + ' L'.join(f"{fmt(x)} {fmt(y)}" for x, y in pts) + 'Z'
    return d

def rect_path(x1, y1, x2, y2):
    return poly_path([(x1, y1), (x2, y1), (x2, y2), (x1, y2)])

def ellipse_path(cx, cy, rx, ry, cw=True):
    s = 1 if cw else 0
    return (f"M{fmt(cx - rx)} {fmt(cy)}"
            f"A{fmt(rx)} {fmt(ry)} 0 1 {s} {fmt(cx + rx)} {fmt(cy)}"
            f"A{fmt(rx)} {fmt(ry)} 0 1 {s} {fmt(cx - rx)} {fmt(cy)}Z")

def ring_path(cx, cy, rx, ry, rxi, ryi):
    return ellipse_path(cx, cy, rx, ry, cw=True) + ellipse_path(cx, cy, rxi, ryi, cw=False)

# ---------------------------------------------------------------- metrics
X_TOP = 43.95      # x-height (flat stem tops)
BASE  = 69.38      # baseline
ASC   = 34.5       # ascender (k)
DESC  = 78.5       # descender (p)
SW    = 3.4        # stem width
CY    = 56.68      # centre of the round letters
RY    = 13.3       # outer vertical radius of round letters (overshoot included)
T_SIDE, T_TOPBOT = 3.5, 3.2   # ring stroke: sides / top-bottom (optical correction)

COLORS = {
    'blue': '#00A4FF',
    'cyan': '#00C2E7',
    'teal': '#00D8D4',
}

letters = []  # dicts: id, char, paths (list of (d, fill)), bbox

def add(id_, char, subpaths, bbox, fill='cyan', extra=None):
    letters.append(dict(id=id_, char=char, d=''.join(subpaths), bbox=bbox, fill=fill, extra=extra or {}))

# ---------------------------------------------------------------- M (with check-stroke + pie triangles)
LS = (8.95, 19.9); RS = (43.1, 54.0)
Y_TOP, Y_NOTCH, X_NOTCH = 30.6, 34.6, 12.9
Y_LB = 61.7
m_slope_check = 1.058   # dx per -dy of the check stroke (46.6 deg)
def check_ul(y): return 47.79 - m_slope_check * (y - 22.5)   # upper-left edge
def check_lr(y): return 63.45 - m_slope_check * (y - 22.5)   # lower-right edge
def diag_top(y): return 22.9 + 1.1 * (y - Y_TOP)           # left diagonal top edge
def diag_bot(y): return 7.3 + 1.1 * (y - Y_TOP)            # left diagonal bottom edge

# valley: diag_top == check_ul
yv = (47.79 + m_slope_check * 22.5 - 22.9 + 1.1 * Y_TOP) / (1.1 + m_slope_check)
P3 = (diag_top(yv), yv)
# inner vertex: diag_bot == check_lr
yi = (63.45 + m_slope_check * 22.5 - 7.3 + 1.1 * Y_TOP) / (1.1 + m_slope_check)
P10 = (diag_bot(yi), yi)
# apex + perpendicular cut
y_apex = 12.7
P4 = (check_ul(y_apex), y_apex)
# cut direction (1, m) ; intersect with lower-right edge
t = (check_lr(y_apex) - P4[0]) / (1 + m_slope_check * m_slope_check)  # solve 58.16+t = lr(y_apex + m t)
# lr(y) = 63.45 - m (y-22.5); with y = y_apex + m t -> lr = lr(y_apex) - m*m*t ; so P4x + t = lr(y_apex) - m^2 t
P5 = (P4[0] + t, y_apex + m_slope_check * t)
P6 = (RS[1], 22.5 + (63.45 - RS[1]) / m_slope_check)
P9 = (RS[0], 22.5 + (63.45 - RS[0]) / m_slope_check)
P11 = (LS[1], Y_TOP + (LS[1] - 7.3) / 1.1)
M_poly = [
    (X_NOTCH, Y_TOP), (22.9, Y_TOP), P3, P4, P5, P6,
    (RS[1], BASE), (RS[0], BASE), P9, P10, P11,
    (LS[1], Y_LB), (LS[0], Y_LB), (LS[0], Y_NOTCH), (X_NOTCH, Y_NOTCH),
]
def tri(cx, apex_y, base_y, hw):
    return [(cx, apex_y), (cx + hw, base_y), (cx - hw, base_y)]
TRIS = [tri(13.0, 18.4, 22.2, 2.15), tri(10.0, 23.6, 27.8, 2.2), tri(15.5, 23.6, 27.8, 2.6), tri(10.05, 28.4, 33.6, 2.35)]
add('M', 'M', [poly_path(M_poly)], (5.7, 11.2, 61.4, 59.7), fill='gradM',
    extra=dict(tris=[poly_path(p) for p in TRIS], grad=(LS[0], P5[0])))

# ---------------------------------------------------------------- a
rx_a = 13.1
cx_a = 91.95 - rx_a
add('a', 'a', [ring_path(cx_a, CY, rx_a, RY, rx_a - T_SIDE, RY - T_TOPBOT),
               rect_path(91.95 - SW, X_TOP, 91.95, BASE)],
    (64.25, 41.9, 29.2, 29.6))

# ---------------------------------------------------------------- r
r_stem = (102.85, 102.85 + SW)
acx, acy, aR, aT = 114.2, 54.0, 10.6, 3.3
aRi = aR - aT
x_cut = 115.2
S_out = (r_stem[1], acy - math.sqrt(aR**2 - (acx - r_stem[1])**2))
T_out = (x_cut, acy - math.sqrt(aR**2 - (x_cut - acx)**2))
T_in  = (x_cut, acy - math.sqrt(aRi**2 - (x_cut - acx)**2))
L_in  = (acx - aRi, acy)
arm = (f"M{fmt(S_out[0])} {fmt(S_out[1])}A{fmt(aR)} {fmt(aR)} 0 0 1 {fmt(T_out[0])} {fmt(T_out[1])}"
       f"L{fmt(T_in[0])} {fmt(T_in[1])}A{fmt(aRi)} {fmt(aRi)} 0 0 0 {fmt(L_in[0])} {fmt(L_in[1])}"
       f"L{fmt(r_stem[1])} {fmt(acy)}Z")
add('r', 'r', [rect_path(r_stem[0], X_TOP, r_stem[1], BASE), arm], (101.35, 41.9, 15.4, 29.0))

# ---------------------------------------------------------------- k
k_stem = (122.95, 122.95 + SW)
arm_up, arm_lo = 186.0, 181.4       # x + y = const
leg_up, leg_lo = 73.9, 69.0         # x - y = const
k_arm = poly_path([(arm_lo - X_TOP, X_TOP), (arm_up - X_TOP, X_TOP), (124.0, arm_up - 124.0), (124.0, arm_lo - 124.0)])
inner = arm_up - 0.5
k_leg = poly_path([((leg_up + inner) / 2, (inner - leg_up) / 2), (leg_up + BASE, BASE), (leg_lo + BASE, BASE), ((leg_lo + inner) / 2, (inner - leg_lo) / 2)])
add('k', 'k', [rect_path(k_stem[0], ASC, k_stem[1], BASE), k_arm, k_leg], (121.45, 33.0, 23.4, 37.9))

# ---------------------------------------------------------------- i (first, with dot)
i1c = 152.95
add('i1', 'i', [rect_path(i1c - SW / 2, X_TOP, i1c + SW / 2, BASE), ellipse_path(i1c, 36.35, 2.6, 2.6)],
    (148.85, 32.25, 8.2, 38.65))

# ---------------------------------------------------------------- p
p_stem = (166.05, 166.05 + SW)
cx_p = p_stem[0] + rx_a
add('p', 'p', [ring_path(cx_p, CY, rx_a, RY, rx_a - T_SIDE, RY - T_TOPBOT),
               rect_path(p_stem[0], X_TOP, p_stem[1], DESC)],
    (164.55, 41.9, 29.2, 38.1))

# ---------------------------------------------------------------- i (second, dot replaced by the check mark)
i2c = 204.5
add('i2', 'i', [rect_path(i2c - SW / 2, X_TOP, i2c + SW / 2, BASE)], (201.3, 42.45, 6.4, 28.45))
CHECK = [(194.5, 31.1), (198.2, 27.4), (204.55, 33.75), (216.65, 21.65), (220.35, 25.35), (204.55, 41.15)]
add('check', '✓', [poly_path(CHECK)], (193.0, 20.15, 28.9, 22.5), fill='blue')

# ---------------------------------------------------------------- e
cx_e, rx_e = 229.5, 13.35
rxi_e, ryi_e = rx_e - T_SIDE, RY - T_TOPBOT
Y_BAR1, Y_BAR2, Y_CUT = 54.0, 57.0, 61.5
def ex_out(y): return cx_e + rx_e * math.sqrt(1 - ((y - CY) / RY) ** 2)
def ex_in(y):  return cx_e + rxi_e * math.sqrt(1 - ((y - CY) / ryi_e) ** 2)
P1o, Q1o = (ex_out(Y_CUT), Y_CUT), (ex_out(Y_BAR2), Y_BAR2)
P1i, Q1i = (ex_in(Y_CUT), Y_CUT), (ex_in(Y_BAR2), Y_BAR2)
e_ring = (f"M{fmt(P1o[0])} {fmt(P1o[1])}A{fmt(rx_e)} {fmt(RY)} 0 1 1 {fmt(Q1o[0])} {fmt(Q1o[1])}"
          f"L{fmt(Q1i[0])} {fmt(Q1i[1])}A{fmt(rxi_e)} {fmt(ryi_e)} 0 1 0 {fmt(P1i[0])} {fmt(P1i[1])}Z")
e_bar = rect_path(217.6, Y_BAR1, 240.8, Y_BAR2)
add('e', 'e', [e_ring, e_bar], (214.65, 41.9, 29.7, 29.6))

VIEWBOX = (4, 10, 243, 80)

if __name__ == '__main__':
    for L in letters:
        print(L['id'], L['bbox'], len(L['d']))
    print('P3', P3, 'P10', P10, 'P4', P4, 'P5', P5, 'P6', P6, 'P9', P9, 'P11', P11)

"""Entry trajectory: fast ease-out approach that carries velocity into a damped spring (overshoot -> settle).
F(t) is the position along the entry vector, normalised: 1 = start offset, 0 = final position, negative = overshoot."""
import math

TC, K, H1 = 0.36, 4.5, 0.18       # approach: arrival time (fraction), expo stiffness, arrival slope
OMEGA, LAMBDA = 22.0, 7.5         # spring: angular freq (rad / unit time), damping (1 / unit time)

A = (1 - H1) / (1 - math.exp(-K) - K * math.exp(-K))
B = H1 - A * K * math.exp(-K)
V = H1 / TC

def F(t):
    if t <= TC:
        u = t / TC
        return A * (math.exp(-K * u) - math.exp(-K)) + B * (1 - u)
    tau = t - TC
    return -(V / OMEGA) * math.exp(-LAMBDA * tau) * math.sin(OMEGA * tau)

def samples(step=2):
    out = []
    for p in range(0, 101, step):
        t = p / 100.0
        f = F(t)
        if p == 100:
            f = 0.0
        out.append((p, f))
    return out

if __name__ == '__main__':
    peak = min(F(t / 1000) for t in range(0, 1001))
    print('A,B,V =', round(A, 4), round(B, 4), round(V, 4), ' peak overshoot =', round(peak, 4))
    for p, f in samples(4):
        print(f'{p:3d}% {f:+.4f}')

// Decorative market-tape backdrop for the hero: a deterministic candlestick chart (no Math.random,
// so SSR-safe) that drifts sideways FOREVER. The series is CYCLIC — one full market cycle that
// returns to its start (cosine trend + integer-harmonic wobble) — so the two tiled panels join
// seamlessly with no price "jump" at the drift seam. Domain-relevant, not a fake screenshot.
// Seeded random WALK (fixed-seed PRNG -> deterministic + SSR-safe, but reads as an organic random
// series, not an obvious sine wave), DETRENDED so the last close returns to the first -> the two
// tiled panels join seamlessly.
const N = 56;
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const _rnd = mulberry32(20260701);
const _raw: number[] = [0];
for (let i = 1; i < N; i++) _raw.push(_raw[i - 1] + (_rnd() - 0.5) * 2.4);
const _drift = _raw[N - 1] / (N - 1);
const _walk = _raw.map((v, i) => v - _drift * i);          // close the loop: _walk[0] === _walk[N-1] === 0
const _lo = Math.min(..._walk);
const _hi = Math.max(..._walk);
const CLOSES = _walk.map((v) => Math.round(1900 + ((v - _lo) / (_hi - _lo || 1)) * 1300));

const W = 1200, H = 460, TOP = 40, BOT = 410;
const minP = Math.min(...CLOSES) * 0.985;
const maxP = Math.max(...CLOSES) * 1.012;
const y = (p: number) => TOP + (1 - (p - minP) / (maxP - minP)) * (BOT - TOP);
const slot = W / N;
const bodyW = slot * 0.5;
const wick = (maxP - minP) * 0.014;

// Cyclic SMA (wraps around the series) so the moving-average lines stay CONTINUOUS across the seam —
// no gap where a fresh panel's average would otherwise restart.
function sma(period: number): number[] {
  return CLOSES.map((_, i) => {
    let s = 0;
    for (let k = 0; k < period; k++) s += CLOSES[(i - k + N) % N];
    return s / period;
  });
}
const sma8 = sma(8);
const sma21 = sma(21);
const linePts = (arr: number[]) =>
  arr.map((v, i) => `${i * slot + slot / 2},${y(v).toFixed(1)}`).join(" ");

function ChartPanel() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="h-full w-1/2 shrink-0">
      {/* faint reference levels */}
      {[0.28, 0.5, 0.72].map((f) => (
        <line key={f} x1="0" x2={W} y1={TOP + f * (BOT - TOP)} y2={TOP + f * (BOT - TOP)}
          stroke="#7fb0ff" strokeOpacity="0.12" strokeDasharray="5 7" strokeWidth="1" />
      ))}
      {/* candles */}
      {CLOSES.map((c, i) => {
        const o = CLOSES[(i - 1 + N) % N];   // cyclic open (wraps) so the seam candle is continuous
        const up = c >= o;
        const cx = i * slot + slot / 2;
        const top = Math.min(y(o), y(c));
        const h = Math.max(2, Math.abs(y(o) - y(c)));
        const color = up ? "#22c069" : "#ef5350";
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={y(Math.max(o, c) + wick)} y2={y(Math.min(o, c) - wick)} stroke={color} strokeWidth="1.4" />
            <rect x={cx - bodyW / 2} y={top} width={bodyW} height={h} fill={color} rx="1" />
          </g>
        );
      })}
      <polyline points={linePts(sma21)} fill="none" stroke="#a78bfa" strokeOpacity="0.55" strokeWidth="2.5" />
      <polyline points={linePts(sma8)} fill="none" stroke="#7fb0ff" strokeOpacity="0.8" strokeWidth="2.5" />
    </svg>
  );
}

export default function HeroBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* accent glow */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(58rem 30rem at 82% 8%, rgba(127,176,255,0.16), transparent 62%)" }}
      />
      {/* terminal grid */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* drifting candlesticks */}
      <div className="af-drift absolute inset-0 flex w-[200%] opacity-[0.5]">
        <ChartPanel />
        <ChartPanel />
      </div>
      {/* readability scrims (keep the left where the copy sits dark) */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, rgba(11,37,69,0.97) 0%, rgba(11,37,69,0.78) 42%, rgba(11,37,69,0.32) 100%)" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-28" style={{ background: "linear-gradient(to top, #0b2545, transparent)" }} />
    </div>
  );
}

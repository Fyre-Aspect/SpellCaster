export default function Sparkline({ values, width = 132, height = 34 }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(max - min, 1);
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * (width - 8) + 4,
    height - 5 - ((v - min) / span) * (height - 10),
  ]);
  const [lastX, lastY] = pts[pts.length - 1];
  const latest = values[values.length - 1];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`WPM trend over last ${values.length} runs, latest ${Math.round(latest)}, average ${Math.round(avg)}`}
    >
      <polyline
        points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="3.5" fill="var(--red)" />
    </svg>
  );
}

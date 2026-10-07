import { useId } from 'react';

export function StatecraftMark() {
  const clipId = useId();

  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {/* Keep the resting geometry aligned with assets/statecraft.svg (favicon). */}
      <g clipPath={`url(#${clipId})`}>
        <rect width={80} height={80} rx={24} fill="black" />
        <rect
          className="statecraft-mark__line"
          x={50}
          y={50}
          width={80}
          height={80}
          rx={24}
          stroke="white"
          strokeWidth={6}
        />
        <circle className="statecraft-mark__dot" cx={40} cy={40} r={8} fill="white" />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width={80} height={80} rx={24} />
        </clipPath>
      </defs>
    </svg>
  );
}

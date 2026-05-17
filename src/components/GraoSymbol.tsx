import React from 'react';
import Svg, { Ellipse, Line } from 'react-native-svg';

interface GraoSymbolProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

export default function GraoSymbol({ size = 40, color = '#C07826', filled = false }: GraoSymbolProps) {
  const rx = size * 0.575;
  const ry = size * 0.375;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0 : 1.5}
      />
      {!filled && (
        <Line
          x1={cx}
          y1={cy - ry}
          x2={cx}
          y2={cy + ry}
          stroke={color}
          strokeWidth={1.5}
        />
      )}
    </Svg>
  );
}

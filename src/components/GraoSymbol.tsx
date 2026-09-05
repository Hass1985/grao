import React from 'react';
import Svg, { Ellipse, Line } from 'react-native-svg';

interface GraoSymbolProps {
  size?: number;
  color?: string;
  /** Cor do miolo quando filled; se omitido, usa `color` (ou soft a 20%). */
  fillColor?: string;
  /** true = preenchimento sólido; 'soft' = preenchimento leve + traço (melhor em tabs). */
  filled?: boolean | 'soft';
}

export default function GraoSymbol({
  size = 40,
  color = '#D89A55',
  fillColor,
  filled = false,
}: GraoSymbolProps) {
  const rx = size * 0.575;
  const ry = size * 0.375;
  const cx = size / 2;
  const cy = size / 2;
  const soft = filled === 'soft';
  const solid = filled === true;
  const fill = solid || soft ? fillColor ?? color : 'none';
  const fillOpacity = soft && !fillColor ? 0.2 : solid || soft ? 1 : 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={color}
        strokeWidth={solid ? 0 : 1.6}
      />
      {!solid && (
        <Line
          x1={cx}
          y1={cy - ry}
          x2={cx}
          y2={cy + ry}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

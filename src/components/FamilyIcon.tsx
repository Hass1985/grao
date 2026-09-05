import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { EmotionalFamily } from '../data/seeds';

interface Props {
  family: EmotionalFamily;
  size?: number;
  color: string;
}

// Ícones monoline próprios do Grão, um por família emocional.
// Nada de emoji de sistema: traço fino, cantos redondos, na cor da marca.
export default function FamilyIcon({ family, size = 22, color }: Props) {
  const s = {
    stroke: color,
    strokeWidth: 1.6,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const svg = (children: React.ReactNode) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {children}
    </Svg>
  );

  switch (family) {
    case 'ansiedade': // pulso agitado
      return svg(<Path {...s} d="M2 12 h4 l2 -6 l3 12 l2.5 -9 l2 3 h6.5" />);

    case 'gratidão': // coração
      return svg(
        <Path
          {...s}
          d="M12 20 C 5.5 15.5 3.5 11 5.8 8.2 C 7.4 6.2 10.6 6.6 12 9 C 13.4 6.6 16.6 6.2 18.2 8.2 C 20.5 11 18.5 15.5 12 20 Z"
        />
      );

    case 'luto': // lágrima
      return svg(
        <Path {...s} d="M12 3 C 12 3 6 11 6 15 a 6 6 0 0 0 12 0 C 18 11 12 3 12 3 Z" />
      );

    case 'esperança': // broto
      return svg(
        <>
          <Path {...s} d="M12 21 V 11.5" />
          <Path {...s} d="M12 13 C 8.5 13 6.2 10.4 6.6 6.8 C 10.2 6.8 12 9.2 12 12.5" />
          <Path {...s} d="M12 12 C 15.5 12 17.8 9.6 17.4 6.4 C 14 6.4 12 8.6 12 11" />
        </>
      );

    case 'culpa': // nuvem de chuva (peso)
      return svg(
        <>
          <Path
            {...s}
            d="M7 14.5 A 3.2 3.2 0 0 1 7.2 8.2 A 4.3 4.3 0 0 1 15.4 7.6 A 3.3 3.3 0 0 1 16 14.5 Z"
          />
          <Path {...s} d="M8.5 17.5 V 19.5" />
          <Path {...s} d="M12 17.5 V 20.5" />
          <Path {...s} d="M15.5 17.5 V 19.5" />
        </>
      );

    case 'propósito': // bússola
      return svg(
        <>
          <Circle {...s} cx={12} cy={12} r={8.5} />
          <Path {...s} d="M12 6.5 L 14.4 12 L 12 17.5 L 9.6 12 Z" />
        </>
      );

    case 'solidão': // lua crescente
      return svg(
        <Path {...s} d="M17.5 3.2 A 9 9 0 1 0 17.5 20.8 A 7 7 0 1 1 17.5 3.2 Z" />
      );

    case 'paz': // folha
      return svg(
        <>
          <Path {...s} d="M6 18 C 6 10 11 5 18 5 C 18 12.5 13 18 6 18 Z" />
          <Path {...s} d="M9.5 14.5 L 15.5 8.5" />
        </>
      );

    case 'alegria': // brilho de quatro pontas
      return svg(
        <Path
          {...s}
          d="M12 3 L 13.5 10.5 L 21 12 L 13.5 13.5 L 12 21 L 10.5 13.5 L 3 12 L 10.5 10.5 Z"
        />
      );

    case 'fé': // chama
      return svg(
        <>
          <Path {...s} d="M12 3 C 14 7 17 9 17 13 A 5 5 0 1 1 7 13 C 7 10 9 8.5 12 3 Z" />
          <Path {...s} d="M12 16.5 C 10.6 15.2 10.8 13.4 12 12 C 13.2 13.4 13.4 15.2 12 16.5 Z" />
        </>
      );

    case 'medo': // alerta / tremor
      return svg(
        <>
          <Path {...s} d="M12 3 L 21 20 H 3 Z" />
          <Path {...s} d="M12 10 V 14" />
          <Circle {...s} cx={12} cy={17} r={0.8} fill={color} />
        </>
      );

    case 'tristeza': // lágrimas caídas
      return svg(
        <>
          <Circle {...s} cx={9} cy={10} r={1.2} />
          <Circle {...s} cx={15} cy={10} r={1.2} />
          <Path {...s} d="M8 16 C 9.5 18.5 14.5 18.5 16 16" />
        </>
      );

    case 'raiva': // raios
      return svg(
        <Path {...s} d="M13 2 L 6 13 H 11 L 10 22 L 18 10 H 13 Z" />
      );

    default:
      return svg(<Circle {...s} cx={12} cy={12} r={7} />);
  }
}

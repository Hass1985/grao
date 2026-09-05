import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, Platform, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Ellipse,
  Path,
  G,
  Line,
} from 'react-native-svg';

const NATIVE = Platform.OS !== 'web';

const C = {
  skyTop: '#F8E7C6', skyMid: '#F2CB8C', skyWarm: '#EBAF66',
  skyBlueTop: '#EAF0E6', skyBlue: '#CFE0E4',
  sun: '#E68B39', sun2: '#EFA24E', glow: '#F6CE85',
  hillFar: '#AEBB84', hillNear: '#758F55', crop: '#5C7742', soil: '#9A6A38',
  sprout: '#5E7A45', trunk: '#8A5A2B',
  skin: '#E9B98C', hair: '#5A3A1E',
  accent: '#E0891A', casca: '#2A1604', cream: '#FFF8EE', heart: '#E04A2F', white: '#FFFFFF',
};

// ---- hooks de animação ----
function useOsc(dur: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE }),
        Animated.timing(v, { toValue: 0, duration: dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return v;
}
function useLin(dur: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: NATIVE }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return v;
}

// ---- wrappers ----
const Bob = ({ amp, dur, delay = 0, style, children }: any) => {
  const v = useOsc(dur, delay);
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: [amp, -amp] });
  return <Animated.View pointerEvents="none" style={[style, { transform: [{ translateY: ty }] }]}>{children}</Animated.View>;
};
const Sway = ({ deg, dur, delay = 0, style, children }: any) => {
  const v = useOsc(dur, delay);
  const rot = v.interpolate({ inputRange: [0, 1], outputRange: [`-${deg}deg`, `${deg}deg`] });
  return <Animated.View pointerEvents="none" style={[style, { transform: [{ rotate: rot }] }]}>{children}</Animated.View>;
};
const Spin = ({ dur, style, children, delay = 0 }: any) => {
  const v = useLin(dur, delay);
  const rot = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View pointerEvents="none" style={[style, { transform: [{ rotate: rot }] }]}>{children}</Animated.View>;
};
const Twinkle = ({ dur, delay = 0, style, children }: any) => {
  const v = useOsc(dur, delay);
  const op = v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const sc = v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.1] });
  return <Animated.View pointerEvents="none" style={[style, { opacity: op, transform: [{ scale: sc }] }]}>{children}</Animated.View>;
};
const Rise = ({ dist, dur, delay = 0, style, children }: any) => {
  const v = useLin(dur, delay);
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, -dist] });
  const op = v.interpolate({ inputRange: [0, 0.18, 0.8, 1], outputRange: [0, 1, 1, 0] });
  return <Animated.View pointerEvents="none" style={[style, { opacity: op, transform: [{ translateY: ty }] }]}>{children}</Animated.View>;
};
const Across = ({ dur, dist, delay = 0, style, children }: any) => {
  const v = useLin(dur, delay);
  const tx = v.interpolate({ inputRange: [0, 1], outputRange: [0, dist] });
  return <Animated.View pointerEvents="none" style={[style, { transform: [{ translateX: tx }] }]}>{children}</Animated.View>;
};
// paralaxe pelo scroll (rel: -1..0..1)
const Par = ({ rel, factor, children }: any) => {
  const tx = rel ? rel.interpolate({ inputRange: [-1, 1], outputRange: [-factor, factor] }) : 0;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX: tx }] }]}>{children}</Animated.View>;
};

const layer = StyleSheet.absoluteFill;
const VB = '0 0 320 230';
const Base = ({ w, h, children }: any) => (
  <Svg width={w} height={h} viewBox={VB} style={layer}>{children}</Svg>
);

// sol com raios girando + leve embalo + brilho pulsando
function Sun({ w, h, x, y, r, color, spin = 46000, bobAmp = 4, bobDur = 4200 }: any) {
  const sx = w / 320, sy = h / 230;
  const vb = (r + 22) * 2;
  const S = vb * sx;
  const rays = [...Array(12)].map((_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const c = vb / 2;
    return <Line key={i} x1={c + Math.cos(a) * (r + 6)} y1={c + Math.sin(a) * (r + 6)} x2={c + Math.cos(a) * (r + 17)} y2={c + Math.sin(a) * (r + 17)} stroke={color} strokeWidth={2.4} strokeLinecap="round" />;
  });
  return (
    <Bob amp={bobAmp} dur={bobDur} style={{ position: 'absolute', left: x * sx - S / 2, top: y * sy - S / 2, width: S, height: S }}>
      <Spin dur={spin} style={{ width: S, height: S }}>
        <Svg width={S} height={S} viewBox={`0 0 ${vb} ${vb}`}>
          {rays}
          <Circle cx={vb / 2} cy={vb / 2} r={r} fill={color} />
        </Svg>
      </Spin>
    </Bob>
  );
}
function Glow({ w, h, x, y, r, color, dur = 2900 }: any) {
  const sx = w / 320, sy = h / 230; const S = r * 2 * sx;
  const v = useOsc(dur); const op = v.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.6] }); const sc = v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x * sx - S / 2, top: y * sy - S / 2, width: S, height: S, opacity: op, transform: [{ scale: sc }] }}>
      <Svg width={S} height={S} viewBox="0 0 100 100"><Circle cx={50} cy={50} r={48} fill={color} /></Svg>
    </Animated.View>
  );
}
// elemento pequeno posicionado no espaço da arte (320x230)
function At({ w, h, x, y, size, children, style }: any) {
  const sx = w / 320, sy = h / 230;
  return <View pointerEvents="none" style={[{ position: 'absolute', left: x * sx - (size * sx) / 2, top: y * sy - (size * sy) / 2, width: size * sx, height: size * sx }, style]}>{children}</View>;
}

const Bird = ({ s = 26, color = C.casca }: any) => (
  <Svg width={s} height={s * 0.5} viewBox="0 0 26 13"><Path d="M1 8 q5 -7 11 -1 q6 -6 11 1" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" /></Svg>
);
const Cloud = ({ s = 70, color = '#FFFFFF', op = 0.7 }: any) => (
  <Svg width={s} height={s * 0.5} viewBox="0 0 70 34"><Path d="M12 26 a10 10 0 0 1 2 -19 a13 13 0 0 1 24 3 a9 9 0 0 1 2 16 Z" fill={color} opacity={op} /></Svg>
);
const Star = ({ s = 16, color = C.white }: any) => (
  <Svg width={s} height={s} viewBox="0 0 24 24"><Path d="M12 2 l2 8 l8 2 l-8 2 l-2 8 l-2 -8 l-8 -2 l8 -2 Z" fill={color} /></Svg>
);
const Sprout = ({ s = 64 }: any) => (
  <Svg width={s} height={s} viewBox="0 0 24 24">
    <Path d="M12 23 V 11" stroke={C.sprout} strokeWidth="1.7" fill="none" strokeLinecap="round" />
    <Path d="M12 13 C 8 13 6 10 6.5 6.5 C 10 6.5 12 9 12 12.5" stroke={C.sprout} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 12 C 16 12 18 9.5 17.5 6.5 C 14.5 6.5 12 8.5 12 11" stroke={C.sprout} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const Heart = ({ s = 20, color = C.heart }: any) => (
  <Svg width={s} height={s} viewBox="0 0 24 24"><Path d="M12 20 C 4 14 5 6 9.5 6 C 11 6 12 7 12 8.5 C 12 7 13 6 14.5 6 C 19 6 20 14 12 20 Z" fill={color} /></Svg>
);
const Dot = ({ s = 8, color = C.glow }: any) => (
  <Svg width={s} height={s} viewBox="0 0 10 10"><Circle cx="5" cy="5" r="4" fill={color} /></Svg>
);

// ---------------- Pôr do sol sobre o campo ----------------
function Sunset({ w, h, rel }: any) {
  return (
    <View style={{ width: w, height: h }}>
      <Par rel={rel} factor={-12}>
        <Base w={w} h={h}>
          <Defs>
            <LinearGradient id="sky1" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={C.skyTop} /><Stop offset="0.55" stopColor={C.skyMid} /><Stop offset="1" stopColor={C.skyWarm} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="320" height="230" fill="url(#sky1)" />
        </Base>
      </Par>
      <Across dur={26000} dist={w * 0.5} style={{ position: 'absolute', left: w * 0.1, top: h * 0.12 }}><Cloud s={w * 0.22} /></Across>
      <Across dur={34000} dist={w * 0.4} delay={4000} style={{ position: 'absolute', left: w * 0.55, top: h * 0.05 }}><Cloud s={w * 0.16} op={0.55} /></Across>
      <Glow w={w} h={h} x={168} y={126} r={60} color={C.glow} />
      <Sun w={w} h={h} x={168} y={126} r={30} color={C.sun} />
      <Par rel={rel} factor={16}>
        <Base w={w} h={h}>
          <Path d="M0,150 Q80,124 165,142 Q240,157 320,146 L320,230 L0,230 Z" fill={C.hillFar} />
          <Path d="M0,176 Q90,152 185,172 Q260,187 320,178 L320,230 L0,230 Z" fill={C.hillNear} />
          {[30, 70, 110, 150, 190, 230, 270].map((x, i) => (
            <Line key={i} x1={x} y1={196 + (i % 2)} x2={x + 8} y2={210} stroke={C.crop} strokeWidth="3" strokeLinecap="round" />
          ))}
          {[50, 90, 130, 170, 210, 250, 290].map((x, i) => (
            <Line key={'b' + i} x1={x} y1={210} x2={x + 8} y2={224} stroke={C.crop} strokeWidth="3" strokeLinecap="round" />
          ))}
        </Base>
      </Par>
      <Across dur={16000} dist={w + 70} style={{ position: 'absolute', left: -35, top: h * 0.26 }}><Bird s={w * 0.075} /></Across>
      <Across dur={20000} dist={w + 70} delay={5000} style={{ position: 'absolute', left: -35, top: h * 0.17 }}><Bird s={w * 0.06} /></Across>
      <Across dur={13000} dist={w + 70} delay={9000} style={{ position: 'absolute', left: -35, top: h * 0.34 }}><Bird s={w * 0.05} /></Across>
    </View>
  );
}

// ---------------- Campo de sementes brotando ----------------
function Field({ w, h, rel }: any) {
  return (
    <View style={{ width: w, height: h }}>
      <Par rel={rel} factor={-10}>
        <Base w={w} h={h}>
          <Defs>
            <LinearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={C.skyBlueTop} /><Stop offset="1" stopColor={C.skyBlue} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="320" height="230" fill="url(#sky2)" />
        </Base>
      </Par>
      <Across dur={30000} dist={w * 0.45} style={{ position: 'absolute', left: w * 0.4, top: h * 0.1 }}><Cloud s={w * 0.2} op={0.8} /></Across>
      <Sun w={w} h={h} x={58} y={56} r={22} color={C.sun2} spin={38000} />
      <At w={w} h={h} x={252} y={58} size={18}><Twinkle dur={1700}><Star s={w * 0.05} /></Twinkle></At>
      <At w={w} h={h} x={200} y={92} size={12}><Twinkle dur={2100} delay={500}><Star s={w * 0.035} /></Twinkle></At>
      <At w={w} h={h} x={128} y={48} size={14}><Twinkle dur={1500} delay={900}><Star s={w * 0.04} /></Twinkle></At>
      <Par rel={rel} factor={14}>
        <Base w={w} h={h}>
          <Path d="M0,158 Q90,144 185,158 Q260,168 320,158 L320,230 L0,230 Z" fill={C.hillNear} />
          <Path d="M0,196 Q120,186 220,196 Q280,201 320,196 L320,230 L0,230 Z" fill={C.soil} />
        </Base>
      </Par>
      <At w={w} h={h} x={64} y={150} size={58} style={{ transform: undefined }}>
        <Sway deg={5} dur={2600} style={{ width: '100%', height: '100%' }}><Sprout s={w * 0.17} /></Sway>
      </At>
      <At w={w} h={h} x={160} y={146} size={64}>
        <Sway deg={4} dur={3000} delay={400} style={{ width: '100%', height: '100%' }}><Sprout s={w * 0.19} /></Sway>
      </At>
      <At w={w} h={h} x={256} y={150} size={58}>
        <Sway deg={6} dur={2400} delay={800} style={{ width: '100%', height: '100%' }}><Sprout s={w * 0.17} /></Sway>
      </At>
      <At w={w} h={h} x={110} y={172} size={8}><Rise dist={h * 0.4} dur={5200}><Dot s={w * 0.018} /></Rise></At>
      <At w={w} h={h} x={205} y={176} size={8}><Rise dist={h * 0.42} dur={6000} delay={1500}><Dot s={w * 0.015} color={C.sun2} /></Rise></At>
      <At w={w} h={h} x={285} y={176} size={8}><Rise dist={h * 0.36} dur={4600} delay={3000}><Dot s={w * 0.016} /></Rise></At>
    </View>
  );
}

// ---------------- Família unida ----------------
function person(x: number, gY: number, bodyH: number, headR: number, cloth: string) {
  const bodyW = headR * 2.1; const bodyTop = gY - bodyH;
  return (
    <G key={x + cloth}>
      <Path d={`M${x - bodyW / 2},${gY} L${x - bodyW / 2},${bodyTop + headR} Q${x},${bodyTop - headR * 0.6} ${x + bodyW / 2},${bodyTop + headR} L${x + bodyW / 2},${gY} Z`} fill={cloth} />
      <Circle cx={x} cy={bodyTop} r={headR} fill={C.skin} />
      <Path d={`M${x - headR},${bodyTop - headR * 0.2} a${headR},${headR} 0 0 1 ${headR * 2},0 Z`} fill={C.hair} />
    </G>
  );
}
function Family({ w, h, rel }: any) {
  const gY = 205;
  return (
    <View style={{ width: w, height: h }}>
      <Par rel={rel} factor={-8}>
        <Base w={w} h={h}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="42%" r="60%">
              <Stop offset="0" stopColor={C.glow} stopOpacity="0.9" /><Stop offset="1" stopColor={C.cream} stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="fbg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={C.cream} /><Stop offset="1" stopColor="#F4E7CE" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="320" height="230" fill="url(#fbg)" />
        </Base>
      </Par>
      <Glow w={w} h={h} x={160} y={92} r={110} color={C.glow} dur={3400} />
      <Par rel={rel} factor={14}>
        <Base w={w} h={h}>
          <Rect x="26" y="150" width="46" height="40" rx="3" fill="#E7D3AC" />
          <Path d="M20,152 L49,128 L78,152 Z" fill={C.accent} />
          <Rect x="42" y="168" width="14" height="22" rx="2" fill={C.trunk} />
          <Rect x="280" y="150" width="7" height="42" rx="3" fill={C.trunk} />
          <Circle cx="283.5" cy="146" r="22" fill={C.hillNear} />
          <Path d="M0,205 Q160,196 320,205 L320,230 L0,230 Z" fill={C.hillFar} />
        </Base>
      </Par>
      <Bob amp={2.6} dur={3600} style={layer}>
        <Svg width={w} height={h} viewBox={VB}>
          <Line x1="118" y1="180" x2="212" y2="180" stroke={C.casca} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
          {person(120, gY, 58, 12, C.accent)}
          {person(155, gY, 62, 12.5, '#8A5A2B')}
          {person(188, gY, 44, 10, '#6E8A4E')}
          {person(214, gY, 38, 9, '#B5623A')}
        </Svg>
      </Bob>
      <At w={w} h={h} x={150} y={128} size={20}><Rise dist={h * 0.28} dur={4200}><Heart s={w * 0.05} /></Rise></At>
      <At w={w} h={h} x={172} y={120} size={16}><Rise dist={h * 0.32} dur={5200} delay={1600}><Heart s={w * 0.04} color={C.accent} /></Rise></At>
      <At w={w} h={h} x={160} y={132} size={12}><Rise dist={h * 0.24} dur={4600} delay={3200}><Heart s={w * 0.03} /></Rise></At>
      <Across dur={22000} dist={w + 60} delay={2000} style={{ position: 'absolute', left: -30, top: h * 0.12 }}><Bird s={w * 0.055} /></Across>
    </View>
  );
}

// ---------------- Momento pessoal: oração ao amanhecer ----------------
function Prayer({ w, h, rel }: any) {
  return (
    <View style={{ width: w, height: h }}>
      <Par rel={rel} factor={-8}>
        <Base w={w} h={h}>
          <Defs>
            <LinearGradient id="sky3" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#F6E3C4" /><Stop offset="0.6" stopColor="#F3D3A0" /><Stop offset="1" stopColor="#EFC98C" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="320" height="230" fill="url(#sky3)" />
        </Base>
      </Par>
      <Glow w={w} h={h} x={210} y={150} r={62} color={C.glow} dur={3000} />
      <Sun w={w} h={h} x={210} y={150} r={26} color={C.sun2} spin={44000} bobAmp={2} />
      <Par rel={rel} factor={12}>
        <Base w={w} h={h}>
          <Path d="M0,190 Q160,176 320,190 L320,230 L0,230 Z" fill={C.hillNear} />
        </Base>
      </Par>
      {/* pessoa em oração (mãos juntas) */}
      <Bob amp={1.8} dur={4200} style={layer}>
        <Svg width={w} height={h} viewBox={VB}>
          {/* manto */}
          <Path d="M88 192 Q94 150 116 150 Q138 150 144 192 Z" fill={C.casca} />
          {/* braços em direção às mãos */}
          <Path d="M100 176 Q116 168 132 176 L128 184 Q116 179 104 184 Z" fill="#4A2E10" />
          {/* mãos juntas (oração) */}
          <Path d="M116 158 Q110 168 116 178 Q122 168 116 158 Z" fill={C.skin} />
          {/* cabeça levemente inclinada */}
          <Circle cx="116" cy="140" r="13" fill={C.skin} />
          <Path d="M104 139 a12 12 0 0 1 24 0 Z" fill={C.hair} />
        </Svg>
      </Bob>
      {/* sementes/luz subindo perto da pessoa */}
      <At w={w} h={h} x={150} y={158} size={12}><Rise dist={h * 0.34} dur={4600}><Dot s={w * 0.02} color={C.accent} /></Rise></At>
      <At w={w} h={h} x={140} y={150} size={10}><Rise dist={h * 0.3} dur={5600} delay={1800}><Dot s={w * 0.016} color={C.sun2} /></Rise></At>
      <At w={w} h={h} x={158} y={152} size={9}><Rise dist={h * 0.26} dur={4200} delay={3400}><Dot s={w * 0.014} color={C.glow} /></Rise></At>
    </View>
  );
}

export default function IntroScene({ name, w, rel }: { name: string; w: number; rel?: any }) {
  if (!w || w <= 0) return null;
  const h = Math.round(w * 0.72);
  if (name === 'sunset') return <Sunset w={w} h={h} rel={rel} />;
  if (name === 'field') return <Field w={w} h={h} rel={rel} />;
  if (name === 'family') return <Family w={w} h={h} rel={rel} />;
  return <Prayer w={w} h={h} rel={rel} />;
}

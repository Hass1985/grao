import React from 'react';
import { TouchableOpacity } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme/colors';

interface Props {
  onPress: () => void;
  size?: number;
}

export default function ProfileButton({ onPress, size = 36 }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: colors.casca12,
      }}
      activeOpacity={0.8}
    >
      <Svg width={size} height={size} viewBox="0 0 36 36">
        <Circle cx="18" cy="18" r="18" fill={colors.white} />
        <Circle cx="18" cy="13" r="5.5" fill={colors.casca} />
        <Path d="M5 34 Q5 23 18 23 Q31 23 31 34" fill={colors.casca} />
      </Svg>
    </TouchableOpacity>
  );
}

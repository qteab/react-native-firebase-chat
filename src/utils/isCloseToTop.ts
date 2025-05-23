import { NativeScrollEvent } from 'react-native';

export function isCloseToTop({ contentOffset }: NativeScrollEvent) {
  const paddingToTop = 100;

  return contentOffset.y <= paddingToTop;
}

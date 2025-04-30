import { NativeScrollEvent } from 'react-native';

export function isCloseToTop({ contentOffset }: NativeScrollEvent) {
  const paddingToTop = 2_000;

  return contentOffset.y <= paddingToTop;
}

import { NativeScrollEvent } from 'react-native';

export function isCloseToTop({ contentOffset }: NativeScrollEvent) {
  const paddingToTop = 500;

  return contentOffset.y <= paddingToTop;
}

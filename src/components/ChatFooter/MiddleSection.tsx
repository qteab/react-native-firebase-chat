import React, { ReactNode } from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  newMessagesBannerComponent?: () => ReactNode;
  newMessagesBannerStyles?: StyleProp<ViewStyle>;
  onNewMessagesBannerPress?: () => void;

  closeToTop: boolean;
  hasNewMessages: boolean;
};

export const MiddleSection = (props: Props) => {
  const shouldDisplayNewMessagesBanner =
    !props.closeToTop && props.hasNewMessages;

  return (
    <View style={styles.container}>
      {shouldDisplayNewMessagesBanner && props.newMessagesBannerComponent && (
        <TouchableOpacity
          onPress={props.onNewMessagesBannerPress}
          style={props.newMessagesBannerStyles ?? styles.newMessagesBanner}
        >
          {props.newMessagesBannerComponent()}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { display: 'flex', flex: 1 },
  newMessagesBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 100,
  },
});

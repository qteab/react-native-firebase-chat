import React, { ReactNode } from 'react';
import { StyleProp, TouchableOpacity, View, ViewStyle } from 'react-native';

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
    <View style={{ display: 'flex', flex: 1 }}>
      {shouldDisplayNewMessagesBanner && props.newMessagesBannerComponent && (
        <TouchableOpacity
          onPress={props.onNewMessagesBannerPress}
          style={
            props.newMessagesBannerStyles ?? {
              alignSelf: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: 10,
              borderRadius: 100,
            }
          }
        >
          {props.newMessagesBannerComponent()}
        </TouchableOpacity>
      )}
    </View>
  );
};

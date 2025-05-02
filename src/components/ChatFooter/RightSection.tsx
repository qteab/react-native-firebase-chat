import { ReactNode } from 'react';
import { StyleProp, TouchableOpacity, View, ViewStyle } from 'react-native';

type Props = {
  scrollToBottomComponent?: () => ReactNode;
  scrollToBottomStyle?: StyleProp<ViewStyle>;
  scrollToBottom?: () => void;
  closeToTop: boolean;
};

export const RightSection = (props: Props) => {
  return (
    <View style={{ display: 'flex', flex: 1 }}>
      {!props.closeToTop && props.scrollToBottomComponent && (
        <TouchableOpacity
          onPress={props.scrollToBottom}
          style={
            props.scrollToBottomStyle ?? {
              alignSelf: 'flex-end',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: 10,
              borderRadius: 100,
            }
          }
        >
          {props.scrollToBottomComponent()}
        </TouchableOpacity>
      )}
    </View>
  );
};

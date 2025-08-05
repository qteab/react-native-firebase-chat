import React, { ReactNode } from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  scrollToBottomComponent?: () => ReactNode;
  scrollToBottomStyle?: StyleProp<ViewStyle>;
  scrollToBottom?: () => void;
  closeToBottom: boolean;
};

export const RightSection = (props: Props) => {
  return (
    <View style={styles.container}>
      {!props.closeToBottom && props.scrollToBottomComponent && (
        <TouchableOpacity
          onPress={props.scrollToBottom}
          style={props.scrollToBottomStyle ?? styles.scrollToBottom}
        >
          {props.scrollToBottomComponent()}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { display: 'flex', flex: 1 },
  scrollToBottom: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 100,
    shadowColor: 'rgba(0, 0, 0, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});

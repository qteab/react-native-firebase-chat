import { ReactNode, RefObject } from 'react';
import {
  FlatList,
  StyleProp,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { IMessage } from 'react-native-gifted-chat';

export const ChatFooter = (props: {
  newMessagesBannerComponent?: () => ReactNode;
  newMessagesBannerStyles?: StyleProp<ViewStyle>;
  scrollToBottomComponent?: () => ReactNode;
  scrollToBottomStyle?: StyleProp<ViewStyle>;

  closeToTop: boolean;
  chatRef: RefObject<FlatList<IMessage>>;
}) => {
  const scrollToBottom = () => {
    props.chatRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return (
    <View
      style={{
        display: 'flex',
        position: 'absolute',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        width: '100%',
        height: 100,
        bottom: 0,
        left: 0,
      }}
    >
      <View style={{ display: 'flex', flex: 1 }}></View>
      <View style={{ display: 'flex', flex: 1 }}>
        {!props.closeToTop && props.newMessagesBannerComponent && (
          <TouchableOpacity
            onPress={scrollToBottom}
            style={
              props.newMessagesBannerStyles ?? {
                alignSelf: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: 10,
                borderRadius: 100,
              }
            }
          >
            {props.newMessagesBannerComponent()}
          </TouchableOpacity>
        )}
      </View>
      <View style={{ display: 'flex', flex: 1 }}>
        {!props.closeToTop && props.scrollToBottomComponent && (
          <TouchableOpacity
            onPress={scrollToBottom}
            style={
              props.scrollToBottomStyle ?? {
                alignSelf: 'flex-end',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: 10,
                borderRadius: 100,
              }
            }
          >
            {props.scrollToBottomComponent()}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

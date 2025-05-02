import React, { ReactNode, RefObject } from 'react';
import { FlatList, StyleProp, View, ViewStyle } from 'react-native';
import { IMessage } from 'react-native-gifted-chat';
import { RightSection } from './RightSection';
import { MiddleSection } from './MiddleSection';
import { LeftSection } from './LeftSection';

export const ChatFooter = (props: {
  newMessagesBannerComponent?: () => ReactNode;
  newMessagesBannerStyles?: StyleProp<ViewStyle>;
  scrollToBottomComponent?: () => ReactNode;
  scrollToBottomStyle?: StyleProp<ViewStyle>;

  closeToTop: boolean;
  hasNewMessages: boolean;
  markNewMessagesAsSeen: () => void;
  chatRef: RefObject<FlatList<IMessage>>;
}) => {
  const scrollToBottom = () => {
    props.chatRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const onNewMessagesBannerPress = () => {
    scrollToBottom();
    props.markNewMessagesAsSeen();
  };

  return (
    <View
      style={{
        display: 'flex',
        position: 'absolute',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        width: '100%',
        bottom: 40,
        left: 0,
      }}
    >
      <LeftSection />

      <MiddleSection
        newMessagesBannerComponent={props.newMessagesBannerComponent}
        newMessagesBannerStyles={props.newMessagesBannerStyles}
        onNewMessagesBannerPress={onNewMessagesBannerPress}
        closeToTop={props.closeToTop}
        hasNewMessages={props.hasNewMessages}
      />

      <RightSection
        scrollToBottom={scrollToBottom}
        scrollToBottomComponent={props.scrollToBottomComponent}
        scrollToBottomStyle={props.scrollToBottomStyle}
        closeToTop={props.closeToTop}
      />
    </View>
  );
};

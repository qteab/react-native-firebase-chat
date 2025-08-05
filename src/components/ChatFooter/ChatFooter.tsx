import React, { ReactNode, RefObject } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { RightSection } from './RightSection';
import { MiddleSection } from './MiddleSection';
import { LeftSection } from './LeftSection';
import { FlashListRef } from '@shopify/flash-list';
import { IMessage } from 'react-native-gifted-chat';

export const ChatFooter = (props: {
  newMessagesBannerComponent?: () => ReactNode;
  newMessagesBannerStyles?: StyleProp<ViewStyle>;
  scrollToBottomComponent?: () => ReactNode;
  scrollToBottomStyle?: StyleProp<ViewStyle>;

  closeToBottom: boolean;
  hasNewMessages: boolean;
  markNewMessagesAsSeen: () => void;
  chatRef: RefObject<FlashListRef<IMessage>>;
}) => {
  const scrollToBottom = () => {
    props.chatRef.current?.scrollToEnd();
  };

  const scrollDownAndMarkAsRead = () => {
    scrollToBottom();
    props.markNewMessagesAsSeen();
  };

  return (
    <View style={styles.container}>
      <LeftSection />

      <MiddleSection
        newMessagesBannerComponent={props.newMessagesBannerComponent}
        newMessagesBannerStyles={props.newMessagesBannerStyles}
        onNewMessagesBannerPress={scrollDownAndMarkAsRead}
        closeToBottom={props.closeToBottom}
        hasNewMessages={props.hasNewMessages}
      />

      <RightSection
        scrollToBottom={scrollDownAndMarkAsRead}
        scrollToBottomComponent={props.scrollToBottomComponent}
        scrollToBottomStyle={props.scrollToBottomStyle}
        closeToBottom={props.closeToBottom}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
    bottom: 40,
    left: 0,
  },
});

import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  endAt,
  FirebaseFirestoreTypes,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
} from '@react-native-firebase/firestore';
import { FlashListRef } from '@shopify/flash-list';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, StyleProp, ViewStyle } from 'react-native';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { GiftedChatProps } from 'react-native-gifted-chat/lib/GiftedChat/types';
import { ChatFooter } from './components/ChatFooter/ChatFooter';
import { appendSnapshot } from './utils/appendSnapshot';
import { isCloseToBottom } from './utils/isCloseToBottom';
import { prepareSnapshot } from './utils/prepareSnapshot';

interface CustomCuteChatProps {
  chatId: string;
  user: User;
  onSend?: (newMessages: IMessage[]) => void;
  setIsLoading?: (isLoading: boolean) => void;
  newMessagesBannerComponent?: () => React.ReactNode;
  newMessagesBannerStyles?: StyleProp<ViewStyle>;
}

interface User {
  id: string;
  username?: string;
  name?: string;
  avatar: string;
}

export type CuteChatProps = Omit<
  GiftedChatProps<IMessage>,
  'messages' | 'user' | 'onSend'
> &
  CustomCuteChatProps;

export type CuteChatRef = {
  scrollToMessage: (messageId: string) => Promise<void>;
};

const messageBatch = 20;

export const CuteChat = React.forwardRef<CuteChatRef, CuteChatProps>(function (
  props,
  ref
) {
  const { chatId, user, setIsLoading } = props;

  const [closeToBottom, setCloseToBottom] = useState(true);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [lastMessageDoc, setLastMessageDoc] =
    useState<FirebaseFirestoreTypes.DocumentData | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(
    null
  );
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [allMessagesLoaded, setAllMessagesLoaded] = useState(false);

  const memoizedUser = useMemo(() => ({ _id: user.id, ...user }), [user]);
  const startDate = useMemo(() => new Date(), []);

  const chatListRef = useRef<FlashListRef<IMessage>>(null);
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();

  const setIsLoadingBool = useCallback(
    (isLoading: boolean) => {
      setIsLoading?.(isLoading);
      setLoading(isLoading);
    },
    [setIsLoading]
  );

  const markMessagesAsRead = useCallback(
    async (newMessages: IMessage[]) => {
      const unreadMessages = newMessages.filter(
        (message) => !message.readByIds.includes(memoizedUser._id)
      );

      if (unreadMessages.length > 0) {
        const batch = getFirestore().batch();

        unreadMessages.forEach((message) => {
          const messageRef = doc(
            getFirestore(),
            `chats/${chatId}/messages/${message._id}`
          );

          batch.update(messageRef, {
            readByIds: arrayUnion(memoizedUser._id),
          });
        });

        batch.commit();
      }

      const chatRef = doc(getFirestore(), `chats/${chatId}`);
      const chatData = await getDoc(chatRef);
      const chat = chatData.data();

      if (!chat) {
        throw new Error('Chat data is undefined');
      }

      if (!chat.lastMessage.readByIds.includes(memoizedUser._id)) {
        updateDoc(chatRef, {
          'lastMessage.readByIds': arrayUnion(memoizedUser._id),
        });
      }
    },
    [chatId, memoizedUser._id]
  );

  // Fetch initial messages and subscribe to potential future messages
  useLayoutEffect(() => {
    setIsLoadingBool(true);
    const messagesRef = collection(getFirestore(), `chats/${chatId}/messages`);

    const oldMessagesQuery = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      startAfter(startDate.toISOString()),
      limit(messageBatch)
    );

    const unsubscribeOldMessages = onSnapshot(
      oldMessagesQuery,
      async (snapshot) => {
        if (snapshot.empty) {
          setLastMessageDoc(null);

          setMessages([]);
          setIsLoadingBool(false);
          setInitializing(false);

          markMessagesAsRead([]);
        }

        if (!snapshot.empty) {
          const snapshotChanges = await prepareSnapshot(snapshot, chatId);
          setMessages((old) => appendSnapshot(old, snapshotChanges));

          setIsLoadingBool(false);
          setInitializing(false);
        }
      },
      (error: Error) => console.error('Error fetching documents: ', error)
    );

    const newMessagesQuery = query(
      messagesRef,
      orderBy('createdAt', 'asc'),
      startAfter(startDate.toISOString())
    );

    const unsubscribeNewMessages = onSnapshot(
      newMessagesQuery,
      async (snapshot) => {
        if (!snapshot.empty) {
          console.log('New messages');
          const snapshotChanges = await prepareSnapshot(snapshot, chatId);
          setMessages((old) => appendSnapshot(old, snapshotChanges));

          setHasNewMessages(true);
        }
      },
      (error: Error) => console.error('Error fetching documents: ', error)
    );

    return () => {
      unsubscribeOldMessages();
      unsubscribeNewMessages();
    };
  }, [chatId, markMessagesAsRead, setIsLoadingBool, startDate]);

  // Handle outgoing messages
  const onSend = async (newMessages: IMessage[] = []) => {
    if (newMessages[0]) {
      const { _id, createdAt, text, user: sender, image } = newMessages[0];

      // Simple data validation
      if (!_id || !createdAt || !(text || image) || !sender || !sender._id) {
        console.error('Missing fields in message:', newMessages[0]);
        return;
      }

      // Ensure createdAt is a Date instance
      if (!(createdAt instanceof Date)) {
        console.error('createdAt is not a Date instance:', newMessages[0]);
        return;
      }

      const senderRef = doc(getFirestore(), `users/${sender._id}`);
      const createdAtIso = createdAt.toISOString();
      const updatedAtIso = new Date().toISOString(); // current time

      const messageData: any = {
        messageId: _id,
        createdAt: createdAtIso,
        updatedAt: updatedAtIso,
        senderId: sender._id,
        senderRef,
        readByIds: arrayUnion(sender._id),
      };

      // only include the text field if it's not undefined
      if (text) {
        messageData.content = text;
      }

      // only include the image field if it's not undefined
      if (image) {
        messageData.image = image;
      }

      try {
        const messageRef = await addDoc(
          collection(getFirestore(), `chats/${chatId}/messages`),
          messageData
        );

        // Update lastMessage field in the chat document
        updateDoc(doc(getFirestore(), `chats/${chatId}`), {
          lastMessage: messageRef,
          updatedAt: updatedAtIso,
        });
      } catch (error) {
        console.error('Error adding document:', error);
        Alert.alert('Error', 'Could not send message. Try again.', [
          { text: 'Retry', onPress: () => onSend(newMessages) },
          { text: 'Cancel' },
        ]);
      }
    }
  };

  // Function to fetch more messages
  const fetchMoreMessages = useCallback(async () => {
    if (initializing) {
      return console.log(
        'Skipping fetching more messages since initializing is still true'
      );
    }

    if (loading) {
      return console.log(
        'Skipping fetching more messages since loading is already true'
      );
    }

    setIsLoadingEarlier(true);
    try {
      console.log('Fetching more messages...');
      const messagesRef = collection(
        getFirestore(),
        `chats/${chatId}/messages`
      );
      const moreMessagesQuery = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastMessageDoc),
        limit(messageBatch)
      );

      onSnapshot(moreMessagesQuery, async (snapshot) => {
        console.log('Messages received');
        if (!snapshot.empty) {
          const snapshotChanges = await prepareSnapshot(snapshot, chatId);
          setMessages((old) => appendSnapshot(old, snapshotChanges));
        } else {
          console.log('Snapshot empty');
          setAllMessagesLoaded(true);
        }
      });
    } catch (error) {
      console.error('Error fetching more messages: ', error);
    } finally {
      setIsLoadingEarlier(false);
    }
  }, [chatId, lastMessageDoc, setIsLoadingEarlier, initializing, loading]);

  const scrollToMessage = useCallback(
    async (messageId: string) => {
      console.log('Scrolling to message:', messageId);

      const message = messages.find((m) => m._id === messageId);

      if (message !== undefined) {
        console.log('Message found:', message);
        chatListRef.current?.scrollToItem({
          item: message,
          viewPosition: 0.5, // Center the item in the view
        });

        return;
      }

      console.warn(
        `Message with ID ${messageId} not found in messages. Fetching message`
      );

      const messageRef = doc(
        getFirestore(),
        `chats/${chatId}/messages/${messageId}`
      );

      const messageSnapshot = await getDoc(messageRef);
      const messageData = messageSnapshot.data();

      const scrollToMessageQuery = query(
        collection(getFirestore(), `chats/${chatId}/messages`),
        orderBy('createdAt', 'desc'),
        startAfter(lastMessageDoc),
        endAt(messageData?.createdAt)
      );

      onSnapshot(scrollToMessageQuery, async (snapshot) => {
        if (!snapshot.empty) {
          const snapshotChanges = await prepareSnapshot(snapshot, chatId);
          setMessages((old) => {
            const newMessages = appendSnapshot(old, snapshotChanges);
            return newMessages;
          });

          console.log('Setting scrollToMessageId:', messageId);
          setScrollToMessageId(messageId);
        } else {
          console.warn('No messages found after fetching');
        }
      });
    },
    [lastMessageDoc, messages, chatId]
  );

  // Keep `lastMessageDoc` up to date based on `messages`
  useEffect(() => {
    if (!messages.length) {
      setLastMessageDoc(null);
      return;
    }

    try {
      const lastMessage = messages[messages.length - 1];

      if (!lastMessage) {
        console.log('No last message. Skipping setting last message.');
        return;
      }

      console.log('Last message: ', lastMessage);
      const lastMessageRef = doc(
        getFirestore(),
        `chats/${chatId}/messages/${lastMessage._id}`
      );

      const unsubscribe = onSnapshot(lastMessageRef, async (snapshot) => {
        setLastMessageDoc(snapshot);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Failed to set lastMessageDoc:', error);
      return;
    }
  }, [messages, chatId]);

  useImperativeHandle(ref, () => {
    return {
      scrollToMessage,
    };
  });

  useEffect(() => {
    console.log('scrollToMessageId changed:', scrollToMessageId);
    if (scrollToMessageId === null || chatListRef.current === null) {
      return;
    }

    // Clear any existing timeout to prevent multiple scrolls
    if (timeout.current) {
      clearTimeout(timeout.current);
    }

    const message = messages.find((msg) => msg._id === scrollToMessageId);

    if (!message) {
      console.warn(`Message with ID ${scrollToMessageId} not found.`);
      setScrollToMessageId(null);
      return;
    }

    // Use a timeout to ensure the scroll happens after the component has rendered
    timeout.current = setTimeout(() => {
      console.log('Scrolling to message', message);
      chatListRef.current?.scrollToItem({
        item: message,
        viewPosition: 0.5, // Center the item in the view
      });
      setScrollToMessageId(null); // Reset after scrolling
    }, 500);
  }, [scrollToMessageId, messages]);

  // Clear the timeout if it still exists when the component unmounts.
  React.useEffect(() => {
    return () => timeout.current && clearTimeout(timeout.current);
  }, []);

  return (
    <GiftedChat
      {...props}
      renderChatFooter={() => (
        <>
          <ChatFooter
            newMessagesBannerComponent={props.newMessagesBannerComponent}
            newMessagesBannerStyles={props.newMessagesBannerStyles}
            scrollToBottomComponent={props.scrollToBottomComponent}
            scrollToBottomStyle={props.scrollToBottomStyle}
            hasNewMessages={hasNewMessages}
            markNewMessagesAsSeen={() => setHasNewMessages(false)}
            closeToBottom={closeToBottom}
            chatRef={chatListRef}
          />
          {props.renderChatFooter?.()}
        </>
      )}
      messages={messages}
      onSend={props.onSend || onSend}
      user={memoizedUser}
      messageContainerRef={chatListRef}
      onLoadEarlier={fetchMoreMessages}
      loadEarlier={!allMessagesLoaded}
      infiniteScroll={true}
      isLoadingEarlier={isLoadingEarlier}
      inverted={true}
      handleOnScroll={({ nativeEvent }) => {
        setCloseToBottom(isCloseToBottom(nativeEvent));
      }}
    />
  );
});

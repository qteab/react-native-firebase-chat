import firestore, {
  FirebaseFirestoreTypes as FirebaseFirestore,
  firebase,
} from '@react-native-firebase/firestore';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  NativeScrollEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { IMessage } from 'react-native-gifted-chat';
import { GiftedChat, GiftedChatProps } from 'react-native-gifted-chat';
import { appendSnapshot } from './utils/appendSnapshot';
import { prepareSnapshot } from './utils/prepareSnapshot';
import { isCloseToBottom } from './utils/isCloseToBottom';
import { isCloseToTop } from './utils/isCloseToTop';
import { ChatFooter } from './components/ChatFooter/ChatFooter';

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

type CuteChatProps = Omit<GiftedChatProps, 'messages' | 'user' | 'onSend'> &
  CustomCuteChatProps;

const messageBatch = 20;

export function CuteChat(props: CuteChatProps) {
  const { chatId, user, setIsLoading } = props;

  const [closeToTop, setCloseToTop] = useState(true);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [lastMessageDoc, setLastMessageDoc] =
    useState<FirebaseFirestore.DocumentSnapshot | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const memoizedUser = useMemo(() => ({ _id: user.id, ...user }), [user]);
  const startDate = useMemo(() => new Date(), []);

  const chatListRef = useRef<FlatList<IMessage>>(null);

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
        const batch = firestore().batch();

        unreadMessages.forEach((message) => {
          const messageRef = firestore()
            .collection(`chats/${chatId}/messages`)
            .doc(message._id as string);

          batch.update(messageRef, {
            readByIds: firebase.firestore.FieldValue.arrayUnion(
              memoizedUser._id
            ),
          });
        });

        batch.commit();
      }

      const chatRef = firestore().doc(`chats/${chatId}`);
      const chatData = await chatRef.get();
      const chat = chatData.data();

      if (!chat) {
        throw new Error('Chat data is undefined');
      }

      if (!chat.lastMessage.readByIds.includes(memoizedUser._id)) {
        chatRef.update({
          'lastMessage.readByIds': firebase.firestore.FieldValue.arrayUnion(
            memoizedUser._id
          ),
        });
      }
    },
    [chatId, memoizedUser._id]
  );

  // Fetch initial messages and subscribe to potential future messages
  useLayoutEffect(() => {
    setIsLoadingBool(true);
    const messagesRef = firestore().collection(`chats/${chatId}/messages`);

    const unsubscribeOldMessages = messagesRef
      .orderBy('createdAt', 'desc')
      .startAfter(startDate.toISOString())
      .limit(messageBatch)
      .onSnapshot(
        async (snapshot: FirebaseFirestore.QuerySnapshot) => {
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

    const unsubscribeNewMessages = messagesRef
      .orderBy('createdAt', 'asc')
      .startAfter(startDate.toISOString())
      .onSnapshot(
        async (snapshot: FirebaseFirestore.QuerySnapshot) => {
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

      const senderRef = firestore().doc(`users/${sender._id}`);
      const createdAtIso = createdAt.toISOString();
      const updatedAtIso = new Date().toISOString(); // current time

      const messageData: any = {
        messageId: _id,
        createdAt: createdAtIso,
        updatedAt: updatedAtIso,
        senderId: sender._id,
        senderRef,
        readByIds: firebase.firestore.FieldValue.arrayUnion(sender._id),
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
        const messageRef = await firestore()
          .collection(`chats/${chatId}/messages`)
          .add(messageData);

        // Update lastMessage field in the chat document
        await firestore().doc(`chats/${chatId}`).update({
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

    setIsLoadingBool(true);
    try {
      console.log('Fetching more messages...');
      const messagesRef = firestore().collection(`chats/${chatId}/messages`);
      messagesRef
        .orderBy('createdAt', 'desc')
        .startAfter(lastMessageDoc)
        .limit(messageBatch)
        .onSnapshot(async (snapshot) => {
          console.log('Messages received');
          if (!snapshot.empty) {
            const snapshotChanges = await prepareSnapshot(snapshot, chatId);
            setMessages((old) => appendSnapshot(old, snapshotChanges));
          } else {
            console.log('Snapshot empty');
          }

          setIsLoadingBool(false);
        });
    } catch (error) {
      console.error('Error fetching more messages: ', error);
    }
  }, [chatId, lastMessageDoc, setIsLoadingBool, initializing, loading]);

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
      const lastMessageRef = firestore().doc(
        `chats/${chatId}/messages/${lastMessage._id}`
      );

      const unsubscribe = lastMessageRef.onSnapshot(async (snapshot) => {
        setLastMessageDoc(snapshot);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Failed to set lastMessageDoc:', error);
      return;
    }
  }, [messages, chatId]);

  console.log('Amount of msgs:', messages.length);

  console.log('Close to top:', closeToTop);

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
            closeToTop={closeToTop}
            chatRef={chatListRef}
          />
          {props.renderChatFooter?.()}
        </>
      )}
      messages={messages}
      onSend={props.onSend || onSend}
      user={memoizedUser}
      inverted={true}
      listViewProps={{
        ref: chatListRef,
        onScroll: ({ nativeEvent }: { nativeEvent: NativeScrollEvent }) => {
          if (isCloseToBottom(nativeEvent)) fetchMoreMessages();

          if (isCloseToTop(nativeEvent)) setCloseToTop(true);
          else setCloseToTop(false);
        },
        scrollEventThrottle: 500,
      }}
    />
  );
}

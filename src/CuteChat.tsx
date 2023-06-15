import React, { useState, useCallback, useMemo, useLayoutEffect } from 'react';
import { GiftedChat, GiftedChatProps } from 'react-native-gifted-chat';
import firestore, {
  FirebaseFirestoreTypes as FirebaseFirestore,
} from '@react-native-firebase/firestore';
import type { IMessage } from 'react-native-gifted-chat';
import { Alert } from 'react-native';

interface CustomCuteChatProps {
  chatId: string;
  user: User;
  firebaseConfig?: FirebaseConfig;
}

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface User {
  id: string;
  username?: string;
  name?: string;
  avatar: string;
}

type CuteChatProps = Omit<GiftedChatProps, 'messages' | 'user' | 'onSend'> &
  CustomCuteChatProps;

export function CuteChat(props: CuteChatProps) {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [lastMessageDoc, setLastMessageDoc] =
    useState<FirebaseFirestore.DocumentSnapshot | null>(null);
  const { chatId, user } = props;
  const memoizedUser = useMemo(() => ({ _id: user.id, ...user }), [user]);

  // Utility function to convert a Firestore document to a Gifted Chat message
  const docToMessage = (doc: any): IMessage => ({
    _id: doc.id,
    createdAt: doc.data().createdAt.toDate(),
    text: doc.data().content,
    user: doc.data().sender,
  });

  // Fetch initial messages
  useLayoutEffect(() => {
    const messagesRef = firestore().collection(`chats/${chatId}/messages`);

    // Listen for real-time updates
    const unsubscribe = messagesRef
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(
        (snapshot) => {
          if (!snapshot.empty) {
            setLastMessageDoc(
              snapshot.docs[
                snapshot.docs.length - 1
              ] as FirebaseFirestore.DocumentSnapshot
            );

            const newMessages = snapshot.docs.map(docToMessage);
            setMessages(newMessages);
          }
        },
        (error) => console.error('Error fetching documents: ', error)
      );

    // Clean up function
    return () => unsubscribe();
  }, [chatId]);

  // Handle outgoing messages
  const onSend = (newMessages: IMessage[] = []) => {
    setMessages((previousMessages: IMessage[]) =>
      GiftedChat.append(previousMessages, newMessages)
    );

    if (newMessages[0]) {
      const { _id, createdAt, text, user: sender } = newMessages[0];

      // Simple data validation
      if (!_id || !createdAt || !text || !sender || !sender._id) {
        console.error('Missing fields in message:', newMessages[0]);
        return;
      }

      firestore()
        .collection(`chats/${chatId}/messages`)
        .add({
          messageId: _id,
          createdAt,
          content: text,
          senderId: sender._id,
          sender: { name: sender.name, avatar: sender.avatar },
        })
        .catch((error) => {
          console.error('Error adding document:', error);
          Alert.alert('Error', 'Could not send message. Try again.', [
            { text: 'Retry', onPress: () => onSend(newMessages) },
            { text: 'Cancel' },
          ]);
        });
    }
  };

  const fetchMoreMessages = useCallback(async () => {
    try {
      const messagesRef = firestore().collection(`chats/${chatId}/messages`);
      const next = await messagesRef
        .orderBy('createdAt', 'desc')
        .startAfter(lastMessageDoc)
        .limit(20)
        .get();

      if (!next.empty) {
        setLastMessageDoc(
          next.docs[next.docs.length - 1] as FirebaseFirestore.DocumentSnapshot
        );

        const newMessages = next.docs.map(docToMessage);
        setMessages((previousMessages) =>
          GiftedChat.prepend(previousMessages, newMessages)
        );
      }
    } catch (error) {
      console.error('Error fetching more messages: ', error);
    }
  }, [chatId, lastMessageDoc]);

  return (
    <GiftedChat
      {...props}
      messages={messages}
      onSend={(newMessages) => onSend(newMessages)}
      user={memoizedUser}
      inverted={true}
      listViewProps={{
        onEndReached: fetchMoreMessages,
        onEndReachedThreshold: 0.5,
      }}
    />
  );
}

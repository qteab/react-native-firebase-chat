import React, { useState, useCallback, useMemo, useLayoutEffect } from 'react';
import { GiftedChat, GiftedChatProps } from 'react-native-gifted-chat';
import firestore, {
  FirebaseFirestoreTypes as FirebaseFirestore,
  firebase,
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
  const docToMessage = async (
    doc: FirebaseFirestore.DocumentSnapshot
  ): Promise<IMessage> => {
    const data = doc.data();

    if (!data) {
      throw new Error('Document data is undefined');
    }

    // Fetch user data from reference
    const senderRef = data.senderRef;
    if (
      !senderRef ||
      typeof senderRef._documentPath !== 'object' ||
      !Array.isArray(senderRef._documentPath._parts)
    ) {
      throw new Error('Invalid or missing senderRef in document');
    }

    // Create a new DocumentReference using the path from the existing DocumentReference
    const senderPath = senderRef._documentPath._parts.join('/');
    const senderDoc = firestore().doc(senderPath);
    const senderData = await senderDoc.get();
    const sender = senderData.data();

    if (!sender) {
      throw new Error('Sender data is undefined');
    }

    return {
      _id: doc.id,
      createdAt: new Date(data.createdAt),
      text: data.content,
      user: { _id: data.senderId, ...sender },
    };
  };

  // Fetch initial messages
  useLayoutEffect(() => {
    const messagesRef = firestore().collection(`chats/${chatId}/messages`);

    const unsubscribe = messagesRef
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(
        async (snapshot) => {
          if (!snapshot.empty) {
            setLastMessageDoc(
              snapshot.docs[
                snapshot.docs.length - 1
              ] as FirebaseFirestore.DocumentSnapshot
            );

            const newMessagesPromises = snapshot.docs.map(docToMessage);
            const newMessages = await Promise.all(newMessagesPromises);
            setMessages(newMessages);
          }
        },
        (error) => console.error('Error fetching documents: ', error)
      );

    // Clean up function
    return () => unsubscribe();
  }, [chatId]);

  // Handle outgoing messages
  const onSend = async (newMessages: IMessage[] = []) => {
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

      // Ensure createdAt is a Date instance
      if (!(createdAt instanceof Date)) {
        console.error('createdAt is not a Date instance:', newMessages[0]);
        return;
      }

      const senderRef = firestore().doc(`users/${sender._id}`);
      const createdAtIso = createdAt.toISOString();

      firestore()
        .collection(`chats/${chatId}/messages`)
        .add({
          messageId: _id,
          createdAt: createdAtIso,
          updatedAt: createdAtIso,
          content: text,
          senderId: sender._id,
          senderRef,
          readByIds: firebase.firestore.FieldValue.arrayUnion(senderRef),
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

        const newMessagesPromises = next.docs.map(docToMessage);
        const newMessages = await Promise.all(newMessagesPromises);
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

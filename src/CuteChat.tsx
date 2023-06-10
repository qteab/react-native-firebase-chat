import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GiftedChat, GiftedChatProps } from 'react-native-gifted-chat';
import {
  collection,
  addDoc,
  orderBy,
  query,
  Firestore,
  getFirestore,
  getDocs,
  startAfter,
  limit,
  QueryDocumentSnapshot,
} from '@firebase/firestore';
import { initializeApp, getApps, getApp } from '@firebase/app';

interface Message {
  _id: string;
  createdAt: Date | any;
  text: string;
  user: any; // TODO: Replace with the exact type of `user`
}

interface CustomCuteChatProps {
  chatId: string;
  user: User;
  database?: Firestore; // The Firestore database instance
  auth?: Firestore; // The Firestore auth instance
  firebaseConfig: FirebaseConfig;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessageDoc, setLastMessageDoc] =
    useState<QueryDocumentSnapshot | null>(null);
  const { chatId, user, firebaseConfig } = props;
  const memoizedUser = useMemo(() => ({ _id: user.id, ...user }), [user]);

  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  const database = getFirestore(getApp());

  // Utility function to convert a Firestore document to a Gifted Chat message
  const docToMessage = (doc: QueryDocumentSnapshot): Message => ({
    _id: doc.data().messageId,
    createdAt: doc.data().createdAt.toDate(),
    text: doc.data().content,
    user: { _id: doc.data().senderId, ...doc.data().sender },
  });

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      const collectionRef = collection(database, `chats/${chatId}/messages`);
      const q = query(collectionRef, orderBy('createdAt', 'desc'), limit(20));

      const querySnapshot = await getDocs(q);
      const newMessages = querySnapshot.docs.map(docToMessage);

      if (querySnapshot.docs.length > 0) {
        setLastMessageDoc(
          querySnapshot.docs[
            querySnapshot.docs.length - 1
          ] as QueryDocumentSnapshot
        );
      } else {
        setLastMessageDoc(null);
      }

      setMessages(newMessages);
    };

    fetchMessages();
  }, [chatId, database]);

  // Function to fetch more messages
  const fetchMoreMessages = useCallback(async () => {
    console.log('fetching more messages');
    if (lastMessageDoc) {
      const collectionRef = collection(database, `chats/${chatId}/messages`);
      const q = query(
        collectionRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastMessageDoc),
        limit(20)
      );

      const querySnapshot = await getDocs(q);
      const newMessages = querySnapshot.docs.map(docToMessage);

      if (querySnapshot.docs.length > 0) {
        setLastMessageDoc(
          querySnapshot.docs[
            querySnapshot.docs.length - 1
          ] as QueryDocumentSnapshot
        );
      } else {
        setLastMessageDoc(null);
      }

      setMessages((previousMessages) =>
        GiftedChat.prepend(previousMessages, newMessages)
      );
    }
  }, [chatId, database, lastMessageDoc]);

  // Handle outgoing messages
  const onSend = useCallback(
    (newMessages = []) => {
      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, newMessages)
      );
      const { _id, createdAt, text, user: sender } = newMessages[0];
      addDoc(collection(database, `chats/${chatId}/messages`), {
        messageId: _id,
        createdAt,
        content: text,
        senderId: sender._id,
        sender: { name: sender.name, avatar: sender.avatar },
      }).catch((error) => {
        console.error('Error adding document:', error);
      });
    },
    [chatId, database]
  );

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

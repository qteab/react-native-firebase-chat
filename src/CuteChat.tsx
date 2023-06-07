import React, { useState, useLayoutEffect, useCallback } from 'react';
import { GiftedChat, GiftedChatProps } from 'react-native-gifted-chat';
import {
  collection,
  addDoc,
  orderBy,
  query,
  onSnapshot,
  Firestore,
  getFirestore,
} from '@firebase/firestore';
import { initializeApp } from '@firebase/app';

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
  auth?: any; // The Firestore auth instance
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
  const chatId = props.chatId;
  const user = props.user;
  const firebaseConfig = props.firebaseConfig;

  initializeApp(firebaseConfig);
  const database = getFirestore();

  useLayoutEffect(() => {
    const collectionRef = collection(database, `chats/${chatId}/messages`);
    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    // Handle incoming messages
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        setMessages(
          querySnapshot.docs.map((doc) => {
            return {
              _id: doc.data().messageId,
              createdAt: doc.data().createdAt.toDate(),
              text: doc.data().content,
              user: { _id: doc.data().senderId, ...doc.data().sender },
            };
          })
        );
      },
      (error) => {
        console.error('Error listening for document updates:', error);
      }
    );
    return unsubscribe;
  }, [chatId, database]);

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
      user={{ _id: user.id, ...user }}
    />
  );
}

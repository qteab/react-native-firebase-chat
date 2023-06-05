import React, { useState, useLayoutEffect, useCallback } from 'react';
import { GiftedChat, GiftedChatProps } from 'react-native-gifted-chat';
import {
  collection,
  addDoc,
  orderBy,
  query,
  onSnapshot,
} from '@firebase/firestore';
import { database } from './config/firebase';

interface Message {
  _id: string;
  createdAt: Date | any;
  text: string;
  user: any; // Replace with the exact type of `user` if you have it
}

interface CustomCuteChatProps {
  chatId: string;
  user: User;
}

interface User {
  id: string;
  username?: string;
  avatar: any;
}

type CuteChatProps = Omit<GiftedChatProps, 'messages' | 'user' | 'onSend'> &
  CustomCuteChatProps;

export function CuteChat(props: CuteChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const chatId = props.chatId;
  const user = props.user;

  useLayoutEffect(() => {
    const collectionRef = collection(database, `chats/${chatId}/messages`);
    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        setMessages(
          querySnapshot.docs.map((doc) => {
            return {
              _id: doc.data()._id,
              createdAt: doc.data().createdAt.toDate(),
              text: doc.data().content,
              user: doc.data().user,
            };
          })
        );
      },
      (error) => {
        console.error('Error listening for document updates:', error);
      }
    );
    return unsubscribe;
  }, [chatId]);

  const onSend = useCallback(
    (newMessages = []) => {
      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, newMessages)
      );

      const { _id, createdAt, text, user: sender } = newMessages[0];
      addDoc(collection(database, `chats/${chatId}/messages`), {
        _id,
        createdAt,
        content: text,
        user: sender,
      }).catch((error) => {
        console.error('Error adding document:', error);
      });
    },
    [chatId]
  );

  return (
    <GiftedChat
      {...props}
      messages={messages}
      onSend={(newMessages) => onSend(newMessages)}
      user={{
        _id: user.id,
        avatar: user.avatar,
      }}
    />
  );
}

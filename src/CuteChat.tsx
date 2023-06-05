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
  name?: string;
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
  }, [chatId]);

  // Handle outgoing messages
  const onSend = useCallback(
    (newMessages = []) => {
      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, newMessages)
      );
      console.log('newMessages', newMessages);
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
    [chatId]
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

import firestore, {
  FirebaseFirestoreTypes as FirebaseFirestore,
  firebase,
} from '@react-native-firebase/firestore';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import type { IMessage } from 'react-native-gifted-chat';
import { GiftedChat, GiftedChatProps } from 'react-native-gifted-chat';

interface CustomCuteChatProps {
  chatId: string;
  user: User;
  onSend?: (newMessages: IMessage[]) => void;
  setIsLoading?: (isLoading: boolean) => void;
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
  const [initializing, setInitializing] = useState(true);

  const setIsLoading = useMemo(
    () => props.setIsLoading || (() => {}),
    [props.setIsLoading]
  );

  // Utility function to convert a Firestore document to a Gifted Chat message
  const docToMessage = useCallback(
    async (doc: FirebaseFirestore.QueryDocumentSnapshot): Promise<IMessage> => {
      const data = doc.data();

      if (!data) {
        throw new Error('Document data is undefined');
      }

      const [files, sender] = await Promise.all([
        new Promise<
          | FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]
          | undefined
        >((resolve, reject) => {
          firestore()
            .collection(`chats/${chatId}/messages/${doc.id}/files`)
            .onSnapshot((snapshot) => {
              if (snapshot.empty) {
                resolve(undefined);
              } else {
                resolve(snapshot.docs);
              }
            }, reject);
        }),
        new Promise<FirebaseFirestore.DocumentData | undefined>(
          (resolve, reject) => {
            firestore()
              .doc(data.senderRef._documentPath._parts.join('/'))
              .onSnapshot((snapshot) => {
                if (!snapshot.exists) {
                  resolve(undefined);
                } else {
                  resolve(snapshot.data());
                }
              }, reject);
          }
        ),
      ]);

      const image = files?.[0]?.data().url;

      // Fetch user data from reference
      if (sender) {
        return {
          _id: doc.id,
          createdAt: new Date(data.createdAt),
          text: data.content,
          user: { _id: data.senderId, ...sender },
          image: image,
          readByIds: data.readByIds,
          metadata: data.metadata,
        };
      } else {
        return {
          _id: doc.id,
          createdAt: new Date(data.createdAt),
          text: data.content,
          image: image,
          system: true,
          readByIds: data.readByIds,
          metadata: data.metadata,
        };
      }
    },
    [chatId]
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

  // Fetch initial messages
  useLayoutEffect(() => {
    setIsLoading(true);
    const messagesRef = firestore().collection(`chats/${chatId}/messages`);

    const unsubscribe = messagesRef
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(
        async (snapshot: FirebaseFirestore.QuerySnapshot) => {
          if (snapshot.empty) {
            setLastMessageDoc(null);

            setMessages([]);
            setIsLoading(false);
            setInitializing(false);

            markMessagesAsRead([]);
          }

          if (!snapshot.empty) {
            setLastMessageDoc(
              snapshot.docs[
                snapshot.docs.length - 1
              ] as FirebaseFirestore.QueryDocumentSnapshot
            );

            const newMessagesPromises = snapshot.docs.map(docToMessage);
            const newMessages = await Promise.all(newMessagesPromises);

            setMessages(newMessages);
            setIsLoading(false);
            setInitializing(false);

            markMessagesAsRead(newMessages);
          }
        },
        (error: Error) => console.error('Error fetching documents: ', error)
      );
    // Clean up function
    return () => unsubscribe();
  }, [chatId, docToMessage, markMessagesAsRead, setIsLoading]);

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

  const fetchMoreMessages = useCallback(async () => {
    if (initializing) {
      return;
    }

    setIsLoading(true);
    try {
      const messagesRef = firestore().collection(`chats/${chatId}/messages`);
      messagesRef
        .orderBy('createdAt', 'desc')
        .startAfter(lastMessageDoc)
        .limit(20)
        .onSnapshot(async (snapshot) => {
          if (!snapshot.empty) {
            setLastMessageDoc(
              snapshot.docs[
                snapshot.docs.length - 1
              ] as FirebaseFirestore.QueryDocumentSnapshot
            );

            const newMessages = await Promise.all(
              snapshot.docs.map(docToMessage)
            );

            setMessages((previousMessages) => {
              const newMessagesFiltered = newMessages.filter(
                (newMessage) =>
                  !previousMessages.some(
                    (previousMessage) => previousMessage._id === newMessage._id
                  )
              );
              return GiftedChat.prepend(previousMessages, newMessagesFiltered);
            });

            markMessagesAsRead(newMessages);
            setIsLoading(false);
          }
        });
    } catch (error) {
      console.error('Error fetching more messages: ', error);
    }
  }, [
    chatId,
    lastMessageDoc,
    docToMessage,
    markMessagesAsRead,
    setIsLoading,
    initializing,
  ]);

  return (
    <GiftedChat
      {...props}
      messages={messages}
      onSend={props.onSend || onSend}
      user={memoizedUser}
      inverted={true}
      listViewProps={{
        onEndReached: fetchMoreMessages,
        onEndReachedThreshold: 0.5,
      }}
    />
  );
}

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
  onSend?: (newMessages: IMessage[]) => void;
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
  const docToMessage = useCallback(
    async (doc: FirebaseFirestore.QueryDocumentSnapshot): Promise<IMessage> => {
      const data = doc.data();

      if (!data) {
        throw new Error('Document data is undefined');
      }

      const filesRef = firestore().collection(
        `chats/${chatId}/messages/${doc.id}/files`
      );
      const files = await filesRef.get();

      const image = files.docs[0]?.data().url;

      // Fetch user data from reference
      const senderRef = data.senderRef;
      if (senderRef) {
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
          image: image,
        };
      } else {
        return {
          _id: doc.id,
          createdAt: new Date(data.createdAt),
          text: data.content,
          image: image,
          system: true,
        };
      }
    },
    [chatId]
  );

  // Fetch initial messages
  useLayoutEffect(() => {
    const messagesRef = firestore().collection(`chats/${chatId}/messages`);

    const unsubscribe = messagesRef
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(
        async (snapshot: FirebaseFirestore.QuerySnapshot) => {
          if (!snapshot.empty) {
            setLastMessageDoc(
              snapshot.docs[
                snapshot.docs.length - 1
              ] as FirebaseFirestore.QueryDocumentSnapshot
            );

            const newMessagesPromises = snapshot.docs.map(docToMessage);
            const newMessages = await Promise.all(newMessagesPromises);
            setMessages(newMessages);
          }
        },
        (error: Error) => console.error('Error fetching documents: ', error)
      );

    // Clean up function
    return () => unsubscribe();
  }, [chatId, docToMessage]);

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
        readByIds: firebase.firestore.FieldValue.arrayUnion(senderRef),
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
    try {
      const messagesRef = firestore().collection(`chats/${chatId}/messages`);
      const next = await messagesRef
        .orderBy('createdAt', 'desc')
        .startAfter(lastMessageDoc)
        .limit(20)
        .get();

      if (!next.empty) {
        setLastMessageDoc(
          next.docs[
            next.docs.length - 1
          ] as FirebaseFirestore.QueryDocumentSnapshot
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
  }, [chatId, lastMessageDoc, docToMessage]);

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

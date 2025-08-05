import {
  collection,
  doc,
  FirebaseFirestoreTypes,
  getDoc,
  getDocs,
  getFirestore,
} from '@react-native-firebase/firestore';
import type { IMessage } from 'react-native-gifted-chat';

/**
 * Utility function to convert a Firestore document to a `GiftedChat` message.
 */
export const docToMessage = async (
  document: FirebaseFirestoreTypes.QueryDocumentSnapshot,
  chatId: string
): Promise<IMessage> => {
  const data = document.data();

  if (!data) {
    throw new Error('Document data is undefined');
  }

  const [files, sender] = await Promise.all([
    getDocs(
      collection(
        getFirestore(),
        `chats/${chatId}/messages/${document.id}/files`
      )
    ),
    getDoc(doc(getFirestore(), data.senderRef._documentPath._parts.join('/'))),
  ]);

  const image = files?.docs[0]?.data().url;

  // Fetch user data from reference
  return {
    _id: document.id,
    createdAt: new Date(data.createdAt),
    text: data.content,
    user: { _id: data.senderId, ...sender },
    image: image,
    readByIds: data.readByIds,
    metadata: data.metadata,
  };
};

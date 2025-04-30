import firestore, {
  FirebaseFirestoreTypes as FirebaseFirestore,
} from '@react-native-firebase/firestore';
import type { IMessage } from 'react-native-gifted-chat';

/**
 * Utility function to convert a Firestore document to a `GiftedChat` message.
 */
export const docToMessage = async (
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  chatId: string
): Promise<IMessage> => {
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
};

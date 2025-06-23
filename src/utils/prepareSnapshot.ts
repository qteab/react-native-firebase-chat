import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { docToMessage } from './docToMessage';
import { IMessage } from 'react-native-gifted-chat';

export type SnapshotChange = {
  type: FirebaseFirestoreTypes.DocumentChangeType;
  message: IMessage;
};

/**
 * Prepares snapshot changes for internal usage.
 */
export const prepareSnapshot = async (
  snapshot: FirebaseFirestoreTypes.QuerySnapshot,
  chatId: string
): Promise<SnapshotChange[]> => {
  console.log('Preparing snapshot');

  return Promise.all(
    snapshot.docChanges().map(async (change) => ({
      type: change.type,
      message: await docToMessage(change.doc, chatId),
    }))
  );
};

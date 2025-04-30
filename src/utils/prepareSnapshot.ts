import { SnapshotChange } from 'src/CuteChat';
import { FirebaseFirestoreTypes as FirebaseFirestore } from '@react-native-firebase/firestore';
import { docToMessage } from './docToMessage';

export const prepareSnapshot = async (
  snapshot: FirebaseFirestore.QuerySnapshot,
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

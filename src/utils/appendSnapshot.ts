import { IMessage } from 'react-native-gifted-chat';
import { SnapshotChange } from './prepareSnapshot';

/**
 * Returns transformed messages based on snapshot events.
 * This can include removed, added or modified messages and are updated
 * and returned accordingly via this function.
 *
 * This function **does not** mutate the original `currentMessages` array.
 */
export const appendSnapshot = (
  currentMessages: IMessage[],
  snapshotChanges: SnapshotChange[]
): IMessage[] => {
  console.log('Appending snapshot...');
  const newMessages = [...currentMessages];

  for (const change of snapshotChanges) {
    switch (change.type) {
      case 'removed':
        console.log('Message remove id:', change.message._id);
        const deleteIndex = newMessages.findIndex(
          (m) => change.message._id === m._id
        );
        if (deleteIndex === -1) {
          console.log('Message does not exist in currentMessage');
          break;
        }
        newMessages.splice(deleteIndex, 1);
        console.log('Message removed');
        break;
      case 'added':
      case 'modified':
        console.log('Message modified or added id:', change.message._id);
        const modifiedIndex = newMessages.findIndex(
          (m) => change.message._id === m._id
        );
        if (modifiedIndex === -1) {
          console.log('Message added');
          newMessages.push(change.message);
        } else {
          console.log('Message updated');
          newMessages[modifiedIndex] = change.message;
        }
        break;
    }
  }

  return newMessages.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

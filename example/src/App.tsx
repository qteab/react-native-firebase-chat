import * as React from 'react';
import { CuteChat } from '@qteab/react-native-firebase-chat';

export default function App() {
  const chatId = '8an3O9LKFgb9q7svhr1z';
  const user = { id: 'auserid123', avatar: 'https://i.pravatar.cc/300' };
  return <CuteChat chatId={chatId} user={user} />;
}

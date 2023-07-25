import 'react-native-gifted-chat';

declare module 'react-native-gifted-chat' {
  interface IMessage {
    _id: string | number;
    text: string;
    createdAt: Date | number;
    user?: User;
    image?: string;
    video?: string;
    audio?: string;
    system?: boolean;
    sent?: boolean;
    received?: boolean;
    pending?: boolean;
    quickReplies?: QuickReplies;
    metadata?: Record<string, any>;
    readByIds: string[];
  }
}

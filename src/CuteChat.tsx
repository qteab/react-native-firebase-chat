import React, { useState, useCallback, useLayoutEffect } from 'react';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';

interface CuteChatProps {
  api: string;
  auth: string;
}

export function CuteChat({ api }: CuteChatProps) {
  const [messages, setMessages] = useState<IMessage[]>([]);

  useLayoutEffect(() => {
    // get messages from server here
    console.log('api', api);
    setMessages([
      {
        _id: 1,
        text: 'Hello developer',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'React Native',
          avatar: 'https://placeimg.com/140/140/any',
        },
      },
    ]);
  }, [api]);

  const onSend = useCallback((messages: IMessage[] = []) => {
    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, messages)
    );
  }, []);

  return (
    <GiftedChat
      messages={messages}
      onSend={(messages) => onSend(messages)}
      user={{
        _id: 1,
      }}
    />
  );
}

import React, { useEffect, useState } from 'react';
import { CuteChat, Send, Bubble } from '@qteab/react-native-firebase-chat';
import { Button, View } from 'react-native';

export default function App() {
  const chatId = '8an3O9LKFgb9q7svhr1z';
  const [userId, setUserId] = useState(''); // Initialize user ID as an empty string

  // Function to generate a random ID
  const generateRandomId = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  };

  useEffect(() => {
    const newUserId = generateRandomId(); // Generate a random ID
    setUserId(newUserId); // Set the user ID in the state
  }, []); // Empty dependency array, so this runs once when the component mounts

  // Now that userId is part of the state, the user object will update when userId changes
  const user = { id: userId, avatar: 'https://i.pravatar.cc/300' };

  const renderBubble = (props) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: 'orange',
          },
        }}
        textStyle={{
          right: {
            color: 'white',
          },
        }}
      />
    );
  };

  const renderSend = (props) => {
    return (
      <Send {...props}>
        <View style={{ marginRight: 10, marginBottom: 5 }}>
          <Button
            title="Send"
            color="orange"
            onPress={() => {
              props.onSend({ text: props.text.trim() }, true);
            }}
          />
        </View>
      </Send>
    );
  };
  return (
    <CuteChat
      chatId={chatId}
      user={user}
      showUserAvatar={false}
      renderSend={renderSend}
      renderBubble={renderBubble}
      messagesContainerStyle={{
        backgroundColor: '#fff',
      }}
    />
  );
}

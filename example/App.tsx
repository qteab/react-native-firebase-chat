import React, {useEffect, useState} from 'react';
import {CuteChat, Send, Bubble} from '@qteab/react-native-firebase-chat';
import {Button, Platform, View} from 'react-native';

export default function App() {
  const chatId = 'xgW3FUl5WxbSjbh24PTd';
  const [userId, setUserId] = useState(''); // Initialize user ID as an empty string

  // Function to generate a random ID
  function generateRandomId() {
    const ids = ['example_user_id', 'example_user_id2', 'example_user_id3'];
    const randomIndex = Math.floor(Math.random() * ids.length);
    return ids[randomIndex];
  }

  useEffect(() => {
    let newUserId = '';

    // Check the platform and assign the userId accordingly
    if (Platform.OS === 'ios') {
      newUserId = 'example_user_id';
    } else if (Platform.OS === 'android') {
      newUserId = 'example_user_id2';
    } else {
      newUserId = generateRandomId(); // Default case, generate a random ID
    }

    setUserId(newUserId); // Set the user ID in the state
  }, []); // Empty dependency array, so this runs once when the component mounts

  // Now that userId is part of the state, the user object will update when userId changes
  const user = {
    _id: userId,
    name: 'Test Osteron',
    avatar: 'https://i.pravatar.cc/300',
  };

  const renderBubble = (props: any) => {
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

  const renderSend = (props: any) => {
    return (
      <Send {...props}>
        <View style={{marginRight: 10, marginBottom: 5}}>
          <Button
            title="Send"
            color="orange"
            onPress={() => {
              props.onSend({text: props.text.trim()}, true);
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

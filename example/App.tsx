import React, {useEffect, useState} from 'react';
import {CuteChat, Send, Bubble} from '@qteab/react-native-firebase-chat';
import {Button, Platform, TouchableOpacity, View} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import Icon from './assets/Icon.svg';

interface Image {
  uri: string;
  type: string;
  name: string;
}

interface Message {
  text?: string;
  image?: string;
}

export default function App() {
  const chatId = 'xgW3FUl5WxbSjbh24PTd';
  const [userId, setUserId] = useState(''); // Initialize user ID as an empty string

  // Function to generate a random ID
  function generateRandomId(): string {
    const ids = ['example_user_id', 'example_user_id2', 'example_user_id3'];
    const randomIndex = Math.floor(Math.random() * ids.length);
    return ids[randomIndex] || '';
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
    id: userId,
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

  const uploadImageToBucket = async (image: Image) => {
    if (!image.uri) {
      console.log('No image selected');
      return;
    }

    // generate unique image name
    const imageName = `${new Date().getTime()}-${image.name}`;

    // create a reference to the storage bucket location
    const storageRef = storage().ref(`images/${imageName}`);

    // start the file upload
    await storageRef.putFile(image.uri);
    const downloadURL = await storageRef.getDownloadURL();

    return downloadURL;
  };

  const selectImage = async (onSend: (messages: Message[]) => void) => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });
    if (result.didCancel) {
      return;
    }
    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (!asset?.uri || !asset?.type || !asset?.fileName) {
        return;
      }

      const image = {
        uri: asset.uri,
        type: asset.type,
        name: asset.fileName,
      };
      const imageUrl = await uploadImageToBucket(image);
      onSend([{image: imageUrl}]);
    }
  };

  const renderActions = (props: any) => (
    <TouchableOpacity onPress={() => selectImage(props.onSend)}>
      <Icon width={30} height={30} />
    </TouchableOpacity>
  );

  return (
    <CuteChat
      chatId={chatId}
      user={user}
      showUserAvatar={false}
      renderSend={renderSend}
      renderBubble={renderBubble}
      renderActions={renderActions}
      messagesContainerStyle={{
        backgroundColor: '#fff',
      }}
    />
  );
}

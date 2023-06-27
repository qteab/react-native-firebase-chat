# @qte/react-native-firebase-chat

Firebase chats the qte way

## Installation

```sh
npm install @qte/react-native-firebase-chat
```

## Usage

Add the google-services.json to example/android/app and GoogleService-Info.plist to example/ios. These you can get from firebase

## Firebase Data structure from @qte/nest-firebase-chat

```sh
├── users
│   └── userId
│       ├── name (string)
│       └── avatar (URL string)
└── chats
    └── chatId
        ├── creatorId (string)
        ├── creatorRef (reference to user document)
        ├── memberIds (array of references to user documents)
        ├── name (string)
        ├── lastMessage (reference to message document)
        ├── createdAt (ISO string)
        ├── updatedAt (ISO string)
        └── messages
            └── messageId
                ├── senderId (string)
                ├── senderRef (reference to user document)
                ├── content (string)
                ├── readByIds (array of references to user documents)
                ├── createdAt (ISO string)
                └── updatedAt (ISO string)
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)

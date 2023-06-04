import { initializeApp } from '@firebase/app';
import { getAuth } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
// Firebase config
const firebaseConfig = {
  apiKey: 'somevalue',
  authDomain: 'somevalue',
  projectId: 'somevalue',
  storageBucket: 'somevalue',
  messagingSenderId: 'somevalue',
  appId: 'somevalue',
};
// initialize firebase
initializeApp(firebaseConfig);
export const auth = getAuth();
export const database = getFirestore();

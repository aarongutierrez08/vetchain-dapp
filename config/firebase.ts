import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDyxqHawFveFbtHNcbduEwYzcc76i-5Bk0",
  authDomain: "vetchain-4f0ee.firebaseapp.com",
  projectId: "vetchain-4f0ee",
  storageBucket: "vetchain-4f0ee.firebasestorage.app",
  messagingSenderId: "331297953202",
  appId: "1:331297953202:web:7255c240684bad2ef940ab"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
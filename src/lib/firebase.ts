import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4vyW609Kh4N6Z_v8CWoXmJuArqeN58kc",
  authDomain: "hrivahr.firebaseapp.com",
  projectId: "hrivahr",
  storageBucket: "hrivahr.firebasestorage.app",
  messagingSenderId: "1027640189714",
  appId: "1:1027640189714:web:8188b5eda3c6d45fb409cb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app };

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

export const firebaseConfig = {
  apiKey: "AIzaSyA4vyW609Kh4N6Z_v8CWoXmJuArqeN58kc",
  authDomain: "hrivahr.firebaseapp.com",
  databaseURL: "https://hrivahr-default-rtdb.firebaseio.com",
  projectId: "hrivahr",
  storageBucket: "hrivahr.firebasestorage.app",
  messagingSenderId: "1027640189714",
  appId: "1:1027640189714:web:8188b5eda3c6d45fb409cb",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db   = getFirestore(app)
export default app

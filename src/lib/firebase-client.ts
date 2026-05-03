import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyDsYnOKt4PDEcAprPgEi1qHPEFERlX9gmU",
  authDomain: "dnd-app-v2.firebaseapp.com",
  databaseURL: "https://dnd-app-v2-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "dnd-app-v2",
  storageBucket: "dnd-app-v2.firebasestorage.app",
  messagingSenderId: "852723899532",
  appId: "1:852723899532:web:a452428122a5249dcfafa9",
  measurementId: "G-CNT93KP8T7"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)

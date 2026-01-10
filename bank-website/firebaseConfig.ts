// Import the functions you need from the SDKs you need
import { getAnalytics, Analytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBR6B0nypfJDjqgElxnWkMaeIi2z4idjDI",
  authDomain: "banking-security-b7579.firebaseapp.com",
  projectId: "banking-security-b7579",
  storageBucket: "banking-security-b7579.firebasestorage.app",
  messagingSenderId: "255123720044",
  appId: "1:255123720044:web:26bcc64bb3ea12b2e09549",
  measurementId: "G-JLXPBT040B",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only on client side
let analytics: Analytics | undefined;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

const db = getFirestore(app);

export { db, analytics };

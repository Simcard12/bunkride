// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getDatabase, Database } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app: FirebaseApp;
let analytics: any;
let auth: Auth;
let db: Firestore;
let database: Database;

// Initialize Firebase only once
if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    
    // Initialize analytics only in the browser and if supported
    isAnalyticsSupported().then(yes => {
      if (yes) {
        analytics = getAnalytics(app);
      }
    });
    
    auth = getAuth(app);
    db = getFirestore(app);
    database = getDatabase(app);
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    database = getDatabase(app);
  }
}

export { app, analytics, auth, db as firestore, database };

export const serverTimestamp = () => ({
  toDate: () => new Date(),
  toMillis: () => Date.now(),
  isEqual: (other: any) => other && other.toMillis ? other.toMillis() === Date.now() : false,
  toString: () => `ServerTimestamp(${Date.now()})`,
  toJSON: () => ({
    '.sv': 'timestamp'
  })
});

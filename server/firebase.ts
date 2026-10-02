import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, setLogLevel, doc, getDoc, setDoc, getDocs, collection, query, where, orderBy, limit, deleteDoc, updateDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Filter harmless internal Firestore idle stream timeout notices in Node.js
const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("Disconnecting idle stream") || args[0].includes("Timed out waiting for new targets"))
  ) {
    // Benign internal Firestore client gRPC idle stream closure
    return;
  }
  originalConsoleError.apply(console, args);
};

setLogLevel("error");

let firebaseConfig: any = null;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    firebaseConfig = JSON.parse(raw);
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json:", e);
}

const app = !getApps().length && firebaseConfig
  ? initializeApp(firebaseConfig)
  : (getApps().length ? getApp() : null);

export const firestore = app ? getFirestore(app, firebaseConfig?.firestoreDatabaseId || undefined) : null;
export const isFirestoreAvailable = firestore !== null;

console.log("🔥 Firebase Firestore initialized:", isFirestoreAvailable ? `Connected (db: ${firebaseConfig?.firestoreDatabaseId || 'default'})` : "Disabled");

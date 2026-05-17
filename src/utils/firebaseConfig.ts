import admin from "firebase-admin";

// O require busca o arquivo que você renomeou na raiz
const serviceAccount = require("../../firebase-key.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
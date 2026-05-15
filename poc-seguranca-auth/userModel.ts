
import { db } from "../utils/firebaseConfig";


const usersCollection = db.collection("users");

export const UserModel = {
  // Busca por username
  findByUsername: async (username: string) => {
    const snapshot = await usersCollection.where("username", "==", username).limit(1).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  // Busca por ID 
  findById: async (id: string) => {
    const doc = await usersCollection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  // Busca por token de recuperação
  findByRecoveryToken: async (hashToken: string) => {
    const snapshot = await usersCollection.where("recoveryToken", "==", hashToken).limit(1).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  // Criação de usuário
  create: async (data: { username: string; passwordHash: string; twoFactorSecret: string }) => {
    const res = await usersCollection.add({
      ...data,
      createdAt: new Date()
    });
    return { id: res.id, ...data };
  },

  // Atualiza token de recuperação
  updateRecoveryToken: async (id: string, recoveryToken: string, recoveryTokenExpires: Date) => {
    await usersCollection.doc(id).update({
      recoveryToken,
      recoveryTokenExpires
    });
  },

  // Atualiza a senha e limpa tokens
  updatePassword: async (id: string, passwordHash: string) => {
    await usersCollection.doc(id).update({
      passwordHash,
      recoveryToken: null,
      recoveryTokenExpires: null
    });
  }
};
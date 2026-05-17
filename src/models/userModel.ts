import { db } from "../utils/firebaseConfig";

const usersCollection = db.collection("users");

export const UserModel = {

  findByUsername: async (username: string) => {
    const snapshot = await usersCollection.where("username", "==", username).limit(1).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
  },

  findByEmail: async (email: string) => {
    const snapshot = await usersCollection.where("email", "==", email.toLowerCase()).limit(1).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
  },

  findById: async (id: string) => {
    const doc = await usersCollection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as any;
  },

  findByGoogleId: async (googleId: string) => {
    const snapshot = await usersCollection.where("googleId", "==", googleId).limit(1).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
  },

  findByRecoveryToken: async (hashToken: string) => {
    const snapshot = await usersCollection.where("recoveryToken", "==", hashToken).limit(1).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
  },

  create: async (data: {
    username:        string;
    email:           string;        // sempre salvo em minúsculas
    passwordHash:    string;
    twoFactorSecret: string;
    lgpdAcceptedAt:  Date;
    googleId?:       string;
  }) => {
    const res = await usersCollection.add({
      ...data,
      email:     data.email.toLowerCase(),  // garante minúsculas no banco
      createdAt: new Date(),
    });
    return { id: res.id, ...data };
  },

  linkGoogleId: async (id: string, googleId: string) => {
    await usersCollection.doc(id).update({ googleId });
  },

  updateRecoveryToken: async (id: string, recoveryToken: string, recoveryTokenExpires: Date) => {
    await usersCollection.doc(id).update({ recoveryToken, recoveryTokenExpires });
  },

  // Atualiza a senha e invalida o token de recuperação (uso único)
  updatePassword: async (id: string, passwordHash: string) => {
    await usersCollection.doc(id).update({
      passwordHash,
      recoveryToken:        null,
      recoveryTokenExpires: null,
    });
  },
};
import { db } from "../config/firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export const linkEmailToAddress = async (
  email: string,
  address: string
): Promise<void> => {
  if (!email || !address) throw new Error("Email y Address son requeridos");

  try {
    // Usamos el email como ID del documento para asegurar unicidad y búsqueda O(1)
    const userRef = doc(db, "users", email.toLowerCase().trim());
    await setDoc(
      userRef,
      {
        walletAddress: address,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ); // Merge para no borrar otros campos si existieran en el futuro
  } catch (error) {
    console.error("Error linking email:", error);
    throw error;
  }
};

export const getAddressByEmail = async (
  email: string
): Promise<string | null> => {
  if (!email) return null;

  try {
    const userRef = doc(db, "users", email.toLowerCase().trim());
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data().walletAddress;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching address by email:", error);
    return null;
  }
};

export const getEmailByAddress = async (
  address: string
): Promise<string | null> => {
  if (!address) return null;

  try {
    // Búsqueda inversa: Buscar en la colección donde walletAddress == address
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("walletAddress", "==", address));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Retornamos el ID del documento, que es el email
      return querySnapshot.docs[0].id;
    }
    return null;
  } catch (error) {
    console.error("Error fetching email by address:", error);
    return null;
  }
};

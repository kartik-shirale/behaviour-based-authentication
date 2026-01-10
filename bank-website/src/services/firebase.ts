import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  count,
  limit,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
  User,
  UserBehavioralProfile,
  BehavioralSession,
  Transaction,
} from "../../data-testing";

// Collections
const USERS_COLLECTION = "users";
const USER_BEHAVIORAL_PROFILES_COLLECTION = "userBehavioralProfiles";
const BEHAVIORAL_SESSIONS_COLLECTION = "raw_behavioral_sessions";
const TRANSACTIONS_COLLECTION = "transactions";

// User operations
export const addUser = async (
  userData: Omit<
    User,
    | "id"
    | "pinHash"
    | "recoveryQuestions"
    | "biometricEnabled"
    | "biometricType"
    | "createdAt"
    | "updatedAt"
    | "isActive"
    | "lastLoginAt"
    | "fcmToken"
  >
): Promise<string> => {
  try {
    const now = new Date().toISOString();
    const userDoc = {
      ...userData,
      pinHash: null,
      recoveryQuestions: [],
      biometricEnabled: false,
      biometricType: null,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      lastLoginAt: null,
      fcmToken: null,
    };

    const docRef = await addDoc(collection(db, USERS_COLLECTION), userDoc);
    return docRef.id;
  } catch (error) {
    console.error("Error adding user:", error);
    throw error;
  }
};

export const getUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
};

// UserBehavioralProfile operations
export const addUserBehavioralProfile = async (
  profile: UserBehavioralProfile
) => {
  try {
    const profileDoc = {
      ...profile,
      createdAt: Timestamp.now(),
      lastUpdated: Date.now(),
    };
    const docRef = await addDoc(
      collection(db, USER_BEHAVIORAL_PROFILES_COLLECTION),
      profileDoc
    );
    return { id: docRef.id, ...profileDoc };
  } catch (error) {
    console.error("Error adding behavioral profile:", error);
    throw error;
  }
};

export const updateUserBehavioralProfile = async (
  profileId: string,
  updates: Partial<UserBehavioralProfile>
) => {
  try {
    const profileRef = doc(db, USER_BEHAVIORAL_PROFILES_COLLECTION, profileId);
    await updateDoc(profileRef, {
      ...updates,
      lastUpdated: Date.now(),
    });
  } catch (error) {
    console.error("Error updating behavioral profile:", error);
    throw error;
  }
};

export const getUserBehavioralProfiles = async () => {
  try {
    const q = query(
      collection(db, USER_BEHAVIORAL_PROFILES_COLLECTION),
      orderBy("lastUpdated", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting behavioral profiles:", error);
    throw error;
  }
};

// Real-time listeners
export const subscribeToUserBehavioralProfiles = (
  callback: (profiles: any[]) => void
) => {
  const q = query(
    collection(db, USER_BEHAVIORAL_PROFILES_COLLECTION),
    orderBy("lastUpdated", "desc")
  );

  return onSnapshot(q, (querySnapshot) => {
    const profiles = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(profiles);
  });
};

export const subscribeToUsers = (callback: (users: any[]) => void) => {
  const q = query(
    collection(db, USERS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (querySnapshot) => {
    const users = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(users);
  });
};

// BehavioralSession operations
export const addBehavioralSession = async (session: BehavioralSession) => {
  try {
    const sessionDoc = {
      ...session,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(
      collection(db, BEHAVIORAL_SESSIONS_COLLECTION),
      sessionDoc
    );
    return { id: docRef.id, ...sessionDoc };
  } catch (error) {
    console.error("Error adding behavioral session:", error);
    throw error;
  }
};

export const getBehavioralSessions = async (
  userId?: string,
  sessionId?: string
) => {
  try {
    let q;

    // If both userId and sessionId are provided, query with both conditions
    if (userId && sessionId) {
      q = query(
        collection(db, BEHAVIORAL_SESSIONS_COLLECTION),
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(10)
        // where("__name__", "==", sessionId) // Firestore document ID is queried with '__name__'
      );
    }
    // If only userId is provided, query by userId and order by timestamp desc with limit 100
    else if (userId) {
      q = query(
        collection(db, BEHAVIORAL_SESSIONS_COLLECTION),
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(10)
      );
    }
    // If no userId, query all behavioral sessions ordered by timestamp desc
    else {
      q = query(
        collection(db, BEHAVIORAL_SESSIONS_COLLECTION),
        orderBy("timestamp", "desc")
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting behavioral sessions:", error);
    throw error;
  }
};

export const subscribeToUserBehavioralSessions = (
  userId: string,
  callback: (sessions: any[]) => void
) => {
  const q = query(
    collection(db, BEHAVIORAL_SESSIONS_COLLECTION),
    orderBy("timestamp", "desc")
  );

  return onSnapshot(q, (querySnapshot) => {
    const sessions = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((session: any) => session.userId === userId);
    callback(sessions);
  });
};

export const subscribeToAllBehavioralSessions = (
  callback: (sessions: any[]) => void
) => {
  const q = query(
    collection(db, BEHAVIORAL_SESSIONS_COLLECTION),
    orderBy("timestamp", "desc")
  );

  return onSnapshot(q, (querySnapshot) => {
    const sessions = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(sessions);
  });
};

// Transaction operations
export const addTransaction = async (
  transactionData: Omit<Transaction, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  try {
    const now = new Date().toISOString();
    const transactionDoc = {
      ...transactionData,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(
      collection(db, TRANSACTIONS_COLLECTION),
      transactionDoc
    );
    return docRef.id;
  } catch (error) {
    console.error("Error adding transaction:", error);
    throw error;
  }
};

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() } as Transaction);
    });
    return transactions;
  } catch (error) {
    console.error("Error getting transactions:", error);
    throw error;
  }
};

export const getUserTransactions = async (
  userId: string
): Promise<Transaction[]> => {
  try {
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where("fromUserId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() } as Transaction);
    });
    return transactions;
  } catch (error) {
    console.error("Error getting user transactions:", error);
    throw error;
  }
};

export const subscribeToUserTransactions = (
  userId: string,
  callback: (transactions: Transaction[]) => void
) => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where("fromUserId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (querySnapshot) => {
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() } as Transaction);
    });
    callback(transactions);
  });
};

export const subscribeToAllTransactions = (
  callback: (transactions: Transaction[]) => void
) => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (querySnapshot) => {
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() } as Transaction);
    });
    callback(transactions);
  });
};

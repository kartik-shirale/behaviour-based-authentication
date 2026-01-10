import auth from "@react-native-firebase/auth";
import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { Platform } from "react-native";
import { getHash } from "react-native-otp-verify";
import { firebaseConfig } from "../firebaseConfig";
import { FirebaseTransaction, FirebaseUser } from "../types/firebase";

// Note: SMS Retriever disabled for Expo compatibility
// Manual OTP entry is used instead

// Base64 encoding for React Native
const encodeBase64 = (str: string): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    const bitmap = (a << 16) | (b << 8) | c;
    result +=
      chars.charAt((bitmap >> 18) & 63) +
      chars.charAt((bitmap >> 12) & 63) +
      (i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : "=") +
      (i - 1 < str.length ? chars.charAt(bitmap & 63) : "=");
  }
  return result;
};

// Initialize Firebase for native Android
console.log("[FIREBASE] Firebase Service: Initializing for native Android");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const authInstance = auth();

class FirebaseService {
  private confirmationResult: any = null;

  constructor() {
    console.log("[FIREBASE] Firebase Service initialized for native Android");
  }

  // Expose onAuthStateChanged method for external use
  onAuthStateChanged(
    callback: (user: FirebaseUser | null) => void
  ): () => void {
    return auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && firebaseUser.phoneNumber) {
        try {
          // Get user data from Firestore when authenticated
          const userData = await this.getUserData(firebaseUser.phoneNumber);
          callback(userData);
        } catch (error) {
          console.error("Error getting user data on auth change:", error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  // Check if user exists in Firestore
  async checkUserExists(mobile: string): Promise<boolean> {
    try {
      // Keep the mobile number as is (with +91 prefix) since database stores it that way
      const usersRef = collection(db, "users");
      const userQuery = query(
        usersRef,
        where("mobile", "==", mobile),
        where("isActive", "==", true)
      );

      const snapshot = await getDocs(userQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error("Error checking user existence:", error);
      throw new Error("Failed to check user existence");
    }
  }

  // Get app hash for SMS auto-verification
  async getAppHash(): Promise<string | null> {
    try {
      if (Platform.OS !== "android") {
        console.log("SMS auto-retrieval only available on Android");
        return null;
      }

      const hashArray = await getHash();
      const hash = hashArray && hashArray.length > 0 ? hashArray[0] : null;
      console.log("App Hash:", hash);
      return hash;
    } catch (error) {
      console.error("Failed to get app hash:", error);
      return null;
    }
  }

  // Note: SMS listener methods removed - now using useOtpVerify hook directly in components

  // Note: OTP listening is now handled directly in components using useOtpVerify hook

  // Get current authenticated user
  async getCurrentUser(): Promise<FirebaseUser | null> {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        return null;
      }

      // Get user data from Firestore
      const userData = await this.getUserData(currentUser.phoneNumber!);
      return userData;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  // Get user data by phone number
  async getUserData(phoneNumber: string): Promise<FirebaseUser | null> {
    try {
      // Ensure phone number has +91 prefix for database query
      const formattedMobile = phoneNumber.startsWith("+91")
        ? phoneNumber
        : `+91${phoneNumber}`;
      const usersRef = collection(db, "users");
      const userQuery = query(
        usersRef,
        where("mobile", "==", formattedMobile),
        where("isActive", "==", true)
      );

      const snapshot = await getDocs(userQuery);
      if (snapshot.empty) {
        return null;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data() as FirebaseUser;
      return { ...userData, uid: userDoc.id };
    } catch (error) {
      console.error("Error getting user data:", error);
      return null;
    }
  }

  // Get user data by user ID
  async getUserById(userId: string): Promise<FirebaseUser | null> {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data() as FirebaseUser;
      return { ...userData, uid: userDoc.id };
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  }

  // Update last login timestamp
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        lastLoginAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating last login:", error);
      throw new Error("Failed to update last login");
    }
  }

  // Update user data
  async updateUserData(
    userId: string,
    data: Partial<FirebaseUser>
  ): Promise<void> {
    try {
      const userDocRef = doc(db, "users", userId);
      const cleanData = this.removeUndefinedValues(data);
      await updateDoc(userDocRef, {
        ...cleanData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating user data:", error);
      throw new Error("Failed to update user data");
    }
  }

  // Find user by mobile number
  async findUserByMobile(mobile: string): Promise<FirebaseUser | null> {
    try {
      // Ensure mobile number has +91 prefix for database query
      const formattedMobile = mobile.startsWith("+91")
        ? mobile
        : `+91${mobile}`;
      const usersRef = collection(db, "users");
      const userQuery = query(
        usersRef,
        where("mobile", "==", formattedMobile),
        where("isActive", "==", true)
      );

      const snapshot = await getDocs(userQuery);
      if (snapshot.empty) {
        return null;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data() as FirebaseUser;
      return { ...userData, uid: userDoc.id };
    } catch (error) {
      console.error("Error finding user by mobile:", error);
      return null;
    }
  }

  // Send OTP to mobile number using backend API
  async sendOTP(mobile: string): Promise<string> {
    try {
      const phoneNumber = mobile.startsWith("+91") ? mobile : `+91${mobile}`;
      console.log("Sending OTP to:", phoneNumber);

      // Get app hash for SMS auto-verification
      const appHash = await this.getAppHash();

      // Use backend API for OTP sending with app hash
      const requestBody: any = { mobile: phoneNumber };
      if (appHash) {
        requestBody.hash = appHash;
      }

      const response = await fetch(
        "https://finshield-backend-v21b.onrender.com/api/send-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "USER_NOT_FOUND") {
          throw new Error("User not found. Please register first.");
        } else if (response.status === 400) {
          throw new Error(data.message || "Invalid mobile number format");
        } else if (response.status === 500) {
          throw new Error("Failed to send OTP. Please try again later.");
        }
        throw new Error(data.message || "Failed to send OTP");
      }

      console.log("OTP sent successfully");
      return phoneNumber; // Return mobile number as verification ID
    } catch (error) {
      console.error("Error sending OTP:", error);
      throw error;
    }
  }

  // Verify OTP using backend API
  async verifyOTP(verificationId: string, otp: string): Promise<FirebaseUser> {
    try {
      const mobile = verificationId; // verificationId is now the mobile number
      console.log("Verifying OTP for:", mobile);

      // Use backend API for OTP verification
      const response = await fetch(
        "https://finshield-backend-v21b.onrender.com/api/verify-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mobile, otp }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(data.message || "Invalid OTP. Please try again.");
        }
        throw new Error(data.message || "OTP verification failed");
      }

      // SMS listener is now handled by useOtpVerify hook in components

      // Backend returns user data directly
      const { fullName, uid, mobile: userMobile } = data.data;

      // Find user in Firestore to get complete user data
      const usersRef = collection(db, "users");
      const userQuery = query(
        usersRef,
        where("mobile", "==", userMobile),
        where("isActive", "==", true)
      );

      const snapshot = await getDocs(userQuery);

      if (snapshot.empty) {
        throw new Error("User data not found in database");
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data() as FirebaseUser;
      const userId = userDoc.id;

      // Update last login timestamp
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        lastLoginAt: serverTimestamp(),
      });

      console.log("OTP verified successfully");
      return { ...userData, uid: userId };
    } catch (error) {
      console.error("Error verifying OTP:", error);

      // SMS listener is now handled by useOtpVerify hook in components

      throw error;
    }
  }

  // Resend OTP using backend API
  async resendOTP(mobile: string): Promise<string> {
    try {
      const phoneNumber = mobile.startsWith("+91") ? mobile : `+91${mobile}`;
      console.log("Resending OTP to:", phoneNumber);

      // Use backend API for OTP resending
      const response = await fetch(
        "https://finshield-backend-v21b.onrender.com/api/resend-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mobile: phoneNumber }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Please wait 5 minutes before requesting a new OTP.");
        } else if (response.status === 400) {
          throw new Error(data.message || "Invalid mobile number format");
        }
        throw new Error(data.message || "Failed to resend OTP");
      }

      console.log("OTP resent successfully");
      return phoneNumber; // Return mobile number as verification ID
    } catch (error) {
      console.error("Error resending OTP:", error);
      throw error;
    }
  }

  // Setup PIN for user
  async setupPin(userId: string, pin: string): Promise<void> {
    try {
      // In production, use proper hashing (bcrypt, scrypt, etc.)
      // Using cross-platform base64 encoding
      const pinHash = encodeBase64(pin); // Simple encoding for demo

      const userDocRef = doc(db, "users", userId);

      // Check if user document exists
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Update existing document
        await updateDoc(userDocRef, {
          pinHash,
          updatedAt: serverTimestamp(),
        });
      } else {
        throw new Error(
          "User document not found. Please complete authentication first."
        );
      }
    } catch (error) {
      console.error("Error setting up PIN:", error);
      throw new Error("Failed to setup PIN");
    }
  }

  // Setup security questions
  async setupSecurityQuestions(
    userId: string,
    questions: { question: string; answer: string }[]
  ): Promise<void> {
    try {
      const hashedQuestions = questions.map((q) => ({
        question: q.question,
        answerHash: encodeBase64(q.answer.toLowerCase()), // Simple encoding for demo
      }));

      const userDocRef = doc(db, "users", userId);

      // Check if user document exists
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Update existing document
        await updateDoc(userDocRef, {
          recoveryQuestions: hashedQuestions,
          updatedAt: serverTimestamp(),
        });
      } else {
        throw new Error(
          "User document not found. Please complete authentication first."
        );
      }
    } catch (error) {
      console.error("Error setting up security questions:", error);
      throw new Error("Failed to setup security questions");
    }
  }

  // Setup biometric authentication
  async setupBiometric(
    userId: string,
    biometricType: "face" | "fingerprint"
  ): Promise<void> {
    try {
      const userDocRef = doc(db, "users", userId);

      // Check if user document exists
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Update existing document
        await updateDoc(userDocRef, {
          biometricEnabled: true,
          biometricType,
          updatedAt: serverTimestamp(),
        });
      } else {
        throw new Error(
          "User document not found. Please complete authentication first."
        );
      }
    } catch (error) {
      console.error("Error setting up biometric:", error);
      throw new Error("Failed to setup biometric authentication");
    }
  }

  // Get security questions from database
  async getSecurityQuestions(userId: string): Promise<{
    success: boolean;
    questions: { id: string; question: string }[];

    message: string;
  }> {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return {
          success: false,
          questions: [],
          message: "User not found",
        };
      }

      const userData = userDoc.data() as FirebaseUser;

      if (
        !userData.recoveryQuestions ||
        userData.recoveryQuestions.length === 0
      ) {
        return {
          success: false,
          questions: [],
          message: "No security questions found for user",
        };
      }

      // Transform Firebase data to display format
      const questions = userData.recoveryQuestions.map((q, index) => ({
        id: (index + 1).toString(),
        question: q.question,
      }));

      return {
        success: true,
        questions,
        message: "Security questions retrieved successfully",
      };
    } catch (error) {
      console.error("Error retrieving security questions:", error);
      return {
        success: false,
        questions: [],
        message: "Failed to retrieve security questions",
      };
    }
  }

  // Validate PIN
  async validatePin(userId: string, pin: string): Promise<boolean> {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data() as FirebaseUser;
      const pinHash = encodeBase64(pin);

      return userData.pinHash === pinHash;
    } catch (error) {
      console.error("Error validating PIN:", error);
      return false;
    }
  }

  // Validate security questions through database query
  async validateSecurityQuestions(
    userId: string,
    answers: { questionId: string; answer: string }[]
  ): Promise<{
    success: boolean;
    correctAnswers: number;
    totalQuestions: number;
    message: string;
  }> {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return {
          success: false,
          correctAnswers: 0,
          totalQuestions: 0,
          message: "User not found",
        };
      }

      const userData = userDoc.data() as FirebaseUser;

      if (
        !userData.recoveryQuestions ||
        userData.recoveryQuestions.length === 0
      ) {
        return {
          success: false,
          correctAnswers: 0,
          totalQuestions: 0,
          message: "No security questions found for user",
        };
      }

      // Validate answers through database comparison
      let correctAnswers = 0;
      const totalQuestions = userData.recoveryQuestions.length;

      answers.forEach((userAnswer) => {
        const questionIndex = parseInt(userAnswer.questionId) - 1;
        if (
          questionIndex >= 0 &&
          questionIndex < userData.recoveryQuestions.length
        ) {
          const storedQuestion = userData.recoveryQuestions[questionIndex];
          const userAnswerHash = encodeBase64(
            userAnswer.answer.toLowerCase().trim()
          );

          if (storedQuestion.answerHash === userAnswerHash) {
            correctAnswers++;
          }
        }
      });

      // Require at least 70% correct answers
      const requiredCorrect = Math.ceil(totalQuestions * 0.7);
      const success = correctAnswers >= requiredCorrect;

      return {
        success,
        correctAnswers,
        totalQuestions,
        message: success
          ? "Security questions validated successfully"
          : `Only ${correctAnswers} out of ${totalQuestions} answers were correct. ${requiredCorrect} required.`,
      };
    } catch (error) {
      console.error("Error validating security questions:", error);
      return {
        success: false,
        correctAnswers: 0,
        totalQuestions: 0,
        message: "Database validation failed",
      };
    }
  }

  // Helper function to remove undefined values from object
  private removeUndefinedValues(obj: any): any {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  // Process transaction with real-time updates
  async processTransaction(
    fromUserId: string,
    transactionData: Omit<
      FirebaseTransaction,
      "id" | "fromUserId" | "createdAt" | "updatedAt"
    >
  ): Promise<string> {
    try {
      const transactionRef = doc(collection(db, "transactions"));
      const fromUserRef = doc(db, "users", fromUserId);

      // Remove undefined values from transaction data
      const cleanedTransactionData =
        this.removeUndefinedValues(transactionData);

      const transaction: FirebaseTransaction = {
        ...cleanedTransactionData,
        fromUserId,
        reference: `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Run Firestore transaction to ensure data consistency
      await runTransaction(db, async (firestoreTransaction) => {
        // IMPORTANT: All reads must happen before all writes in Firestore transactions

        // Read all required documents first
        const fromUserDoc = await firestoreTransaction.get(fromUserRef);

        if (!fromUserDoc.exists()) {
          throw new Error("Sender not found");
        }

        const fromUserData = fromUserDoc.data() as FirebaseUser;

        // Read toUser document if this is a transfer
        let toUserDoc = null;
        let toUserRef = null;
        let recipientExists = false;
        if (transaction.type === "transfer" && transaction.toUserId) {
          toUserRef = doc(db, "users", transaction.toUserId);
          toUserDoc = await firestoreTransaction.get(toUserRef);
          recipientExists = toUserDoc.exists();
        }

        // Now perform all writes after reads are complete

        // Check sufficient balance for debit transactions
        if (transaction.type === "debit" || transaction.type === "transfer") {
          if (fromUserData.balance < transaction.amount) {
            throw new Error("Insufficient balance");
          }

          // Deduct amount from sender
          firestoreTransaction.update(fromUserRef, {
            balance: increment(-transaction.amount),
            updatedAt: serverTimestamp(),
          });
        }

        // Handle transfer to another user (only if recipient exists)
        if (
          transaction.type === "transfer" &&
          transaction.toUserId &&
          recipientExists &&
          toUserRef
        ) {
          // Credit amount to receiver
          firestoreTransaction.update(toUserRef, {
            balance: increment(transaction.amount),
            updatedAt: serverTimestamp(),
          });
        }

        // Add credit transactions
        if (transaction.type === "credit") {
          firestoreTransaction.update(fromUserRef, {
            balance: increment(transaction.amount),
            updatedAt: serverTimestamp(),
          });
        }

        // Update transaction status based on recipient existence
        if (transaction.type === "transfer" && !recipientExists) {
          transaction.status = "failed";
          transaction.note = transaction.note
            ? `${transaction.note} (Recipient not found)`
            : "Recipient not found";
        } else {
          transaction.status = "completed";
        }

        // Create sender transaction record
        const senderTransaction = this.removeUndefinedValues({
          ...transaction,
          id: transactionRef.id,
        });
        firestoreTransaction.set(transactionRef, senderTransaction);

        // Create recipient transaction record if recipient exists and it's a transfer
        if (
          transaction.type === "transfer" &&
          recipientExists &&
          transaction.toUserId
        ) {
          const recipientTransactionRef = doc(collection(db, "transactions"));
          const recipientTransaction = this.removeUndefinedValues({
            ...transaction,
            id: recipientTransactionRef.id,
            fromUserId: transaction.toUserId, // Set recipient as the "owner" of this transaction record
            toUserId: fromUserId, // Original sender becomes the "to" user
            type: "credit" as const, // This is a credit for the recipient
            description: `Received from ${transaction.fromMobile || "sender"}`,
            status: "completed",
          });
          firestoreTransaction.set(
            recipientTransactionRef,
            recipientTransaction
          );
        }
      });

      return transactionRef.id;
    } catch (error) {
      console.error("Error processing transaction:", error);
      throw error;
    }
  }

  // Get user transactions
  async getTransactions(userId: string): Promise<FirebaseTransaction[]> {
    try {
      const transactionsRef = collection(db, "transactions");
      const q = query(
        transactionsRef,
        where("fromUserId", "==", userId),
        limit(50)
      );
      const snapshot = await getDocs(q);

      // Sort transactions by createdAt in memory to avoid composite index requirement
      const transactions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FirebaseTransaction[];

      // Sort by createdAt descending (newest first)
      return transactions.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw new Error("Failed to fetch transactions");
    }
  }

  // Sign out user
  async signOut(): Promise<void> {
    try {
      await auth().signOut();
      this.confirmationResult = null;
    } catch (error) {
      console.error("Error signing out:", error);
      throw new Error("Failed to sign out");
    }
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService();
export default firebaseService;

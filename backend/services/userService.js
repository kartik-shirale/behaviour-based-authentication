import { db } from '../configs/firebase.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

class UserService {
  constructor() {
    this.collectionName = 'users';
  }

  // Check if user exists by mobile number
  async findUserByMobile(mobile) {
    try {
      const usersRef = collection(db, this.collectionName);
      const q = query(usersRef, where('mobile', '==', mobile));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    } catch (error) {
      console.error('Error finding user by mobile:', error);
      throw error;
    }
  }

  // Get user by UID
  async getUserByUid(uid) {
    try {
      const userRef = doc(db, this.collectionName, uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return {
          id: userSnap.id,
          ...userSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user by UID:', error);
      throw error;
    }
  }

  // Update user OTP data
  async updateUserOTP(userId, otp, otpExpiry) {
    try {
      const userRef = doc(db, this.collectionName, userId);
      await updateDoc(userRef, {
        otp: otp,
        otpExpiry: otpExpiry,
        isVerified: false,
        lastLoginAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating user OTP:', error);
      throw error;
    }
  }

  // Clear user OTP
  async clearUserOTP(userId) {
    try {
      const userRef = doc(db, this.collectionName, userId);
      await updateDoc(userRef, {
        otp: null,
        otpExpiry: null
      });
      return true;
    } catch (error) {
      console.error('Error clearing user OTP:', error);
      throw error;
    }
  }

  // Verify user (mark as verified and clear OTP)
  async verifyUser(userId) {
    try {
      const userRef = doc(db, this.collectionName, userId);
      await updateDoc(userRef, {
        isVerified: true,
        otp: null,
        otpExpiry: null,
        lastLoginAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error verifying user:', error);
      throw error;
    }
  }

  // Create a temporary OTP record for non-existing users
  async createTempOTPRecord(mobile, otp, otpExpiry) {
    try {
      const tempId = `temp_${mobile.replace('+', '')}_${Date.now()}`;
      const tempRef = doc(db, 'temp_otp', tempId);
      await setDoc(tempRef, {
        mobile: mobile,
        otp: otp,
        otpExpiry: otpExpiry,
        createdAt: serverTimestamp()
      });
      return tempId;
    } catch (error) {
      console.error('Error creating temp OTP record:', error);
      throw error;
    }
  }

  // Get temp OTP record
  async getTempOTPRecord(mobile) {
    try {
      const tempRef = collection(db, 'temp_otp');
      const q = query(tempRef, where('mobile', '==', mobile));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const tempDoc = querySnapshot.docs[0];
      return {
        id: tempDoc.id,
        ...tempDoc.data()
      };
    } catch (error) {
      console.error('Error getting temp OTP record:', error);
      throw error;
    }
  }

  // Clear temp OTP record
  async clearTempOTPRecord(tempId) {
    try {
      const tempRef = doc(db, 'temp_otp', tempId);
      await updateDoc(tempRef, {
        otp: null,
        otpExpiry: null
      });
      return true;
    } catch (error) {
      console.error('Error clearing temp OTP record:', error);
      throw error;
    }
  }


  async storeBehavioralSessionData(
    behavioralData
  ) {
    try {
      // Validate required fields
      if (!behavioralData.sessionId || !behavioralData.userId) {
        throw new Error("sessionId and userId are required");
      }

      // Add timestamp if not provided
      if (!behavioralData.timestamp) {
        behavioralData.timestamp = Date.now();
      }

      // Store raw behavioral data in Firebase
      const docRef = await addDoc(collection(db, "raw_behavioral_sessions"), {
        ...behavioralData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("Raw behavioral session data saved with ID:", docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Error saving behavioral session data:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Extract BehaviourProfile data from incoming mobile data
  extractBehaviourProfile(mobileData) {
    try {
      if (!mobileData || !mobileData.userId) {
        throw new Error('Invalid mobile data structure - missing userId');
      }

      // The mobileData itself contains the behavioral data directly
      const userId = mobileData.userId;

      // Extract device fingerprint
      const deviceFingerprint = mobileData.deviceBehavior?.deviceFingerprint || {};

      // Extract SIM operator from network behavior
      const simOperator = mobileData.networkBehavior?.simOperator || '';

      // Extract location patterns from location behavior
      const locationPatterns = [];
      if (mobileData.locationBehavior) {
        const locationPattern = {
          altitude: mobileData.locationBehavior.altitude || 0,
          timezone: mobileData.locationBehavior.timezone || '',
          latitude: mobileData.locationBehavior.latitude || 0,
          longitude: mobileData.locationBehavior.longitude || 0,
          timestamp: mobileData.timestamp || Date.now(),
          vpnDetected: mobileData.networkBehavior?.vpnDetected || false
        };
        locationPatterns.push(locationPattern);
      }

      return {
        userId: userId,
        DeviceFingerprint: deviceFingerprint,
        simOperator: simOperator,
        locationPatterns: locationPatterns
      };
    } catch (error) {
      console.error('Error extracting BehaviourProfile:', error);
      throw error;
    }
  }

  // Store BehaviourProfile to Firestore with userId as document ID
  async storeBehaviourProfile(behaviourProfile) {
    try {
      if (!behaviourProfile.userId) {
        throw new Error('userId is required for BehaviourProfile');
      }

      const userId = behaviourProfile.userId;
      const behaviourProfileRef = doc(db, 'behaviour_profiles', userId);

      // Check if profile already exists
      const existingProfile = await getDoc(behaviourProfileRef);

      if (existingProfile.exists()) {
        // Update existing profile by merging location patterns
        const existingData = existingProfile.data();
        const mergedLocationPatterns = [
          ...(existingData.locationPatterns || []),
          ...behaviourProfile.locationPatterns
        ];

        // Keep only the last 50 location patterns to avoid document size issues
        const limitedLocationPatterns = mergedLocationPatterns.slice(-50);

        await updateDoc(behaviourProfileRef, {
          DeviceFingerprint: behaviourProfile.DeviceFingerprint,
          simOperator: behaviourProfile.simOperator,
          locationPatterns: limitedLocationPatterns,
          updatedAt: serverTimestamp()
        });

        console.log('BehaviourProfile updated for userId:', userId);
      } else {
        // Create new profile
        await setDoc(behaviourProfileRef, {
          ...behaviourProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        console.log('New BehaviourProfile created for userId:', userId);
      }

      return { success: true, userId: userId };
    } catch (error) {
      console.error('Error storing BehaviourProfile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Retrieve BehaviourProfile by userId
  async getBehaviourProfile(userId) {
    try {
      if (!userId) {
        throw new Error('userId is required');
      }

      const behaviourProfileRef = doc(db, 'behaviour_profiles', userId);
      const profileDoc = await getDoc(behaviourProfileRef);

      if (!profileDoc.exists()) {
        return null;
      }

      return profileDoc.data();
    } catch (error) {
      console.error('Error retrieving BehaviourProfile:', error);
      throw error;
    }
  }

  // Store risk score assessment result
  async storeRiskScore(riskScoreData) {
    try {
      if (!riskScoreData.userId || !riskScoreData.sessionId) {
        throw new Error('userId and sessionId are required');
      }

      const riskScoreRef = collection(db, 'risk_scores');
      const riskScoreDoc = {
        userId: riskScoreData.userId,
        sessionId: riskScoreData.sessionId,
        riskLevel: riskScoreData.riskLevel,
        totalScore: riskScoreData.totalScore,
        reason: riskScoreData.reason,
        recommendation: riskScoreData.recommendation,
        breakdown: riskScoreData.breakdown,
        alerts: riskScoreData.alerts || [],
        extraInfo: riskScoreData.extraInfo || {},
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(riskScoreRef, riskScoreDoc);
      console.log('Risk score stored with ID:', docRef.id);

      return {
        id: docRef.id,
        ...riskScoreDoc
      };
    } catch (error) {
      console.error('Error storing risk score:', error);
      throw error;
    }
  }

}

export default new UserService();
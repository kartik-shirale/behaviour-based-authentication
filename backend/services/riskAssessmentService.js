// Import the risk scoring engine - note: may need compilation from TS to JS
// For now, we'll implement a simplified version inline
// import { RiskScoringEngine } from '../risk.ts';

// Simplified Risk Scoring Engine implementation
class RiskScoringEngine {
  constructor() {
    this.weights = {
      motion: 0.25,
      typing: 0.25,
      touch: 0.2,
      location: 0.15,
      deviceSecurity: 0.1,
      networkSim: 0.05,
    };
  }

  calculateRiskScore(behaviorData, biometricScores, locationFactors, deviceFactors, networkFactors) {
    const alerts = [];

    // 1. Biometric Scores (Convert similarity to risk - higher similarity = lower risk)
    const motionRisk = (1 - biometricScores.motionSimilarity) * 100;
    const typingRisk = (1 - biometricScores.typingSimilarity) * 100;
    const touchRisk = (1 - biometricScores.touchSimilarity) * 100;

    // 2. Location Risk Calculation
    let locationRisk = 0;

    if (locationFactors.vpnDetected) {
      locationRisk += 60; // High penalty for VPN
      alerts.push("VPN detected - location verification bypassed");
    } else {
      if (!locationFactors.isWithinUserRadius) {
        locationRisk += 40;
        alerts.push("Login from unusual location");
      }

      if (locationFactors.locationHistoryPoints < 3) {
        locationRisk += 20;
        alerts.push("Insufficient location history");
      }

      if (!locationFactors.timeOfDayConsistency) {
        locationRisk += 15;
        alerts.push("Unusual login time pattern");
      }
    }

    locationRisk = Math.min(locationRisk, 100);

    // 3. Device Security Risk
    let deviceSecurityRisk = 0;

    if (deviceFactors.appVersionMismatch) {
      deviceSecurityRisk += 50; // HIGH ALERT
      alerts.push("CRITICAL: App version mismatch detected");
    }

    if (deviceFactors.isRooted) {
      deviceSecurityRisk += 30; // MEDIUM impact
      alerts.push("Device is rooted");
    }

    if (deviceFactors.isDebuggingEnabled) {
      deviceSecurityRisk += 15; // LOW impact
      alerts.push("Developer debugging enabled");
    }

    if (deviceFactors.hasUnknownApps) {
      deviceSecurityRisk += 20;
      alerts.push("Unknown apps installed");
    }

    if (!deviceFactors.hardwareAttestation) {
      deviceSecurityRisk += 25;
      alerts.push("Hardware attestation failed");
    }

    if (deviceFactors.hasOverlayPermission) {
      deviceSecurityRisk += 20;
      alerts.push("Screen overlay permission detected");
    }

    deviceSecurityRisk = Math.min(deviceSecurityRisk, 100);

    // 4. Network/SIM Risk
    let networkSimRisk = 0;

    if (networkFactors.simOperatorChanged && networkFactors.deviceFingerprintChanged) {
      networkSimRisk += 60; // Both changed together is suspicious
      alerts.push("SIM operator and device both changed");
    } else if (networkFactors.simOperatorChanged) {
      networkSimRisk += 20; // SIM change alone is less risky
      alerts.push("SIM operator changed");
    }

    if (!networkFactors.networkTypeConsistent) {
      networkSimRisk += 15;
      alerts.push("Network type inconsistency");
    }

    networkSimRisk = Math.min(networkSimRisk, 100);

    // 5. Calculate Weighted Total Score
    const breakdown = {
      motion: motionRisk,
      typing: typingRisk,
      touch: touchRisk,
      location: locationRisk,
      deviceSecurity: deviceSecurityRisk,
      networkSim: networkSimRisk,
    };

    const totalScore = Math.round(
      motionRisk * this.weights.motion +
      typingRisk * this.weights.typing +
      touchRisk * this.weights.touch +
      locationRisk * this.weights.location +
      deviceSecurityRisk * this.weights.deviceSecurity +
      networkSimRisk * this.weights.networkSim
    );

    // 6. Determine Risk Level and Recommendation
    let riskLevel, recommendation;

    if (totalScore <= 25) {
      riskLevel = "low";
      recommendation = "ALLOW";
    } else if (totalScore <= 60) {
      riskLevel = "medium";
      recommendation = "REVIEW";
    } else {
      riskLevel = "high";
      recommendation = "BLOCK";
    }

    // Override for critical alerts
    if (deviceFactors.appVersionMismatch) {
      riskLevel = "high";
      recommendation = "BLOCK";
    }

    return {
      totalScore,
      riskLevel,
      breakdown,
      alerts,
      recommendation,
    };
  }

  calculateLocationRisk(currentLocation, locationHistory, radiusKm = 50) {
    if (currentLocation.permissionDenied) {
      return {
        isWithinUserRadius: false,
        vpnDetected: false,
        locationHistoryPoints: 0,
        averageAccuracy: 0,
        timeOfDayConsistency: false,
      };
    }

    // VPN Detection
    const vpnDetected = this.detectVPN(currentLocation);

    if (vpnDetected) {
      return {
        isWithinUserRadius: false,
        vpnDetected: true,
        locationHistoryPoints: locationHistory.length,
        averageAccuracy: currentLocation.accuracy,
        timeOfDayConsistency: false,
      };
    }

    // Calculate if within normal radius
    const isWithinRadius = locationHistory.some((histLocation) => {
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        histLocation.latitude,
        histLocation.longitude
      );
      return distance <= radiusKm;
    });

    return {
      isWithinUserRadius: isWithinRadius,
      vpnDetected: false,
      locationHistoryPoints: locationHistory.length,
      averageAccuracy: currentLocation.accuracy,
      timeOfDayConsistency: this.checkTimeConsistency(locationHistory),
    };
  }

  detectVPN(location) {
    return (
      location.accuracy > 1000 || // Very low accuracy
      location.altitude < -100
    ); // Impossible altitude
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(value) {
    return (value * Math.PI) / 180;
  }

  checkTimeConsistency(locationHistory) {
    return locationHistory.length >= 2;
  }
}
import { db } from '../configs/firebase.js';
import userService from './userService.js';
import locationService from './locationService.js';

class RiskAssessmentService {
  constructor() {
    this.riskEngine = new RiskScoringEngine();
    this.validAppVersionsDocId = 'Qv366TBRjTvxhAWrMD4w';
  }

  /**
   * Comprehensive risk assessment for behavioral data
   * @param {string} userId - User ID
   * @param {Object} mobileData - Mobile behavioral data
   * @param {Object} similarityResults - Vector similarity results
   * @param {Object} locationValidation - Location validation results
   * @returns {Object} Complete risk assessment
   */
  async assessRisk(userId, mobileData, similarityResults, locationValidation) {
    try {
      console.log('Starting comprehensive risk assessment for user:', userId);

      // 1. Extract biometric scores from similarity results
      const biometricScores = this.extractBiometricScores(similarityResults);
      console.log('Biometric scores extracted');

      // 2. Analyze location factors
      const locationFactors = await this.analyzeLocationFactors(
        userId,
        mobileData.locationBehavior,
        locationValidation
      );
      console.log('Location factors analyzed');

      // 3. Analyze device security factors
      const deviceFactors = await this.analyzeDeviceSecurityFactors(
        userId,
        mobileData.deviceBehavior
      );
      console.log('Device security factors analyzed');

      // 4. Analyze network/SIM factors
      const networkFactors = await this.analyzeNetworkSimFactors(
        userId,
        mobileData.networkBehavior,
        mobileData.deviceBehavior
      );
      console.log('Network/SIM factors analyzed');

      // 5. Calculate comprehensive risk score
      const riskScore = this.riskEngine.calculateRiskScore(
        mobileData,
        biometricScores,
        locationFactors,
        deviceFactors,
        networkFactors
      );

      console.log('Risk assessment completed:', {
        totalScore: riskScore.totalScore,
        riskLevel: riskScore.riskLevel,
        recommendation: riskScore.recommendation,
        alertCount: riskScore.alerts.length
      });

      return {
        success: true,
        riskScore,
        factors: {
          biometric: biometricScores,
          location: locationFactors,
          device: deviceFactors,
          network: networkFactors
        }
      };

    } catch (error) {
      console.error('Error in risk assessment:', error);
      return {
        success: false,
        error: error.message,
        riskScore: {
          totalScore: 100,
          riskLevel: 'high',
          recommendation: 'BLOCK',
          breakdown: {
            motion: 100,
            typing: 100,
            touch: 100,
            location: 100,
            deviceSecurity: 100,
            networkSim: 100
          },
          alerts: ['Risk assessment failed - blocking for safety']
        }
      };
    }
  }

  /**
   * Extract biometric similarity scores from vector processing results
   */
  extractBiometricScores(similarityResults) {
    const defaultScores = {
      motionSimilarity: 0,
      typingSimilarity: 0,
      touchSimilarity: 0
    };

    if (!similarityResults || !similarityResults.summary) {
      return defaultScores;
    }

    return {
      motionSimilarity: similarityResults.motion?.similarity || 0,
      typingSimilarity: similarityResults.typing?.similarity || 0,
      touchSimilarity: similarityResults.gesture?.similarity || 0 // gesture = touch patterns
    };
  }

  /**
   * Analyze location-based risk factors
   */
  async analyzeLocationFactors(userId, locationBehavior, locationValidation) {
    if (!locationBehavior) {
      return {
        isWithinUserRadius: false,
        vpnDetected: false,
        locationHistoryPoints: 0,
        averageAccuracy: 0,
        timeOfDayConsistency: false
      };
    }

    // Use existing location validation results if provided
    if (locationValidation) {
      return {
        isWithinUserRadius: locationValidation.isValid,
        vpnDetected: locationValidation.vpnDetected || false,
        locationHistoryPoints: locationValidation.details?.totalHistoricalLocations || 0,
        averageAccuracy: locationBehavior.accuracy || 0,
        timeOfDayConsistency: locationValidation.confidence > 0.7
      };
    }

    // Leverage the enhanced locationService for comprehensive validation
    try {
      const locationValidationResult = await locationService.validateLocation(userId, locationBehavior);

      return {
        isWithinUserRadius: locationValidationResult.isValid,
        vpnDetected: locationValidationResult.vpnDetected || false,
        locationHistoryPoints: locationValidationResult.details?.totalHistoricalLocations || 0,
        averageAccuracy: locationBehavior.accuracy || 0,
        timeOfDayConsistency: locationValidationResult.confidence > 0.7,
        // Additional details from locationService
        validationReason: locationValidationResult.reason,
        confidence: locationValidationResult.confidence,
        vpnLocationsCount: locationValidationResult.details?.vpnLocationsCount || 0,
        nonVpnLocationsCount: locationValidationResult.details?.nonVpnLocationsCount || 0
      };
    } catch (error) {
      console.error('Error using locationService for validation:', error);

      // Fallback: basic location analysis using internal engine
      try {
        const behaviorProfile = await userService.getBehaviourProfile(userId);
        const locationHistory = behaviorProfile?.locationPatterns || [];

        return this.riskEngine.calculateLocationRisk(
          locationBehavior,
          locationHistory
        );
      } catch (fallbackError) {
        console.error('Error in fallback location analysis:', fallbackError);
        return {
          isWithinUserRadius: false,
          vpnDetected: false,
          locationHistoryPoints: 0,
          averageAccuracy: locationBehavior.accuracy || 0,
          timeOfDayConsistency: false
        };
      }
    }
  }

  /**
   * Analyze device security factors including app version validation
   */
  async analyzeDeviceSecurityFactors(userId, deviceBehavior) {
    if (!deviceBehavior) {
      return {
        isRooted: true, // Assume worst case if no data
        isDebuggingEnabled: true,
        appVersionMismatch: true,
        hasUnknownApps: true,
        hardwareAttestation: false,
        hasOverlayPermission: true
      };
    }

    // Validate app version against approved versions
    const appVersionMismatch = await this.validateAppVersion(deviceBehavior.appVersion);

    return {
      isRooted: deviceBehavior.isRooted || false,
      isDebuggingEnabled: deviceBehavior.isDebuggingEnabled || false,
      appVersionMismatch,
      hasUnknownApps: deviceBehavior.hasUnknownApps || false,
      hardwareAttestation: deviceBehavior.hardwareAttestation || false,
      hasOverlayPermission: deviceBehavior.hasOverlayPermission || false
    };
  }

  /**
   * Validate app version against approved versions in Firestore
   */
  async validateAppVersion(currentVersion) {
    try {
      if (!currentVersion) {
        console.log('No app version provided - marking as mismatch');
        return true; // No version = mismatch
      }

      console.log('Validating app version:', currentVersion);

      const versionDoc = await db.collection('app_version')
        .doc(this.validAppVersionsDocId)
        .get();

      if (!versionDoc.exists) {
        console.error('App version document not found in Firestore');
        return true; // Can't validate = assume mismatch for safety
      }

      const versionData = versionDoc.data();
      const validVersions = versionData.version || [];

      console.log('Valid app versions:', validVersions);

      const isValid = validVersions.includes(currentVersion);
      console.log(`App version ${currentVersion} is ${isValid ? 'valid' : 'invalid'}`);

      return !isValid; // Return true if mismatch (invalid)

    } catch (error) {
      console.error('Error validating app version:', error);
      return true; // Error = assume mismatch for safety
    }
  }

  /**
   * Analyze network and SIM-related risk factors
   */
  async analyzeNetworkSimFactors(userId, networkBehavior, deviceBehavior) {
    if (!networkBehavior || !deviceBehavior) {
      return {
        simOperatorChanged: false,
        deviceFingerprintChanged: false,
        networkTypeConsistent: true
      };
    }

    try {
      // Get user's behavior profile to compare SIM and device fingerprint
      const behaviorProfile = await userService.getBehaviourProfile(userId);

      let simOperatorChanged = false;
      let deviceFingerprintChanged = false;

      if (behaviorProfile) {
        // Check if SIM operator changed
        if (behaviorProfile.simOperator &&
          behaviorProfile.simOperator !== networkBehavior.simOperator) {
          simOperatorChanged = true;
          console.log('SIM operator changed:', {
            previous: behaviorProfile.simOperator,
            current: networkBehavior.simOperator
          });
        }

        // Check if device fingerprint changed
        if (behaviorProfile.DeviceFingerprint &&
          deviceBehavior.deviceFingerprint) {
          const previousFingerprint = behaviorProfile.DeviceFingerprint.fingerprint;
          const currentFingerprint = deviceBehavior.deviceFingerprint.fingerprint;

          if (previousFingerprint && previousFingerprint !== currentFingerprint) {
            deviceFingerprintChanged = true;
            console.log('Device fingerprint changed:', {
              previous: previousFingerprint,
              current: currentFingerprint
            });
          }
        }
      }

      return {
        simOperatorChanged,
        deviceFingerprintChanged,
        networkTypeConsistent: true // Assume consistent for now
      };

    } catch (error) {
      console.error('Error analyzing network/SIM factors:', error);
      return {
        simOperatorChanged: false,
        deviceFingerprintChanged: false,
        networkTypeConsistent: true
      };
    }
  }

  /**
   * Get risk level description for user-friendly display
   */
  getRiskDescription(riskLevel) {
    const descriptions = {
      'low': 'User behavior matches established patterns. Transaction appears legitimate.',
      'medium': 'Some behavioral anomalies detected. Additional verification recommended.',
      'high': 'Significant behavioral deviations or security concerns detected. Transaction should be blocked or require strong authentication.'
    };

    return descriptions[riskLevel] || 'Unknown risk level';
  }
}

export default new RiskAssessmentService();
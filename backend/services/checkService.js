import locationService from './locationService.js';
import vectorService from './vectorService.js';
import riskAssessmentService from './riskAssessmentService.js';
import userService from './userService.js';

class CheckService {
  /**
   * Process behavioral data check request
   * @param {Object} mobileData - The incoming mobile data
   * @returns {Object} - Processed check result
   */
  async processCheck(mobileData) {

    const { userId, sessionId } = mobileData;

    // Initialize results
    let locationValidation = null;
    let similarityResults = null;
    let comprehensiveRiskAssessment = null;

    // 1. Location validation
    locationValidation = await this.validateLocation(userId, mobileData.locationBehavior);

    // 2. Similarity analysis
    similarityResults = await this.analyzeSimilarity(userId, sessionId, mobileData);

    // 3. Comprehensive risk assessment
    comprehensiveRiskAssessment = await this.assessRisk(
      userId,
      mobileData,
      similarityResults,
      locationValidation
    );

    // 4. Store risk score in database
    await this.storeRiskScore(userId, sessionId, comprehensiveRiskAssessment, mobileData);

    // 5. Build simplified response
    return this.buildResponse({
      mobileData,
      locationValidation,
      similarityResults,
      comprehensiveRiskAssessment
    });
  }

  /**
   * Validate location using enhanced locationService
   * @param {string} userId - User ID
   * @param {Object} locationBehavior - Location behavior data
   * @returns {Object} - Location validation result
   */
  async validateLocation(userId, locationBehavior) {
    if (!locationBehavior) {
      return null;
    }

    try {
      console.log("Validating location for user:", userId);

      const locationValidation = await locationService.validateLocation(userId, locationBehavior);

      console.log("Enhanced location validation result:", {
        isValid: locationValidation.isValid,
        vpnDetected: locationValidation.vpnDetected,
        confidence: locationValidation.confidence,
        reason: locationValidation.reason,
        totalHistoricalLocations: locationValidation.details?.totalHistoricalLocations,
        vpnLocationsCount: locationValidation.details?.vpnLocationsCount
      });

      return locationValidation;
    } catch (locationError) {
      console.error("Error during location validation:", locationError);
      return {
        isValid: false,
        reason: `Location validation failed: ${locationError.message}`,
        confidence: 0,
        vpnDetected: false
      };
    }
  }

  /**
   * Analyze behavioral similarity
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @param {Object} behaviorData - Behavioral data
   * @returns {Object} - Similarity analysis result
   */
  async analyzeSimilarity(userId, sessionId, behaviorData) {
    try {
      console.log("Processing behavioral data for similarity analysis...");

      const similarityResults = await vectorService.processBehavioralDataForCheck(
        userId,
        sessionId,
        behaviorData
      );

      console.log("Similarity analysis completed:", {
        processed: similarityResults.summary.processed,
        avgSimilarity: similarityResults.summary.averageSimilarity
      });

      return similarityResults;
    } catch (vectorError) {
      console.error("Error during similarity analysis:", vectorError);
      // Return fallback results
      return {
        summary: { processed: 0, averageSimilarity: 0 },
        motion: { success: false, similarity: 0 },
        typing: { success: false, similarity: 0 },
        gesture: { success: false, similarity: 0 }
      };
    }
  }

  /**
   * Assess comprehensive risk
   * @param {string} userId - User ID
   * @param {Object} mobileData - Mobile data
   * @param {Object} similarityResults - Similarity results
   * @param {Object} locationValidation - Location validation results
   * @returns {Object} - Risk assessment result
   */
  async assessRisk(userId, mobileData, similarityResults, locationValidation) {
    try {
      console.log("Starting comprehensive risk assessment...");

      const comprehensiveRiskAssessment = await riskAssessmentService.assessRisk(
        userId,
        mobileData,
        similarityResults,
        locationValidation
      );

      console.log("Comprehensive risk assessment completed:", {
        success: comprehensiveRiskAssessment.success,
        totalScore: comprehensiveRiskAssessment.riskScore?.totalScore,
        riskLevel: comprehensiveRiskAssessment.riskScore?.riskLevel,
        recommendation: comprehensiveRiskAssessment.riskScore?.recommendation
      });

      return comprehensiveRiskAssessment;
    } catch (riskError) {
      console.error("Error during comprehensive risk assessment:", riskError);
      // Fallback to high risk if assessment fails
      return {
        success: false,
        error: riskError.message,
        riskScore: {
          totalScore: 100,
          riskLevel: 'HIGH',
          recommendation: 'BLOCK',
          breakdown: {
            motion: 100,
            typing: 100,
            touch: 100,
            location: 100,
            deviceSecurity: 100,
            networkSim: 100
          },
          alerts: ['Comprehensive risk assessment failed - blocking for safety']
        }
      };
    }
  }

  /**
   * Build the final response object
   * @param {Object} params - Response parameters
   * @returns {Object} - Final response
   */
  /**
   * Store risk score in database
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @param {Object} comprehensiveRiskAssessment - Risk assessment result
   */
  async storeRiskScore(userId, sessionId, comprehensiveRiskAssessment, mobileData) {
    try {
      const riskScore = comprehensiveRiskAssessment.riskScore;

      // Extract location coordinates from mobileData
      const locationCoordinates = mobileData?.data?.locationBehavior ? {
        latitude: mobileData.data.locationBehavior.latitude,
        longitude: mobileData.data.locationBehavior.longitude,
        accuracy: mobileData.data.locationBehavior.accuracy,
        timestamp: mobileData.data.locationBehavior.timestamp
      } : null;

      const riskScoreData = {
        userId,
        sessionId,
        riskLevel: riskScore.riskLevel.toLowerCase(), // Ensure lowercase for consistency
        totalScore: riskScore.totalScore,
        reason: riskScore.description || riskAssessmentService.getRiskDescription(riskScore.riskLevel),
        recommendation: riskScore.recommendation,
        breakdown: riskScore.breakdown,
        alerts: riskScore.alerts || [],
        extraInfo: {
          locationCoordinates
        }
      };

      await userService.storeRiskScore(riskScoreData);
      console.log(`Risk score stored for user ${userId}, session ${sessionId}`);
    } catch (error) {
      console.error('Error storing risk score:', error);
      // Don't throw error to avoid breaking the response flow
    }
  }

  buildResponse({ mobileData, locationValidation, similarityResults, comprehensiveRiskAssessment }) {
    const riskScore = comprehensiveRiskAssessment.riskScore;

    // Build comprehensive response with detailed scoring information
    return {
      success: true,
      message: "Behavioral data analyzed successfully",
      data: {
        reason: riskScore.description || riskAssessmentService.getRiskDescription(riskScore.riskLevel),
        riskLevel: riskScore.riskLevel.toLowerCase(), // Ensure lowercase: low, medium, high
        // Include detailed risk assessment for verification
        riskAssessment: {
          success: comprehensiveRiskAssessment.success,
          riskScore: {
            totalScore: riskScore.totalScore,
            riskLevel: riskScore.riskLevel,
            recommendation: riskScore.recommendation,
            breakdown: riskScore.breakdown,
            alerts: riskScore.alerts
          },
          factors: comprehensiveRiskAssessment.factors
        },
        similarityResults: {
          summary: similarityResults.summary,
          motion: similarityResults.motion,
          typing: similarityResults.typing,
          gesture: similarityResults.gesture
        },
        locationValidation: locationValidation
      }
    };
  }

  /**
   * Validate request data
   * @param {Object} mobileData - Mobile data to validate
   * @returns {Object|null} - Error object if validation fails, null if valid
   */
  validateRequest(mobileData) {
    // Validate required fields
    if (!mobileData.sessionId || !mobileData.userId) {
      return {
        success: false,
        message: "sessionId and userId are required"
      };
    }

    // Validate that behavioral data is present
    if (!mobileData.motionPattern && !mobileData.touchPatterns && !mobileData.typingPatterns) {
      return {
        success: false,
        message: "Behavioral data is required for similarity analysis"
      };
    }

    return null; // Valid
  }
}

export default new CheckService();
import { db } from '../configs/firebase.js';
import { collection, addDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import fetch from 'node-fetch';

// Calculation functions for behavioral data
class BehavioralService {

  // Calculate touch gesture patterns
  calculateTouchGesture(touches, sessionId) {
    if (!touches || touches.length === 0) {
      return this.getDefaultTouchGesture(sessionId);
    }

    // Calculate pressure patterns
    const pressures = touches.map(t => t.pressure).filter(p => p > 0);
    const avgPressure = pressures.length > 0 ? pressures.reduce((a, b) => a + b, 0) / pressures.length : 0;
    const pressureConsistency = this.calculateStandardDeviation(pressures);

    // Calculate touch area patterns
    const touchAreas = touches.map(t => t.touchArea).filter(a => a > 0);
    const avgTouchArea = touchAreas.length > 0 ? touchAreas.reduce((a, b) => a + b, 0) / touchAreas.length : 0;
    const areaConsistency = this.calculateStandardDeviation(touchAreas);

    // Calculate gesture timing
    const durations = touches.map(t => t.duration).filter(d => d > 0);
    const avgGestureDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const timingVariation = this.calculateStandardDeviation(durations);

    // Calculate movement patterns (for swipe/scroll gestures)
    const swipeGestures = touches.filter(t => t.gestureType === 'swipe' || t.gestureType === 'scroll');
    const velocities = swipeGestures.map(t => t.velocity).filter(v => v > 0);
    const avgSwipeVelocity = velocities.length > 0 ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 0;

    // Calculate swipe accuracy (deviation from straight line)
    const swipeAccuracy = this.calculateSwipeAccuracy(swipeGestures);

    // Calculate behavioral indicators
    const hesitationCount = this.detectHesitations(touches);
    const rapidTouchCount = this.detectRapidTouches(touches);

    // Session metadata
    const totalGestures = touches.length;
    const sessionDuration = this.calculateSessionDuration(touches);
    const riskScore = this.calculateRiskScore({
      avgPressure, pressureConsistency, avgTouchArea, areaConsistency,
      avgGestureDuration, timingVariation, avgSwipeVelocity, swipeAccuracy,
      hesitationCount, rapidTouchCount, totalGestures
    });

    return {
      sessionId,
      touches,
      avgPressure,
      pressureConsistency,
      avgTouchArea,
      areaConsistency,
      avgGestureDuration,
      timingVariation,
      avgSwipeVelocity,
      swipeAccuracy,
      hesitationCount,
      rapidTouchCount,
      totalGestures,
      sessionDuration,
      riskScore
    };
  }

  // Calculate typing patterns
  calculateTypingPattern(keystrokes, inputType) {
    if (!keystrokes || keystrokes.length === 0) {
      return this.getDefaultTypingPattern(inputType);
    }

    // Timing calculations
    const dwellTimes = keystrokes.map(k => k.dwellTime).filter(d => d > 0);
    const avgDwellTime = dwellTimes.length > 0 ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length : 0;

    const flightTimes = keystrokes.map(k => k.flightTime).filter(f => f > 0);
    const avgFlightTime = flightTimes.length > 0 ? flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length : 0;

    const timingConsistency = this.calculateStandardDeviation([...dwellTimes, ...flightTimes]);

    // Calculate typing speed (characters per minute)
    const totalDuration = this.calculateTypingDuration(keystrokes);
    const typingSpeed = totalDuration > 0 ? (keystrokes.length / totalDuration) * 60000 : 0; // CPM

    // Touch behavior
    const pressures = keystrokes.map(k => k.pressure).filter(p => p > 0);
    const avgPressure = pressures.length > 0 ? pressures.reduce((a, b) => a + b, 0) / pressures.length : 0;
    const pressureVariation = this.calculateStandardDeviation(pressures);

    // Calculate touch accuracy (distance from key center - simplified)
    const touchAccuracy = this.calculateTouchAccuracy(keystrokes);

    // Error patterns
    const errorRate = this.calculateErrorRate(keystrokes);
    const correctionSpeed = this.calculateCorrectionSpeed(keystrokes);

    // Mobile-specific features
    const autocorrectUsage = this.detectAutocorrectUsage(keystrokes);
    const predictiveTextUsage = this.detectPredictiveTextUsage(keystrokes);
    const longPauseCount = this.detectLongPauses(keystrokes);

    return {
      inputType,
      keystrokes,
      avgDwellTime,
      avgFlightTime,
      timingConsistency,
      typingSpeed,
      avgPressure,
      pressureVariation,
      touchAccuracy,
      errorRate,
      correctionSpeed,
      autocorrectUsage,
      predictiveTextUsage,
      longPauseCount,
      duration: totalDuration,
      characterCount: keystrokes.length
    };
  }

  // Calculate login behavior
  calculateLoginBehavior(loginData) {
    if (!loginData) {
      return this.getDefaultLoginBehavior();
    }

    const timestamp = loginData.timestamp || Date.now();
    const date = new Date(timestamp);

    return {
      ...loginData,
      sessionDuration: 0, // Will be updated during session
      sessionDepth: 0, // Will be updated during session
      sessionIdleTime: 0, // Will be updated during session
      timeOfDay: date.getHours(),
      dayOfWeek: date.getDay(),
      dayOfMonth: date.getDate(),
      weekOfYear: this.getWeekOfYear(date),
      loginFrequency: 0, // Will be calculated from historical data
      authAttempts: 1,
      authFailures: 0
    };
  }

  // Calculate location behavior with comprehensive analysis
  async calculateLocationBehavior(locationData, userId) {
    if (!locationData) {
      return this.getDefaultLocationBehavior();
    }

    try {
      // Get reverse geocoding data from Google Maps API
      const geocodingData = await this.reverseGeocode(locationData.latitude, locationData.longitude);

      // Get user's previous location data
      const userProfile = await this.getUserBehavioralProfile(userId);
      const lastLocation = await this.getLastUserLocation(userId);

      // Calculate distance and velocity from last login
      const distanceFromLastLogin = lastLocation ?
        this.calculateDistance(lastLocation.latitude, lastLocation.longitude, locationData.latitude, locationData.longitude) : 0;

      const velocitySinceLastLogin = lastLocation && lastLocation.timestamp ?
        this.calculateVelocity(distanceFromLastLogin, Date.now() - lastLocation.timestamp) : 0;

      // VPN and security detection
      const vpnDetection = await this.detectVPN(locationData.latitude, locationData.longitude, userId);
      const locationSpoofingScore = this.detectLocationSpoofing(locationData, velocitySinceLastLogin);

      // Check if location is known
      let isKnownLocation;
      try {
        isKnownLocation = this.isLocationKnown(geocodingData.city, userProfile?.locationProfile?.frequentLocations || {});
      } catch (error) {
        console.error('Error in isLocationKnown:', error);
        isKnownLocation = false;
      }

      // Ensure isKnownLocation is always a boolean
      if (typeof isKnownLocation !== 'boolean') {
        console.warn('isKnownLocation is not boolean, setting to false:', isKnownLocation);
        isKnownLocation = false;
      }

      // High-risk country detection
      const isHighRiskCountry = this.isHighRiskCountry(geocodingData.country);

      const locationBehavior = {
        ...locationData,
        city: geocodingData.city || 'Unknown',
        country: geocodingData.country || 'Unknown',
        isKnownLocation,
        distanceFromLastLogin: distanceFromLastLogin || 0,
        velocitySinceLastLogin: velocitySinceLastLogin || 0,
        isVpnDetected: vpnDetection.isVPN || false,
        isTorDetected: vpnDetection.isTor || false,
        isHighRiskCountry: isHighRiskCountry || false,
        locationSpoofingIndicators: locationSpoofingScore || 0
      };

      // Update user's frequent locations
      await this.updateFrequentLocations(userId, geocodingData.city);

      // Save current location for future reference
      await this.saveUserLocation(userId, {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        city: geocodingData.city,
        country: geocodingData.country,
        timestamp: Date.now()
      });

      return locationBehavior;
    } catch (error) {
      console.error('Error calculating location behavior:', error);
      return {
        ...locationData,
        city: 'Unknown',
        country: 'Unknown',
        isKnownLocation: false,
        distanceFromLastLogin: 0,
        velocitySinceLastLogin: 0,
        isVpnDetected: false,
        isTorDetected: false,
        isHighRiskCountry: false,
        locationSpoofingIndicators: 0
      };
    }
  }

  // Calculate device behavior
  calculateDeviceBehavior(deviceData) {
    if (!deviceData) {
      return this.getDefaultDeviceBehavior();
    }

    return {
      ...deviceData,
      isRooted: false, // Would need root detection algorithms
      isKnownNetwork: false // Would compare with historical networks
    };
  }

  // Calculate network behavior with tracking
  async calculateNetworkBehavior(networkData, userId) {
    if (!networkData) {
      return this.getDefaultNetworkBehavior();
    }

    try {
      // Get user's network profile
      const userProfile = await this.getUserBehavioralProfile(userId);

      // Create network identifier (combination of name and type)
      const networkIdentifier = `${networkData.networkName || 'Unknown'}_${networkData.networkType}`;

      // Check if network is known
      const isKnownNetwork = this.isNetworkKnown(networkIdentifier, userProfile?.networkProfile?.frequentNetworks || {});

      // Update frequent networks
      await this.updateFrequentNetworks(userId, networkIdentifier);

      return {
        ...networkData,
        isKnownNetwork
      };
    } catch (error) {
      console.error('Error calculating network behavior:', error);
      return {
        ...networkData,
        isKnownNetwork: false
      };
    }
  }

  // Process complete behavioral session
  async processBehavioralSession(mobileData) {
    try {
      const calculatedData = {
        sessionId: mobileData.sessionId,
        userId: mobileData.userId,
        timestamp: mobileData.timestamp || Date.now(),
        touchPatterns: [],
        typingPatterns: [],
        mousePatterns: mobileData.mousePatterns || [],
        loginBehavior: this.calculateLoginBehavior(mobileData.loginBehavior),
        locationBehavior: await this.calculateLocationBehavior(mobileData.locationBehavior, mobileData.userId),
        networkBehavior: await this.calculateNetworkBehavior(mobileData.networkBehavior, mobileData.userId),
        deviceBehavior: this.calculateDeviceBehavior(mobileData.deviceBehavior)
      };

      // Process touch patterns
      if (mobileData.touchPatterns && mobileData.touchPatterns.length > 0) {
        calculatedData.touchPatterns = mobileData.touchPatterns.map(touchGesture =>
          this.calculateTouchGesture(touchGesture.touches, mobileData.sessionId)
        );
      }

      // Process typing patterns
      if (mobileData.typingPatterns && mobileData.typingPatterns.length > 0) {
        calculatedData.typingPatterns = mobileData.typingPatterns.map(typingPattern =>
          this.calculateTypingPattern(typingPattern.keystrokes, typingPattern.inputType)
        );
      }

      return calculatedData;
    } catch (error) {
      console.error('Error processing behavioral session:', error);
      throw error;
    }
  }

  // Save calculated data to Firebase
  async saveCalculatedData(calculatedData) {
    try {
      const docRef = await addDoc(collection(db, 'calculated_behavioral_data'), {
        ...calculatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('Calculated data saved with ID:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error saving calculated data:', error);
      throw error;
    }
  }

  // Utility functions
  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  calculateSwipeAccuracy(swipeGestures) {
    if (swipeGestures.length === 0) return 0;

    let totalDeviation = 0;
    swipeGestures.forEach(gesture => {
      const expectedDistance = Math.sqrt(
        Math.pow(gesture.endX - gesture.startX, 2) +
        Math.pow(gesture.endY - gesture.startY, 2)
      );
      const actualDistance = gesture.distance || expectedDistance;
      totalDeviation += Math.abs(expectedDistance - actualDistance);
    });

    return swipeGestures.length > 0 ? totalDeviation / swipeGestures.length : 0;
  }

  detectHesitations(touches) {
    let hesitations = 0;
    for (let i = 1; i < touches.length; i++) {
      const timeDiff = touches[i].timestamp - touches[i - 1].timestamp;
      if (timeDiff > 1000) { // More than 1 second pause
        hesitations++;
      }
    }
    return hesitations;
  }

  detectRapidTouches(touches) {
    let rapidTouches = 0;
    for (let i = 1; i < touches.length; i++) {
      const timeDiff = touches[i].timestamp - touches[i - 1].timestamp;
      if (timeDiff < 100) { // Less than 100ms between touches
        rapidTouches++;
      }
    }
    return rapidTouches;
  }

  calculateSessionDuration(touches) {
    if (touches.length < 2) return 0;
    const sortedTouches = touches.sort((a, b) => a.timestamp - b.timestamp);
    return sortedTouches[sortedTouches.length - 1].timestamp - sortedTouches[0].timestamp;
  }

  calculateRiskScore(metrics) {
    // Simple risk scoring algorithm - can be enhanced with ML
    let score = 0;

    // Pressure inconsistency
    if (metrics.pressureConsistency > 0.5) score += 0.2;

    // Timing variations
    if (metrics.timingVariation > 100) score += 0.3;

    // High hesitation count
    if (metrics.hesitationCount > 5) score += 0.3;

    // Rapid touches (possible bot behavior)
    if (metrics.rapidTouchCount > 10) score += 0.2;

    return Math.min(score, 1.0); // Cap at 1.0
  }

  calculateTypingDuration(keystrokes) {
    if (keystrokes.length < 2) return 0;
    const sortedKeystrokes = keystrokes.sort((a, b) => a.timestamp - b.timestamp);
    return sortedKeystrokes[sortedKeystrokes.length - 1].timestamp - sortedKeystrokes[0].timestamp;
  }

  calculateTouchAccuracy(keystrokes) {
    // Simplified calculation - would need actual key positions
    return 0.95; // Placeholder
  }

  calculateErrorRate(keystrokes) {
    // Count backspace characters as errors
    const errors = keystrokes.filter(k => k.character === '\b' || k.character === 'Backspace').length;
    return keystrokes.length > 0 ? errors / keystrokes.length : 0;
  }

  calculateCorrectionSpeed(keystrokes) {
    // Simplified - time between error and correction
    return 500; // Placeholder in milliseconds
  }

  detectAutocorrectUsage(keystrokes) {
    // Placeholder - would need text change detection
    return 0.1;
  }

  detectPredictiveTextUsage(keystrokes) {
    // Placeholder - would need suggestion acceptance tracking
    return 0.05;
  }

  detectLongPauses(keystrokes) {
    let longPauses = 0;
    for (let i = 1; i < keystrokes.length; i++) {
      const timeDiff = keystrokes[i].timestamp - keystrokes[i - 1].timestamp;
      if (timeDiff > 2000) { // More than 2 seconds pause
        longPauses++;
      }
    }
    return longPauses;
  }

  getWeekOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek) + 1;
  }

  getDefaultTouchGesture(sessionId) {
    return {
      sessionId,
      touches: [],
      avgPressure: 0,
      pressureConsistency: 0,
      avgTouchArea: 0,
      areaConsistency: 0,
      avgGestureDuration: 0,
      timingVariation: 0,
      avgSwipeVelocity: 0,
      swipeAccuracy: 0,
      hesitationCount: 0,
      rapidTouchCount: 0,
      totalGestures: 0,
      sessionDuration: 0,
      riskScore: 0
    };
  }

  getDefaultTypingPattern(inputType) {
    return {
      inputType,
      keystrokes: [],
      avgDwellTime: 0,
      avgFlightTime: 0,
      timingConsistency: 0,
      typingSpeed: 0,
      avgPressure: 0,
      pressureVariation: 0,
      touchAccuracy: 0,
      errorRate: 0,
      correctionSpeed: 0,
      autocorrectUsage: 0,
      predictiveTextUsage: 0,
      longPauseCount: 0,
      duration: 0,
      characterCount: 0
    };
  }

  getDefaultLoginBehavior() {
    const timestamp = Date.now();
    const date = new Date(timestamp);

    return {
      timestamp,
      sessionDuration: 0,
      sessionDepth: 0,
      sessionIdleTime: 0,
      timeOfDay: date.getHours(),
      dayOfWeek: date.getDay(),
      dayOfMonth: date.getDate(),
      weekOfYear: this.getWeekOfYear(date),
      loginFrequency: 0,
      authAttempts: 1,
      authFailures: 0
    };
  }

  getDefaultLocationBehavior() {
    return {
      city: 'Unknown',
      country: 'Unknown',
      isKnownLocation: false,
      distanceFromLastLogin: 0,
      velocitySinceLastLogin: 0,
      isVpnDetected: false,
      isTorDetected: false,
      isHighRiskCountry: false,
      locationSpoofingIndicators: 0
    };
  }

  getDefaultDeviceBehavior() {
    return {
      isRooted: false,
      isKnownDevice: false
    };
  }

  getDefaultNetworkBehavior() {
    return {
      isKnownNetwork: false
    };
  }

  // OpenCage Data API integration for reverse geocoding
  async reverseGeocode(latitude, longitude) {
    try {
      const apiKey = process.env.OPEN_CAGE_API_KEY;
      if (!apiKey) {
        console.warn('OpenCage API key not found, using fallback location data');
        return { city: 'Unknown', country: 'Unknown' };
      }

      const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}%2C${longitude}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status.code === 200 && data.results.length > 0) {
        const result = data.results[0];
        const components = result.components;

        let city = 'Unknown';
        let country = 'Unknown';

        // Extract city and country from components
        // OpenCage provides various city-level components
        city = components.city ||
          components.town ||
          components.village ||
          components.municipality ||
          components.county ||
          'Unknown';

        country = components.country || 'Unknown';

        return { city, country };
      }

      return { city: 'Unknown', country: 'Unknown' };
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return { city: 'Unknown', country: 'Unknown' };
    }
  }

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Calculate velocity (km/h)
  calculateVelocity(distance, timeMs) {
    if (timeMs === 0) return 0;
    const timeHours = timeMs / (1000 * 60 * 60);
    return distance / timeHours;
  }

  // VPN and Tor detection using multiple indicators
  async detectVPN(latitude, longitude, userId) {
    try {
      // Basic VPN detection using IP geolocation discrepancies
      // This is a simplified implementation - in production, you'd use specialized services

      // Check for impossible travel speeds (basic heuristic)
      const lastLocation = await this.getLastUserLocation(userId);
      if (lastLocation) {
        const distance = this.calculateDistance(
          lastLocation.latitude, lastLocation.longitude,
          latitude, longitude
        );
        const timeDiff = Date.now() - lastLocation.timestamp;
        const velocity = this.calculateVelocity(distance, timeDiff);

        // If velocity > 1000 km/h, likely VPN or location spoofing
        if (velocity > 1000) {
          return { isVPN: true, isTor: false, confidence: 0.8 };
        }
      }

      // Additional VPN detection logic can be added here
      // For now, return basic detection
      return { isVPN: false, isTor: false, confidence: 0.1 };
    } catch (error) {
      console.error('Error in VPN detection:', error);
      return { isVPN: false, isTor: false, confidence: 0 };
    }
  }

  // Location spoofing detection
  detectLocationSpoofing(locationData, velocity) {
    let spoofingScore = 0;

    // Check for impossible velocity
    if (velocity > 1000) spoofingScore += 0.4;
    if (velocity > 500) spoofingScore += 0.2;

    // Check for suspicious accuracy values
    if (locationData.accuracy && locationData.accuracy < 1) spoofingScore += 0.2;
    if (locationData.accuracy && locationData.accuracy > 1000) spoofingScore += 0.1;

    // Check for altitude anomalies (if available)
    if (locationData.altitude && Math.abs(locationData.altitude) > 10000) spoofingScore += 0.1;

    return Math.min(spoofingScore, 1.0);
  }

  // High-risk country detection
  isHighRiskCountry(country) {
    const highRiskCountries = [
      'North Korea', 'Iran', 'Syria', 'Afghanistan', 'Somalia',
      'Yemen', 'Libya', 'Sudan', 'Venezuela', 'Myanmar'
    ];
    return highRiskCountries.includes(country);
  }

  // Check if location is known
  isLocationKnown(city, frequentLocations) {
    if (!city || typeof city !== 'string') {
      return false;
    }
    if (!frequentLocations || typeof frequentLocations !== 'object') {
      return false;
    }
    return !!(frequentLocations[city] && frequentLocations[city] > 0);
  }

  // Check if network is known
  isNetworkKnown(networkIdentifier, frequentNetworks) {
    return !!(frequentNetworks && frequentNetworks[networkIdentifier] && frequentNetworks[networkIdentifier] > 0);
  }

  // User profile management
  async getUserBehavioralProfile(userId) {
    try {
      const docRef = doc(db, 'user_behavioral_profiles', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      }

      // Create default profile if doesn't exist
      const defaultProfile = {
        userId,
        lastUpdated: Date.now(),
        touchProfile: {
          avgPressure: 0,
          pressureConsistency: 0,
          avgTouchArea: 0,
          gestureFrequency: {}
        },
        typingProfile: {
          avgTypingSpeed: 0,
          avgDwellTime: 0,
          avgFlightTime: 0,
          timingConsistency: 0,
          avgErrorRate: 0
        },
        motionProfile: {
          avgVelocity: 0,
          avgAcceleration: 0,
          orientationChangeRate: 0
        },
        authProfile: {
          avgAuthAttempts: 0,
          authSuccessRate: 0,
          biometricSuccessRate: 0
        },
        locationProfile: {
          vpnUsageRate: 0,
          highRiskLocationRate: 0,
          frequentLocations: {}
        },
        networkProfile: {
          frequentNetworks: {}
        },
        riskProfile: {
          NewRegistrationAttempts: 0,
          fraudAttempts: 0,
          loginFrequency: 0
        }
      };

      await setDoc(docRef, defaultProfile);
      return defaultProfile;
    } catch (error) {
      console.error('Error getting user behavioral profile:', error);
      return null;
    }
  }

  // Update frequent locations
  async updateFrequentLocations(userId, city) {
    try {
      const profile = await this.getUserBehavioralProfile(userId);
      if (!profile) return;

      const frequentLocations = profile.locationProfile.frequentLocations || {};

      // Increment count for location
      frequentLocations[city] = (frequentLocations[city] || 0) + 1;

      // Keep only top 10 most frequent locations
      const sortedEntries = Object.entries(frequentLocations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const trimmedLocations = Object.fromEntries(sortedEntries);

      // Update profile
      const docRef = doc(db, 'user_behavioral_profiles', userId);
      await updateDoc(docRef, {
        'locationProfile.frequentLocations': trimmedLocations,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Error updating frequent locations:', error);
    }
  }

  // Update frequent networks
  async updateFrequentNetworks(userId, networkIdentifier) {
    try {
      const profile = await this.getUserBehavioralProfile(userId);
      if (!profile) return;

      const frequentNetworks = profile.networkProfile.frequentNetworks || {};

      // Increment count for network
      frequentNetworks[networkIdentifier] = (frequentNetworks[networkIdentifier] || 0) + 1;

      // Keep only top 10 most frequent networks
      const sortedEntries = Object.entries(frequentNetworks)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const trimmedNetworks = Object.fromEntries(sortedEntries);

      // Update profile
      const docRef = doc(db, 'user_behavioral_profiles', userId);
      await updateDoc(docRef, {
        'networkProfile.frequentNetworks': trimmedNetworks,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Error updating frequent networks:', error);
    }
  }

  // Save user location for future reference
  async saveUserLocation(userId, locationData) {
    try {
      const docRef = doc(db, 'user_locations', `${userId}_latest`);
      await setDoc(docRef, locationData);
    } catch (error) {
      console.error('Error saving user location:', error);
    }
  }

  // Get last user location
  async getLastUserLocation(userId) {
    try {
      const docRef = doc(db, 'user_locations', `${userId}_latest`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      }

      return null;
    } catch (error) {
      console.error('Error getting last user location:', error);
      return null;
    }
  }
}

export default new BehavioralService();
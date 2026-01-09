import { Pinecone } from '@pinecone-database/pinecone';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

class VectorService {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    this.encodingApiUrl = process.env.ENCODING_API_URL || 'http://localhost:8000';
    this.initialized = false;
    this.initPromise = null;
  }

  async ensureInitialized() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initializeIndexes();
    await this.initPromise;
    this.initialized = true;
  }

  // Initialize Pinecone indexes
  async initializeIndexes() {
    try {
      const indexes = ['motion-embeddings', 'gesture-embeddings', 'typing-embeddings'];

      for (const indexName of indexes) {
        try {
          await this.pinecone.describeIndex(indexName);
          console.log(`Index ${indexName} already exists`);
        } catch (error) {
          if (error.status === 404) {
            console.log(`Creating index: ${indexName}`);
            await this.pinecone.createIndex({
              name: indexName,
              dimension: 256,
              metric: 'cosine',
              spec: {
                serverless: {
                  cloud: 'aws',
                  region: 'us-east-1'
                }
              }
            });
          } else {
            console.error(`Error checking index ${indexName}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing Pinecone indexes:', error);
    }
  }

  // Extract and format motion data
  extractMotionData(motionPatterns) {
    console.log('extractMotionData called with', motionPatterns?.length || 0, 'motion patterns');
    if (!motionPatterns || motionPatterns.length === 0) {
      console.log('No motion patterns provided');
      return null;
    }

    const accel_x = [];
    const accel_y = [];
    const accel_z = [];
    const gyro_x = [];
    const gyro_y = [];
    const gyro_z = [];
    const mag_x = [];
    const mag_y = [];
    const mag_z = [];
    const motion_magnitude = [];
    const rotation_rate = [];

    motionPatterns.forEach(pattern => {
      // Handle nested structure with samples
      if (pattern.samples && pattern.samples.length > 0) {
        pattern.samples.forEach(sample => {
          if (sample.accelerometer) {
            accel_x.push(sample.accelerometer.x || 0);
            accel_y.push(sample.accelerometer.y || 0);
            accel_z.push(sample.accelerometer.z || 0);
          }
          if (sample.gyroscope) {
            gyro_x.push(sample.gyroscope.x || 0);
            gyro_y.push(sample.gyroscope.y || 0);
            gyro_z.push(sample.gyroscope.z || 0);
          }
          if (sample.magnetometer) {
            mag_x.push(sample.magnetometer.x || 0);
            mag_y.push(sample.magnetometer.y || 0);
            mag_z.push(sample.magnetometer.z || 0);
          }
          // Calculate motion magnitude if accelerometer data exists
          if (sample.accelerometer) {
            const magnitude = Math.sqrt(
              Math.pow(sample.accelerometer.x || 0, 2) +
              Math.pow(sample.accelerometer.y || 0, 2) +
              Math.pow(sample.accelerometer.z || 0, 2)
            );
            motion_magnitude.push(magnitude);
          }
          // Calculate rotation rate if gyroscope data exists
          if (sample.gyroscope) {
            const rate = Math.sqrt(
              Math.pow(sample.gyroscope.x || 0, 2) +
              Math.pow(sample.gyroscope.y || 0, 2) +
              Math.pow(sample.gyroscope.z || 0, 2)
            );
            rotation_rate.push(rate);
          }
        });
      }
      // Handle array structure with accelerometer and gyroscope arrays
      else if (pattern.accelerometer && Array.isArray(pattern.accelerometer) && pattern.accelerometer.length >= 3) {
        // Extract accelerometer data from array [x, y, z]
        const ax = pattern.accelerometer[0] || 0;
        const ay = pattern.accelerometer[1] || 0;
        const az = pattern.accelerometer[2] || 0;
        accel_x.push(ax);
        accel_y.push(ay);
        accel_z.push(az);

        // Extract gyroscope data from array [x, y, z]
        const gx = (pattern.gyroscope && pattern.gyroscope[0]) || 0;
        const gy = (pattern.gyroscope && pattern.gyroscope[1]) || 0;
        const gz = (pattern.gyroscope && pattern.gyroscope[2]) || 0;
        gyro_x.push(gx);
        gyro_y.push(gy);
        gyro_z.push(gz);

        // Extract or default magnetometer data from array [x, y, z]
        const mx = (pattern.magnetometer && pattern.magnetometer[0]) || 0;
        const my = (pattern.magnetometer && pattern.magnetometer[1]) || 0;
        const mz = (pattern.magnetometer && pattern.magnetometer[2]) || 0;
        mag_x.push(mx);
        mag_y.push(my);
        mag_z.push(mz);

        // Calculate motion magnitude
        const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);
        motion_magnitude.push(magnitude);

        // Calculate rotation rate
        const rate = Math.sqrt(gx * gx + gy * gy + gz * gz);
        rotation_rate.push(rate);
      }
      // Handle flat structure with direct accel_x, accel_y, etc. properties
      else if (pattern.accel_x !== undefined || pattern.gyro_x !== undefined) {
        // Extract accelerometer data
        const ax = pattern.accel_x || 0;
        const ay = pattern.accel_y || 0;
        const az = pattern.accel_z || 0;
        accel_x.push(ax);
        accel_y.push(ay);
        accel_z.push(az);

        // Extract gyroscope data
        const gx = pattern.gyro_x || 0;
        const gy = pattern.gyro_y || 0;
        const gz = pattern.gyro_z || 0;
        gyro_x.push(gx);
        gyro_y.push(gy);
        gyro_z.push(gz);

        // Extract or default magnetometer data
        const mx = pattern.mag_x || 0;
        const my = pattern.mag_y || 0;
        const mz = pattern.mag_z || 0;
        mag_x.push(mx);
        mag_y.push(my);
        mag_z.push(mz);

        // Calculate motion magnitude
        const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);
        motion_magnitude.push(magnitude);

        // Calculate rotation rate
        const rate = Math.sqrt(gx * gx + gy * gy + gz * gz);
        rotation_rate.push(rate);
      }
    });

    if (accel_x.length === 0 && gyro_x.length === 0) {
      console.log('No valid motion data found');
      return null;
    }

    // Format data according to motion encoder requirements:
    // The API expects data with 'accelerometer', 'gyroscope', and 'magnetometer' keys
    // Each containing arrays of [x, y, z] values for each time point
    const accelerometer = [];
    const gyroscope = [];
    const magnetometer = [];

    // Convert separate feature arrays back to grouped format
    for (let i = 0; i < accel_x.length; i++) {
      accelerometer.push([accel_x[i], accel_y[i], accel_z[i]]);
      gyroscope.push([gyro_x[i], gyro_y[i], gyro_z[i]]);
      magnetometer.push([mag_x[i], mag_y[i], mag_z[i]]);
    }

    const result = {
      data: {
        accelerometer: accelerometer,
        gyroscope: gyroscope,
        magnetometer: magnetometer
      }
    };

    console.log('[MOTION DATA DEBUG] Final formatted data with 11 features extracted');
    console.log(`[MOTION DATA DEBUG] Sample count: ${accel_x.length}, Features: 11`);

    return result;
  }

  // Extract and format gesture data
  extractGestureData(touchPatterns) {
    console.log('extractGestureData called with', touchPatterns?.length || 0, 'touch patterns');
    if (!touchPatterns || touchPatterns.length === 0) {
      console.log('No touch patterns provided');
      return null;
    }

    const gestures = [];

    touchPatterns.forEach(pattern => {
      // Handle nested structure with touches
      if (pattern.touches && pattern.touches.length > 0) {
        pattern.touches.forEach(touch => {
          gestures.push({
            distance: touch.distance || 0,
            duration: touch.duration || 0,
            endX: touch.endX || 0,
            endY: touch.endY || 0,
            startX: touch.startX || 0,
            startY: touch.startY || 0,
            velocity: touch.velocity || 0
          });
        });
      }
      // Handle flat structure with direct x, y, pressure, size, action properties
      else if (pattern.x !== undefined || pattern.y !== undefined) {
        gestures.push({
          distance: 0, // Will be calculated if needed
          duration: 0, // Will be calculated if needed
          endX: pattern.x || 0,
          endY: pattern.y || 0,
          startX: pattern.x || 0,
          startY: pattern.y || 0,
          velocity: 0, // Will be calculated if needed
          pressure: pattern.pressure || 0,
          size: pattern.size || 0,
          action: pattern.action || 'unknown',
          timestamp: pattern.timestamp || 0
        });
      }
    });

    if (gestures.length === 0) {
      return null;
    }

    return {
      data: gestures
    };
  }

  // Extract and format typing data
  extractTypingData(typingPatterns) {
    console.log('extractTypingData called with', typingPatterns?.length || 0, 'typing patterns');
    if (!typingPatterns || typingPatterns.length === 0) {
      console.log('No typing patterns provided');
      return null;
    }

    const keystrokes = [];

    typingPatterns.forEach(pattern => {
      // Handle nested structure with keystrokes
      if (pattern.keystrokes && pattern.keystrokes.length > 0) {
        pattern.keystrokes.forEach(keystroke => {
          keystrokes.push({
            character: keystroke.character || '',
            dwellTime: keystroke.dwellTime || 0,
            flightTime: keystroke.flightTime || 0,
            coordinate_x: keystroke.coordinate_x || 0,
            coordinate_y: keystroke.coordinate_y || 0
          });
        });
      }
      // Handle flat structure with direct character, dwellTime, flightTime properties
      else if (pattern.character !== undefined || pattern.key !== undefined) {
        const dwellTime = pattern.dwellTime || (pattern.releaseTime && pattern.pressTime ? pattern.releaseTime - pattern.pressTime : 0);
        keystrokes.push({
          character: pattern.character || pattern.key || '',
          dwellTime: dwellTime,
          flightTime: pattern.flightTime || 0,
          coordinate_x: pattern.coordinate_x || 0,
          coordinate_y: pattern.coordinate_y || 0,
          timestamp: pattern.timestamp || 0
        });
      }
    });

    if (keystrokes.length === 0) {
      return null;
    }

    return {
      data: keystrokes
    };
  }

  // Call external encoding API
  async callEncodingAPI(endpoint, data) {
    try {
      console.log(`[ENCODER API] Making request to: ${this.encodingApiUrl}${endpoint}`);

      const response = await fetch(`${this.encodingApiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      console.log(`[ENCODER API] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ENCODER API] Error response body:`, errorText);
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`[ENCODER API] ✅ Successfully received embedding response`);
      return result;
    } catch (error) {
      console.error(`[ENCODER API] Error calling encoding API ${endpoint}:`, error);
      throw error;
    }
  }

  // Store embedding in Pinecone
  async storeEmbedding(indexName, userId, sessionId, embeddingResponse, metadata = {}) {
    try {
      console.log(`[STORAGE] Storing ${indexName} vector for user ${userId}`);

      await this.ensureInitialized();
      const index = this.pinecone.index(indexName);

      const vectorId = `${userId}_${sessionId}_${Date.now()}`;

      const upsertData = [{
        id: vectorId,
        values: embeddingResponse.embedding,
        metadata: {
          userId,
          sessionId,
          timestamp: embeddingResponse.timestamp || new Date().toISOString(),
          embedding_size: embeddingResponse.embedding_size,
          model_type: embeddingResponse.model_type,
          ...metadata
        }
      }];

      await index.upsert(upsertData);
      console.log(`[STORAGE] ✅ Successfully stored vector in ${indexName}`);

      return {
        success: true,
        vectorId,
        embedding_size: embeddingResponse.embedding_size,
        model_type: embeddingResponse.model_type
      };
    } catch (error) {
      console.error(`[STORAGE] ❌ Error storing embedding in ${indexName}:`, error);
      console.error(`[STORAGE] Error details:`, {
        message: error.message,
        stack: error.stack,
        userId,
        sessionId,
        indexName
      });
      throw error;
    }
  }

  // Process motion data - extract, encode, and store
  async processMotionData(userId, sessionId, motionPatterns) {
    try {
      console.log(`[MOTION PROCESSING] Starting motion data processing for user: ${userId}, session: ${sessionId}`);
      const motionData = this.extractMotionData(motionPatterns);
      if (!motionData) {
        console.log(`[MOTION PROCESSING] No motion data extracted`);
        return { success: false, message: 'No motion data to process' };
      }

      console.log(`[MOTION PROCESSING] Motion data extracted successfully, calling encoding API...`);
      const embedding = await this.callEncodingAPI('/encode/motion', motionData);
      const storeResult = await this.storeEmbedding('motion-embeddings', userId, sessionId, embedding, {
        dataType: 'motion',
        sampleCount: motionData.data.accelerometer.length
      });

      return {
        success: true,
        type: 'motion',
        embedding: storeResult,
        apiResponse: embedding
      };
    } catch (error) {
      console.error('Error processing motion data:', error);
      return { success: false, error: error.message };
    }
  }

  // Process gesture data - extract, encode, and store
  async processGestureData(userId, sessionId, touchPatterns) {
    try {
      console.log(`[GESTURE PROCESSING] Starting gesture data processing for user: ${userId}, session: ${sessionId}`);
      const gestureData = this.extractGestureData(touchPatterns);
      if (!gestureData) {
        console.log(`[GESTURE PROCESSING] No gesture data extracted`);
        return { success: false, message: 'No gesture data to process' };
      }

      console.log(`[GESTURE PROCESSING] Gesture data extracted successfully, calling encoding API...`);
      const embedding = await this.callEncodingAPI('/encode/gesture', { data: gestureData.data });
      const storeResult = await this.storeEmbedding('gesture-embeddings', userId, sessionId, embedding, {
        dataType: 'gesture',
        gestureCount: gestureData.data.length
      });

      return {
        success: true,
        type: 'gesture',
        embedding: storeResult,
        apiResponse: embedding
      };
    } catch (error) {
      console.error('Error processing gesture data:', error);
      return { success: false, error: error.message };
    }
  }

  // Process typing data - extract, encode, and store
  async processTypingData(userId, sessionId, typingPatterns) {
    try {
      console.log(`[TYPING PROCESSING] Starting typing data processing for user: ${userId}, session: ${sessionId}`);
      const typingData = this.extractTypingData(typingPatterns);
      if (!typingData) {
        console.log(`[TYPING PROCESSING] No typing data extracted`);
        return { success: false, message: 'No typing data to process' };
      }

      console.log(`[TYPING PROCESSING] Typing data extracted successfully, calling encoding API...`);
      const embedding = await this.callEncodingAPI('/encode/typing', { data: typingData.data });
      const storeResult = await this.storeEmbedding('typing-embeddings', userId, sessionId, embedding, {
        dataType: 'typing',
        keystrokeCount: typingData.data.length
      });

      return {
        success: true,
        type: 'typing',
        embedding: storeResult,
        apiResponse: embedding
      };
    } catch (error) {
      console.error('Error processing typing data:', error);
      return { success: false, error: error.message };
    }
  }

  // Batch processing methods
  async processBatchMotionData(userId, sessionId, motionDataArray) {
    try {
      if (!motionDataArray || motionDataArray.length === 0) {
        return { success: false, message: 'No motion data to process' };
      }

      const batchData = { data: motionDataArray };
      const embedding = await this.callEncodingAPI('/encode/motion/batch', batchData);

      const results = [];
      for (let i = 0; i < embedding.embeddings.length; i++) {
        const singleEmbedding = {
          embedding: embedding.embeddings[i],
          embedding_size: embedding.embedding_size,
          model_type: embedding.model_type,
          timestamp: embedding.timestamp
        };

        const storeResult = await this.storeEmbedding('motion-embeddings', userId, `${sessionId}_batch_${i}`, singleEmbedding, {
          dataType: 'motion',
          batchIndex: i,
          batchSize: embedding.count
        });

        results.push(storeResult);
      }

      return {
        success: true,
        type: 'motion_batch',
        count: embedding.count,
        results,
        apiResponse: embedding
      };
    } catch (error) {
      console.error('Error processing batch motion data:', error);
      return { success: false, error: error.message };
    }
  }

  async processBatchGestureData(userId, sessionId, gestureDataArray) {
    try {
      if (!gestureDataArray || gestureDataArray.length === 0) {
        return { success: false, message: 'No gesture data to process' };
      }

      const batchData = { data: gestureDataArray };
      const embedding = await this.callEncodingAPI('/encode/gesture/batch', batchData);

      const results = [];
      for (let i = 0; i < embedding.embeddings.length; i++) {
        const singleEmbedding = {
          embedding: embedding.embeddings[i],
          embedding_size: embedding.embedding_size,
          model_type: embedding.model_type,
          timestamp: embedding.timestamp
        };

        const storeResult = await this.storeEmbedding('gesture-embeddings', userId, `${sessionId}_batch_${i}`, singleEmbedding, {
          dataType: 'gesture',
          batchIndex: i,
          batchSize: embedding.count
        });

        results.push(storeResult);
      }

      return {
        success: true,
        type: 'gesture_batch',
        count: embedding.count,
        results,
        apiResponse: embedding
      };
    } catch (error) {
      console.error('Error processing batch gesture data:', error);
      return { success: false, error: error.message };
    }
  }

  async processBatchTypingData(userId, sessionId, typingDataArray) {
    try {
      if (!typingDataArray || typingDataArray.length === 0) {
        return { success: false, message: 'No typing data to process' };
      }

      const batchData = { data: typingDataArray };
      const embedding = await this.callEncodingAPI('/encode/typing/batch', batchData);

      const results = [];
      for (let i = 0; i < embedding.embeddings.length; i++) {
        const singleEmbedding = {
          embedding: embedding.embeddings[i],
          embedding_size: embedding.embedding_size,
          model_type: embedding.model_type,
          timestamp: embedding.timestamp
        };

        const storeResult = await this.storeEmbedding('typing-embeddings', userId, `${sessionId}_batch_${i}`, singleEmbedding, {
          dataType: 'typing',
          batchIndex: i,
          batchSize: embedding.count
        });

        results.push(storeResult);
      }

      return {
        success: true,
        type: 'typing_batch',
        count: embedding.count,
        results,
        apiResponse: embedding
      };
    } catch (error) {
      console.error('Error processing batch typing data:', error);
      return { success: false, error: error.message };
    }
  }

  // Process all behavioral data types
  async processAllBehavioralData(userId, sessionId, behavioralData) {
    const results = {
      motion: null,
      gesture: null,
      typing: null,
      summary: {
        processed: 0,
        failed: 0,
        total: 0
      }
    };

    // Process motion data
    if (behavioralData.motionPattern && behavioralData.motionPattern.length > 0) {
      results.summary.total++;
      console.log('Processing motion data for user:', userId, 'session:', sessionId);
      results.motion = await this.processMotionData(userId, sessionId, behavioralData.motionPattern);
      if (results.motion.success) {
        results.summary.processed++;
        console.log('✅ Motion data processed successfully');
      } else {
        results.summary.failed++;
        console.log('❌ Motion data processing failed:', results.motion.error || results.motion.message);
      }
    }

    // Process gesture data
    if (behavioralData.touchPatterns && behavioralData.touchPatterns.length > 0) {
      results.summary.total++;
      console.log('Processing gesture data for user:', userId, 'session:', sessionId);
      results.gesture = await this.processGestureData(userId, sessionId, behavioralData.touchPatterns);
      if (results.gesture.success) {
        results.summary.processed++;
        console.log('✅ Gesture data processed successfully');
      } else {
        results.summary.failed++;
        console.log('❌ Gesture data processing failed:', results.gesture.error || results.gesture.message);
      }
    }

    // Process typing data
    if (behavioralData.typingPatterns && behavioralData.typingPatterns.length > 0) {
      results.summary.total++;
      console.log('Processing typing data for user:', userId, 'session:', sessionId);
      results.typing = await this.processTypingData(userId, sessionId, behavioralData.typingPatterns);
      if (results.typing.success) {
        results.summary.processed++;
        console.log('✅ Typing data processed successfully');
      } else {
        results.summary.failed++;
        console.log('❌ Typing data processing failed:', results.typing.error || results.typing.message);
      }
    }

    return results;
  }

  // Query similar vectors from Pinecone
  async querySimilarVectors(indexName, queryVector, userId, topK = 5) {
    try {
      const index = this.pinecone.index(indexName);

      const queryResponse = await index.query({
        vector: queryVector,
        topK,
        filter: { userId },
        includeMetadata: true
      });

      return {
        success: true,
        matches: queryResponse.matches
      };
    } catch (error) {
      console.error(`Error querying ${indexName}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Process behavioral data for similarity check
  async processBehavioralDataForCheck(userId, sessionId, behavioralData) {
    const results = {
      motion: null,
      gesture: null,
      typing: null,
      summary: {
        processed: 0,
        failed: 0,
        total: 0,
        averageSimilarity: 0,
        maxSimilarity: 0,
        minSimilarity: 1
      }
    };

    const similarities = [];

    // Process motion data
    if (behavioralData.motionPattern && behavioralData.motionPattern.length > 0) {
      results.summary.total++;
      try {
        const motionData = this.extractMotionData(behavioralData.motionPattern);
        if (motionData) {
          const embedding = await this.callEncodingAPI('/encode/motion', motionData);
          const similarVectors = await this.querySimilarVectors('motion-embeddings', embedding.embedding, userId, 10);

          if (similarVectors.success && similarVectors.matches.length > 0) {
            const topSimilarity = similarVectors.matches[0].score;
            similarities.push(topSimilarity);

            results.motion = {
              success: true,
              type: 'motion',
              similarity: topSimilarity,
              matchCount: similarVectors.matches.length,
              topMatches: similarVectors.matches.slice(0, 3).map(match => ({
                score: match.score,
                sessionId: match.metadata.sessionId,
                timestamp: match.metadata.timestamp
              }))
            };
            results.summary.processed++;
          } else {
            results.motion = { success: false, message: 'No similar motion patterns found' };
            results.summary.failed++;
          }
        } else {
          results.motion = { success: false, message: 'No motion data to process' };
          results.summary.failed++;
        }
      } catch (error) {
        console.error('Error processing motion data for check:', error);
        results.motion = { success: false, error: error.message };
        results.summary.failed++;
      }
    }

    // Process gesture data
    if (behavioralData.touchPatterns && behavioralData.touchPatterns.length > 0) {
      results.summary.total++;
      try {
        const gestureData = this.extractGestureData(behavioralData.touchPatterns);
        if (gestureData) {
          const embedding = await this.callEncodingAPI('/encode/gesture', gestureData);
          const similarVectors = await this.querySimilarVectors('gesture-embeddings', embedding.embedding, userId, 10);

          if (similarVectors.success && similarVectors.matches.length > 0) {
            const topSimilarity = similarVectors.matches[0].score;
            similarities.push(topSimilarity);

            results.gesture = {
              success: true,
              type: 'gesture',
              similarity: topSimilarity,
              matchCount: similarVectors.matches.length,
              topMatches: similarVectors.matches.slice(0, 3).map(match => ({
                score: match.score,
                sessionId: match.metadata.sessionId,
                timestamp: match.metadata.timestamp
              }))
            };
            results.summary.processed++;
          } else {
            results.gesture = { success: false, message: 'No similar gesture patterns found' };
            results.summary.failed++;
          }
        } else {
          results.gesture = { success: false, message: 'No gesture data to process' };
          results.summary.failed++;
        }
      } catch (error) {
        console.error('Error processing gesture data for check:', error);
        results.gesture = { success: false, error: error.message };
        results.summary.failed++;
      }
    }

    // Process typing data
    if (behavioralData.typingPatterns && behavioralData.typingPatterns.length > 0) {
      results.summary.total++;
      try {
        const typingData = this.extractTypingData(behavioralData.typingPatterns);
        if (typingData) {
          const embedding = await this.callEncodingAPI('/encode/typing', typingData);
          const similarVectors = await this.querySimilarVectors('typing-embeddings', embedding.embedding, userId, 10);

          if (similarVectors.success && similarVectors.matches.length > 0) {
            const topSimilarity = similarVectors.matches[0].score;
            similarities.push(topSimilarity);

            results.typing = {
              success: true,
              type: 'typing',
              similarity: topSimilarity,
              matchCount: similarVectors.matches.length,
              topMatches: similarVectors.matches.slice(0, 3).map(match => ({
                score: match.score,
                sessionId: match.metadata.sessionId,
                timestamp: match.metadata.timestamp
              }))
            };
            results.summary.processed++;
          } else {
            results.typing = { success: false, message: 'No similar typing patterns found' };
            results.summary.failed++;
          }
        } else {
          results.typing = { success: false, message: 'No typing data to process' };
          results.summary.failed++;
        }
      } catch (error) {
        console.error('Error processing typing data for check:', error);
        results.typing = { success: false, error: error.message };
        results.summary.failed++;
      }
    }

    // Calculate summary statistics
    if (similarities.length > 0) {
      results.summary.averageSimilarity = similarities.reduce((sum, score) => sum + score, 0) / similarities.length;
      results.summary.maxSimilarity = Math.max(...similarities);
      results.summary.minSimilarity = Math.min(...similarities);
    }

    return results;
  }

  // Calculate risk score based on similarity results
  calculateRiskScore(similarityResults) {
    const { summary } = similarityResults;

    // If no data was processed, return high risk
    if (summary.total === 0 || summary.processed === 0) {
      return {
        riskScore: 0.9,
        riskLevel: 'HIGH',
        reason: 'No behavioral data available for comparison'
      };
    }

    // If all processing failed, return high risk
    if (summary.failed === summary.total) {
      return {
        riskScore: 0.85,
        riskLevel: 'HIGH',
        reason: 'Failed to process behavioral data'
      };
    }

    const avgSimilarity = summary.averageSimilarity;
    const maxSimilarity = summary.maxSimilarity;
    const processedRatio = summary.processed / summary.total;

    // Calculate base risk score (inverse of similarity)
    let riskScore = 1 - avgSimilarity;

    // Adjust based on processing success rate
    riskScore += (1 - processedRatio) * 0.2;

    // Adjust based on maximum similarity (if at least one pattern matches well)
    if (maxSimilarity > 0.8) {
      riskScore *= 0.7; // Reduce risk if we have a strong match
    } else if (maxSimilarity > 0.6) {
      riskScore *= 0.85; // Moderate reduction
    }

    // Ensure risk score is between 0 and 1
    riskScore = Math.max(0, Math.min(1, riskScore));

    // Determine risk level
    let riskLevel;
    let reason;

    if (riskScore >= 0.7) {
      riskLevel = 'HIGH';
      reason = `Low behavioral similarity (avg: ${(avgSimilarity * 100).toFixed(1)}%)`;
    } else if (riskScore >= 0.4) {
      riskLevel = 'MEDIUM';
      reason = `Moderate behavioral similarity (avg: ${(avgSimilarity * 100).toFixed(1)}%)`;
    } else {
      riskLevel = 'LOW';
      reason = `High behavioral similarity (avg: ${(avgSimilarity * 100).toFixed(1)}%)`;
    }

    return {
      riskScore: Math.round(riskScore * 100) / 100,
      riskLevel,
      reason,
      similarityStats: {
        average: Math.round(avgSimilarity * 100) / 100,
        maximum: Math.round(maxSimilarity * 100) / 100,
        minimum: Math.round(summary.minSimilarity * 100) / 100
      }
    };
  }
}

export default new VectorService();
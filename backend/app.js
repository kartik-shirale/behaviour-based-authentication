import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import twilio from "twilio";
import fetch from "node-fetch";
import userService from "./services/userService.js";
import vectorService from "./services/vectorService.js";
import checkService from "./services/checkService.js";
import 'dotenv/config';


dotenv.config();

const app = express();

// Middleware

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }))
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(compression());

// Twilio client initialization
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);


// Utility functions
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const isOTPExpired = (expiryTime) => {
  return new Date() > new Date(expiryTime);
};

// Validation middleware
const validatePhoneNumber = (req, res, next) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({
      success: false,
      message: "Mobile number is required",
    });
  }

  // Validate +91 prefix for Indian mobile numbers
  const phoneRegex = /^\+91[6-9]\d{9}$/;
  if (!phoneRegex.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: "Invalid mobile number format. Must be +91 followed by 10 digits starting with 6-9",
    });
  }

  next();
};

// Routes

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "finshield-backend"
  });
});

// Detailed Status
app.get("/status", async (req, res) => {
  try {
    // Check Pinecone connection
    let pineconeStatus = "unknown";
    try {
      await vectorService.pinecone.listIndexes();
      pineconeStatus = "connected";
    } catch (error) {
      pineconeStatus = "disconnected";
    }

    // Check encoding API
    let encodingApiStatus = "unknown";
    try {
      const response = await fetch(`${vectorService.encodingApiUrl}/health`);
      encodingApiStatus = response.ok ? "connected" : "error";
    } catch (error) {
      encodingApiStatus = "disconnected";
    }

    res.json({
      status: "operational",
      timestamp: new Date().toISOString(),
      service: "finshield-backend",
      version: "1.0.0",
      components: {
        database: "firebase",
        vectorDatabase: {
          provider: "pinecone",
          status: pineconeStatus
        },
        encodingApi: {
          url: vectorService.encodingApiUrl,
          status: encodingApiStatus
        }
      },
      configuration: {
        environment: process.env.NODE_ENV || "development",
        maxBatchSize: 100
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Motion Encoding
app.post("/encode/motion", async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: "Missing data field",
        error_type: "ValidationError",
        timestamp: new Date().toISOString()
      });
    }

    const response = await vectorService.callEncodingAPI('/encode/motion', { data });
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_type: "ProcessingError",
      timestamp: new Date().toISOString()
    });
  }
});

// Gesture Encoding
app.post("/encode/gesture", async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: "Missing data field",
        error_type: "ValidationError",
        timestamp: new Date().toISOString()
      });
    }

    const response = await vectorService.callEncodingAPI('/encode/gesture', { data });
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_type: "ProcessingError",
      timestamp: new Date().toISOString()
    });
  }
});

// Typing Encoding
app.post("/encode/typing", async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: "Missing data field",
        error_type: "ValidationError",
        timestamp: new Date().toISOString()
      });
    }

    const response = await vectorService.callEncodingAPI('/encode/typing', { data });
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_type: "ProcessingError",
      timestamp: new Date().toISOString()
    });
  }
});

// Batch Motion Encoding
app.post("/encode/motion/batch", async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid data field - must be an array",
        error_type: "ValidationError",
        timestamp: new Date().toISOString()
      });
    }

    if (data.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Batch size exceeds maximum limit of 100",
        error_type: "ValidationError",
        timestamp: new Date().toISOString()
      });
    }

    const response = await vectorService.callEncodingAPI('/encode/motion/batch', { data });
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_type: "ProcessingError",
      timestamp: new Date().toISOString()
    });
  }
});

// Batch Gesture Encoding
app.post("/encode/gesture/batch", async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid data field - must be an array",
        error_type: "ValidationError",
        timestamp: new Date().toISOString()
      });
    }

    if (data.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Batch size exceeds maximum limit of 100",
        error_type: "ValidationError",
        timestamp: new Date().toISOString()
      });
    }

    const response = await vectorService.callEncodingAPI('/encode/gesture/batch', { data });
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_type: "ProcessingError",
      timestamp: new Date().toISOString()
    });
  }
});

// Batch Typing Encoding
app.post("/encode/typing/batch", async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid data field - must be an array",
        error_type: "ValidationError",
        timestamp: new Date().toISOString()
      });
    }

    if (data.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Batch size exceeds maximum limit of 100",
        error_type: "ValidationError",
        timestamp: new Date().toISOString()
      });
    }

    const response = await vectorService.callEncodingAPI('/encode/typing/batch', { data });
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_type: "ProcessingError",
      timestamp: new Date().toISOString()
    });
  }
});

// Send OTP
app.post("/api/send-otp", validatePhoneNumber, async (req, res) => {
  try {
    const { mobile, hash } = req.body;

    // Check if user exists in Firebase
    const existingUser = await userService.findUserByMobile(mobile);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please register first.",
        code: "USER_NOT_FOUND"
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Update user's OTP in Firebase
    await userService.updateUserOTP(existingUser.id, otp, otpExpiry);

    // Prepare OTP message with hash if provided
    let otpMessage = `Your FinShield verification code is: ${otp}. Valid for 10 minutes.`;
    if (hash) {
      otpMessage += ` ${hash}`;
    }

    // Send OTP via Twilio
    try {
      await twilioClient.messages.create({
        body: otpMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: mobile,
      });

      console.log(`OTP ${otp} sent to ${mobile}${hash ? ` with hash: ${hash}` : ''}`);

      res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        data: {
          mobile,
          expiresIn: "10 minutes",
        },
      });
    } catch (twilioError) {
      console.error("Twilio error:", twilioError);

      // Clear the OTP from Firebase if SMS fails
      await userService.clearUserOTP(existingUser.id);

      res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Verify OTP
app.post("/api/verify-otp", validatePhoneNumber, async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    // Find user in Firebase
    const user = await userService.findUserByMobile(mobile);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please send OTP first.",
      });
    }

    // Check if OTP exists
    if (!user.otp) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP.",
      });
    }

    // Check if OTP is expired
    if (isOTPExpired(user.otpExpiry)) {
      // Clear expired OTP
      await userService.clearUserOTP(user.id);

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // Verify OTP
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    // OTP is valid - mark user as verified and clear OTP
    await userService.verifyUser(user.id);

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        mobile,
        isVerified: true,
        fullName: user.fullName,
        uid: user.uid
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Resend OTP
app.post("/api/resend-otp", validatePhoneNumber, async (req, res) => {
  try {
    const { mobile, hash } = req.body;

    // Check if user exists in Firebase
    const user = await userService.findUserByMobile(mobile);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please register first.",
        code: "USER_NOT_FOUND"
      });
    }

    // Check if there's a recent OTP request (rate limiting)
    if (user.otpExpiry && !isOTPExpired(user.otpExpiry)) {
      const timeLeft = Math.ceil(
        (new Date(user.otpExpiry) - new Date()) / 1000 / 60
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${timeLeft} minutes before requesting a new OTP.`,
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Update user's OTP in Firebase
    await userService.updateUserOTP(user.id, otp, otpExpiry);

    // Prepare OTP message with hash if provided
    let otpMessage = `Your new FinShield verification code is: ${otp}. Valid for 10 minutes.`;
    if (hash) {
      otpMessage += ` ${hash}`;
    }

    // Send new OTP via Twilio
    try {
      await twilioClient.messages.create({
        body: otpMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: mobile,
      });

      console.log(`New OTP ${otp} sent to ${mobile}${hash ? ` with hash: ${hash}` : ''}`);

      res.status(200).json({
        success: true,
        message: "New OTP sent successfully",
        data: {
          mobile,
          expiresIn: "10 minutes",
        },
      });
    } catch (twilioError) {
      console.error("Twilio error:", twilioError);

      // Clear the OTP from Firebase if SMS fails
      await userService.clearUserOTP(user.id);

      res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get user status
app.get("/api/user/:mobile", async (req, res) => {
  try {
    const { mobile } = req.params;

    // Validate mobile format
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    if (!phoneRegex.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number format. Must be +91 followed by 10 digits starting with 6-9",
      });
    }

    const user = await userService.findUserByMobile(mobile);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        mobile: user.mobile,
        fullName: user.fullName,
        uid: user.uid,
        isVerified: user.isVerified,
        hasActiveOTP: !!(user.otp && !isOTPExpired(user.otpExpiry)),
        isActive: user.isActive
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Behavioral data processing endpoints

// Regular data processing - calculate and save to database
app.post("/api/data/regular", async (req, res) => {
  try {
    const mobileData = req.body;
    console.log("Received mobile data");

    // Validate required fields
    if (!mobileData.sessionId || !mobileData.userId) {
      return res.status(400).json({
        success: false,
        message: "sessionId and userId are required"
      });
    }

    // Process the mobile data and calculate behavioral metrics
    // const calculatedData = await behavioralService.processBehavioralSession(mobileData);

    // Save calculated data to Firebase
    const saveResult = await userService.storeBehavioralSessionData(mobileData);

    // Extract and store BehaviourProfile data
    let behaviourProfileResult = null;
    try {
      console.log("Extracting and storing BehaviourProfile data...");
      const behaviourProfile = userService.extractBehaviourProfile(mobileData);
      behaviourProfileResult = await userService.storeBehaviourProfile(behaviourProfile);
      console.log("BehaviourProfile processing result:", behaviourProfileResult);
    } catch (behaviourProfileError) {
      console.error("Error processing BehaviourProfile:", behaviourProfileError);
      // Don't fail the entire request if BehaviourProfile processing fails
    }

    // Extract userId and sessionId for vector processing
    const userId = mobileData.userId;
    const sessionId = mobileData.sessionId;

    let vectorResults = null;

    // Process behavioral data for vector embeddings if userId and sessionId are present
    if (userId && sessionId) {
      try {
        console.log("Processing behavioral data for vector embeddings...");
        vectorResults = await vectorService.processAllBehavioralData(
          userId,
          sessionId,
          mobileData
        );
        console.log("Vector processing results:", vectorResults.summary);
      } catch (vectorError) {
        console.error("Error processing vector embeddings:", vectorError);
        // Don't fail the entire request if vector processing fails
      }
    }

    const response = {
      success: true,
      message: "Behavioral data processed and saved successfully",
      data: {
        sessionId: mobileData.sessionId,
        userId: mobileData.userId,
        documentId: saveResult.id,
        timestamp: mobileData.timestamp
      }
    };

    // Include BehaviourProfile processing results if available
    if (behaviourProfileResult) {
      response.data.behaviourProfile = {
        success: behaviourProfileResult.success,
        userId: behaviourProfileResult.userId
      };
    }

    // Include vector processing results if available
    if (vectorResults) {
      response.data.vectorProcessing = {
        summary: vectorResults.summary,
        details: {
          motion: vectorResults.motion ? { success: vectorResults.motion.success, type: vectorResults.motion.type } : null,
          gesture: vectorResults.gesture ? { success: vectorResults.gesture.success, type: vectorResults.gesture.type } : null,
          typing: vectorResults.typing ? { success: vectorResults.typing.success, type: vectorResults.typing.type } : null
        }
      };
    }

    res.status(200).json(response);

  } catch (error) {
    console.error("Error processing regular behavioral data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process behavioral data",
      error: error.message
    });
  }
});

// Check data processing - analyze behavioral similarity for fraud detection
app.post("/api/data/check", async (req, res) => {
  try {
    const mobileData = req.body;
    console.log("Received behavioral data for check from user:", mobileData.userId);

    // Validate request
    const validationError = checkService.validateRequest(mobileData);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    // Process the check using the dedicated service
    const result = await checkService.processCheck(mobileData);

    return res.json(result);
  } catch (error) {
    console.error("Error during behavioral data check:", error);

    // Return high-risk fallback response
    return res.status(500).json({
      success: false,
      message: "Internal server error during behavioral analysis",
      data: {
        sessionId: mobileData?.sessionId || 'unknown',
        userId: mobileData?.userId || 'unknown',
        timestamp: new Date().toISOString(),
        status: "error",
        requiresSecurityQuestions: true,
        comprehensiveRiskAssessment: {
          success: false,
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
          alerts: ['System error during analysis - blocking for safety'],
          description: 'High Risk - System Error'
        }
      }
    });
  }
});

// Health check route
app.get("/", (req, res) => {
  res.json({
    message: "FinShield OTP Server is running",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
  });
});

// 404 handler - must be the last route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Initialize vector service
vectorService.initializeIndexes().catch(error => {
  console.error('Failed to initialize vector service:', error);
});

export default app;

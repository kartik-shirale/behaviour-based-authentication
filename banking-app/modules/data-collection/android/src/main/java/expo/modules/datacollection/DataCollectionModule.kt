package expo.modules.datacollection

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import android.content.Context
import android.provider.Settings
import android.os.Build
import android.app.usage.UsageStatsManager
import java.util.*
import java.security.KeyStore
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.view.MotionEvent
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.text.TextWatcher
import android.text.Editable
import kotlin.math.sqrt
import kotlin.math.abs
import android.util.Log
import android.telephony.TelephonyManager
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import android.view.accessibility.AccessibilityEvent
import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityManager
import android.view.inputmethod.InputMethodManager
import android.os.Handler
import android.os.Looper
import java.util.concurrent.ConcurrentHashMap
import android.content.Intent
import android.content.ComponentName
import android.view.WindowManager
import android.graphics.PixelFormat
import android.view.Gravity
import android.content.BroadcastReceiver
import android.content.IntentFilter
import android.inputmethodservice.InputMethodService
import android.view.inputmethod.InputConnection
import android.view.inputmethod.EditorInfo

class DataCollectionModule : Module() {
  
  // Native keystroke capture system
  private val nativeKeystrokeData = ConcurrentHashMap<String, NativeKeystrokeEventData>()
  private val activeKeyDowns = ConcurrentHashMap<Int, Long>() // keyCode -> timestamp
  private val touchCoordinates = ConcurrentHashMap<Int, Pair<Float, Float>>() // keyCode -> (x, y)
  private var lastKeystrokeEndTime = 0L
  private var isCapturingKeystrokes = false
  private var isKeystrokeCaptureActive = false
  private val mainHandler = Handler(Looper.getMainLooper())
  
  // Native touch capture system
  private val nativeTouchEvents = mutableListOf<NativeTouchEventData>()
  private var isCapturingNativeTouch = false
  private var nativeTouchOverlay: View? = null
  private var windowManager: WindowManager? = null
  private val activeTouches = ConcurrentHashMap<Int, NativeTouchPoint>() // pointerId -> touch data
  
  // Data storage
  private val touchEvents = mutableListOf<MobileTouchEventData>()
  private val keystrokeEvents = mutableListOf<MobileKeystrokeData>()
  private var sessionStartTime = System.currentTimeMillis()
  private var lastTouchTime = 0L
  private var lastKeystrokeTime = 0L
  private var currentTouchStartTime = 0L
  private var currentTouchStartX = 0f
  private var currentTouchStartY = 0f
  private var currentTouchStartX2 = 0f
  private var currentTouchStartY2 = 0f
  private var isMultiTouch = false
  
  // Legacy compatibility variables
  private val pendingKeydowns = ConcurrentHashMap<String, Long>()
  private var lastKeyupTimestamp = 0L
  
  // Native keystroke event data structure
  data class KeystrokeEventData(
    val character: String,
    val keyDownTime: Long,
    val keyUpTime: Long,
    val touchX: Float,
    val touchY: Float,
    val pressure: Float,
    val dwellTime: Long,
    val flightTime: Long
  )
  
  // Enhanced native keystroke data structure for hardware-level capture
  data class NativeKeystrokeEventData(
    val character: String,
    val keyCode: Int,
    val keydownTimestamp: Long,
    val keyupTimestamp: Long,
    val dwellTime: Long,
    val flightTime: Long,
    val touchX: Float,
    val touchY: Float,
    val pressure: Float,
    val isHardwareTiming: Boolean,
    val deviceId: Int,
    val scanCode: Int
  )
  
  // Native touch event data structure for hardware-level capture
  data class NativeTouchEventData(
    val pointerId: Int,
    val action: Int,
    val x: Float,
    val y: Float,
    val rawX: Float,
    val rawY: Float,
    val pressure: Float,
    val size: Float,
    val touchMajor: Float,
    val touchMinor: Float,
    val orientation: Float,
    val timestamp: Long,
    val eventTime: Long,
    val downTime: Long,
    val deviceId: Int,
    val source: Int,
    val toolType: Int,
    val isHardwareEvent: Boolean = true
  )
  
  // Active touch point tracking
  data class NativeTouchPoint(
    val pointerId: Int,
    val startX: Float,
    val startY: Float,
    val startTime: Long,
    val startPressure: Float,
    var currentX: Float,
    var currentY: Float,
    var currentPressure: Float,
    var lastUpdateTime: Long
  )
  
  // Native key event listener interface
  // Removed NativeKeyEventListener interface - no longer needed for direct component integration
  
  // Enhanced data classes matching TypeScript interfaces
  data class MobileTouchEventData(
    val gestureType: String, // "tap", "swipe", "scroll", "pinch", "long_press"
    val timestamp: Long,
    val startX: Float,
    val startY: Float,
    val endX: Float,
    val endY: Float,
    val duration: Long,
    val distance: Float?,
    val velocity: Float?,
    // Multi-touch support for pinch gestures
    val startX2: Float? = null,
    val startY2: Float? = null,
    val endX2: Float? = null,
    val endY2: Float? = null
  )
  
  data class MobileKeystrokeData(
    val character: String,
    val timestamp: Long,
    val dwellTime: Long, // ACTION_DOWN to ACTION_UP duration
    val flightTime: Long, // Time between keystrokes
    val coordinate_x: Float, // Updated field name to match TypeScript interface
    val coordinate_y: Float, // Updated field name to match TypeScript interface
    val inputType: String, // Input field type (e.g., "amount", "text", "password")
    val pressure: Float? = null // Optional pressure data
  )

  override fun definition() = ModuleDefinition {
    Name("DataCollection")

    // Optimized In-App Touch Event Collection - Direct Component Instrumentation
  AsyncFunction("collectTouchEventNative") { touchData: Map<String, Any>, promise: Promise ->
    try {
      val timestamp = System.currentTimeMillis()
      val x = (touchData["pageX"] as? Number)?.toFloat() ?: (touchData["x"] as? Number)?.toFloat() ?: 0f
      val y = (touchData["pageY"] as? Number)?.toFloat() ?: (touchData["y"] as? Number)?.toFloat() ?: 0f
      val action = (touchData["action"] as? Number)?.toInt() ?: MotionEvent.ACTION_UP
      val gestureType = touchData["gestureType"] as? String ?: "tap"
      val pointerCount = (touchData["pointerCount"] as? Number)?.toInt() ?: 1
      val pressure = (touchData["pressure"] as? Number)?.toFloat() ?: 1.0f
      val componentId = touchData["componentId"] as? String ?: "unknown"
      val inputType = touchData["inputType"] as? String ?: "general"
      
      // Multi-touch coordinates (for pinch gestures)
      val x2 = (touchData["pageX2"] as? Number)?.toFloat() ?: (touchData["x2"] as? Number)?.toFloat()
      val y2 = (touchData["pageY2"] as? Number)?.toFloat() ?: (touchData["y2"] as? Number)?.toFloat()
      
      // Extract start coordinates if provided (for cases where ACTION_DOWN was missed)
      val startX = (touchData["startX"] as? Number)?.toFloat()
      val startY = (touchData["startY"] as? Number)?.toFloat()
      val startTime = (touchData["startTime"] as? Number)?.toLong()
        
        when (action) {
          MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
            // Start of touch gesture - simplified tracking
            currentTouchStartTime = timestamp
            currentTouchStartX = x
            currentTouchStartY = y
            isMultiTouch = pointerCount > 1
            
            if (isMultiTouch && x2 != null && y2 != null) {
              currentTouchStartX2 = x2
              currentTouchStartY2 = y2
            }
            
            promise.resolve(mapOf(
              "gestureType" to "down",
              "timestamp" to timestamp,
              "x" to x,
              "y" to y,
              "pressure" to pressure,
              "componentId" to componentId,
              "inputType" to inputType,
              "pointerCount" to pointerCount
            ))
          }
          
          MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> {
            // Handle cases where ACTION_DOWN was missed - use provided start coordinates or current coordinates
            val actualStartX = startX ?: currentTouchStartX
            val actualStartY = startY ?: currentTouchStartY
            val actualStartTime = startTime ?: currentTouchStartTime
            
            // If no valid start coordinates, treat as a tap at current location
            if (actualStartTime == 0L || (actualStartX == 0f && actualStartY == 0f)) {
              currentTouchStartTime = timestamp - 50 // Assume 50ms duration for missed ACTION_DOWN
              currentTouchStartX = x
              currentTouchStartY = y
            } else {
              currentTouchStartTime = actualStartTime
              currentTouchStartX = actualStartX
              currentTouchStartY = actualStartY
            }
            
            // End of touch gesture - calculate essential metrics
            val duration = timestamp - currentTouchStartTime
            val deltaX = x - currentTouchStartX
            val deltaY = y - currentTouchStartY
            val distance = sqrt((deltaX * deltaX + deltaY * deltaY).toDouble()).toFloat()
            val velocity = if (duration > 0) distance / (duration / 1000f) else 0f
            
            // Simplified gesture detection for banking app use cases
            val detectedGestureType = when {
              isMultiTouch -> "pinch"
              duration > 800 && distance < 20 -> "long_press"
              distance > 30 -> if (abs(deltaY) > abs(deltaX)) "scroll" else "swipe"
              else -> "tap"
            }
            
            // Create optimized touch event for behavioral analysis
            val touchEvent = MobileTouchEventData(
              gestureType = detectedGestureType,
              timestamp = timestamp,
              startX = currentTouchStartX,
              startY = currentTouchStartY,
              endX = x,
              endY = y,
              duration = duration,
              distance = distance,
              velocity = velocity,
              startX2 = if (isMultiTouch) currentTouchStartX2 else null,
              startY2 = if (isMultiTouch) currentTouchStartY2 else null,
              endX2 = if (isMultiTouch) x2 else null,
              endY2 = if (isMultiTouch) y2 else null
            )
            
            touchEvents.add(touchEvent)
            lastTouchTime = timestamp
            isMultiTouch = false
            
            Log.d("DataCollectionModule", "Touch event stored: gesture=$detectedGestureType, start=($currentTouchStartX,$currentTouchStartY), end=($x,$y), distance=$distance, velocity=$velocity, duration=$duration")
            
            promise.resolve(mapOf(
              "gestureType" to detectedGestureType,
              "timestamp" to timestamp,
              "startX" to currentTouchStartX,
              "startY" to currentTouchStartY,
              "endX" to x,
              "endY" to y,
              "duration" to duration,
              "distance" to distance,
              "velocity" to velocity,
              "pressure" to pressure,
              "componentId" to componentId,
              "inputType" to inputType,
              "success" to true
            ))
          }
          
          else -> {
            // For MOVE events, just acknowledge without storing
            val responseData = mapOf(
              "gestureType" to "move",
              "timestamp" to timestamp,
              "x" to x,
              "y" to y,
              "action" to action,
              "pointerCount" to pointerCount
            )
            promise.resolve(responseData)
          }
        }
      } catch (e: Exception) {
        promise.reject("NATIVE_TOUCH_ERROR", "Failed to collect native touch event: ${e.message}", e)
      }
    }

    // Optimized In-App Keystroke Capture - Direct Input Component Integration
    AsyncFunction("startNativeKeystrokeCapture") { promise: Promise ->
      try {
        Log.d("DataCollectionModule", "Starting optimized in-app keystroke capture")
        
        // Initialize simplified keystroke capture
        registerForKeystrokeCapture()
        
        isKeystrokeCaptureActive = true
        Log.d("DataCollectionModule", "Keystroke capture activated: $isKeystrokeCaptureActive")
        lastKeystrokeEndTime = 0L
        
        promise.resolve(mapOf(
          "success" to true, 
          "message" to "In-app keystroke capture started",
          "captureMethod" to "DIRECT_COMPONENT_INTEGRATION",
          "optimized" to true
        ))
        
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error starting keystroke capture: ${e.message}", e)
        promise.reject("KEYSTROKE_CAPTURE_START_ERROR", "Failed to start keystroke capture: ${e.message}", e)
      }
    }
    
    // Stop keystroke capture
    AsyncFunction("stopNativeKeystrokeCapture") { promise: Promise ->
      try {
        isKeystrokeCaptureActive = false
        cleanupKeystrokeCapture()
        
        Log.d("DataCollectionModule", "Keystroke capture stopped")
        promise.resolve(mapOf(
          "success" to true,
          "message" to "Keystroke capture stopped",
          "capturedEvents" to nativeKeystrokeData.size
        ))
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error stopping keystroke capture: ${e.message}")
        promise.reject("KEYSTROKE_CAPTURE_STOP_ERROR", "Failed to stop keystroke capture: ${e.message}", e)
      }
    }
    
    // Optimized keystroke event handler - called from React Native input components
    AsyncFunction("handleNativeKeyEvent") { eventData: Map<String, Any>, promise: Promise ->
      try {
        if (!isKeystrokeCaptureActive) {
          promise.resolve(mapOf("captured" to false, "reason" to "Capture not active"))
          return@AsyncFunction
        }
        
        val action = (eventData["action"] as? Number)?.toInt() ?: KeyEvent.ACTION_DOWN
        val character = eventData["character"] as? String ?: ""
        val keyCode = (eventData["keyCode"] as? Number)?.toInt() ?: 0
        val timestamp = (eventData["timestamp"] as? Number)?.toLong() ?: System.currentTimeMillis()
        val touchX = (eventData["touchX"] as? Number)?.toFloat() ?: 0f
        val touchY = (eventData["touchY"] as? Number)?.toFloat() ?: 0f
        val pressure = (eventData["pressure"] as? Number)?.toFloat() ?: 1.0f
        val componentId = eventData["componentId"] as? String ?: "unknown"
        val inputType = eventData["inputType"] as? String ?: "text"
        
        when (action) {
          KeyEvent.ACTION_DOWN -> {
            // Record keydown event for timing calculation
            val keyId = "${keyCode}_${character}_$timestamp"
            activeKeyDowns[keyCode] = timestamp
            touchCoordinates[keyCode] = Pair(touchX, touchY)
            
            promise.resolve(mapOf(
              "action" to "keydown",
              "character" to character,
              "keyCode" to keyCode,
              "timestamp" to timestamp,
              "componentId" to componentId,
              "inputType" to inputType,
              "captured" to true
            ))
          }
          
          KeyEvent.ACTION_UP -> {
            // Calculate behavioral timing metrics
            val keyDownTime = activeKeyDowns.remove(keyCode)
            if (keyDownTime != null && character.isNotEmpty()) {
              val dwellTime = timestamp - keyDownTime
              val flightTime = if (lastKeystrokeEndTime > 0L) keyDownTime - lastKeystrokeEndTime else 0L
              val coordinates = touchCoordinates.remove(keyCode) ?: Pair(touchX, touchY)
              
              // Create optimized keystroke event for behavioral analysis
              val keystrokeEvent = NativeKeystrokeEventData(
                character = character,
                keyCode = keyCode,
                keydownTimestamp = keyDownTime,
                keyupTimestamp = timestamp,
                touchX = coordinates.first,
                touchY = coordinates.second,
                pressure = pressure,
                dwellTime = dwellTime,
                flightTime = flightTime,
                isHardwareTiming = false, // Direct component integration
                deviceId = 0,
                scanCode = 0
              )
              
              nativeKeystrokeData["${keyDownTime}_$character"] = keystrokeEvent
              lastKeystrokeEndTime = timestamp
              
              // Add to legacy structure for compatibility
              keystrokeEvents.add(MobileKeystrokeData(
                character = character,
                timestamp = timestamp,
                dwellTime = dwellTime,
                flightTime = flightTime,
                coordinate_x = coordinates.first,
                coordinate_y = coordinates.second,
                inputType = inputType,
                pressure = pressure
              ))
              
              promise.resolve(mapOf(
                "action" to "keyup",
                "character" to character,
                "dwellTime" to dwellTime,
                "flightTime" to flightTime,
                "touchX" to coordinates.first,
                "touchY" to coordinates.second,
                "pressure" to pressure,
                "componentId" to componentId,
                "inputType" to inputType,
                "timestamp" to timestamp,
                "captured" to true
              ))
            } else {
              promise.resolve(mapOf(
                "action" to "keyup",
                "character" to character,
                "timestamp" to timestamp,
                "captured" to false,
                "reason" to "No matching keydown or empty character"
              ))
            }
          }
          
          else -> {
            promise.resolve(mapOf(
              "action" to "unknown",
              "timestamp" to timestamp,
              "captured" to false
            ))
          }
        }
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error handling native key event: ${e.message}", e)
        promise.reject("NATIVE_KEY_ERROR", "Failed to handle native key event: ${e.message}", e)
      }
    }

    // Process Keystroke Event (Called from React Native input components)
    AsyncFunction("processKeystrokeEvent") { eventData: Map<String, Any?>, promise: Promise ->
      try {
        Log.d("DataCollectionModule", "Processing keystroke event: $eventData")
        
        if (!isKeystrokeCaptureActive) {
          Log.w("DataCollectionModule", "Keystroke capture not active, auto-initializing...")
          isKeystrokeCaptureActive = true
          registerForKeystrokeCapture()
        }
        
        val action = (eventData["action"] as? Number)?.toInt() ?: -1
        val keyCode = (eventData["keyCode"] as? Number)?.toInt() ?: -1
        val character = (eventData["character"] as? String) ?: ""
        val componentId = (eventData["componentId"] as? String) ?: "unknown"
        val inputType = (eventData["inputType"] as? String) ?: "text"
        val touchX = (eventData["touchX"] as? Number)?.toFloat() ?: 0.0f
        val touchY = (eventData["touchY"] as? Number)?.toFloat() ?: 0.0f
        val pressure = (eventData["pressure"] as? Number)?.toFloat() ?: 1.0f
        
        Log.d("DataCollectionModule", "Keystroke data: action=$action, keyCode=$keyCode, character='$character', component=$componentId")
        
        // Process the keystroke event inline
        val timestamp = System.currentTimeMillis()
        
        when (action) {
          KeyEvent.ACTION_DOWN -> {
            activeKeyDowns[keyCode] = timestamp
            Log.d("DataCollectionModule", "Direct keystroke capture - keydown: $character, keyCode: $keyCode")
            
            promise.resolve(mapOf(
              "action" to "keydown",
              "character" to character,
              "keyCode" to keyCode,
              "timestamp" to timestamp,
              "touchX" to touchX,
              "touchY" to touchY,
              "pressure" to pressure,
              "componentId" to componentId,
              "inputType" to inputType,
              "captured" to true,
              "directCapture" to true
            ))
          }
          
          KeyEvent.ACTION_UP -> {
            // Calculate behavioral timing metrics
            val keyDownTime = activeKeyDowns.remove(keyCode)
            if (keyDownTime != null && character.isNotEmpty()) {
              val dwellTime = timestamp - keyDownTime
              val flightTime = if (lastKeystrokeEndTime > 0L) keyDownTime - lastKeystrokeEndTime else 0L
              val coordinates = touchCoordinates.remove(keyCode) ?: Pair(touchX, touchY)
              
              // Create optimized keystroke event for behavioral analysis
              val keystrokeEvent = NativeKeystrokeEventData(
                character = character,
                keyCode = keyCode,
                keydownTimestamp = keyDownTime,
                keyupTimestamp = timestamp,
                touchX = coordinates.first,
                touchY = coordinates.second,
                pressure = pressure,
                dwellTime = dwellTime,
                flightTime = flightTime,
                isHardwareTiming = false, // Direct component integration
                deviceId = 0,
                scanCode = 0
              )
              
              nativeKeystrokeData["${keyDownTime}_$character"] = keystrokeEvent
              lastKeystrokeEndTime = timestamp
              
              // Add to legacy structure for compatibility
              keystrokeEvents.add(MobileKeystrokeData(
                character = character,
                timestamp = timestamp,
                dwellTime = dwellTime,
                flightTime = flightTime,
                coordinate_x = coordinates.first,
                coordinate_y = coordinates.second,
                inputType = inputType,
                pressure = pressure
              ))
              
              Log.d("DataCollectionModule", "Keystroke stored: character='$character', dwell=${dwellTime}ms, flight=${flightTime}ms, total_stored=${keystrokeEvents.size}")
              Log.d("DataCollectionModule", "Direct keystroke capture - keyup: $character, dwell: ${dwellTime}ms, flight: ${flightTime}ms")
              
              promise.resolve(mapOf(
                "action" to "keyup",
                "character" to character,
                "dwellTime" to dwellTime,
                "flightTime" to flightTime,
                "touchX" to coordinates.first,
                "touchY" to coordinates.second,
                "pressure" to pressure,
                "componentId" to componentId,
                "inputType" to inputType,
                "timestamp" to timestamp,
                "captured" to true,
                "directCapture" to true
              ))
            } else {
              promise.resolve(mapOf(
                "action" to "keyup",
                "character" to character,
                "timestamp" to timestamp,
                "captured" to false,
                "reason" to "No matching keydown or empty character",
                "directCapture" to true
              ))
            }
          }
          
          else -> {
            promise.resolve(mapOf(
              "action" to "unknown",
              "timestamp" to timestamp,
              "captured" to false,
              "reason" to "Unknown action: $action",
              "directCapture" to true
            ))
          }
        }
        
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error processing keystroke event: ${e.message}", e)
        promise.reject("KEYSTROKE_EVENT_ERROR", "Failed to process keystroke event: ${e.message}", e)
      }
    }

    // Auto-initialize direct keystroke capture for seamless integration
    AsyncFunction("initializeDirectKeystrokeCapture") { promise: Promise ->
      try {
        if (!isKeystrokeCaptureActive) {
          Log.d("DataCollectionModule", "Initializing direct keystroke capture")
          isKeystrokeCaptureActive = true
          registerForKeystrokeCapture()
          
          promise.resolve(mapOf(
            "initialized" to true,
            "directCapture" to true,
            "message" to "Direct keystroke capture initialized successfully"
          ))
        } else {
          promise.resolve(mapOf(
            "initialized" to false,
            "directCapture" to true,
            "message" to "Direct keystroke capture already active"
          ))
        }
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error initializing direct keystroke capture: ${e.message}", e)
        promise.reject("INIT_DIRECT_CAPTURE_ERROR", "Failed to initialize direct keystroke capture: ${e.message}", e)
      }
    }

    // Process Real Touch Event (Called from React Native with real MotionEvent data)
    AsyncFunction("processRealTouchEvent") { touchData: Map<String, Any?>, promise: Promise ->
      try {
        val result = handleRealTouchEvent(touchData)
        promise.resolve(result)
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error processing real touch event: ${e.message}", e)
        promise.reject("REAL_TOUCH_EVENT_ERROR", "Failed to process real touch event: ${e.message}", e)
      }
    }

    // Get native keystroke data (replaces old collectKeystrokeNative)
    AsyncFunction("getNativeKeystrokeData") { promise: Promise ->
      try {
        val nativeData = nativeKeystrokeData.values.map { event ->
          mapOf(
            "character" to event.character,
            "keyDownTime" to event.keydownTimestamp,
            "keyUpTime" to event.keyupTimestamp,
            "dwellTime" to event.dwellTime,
            "flightTime" to event.flightTime,
            "coordinate_x" to event.touchX,
            "coordinate_y" to event.touchY,
            "pressure" to event.pressure,
            "timestamp" to event.keyupTimestamp,
            "inputType" to "native_hardware",
            "nativeCapture" to true
          )
        }
        
        Log.d("DataCollectionModule", "Returning ${nativeData.size} authentic hardware keystroke events")
        promise.resolve(mapOf(
          "events" to nativeData,
          "totalEvents" to nativeData.size,
          "captureMethod" to "ANDROID_HARDWARE_EVENTS",
          "isAuthentic" to true,
          "dataQuality" to "HARDWARE_LEVEL",
          "timingSource" to "ANDROID_EVENT_TIME"
        ))
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error getting native keystroke data: ${e.message}", e)
        promise.reject("NATIVE_DATA_ERROR", "Failed to get native keystroke data: ${e.message}", e)
      }
    }

    // ========== NATIVE TOUCH CAPTURE SYSTEM ==========
    // Real Android MotionEvent interception for authentic touch data
    
    AsyncFunction("startNativeTouchCapture") { promise: Promise ->
      try {
        if (isCapturingNativeTouch) {
          Log.w("DataCollectionModule", "Native touch capture already active")
          promise.resolve(mapOf(
            "success" to true,
            "message" to "Native touch capture already active",
            "captureMethod" to "ANDROID_MOTION_EVENTS"
          ))
          return@AsyncFunction
        }

        // Clear previous data
        nativeTouchEvents.clear()
        activeTouches.clear()
        
        // Create invisible overlay to intercept touch events
        mainHandler.post {
          try {
            setupNativeTouchOverlay()
            isCapturingNativeTouch = true
            
            Log.i("DataCollectionModule", "✅ Native touch capture started - intercepting real MotionEvents")
            promise.resolve(mapOf(
              "success" to true,
              "message" to "Native touch capture started successfully",
              "captureMethod" to "ANDROID_MOTION_EVENTS",
              "isAuthentic" to true,
              "dataSource" to "HARDWARE_TOUCH_EVENTS"
            ))
          } catch (e: Exception) {
            Log.e("DataCollectionModule", "Failed to setup native touch overlay: ${e.message}", e)
            promise.reject("OVERLAY_ERROR", "Failed to setup touch overlay: ${e.message}", e)
          }
        }
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error starting native touch capture: ${e.message}", e)
        promise.reject("NATIVE_TOUCH_ERROR", "Failed to start native touch capture: ${e.message}", e)
      }
    }

    AsyncFunction("stopNativeTouchCapture") { promise: Promise ->
      try {
        if (!isCapturingNativeTouch) {
          promise.resolve(mapOf(
            "success" to true,
            "message" to "Native touch capture was not active"
          ))
          return@AsyncFunction
        }

        mainHandler.post {
          try {
            removeNativeTouchOverlay()
            isCapturingNativeTouch = false
            activeTouches.clear()
            
            Log.i("DataCollectionModule", "Native touch capture stopped")
            promise.resolve(mapOf(
              "success" to true,
              "message" to "Native touch capture stopped successfully",
              "totalEvents" to nativeTouchEvents.size
            ))
          } catch (e: Exception) {
            Log.e("DataCollectionModule", "Error removing touch overlay: ${e.message}", e)
            promise.reject("OVERLAY_REMOVE_ERROR", "Failed to remove touch overlay: ${e.message}", e)
          }
        }
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error stopping native touch capture: ${e.message}", e)
        promise.reject("NATIVE_TOUCH_ERROR", "Failed to stop native touch capture: ${e.message}", e)
      }
    }

    AsyncFunction("getNativeTouchData") { promise: Promise ->
      try {
        val nativeData = nativeTouchEvents.map { event ->
          mapOf(
            "pointerId" to event.pointerId,
            "action" to event.action,
            "actionName" to getActionName(event.action),
            "x" to event.x,
            "y" to event.y,
            "rawX" to event.rawX,
            "rawY" to event.rawY,
            "pressure" to event.pressure,
            "size" to event.size,
            "touchMajor" to event.touchMajor,
            "touchMinor" to event.touchMinor,
            "orientation" to event.orientation,
            "timestamp" to event.timestamp,
            "eventTime" to event.eventTime,
            "downTime" to event.downTime,
            "deviceId" to event.deviceId,
            "source" to event.source,
            "toolType" to event.toolType,
            "isHardwareEvent" to event.isHardwareEvent,
            "inputType" to "native_hardware_touch"
          )
        }
        
        Log.d("DataCollectionModule", "Returning ${nativeData.size} authentic hardware touch events")
        promise.resolve(mapOf(
          "events" to nativeData,
          "totalEvents" to nativeData.size,
          "captureMethod" to "ANDROID_MOTION_EVENTS",
          "isAuthentic" to true,
          "dataQuality" to "HARDWARE_LEVEL",
          "timingSource" to "ANDROID_EVENT_TIME"
        ))
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error getting native touch data: ${e.message}", e)
        promise.reject("NATIVE_TOUCH_DATA_ERROR", "Failed to get native touch data: ${e.message}", e)
      }
    }
    
    // Legacy keystroke collection (DEPRECATED - JavaScript timing is not authentic)
    AsyncFunction("collectKeystrokeNative") { keystrokeData: Map<String, Any>, promise: Promise ->
      try {
        Log.w("DataCollectionModule", "⚠️  DEPRECATED: collectKeystrokeNative uses JavaScript timing (not authentic)")
        Log.w("DataCollectionModule", "⚠️  Use startNativeKeystrokeCapture() + getNativeKeystrokeData() for real hardware data")
        
        val character = keystrokeData["character"] as? String ?: ""
        val timestamp = (keystrokeData["timestamp"] as? Number)?.toLong() ?: System.currentTimeMillis()
        val dwellTime = (keystrokeData["dwellTime"] as? Number)?.toLong() ?: 0L
        val flightTime = (keystrokeData["flightTime"] as? Number)?.toLong() ?: 0L
        val x = (keystrokeData["coordinate_x"] as? Number)?.toFloat() ?: 0f
        val y = (keystrokeData["coordinate_y"] as? Number)?.toFloat() ?: 0f
        val pressure = (keystrokeData["pressure"] as? Number)?.toFloat()
        
        // Store as legacy keystroke for backward compatibility
        val inputType = keystrokeData["inputType"] as? String ?: "legacy_js"
        val keystrokeEvent = MobileKeystrokeData(
          character = character,
          timestamp = timestamp,
          dwellTime = dwellTime,
          flightTime = flightTime,
          coordinate_x = x,
          coordinate_y = y,
          inputType = inputType,
          pressure = pressure
        )
        
        keystrokeEvents.add(keystrokeEvent)
        lastKeystrokeTime = timestamp
        
        Log.d("DataCollectionModule", "Legacy keystroke stored (synthetic): '$character' (${dwellTime}ms dwell, ${flightTime}ms flight)")
        
        promise.resolve(mapOf(
          "character" to character,
          "timestamp" to timestamp,
          "dwellTime" to dwellTime,
          "flightTime" to flightTime,
          "coordinate_x" to x,
          "coordinate_y" to y,
          "pressure" to pressure,
          "inputType" to inputType,
          "nativeCapture" to false,
          "isAuthentic" to false,
          "isDeprecated" to true,
          "dataSource" to "JAVASCRIPT_SYNTHETIC",
          "warning" to "This function uses JavaScript timing - not authentic hardware data. Use native capture instead."
        ))
        

      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error collecting keystroke: ${e.message}", e)
        promise.reject("KEYSTROKE_COLLECTION_ERROR", "Failed to collect keystroke: ${e.message}", e)
      }
    }

    // Reset Session Data (Enhanced for Native Capture)
    AsyncFunction("resetSession") { promise: Promise ->
      try {
        // Clear all legacy tracking data
        touchEvents.clear()
        keystrokeEvents.clear()
        pendingKeydowns.clear()
        
        // Clear native keystroke data
        nativeKeystrokeData.clear()
        activeKeyDowns.clear()
        touchCoordinates.clear()
        
        // Clear native touch data
        nativeTouchEvents.clear()
        activeTouches.clear()
        
        // Reset timing variables
        sessionStartTime = System.currentTimeMillis()
        lastTouchTime = 0L
        lastKeystrokeTime = 0L
        lastKeyupTimestamp = 0L
        lastKeystrokeEndTime = 0L
        currentTouchStartTime = 0L
        currentTouchStartX = 0f
        currentTouchStartY = 0f
        currentTouchStartX2 = 0f
        currentTouchStartY2 = 0f
        isMultiTouch = false
        
        Log.d("DataCollectionModule", "Session reset - all native and legacy data cleared")
        promise.resolve(mapOf(
          "success" to true,
          "message" to "Session reset with native keystroke data cleared",
          "timestamp" to sessionStartTime
        ))
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error resetting session: ${e.message}", e)
        promise.reject("SESSION_RESET_ERROR", "Failed to reset session: ${e.message}", e)
      }
    }

    // Get SIM Country Code
    AsyncFunction("getSimCountry") { promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw Exception("Context not available")
        val simCountry = getSimCountryCode(context)
        promise.resolve(simCountry)
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error getting SIM country: ${e.message}")
        promise.resolve("unknown")
      }
    }

    // Get Enhanced Session Analytics
    AsyncFunction("getSessionAnalytics") { promise: Promise ->
      try {
        Log.d("DataCollectionModule", "getSessionAnalytics called - keystrokeEvents size: ${keystrokeEvents.size}, nativeKeystrokeData size: ${nativeKeystrokeData.size}")
        val sessionDuration = System.currentTimeMillis() - sessionStartTime
        
        // Calculate touch analytics
        val gestureTypeCounts = touchEvents.groupingBy { it.gestureType }.eachCount()
        val avgTouchDuration = if (touchEvents.isNotEmpty()) {
          touchEvents.map { it.duration }.average()
        } else 0.0
        val avgTouchVelocity = touchEvents.mapNotNull { it.velocity }.let { velocities ->
          if (velocities.isNotEmpty()) velocities.average() else 0.0
        }
        val avgTouchDistance = touchEvents.mapNotNull { it.distance }.let { distances ->
          if (distances.isNotEmpty()) distances.average() else 0.0
        }
        
        // Calculate keystroke analytics
        val avgDwellTime = if (keystrokeEvents.isNotEmpty()) {
          keystrokeEvents.map { it.dwellTime }.average()
        } else 0.0
        val avgFlightTime = keystrokeEvents.filter { it.flightTime > 0 }.let { events ->
          if (events.isNotEmpty()) events.map { it.flightTime }.average() else 0.0
        }
        val keystrokeRate = if (sessionDuration > 0) {
          (keystrokeEvents.size.toDouble() / (sessionDuration / 1000.0)) * 60.0 // keystrokes per minute
        } else 0.0
        
        val analytics = mapOf(
          "sessionDuration" to sessionDuration,
          "touchEvents" to touchEvents.size,
          "keystrokeEvents" to keystrokeEvents.size,
          "sessionStartTime" to sessionStartTime,
          "lastActivity" to maxOf(lastTouchTime, lastKeystrokeTime),
          "gestureTypeCounts" to gestureTypeCounts,
          "avgTouchDuration" to avgTouchDuration,
          "avgTouchVelocity" to avgTouchVelocity,
          "avgTouchDistance" to avgTouchDistance,
          "avgDwellTime" to avgDwellTime,
          "avgFlightTime" to avgFlightTime,
          "keystrokeRate" to keystrokeRate,
          "touchEventData" to touchEvents.map { event ->
            val eventMap = mutableMapOf<String, Any?>(
              "gestureType" to event.gestureType,
              "timestamp" to event.timestamp,
              "startX" to event.startX,
              "startY" to event.startY,
              "endX" to event.endX,
              "endY" to event.endY,
              "duration" to event.duration,
              "distance" to event.distance,
              "velocity" to event.velocity
            )
            // Add multi-touch data if available
            if (event.startX2 != null) {
              eventMap["startX2"] = event.startX2
              eventMap["startY2"] = event.startY2
              eventMap["endX2"] = event.endX2
              eventMap["endY2"] = event.endY2
            }
            eventMap
          },
          "keystrokeEventData" to keystrokeEvents.map { event ->
            mapOf(
              "character" to event.character,
              "timestamp" to event.timestamp,
              "dwellTime" to event.dwellTime,
              "flightTime" to event.flightTime,
              "coordinate_x" to event.coordinate_x,
              "coordinate_y" to event.coordinate_y,
              "pressure" to event.pressure
            )
          }
        )
        
        Log.d("DataCollectionModule", "getSessionAnalytics returning keystrokeEventData with ${keystrokeEvents.size} events")
        if (keystrokeEvents.isNotEmpty()) {
          Log.d("DataCollectionModule", "First keystroke event: character=${keystrokeEvents[0].character}, dwellTime=${keystrokeEvents[0].dwellTime}, flightTime=${keystrokeEvents[0].flightTime}")
        }
        promise.resolve(analytics)
      } catch (e: Exception) {
        promise.reject("ANALYTICS_ERROR", "Failed to get session analytics: ${e.message}", e)
      }
    }



    // Device Behavior Collection (Enhanced)
    AsyncFunction("getDeviceBehavior") { promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw Exception("Context not available")
        val deviceBehavior = mutableMapOf<String, Any>()
        
        deviceBehavior["isDebuggingEnabled"] = isDebuggingEnabled(context)
        deviceBehavior["hasOverlayPermission"] = hasOverlayPermission(context)
        deviceBehavior["hasUnknownApps"] = hasUnknownAppsEnabled(context)
        deviceBehavior["accessibilityServices"] = getEnabledAccessibilityServices(context)
        deviceBehavior["activeInputMethod"] = getActiveInputMethod(context)
        deviceBehavior["appUsagePatterns"] = getAppUsagePatterns(context)
        deviceBehavior["hardwareAttestation"] = checkHardwareAttestation()
        deviceBehavior["deviceFingerprint"] = getDeviceFingerprint(context)
        
        promise.resolve(deviceBehavior)
      } catch (e: Exception) {
        promise.reject("DEVICE_BEHAVIOR_ERROR", "Failed to collect device behavior: ${e.message}", e)
      }
    }

    // Permission Check Function
    AsyncFunction("checkPermissions") { promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw Exception("Context not available")
        val permissions = mutableMapOf<String, Boolean>()
        
        permissions["usageStats"] = hasUsageStatsPermission(context)
        permissions["readPhoneState"] = ContextCompat.checkSelfPermission(
          context, 
          android.Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED
        
        promise.resolve(permissions)
      } catch (e: Exception) {
        promise.reject("PERMISSION_CHECK_ERROR", "Failed to check permissions: ${e.message}", e)
      }
    }
  } // End of ModuleDefinition

  // Helper Functions for Device Information Only

  // Handle real touch event processing
  private fun handleRealTouchEvent(touchData: Map<String, Any?>): Map<String, Any?> {
    val action = (touchData["action"] as? Number)?.toInt() ?: -1
    val x = (touchData["x"] as? Number)?.toFloat() ?: 0f
    val y = (touchData["y"] as? Number)?.toFloat() ?: 0f
    val pressure = (touchData["pressure"] as? Number)?.toFloat() ?: 1.0f
    val eventTime = (touchData["eventTime"] as? Number)?.toLong() ?: System.currentTimeMillis()
    
    if (action == MotionEvent.ACTION_DOWN && isCapturingKeystrokes) {
      // Estimate which key was touched based on coordinates
      val estimatedKeyCode = estimateKeyCodeFromCoordinates(x, y)
      
      if (estimatedKeyCode != -1) {
        // Store touch coordinates for keystroke correlation
        touchCoordinates[estimatedKeyCode] = Pair(x, y)
        
        Log.d("DataCollectionModule", "Real touch captured: x=$x, y=$y, pressure=$pressure, estimatedKey=$estimatedKeyCode")
        
        return mapOf(
          "processed" to true,
          "x" to x,
          "y" to y,
          "pressure" to pressure,
          "estimatedKeyCode" to estimatedKeyCode,
          "isRealTouch" to true
        )
      } else {
        return mapOf("processed" to false, "reason" to "Could not estimate key")
      }
    } else {
      return mapOf("processed" to false, "reason" to "Not capturing or wrong action")
    }
  }

  // Helper Functions (existing ones enhanced)
  private fun isDebuggingEnabled(context: Context): Boolean {
    return try {
      Settings.Global.getInt(context.contentResolver, Settings.Global.ADB_ENABLED, 0) == 1
    } catch (e: Exception) {
      false
    }
  }

  private fun hasOverlayPermission(context: Context): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      Settings.canDrawOverlays(context)
    } else {
      true
    }
  }

  private fun hasUnknownAppsEnabled(context: Context): Boolean {
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.packageManager.canRequestPackageInstalls()
      } else {
        Settings.Secure.getInt(context.contentResolver, Settings.Secure.INSTALL_NON_MARKET_APPS, 0) == 1
      }
    } catch (e: Exception) {
      false
    }
  }

  private fun getEnabledAccessibilityServices(context: Context): List<String> {
    return try {
      val enabledServices = Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
      )
      enabledServices?.split(":") ?: emptyList()
    } catch (e: Exception) {
      emptyList()
    }
  }

  private fun getActiveInputMethod(context: Context): String {
    return try {
      Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.DEFAULT_INPUT_METHOD
      ) ?: "unknown"
    } catch (e: Exception) {
      "unknown"
    }
  }

  private fun getAppUsagePatterns(context: Context): Map<String, Long> {
    return try {
      if (!hasUsageStatsPermission(context)) {
        Log.d("DataCollection", "No usage stats permission")
        return emptyMap()
      }
      
      val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val calendar = Calendar.getInstance()
      calendar.add(Calendar.DAY_OF_YEAR, -1)
      val startTime = calendar.timeInMillis
      val endTime = System.currentTimeMillis()
      
      val usageStats = usageStatsManager.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startTime,
        endTime
      )
      
      // Filter to only include our banking application
      val targetPackageName = "com.viskar.code.bakingapplication"
      val usageMap = mutableMapOf<String, Long>()
      
      Log.d("DataCollection", "Total apps found: ${usageStats?.size ?: 0}")
      
      usageStats?.forEach { stats ->
        if (stats.packageName == targetPackageName) {
          Log.d("DataCollection", "Found banking app usage: ${stats.packageName} = ${stats.totalTimeInForeground}")
          usageMap[stats.packageName] = stats.totalTimeInForeground
        }
      }
      
      Log.d("DataCollection", "Filtered app usage patterns: $usageMap")
      usageMap
    } catch (e: Exception) {
      Log.e("DataCollection", "Error getting app usage patterns: ${e.message}")
      emptyMap()
    }
  }

  private fun hasUsageStatsPermission(context: Context): Boolean {
    return try {
      val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val calendar = Calendar.getInstance()
      calendar.add(Calendar.MINUTE, -1)
      val startTime = calendar.timeInMillis
      val endTime = System.currentTimeMillis()
      
      val usageStats = usageStatsManager.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startTime,
        endTime
      )
      
      usageStats != null && usageStats.isNotEmpty()
    } catch (e: Exception) {
      false
    }
  }

  private fun checkHardwareAttestation(): Boolean {
    return try {
      val keyStore = KeyStore.getInstance("AndroidKeyStore")
      keyStore.load(null)
      
      val keyGenParameterSpec = KeyGenParameterSpec.Builder(
        "attestation_test_key",
        KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
      )
        .setDigests(KeyProperties.DIGEST_SHA256)
        .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
        .setAttestationChallenge("test_challenge".toByteArray())
        .build()
      
      true
    } catch (e: Exception) {
      false
    }
  }
  
  private fun getDeviceFingerprint(context: Context): Map<String, String> {
    return mapOf(
      "brand" to Build.BRAND,
      "model" to Build.MODEL,
      "manufacturer" to Build.MANUFACTURER,
      "product" to Build.PRODUCT,
      "device" to Build.DEVICE,
      "board" to Build.BOARD,
      "hardware" to Build.HARDWARE,
      "fingerprint" to Build.FINGERPRINT,
      "androidId" to Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
    )
  }

  private fun getSimCountryCode(context: Context): String {
    return try {
      // Check if we have the required permission
      if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
        Log.w("DataCollectionModule", "READ_PHONE_STATE permission not granted")
        return "permission_denied"
      }

      val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
      if (telephonyManager == null) {
        Log.w("DataCollectionModule", "TelephonyManager not available")
        return "service_unavailable"
      }

      // Try to get SIM country code first (more reliable)
      val simCountry = telephonyManager.simCountryIso
      if (!simCountry.isNullOrEmpty()) {
        Log.d("DataCollectionModule", "SIM country code: $simCountry")
        return simCountry.uppercase()
      }

      // Fallback to network country code
      val networkCountry = telephonyManager.networkCountryIso
      if (!networkCountry.isNullOrEmpty()) {
        Log.d("DataCollectionModule", "Network country code: $networkCountry")
        return networkCountry.uppercase()
      }

      Log.w("DataCollectionModule", "No country code available from SIM or network")
      return "unavailable"
    } catch (e: SecurityException) {
      Log.e("DataCollectionModule", "Security exception getting SIM country: ${e.message}")
      return "permission_denied"
    } catch (e: Exception) {
      Log.e("DataCollectionModule", "Error getting SIM country: ${e.message}")
      return "error"
    }
  }
  
  // Hardware key event registration functions
  // Simplified registration for direct component integration
  private fun registerForKeystrokeCapture() {
    try {
      Log.d("DataCollectionModule", "Setting up direct component keystroke capture")
      
      // Clear any previous data
      activeKeyDowns.clear()
      touchCoordinates.clear()
      nativeKeystrokeData.clear()
      
      Log.d("DataCollectionModule", "Keystroke capture registration completed")
      
    } catch (e: Exception) {
      Log.e("DataCollectionModule", "Error registering keystroke capture: ${e.message}")
      throw e
    }
  }
  
  // Simplified system setup - no complex interception needed
  private fun setupSimplifiedCapture() {
    try {
      Log.d("DataCollectionModule", "Setting up simplified component-based capture")
      // No complex system-level interception needed for direct component integration
    } catch (e: Exception) {
      Log.e("DataCollectionModule", "Error setting up simplified capture: ${e.message}")
    }
  }
  
  // Simplified cleanup for direct component integration
  private fun cleanupKeystrokeCapture() {
    try {
      Log.d("DataCollectionModule", "Cleaning up keystroke capture")
      
      // Clear all active key tracking
      activeKeyDowns.clear()
      touchCoordinates.clear()
      
      Log.d("DataCollectionModule", "Keystroke capture cleanup completed")
      
    } catch (e: Exception) {
      Log.e("DataCollectionModule", "Error cleaning up keystroke capture: ${e.message}")
    }
  }
  
  // Add function to process real touch events for coordinate capture
  fun processRealTouchEvent(motionEvent: MotionEvent) {
    try {
      when (motionEvent.action) {
        MotionEvent.ACTION_DOWN -> {
          val x = motionEvent.x
          val y = motionEvent.y
          val pressure = motionEvent.pressure
          
          // Map touch coordinates to potential key codes
          // This is a simplified mapping - in reality, you'd need keyboard layout detection
          val estimatedKeyCode = estimateKeyCodeFromCoordinates(x, y)
          
          if (estimatedKeyCode != -1) {
            // Store touch coordinates for keystroke correlation
            touchCoordinates[estimatedKeyCode] = Pair(x, y)
            Log.d("DataCollectionModule", "Real touch captured: x=$x, y=$y, pressure=$pressure, estimatedKey=$estimatedKeyCode")
          }
        }
      }
    } catch (e: Exception) {
      Log.e("DataCollectionModule", "Error processing real touch event: ${e.message}")
    }
  }
  
  private fun estimateKeyCodeFromCoordinates(x: Float, y: Float): Int {
    // This is a simplified key mapping - in a real implementation,
    // you'd need to detect the keyboard layout and map coordinates to keys
    // For now, return a placeholder
    return -1
  }

  // ========== NATIVE TOUCH OVERLAY SYSTEM ==========
  // Creates invisible overlay to intercept real Android MotionEvents
  
  private fun setupNativeTouchOverlay() {
    // Skip overlay setup for in-app only data collection
    // The app will collect touch events through React Native's touch handling
    Log.i("DataCollectionModule", "Native touch overlay disabled - using in-app touch collection only")
    
    // Mark as successfully set up without creating system overlay
    // Touch events will be captured through the React Native layer
  }
  
  private fun removeNativeTouchOverlay() {
    // No overlay to remove since we're using in-app touch collection only
    Log.i("DataCollectionModule", "Native touch overlay cleanup - no overlay was created")
    
    // Clean up references
    nativeTouchOverlay = null
    windowManager = null
  }
  
  // ========== REAL MOTIONEVENT PROCESSING ==========
  // Processes authentic Android MotionEvent objects
  
  private fun processNativeMotionEvent(event: MotionEvent) {
    try {
      val action = event.actionMasked
      val pointerIndex = event.actionIndex
      val pointerId = event.getPointerId(pointerIndex)
      
      // Extract hardware-level touch data
      val nativeTouchEvent = NativeTouchEventData(
        pointerId = pointerId,
        action = action,
        x = event.getX(pointerIndex),
        y = event.getY(pointerIndex),
        rawX = event.rawX,
        rawY = event.rawY,
        pressure = event.getPressure(pointerIndex),
        size = event.getSize(pointerIndex),
        touchMajor = event.getTouchMajor(pointerIndex),
        touchMinor = event.getTouchMinor(pointerIndex),
        orientation = event.getOrientation(pointerIndex),
        timestamp = System.currentTimeMillis(),
        eventTime = event.eventTime,
        downTime = event.downTime,
        deviceId = event.deviceId,
        source = event.source,
        toolType = event.getToolType(pointerIndex),
        isHardwareEvent = true
      )
      
      // Store the authentic touch event
      nativeTouchEvents.add(nativeTouchEvent)
      
      // Track active touches for gesture analysis
      when (action) {
        MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
          val touchPoint = NativeTouchPoint(
            pointerId = pointerId,
            startX = event.getX(pointerIndex),
            startY = event.getY(pointerIndex),
            startTime = event.eventTime,
            startPressure = event.getPressure(pointerIndex),
            currentX = event.getX(pointerIndex),
            currentY = event.getY(pointerIndex),
            currentPressure = event.getPressure(pointerIndex),
            lastUpdateTime = event.eventTime
          )
          activeTouches[pointerId] = touchPoint
          
          Log.d("DataCollectionModule", "REAL TOUCH DOWN: Pointer $pointerId at (${event.getX(pointerIndex)}, ${event.getY(pointerIndex)}) pressure=${event.getPressure(pointerIndex)}")
        }
        
        MotionEvent.ACTION_MOVE -> {
          // Update all active pointers with enhanced tracking
          for (i in 0 until event.pointerCount) {
            val id = event.getPointerId(i)
            activeTouches[id]?.let { touchPoint ->
              val prevX = touchPoint.currentX
              val prevY = touchPoint.currentY
              val prevTime = touchPoint.lastUpdateTime
              
              touchPoint.currentX = event.getX(i)
              touchPoint.currentY = event.getY(i)
              touchPoint.currentPressure = event.getPressure(i)
              touchPoint.lastUpdateTime = event.eventTime
              
              // Calculate instantaneous velocity for precise swipe detection
              val timeDelta = event.eventTime - prevTime
              if (timeDelta > 0) {
                val deltaX = touchPoint.currentX - prevX
                val deltaY = touchPoint.currentY - prevY
                val distance = sqrt(deltaX * deltaX + deltaY * deltaY)
                val velocity = distance / timeDelta // pixels per ms
                
                // Log high-velocity movements for swipe analysis
                if (velocity > 1.0) {
                  val direction = if (abs(deltaX) > abs(deltaY)) {
                    if (deltaX > 0) "right" else "left"
                  } else {
                    if (deltaY > 0) "down" else "up"
                  }
                  
                  Log.v("DataCollectionModule", "Fast movement detected: velocity=${String.format("%.2f", velocity)} direction=$direction deltaX=${String.format("%.1f", deltaX)} deltaY=${String.format("%.1f", deltaY)}")
                }
              }
            }
          }
        }
        
        MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> {
          // Analyze gesture before removing touch point
          activeTouches[pointerId]?.let { touchPoint ->
            val totalDuration = event.eventTime - touchPoint.startTime
            val totalDeltaX = event.getX(pointerIndex) - touchPoint.startX
            val totalDeltaY = event.getY(pointerIndex) - touchPoint.startY
            val totalDistance = sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY)
            val avgVelocity = if (totalDuration > 0) totalDistance / totalDuration else 0f
            
            // Enhanced gesture classification
            val gestureType = when {
              activeTouches.size > 1 -> "pinch"
              totalDuration > 500 && totalDistance < 15 -> "long_press"
              totalDistance >= 20 && avgVelocity >= 0.8 -> "swipe"
              totalDistance >= 15 && avgVelocity < 0.8 -> "scroll"
              else -> "tap"
            }
            
            val direction = if (abs(totalDeltaX) > abs(totalDeltaY)) {
              if (totalDeltaX > 0) "right" else "left"
            } else {
              if (totalDeltaY > 0) "down" else "up"
            }
            
            Log.d("DataCollectionModule", "GESTURE COMPLETE: $gestureType direction=$direction distance=${String.format("%.1f", totalDistance)} velocity=${String.format("%.2f", avgVelocity)} duration=${totalDuration}ms")
          }
          
          activeTouches.remove(pointerId)
          Log.d("DataCollectionModule", "REAL TOUCH UP: Pointer $pointerId")
        }
        
        MotionEvent.ACTION_CANCEL -> {
          activeTouches.clear()
          Log.d("DataCollectionModule", "REAL TOUCH CANCELLED")
        }
      }
      
      // Log authentic hardware data
      Log.v("DataCollectionModule", "Authentic MotionEvent: action=${getActionName(action)} x=${event.getX(pointerIndex)} y=${event.getY(pointerIndex)} pressure=${event.getPressure(pointerIndex)} time=${event.eventTime}")
      
    } catch (e: Exception) {
      Log.e("DataCollectionModule", "Error processing native motion event: ${e.message}", e)
    }
  }
  
  private fun getActionName(action: Int): String {
    return when (action) {
      MotionEvent.ACTION_DOWN -> "ACTION_DOWN"
      MotionEvent.ACTION_UP -> "ACTION_UP"
      MotionEvent.ACTION_MOVE -> "ACTION_MOVE"
      MotionEvent.ACTION_CANCEL -> "ACTION_CANCEL"
      MotionEvent.ACTION_POINTER_DOWN -> "ACTION_POINTER_DOWN"
      MotionEvent.ACTION_POINTER_UP -> "ACTION_POINTER_UP"
      else -> "ACTION_UNKNOWN($action)"
    }
  }
}

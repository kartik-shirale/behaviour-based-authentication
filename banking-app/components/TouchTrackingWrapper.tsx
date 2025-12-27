import React, { ReactNode, useRef } from 'react';
import { GestureResponderEvent, View } from 'react-native';
import { useDataCollectionStore } from '../stores/useDataCollectionStore';

interface TouchTrackingWrapperProps {
  children: ReactNode;
  className?: string;
  style?: any;
}

export function TouchTrackingWrapper({ children, className, style }: TouchTrackingWrapperProps) {
  const { collectTouchEvent } = useDataCollectionStore();

  const touchData = useRef({
    startTime: 0,
    startX: 0,
    startY: 0,
    lastMoveTime: 0,
    moveCount: 0,
    totalDistance: 0,
    isScrolling: false,
    isPinching: false,
    startPressure: undefined as number | undefined,
    endPressure: undefined as number | undefined
  });

  const handleTouchStart = async (event: GestureResponderEvent) => {
    const { pageX, pageY, touches, force } = event.nativeEvent;
    const currentTime = Date.now();

    touchData.current = {
      startTime: currentTime,
      startX: pageX,
      startY: pageY,
      lastMoveTime: currentTime,
      moveCount: 0,
      totalDistance: 0,
      isScrolling: false,
      isPinching: touches && touches.length > 1,
      startPressure: force,
      endPressure: undefined
    };

    // Store touch start data for later use
    console.log('Touch start collected:', 0);
  };

  const handleTouchMove = async (event: GestureResponderEvent) => {
    if (!touchData.current.startTime) return;

    const { pageX, pageY, touches, force } = event.nativeEvent;
    const currentTime = Date.now();

    // Calculate distance from start position
    const deltaX = pageX - touchData.current.startX;
    const deltaY = pageY - touchData.current.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    touchData.current.totalDistance = distance;
    touchData.current.moveCount++;
    touchData.current.lastMoveTime = currentTime;

    // Detect pinch gesture (multi-touch)
    if (touches && touches.length >= 2) {
      touchData.current.isPinching = true;
    }

    // Enhanced swipe detection with direction analysis
    const timeDelta = currentTime - touchData.current.startTime;
    const velocity = timeDelta > 0 ? distance / timeDelta : 0;

    // Detect scrolling vs swipe based on movement pattern
    if (touchData.current.moveCount > 3 && distance > 15) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Determine primary direction
      const isHorizontal = absX > absY;
      const isVertical = absY > absX;

      // Scrolling: consistent direction with moderate velocity
      if (velocity > 0.3 && velocity < 2.0) {
        if ((isVertical && absY > 30) || (isHorizontal && absX > 30)) {
          touchData.current.isScrolling = true;
        }
      }

      // Fast swipe: high velocity in clear direction
      if (velocity > 1.5 && (absX > 25 || absY > 25)) {
        touchData.current.isScrolling = false; // Override scroll detection for fast swipes
      }
    }

    // Store end pressure for final calculation
    if (force !== undefined && force !== null && force > 0) {
      touchData.current.endPressure = force;
    }

    // Log significant movements with enhanced gesture analysis
    if (velocity > 0.4) {
      const direction = Math.abs(deltaX) > Math.abs(deltaY) ?
        (deltaX > 0 ? 'right' : 'left') :
        (deltaY > 0 ? 'down' : 'up');

      console.log('🔄 Touch move detected:', {
        velocity: velocity.toFixed(3),
        gestureType: touchData.current.isScrolling ? "scroll" : "swipe",
        direction,
        coords: `(${pageX}, ${pageY})`,
        distance: distance.toFixed(2),
        deltaX: deltaX.toFixed(1),
        deltaY: deltaY.toFixed(1)
      });
    }
  };

  const handleTouchEnd = async (event: GestureResponderEvent) => {
    if (!touchData.current.startTime) return;

    const { pageX, pageY, force } = event.nativeEvent;
    const touchEndTime = Date.now();
    const duration = touchEndTime - touchData.current.startTime;

    // Calculate final distance and velocity
    const deltaX = pageX - touchData.current.startX;
    const deltaY = pageY - touchData.current.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = duration > 0 ? distance / duration : 0;

    // Handle end pressure with same fallback logic
    let endPressureValue: number | undefined;
    if (force !== undefined && force !== null && force > 0) {
      endPressureValue = force;
    } else {
      endPressureValue = undefined;
    }
    touchData.current.endPressure = endPressureValue;

    // Log basic touch end information for debugging
    console.log('Touch end analysis:', {
      distance: distance.toFixed(3),
      duration,
      velocity: velocity.toFixed(3),
      moveCount: touchData.current.moveCount
    });

    try {
      // Enhanced gesture type determination with precise thresholds
      let gestureType: "tap" | "swipe" | "scroll" | "pinch" | "long_press" = "tap";

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const isHorizontal = absX > absY;
      const isVertical = absY > absX;

      if (touchData.current.isPinching) {
        gestureType = "pinch";
      } else if (duration > 500 && distance < 15) {
        // Long press: long duration with minimal movement
        gestureType = "long_press";
      } else if (touchData.current.isScrolling && touchData.current.moveCount > 5) {
        // Scroll: multiple moves with consistent direction
        gestureType = "scroll";
      } else if (distance > 15) {
        // Swipe detection with direction validation
        const minSwipeDistance = 20;
        const minSwipeVelocity = 0.8; // pixels per ms

        if (distance >= minSwipeDistance && velocity >= minSwipeVelocity) {
          gestureType = "swipe";
        } else if (distance >= minSwipeDistance) {
          // Slower movement but significant distance - still a swipe
          gestureType = "swipe";
        } else if (touchData.current.moveCount > 3) {
          // Multiple small movements - likely scroll
          gestureType = "scroll";
        }
      }

      // Use average pressure if both start and end are available, otherwise use whichever is available
      let averagePressure: number | undefined;
      if (touchData.current.startPressure !== undefined && touchData.current.endPressure !== undefined) {
        averagePressure = (touchData.current.startPressure + touchData.current.endPressure) / 2;
      } else if (touchData.current.startPressure !== undefined) {
        averagePressure = touchData.current.startPressure;
      } else if (touchData.current.endPressure !== undefined) {
        averagePressure = touchData.current.endPressure;
      } else {
        averagePressure = undefined; // Device doesn't support pressure
      }

      // For taps and short gestures, use start coordinates as end coordinates if end coordinates are invalid
      let finalEndX = pageX;
      let finalEndY = pageY;

      // If this is a tap or the end coordinates are invalid/zero, use start coordinates
      if (gestureType === "tap" || pageX === 0 || pageY === 0 || pageX === undefined || pageY === undefined) {
        finalEndX = touchData.current.startX;
        finalEndY = touchData.current.startY;
      }

      // Call the store's collectTouchEvent to generate patterns
      await collectTouchEvent({
        gestureType,
        startX: touchData.current.startX,
        startY: touchData.current.startY,
        endX: finalEndX,
        endY: finalEndY,
        duration,
        distance,
        velocity,
        pressure: averagePressure
      });

      console.log('✅ Touch end collected:', {
        gestureType,
        duration: duration + 'ms',
        startCoords: `(${touchData.current.startX}, ${touchData.current.startY})`,
        endCoords: `(${finalEndX}, ${finalEndY})`,
        distance: distance.toFixed(2),
        velocity: velocity.toFixed(3),
        direction: absX > absY ? (deltaX > 0 ? 'right' : 'left') : (deltaY > 0 ? 'down' : 'up'),
        moveCount: touchData.current.moveCount,
        deltaX: deltaX.toFixed(1),
        deltaY: deltaY.toFixed(1)
      });
    } catch (error) {
      console.error('Failed to collect touch event:', error);
    }

    // Reset touch data
    touchData.current = {
      startTime: 0,
      startX: 0,
      startY: 0,
      lastMoveTime: 0,
      moveCount: 0,
      totalDistance: 0,
      isScrolling: false,
      isPinching: false,
      startPressure: undefined,
      endPressure: undefined
    };
  };

  return (
    <View
      className={className}
      style={style}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </View>
  );
}
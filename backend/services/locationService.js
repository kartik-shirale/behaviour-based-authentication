class LocationService {
  constructor() {
    // Earth's radius in kilometers
    this.EARTH_RADIUS_KM = 6371;
  }

  // Convert degrees to radians
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Convert radians to degrees
  toDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  // Convert lat-long to Cartesian coordinates (for computational geometry)
  latLongToCartesian(lat, lon) {
    const latRad = this.toRadians(lat);
    const lonRad = this.toRadians(lon);

    return {
      x: this.EARTH_RADIUS_KM * Math.cos(latRad) * Math.cos(lonRad),
      y: this.EARTH_RADIUS_KM * Math.cos(latRad) * Math.sin(lonRad),
      z: this.EARTH_RADIUS_KM * Math.sin(latRad)
    };
  }

  // Convert Cartesian coordinates back to lat-long
  cartesianToLatLong(x, y, z) {
    const lat = Math.asin(z / this.EARTH_RADIUS_KM);
    const lon = Math.atan2(y, x);

    return {
      latitude: this.toDegrees(lat),
      longitude: this.toDegrees(lon)
    };
  }

  // Calculate circle from three points
  circleFromThreePoints(p1, p2, p3) {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;

    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

    if (Math.abs(d) < 1e-10) {
      // Points are collinear, return null
      return null;
    }

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

    const radius = Math.sqrt((ux - ax) * (ux - ax) + (uy - ay) * (uy - ay));

    return {
      center: { x: ux, y: uy },
      radius: radius
    };
  }

  // Calculate circle from two points (diameter)
  circleFromTwoPoints(p1, p2) {
    const centerX = (p1.x + p2.x) / 2;
    const centerY = (p1.y + p2.y) / 2;
    const radius = Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)) / 2;

    return {
      center: { x: centerX, y: centerY },
      radius: radius
    };
  }

  // Check if point is inside circle
  isPointInCircle(point, circle) {
    const dx = point.x - circle.center.x;
    const dy = point.y - circle.center.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared <= circle.radius * circle.radius + 1e-10; // Small epsilon for floating point errors
  }

  // Welzl's algorithm implementation for smallest enclosing circle
  welzlAlgorithm(points, boundary = []) {
    // Base cases
    if (points.length === 0 || boundary.length === 3) {
      if (boundary.length === 0) {
        return { center: { x: 0, y: 0 }, radius: 0 };
      } else if (boundary.length === 1) {
        return { center: { x: boundary[0].x, y: boundary[0].y }, radius: 0 };
      } else if (boundary.length === 2) {
        return this.circleFromTwoPoints(boundary[0], boundary[1]);
      } else {
        return this.circleFromThreePoints(boundary[0], boundary[1], boundary[2]);
      }
    }

    // Pick a random point
    const randomIndex = Math.floor(Math.random() * points.length);
    const p = points[randomIndex];
    const remainingPoints = points.filter((_, index) => index !== randomIndex);

    // Recursively find circle without this point
    const circle = this.welzlAlgorithm(remainingPoints, boundary);

    // If point is inside circle, return the circle
    if (this.isPointInCircle(p, circle)) {
      return circle;
    }

    // Otherwise, point must be on the boundary
    return this.welzlAlgorithm(remainingPoints, [...boundary, p]);
  }

  // Main function to find smallest enclosing circle for location patterns
  findSmallestEnclosingCircle(locationPatterns) {
    try {
      if (!locationPatterns || locationPatterns.length === 0) {
        return null;
      }

      // Convert lat-long to 2D projection (simple equirectangular)
      const points = locationPatterns.map(location => ({
        x: location.longitude,
        y: location.latitude,
        original: location
      }));

      // Remove duplicates
      const uniquePoints = [];
      const seen = new Set();

      for (const point of points) {
        const key = `${point.x.toFixed(6)},${point.y.toFixed(6)}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePoints.push(point);
        }
      }

      if (uniquePoints.length === 0) {
        return null;
      }

      if (uniquePoints.length === 1) {
        return {
          center: {
            latitude: uniquePoints[0].y,
            longitude: uniquePoints[0].x
          },
          radiusKm: 0
        };
      }

      // Apply Welzl's algorithm
      const circle = this.welzlAlgorithm(uniquePoints);

      if (!circle) {
        return null;
      }

      // Convert radius from degrees to kilometers (approximate)
      // At equator: 1 degree ≈ 111 km
      const avgLat = uniquePoints.reduce((sum, p) => sum + p.y, 0) / uniquePoints.length;
      const kmPerDegreeLon = 111.32 * Math.cos(this.toRadians(avgLat));
      const kmPerDegreeLat = 110.54;

      // Calculate radius in km using the larger of the two conversions for safety
      const radiusKm = circle.radius * Math.max(kmPerDegreeLat, kmPerDegreeLon);

      return {
        center: {
          latitude: circle.center.y,
          longitude: circle.center.x
        },
        radiusKm: radiusKm
      };
    } catch (error) {
      console.error('Error finding smallest enclosing circle:', error);
      throw error;
    }
  }

  // Validate if a location is within the user's normal area
  async validateLocation(userId, incomingLocation) {
    try {
      if (!userId || !incomingLocation) {
        throw new Error('userId and incomingLocation are required');
      }

      if (!incomingLocation.latitude || !incomingLocation.longitude) {
        throw new Error('latitude and longitude are required in incomingLocation');
      }

      // Check for VPN usage - skip validation if VPN is detected
      if (incomingLocation.vpn === true || incomingLocation.isVpn === true) {
        return {
          isValid: false,
          reason: 'VPN-enabled location detected - location validation skipped',
          confidence: 0,
          vpnDetected: true,
          details: {
            vpnStatus: 'detected',
            validationSkipped: true
          }
        };
      }

      // Import userService here to avoid circular dependency
      const { default: userService } = await import('./userService.js');

      // Get user's behaviour profile
      const behaviourProfile = await userService.getBehaviourProfile(userId);

      if (!behaviourProfile || !behaviourProfile.locationPatterns || behaviourProfile.locationPatterns.length === 0) {
        return {
          isValid: false,
          reason: 'No historical location data found for user',
          confidence: 0
        };
      }

      // Separate VPN and non-VPN locations from historical data
      const vpnLocations = behaviourProfile.locationPatterns.filter(location =>
        location.vpnDetected === true
      );
      const nonVpnLocations = behaviourProfile.locationPatterns.filter(location =>
        location.vpnDetected !== true
      );

      // If no non-VPN locations available for validation
      if (nonVpnLocations.length === 0) {
        return {
          isValid: false,
          reason: 'No non-VPN historical location data available for validation',
          confidence: 0,
          vpnDetected: false,
          details: {
            totalHistoricalLocations: behaviourProfile.locationPatterns.length,
            vpnLocationsCount: vpnLocations.length,
            nonVpnLocationsCount: 0,
            validationSkipped: true
          }
        };
      }

      // Find smallest enclosing circle using only non-VPN locations
      const enclosingCircle = this.findSmallestEnclosingCircle(nonVpnLocations);

      if (!enclosingCircle) {
        return {
          isValid: false,
          reason: 'Unable to calculate location boundary',
          confidence: 0
        };
      }

      // Calculate distance from incoming location to circle center
      const distanceToCenter = this.calculateDistance(
        incomingLocation.latitude,
        incomingLocation.longitude,
        enclosingCircle.center.latitude,
        enclosingCircle.center.longitude
      );

      // Check if location is within the circle
      const isWithinCircle = distanceToCenter <= enclosingCircle.radiusKm;

      // Calculate confidence based on distance ratio
      let confidence;
      if (isWithinCircle) {
        // Inside circle: confidence decreases as we move away from center
        confidence = Math.max(0.5, 1 - (distanceToCenter / enclosingCircle.radiusKm));
      } else {
        // Outside circle: confidence decreases rapidly with distance
        const excessDistance = distanceToCenter - enclosingCircle.radiusKm;
        confidence = Math.max(0, 0.5 * Math.exp(-excessDistance / enclosingCircle.radiusKm));
      }

      return {
        isValid: isWithinCircle,
        reason: isWithinCircle ? 'Location within normal area' : 'Location outside normal area',
        confidence: confidence,
        vpnDetected: false,
        details: {
          distanceToCenter: distanceToCenter,
          allowedRadius: enclosingCircle.radiusKm,
          excessDistance: Math.max(0, distanceToCenter - enclosingCircle.radiusKm),
          totalHistoricalLocations: behaviourProfile.locationPatterns.length,
          vpnLocationsCount: vpnLocations.length,
          nonVpnLocationsCount: nonVpnLocations.length,
          circleCenter: enclosingCircle.center,
          validationUsedNonVpnOnly: true
        }
      };
    } catch (error) {
      console.error('Error validating location:', error);
      return {
        isValid: false,
        reason: `Location validation failed: ${error.message}`,
        confidence: 0
      };
    }
  }
}

export default new LocationService();
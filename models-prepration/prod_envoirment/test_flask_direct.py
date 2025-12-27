import sys
sys.path.append('.')

from app import app

# Test the Flask app directly
with app.test_client() as client:
    print("Testing Flask app directly...")
    
    # Test health endpoint
    print("\n1. Testing /health endpoint:")
    response = client.get('/health')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.get_data(as_text=True)}")
    
    # Test motion encoder endpoint
    print("\n2. Testing /encode/motion endpoint:")
    motion_data = {
        "data": [
            {
                "timestamp": 1000,
                "accel_x": 0.5,
                "accel_y": -0.2,
                "accel_z": 9.8,
                "gyro_x": 0.1,
                "gyro_y": -0.05,
                "gyro_z": 0.02
            }
        ]
    }
    response = client.post('/encode/motion', json=motion_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.get_data(as_text=True)}")
    
    # Test gesture encoder endpoint
    print("\n3. Testing /encode/gesture endpoint:")
    gesture_data = {
        "data": [
            {
                "timestamp": 1000,
                "x": 150.5,
                "y": 200.3,
                "pressure": 0.8,
                "touch_major": 12.5,
                "touch_minor": 8.2,
                "orientation": 0.5,
                "tool_type": 1
            }
        ]
    }
    response = client.post('/encode/gesture', json=gesture_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.get_data(as_text=True)}")
    
    # Test typing encoder endpoint
    print("\n4. Testing /encode/typing endpoint:")
    typing_data = {
        "data": [
            {
                "timestamp": 1000,
                "key": "h",
                "press_time": 120,
                "release_time": 180,
                "x": 100.5,
                "y": 200.3,
                "pressure": 0.8,
                "touch_major": 12.5,
                "touch_minor": 8.2
            }
        ]
    }
    response = client.post('/encode/typing', json=typing_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.get_data(as_text=True)}")
    
    print("\n5. Available routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")
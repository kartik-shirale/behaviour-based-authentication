import requests
import json

# Test motion encoder
print("Testing Motion Encoder...")
with open('test_motion_data.json', 'r') as f:
    motion_data = json.load(f)

try:
    response = requests.post('http://localhost:5000/encode/motion', json=motion_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    if response.status_code == 200:
        result = response.json()
        print(f"Embedding shape: {len(result.get('embedding', []))}")
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*50 + "\n")

# Test touch encoder
print("Testing Touch Encoder...")
with open('test_touch_data.json', 'r') as f:
    touch_data = json.load(f)

try:
    response = requests.post('http://localhost:5000/encode/gesture', json=touch_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    if response.status_code == 200:
        result = response.json()
        print(f"Embedding shape: {len(result.get('embedding', []))}")
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*50 + "\n")

# Test typing encoder
print("Testing Typing Encoder...")
with open('test_typing_data.json', 'r') as f:
    typing_data = json.load(f)

try:
    response = requests.post('http://localhost:5000/encode/typing', json=typing_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    if response.status_code == 200:
        result = response.json()
        print(f"Embedding shape: {len(result.get('embedding', []))}")
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*50 + "\n")

# Test health endpoint
print("Testing Health Endpoint...")
try:
    response = requests.get('http://localhost:5000/health')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
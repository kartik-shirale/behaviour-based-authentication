#!/usr/bin/env python3
import subprocess
import time
import requests
import sys
import os

def test_server():
    print("Starting Flask server...")
    
    # Change to the correct directory
    os.chdir('s:\\Fraude-detection\\encoders_1.0\\prod_envoirment')
    
    # Start the server in a subprocess
    server_process = subprocess.Popen(
        [sys.executable, 'app.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )
    
    # Wait for server to start
    print("Waiting for server to start...")
    time.sleep(5)
    
    # Test the endpoints
    endpoints = [
        'http://127.0.0.1:5000/health',
        'http://127.0.0.1:5000/status',
        'http://127.0.0.1:5000/'
    ]
    
    for endpoint in endpoints:
        try:
            print(f"\nTesting {endpoint}...")
            response = requests.get(endpoint, timeout=5)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text[:200]}")
        except Exception as e:
            print(f"Error: {e}")
    
    # Get server output
    print("\n=== Server Output ===")
    try:
        output, _ = server_process.communicate(timeout=2)
        print(output)
    except subprocess.TimeoutExpired:
        print("Server still running, getting partial output...")
        server_process.terminate()
        output, _ = server_process.communicate()
        print(output)

if __name__ == '__main__':
    test_server()
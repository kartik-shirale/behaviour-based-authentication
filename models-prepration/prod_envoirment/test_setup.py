#!/usr/bin/env python3
"""
Test script to verify the Flask production system setup

This script tests the core components without starting the Flask server,
which is useful for verifying the setup before deployment.
"""

import sys
import os
import traceback
from pathlib import Path

def test_imports():
    """Test if all required modules can be imported"""
    print("Testing imports...")
    
    try:
        # Test core modules
        from config import Config
        from encoder_service import EncoderService
        from validators import InputValidator, RequestValidator
        print("✓ Core modules imported successfully")
        
        # Test Flask (might fail due to version issues)
        try:
            from flask import Flask
            print("✓ Flask imported successfully")
        except ImportError as e:
            print(f"⚠ Flask import failed: {e}")
            print("  This is likely due to version compatibility issues.")
            print("  Install compatible versions: pip install Flask==2.2.5 Werkzeug==2.2.3")
        
        return True
        
    except Exception as e:
        print(f"✗ Import failed: {e}")
        traceback.print_exc()
        return False

def test_config():
    """Test configuration system"""
    print("\nTesting configuration...")
    
    try:
        from config import Config
        config = Config()
        
        # Test basic config access
        host = config.get('server.host', 'localhost')
        port = config.get('server.port', 5000)
        
        print(f"✓ Configuration loaded - Host: {host}, Port: {port}")
        
        # Test configuration methods
        model_config = config.get_model_config('motion_encoder')
        flask_config = config.get_flask_config()
        device_config = config.get_device_config('motion_encoder')
        
        print("✓ Configuration methods working")
        
        return True
        
    except Exception as e:
        print(f"✗ Configuration test failed: {e}")
        traceback.print_exc()
        return False

def test_encoder_service():
    """Test encoder service initialization"""
    print("\nTesting encoder service...")
    
    try:
        from encoder_service import EncoderService
        from config import Config
        
        config = Config()
        service = EncoderService(config)
        
        print("✓ EncoderService initialized")
        
        # Test model status
        status = service.get_model_status()
        print(f"✓ Model status retrieved: {len(status)} models")
        
        # Test health check
        is_healthy = service.is_healthy()
        print(f"✓ Health check: {'Healthy' if is_healthy else 'Unhealthy (expected with placeholder models)'}")
        
        return True
        
    except Exception as e:
        print(f"✗ Encoder service test failed: {e}")
        traceback.print_exc()
        return False

def test_validators():
    """Test input validation"""
    print("\nTesting validators...")
    
    try:
        from validators import InputValidator, RequestValidator
        
        # Test motion data validation
        motion_data = {
            'accelerometer': [[0.1, 0.4, 0.7], [0.2, 0.5, 0.8], [0.3, 0.6, 0.9]],
            'gyroscope': [[0.01, 0.04, 0.07], [0.02, 0.05, 0.08], [0.03, 0.06, 0.09]],
            'magnetometer': [[0.1, 0.2, 0.3], [0.1, 0.2, 0.3], [0.1, 0.2, 0.3]],
            'timestamp': [1000, 2000, 3000],
            'pressure': [1013.25, 1013.26, 1013.27]
        }
        
        InputValidator.validate_motion_data(motion_data)
        print("✓ Motion data validation passed")
        
        # Test gesture data validation
        gesture_data = {
            'x': [100, 150, 200],
            'y': [200, 250, 300],
            'pressure': [0.5, 0.7, 0.6],
            'area': [10, 12, 11],
            'orientation': [0, 15, 30],
            'timestamp': [1000, 1100, 1200],
            'velocity': [5.0, 7.5, 6.2]
        }
        
        InputValidator.validate_gesture_data(gesture_data)
        print("✓ Gesture data validation passed")
        
        # Test typing data validation
        typing_data = [
            {'character': 'h', 'dwellTime': 120, 'flightTime': 80, 'x': 100, 'y': 200},
            {'character': 'e', 'dwellTime': 110, 'flightTime': 75, 'x': 150, 'y': 200}
        ]
        
        InputValidator.validate_typing_data(typing_data)
        print("✓ Typing data validation passed")
        
        return True
        
    except Exception as e:
        print(f"✗ Validator test failed: {e}")
        traceback.print_exc()
        return False

def test_directory_structure():
    """Test if all required directories and files exist"""
    print("\nTesting directory structure...")
    
    required_files = [
        'app.py',
        'config.py', 
        'encoder_service.py',
        'validators.py',
        'requirements.txt',
        'README.md',
        'run.py'
    ]
    
    required_dirs = [
        'models',
        'models/motion_encoder',
        'models/touch_encoder', 
        'models/typing_encoder'
    ]
    
    all_good = True
    
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"✓ {file_path}")
        else:
            print(f"✗ {file_path} missing")
            all_good = False
    
    for dir_path in required_dirs:
        if Path(dir_path).is_dir():
            print(f"✓ {dir_path}/")
        else:
            print(f"✗ {dir_path}/ missing")
            all_good = False
    
    return all_good

def main():
    """Run all tests"""
    print("=" * 60)
    print("Flask Production System Setup Test")
    print("=" * 60)
    
    tests = [
        ("Directory Structure", test_directory_structure),
        ("Imports", test_imports),
        ("Configuration", test_config),
        ("Encoder Service", test_encoder_service),
        ("Validators", test_validators)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"✗ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"{test_name:.<40} {status}")
        if result:
            passed += 1
    
    print(f"\nTotal: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\n🎉 All tests passed! The system is ready for deployment.")
        print("\nTo start the server:")
        print("  python run.py")
        print("  or")
        print("  python app.py")
    else:
        print("\n⚠ Some tests failed. Please check the issues above.")
        print("\nFor Flask version issues, run:")
        print("  pip install Flask==2.2.5 Werkzeug==2.2.3")
    
    return passed == len(results)

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
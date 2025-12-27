#!/usr/bin/env python3
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('simple_app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Health check endpoints
@app.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint"""
    logger.info("Health endpoint accessed")
    return jsonify({
        'status': 'healthy',
        'message': 'Service is running',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'Fraud Detection Encoder API'
    })

@app.route('/status', methods=['GET'])
def service_status():
    """Service status endpoint"""
    logger.info("Status endpoint accessed")
    return jsonify({
        'status': 'running',
        'message': 'Service status check',
        'timestamp': datetime.utcnow().isoformat(),
        'encoders': {
            'motion': 'placeholder',
            'touch': 'placeholder', 
            'typing': 'placeholder'
        }
    })

@app.route('/encode/motion', methods=['POST'])
def encode_motion():
    """Motion encoding endpoint"""
    logger.info("Motion encode endpoint accessed")
    return jsonify({
        'status': 'success',
        'message': 'Motion encoding placeholder',
        'encoding': [0.1, 0.2, 0.3, 0.4, 0.5]  # Placeholder encoding
    })

@app.route('/encode/gesture', methods=['POST'])
def encode_gesture():
    """Gesture encoding endpoint"""
    logger.info("Gesture encode endpoint accessed")
    return jsonify({
        'status': 'success',
        'message': 'Gesture encoding placeholder',
        'encoding': [0.6, 0.7, 0.8, 0.9, 1.0]  # Placeholder encoding
    })

@app.route('/encode/typing', methods=['POST'])
def encode_typing():
    """Typing encoding endpoint"""
    logger.info("Typing encode endpoint accessed")
    return jsonify({
        'status': 'success',
        'message': 'Typing encoding placeholder',
        'encoding': [1.1, 1.2, 1.3, 1.4, 1.5]  # Placeholder encoding
    })

@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    logger.info("Root endpoint accessed")
    return jsonify({
        'message': 'Fraud Detection Encoder API',
        'version': '1.0',
        'endpoints': ['/health', '/status', '/encode/motion', '/encode/gesture', '/encode/typing']
    })

if __name__ == '__main__':
    logger.info("Starting simple Flask application...")
    
    # Print all registered routes
    logger.info("Registered routes:")
    for rule in app.url_map.iter_rules():
        logger.info(f"  {rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")
    
    app.run(
        host='0.0.0.0',
        port=5002,
        debug=False
    )
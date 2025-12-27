#!/usr/bin/env python3
from flask import Flask, jsonify
import logging

# Create a minimal Flask app
app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/', methods=['GET'])
def root():
    logger.info("Root endpoint accessed")
    return jsonify({"message": "Root endpoint working"})

@app.route('/health', methods=['GET'])
def health():
    logger.info("Health endpoint accessed")
    return jsonify({"status": "healthy", "message": "Minimal test working"})

@app.route('/test', methods=['GET'])
def test():
    logger.info("Test endpoint accessed")
    return jsonify({"message": "Test endpoint working"})

if __name__ == '__main__':
    logger.info("Starting minimal Flask app...")
    
    # Print all registered routes
    logger.info("Registered routes:")
    for rule in app.url_map.iter_rules():
        logger.info(f"  {rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")
    
    app.run(host='0.0.0.0', port=5001, debug=False)
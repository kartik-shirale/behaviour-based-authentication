#!/usr/bin/env python3
"""
Startup script for the Fraud Detection Encoder API

This script provides a simple way to start the Flask application
with proper configuration and error handling.
"""

import os
import sys
import argparse
from app import app, config, logger

def main():
    """Main entry point for the application"""
    parser = argparse.ArgumentParser(description='Fraud Detection Encoder API Server')
    parser.add_argument('--host', default=None, help='Host to bind to')
    parser.add_argument('--port', type=int, default=None, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--config', help='Path to configuration file')
    
    args = parser.parse_args()
    
    # Load custom config if provided
    if args.config:
        if os.path.exists(args.config):
            config.load_from_file(args.config)
            logger.info(f"Loaded configuration from {args.config}")
        else:
            logger.error(f"Configuration file not found: {args.config}")
            sys.exit(1)
    
    # Override config with command line arguments
    host = args.host or config.get('server.host', '0.0.0.0')
    port = args.port or config.get('server.port', 5000)
    debug = args.debug or config.get('server.debug', False)
    
    logger.info(f"Starting Fraud Detection Encoder API")
    logger.info(f"Host: {host}")
    logger.info(f"Port: {port}")
    logger.info(f"Debug: {debug}")
    
    try:
        app.run(
            host=host,
            port=port,
            debug=debug,
            threaded=True
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
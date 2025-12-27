from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
from datetime import datetime
import traceback

# Import custom modules
from config import Config
from encoder_service import EncoderService, ModelNotLoadedException, InvalidInputException
from validators import InputValidator, ValidationError, RequestValidator

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load configuration
config = Config('config.yaml')
app.config.update(config.get_flask_config())

# Configure logging
log_level = getattr(logging, config.get('logging.level', 'INFO').upper())
handlers = [logging.StreamHandler()]
log_file = config.get('logging.file')
if log_file:
    handlers.append(logging.FileHandler(log_file))
else:
    handlers.append(logging.FileHandler('app.log'))

logging.basicConfig(
    level=log_level,
    format=config.get('logging.format', '%(asctime)s - %(name)s - %(levelname)s - %(message)s'),
    handlers=handlers
)
logger = logging.getLogger(__name__)

# Initialize encoder service
encoder_service = None

def initialize_encoders():
    """Initialize all encoder models"""
    global encoder_service
    try:
        logger.info("Initializing encoder service...")
        encoder_service = EncoderService(config)
        logger.info("Encoder service initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize encoder service: {str(e)}")
        logger.error(traceback.format_exc())
        return False

# Error handlers
@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'error': 'Bad Request',
        'message': 'Invalid request format or missing required fields',
        'timestamp': datetime.utcnow().isoformat()
    }), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not Found',
        'message': 'The requested endpoint does not exist',
        'timestamp': datetime.utcnow().isoformat()
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred',
        'timestamp': datetime.utcnow().isoformat()
    }), 500

# Health check endpoints
@app.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint"""
    try:
        if encoder_service is None:
            return jsonify({
                'status': 'unhealthy',
                'message': 'Service not initialized',
                'timestamp': datetime.utcnow().isoformat(),
                'service': 'Fraud Detection Encoder API'
            }), 503
        
        # Basic health check
        is_healthy = encoder_service.is_healthy() if hasattr(encoder_service, 'is_healthy') else True
        
        if is_healthy:
            return jsonify({
                'status': 'healthy',
                'message': 'Service is running',
                'timestamp': datetime.utcnow().isoformat(),
                'service': 'Fraud Detection Encoder API'
            })
        else:
            return jsonify({
                'status': 'unhealthy', 
                'message': 'Service has issues - some models may not be loaded',
                'timestamp': datetime.utcnow().isoformat(),
                'service': 'Fraud Detection Encoder API'
            }), 503
            
    except Exception as e:
        logger.error(f"Health check error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'status': 'unhealthy',
            'message': 'Health check failed',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'Fraud Detection Encoder API'
        }), 503

@app.route('/status', methods=['GET'])
def service_status():
    """Detailed service status including model availability"""
    global encoder_service
    
    try:
        if encoder_service is None:
            return jsonify({
                'service': 'Fraud Detection Encoder API',
                'status': 'unhealthy',
                'message': 'Encoder service not initialized',
                'timestamp': datetime.utcnow().isoformat(),
                'models': {
                    'motion_encoder': {'status': 'not_loaded'},
                    'touch_encoder': {'status': 'not_loaded'},
                    'typing_encoder': {'status': 'not_loaded'}
                },
                'config': {
                    'max_batch_size': config.get('api.max_batch_size', 100),
                    'request_timeout': config.get('api.request_timeout', 30)
                }
            }), 503
        
        # Get model status from encoder service
        model_status = encoder_service.get_model_status()
        
        # Determine overall health
        is_healthy = encoder_service.is_healthy() if hasattr(encoder_service, 'is_healthy') else True
        overall_status = 'healthy' if is_healthy else 'degraded'
        
        return jsonify({
            'service': 'Fraud Detection Encoder API',
            'status': overall_status,
            'message': 'Service operational' if is_healthy else 'Some models unavailable',
            'timestamp': datetime.utcnow().isoformat(),
            'models': model_status,
            'endpoints': {
                'motion': '/encode/motion',
                'gesture': '/encode/gesture', 
                'typing': '/encode/typing',
                'batch_motion': '/encode/batch/motion',
                'batch_gesture': '/encode/batch/gesture',
                'batch_typing': '/encode/batch/typing',
                'health': '/health',
                'status': '/status'
            },
            'config': {
                'max_batch_size': config.get('api.max_batch_size', 100),
                'request_timeout': config.get('api.request_timeout', 30),
                'cors_enabled': config.get('api.enable_cors', True)
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'service': 'Fraud Detection Encoder API',
            'status': 'error',
            'message': 'Failed to get service status',
            'timestamp': datetime.utcnow().isoformat()
        }), 500

# Motion encoder endpoints
@app.route('/encode/motion', methods=['POST'])
def encode_motion():
    """Encode IMU motion data to vector embedding"""
    try:
        # Check if encoder service is available
        if encoder_service is None:
            return jsonify({
                'error': 'Encoder service not available',
                'status': 'error'
            }), 503
        
        # Validate content type
        if not RequestValidator.validate_content_type(request.content_type or ''):
            return jsonify({
                'error': 'Invalid content type. Expected application/json',
                'status': 'error'
            }), 400
        
        data = request.get_json()
        
        if not data or 'data' not in data:
            return jsonify({
                'error': 'Missing data field in request',
                'status': 'error'
            }), 400
        
        # Validate request size
        if not RequestValidator.validate_request_size(data, config.get('api.max_request_size_mb', 10.0)):
            return jsonify({
                'error': 'Request size too large',
                'status': 'error'
            }), 413
        
        # Validate input data
        validated_data = InputValidator.validate_motion_data(data['data'])
        
        # Encode data using motion encoder
        embedding = encoder_service.encode_motion(validated_data['data'])
        
        # Sanitize output
        sanitized_embedding = InputValidator.sanitize_output(embedding)
        
        return jsonify({
            'embedding': sanitized_embedding,
            'dimension': len(sanitized_embedding),
            'model_type': 'motion_encoder',
            'input_type': validated_data['type'],
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat()
        })
    
    except ValidationError as e:
        logger.warning(f"Motion encoding validation error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'validation_error'
        }), 400
    
    except ModelNotLoadedException as e:
        logger.error(f"Motion encoder not loaded: {str(e)}")
        return jsonify({
            'error': 'Motion encoder not available',
            'status': 'model_error'
        }), 503
    
    except InvalidInputException as e:
        logger.error(f"Motion encoding input error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'input_error'
        }), 400
    
    except Exception as e:
        logger.error(f"Motion encoding error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

# Touch/Gesture encoder endpoints
@app.route('/encode/gesture', methods=['POST'])
def encode_gesture():
    """Encode touch/gesture data to vector embedding"""
    try:
        # Check if encoder service is available
        if encoder_service is None:
            return jsonify({
                'error': 'Encoder service not available',
                'status': 'error'
            }), 503
        
        # Validate content type
        if not RequestValidator.validate_content_type(request.content_type or ''):
            return jsonify({
                'error': 'Invalid content type. Expected application/json',
                'status': 'error'
            }), 400
        
        data = request.get_json()
        
        if not data or 'data' not in data:
            return jsonify({
                'error': 'Missing data field in request',
                'status': 'error'
            }), 400
        
        # Validate request size
        if not RequestValidator.validate_request_size(data, config.get('api.max_request_size_mb', 10.0)):
            return jsonify({
                'error': 'Request size too large',
                'status': 'error'
            }), 413
        
        # Validate input data
        validated_data = InputValidator.validate_gesture_data(data['data'])
        
        # Encode data using gesture encoder
        embedding = encoder_service.encode_gesture(validated_data['data'])
        
        # Sanitize output
        sanitized_embedding = InputValidator.sanitize_output(embedding)
        
        return jsonify({
            'embedding': sanitized_embedding,
            'dimension': len(sanitized_embedding),
            'model_type': 'touch_encoder',
            'input_type': validated_data['type'],
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat()
        })
    
    except ValidationError as e:
        logger.warning(f"Gesture encoding validation error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'validation_error'
        }), 400
    
    except ModelNotLoadedException as e:
        logger.error(f"Gesture encoder not loaded: {str(e)}")
        return jsonify({
            'error': 'Gesture encoder not available',
            'status': 'model_error'
        }), 503
    
    except InvalidInputException as e:
        logger.error(f"Gesture encoding input error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'input_error'
        }), 400
    
    except Exception as e:
        logger.error(f"Gesture encoding error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

# Typing/Keystroke encoder endpoints
@app.route('/encode/typing', methods=['POST'])
def encode_typing():
    """Encode typing/keystroke data to vector embedding"""
    try:
        # Check if encoder service is available
        if encoder_service is None:
            return jsonify({
                'error': 'Encoder service not available',
                'status': 'error'
            }), 503
        
        # Validate content type
        if not RequestValidator.validate_content_type(request.content_type or ''):
            return jsonify({
                'error': 'Invalid content type. Expected application/json',
                'status': 'error'
            }), 400
        
        data = request.get_json()
        
        if not data or 'data' not in data:
            return jsonify({
                'error': 'Missing data field in request',
                'status': 'error'
            }), 400
        
        # Validate request size
        if not RequestValidator.validate_request_size(data, config.get('api.max_request_size_mb', 10.0)):
            return jsonify({
                'error': 'Request size too large',
                'status': 'error'
            }), 413
        
        # Validate input data
        validated_data = InputValidator.validate_typing_data(data['data'])
        
        # Encode data using typing encoder
        embedding = encoder_service.encode_typing(validated_data['data'])
        
        # Sanitize output
        sanitized_embedding = InputValidator.sanitize_output(embedding)
        
        return jsonify({
            'embedding': sanitized_embedding,
            'dimension': len(sanitized_embedding),
            'model_type': 'typing_encoder',
            'input_type': validated_data['type'],
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat()
        })
    
    except ValidationError as e:
        logger.warning(f"Typing encoding validation error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'validation_error'
        }), 400
    
    except ModelNotLoadedException as e:
        logger.error(f"Typing encoder not loaded: {str(e)}")
        return jsonify({
            'error': 'Typing encoder not available',
            'status': 'model_error'
        }), 503
    
    except InvalidInputException as e:
        logger.error(f"Typing encoding input error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'input_error'
        }), 400
    
    except Exception as e:
        logger.error(f"Typing encoding error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

# Batch processing endpoints
@app.route('/encode/batch/motion', methods=['POST'])
def encode_motion_batch():
    """Encode multiple motion sequences at once"""
    try:
        # Check if encoder service is available
        if encoder_service is None:
            return jsonify({
                'error': 'Encoder service not available',
                'status': 'error'
            }), 503
        
        # Validate content type
        if not RequestValidator.validate_content_type(request.content_type or ''):
            return jsonify({
                'error': 'Invalid content type. Expected application/json',
                'status': 'error'
            }), 400
        
        data = request.get_json()
        
        if not data or 'batch_data' not in data:
            return jsonify({
                'error': 'Missing batch_data field in request',
                'status': 'error'
            }), 400
        
        # Validate batch data
        max_batch_size = config.get('api.max_batch_size', 100)
        validated_batch = InputValidator.validate_batch_data(data['batch_data'], max_batch_size)
        
        # Validate each item in the batch
        validated_items = []
        for i, item in enumerate(validated_batch['data']):
            try:
                validated_item = InputValidator.validate_motion_data(item)
                validated_items.append(validated_item['data'])
            except ValidationError as e:
                return jsonify({
                    'error': f'Invalid data at index {i}: {str(e)}',
                    'status': 'validation_error'
                }), 400
        
        # Encode batch data
        embeddings = encoder_service.encode_motion_batch(validated_items)
        
        # Sanitize output
        sanitized_embeddings = InputValidator.sanitize_batch_output(embeddings)
        
        return jsonify({
            'embeddings': sanitized_embeddings,
            'count': len(sanitized_embeddings),
            'dimension': len(sanitized_embeddings[0]) if sanitized_embeddings else 0,
            'model_type': 'motion_encoder',
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat()
        })
    
    except ValidationError as e:
        logger.warning(f"Motion batch validation error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'validation_error'
        }), 400
    
    except ModelNotLoadedException as e:
        logger.error(f"Motion encoder not loaded: {str(e)}")
        return jsonify({
            'error': 'Motion encoder not available',
            'status': 'model_error'
        }), 503
    
    except InvalidInputException as e:
        logger.error(f"Motion batch input error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'input_error'
        }), 400
    
    except Exception as e:
        logger.error(f"Motion batch encoding error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

@app.route('/encode/batch/gesture', methods=['POST'])
def encode_gesture_batch():
    """Encode multiple gesture sequences at once"""
    try:
        # Check if encoder service is available
        if encoder_service is None:
            return jsonify({
                'error': 'Encoder service not available',
                'status': 'error'
            }), 503
        
        # Validate content type
        if not RequestValidator.validate_content_type(request.content_type or ''):
            return jsonify({
                'error': 'Invalid content type. Expected application/json',
                'status': 'error'
            }), 400
        
        data = request.get_json()
        
        if not data or 'batch_data' not in data:
            return jsonify({
                'error': 'Missing batch_data field in request',
                'status': 'error'
            }), 400
        
        # Validate batch data
        max_batch_size = config.get('api.max_batch_size', 100)
        validated_batch = InputValidator.validate_batch_data(data['batch_data'], max_batch_size)
        
        # Validate each item in the batch
        validated_items = []
        for i, item in enumerate(validated_batch['data']):
            try:
                validated_item = InputValidator.validate_gesture_data(item)
                validated_items.append(validated_item['data'])
            except ValidationError as e:
                return jsonify({
                    'error': f'Invalid data at index {i}: {str(e)}',
                    'status': 'validation_error'
                }), 400
        
        # Encode batch data
        embeddings = encoder_service.encode_gesture_batch(validated_items)
        
        # Sanitize output
        sanitized_embeddings = InputValidator.sanitize_batch_output(embeddings)
        
        return jsonify({
            'embeddings': sanitized_embeddings,
            'count': len(sanitized_embeddings),
            'dimension': len(sanitized_embeddings[0]) if sanitized_embeddings else 0,
            'model_type': 'touch_encoder',
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat()
        })
    
    except ValidationError as e:
        logger.warning(f"Gesture batch validation error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'validation_error'
        }), 400
    
    except ModelNotLoadedException as e:
        logger.error(f"Gesture encoder not loaded: {str(e)}")
        return jsonify({
            'error': 'Gesture encoder not available',
            'status': 'model_error'
        }), 503
    
    except InvalidInputException as e:
        logger.error(f"Gesture batch input error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'input_error'
        }), 400
    
    except Exception as e:
        logger.error(f"Gesture batch encoding error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

@app.route('/encode/batch/typing', methods=['POST'])
def encode_typing_batch():
    """Encode multiple typing sequences at once"""
    try:
        # Check if encoder service is available
        if encoder_service is None:
            return jsonify({
                'error': 'Encoder service not available',
                'status': 'error'
            }), 503
        
        # Validate content type
        if not RequestValidator.validate_content_type(request.content_type or ''):
            return jsonify({
                'error': 'Invalid content type. Expected application/json',
                'status': 'error'
            }), 400
        
        data = request.get_json()
        
        if not data or 'batch_data' not in data:
            return jsonify({
                'error': 'Missing batch_data field in request',
                'status': 'error'
            }), 400
        
        # Validate batch data
        max_batch_size = config.get('api.max_batch_size', 100)
        validated_batch = InputValidator.validate_batch_data(data['batch_data'], max_batch_size)
        
        # Validate each item in the batch
        validated_items = []
        for i, item in enumerate(validated_batch['data']):
            try:
                validated_item = InputValidator.validate_typing_data(item)
                validated_items.append(validated_item['data'])
            except ValidationError as e:
                return jsonify({
                    'error': f'Invalid data at index {i}: {str(e)}',
                    'status': 'validation_error'
                }), 400
        
        # Encode batch data
        embeddings = encoder_service.encode_typing_batch(validated_items)
        
        # Sanitize output
        sanitized_embeddings = InputValidator.sanitize_batch_output(embeddings)
        
        return jsonify({
            'embeddings': sanitized_embeddings,
            'count': len(sanitized_embeddings),
            'dimension': len(sanitized_embeddings[0]) if sanitized_embeddings else 0,
            'model_type': 'typing_encoder',
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat()
        })
    
    except ValidationError as e:
        logger.warning(f"Typing batch validation error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'validation_error'
        }), 400
    
    except ModelNotLoadedException as e:
        logger.error(f"Typing encoder not loaded: {str(e)}")
        return jsonify({
            'error': 'Typing encoder not available',
            'status': 'model_error'
        }), 503
    
    except InvalidInputException as e:
        logger.error(f"Typing batch input error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'input_error'
        }), 400
    
    except Exception as e:
        logger.error(f"Typing batch encoding error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

if __name__ == '__main__':
    # Initialize encoders on startup
    if initialize_encoders():
        logger.info("Starting Flask application...")
        app.run(
            host=config.get('server.host', '0.0.0.0'),
            port=config.get('server.port', 5002),
            debug=config.get('server.debug', False)
        )
    else:
        logger.error("Failed to initialize encoders. Exiting.")
        exit(1)
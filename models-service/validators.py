import numpy as np
import pandas as pd
from typing import Dict, List, Any, Union, Optional
import json
import logging

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Exception raised when input validation fails"""
    pass

class InputValidator:
    """Validates input data for different encoder types"""
    
    @staticmethod
    def validate_motion_data(data: Any) -> Dict[str, Any]:
        """Validate motion/IMU data input
        
        Expected format:
        - DataFrame with 11 columns: accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, 
          mag_x, mag_y, mag_z, motion_magnitude, rotation_rate
        - Dict with keys: 'accelerometer', 'gyroscope', 'magnetometer' (each with 3D data)
        - List of lists/arrays with 11 features per sample
        - numpy array with shape (sequence_length, 11)
        """
        try:
            if isinstance(data, pd.DataFrame):
                if data.shape[1] != 11:
                    raise ValidationError(f"Motion data must have 11 features, got {data.shape[1]}")
                if data.empty:
                    raise ValidationError("Motion data cannot be empty")
                return {'type': 'dataframe', 'data': data, 'valid': True}
            
            elif isinstance(data, dict):
                required_keys = ['accelerometer', 'gyroscope', 'magnetometer']
                if not all(key in data for key in required_keys):
                    raise ValidationError(f"Motion data dict must contain keys: {required_keys}")
                
                # Validate each sensor data
                for key in required_keys:
                    sensor_data = data[key]
                    if not isinstance(sensor_data, (list, np.ndarray)):
                        raise ValidationError(f"{key} data must be list or numpy array")
                    
                    sensor_array = np.array(sensor_data)
                    if len(sensor_array.shape) != 2 or sensor_array.shape[1] != 3:
                        raise ValidationError(f"{key} data must have shape (sequence_length, 3)")
                
                return {'type': 'dict', 'data': data, 'valid': True}
            
            elif isinstance(data, (list, np.ndarray)):
                data_array = np.array(data)
                if len(data_array.shape) != 2:
                    raise ValidationError("Motion data array must be 2D (sequence_length, features)")
                if data_array.shape[1] != 11:
                    raise ValidationError(f"Motion data must have 11 features, got {data_array.shape[1]}")
                if data_array.shape[0] == 0:
                    raise ValidationError("Motion data cannot be empty")
                
                return {'type': 'array', 'data': data_array, 'valid': True}
            
            else:
                raise ValidationError(f"Unsupported motion data type: {type(data)}")
        
        except Exception as e:
            logger.error(f"Motion data validation failed: {str(e)}")
            raise ValidationError(f"Motion data validation failed: {str(e)}")
    
    @staticmethod
    def validate_gesture_data(data: Any) -> Dict[str, Any]:
        """Validate touch/gesture data input
        
        Expected 7 features for touch/gesture data:
        - distance: Distance of the gesture
        - duration: Duration of the gesture
        - endX: End X coordinate
        - endY: End Y coordinate
        - startX: Start X coordinate
        - startY: Start Y coordinate
        - velocity: Velocity of the gesture
        
        Supported formats:
        - Dict with gesture coordinates and timing
        - List of touch points with required features
        - JSON string with gesture data
        - CSV file path
        - 2D numpy array with shape (sequence_length, 7)
        """
        try:
            if isinstance(data, str):
                # Check if it's a file path
                if data.endswith(('.json', '.csv')):
                    return {'type': 'file_path', 'data': data, 'valid': True}
                
                # Try to parse as JSON
                try:
                    json_data = json.loads(data)
                    return InputValidator.validate_gesture_data(json_data)
                except json.JSONDecodeError:
                    raise ValidationError("String data must be valid JSON or file path")
            
            elif isinstance(data, dict):
                # Validate gesture dictionary structure
                if 'points' in data:
                    points = data['points']
                    if not isinstance(points, list):
                        raise ValidationError("Gesture points must be a list")
                    
                    for i, point in enumerate(points):
                        if not isinstance(point, dict):
                            raise ValidationError(f"Point {i} must be a dictionary")
                        
                        required_fields = ['distance', 'duration', 'endX', 'endY', 'startX', 'startY', 'velocity']
                        for field in required_fields:
                            if field not in point:
                                raise ValidationError(f"Point {i} missing required field: {field}")
                
                return {'type': 'dict', 'data': data, 'valid': True}
            
            elif isinstance(data, list):
                # Validate list of touch points
                if not data:
                    raise ValidationError("Gesture data cannot be empty")
                
                for i, point in enumerate(data):
                    if isinstance(point, dict):
                        required_fields = ['distance', 'duration', 'endX', 'endY', 'startX', 'startY', 'velocity']
                        for field in required_fields:
                            if field not in point:
                                raise ValidationError(f"Point {i} missing required field: {field}")
                    elif isinstance(point, (list, tuple)):
                        if len(point) != 7:
                            raise ValidationError(f"Point {i} must have exactly 7 features: distance, duration, endX, endY, startX, startY, velocity")
                    else:
                        raise ValidationError(f"Point {i} must be dict, list, or tuple")
                
                return {'type': 'list', 'data': data, 'valid': True}
            
            elif isinstance(data, np.ndarray):
                if len(data.shape) != 2:
                    raise ValidationError("Gesture array must be 2D (sequence_length, features)")
                if data.shape[1] != 7:
                    raise ValidationError("Gesture data must have exactly 7 features: distance, duration, endX, endY, startX, startY, velocity")
                if data.shape[0] == 0:
                    raise ValidationError("Gesture data cannot be empty")
                
                return {'type': 'array', 'data': data, 'valid': True}
            
            else:
                raise ValidationError(f"Unsupported gesture data type: {type(data)}")
        
        except Exception as e:
            logger.error(f"Gesture data validation failed: {str(e)}")
            raise ValidationError(f"Gesture data validation failed: {str(e)}")
    
    @staticmethod
    def validate_typing_data(data: Any) -> Dict[str, Any]:
        """Validate typing/keystroke data input
        
        Expected 4 numerical features for typing/keystroke data:
        - dwellTime: Time key was held down
        - flightTime: Time between key presses
        - coordinate_x: X coordinate of key press
        - coordinate_y: Y coordinate of key press
        
        Plus character information for each keystroke.
        
        Supported formats:
        - DataFrame with columns: character, dwellTime, flightTime, coordinate_x, coordinate_y
        - Dict with keystroke sequence data
        - List of keystroke events
        - CSV file path
        - String representing keystroke sequence
        """
        try:
            if isinstance(data, str):
                # Check if it's a file path
                if data.endswith('.csv'):
                    return {'type': 'file_path', 'data': data, 'valid': True}
                
                # Treat as keystroke sequence string
                if not data.strip():
                    raise ValidationError("Typing data string cannot be empty")
                
                return {'type': 'string', 'data': data, 'valid': True}
            
            elif isinstance(data, pd.DataFrame):
                required_columns = ['character', 'dwellTime', 'flightTime', 'coordinate_x', 'coordinate_y']
                missing_columns = [col for col in required_columns if col not in data.columns]
                if missing_columns:
                    raise ValidationError(f"Missing required columns: {missing_columns}")
                
                if data.empty:
                    raise ValidationError("Typing data cannot be empty")
                
                # Validate data types
                if not pd.api.types.is_numeric_dtype(data['dwellTime']):
                    raise ValidationError("dwellTime must be numeric")
                if not pd.api.types.is_numeric_dtype(data['flightTime']):
                    raise ValidationError("flightTime must be numeric")
                if not pd.api.types.is_numeric_dtype(data['coordinate_x']):
                    raise ValidationError("coordinate_x must be numeric")
                if not pd.api.types.is_numeric_dtype(data['coordinate_y']):
                    raise ValidationError("coordinate_y must be numeric")
                
                return {'type': 'dataframe', 'data': data, 'valid': True}
            
            elif isinstance(data, dict):
                # Validate keystroke dictionary structure
                if 'keystrokes' in data:
                    keystrokes = data['keystrokes']
                    if not isinstance(keystrokes, list):
                        raise ValidationError("Keystrokes must be a list")
                    
                    for i, keystroke in enumerate(keystrokes):
                        if not isinstance(keystroke, dict):
                            raise ValidationError(f"Keystroke {i} must be a dictionary")
                        
                        required_fields = ['character', 'dwellTime', 'flightTime', 'coordinate_x', 'coordinate_y']
                        for field in required_fields:
                            if field not in keystroke:
                                raise ValidationError(f"Keystroke {i} missing required field: {field}")
                
                elif 'sequence' in data:
                    sequence = data['sequence']
                    if not isinstance(sequence, str):
                        raise ValidationError("Sequence must be a string")
                    if not sequence.strip():
                        raise ValidationError("Sequence cannot be empty")
                
                else:
                    # Assume it's a direct keystroke data dict
                    required_fields = ['character', 'dwellTime', 'flightTime', 'coordinate_x', 'coordinate_y']
                    for field in required_fields:
                        if field not in data:
                            raise ValidationError(f"Missing required field: {field}")
                
                return {'type': 'dict', 'data': data, 'valid': True}
            
            elif isinstance(data, list):
                if not data:
                    raise ValidationError("Typing data cannot be empty")
                
                # Validate list of keystroke events
                for i, keystroke in enumerate(data):
                    if isinstance(keystroke, dict):
                        required_fields = ['character']
                        for field in required_fields:
                            if field not in keystroke:
                                raise ValidationError(f"Keystroke {i} missing required field: {field}")
                    elif isinstance(keystroke, str):
                        if len(keystroke) != 1:
                            raise ValidationError(f"Keystroke {i} must be a single character")
                    else:
                        raise ValidationError(f"Keystroke {i} must be dict or string")
                
                return {'type': 'list', 'data': data, 'valid': True}
            
            else:
                raise ValidationError(f"Unsupported typing data type: {type(data)}")
        
        except Exception as e:
            logger.error(f"Typing data validation failed: {str(e)}")
            raise ValidationError(f"Typing data validation failed: {str(e)}")
    
    @staticmethod
    def validate_batch_data(data: Any, max_batch_size: int = 100) -> Dict[str, Any]:
        """Validate batch data input"""
        try:
            if not isinstance(data, list):
                raise ValidationError("Batch data must be a list")
            
            if not data:
                raise ValidationError("Batch data cannot be empty")
            
            if len(data) > max_batch_size:
                raise ValidationError(f"Batch size {len(data)} exceeds maximum {max_batch_size}")
            
            return {'type': 'batch', 'data': data, 'size': len(data), 'valid': True}
        
        except Exception as e:
            logger.error(f"Batch data validation failed: {str(e)}")
            raise ValidationError(f"Batch data validation failed: {str(e)}")
    
    @staticmethod
    def validate_json_request(request_data: Dict[str, Any], required_fields: List[str]) -> Dict[str, Any]:
        """Validate JSON request structure"""
        try:
            if not isinstance(request_data, dict):
                raise ValidationError("Request data must be a JSON object")
            
            missing_fields = [field for field in required_fields if field not in request_data]
            if missing_fields:
                raise ValidationError(f"Missing required fields: {missing_fields}")
            
            return {'valid': True, 'data': request_data}
        
        except Exception as e:
            logger.error(f"JSON request validation failed: {str(e)}")
            raise ValidationError(f"JSON request validation failed: {str(e)}")
    
    @staticmethod
    def sanitize_output(embedding: np.ndarray) -> List[float]:
        """Sanitize model output for JSON serialization"""
        try:
            if not isinstance(embedding, np.ndarray):
                embedding = np.array(embedding)
            
            # Convert to float32 and then to list
            embedding = embedding.astype(np.float32)
            
            # Handle NaN and infinity values
            embedding = np.nan_to_num(embedding, nan=0.0, posinf=1.0, neginf=-1.0)
            
            return embedding.tolist()
        
        except Exception as e:
            logger.error(f"Output sanitization failed: {str(e)}")
            raise ValidationError(f"Output sanitization failed: {str(e)}")
    
    @staticmethod
    def sanitize_batch_output(embeddings: List[np.ndarray]) -> List[List[float]]:
        """Sanitize batch model output for JSON serialization"""
        try:
            sanitized_embeddings = []
            for i, embedding in enumerate(embeddings):
                try:
                    sanitized = InputValidator.sanitize_output(embedding)
                    sanitized_embeddings.append(sanitized)
                except Exception as e:
                    logger.error(f"Failed to sanitize embedding {i}: {str(e)}")
                    # Use zero vector as fallback
                    sanitized_embeddings.append([0.0] * 256)
            
            return sanitized_embeddings
        
        except Exception as e:
            logger.error(f"Batch output sanitization failed: {str(e)}")
            raise ValidationError(f"Batch output sanitization failed: {str(e)}")


class RequestValidator:
    """Validates API request parameters"""
    
    @staticmethod
    def validate_encoder_type(encoder_type: str) -> bool:
        """Validate encoder type parameter"""
        valid_types = ['motion', 'gesture', 'typing']
        return encoder_type in valid_types
    
    @staticmethod
    def validate_request_size(data: Any, max_size_mb: float = 10.0) -> bool:
        """Validate request size"""
        try:
            import sys
            size_bytes = sys.getsizeof(data)
            size_mb = size_bytes / (1024 * 1024)
            return size_mb <= max_size_mb
        except Exception:
            return True  # If we can't calculate size, allow it
    
    @staticmethod
    def validate_content_type(content_type: str) -> bool:
        """Validate request content type"""
        valid_types = ['application/json', 'multipart/form-data', 'text/plain']
        return any(valid_type in content_type for valid_type in valid_types)
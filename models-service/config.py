import os
import yaml
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class Config:
    """Configuration management for the encoder service"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.config = self._load_default_config()
        
        # Load from file if provided
        if config_file and os.path.exists(config_file):
            self._load_from_file(config_file)
        
        # Override with environment variables
        self._load_from_env()
    
    def _load_default_config(self) -> Dict[str, Any]:
        """Load default configuration"""
        return {
            'server': {
                'host': '0.0.0.0',
                'port': 5000,
                'debug': False
            },
            'models': {
                'motion_encoder': {
                    'model_path': './models/motion_encoder.pt',
                    'processor_path': './models/motion_encoder_processor.pkl',
                    'enabled': True,
                    'device': 'auto'  # 'auto', 'cpu', 'cuda'
                },
                'touch_encoder': {
                    'model_path': './models/gesture_encoder.pt',
                    'enabled': True,
                    'device': 'auto'
                },
                'typing_encoder': {
                    'model_path': './models/keystroke_encoder.pt',
                    'metadata_path': './models/keystroke_metadata.pkl',
                    'config_path': './models/keystroke_config.yaml',
                    'enabled': True,
                    'device': 'auto'
                }
            },
            'logging': {
                'level': 'INFO',
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                'file': 'app.log'
            },
            'api': {
                'max_batch_size': 100,
                'request_timeout': 30,
                'enable_cors': True
            },
            'security': {
                'api_key_required': False,
                'api_key': None,
                'rate_limit': {
                    'enabled': False,
                    'requests_per_minute': 60
                }
            }
        }
    
    def _load_from_file(self, config_file: str):
        """Load configuration from YAML file"""
        try:
            with open(config_file, 'r') as f:
                file_config = yaml.safe_load(f)
            
            # Merge with default config
            self._deep_merge(self.config, file_config)
            logger.info(f"Configuration loaded from {config_file}")
            
        except Exception as e:
            logger.error(f"Failed to load config from {config_file}: {str(e)}")
    
    def _load_from_env(self):
        """Load configuration from environment variables"""
        env_mappings = {
            'FLASK_HOST': 'server.host',
            'FLASK_PORT': 'server.port',
            'FLASK_DEBUG': 'server.debug',
            'MOTION_MODEL_PATH': 'models.motion_encoder.model_path',
            'MOTION_PROCESSOR_PATH': 'models.motion_encoder.processor_path',
            'GESTURE_MODEL_PATH': 'models.touch_encoder.model_path',
            'KEYSTROKE_MODEL_PATH': 'models.typing_encoder.model_path',
            'KEYSTROKE_METADATA_PATH': 'models.typing_encoder.metadata_path',
            'KEYSTROKE_CONFIG_PATH': 'models.typing_encoder.config_path',
            'LOG_LEVEL': 'logging.level',
            'API_KEY': 'security.api_key',
            'API_KEY_REQUIRED': 'security.api_key_required'
        }
        
        for env_var, config_path in env_mappings.items():
            value = os.getenv(env_var)
            if value is not None:
                # Convert string values to appropriate types
                if env_var in ['FLASK_PORT']:
                    value = int(value)
                elif env_var in ['FLASK_DEBUG', 'API_KEY_REQUIRED']:
                    value = value.lower() in ('true', '1', 'yes', 'on')
                
                self._set_nested_value(self.config, config_path, value)
                logger.info(f"Environment variable {env_var} loaded")
    
    def _deep_merge(self, base_dict: Dict, update_dict: Dict):
        """Deep merge two dictionaries"""
        for key, value in update_dict.items():
            if key in base_dict and isinstance(base_dict[key], dict) and isinstance(value, dict):
                self._deep_merge(base_dict[key], value)
            else:
                base_dict[key] = value
    
    def _set_nested_value(self, config_dict: Dict, path: str, value: Any):
        """Set a nested configuration value using dot notation"""
        keys = path.split('.')
        current = config_dict
        
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        current[keys[-1]] = value
    
    def get(self, path: str, default: Any = None) -> Any:
        """Get configuration value using dot notation"""
        keys = path.split('.')
        current = self.config
        
        try:
            for key in keys:
                current = current[key]
            return current
        except (KeyError, TypeError):
            return default
    
    def set(self, path: str, value: Any):
        """Set configuration value using dot notation"""
        self._set_nested_value(self.config, path, value)
    
    def get_model_config(self, model_name: str) -> Dict[str, Any]:
        """Get configuration for a specific model"""
        return self.get(f'models.{model_name}', {})
    
    def get_flask_config(self) -> Dict[str, Any]:
        """Get Flask-specific configuration"""
        return {
            'SECRET_KEY': os.urandom(24),
            'JSON_SORT_KEYS': False,
            'JSONIFY_PRETTYPRINT_REGULAR': True
        }
    
    def is_model_enabled(self, model_name: str) -> bool:
        """Check if a model is enabled"""
        return self.get(f'models.{model_name}.enabled', False)
    
    def get_model_paths(self, model_name: str) -> Dict[str, str]:
        """Get all file paths for a model"""
        model_config = self.get_model_config(model_name)
        paths = {}
        
        for key, value in model_config.items():
            if key.endswith('_path') and isinstance(value, str):
                paths[key] = value
        
        return paths
    
    def validate_model_paths(self, model_name: str) -> Dict[str, bool]:
        """Validate that model files exist"""
        paths = self.get_model_paths(model_name)
        validation_results = {}
        
        for path_type, path in paths.items():
            validation_results[path_type] = os.path.exists(path)
        
        return validation_results
    
    def get_device_config(self, model_name: str) -> str:
        """Get device configuration for a model"""
        device = self.get(f'models.{model_name}.device', 'auto')
        
        if device == 'auto':
            import torch
            return 'cuda' if torch.cuda.is_available() else 'cpu'
        
        return device
    
    def save_to_file(self, config_file: str):
        """Save current configuration to YAML file"""
        try:
            with open(config_file, 'w') as f:
                yaml.dump(self.config, f, default_flow_style=False, indent=2)
            logger.info(f"Configuration saved to {config_file}")
        except Exception as e:
            logger.error(f"Failed to save config to {config_file}: {str(e)}")
    
    def __str__(self) -> str:
        """String representation of configuration"""
        return yaml.dump(self.config, default_flow_style=False, indent=2)

# Create a default configuration file template
def create_config_template(output_file: str = 'config.yaml'):
    """Create a configuration template file"""
    config = Config()
    config.save_to_file(output_file)
    print(f"Configuration template created: {output_file}")

if __name__ == '__main__':
    # Create configuration template
    create_config_template()
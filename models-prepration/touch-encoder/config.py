import yaml
import os
from typing import Dict, Any

class Config:
    """Configuration class for touch dynamics encoder"""
    
    def __init__(self, config_path: str = None):
        self.config = self._load_default_config()
        if config_path and os.path.exists(config_path):
            self.config.update(self._load_config_file(config_path))
    
    def _load_default_config(self) -> Dict[str, Any]:
        """Load default configuration"""
        return {
            # Model parameters
            'model': {
                'lstm_hidden_dim': 256,
                'lstm_num_layers': 2,
                'bidirectional': True,
                'output_dim': 256,
                'dropout': 0.3,
                'input_features': 7  # startX, startY, endX, endY, duration, distance, velocity
            },
            
            # Training parameters
            'training': {
                'batch_size': 32,
                'learning_rate': 0.001,
                'num_epochs': 100,
                'early_stopping_patience': 10,
                'gradient_clip_norm': 1.0,
                'validation_split': 0.2,
                'random_seed': 42
            },
            
            # Data processing parameters
            'data': {
                'max_sequence_length': 100,
                'min_sequence_length': 5,
                'normalize_features': True,
                'gesture_types': ['tap', 'swipe', 'scroll', 'pinch', 'long_press']
            },
            
            # Paths
            'paths': {
                'model_save_dir': './models',
                'logs_dir': './logs',
                'data_dir': './data'
            }
        }
    
    def _load_config_file(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def save_config(self, save_path: str):
        """Save current configuration to YAML file"""
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        with open(save_path, 'w') as f:
            yaml.dump(self.config, f, default_flow_style=False)
    
    def get(self, key: str, default=None):
        """Get configuration value using dot notation"""
        keys = key.split('.')
        value = self.config
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        return value
    
    def set(self, key: str, value: Any):
        """Set configuration value using dot notation"""
        keys = key.split('.')
        config = self.config
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        config[keys[-1]] = value
    
    def __getitem__(self, key):
        return self.config[key]
    
    def __setitem__(self, key, value):
        self.config[key] = value

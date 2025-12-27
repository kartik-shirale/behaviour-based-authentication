import yaml
import os
from typing import Dict, Any, List

class Config:
    """Configuration management for motion sensor fraud detection model."""
    
    def __init__(self, config_path: str = None):
        """Initialize configuration from YAML file.
        
        Args:
            config_path: Path to configuration YAML file
        """
        self.config_path = config_path or 'config_example.yaml'
        self.config = self._load_config()
        
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file.
        
        Returns:
            Dictionary containing configuration parameters
        """
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"Configuration file not found: {self.config_path}")
            
        with open(self.config_path, 'r') as f:
            config = yaml.safe_load(f)
            
        # Validate required sections
        required_sections = ['model', 'data', 'training']
        for section in required_sections:
            if section not in config:
                raise ValueError(f"Missing required configuration section: {section}")
                
        return config
    
    def get_model_config(self) -> Dict[str, Any]:
        """Get model configuration parameters.
        
        Returns:
            Dictionary containing model parameters
        """
        return self.config['model']
    
    def get_data_config(self) -> Dict[str, Any]:
        """Get data configuration parameters.
        
        Returns:
            Dictionary containing data parameters
        """
        return self.config['data']
    
    def get_training_config(self) -> Dict[str, Any]:
        """Get training configuration parameters.
        
        Returns:
            Dictionary containing training parameters
        """
        return self.config['training']
    
    def get_required_columns(self) -> List[str]:
        """Get list of required sensor data columns.
        
        Returns:
            List of required column names
        """
        return self.config['data']['required_columns']
    
    def get_sequence_length(self) -> int:
        """Get sequence length for motion sensor data.
        
        Returns:
            Number of sensor readings per sequence
        """
        return self.config['data']['sequence_length']
    
    def get_input_dim(self) -> int:
        """Get input dimension (number of sensor features).
        
        Returns:
            Number of input features
        """
        return self.config['model']['input_dim']
    
    def get_output_dim(self) -> int:
        """Get output embedding dimension.
        
        Returns:
            Dimension of output embeddings
        """
        return self.config['model']['output_dim']
    
    def save_config(self, output_path: str):
        """Save current configuration to file.
        
        Args:
            output_path: Path to save configuration file
        """
        with open(output_path, 'w') as f:
            yaml.dump(self.config, f, default_flow_style=False, indent=2)
    
    def update_config(self, updates: Dict[str, Any]):
        """Update configuration with new values.
        
        Args:
            updates: Dictionary of configuration updates
        """
        def deep_update(base_dict, update_dict):
            for key, value in update_dict.items():
                if isinstance(value, dict) and key in base_dict:
                    deep_update(base_dict[key], value)
                else:
                    base_dict[key] = value
        
        deep_update(self.config, updates)
    
    def __getitem__(self, key: str) -> Any:
        """Allow dictionary-style access to configuration.
        
        Args:
            key: Configuration key
            
        Returns:
            Configuration value
        """
        return self.config[key]
    
    def __contains__(self, key: str) -> bool:
        """Check if configuration contains key.
        
        Args:
            key: Configuration key
            
        Returns:
            True if key exists in configuration
        """
        return key in self.config
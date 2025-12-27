#!/usr/bin/env python3
"""
Test script to validate the keystroke dynamics encoder installation.

This script performs basic tests to ensure all components are working correctly:
1. Import all modules
2. Test configuration loading
3. Test data processing with sample data
4. Test model creation
5. Test basic functionality

Usage:
    python test_installation.py
"""

import sys
import os
import tempfile
import logging
import traceback
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_imports():
    """Test that all required modules can be imported"""
    logger.info("Testing module imports...")
    
    try:
        # Test standard library imports
        import torch
        import pandas as pd
        import numpy as np
        import sklearn
        import matplotlib
        import seaborn
        import tqdm
        import yaml
        
        logger.info(f"✓ PyTorch version: {torch.__version__}")
        logger.info(f"✓ Pandas version: {pd.__version__}")
        logger.info(f"✓ NumPy version: {np.__version__}")
        logger.info(f"✓ Scikit-learn version: {sklearn.__version__}")
        
        # Test CUDA availability
        if torch.cuda.is_available():
            logger.info(f"✓ CUDA available: {torch.cuda.get_device_name(0)}")
        else:
            logger.info("ℹ CUDA not available, will use CPU")
        
        # Test our custom modules
        from config import Config
        from data_processor import DataProcessor, KeystrokeDataset
        from model import KeystrokeLSTMEncoder, create_model, ContrastiveLoss
        from train import Trainer
        from inference import KeystrokeEncoder
        from utils import ModelEvaluator, TrainingVisualizer, create_sample_data
        
        logger.info("✓ All custom modules imported successfully")
        return True
        
    except ImportError as e:
        logger.error(f"✗ Import error: {e}")
        return False
    except Exception as e:
        logger.error(f"✗ Unexpected error during imports: {e}")
        return False

def test_configuration():
    """Test configuration system"""
    logger.info("Testing configuration system...")
    
    try:
        from config import Config
        
        # Test default config
        config = Config()
        assert config.get('model.char_embedding_dim') == 64
        assert config.get('training.batch_size') == 32
        
        # Test setting values
        config.set('model.char_embedding_dim', 128)
        assert config.get('model.char_embedding_dim') == 128
        
        # Test with temporary config file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write("""
model:
  char_embedding_dim: 32
  lstm_hidden_dim: 64
training:
  batch_size: 16
""")
            temp_config_path = f.name
        
        try:
            config2 = Config(temp_config_path)
            assert config2.get('model.char_embedding_dim') == 32
            assert config2.get('model.lstm_hidden_dim') == 64
            assert config2.get('training.batch_size') == 16
        finally:
            os.unlink(temp_config_path)
        
        logger.info("✓ Configuration system working correctly")
        return True
        
    except Exception as e:
        logger.error(f"✗ Configuration test failed: {e}")
        traceback.print_exc()
        return False

def test_data_processing():
    """Test data processing functionality"""
    logger.info("Testing data processing...")
    
    try:
        from config import Config
        from data_processor import DataProcessor
        from utils import create_sample_data
        
        # Create sample data
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            sample_df = create_sample_data(num_sequences=5, sequence_length_range=(20, 50))
            sample_df.to_csv(f.name, index=False)
            temp_csv_path = f.name
        
        try:
            # Test data processor
            config = Config()
            config.set('training.batch_size', 4)  # Small batch for testing
            config.set('data.max_sequence_length', 100)
            
            processor = DataProcessor(config)
            
            # Test CSV loading
            df = processor.load_csv_data(temp_csv_path)
            assert len(df) > 0
            assert 'character' in df.columns
            
            # Test preprocessing
            sequences = processor.preprocess_data(df)
            assert len(sequences) > 0
            
            # Test vocabulary building
            processor.build_vocabulary(sequences)
            assert processor.vocab_size > 0
            assert '<PAD>' in processor.char_to_idx
            assert '<UNK>' in processor.char_to_idx
            
            # Test normalization
            normalized_sequences = processor.normalize_features(sequences)
            assert len(normalized_sequences) == len(sequences)
            
            # Test dataset creation
            train_dataset, val_dataset = processor.create_datasets(normalized_sequences)
            assert len(train_dataset) > 0
            assert len(val_dataset) > 0
            
            # Test data loaders
            train_loader, val_loader = processor.create_dataloaders(train_dataset, val_dataset)
            
            # Test batch loading
            batch = next(iter(train_loader))
            assert 'char_indices' in batch
            assert 'numerical_features' in batch
            assert 'sequence_length' in batch
            
        finally:
            os.unlink(temp_csv_path)
        
        logger.info("✓ Data processing working correctly")
        return True
        
    except Exception as e:
        logger.error(f"✗ Data processing test failed: {e}")
        traceback.print_exc()
        return False

def test_model_creation():
    """Test model creation and basic functionality"""
    logger.info("Testing model creation...")
    
    try:
        import torch
        from config import Config
        from model import create_model, count_parameters, ContrastiveLoss
        
        # Create config
        config = Config()
        config.set('model.char_embedding_dim', 32)
        config.set('model.lstm_hidden_dim', 64)
        config.set('model.output_dim', 128)
        
        # Create model
        vocab_size = 50
        model = create_model(config, vocab_size)
        
        # Test model properties
        assert model.vocab_size == vocab_size
        assert model.char_embedding_dim == 32
        assert model.lstm_hidden_dim == 64
        assert model.output_dim == 128
        
        # Test parameter counting
        param_count = count_parameters(model)
        assert param_count > 0
        
        # Test forward pass
        batch_size = 2
        seq_len = 10
        
        batch = {
            'char_indices': torch.randint(0, vocab_size, (batch_size, seq_len)),
            'numerical_features': torch.randn(batch_size, seq_len, 4),
            'sequence_length': torch.tensor([seq_len, seq_len-2])
        }
        
        model.eval()
        with torch.no_grad():
            output = model(batch)
            embeddings = output['embeddings']
            
            assert embeddings.shape == (batch_size, 128)
            assert not torch.isnan(embeddings).any()
        
        # Test loss function
        loss_fn = ContrastiveLoss()
        loss = loss_fn(embeddings)
        assert not torch.isnan(loss)
        
        logger.info(f"✓ Model created with {param_count:,} parameters")
        return True
        
    except Exception as e:
        logger.error(f"✗ Model creation test failed: {e}")
        traceback.print_exc()
        return False

def test_training_setup():
    """Test training setup (without actual training)"""
    logger.info("Testing training setup...")
    
    try:
        from config import Config
        from train import Trainer
        
        # Create temporary directory for models
        with tempfile.TemporaryDirectory() as temp_dir:
            config = Config()
            config.set('model.char_embedding_dim', 16)
            config.set('model.lstm_hidden_dim', 32)
            config.set('model.output_dim', 64)
            config.set('training.batch_size', 2)
            
            trainer = Trainer(config, temp_dir)
            trainer.setup_model(vocab_size=20)
            
            assert trainer.model is not None
            assert trainer.optimizer is not None
            assert trainer.scheduler is not None
            assert trainer.criterion is not None
        
        logger.info("✓ Training setup working correctly")
        return True
        
    except Exception as e:
        logger.error(f"✗ Training setup test failed: {e}")
        traceback.print_exc()
        return False

def test_utilities():
    """Test utility functions"""
    logger.info("Testing utility functions...")
    
    try:
        import numpy as np
        from utils import ModelEvaluator, validate_csv_format, create_sample_data
        
        # Test sample data creation
        df = create_sample_data(num_sequences=3, sequence_length_range=(10, 20))
        assert len(df) > 0
        assert 'character' in df.columns
        
        # Test CSV validation with sample data
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            df.to_csv(f.name, index=False)
            temp_csv_path = f.name
        
        try:
            is_valid = validate_csv_format(temp_csv_path)
            assert is_valid
        finally:
            os.unlink(temp_csv_path)
        
        # Test model evaluator
        with tempfile.TemporaryDirectory() as temp_dir:
            evaluator = ModelEvaluator(temp_dir)
            
            # Test with dummy embeddings
            embeddings = np.random.randn(10, 64)
            stats = evaluator.compute_embedding_statistics(embeddings)
            
            assert 'mean_norm' in stats
            assert 'embedding_dimension' in stats
            assert stats['embedding_dimension'] == 64
            assert stats['num_samples'] == 10
        
        logger.info("✓ Utility functions working correctly")
        return True
        
    except Exception as e:
        logger.error(f"✗ Utility functions test failed: {e}")
        traceback.print_exc()
        return False

def run_all_tests():
    """Run all tests and report results"""
    logger.info("=== Keystroke Dynamics Encoder Installation Test ===")
    
    tests = [
        ("Module Imports", test_imports),
        ("Configuration System", test_configuration),
        ("Data Processing", test_data_processing),
        ("Model Creation", test_model_creation),
        ("Training Setup", test_training_setup),
        ("Utility Functions", test_utilities)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        logger.info(f"\n--- Running {test_name} Test ---")
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            logger.error(f"Test {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Report results
    logger.info("\n=== Test Results ===")
    passed = 0
    total = len(results)
    
    for test_name, success in results:
        status = "PASS" if success else "FAIL"
        symbol = "✓" if success else "✗"
        logger.info(f"{symbol} {test_name}: {status}")
        if success:
            passed += 1
    
    logger.info(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All tests passed! Installation is working correctly.")
        logger.info("You can now run 'python example_usage.py' for a complete demo.")
        return True
    else:
        logger.error(f"❌ {total - passed} test(s) failed. Please check the installation.")
        return False

def main():
    """Main function"""
    try:
        success = run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
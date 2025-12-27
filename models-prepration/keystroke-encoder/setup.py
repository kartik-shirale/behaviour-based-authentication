#!/usr/bin/env python3
"""
Setup script for the Keystroke Dynamics Encoder project.

This script helps users set up the project environment and validates the installation.

Usage:
    python setup.py [--install-deps] [--test] [--create-sample]
"""

import os
import sys
import subprocess
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def check_python_version():
    """Check if Python version is compatible"""
    logger.info("Checking Python version...")
    
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        logger.error(f"Python 3.7+ required, but found {version.major}.{version.minor}")
        return False
    
    logger.info(f"✓ Python {version.major}.{version.minor}.{version.micro} is compatible")
    return True

def install_dependencies():
    """Install required dependencies"""
    logger.info("Installing dependencies...")
    
    requirements_file = Path(__file__).parent / 'requirements.txt'
    
    if not requirements_file.exists():
        logger.error("requirements.txt not found")
        return False
    
    try:
        # Install dependencies
        cmd = [sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)]
        logger.info(f"Running: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info("✓ Dependencies installed successfully")
            return True
        else:
            logger.error(f"Failed to install dependencies: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"Error installing dependencies: {e}")
        return False

def create_directories():
    """Create necessary project directories"""
    logger.info("Creating project directories...")
    
    directories = [
        'data',
        'models', 
        'logs',
        'results',
        'checkpoints'
    ]
    
    project_root = Path(__file__).parent
    
    for directory in directories:
        dir_path = project_root / directory
        dir_path.mkdir(exist_ok=True)
        logger.info(f"✓ Created directory: {dir_path}")
    
    return True

def validate_installation():
    """Validate that all components are working"""
    logger.info("Validating installation...")
    
    try:
        # Import the test module and run tests
        test_script = Path(__file__).parent / 'test_installation.py'
        
        if not test_script.exists():
            logger.error("test_installation.py not found")
            return False
        
        # Run the test script
        cmd = [sys.executable, str(test_script)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Print the output
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        
        if result.returncode == 0:
            logger.info("✓ Installation validation passed")
            return True
        else:
            logger.error("✗ Installation validation failed")
            return False
            
    except Exception as e:
        logger.error(f"Error during validation: {e}")
        return False

def create_sample_data():
    """Create sample data for testing"""
    logger.info("Creating sample data...")
    
    try:
        from utils import create_sample_data
        
        # Create sample training data
        train_df = create_sample_data(
            num_sequences=20, 
            sequence_length_range=(30, 100)
        )
        
        # Create sample test data
        test_df = create_sample_data(
            num_sequences=5,
            sequence_length_range=(20, 80)
        )
        
        # Save to data directory
        data_dir = Path(__file__).parent / 'data'
        data_dir.mkdir(exist_ok=True)
        
        train_path = data_dir / 'sample_train.csv'
        test_path = data_dir / 'sample_test.csv'
        
        train_df.to_csv(train_path, index=False)
        test_df.to_csv(test_path, index=False)
        
        logger.info(f"✓ Sample training data saved to: {train_path}")
        logger.info(f"✓ Sample test data saved to: {test_path}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error creating sample data: {e}")
        return False

def print_usage_instructions():
    """Print usage instructions"""
    logger.info("\n" + "="*60)
    logger.info("🎉 Setup completed successfully!")
    logger.info("="*60)
    
    print("\nNext steps:")
    print("\n1. Test the installation:")
    print("   python test_installation.py")
    
    print("\n2. Run the complete example:")
    print("   python example_usage.py")
    
    print("\n3. Train with your own data:")
    print("   python train.py --data path/to/your/data.csv")
    
    print("\n4. Generate embeddings:")
    print("   python inference.py --model models/best_model.pt --input new_data.csv")
    
    print("\nProject structure:")
    print("   ├── config.py              # Configuration management")
    print("   ├── data_processor.py      # Data loading and preprocessing")
    print("   ├── model.py              # LSTM encoder model")
    print("   ├── train.py              # Training script")
    print("   ├── inference.py          # Inference and embedding generation")
    print("   ├── utils.py              # Evaluation and visualization")
    print("   ├── example_usage.py      # Complete workflow example")
    print("   ├── test_installation.py  # Installation validation")
    print("   ├── requirements.txt      # Python dependencies")
    print("   ├── config_example.yaml   # Example configuration")
    print("   └── README.md            # Documentation")
    
    print("\nDirectories:")
    print("   ├── data/                 # Training and test data")
    print("   ├── models/               # Trained models and metadata")
    print("   ├── logs/                 # Training logs (tensorboard)")
    print("   ├── results/              # Evaluation results and plots")
    print("   └── checkpoints/          # Model checkpoints")
    
    print("\nFor detailed documentation, see README.md")
    print("\nHappy coding! 🚀")

def main():
    """Main setup function"""
    parser = argparse.ArgumentParser(
        description='Setup script for Keystroke Dynamics Encoder'
    )
    parser.add_argument(
        '--install-deps', 
        action='store_true',
        help='Install Python dependencies'
    )
    parser.add_argument(
        '--test', 
        action='store_true',
        help='Run installation tests'
    )
    parser.add_argument(
        '--create-sample', 
        action='store_true',
        help='Create sample data files'
    )
    parser.add_argument(
        '--all', 
        action='store_true',
        help='Run all setup steps'
    )
    
    args = parser.parse_args()
    
    # If no specific arguments, run all steps
    if not any([args.install_deps, args.test, args.create_sample]):
        args.all = True
    
    logger.info("🔧 Starting Keystroke Dynamics Encoder Setup")
    logger.info("="*50)
    
    success = True
    
    # Check Python version
    if not check_python_version():
        return False
    
    # Create directories
    if not create_directories():
        success = False
    
    # Install dependencies
    if args.install_deps or args.all:
        if not install_dependencies():
            success = False
    
    # Create sample data
    if args.create_sample or args.all:
        if not create_sample_data():
            success = False
    
    # Run tests
    if args.test or args.all:
        if not validate_installation():
            success = False
    
    if success:
        print_usage_instructions()
        return True
    else:
        logger.error("❌ Setup failed. Please check the errors above.")
        return False

if __name__ == '__main__':
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\nSetup interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error during setup: {e}")
        sys.exit(1)

        
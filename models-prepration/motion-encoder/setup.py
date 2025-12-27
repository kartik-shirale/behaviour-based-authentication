#!/usr/bin/env python3
"""
Setup script for Motion Sensor Fraud Detection System

This package provides a PyTorch-based LSTM encoder for motion sensor fraud detection,
adapted from keystroke dynamics architecture for accelerometer, gyroscope, and
magnetometer data analysis.
"""

from setuptools import setup, find_packages
import os

# Read the contents of README file
this_directory = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(this_directory, 'README.md'), encoding='utf-8') as f:
    long_description = f.read()

# Read requirements from requirements.txt
with open(os.path.join(this_directory, 'requirements.txt'), encoding='utf-8') as f:
    requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]

setup(
    name="motion-sensor-fraud-detection",
    version="1.0.0",
    author="Motion Fraud Detection Team",
    author_email="contact@motionfraud.ai",
    description="LSTM-based motion sensor fraud detection system using accelerometer, gyroscope, and magnetometer data",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/your-org/motion-sensor-fraud-detection",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Security",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=6.2.0",
            "pytest-cov>=3.0.0",
            "black>=22.0.0",
            "flake8>=4.0.0",
            "isort>=5.10.0",
            "mypy>=0.950",
        ],
        "gpu": [
            "torch[cuda]>=1.12.0",
            "nvidia-ml-py3>=7.352.0",
        ],
        "monitoring": [
            "wandb>=0.12.0",
            "tensorboard>=2.8.0",
            "memory-profiler>=0.60.0",
        ],
        "jupyter": [
            "jupyter>=1.0.0",
            "ipykernel>=6.0.0",
            "ipywidgets>=7.6.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "motion-fraud-train=train:main",
            "motion-fraud-inference=inference:main",
            "motion-fraud-example=example_usage:main",
        ],
    },
    include_package_data=True,
    package_data={
        "": ["*.yaml", "*.yml", "*.json", "*.txt", "*.md"],
    },
    zip_safe=False,
    keywords=[
        "fraud detection",
        "motion sensors",
        "accelerometer",
        "gyroscope",
        "magnetometer",
        "lstm",
        "pytorch",
        "biometrics",
        "authentication",
        "machine learning",
        "deep learning",
        "behavioral biometrics",
        "user verification",
        "security",
    ],
    project_urls={
        "Bug Reports": "https://github.com/your-org/motion-sensor-fraud-detection/issues",
        "Source": "https://github.com/your-org/motion-sensor-fraud-detection",
        "Documentation": "https://motion-sensor-fraud-detection.readthedocs.io/",
    },
)

# Post-installation setup
if __name__ == "__main__":
    import sys
    
    print("\n" + "="*60)
    print("Motion Sensor Fraud Detection System Setup Complete!")
    print("="*60)
    print("\nNext steps:")
    print("1. Create your configuration file based on config_example.yaml")
    print("2. Prepare your motion sensor data in CSV format")
    print("3. Run training: python train.py --config your_config.yaml")
    print("4. Use inference: python inference.py --model models/best_model.pt")
    print("\nFor examples, run: python example_usage.py")
    print("\nDocumentation: See README.md for detailed usage instructions")
    print("="*60 + "\n")
    
    # Check for GPU availability
    try:
        import torch
        if torch.cuda.is_available():
            print(f"✓ GPU detected: {torch.cuda.get_device_name(0)}")
            print(f"✓ CUDA version: {torch.version.cuda}")
        else:
            print("⚠ No GPU detected. Training will use CPU (slower).")
    except ImportError:
        print("⚠ PyTorch not installed yet. Install with: pip install torch")
    
    print("\nSetup completed successfully!\n")
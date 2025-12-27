#!/usr/bin/env python3
"""
Real-time Motion-Based Authentication System

This module provides real-time authentication capabilities using motion sensor data.
It processes incoming motion data, generates user embeddings, and performs authentication
based on similarity scoring with registered user profiles.

Key Features:
- Real-time motion data processing
- Continuous background authentication
- Similarity-based user verification
- Configurable authentication thresholds
- Performance monitoring and logging
"""

import time
import logging
import threading
from typing import Dict, List, Optional, Tuple, Any
from collections import deque
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
from scipy.spatial.distance import cosine

from data_processor import MotionDataProcessor
from model import MotionLSTMEncoder, MotionAuthenticator
from utils import cosine_similarity, AuthenticationMetrics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class AuthenticationResult:
    """Result of an authentication attempt."""
    user_id: str
    is_authenticated: bool
    confidence_score: float
    similarity_score: float
    threshold: float
    processing_time: float
    timestamp: float
    sequence_length: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/storage."""
        return {
            'user_id': self.user_id,
            'is_authenticated': self.is_authenticated,
            'confidence_score': self.confidence_score,
            'similarity_score': self.similarity_score,
            'threshold': self.threshold,
            'processing_time': self.processing_time,
            'timestamp': self.timestamp,
            'sequence_length': self.sequence_length
        }


class MotionBuffer:
    """Thread-safe circular buffer for motion sensor data."""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.buffer = deque(maxlen=max_size)
        self.lock = threading.Lock()
        
    def add_sample(self, sample: np.ndarray) -> None:
        """Add a motion sample to the buffer."""
        with self.lock:
            self.buffer.append(sample)
    
    def add_samples(self, samples: np.ndarray) -> None:
        """Add multiple motion samples to the buffer."""
        with self.lock:
            for sample in samples:
                self.buffer.append(sample)
    
    def get_recent_samples(self, n_samples: int) -> Optional[np.ndarray]:
        """Get the most recent n samples."""
        with self.lock:
            if len(self.buffer) < n_samples:
                return None
            return np.array(list(self.buffer)[-n_samples:])
    
    def get_all_samples(self) -> np.ndarray:
        """Get all samples in the buffer."""
        with self.lock:
            return np.array(list(self.buffer))
    
    def clear(self) -> None:
        """Clear the buffer."""
        with self.lock:
            self.buffer.clear()
    
    def size(self) -> int:
        """Get current buffer size."""
        with self.lock:
            return len(self.buffer)


class RealTimeAuthenticator:
    """Real-time motion-based authentication system."""
    
    def __init__(
        self,
        model_path: str,
        sequence_length: int = 100,
        sampling_rate: float = 50.0,
        auth_threshold: float = 0.75,
        min_samples_for_auth: int = 50,
        continuous_auth_interval: float = 5.0,
        device: str = 'cpu'
    ):
        """
        Initialize the real-time authenticator.
        
        Args:
            model_path: Path to the trained model
            sequence_length: Length of motion sequences for authentication
            sampling_rate: Motion data sampling rate (Hz)
            auth_threshold: Similarity threshold for authentication
            min_samples_for_auth: Minimum samples needed for authentication
            continuous_auth_interval: Interval for continuous authentication (seconds)
            device: Device for model inference ('cpu' or 'cuda')
        """
        self.sequence_length = sequence_length
        self.sampling_rate = sampling_rate
        self.auth_threshold = auth_threshold
        self.min_samples_for_auth = min_samples_for_auth
        self.continuous_auth_interval = continuous_auth_interval
        self.device = torch.device(device)
        
        # Initialize components
        self.data_processor = MotionDataProcessor(
            sequence_length=sequence_length,
            sampling_rate=sampling_rate
        )
        
        # Load model
        self.model = self._load_model(model_path)
        self.model.eval()
        
        # Initialize authenticator
        self.authenticator = MotionAuthenticator(
            model=self.model,
            threshold=auth_threshold,
            device=device
        )
        
        # Motion data buffer
        self.motion_buffer = MotionBuffer(max_size=int(sampling_rate * 60))  # 1 minute buffer
        
        # User profiles storage
        self.user_profiles: Dict[str, np.ndarray] = {}
        
        # Authentication history
        self.auth_history: List[AuthenticationResult] = []
        
        # Continuous authentication
        self.continuous_auth_enabled = False
        self.continuous_auth_thread = None
        self.last_auth_time = 0
        
        # Performance metrics
        self.metrics = AuthenticationMetrics()
        
        logger.info(f"RealTimeAuthenticator initialized with threshold {auth_threshold}")
    
    def _load_model(self, model_path: str) -> MotionLSTMEncoder:
        """Load the trained model."""
        try:
            checkpoint = torch.load(model_path, map_location=self.device)
            
            # Extract model parameters from checkpoint
            if 'model_config' in checkpoint:
                config = checkpoint['model_config']
                model = MotionLSTMEncoder(**config)
            else:
                # Default configuration
                model = MotionLSTMEncoder(
                    input_size=10,
                    hidden_size=256,
                    num_layers=2,
                    embedding_dim=256
                )
            
            model.load_state_dict(checkpoint['model_state_dict'])
            model.to(self.device)
            
            logger.info(f"Model loaded successfully from {model_path}")
            return model
            
        except Exception as e:
            logger.error(f"Failed to load model from {model_path}: {e}")
            raise
    
    def register_user(self, user_id: str, motion_data: np.ndarray) -> bool:
        """Register a new user with their motion profile."""
        try:
            # Preprocess motion data
            processed_data = self.data_processor.preprocess_data(motion_data)
            
            if processed_data is None or len(processed_data) == 0:
                logger.error(f"Failed to preprocess motion data for user {user_id}")
                return False
            
            # Generate user embedding
            with torch.no_grad():
                # Take multiple sequences and average embeddings
                embeddings = []
                for sequence in processed_data[:10]:  # Use up to 10 sequences
                    sequence_tensor = torch.FloatTensor(sequence).unsqueeze(0).to(self.device)
                    embedding = self.model(sequence_tensor)
                    embeddings.append(embedding.cpu().numpy())
                
                # Average embeddings for robust profile
                user_embedding = np.mean(embeddings, axis=0)
                self.user_profiles[user_id] = user_embedding
            
            logger.info(f"User {user_id} registered successfully with {len(embeddings)} sequences")
            return True
            
        except Exception as e:
            logger.error(f"Failed to register user {user_id}: {e}")
            return False
    
    def add_motion_sample(self, sample: np.ndarray) -> None:
        """Add a single motion sample to the buffer."""
        if sample.shape[0] != 10:
            logger.warning(f"Invalid sample shape: {sample.shape}, expected (10,)")
            return
        
        self.motion_buffer.add_sample(sample)
    
    def add_motion_batch(self, batch: np.ndarray) -> None:
        """Add a batch of motion samples to the buffer."""
        if batch.ndim != 2 or batch.shape[1] != 10:
            logger.warning(f"Invalid batch shape: {batch.shape}, expected (N, 10)")
            return
        
        self.motion_buffer.add_samples(batch)
    
    def authenticate_user(self, user_id: str, use_recent_data: bool = True) -> AuthenticationResult:
        """Authenticate a user based on recent motion data."""
        start_time = time.time()
        
        try:
            # Check if user is registered
            if user_id not in self.user_profiles:
                logger.error(f"User {user_id} not registered")
                return AuthenticationResult(
                    user_id=user_id,
                    is_authenticated=False,
                    confidence_score=0.0,
                    similarity_score=0.0,
                    threshold=self.auth_threshold,
                    processing_time=time.time() - start_time,
                    timestamp=time.time(),
                    sequence_length=0
                )
            
            # Get motion data
            if use_recent_data:
                motion_data = self.motion_buffer.get_recent_samples(self.sequence_length)
            else:
                motion_data = self.motion_buffer.get_all_samples()
            
            if motion_data is None or len(motion_data) < self.min_samples_for_auth:
                logger.warning(f"Insufficient motion data for authentication: {len(motion_data) if motion_data is not None else 0} samples")
                return AuthenticationResult(
                    user_id=user_id,
                    is_authenticated=False,
                    confidence_score=0.0,
                    similarity_score=0.0,
                    threshold=self.auth_threshold,
                    processing_time=time.time() - start_time,
                    timestamp=time.time(),
                    sequence_length=len(motion_data) if motion_data is not None else 0
                )
            
            # Preprocess data
            processed_data = self.data_processor.preprocess_data(motion_data)
            
            if processed_data is None or len(processed_data) == 0:
                logger.error("Failed to preprocess motion data for authentication")
                return AuthenticationResult(
                    user_id=user_id,
                    is_authenticated=False,
                    confidence_score=0.0,
                    similarity_score=0.0,
                    threshold=self.auth_threshold,
                    processing_time=time.time() - start_time,
                    timestamp=time.time(),
                    sequence_length=len(motion_data)
                )
            
            # Generate current embedding
            with torch.no_grad():
                sequence_tensor = torch.FloatTensor(processed_data[0]).unsqueeze(0).to(self.device)
                current_embedding = self.model(sequence_tensor).cpu().numpy()
            
            # Calculate similarity with user profile
            user_profile = self.user_profiles[user_id]
            similarity_score = cosine_similarity(current_embedding.flatten(), user_profile.flatten())
            
            # Authentication decision
            is_authenticated = similarity_score >= self.auth_threshold
            confidence_score = min(similarity_score / self.auth_threshold, 1.0)
            
            processing_time = time.time() - start_time
            
            result = AuthenticationResult(
                user_id=user_id,
                is_authenticated=is_authenticated,
                confidence_score=confidence_score,
                similarity_score=similarity_score,
                threshold=self.auth_threshold,
                processing_time=processing_time,
                timestamp=time.time(),
                sequence_length=len(motion_data)
            )
            
            # Store result
            self.auth_history.append(result)
            
            # Log result
            status = "AUTHENTICATED" if is_authenticated else "REJECTED"
            logger.info(f"Authentication {status}: {user_id}, similarity={similarity_score:.3f}, time={processing_time:.3f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"Authentication failed for user {user_id}: {e}")
            return AuthenticationResult(
                user_id=user_id,
                is_authenticated=False,
                confidence_score=0.0,
                similarity_score=0.0,
                threshold=self.auth_threshold,
                processing_time=time.time() - start_time,
                timestamp=time.time(),
                sequence_length=0
            )
    
    def start_continuous_authentication(self, user_id: str) -> None:
        """Start continuous background authentication."""
        if self.continuous_auth_enabled:
            logger.warning("Continuous authentication already running")
            return
        
        self.continuous_auth_enabled = True
        self.continuous_auth_thread = threading.Thread(
            target=self._continuous_auth_worker,
            args=(user_id,),
            daemon=True
        )
        self.continuous_auth_thread.start()
        logger.info(f"Started continuous authentication for user {user_id}")
    
    def stop_continuous_authentication(self) -> None:
        """Stop continuous background authentication."""
        self.continuous_auth_enabled = False
        if self.continuous_auth_thread:
            self.continuous_auth_thread.join(timeout=1.0)
        logger.info("Stopped continuous authentication")
    
    def _continuous_auth_worker(self, user_id: str) -> None:
        """Worker thread for continuous authentication."""
        while self.continuous_auth_enabled:
            current_time = time.time()
            
            # Check if it's time for authentication
            if current_time - self.last_auth_time >= self.continuous_auth_interval:
                if self.motion_buffer.size() >= self.min_samples_for_auth:
                    result = self.authenticate_user(user_id)
                    
                    # Handle authentication failure
                    if not result.is_authenticated:
                        logger.warning(f"Continuous authentication failed for {user_id}")
                        # Could trigger security actions here
                    
                    self.last_auth_time = current_time
            
            time.sleep(0.1)  # Small sleep to prevent busy waiting
    
    def get_authentication_stats(self) -> Dict[str, Any]:
        """Get authentication statistics."""
        if not self.auth_history:
            return {}
        
        recent_results = [r for r in self.auth_history if time.time() - r.timestamp < 3600]  # Last hour
        
        stats = {
            'total_attempts': len(self.auth_history),
            'recent_attempts': len(recent_results),
            'success_rate': sum(1 for r in recent_results if r.is_authenticated) / max(len(recent_results), 1),
            'avg_processing_time': np.mean([r.processing_time for r in recent_results]),
            'avg_similarity_score': np.mean([r.similarity_score for r in recent_results]),
            'registered_users': len(self.user_profiles),
            'buffer_size': self.motion_buffer.size()
        }
        
        return stats
    
    def save_user_profiles(self, filepath: str) -> None:
        """Save user profiles to file."""
        try:
            np.savez(filepath, **self.user_profiles)
            logger.info(f"User profiles saved to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save user profiles: {e}")
    
    def load_user_profiles(self, filepath: str) -> None:
        """Load user profiles from file."""
        try:
            data = np.load(filepath)
            self.user_profiles = {key: data[key] for key in data.files}
            logger.info(f"Loaded {len(self.user_profiles)} user profiles from {filepath}")
        except Exception as e:
            logger.error(f"Failed to load user profiles: {e}")


def create_sample_motion_stream(duration: float = 10.0, sampling_rate: float = 50.0) -> np.ndarray:
    """Create sample motion data stream for testing."""
    n_samples = int(duration * sampling_rate)
    t = np.linspace(0, duration, n_samples)
    
    # Simulate walking motion with some randomness
    motion_data = np.zeros((n_samples, 10))
    
    # Accelerometer (walking pattern)
    motion_data[:, 0] = 0.1 * np.sin(2 * np.pi * 2 * t) + 0.05 * np.random.randn(n_samples)  # accel_x
    motion_data[:, 1] = 0.2 * np.sin(2 * np.pi * 2 * t + np.pi/4) + 0.05 * np.random.randn(n_samples)  # accel_y
    motion_data[:, 2] = 9.8 + 0.3 * np.sin(2 * np.pi * 2 * t) + 0.1 * np.random.randn(n_samples)  # accel_z
    
    # Gyroscope (rotation during walking)
    motion_data[:, 3] = 0.05 * np.sin(2 * np.pi * 2 * t) + 0.02 * np.random.randn(n_samples)  # gyro_x
    motion_data[:, 4] = 0.03 * np.sin(2 * np.pi * 2 * t + np.pi/3) + 0.02 * np.random.randn(n_samples)  # gyro_y
    motion_data[:, 5] = 0.02 * np.sin(2 * np.pi * 2 * t + np.pi/2) + 0.01 * np.random.randn(n_samples)  # gyro_z
    
    # Magnetometer (relatively stable)
    motion_data[:, 6] = 25.0 + 2.0 * np.random.randn(n_samples)  # mag_x
    motion_data[:, 7] = -15.0 + 2.0 * np.random.randn(n_samples)  # mag_y
    motion_data[:, 8] = 45.0 + 2.0 * np.random.randn(n_samples)  # mag_z
    
    # Motion magnitude
    motion_data[:, 9] = np.sqrt(motion_data[:, 0]**2 + motion_data[:, 1]**2 + motion_data[:, 2]**2)
    
    return motion_data


if __name__ == "__main__":
    # Example usage
    print("Motion-Based Authentication System Demo")
    print("=" * 50)
    
    # Note: This requires a trained model file
    # For demo purposes, we'll show the interface
    
    try:
        # Initialize authenticator (would need actual model file)
        # authenticator = RealTimeAuthenticator(
        #     model_path="motion_model.pth",
        #     sequence_length=100,
        #     auth_threshold=0.75
        # )
        
        # Generate sample motion data
        print("Generating sample motion data...")
        registration_data = create_sample_motion_stream(duration=30.0)  # 30 seconds for registration
        test_data = create_sample_motion_stream(duration=10.0)  # 10 seconds for testing
        
        print(f"Registration data shape: {registration_data.shape}")
        print(f"Test data shape: {test_data.shape}")
        
        # Demo workflow (commented out as it needs trained model)
        # print("\nDemo workflow:")
        # print("1. Register user with motion profile")
        # success = authenticator.register_user("user123", registration_data)
        # print(f"   Registration successful: {success}")
        # 
        # print("2. Add motion samples to buffer")
        # authenticator.add_motion_batch(test_data)
        # 
        # print("3. Authenticate user")
        # result = authenticator.authenticate_user("user123")
        # print(f"   Authentication result: {result.to_dict()}")
        # 
        # print("4. Start continuous authentication")
        # authenticator.start_continuous_authentication("user123")
        # time.sleep(5)  # Run for 5 seconds
        # authenticator.stop_continuous_authentication()
        # 
        # print("5. Get statistics")
        # stats = authenticator.get_authentication_stats()
        # print(f"   Stats: {stats}")
        
        print("\nDemo completed successfully!")
        print("To use with a real model:")
        print("1. Train a model using train.py")
        print("2. Update the model_path in RealTimeAuthenticator")
        print("3. Run this script with real motion data")
        
    except Exception as e:
        print(f"Demo error: {e}")
        print("This is expected without a trained model file.")
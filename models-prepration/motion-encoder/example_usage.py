#!/usr/bin/env python3
"""
Example usage of Motion Sensor Fraud Detection System

This script demonstrates how to use the motion sensor fraud detection system
for training, inference, and user authentication.
"""

import numpy as np
import pandas as pd
import os
from typing import List, Dict

# Import our motion sensor fraud detection modules
from config import Config
from model import MotionSensorEncoder, create_model
from data_processor import MotionSensorProcessor, load_motion_data
from train import MotionSensorTrainer
from inference import MotionSensorInference
from utils import visualize_embeddings, plot_training_history, evaluate_user_authentication

def generate_sample_data(num_users: int = 5, sequences_per_user: int = 10, sequence_length: int = 100) -> pd.DataFrame:
    """
    Generate sample motion sensor data for demonstration.
    
    Args:
        num_users: Number of users to simulate
        sequences_per_user: Number of sequences per user
        sequence_length: Length of each sequence
        
    Returns:
        DataFrame with sample motion sensor data
    """
    print(f"Generating sample data for {num_users} users...")
    
    data = []
    
    for user_id in range(num_users):
        # Create user-specific motion patterns
        user_base_accel = np.random.normal(0, 0.5, 3)  # Base acceleration pattern
        user_base_gyro = np.random.normal(0, 0.2, 3)   # Base gyroscope pattern
        user_base_mag = np.random.normal(0, 0.1, 3)    # Base magnetometer pattern
        
        for seq_id in range(sequences_per_user):
            for step in range(sequence_length):
                # Add noise to base patterns
                accel = user_base_accel + np.random.normal(0, 0.1, 3)
                gyro = user_base_gyro + np.random.normal(0, 0.05, 3)
                mag = user_base_mag + np.random.normal(0, 0.02, 3)
                
                # Calculate derived features
                motion_magnitude = np.linalg.norm(accel)
                rotation_rate = np.linalg.norm(gyro)
                
                data.append({
                    'user_id': f'user_{user_id}',
                    'accel_x': accel[0],
                    'accel_y': accel[1],
                    'accel_z': accel[2],
                    'gyro_x': gyro[0],
                    'gyro_y': gyro[1],
                    'gyro_z': gyro[2],
                    'mag_x': mag[0],
                    'mag_y': mag[1],
                    'mag_z': mag[2],
                    'motion_magnitude': motion_magnitude,
                    'rotation_rate': rotation_rate
                })
    
    df = pd.DataFrame(data)
    print(f"Generated {len(df)} data points")
    return df

def example_training():
    """
    Example of training a motion sensor fraud detection model.
    """
    print("\n" + "="*50)
    print("EXAMPLE 1: Training Motion Sensor Model")
    print("="*50)
    
    # Generate sample training data
    train_data = generate_sample_data(num_users=3, sequences_per_user=20, sequence_length=100)
    
    # Save sample data
    train_data.to_csv('sample_train_data.csv', index=False)
    print("Sample training data saved to 'sample_train_data.csv'")
    
    # Load configuration
    config = Config('config_example.yaml')
    
    # Create data processor
    processor = MotionSensorProcessor(
        sequence_length=config.get_sequence_length(),
        overlap=0.5,
        required_columns=config.get_required_columns(),
        normalization='standard'
    )
    
    # Process data
    dataset = processor.create_dataset(train_data)
    train_loader = processor.create_dataloader(dataset, batch_size=16, shuffle=True)
    
    print(f"Created dataset with {len(dataset)} sequences")
    
    # Create model
    model = create_model(config.get_model_config())
    print(f"Created model with {sum(p.numel() for p in model.parameters()):,} parameters")
    
    # Create trainer
    trainer = MotionSensorTrainer(config, model)
    
    # Train for a few epochs (demo purposes)
    print("\nStarting training...")
    history = trainer.train(train_loader, train_loader, num_epochs=5)
    
    # Save model
    os.makedirs('models', exist_ok=True)
    trainer.save_model('models/demo_model.pt')
    processor.save_processor('models/demo_processor.pkl')
    
    print("\nTraining completed! Model saved to 'models/demo_model.pt'")
    
    # Plot training history
    fig = plot_training_history(history, 'training_history.png')
    
    return 'models/demo_model.pt'

def example_inference(model_path: str):
    """
    Example of using trained model for inference.
    
    Args:
        model_path: Path to trained model
    """
    print("\n" + "="*50)
    print("EXAMPLE 2: Model Inference")
    print("="*50)
    
    # Initialize inference engine
    inference = MotionSensorInference(model_path)
    
    # Generate test data
    test_data = generate_sample_data(num_users=2, sequences_per_user=5, sequence_length=100)
    
    print("\nGetting embeddings for test data...")
    embeddings = inference.get_embedding(test_data)
    print(f"Generated {len(embeddings)} embeddings of dimension {embeddings.shape[1]}")
    
    # Example: Single sequence embedding
    single_sequence = test_data[test_data['user_id'] == 'user_0'].iloc[:100]
    single_embedding = inference.get_single_embedding(single_sequence)
    print(f"Single sequence embedding shape: {single_embedding.shape}")
    
    # Example: Compute similarity between embeddings
    if len(embeddings) >= 2:
        similarity = inference.compute_similarity(embeddings[0], embeddings[1])
        print(f"Similarity between first two embeddings: {similarity:.4f}")
    
    return embeddings, test_data

def example_user_authentication(model_path: str):
    """
    Example of user authentication using motion sensor data.
    
    Args:
        model_path: Path to trained model
    """
    print("\n" + "="*50)
    print("EXAMPLE 3: User Authentication")
    print("="*50)
    
    # Initialize inference engine
    inference = MotionSensorInference(model_path)
    
    # Generate enrollment data for a user
    print("Generating enrollment data for user authentication...")
    enrollment_data = generate_sample_data(num_users=1, sequences_per_user=10, sequence_length=100)
    enrollment_data['user_id'] = 'target_user'
    
    # Create user profile
    user_profile = inference.create_user_profile(enrollment_data, method='mean')
    print(f"Created user profile with shape: {user_profile.shape}")
    
    # Generate test data (legitimate user)
    legitimate_data = generate_sample_data(num_users=1, sequences_per_user=3, sequence_length=100)
    legitimate_data['user_id'] = 'target_user'
    
    # Test authentication with legitimate user data
    auth_result = inference.predict_authenticity(
        legitimate_data, 
        user_profile, 
        threshold=0.7
    )
    
    print(f"\nAuthentication Results (Legitimate User):")
    print(f"  Is Authentic: {auth_result['is_authentic']}")
    print(f"  Similarity Score: {auth_result['similarity_score']:.4f}")
    print(f"  Confidence: {auth_result['confidence']:.4f}")
    
    # Generate test data (imposter)
    imposter_data = generate_sample_data(num_users=1, sequences_per_user=3, sequence_length=100)
    imposter_data['user_id'] = 'imposter'
    
    # Test authentication with imposter data
    imposter_result = inference.predict_authenticity(
        imposter_data, 
        user_profile, 
        threshold=0.7
    )
    
    print(f"\nAuthentication Results (Imposter):")
    print(f"  Is Authentic: {imposter_result['is_authentic']}")
    print(f"  Similarity Score: {imposter_result['similarity_score']:.4f}")
    print(f"  Confidence: {imposter_result['confidence']:.4f}")
    
    return user_profile, auth_result, imposter_result

def example_batch_processing(model_path: str):
    """
    Example of batch processing multiple data samples.
    
    Args:
        model_path: Path to trained model
    """
    print("\n" + "="*50)
    print("EXAMPLE 4: Batch Processing")
    print("="*50)
    
    # Initialize inference engine
    inference = MotionSensorInference(model_path)
    
    # Generate multiple data samples
    data_samples = []
    for i in range(5):
        sample = generate_sample_data(num_users=1, sequences_per_user=2, sequence_length=100)
        sample['user_id'] = f'batch_user_{i}'
        data_samples.append(sample)
    
    print(f"Processing {len(data_samples)} data samples in batch...")
    
    # Batch inference
    embeddings_list = inference.batch_inference(data_samples)
    
    print(f"Generated embeddings for {len([e for e in embeddings_list if e is not None])} samples")
    
    # Save embeddings
    all_embeddings = np.vstack([e for e in embeddings_list if e is not None])
    inference.save_embeddings(all_embeddings, 'batch_embeddings.pkl')
    
    return embeddings_list

def example_visualization(embeddings: np.ndarray, test_data: pd.DataFrame):
    """
    Example of visualizing embeddings.
    
    Args:
        embeddings: Embedding vectors
        test_data: Test data with user labels
    """
    print("\n" + "="*50)
    print("EXAMPLE 5: Embedding Visualization")
    print("="*50)
    
    # Create labels for visualization
    user_ids = test_data['user_id'].unique()
    user_to_label = {user: i for i, user in enumerate(user_ids)}
    
    # Map user IDs to numeric labels (simplified for demo)
    labels = []
    sequences_per_user = len(embeddings) // len(user_ids)
    for i, user_id in enumerate(user_ids):
        labels.extend([i] * sequences_per_user)
    
    # Adjust if lengths don't match exactly
    labels = labels[:len(embeddings)]
    labels = np.array(labels)
    
    print(f"Visualizing {len(embeddings)} embeddings from {len(user_ids)} users...")
    
    # Create visualization
    fig = visualize_embeddings(
        embeddings, 
        labels, 
        method='tsne',
        save_path='embeddings_visualization.png'
    )
    
    print("Embedding visualization saved to 'embeddings_visualization.png'")

def example_model_info(model_path: str):
    """
    Example of getting model information.
    
    Args:
        model_path: Path to trained model
    """
    print("\n" + "="*50)
    print("EXAMPLE 6: Model Information")
    print("="*50)
    
    # Initialize inference engine
    inference = MotionSensorInference(model_path)
    
    # Get model information
    model_info = inference.get_model_info()
    
    print("Model Information:")
    print(f"  Model Path: {model_info['model_path']}")
    print(f"  Device: {model_info['device']}")
    print(f"  Best Loss: {model_info.get('best_loss', 'N/A')}")
    print(f"  Training Epochs: {model_info.get('epoch', 'N/A')}")
    
    print("\nModel Configuration:")
    model_config = model_info.get('model_config', {})
    for key, value in model_config.items():
        print(f"  {key}: {value}")
    
    print("\nProcessor Statistics:")
    processor_stats = model_info.get('processor_stats', {})
    print(f"  Total Sequences: {processor_stats.get('total_sequences', 'N/A')}")
    print(f"  Number of Users: {len(processor_stats.get('users', []))}")

def main():
    """
    Main function demonstrating all examples.
    """
    print("Motion Sensor Fraud Detection - Example Usage")
    print("=" * 60)
    
    try:
        # Example 1: Training
        model_path = example_training()
        
        # Example 2: Inference
        embeddings, test_data = example_inference(model_path)
        
        # Example 3: User Authentication
        user_profile, auth_result, imposter_result = example_user_authentication(model_path)
        
        # Example 4: Batch Processing
        batch_embeddings = example_batch_processing(model_path)
        
        # Example 5: Visualization
        if len(embeddings) > 1:
            example_visualization(embeddings, test_data)
        
        # Example 6: Model Information
        example_model_info(model_path)
        
        print("\n" + "="*60)
        print("All examples completed successfully!")
        print("Generated files:")
        print("  - sample_train_data.csv")
        print("  - models/demo_model.pt")
        print("  - models/demo_processor.pkl")
        print("  - training_history.png")
        print("  - batch_embeddings.pkl")
        print("  - embeddings_visualization.png")
        print("="*60)
        
    except Exception as e:
        print(f"\nError occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
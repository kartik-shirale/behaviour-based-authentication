#!/usr/bin/env python3
"""
Example usage script for keystroke dynamics encoder.

This script demonstrates the complete workflow:
1. Generate sample data
2. Train the model
3. Generate embeddings
4. Evaluate the model
5. Visualize results

Usage:
    python example_usage.py
"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import logging
from pathlib import Path

# Import our modules
from config import Config
from data_processor import DataProcessor
from model import create_model, count_parameters
from train import Trainer
from inference import KeystrokeEncoder
from utils import ModelEvaluator, TrainingVisualizer, create_sample_data, validate_csv_format

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_directories():
    """Create necessary directories"""
    directories = ['./data', './models', './logs', './results']
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"Created directory: {directory}")

def generate_sample_data():
    """Generate sample keystroke data for demonstration"""
    logger.info("Generating sample keystroke data...")
    
    # Create sample data with multiple users/sessions
    all_data = []
    
    # Generate data for 5 different "users" with different typing patterns
    for user_id in range(5):
        logger.info(f"Generating data for user {user_id + 1}")
        
        # Each user has different typing characteristics
        base_dwell = 100 + user_id * 20  # Different base dwell times
        base_flight = 80 + user_id * 15   # Different base flight times
        
        # Generate multiple sessions per user
        for session_id in range(10):
            session_length = np.random.randint(50, 200)
            
            # Common words and phrases for more realistic data
            sample_texts = [
                "hello world",
                "the quick brown fox",
                "python programming",
                "machine learning",
                "artificial intelligence",
                "data science",
                "neural networks",
                "deep learning"
            ]
            
            # Choose random text
            text = np.random.choice(sample_texts)
            
            for pos, char in enumerate(text):
                # User-specific timing patterns with some variation
                dwell_time = np.random.normal(base_dwell, 20)
                flight_time = np.random.normal(base_flight, 15)
                
                # Add position-based variation (faster for common positions)
                if char in 'aeiou':  # Vowels might be typed faster
                    dwell_time *= 0.9
                    flight_time *= 0.9
                
                # Simulate screen coordinates
                x = 200 + pos * 10 + np.random.normal(0, 5)
                y = 300 + np.random.normal(0, 10)
                
                all_data.append({
                    'user_id': user_id,
                    'session_id': f"{user_id}_{session_id}",
                    'character': char,
                    'dwellTime': max(10, dwell_time),
                    'flightTime': max(0, flight_time),
                    'x': x,
                    'y': y,
                    'action': np.random.choice([0, 1])
                })
            
            # Add some backspaces and enters
            if np.random.random() < 0.3:  # 30% chance of backspace
                all_data.append({
                    'user_id': user_id,
                    'session_id': f"{user_id}_{session_id}",
                    'character': 'backspace',
                    'dwellTime': base_dwell * 1.5,
                    'flightTime': base_flight * 1.2,
                    'x': x + 20,
                    'y': y,
                    'action': 1
                })
            
            # Add enter at end of session
            all_data.append({
                'user_id': user_id,
                'session_id': f"{user_id}_{session_id}",
                'character': 'enter',
                'dwellTime': base_dwell * 1.3,
                'flightTime': base_flight * 1.1,
                'x': x + 50,
                'y': y,
                'action': 1
            })
    
    # Create DataFrame and save
    df = pd.DataFrame(all_data)
    
    # Split into train and test sets
    train_df = df[df['user_id'].isin([0, 1, 2, 3])].copy()  # 4 users for training
    test_df = df[df['user_id'] == 4].copy()  # 1 user for testing
    
    train_path = './data/train_data.csv'
    test_path = './data/test_data.csv'
    
    # Remove user_id and session_id columns for the model (keep only required columns)
    train_columns = ['character', 'dwellTime', 'flightTime', 'x', 'y', 'action']
    test_columns = ['character', 'dwellTime', 'flightTime', 'x', 'y', 'action']
    
    train_df[train_columns].to_csv(train_path, index=False)
    test_df[test_columns].to_csv(test_path, index=False)
    
    logger.info(f"Generated {len(train_df)} training samples and {len(test_df)} test samples")
    logger.info(f"Training data saved to: {train_path}")
    logger.info(f"Test data saved to: {test_path}")
    
    return train_path, test_path

def train_model(train_data_path):
    """Train the keystroke dynamics encoder"""
    logger.info("Starting model training...")
    
    # Load configuration
    config = Config()
    
    # Adjust config for quick demo (smaller model, fewer epochs)
    config.set('model.lstm_hidden_dim', 128)
    config.set('model.output_dim', 128)
    config.set('training.num_epochs', 20)  # Reduced for demo
    config.set('training.batch_size', 16)
    config.set('training.early_stopping_patience', 5)
    
    # Process data
    data_processor = DataProcessor(config)
    train_loader, val_loader, metadata = data_processor.process_csv(train_data_path)
    
    logger.info(f"Vocabulary size: {metadata['vocab_size']}")
    logger.info(f"Training samples: {metadata['num_train_samples']}")
    logger.info(f"Validation samples: {metadata['num_val_samples']}")
    
    # Save metadata
    import pickle
    with open('./models/metadata.pkl', 'wb') as f:
        pickle.dump(metadata, f)
    
    # Save config
    config.save_config('./models/config.yaml')
    
    # Initialize trainer
    trainer = Trainer(config, './models')
    trainer.setup_model(metadata['vocab_size'])
    
    logger.info(f"Model has {count_parameters(trainer.model):,} trainable parameters")
    
    # Train model
    trainer.train(train_loader, val_loader)
    
    logger.info(f"Training completed. Best validation loss: {trainer.best_val_loss:.4f}")
    
    return './models/best_model.pt'

def generate_embeddings(model_path, test_data_path):
    """Generate embeddings for test data"""
    logger.info("Generating embeddings for test data...")
    
    # Initialize encoder
    encoder = KeystrokeEncoder(model_path)
    
    # Generate embeddings
    embeddings = encoder.encode_csv(test_data_path, './results/test_embeddings.npy')
    
    logger.info(f"Generated {len(embeddings)} embeddings of dimension {embeddings.shape[1]}")
    
    return embeddings

def evaluate_model(embeddings):
    """Evaluate the trained model"""
    logger.info("Evaluating model performance...")
    
    # Initialize evaluator
    evaluator = ModelEvaluator('./results')
    
    # Perform comprehensive evaluation
    results = evaluator.evaluate_model_performance(embeddings)
    
    # Print key statistics
    logger.info("=== Model Evaluation Results ===")
    logger.info(f"Embedding dimension: {results['embedding_stats']['embedding_dimension']}")
    logger.info(f"Number of samples: {results['embedding_stats']['num_samples']}")
    logger.info(f"Mean embedding norm: {results['embedding_stats']['mean_norm']:.4f}")
    logger.info(f"Best number of clusters: {results['clustering_analysis']['best_k']}")
    logger.info(f"Best silhouette score: {results['clustering_analysis']['best_silhouette_score']:.4f}")
    logger.info(f"Mean pairwise similarity: {results['similarity_stats']['mean_similarity']:.4f}")
    
    # Save evaluation report
    from utils import save_evaluation_report
    save_evaluation_report(results, './results/evaluation_report.json')
    
    return results, evaluator

def visualize_results(embeddings, evaluator, results):
    """Create visualizations of the results"""
    logger.info("Creating visualizations...")
    
    # 2D visualization using t-SNE
    fig1 = evaluator.visualize_embeddings_2d(
        embeddings, 
        method='tsne', 
        save_path='./results/embeddings_tsne.png'
    )
    plt.close(fig1)
    
    # 2D visualization using PCA
    fig2 = evaluator.visualize_embeddings_2d(
        embeddings, 
        method='pca', 
        save_path='./results/embeddings_pca.png'
    )
    plt.close(fig2)
    
    # Clustering analysis plot
    fig3 = evaluator.plot_clustering_analysis(
        results['clustering_analysis'], 
        save_path='./results/clustering_analysis.png'
    )
    plt.close(fig3)
    
    # Similarity heatmap (for small datasets)
    if len(embeddings) <= 50:  # Only for small datasets
        similarity_matrix = evaluator.compute_pairwise_similarities(embeddings)
        fig4 = evaluator.plot_similarity_heatmap(
            similarity_matrix, 
            save_path='./results/similarity_heatmap.png'
        )
        plt.close(fig4)
    
    # Training history visualization
    if os.path.exists('./models/training_history.json'):
        from utils import load_training_history
        history = load_training_history('./models/training_history.json')
        
        visualizer = TrainingVisualizer('./results')
        fig5 = visualizer.plot_training_history(
            history, 
            save_path='./results/training_history.png'
        )
        plt.close(fig5)
    
    logger.info("Visualizations saved to ./results/")

def demonstrate_similarity_search(model_path, test_data_path):
    """Demonstrate similarity search functionality"""
    logger.info("Demonstrating similarity search...")
    
    # Initialize encoder
    encoder = KeystrokeEncoder(model_path)
    
    # Load test data and generate embeddings
    test_df = pd.read_csv(test_data_path)
    
    # Group by sessions (assuming consecutive rows form sessions)
    # For demo, we'll create artificial session boundaries
    session_size = 20  # Approximate keystrokes per session
    sessions = []
    current_session = []
    
    for _, row in test_df.iterrows():
        keystroke = {
            'character': row['character'],
            'dwellTime': float(row['dwellTime']),
            'flightTime': float(row['flightTime']),
            'x': float(row['x']),
            'y': float(row['y']),
            'action': int(row['action'])
        }
        current_session.append(keystroke)
        
        if len(current_session) >= session_size:
            sessions.append(current_session.copy())
            current_session = []
    
    if len(current_session) >= 10:  # Add last session if it's long enough
        sessions.append(current_session)
    
    if len(sessions) < 2:
        logger.warning("Not enough sessions for similarity search demo")
        return
    
    # Generate embeddings for all sessions
    embeddings = encoder.encode_sequences(sessions)
    
    # Use first session as query
    query_embedding = embeddings[0]
    candidate_embeddings = embeddings[1:]
    
    # Find similar sessions
    similar_sessions = encoder.find_similar_sequences(
        query_embedding, candidate_embeddings, top_k=3
    )
    
    logger.info("=== Similarity Search Results ===")
    logger.info(f"Query session length: {len(sessions[0])} keystrokes")
    logger.info("Most similar sessions:")
    
    for rank, (session_idx, similarity) in enumerate(similar_sessions, 1):
        actual_idx = session_idx + 1  # Adjust for removed query session
        logger.info(f"  {rank}. Session {actual_idx}: similarity = {similarity:.4f}")
        logger.info(f"     Length: {len(sessions[actual_idx])} keystrokes")

def main():
    """Main function to run the complete example"""
    logger.info("=== Keystroke Dynamics Encoder Example ===")
    
    try:
        # Step 1: Setup
        setup_directories()
        
        # Step 2: Generate sample data
        train_data_path, test_data_path = generate_sample_data()
        
        # Validate data format
        if not validate_csv_format(train_data_path):
            raise ValueError("Invalid training data format")
        
        # Step 3: Train model
        model_path = train_model(train_data_path)
        
        # Step 4: Generate embeddings
        embeddings = generate_embeddings(model_path, test_data_path)
        
        # Step 5: Evaluate model
        results, evaluator = evaluate_model(embeddings)
        
        # Step 6: Create visualizations
        visualize_results(embeddings, evaluator, results)
        
        # Step 7: Demonstrate similarity search
        demonstrate_similarity_search(model_path, test_data_path)
        
        logger.info("=== Example completed successfully! ===")
        logger.info("Check the following directories for results:")
        logger.info("  - ./models/: Trained model and metadata")
        logger.info("  - ./results/: Embeddings, evaluations, and visualizations")
        logger.info("  - ./logs/: Training logs (view with tensorboard)")
        
    except Exception as e:
        logger.error(f"Example failed with error: {e}")
        raise

if __name__ == '__main__':
    main()
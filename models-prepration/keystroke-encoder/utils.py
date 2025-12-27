import torch
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.cluster import KMeans
import pandas as pd
import os
import logging
from typing import List, Dict, Tuple, Optional, Union
import json
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelEvaluator:
    """Utility class for model evaluation and analysis"""
    
    def __init__(self, save_dir: str = './evaluation_results'):
        self.save_dir = save_dir
        os.makedirs(save_dir, exist_ok=True)
    
    def compute_embedding_statistics(self, embeddings: np.ndarray) -> Dict[str, float]:
        """Compute statistics for embeddings"""
        stats = {
            'mean_norm': float(np.mean(np.linalg.norm(embeddings, axis=1))),
            'std_norm': float(np.std(np.linalg.norm(embeddings, axis=1))),
            'mean_embedding': embeddings.mean(axis=0).tolist(),
            'std_embedding': embeddings.std(axis=0).tolist(),
            'min_values': embeddings.min(axis=0).tolist(),
            'max_values': embeddings.max(axis=0).tolist(),
            'embedding_dimension': int(embeddings.shape[1]),
            'num_samples': int(embeddings.shape[0])
        }
        
        return stats
    
    def visualize_embeddings_2d(self, embeddings: np.ndarray, labels: Optional[np.ndarray] = None,
                                method: str = 'tsne', save_path: str = None) -> plt.Figure:
        """Visualize embeddings in 2D using t-SNE or PCA"""
        logger.info(f"Visualizing embeddings using {method.upper()}")
        
        if method.lower() == 'tsne':
            reducer = TSNE(n_components=2, random_state=42, perplexity=min(30, len(embeddings)-1))
        elif method.lower() == 'pca':
            reducer = PCA(n_components=2, random_state=42)
        else:
            raise ValueError("Method must be 'tsne' or 'pca'")
        
        # Reduce dimensionality
        embeddings_2d = reducer.fit_transform(embeddings)
        
        # Create plot
        fig, ax = plt.subplots(figsize=(10, 8))
        
        if labels is not None:
            scatter = ax.scatter(embeddings_2d[:, 0], embeddings_2d[:, 1], 
                               c=labels, cmap='tab10', alpha=0.7)
            plt.colorbar(scatter)
        else:
            ax.scatter(embeddings_2d[:, 0], embeddings_2d[:, 1], alpha=0.7)
        
        ax.set_title(f'Keystroke Embeddings Visualization ({method.upper()})')
        ax.set_xlabel(f'{method.upper()} Component 1')
        ax.set_ylabel(f'{method.upper()} Component 2')
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            logger.info(f"Visualization saved to {save_path}")
        
        return fig
    
    def analyze_clustering(self, embeddings: np.ndarray, max_clusters: int = 10) -> Dict[str, Union[List, float]]:
        """Analyze clustering quality for different numbers of clusters"""
        logger.info("Analyzing clustering quality")
        
        cluster_range = range(2, min(max_clusters + 1, len(embeddings)))
        silhouette_scores = []
        inertias = []
        
        for n_clusters in cluster_range:
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(embeddings)
            
            # Compute silhouette score
            sil_score = silhouette_score(embeddings, cluster_labels)
            silhouette_scores.append(sil_score)
            
            # Compute inertia (within-cluster sum of squares)
            inertias.append(kmeans.inertia_)
        
        # Find optimal number of clusters
        best_k = cluster_range[np.argmax(silhouette_scores)]
        
        results = {
            'cluster_range': list(cluster_range),
            'silhouette_scores': silhouette_scores,
            'inertias': inertias,
            'best_k': int(best_k),
            'best_silhouette_score': float(max(silhouette_scores))
        }
        
        return results
    
    def plot_clustering_analysis(self, clustering_results: Dict, save_path: str = None) -> plt.Figure:
        """Plot clustering analysis results"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
        
        # Silhouette scores
        ax1.plot(clustering_results['cluster_range'], clustering_results['silhouette_scores'], 'bo-')
        ax1.set_xlabel('Number of Clusters')
        ax1.set_ylabel('Silhouette Score')
        ax1.set_title('Silhouette Analysis')
        ax1.grid(True, alpha=0.3)
        
        # Mark best k
        best_k = clustering_results['best_k']
        best_score = clustering_results['best_silhouette_score']
        ax1.axvline(x=best_k, color='red', linestyle='--', alpha=0.7)
        ax1.text(best_k, best_score, f'Best K={best_k}', 
                verticalalignment='bottom', horizontalalignment='center')
        
        # Elbow method (inertia)
        ax2.plot(clustering_results['cluster_range'], clustering_results['inertias'], 'ro-')
        ax2.set_xlabel('Number of Clusters')
        ax2.set_ylabel('Inertia')
        ax2.set_title('Elbow Method')
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            logger.info(f"Clustering analysis plot saved to {save_path}")
        
        return fig
    
    def compute_pairwise_similarities(self, embeddings: np.ndarray) -> np.ndarray:
        """Compute pairwise cosine similarities between embeddings"""
        # Normalize embeddings
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        normalized_embeddings = embeddings / (norms + 1e-8)
        
        # Compute similarity matrix
        similarity_matrix = np.dot(normalized_embeddings, normalized_embeddings.T)
        
        return similarity_matrix
    
    def plot_similarity_heatmap(self, similarity_matrix: np.ndarray, 
                               labels: Optional[List[str]] = None, 
                               save_path: str = None) -> plt.Figure:
        """Plot heatmap of similarity matrix"""
        fig, ax = plt.subplots(figsize=(10, 8))
        
        sns.heatmap(similarity_matrix, 
                   xticklabels=labels if labels else False,
                   yticklabels=labels if labels else False,
                   cmap='coolwarm', 
                   center=0,
                   square=True,
                   ax=ax)
        
        ax.set_title('Embedding Similarity Heatmap')
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            logger.info(f"Similarity heatmap saved to {save_path}")
        
        return fig
    
    def evaluate_model_performance(self, embeddings: np.ndarray, 
                                 labels: Optional[np.ndarray] = None) -> Dict:
        """Comprehensive model evaluation"""
        logger.info("Performing comprehensive model evaluation")
        
        results = {}
        
        # Basic statistics
        results['embedding_stats'] = self.compute_embedding_statistics(embeddings)
        
        # Clustering analysis
        results['clustering_analysis'] = self.analyze_clustering(embeddings)
        
        # Similarity analysis
        similarity_matrix = self.compute_pairwise_similarities(embeddings)
        results['similarity_stats'] = {
            'mean_similarity': float(np.mean(similarity_matrix)),
            'std_similarity': float(np.std(similarity_matrix)),
            'min_similarity': float(np.min(similarity_matrix)),
            'max_similarity': float(np.max(similarity_matrix))
        }
        
        # If labels are provided, compute additional metrics
        if labels is not None:
            unique_labels = np.unique(labels)
            results['label_stats'] = {
                'num_unique_labels': len(unique_labels),
                'label_distribution': {str(label): int(np.sum(labels == label)) 
                                     for label in unique_labels}
            }
        
        return results

class TrainingVisualizer:
    """Utility class for visualizing training progress"""
    
    def __init__(self, save_dir: str = './training_plots'):
        self.save_dir = save_dir
        os.makedirs(save_dir, exist_ok=True)
    
    def plot_training_history(self, history: Dict[str, List], save_path: str = None) -> plt.Figure:
        """Plot training and validation loss curves"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
        
        epochs = range(1, len(history['train_loss']) + 1)
        
        # Loss curves
        ax1.plot(epochs, history['train_loss'], 'b-', label='Training Loss')
        ax1.plot(epochs, history['val_loss'], 'r-', label='Validation Loss')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Loss')
        ax1.set_title('Training and Validation Loss')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Learning rate
        ax2.plot(epochs, history['learning_rate'], 'g-')
        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('Learning Rate')
        ax2.set_title('Learning Rate Schedule')
        ax2.set_yscale('log')
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            logger.info(f"Training history plot saved to {save_path}")
        
        return fig
    
    def plot_loss_distribution(self, train_losses: List[float], 
                              val_losses: List[float], 
                              save_path: str = None) -> plt.Figure:
        """Plot distribution of training and validation losses"""
        fig, ax = plt.subplots(figsize=(10, 6))
        
        ax.hist(train_losses, bins=30, alpha=0.7, label='Training Loss', density=True)
        ax.hist(val_losses, bins=30, alpha=0.7, label='Validation Loss', density=True)
        
        ax.set_xlabel('Loss Value')
        ax.set_ylabel('Density')
        ax.set_title('Loss Distribution')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            logger.info(f"Loss distribution plot saved to {save_path}")
        
        return fig

def save_evaluation_report(results: Dict, save_path: str):
    """Save evaluation results to JSON file"""
    # Add timestamp
    results['evaluation_timestamp'] = datetime.now().isoformat()
    
    with open(save_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"Evaluation report saved to {save_path}")

def load_training_history(history_path: str) -> Dict[str, List]:
    """Load training history from JSON file"""
    with open(history_path, 'r') as f:
        history = json.load(f)
    
    return history

def create_sample_data(num_sequences: int = 100, 
                      sequence_length_range: Tuple[int, int] = (50, 200),
                      save_path: str = None) -> pd.DataFrame:
    """Create sample keystroke data for testing"""
    logger.info(f"Creating sample data with {num_sequences} sequences")
    
    # Common characters for typing
    chars = list('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?')
    chars.extend(['backspace', 'enter'])
    
    data = []
    
    for seq_id in range(num_sequences):
        seq_length = np.random.randint(sequence_length_range[0], sequence_length_range[1])
        
        for pos in range(seq_length):
            # Random character
            char = np.random.choice(chars)
            
            # Realistic timing features
            dwell_time = np.random.normal(120, 30)  # ms
            flight_time = np.random.normal(80, 20)   # ms
            
            # Random position (simulating screen coordinates)
            x = np.random.randint(100, 800)
            y = np.random.randint(200, 600)
            
            # Action (0 = key down, 1 = key up)
            action = np.random.choice([0, 1])
            
            data.append({
                'sequence_id': seq_id,
                'character': char,
                'dwellTime': max(10, dwell_time),  # Ensure positive
                'flightTime': max(0, flight_time),
                'x': x,
                'y': y,
                'action': action
            })
    
    df = pd.DataFrame(data)
    
    if save_path:
        df.to_csv(save_path, index=False)
        logger.info(f"Sample data saved to {save_path}")
    
    return df

def validate_csv_format(csv_path: str) -> bool:
    """Validate that CSV file has the required format"""
    try:
        df = pd.read_csv(csv_path)
        required_columns = ['character', 'dwellTime', 'flightTime', 'x', 'y', 'action']
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            logger.error(f"Missing required columns: {missing_columns}")
            return False
        
        # Check data types
        numeric_columns = ['dwellTime', 'flightTime', 'x', 'y', 'action']
        for col in numeric_columns:
            if not pd.api.types.is_numeric_dtype(df[col]):
                logger.warning(f"Column {col} is not numeric, will attempt conversion")
        
        logger.info(f"CSV format validation passed. Found {len(df)} records.")
        return True
        
    except Exception as e:
        logger.error(f"Error validating CSV format: {e}")
        return False
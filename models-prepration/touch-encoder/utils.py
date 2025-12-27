import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, calinski_harabasz_score
from typing import Dict, List, Optional, Tuple
import os
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelEvaluator:
    """Evaluation utilities for touch encoder model"""
    
    def __init__(self, output_dir: str = './evaluation'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def evaluate_model_performance(self, embeddings: np.ndarray, 
                                    labels: np.ndarray = None) -> Dict:
        """
        Comprehensive model evaluation
        
        Args:
            embeddings: Generated embeddings (num_samples, embedding_dim)
            labels: Optional ground truth labels
        
        Returns:
            results: Dictionary containing evaluation metrics
        """
        results = {}
        
        # Basic statistics
        results['num_samples'] = embeddings.shape[0]
        results['embedding_dim'] = embeddings.shape[1]
        results['mean_norm'] = float(np.mean(np.linalg.norm(embeddings, axis=1)))
        results['std_norm'] = float(np.std(np.linalg.norm(embeddings, axis=1)))
        
        # Embedding diversity (average pairwise distance)
        if embeddings.shape[0] <= 1000:
            pairwise_distances = np.linalg.norm(
                embeddings[:, np.newaxis] - embeddings[np.newaxis, :], 
                axis=2
            )
            results['avg_pairwise_distance'] = float(np.mean(pairwise_distances))
        
        # Clustering metrics (if labels provided)
        if labels is not None:
            results['silhouette_score'] = float(silhouette_score(embeddings, labels))
            results['calinski_harabasz_score'] = float(calinski_harabasz_score(embeddings, labels))
        
        logger.info(f"Evaluation results: {results}")
        return results
    
    def visualize_embeddings_2d(self, embeddings: np.ndarray, 
                                  labels: np.ndarray = None,
                                  method: str = 'tsne',
                                  title: str = 'Touch Embeddings Visualization') -> plt.Figure:
        """
        Visualize embeddings in 2D
        
        Args:
            embeddings: Embedding matrix (num_samples, embedding_dim)
            labels: Optional labels for coloring
            method: 'tsne' or 'pca'
            title: Plot title
        
        Returns:
            fig: Matplotlib figure
        """
        # Reduce dimensionality
        if method == 'tsne':
            reducer = TSNE(n_components=2, random_state=42, perplexity=min(30, embeddings.shape[0]-1))
        else:
            reducer = PCA(n_components=2)
        
        embeddings_2d = reducer.fit_transform(embeddings)
        
        # Create plot
        fig, ax = plt.subplots(figsize=(10, 8))
        
        if labels is not None:
            scatter = ax.scatter(
                embeddings_2d[:, 0], 
                embeddings_2d[:, 1],
                c=labels, 
                cmap='viridis',
                alpha=0.7,
                s=50
            )
            plt.colorbar(scatter, ax=ax, label='Label')
        else:
            ax.scatter(
                embeddings_2d[:, 0], 
                embeddings_2d[:, 1],
                alpha=0.7,
                s=50
            )
        
        ax.set_xlabel('Component 1')
        ax.set_ylabel('Component 2')
        ax.set_title(f'{title} ({method.upper()})')
        
        # Save figure
        fig_path = os.path.join(self.output_dir, f'embeddings_{method}.png')
        fig.savefig(fig_path, dpi=150, bbox_inches='tight')
        logger.info(f"Saved visualization to {fig_path}")
        
        return fig
    
    def analyze_clustering(self, embeddings: np.ndarray, 
                            n_clusters_range: Tuple[int, int] = (2, 10)) -> Dict:
        """
        Analyze optimal number of clusters
        
        Args:
            embeddings: Embedding matrix
            n_clusters_range: Range of cluster numbers to try
        
        Returns:
            results: Clustering analysis results
        """
        results = {
            'n_clusters': [],
            'inertia': [],
            'silhouette': []
        }
        
        for n in range(n_clusters_range[0], min(n_clusters_range[1], embeddings.shape[0])):
            kmeans = KMeans(n_clusters=n, random_state=42, n_init=10)
            labels = kmeans.fit_predict(embeddings)
            
            results['n_clusters'].append(n)
            results['inertia'].append(float(kmeans.inertia_))
            results['silhouette'].append(float(silhouette_score(embeddings, labels)))
        
        # Find optimal number of clusters
        if results['silhouette']:
            optimal_idx = np.argmax(results['silhouette'])
            results['optimal_n_clusters'] = results['n_clusters'][optimal_idx]
            results['best_silhouette'] = results['silhouette'][optimal_idx]
        
        return results
    
    def plot_clustering_analysis(self, clustering_results: Dict) -> plt.Figure:
        """Plot clustering analysis results"""
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        
        # Elbow plot
        axes[0].plot(clustering_results['n_clusters'], 
                     clustering_results['inertia'], 
                     'bo-', linewidth=2)
        axes[0].set_xlabel('Number of Clusters')
        axes[0].set_ylabel('Inertia')
        axes[0].set_title('Elbow Method')
        axes[0].grid(True, alpha=0.3)
        
        # Silhouette plot
        axes[1].plot(clustering_results['n_clusters'], 
                     clustering_results['silhouette'], 
                     'ro-', linewidth=2)
        axes[1].set_xlabel('Number of Clusters')
        axes[1].set_ylabel('Silhouette Score')
        axes[1].set_title('Silhouette Analysis')
        axes[1].grid(True, alpha=0.3)
        
        if 'optimal_n_clusters' in clustering_results:
            axes[1].axvline(x=clustering_results['optimal_n_clusters'], 
                           color='green', linestyle='--', 
                           label=f"Optimal: {clustering_results['optimal_n_clusters']}")
            axes[1].legend()
        
        plt.tight_layout()
        
        # Save figure
        fig_path = os.path.join(self.output_dir, 'clustering_analysis.png')
        fig.savefig(fig_path, dpi=150, bbox_inches='tight')
        logger.info(f"Saved clustering analysis to {fig_path}")
        
        return fig
    
    def plot_embedding_distribution(self, embeddings: np.ndarray) -> plt.Figure:
        """Plot distribution of embedding values"""
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        
        # Histogram of all values
        axes[0].hist(embeddings.flatten(), bins=50, density=True, alpha=0.7)
        axes[0].set_xlabel('Embedding Value')
        axes[0].set_ylabel('Density')
        axes[0].set_title('Distribution of Embedding Values')
        axes[0].grid(True, alpha=0.3)
        
        # Histogram of embedding norms
        norms = np.linalg.norm(embeddings, axis=1)
        axes[1].hist(norms, bins=30, density=True, alpha=0.7, color='orange')
        axes[1].set_xlabel('Embedding Norm')
        axes[1].set_ylabel('Density')
        axes[1].set_title('Distribution of Embedding Norms')
        axes[1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        # Save figure
        fig_path = os.path.join(self.output_dir, 'embedding_distribution.png')
        fig.savefig(fig_path, dpi=150, bbox_inches='tight')
        
        return fig
    
    def compute_similarity_matrix(self, embeddings: np.ndarray) -> np.ndarray:
        """
        Compute cosine similarity matrix between embeddings
        
        Args:
            embeddings: Embedding matrix (num_samples, embedding_dim)
        
        Returns:
            similarity_matrix: Cosine similarity matrix
        """
        # Normalize embeddings
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        normalized = embeddings / (norms + 1e-8)
        
        # Compute similarity matrix
        similarity_matrix = np.dot(normalized, normalized.T)
        
        return similarity_matrix
    
    def plot_similarity_heatmap(self, embeddings: np.ndarray, 
                                 labels: np.ndarray = None) -> plt.Figure:
        """Plot similarity matrix as heatmap"""
        similarity_matrix = self.compute_similarity_matrix(embeddings)
        
        fig, ax = plt.subplots(figsize=(10, 8))
        
        sns.heatmap(
            similarity_matrix, 
            ax=ax, 
            cmap='viridis',
            vmin=-1, vmax=1,
            xticklabels=False,
            yticklabels=False
        )
        
        ax.set_title('Cosine Similarity Matrix')
        
        # Save figure
        fig_path = os.path.join(self.output_dir, 'similarity_heatmap.png')
        fig.savefig(fig_path, dpi=150, bbox_inches='tight')
        
        return fig
    
    def save_evaluation_report(self, results: Dict, filename: str = 'evaluation_report.json'):
        """Save evaluation results to JSON"""
        report_path = os.path.join(self.output_dir, filename)
        with open(report_path, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Saved evaluation report to {report_path}")


def compute_cosine_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
    """
    Compute cosine similarity between two embeddings
    
    Args:
        embedding1: First embedding vector
        embedding2: Second embedding vector
    
    Returns:
        similarity: Cosine similarity value [-1, 1]
    """
    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return float(np.dot(embedding1, embedding2) / (norm1 * norm2))


def verify_user(current_embedding: np.ndarray, 
                stored_embedding: np.ndarray,
                threshold: float = 0.85) -> Tuple[bool, float]:
    """
    Verify if current behavior matches stored user profile
    
    Args:
        current_embedding: Embedding from current session
        stored_embedding: Stored user embedding profile
        threshold: Similarity threshold for verification
    
    Returns:
        is_verified: Whether user is verified
        similarity: Similarity score
    """
    similarity = compute_cosine_similarity(current_embedding, stored_embedding)
    is_verified = similarity >= threshold
    
    return is_verified, similarity

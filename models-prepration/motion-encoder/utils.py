import torch
import numpy as np
import os
from typing import Dict, List, Tuple, Optional, Any
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.manifold import TSNE
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

class EarlyStopping:
    """Early stopping callback to prevent overfitting."""
    
    def __init__(self, patience: int = 10, min_delta: float = 1e-4, restore_best_weights: bool = True):
        """Initialize early stopping.
        
        Args:
            patience: Number of epochs to wait before stopping
            min_delta: Minimum change to qualify as improvement
            restore_best_weights: Whether to restore best weights
        """
        self.patience = patience
        self.min_delta = min_delta
        self.restore_best_weights = restore_best_weights
        
        self.best_loss = float('inf')
        self.counter = 0
        self.best_weights = None
    
    def step(self, val_loss: float) -> bool:
        """Check if training should stop.
        
        Args:
            val_loss: Current validation loss
            
        Returns:
            True if training should stop
        """
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.counter = 0
            return False
        else:
            self.counter += 1
            return self.counter >= self.patience

class ModelCheckpoint:
    """Model checkpointing callback."""
    
    def __init__(
        self, 
        filepath: str, 
        monitor: str = 'val_loss', 
        save_best_only: bool = True,
        mode: str = 'min'
    ):
        """Initialize model checkpoint.
        
        Args:
            filepath: Directory to save checkpoints
            monitor: Metric to monitor
            save_best_only: Whether to save only the best model
            mode: 'min' or 'max' for the monitored metric
        """
        self.filepath = filepath
        self.monitor = monitor
        self.save_best_only = save_best_only
        self.mode = mode
        
        self.best_score = float('inf') if mode == 'min' else float('-inf')
        self.best_model_path = None
        
        # Create directory if it doesn't exist
        os.makedirs(filepath, exist_ok=True)
    
    def step(
        self, 
        current_score: float, 
        model: torch.nn.Module, 
        optimizer: torch.optim.Optimizer, 
        epoch: int
    ):
        """Save model checkpoint if conditions are met.
        
        Args:
            current_score: Current score for the monitored metric
            model: Model to save
            optimizer: Optimizer to save
            epoch: Current epoch
        """
        is_best = False
        
        if self.mode == 'min':
            is_best = current_score < self.best_score
        else:
            is_best = current_score > self.best_score
        
        if is_best:
            self.best_score = current_score
            
            if self.save_best_only:
                # Save best model
                model_path = os.path.join(self.filepath, 'best_model.pt')
                self._save_checkpoint(model, optimizer, epoch, current_score, model_path)
                self.best_model_path = model_path
        
        if not self.save_best_only:
            # Save current epoch model
            model_path = os.path.join(self.filepath, f'model_epoch_{epoch + 1}.pt')
            self._save_checkpoint(model, optimizer, epoch, current_score, model_path)
    
    def _save_checkpoint(
        self, 
        model: torch.nn.Module, 
        optimizer: torch.optim.Optimizer, 
        epoch: int, 
        score: float, 
        filepath: str
    ):
        """Save model checkpoint to file.
        
        Args:
            model: Model to save
            optimizer: Optimizer to save
            epoch: Current epoch
            score: Current score
            filepath: Path to save checkpoint
        """
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'score': score,
            'timestamp': datetime.now().isoformat()
        }
        
        torch.save(checkpoint, filepath)
    
    def get_best_model_path(self) -> Optional[str]:
        """Get path to the best saved model.
        
        Returns:
            Path to best model or None
        """
        return self.best_model_path

def compute_metrics(embeddings: np.ndarray, labels: np.ndarray) -> Dict[str, float]:
    """Compute evaluation metrics for embeddings.
    
    Args:
        embeddings: Embedding vectors
        labels: True labels
        
    Returns:
        Dictionary of computed metrics
    """
    metrics = {}
    
    # Compute pairwise similarities
    similarities = cosine_similarity(embeddings)
    
    # Create ground truth similarity matrix
    labels_expanded = labels.reshape(-1, 1)
    ground_truth = (labels_expanded == labels_expanded.T).astype(int)
    
    # Remove diagonal (self-similarities)
    mask = ~np.eye(similarities.shape[0], dtype=bool)
    similarities_flat = similarities[mask]
    ground_truth_flat = ground_truth[mask]
    
    # Compute metrics at different thresholds
    thresholds = [0.5, 0.6, 0.7, 0.8, 0.9]
    
    for threshold in thresholds:
        predictions = (similarities_flat >= threshold).astype(int)
        
        if len(np.unique(predictions)) > 1:  # Avoid division by zero
            metrics[f'accuracy_@{threshold}'] = accuracy_score(ground_truth_flat, predictions)
            metrics[f'precision_@{threshold}'] = precision_score(ground_truth_flat, predictions, zero_division=0)
            metrics[f'recall_@{threshold}'] = recall_score(ground_truth_flat, predictions, zero_division=0)
            metrics[f'f1_@{threshold}'] = f1_score(ground_truth_flat, predictions, zero_division=0)
    
    # Compute embedding quality metrics
    metrics['intra_class_similarity'] = compute_intra_class_similarity(embeddings, labels)
    metrics['inter_class_similarity'] = compute_inter_class_similarity(embeddings, labels)
    metrics['silhouette_score'] = compute_silhouette_score(embeddings, labels)
    
    return metrics

def compute_intra_class_similarity(embeddings: np.ndarray, labels: np.ndarray) -> float:
    """Compute average intra-class similarity.
    
    Args:
        embeddings: Embedding vectors
        labels: Class labels
        
    Returns:
        Average intra-class similarity
    """
    similarities = []
    
    for label in np.unique(labels):
        class_embeddings = embeddings[labels == label]
        if len(class_embeddings) > 1:
            class_similarities = cosine_similarity(class_embeddings)
            # Get upper triangle (excluding diagonal)
            mask = np.triu(np.ones_like(class_similarities, dtype=bool), k=1)
            similarities.extend(class_similarities[mask])
    
    return float(np.mean(similarities)) if similarities else 0.0

def compute_inter_class_similarity(embeddings: np.ndarray, labels: np.ndarray) -> float:
    """Compute average inter-class similarity.
    
    Args:
        embeddings: Embedding vectors
        labels: Class labels
        
    Returns:
        Average inter-class similarity
    """
    similarities = []
    unique_labels = np.unique(labels)
    
    for i, label1 in enumerate(unique_labels):
        for label2 in unique_labels[i+1:]:
            embeddings1 = embeddings[labels == label1]
            embeddings2 = embeddings[labels == label2]
            
            cross_similarities = cosine_similarity(embeddings1, embeddings2)
            similarities.extend(cross_similarities.flatten())
    
    return float(np.mean(similarities)) if similarities else 0.0

def compute_silhouette_score(embeddings: np.ndarray, labels: np.ndarray) -> float:
    """Compute silhouette score for embeddings.
    
    Args:
        embeddings: Embedding vectors
        labels: Class labels
        
    Returns:
        Silhouette score
    """
    try:
        from sklearn.metrics import silhouette_score
        return float(silhouette_score(embeddings, labels, metric='cosine'))
    except Exception:
        return 0.0

def visualize_embeddings(
    embeddings: np.ndarray, 
    labels: np.ndarray, 
    user_ids: List[str] = None,
    method: str = 'tsne',
    save_path: str = None
) -> plt.Figure:
    """Visualize embeddings using dimensionality reduction.
    
    Args:
        embeddings: Embedding vectors
        labels: Class labels
        user_ids: Optional user identifiers
        method: Dimensionality reduction method ('tsne', 'pca')
        save_path: Optional path to save the plot
        
    Returns:
        Matplotlib figure
    """
    # Reduce dimensionality
    if method.lower() == 'tsne':
        reducer = TSNE(n_components=2, random_state=42, perplexity=min(30, len(embeddings)-1))
    elif method.lower() == 'pca':
        from sklearn.decomposition import PCA
        reducer = PCA(n_components=2, random_state=42)
    else:
        raise ValueError(f"Unknown method: {method}")
    
    embeddings_2d = reducer.fit_transform(embeddings)
    
    # Create plot
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Plot points colored by user
    unique_labels = np.unique(labels)
    colors = plt.cm.tab10(np.linspace(0, 1, len(unique_labels)))
    
    for i, label in enumerate(unique_labels):
        mask = labels == label
        ax.scatter(
            embeddings_2d[mask, 0], 
            embeddings_2d[mask, 1],
            c=[colors[i]], 
            label=f'User {label}',
            alpha=0.7,
            s=50
        )
    
    ax.set_xlabel(f'{method.upper()} Component 1')
    ax.set_ylabel(f'{method.upper()} Component 2')
    ax.set_title(f'Motion Sensor Embeddings Visualization ({method.upper()})')
    ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"Visualization saved to {save_path}")
    
    return fig

def plot_training_history(history: Dict[str, List[float]], save_path: str = None) -> plt.Figure:
    """Plot training history.
    
    Args:
        history: Training history dictionary
        save_path: Optional path to save the plot
        
    Returns:
        Matplotlib figure
    """
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    
    # Plot training and validation loss
    axes[0, 0].plot(history['train_loss'], label='Training Loss', color='blue')
    axes[0, 0].plot(history['val_loss'], label='Validation Loss', color='red')
    axes[0, 0].set_xlabel('Epoch')
    axes[0, 0].set_ylabel('Loss')
    axes[0, 0].set_title('Training and Validation Loss')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)
    
    # Plot learning rate
    if 'learning_rate' in history:
        axes[0, 1].plot(history['learning_rate'], color='green')
        axes[0, 1].set_xlabel('Epoch')
        axes[0, 1].set_ylabel('Learning Rate')
        axes[0, 1].set_title('Learning Rate Schedule')
        axes[0, 1].set_yscale('log')
        axes[0, 1].grid(True, alpha=0.3)
    
    # Plot loss difference
    if len(history['train_loss']) == len(history['val_loss']):
        loss_diff = np.array(history['val_loss']) - np.array(history['train_loss'])
        axes[1, 0].plot(loss_diff, color='purple')
        axes[1, 0].set_xlabel('Epoch')
        axes[1, 0].set_ylabel('Validation - Training Loss')
        axes[1, 0].set_title('Overfitting Monitor')
        axes[1, 0].axhline(y=0, color='black', linestyle='--', alpha=0.5)
        axes[1, 0].grid(True, alpha=0.3)
    
    # Plot smoothed losses
    if len(history['train_loss']) > 10:
        window_size = max(1, len(history['train_loss']) // 10)
        train_smooth = np.convolve(history['train_loss'], np.ones(window_size)/window_size, mode='valid')
        val_smooth = np.convolve(history['val_loss'], np.ones(window_size)/window_size, mode='valid')
        
        axes[1, 1].plot(train_smooth, label='Smoothed Training', color='lightblue')
        axes[1, 1].plot(val_smooth, label='Smoothed Validation', color='lightcoral')
        axes[1, 1].set_xlabel('Epoch')
        axes[1, 1].set_ylabel('Smoothed Loss')
        axes[1, 1].set_title('Smoothed Loss Curves')
        axes[1, 1].legend()
        axes[1, 1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"Training history plot saved to {save_path}")
    
    return fig

def evaluate_user_authentication(
    embeddings: np.ndarray,
    labels: np.ndarray,
    user_profiles: Dict[int, np.ndarray],
    threshold: float = 0.7
) -> Dict[str, Any]:
    """Evaluate user authentication performance.
    
    Args:
        embeddings: Test embeddings
        labels: True user labels
        user_profiles: Dictionary mapping user labels to profile embeddings
        threshold: Authentication threshold
        
    Returns:
        Dictionary containing evaluation results
    """
    predictions = []
    similarities = []
    
    for i, (embedding, true_label) in enumerate(zip(embeddings, labels)):
        if true_label in user_profiles:
            profile = user_profiles[true_label]
            similarity = cosine_similarity([embedding], [profile])[0, 0]
            similarities.append(similarity)
            predictions.append(similarity >= threshold)
        else:
            # Unknown user
            similarities.append(0.0)
            predictions.append(False)
    
    # Compute metrics
    ground_truth = [True] * len(predictions)  # All samples should be authentic
    
    results = {
        'accuracy': accuracy_score(ground_truth, predictions),
        'precision': precision_score(ground_truth, predictions, zero_division=0),
        'recall': recall_score(ground_truth, predictions, zero_division=0),
        'f1_score': f1_score(ground_truth, predictions, zero_division=0),
        'mean_similarity': np.mean(similarities),
        'std_similarity': np.std(similarities),
        'threshold': threshold,
        'predictions': predictions,
        'similarities': similarities
    }
    
    return results

def create_similarity_matrix(
    embeddings: np.ndarray, 
    labels: np.ndarray,
    save_path: str = None
) -> plt.Figure:
    """Create and visualize similarity matrix.
    
    Args:
        embeddings: Embedding vectors
        labels: Class labels
        save_path: Optional path to save the plot
        
    Returns:
        Matplotlib figure
    """
    # Compute similarity matrix
    similarities = cosine_similarity(embeddings)
    
    # Create figure
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Plot heatmap
    im = ax.imshow(similarities, cmap='viridis', aspect='auto')
    
    # Add colorbar
    cbar = plt.colorbar(im, ax=ax)
    cbar.set_label('Cosine Similarity')
    
    # Set labels
    ax.set_xlabel('Sample Index')
    ax.set_ylabel('Sample Index')
    ax.set_title('Embedding Similarity Matrix')
    
    # Add user boundaries if multiple users
    unique_labels = np.unique(labels)
    if len(unique_labels) > 1:
        boundaries = []
        current_pos = 0
        for label in unique_labels:
            count = np.sum(labels == label)
            boundaries.append(current_pos + count)
            current_pos += count
        
        for boundary in boundaries[:-1]:
            ax.axhline(y=boundary-0.5, color='red', linewidth=2, alpha=0.7)
            ax.axvline(x=boundary-0.5, color='red', linewidth=2, alpha=0.7)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"Similarity matrix saved to {save_path}")
    
    return fig

def save_evaluation_report(
    metrics: Dict[str, float],
    model_info: Dict[str, Any],
    save_path: str
):
    """Save evaluation report to file.
    
    Args:
        metrics: Evaluation metrics
        model_info: Model information
        save_path: Path to save report
    """
    report = {
        'timestamp': datetime.now().isoformat(),
        'model_info': model_info,
        'metrics': metrics
    }
    
    import json
    with open(save_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"Evaluation report saved to {save_path}")

"""
Caching utilities for the ML Encoder Service.

Provides LRU caching with optional Redis backend for high-performance
embedding caching and request deduplication.
"""

import hashlib
import json
import time
import threading
from typing import Any, Optional, Dict, List
from collections import OrderedDict
from functools import wraps
import logging

logger = logging.getLogger(__name__)


class LRUCache:
    """
    Thread-safe LRU (Least Recently Used) cache with TTL support.
    
    Features:
    - Size-limited cache with automatic eviction
    - Time-to-live (TTL) for cache entries
    - Thread-safe operations
    - Statistics tracking
    """
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 3600):
        """
        Initialize LRU cache.
        
        Args:
            max_size: Maximum number of entries in cache
            default_ttl: Default time-to-live in seconds (default: 1 hour)
        """
        self._cache: OrderedDict = OrderedDict()
        self._timestamps: Dict[str, float] = {}
        self._ttls: Dict[str, int] = {}
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._lock = threading.Lock()
        
        # Statistics
        self._hits = 0
        self._misses = 0
        
        logger.info(f"LRUCache initialized: max_size={max_size}, default_ttl={default_ttl}s")
    
    def _generate_key(self, data: Any) -> str:
        """Generate a unique cache key from input data"""
        if isinstance(data, (dict, list)):
            serialized = json.dumps(data, sort_keys=True)
        else:
            serialized = str(data)
        
        return hashlib.sha256(serialized.encode()).hexdigest()[:32]
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None
            
            # Check TTL
            if self._is_expired(key):
                self._remove(key)
                self._misses += 1
                return None
            
            # Move to end (most recently used)
            self._cache.move_to_end(key)
            self._hits += 1
            
            return self._cache[key]
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if not specified)
        """
        with self._lock:
            # Remove if already exists
            if key in self._cache:
                self._remove(key)
            
            # Evict if at capacity
            while len(self._cache) >= self._max_size:
                oldest_key = next(iter(self._cache))
                self._remove(oldest_key)
            
            # Add new entry
            self._cache[key] = value
            self._timestamps[key] = time.time()
            self._ttls[key] = ttl if ttl is not None else self._default_ttl
    
    def _is_expired(self, key: str) -> bool:
        """Check if cache entry has expired"""
        if key not in self._timestamps:
            return True
        
        age = time.time() - self._timestamps[key]
        ttl = self._ttls.get(key, self._default_ttl)
        
        return age > ttl
    
    def _remove(self, key: str):
        """Remove entry from cache"""
        self._cache.pop(key, None)
        self._timestamps.pop(key, None)
        self._ttls.pop(key, None)
    
    def clear(self):
        """Clear all cache entries"""
        with self._lock:
            self._cache.clear()
            self._timestamps.clear()
            self._ttls.clear()
            logger.info("Cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            total = self._hits + self._misses
            hit_rate = (self._hits / total * 100) if total > 0 else 0
            
            return {
                'size': len(self._cache),
                'max_size': self._max_size,
                'hits': self._hits,
                'misses': self._misses,
                'hit_rate_percent': round(hit_rate, 2)
            }
    
    def cleanup_expired(self):
        """Remove all expired entries"""
        with self._lock:
            expired_keys = [
                key for key in self._cache
                if self._is_expired(key)
            ]
            
            for key in expired_keys:
                self._remove(key)
            
            if expired_keys:
                logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")


class CacheManager:
    """
    Cache manager for ML encoder service.
    
    Provides separate caches for different encoder types and
    handles cache key generation from input data.
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize cache manager.
        
        Args:
            config: Cache configuration dict
        """
        config = config or {}
        
        # Cache settings
        max_size = config.get('max_size', 1000)
        ttl = config.get('ttl', 3600)  # 1 hour default
        
        # Separate caches for each encoder
        self._caches = {
            'motion': LRUCache(max_size=max_size, default_ttl=ttl),
            'gesture': LRUCache(max_size=max_size, default_ttl=ttl),
            'typing': LRUCache(max_size=max_size, default_ttl=ttl)
        }
        
        self._enabled = config.get('enabled', True)
        
        logger.info(f"CacheManager initialized: enabled={self._enabled}")
    
    def _generate_cache_key(self, encoder_type: str, data: Any) -> str:
        """Generate cache key for encoder request"""
        if isinstance(data, (dict, list)):
            serialized = json.dumps(data, sort_keys=True)
        else:
            serialized = str(data)
        
        combined = f"{encoder_type}:{serialized}"
        return hashlib.sha256(combined.encode()).hexdigest()[:32]
    
    def get_embedding(self, encoder_type: str, data: Any) -> Optional[List[float]]:
        """
        Get cached embedding.
        
        Args:
            encoder_type: Type of encoder ('motion', 'gesture', 'typing')
            data: Input data
            
        Returns:
            Cached embedding or None
        """
        if not self._enabled:
            return None
        
        if encoder_type not in self._caches:
            return None
        
        key = self._generate_cache_key(encoder_type, data)
        return self._caches[encoder_type].get(key)
    
    def set_embedding(self, encoder_type: str, data: Any, embedding: List[float], ttl: Optional[int] = None):
        """
        Cache an embedding.
        
        Args:
            encoder_type: Type of encoder
            data: Input data
            embedding: Computed embedding
            ttl: Optional TTL override
        """
        if not self._enabled:
            return
        
        if encoder_type not in self._caches:
            return
        
        key = self._generate_cache_key(encoder_type, data)
        self._caches[encoder_type].set(key, embedding, ttl)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics for all caches"""
        return {
            'enabled': self._enabled,
            'caches': {
                name: cache.get_stats()
                for name, cache in self._caches.items()
            }
        }
    
    def clear(self, encoder_type: Optional[str] = None):
        """
        Clear cache(s).
        
        Args:
            encoder_type: Specific cache to clear, or None for all
        """
        if encoder_type:
            if encoder_type in self._caches:
                self._caches[encoder_type].clear()
        else:
            for cache in self._caches.values():
                cache.clear()
    
    def cleanup_expired(self):
        """Cleanup expired entries in all caches"""
        for cache in self._caches.values():
            cache.cleanup_expired()


# Global cache manager instance
cache_manager: Optional[CacheManager] = None


def init_cache(config: Optional[Dict] = None):
    """Initialize global cache manager"""
    global cache_manager
    cache_manager = CacheManager(config)
    return cache_manager


def get_cache() -> CacheManager:
    """Get global cache manager"""
    global cache_manager
    if cache_manager is None:
        cache_manager = CacheManager()
    return cache_manager


def cached_encode(encoder_type: str):
    """
    Decorator to add caching to encode functions.
    
    Usage:
        @cached_encode('motion')
        def encode_motion(data):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(data, *args, **kwargs):
            cache = get_cache()
            
            # Try to get from cache
            cached_result = cache.get_embedding(encoder_type, data)
            if cached_result is not None:
                from metrics import metrics
                metrics.record_cache_hit()
                logger.debug(f"Cache hit for {encoder_type}")
                return cached_result
            
            # Compute result
            from metrics import metrics
            metrics.record_cache_miss()
            result = func(data, *args, **kwargs)
            
            # Cache the result
            if result is not None:
                cache.set_embedding(encoder_type, data, result)
            
            return result
        
        return wrapper
    return decorator

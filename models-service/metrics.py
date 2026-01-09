"""
Metrics collection and monitoring utilities for the ML Encoder Service.

Provides request tracking, performance monitoring, and Prometheus-style metrics.
"""

import time
import threading
from datetime import datetime
from typing import Dict, Any, Optional
from collections import defaultdict
from functools import wraps
import logging

logger = logging.getLogger(__name__)


class MetricsCollector:
    """
    Collects and exposes performance metrics for the ML service.
    
    Metrics collected:
    - Request counts (total, per endpoint, per status)
    - Request latencies (avg, p50, p95, p99)
    - Model inference times
    - Active connections
    - Cache hit/miss rates
    """
    
    def __init__(self):
        self._lock = threading.Lock()
        self._start_time = time.time()
        
        # Request counters
        self._request_count = defaultdict(int)
        self._status_count = defaultdict(int)
        self._error_count = defaultdict(int)
        
        # Latency tracking (store last N requests)
        self._max_latency_samples = 1000
        self._latencies: Dict[str, list] = defaultdict(list)
        
        # Model inference times
        self._inference_times: Dict[str, list] = defaultdict(list)
        
        # Active requests
        self._active_requests = 0
        self._peak_active_requests = 0
        
        # Cache metrics
        self._cache_hits = 0
        self._cache_misses = 0
        
        # Throughput tracking
        self._requests_in_window = 0
        self._window_start = time.time()
        self._window_size = 60  # 1 minute window
        
        logger.info("MetricsCollector initialized")
    
    def record_request_start(self):
        """Record the start of a request"""
        with self._lock:
            self._active_requests += 1
            self._peak_active_requests = max(
                self._peak_active_requests, 
                self._active_requests
            )
    
    def record_request_end(self, endpoint: str, status_code: int, latency_ms: float):
        """Record the completion of a request"""
        with self._lock:
            self._active_requests = max(0, self._active_requests - 1)
            
            # Update counters
            self._request_count[endpoint] += 1
            self._request_count['total'] += 1
            self._status_count[str(status_code)] += 1
            
            # Track errors
            if status_code >= 400:
                self._error_count[endpoint] += 1
                self._error_count['total'] += 1
            
            # Update latencies
            self._latencies[endpoint].append(latency_ms)
            self._latencies['all'].append(latency_ms)
            
            # Trim if too many samples
            if len(self._latencies[endpoint]) > self._max_latency_samples:
                self._latencies[endpoint] = self._latencies[endpoint][-self._max_latency_samples:]
            if len(self._latencies['all']) > self._max_latency_samples:
                self._latencies['all'] = self._latencies['all'][-self._max_latency_samples:]
            
            # Update throughput
            self._requests_in_window += 1
    
    def record_inference_time(self, model_type: str, time_ms: float):
        """Record model inference time"""
        with self._lock:
            self._inference_times[model_type].append(time_ms)
            if len(self._inference_times[model_type]) > self._max_latency_samples:
                self._inference_times[model_type] = self._inference_times[model_type][-self._max_latency_samples:]
    
    def record_cache_hit(self):
        """Record a cache hit"""
        with self._lock:
            self._cache_hits += 1
    
    def record_cache_miss(self):
        """Record a cache miss"""
        with self._lock:
            self._cache_misses += 1
    
    def _calculate_percentiles(self, data: list) -> Dict[str, float]:
        """Calculate percentiles from latency data"""
        if not data:
            return {'avg': 0, 'p50': 0, 'p95': 0, 'p99': 0, 'min': 0, 'max': 0}
        
        sorted_data = sorted(data)
        n = len(sorted_data)
        
        return {
            'avg': sum(data) / n,
            'min': sorted_data[0],
            'max': sorted_data[-1],
            'p50': sorted_data[int(n * 0.5)],
            'p95': sorted_data[int(n * 0.95)] if n >= 20 else sorted_data[-1],
            'p99': sorted_data[int(n * 0.99)] if n >= 100 else sorted_data[-1]
        }
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics"""
        with self._lock:
            uptime = time.time() - self._start_time
            
            # Reset window if needed
            window_elapsed = time.time() - self._window_start
            if window_elapsed >= self._window_size:
                requests_per_second = self._requests_in_window / window_elapsed
                self._requests_in_window = 0
                self._window_start = time.time()
            else:
                requests_per_second = self._requests_in_window / max(1, window_elapsed)
            
            # Calculate cache hit rate
            total_cache_ops = self._cache_hits + self._cache_misses
            cache_hit_rate = (self._cache_hits / total_cache_ops * 100) if total_cache_ops > 0 else 0
            
            return {
                'service': {
                    'uptime_seconds': round(uptime, 2),
                    'uptime_formatted': self._format_uptime(uptime),
                    'start_time': datetime.fromtimestamp(self._start_time).isoformat()
                },
                'requests': {
                    'total': self._request_count['total'],
                    'by_endpoint': dict(self._request_count),
                    'by_status': dict(self._status_count),
                    'errors': dict(self._error_count),
                    'active': self._active_requests,
                    'peak_active': self._peak_active_requests,
                    'requests_per_second': round(requests_per_second, 2)
                },
                'latency': {
                    'overall_ms': self._calculate_percentiles(self._latencies['all']),
                    'by_endpoint': {
                        endpoint: self._calculate_percentiles(latencies)
                        for endpoint, latencies in self._latencies.items()
                        if endpoint != 'all'
                    }
                },
                'model_inference_ms': {
                    model: self._calculate_percentiles(times)
                    for model, times in self._inference_times.items()
                },
                'cache': {
                    'hits': self._cache_hits,
                    'misses': self._cache_misses,
                    'hit_rate_percent': round(cache_hit_rate, 2)
                }
            }
    
    def _format_uptime(self, seconds: float) -> str:
        """Format uptime in human-readable format"""
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        
        parts = []
        if days > 0:
            parts.append(f"{days}d")
        if hours > 0:
            parts.append(f"{hours}h")
        if minutes > 0:
            parts.append(f"{minutes}m")
        parts.append(f"{secs}s")
        
        return ' '.join(parts)
    
    def reset(self):
        """Reset all metrics"""
        with self._lock:
            self._request_count.clear()
            self._status_count.clear()
            self._error_count.clear()
            self._latencies.clear()
            self._inference_times.clear()
            self._active_requests = 0
            self._peak_active_requests = 0
            self._cache_hits = 0
            self._cache_misses = 0
            self._requests_in_window = 0
            self._window_start = time.time()
            logger.info("Metrics reset")


# Global metrics collector instance
metrics = MetricsCollector()


def track_request(endpoint_name: str = None):
    """
    Decorator to track request metrics.
    
    Usage:
        @track_request('encode_motion')
        def encode_motion():
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            name = endpoint_name or func.__name__
            start_time = time.time()
            metrics.record_request_start()
            
            try:
                result = func(*args, **kwargs)
                latency_ms = (time.time() - start_time) * 1000
                
                # Try to get status code from response
                status_code = 200
                if hasattr(result, '__iter__') and len(result) >= 2:
                    status_code = result[1] if isinstance(result[1], int) else 200
                
                metrics.record_request_end(name, status_code, latency_ms)
                return result
                
            except Exception as e:
                latency_ms = (time.time() - start_time) * 1000
                metrics.record_request_end(name, 500, latency_ms)
                raise
        
        return wrapper
    return decorator


def track_inference(model_type: str):
    """
    Decorator to track model inference time.
    
    Usage:
        @track_inference('motion_encoder')
        def encode_motion(data):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            inference_time_ms = (time.time() - start_time) * 1000
            metrics.record_inference_time(model_type, inference_time_ms)
            return result
        return wrapper
    return decorator

from collections import defaultdict
import os
import threading
import time
from typing import Dict, Optional, Tuple

class DistributedOrMemoryRateLimiter:
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL")
        self._redis_client = None
        self._lock = threading.Lock()
        self._local_history: Dict[str, list] = defaultdict(list)
        self._active_concurrency: Dict[str, int] = defaultdict(int)

        if self.redis_url:
            try:
                import redis
                self._redis_client = redis.from_url(self.redis_url, socket_connect_timeout=1.5, socket_timeout=1.5)
                self._redis_client.ping()
            except Exception:
                self._redis_client = None

    def is_allowed(self, key: str, max_requests: int, window_sec: int) -> Tuple[bool, int]:
        now = time.time()
        if self._redis_client:
            try:
                pipe = self._redis_client.pipeline()
                bucket_key = f"rl:{key}"
                pipe.zremrangebyscore(bucket_key, 0, now - window_sec)
                pipe.zadd(bucket_key, {str(now): now})
                pipe.zcard(bucket_key)
                pipe.expire(bucket_key, window_sec + 5)
                results = pipe.execute()
                current_count = results[2]
                if current_count > max_requests:
                    retry_after = int(window_sec)
                    return False, retry_after
                return True, 0
            except Exception:
                pass

        with self._lock:
            cutoff = now - window_sec
            self._local_history[key] = [ts for ts in self._local_history[key] if ts > cutoff]
            if len(self._local_history[key]) >= max_requests:
                oldest = self._local_history[key][0]
                retry_after = max(1, int(oldest + window_sec - now))
                return False, retry_after
            self._local_history[key].append(now)
            return True, 0

    def acquire_concurrency(self, key: str, max_concurrency: int) -> bool:
        with self._lock:
            if self._active_concurrency[key] >= max_concurrency:
                return False
            self._active_concurrency[key] += 1
            return True

    def release_concurrency(self, key: str):
        with self._lock:
            if self._active_concurrency[key] > 0:
                self._active_concurrency[key] -= 1

_global_limiter: Optional[DistributedOrMemoryRateLimiter] = None

def get_rate_limiter() -> DistributedOrMemoryRateLimiter:
    global _global_limiter
    if _global_limiter is None:
        _global_limiter = DistributedOrMemoryRateLimiter()
    return _global_limiter

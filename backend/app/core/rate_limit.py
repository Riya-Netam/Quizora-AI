from slowapi import Limiter
from slowapi.util import get_remote_address

# Behind Render/Vercel proxies the client IP arrives via X-Forwarded-For; uvicorn is started
# with --proxy-headers so get_remote_address sees the real client.
limiter = Limiter(key_func=get_remote_address, default_limits=[])

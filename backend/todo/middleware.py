import logging
import time

logger = logging.getLogger('access_logger')

class RequestLoggingMiddleware:
    """
    Middleware to log every request to a file.
    Logs: Timestamp, User, IP, Method, Path, Status Code, Duration.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        duration = time.time() - start_time
        user = request.user if request.user.is_authenticated else "Anonymous"
        ip = self.get_client_ip(request)
        
        # Log format: User | IP | Method | Path | Status | Duration
        log_msg = f"{user} | {ip} | {request.method} | {request.path} | {response.status_code} | {duration:.3f}s"
        logger.info(log_msg)
        
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

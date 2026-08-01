import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ServiceUser:
    """Stand-in for request.user — there's no Django user model involved,
    just verification that the caller is the trusted Node service."""

    is_authenticated = True

    def __init__(self, service_name):
        self.service_name = service_name


class ServiceJWTAuthentication(BaseAuthentication):
    """Verifies the short-lived HS256 token Node signs with the JWT_SECRET
    shared between the two services (see server/src/services/mlService.js
    and Valora_Team_Workflow.md §8: 'require JWT authentication headers')."""

    def authenticate(self, request):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            raise AuthenticationFailed('Missing bearer token')

        token = header.split(' ', 1)[1]
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
        except jwt.PyJWTError as exc:
            raise AuthenticationFailed('Invalid or expired service token') from exc

        return (ServiceUser(payload.get('service', 'unknown')), None)

from rest_framework import permissions

class IsClient(permissions.BasePermission):
    """Permission check for Client user role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'client'
        )

class IsStaff(permissions.BasePermission):
    """Permission check for CAD Designer (Staff) or Admin user role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                (request.user.role == 'staff' and getattr(request.user, 'is_active_staff', True)) or
                request.user.role == 'admin' or
                request.user.is_staff or
                request.user.is_superuser
            )
        )

class IsAdmin(permissions.BasePermission):
    """Permission check for Super Admin user role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == 'admin' or request.user.is_staff or request.user.is_superuser)
        )

class IsStaffOrAdmin(permissions.BasePermission):
    """Permission check for Staff or Admin."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role in ['staff', 'admin'] or request.user.is_superuser)
        )

class IsClientOrAdmin(permissions.BasePermission):
    """Permission check for Client or Admin."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role in ['client', 'admin'] or request.user.is_superuser)
        )

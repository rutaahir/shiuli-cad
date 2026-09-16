from rest_framework.exceptions import APIException
from rest_framework import status

class OrderAlreadyTakenError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'This order has already been accepted by another CAD designer.'
    default_code = 'order_already_taken'

class StaffAtCapacityError(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You are currently at your maximum job capacity.'
    default_code = 'staff_at_capacity'

class InvalidOrderStateError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid order state transition.'
    default_code = 'invalid_order_state'

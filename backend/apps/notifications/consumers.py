import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.user_group = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        if self.user.role == 'staff':
            self.staff_group = "staff_pool"
            await self.channel_layer.group_add(self.staff_group, self.channel_name)

        await self.accept()
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "message": f"Connected to notification channel for {self.user.username}"
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
        if hasattr(self, 'staff_group'):
            await self.channel_layer.group_discard(self.staff_group, self.channel_name)

    async def receive(self, text_data):
        # Client can send ping/heartbeat if needed
        data = json.loads(text_data)
        if data.get('action') == 'ping':
            await self.send(text_data=json.dumps({"type": "pong"}))

    async def notification_message(self, event):
        """Handler for personal notifications."""
        await self.send(text_data=json.dumps({
            "type": "notification",
            "notification": event["notification"]
        }))

    async def job_pool_update(self, event):
        """Handler for real-time job pool updates (new_job_available, job_taken)."""
        await self.send(text_data=json.dumps({
            "type": "job_pool_update",
            "action": event["action"],
            "order_id": event["order_id"],
            "total_price": event.get("total_price"),
            "taken_by": event.get("taken_by")
        }))

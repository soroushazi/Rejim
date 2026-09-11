from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.mixins import TraineeScopedQuerysetMixin
from accounts.permissions import GoalWritePermission

from .models import Goal, Notification, PushSubscription, ReminderSetting, UserPreference
from .serializers import GoalSerializer, NotificationSerializer, ReminderSettingSerializer, UserPreferenceSerializer


class GoalViewSet(TraineeScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Goal.objects.all()
    serializer_class = GoalSerializer
    permission_classes = [GoalWritePermission]
    trainee_path = "trainee"

    def perform_create(self, serializer):
        user = self.request.user
        trainee = serializer.validated_data.get("trainee")
        if trainee is None:
            # No trainee named - about themselves, server-set.
            if not user.is_trainee:
                raise PermissionDenied("trainee is required.")
            serializer.save(trainee=user)
        else:
            # A trainer named one of their own trainees (validated_data
            # already restricted to that queryset by the serializer).
            serializer.save()


class UserPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        preference, _ = UserPreference.objects.get_or_create(user=request.user)
        return Response(UserPreferenceSerializer(preference).data)

    def patch(self, request):
        preference, _ = UserPreference.objects.get_or_create(user=request.user)
        serializer = UserPreferenceSerializer(preference, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ReminderSettingViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSettingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReminderSetting.objects.filter(user=self.request.user)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=["is_read", "read_at"])
        return Response(self.get_serializer(notification).data)


class NotificationBannerView(APIView):
    """Returns not-yet-shown banner notifications and marks them shown in the
    same request, so a page reload doesn't re-show them - the banner
    equivalent of TraineeNotes' auto-mark-read-on-fetch, just server-side."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        pending = list(Notification.objects.filter(user=request.user, banner_shown=False))
        data = NotificationSerializer(pending, many=True).data
        Notification.objects.filter(id__in=[n.id for n in pending]).update(banner_shown=True)
        return Response(data)


class PushSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        endpoint = request.data.get("endpoint")
        keys = request.data.get("keys", {})
        if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
            return Response({"detail": "endpoint and keys.p256dh/keys.auth are required."}, status=400)
        PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={"user": request.user, "p256dh": keys["p256dh"], "auth": keys["auth"]},
        )
        return Response(status=201)

    def delete(self, request):
        endpoint = request.data.get("endpoint")
        PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        return Response(status=204)


class VapidPublicKeyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"public_key": settings.VAPID_PUBLIC_KEY})

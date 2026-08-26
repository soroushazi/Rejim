from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsTrainer
from .serializers import UserSerializer


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class TraineeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsTrainer]

    def get_queryset(self):
        return self.request.user.trainees.all()

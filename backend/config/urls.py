"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token

from accounts.views import SignupView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", obtain_auth_token),
    path("api/auth/signup/", SignupView.as_view()),
    path("api/accounts/", include("accounts.urls")),
    path("api/workouts/", include("workouts.urls")),
    path("api/nutrition/", include("nutrition.urls")),
    path("api/connection/", include("connection.urls")),
    path("api/tracker/", include("tracker.urls")),
    path("api/progress/", include("progress.urls")),
    path("api/", include("usersettings.urls")),
    path("api/export/", include("dataexport.urls")),
    path("api/trainer/", include("trainerdashboard.urls")),
]

# Always on, not just DEBUG - Caddy proxies /media/* straight to gunicorn
# (same pattern as /static/*, no shared volume), so this needs to work in
# production too. Django's docs caution against serving media this way at
# high traffic, but at this app's ~10-user Stage 1 scale (occasional
# exercise images) it's the simplest thing that works - matches the
# project's "don't over-engineer" convention.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

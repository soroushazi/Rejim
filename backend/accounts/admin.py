from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class RejimUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Rejim", {"fields": ("is_trainee", "is_trainer", "trainer")}),
    )
    list_display = ("username", "email", "is_trainee", "is_trainer", "trainer", "is_staff")
    list_filter = ("is_trainee", "is_trainer")

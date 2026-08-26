from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class RejimUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Rejim", {"fields": ("role", "trainer")}),
    )
    list_display = ("username", "email", "role", "trainer", "is_staff")
    list_filter = ("role",)

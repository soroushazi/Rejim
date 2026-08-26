from django.contrib import admin

from .models import QAMessage, QAThread, TrainerNote


class QAMessageInline(admin.TabularInline):
    model = QAMessage
    extra = 1


@admin.register(QAThread)
class QAThreadAdmin(admin.ModelAdmin):
    list_display = ("subject", "trainee", "status", "updated_at")
    list_filter = ("status",)
    inlines = [QAMessageInline]


@admin.register(TrainerNote)
class TrainerNoteAdmin(admin.ModelAdmin):
    list_display = ("trainee", "created_at", "read")
    list_filter = ("read",)

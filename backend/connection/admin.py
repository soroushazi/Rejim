from django.contrib import admin

from .models import QAMessage, QAThread, TrainerConnection, TrainerNote


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


@admin.register(TrainerConnection)
class TrainerConnectionAdmin(admin.ModelAdmin):
    # This is the Stage 1 "manual assignment" workflow: pick assigned_trainer
    # here and save - TrainerConnection.save() wires up the real Trainee.trainer
    # FK and flips status to active automatically.
    list_display = ("trainee", "option_selected", "requested_trainer_name", "status", "assigned_trainer", "created_at")
    list_filter = ("option_selected", "status")
    search_fields = ("trainee__username", "requested_trainer_name")

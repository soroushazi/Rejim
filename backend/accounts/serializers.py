from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    bmi = serializers.SerializerMethodField()
    bmi_category = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "trainer",
            "height_cm",
            "age",
            "starting_weight",
            "starting_weight_unit",
            "meal_preferences",
            "meal_preferences_notes",
            "workout_days_per_week",
            "workout_session_minutes",
            "gym_location",
            "experience_level",
            "injury_notes",
            "onboarding_completed",
            "bmi",
            "bmi_category",
        ]
        read_only_fields = ["role", "trainer"]

    def get_bmi(self, obj):
        from .services import compute_bmi

        bmi, _ = compute_bmi(obj)
        return bmi

    def get_bmi_category(self, obj):
        from .services import compute_bmi

        _, category = compute_bmi(obj)
        return category


class SignupSerializer(serializers.ModelSerializer):
    """Self-service signup, trainee-only - trainers are still provisioned by
    an admin (see CLAUDE.md: ~10-user Stage 1, no self-serve trainer
    onboarding). Creates the account and lets the caller issue a token,
    same as the existing obtain_auth_token login flow."""

    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(role=User.Role.TRAINEE, **validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        validate_password(value, user=self.context["request"].user)
        return value

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user

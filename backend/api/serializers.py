from rest_framework import serializers
from .models import Note, SavedVideo


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id","title","content","created_at","author"]
        extra_kwargs = {'author': {'read_only': True}}


class SavedVideoSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField()

    class Meta:
        model = SavedVideo
        fields = ["id", "title", "video_url", "video_format", "created_at"]

    def get_video_url(self, obj):
        request = self.context.get("request")

        if not obj.video:
            return ""

        if request:
            return request.build_absolute_uri(obj.video.url)

        return obj.video.url



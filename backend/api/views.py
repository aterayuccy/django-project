import asyncio
import json
import os
import tempfile
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.contrib.auth.models import User
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Note, SavedVideo
from .serializers import NoteSerializer, SavedVideoSerializer, UserSerializer

VIDEO_FORMATS = {
    "short": {
        "size": (720, 1280),
        "subtitle_top": 1135,
        "subtitle_width": 640,
        "subtitle_max_chars": 14,
    },
    "long": {
        "size": (1280, 720),
        "subtitle_top": 630,
        "subtitle_width": 1120,
        "subtitle_max_chars": 24,
    },
}
TARGET_VIDEO_SIZE = VIDEO_FORMATS["long"]["size"]
SUBTITLE_FONT_PATH = Path(r"C:\Windows\Fonts\msjh.ttc")
SUBTITLE_MAX_CHARS_PER_LINE = 24
SUBTITLE_MAX_LINES = 2
SUBTITLE_TOP_POSITION = 630
SUBTITLE_FONT_SIZE = 36
SUBTITLE_HORIZONTAL_MARGIN = 24
SUBTITLE_VERTICAL_MARGIN = 18


class NoteListCreate(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(author=user)

    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(author=self.request.user)
        else:
            print(serializer.errors)


class NoteDelete(generics.DestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(author=user)


class SavedVideoListCreate(generics.ListCreateAPIView):
    serializer_class = SavedVideoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def get_queryset(self):
        return SavedVideo.objects.filter(author=self.request.user).order_by("-created_at")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def create(self, request, *args, **kwargs):
        video_file = request.FILES.get("video")
        video_format = request.data.get("video_format") or SavedVideo.VideoFormat.LONG

        if video_format not in VIDEO_FORMATS:
            return Response({"detail": "Invalid video format."}, status=status.HTTP_400_BAD_REQUEST)

        if not video_file:
            return Response({"detail": "請先選擇要儲存的影片。"}, status=status.HTTP_400_BAD_REQUEST)

        saved_video = SavedVideo.objects.create(
            author=request.user,
            title=request.data.get("title") or "合成影片",
            video=video_file,
            video_format=video_format,
        )
        serializer = self.get_serializer(saved_video)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SavedVideoDelete(generics.DestroyAPIView):
    serializer_class = SavedVideoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavedVideo.objects.filter(author=self.request.user)


class CreatUserView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


EDGE_TTS_VOICES = {
    "zh-TW-HsiaoChenNeural": "曉臻（台灣女聲）",
    "zh-TW-YunJheNeural": "雲哲（台灣男聲）",
    "zh-CN-XiaoxiaoNeural": "曉曉（中文女聲）",
    "zh-CN-YunxiNeural": "雲希（中文男聲）",
    "en-US-JennyNeural": "Jenny（英文女聲）",
    "en-US-GuyNeural": "Guy（英文男聲）",
}


def get_edge_tts():
    try:
        import edge_tts
    except ImportError:
        return None

    return edge_tts


async def synthesize_tts_audio(text, voice):
    edge_tts = get_edge_tts()

    if edge_tts is None:
        raise RuntimeError("後端尚未安裝 edge-tts，請先安裝 requirements.txt。")

    communicate = edge_tts.Communicate(text, voice)
    audio_chunks = []

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])

    return b"".join(audio_chunks)


def download_file(url, target_path):
    request = Request(url, headers={"User-Agent": "videomaker/1.0"})

    with urlopen(request, timeout=30) as response:
        target_path.write_bytes(response.read())


def fit_video_clip_to_canvas(video_clip, target_size=TARGET_VIDEO_SIZE):
    target_width, target_height = target_size
    source_width, source_height = video_clip.size
    scale = max(target_width / source_width, target_height / source_height)
    resized_width = round(source_width * scale)
    resized_height = round(source_height * scale)
    resized_clip = video_clip.resized(new_size=(resized_width, resized_height))
    cropped_clip = resized_clip.cropped(
        width=target_width,
        height=target_height,
        x_center=resized_width // 2,
        y_center=resized_height // 2,
    )

    return cropped_clip, [resized_clip]


def format_subtitle_text(text, max_chars_per_line=SUBTITLE_MAX_CHARS_PER_LINE):
    clean_text = " ".join(text.split())
    lines = [
        clean_text[index : index + max_chars_per_line]
        for index in range(0, len(clean_text), max_chars_per_line)
    ]

    if len(lines) > SUBTITLE_MAX_LINES:
        lines = lines[:SUBTITLE_MAX_LINES]
        lines[-1] = f"{lines[-1].rstrip()}..."

    return "\n".join(lines)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tts_voices(request):
    data = [{"id": voice_id, "name": name} for voice_id, name in EDGE_TTS_VOICES.items()]
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def text_to_speech(request):
    text = request.data.get("text", "").strip()
    voice = request.data.get("voice", "zh-TW-HsiaoChenNeural")

    if not text:
        return Response({"detail": "請輸入片段內容。"}, status=status.HTTP_400_BAD_REQUEST)

    if len(text) > 3000:
        return Response({"detail": "片段內容太長，請控制在 3000 字以內。"}, status=status.HTTP_400_BAD_REQUEST)

    if voice not in EDGE_TTS_VOICES:
        return Response({"detail": "不支援這個聲音。"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        audio = asyncio.run(synthesize_tts_audio(text, voice))
    except Exception as error:
        return Response({"detail": f"TTS 產生失敗：{error}"}, status=status.HTTP_502_BAD_GATEWAY)

    response = HttpResponse(audio, content_type="audio/mpeg")
    response["Content-Disposition"] = 'inline; filename="voice.mp3"'
    return response


def choose_video_file(video_files):
    for quality in ("medium", "small", "tiny", "large"):
        video = video_files.get(quality)

        if video and video.get("url"):
            return video

    return None


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def search_pixabay_video(request):
    keyword = request.data.get("keyword", "").strip()
    min_duration = float(request.data.get("min_duration") or 0)
    api_key = request.data.get("pixabay_key", "").strip() or os.getenv("PIXABAY_API_KEY")
    exclude_ids = request.data.get("exclude_ids", [])

    if not isinstance(exclude_ids, list):
        exclude_ids = []

    excluded_ids = {str(video_id) for video_id in exclude_ids}

    if not keyword:
        return Response({"detail": "請輸入素材關鍵字。"}, status=status.HTTP_400_BAD_REQUEST)

    if min_duration <= 0:
        return Response({"detail": "請先生成音檔，才能依照音檔長度選擇素材。"}, status=status.HTTP_400_BAD_REQUEST)

    if not api_key:
        return Response({"detail": "請先輸入 Pixabay API Key。"}, status=status.HTTP_400_BAD_REQUEST)

    params = urlencode(
        {
            "key": api_key,
            "q": keyword,
            "video_type": "film",
            "safesearch": "true",
            "order": "popular",
            "per_page": 200,
        }
    )
    pixabay_url = f"https://pixabay.com/api/videos/?{params}"

    try:
        pixabay_request = Request(pixabay_url, headers={"User-Agent": "videomaker/1.0"})

        with urlopen(pixabay_request, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8") or "Pixabay 搜尋失敗。"
        return Response({"detail": detail}, status=error.code)
    except (URLError, TimeoutError) as error:
        return Response({"detail": f"Pixabay 連線失敗：{error}"}, status=status.HTTP_502_BAD_GATEWAY)

    for hit in data.get("hits", []):
        duration = hit.get("duration") or 0

        if str(hit.get("id")) in excluded_ids:
            continue

        if duration <= min_duration:
            continue

        video_file = choose_video_file(hit.get("videos", {}))

        if not video_file:
            continue

        return Response(
            {
                "id": hit.get("id"),
                "pageURL": hit.get("pageURL"),
                "tags": hit.get("tags", ""),
                "duration": duration,
                "trimStart": 0,
                "trimEnd": min_duration,
                "trimDuration": min_duration,
                "videoUrl": video_file.get("url"),
                "thumbnail": video_file.get("thumbnail"),
                "width": video_file.get("width"),
                "height": video_file.get("height"),
                "size": video_file.get("size"),
            }
        )

    return Response(
        {"detail": "找不到長度大於音檔的 Pixabay 影片素材。"},
        status=status.HTTP_404_NOT_FOUND,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def compose_video(request):
    voice = request.data.get("voice", "zh-TW-HsiaoChenNeural")
    video_format = request.data.get("video_format", "long")
    segments = request.data.get("segments", [])
    video_settings = VIDEO_FORMATS.get(video_format)

    if voice not in EDGE_TTS_VOICES:
        return Response({"detail": "不支援這個聲音。"}, status=status.HTTP_400_BAD_REQUEST)

    if not video_settings:
        return Response({"detail": "Invalid video format."}, status=status.HTTP_400_BAD_REQUEST)

    if not segments:
        return Response({"detail": "請先準備至少一個片段。"}, status=status.HTTP_400_BAD_REQUEST)

    for index, segment in enumerate(segments, start=1):
        if not segment.get("text", "").strip():
            return Response({"detail": f"片段 {index} 缺少旁白內容。"}, status=status.HTTP_400_BAD_REQUEST)

        if not segment.get("videoUrl"):
            return Response({"detail": f"片段 {index} 尚未選擇素材。"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from moviepy import AudioFileClip, CompositeVideoClip, TextClip, VideoFileClip, concatenate_videoclips
    except ImportError:
        return Response(
            {"detail": "後端尚未安裝 MoviePy，請先安裝 requirements.txt。"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            clips = []
            resources = []

            try:
                for index, segment in enumerate(segments, start=1):
                    text = segment.get("text", "").strip()
                    video_url = segment["videoUrl"]
                    audio_path = temp_path / f"audio_{index}.mp3"
                    video_path = temp_path / f"video_{index}.mp4"

                    audio_path.write_bytes(asyncio.run(synthesize_tts_audio(text, voice)))
                    download_file(video_url, video_path)

                    audio_clip = AudioFileClip(str(audio_path))
                    video_clip = VideoFileClip(str(video_path))
                    clip_duration = min(audio_clip.duration, video_clip.duration)
                    target_size = video_settings["size"]
                    fitted_video_clip, fitted_resources = fit_video_clip_to_canvas(video_clip, target_size)

                    base_clip = fitted_video_clip.subclipped(0, clip_duration).with_audio(
                        audio_clip.subclipped(0, clip_duration)
                    )
                    subtitle_text_clip = TextClip(
                        font=str(SUBTITLE_FONT_PATH) if SUBTITLE_FONT_PATH.exists() else None,
                        text=format_subtitle_text(text, video_settings["subtitle_max_chars"]),
                        font_size=SUBTITLE_FONT_SIZE,
                        size=(video_settings["subtitle_width"], None),
                        color="white",
                        stroke_color="black",
                        stroke_width=3,
                        method="caption",
                        margin=(SUBTITLE_HORIZONTAL_MARGIN, SUBTITLE_VERTICAL_MARGIN),
                        text_align="center",
                        duration=clip_duration,
                    )
                    subtitle_clip = subtitle_text_clip.with_position(
                        ("center", video_settings["subtitle_top"])
                    )
                    clip = (
                        CompositeVideoClip([base_clip, subtitle_clip], size=target_size)
                        .with_audio(base_clip.audio)
                        .with_duration(clip_duration)
                    )
                    clips.append(clip)
                    resources.extend(
                        [
                            audio_clip,
                            video_clip,
                            *fitted_resources,
                            fitted_video_clip,
                            base_clip,
                            subtitle_text_clip,
                            subtitle_clip,
                            clip,
                        ]
                    )

                final_clip = concatenate_videoclips(clips, method="compose")
                output_path = temp_path / f"result_{uuid.uuid4().hex}.mp4"
                resources.append(final_clip)
                final_clip.write_videofile(
                    str(output_path),
                    codec="libx264",
                    audio_codec="aac",
                    fps=24,
                    logger=None,
                )

                output_bytes = output_path.read_bytes()
            finally:
                for resource in reversed(resources):
                    close = getattr(resource, "close", None)
                    if close:
                        close()
    except Exception as error:
        return Response({"detail": f"影片合成失敗：{error}"}, status=status.HTTP_502_BAD_GATEWAY)

    response = HttpResponse(output_bytes, content_type="video/mp4")
    response["Content-Disposition"] = 'inline; filename="composed-video.mp4"'
    return response

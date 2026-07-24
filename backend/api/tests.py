from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.test import RequestFactory, SimpleTestCase, TestCase

from .views import build_subtitle_cues, download_file, split_subtitle_pages


class SubtitleFormattingTests(TestCase):
    @staticmethod
    def fixed_width_measure(text):
        return len(text) * 10

    def test_wraps_english_only_when_rendered_line_is_full(self):
        text = "Phrase two is, Could you give me a hand? Use it to ask for help."

        pages = split_subtitle_pages(
            text,
            max_line_width=140,
            measure_text=self.fixed_width_measure,
        )

        self.assertGreater(len(pages), 1)
        self.assertNotIn("...", "".join(pages))
        self.assertEqual(" ".join(" ".join(pages).split()), text)
        self.assertTrue(
            all(
                self.fixed_width_measure(line) <= 140
                for page in pages
                for line in page.splitlines()
            )
        )

    def test_wraps_by_glyph_width_instead_of_character_count(self):
        def variable_width_measure(text):
            return sum(18 if character == "W" else 4 for character in text)

        pages = split_subtitle_pages(
            "iiii iiii WWW",
            max_line_width=40,
            measure_text=variable_width_measure,
        )

        lines = [line for page in pages for line in page.splitlines()]
        self.assertEqual(lines[0], "iiii iiii")
        self.assertEqual(lines[1:], ["WW", "W"])

    def test_splits_unspaced_text_and_limits_pages_to_two_lines(self):
        pages = split_subtitle_pages(
            "這是一段沒有空格而且需要自動換行的中文字幕",
            60,
            self.fixed_width_measure,
        )

        self.assertEqual(
            "".join(page.replace("\n", "") for page in pages),
            "這是一段沒有空格而且需要自動換行的中文字幕",
        )
        self.assertTrue(all(len(page.splitlines()) <= 2 for page in pages))

    def test_cues_cover_the_complete_clip_without_gaps(self):
        cues = build_subtitle_cues(
            "This sentence is long enough to need several subtitle pages.",
            clip_duration=8.0,
            max_line_width=120,
            measure_text=self.fixed_width_measure,
        )

        self.assertEqual(cues[0]["start"], 0.0)
        self.assertAlmostEqual(
            cues[-1]["start"] + cues[-1]["duration"],
            8.0,
        )
        self.assertTrue(all(cue["duration"] > 0 for cue in cues))
        self.assertTrue(
            all(
                current["start"] + current["duration"] == following["start"]
                for current, following in zip(cues, cues[1:])
            )
        )


class DownloadFileTests(SimpleTestCase):
    @patch("api.views.urlopen")
    @patch(
        "api.views.default_storage.open",
        return_value=BytesIO(b"uploaded built-in material"),
    )
    def test_same_origin_media_is_read_from_storage(
        self,
        storage_open_mock,
        urlopen_mock,
    ):
        request = RequestFactory().get("/", HTTP_HOST="testserver")

        with TemporaryDirectory() as temp_dir:
            target_path = Path(temp_dir) / "video.webm"

            download_file(
                "https://testserver/media/builtin_materials/1/video.webm",
                target_path,
                request=request,
            )

            self.assertEqual(target_path.read_bytes(), b"uploaded built-in material")
            storage_open_mock.assert_called_once_with(
                "builtin_materials/1/video.webm",
                "rb",
            )
            urlopen_mock.assert_not_called()

    @patch("api.views.time.sleep")
    @patch(
        "api.views.urlopen",
        side_effect=[TimeoutError("slow response"), BytesIO(b"complete video")],
    )
    def test_download_retries_after_timeout(self, urlopen_mock, sleep_mock):
        with TemporaryDirectory() as temp_dir:
            target_path = Path(temp_dir) / "video.mp4"

            download_file("https://example.com/video.mp4", target_path)

            self.assertEqual(target_path.read_bytes(), b"complete video")
            self.assertEqual(urlopen_mock.call_count, 2)
            sleep_mock.assert_called_once_with(1)

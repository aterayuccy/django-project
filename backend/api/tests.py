from django.test import TestCase

from .views import build_subtitle_cues, split_subtitle_pages


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

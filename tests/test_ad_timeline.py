import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from ad_timeline import calculate_ad_timeline, build_ad_timeline
from ad_compositor import build_video_filter, build_audio_filter


class AdTimelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures = json.loads((ROOT / 'tests/ad_timeline_cases.json').read_text(encoding='utf-8'))

    def test_expected_timing_and_frontend_parity(self):
        frontend = json.loads(subprocess.check_output(
            ['node', str(ROOT / 'tests/ad_timeline_frontend.cjs'), '--json'], cwd=ROOT, text=True))
        self.assertEqual(len(frontend), len(self.fixtures['cases']))
        for case, frontend_result in zip(self.fixtures['cases'], frontend):
            with self.subTest(case=case['name']):
                result = calculate_ad_timeline({**self.fixtures['defaults'], **case['input']})
                self.assertEqual(result.keys(), frontend_result.keys())
                for key, value in case['expected'].items():
                    self.assertAlmostEqual(result[key], value, places=9)
                for key, value in frontend_result.items():
                    self.assertAlmostEqual(result[key], value, places=9, msg=key)

    def test_video_and_audio_consume_same_pause_plan(self):
        source = {'duration': 10, 'width': 160, 'height': 90, 'fps': 25, 'has_audio': True}
        ad = {**source, 'duration': 6}
        lead = {'duration': 6}
        config = {
            'startAt': 2, 'pauseSource': True, 'adRange': {'start': 1, 'end': 5},
            'leadInAudio': {'mode': 'voiceover', 'pauseSource': True, 'adVideoDelay': 1, 'playbackRate': 1.5},
        }
        timeline = build_ad_timeline(config, source, ad, lead)
        video, duration, *_ = build_video_filter(config, source, ad, lead, timeline)
        audio, audio_map = build_audio_filter(config, source, ad, lead, timeline)
        self.assertEqual(duration, 15)
        self.assertEqual(audio_map, '[aout]')
        self.assertIn('trim=duration=1.000000[ad_hold]', ';'.join(video))
        self.assertIn('atrim=duration=1.000000,asetpts=PTS-STARTPTS[ad_silence]', ';'.join(audio))
        self.assertNotIn('[ad_audio]', ';'.join(audio))
        self.assertIn('scale=40:22:flags=lanczos,format=rgba,colorkey=', ';'.join(video))
        self.assertIn('crop=160:90:0:0', ';'.join(video))


if __name__ == '__main__':
    unittest.main()

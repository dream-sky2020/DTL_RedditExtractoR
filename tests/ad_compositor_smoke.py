"""Render short synthetic media and inspect the actual exported video/audio.

Run: python tests/ad_compositor_smoke.py (requires existing FFmpeg/ffprobe).
All media is generated in a temporary directory and removed on completion.
"""
import json
import math
from pathlib import Path
import struct
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def execute(*args):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8', errors='replace'))
    return result.stdout


def duration(path):
    return float(execute('ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                         '-of', 'default=noprint_wrappers=1:nokey=1', str(path)))


def frame(path, seconds):
    # Inspect an uncovered part of the master to verify freeze/resume behavior.
    return execute('ffmpeg', '-v', 'error', '-ss', str(seconds), '-i', str(path),
                   '-vf', 'crop=160:40:0:50', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1')


def frame_difference(a, b):
    assert len(a) == len(b) and a
    return sum(abs(x - y) for x, y in zip(a, b)) / len(a)


def audio_samples(path, seconds):
    raw = execute('ffmpeg', '-v', 'error', '-ss', str(seconds), '-i', str(path),
                  '-t', '0.2', '-vn', '-ar', '48000', '-ac', '1', '-f', 'f32le', 'pipe:1')
    return struct.unpack(f'<{len(raw) // 4}f', raw)


def tone_amplitude(samples, frequency):
    sine = sum(value * math.sin(2 * math.pi * frequency * i / 48000) for i, value in enumerate(samples))
    cosine = sum(value * math.cos(2 * math.pi * frequency * i / 48000) for i, value in enumerate(samples))
    return 2 * math.hypot(sine, cosine) / len(samples)


def main():
    with tempfile.TemporaryDirectory(prefix='reddit-ad-smoke-') as directory:
        folder = Path(directory)
        source, ad, lead = folder / 'master.mp4', folder / 'ad.mp4', folder / 'lead.wav'
        execute('ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=160x90:rate=25:duration=4',
                '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=4',
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', str(source))
        execute('ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=green:size=80x80:rate=25:duration=3',
                '-f', 'lavfi', '-i', 'sine=frequency=660:sample_rate=48000:duration=3',
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', str(ad))
        execute('ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i',
                'sine=frequency=880:sample_rate=48000:duration=3', str(lead))
        base = {
            'sourceVideo': str(source), 'adVideo': str(ad), 'startAt': 1,
            'adRange': {'start': 0.5, 'end': 2.5}, 'mode': 'plain-overlay',
            'placement': {'x': 0, 'y': 0, 'width': 0.25},
        }
        scenarios = [
            ('overlay', {}, 4),
            ('prelude', {'pauseSource': True, 'leadInAudio': {
                'path': str(lead), 'mode': 'prelude', 'pauseSource': True, 'playbackRate': 1.5}}, 8),
            ('voiceover', {'pauseSource': True, 'leadInAudio': {
                'path': str(lead), 'mode': 'voiceover', 'pauseSource': True,
                'playbackRate': 1.5, 'adVideoDelay': 0.5}}, 6.5),
        ]
        original = source.read_bytes()
        for name, overrides, expected in scenarios:
            config = folder / f'{name}.json'
            output = folder / f'{name}.mp4'
            config.write_text(json.dumps({**base, **overrides}), encoding='utf-8')
            execute(sys.executable, str(ROOT / 'scripts/ad_compositor.py'), '--config', str(config), '--output', str(output))
            actual = duration(output)
            assert abs(actual - expected) < 0.12, (name, actual, expected)
            info = json.loads(execute('ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(output)))
            video = next(stream for stream in info['streams'] if stream['codec_type'] == 'video')
            assert (video['width'], video['height']) == (160, 90)
            if name == 'voiceover':
                assert frame_difference(frame(output, 1.2), frame(output, 2.2)) < 4
                resumed = frame(output, 4)
                candidates = [(time, frame_difference(resumed, frame(source, time)))
                              for time in (1.36, 1.40, 1.44, 1.48, 1.52, 1.56, 1.60, 1.64)]
                matched_time, difference = min(candidates, key=lambda item: item[1])
                assert difference < 8 and abs(matched_time - 1.5) < 0.12, candidates
                print(f'voiceover resumed frame matches master at {matched_time:.2f}s (difference {difference:.2f})')
                during = audio_samples(output, 1.8)
                assert tone_amplitude(during, 880) > 0.05
                assert tone_amplitude(during, 440) < 0.01
                assert tone_amplitude(during, 660) < 0.01
                tail = audio_samples(output, 3.15)
                assert math.sqrt(sum(value * value for value in tail) / len(tail)) < 0.01
                assert tone_amplitude(audio_samples(output, 3.8), 440) > 0.05
            assert source.read_bytes() == original
            print(f'{name}: exported duration {actual:.3f}s, resolution and master preservation passed')
        print('Voiceover freeze/resume, lead pitch, silent tail and source audio resume passed')


if __name__ == '__main__':
    main()

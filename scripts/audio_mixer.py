import argparse
import json
import os
import re
import shutil
import subprocess
import sys


PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DEFAULT_AUDIO_DURATION_SECONDS = 2.5
DEFAULT_AUDIO_DIR = os.path.join(PROJECT_ROOT, 'public', 'audio', 'shortAudio', 'Unassigned')
AUDIO_TAG_RE = re.compile(r'\[audio\s+([^\]]+)\]', re.IGNORECASE)
ATTR_RE = re.compile(r'([a-zA-Z_][\w-]*)\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s\]]+))')


def parse_attrs(attr_text):
    attrs = {}
    for match in ATTR_RE.finditer(attr_text or ''):
        key = match.group(1).lower()
        value = match.group(2) or match.group(3) or match.group(4) or ''
        attrs[key] = value
    return attrs


def parse_float(value, fallback):
    try:
        parsed = float(value)
        return parsed if parsed == parsed else fallback
    except (TypeError, ValueError):
        return fallback


def resolve_audio_path(src):
    if not src:
        return None

    normalized = src.replace('\\', '/').lstrip('/')
    candidates = []

    if os.path.isabs(src):
        candidates.append(src)
    else:
        candidates.extend([
            os.path.join(PROJECT_ROOT, normalized),
            os.path.join(PROJECT_ROOT, 'public', normalized),
            os.path.join(PROJECT_ROOT, 'public', 'audio', normalized),
            os.path.join(DEFAULT_AUDIO_DIR, normalized),
        ])

    for candidate in candidates:
        if os.path.exists(candidate):
            return os.path.abspath(candidate)

    return None


def parse_audio_tags(content):
    tracks = []
    if not isinstance(content, str) or '[audio' not in content:
        return tracks

    for match in AUDIO_TAG_RE.finditer(content):
        attrs = parse_attrs(match.group(1))
        src = attrs.get('src', '')
        if not src:
            continue

        start = max(0, parse_float(attrs.get('start'), 0))
        volume = max(0, min(1, parse_float(attrs.get('volume'), 1)))
        duration = parse_float(attrs.get('duration') or attrs.get('d'), None)
        end = parse_float(attrs.get('end'), None)

        if duration is None and end is not None:
            duration = end - start
        if duration is None or duration <= 0:
            duration = DEFAULT_AUDIO_DURATION_SECONDS

        tracks.append({
            'src': src,
            'start': start,
            'volume': volume,
            'duration': duration,
        })

    return tracks


def parse_scene_audio_tracks(config):
    tracks = []
    scene_offset = 0

    for scene in config.get('scenes', []) or []:
        scene_duration = max(0, parse_float(scene.get('duration'), 0))
        for item in scene.get('items', []) or []:
            enter_at = max(0, min(parse_float(item.get('enterAt'), 0), scene_duration))
            for tag in parse_audio_tags(item.get('content', '')):
                audio_path = resolve_audio_path(tag['src'])
                if not audio_path:
                    print(f"⚠️ 跳过不存在的音频文件: {tag['src']}")
                    continue

                tracks.append({
                    **tag,
                    'path': audio_path,
                    'start': scene_offset + enter_at + tag['start'],
                })

        scene_offset += scene_duration

    return tracks


def get_total_duration(config):
    duration = 0
    for scene in config.get('scenes', []) or []:
        duration += max(0, parse_float(scene.get('duration'), 0))
    return max(0.1, duration)


def ffmpeg_escape_filter_path(path):
    return path.replace('\\', '/').replace("'", r"\'")


def mix_audio(config_path, video_path, output_path):
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    tracks = parse_scene_audio_tracks(config)
    total_duration = get_total_duration(config)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    if not tracks:
        print("ℹ️ 未发现音频轨道，直接输出静音视频。")
        shutil.copyfile(video_path, output_path)
        return

    print(f"🎚️ 发现 {len(tracks)} 条音频轨道，开始使用 FFmpeg 混音...")

    cmd = [
        'ffmpeg',
        '-y',
        '-i', video_path,
        '-f', 'lavfi',
        '-t', f'{total_duration:.3f}',
        '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    ]

    for track in tracks:
        cmd.extend(['-i', track['path']])

    filter_parts = [f'[1:a]atrim=0:{total_duration:.3f},asetpts=PTS-STARTPTS[silence]']
    mix_inputs = ['[silence]']

    for index, track in enumerate(tracks):
        input_index = index + 2
        delay_ms = max(0, int(round(track['start'] * 1000)))
        duration = max(0.001, track['duration'])
        volume = max(0, min(1, track['volume']))
        label = f'a{index}'
        filter_parts.append(
            f'[{input_index}:a]'
            f'atrim=0:{duration:.3f},'
            f'asetpts=PTS-STARTPTS,'
            f'aformat=channel_layouts=stereo:sample_rates=48000,'
            f'volume={volume:.4f},'
            f'adelay={delay_ms}|{delay_ms}'
            f'[{label}]'
        )
        mix_inputs.append(f'[{label}]')

    filter_parts.append(
        f'{"".join(mix_inputs)}'
        f'amix=inputs={len(mix_inputs)}:duration=longest:dropout_transition=0:normalize=0,'
        f'atrim=0:{total_duration:.3f},asetpts=PTS-STARTPTS[mixed]'
    )

    cmd.extend([
        '-filter_complex', ';'.join(filter_parts),
        '-map', '0:v:0',
        '-map', '[mixed]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        output_path,
    ])

    subprocess.run(cmd, cwd=PROJECT_ROOT, check=True)
    print(f"✅ 音频合成完成: {output_path}")


def main():
    parser = argparse.ArgumentParser(description='Mix RedditExtractoR audio tracks into a rendered video.')
    parser.add_argument('--config', required=True)
    parser.add_argument('--video', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    mix_audio(
        os.path.abspath(args.config),
        os.path.abspath(args.video),
        os.path.abspath(args.output),
    )


if __name__ == '__main__':
    try:
        main()
    except Exception as err:
        print(f"❌ 音频合成失败: {err}", file=sys.stderr)
        sys.exit(1)


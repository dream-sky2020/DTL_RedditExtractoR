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
    background = config.get('backgroundVideo') or {}
    if (
        config.get('renderMode') == 'final'
        and background.get('enabled')
        and background.get('timelineMode') == 'wait-for-background'
    ):
        background_duration = parse_float(background.get('durationInSeconds'), 0)
        playback_rate = max(0.001, parse_float(background.get('playbackRate'), 1))
        start_offset = max(0, parse_float(background.get('startOffset'), 0))
        base_duration = max(0, background_duration - start_offset) / playback_rate
        repeat_count = 1
        if background.get('playbackMode') == 'repeat-count':
            repeat_count = max(1, int(parse_float(background.get('repeatCount'), 1)))
        duration = max(duration, base_duration * repeat_count)
    return max(0.1, duration)


def has_audio_stream(path):
    try:
        result = subprocess.run(
            [
                'ffprobe',
                '-v', 'error',
                '-select_streams', 'a:0',
                '-show_entries', 'stream=index',
                '-of', 'csv=p=0',
                path,
            ],
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
        return result.returncode == 0 and bool(result.stdout.strip())
    except Exception:
        return False


def should_preserve_background_audio(config):
    background = config.get('backgroundVideo') or {}
    render_mode = config.get('renderMode')
    return bool(
        (render_mode is None or render_mode == 'final')
        and background.get('enabled')
        and background.get('audioEnabled')
    )


def ffmpeg_escape_filter_path(path):
    return path.replace('\\', '/').replace("'", r"\'")


def mix_audio(config_path, video_path, output_path):
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    tracks = parse_scene_audio_tracks(config)
    total_duration = get_total_duration(config)
    bgm_config = config.get('bgm', {})
    bgm_enabled = bgm_config.get('enabled', False) and bgm_config.get('src')
    bgm_path = resolve_audio_path(bgm_config.get('src')) if bgm_enabled else None

    background_config = config.get('backgroundVideo', {})
    background_audio_enabled = background_config.get('enabled') and background_config.get('audioEnabled') and background_config.get('src')
    background_video_path = resolve_audio_path(background_config.get('src')) if background_audio_enabled else None

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    # 如果我们手动提取背景音轨，就不再从 silent 视频中保留音轨（通常 silent 视频本身也没音轨）
    preserve_video_audio = should_preserve_background_audio(config) and has_audio_stream(video_path) and not background_video_path

    if not tracks and not preserve_video_audio and not bgm_path and not background_video_path:
        print("ℹ️ 未发现音频轨道，直接输出静音视频。")
        shutil.copyfile(video_path, output_path)
        return

    if preserve_video_audio:
        print("🎧 已检测到输入视频音轨，将保留并混入最终音频。")
    if background_video_path:
        print(f"🎬 发现背景视频音轨: {background_config.get('src')}")
    if bgm_path:
        print(f"🎵 发现背景音乐: {bgm_config.get('src')}")
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

    if bgm_path:
        cmd.extend(['-stream_loop', '-1', '-i', bgm_path])

    if background_video_path:
        # 背景视频可能需要跳过 startOffset
        start_offset = parse_float(background_config.get('startOffset'), 0)
        if start_offset > 0:
            cmd.extend(['-ss', f'{start_offset:.3f}'])
        
        # 如果是重复播放模式，需要 loop
        if background_config.get('playbackMode') == 'repeat-count':
            repeat_count = max(1, int(parse_float(background_config.get('repeatCount'), 1)))
            if repeat_count > 1:
                cmd.extend(['-stream_loop', str(repeat_count - 1)])
        
        cmd.extend(['-i', background_video_path])

    filter_parts = [f'[1:a]atrim=0:{total_duration:.3f},asetpts=PTS-STARTPTS[silence]']
    mix_inputs = ['[silence]']

    if preserve_video_audio:
        filter_parts.append(
            f'[0:a]'
            f'atrim=0:{total_duration:.3f},'
            f'asetpts=PTS-STARTPTS,'
            f'aformat=channel_layouts=stereo:sample_rates=48000'
            f'[background_audio]'
        )
        mix_inputs.append('[background_audio]')

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

    if bgm_path:
        bgm_input_index = len(tracks) + 2
        bgm_volume = max(0, min(1, parse_float(bgm_config.get('volume'), 0.75)))
        bgm_fade_out = max(0, parse_float(bgm_config.get('fadeOutDuration'), 0))
        
        bgm_filters = [
            f'atrim=0:{total_duration:.3f}',
            'asetpts=PTS-STARTPTS',
            'aformat=channel_layouts=stereo:sample_rates=48000',
            f'volume={bgm_volume:.4f}'
        ]
        
        if bgm_fade_out > 0:
            fade_start = max(0, total_duration - bgm_fade_out)
            bgm_filters.append(f'afade=t=out:st={fade_start:.3f}:d={bgm_fade_out:.3f}')
            
        filter_parts.append(
            f'[{bgm_input_index}:a]'
            f'{",".join(bgm_filters)}'
            f'[bgm_audio]'
        )
        mix_inputs.append('[bgm_audio]')

    if background_video_path:
        # 背景视频音轨的输入索引：tracks (len) + silence (1) + bgm (1 if exists) + background (1)
        bg_input_index = len(tracks) + 2 + (1 if bgm_path else 0)
        bg_volume = max(0, parse_float(background_config.get('audioVolume'), 0.35))
        bg_playback_rate = max(0.1, parse_float(background_config.get('playbackRate'), 1.0))
        bg_fade_out = max(0, parse_float(background_config.get('fadeOutDuration'), 0))

        bg_audio_filters = [
            f'atrim=0:{total_duration * bg_playback_rate:.3f}', # 裁剪时长需要考虑倍率
            'asetpts=PTS-STARTPTS',
            'aformat=channel_layouts=stereo:sample_rates=48000'
        ]

        # 处理倍率播放 (atempo)
        if bg_playback_rate != 1.0:
            rate = bg_playback_rate
            while rate > 2.0:
                bg_audio_filters.append('atempo=2.0')
                rate /= 2.0
            while rate < 0.5:
                bg_audio_filters.append('atempo=0.5')
                rate /= 0.5
            if rate != 1.0:
                bg_audio_filters.append(f'atempo={rate:.4f}')

        bg_audio_filters.append(f'volume={bg_volume:.4f}')

        # 处理淡出
        if bg_fade_out > 0:
            fade_start = max(0, total_duration - bg_fade_out)
            bg_audio_filters.append(f'afade=t=out:st={fade_start:.3f}:d={bg_fade_out:.3f}')

        filter_parts.append(
            f'[{bg_input_index}:a]'
            f'{",".join(bg_audio_filters)},'
            f'atrim=0:{total_duration:.3f},asetpts=PTS-STARTPTS' # 最终再次确保时长对齐
            f'[bg_video_audio]'
        )
        mix_inputs.append('[bg_video_audio]')

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


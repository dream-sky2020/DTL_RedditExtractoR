import argparse
import json
import math
import os
import subprocess
import sys
import tempfile


def probe_media(path):
    result = subprocess.run(
        [
            'ffprobe', '-v', 'error', '-print_format', 'json',
            '-show_streams', '-show_format', path,
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding='utf-8',
        errors='replace',
        check=True,
    )
    data = json.loads(result.stdout)
    video = next((stream for stream in data.get('streams', []) if stream.get('codec_type') == 'video'), None)
    audio = next((stream for stream in data.get('streams', []) if stream.get('codec_type') == 'audio'), None)
    if not video:
        raise ValueError(f'视频文件没有视频轨道: {path}')
    duration = float(data.get('format', {}).get('duration') or video.get('duration') or 0)
    if duration <= 0:
        raise ValueError(f'无法读取视频时长: {path}')
    frame_rate_text = video.get('avg_frame_rate') or video.get('r_frame_rate') or '30/1'
    numerator, denominator = frame_rate_text.split('/', 1)
    frame_rate = float(numerator) / max(float(denominator), 1)
    return {
        'width': int(video['width']),
        'height': int(video['height']),
        'duration': duration,
        'fps': frame_rate if math.isfinite(frame_rate) and frame_rate > 0 else 30,
        'has_audio': audio is not None,
    }


def probe_audio(path):
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', path],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding='utf-8',
        errors='replace',
        check=True,
    )
    data = json.loads(result.stdout)
    audio = next((stream for stream in data.get('streams', []) if stream.get('codec_type') == 'audio'), None)
    if not audio:
        raise ValueError(f'音频文件没有音频轨道: {path}')
    duration = float(data.get('format', {}).get('duration') or audio.get('duration') or 0)
    if duration <= 0:
        raise ValueError(f'无法读取音频时长: {path}')
    return {'duration': duration}


def even(value):
    return max(2, int(round(value / 2) * 2))


def silence(duration):
    return f'anullsrc=r=48000:cl=stereo,atrim=duration={duration:.6f},asetpts=PTS-STARTPTS'


def duck_volume_expression(start, end, target, transition):
    """Build a linear duck-and-restore envelope for FFmpeg's volume filter."""
    duration = max(0.0, end - start)
    target = min(1.0, max(0.0, target))
    ramp = min(max(0.0, transition), duration / 2)
    if duration <= 0:
        return '1'
    if ramp <= 0.0001:
        return f'if(between(t,{start:.6f},{end:.6f}),{target:.6f},1)'
    ramp_down_end = start + ramp
    ramp_up_start = end - ramp
    return (
        f'if(between(t,{start:.6f},{end:.6f}),'
        f'if(lt(t,{ramp_down_end:.6f}),1-(1-{target:.6f})*(t-{start:.6f})/{ramp:.6f},'
        f'if(gt(t,{ramp_up_start:.6f}),{target:.6f}+(1-{target:.6f})*'
        f'(t-{ramp_up_start:.6f})/{ramp:.6f},{target:.6f})),1)'
    )


def ass_timestamp(seconds):
    centiseconds = max(0, int(round(seconds * 100)))
    hours = centiseconds // 360000
    minutes = (centiseconds % 360000) // 6000
    secs = (centiseconds % 6000) // 100
    fraction = centiseconds % 100
    return f'{hours}:{minutes:02d}:{secs:02d}.{fraction:02d}'


def ass_color(value, alpha=0):
    raw = str(value or '#ffffff').lstrip('#')
    if len(raw) != 6:
        raw = 'ffffff'
    red, green, blue = raw[0:2], raw[2:4], raw[4:6]
    return f'&H{max(0, min(255, int(alpha))):02X}{blue}{green}{red}'


def create_subtitle_ass(config, source_info, start_at, lead_play_duration):
    lead = config.get('leadInAudio') or {}
    subtitles = lead.get('subtitles') or {}
    cues = subtitles.get('cues') if subtitles.get('enabled') else []
    if not cues:
        return None
    style = subtitles.get('style') or {}
    playback_rate = min(max(float(lead.get('playbackRate', 1)), 0.5), 2.0)
    position = style.get('position', 'bottom')
    alignment = {'top': 8, 'center': 5, 'bottom': 2}.get(position, 2)
    vertical_margin = round(source_info['height'] * min(45, max(0, float(style.get('verticalMargin', 8)))) / 100)
    background_opacity = min(1, max(0, float(style.get('backgroundOpacity', 0))))
    background_alpha = 255 - round(background_opacity * 255)
    border_style = 3 if background_opacity > 0 else 1
    font_family = str(style.get('fontFamily', 'Microsoft YaHei')).replace(',', ' ').strip() or 'Microsoft YaHei'
    header = f'''[Script Info]
ScriptType: v4.00+
PlayResX: {source_info['width']}
PlayResY: {source_info['height']}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_family},{float(style.get('fontSize', 42)):.2f},{ass_color(style.get('color', '#ffffff'))},{ass_color(style.get('color', '#ffffff'))},{ass_color(style.get('outlineColor', '#000000'))},{ass_color(style.get('backgroundColor', '#000000'), background_alpha)},0,0,0,0,100,100,0,0,{border_style},{float(style.get('outlineWidth', 3)):.2f},0,{alignment},40,40,{vertical_margin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    events = []
    for cue in cues[:500]:
        cue_start = max(0, float(cue.get('start', 0))) / playback_rate
        cue_end = max(cue_start + 0.01, float(cue.get('end', cue_start + 1)) / playback_rate)
        if cue_start >= lead_play_duration:
            continue
        cue_end = min(cue_end, lead_play_duration)
        text = str(cue.get('text', '')).strip()
        if not text or cue_end <= cue_start:
            continue
        text = text.replace('\\', r'\\').replace('{', r'\{').replace('}', r'\}').replace('\r\n', '\n').replace('\r', '\n').replace('\n', r'\N')
        events.append(
            f'Dialogue: 0,{ass_timestamp(start_at + cue_start)},{ass_timestamp(start_at + cue_end)},Default,,0,0,0,,{text}'
        )
    if not events:
        return None
    handle = tempfile.NamedTemporaryFile('w', suffix='.ass', delete=False, encoding='utf-8', newline='\n')
    try:
        handle.write(header + '\n'.join(events) + '\n')
        return handle.name
    finally:
        handle.close()


def escape_filter_path(path):
    return os.path.abspath(path).replace('\\', '/').replace(':', r'\:').replace("'", r"\'")


def build_video_filter(config, source_info, ad_info, lead_info=None):
    source_duration = source_info['duration']
    ad_range = config.get('adRange') or {}
    ad_trim_start = min(max(float(ad_range.get('start', 0)), 0), max(ad_info['duration'] - 0.001, 0))
    ad_trim_end_value = ad_range.get('end')
    ad_trim_end = ad_info['duration'] if ad_trim_end_value in (None, '') else float(ad_trim_end_value)
    ad_trim_end = min(max(ad_trim_end, ad_trim_start + 0.001), ad_info['duration'])
    ad_duration = ad_trim_end - ad_trim_start
    start_at = min(max(float(config.get('startAt', 0)), 0), max(source_duration - 0.001, 0))
    placement = config.get('placement') or {}
    chroma = config.get('chromaKey') or {}
    target_width = even(source_info['width'] * float(placement.get('width', 0.25)))
    target_height = even(target_width * ad_info['height'] / max(ad_info['width'], 1))
    x = round(source_info['width'] * float(placement.get('x', 0.7)))
    y = round(source_info['height'] * float(placement.get('y', 0.65)))
    color = str(chroma.get('color', '0x00FF00')).replace('#', '0x')
    similarity = float(chroma.get('similarity', 0.3))
    blend = float(chroma.get('blend', 0.08))
    mode = config.get('mode', 'chroma-key')
    lead = config.get('leadInAudio') or {}
    lead_source_duration = lead_info['duration'] if lead_info else 0
    lead_playback_rate = min(max(float(lead.get('playbackRate', 1)), 0.5), 2.0)
    lead_duration = lead_source_duration / lead_playback_rate if lead_info else 0
    lead_mode = lead.get('mode', 'prelude')
    ad_video_delay = min(max(float(lead.get('adVideoDelay', 0)), 0), max(lead_duration - 0.001, 0))
    lead_play_duration = lead_duration if lead_mode != 'voiceover' else min(lead_duration, ad_video_delay + ad_duration)
    lead_pauses_source = bool(lead_info and lead.get('pauseSource'))
    output_ad_start = start_at + (ad_video_delay if lead_mode == 'voiceover' else lead_play_duration)
    base_duration = source_duration + (lead_play_duration if lead_pauses_source else 0)

    ad_chain = (
        f'[1:v]trim=start={ad_trim_start:.6f}:end={ad_trim_end:.6f},setpts=PTS-STARTPTS,'
        f'scale={target_width}:{target_height}:flags=lanczos,format=rgba'
    )
    if mode == 'chroma-key':
        # The parameter test page measures RGB distance. colorkey also operates in RGB,
        # while chromakey operates in YUV and can make the entire subject translucent
        # with the same similarity value. Scale first to match the Canvas preview order.
        ad_chain += f',colorkey={color}:{similarity:.4f}:{blend:.4f}'

    filters = []
    if lead_pauses_source:
        frame_duration = 1 / max(source_info['fps'], 1)
        hold_start = min(start_at, max(source_duration - frame_duration, 0))
        filters.extend([
            '[0:v]split=3[lead_pre_src][lead_hold_src][lead_post_src]',
            f'[lead_hold_src]trim=start={hold_start:.6f}:end={min(source_duration, hold_start + frame_duration):.6f},'
            f'setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={lead_play_duration:.6f},'
            f'trim=duration={lead_play_duration:.6f}[lead_hold]',
        ])
        parts = []
        if start_at > 0.001:
            filters.append(f'[lead_pre_src]trim=start=0:end={start_at:.6f},setpts=PTS-STARTPTS[lead_pre]')
            parts.append('[lead_pre]')
        else:
            filters.append('[lead_pre_src]nullsink')
        parts.append('[lead_hold]')
        if start_at < source_duration - 0.001:
            filters.append(f'[lead_post_src]trim=start={start_at:.6f},setpts=PTS-STARTPTS[lead_post]')
            parts.append('[lead_post]')
        else:
            filters.append('[lead_post_src]nullsink')
        filters.append(f"{''.join(parts)}concat=n={len(parts)}:v=1:a=0[base_video]")
    else:
        filters.append('[0:v]setpts=PTS-STARTPTS[base_video]')

    ad_pause_start = output_ad_start
    ad_pause_duration = ad_duration if config.get('pauseSource') else 0
    if ad_pause_duration > 0 and lead_pauses_source and lead_mode == 'voiceover':
        lead_pause_end = start_at + lead_play_duration
        ad_pause_start = max(output_ad_start, lead_pause_end)
        ad_pause_duration = max(0, output_ad_start + ad_duration - ad_pause_start)

    if ad_pause_duration > 0.001:
        frame_duration = 1 / max(source_info['fps'], 1)
        hold_start = min(ad_pause_start, max(base_duration - frame_duration, 0))
        filters.extend([
            '[base_video]split=3[ad_pre_src][ad_hold_src][ad_post_src]',
            f'[ad_hold_src]trim=start={hold_start:.6f}:end={min(base_duration, hold_start + frame_duration):.6f},'
            f'setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={ad_pause_duration:.6f},'
            f'trim=duration={ad_pause_duration:.6f}[ad_hold]',
        ])
        parts = []
        if ad_pause_start > 0.001:
            filters.append(f'[ad_pre_src]trim=start=0:end={ad_pause_start:.6f},setpts=PTS-STARTPTS[ad_pre]')
            parts.append('[ad_pre]')
        else:
            filters.append('[ad_pre_src]nullsink')
        parts.append('[ad_hold]')
        if ad_pause_start < base_duration - 0.001:
            filters.append(f'[ad_post_src]trim=start={ad_pause_start:.6f},setpts=PTS-STARTPTS[ad_post]')
            parts.append('[ad_post]')
        else:
            filters.append('[ad_post_src]nullsink')
        filters.append(f"{''.join(parts)}concat=n={len(parts)}:v=1:a=0[timed_video]")
    else:
        filters.append('[base_video]null[timed_video]')

    filters.extend([
        f'{ad_chain},setpts=PTS+{output_ad_start:.6f}/TB[ad_overlay]',
        f'[timed_video][ad_overlay]overlay=x={x}:y={y}:eof_action=pass:shortest=0,'
        f'crop={source_info["width"]}:{source_info["height"]}:0:0,setsar=1,format=yuv420p[vout]',
    ])
    return filters, base_duration + ad_pause_duration, start_at, output_ad_start, ad_duration, lead_play_duration


def build_audio_filter(config, source_info, ad_info, start_at, output_ad_start, ad_duration, lead_info=None):
    audio = config.get('audio') or {}
    ad_volume = float(audio.get('volume', 1))
    source_volume = float(audio.get('sourceVolumeDuringAd', 0.25))
    source_duration = source_info['duration']
    pause_source = bool(config.get('pauseSource'))
    lead = config.get('leadInAudio') or {}
    lead_enabled = lead_info is not None
    lead_source_duration = lead_info['duration'] if lead_info else 0
    lead_playback_rate = min(max(float(lead.get('playbackRate', 1)), 0.5), 2.0)
    lead_duration = lead_source_duration / lead_playback_rate if lead_info else 0
    lead_mode = lead.get('mode', 'prelude')
    ad_video_delay = min(max(float(lead.get('adVideoDelay', 0)), 0), max(lead_duration - 0.001, 0))
    lead_play_duration = lead_duration if lead_mode != 'voiceover' else min(lead_duration, ad_video_delay + ad_duration)
    ad_enabled = bool(audio.get('enabled', True)) and ad_info['has_audio'] and lead_mode != 'voiceover'
    lead_pauses_source = bool(lead_enabled and lead.get('pauseSource'))
    lead_volume = float(lead.get('volume', 1))
    source_volume_during_lead = min(1.0, max(0.0, float(lead.get('sourceVolume', 0.25))))
    lead_volume_transition = min(10.0, max(0.0, float(lead.get('volumeTransitionDuration', 0.5))))
    ad_range = config.get('adRange') or {}
    ad_trim_start = min(max(float(ad_range.get('start', 0)), 0), max(ad_info['duration'] - 0.001, 0))
    ad_trim_end = ad_trim_start + ad_duration

    if not source_info['has_audio'] and not ad_enabled and not lead_enabled:
        return [], None
    filters = []
    if source_info['has_audio']:
        filters.append('[0:a]aformat=sample_rates=48000:channel_layouts=stereo[source_audio]')
    else:
        filters.append(f'{silence(source_duration)}[source_audio]')

    current = 'source_audio'
    current_duration = source_duration
    ad_pause_start = output_ad_start
    ad_pause_duration = ad_duration if pause_source else 0
    if ad_pause_duration > 0 and lead_pauses_source and lead_mode == 'voiceover':
        lead_pause_end = start_at + lead_play_duration
        ad_pause_start = max(output_ad_start, lead_pause_end)
        ad_pause_duration = max(0, output_ad_start + ad_duration - ad_pause_start)

    for prefix, insert_at, insert_duration, should_insert in (
        ('lead', start_at, lead_play_duration, lead_pauses_source),
        ('ad', ad_pause_start, ad_pause_duration, ad_pause_duration > 0),
    ):
        if not should_insert or insert_duration <= 0:
            continue
        filters.append(f'[{current}]asplit=2[{prefix}_pre_src][{prefix}_post_src]')
        parts = []
        if insert_at > 0.001:
            filters.append(f'[{prefix}_pre_src]atrim=start=0:end={insert_at:.6f},asetpts=PTS-STARTPTS[{prefix}_pre]')
            parts.append(f'[{prefix}_pre]')
        else:
            filters.append(f'[{prefix}_pre_src]anullsink')
        filters.append(f'{silence(insert_duration)}[{prefix}_silence]')
        parts.append(f'[{prefix}_silence]')
        if insert_at < current_duration - 0.001:
            filters.append(f'[{prefix}_post_src]atrim=start={insert_at:.6f},asetpts=PTS-STARTPTS[{prefix}_post]')
            parts.append(f'[{prefix}_post]')
        else:
            filters.append(f'[{prefix}_post_src]anullsink')
        next_label = f'{prefix}_base'
        filters.append(f"{''.join(parts)}concat=n={len(parts)}:v=0:a=1[{next_label}]")
        current = next_label
        current_duration += insert_duration

    duck_expressions = []
    if lead_enabled and not lead_pauses_source:
        duck_expressions.append(duck_volume_expression(
            start_at,
            min(current_duration, start_at + lead_play_duration),
            source_volume_during_lead,
            lead_volume_transition,
        ))
    if not pause_source:
        end_at = min(current_duration, output_ad_start + ad_duration)
        duck_expressions.append(duck_volume_expression(output_ad_start, end_at, source_volume, 0))
    if duck_expressions:
        volume_expression = duck_expressions[0]
        for expression in duck_expressions[1:]:
            volume_expression = f'min({volume_expression},{expression})'
        filters.append(f"[{current}]volume='{volume_expression}':eval=frame[base_audio]")
    else:
        filters.append(f'[{current}]anull[base_audio]')

    mix_labels = ['[base_audio]']
    if lead_enabled:
        delay_ms = max(0, int(round(start_at * 1000)))
        lead_input_duration = min(lead_source_duration, lead_play_duration * lead_playback_rate)
        filters.append(
            f'[2:a]atrim=duration={lead_input_duration:.6f},asetpts=PTS-STARTPTS,'
            f'atempo={lead_playback_rate:.6f},atrim=duration={lead_play_duration:.6f},volume={lead_volume:.4f},'
            f'aformat=sample_rates=48000:channel_layouts=stereo,adelay={delay_ms}|{delay_ms}[lead_audio]'
        )
        mix_labels.append('[lead_audio]')
    if ad_enabled:
        delay_ms = max(0, int(round(output_ad_start * 1000)))
        filters.append(
            f'[1:a]atrim=start={ad_trim_start:.6f}:end={ad_trim_end:.6f},'
            f'asetpts=PTS-STARTPTS,volume={ad_volume:.4f},'
            f'aformat=sample_rates=48000:channel_layouts=stereo,adelay={delay_ms}|{delay_ms}[ad_audio]'
        )
        mix_labels.append('[ad_audio]')
    if len(mix_labels) == 1:
        filters.append('[base_audio]anull[aout]')
    else:
        filters.append(
            f"{''.join(mix_labels)}amix=inputs={len(mix_labels)}:duration=first:dropout_transition=0,"
            f'atrim=duration={current_duration:.6f}[aout]'
        )
    return filters, '[aout]'


def run(config_path, output_path):
    with open(config_path, 'r', encoding='utf-8') as handle:
        config = json.load(handle)
    source_path = os.path.abspath(config['sourceVideo'])
    ad_path = os.path.abspath(config.get('adVideo') or config['greenScreenVideo'])
    lead_path_value = (config.get('leadInAudio') or {}).get('path')
    lead_path = os.path.abspath(lead_path_value) if lead_path_value else None
    source_info = probe_media(source_path)
    ad_info = probe_media(ad_path)
    lead_info = probe_audio(lead_path) if lead_path else None
    video_filters, output_duration, start_at, output_ad_start, ad_duration, lead_play_duration = build_video_filter(
        config, source_info, ad_info, lead_info
    )
    subtitle_ass_path = create_subtitle_ass(config, source_info, start_at, lead_play_duration) if lead_info else None
    if subtitle_ass_path:
        video_filters[-1] = video_filters[-1].replace('[vout]', '[video_without_subtitles]')
        video_filters.append(
            f"[video_without_subtitles]subtitles=filename='{escape_filter_path(subtitle_ass_path)}'[vout]"
        )
    audio_filters, audio_map = build_audio_filter(
        config, source_info, ad_info, start_at, output_ad_start, ad_duration, lead_info
    )
    filters = video_filters + audio_filters
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    command = ['ffmpeg', '-y', '-hide_banner', '-i', source_path, '-i', ad_path]
    if lead_path:
        command.extend(['-i', lead_path])
    command.extend(['-filter_complex', ';'.join(filters), '-map', '[vout]'])
    if audio_map:
        command.extend(['-map', audio_map, '-c:a', 'aac', '-b:a', '192k'])
    command.extend([
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', output_path,
    ])

    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding='utf-8',
        errors='replace',
        bufsize=1,
    )
    recent = []
    for line in process.stdout:
        text = line.strip()
        if not text:
            continue
        recent.append(text)
        recent = recent[-80:]
        if text.startswith('out_time_ms='):
            try:
                elapsed = int(text.split('=', 1)[1]) / 1_000_000
                percent = min(99, max(1, int(elapsed / max(output_duration, 0.001) * 100)))
                print(f'PROGRESS {percent}', flush=True)
            except ValueError:
                pass
        elif text.startswith(('frame=', 'speed=', 'progress=')):
            print(text, flush=True)
    return_code = process.wait()
    if subtitle_ass_path:
        try:
            os.remove(subtitle_ass_path)
        except OSError:
            pass
    if return_code != 0:
        raise RuntimeError('FFmpeg 广告合成失败\n' + '\n'.join(recent[-30:]))


def main():
    parser = argparse.ArgumentParser(description='Composite a green-screen advertisement onto a rendered video.')
    parser.add_argument('--config', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    run(args.config, args.output)


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr, flush=True)
        sys.exit(1)

"""Pure advertisement timing rules, mirrored by pages/AdPlacementPage/timeline.ts.

Shared fixtures in tests/ad_timeline_cases.json check both implementations.
All output times are seconds; trim points use original advertisement material time.
"""


def calculate_ad_timeline(values):
    ad_trim_start = min(max(values.get('adTrimStart', 0), 0), max(values['adDuration'] - 0.001, 0))
    ad_trim_end = values.get('adTrimEnd')
    if ad_trim_end is None:
        ad_trim_end = values['adDuration']
    ad_trim_end = min(max(ad_trim_end, ad_trim_start + 0.001), values['adDuration'])
    ad_duration = ad_trim_end - ad_trim_start
    start_at = min(max(values['startAt'], 0), max(values['sourceDuration'] - 0.001, 0))
    rate = min(max(values['leadPlaybackRate'], 0.5), 2.0)
    lead_duration = values['leadDuration'] / rate if values['leadEnabled'] else 0
    delay = min(max(values['adVideoDelay'], 0), max(lead_duration - 0.001, 0))
    lead_play_duration = min(lead_duration, delay + ad_duration) if values['leadMode'] == 'voiceover' else lead_duration
    lead_pauses_source = bool(values['leadEnabled'] and values['leadPauseSource'])
    output_ad_start = start_at + (delay if values['leadMode'] == 'voiceover' else lead_play_duration)
    base_duration = values['sourceDuration'] + (lead_play_duration if lead_pauses_source else 0)
    ad_pause_start = output_ad_start
    if values['pauseSource'] and lead_pauses_source and values['leadMode'] == 'voiceover':
        ad_pause_start = max(output_ad_start, start_at + lead_play_duration)
    ad_pause_duration = max(0, output_ad_start + ad_duration - ad_pause_start) if values['pauseSource'] else 0
    return {
        'adTrimStart': ad_trim_start, 'adTrimEnd': ad_trim_end, 'adDuration': ad_duration,
        'startAt': start_at, 'leadPlaybackRate': rate, 'leadPlaybackDuration': lead_duration,
        'adVideoDelay': delay, 'leadPlayDuration': lead_play_duration, 'leadPausesSource': lead_pauses_source,
        'outputAdStart': output_ad_start, 'baseDuration': base_duration,
        'adPauseStart': ad_pause_start, 'adPauseDuration': ad_pause_duration,
        'outputDuration': base_duration + ad_pause_duration,
    }


def build_ad_timeline(config, source_info, ad_info, lead_info=None):
    """Adapt validated task config/media metadata to the shared timing protocol."""
    ad_range = config.get('adRange') or {}
    lead = config.get('leadInAudio') or {}
    end = ad_range.get('end')
    return calculate_ad_timeline({
        'sourceDuration': source_info['duration'], 'adDuration': ad_info['duration'],
        'adTrimStart': float(ad_range.get('start', 0)),
        'adTrimEnd': None if end in (None, '') else float(end),
        'startAt': float(config.get('startAt', 0)), 'pauseSource': bool(config.get('pauseSource')),
        'leadEnabled': lead_info is not None, 'leadDuration': lead_info['duration'] if lead_info else 0,
        'leadPlaybackRate': float(lead.get('playbackRate', 1)), 'leadMode': lead.get('mode', 'prelude'),
        'adVideoDelay': float(lead.get('adVideoDelay', 0)), 'leadPauseSource': bool(lead.get('pauseSource')),
    })

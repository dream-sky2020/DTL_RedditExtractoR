"""
Qwen3-TTS 封装：懒加载模型，使用 CustomVoice 预设音色合成 WAV。

用法（模块）：
    from qwen_tts_wrapper import synthesize_custom_voice_wav, check_dependencies

用法（命令行）：
    python scripts/qwen_tts_cli.py --text "你好" --output out.wav
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import os
import threading
from typing import Any, Optional, Tuple

_model = None
_model_lock = threading.Lock()


def check_dependencies() -> tuple[bool, str]:
    """轻量检查依赖是否已安装；不在状态接口中加载 PyTorch 或 Qwen 模型。"""
    missing = [name for name in ('torch', 'soundfile', 'qwen_tts') if importlib.util.find_spec(name) is None]
    if missing:
        return False, f"缺少依赖: {', '.join(missing)}"
    return True, ""


def _model_id() -> str:
    return os.environ.get(
        "QWEN_TTS_MODEL",
        "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
    )


def current_tts_model_id() -> str:
    """用于缓存键与清单里的模型标识（与 QWEN_TTS_MODEL 一致）。"""
    return _model_id()


def _resolve_dtype(torch_mod: Any, use_cuda: bool):
    if not use_cuda:
        return torch_mod.float32
    if torch_mod.cuda.is_bf16_supported():
        return torch_mod.bfloat16
    return torch_mod.float16


def get_model():
    """线程安全的懒加载单例。"""
    global _model
    with _model_lock:
        if _model is not None:
            return _model

        import torch
        from qwen_tts import Qwen3TTSModel

        force_cpu = os.environ.get("QWEN_TTS_FORCE_CPU", "").lower() in ("1", "true", "yes")
        use_cuda = torch.cuda.is_available() and not force_cpu
        device_map = (
            os.environ.get("QWEN_TTS_DEVICE", "cuda:0")
            if use_cuda
            else "cpu"
        )
        dtype = _resolve_dtype(torch, use_cuda)

        common_kw: dict[str, Any] = {
            "device_map": device_map,
            "dtype": dtype,
        }

        mid = _model_id()

        def _load(**extra):
            return Qwen3TTSModel.from_pretrained(mid, **common_kw, **extra)

        if use_cuda:
            try:
                _model = _load(attn_implementation="flash_attention_2")
            except Exception:
                _model = _load()
        else:
            _model = _load()

        return _model


def synthesize_custom_voice_wav(
    text: str,
    output_path: str,
    *,
    language: str = "Chinese",
    speaker: str = "Vivian",
    instruct: Optional[str] = None,
) -> Tuple[int, str]:
    """
    使用 CustomVoice 模型生成单声道 WAV。

    Returns:
        (sample_rate, output_path)
    """
    import soundfile as sf

    model = get_model()
    kw: dict[str, Any] = {
        "text": text,
        "language": language,
        "speaker": speaker,
    }
    if instruct and instruct.strip():
        kw["instruct"] = instruct.strip()

    wavs, sr = model.generate_custom_voice(**kw)
    sf.write(output_path, wavs[0], sr)
    return int(sr), output_path


def tts_cache_payload(
    text: str,
    language: str,
    speaker: str,
    instruct: Optional[str],
    *,
    model_id: Optional[str] = None,
) -> str:
    """与音色、文本、模型版本绑定的缓存串（变更任一字段即生成新文件）。"""
    mid = model_id if model_id is not None else _model_id()
    return f"{mid}|{language}|{speaker}|{instruct or ''}|{text}"


def cache_digest(text: str, language: str, speaker: str, instruct: Optional[str]) -> str:
    payload = tts_cache_payload(text, language, speaker, instruct)
    return hashlib.md5(payload.encode("utf-8")).hexdigest()


def cache_filename(text: str, language: str, speaker: str, instruct: Optional[str]) -> str:
    return f"qwen_tts_{cache_digest(text, language, speaker, instruct)}.wav"


def _cli():
    parser = argparse.ArgumentParser(description="Qwen3-TTS CLI（CustomVoice）")
    parser.add_argument("--text", "-t", required=True, help="要合成的文本")
    parser.add_argument("--output", "-o", default="qwen_tts_out.wav", help="输出 WAV 路径")
    parser.add_argument("--language", "-l", default="Chinese", help="例如 Chinese / English")
    parser.add_argument("--speaker", "-s", default="Vivian", help="预设说话人")
    parser.add_argument("--instruct", "-i", default="", help="情感/风格指令（仅部分 1.7B 模型）")
    args = parser.parse_args()

    ok, err = check_dependencies()
    if not ok:
        raise SystemExit(f"依赖未就绪: {err}\n请执行: pip install -r scripts/requirements-qwen-tts.txt")

    sr, path = synthesize_custom_voice_wav(
        args.text,
        args.output,
        language=args.language,
        speaker=args.speaker,
        instruct=args.instruct or None,
    )
    print(f"OK sample_rate={sr} -> {path}")


if __name__ == "__main__":
    _cli()

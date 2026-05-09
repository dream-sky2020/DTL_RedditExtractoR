"""
Qwen TTS 缓存索引：与 public/cache 下的 WAV 配对，结构贴近 audio-manifest.json。
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

WAV_PREFIX_RE = re.compile(r"^qwen_tts_[a-f0-9]{32}\.wav$", re.IGNORECASE)


def manifest_path(cache_dir: str) -> str:
    return os.path.join(cache_dir, "qwen-tts-manifest.json")


def load_manifest(cache_dir: str) -> dict[str, Any]:
    path = manifest_path(cache_dir)
    if not os.path.exists(path):
        return {"version": 1, "items": {}}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return {"version": 1, "items": {}}
        items = data.get("items")
        if not isinstance(items, dict):
            items = {}
        return {"version": int(data.get("version", 1)), "items": items}
    except Exception:
        return {"version": 1, "items": {}}


def save_manifest(cache_dir: str, data: dict[str, Any]) -> None:
    os.makedirs(cache_dir, exist_ok=True)
    path = manifest_path(cache_dir)
    out = {
        "version": data.get("version", 1),
        "items": data.get("items") or {},
        "updatedAt": datetime.now().isoformat(),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)


def digest_from_filename(filename: str) -> Optional[str]:
    if not WAV_PREFIX_RE.match(filename):
        return None
    return filename[9:-4]


def upsert_item(
    cache_dir: str,
    *,
    digest: str,
    filename: str,
    text: str,
    language: str,
    speaker: str,
    instruct: Optional[str],
    model_id: str,
    sample_rate: int,
) -> None:
    manifest = load_manifest(cache_dir)
    items: dict[str, Any] = manifest.setdefault("items", {})
    path = os.path.join(cache_dir, filename)
    size = os.path.getsize(path) if os.path.isfile(path) else 0
    prev = items.get(digest) if isinstance(items.get(digest), dict) else {}
    created = prev.get("createdAt") if isinstance(prev, dict) else None
    items[digest] = {
        "filename": filename,
        "text": text,
        "language": language,
        "speaker": speaker,
        "instruct": instruct or "",
        "modelId": model_id,
        "sampleRate": sample_rate,
        "bytes": size,
        "createdAt": created or datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat(),
    }
    save_manifest(cache_dir, manifest)


def rebuild_items_from_disk(cache_dir: str) -> dict[str, Any]:
    """扫描 cache 目录中的 qwen_tts_*.wav，与 manifest 合并；剔除已无文件的索引。"""
    manifest = load_manifest(cache_dir)
    items: dict[str, Any] = dict(manifest.get("items") or {})

    on_disk: set[str] = set()
    if os.path.isdir(cache_dir):
        for name in os.listdir(cache_dir):
            d = digest_from_filename(name)
            if d:
                on_disk.add(d)

    for digest in list(items.keys()):
        fn = items[digest].get("filename") if isinstance(items[digest], dict) else None
        if not fn or digest not in on_disk:
            items.pop(digest, None)

    for digest in on_disk:
        if digest in items:
            continue
        fname = f"qwen_tts_{digest}.wav"
        fpath = os.path.join(cache_dir, fname)
        if not os.path.isfile(fpath):
            continue
        sr = 0
        try:
            import soundfile as sf

            sr = int(sf.info(fpath).samplerate)
        except Exception:
            pass
        items[digest] = {
            "filename": fname,
            "text": "",
            "language": "",
            "speaker": "",
            "instruct": "",
            "modelId": "",
            "sampleRate": sr,
            "bytes": os.path.getsize(fpath),
            "createdAt": datetime.fromtimestamp(os.path.getmtime(fpath)).isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "unknownMeta": True,
        }

    manifest["items"] = items
    save_manifest(cache_dir, manifest)
    return manifest


def build_index_response(cache_dir: str) -> list[dict[str, Any]]:
    manifest = rebuild_items_from_disk(cache_dir)
    items = manifest.get("items") or {}
    rows: list[dict[str, Any]] = []
    for digest, meta in items.items():
        if not isinstance(meta, dict):
            continue
        rows.append(
            {
                "digest": digest,
                "filename": meta.get("filename"),
                "text": meta.get("text", ""),
                "language": meta.get("language", ""),
                "speaker": meta.get("speaker", ""),
                "instruct": meta.get("instruct", ""),
                "modelId": meta.get("modelId", ""),
                "sampleRate": meta.get("sampleRate"),
                "bytes": meta.get("bytes"),
                "createdAt": meta.get("createdAt"),
                "updatedAt": meta.get("updatedAt"),
                "unknownMeta": bool(meta.get("unknownMeta")),
            }
        )
    rows.sort(key=lambda x: (x.get("updatedAt") or x.get("createdAt") or ""), reverse=True)
    return rows


def delete_digest_entry(cache_dir: str, digest: str) -> tuple[bool, str]:
    """
    删除一条 TTS 缓存：移除 WAV（若存在）并更新 manifest。
    digest 须为 32 位十六进制（与文件名一致）。
    """
    if not re.fullmatch(r"[a-f0-9]{32}", digest, flags=re.IGNORECASE):
        return False, "无效的 digest"

    digest_norm = digest.lower()
    filename = f"qwen_tts_{digest_norm}.wav"
    if not WAV_PREFIX_RE.match(filename):
        return False, "无效的文件名"

    try:
        root = Path(cache_dir).resolve()
        target = (root / filename).resolve()
        target.relative_to(root)
    except ValueError:
        return False, "路径非法"

    manifest = load_manifest(cache_dir)
    items = dict(manifest.get("items") or {})
    for k in list(items.keys()):
        if isinstance(k, str) and k.lower() == digest_norm:
            items.pop(k, None)
    manifest["items"] = items

    if target.is_file():
        try:
            target.unlink()
        except OSError as e:
            save_manifest(cache_dir, manifest)
            return False, f"删除文件失败: {e}"
        save_manifest(cache_dir, manifest)
        return True, "已删除缓存音频与索引"

    save_manifest(cache_dir, manifest)
    return True, "索引已移除（磁盘上无对应文件）"

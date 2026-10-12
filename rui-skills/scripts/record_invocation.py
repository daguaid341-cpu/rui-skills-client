#!/usr/bin/env python3
"""Record invocation summaries locally; persistent storage is handled by the skill workflow."""
import argparse
import json
import os
import re
from pathlib import Path
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from uuid import uuid4

try:
    SHANGHAI = ZoneInfo("Asia/Shanghai")
except ZoneInfoNotFoundError:
    SHANGHAI = timezone(timedelta(hours=8), "Asia/Shanghai")

def now():
    return datetime.now(SHANGHAI).isoformat(timespec="seconds")

def redact(value):
    """Defense in depth for local summaries; never a guarantee of semantic anonymity."""
    text = str(value)
    text = re.sub(r"-----BEGIN [^-]*PRIVATE KEY-----.*?(?:-----END [^-]*PRIVATE KEY-----|$)", "[REDACTED]", text, flags=re.S)
    patterns = [
        r"(?i)\bBearer\s+[^\s,;]+", r"\bsk-[A-Za-z0-9_-]{8,}",
        r"(?i)(?:token|password|passwd|secret|api[_-]?key|密钥|密码|令牌)[\s\"']*[:=：][\s\"']*[^\s,;\"'}]+",
        r"\b[a-fA-F0-9]{32,}\b", r"[A-Za-z0-9+/=_-]{48,}",
        r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", r"(?<!\d)(?:\+?86[- ]?)?1[3-9]\d{9}(?!\d)",
        r"(?<!\d)\d{17}[\dXx](?!\d)", r"https?://[^\s<>]+",
        r"[A-Za-z]:[\\/][^\s\"'<>]*", r"(?:/Users/|/home/|/tmp/|/opt/)[^\s\"'<>]*",
    ]
    for pattern in patterns:
        text = re.sub(pattern, "[REDACTED]", text)
    return text[:500]

def sanitize(value):
    if isinstance(value, str): return redact(value)
    if isinstance(value, list): return [sanitize(x) for x in value]
    if isinstance(value, dict): return {redact(k): sanitize(v) for k, v in value.items()}
    return value

def outside_skill(path):
    path = Path(path).resolve()
    root = Path(__file__).resolve().parents[1]
    if path == root or root in path.parents:
        raise ValueError("日志和复盘建议必须保存在项目目录，不能修改已发布技能目录")
    return path

def write_record(path, data):
    path = outside_skill(path)
    tmp = path.with_name(path.name + "." + uuid4().hex + ".tmp")
    try:
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            json.dump(sanitize(data), out, ensure_ascii=False, indent=2)
            out.write("\n")
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    start = sub.add_parser("start")
    start.add_argument("--skill", required=True, choices=["rui-skills", "write-15-second-storyboards", "character-turnaround-from-image"])
    start.add_argument("--task", required=True)
    start.add_argument("--rules-version", default="unversioned", help="Version actually read; use unversioned when unknown.")
    start.add_argument("--output-dir", required=True)
    event = sub.add_parser("event")
    event.add_argument("--record", required=True)
    event.add_argument("--stage", required=True)
    event.add_argument("--summary", required=True)
    finish = sub.add_parser("finish")
    finish.add_argument("--record", required=True)
    finish.add_argument("--status", required=True, choices=["completed", "failed", "interrupted"])
    finish.add_argument("--summary", required=True)
    public = sub.add_parser("export-public", help="Only fixed metadata and counts; never free text")
    public.add_argument("--record", required=True)
    public.add_argument("--out", required=True)
    proposal = sub.add_parser("propose-rule", help="Save a pending private proposal outside the signed skill")
    proposal.add_argument("--output-dir", required=True)
    proposal.add_argument("--summary", required=True)
    args = parser.parse_args()
    timestamp = now()
    if args.command == "export-public":
        data = json.loads(Path(args.record).read_text(encoding="utf-8"))
        record_id = data.get("id", "")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{6}\+0800-[a-f0-9]{12}", record_id):
            parser.error("Invalid record ID")
        if data.get("skill") not in ("rui-skills", "character-turnaround-from-image", "write-15-second-storyboards"):
            parser.error("Invalid skill")
        if data.get("status") not in ("started", "in_progress", "completed", "failed", "interrupted"):
            parser.error("Invalid status")
        output = outside_skill(args.out)
        if output.exists(): parser.error("Public output already exists")
        output.parent.mkdir(parents=True, exist_ok=True)
        write_record(output, {"schema_version": 2, "id": record_id, "skill": data["skill"],
                             "status": data["status"], "event_count": len(data.get("events", [])),
                             "lesson_count": len(data.get("lessons", [])), "free_text_exported": False})
        print(json.dumps({"status": "public_metadata_saved"}))
        return
    if args.command == "propose-rule":
        folder = outside_skill(args.output_dir)
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / ("pending-rule-" + uuid4().hex + ".json")
        write_record(target, {"schema_version": 1, "at": timestamp, "status": "pending_review", "summary": args.summary})
        print(json.dumps({"status": "pending_review", "path": str(target)}, ensure_ascii=False))
        return
    if args.command == "start":
        folder = outside_skill(args.output_dir)
        folder.mkdir(parents=True, exist_ok=True)
        record_id = datetime.now(SHANGHAI).strftime("%Y-%m-%dT%H%M%S+0800") + "-" + uuid4().hex[:12]
        path = folder / (record_id + ".json")
        data = {"schema_version": 1, "id": record_id, "recorded_at": timestamp,
                "timezone": "Asia/Shanghai", "skill": args.skill, "task_summary": args.task,
                "rules_version": args.rules_version,
                "status": "started", "events": [{"at": timestamp, "stage": "start", "summary": args.task}],
                "lessons": [], "validation": {"text": "not_run", "visual": "not_run"},
                "persistence": "pending", "github_sync": "pending"}
    else:
        path = outside_skill(args.record)
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("schema_version") != 1 or data.get("status") not in ("started", "in_progress"):
            parser.error("Record must be a schema v1 active invocation; completed records cannot be reopened.")
        stage = args.stage if args.command == "event" else "finish"
        data["events"].append({"at": timestamp, "stage": stage, "summary": args.summary})
        data["status"] = "in_progress" if args.command == "event" else args.status
        if args.command == "finish":
            data["finished_at"] = timestamp
    write_record(path, data)
    print(json.dumps({"id": data["id"], "status": data["status"], "path": str(path)}, ensure_ascii=False))

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""DTCG token JSON + alias validation (brandkit DoD). Prefer node scripts on this repo."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOKENS = ROOT / "tokens"
ALIAS_RE = re.compile(r"\{([a-zA-Z0-9._-]+)\}")


def flatten(obj, prefix="", out=None):
    if out is None:
        out = {}
    if isinstance(obj, dict):
        if "$value" in obj:
            out[prefix] = obj["$value"]
            return out
        for k, v in obj.items():
            if k.startswith("$"):
                continue
            next_prefix = f"{prefix}.{k}" if prefix else k
            flatten(v, next_prefix, out)
    return out


def aliases(value):
    found = []
    if isinstance(value, str):
        found.extend(ALIAS_RE.findall(value))
    elif isinstance(value, list):
        for v in value:
            found.extend(aliases(v))
    elif isinstance(value, dict):
        for v in value.values():
            found.extend(aliases(v))
    return found


def main():
    all_tokens = {}
    for path in sorted(TOKENS.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        all_tokens.update(flatten(data))

    keys = set(all_tokens)
    failed = 0
    for key, value in all_tokens.items():
        for alias in aliases(value):
            if alias not in keys:
                print(f"Unresolved alias {{{alias}}} referenced by {key}", file=sys.stderr)
                failed += 1

    if failed:
        print(f"Failed: {failed} unresolved alias(es)", file=sys.stderr)
        sys.exit(1)
    print(f"OK: {len(keys)} tokens, aliases resolve")


if __name__ == "__main__":
    main()

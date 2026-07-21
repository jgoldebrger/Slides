#!/usr/bin/env python3
"""Contrast gate wrapper — delegates to Node when Python color libs unavailable."""
import subprocess
import sys
from pathlib import Path

script = Path(__file__).with_name("validate_contrast.cjs")
sys.exit(subprocess.call(["node", str(script)]))

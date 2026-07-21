#!/usr/bin/env python3
"""Theme ref gate wrapper — delegates to Node."""
import subprocess
import sys
from pathlib import Path

script = Path(__file__).with_name("validate_theme_refs.cjs")
sys.exit(subprocess.call(["node", str(script)]))

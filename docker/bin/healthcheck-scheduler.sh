#!/usr/bin/env sh
set -eu

pgrep -f "artisan schedule:work" >/dev/null 2>&1

#!/usr/bin/env python3
"""Real Pi 1.0.2 picker checks, isolated settings and no model requests."""
import argparse
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import tempfile
import time

parser = argparse.ArgumentParser()
parser.add_argument('--fullscreen', action='store_true')
parser.add_argument('--takeover', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
socket = 'picker-qa-' + str(os.getpid())

def tmux(*args):
    return subprocess.check_output(['tmux', '-L', socket, *args], text=True)

def capture():
    time.sleep(.6)
    text = re.sub(r'\x1b\[[0-9;]*m', '', tmux('capture-pane', '-p', '-t', 'qa'))
    assert 'Extension error' not in text and 'Failed to load extension' not in text, text
    return text

def command(text):
    tmux('send-keys', '-t', 'qa', '-l', text)
    tmux('send-keys', '-t', 'qa', 'Escape', 'Enter')
    return capture()

for scoped in (False, True):
    with tempfile.TemporaryDirectory(prefix='pi-picker-qa-') as temp:
        Path(temp, 'settings.json').write_text(json.dumps({
            'extensions': [str(root / 'test/fixtures/providers.ts'), str(root / 'extensions/index.ts')],
            'theme': 'dark', 'defaultThinkingLevel': 'off',
        }))
        if args.takeover:
            Path(temp, 'keybindings.json').write_text(json.dumps({'app.model.select': 'ctrl+alt+l', 'app.tree.filter.labeledOnly': 'ctrl+shift+l'}))
        launch = ['env', 'PI_CODING_AGENT_DIR=' + temp, 'PI_OFFLINE=1', 'PI_PROVIDER_MODEL_PICKER_SHORTCUT=' + ('ctrl+l' if args.takeover else 'alt+m'),
                  'pi', '--no-session', '--no-context-files', '--no-approve',
                  '--provider', 'picker-one', '--model', 'alpha']
        if args.fullscreen:
            launch += ['--tui-mode', 'fullscreen']
        if scoped:
            launch += ['--models', 'picker-one/alpha:low,picker-two/beta:high']
        try:
            tmux('new-session', '-d', '-s', 'qa', '-x', '110', '-y', '40', '-c', temp, shlex.join(launch))
            time.sleep(3)
            text = command('/pm')
            assert 'grouped by provider' in text and 'picker-one alpha' in text, text
            tmux('send-keys', '-t', 'qa', 'Tab')
            text = capture()
            assert 'picker-two beta' in text, text
            if not scoped:
                tmux('send-keys', '-t', 'qa', '-l', 'beta')
                assert 'filter: beta' in capture()
            tmux('send-keys', '-t', 'qa', 'Enter')
            text = command('/picker-status')
            expected = 'high' if scoped else 'off'
            assert f'PICKER-STATUS:picker-two/beta:{expected}' in text, text
            # Shortcut, narrow render, and cancellation must retain the model.
            tmux('send-keys', '-t', 'qa', 'C-l' if args.takeover else 'M-m')
            text = capture()
            assert 'grouped by provider' in text, text
            tmux('resize-window', '-t', 'qa', '-x', '36', '-y', '40')
            assert 'Switch model' in capture()
            tmux('send-keys', '-t', 'qa', 'Escape')
            tmux('resize-window', '-t', 'qa', '-x', '110', '-y', '40')
            text = command('/picker-status')
            assert f'PICKER-STATUS:picker-two/beta:{expected}' in text, text
            print(f'PASS: Pi 1.0.2 picker, scoped={scoped}, fullscreen={args.fullscreen}, tabs/filter/select/thinking/shortcut/resize/cancel')
        finally:
            subprocess.run(['tmux', '-L', socket, 'kill-server'], capture_output=True)

from pathlib import Path
from textwrap import dedent
import re

root = Path('/home/ubuntu/ELYKIA/user-guide/docs')
pages = [
    'recovery-manager/index.md',
    'recovery-manager/web.md',
    'recovery-manager/mobile.md',
]

parts = [
    '# Guide Chef de recouvrement — édition imprimable',
    '',
    'Cette édition regroupe les pages canoniques du guide Chef de recouvrement. Vérifiez la date de mise à jour du site avant toute impression ou diffusion.',
    '',
]

for page in pages:
    content = (root / page).read_text(encoding='utf-8').strip()
    content = re.sub(r'\[([^\]]+)\]\((?!https?://)[^)]+\)', r'\1', content)
    lines = content.splitlines()
    if lines and lines[0].startswith('# '):
        lines[0] = '## ' + lines[0][2:]
    parts.extend(lines)
    parts.append('')

output = root / 'print_versions/guide_complet_recovery_manager.md'
output.write_text('\n'.join(parts).rstrip() + '\n', encoding='utf-8')
print(output)

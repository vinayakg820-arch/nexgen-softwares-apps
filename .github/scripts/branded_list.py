# Turns the claimed build list into "id<TAB>app<TAB>code<TAB>safe name" lines and saves each logo to logo-<id>
import json

for b in json.load(open('builds.json'))['builds']:
    name = b['name']
    for ch in ['\\', '"', "'", '<', '>', '\t', '\n']:
        name = name.replace(ch, '')
    name = name.replace('&', ' and ').strip()[:30] or 'NexGen'
    print('\t'.join([b['id'], b['app'], b['code'], name]))
    with open('logo-' + b['id'], 'w') as f:
        f.write(b.get('logo') or '')

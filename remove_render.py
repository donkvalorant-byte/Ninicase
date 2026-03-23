from pathlib import Path
path = Path('public/app.js')
text = path.read_text()
needle = 'function renderCaseCatalog(cases) {'
first = text.find(needle)
second = text.find(needle, first + len(needle))
if first == -1 or second == -1:
    raise SystemExit('needle not found twice')
path.write_text(text[:first] + text[second:])

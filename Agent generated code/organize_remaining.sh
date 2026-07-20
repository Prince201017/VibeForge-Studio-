#!/bin/bash

echo "Organizing remaining files..."

# Move JSON particle presets
mkdir -p ../lib/particles/presets
mv *.json ../lib/particles/presets/ 2>/dev/null

# Move GLSL shaders
mkdir -p ../lib/particles/shaders
mv *.glsl ../lib/particles/shaders/ 2>/dev/null

# Move CSS files
mkdir -p ../styles
mv globals.css responsive.css ../styles/ 2>/dev/null

# Move config files
mkdir -p ../config
mv docker-compose.yml postcss.config.js ../config/ 2>/dev/null

# Move Python cache files to utils
mkdir -p ../lib/utils/cache
mv *.pyc ../lib/utils/cache/ 2>/dev/null

# Move Jinja2 templates to export
mkdir -p ../lib/export/templates
mv *.jinja2 ../lib/export/templates/ 2>/dev/null

# Move requirements files
mkdir -p ../python-service/config
cp requirements.txt requirements-dev.txt ../python-service/config/ 2>/dev/null

# Move pytest config
cp pytest.ini ../python-service/config/ 2>/dev/null

# Move package.json to reference (keep it for comparison)
cp package.json ../config/package.generated.json 2>/dev/null

echo "✅ All remaining files organized"

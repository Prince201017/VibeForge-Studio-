#!/bin/bash

SOURCE="Agent generated code"
cd "$SOURCE" 2>/dev/null || exit 1

# Move SQL files to migrations
mkdir -p ../python-service/migrations
mv *.sql ../python-service/migrations/ 2>/dev/null

# Move Python files to python-service
mkdir -p ../python-service/{routes,services,models,utils}
for file in *.py; do
  if [[ "$file" == *"route"* ]] || [[ "$file" == *"api"* ]]; then
    mv "$file" ../python-service/routes/ 2>/dev/null
  elif [[ "$file" == *"service"* ]] || [[ "$file" == *"generator"* ]] || [[ "$file" == *"manager"* ]]; then
    mv "$file" ../python-service/services/ 2>/dev/null
  elif [[ "$file" == *"model"* ]]; then
    mv "$file" ../python-service/models/ 2>/dev/null
  else
    mv "$file" ../python-service/utils/ 2>/dev/null
  fi
done

# Move TSX test files to tests
mkdir -p ../tests/{ui,components}
mv *.test.tsx ../tests/ui/ 2>/dev/null

# Move Storybook stories
mkdir -p ../stories/ui
mv *.stories.tsx ../stories/ui/ 2>/dev/null

# Move remaining TSX files to components
mkdir -p ../components/{ui,panels,asset-manager,collaboration,mobile}

# UI Components
for file in Alert.tsx Badge.tsx Button.tsx Card.tsx Checkbox.tsx ColorPicker.tsx Dialog.tsx Dropdown.tsx Form.tsx Input.tsx Label.tsx Modal.tsx Pagination.tsx Progress.tsx Radio.tsx Select.tsx Slider.tsx Spinner.tsx Switch.tsx Tab.tsx Table.tsx Tag.tsx Textarea.tsx Toast.tsx Tooltip.tsx BottomSheet.tsx Breadcrumb.tsx; do
  [ -f "$file" ] && mv "$file" ../components/ui/ 2>/dev/null
done

# Asset Manager components
for file in Asset*.tsx; do
  [ -f "$file" ] && mv "$file" ../components/asset-manager/ 2>/dev/null
done

# Collaboration components
for file in Collaboration*.tsx Comment*.tsx Presence*.tsx; do
  [ -f "$file" ] && mv "$file" ../components/collaboration/ 2>/dev/null
done

# Move remaining TSX files to components/ui
mv *.tsx ../components/ui/ 2>/dev/null

# Move TypeScript logic files to lib
mkdir -p ../lib/{geometry,animation,ai,renderer,particles,export,assets,collaboration,utils}

# Move from Agent generated code any remaining TS files
mv *.ts ../lib/utils/ 2>/dev/null

# Move documentation
mkdir -p ../docs/guides
mv *.md ../docs/guides/ 2>/dev/null

echo "✅ Organization complete"

# NEED 10: DATABASE & SCHEMA - PostgreSQL Database Layer

## System Overview
Complete PostgreSQL database schema, migrations, and data models for ForgeOS using Neon with proper indexing and relationships.

## What Goes In This System
- Project and workspace schema
- Layer and asset schema
- Animation and keyframe schema
- User and collaboration schema
- History and versioning schema
- Settings and preferences schema
- Database migrations
- Seed data
- Performance indexes

## Files to Create
- `python-service/models/database.py` - Database models (SQLAlchemy)
- `migrations/versions/001_initial_schema.py` - Initial schema
- `migrations/versions/002_add_collaboration.py` - Collaboration tables
- `migrations/versions/003_add_indexing.py` - Performance indexes
- `migrations/env.py` - Alembic config
- `scripts/seed_database.py` - Seed script
- `tests/database.test.ts` - Tests (70%+ coverage)

## LOC Target: 1500-2000 lines (SQL + Python)

## Quality Standards
- Proper indexing for performance
- Foreign key constraints
- Cascading deletes where appropriate
- Default values and constraints
- Check constraints for validation
- Transaction support

## Core Tables

### Users & Auth
```
users
- id (UUID primary key)
- email (unique)
- password_hash
- name
- avatar_url
- role (admin, user)
- created_at
- updated_at
- deleted_at (soft delete)
```

### Projects & Workspaces
```
projects
- id (UUID)
- owner_id (foreign key → users)
- name
- description
- thumbnail_url
- is_public
- created_at
- updated_at

workspaces
- id (UUID)
- user_id (foreign key → users)
- name
- color
- created_at
```

### Layers
```
layers
- id (UUID)
- project_id (foreign key → projects)
- parent_id (foreign key → layers, self-referential)
- name
- type (geometry, animation, particle, etc)
- properties (JSONB)
- opacity
- blend_mode
- locked
- visible
- order (for layer ordering)
- created_at
- updated_at
```

### Animations
```
animations
- id (UUID)
- project_id (foreign key → projects)
- layer_id (foreign key → layers)
- name
- duration (milliseconds)
- delay
- easing
- loop_count
- properties (JSONB - all keyframe data)
- created_at
- updated_at

keyframes
- id (UUID)
- animation_id (foreign key → animations)
- property_name (position, opacity, rotation, etc)
- time (milliseconds)
- value (JSONB)
- easing
- order
```

### Particles
```
particles
- id (UUID)
- project_id (foreign key → projects)
- layer_id (foreign key → layers)
- emitter_type (point, mesh, image, etc)
- effect_type (fire, smoke, rain, etc)
- parameters (JSONB)
- created_at
- updated_at
```

### Assets
```
assets
- id (UUID)
- project_id (foreign key → projects)
- user_id (foreign key → users)
- name
- file_type (image, video, model, etc)
- file_size
- url (Blob storage URL)
- thumbnail_url
- metadata (JSONB - colors, dimensions, duration, etc)
- created_at
- updated_at

asset_versions
- id (UUID)
- asset_id (foreign key → assets)
- version_number
- url
- created_at
- created_by (foreign key → users)

asset_tags
- id (UUID)
- name
- color
- user_id (foreign key → users)

asset_tag_map
- asset_id (foreign key → assets)
- tag_id (foreign key → asset_tags)
```

### History & Undo/Redo
```
history_entries
- id (UUID)
- project_id (foreign key → projects)
- user_id (foreign key → users)
- operation_type (create, update, delete, etc)
- entity_type (layer, animation, particle, etc)
- entity_id (UUID)
- changes (JSONB - before/after state)
- timestamp
- order (for undo/redo stack)
```

### Collaboration
```
project_members
- project_id (foreign key → projects)
- user_id (foreign key → users)
- role (owner, editor, viewer, commenter)
- joined_at

comments
- id (UUID)
- project_id (foreign key → projects)
- layer_id (foreign key → layers)
- user_id (foreign key → users)
- text
- resolved (boolean)
- created_at
- updated_at
- resolved_by (foreign key → users, nullable)
- resolved_at (nullable)

operations_log
- id (UUID)
- project_id (foreign key → projects)
- user_id (foreign key → users)
- operation (JSONB - full operation data)
- timestamp
- order (for operational transform)
```

### Settings & Preferences
```
user_preferences
- user_id (foreign key → users, primary key)
- theme (light, dark)
- language
- notifications_enabled
- auto_save_interval
- ui_layout
- settings (JSONB - other preferences)

project_settings
- project_id (foreign key → projects, primary key)
- grid_size
- snap_to_grid
- show_guides
- auto_save_enabled
- settings (JSONB)
```

## Indexes Required
- users(email) - unique
- projects(owner_id)
- projects(created_at)
- layers(project_id)
- layers(parent_id)
- animations(project_id)
- animations(layer_id)
- keyframes(animation_id)
- keyframes(time)
- assets(project_id)
- assets(user_id)
- asset_tags(name)
- comments(project_id)
- comments(resolved)
- history_entries(project_id)
- history_entries(timestamp)
- operations_log(project_id)
- operations_log(timestamp)

## API Endpoints (For Reference)
- Database operations hidden behind service layer
- All queries parameterized (prevent SQL injection)
- Connection pooling (Neon)
- Transaction management

## Deliverables Checklist
- All tables created
- All relationships defined
- All constraints applied
- All indexes created
- Migrations working
- Seed data populated
- Performance optimized
- Foreign keys working
- Cascading deletes working
- Soft deletes working
- JSONB columns working
- All tests passing

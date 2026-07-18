# Database Schema & Persistence Needs

## Scope
Complete Neon PostgreSQL schema for project persistence, user data, layers, animations, history, and collaboration. Type-safe migrations, transaction handling, and efficient querying.

## Target
- 1500-2000 LOC (schema + migrations + queries)
- Support 1 million projects
- Support 100K layers per project
- Support complex queries with joins
- Transaction safety for concurrent operations

## Database Design

### Users & Authentication
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  full_name VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Projects
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  view_count INT DEFAULT 0,
  total_layers INT DEFAULT 0,
  total_size BIGINT DEFAULT 0
);

CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
```

### Collaborators & Permissions
```sql
CREATE TYPE role_type AS ENUM ('owner', 'editor', 'viewer', 'commenter');

CREATE TABLE project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role role_type NOT NULL,
  invited_at TIMESTAMP DEFAULT NOW(),
  joined_at TIMESTAMP,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(project_id, user_id)
);

CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  role role_type NOT NULL,
  token VARCHAR UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  access_count INT DEFAULT 0
);
```

### Layers & Canvas Data
```sql
CREATE TYPE layer_type AS ENUM ('group', 'shape', 'image', 'text', 'vector', 'video', 'model_3d', 'particle', 'component');

CREATE TABLE layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_layer_id UUID REFERENCES layers(id) ON DELETE CASCADE,
  layer_type layer_type NOT NULL,
  name VARCHAR NOT NULL,
  display_index INT NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  is_locked BOOLEAN DEFAULT FALSE,
  opacity FLOAT DEFAULT 1.0,
  blend_mode VARCHAR DEFAULT 'normal',
  transform_matrix JSONB DEFAULT '{}',
  properties JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_layers_project_id ON layers(project_id);
CREATE INDEX idx_layers_parent_id ON layers(parent_layer_id);
CREATE INDEX idx_layers_display_order ON layers(project_id, parent_layer_id, display_index);
```

### Animations & Keyframes
```sql
CREATE TABLE animations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  property_name VARCHAR NOT NULL,
  duration_ms INT NOT NULL,
  delay_ms INT DEFAULT 0,
  easing_type VARCHAR NOT NULL,
  loop_count INT DEFAULT 1,
  yoyo BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE keyframes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animation_id UUID NOT NULL REFERENCES animations(id) ON DELETE CASCADE,
  time_ms INT NOT NULL,
  value JSONB NOT NULL,
  easing VARCHAR,
  interpolation VARCHAR DEFAULT 'linear'
);

CREATE INDEX idx_keyframes_animation ON keyframes(animation_id, time_ms);
```

### Geometry Operations
```sql
CREATE TABLE geometry_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  operation_type VARCHAR NOT NULL,
  parameters JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_index INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_geom_ops_layer ON geometry_operations(layer_id, sort_index);
```

### Particles & Effects
```sql
CREATE TABLE particle_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  emitter_type VARCHAR NOT NULL,
  particle_count INT DEFAULT 1000,
  lifetime_ms INT DEFAULT 2000,
  physics_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### History & Versions
```sql
CREATE TABLE operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  operation_index BIGSERIAL NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  operation_type VARCHAR NOT NULL,
  operation_data JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  parent_operation_id UUID REFERENCES operations(id),
  lamport_time INT
);

CREATE UNIQUE INDEX idx_operation_index ON operations(project_id, operation_index);
CREATE INDEX idx_operations_timestamp ON operations(project_id, timestamp DESC);

CREATE TABLE versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR,
  description TEXT,
  snapshot JSONB NOT NULL,
  operation_count INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  is_auto_save BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_versions_project ON versions(project_id, created_at DESC);
```

### Comments & Annotations
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  layer_id UUID REFERENCES layers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comments_layer ON comments(layer_id, created_at DESC);

CREATE TABLE comment_mentions (
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(comment_id, mentioned_user_id)
);
```

### Assets
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  asset_type VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  file_url VARCHAR NOT NULL,
  thumbnail_url VARCHAR,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  usage_count INT DEFAULT 0
);

CREATE INDEX idx_assets_project ON assets(project_id);
CREATE INDEX idx_assets_type ON assets(project_id, asset_type);
```

### Notifications
```sql
CREATE TYPE notification_type AS ENUM ('comment', 'mention', 'share', 'permission', 'join', 'export');

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  related_user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
```

### Audit Logging
```sql
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'share', 'permission_change');

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  resource_type VARCHAR NOT NULL,
  resource_id UUID NOT NULL,
  action audit_action NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id, created_at DESC);
```

## Migrations Required

### Migration 1: Core Schema (v1)
- Create all base tables (users, projects, layers)
- Create primary indexes
- Create constraints

### Migration 2: Collaboration (v2)
- Add collaborators, share_links
- Add operations table
- Add comments table

### Migration 3: Advanced Features (v3)
- Add animations, keyframes
- Add geometry_operations
- Add particle_systems
- Add versions table

### Migration 4: Assets & Notifications (v4)
- Add assets table
- Add notifications table
- Add audit_logs table

## Query Patterns

### Get Project with Full Hierarchy
```sql
WITH RECURSIVE layer_tree AS (
  SELECT id, project_id, parent_layer_id, name, display_index, 0 as depth
  FROM layers WHERE project_id = $1 AND parent_layer_id IS NULL
  UNION ALL
  SELECT l.id, l.project_id, l.parent_layer_id, l.name, l.display_index, lt.depth + 1
  FROM layers l
  INNER JOIN layer_tree lt ON l.parent_layer_id = lt.id
)
SELECT * FROM layer_tree ORDER BY depth, display_index;
```

### Get Active Collaborators
```sql
SELECT u.id, u.full_name, u.avatar_url, pc.role
FROM project_collaborators pc
JOIN users u ON pc.user_id = u.id
WHERE pc.project_id = $1 AND u.id != $2
ORDER BY pc.joined_at DESC;
```

### Get Recent Operations
```sql
SELECT * FROM operations
WHERE project_id = $1 AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY operation_index DESC
LIMIT 100;
```

## Performance Optimization

### Indexes
- Composite indexes on frequent queries (project_id, created_at)
- Partial indexes for is_active = true
- BRIN indexes for time-series data
- GiST indexes for JSONB queries

### Partitioning
- Partition operations by project_id (millions of rows)
- Partition audit_logs by date (rolling window)
- Partition versions by project_id

### Query Optimization
- Materialized views for frequently joined data
- Connection pooling (pgBouncer)
- Query result caching (Redis layer)
- Batch operations where possible

## File Structure
```
python-service/db/
├── __init__.py (database connection)
├── migrations/
│   ├── 001_init_schema.sql
│   ├── 002_add_collaboration.sql
│   ├── 003_add_animations.sql
│   └── 004_add_assets.sql
├── models.py (SQLAlchemy models)
├── queries.py (complex queries)
└── utils.py (connection, transaction helpers)

python-service/services/
├── db_service.py (CRUD operations)
├── transaction_manager.py (transaction handling)
└── query_optimizer.py (query optimization)
```

## Connection & Transaction Management

### Connection Pooling
```python
pool = create_pool(
  min_size=10,
  max_size=50,
  timeout=10,
  recycle=300
)
```

### Transaction Safety
```python
async with pool.acquire() as conn:
  async with conn.transaction():
    await conn.execute(...)
```

## Backup & Recovery

### Backup Strategy
- Daily automated backups
- Point-in-time recovery (7 days)
- Backup to separate region
- Test restore procedures

### Data Retention
- Active projects: indefinite
- Deleted projects: 30 days (soft delete)
- Audit logs: 1 year
- Versions: configurable by project

## Quality Standards
- Zero data loss guarantee
- ACID compliance for transactions
- Foreign key constraints enforced
- Migrations tested before deploy
- [AgentName] tags in SQL comments
- Performance benchmarks

## Constraints
- Max 10 concurrent connections per user
- Query timeout: 30 seconds
- Transaction timeout: 2 minutes
- Storage quota: project size limits enforced

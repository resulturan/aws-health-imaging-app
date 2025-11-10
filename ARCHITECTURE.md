# Architecture Documentation

## System Overview

This application provides a secure, scalable interface for managing and viewing medical images stored in AWS HealthImaging datastores.

## Key Design Decisions

### 1. Security Architecture

#### Credential Encryption
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Why**: Provides both confidentiality and authenticity
- **Key Derivation**: scrypt for deriving encryption key from environment variable
- **Storage Format**: `iv:authTag:encryptedData` for easy parsing

```typescript
// Encryption flow
User Input (AWS Creds)
  → Validate Format
  → JSON.stringify
  → AES-256-GCM Encrypt
  → Store in Database (PostgreSQL)
```

#### Access Control Flow
```
User Request
  → JWT Verification
  → Role Check (RBAC)
  → Source Ownership/Grant Check
  → Decrypt Credentials (if authorized)
  → Use Credentials for AWS API
```

### 2. Data Flow

#### Patient Search Flow
```
Frontend → RTK Query
  ↓
Backend API (/patients)
  ↓
Check User Access → Get Credentials → Decrypt
  ↓
AWS Medical Imaging Client
  ↓
SearchImageSets API
  ↓
Transform & Group by Patient
  ↓
Cache in Redis (metadata)
  ↓
Return to Frontend
```

#### DICOM Frame Retrieval
```
Frontend (Viewer)
  ↓
GET /dicom-proxy/frames/:imageSetId/:frameId?sourceId=X
  ↓
Auth Middleware → Check Access
  ↓
Get Decrypted Credentials (from cache or decrypt)
  ↓
AWS GetImageFrame Command
  ↓
Stream Response to Frontend
```

### 3. Caching Strategy

#### Redis Cache Layers

1. **Decrypted Credentials** (15 min TTL)
   - Key: `credentials:{sourceId}`
   - Purpose: Reduce decryption overhead
   - Invalidation: On source update/delete

2. **Study Metadata** (1 hour TTL)
   - Key: `metadata:{sourceId}:{imageSetId}`
   - Purpose: Reduce AWS API calls
   - Invalidation: Manual or TTL

3. **DICOM Metadata** (1 hour TTL)
   - Key: `dicom-metadata:{sourceId}:{imageSetId}`
   - Purpose: Viewer performance

### 4. Database Design

#### Multi-Tenancy Model
- Each user can own multiple `ImagingSource` records
- `AccessGrant` table manages fine-grained permissions
- No shared credentials between users

#### Relationships
```
User (1) ────── (N) ImagingSource
                     ↓
                     ↓ (1)
                     ↓
User (N) ────── (N) AccessGrant
```

### 5. Frontend Architecture

#### State Management
```
Redux Store
├── api (RTK Query)
│   ├── Auth endpoints
│   ├── Sources endpoints
│   ├── Patients endpoints
│   └── Studies endpoints
└── auth (slice)
    ├── user
    ├── token
    └── isAuthenticated
```

#### Component Structure
```
App
├── MainLayout
│   ├── Sider (Navigation)
│   ├── Header (User menu)
│   └── Content
│       ├── SourcesPage
│       ├── PatientsPage
│       └── ViewerPage
├── LoginPage
└── RegisterPage
```

## Scalability Considerations

### Horizontal Scaling

#### Backend
- Stateless design (JWT tokens)
- Redis for shared cache
- Load balancer ready
- Can run multiple instances

#### Database
- PostgreSQL supports read replicas
- Connection pooling via Prisma
- Indexes on frequently queried fields

### Performance Optimizations

1. **RTK Query Caching**
   - Automatic request deduplication
   - Cache invalidation tags
   - Background refetching

2. **Redis Caching**
   - Reduces database load
   - Speeds up credential retrieval
   - Metadata caching

3. **Lazy Loading**
   - React Router code splitting (can be added)
   - Pagination for large datasets
   - Expandable tables for studies

### AWS API Rate Limiting
- Implement exponential backoff
- Queue requests if needed
- Cache aggressively

## Security Layers

### Layer 1: Transport Security
- HTTPS (in production)
- Secure cookies for tokens
- CORS configuration

### Layer 2: Authentication
- JWT with short expiration (1h)
- Refresh tokens (7d)
- Password hashing (bcrypt, 10 rounds)

### Layer 3: Authorization
- Role-based access control (RBAC)
- Resource-level permissions (ownership + grants)
- Guard decorators in NestJS

### Layer 4: Data Encryption
- Credentials encrypted at rest
- Encryption keys in environment (KMS in production)
- TLS for data in transit

### Layer 5: Input Validation
- class-validator on all DTOs
- SQL injection prevention (Prisma)
- XSS prevention (React escaping)

## Deployment Architectures

### Option 1: Simple VPS Deployment
```
Digital Ocean / AWS EC2
├── Docker Compose
│   ├── PostgreSQL
│   ├── Redis
│   └── Node.js (Backend + Frontend build)
└── nginx (Reverse Proxy)
```

### Option 2: Container Orchestration
```
Kubernetes / ECS
├── Backend Pods/Services (3+ replicas)
├── Frontend Pods/Services (2+ replicas)
├── PostgreSQL (RDS or managed)
├── Redis (ElastiCache or managed)
└── Load Balancer
```

### Option 3: Serverless
```
Frontend: Vercel / Netlify / CloudFront + S3
Backend: AWS Lambda + API Gateway
Database: Aurora Serverless
Cache: ElastiCache or DynamoDB
```

## Monitoring & Observability

### Metrics to Track
- Request latency (p50, p95, p99)
- Error rates by endpoint
- Cache hit/miss ratios
- Active user sessions
- AWS API call counts
- Database query performance

### Logging Strategy
```
Winston Logger
├── Console (development)
├── File (production)
└── External Service (Datadog, CloudWatch)
```

### Health Checks
```
GET /health
├── Database connection
├── Redis connection
└── Basic endpoint test
```

## Disaster Recovery

### Backup Strategy
1. **Database**: Daily automated backups
2. **Encryption Keys**: Store in multiple secure locations
3. **User Data**: Regular exports

### Recovery Plan
1. Restore database from backup
2. Redeploy application
3. Update DNS if needed
4. Verify health checks

## Future Enhancements

### Short Term
1. Full Cornerstone3D integration
2. MPR (Multi-Planar Reconstruction)
3. Advanced DICOM tools (measurements, annotations)
4. Export studies to local storage

### Medium Term
1. WebSocket for real-time updates
2. Study comparison view
3. AI integration for image analysis
4. Mobile app (React Native)

### Long Term
1. PACS integration
2. HL7 FHIR support
3. Multi-language support
4. Reporting module

## Compliance Considerations

### HIPAA
- Encryption at rest and in transit ✓
- Access logging (add audit trail)
- User authentication ✓
- Role-based access ✓

### GDPR
- User data export (add feature)
- Right to deletion (add feature)
- Consent management (add feature)
- Data minimization ✓

### SOC 2
- Access controls ✓
- Encryption ✓
- Monitoring (implement)
- Incident response (document)

## Cost Optimization

### AWS Costs
- Use S3 transfer acceleration sparingly
- Cache metadata aggressively
- Consider AWS HealthImaging pricing tiers

### Infrastructure
- Right-size database instances
- Use spot instances for non-critical workloads
- CDN for frontend assets

### Development
- Local development environment
- Automated testing to reduce bugs
- Infrastructure as Code (Terraform/CloudFormation)

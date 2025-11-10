# AWS HealthImaging Full Stack Application

A production-ready full-stack application for managing and viewing medical images from AWS HealthImaging datastores with secure credential management and role-based access control.

## 🏗️ Architecture

### Frontend
- **React 19** - Latest React with concurrent features
- **RsBuild** - Rust-based build tool for blazing-fast builds
- **Redux Toolkit** - State management
- **RTK Query** - Data fetching and caching
- **Ant Design v5** - Enterprise UI components
- **React Router v6** - Client-side routing
- **TypeScript** - Type safety

### Backend
- **NestJS** - Scalable Node.js framework
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Relational database
- **Redis** - Caching layer
- **JWT** - Authentication
- **AWS SDK** - HealthImaging integration

## 📋 Features

### 🔐 Security
- **AES-256 Encryption** for AWS credentials at rest
- **JWT Authentication** with refresh tokens
- **Role-Based Access Control** (ADMIN, SOURCE_MANAGER, VIEWER)
- **Credential Isolation** - Viewers never see real credentials
- **Redis Caching** for temporary credentials (15-min TTL)
- **Security Headers** with Helmet.js
- **Rate Limiting** to prevent abuse

### 👥 User Management
- User registration and authentication
- Three role levels:
  - **ADMIN**: Full system access
  - **SOURCE_MANAGER**: Can register imaging sources
  - **VIEWER**: Can only view granted sources

### 🏥 Imaging Source Management
- Register multiple AWS HealthImaging datastores
- Test connections before saving
- Grant/revoke access to users
- Update source configurations
- Encrypted credential storage

### 🔍 Patient & Study Browser
- Search patients across imaging sources
- Filter by patient ID or name
- View study details (date, modality, series count)
- Expandable study list per patient
- Pagination support

### 🖼️ DICOM Viewer
- Secure DICOM frame proxy
- Metadata caching
- Backend credential injection
- Ready for Cornerstone3D integration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- AWS HealthImaging datastore (for testing)

### 1. Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd aws-health-imaging-app

# Copy environment files
cp backend/.env.example backend/.env
```

### 2. Configure Environment

Edit `backend/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/healthimaging?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=1h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRATION=7d

# Encryption Key (MUST be 32+ characters, CHANGE IN PRODUCTION!)
ENCRYPTION_KEY=your-32-character-encryption-key-change-this

# Application
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify containers are running
docker-compose ps
```

### 4. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

Backend will be available at `http://localhost:3001/api`

### 5. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

## 📖 Usage

### 1. Register an Account

1. Navigate to `http://localhost:3000`
2. Click "Register now"
3. Fill in your details
4. First user gets VIEWER role by default

### 2. Upgrade to SOURCE_MANAGER (Development Only)

Since the first user is created as VIEWER, you'll need to manually upgrade to SOURCE_MANAGER or ADMIN to register imaging sources:

```bash
# Connect to database
docker exec -it healthimaging-postgres psql -U postgres -d healthimaging

# Update user role
UPDATE users SET role = 'SOURCE_MANAGER' WHERE email = 'your-email@example.com';

# Or make ADMIN
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';

# Exit
\q
```

Then refresh your browser.

### 3. Register AWS HealthImaging Source

1. Go to "Imaging Sources"
2. Click "Add Source"
3. Fill in:
   - **Name**: Friendly name for the source
   - **Description**: Optional description
   - **Datastore ID**: Your AWS HealthImaging datastore ID
   - **Region**: AWS region (e.g., us-east-1)
   - **AWS Access Key ID**: IAM credentials with HealthImaging access
   - **AWS Secret Access Key**: Corresponding secret
   - **Session Token**: (Optional) For temporary credentials
4. Click "Create" - connection will be tested before saving

### 4. Grant Access to Viewers

As ADMIN or SOURCE_MANAGER:
1. Create additional VIEWER users (or upgrade existing ones)
2. In "Imaging Sources", click "Grant Access"
3. Select user to grant access
4. Viewer can now see patients from that source

### 5. Browse Patients

1. Go to "Patients & Studies"
2. Select an imaging source
3. Search by patient ID or name
4. Expand patients to see studies
5. Click "View" to open DICOM viewer

## 🗄️ Database Schema

```prisma
User
├── id: UUID
├── email: String (unique)
├── password: String (hashed)
├── role: ADMIN | SOURCE_MANAGER | VIEWER
├── firstName: String?
├── lastName: String?
└── isActive: Boolean

ImagingSource
├── id: UUID
├── name: String
├── description: String?
├── datastoreId: String
├── region: String
├── encryptedCreds: String (AES-256)
├── ownerId: UUID -> User
└── isActive: Boolean

AccessGrant
├── id: UUID
├── userId: UUID -> User
└── imagingSourceId: UUID -> ImagingSource
```

## 🔧 API Endpoints

### Authentication
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login
POST   /api/auth/refresh       - Refresh access token
POST   /api/auth/logout        - Logout
```

### Users
```
GET    /api/users              - List all users (ADMIN)
GET    /api/users/:id          - Get user by ID
PATCH  /api/users/:id/role     - Update user role (ADMIN)
PATCH  /api/users/:id/toggle-active - Toggle user active status (ADMIN)
```

### Imaging Sources
```
GET    /api/imaging-sources                    - List accessible sources
POST   /api/imaging-sources                    - Create source (SOURCE_MANAGER+)
GET    /api/imaging-sources/:id                - Get source details
PUT    /api/imaging-sources/:id                - Update source
DELETE /api/imaging-sources/:id                - Delete source
POST   /api/imaging-sources/:id/grant          - Grant access to user
DELETE /api/imaging-sources/:id/grant/:userId  - Revoke access
```

### Patients & Studies
```
GET    /api/patients?sourceId=&search=&limit=  - Search patients
GET    /api/patients/:id/studies?sourceId=     - Get patient studies
GET    /api/studies/:imageSetId/metadata?sourceId= - Get study metadata
GET    /api/studies/:imageSetId?sourceId=      - Get image set
```

### DICOM Proxy
```
GET    /api/dicom-proxy/frames/:imageSetId/:frameId?sourceId= - Get DICOM frame
GET    /api/dicom-proxy/metadata/:imageSetId?sourceId=        - Get metadata
```

## 🛡️ Security Best Practices

### Production Deployment

1. **Change All Secrets**
   ```env
   # Generate strong random secrets
   JWT_SECRET=$(openssl rand -base64 64)
   JWT_REFRESH_SECRET=$(openssl rand -base64 64)
   ENCRYPTION_KEY=$(openssl rand -base64 32)
   ```

2. **Use AWS KMS for Encryption Keys**
   - Store `ENCRYPTION_KEY` in AWS KMS
   - Update `CredentialsService` to fetch from KMS

3. **Enable HTTPS**
   - Use reverse proxy (nginx/Cloudflare)
   - Force HTTPS redirects

4. **Database Security**
   - Use SSL connections
   - Strong passwords
   - Network isolation

5. **Rate Limiting**
   - Already configured (100 req/min)
   - Adjust based on load

6. **Monitoring**
   - Set up error tracking (Sentry)
   - Log aggregation (CloudWatch, DataDog)
   - Performance monitoring

## 📦 Building for Production

### Backend
```bash
cd backend
npm run build
npm run start:prod
```

### Frontend
```bash
cd frontend
npm run build
# Serve dist/ folder with nginx or CDN
```

## 🧪 Testing

### Backend
```bash
cd backend
npm test              # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage
```

### Frontend
```bash
cd frontend
npm test              # Vitest
npm run test:ui       # UI mode
npm run test:coverage # Coverage
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

### Redis Connection Issues
```bash
# Check Redis
docker exec -it healthimaging-redis redis-cli ping
# Should return: PONG
```

### AWS HealthImaging Access Denied
- Verify IAM credentials have `medical-imaging:*` permissions
- Check datastore ID is correct
- Verify region matches

### Build Errors
```bash
# Clear caches
rm -rf backend/node_modules backend/dist
rm -rf frontend/node_modules frontend/dist

# Reinstall
npm install
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## 📧 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ for healthcare professionals**

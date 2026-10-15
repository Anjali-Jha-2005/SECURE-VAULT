# 🔐 SecureVault — Cloud-Based Security File Locker

SecureVault is a cybersecurity-focused application designed to protect files through authenticated encryption, secure authentication, access control, and file integrity verification. It aims to combine full-stack development, cloud security, and DevSecOps practices in one platform.

> **Status:** Under Development

## 🚀 Features

- **File Encryption:** AES-256-GCM authenticated encryption.
- **Secure Authentication:** Password hashing and JWT-based authentication.
- **Access Control:** Role-Based Access Control (RBAC) and file ownership verification.
- **File Management:** Secure file upload, download, and deletion.
- **Integrity Verification:** SHA-256 file integrity checks.
- **Audit Logging:** Records security-relevant user and file operations.
- **Local Storage:** Supports local development without AWS credentials.
- **Cloud Integration:** Designed for AWS S3 storage, AWS KMS key management, and CloudWatch monitoring.
- **DevSecOps:** Docker, Docker Compose, Nginx, and GitHub Actions integration.

*Features are subject to implementation and testing. Optional cloud integrations require configuration.*

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL, Prisma ORM |
| Security | AES-256-GCM, SHA-256, JWT, Argon2id or bcrypt |
| Cloud | AWS S3, optional AWS KMS and CloudWatch |
| DevSecOps | Docker, Docker Compose, Nginx, GitHub Actions |
| API | REST API, Swagger/OpenAPI |

## 🏗️ Architecture

```text
User
  |
  v
React Frontend
  |
  v
Nginx Reverse Proxy
  |
  v
Express REST API
  |
  +---- Authentication and Authorization
  |
  +---- File Encryption Service
  |          |
  |          +---- Local Encrypted Storage
  |          |
  |          +---- AWS S3 (Optional)
  |
  +---- PostgreSQL Database
  |
  +---- Security Audit Logging
             |
             +---- AWS CloudWatch (Optional)
```

## 🔒 Security Approach

### Encryption
Files are intended to be encrypted on the backend using AES-256-GCM before persistent storage. Authentication tags are verified during decryption to detect tampering.

### Authentication
Passwords are hashed using a suitable password-hashing algorithm. Short-lived access tokens and securely managed refresh tokens support the authentication workflow.

### Authorization
The backend verifies file ownership before allowing users to download, inspect, or delete files. Administrative operations require appropriate permissions.

### Integrity
SHA-256 hashes support file-integrity verification. Authenticated encryption also helps detect unauthorized modification of encrypted data.

### Audit Logging
Security-relevant events can include login attempts, file operations, access denials, and encryption failures. Logs must not contain passwords, tokens, encryption keys, or file contents.

## 📁 Project Structure

```text
SECURITY-FILE-LOCKER/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── Dockerfile
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── security/
│   │   ├── storage/
│   │   └── audit/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   ├── package.json
│   └── Dockerfile
├── nginx/
├── .github/
│   └── workflows/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── .dockerignore
├── SECURITY.md
└── README.md
```

*This is the proposed structure. Adjust it to match the files present in your repository.*

## ⚙️ Getting Started

### Prerequisites

- Node.js and npm
- PostgreSQL
- Git
- Docker Desktop (optional)

### 1. Clone the Repository

```bash
git clone https://github.com/Anjali-Jha-2005/SECURITY-FILE-LOCKER.git
cd SECURITY-FILE-LOCKER
```

### 2. Configure Environment Variables

Create the required environment files using `.env.example` as a reference. Configure the database URL and application secrets according to your local setup.

Never commit real credentials or secret keys to GitHub.

### 3. Install Dependencies

Install frontend dependencies:

```bash
cd frontend
npm install
```

In a separate terminal, install backend dependencies:

```bash
cd backend
npm install
```

### 4. Initialize the Database

After configuring PostgreSQL and the backend environment:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

Run the commands from the backend directory where the Prisma schema is configured.

### 5. Run the Application

Start the backend using its configured development script:

```bash
cd backend
npm run dev
```

In a separate terminal, start the frontend:

```bash
cd frontend
npm run dev
```

Open the local URL displayed by Vite in your browser.

> These commands assume the frontend and backend packages contain the corresponding scripts. Check each `package.json` if a command is unavailable.

## 🐳 Docker Setup

Build and start the configured services:

```bash
docker compose up --build
```

Check service status:

```bash
docker compose ps
```

View application logs:

```bash
docker compose logs -f
```

Stop the services:

```bash
docker compose down
```

Use persistent database volumes and keep secrets outside Docker images.

## ☁️ AWS Configuration

AWS integration is optional for local development.

To enable cloud storage:

1. Create a private S3 bucket.
2. Keep S3 Block Public Access enabled.
3. Configure least-privilege IAM permissions.
4. Use IAM roles or temporary credentials where possible.
5. Configure the S3 storage adapter.
6. Verify that only encrypted file content is uploaded.
7. Configure AWS KMS and CloudWatch only when their integrations are implemented.

Do not create cloud resources or incur AWS charges unless you explicitly choose to configure them.

## 🧪 Testing

Run the configured backend test suite:

```bash
cd backend
npm test
```

Tests should cover authentication, encryption, tampering detection, file operations, ownership enforcement, upload validation, rate limiting, and audit logging.

Use an isolated test database and temporary storage. Do not run destructive tests against production data.

## 📚 API Documentation

The API is organized under `/api/v1`.

- `/api/v1/auth` — Authentication
- `/api/v1/files` — File management
- `/api/v1/dashboard` — Dashboard statistics
- `/api/v1/audit-logs` — Audit history
- `/api/v1/admin` — Administrative operations

Exact endpoints and Swagger/OpenAPI documentation depend on the implemented backend configuration.

## 🛡️ Security Guidelines

- Never commit `.env` files, passwords, tokens, or private keys.
- Never expose encryption keys to the frontend.
- Use HTTPS and secure cookie settings in production.
- Validate file uploads on the server.
- Enforce file ownership checks on every file operation.
- Never silently fall back to plaintext storage.
- Do not claim AWS integration is active until it is configured and tested.
- Review backup retention and versioning before claiming permanent deletion.

## 🔮 Future Enhancements

- AWS KMS envelope encryption
- CloudWatch monitoring and actionable alerts
- Enhanced session management
- Malware scanning for uploaded files
- Infrastructure as Code
- Additional automated security tests
- Production deployment hardening

## 👩‍💻 Author

**Anjali Jha**

GitHub: [Anjali-Jha-2005](https://github.com/Anjali-Jha-2005)

## 📜 License

Add an appropriate open-source license before distributing the project.

---

**Disclaimer:** SecureVault is an educational cybersecurity project under development. Verify each feature through implementation and testing before relying on it to protect sensitive files.

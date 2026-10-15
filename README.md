# 🔐 SecureVault — Cloud-Based Security File Locker

**SecureVault** is a cybersecurity-focused file protection platform designed to securely upload, encrypt, store, retrieve, download, and delete files. It combines full-stack development with application security, cryptographic protection, cloud storage, and DevSecOps practices.

The project aims to demonstrate how sensitive files can be protected using authenticated encryption, secure authentication, access control, integrity verification, and security audit logging.

> **Project status:** Under development. Features such as AWS S3, AWS KMS, CloudWatch, and automated security testing are considered implemented only after configuration and verification.

## 🚀 Key Features

### 🔒 File Security
- AES-256-GCM authenticated file encryption
- SHA-256 file integrity verification
- Secure file upload, download, and deletion
- Server-generated storage identifiers
- File ownership verification
- Protection against unauthorized file access
- Configurable upload size limits and file validation

### 🔑 Authentication and Authorization
- User registration and login
- Secure password hashing using Argon2id or bcrypt
- JWT-based access authentication
- Refresh-token rotation and revocation
- Role-Based Access Control (RBAC)
- Password change and logout
- Rate limiting and server-side validation
- Protection against insecure direct object references

### 📊 Security Dashboard
- File and storage statistics
- Recent file activity
- Encryption and integrity status
- Security audit logs
- Login and file-operation events
- Administrative monitoring with role restrictions
- Clear indicators for unavailable integrations

### ☁️ Cloud Security
- AWS S3 adapter for encrypted file storage
- Private bucket configuration
- Least-privilege AWS IAM permissions
- Optional AWS KMS envelope encryption
- Optional AWS CloudWatch security-event forwarding
- Local storage support for development without AWS credentials

### 🛡️ DevSecOps
- Docker and Docker Compose
- Nginx reverse proxy
- PostgreSQL with Prisma ORM
- GitHub Actions CI workflows
- Dependency and container vulnerability scanning
- Automated testing and build verification
- Environment-based configuration

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, Vite, Tailwind CSS |
| Routing and API | React Router, Axios |
| Backend | Node.js, Express.js |
| API architecture | REST API, Swagger/OpenAPI |
| Database | PostgreSQL, Prisma ORM |
| Encryption | AES-256-GCM, SHA-256 |
| Authentication | JWT, Argon2id or bcrypt |
| Cloud storage | AWS S3 |
| Key management | Local development key provider, optional AWS KMS |
| Monitoring | Local audit logging, optional AWS CloudWatch |
| Infrastructure | Docker, Docker Compose, Nginx |
| CI/CD security | GitHub Actions, dependency and container scanning |

## 🏗️ System Architecture

```mermaid
flowchart TD
    A[User] --> B[React Frontend]
    B --> C[Nginx Reverse Proxy]
    C --> D[Express REST API

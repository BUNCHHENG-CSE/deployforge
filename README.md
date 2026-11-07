# TCT DeployForge — Intune One-Click App Deploy Platform (Next.js All-in-One Full Stack)

[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black.svg?logo=next.js&logoColor=white)]()
[![Bun](https://img.shields.io/badge/Bun-1.4.0-FBF0DF.svg?logo=bun&logoColor=black)]()
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)]()
[![Prisma ORM](https://img.shields.io/badge/Prisma%20ORM-6.4+-2D3748.svg?logo=prisma&logoColor=white)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Cloud-336791.svg?logo=postgresql&logoColor=white)]()
[![SQLite](https://img.shields.io/badge/SQLite-Local%20Dev-003B57.svg?logo=sqlite&logoColor=white)]()
[![Microsoft Graph](https://img.shields.io/badge/Microsoft%20Graph-Win32%20LOB-0078D4.svg?logo=microsoft-azure&logoColor=white)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

> **TCT DeployForge** turns a 45–60 minute mechanical repetition loop into a **3-second, one-click automated deployment to Microsoft Intune**. Full-stack, zero-friction, all-in-one Next.js platform powered by Bun and Prisma ORM.

---

## ⚡ The Problem: Why Admins Hate Deploying to Intune

Deploying a standard Windows desktop application (`.exe` or `.msi`) through Microsoft Intune (Endpoint Manager) requires extensive manual labor:

```
[Traditional Manual Intune Flow: 45–60 Minutes]
1. Search Google/Reddit for vendor silent switches (/VERYSILENT vs /S vs /qn vs --silent)
2. Locate and download Microsoft Win32 Content Prep Tool (IntuneWinAppUtil.exe)
3. Set up directory structures: SourceFolder, SetupFile, OutputFolder
4. Run CLI commands to generate .intunewin
5. Navigate to Intune Admin Center -> Apps -> Windows -> Add -> Win32 app
6. Manually fill 20+ fields (Publisher, Version, Architecture, Install command, Uninstall command)
7. Craft detection rules manually (Registry key paths, File versions, or custom PowerShell scripts)
8. Wait through browser uploads
9. Manually assign to Entra ID security groups
```

**TCT DeployForge solves this completely:**
1. **Curated 1-Click Catalog & Fleet Baselines**: Select from 24+ pre-vetted enterprise apps or deploy entire Workstation Fleet Baselines (Developer Stack, Standard Office, SysAdmin Suite) with a single click.
2. **Multi-App Batch Deployment Cart**: Check multiple applications and roll them out concurrently to any Entra ID group with a unified batch queue.
3. **WinGet 5,000+ Package Repository Integration**: Live search across the Windows Package Manager repository; automatically derive silent flags and vendor CDN manifests for immediate deployment.
4. **PowerShell Script & Remediation Studio**: Package raw `.ps1` automation scripts into native AES-256 `.intunewin` containers with execution policy bypass, exit-code tracking, and automatic tag-file detection rules.
5. **Universal Custom Packager & Rule Simulator**: Drag and drop custom `.exe` or `.msi` installers. Built-in interactive simulator validates detection rules (Registry, File, MSI, PowerShell) before deployment to prevent `0x87D1041C` failures.
6. **MSP Multi-Tenant Profile Switcher**: Instantly switch between Sandbox, Internal Corporate IT, and Client Tenants with 1-click Lighthouse-style profile management.
7. **Native Specification-Compliant `.intunewin` Engine**: Pure TypeScript cryptographic implementation (AES-256-CBC, random IV, HMAC-SHA256, PKCS7, and `Detection.xml`) without requiring Windows-only binaries.
8. **Direct Graph API & Azure Blob Chunk Uploader**: Automatically creates `win32LobApp`, uploads encrypted content chunks to Azure Blob Storage via SAS URI, commits HMAC digest, and assigns to Entra ID groups.
9. **Next-Generation Prisma ORM**: Unified data layer supporting **Neon PostgreSQL** in production and **SQLite** locally with zero extra dependencies.
10. **Interactive Sandbox Simulation**: Test the entire packaging, detection rule generation, and mock Graph deployment without spending on Azure licenses.

---

## 🏗️ Architecture: All-in-One Next.js Full Stack

```
TCT DeployForge (Next.js Full Stack)
├── src/
│   ├── app/                                 # Next.js App Router
│   │   ├── api/                             # Unified Full-Stack Backend API
│   │   │   ├── catalog/                     # Curated enterprise apps & fleet baselines
│   │   │   ├── winget/                      # WinGet ecosystem live search & auto-resolver
│   │   │   ├── scripts/                     # PowerShell studio & .intunewin packager
│   │   │   ├── rules/simulate/              # Detection rule simulation engine
│   │   │   ├── upload/                      # PE & MSI inspection & analysis
│   │   │   ├── deploy/                      # Single & batch deployment pipeline
│   │   │   ├── jobs/                        # Job inspection & SSE real-time stream
│   │   │   ├── tenant/                      # MSP Profiles & Entra ID OAuth
│   │   │   ├── db/health/                   # Database latency & connection stats
│   │   │   └── prisma/                      # Prisma query engine metrics & analytics
│   │   ├── layout.tsx                       # Root layout & dark cyber theme
│   │   ├── page.tsx                         # Single-page dashboard controller
│   │   └── globals.css                      # Tailwind CSS v4 styling & glassmorphism
│   ├── components/                          # React 19 UI Components
│   │   ├── Navbar.tsx                       # Header navigation & tenant status indicator
│   │   ├── DashboardView.tsx                # Executive KPIs, Fleet Baselines & error codes
│   │   ├── CatalogView.tsx                  # 1-Click catalog, WinGet search & batch cart
│   │   ├── ScriptStudioView.tsx             # PowerShell script packager & deployment
│   │   ├── CustomPackageWizard.tsx          # Binary inspector & Rule simulator
│   │   ├── DeploymentTracker.tsx            # Real-time SSE 6-stage pipeline tracker
│   │   ├── DeployedAppsList.tsx             # Live Intune inventory viewer
│   │   └── TenantModal.tsx                  # MSP Multi-Tenant switcher & Entra ID OAuth
│   ├── lib/                                 # Core Server Engines & Data Layer
│   │   ├── prisma.ts                        # Prisma Client singleton
│   │   ├── packager.ts                      # Native AES-256-CBC .intunewin generator
│   │   ├── analyzer.ts                      # PE / MSI binary inspector & switch generator
│   │   ├── rule-simulator.ts                # Intune detection rule evaluator
│   │   ├── scripts-library.ts               # PowerShell wrappers & packager
│   │   ├── graph-client.ts                  # Microsoft Graph API & Azure Blob uploader
│   │   ├── jobs.ts                          # Deployment Job Manager & SSE broadcaster
│   │   ├── storage.ts                       # Workspace filesystem manager
│   │   └── data.ts                          # Seed apps, baselines & tenant data
│   ├── services/
│   │   └── api.ts                           # Client-side API caller
│   └── types/
│       └── index.ts                         # Complete TypeScript domain contracts
├── prisma/
│   ├── schema.sqlite.prisma                 # Schema for Local SQLite development
│   ├── schema.postgresql.prisma             # Schema for Neon PostgreSQL (Production)
│   ├── schema.prisma                        # Active synced schema
│   └── seed.ts                              # Initial tenant database seeder
├── scripts/
│   ├── db-prepare.mjs                       # Automatic schema selector based on .env
│   ├── start.ps1                            # 1-Click Windows PowerShell launcher
│   └── prisma-studio.ps1                    # Visual Database Inspector launcher
├── Dockerfile                               # Production multi-stage Bun container
└── docker-compose.yml                       # Optional local Docker orchestrator
```

---

## 🚀 Quickstart

### Prerequisites
- **Bun 1.2+** (Recommended) or **Node.js 20+**
- Windows 10/11 or Linux/macOS

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Database Environment
Copy the example configuration:
```bash
cp .env.example .env
```

#### Option A: Local Development (SQLite - Zero Setup)
Keep the default in `.env`:
```env
DB_TYPE=sqlite
DATABASE_URL="file:./deployforge.db"
```
Prepare and seed the database:
```bash
bun run db:push
bun run db:seed
```

#### Option B: Production (Neon PostgreSQL)
Set in `.env` (or in your hosting provider's environment variables):
```env
DB_TYPE=postgresql
DATABASE_URL="postgresql://<user>:<password>@<neon-hostname>/<dbname>?sslmode=require"
```
Run migrations/push:
```bash
bun run db:push
```

### 3. Start the Platform
```bash
bun run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

### 4. 1-Click Launch (Windows PowerShell)
You can also launch everything with a single command:
```powershell
.\scripts\start.ps1
```

---

## 🛠️ NPM / Bun Scripts Reference

| Command | Action |
|---|---|
| `bun run dev` | Prepares active database schema and starts Next.js dev server with Turbopack |
| `bun run build` | Builds optimized standalone production Next.js bundle |
| `bun run start` | Runs the compiled Next.js production server |
| `bun run db:prepare` | Auto-detects SQLite vs. PostgreSQL (Neon) and updates `prisma/schema.prisma` |
| `bun run db:push` | Syncs schema directly to local SQLite or Neon PostgreSQL |
| `bun run db:generate` | Regenerates Prisma Client types |
| `bun run db:seed` | Seeds initial tenant data |
| `bun run db:studio` | Launches visual Prisma Studio GUI on `http://localhost:5555` |

---

## 🔐 Microsoft Intune Authentication Modes

TCT DeployForge includes 3 authentication modes accessible from the top-right tenant badge:

1. **Sandbox Simulation Mode (Default)**:
   - Instant testing out of the box without needing an Azure account or Intune licenses.
   - Simulates the entire 6-phase deployment, encrypted blob uploads, and Entra ID group targeting.
2. **Device Code Flow (Interactive Login)**:
   - Click "Initiate Login", copy the user code, and authenticate in your browser at `microsoft.com/devicelogin`.
   - Uses Microsoft Intune PowerShell client ID (`d1ddf0e6-50e0-4d8b-924c-0c15012899c4`).
3. **Service Principal (Client Credentials)**:
   - Production CI/CD flow using Tenant ID, Client ID, and Client Secret with `DeviceManagementApps.ReadWrite.All` permissions.

---

## 📦 Native Specification-Compliant `.intunewin` Engine

TCT DeployForge generates authentic Microsoft `.intunewin` files directly in pure TypeScript without executing `IntuneWinAppUtil.exe`:
- **Algorithm**: `AES-256-CBC` encryption with PKCS7 padding and cryptographic random 16-byte IV.
- **Integrity**: `HMAC-SHA256` computed over the ciphertext.
- **Manifest**: Constructs XML specification document `Detection.xml` including `UnencryptedContentSize`, `FileName`, and `EncryptionInfo`.
- **Packaging**: Packs the manifest and `<setup_file>.intunewin` into a ZIP archive container.

---

## 📄 License
MIT License. Created for IT Operations & Modern Endpoint Management.

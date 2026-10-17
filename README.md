# DeployForge — Intune One-Click App Deploy Platform

[![Tests](https://img.shields.io/badge/tests-9%20passed-brightgreen.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)]()
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)]()
[![Microsoft Graph](https://img.shields.io/badge/Microsoft%20Graph-Win32%20LOB-0078D4.svg?logo=microsoft-azure&logoColor=white)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

> **DeployForge** turns a 45–60 minute mechanical repetition loop into a **3-second, one-click automated deployment to Microsoft Intune**. Inspired by the validated micro-SaaS journey of Pckgr (scaling to \$60,000/month ARR by serving SMB sysadmins).

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

**DeployForge solves this completely:**
1. **Curated 1-Click Catalog**: Select from 60+ pre-vetted enterprise apps (Chrome, VS Code, Git, Zoom, 7-Zip, PowerToys, etc.) with pre-configured silent switches and detection rules.
2. **Universal Custom Packager**: Drag and drop any custom `.exe` or `.msi`. The engine auto-inspects PE headers, detects the installer engine (Inno Setup, NSIS, WiX, MSI, InstallShield, Squirrel), extracts ProductCode GUIDs, and auto-generates silent install commands and detection rules.
3. **Native Specification-Compliant `.intunewin` Engine**: Uses pure cryptographic algorithms (AES-256-CBC, random IV, HMAC-SHA256, PKCS7, and `Detection.xml`) without requiring Windows-only binaries.
4. **Direct Graph API & Azure Blob Chunk Uploader**: Automatically creates `win32LobApp`, uploads encrypted content chunks to Azure Blob Storage via SAS URI, commits HMAC digest, and assigns to Entra ID groups.
5. **Interactive Sandbox Simulation**: Test the entire packaging, detection rule generation, and mock Graph deployment without spending on Azure licenses.

---

## 🏗️ Architecture

```
DeployForge
├── Frontend (React 18 + TypeScript + Vite + Tailwind CSS + Lucide)
│   ├── App Catalog (60+ enterprise apps with search & categories)
│   ├── Custom Package Wizard (Drag-and-drop PE/MSI inspector)
│   ├── Deployment Pipeline Tracker (6-phase stepper & SSE live console)
│   ├── Intune Inventory (Live Win32 apps viewer)
│   └── Tenant Modal (Device Code OAuth & Service Principal)
│
├── Backend (Python 3.12+ / FastAPI + Cryptography + Pydantic)
│   ├── /api/catalog          -> Curated enterprise app repository
│   ├── /api/upload           -> Binary inspection (PE headers & MSI database)
│   ├── /api/deploy           -> Multi-phase asynchronous deployment pipeline
│   ├── /api/jobs/{id}/stream -> Real-time Server-Sent Events (SSE) log stream
│   ├── /api/tenant/*         -> Entra ID OAuth (Device Code & App Registration)
│   └── /api/packages/download-> Download compiled .intunewin directly
│
└── Core Engines
    ├── packager.py           -> Native AES-256-CBC + HMAC-SHA256 .intunewin generator
    ├── analyzer.py           -> PE/MSI binary classifier & silent command generator
    ├── graph_client.py       -> Microsoft Graph API & Azure Blob chunk uploader
    └── catalog.py            -> 60+ enterprise software profiles
```

---

## 🚀 Quickstart

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**

### 1. One-Click Launch (Windows PowerShell)
Simply execute the provided startup script:
```powershell
.\scripts\start.ps1
```
This automatically builds the frontend assets and starts the unified engine at **`http://localhost:8000`**.

### 2. Manual Setup

#### Backend:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend (Development with Hot Reload):
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🧪 Running Automated Tests

Run the full pytest suite covering the packager, binary analyzer, and API:
```powershell
python -m pytest backend/tests -v
```

All 9 test suites verify:
- Spec-compliant `.intunewin` packaging, AES-256 decryption, and HMAC integrity
- PE binary version & architecture extraction
- MSI ProductCode GUID pattern extraction
- Catalog query and category filtering
- Graph API simulation & live job SSE streaming

---

## 🔐 Microsoft Entra ID / Intune Setup Guide

DeployForge supports two connection modes:

### Mode 1: Device Code Flow (Zero Setup for Admins)
1. In DeployForge, click the **Tenant Status** badge in the navbar.
2. Select **Device Login** and click **Generate Device Login Code**.
3. Open `https://microsoft.com/devicelogin`, enter the displayed code, and sign in with your Intune administrator credentials.
4. DeployForge instantly receives the delegated token with `DeviceManagementApps.ReadWrite.All`.

### Mode 2: Azure App Registration (Unattended / CI/CD)
1. Go to **Microsoft Entra Admin Center** -> **App registrations** -> **New registration**.
2. Name it `DeployForge-Intune` and register.
3. Under **API permissions**, click **Add a permission** -> **Microsoft Graph** -> **Application permissions**:
   - `DeviceManagementApps.ReadWrite.All`
   - `Group.Read.All`
4. Click **Grant admin consent for your organization**.
5. Under **Certificates & secrets**, create a new **Client secret**.
6. In DeployForge, enter your **Tenant ID**, **Client ID**, and **Client Secret**.

### Mode 3: Sandbox Simulation Mode
- Included by default. Test real packaging, download `.intunewin` files, and evaluate the full user journey without needing an Azure account.

---

## 💡 Revenue & Go-to-Market Playbook

Based on Tom's validated \$60k/month Pckgr blueprint:

1. **Phase 1: Free Community MVP & Feedback (Month 1)**
   - Post free tool link in **r/sysadmin**, **r/Intune**, and MSP Reddit communities (`r/msp`).
   - Frame as: *"I got sick of spending 45 minutes manually packaging Chrome and Zoom for Intune, so I built a free 1-click web packager. Tear it apart."*
   - Measure: Wait for users to request automated updates or private repositories.

2. **Phase 2: YouTube Microsoft MVP Strategy (Month 2–3)**
   - Reach out to popular Intune / Enterprise Mobility MVPs on YouTube (e.g., Intune Training channel, Dean Cefola / Azure Academy).
   - Offer lifetime free access for an honest walkthrough video. High-intent evergreen search traffic from "How to deploy app to Intune" converts continuously.

3. **Phase 3: Subscription Pricing (\$25 / \$75 / \$199 per month)**
   - **Free Tier**: 3 apps per month, manual download of `.intunewin`.
   - **Pro Tier (\$25/mo)**: Unlimited 1-click push to 1 Intune tenant, automated update alerts.
   - **MSP / Enterprise Tier (\$99–\$199/mo)**: Multi-tenant Intune management (Lighthouse-style), automated scheduled updates, custom repository.

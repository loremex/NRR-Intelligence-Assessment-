$ErrorActionPreference = "Stop"
Write-Host "=== Loremex Assessment Repo Init ===" -ForegroundColor Cyan

$dirs = @(
    "client/public",
    "client/src/components/landing",
    "client/src/components/calculator",
    "client/src/components/selection",
    "client/src/components/assessment",
    "client/src/components/scorecard",
    "client/src/components/shared",
    "client/src/content",
    "client/src/lib",
    "client/src/pages",
    "client/src/styles",
    "server/src/routes",
    "server/src/lib",
    "scripts",
    "docs"
)
foreach ($d in $dirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
        Write-Host "  Created: $d" -ForegroundColor Green
    }
}

$fileMoves = @{
    "rubric.json"                                 = "client/src/content/rubric.json"
    "export_rubric.py"                            = "scripts/export_rubric.py"
    "NRR_Intelligence_Assessment_PRD_v1.2.docx"   = "docs/NRR_Intelligence_Assessment_PRD_v1.2.docx"
    "CTO_Decisions.md"                            = "docs/CTO_Decisions.md"
    "Sprint_1_Plan.md"                            = "docs/Sprint_1_Plan.md"
    "NRR_Intelligence_Assessment.xlsx"            = "docs/NRR_Intelligence_Assessment.xlsx"
}
foreach ($source in $fileMoves.Keys) {
    $dest = $fileMoves[$source]
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $dest -Force
        Write-Host "  Moved: $source -> $dest" -ForegroundColor Green
    }
}

$gitignoreContent = "node_modules/`n.pnp/`nclient/dist/`nserver/dist/`nbuild/`n*.tsbuildinfo`n.env`n.env.local`n.env.*.local`n.vscode/`n.idea/`n.DS_Store`nThumbs.db`nnpm-debug.log*`n*.log`n.vercel`n__pycache__/`n*.pyc`ncoverage/`n*.tmp`n.cache/"
Set-Content -Path ".gitignore" -Value $gitignoreContent
Write-Host "  Created: .gitignore" -ForegroundColor Green

$envContent = "VITE_HUBSPOT_PORTAL_ID=`nVITE_HUBSPOT_FORM_ID=`nHUBSPOT_API_KEY=`nRESEND_API_KEY=`nRESEND_FROM_EMAIL=assessment@loremex.ai`nVITE_POSTHOG_KEY=`nVITE_POSTHOG_HOST=https://us.i.posthog.com`nVITE_BASE_URL=http://localhost:5173`nNODE_ENV=development"
Set-Content -Path ".env.example" -Value $envContent
Write-Host "  Created: .env.example" -ForegroundColor Green

$pkgJson = @"
{
  "name": "loremex-assessment",
  "private": true,
  "version": "0.1.0",
  "workspaces": ["client", "server"],
  "scripts": {
    "dev:client": "npm --workspace client run dev",
    "dev:server": "npm --workspace server run dev",
    "build:client": "npm --workspace client run build",
    "build:server": "npm --workspace server run build",
    "test": "npm --workspace client run test"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
"@
Set-Content -Path "package.json" -Value $pkgJson
Write-Host "  Created: package.json" -ForegroundColor Green

if (-not (Test-Path ".git")) {
    git init | Out-Null
    git checkout -b staging 2>$null | Out-Null
    Write-Host "  Git initialized; checked out staging" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Done. Run dir to see the new structure. ===" -ForegroundColor Cyan

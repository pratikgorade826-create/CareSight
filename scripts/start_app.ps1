# CareSight — Zero-Glitch Headless Application Launcher
$ErrorActionPreference = "Continue"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = (Resolve-Path "$scriptDir\..").Path
Set-Location $rootDir

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "   CareSight: Intelligent Elderly Care Platform" -ForegroundColor Cyan
Write-Host "   Your Health. Your Choices. Your Circle of Care." -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

# 1. Clean up any previous processes on ports 8000 and 5173
Write-Host "[*] Checking and freeing ports 8000 and 5173..." -ForegroundColor Yellow

function Kill-PortProcesses([string]$port) {
    try {
        $lines = netstat -ano | Select-String ":$port\s"
        foreach ($line in $lines) {
            $parts = ($line.ToString().Trim() -split '\s+')
            if ($parts.Length -ge 5) {
                $pidStr = $parts[-1]
                if ($pidStr -match '^\d+$') {
                    $pId = [int]$pidStr
                    if ($pId -gt 0) {
                        Stop-Process -Id $pId -Force -ErrorAction SilentlyContinue
                    }
                }
            }
        }
    } catch {}
}

Kill-PortProcesses "8000"
Kill-PortProcesses "5173"

# 2. Add Node.js and Python to PATH if needed
if (Test-Path "C:\Users\Pratik\Downloads\node-v24.21.0-win-x64\node-v24.21.0-win-x64\node.exe") {
    $env:PATH = "C:\Users\Pratik\Downloads\node-v24.21.0-win-x64\node-v24.21.0-win-x64;" + $env:PATH
}
if (Test-Path "C:\Program Files\nodejs\node.exe") {
    $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
}
if (Test-Path "C:\Users\Pratik\AppData\Local\Programs\Python\Python312\Scripts") {
    $env:PATH = "C:\Users\Pratik\AppData\Local\Programs\Python\Python312\Scripts;C:\Users\Pratik\AppData\Local\Programs\Python\Python312;" + $env:PATH
}

$env:NO_PROXY = "localhost,127.0.0.1"
$env:no_proxy = "localhost,127.0.0.1"

# 3. Ensure .env files
if (-not (Test-Path "$rootDir\.env")) {
    Copy-Item "$rootDir\.env.example" "$rootDir\.env" -Force
}
if (-not (Test-Path "$rootDir\backend\.env")) {
    Copy-Item "$rootDir\.env" "$rootDir\backend\.env" -Force
}

# 4. Initialize SQLite database & Seed demo accounts
Write-Host "[*] Initializing SQLite database (carecircle.db)..." -ForegroundColor Yellow
& python "$rootDir\scripts\initialize_database.py"

Write-Host "[*] Ensuring demo accounts exist (Senior, Family, Caregiver)..." -ForegroundColor Yellow
& python "$rootDir\scripts\seed_demo_data.py"

# 5. Start FastAPI Backend Silently (-WindowStyle Hidden, NO CMD WINDOW)
Write-Host "[*] Starting FastAPI Backend on http://127.0.0.1:8000 (Hidden)..." -ForegroundColor Yellow
Start-Process python -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000" -WorkingDirectory "$rootDir\backend" -WindowStyle Hidden

# Wait for backend to be listening on port 8000
$backendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect("127.0.0.1", 8000)
        if ($client.Connected) {
            $backendReady = $true
            $client.Close()
            break
        }
    } catch {
        Start-Sleep -Milliseconds 200
    } finally {
        $client.Dispose()
    }
}

if ($backendReady) {
    Write-Host "[+] Backend is online and accepting connections." -ForegroundColor Green
} else {
    Write-Host "[!] Backend initializing in background..." -ForegroundColor DarkYellow
}

# 6. Start Vite Frontend Silently (-WindowStyle Hidden, NO CMD WINDOW)
Write-Host "[*] Starting Vite Frontend on http://localhost:5173 (Hidden)..." -ForegroundColor Yellow
$npmCmd = (Get-Command npm.cmd, npm -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $npmCmd) {
    if (Test-Path "C:\Users\Pratik\Downloads\node-v24.21.0-win-x64\node-v24.21.0-win-x64\npm.cmd") {
        $npmCmd = "C:\Users\Pratik\Downloads\node-v24.21.0-win-x64\node-v24.21.0-win-x64\npm.cmd"
    } else {
        $npmCmd = "npm"
    }
}

Start-Process $npmCmd -ArgumentList "run dev" -WorkingDirectory "$rootDir\frontend" -WindowStyle Hidden

# Wait for frontend to be listening on port 5173
$frontendReady = $false
for ($i = 0; $i -lt 40; $i++) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect("127.0.0.1", 5173)
        if ($client.Connected) {
            $frontendReady = $true
            $client.Close()
            break
        }
    } catch {
        Start-Sleep -Milliseconds 250
    } finally {
        $client.Dispose()
    }
}

# 7. Directly Open Browser to http://localhost:5173
Write-Host "[*] Launching browser directly to http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "   CareSight Platform is Live!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "   [Web Frontend]  http://localhost:5173  (Opened in your browser)" -ForegroundColor White
Write-Host "   [API Backend]   http://127.0.0.1:8000 (Swagger: /docs)" -ForegroundColor White
Write-Host "   [Database File] carecircle.db (View in DB Browser for SQLite)" -ForegroundColor White
Write-Host ""
Write-Host "   Demo Role Accounts:" -ForegroundColor White
Write-Host "     1. Senior User:    demo@caresight.com           / CareSight123!" -ForegroundColor Cyan
Write-Host "     2. Family Member:  family.member@caresight.com   / CareSight123!" -ForegroundColor Cyan
Write-Host "     3. Caregiver:      caregiver.nurse@caresight.com / CareSight123!" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "   To stop the background servers anytime, run: .\stop.bat" -ForegroundColor Gray
Write-Host "=====================================================================" -ForegroundColor Green

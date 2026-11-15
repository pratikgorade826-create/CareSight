# CareSight — Process Stopper
Write-Host "[*] Stopping CareSight backend (port 8000) and frontend (port 5173)..." -ForegroundColor Yellow

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
                        Write-Host "  Stopping process on port $port (PID: $pId)..." -ForegroundColor Gray
                        Stop-Process -Id $pId -Force -ErrorAction SilentlyContinue
                    }
                }
            }
        }
    } catch {
        # Silently continue on any error
    }
}

Kill-PortProcesses "8000"
Kill-PortProcesses "5173"

Write-Host "[+] All CareSight servers have been stopped." -ForegroundColor Green

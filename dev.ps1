Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    Starting DukaanAI (Auto-Reload Dev)   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & ".\.venv-voice\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload --reload-dir app
}

$frontendJob = Start-Job -ScriptBlock {
    Set-Location "$using:PWD\frontend"
    npm run dev
}

Write-Host "-> Backend running on http://127.0.0.1:8000 (with auto-reload on app/ changes)" -ForegroundColor Green
Write-Host "-> Frontend running on http://localhost:5173 (with instant Vite HMR)" -ForegroundColor Green
Write-Host "-> Production Build endpoint: http://127.0.0.1:8000/assistant" -ForegroundColor Yellow
Write-Host "`nPress Ctrl+C to stop both servers." -ForegroundColor Magenta

try {
    while ($true) {
        Receive-Job -Job $backendJob | Write-Host
        Receive-Job -Job $frontendJob | Write-Host
        Start-Sleep -Seconds 1
    }
}
finally {
    Stop-Job -Job $backendJob, $frontendJob
    Remove-Job -Job $backendJob, $frontendJob
    Write-Host "`nAll servers stopped." -ForegroundColor Red
}

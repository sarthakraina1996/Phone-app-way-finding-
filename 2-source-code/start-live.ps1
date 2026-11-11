# Wayezy: start the app and a public link from this laptop (Cloudflare quick tunnel).
# Double-click start-live.cmd, or run:  powershell -ExecutionPolicy Bypass -File start-live.ps1
# Keep this window open while the client is looking. Close it (or press Ctrl+C) to stop both.
# The link is new every time this starts, and only works while this laptop is on and online.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$cf = Join-Path $root 'tools\cloudflared.exe'
if (-not (Test-Path $cf)) { Write-Host "tools\cloudflared.exe is missing (see DEPLOY.md)." -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }

# the app (unless it is already running)
$up = $false
try { $up = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:8766/healthz').StatusCode -eq 200 } catch { }
$server = $null
if (-not $up) {
  $server = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $root -PassThru -WindowStyle Minimized
  for ($i = 0; $i -lt 20 -and -not $up; $i++) { Start-Sleep -Milliseconds 500; try { $up = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:8766/healthz').StatusCode -eq 200 } catch { } }
}
if (-not $up) { Write-Host 'The app did not start. Is Node.js installed?' -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }

# the public link
Get-ChildItem (Join-Path $root 'tools') -Filter 'tunnel-*.log' -ErrorAction SilentlyContinue | Remove-Item -ErrorAction SilentlyContinue   # old runs (skips any still in use)
$log = Join-Path $root ('tools\tunnel-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
$tunnel = Start-Process -FilePath $cf -ArgumentList 'tunnel','--no-autoupdate','--url','http://127.0.0.1:8766' -RedirectStandardError $log -PassThru -WindowStyle Hidden
$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
  Start-Sleep -Milliseconds 500
  if (Test-Path $log) { $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1; if ($m) { $url = $m.Matches[0].Value } }
}
if (-not $url) { Write-Host 'Could not open a public link. Check the internet connection and try again.' -ForegroundColor Red }
else {
  Write-Host ''
  Write-Host '  Wayezy is live' -ForegroundColor Green
  Write-Host "  Kiosk      $url/?view=kiosk"
  Write-Host "  Phone app  $url/?view=app"
  Write-Host "  Admin hub  $url/?view=admin   (password: data\admin-password.txt)"
  Write-Host ''
  Write-Host '  Keep this window open. Close it to take the link down.'
  if (-not $env:IREO_NO_CLIPBOARD) { Set-Clipboard -Value "$url/?view=kiosk"; Write-Host '  (The kiosk link is on the clipboard.)' }
}
try { Wait-Process -Id $tunnel.Id } finally {
  if (-not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id -Force }
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}

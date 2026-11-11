@echo off
rem Starts the app and a public link from this laptop. Keep the window open while the client is looking.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-live.ps1"

# Create a Desktop shortcut for BAZER CONSOLE and set the folder icon (Windows)
# Usage: powershell -ExecutionPolicy Bypass -File .\create-desktop-shortcut.ps1
# Safe to re-run. If the repo moves, run it again to refresh the path in desktop.ini.
# NOTE: keep this file ASCII-only. Windows PowerShell 5.1 reads BOM-less .ps1 as ANSI,
# so non-ASCII text here would be corrupted before it ever runs.
$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$consoleDir = (Join-Path $here '..' | Resolve-Path).Path
$vbs = (Join-Path $consoleDir '03WINDOWS\BAZER CONSOLE.vbs' | Resolve-Path).Path

# Pick the icon: prefer BAZERCONSOLE.ico, otherwise the first .ico in this folder.
$ico = Join-Path $here 'BAZERCONSOLE.ico'
if (-not (Test-Path $ico)) {
  $found = Get-ChildItem -LiteralPath $here -Filter '*.ico' | Select-Object -First 1
  if ($found) { $ico = $found.FullName }
}
$hasIcon = Test-Path $ico
if (-not $hasIcon) { Write-Warning "No .ico found in $here - using the default Windows icon" }

# 1) Desktop shortcut
$desktop = [Environment]::GetFolderPath('Desktop')
$link = Join-Path $desktop 'BAZER CONSOLE.lnk'
$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($link)
$sc.TargetPath = Join-Path $env:SystemRoot 'System32\wscript.exe'
$sc.Arguments = '"' + $vbs + '"'
$sc.WorkingDirectory = Split-Path $vbs
$sc.Description = 'BAZER CONSOLE'
if ($hasIcon) { $sc.IconLocation = "$ico,0" }
$sc.Save()
Write-Host "shortcut: $link"

# 2) Folder icon for BAZERCONSOLE (desktop.ini)
if ($hasIcon) {
  $ini = Join-Path $consoleDir 'desktop.ini'
  if (Test-Path $ini) { attrib.exe -r -s -h $ini | Out-Null }
  $lines = @(
    '[.ShellClassInfo]'
    "IconResource=$ico,0"
    'InfoTip=BAZERCONSOLE - MAJOR / OpenCode / Plannotator'
  )
  Set-Content -LiteralPath $ini -Value $lines -Encoding Unicode
  attrib.exe +r +s $ini | Out-Null
  attrib.exe +r $consoleDir | Out-Null
  Write-Host "folder icon: $consoleDir"
}

Write-Host "icon: $ico"
Write-Host 'done'

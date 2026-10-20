Option Explicit
Dim sh, fso, folder, cfg
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
cfg = sh.ExpandEnvironmentStrings("%USERPROFILE%") & "\.config\opencode\serve-restricted.jsonc"
fso.CopyFile folder & "\lock-deepseek-only.jsonc", cfg, True
sh.Run "powershell -NoProfile -WindowStyle Hidden -Command ""Get-NetTCPConnection -LocalPort 4096 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }""", 0, True
WScript.Sleep 2500
sh.Run "wscript.exe """ & folder & "\opencode-serve.vbs""", 0, False
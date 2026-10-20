Option Explicit
' Portable launcher for BAZER Console (Windows) — resolves its own folder, so it keeps
' working after the repository is cloned or moved to another machine.
Dim sh, fso, here, target
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
target = fso.BuildPath(here, "CONSOLE\BAZER Console.vbs")
If Not fso.FileExists(target) Then
  MsgBox "BAZER Console not found:" & vbCrLf & target, 16, "BAZER CONSOLE - WINDOW (Windows)"
  WScript.Quit 1
End If
sh.CurrentDirectory = here
sh.Run """" & target & """", 1, False

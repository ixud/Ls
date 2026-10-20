' BAZER CONSOLE - portable launcher (Windows)
' Double-click this file. It finds MAJOR from its own location, so the repo can be moved.
Option Explicit
Dim fso, sh, here, major, server, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

here = fso.GetParentFolderName(WScript.ScriptFullName)
major = fso.GetParentFolderName(fso.GetParentFolderName(here))
server = major & "\BAZERCONSOLE\01MAIN\ACTIVE\SERVER\index.mjs"

If Not fso.FileExists(server) Then
  MsgBox "Server not found:" & vbCrLf & server & vbCrLf & vbCrLf & _
         "Expected layout: MAJOR\BAZERCONSOLE\01MAIN\ACTIVE\SERVER\index.mjs", 16, "BAZER CONSOLE"
  WScript.Quit 1
End If

sh.CurrentDirectory = major
cmd = "cmd /c node """ & server & """ --port=4310"
sh.Run cmd, 1, False

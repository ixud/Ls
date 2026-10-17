Option Explicit
' OpenCode background server — สำหรับ Cline (http://127.0.0.1:4096)
' ดับเบิลคลิกเพื่อเปิด (ซ่อนหน้าต่าง) — ถ้า server ทำงานอยู่แล้วจะไม่เปิดซ้ำ
' หาโปรแกรม opencode อัตโนมัติตามลำดับ: (1) ไฟล์ปักหมุด opencode-server-v1\opencode-v1.19.2.exe ข้างไฟล์นี้ (โหมด bridge V1 สำหรับ Cline — ถ้ามี)
'                                        (2) โปรแกรมที่ติดตั้งผ่าน npm: %APPDATA%\npm\node_modules\@opencode\cli (V2) แล้วค่อย opencode-ai (V1)
' ตัวแปร OPENCODE_CONFIG ชี้ไปที่ไฟล์ล็อก ~/.config/opencode/serve-restricted.jsonc (ถ้ามี)

Const HEALTH_URL = "http://127.0.0.1:4096/health"
Const HEALTH_URL2 = "http://127.0.0.1:4096/global/health"

Function ServerIsUp()
  Dim http
  ServerIsUp = False
  On Error Resume Next
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  http.setTimeouts 1500, 1500, 1500, 1500
  http.open "GET", HEALTH_URL, False
  http.send
  If Err.Number = 0 Then
    If http.status = 200 Then ServerIsUp = True
  End If
  Err.Clear
  If Not ServerIsUp Then
    http.open "GET", HEALTH_URL2, False
    http.send
    If Err.Number = 0 Then
      If http.status = 200 Then ServerIsUp = True
    End If
  End If
  On Error GoTo 0
End Function

Dim shell, fso, baseDir, exePath, cfgPath, procEnv, cand
If ServerIsUp() Then WScript.Quit 0
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
baseDir = fso.GetParentFolderName(WScript.ScriptFullName)

exePath = baseDir & "\opencode-server-v1\opencode-v1.19.2.exe"
If Not fso.FileExists(exePath) Then
  cand = shell.ExpandEnvironmentStrings("%APPDATA%") & "\npm\node_modules\@opencode\cli\bin\opencode.exe"
  If fso.FileExists(cand) Then exePath = cand
End If
If Not fso.FileExists(exePath) Then
  cand = shell.ExpandEnvironmentStrings("%APPDATA%") & "\npm\node_modules\opencode-ai\bin\opencode.exe"
  If fso.FileExists(cand) Then exePath = cand
End If
If Not fso.FileExists(exePath) Then
  MsgBox "ไม่พบโปรแกรม opencode ในเครื่อง" & vbCrLf & vbCrLf & _
         "ติดตั้งก่อนด้วยคำสั่ง:" & vbCrLf & _
         "  npm install -g @opencode/cli" & vbCrLf & vbCrLf & _
         "หรือวางโฟลเดอร์ opencode-server-v1 (มีไฟล์ opencode-v1.19.2.exe) ไว้ข้างไฟล์นี้", 48, "OpenCode Server"
  WScript.Quit 1
End If

cfgPath = shell.ExpandEnvironmentStrings("%USERPROFILE%") & "\.config\opencode\serve-restricted.jsonc"
Set procEnv = shell.Environment("PROCESS")
If fso.FileExists(cfgPath) Then procEnv("OPENCODE_CONFIG") = cfgPath
shell.Run """" & exePath & """ serve --hostname 127.0.0.1 --port 4096", 0, False

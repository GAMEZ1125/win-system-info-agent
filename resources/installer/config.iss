[Setup]
AppName=Win System Info Agent
AppVersion=1.0
DefaultDirName={pf}\Win System Info Agent
DefaultGroupName=Win System Info Agent
OutputDir=.
OutputBaseFilename=WinSystemInfoAgentInstaller
Compression=lzma
SolidCompression=yes

[Files]
Source: "..\src\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Win System Info Agent"; Filename: "{app}\main.exe"
Name: "{group}\Uninstall Win System Info Agent"; Filename: "{un}\unins000.exe"

[Run]
Filename: "{app}\main.exe"; Description: "Launch Win System Info Agent"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\unins000.exe"; Description: "Uninstall Win System Info Agent"; Flags: nowait postinstall skipifsilent
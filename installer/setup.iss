; Script de instalación para SystemInfoAgent usando Inno Setup
#define MyAppName "System Info Agent"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Mi Empresa"
#define MyAppURL "https://miempresa.com"
#define MyAppExeName "SystemInfoAgent.exe"

[Setup]
AppId={{C3E6A3B1-F8C9-4E4D-B1A6-4FBAA01D4F0A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputBaseFilename=SystemInfoAgentSetup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
UninstallDisplayIcon={app}\{#MyAppExeName}
SetupIconFile=resources\icon.ico

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startmenuicon"; Description: "Crear un acceso directo en el menú de inicio"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "startservice"; Description: "Iniciar el servicio automáticamente"; GroupDescription: "Opciones de servicio:"; Flags: checkedonce
Name: "autostart"; Description: "Iniciar la aplicación automáticamente al encender el equipo"; GroupDescription: "Opciones de inicio:"; Flags: checkedonce

[Files]
Source: "release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "resources\icon.ico"; DestDir: "{app}\resources"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: autostart

[Run]
Filename: "{app}\{#MyAppExeName}"; Parameters: "--install-service"; Description: "Instalar servicio de Windows"; Flags: runhidden postinstall; Tasks: startservice
Filename: "{app}\{#MyAppExeName}"; Description: "Iniciar {#MyAppName}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\{#MyAppExeName}"; Parameters: "--uninstall-service"; Flags: runhidden
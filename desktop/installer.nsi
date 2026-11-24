Unicode true
!include "MUI2.nsh"

!define APPNAME "小游戏大厅"
!define APPEXE "GameHub.exe"
!define VERSION "3.0.0"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\GameHubLxh0823"

Name "${APPNAME}"
OutFile "/app/desktop/dist/GameHub-Setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\${APPNAME}"
InstallDirRegKey HKCU "Software\GameHubLxh0823" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "${APPNAME} ${VERSION}"
Icon "icon.ico"
UninstallIcon "icon.ico"

!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_DIRECTORYPAGE_TEXT_TOP "安装程序将把 ${APPNAME} 安装到下面的文件夹。要安装到其他位置,请点击“浏览”选择文件夹。"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APPEXE}"
!define MUI_FINISHPAGE_RUN_TEXT "立即运行 ${APPNAME}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"

Section "Install"
  SetOutPath "$INSTDIR"
  File /r "dist/win-unpacked/*.*"
  WriteUninstaller "$INSTDIR\uninstall.exe"
  CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\${APPEXE}"
  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\${APPEXE}"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\卸载 ${APPNAME}.lnk" "$INSTDIR\uninstall.exe"
  WriteRegStr HKCU "Software\GameHubLxh0823" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\${APPEXE}"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\${APPNAME}.lnk"
  RMDir /r "$SMPROGRAMS\${APPNAME}"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNKEY}"
  DeleteRegKey HKCU "Software\GameHubLxh0823"
SectionEnd

; Included by electron-builder's NSIS script (package.json → build.nsis.include).

; "Launch at Windows startup" is a Run value the app writes itself. Electron names it after the AppUserModelId
; (io.github.xiaoyu607.desksignal, set in src/main/index.ts), so remove it here or Windows keeps trying to start a deleted exe.
; An update runs the old uninstaller too: keep the value then, the setting is still on.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "io.github.xiaoyu607.desksignal"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "io.github.xiaoyu607.desksignal"
  ${endIf}
!macroend

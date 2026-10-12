$ErrorActionPreference = 'Stop'
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
if (!$env:DS_WINDOWS_PUBLISHER) { throw 'Missing DS_WINDOWS_PUBLISHER' }
$files = @(
  "release-signed/win-unpacked/DeskSignal.exe",
  "release-signed/win-unpacked/resources/hook-helper.exe",
  "release-signed/DeskSignal-Setup-$version.exe"
)
foreach ($file in $files) {
  if (!(Test-Path $file)) { throw "Missing signed executable: $file" }
  $signature = Get-AuthenticodeSignature $file
  if ($signature.Status -ne 'Valid') { throw "Invalid/untrusted signature: $file" }
  if (!$signature.TimeStamperCertificate) { throw "Missing trusted timestamp: $file" }
  $publisher = $signature.SignerCertificate.GetNameInfo([System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false)
  if ($publisher -cne $env:DS_WINDOWS_PUBLISHER) { throw "Unexpected publisher: $file" }
  Write-Host "Verified signature and timestamp: $file"
}
if (!(Test-Path release-signed/latest.yml) -or !(Test-Path "release-signed/DeskSignal-Setup-$version.exe.blockmap")) {
  throw 'Missing update metadata'
}

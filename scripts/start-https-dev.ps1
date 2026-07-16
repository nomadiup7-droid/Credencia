$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$certDir = Join-Path $env:TEMP "credencia-local-cert"
$pfxPath = Join-Path $certDir "credencia-local-dev.pfx"
$passphrase = "credencia-local-dev"

if (-not (Test-Path $certDir)) {
  New-Item -ItemType Directory -Path $certDir | Out-Null
}

$ipAddress = $null
try {
  $ipAddress = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -First 1 -ExpandProperty IPAddress
} catch {
  $ipAddress = (ipconfig | Select-String -Pattern "IPv4.*?:\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)" |
    ForEach-Object { $_.Matches[0].Groups[1].Value } |
    Where-Object { $_ -notlike "127.*" } |
    Select-Object -First 1)
}

if (-not $ipAddress) {
  $ipAddress = "localhost"
}

if (-not (Test-Path $pfxPath)) {
  Write-Host "Gerando certificado local para localhost e $ipAddress..."
  $cert = New-SelfSignedCertificate `
    -DnsName @("localhost", $ipAddress) `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -FriendlyName "Credencia Local Dev" `
    -KeyExportPolicy Exportable `
    -NotAfter (Get-Date).AddYears(2)

  $securePassword = ConvertTo-SecureString -String $passphrase -Force -AsPlainText
  Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword | Out-Null
}

$env:HTTPS_PFX_PATH = $pfxPath
$env:HTTPS_PFX_PASSPHRASE = $passphrase
$env:HTTPS_PORT = "3443"
$env:Path = "C:\Program Files\nodejs;" + $env:Path

Write-Host ""
Write-Host "Credencia HTTP : http://localhost:3000"
Write-Host "Credencia HTTPS: https://localhost:3443"
Write-Host "Celular HTTPS  : https://$ipAddress`:3443"
Write-Host ""
Write-Host "No celular, aceite o aviso de certificado local quando o navegador pedir."
Write-Host ""

& (Join-Path $projectRoot "node_modules\.bin\tsx.cmd") (Join-Path $projectRoot "server.ts")

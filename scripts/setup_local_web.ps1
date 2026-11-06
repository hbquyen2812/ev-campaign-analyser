param([switch]$Force)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'local_web_config.ps1')
$targetPath = Join-Path $projectRoot 'frontend\.env.local'
if ((Test-Path -LiteralPath $targetPath) -and -not $Force) {
    Write-Host 'frontend/.env.local already exists. Use -Force to regenerate it from the root .env.'
    exit 0
}
$values = Read-LocalWebEnvironment -Path (Join-Path $projectRoot '.env')
if ([string]$values['AI_SERVER_TOKEN'] -match '[^\x21-\x7E]') {
    throw 'AI_SERVER_TOKEN must contain only printable ASCII characters without spaces. Use an ASCII token in the root .env.'
}
$apiPort = if ($values['AI_SERVER_PORT']) { $values['AI_SERVER_PORT'] } else { '8000' }
if ($apiPort -notmatch '^\d+$' -or [int]$apiPort -lt 1 -or [int]$apiPort -gt 65535) { throw 'AI_SERVER_PORT must be between 1 and 65535.' }
# Next.js expands dollar signs in dotenv values; preserve literal token characters.
$apiToken = ([string]$values['AI_SERVER_TOKEN']).Replace('\', '\\').Replace('"', '\"').Replace('$', '\$')
@(
    '# Server-only configuration. This file is ignored by Git.'
    "AI_SERVER_URL=http://127.0.0.1:$apiPort"
    ('AI_SERVER_TOKEN="' + $apiToken + '"')
) | Set-Content -LiteralPath $targetPath -Encoding utf8
Write-Host "Configured the frontend proxy for http://127.0.0.1:$apiPort. Token values are not printed."

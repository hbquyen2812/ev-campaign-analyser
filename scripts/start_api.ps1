param(
    [string]$Python,
    [ValidateRange(1, 65535)][int]$Port,
    [ValidateSet('template', 'ollama')][string]$ReportBackend = 'template'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'local_web_config.ps1')
$values = Read-LocalWebEnvironment -Path (Join-Path $projectRoot '.env')
if ([string]$values['AI_SERVER_TOKEN'] -match '[^\x21-\x7E]') {
    throw 'AI_SERVER_TOKEN must contain only printable ASCII characters without spaces. Update the root .env and rerun setup_local_web.ps1 -Force.'
}
if (-not $Python) { $Python = Join-Path $projectRoot 'ml\.venv\Scripts\python.exe' }
if (-not (Test-Path -LiteralPath $Python)) {
    throw 'Python environment not found. Create ml/.venv and install the ML/API requirements; see docs/RUNNING.md.'
}
if (-not $Port) { $Port = if ($values['AI_SERVER_PORT']) { [int]$values['AI_SERVER_PORT'] } else { 8000 } }
if ($Port -lt 1 -or $Port -gt 65535) { throw 'AI_SERVER_PORT must be between 1 and 65535.' }
$settings = @{
    AI_SERVER_TOKEN = [string]$values['AI_SERVER_TOKEN']
    AI_MODEL_LEGACY_PATH = Join-Path $projectRoot 'ml\models\stage1_multisource.joblib'
    AI_MODEL_X90_PATH = Join-Path $projectRoot 'ml\models\stage1_multisource_audience_x90.joblib'
    REPORT_BACKEND = $ReportBackend
    REPORT_MODEL = if ($values['REPORT_MODEL']) { $values['REPORT_MODEL'] } else { 'qwen2.5:3b' }
    OLLAMA_BASE_URL = if ($env:OLLAMA_BASE_URL) { $env:OLLAMA_BASE_URL } else { 'http://127.0.0.1:11434' }
}
$previous = @{}
foreach ($name in $settings.Keys) {
    $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    [Environment]::SetEnvironmentVariable($name, [string]$settings[$name], 'Process')
}
try {
    Write-Host "Starting the local AI API at http://127.0.0.1:$Port with $ReportBackend reports."
    & $Python -m uvicorn server.app:app --app-dir (Join-Path $projectRoot 'ml') --host 127.0.0.1 --port $Port
    $apiExitCode = $LASTEXITCODE
} finally {
    foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
if ($apiExitCode -ne 0) { throw "AI API exited with code $apiExitCode." }

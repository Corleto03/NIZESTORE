$ErrorActionPreference = 'Stop'
$prototypeRoot = $PSScriptRoot
$pythonRuntime = Join-Path $prototypeRoot '..\.venv\Scripts\python.exe'
if (!(Test-Path -LiteralPath $pythonRuntime)) { throw 'Primero crea V2/.venv e instala requirements.txt siguiendo V2/README.md.' }
Push-Location $prototypeRoot
try { & $pythonRuntime app.py } finally { Pop-Location }

param(
    [Parameter(Mandatory=$true)][string]$Slug
)

$ErrorActionPreference = "Stop"

$root        = Resolve-Path (Join-Path $PSScriptRoot "..\functions")
$sharedDir   = Join-Path $root "_shared"
$indexPath   = Join-Path $root "$Slug\index.ts"
$outPath     = Join-Path $PSScriptRoot "$Slug.bundle.ts"

if (-not (Test-Path $indexPath)) { throw "Missing $indexPath" }

$cors    = [System.IO.File]::ReadAllText((Join-Path $sharedDir "cors.ts"))
$handler = [System.IO.File]::ReadAllText((Join-Path $sharedDir "handler.ts"))
$rss     = [System.IO.File]::ReadAllText((Join-Path $sharedDir "rss.ts"))
$index   = [System.IO.File]::ReadAllText($indexPath)

# Strip local _shared imports from handler.ts and index.ts
$handler = [regex]::Replace($handler, '(?m)^\s*import\s+\{[^}]+\}\s+from\s+"\.\/cors\.ts";\s*\r?\n', "")
$index   = [regex]::Replace($index,   '(?m)^\s*import\s+(?:type\s+)?\{[^}]+\}\s+from\s+"\.\.\/_shared\/[^"]+";\s*\r?\n', "")

# Rewrite bare npm package imports to Deno-native npm: specifiers
$index = [regex]::Replace($index, 'from\s+"@supabase/supabase-js"', 'from "npm:@supabase/supabase-js@2"')

$header = @"
// =============================================================================
// Auto-bundled by supabase/.bundled/bundle.ps1 for Management API deployment.
// Do not edit by hand. Source lives under supabase/functions/$Slug/ and
// supabase/functions/_shared/.
// =============================================================================
"@

$bundle = @($header, "", "// --- _shared/cors.ts ---", $cors, "", "// --- _shared/rss.ts ---", $rss, "", "// --- _shared/handler.ts ---", $handler, "", "// --- functions/$Slug/index.ts ---", $index) -join "`n"

[System.IO.File]::WriteAllText($outPath, $bundle)
Write-Host "Wrote $outPath ($((Get-Item $outPath).Length) bytes)"

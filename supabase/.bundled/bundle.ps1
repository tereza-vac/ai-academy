param(
    [Parameter(Mandatory=$true)][string]$Slug
)

# Generic single-file bundler for Supabase edge functions, used to deploy via
# the Management API (which expects each function as one file). The bundler
# walks `import ... from "../_shared/<name>.ts"` chains starting at the
# function's index.ts and inlines every reachable shared module, then
# rewrites bare npm imports to Deno-native `npm:` specifiers.
#
# Usage:  .\bundle.ps1 -Slug resource-import

$ErrorActionPreference = "Stop"

$root        = Resolve-Path (Join-Path $PSScriptRoot "..\functions")
$sharedDir   = Join-Path $root "_shared"
$indexPath   = Join-Path $root "$Slug\index.ts"
$outPath     = Join-Path $PSScriptRoot "$Slug.bundle.ts"

if (-not (Test-Path $indexPath)) { throw "Missing $indexPath" }

# --- Discover the transitive set of _shared modules reachable from index.ts ---
$visited = New-Object 'System.Collections.Generic.HashSet[string]'
$order   = New-Object 'System.Collections.Generic.List[string]'

function Add-Shared([string]$file) {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($file)
    if ($visited.Add($name) -eq $false) { return }
    $path = Join-Path $sharedDir "$name.ts"
    if (-not (Test-Path $path)) { throw "Missing shared module: $path" }
    $body = [System.IO.File]::ReadAllText($path)
    # Recurse into nested _shared imports first so dependencies appear before dependents.
    $nested = [regex]::Matches($body, 'from\s+"\.\/(\w[\w\-]*)\.ts"')
    foreach ($m in $nested) { Add-Shared $m.Groups[1].Value }
    $order.Add($name)
}

$index = [System.IO.File]::ReadAllText($indexPath)
$matches = [regex]::Matches($index, 'from\s+"\.\.\/_shared\/(\w[\w\-]*)\.ts"')
foreach ($m in $matches) { Add-Shared $m.Groups[1].Value }

# Apply the deno.json import map at bundle time. Same set as
# supabase/functions/deno.json — keep these in sync when adding a new
# npm-only dep used by any edge function.
$NPM_REWRITES = @(
    @{ from = 'from\s+"@supabase/supabase-js"'; to = 'from "npm:@supabase/supabase-js@2"' },
    @{ from = 'from\s+"@mozilla/readability"';  to = 'from "npm:@mozilla/readability@0.5.0"' },
    @{ from = 'from\s+"linkedom"';              to = 'from "npm:linkedom@0.18.5"' },
    @{ from = 'from\s+"pdfjs-dist"';            to = 'from "npm:pdfjs-dist@4.7.76/legacy/build/pdf.mjs"' },
    @{ from = 'from\s+"@ai-sdk/openai"';        to = 'from "npm:@ai-sdk/openai@3"' },
    @{ from = 'from\s+"ai"';                    to = 'from "npm:ai@6"' },
    @{ from = 'from\s+"zod"';                   to = 'from "npm:zod@4"' }
)

function Rewrite-NpmImports([string]$text) {
    foreach ($r in $NPM_REWRITES) {
        $text = [regex]::Replace($text, $r.from, $r.to)
    }
    return $text
}

# --- Read + strip + rewrite imports from each shared module -----------------
$sharedBlocks = @()
foreach ($name in $order) {
    $body = [System.IO.File]::ReadAllText((Join-Path $sharedDir "$name.ts"))
    # Strip any `_shared/x.ts` and `./x.ts` cross-imports — they're inlined.
    $body = [regex]::Replace($body, '(?m)^\s*import\s+(?:type\s+)?\{[^}]+\}\s+from\s+"\.\/[\w\-]+\.ts";\s*\r?\n', "")
    $body = Rewrite-NpmImports $body
    $sharedBlocks += "// --- _shared/$name.ts ---"
    $sharedBlocks += $body
    $sharedBlocks += ""
}

# --- Strip + rewrite imports in index.ts ------------------------------------
$index = [regex]::Replace($index, '(?m)^\s*import\s+(?:type\s+)?\{[^}]+\}\s+from\s+"\.\.\/_shared\/[^"]+";\s*\r?\n', "")
$index = Rewrite-NpmImports $index

$header = @"
// =============================================================================
// Auto-bundled by supabase/.bundled/bundle.ps1 for Management API deployment.
// Do not edit by hand. Source lives under supabase/functions/$Slug/ and
// supabase/functions/_shared/.
// =============================================================================
"@

$bundle = @($header, "") + $sharedBlocks + @("// --- functions/$Slug/index.ts ---", $index) -join "`n"

[System.IO.File]::WriteAllText($outPath, $bundle)
Write-Host "Wrote $outPath ($((Get-Item $outPath).Length) bytes)"

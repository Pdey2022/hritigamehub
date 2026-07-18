<#
    bump-version.ps1 — Cache-Busting Version Bumper
    ===============================================
    Run this script after making any changes to CSS or JS files.
    It increments the version number in all HTML files so browsers
    download fresh files instead of serving old cached ones.

    Usage:
        .\bump-version.ps1          # Bump to next version (e.g. 3 → 4)
        .\bump-version.ps1 -Version 5  # Set specific version

    What it does:
        1. Reads the current version from .cache-version.json
        2. Increments it (or uses your specified version)
        3. Replaces ?v=OLD with ?v=NEW in ALL .html files
        4. Updates .cache-version.json with the new version
        5. Shows you what was changed
#>

param(
    [int]$Version = -1
)

$scriptPath = Split-Path -Parent $PSCommandPath
$versionFile = Join-Path $scriptPath ".cache-version.json"
$htmlFiles = Get-ChildItem -Path $scriptPath -Recurse -Filter "*.html"

# Read current version
if (Test-Path $versionFile) {
    $config = Get-Content $versionFile | ConvertFrom-Json
    $currentVersion = $config.version
} else {
    $currentVersion = 1
}

# Calculate new version
if ($Version -gt 0) {
    $newVersion = $Version
} else {
    $newVersion = $currentVersion + 1
}

Write-Host "📦 Bumping cache version: v$currentVersion → v$newVersion" -ForegroundColor Cyan
Write-Host ""

$count = 0
foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    $oldPattern = "?v=$currentVersion"
    $newPattern = "?v=$newVersion"
    
    if ($content -match [regex]::Escape($oldPattern)) {
        $updated = $content -replace [regex]::Escape($oldPattern), $newPattern
        Set-Content $file.FullName $updated -NoNewline
        Write-Host "   ✅ $($file.FullName.Replace($scriptPath, '.'))" -ForegroundColor Green
        $count++
    }
}

# Update version file
$config = @{ version = $newVersion; lastUpdated = (Get-Date -Format "yyyy-MM-dd") }
$config | ConvertTo-Json | Set-Content $versionFile

Write-Host ""
Write-Host "✅ Done! Updated $count file(s) to v$newVersion" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Next step: git add . && git commit -m ""🔧 Bump cache version to v$newVersion"" && git push"

# ============================================
# SharkPay - Bump Version Script
# ============================================
# Este script incrementa a versão do projeto automaticamente
# Deve ser executado ANTES de qualquer deploy em produção
# ============================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("patch", "minor", "major")]
    [string]$BumpType = "patch",
    
    [Parameter(Mandatory=$true)]
    [string]$Summary,
    
    [Parameter(Mandatory=$false)]
    [string]$Type = "feat",
    
    [Parameter(Mandatory=$false)]
    [bool]$BreakingChanges = $false
)

Write-Host "🚀 SharkPay Version Bump Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Ler versão atual
$versionPath = "public/version.json"
if (-not (Test-Path $versionPath)) {
    Write-Host "❌ Erro: Arquivo public/version.json não encontrado!" -ForegroundColor Red
    exit 1
}

$currentVersion = Get-Content $versionPath | ConvertFrom-Json
$version = $currentVersion.version

Write-Host "📦 Versão atual: $version" -ForegroundColor Yellow

# Parsear versão (formato: X.Y.Z)
$parts = $version -split '\.'
$major = [int]$parts[0]
$minor = [int]$parts[1]
$patch = [int]$parts[2]

# Incrementar versão
switch ($BumpType) {
    "major" {
        $major++
        $minor = 0
        $patch = 0
    }
    "minor" {
        $minor++
        $patch = 0
    }
    "patch" {
        $patch++
    }
}

$newVersion = "$major.$minor.$patch"
Write-Host "📦 Nova versão: $newVersion" -ForegroundColor Green

# Obter commit hash atual
$commitHash = git rev-parse --short HEAD 2>$null
if (-not $commitHash) {
    $commitHash = "unknown"
    Write-Host "⚠️  Git commit hash não disponível" -ForegroundColor Yellow
}

# Obter arquivos alterados (staged)
$changedFiles = git diff --cached --name-only 2>$null
if (-not $changedFiles) {
    $changedFiles = @("Manual deployment")
}

# Criar novo registro de versão
$deployedAt = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"

$newVersionEntry = @{
    version = $newVersion
    deployed_at = $deployedAt
    summary = $Summary
    commit_hash = $commitHash
    changed_files = $changedFiles
    breaking_changes = $BreakingChanges
    type = $Type
}

# Atualizar public/version.json
Write-Host "📝 Atualizando public/version.json..." -ForegroundColor Cyan
$newVersionEntry | ConvertTo-Json -Depth 10 | Set-Content $versionPath

# Atualizar public/version-history.json
Write-Host "📝 Atualizando public/version-history.json..." -ForegroundColor Cyan
$historyPath = "public/version-history.json"

if (Test-Path $historyPath) {
    $history = Get-Content $historyPath | ConvertFrom-Json
} else {
    $history = @{ versions = @() }
}

# Adicionar nova versão no início do array
$history.versions = @($newVersionEntry) + $history.versions

# Limitar a 50 versões no histórico
if ($history.versions.Count -gt 50) {
    $history.versions = $history.versions[0..49]
}

$history | ConvertTo-Json -Depth 10 | Set-Content $historyPath

Write-Host ""
Write-Host "✅ Versão atualizada com sucesso!" -ForegroundColor Green
Write-Host "   Versão: $newVersion" -ForegroundColor White
Write-Host "   Tipo: $Type" -ForegroundColor White
Write-Host "   Commit: $commitHash" -ForegroundColor White
Write-Host "   Resumo: $Summary" -ForegroundColor White
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. git add public/version.json public/version-history.json" -ForegroundColor Gray
Write-Host "   2. git commit -m `"$Type`: $Summary (v$newVersion)`"" -ForegroundColor Gray
Write-Host "   3. git push origin main" -ForegroundColor Gray
Write-Host "   4. vercel --prod" -ForegroundColor Gray
Write-Host ""

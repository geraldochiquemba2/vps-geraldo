# Script de Deploy para Cloudflare Workers (VPS Angola 2026)

Write-Host "🚀 Iniciando o processo de deploy..." -ForegroundColor Cyan

# 1. Limpar e Buildar o Frontend
Write-Host "📦 Gerando o build do React..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build do React. Abortando deploy." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 2. Deploy para Cloudflare
Write-Host "☁️ Enviando para Cloudflare Workers..." -ForegroundColor Yellow
npx wrangler deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no deploy para Cloudflare." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "✅ Tudo pronto! O seu projeto está online." -ForegroundColor Green
Write-Host "🔗 Verifique o seu domínio workers.dev" -ForegroundColor Cyan

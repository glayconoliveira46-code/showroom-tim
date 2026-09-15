# Script de inicialização do Retail Showroom Hub (Modo Demonstração)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "      INICIANDO RETAIL SHOWROOM HUB (DEMO TIM)           " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  -> Backend API & SSE:  http://localhost:3001" -ForegroundColor Green
Write-Host "  -> Frontend Showroom: http://localhost:3000" -ForegroundColor Green
Write-Host "  -> Para abrir no seu iPhone 16 (mesmo Wi-Fi):" -ForegroundColor Magenta
Write-Host "     http://192.168.1.3:3000" -ForegroundColor Magenta
Write-Host ""
Write-Host "Pressione CTRL+C para encerrar os servidores." -ForegroundColor Gray
Write-Host "----------------------------------------------------------"

npm run dev

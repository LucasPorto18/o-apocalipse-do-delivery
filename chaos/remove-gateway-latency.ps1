$headers = @{
  "User-Agent" = "toxiproxy-cli"
}

try {
  Invoke-RestMethod `
    -Method Delete `
    -Uri "http://localhost:8474/proxies/gateway/toxics/latencia_gateway_5000ms" `
    -Headers $headers

  Write-Host "Tóxico removido: latência do gateway retirada"
} catch {
  Write-Host "Tóxico não encontrado ou já removido"
}
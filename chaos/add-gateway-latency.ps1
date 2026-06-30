$headers = @{
  "User-Agent" = "toxiproxy-cli"
}

$body = @{
  name = "latencia_gateway_5000ms"
  type = "latency"
  stream = "downstream"
  toxicity = 1
  attributes = @{
    latency = 5000
    jitter = 0
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8474/proxies/gateway/toxics" `
  -ContentType "application/json" `
  -Headers $headers `
  -Body $body

Write-Host "Tóxico aplicado: gateway com 5000ms de latência"
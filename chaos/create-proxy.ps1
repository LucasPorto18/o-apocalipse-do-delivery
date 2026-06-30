$headers = @{
  "User-Agent" = "toxiproxy-cli"
}

try {
  Invoke-RestMethod `
    -Method Delete `
    -Uri "http://localhost:8474/proxies/gateway" `
    -Headers $headers
} catch {}

$body = @{
  name = "gateway"
  listen = "0.0.0.0:8666"
  upstream = "gateway:4001"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8474/proxies" `
  -ContentType "application/json" `
  -Headers $headers `
  -Body $body

Write-Host "Proxy do gateway criado em localhost:8666"
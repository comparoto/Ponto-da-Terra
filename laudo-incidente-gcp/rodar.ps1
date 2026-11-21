# Roda os 3 cenários (Repeticoes vezes cada) e gera logs\comparacao.md.
# Uso: .\rodar.ps1                      (3 repetições, ~20 min)
#      .\rodar.ps1 -Repeticoes 1        (1 repetição, ~7 min)
#      .\rodar.ps1 -Repeticoes 1 -Cenarios sem_backoff
# Rodada inválida (cliente parado por > 1 s ou menos de 97% das requisições planejadas) é movida
# para logs\_invalidas\ e refeita (até 3 tentativas).
# Os filtros usam só ASCII: o PowerShell 5.1 lê este arquivo (UTF-8 sem BOM) como ANSI.
param(
    [int]$Repeticoes = 3,
    [string[]]$Cenarios = @('sem_backoff', 'exponencial', 'exponencial_jitter')
)
Set-Location $PSScriptRoot

# Impede o Windows de suspender enquanto o script roda (volta ao normal no fim).
Add-Type -Namespace Win32 -Name Energia -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);' -ErrorAction SilentlyContinue
[Win32.Energia]::SetThreadExecutionState([uint32]2147483649) | Out-Null   # ES_CONTINUOUS | ES_SYSTEM_REQUIRED

function Invoke-Rodada([string]$rodada, [string]$estrategia) {
    for ($tentativa = 1; $tentativa -le 3; $tentativa++) {
        Write-Host "=== rodada $rodada (tentativa $tentativa) ==="
        if (Test-Path "logs\$rodada") { Remove-Item -Recurse -Force "logs\$rodada" }
        $env:RODADA = $rodada
        $env:ESTRATEGIA = $estrategia
        docker compose up --abort-on-container-exit --exit-code-from cliente --no-log-prefix cliente banco service-control 2>$null |
            Select-String -Pattern 'Rodada|tempo|de erro|plicas prontas|crashes|banco ap'
        docker compose down -t 1 *> $null
        $resumo = Get-Content "logs\$rodada\resumo.json" -Raw -ErrorAction SilentlyContinue
        if ($resumo -and $resumo -match '"valida": true') { return }
        New-Item -ItemType Directory -Force "logs\_invalidas" | Out-Null
        Move-Item "logs\$rodada" "logs\_invalidas\$rodada-tentativa$tentativa" -Force
        Write-Host "    rodada invalida: movida para logs\_invalidas\ e refeita"
    }
}

foreach ($estrategia in $Cenarios) {
    foreach ($rep in 1..$Repeticoes) {
        Invoke-Rodada "$estrategia-r$rep" $estrategia
    }
}

docker compose run --rm --no-deps cliente python comparar.py 2>$null
docker compose down -t 1 *> $null
Remove-Item Env:RODADA, Env:ESTRATEGIA -ErrorAction SilentlyContinue
[Win32.Energia]::SetThreadExecutionState([uint32]2147483648) | Out-Null   # libera a suspensão

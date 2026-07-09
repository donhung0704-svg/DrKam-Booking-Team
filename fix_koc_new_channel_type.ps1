$ErrorActionPreference = "Stop"

$path = "C:\Users\ACER\drkam-crm\src\app\koc\new\page.tsx"
$backup = "$path.bak_channel_type"

if (-not (Test-Path $path)) {
    Write-Host "KHONG TIM THAY FILE:" -ForegroundColor Red
    Write-Host $path
    exit 1
}

Copy-Item $path $backup -Force

$content = Get-Content -Path $path -Raw -Encoding UTF8
$before = $content

$patterns = @(
    'const channelTypeOptions = ["Người thật", "AI", "Pov-Unbox"];',
    'const channelTypeOptions = ["Người thật", "AI", "POV-Unbox"];',
    'const channelTypeOptions = ["Người thật", "AI", "Unbox"];'
)

$replacement = 'const channelTypeOptions = ["Người thật", "AI", "Unbox", "POV"];'

foreach ($pattern in $patterns) {
    $content = $content.Replace($pattern, $replacement)
}

# Fallback: thay mọi giá trị Pov-Unbox còn sót lại trong riêng file Thêm KOC.
$content = $content.Replace('"Pov-Unbox"', '"Unbox"')

if ($content -eq $before) {
    if ($content.Contains($replacement)) {
        Write-Host "FILE DA DUNG SAN: Nguoi that, AI, Unbox, POV" -ForegroundColor Green
        exit 0
    }

    Write-Host "KHONG TIM THAY DONG channelTypeOptions DE SUA." -ForegroundColor Yellow
    Write-Host "Da tao file backup tai:"
    Write-Host $backup
    exit 2
}

Set-Content -Path $path -Value $content -Encoding UTF8

Write-Host ""
Write-Host "DA SUA THANH CONG:" -ForegroundColor Green
Write-Host 'Nguoi that | AI | Unbox | POV'
Write-Host ""
Write-Host "File da sua:"
Write-Host $path
Write-Host ""
Write-Host "Backup:"
Write-Host $backup

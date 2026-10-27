# generate-android-icons.ps1
# PowerShell script to convert app-icon.svg → ic_launcher.png and generate all Android icons
# Run: .\generate-android-icons.ps1

$ErrorActionPreference = "Stop"

$sourceSvg = "public\app-icon.svg"
$outputPng = "public\ic_launcher.png"
$resDir = "android\app\src\main\res"

Write-Host "🐰 Meteo dei Conigli - Generating Custom Icons" -ForegroundColor Cyan
Write-Host ""

# Check if ImageMagick is available
$magick = Get-Command magick -ErrorAction SilentlyContinue
if (-not $magick) {
    Write-Host "❌ ImageMagick not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install ImageMagick from: https://imagemagick.org/script/download.php" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Download 'ImageMagick-xxx-Q16-HDRI-x64-static.exe' and install it." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ ImageMagick found: $($magick.Source)" -ForegroundColor Green
Write-Host ""

# Convert SVG to PNG 512x512
Write-Host "📐 Converting SVG to PNG 512x512..." -ForegroundColor Cyan
magick "$sourceSvg" -resize 512x512 "$outputPng"
Write-Host "✅ Created: $outputPng" -ForegroundColor Green

# Generate Android icons for each density
$densities = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

Write-Host ""
Write-Host "🤖 Generating Android icons..." -ForegroundColor Cyan

foreach ($entry in $densities.GetEnumerator()) {
    $dir = $entry.Key
    $size = $entry.Value
    $dirPath = Join-Path $resDir $dir
    
    # Create directory if not exists
    if (-not (Test-Path $dirPath)) {
        New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
    }
    
    # Generate launcher icon
    $pngPath = Join-Path $dirPath "ic_launcher.png"
    magick "$outputPng" -resize "${size}x${size}" "$pngPath"
    
    # Generate round icon
    $roundPath = Join-Path $dirPath "ic_launcher_round.png"
    magick "$outputPng" -resize "${size}x${size}" "$roundPath"
    
    Write-Host "  ✅ $dir : ${size}x${size}px" -ForegroundColor Green
}

# Generate foreground for adaptive icons
$drawableV24Dir = Join-Path $resDir "drawable-v24"
if (-not (Test-Path $drawableV24Dir)) {
    New-Item -ItemType Directory -Path $drawableV24Dir -Force | Out-Null
}
magick "$outputPng" -resize "108x108" (Join-Path $drawableV24Dir "ic_launcher_foreground.png")
Write-Host "  ✅ drawable-v24/ic_launcher_foreground.png (108x108)" -ForegroundColor Green

# Update web icons
Write-Host ""
Write-Host "🌐 Updating web icons..." -ForegroundColor Cyan
magick "$outputPng" -resize 512x512 "public\icon-512.png"
Write-Host "  ✅ public/icon-512.png" -ForegroundColor Green
magick "$outputPng" -resize 192x192 "public\icon-192.png"
Write-Host "  ✅ public/icon-192.png" -ForegroundColor Green

Write-Host ""
Write-Host "✅ All icons generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now run in terminal:" -ForegroundColor Yellow
Write-Host "   npx cap sync android"
Write-Host "   cd android && ./gradlew assembleDebug"
Write-Host ""

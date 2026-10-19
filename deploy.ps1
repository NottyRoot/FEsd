<#
.SYNOPSIS
    Deploy MMIT Portfolio Hub ขึ้น GitHub Pages

.DESCRIPTION
    เหตุผลที่ต้องมี script นี้:
        GitHub Pages ไม่เอาไฟล์ที่ .gitignore ไว้ขึ้นไปด้วย
        และ assets/js/firebase-config.js ถูก .gitignore กันไว้
        จึง deploy ตรงๆ แล้วเว็บจะไม่มี config → ค้างอยู่ใน Local Demo Mode ตลอด

    วิธีแก้ของ script นี้:
        1. สร้างไฟล์เว็บลงโฟลเดอร์ชั่วคราว .deploy/
        2. ฉีด firebase-config.js ของจริงเข้าไปใน .deploy/ ด้วย (ขั้นตอน build เท่านั้น)
        3. push ขึ้น branch ชื่อ gh-pages แบบ orphan (สร้างใหม่ทุกครั้ง)
        4. GitHub Pages serve จาก gh-pages

    ผลลัพธ์:
        main     -> ไม่มี config เลย ใช้ดู source ได้สะอาด
        gh-pages -> มี config ซึ่งจำเป็นต้อง public อยู่แล้ว เพราะเป็น web app

    ⚠️ Firebase web API key "เป็น public โดยการออกแบบ" — browser ทุกเครื่องที่เปิดเว็บ
    ต้องอ่านค่านี้ได้ จึงไม่มีทางซ่อนไว้ได้จริง ความปลอดภัยที่แท้จริงมาจาก
    Firebase Security Rules (ดู firestore.rules) ไม่ใช่การซ่อน key

.PARAMETER Token
    GitHub Personal Access Token สำหรับ push (ต้องมีสิทธิ์ Contents: Read and write)
    ถ้าไม่ส่งมา จะอ่านจาก environment variable GH_TOKEN
    Token ถูกส่งแบบ one-shot ผ่าน HTTP header เท่านั้น ไม่ถูกเขียนลง .git/config หรือ remote URL

.PARAMETER DryRun
    สร้างไฟล์ build ให้ดูเฉยๆ ไม่ commit ไม่ push

.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -DryRun
    .\deploy.ps1 -Token "ghp_xxxxxxxx"

.NOTES
    รันจากโฟลเดอร์โปรเจกต์:  cd "C:\Users\Notty\Desktop\Portfolio"
#>

[CmdletBinding()]
param(
    [string]$Token = $env:GH_TOKEN,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Root    = $PSScriptRoot
$GitExe  = 'C:\Program Files\Git\cmd\git.exe'
$Owner   = 'NottyRoot'
$Repo    = 'FEsd'
$Deploy  = Join-Path $Root '.deploy'
$CfgPath = Join-Path $Root 'assets\js\firebase-config.js'

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Fail($msg)      { Write-Host "`n!! $msg" -ForegroundColor Red; exit 1 }

if (-not (Test-Path $GitExe)) { Fail "ไม่พบ git ที่ $GitExe" }
if (-not $Root)              { Fail "รัน script จากโฟลเดอร์โปรเจกต์ ไม่ใช่ผ่าน stdin" }

# ------------------------------------------------------------------ 1. validate config
Write-Step "1/5  ตรวจ Firebase config"

if (-not (Test-Path $CfgPath)) {
    Fail @"
ไม่พบ assets\js\firebase-config.js

ทำแบบนี้ก่อน:
    copy assets\js\firebase-config.example.js assets\js\firebase-config.js
    แล้วเติมค่า Firebase จริงแทน PASTE_...
"@
}

$cfgRaw = Get-Content $CfgPath -Raw
if ($cfgRaw -match 'PASTE_') {
    Fail "assets\js\firebase-config.js ยังเป็นค่า placeholder อยู่ (มีคำว่า PASTE_) — เติมค่า Firebase จริงก่อน deploy"
}
if ($cfgRaw -notmatch 'AIza[0-9A-Za-z_\-]{20,}') {
    Fail "apiKey ดูไม่ถูกต้อง — ควรขึ้นต้นด้วย AIza ตามด้วยอักขระ 20 ตัวขึ้นไป"
}
$projectIdMatch = [regex]::Match($cfgRaw, 'projectId\s*:\s*"([^"]+)"')
if (-not $projectIdMatch.Success) { Fail "หา projectId ใน config ไม่เจอ" }
$ProjectId = $projectIdMatch.Groups[1].Value
Write-Host "   projectId = $ProjectId"

# ------------------------------------------------------------------ 2. git state
Write-Step "2/5  ตรวจสถานะ git"

$dirty = & $GitExe -C $Root status --porcelain
if ($dirty) {
    Write-Host $dirty
    Fail "มีไฟล์ที่ยังไม่ commit อยู่ — commit หรือ revert ก่อน deploy เพื่อกัน deploy ของที่ไม่ตรงกับ git"
}

$branch = (& $GitExe -C $Root rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'main') { Fail "อยู่บน branch '$branch' — deploy ต้องรันจาก main" }
Write-Host "   main สะอาด พร้อม deploy"

# ------------------------------------------------------------------ 3. build
Write-Step "3/5  สร้างไฟล์ deploy"

if (Test-Path $Deploy) { Remove-Item $Deploy -Recurse -Force }
New-Item -ItemType Directory -Path $Deploy -Force | Out-Null

# ไฟล์ที่นำขึ้นเว็บ — ไม่เอา firestore.rules / .gitignore / deploy.ps1 / ไฟล์ IDE
$Manifest = @(
    'index.html'
    'README.md'
    'SETUP.md'
    'assets\css\style.css'
    'assets\js\app.js'
    'assets\js\data.js'
    'assets\js\store.js'
    'assets\js\firebase-config.example.js'
    'assets\js\firebase-config.js'      # <- ฉีดตอน build เท่านั้น ไม่เข้า main
)

foreach ($rel in $Manifest) {
    $from = Join-Path $Root $rel
    if (-not (Test-Path $from)) { Fail "ไฟล์ใน manifest หาย: $rel" }
    $to = Join-Path $Deploy $rel
    New-Item -ItemType Directory -Path (Split-Path $to) -Force | Out-Null
    Copy-Item $from $to -Force
}

# ล้างไฟล์ที่ไม่ต้องการใน .deploy
Get-ChildItem $Deploy -Recurse -Force -File |
    Where-Object { $_.Name -in @('deploy.ps1', 'firestore.rules', '.gitignore') } |
    Remove-Item -Force

$bytes = (Get-ChildItem $Deploy -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Host ("   ไฟล์ {0} ตัว, {1:N1} KB" -f (Get-ChildItem $Deploy -Recurse -File).Count, ($bytes / 1KB))
Write-Host "   มี config จริงใน build : $(Test-Path (Join-Path $Deploy 'assets\js\firebase-config.js'))"

if ($DryRun) {
    Write-Host "`n   [DryRun] หยุดที่นี่ — ไฟล์ build อยู่ที่ $Deploy" -ForegroundColor Yellow
    exit 0
}

if (-not $Token) {
    Fail "ไม่มี token — ส่งด้วย -Token หรือตั้ง environment variable GH_TOKEN"
}

$b64     = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$Token"))
$AuthArg = "http.extraHeader=Authorization: Basic $b64"
$Url     = "https://github.com/$Owner/$Repo.git"
$env:GIT_TERMINAL_PROMPT = '0'

# ------------------------------------------------------------------ 4. push gh-pages
Write-Step "4/5  สร้าง branch gh-pages แล้ว push"

$Tmp = Join-Path $env:TEMP "ghpages_$([guid]::NewGuid().ToString('N'))"

try {
    # repo เป็น public → clone อ่านได้โดยไม่ต้องใช้ token
    & $GitExe clone --quiet --branch main --single-branch $Url $Tmp
    if ($LASTEXITCODE -ne 0) { Fail "clone ไม่สำเร็จ (code $LASTEXITCODE)" }

    # orphan branch = เริ่มจากประวัติว่างเปล่า ทุกครั้ง
    & $GitExe -C $Tmp checkout --quiet --orphan gh-pages
    if ($LASTEXITCODE -ne 0) { Fail "สร้าง orphan branch ไม่สำเร็จ (code $LASTEXITCODE)" }

    # เคลียร์ working tree + index
    & $GitExe -C $Tmp rm -rf --quiet --ignore-unmatch . 2>$null
    Get-ChildItem $Tmp -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force

    # วางไฟล์ build
    Copy-Item "$Deploy\*" $Tmp -Recurse -Force

    & $GitExe -C $Tmp add -A
    & $GitExe -C $Tmp -c user.name="NottyRoot" -c user.email="NottyRoot@users.noreply.github.com" `
        commit --quiet --message="Deploy MMIT Portfolio Hub" `
               --message="Build สำหรับ GitHub Pages — มี Firebase config ซึ่ง main ไม่มี"

    & $GitExe -c $AuthArg -C $Tmp push --quiet --force origin gh-pages
    if ($LASTEXITCODE -ne 0) { Fail "push gh-pages ไม่สำเร็จ (code $LASTEXITCODE)" }

    $newSha = (& $GitExe -C $Tmp rev-parse --short HEAD).Trim()
    Write-Host "   gh-pages = $newSha"
}
finally {
    if ($env:GIT_TERMINAL_PROMPT) { $env:GIT_TERMINAL_PROMPT = $null }
    Remove-Variable AuthArg -ErrorAction SilentlyContinue
    Remove-Item $Tmp -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $Deploy -Recurse -Force -ErrorAction SilentlyContinue
}

# ------------------------------------------------------------------ 5. verify
Write-Step "5/5  ยืนยันผลบน GitHub"

$H = @{ Authorization = "Bearer $Token"; 'User-Agent' = 'deploy.ps1'; Accept = 'application/vnd.github+json' }
try {
    $tree = Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/git/trees/gh-pages?recursive=1" -Headers $H
    $hasCfg = $tree.tree.path -contains 'assets/js/firebase-config.js'
    Write-Host "   config อยู่บน gh-pages : $(if ($hasCfg) { 'มี ✓' } else { 'ไม่มี ✗' })"

    $pages = $null
    try { $pages = Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/pages" -Headers $H } catch { }

    if (-not $pages) {
        # Pages ยังไม่ถูกเปิด → เปิดให้เลย ชี้ไปที่ gh-pages ที่เพิ่ง push ไป
        try {
            Write-Host "   Pages ยังไม่ถูกเปิด — กำลังเปิดให้..." -ForegroundColor Yellow
            $pages = Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/pages" `
                -Headers $H -Method Post -ContentType 'application/json' `
                -Body '{"source":{"branch":"gh-pages","path":"/"}}'
            Write-Host "   เปิด Pages แล้ว ✓" -ForegroundColor Green
        }
        catch {
            Write-Host "   เปิด Pages อัตโนมัติไม่สำเร็จ ($($_.Exception.Message))" -ForegroundColor Yellow
            Write-Host "   เปิดเองที่ Settings → Pages → Source = Branch: gh-pages / (root)" -ForegroundColor Yellow
        }
    }

    if ($pages) {
        Write-Host "   Pages source          : $($pages.source.branch) / $($pages.path)"
        Write-Host "   Pages url             : $($pages.html_url)"
        if ($pages.source.branch -ne 'gh-pages') {
            Write-Host "   ⚠ Pages ยังไม่ได้ชี้มา gh-pages — ตั้งที่ Settings → Pages → Source = gh-pages" -ForegroundColor Yellow
        }
        # Pages เพิ่งถูกเปิด ต้องรอ GitHub build สักครู่ก่อนเว็บเข้าถึงได้
        Write-Host "   รอ ~1 นาทีแล้วเปิด URL ได้เลย (build ครั้งแรกใช้เวลาสักครู่)" -ForegroundColor Yellow
    }
    Write-Host "   main ยังไม่มี config  : $(-not ((Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/git/trees/main?recursive=1" -Headers $H).tree.path -contains 'assets/js/firebase-config.js'))"
}
catch {
    Write-Host "   เช็คผ่าน API ไม่สำเร็จ ($($_.Exception.Message)) — เว็บ deploy แล้ว แต่ควรเช็คด้วยตาที่ Settings → Pages" -ForegroundColor Yellow
}
finally {
    Remove-Variable H, tree, pages -ErrorAction SilentlyContinue
}

Write-Host "`n>> Deploy เสร็จ" -ForegroundColor Green

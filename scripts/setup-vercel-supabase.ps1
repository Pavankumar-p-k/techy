param(
  [Parameter(Mandatory = $true)]
  [string]$SupabaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$SupabaseAnonKey,

  [Parameter(Mandatory = $true)]
  [string]$SupabaseServiceRoleKey,

  [string]$AdminEmail = "pavankumarunnam99@gmail.com",
  [string]$ProductionSiteUrl = "https://techy-delta-nine.vercel.app",
  [string]$LocalSiteUrl = "http://localhost:3000",
  [string]$RevalidateSecret = "",
  [switch]$SkipAdminPromotion
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RevalidateSecret)) {
  $RevalidateSecret = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
}

$envContent = @"
NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SupabaseAnonKey
SUPABASE_SERVICE_ROLE_KEY=$SupabaseServiceRoleKey
NEXT_PUBLIC_ADMIN_EMAIL=$AdminEmail
NEXT_PUBLIC_SITE_URL=$LocalSiteUrl
REVALIDATE_SECRET=$RevalidateSecret
"@

Set-Content -Path ".env.local" -Value $envContent -NoNewline

$targets = @("production", "preview", "development")

function Set-VercelEnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $tempFile = [System.IO.Path]::GetTempFileName()
  try {
    Set-Content -Path $tempFile -Value $Value -NoNewline
    foreach ($target in $targets) {
      cmd /c "npx vercel env add $Name $target --force < `"$tempFile`"" | Out-Null
    }
  } finally {
    Remove-Item -Force $tempFile -ErrorAction SilentlyContinue
  }
}

Set-VercelEnvValue -Name "NEXT_PUBLIC_SUPABASE_URL" -Value $SupabaseUrl
Set-VercelEnvValue -Name "NEXT_PUBLIC_SUPABASE_ANON_KEY" -Value $SupabaseAnonKey
Set-VercelEnvValue -Name "SUPABASE_SERVICE_ROLE_KEY" -Value $SupabaseServiceRoleKey
Set-VercelEnvValue -Name "NEXT_PUBLIC_ADMIN_EMAIL" -Value $AdminEmail
Set-VercelEnvValue -Name "NEXT_PUBLIC_SITE_URL" -Value $ProductionSiteUrl
Set-VercelEnvValue -Name "REVALIDATE_SECRET" -Value $RevalidateSecret

if (-not $SkipAdminPromotion) {
  $headers = @{
    "apikey" = $SupabaseServiceRoleKey
    "Authorization" = "Bearer $SupabaseServiceRoleKey"
    "Content-Type" = "application/json"
  }

  $body = @{
    target_email = $AdminEmail
  } | ConvertTo-Json -Compress

  try {
    Invoke-RestMethod -Method Post -Uri "$SupabaseUrl/rest/v1/rpc/set_admin_by_email" -Headers $headers -Body $body | Out-Null
    Write-Output "Admin promotion attempted for $AdminEmail."
  } catch {
    Write-Warning "Admin promotion call failed. Make sure your user is registered, then rerun script."
  }
}

npx vercel --prod --yes | Out-Null

Write-Output "Setup complete."
Write-Output "Local env file: .env.local"
Write-Output "Production URL: $ProductionSiteUrl"

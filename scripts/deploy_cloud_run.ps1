# CareSight — Google Cloud Run Deployment Script (PowerShell)
param(
    [string]$ProjectId = $env:GOOGLE_CLOUD_PROJECT,
    [string]$Region = "us-central1",
    [string]$ServiceName = "caresight-api"
)

if (-not $ProjectId) {
    Write-Error "Please supply -ProjectId or set $env:GOOGLE_CLOUD_PROJECT"
    exit 1
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CareSight Cloud Run Deployment: Project [$ProjectId] in [$Region]" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Cloud Build
Write-Host "Submitting Cloud Build container image..." -ForegroundColor Yellow
gcloud builds submit backend --tag "gcr.io/$ProjectId/${ServiceName}:latest" --project $ProjectId

# 2. Deploy to Cloud Run
Write-Host "Deploying container to Google Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $ServiceName `
  --image "gcr.io/$ProjectId/${ServiceName}:latest" `
  --platform managed `
  --region $Region `
  --allow-unauthenticated `
  --memory 1Gi `
  --cpu 1 `
  --set-env-vars MONGODB_DATABASE=carecircle_db,ENVIRONMENT=production `
  --project $ProjectId

Write-Host "CareSight API deployment complete!" -ForegroundColor Green

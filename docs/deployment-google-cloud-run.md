# CareSight — Google Cloud Run & Cloud Scheduler Deployment Guide

This guide details the deployment of the CareSight backend to **Google Cloud Run** and the automated medication reminder triggers to **Google Cloud Scheduler**.

---

## 1. Prerequisites

1. Google Cloud CLI (`gcloud`) installed and authorized:
   ```bash
   gcloud auth login
   gcloud config set project [YOUR_PROJECT_ID]
   ```
2. Enable Google Cloud APIs:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     artifactregistry.googleapis.com \
     cloudscheduler.googleapis.com \
     secretmanager.googleapis.com \
     logging.googleapis.com
   ```
3. MongoDB Atlas Cluster provisioned with database `carecircle_db`.

---

## 2. Store Secrets in Google Secret Manager

Store sensitive credentials in Secret Manager:
```bash
# MongoDB Atlas URI (Strictly the only application database)
echo -n "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority" | \
  gcloud secrets create caresight-mongodb-uri --data-file=-

# JWT Secret Key
echo -n "your-production-jwt-secret-key-32-chars-min" | \
  gcloud secrets create caresight-jwt-secret --data-file=-

# Gemini AI API Key
echo -n "your-google-gemini-api-key" | \
  gcloud secrets create caresight-gemini-key --data-file=-
```

---

## 3. Build & Deploy Backend Container to Cloud Run

```bash
cd backend

# Build using Google Cloud Build
gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/caresight-backend:latest

# Deploy to Cloud Run
gcloud run deploy caresight-api \
  --image gcr.io/[YOUR_PROJECT_ID]/caresight-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars MONGODB_DATABASE=carecircle_db,ENVIRONMENT=production \
  --set-secrets MONGODB_URI=caresight-mongodb-uri:latest,JWT_SECRET_KEY=caresight-jwt-secret:latest,GEMINI_API_KEY=caresight-gemini-key:latest
```

---

## 4. Configure Cloud Scheduler for Caregiver Escalation

Set up Cloud Scheduler to invoke the idempotent medication reminder & escalation check every 15 minutes:

```bash
# Retrieve deployed Cloud Run service URL
SERVICE_URL=$(gcloud run services describe caresight-api --platform managed --region us-central1 --format 'value(status.url)')

# Create scheduled job
gcloud scheduler jobs create http caresight-escalation-check \
  --schedule="*/15 * * * *" \
  --uri="${SERVICE_URL}/api/scheduler/check-reminders" \
  --http-method=POST \
  --time-zone="Asia/Kolkata" \
  --description="Checks pending medication schedules and triggers 15m reminder, 30m follow-up, and 60m caregiver escalation"
```

---

## 5. Frontend Deployment (Firebase Hosting / Cloud Storage / CDN)

Build the production frontend bundle:
```bash
cd frontend
npm run build
```
Deploy the `frontend/dist` directory to Google Cloud Storage + Cloud CDN, Firebase Hosting, or your preferred static hosting platform, pointing `/api/*` requests to the Cloud Run backend URL.

@echo off
title SAMHITA AI - Cloud Deployment Assistant
color 0B
cls
echo ===================================================
echo           SAMHITA AI - DEPLOYMENT ASSISTANT        
echo ===================================================
echo.
echo This script will help you deploy your SAMHITA AI website 
echo and backend server to the cloud step-by-step.
echo.
echo ---------------------------------------------------
echo STEP 1: CONFIGURE GEMINI API KEY
echo ---------------------------------------------------
echo.
set /p API_KEY="Enter your Gemini API Key (or press Enter to skip and use Mock AI): "
if "%API_KEY%"=="" (
    echo Using Mock AI fallback.
) else (
    echo Saving Gemini API Key to configuration...
    powershell -Command "(GC backend/.env) -replace 'GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE', 'GEMINI_API_KEY=%API_KEY%' | Out-File -encoding ASCII backend/.env"
    echo Saved!
)
echo.
echo ---------------------------------------------------
echo STEP 2: DEPLOY BACKEND TO RENDER
echo ---------------------------------------------------
echo.
echo I will now open your web browser to Render.com.
echo 1. Sign in with your GitHub account.
echo 2. Connect the repository: yuvarajsuri673/SAMHITA
echo 3. Set the following settings:
echo    - Root Directory: backend
echo    - Build Command: pip install -r requirements.txt
echo    - Start Command: python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
echo 4. In 'Environment Variables', add:
echo    - MONGODB_URI = (your mongodb connection string)
echo    - GEMINI_API_KEY = (your gemini key, if using live AI)
echo.
pause
echo Opening Render in your browser...
start https://dashboard.render.com/select-repo?type=web
echo.
echo Once you have finished creating the Web Service on Render, 
echo copy the URL Render gives you (e.g. https://xxx.onrender.com).
echo.
set /p RENDER_URL="Paste your Render Web Service URL here: "
echo.
:: Remove trailing slash if present
if "%RENDER_URL:~-1%"=="/" set "RENDER_URL=%RENDER_URL:~0,-1%"
echo.
echo Updating frontend configuration with your backend URL...
powershell -Command "(GC frontend/src/services/api.js) -replace 'const API_BASE_URL = .*', 'const API_BASE_URL = ''%RENDER_URL%/api'';' | Out-File -encoding UTF8 frontend/src/services/api.js"
echo.
echo Committing changes and pushing to GitHub...
git add backend/.env frontend/src/services/api.js
git commit -m "Configure production backend URL"
git push origin main
echo.
echo ---------------------------------------------------
echo STEP 3: DEPLOY FRONTEND TO VERCEL
echo ---------------------------------------------------
echo.
echo We will now build and deploy the React frontend using Vercel.
echo Vercel will ask you to log in in your browser.
echo.
pause
cd frontend
npx vercel --prod
echo.
echo ===================================================
echo               DEPLOYMENT COMPLETE!                 
echo ===================================================
echo.
echo Your backend is hosted on Render and your frontend 
echo website is live on Vercel!
echo.
pause

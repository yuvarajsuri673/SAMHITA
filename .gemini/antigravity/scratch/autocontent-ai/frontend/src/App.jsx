import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import PostDetails from './pages/PostDetails';
import SocialFeed from './pages/SocialFeed';
import SocialAssistant from './pages/SocialAssistant';
import Auth from './pages/Auth';
import { api } from './services/api';
import { Loader } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Auto Mode State
  const [autoMode, setAutoMode] = useState({
    active: false,
    interval: 30, // seconds
    limit: 2,
    sector: 'technology',
    secondsLeft: 30,
  });

  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStep, setPipelineStep] = useState('idle');
  const [pipelineLogs, setPipelineLogs] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerPipeline = async (sector, limit) => {
    if (pipelineRunning) return;

    setPipelineRunning(true);
    setPipelineLogs([]);
    
    const logMessage = (msg) => {
      setPipelineLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    setPipelineStep('fetching');
    logMessage(`[Topic Fetch Agent] Sourcing trending topics from RSS feeds for sector [${sector.toUpperCase()}]...`);
    
    let isRequestDone = false;
    let finalResult = null;

    const apiCallPromise = api.runPipeline(sector, limit)
      .then((res) => {
        isRequestDone = true;
        finalResult = res;
      })
      .catch((err) => {
        isRequestDone = true;
        finalResult = {
          status: 'error',
          message: err.response?.data?.detail || err.message || 'Unknown network error'
        };
        console.error(err);
      });

    // Step 2: Researching (after 2s)
    await new Promise((r) => setTimeout(r, 2200));
    if (!isRequestDone) {
      setPipelineStep('researching');
      logMessage('[Research Agent] Crawling webpage source HTML, extracting text blocks and removing noise...');
    }

    // Step 3: Generating (after 5s)
    await new Promise((r) => setTimeout(r, 3200));
    if (!isRequestDone) {
      setPipelineStep('generating');
      logMessage('[Content Generator Agent] Sending cleaned text to Gemini. Creating blog post, SEO metadata, and tags...');
    }

    // Step 4: Publishing (after 8s)
    await new Promise((r) => setTimeout(r, 3200));
    if (!isRequestDone) {
      setPipelineStep('publishing');
      logMessage('[Publishing Agent] Conducting duplicate check against MongoDB Atlas and writing validated document...');
    }

    await apiCallPromise;

    setPipelineStep('done');
    setPipelineRunning(false);

    if (finalResult && finalResult.status === 'success') {
      const metrics = finalResult.metrics;
      if (metrics && typeof metrics.created === 'number') {
        if (metrics.created > 0) {
          logMessage(`[Pipeline Engine] Completed successfully. Generated ${metrics.created} new articles. Skipped ${metrics.skipped} duplicates.`);
        } else {
          logMessage(`[Pipeline Engine] Finished. No new articles were generated (all scanned topics were verified as duplicates in the database).`);
        }
      } else {
        logMessage(`[Pipeline Engine] Completed successfully.`);
      }
      setRefreshTrigger((prev) => prev + 1);
    } else {
      const errMsg = finalResult?.message ? `: ${finalResult.message}` : ' with errors';
      logMessage(`[Pipeline Engine] Finished${errMsg}.`);
    }
  };

  // Ref to hold the latest autoMode state to avoid closure/Strict Mode duplicates
  const autoModeRef = React.useRef(autoMode);
  useEffect(() => {
    autoModeRef.current = autoMode;
  }, [autoMode]);

  // Timer Effect for Global Auto Mode Scheduler
  useEffect(() => {
    let timer = null;
    if (autoMode.active && !pipelineRunning) {
      timer = setInterval(() => {
        const current = autoModeRef.current;
        if (current.secondsLeft <= 1) {
          triggerPipeline(current.sector, current.limit);
          setAutoMode((prev) => ({
            ...prev,
            secondsLeft: prev.interval,
          }));
        } else {
          setAutoMode((prev) => ({
            ...prev,
            secondsLeft: prev.secondsLeft - 1,
          }));
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoMode.active, pipelineRunning]);

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('samhita_token');
      if (token) {
        try {
          const profile = await api.auth.getMe();
          setUser(profile);
        } catch (err) {
          console.error('Session verification failed, clearing tokens:', err);
          localStorage.removeItem('samhita_token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    };

    checkSession();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center text-dark-400">
        <Loader className="h-8 w-8 animate-spin text-primary-500 mb-2.5" />
        <p className="text-xs font-bold tracking-widest uppercase">Verifying Authorization...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={(profile) => setUser(profile)} />;
  }

  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-dark-950 text-dark-100">
        {/* Left Navigation Sidebar */}
        <Sidebar user={user} onLogout={() => setUser(null)} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Global Header */}
          <Navbar autoMode={autoMode} onMenuClick={() => setSidebarOpen(true)} />
          
          {/* Scrollable Sub Pages */}
          <main className="flex-1 overflow-y-auto bg-dark-950/95">
            <Routes>
              <Route 
                path="/" 
                element={
                  <SocialFeed 
                    refreshTrigger={refreshTrigger} 
                    autoMode={autoMode} 
                  />
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <Dashboard 
                    user={user} 
                    autoMode={autoMode}
                    setAutoMode={setAutoMode}
                    pipelineRunning={pipelineRunning}
                    pipelineStep={pipelineStep}
                    pipelineLogs={pipelineLogs}
                    triggerPipeline={triggerPipeline}
                    refreshTrigger={refreshTrigger}
                    setRefreshTrigger={setRefreshTrigger}
                  />
                } 
              />
              <Route 
                path="/assistant" 
                element={
                  <SocialAssistant 
                    user={user}
                    setRefreshTrigger={setRefreshTrigger}
                  />
                } 
              />
              <Route path="/posts/:id" element={<PostDetails />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

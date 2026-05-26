import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import AnalyticsCard from '../components/AnalyticsCard';
import PostCard from '../components/PostCard';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Terminal, 
  RefreshCw, 
  Loader, 
  Cpu, 
  Play, 
  Pause, 
  Settings, 
  X, 
  AlertTriangle,
  FileText
} from 'lucide-react';

export default function Dashboard({
  user,
  autoMode,
  setAutoMode,
  pipelineRunning,
  pipelineStep,
  pipelineLogs,
  triggerPipeline,
  refreshTrigger,
  setRefreshTrigger
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState('technology');
  const [manualLimit, setManualLimit] = useState(2);

  // Configuration Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInterval, setModalInterval] = useState(30); // default 30s for demo
  const [modalLimit, setModalLimit] = useState(2);
  const [modalSector, setModalSector] = useState('technology');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await api.getPosts();
      setPosts(data);
    } catch (err) {
      console.error('Error fetching dashboard posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger]);

  const handleClearAll = async () => {
    if (window.confirm("⚠️ WARNING: Are you sure you want to delete all articles? This action will permanently wipe the feed database and cannot be undone.")) {
      try {
        await api.deleteAllPosts();
        setPosts([]);
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error("Failed to delete posts:", err);
      }
    }
  };

  const handleStartAutoMode = () => {
    setAutoMode({
      active: true,
      interval: Number(modalInterval),
      limit: Number(modalLimit),
      sector: modalSector,
      secondsLeft: Number(modalInterval),
    });
    setIsModalOpen(false);
  };

  const handlePauseAutoMode = () => {
    setAutoMode(prev => ({
      ...prev,
      active: false
    }));
  };

  const handleResumeAutoMode = () => {
    setAutoMode(prev => ({
      ...prev,
      active: true,
      secondsLeft: prev.secondsLeft > 0 ? prev.secondsLeft : prev.interval
    }));
  };

  const openConfigModal = () => {
    setModalInterval(autoMode.interval);
    setModalLimit(autoMode.limit);
    setModalSector(autoMode.sector);
    setIsModalOpen(true);
  };

  const formatTime = (secs) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
  };

  // Compute metrics
  const totalPosts = posts.length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in relative">
      
      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnalyticsCard
          title="Total Articles"
          value={loading ? '-' : totalPosts}
          icon={BookOpen}
          color="blue"
        />
        <AnalyticsCard
          title="Published Feed"
          value={loading ? '-' : publishedCount}
          icon={CheckCircle2}
          color="green"
        />
        <AnalyticsCard
          title="Drafts Pending"
          value={loading ? '-' : draftCount}
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left 2 Columns: Pipeline trigger and Agent status console */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 shadow-md relative overflow-hidden">
            
            {/* Simulated progress tracker */}
            {pipelineRunning && (
              <div className="absolute bottom-0 inset-x-0 h-1 bg-dark-950 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-500 via-cyan-400 to-primary-500 w-1/3 rounded animate-shimmer"></div>
              </div>
            )}

            {/* Control Panel Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-dark-800">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="h-4.5 w-4.5 text-primary-400" />
                  Agentic Control Panel
                </h3>
                <p className="text-xs text-dark-400">Trigger all 4 agents to execute sequentially</p>
              </div>
              
              {/* Dropdown & Button aligned side-by-side */}
              <div className="flex items-center gap-3">
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  disabled={pipelineRunning}
                  className="bg-dark-950 border border-dark-800 hover:border-dark-750 text-xs font-bold text-white px-3 py-2 rounded-lg focus:outline-none focus:border-primary-500 transition-colors disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="technology">💻 Technology / AI</option>
                  <option value="science">🔬 Science / Space</option>
                  <option value="business">📈 Business / Finance</option>
                  <option value="health">🏥 Health / Lifestyle</option>
                  <option value="movies">🎬 Movies / Cinema</option>
                </select>

                <select
                  value={manualLimit}
                  onChange={(e) => setManualLimit(Number(e.target.value))}
                  disabled={pipelineRunning}
                  className="bg-dark-950 border border-dark-800 hover:border-dark-750 text-xs font-bold text-white px-2 py-2 rounded-lg focus:outline-none focus:border-primary-500 transition-colors disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="1">1 Post</option>
                  <option value="2">2 Posts</option>
                  <option value="3">3 Posts</option>
                  <option value="4">4 Posts</option>
                  <option value="5">5 Posts</option>
                </select>

                <button
                  onClick={() => triggerPipeline(selectedSector, manualLimit)}
                  disabled={pipelineRunning}
                  className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all duration-300 shadow-md cursor-pointer ${
                    pipelineRunning
                      ? 'bg-dark-800 text-dark-500 border border-dark-700 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-500 text-white hover:shadow-primary-600/10 hover:-translate-y-0.5'
                  }`}
                >
                  {pipelineRunning ? (
                    <>
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Run Pipeline
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Agent steps display */}
            {pipelineRunning || pipelineLogs.length > 0 ? (
              <div className="space-y-6">
                
                {/* Visual Status Steps - High-End SaaS Indicators */}
                <div className="grid grid-cols-4 gap-3 text-center text-xs font-semibold">
                  <div className={`p-2.5 rounded-lg border transition-all duration-300 ${
                    pipelineStep === 'fetching' ? 'bg-primary-600/10 text-primary-400 border-primary-500/40 shadow-inner' : 
                    pipelineStep !== 'idle' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' : 'bg-dark-950 text-dark-600 border-dark-900'
                  }`}>
                    1. Fetching
                  </div>
                  <div className={`p-2.5 rounded-lg border transition-all duration-300 ${
                    pipelineStep === 'researching' ? 'bg-primary-600/10 text-primary-400 border-primary-500/40 shadow-inner' : 
                    ['generating', 'publishing', 'done'].includes(pipelineStep) && pipelineStep !== 'idle' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' : 'bg-dark-950 text-dark-600 border-dark-900'
                  }`}>
                    2. Scraping
                  </div>
                  <div className={`p-2.5 rounded-lg border transition-all duration-300 ${
                    pipelineStep === 'generating' ? 'bg-primary-600/10 text-primary-400 border-primary-500/40 shadow-inner' : 
                    ['publishing', 'done'].includes(pipelineStep) && pipelineStep !== 'idle' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' : 'bg-dark-950 text-dark-600 border-dark-900'
                  }`}>
                    3. Generating
                  </div>
                  <div className={`p-2.5 rounded-lg border transition-all duration-300 ${
                    pipelineStep === 'publishing' ? 'bg-primary-600/10 text-primary-400 border-primary-500/40 shadow-inner' : 
                    pipelineStep === 'done' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' : 'bg-dark-950 text-dark-600 border-dark-900'
                  }`}>
                    4. Saving
                  </div>
                </div>

                {/* macOS Style Console Log Window */}
                <div className="bg-dark-950 border border-dark-850 rounded-xl overflow-hidden shadow-2xl">
                  {/* macOS window title bar */}
                  <div className="bg-dark-900/60 border-b border-dark-850 px-4 py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#ff5f56]"></span>
                      <span className="w-3 h-3 rounded-full bg-[#ffbd2e]"></span>
                      <span className="w-3 h-3 rounded-full bg-[#27c93f]"></span>
                    </div>
                    <span className="font-mono text-[10px] text-dark-500 select-none">agent_scheduler_pipeline.log</span>
                    <div className="w-12"></div>
                  </div>
                  
                  {/* Console body */}
                  <div className="p-4 font-mono text-[11px] text-dark-300 space-y-2 max-h-56 overflow-y-auto shadow-inner min-h-[140px]">
                    {pipelineLogs.map((log, index) => (
                      <div key={index} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="text-dark-500 select-none">&gt;</span>
                        <span className={log.includes('successfully') || log.includes('success') ? 'text-emerald-400 font-semibold' : ''}>{log}</span>
                      </div>
                    ))}
                    {pipelineRunning && (
                      <div className="flex items-center gap-2 text-primary-400 animate-pulse mt-2">
                        <Loader className="h-3 w-3 animate-spin" />
                        <span>Agent thread active...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-dark-950 border border-dashed border-dark-800 rounded-xl p-12 text-center text-dark-500 select-none">
                <Terminal className="h-8 w-8 text-dark-600 mx-auto mb-3" />
                <p className="text-xs font-semibold text-dark-400">Agent timeline console idle.</p>
                <p className="text-[11px] text-dark-500 mt-1">Select a category and trigger the content pipeline or enable Auto Mode scheduling.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Automate Pipeline Card */}
        <div className="space-y-6">
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 space-y-5 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="h-4.5 w-4.5 text-primary-500" />
                Automate Pipeline
              </h3>
              
              {autoMode.active ? (
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  Active
                </span>
              ) : (
                <span className="bg-dark-800 text-dark-400 border border-dark-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                  Inactive
                </span>
              )}
            </div>

            {autoMode.active ? (
              <div className="space-y-4">
                {/* Active Details */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-dark-950/50 p-3 rounded-lg border border-dark-850">
                  <div>
                    <span className="text-dark-500 block text-[10px] uppercase font-bold">Sector</span>
                    <span className="text-white font-bold capitalize">{autoMode.sector}</span>
                  </div>
                  <div>
                    <span className="text-dark-500 block text-[10px] uppercase font-bold">Limit</span>
                    <span className="text-white font-bold">{autoMode.limit} {autoMode.limit === 1 ? 'Article' : 'Articles'}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-dark-850/60">
                    <span className="text-dark-500 block text-[10px] uppercase font-bold">Posting Frequency</span>
                    <span className="text-white font-bold">Every {formatTime(autoMode.interval)}</span>
                  </div>
                </div>

                {/* Countdown Display */}
                <div className="text-center py-4 bg-dark-950 border border-dark-850 rounded-xl relative overflow-hidden">
                  <div className="text-[10px] uppercase tracking-widest text-dark-400 font-extrabold mb-1">Next Automated Post In</div>
                  <div className="text-3xl font-black text-primary-400 font-mono tracking-tight animate-pulse">
                    {formatTime(autoMode.secondsLeft)}
                  </div>
                  {pipelineRunning && (
                    <div className="absolute inset-0 bg-dark-950/90 flex items-center justify-center gap-2 text-xs font-bold text-primary-400">
                      <Loader className="h-4.5 w-4.5 animate-spin" />
                      Posting Article...
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex gap-2.5">
                  <button
                    onClick={handlePauseAutoMode}
                    className="flex-1 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause Auto
                  </button>
                  <button
                    onClick={openConfigModal}
                    className="py-2 px-3 bg-dark-800 hover:bg-dark-750 border border-dark-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center"
                    title="Change settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-dark-400 leading-relaxed">
                  Enable <strong>Auto Mode</strong> to fetch RSS feeds and publish articles automatically on a user-defined time interval.
                </p>

                {/* Paused state notice if it was active before */}
                {autoMode.interval > 0 && autoMode.secondsLeft > 0 && (
                  <div className="text-center py-2 bg-dark-950/60 border border-dark-850/80 rounded-lg text-xs text-dark-400 flex items-center justify-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    Scheduler is currently paused
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={openConfigModal}
                    className="flex-1 py-2.5 px-4 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-primary-600/10 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Configure Auto Mode
                  </button>
                  
                  {autoMode.interval > 0 && (
                    <button
                      onClick={handleResumeAutoMode}
                      className="py-2.5 px-4 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 hover:text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Resume
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Recent Articles Feed - Shifted to Bottom, Single Column Stack */}
      <div className="space-y-6 pt-4 border-t border-dark-850/60">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="h-4.5 w-4.5 text-primary-500" />
            Recent Feed Articles
          </h3>
          {posts.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3.5 py-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 text-red-400 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Remove All Articles
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((n) => (
              <div key={n} className="bg-dark-900 border border-dark-800 rounded-xl h-48 animate-pulse w-full"></div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-12 text-center text-dark-400 w-full">
            <FileText className="h-8 w-8 text-dark-500 mx-auto mb-3" />
            <p className="text-xs font-semibold text-white">No generated articles found.</p>
            <p className="text-[11px] text-dark-500 mt-1">Run the manual Content Pipeline or activate Auto Mode to generate your first posts!</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-5xl">
            {posts.slice(0, 5).map((post) => (
              <div key={post.id} className="w-full">
                <PostCard post={post} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Configuration Modal (Floating Window) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-dark-800 pb-3.5">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary-500" />
                  Pipeline Automation Settings
                </h4>
                <p className="text-[11px] text-dark-500">Configure scheduling parameters for Auto Mode</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Content / Forms */}
            <div className="space-y-4">
              
              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-dark-400 tracking-wider">Feed Category</label>
                <select
                  value={modalSector}
                  onChange={(e) => setModalSector(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 hover:border-dark-750 text-xs font-bold text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
                >
                  <option value="technology">💻 Technology / AI</option>
                  <option value="science">🔬 Science / Space</option>
                  <option value="business">📈 Business / Finance</option>
                  <option value="health">🏥 Health / Lifestyle</option>
                  <option value="movies">🎬 Movies / Cinema</option>
                </select>
              </div>

              {/* Time Interval Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-dark-400 tracking-wider">Time Interval Gap</label>
                <select
                  value={modalInterval}
                  onChange={(e) => setModalInterval(Number(e.target.value))}
                  className="w-full bg-dark-950 border border-dark-800 hover:border-dark-750 text-xs font-bold text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-primary-500 transition-colors cursor-pointer animate-fade-in"
                >
                  <option value="15">15 Seconds (Demo Speed)</option>
                  <option value="30">30 Seconds (Demo Speed)</option>
                  <option value="60">1 Minute</option>
                  <option value="300">5 Minutes</option>
                  <option value="600">10 Minutes</option>
                  <option value="1200">20 Minutes</option>
                  <option value="1800">30 Minutes</option>
                  <option value="3600">1 Hour</option>
                </select>
                <p className="text-[10px] text-dark-500">How frequently the scheduler scans and posts new articles.</p>
              </div>

              {/* Post limit selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-dark-400 tracking-wider">Generation Limit</label>
                <select
                  value={modalLimit}
                  onChange={(e) => setModalLimit(Number(e.target.value))}
                  className="w-full bg-dark-950 border border-dark-800 hover:border-dark-750 text-xs font-bold text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
                >
                  <option value="1">Limit to 1 Post per Run</option>
                  <option value="2">Limit to 2 Posts per Run</option>
                  <option value="3">Limit to 3 Posts per Run</option>
                  <option value="4">Limit to 4 Posts per Run</option>
                  <option value="5">Limit to 5 Posts per Run</option>
                </select>
                <p className="text-[10px] text-dark-500">Maximum posts written per run to control API tokens.</p>
              </div>
            </div>

            {/* Modal Warning Notice */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex gap-2 text-amber-500 text-[10px] leading-relaxed">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Auto Mode runs locally on your browser. Please keep this tab active to allow the scheduling automation to post on time.
              </div>
            </div>

            {/* Modal Footer actions */}
            <div className="flex justify-end gap-2.5 border-t border-dark-800 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-dark-850 hover:border-dark-700 bg-dark-950 hover:bg-dark-900 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartAutoMode}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-primary-600/10 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Start Auto Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

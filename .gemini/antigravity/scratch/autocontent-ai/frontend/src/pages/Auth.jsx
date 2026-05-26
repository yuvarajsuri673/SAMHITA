import React, { useState } from 'react';
import { api } from '../services/api';
import { Sparkles, Loader, Lock, Mail, User, AlertCircle } from 'lucide-react';

export default function Auth({ onAuthSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    
    if (!trimmedEmail || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isRegistering && !trimmedUsername) {
      setError('Please choose a username.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        // Register user
        await api.auth.register(trimmedUsername, trimmedEmail, password);
        // Automatically log in after registration
        const loginRes = await api.auth.login(trimmedEmail, password);
        localStorage.setItem('samhita_token', loginRes.token);
        onAuthSuccess(loginRes.user);
      } else {
        // Log in user
        const loginRes = await api.auth.login(trimmedEmail, password);
        localStorage.setItem('samhita_token', loginRes.token);
        onAuthSuccess(loginRes.user);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(
        err.response?.data?.detail || 
        'An error occurred during authentication. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-950/20 via-dark-950 to-dark-950 flex flex-col justify-center items-center p-6 relative overflow-hidden animate-fade-in">
      
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

      {/* Main card */}
      <div className="w-full max-w-md bg-dark-900/60 border border-dark-850 p-8 rounded-3xl shadow-2xl backdrop-blur-md relative z-10 space-y-8 animate-fade-in">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <h1 className="font-black text-4xl tracking-[0.25em] bg-gradient-to-r from-primary-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(20,184,166,0.3)] select-none">
            SAMHITA
          </h1>
          <p className="text-[10px] text-dark-400 tracking-[0.2em] font-extrabold uppercase">
            Agentic AI Content Automation
          </p>
        </div>

        {/* Form Title */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-white tracking-wide">
            {isRegistering ? 'Create your account' : 'Sign in to dashboard'}
          </h2>
          <p className="text-xs text-dark-500 mt-1">
            {isRegistering ? 'Join SAMHITA AI network today' : 'Enter credentials to authorize access'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                <input
                  type="text"
                  placeholder="choose_a_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-dark-600 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
              <input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark-950 border border-dark-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-dark-600 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-950 border border-dark-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-dark-600 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-primary-600/10 hover:shadow-primary-600/30 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Processing request...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {isRegistering ? 'Generate Account' : 'Authenticate Credentials'}
              </>
            )}
          </button>
        </form>

        {/* Toggle option */}
        <div className="text-center pt-2">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-xs text-dark-400 hover:text-primary-400 font-semibold transition-colors"
          >
            {isRegistering 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
}

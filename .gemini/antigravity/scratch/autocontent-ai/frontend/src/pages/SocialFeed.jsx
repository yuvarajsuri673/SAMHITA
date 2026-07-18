import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  Heart, 
  Send, 
  Eye, 
  Bookmark, 
  Sparkles, 
  AlertCircle, 
  Loader, 
  CheckCircle2, 
  Search, 
  ArrowRight, 
  Clock, 
  Laptop, 
  FlaskConical, 
  Briefcase, 
  HeartPulse, 
  Film, 
  ChevronDown, 
  ChevronUp, 
  Copy,
  Calendar,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

const sectorConfig = {
  technology: {
    label: 'Technology',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    hoverColor: 'hover:border-cyan-500/40',
    icon: Laptop
  },
  science: {
    label: 'Science',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    hoverColor: 'hover:border-emerald-500/40',
    icon: FlaskConical
  },
  business: {
    label: 'Business',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    hoverColor: 'hover:border-indigo-500/40',
    icon: Briefcase
  },
  health: {
    label: 'Health',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    hoverColor: 'hover:border-rose-500/40',
    icon: HeartPulse
  },
  movies: {
    label: 'Movies',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    hoverColor: 'hover:border-amber-500/40',
    icon: Film
  },
  general: {
    label: 'General',
    color: 'bg-dark-800 text-dark-300 border-dark-700',
    hoverColor: 'hover:border-primary-500/40',
    icon: Sparkles
  }
};

export default function SocialFeed({ refreshTrigger }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, draft, published
  const [toastMessage, setToastMessage] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [expandedSocialIds, setExpandedSocialIds] = useState(new Set());

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const data = await api.getPosts();
      setPosts(data);
    } catch (err) {
      console.error('Error fetching articles feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [refreshTrigger]);

  const handleLike = async (post, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newLikes = (post.likes || 0) + 1;
    
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, likes: newLikes, liked: true } : p))
    );

    try {
      await api.updatePost(post.id, { likes: newLikes });
    } catch (err) {
      console.error('Error saving like:', err);
    }
  };

  const handleBookmark = (postId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        showToast('Removed from bookmarks');
      } else {
        next.add(postId);
        showToast('Saved to bookmarks');
      }
      return next;
    });
  };

  const handleShare = (post, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const textToCopy = post.source_url || window.location.href;
    navigator.clipboard.writeText(textToCopy);
    showToast('Article source link copied!');
  };

  const toggleSocialPreview = (postId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedSocialIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const handleCopySocialCaption = (caption, e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(caption);
    showToast('Social caption copied!');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const getReadTime = (content) => {
    if (!content) return '1 min read';
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return `${minutes} min read`;
  };

  const getSectorMeta = (sectorStr) => {
    const s = (sectorStr || 'general').toLowerCase();
    return sectorConfig[s] || sectorConfig.general;
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.social_caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSector =
      selectedSector === 'all' || 
      (post.sector && post.sector.toLowerCase() === selectedSector.toLowerCase()) ||
      (!post.sector && selectedSector.toLowerCase() === 'technology'); // Fallback default

    const matchesStatus =
      statusFilter === 'all' || post.status === statusFilter;

    return matchesSearch && matchesSector && matchesStatus;
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 relative animate-fade-in">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary-600 border border-primary-500 text-white font-semibold text-xs px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      {/* Filter and Category Navigation Panel */}
      <div className="space-y-4 pb-4 border-b border-dark-800/80">
        
        {/* Sector Tabs and Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'technology', 'science', 'business', 'health', 'movies'].map((sect) => {
              const isActive = selectedSector === sect;
              return (
                <button
                  key={sect}
                  onClick={() => setSelectedSector(sect)}
                  className={`text-xs px-3.5 py-2 rounded-xl border font-bold capitalize transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-primary-600 text-white border-primary-500 shadow-md shadow-primary-600/10'
                      : 'bg-dark-900 text-dark-400 border-dark-850 hover:bg-dark-850 hover:text-white'
                  }`}
                >
                  {sect === 'all' ? '📁 All Sectors' : sect}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-dark-900 border border-dark-850 text-dark-400 font-bold px-3 py-2 rounded-xl select-none">
              📚 {posts.length} Total Articles
            </span>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
            <input
              type="text"
              placeholder="Search articles by title, tag, or summaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-dark-900 border border-dark-850 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 w-full transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-dark-900 border border-dark-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500 font-bold cursor-pointer"
          >
            <option value="all">📂 All Statuses</option>
            <option value="draft">⏳ Drafts Only</option>
            <option value="published">✅ Published Only</option>
          </select>
        </div>
      </div>

      {/* Main Content Feed Timeline */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-dark-400">
          <Loader className="h-8 w-8 animate-spin text-primary-500 mb-2" />
          <p className="text-xs font-semibold">Loading feed content...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-dark-900 border border-dark-850 rounded-2xl p-16 text-center text-dark-400">
          <AlertCircle className="h-10 w-10 text-dark-500 mx-auto mb-3" />
          <p className="text-md font-bold text-white mb-1">No Articles Found</p>
          <p className="text-xs mb-6 max-w-sm mx-auto">
            {searchQuery || selectedSector !== 'all' || statusFilter !== 'all'
              ? 'No articles match your current filtering selections. Try resetting your search or category selectors.'
              : 'Your article collection is currently empty. Run the content pipeline from the control panel to generate your first posts!'}
          </p>
          <Link
            to="/assistant"
            className="inline-flex items-center gap-1.5 bg-dark-850 hover:bg-dark-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-dark-700 transition-colors"
          >
            Open Social Assistant
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredPosts.map((post, idx) => {
            const isBookmarked = bookmarkedIds.has(post.id);
            const isSocialExpanded = expandedSocialIds.has(post.id);
            const meta = getSectorMeta(post.sector);
            const Icon = meta.icon;
            
            // Highlight the first post when no filters/searches are active
            const isFirst = idx === 0 && selectedSector === 'all' && searchQuery === '' && statusFilter === 'all';

            return (
              <div key={post.id} className="relative group">
                {/* Outer Glowing Border */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-3xl opacity-10 group-hover:opacity-25 transition duration-500 blur"></div>
                
                <div className="relative bg-dark-900 border border-dark-850 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 shadow-2xl">
                  
                  {/* Left Main Article Column */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Header: Sector, Read Time & Status */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${meta.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {meta.label}
                          </span>
                          <span className="text-[10px] font-semibold text-dark-400 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {getReadTime(post.content)}
                          </span>
                        </div>
                        
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          post.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {post.status}
                        </span>
                      </div>

                      {/* Title block */}
                      <Link to={`/posts/${post.id}`} className="block group/title">
                        <span className="text-xs font-extrabold text-primary-400 uppercase tracking-widest block mb-1">
                          {isFirst ? 'Featured Publication' : 'Article Publication'}
                        </span>
                        <h2 className="text-xl md:text-2xl font-black text-white group-hover/title:text-primary-400 transition-colors leading-tight">
                          {post.title}
                        </h2>
                      </Link>

                      {/* Excerpt Summary */}
                      <p className="text-dark-300 text-sm leading-relaxed line-clamp-3">
                        {post.summary}
                      </p>

                      {/* Tag list */}
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags && post.tags.map((tag, tIdx) => (
                          <span key={tIdx} className="bg-dark-850 text-dark-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-dark-800">
                            #{tag.toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Interactions Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-6 mt-6 border-t border-dark-850">
                      <div className="flex items-center gap-6 text-dark-400 text-xs">
                        {/* Likes */}
                        <button
                          onClick={(e) => handleLike(post, e)}
                          className={`flex items-center gap-1.5 transition-colors group/action cursor-pointer ${
                            post.liked ? 'text-red-500' : 'hover:text-red-400'
                          }`}
                        >
                          <Heart className={`h-4 w-4 transition-transform group-active/action:scale-125 duration-100 ${post.liked ? 'fill-red-500' : ''}`} />
                          <span className="font-bold text-[11px]">{post.likes || 0}</span>
                        </button>

                        {/* Views */}
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-4 w-4" />
                          <span className="font-bold text-[11px]">{post.views || 0}</span>
                        </div>

                        {/* Share */}
                        <button
                          onClick={(e) => handleShare(post, e)}
                          className="flex items-center gap-1.5 hover:text-primary-400 transition-colors group/share cursor-pointer"
                        >
                          <Send className="h-4 w-4 group-active/share:-translate-y-0.5 group-active/share:translate-x-0.5 transition-transform" />
                          <span className="font-bold text-[11px]">Share</span>
                        </button>

                        {/* Bookmark */}
                        <button
                          onClick={(e) => handleBookmark(post.id, e)}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isBookmarked ? 'text-amber-400' : 'hover:text-amber-400'
                          }`}
                        >
                          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>

                      <Link
                        to={`/posts/${post.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-400 hover:text-primary-300 group-hover:translate-x-1 duration-200 transition-all"
                      >
                        Read Full Article
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Right Metadata & Collapsible Social Preview Panel */}
                  <div className="w-full md:w-72 bg-dark-950/60 border border-dark-850 rounded-2xl p-5 flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <span className="text-[10px] font-extrabold text-dark-500 uppercase tracking-widest block select-none">
                        AI Workflow Sources
                      </span>
                      <div className="space-y-2">
                        <div className="text-[11px] text-dark-400">
                          <span className="font-semibold text-white block">Author Agent</span>
                          Gemini Generator Agent
                        </div>
                        <div className="text-[11px] text-dark-400 truncate">
                          <span className="font-semibold text-white block">Raw Source URL</span>
                          <a 
                            href={post.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary-400 hover:underline hover:text-primary-350"
                          >
                            {post.source_url || 'github.com/google-gemini'}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible social preview */}
                    <div className="border-t border-dark-850 pt-4">
                      <button
                        onClick={(e) => toggleSocialPreview(post.id, e)}
                        className="w-full flex items-center justify-between text-[11px] font-bold text-dark-350 hover:text-white transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-primary-500" />
                          Social Post Copy
                        </span>
                        {isSocialExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {isSocialExpanded && (
                        <div className="mt-2 space-y-2 animate-fade-in">
                          <p className="text-[10px] text-dark-400 italic bg-dark-950 border border-dark-850 p-2.5 rounded-lg leading-relaxed whitespace-pre-line select-all">
                            {post.social_caption || "Check out our latest generated AI report! #AI #Automation"}
                          </p>
                          <button
                            onClick={(e) => handleCopySocialCaption(post.social_caption, e)}
                            className="w-full bg-dark-850 hover:bg-dark-800 text-[10px] font-bold text-primary-400 hover:text-primary-350 py-1.5 rounded-md flex items-center justify-center gap-1 border border-dark-800 transition-colors cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                            Copy Social Draft
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

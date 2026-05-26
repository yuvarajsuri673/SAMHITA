import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Trash2, Globe, CheckCircle2, Clock, Edit2, Save, X, Sparkles, Loader } from 'lucide-react';

export default function PostDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  
  // Edit Form Fields State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editKeywords, setEditKeywords] = useState('');
  const [editCaption, setEditCaption] = useState('');

  const fetchPost = async () => {
    try {
      setLoading(true);
      const data = await api.getPost(id);
      setPost(data);
      
      // Initialize edit fields
      setEditTitle(data.title || '');
      setEditContent(data.content || '');
      setEditSummary(data.summary || '');
      setEditTags(data.tags?.join(', ') || '');
      setEditKeywords(data.seo_keywords?.join(', ') || '');
      setEditCaption(data.social_caption || '');
    } catch (err) {
      console.error('Error fetching post:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!post) return;
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      const updated = await api.updatePost(id, { status: newStatus });
      setPost(updated);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSaveEdits = async () => {
    try {
      const updatedData = {
        title: editTitle,
        content: editContent,
        summary: editSummary,
        tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
        seo_keywords: editKeywords.split(',').map((k) => k.trim()).filter(Boolean),
        social_caption: editCaption,
      };

      const updated = await api.updatePost(id, updatedData);
      setPost(updated);
      setEditing(false);
    } catch (err) {
      console.error('Error saving edits:', err);
    }
  };

  const handleAIRewrite = async () => {
    if (rewriting) return;
    setRewriting(true);
    try {
      const updated = await api.rewritePost(id);
      setPost(updated);
      setEditTitle(updated.title || '');
      setEditContent(updated.content || '');
      setEditing(false);
    } catch (err) {
      console.error('Error triggering AI rewrite:', err);
    } finally {
      setRewriting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await api.deletePost(id);
      navigate('/');
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  // Custom parser to render basic markdown patterns into HTML layout
  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return <h1 key={idx} className="text-3xl font-extrabold text-white mt-6 mb-3 border-b border-dark-800 pb-2">{trimmed.replace('# ', '')}</h1>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={idx} className="text-2xl font-bold text-white mt-5 mb-2.5">{trimmed.replace('## ', '')}</h2>;
      }
      if (trimmed.startsWith('### ')) {
        return <h3 key={idx} className="text-xl font-semibold text-white mt-4 mb-2">{trimmed.replace('### ', '')}</h3>;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return <li key={idx} className="ml-6 list-disc text-dark-300 my-1">{trimmed.substring(2)}</li>;
      }
      if (trimmed.startsWith('> ')) {
        return <blockquote key={idx} className="border-l-4 border-primary-500/80 pl-4 py-1 italic my-4 bg-dark-950/40 text-dark-400 rounded-r">{trimmed.substring(2)}</blockquote>;
      }
      if (trimmed === '') {
        return <div key={idx} className="h-3"></div>;
      }
      return <p key={idx} className="text-dark-300 leading-relaxed mb-3 text-base">{trimmed}</p>;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-dark-400">
        <Loader className="h-8 w-8 animate-spin text-primary-500 mb-2" />
        <p className="text-sm font-semibold">Fetching article details...</p>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Back link and controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-dark-400 hover:text-dark-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </button>

        {/* Action Button Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge Toggle */}
          <button
            onClick={handleToggleStatus}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
              post.status === 'published'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
            }`}
          >
            {post.status === 'published' ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Published
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5" />
                Draft Mode
              </>
            )}
          </button>

          {/* AI Rewrite Button */}
          <button
            onClick={handleAIRewrite}
            disabled={rewriting || editing}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all duration-300 ${
              rewriting
                ? 'bg-dark-800 text-dark-500 border-dark-700 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-500 text-white shadow-md shadow-primary-600/10 hover:shadow-primary-600/30'
            }`}
          >
            {rewriting ? (
              <>
                <Loader className="h-3.5 w-3.5 animate-spin" />
                Rewriting...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                AI Rewrite
              </>
            )}
          </button>

          {/* Edit toggle */}
          {editing ? (
            <button
              onClick={() => setEditing(false)}
              className="px-3.5 py-1.5 rounded-lg border border-dark-700 text-xs font-semibold text-dark-300 hover:bg-dark-800 flex items-center gap-1.5 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-3.5 py-1.5 rounded-lg border border-dark-700 text-xs font-semibold text-dark-300 hover:bg-dark-800 flex items-center gap-1.5 transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </button>
          )}

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            disabled={rewriting}
            className="p-1.5 rounded-lg border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/15 transition-all disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main post layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Full Post Content */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
          
          {/* Glowing AI loading screen overlay */}
          {rewriting && (
            <div className="absolute inset-0 bg-dark-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20 animate-fade-in">
              <div className="bg-primary-600/15 p-4 rounded-full border border-primary-500/30 shadow-lg shadow-primary-500/10">
                <Loader className="h-8 w-8 animate-spin text-primary-400" />
              </div>
              <p className="text-sm font-bold text-white tracking-wide">Gemini Editor Active</p>
              <p className="text-xs text-dark-400">Rewriting article headings, layout structure, and SEO copy...</p>
            </div>
          )}

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-400 mb-1.5 uppercase tracking-wide">Article Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 rounded-lg p-3 text-white text-lg font-bold focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-400 mb-1.5 uppercase tracking-wide">Markdown Body Content</label>
                <textarea
                  rows={15}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              <button
                onClick={handleSaveEdits}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-primary-600/10"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          ) : (
            <article className="prose max-w-none">
              <h1 className="text-3xl font-extrabold text-white leading-tight mb-4">
                {post.title}
              </h1>
              {renderMarkdown(post.content)}
            </article>
          )}
        </div>

        {/* Right 1 Column: Metadata & SEO features panel */}
        <div className="space-y-6">
          {/* Summary / Snippet */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 space-y-3 shadow-md">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Summary</h4>
            {editing ? (
              <textarea
                rows={3}
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                className="w-full bg-dark-950 border border-dark-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-primary-500 transition-colors"
              />
            ) : (
              <p className="text-xs text-dark-300 leading-relaxed font-medium">
                {post.summary || 'No summary generated.'}
              </p>
            )}
          </div>

          {/* Social Caption */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 space-y-3 shadow-md">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Social Caption</h4>
            {editing ? (
              <textarea
                rows={3}
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                className="w-full bg-dark-950 border border-dark-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-primary-500 transition-colors"
              />
            ) : (
              <div className="bg-dark-950/60 border border-dark-850 p-3 rounded-lg text-xs font-mono text-primary-400 break-words leading-relaxed select-all hover:bg-dark-950 transition-colors">
                {post.social_caption || 'No social caption generated.'}
              </div>
            )}
          </div>

          {/* Keywords & Tags */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 space-y-4 shadow-md">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">SEO Keywords</h4>
              {editing ? (
                <input
                  type="text"
                  placeholder="keyword1, keyword2..."
                  value={editKeywords}
                  onChange={(e) => setEditKeywords(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary-500 transition-colors"
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {post.seo_keywords && post.seo_keywords.length > 0 ? (
                    post.seo_keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="bg-primary-500/10 text-primary-400 border border-primary-500/20 text-[10px] px-2.5 py-1 rounded font-semibold uppercase"
                      >
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-dark-500 font-medium">None generated</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Tags</h4>
              {editing ? (
                <input
                  type="text"
                  placeholder="tag1, tag2..."
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary-500 transition-colors"
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags && post.tags.length > 0 ? (
                    post.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-dark-800 text-dark-300 border border-dark-700 text-[10px] px-2.5 py-1 rounded font-semibold"
                      >
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-dark-500 font-medium">None generated</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Source Link */}
          {post.source_url && (
            <a
              href={post.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-dark-900 border border-dark-800 hover:border-primary-500/30 rounded-2xl p-4 flex items-center justify-between text-xs font-semibold text-dark-400 hover:text-dark-200 transition-all shadow-md group"
            >
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-primary-500 group-hover:text-primary-400 transition-colors" />
                View original article source
              </span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </a>
          )}
        </div>

      </div>
    </div>
  );
}

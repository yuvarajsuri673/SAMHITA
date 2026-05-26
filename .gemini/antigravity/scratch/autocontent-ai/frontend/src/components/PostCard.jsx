import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export default function PostCard({ post }) {
  const formattedDate = post.created_at
    ? new Date(post.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown Date';

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden hover:border-primary-500/40 transition-all duration-300 flex flex-col group h-full hover:shadow-lg hover:shadow-primary-500/5">
      {/* Card Header Status */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-dark-400 font-medium flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formattedDate}
            </span>
            
            {post.status === 'published' ? (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Published
              </span>
            ) : (
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3 animate-pulse" />
                Draft
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors duration-200 line-clamp-2 mb-2 leading-snug">
            {post.title}
          </h3>

          <p className="text-dark-300 text-sm mb-4 line-clamp-3 leading-relaxed">
            {post.summary}
          </p>
        </div>

        <div>
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.tags && post.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="bg-dark-800 text-dark-300 text-xs px-2 py-0.5 rounded border border-dark-700 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>

          <Link
            to={`/posts/${post.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-400 hover:text-primary-300 transition-colors group-hover:translate-x-1 duration-200"
          >
            Read and Edit
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

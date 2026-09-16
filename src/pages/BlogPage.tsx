import React, { useState } from 'react';
import { PageId, BlogPost } from '../types';
import { BLOG_POSTS } from '../data/mockData';
import { Sparkles, Calendar, Clock, ArrowRight, X, User } from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';
import { StaggerGrid, StaggerItem } from '../components/motion/StaggerGrid';
import { LazyImage } from '../components/motion/LazyImage';

interface BlogPageProps {
  onNavigate: (page: PageId) => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ onNavigate }) => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Casting & Metallurgy', 'MatrixGold & Rhino 3D', '3D Printing Resins'];

  const filteredPosts = selectedCategory === 'all'
    ? BLOG_POSTS
    : BLOG_POSTS.filter((p) => (p.category || '').toLowerCase().includes(selectedCategory.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0B1330] text-[#F5F1E8] pt-28 pb-20 px-4 sm:px-8 lg:px-12">
      <div className="max-w-[1536px] mx-auto space-y-12">
        {/* Header */}
        <RevealOnScroll className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121F4D]/60 border border-[#D4AF37]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#F5E7A3]">
              CAD Knowledge Base
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#FAF8F3]">
            Jewellery CAD & Foundry Insights
          </h1>
          <p className="text-sm text-[#C9C2A6] font-light">
            Technical guides, casting shrinkage mathematics, and manufacturing best practices for master jewellers.
          </p>

          {/* Filter Chips */}
          <div className="pt-3 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-4 py-1.5 rounded-full text-xs transition-all capitalize ${
                  selectedCategory === c
                    ? 'bg-[#D4AF37] text-[#0B1330] font-semibold shadow-md'
                    : 'bg-[#080E24] text-[#C9C2A6] hover:text-white border border-[#D4AF37]/20'
                }`}
              >
                {c === 'all' ? 'All Guides' : c}
              </button>
            ))}
          </div>
        </RevealOnScroll>

        {/* Blog Post Grid */}
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredPosts.map((post, index) => {
            const displayImage = post.coverImage || post.image;
            return (
              <StaggerItem key={post.id} index={index}>
                <article
                  onClick={() => setSelectedPost(post)}
                  className="group rounded-2xl bg-[#080E24] border border-[#D4AF37]/20 overflow-hidden cursor-pointer shadow-xl hover:border-[#D4AF37] transition-all flex flex-col justify-between h-full"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#070D22]">
                    <LazyImage
                      src={displayImage}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {post.category && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#0B1330]/80 backdrop-blur border border-[#D4AF37]/30 text-[10px] uppercase font-mono text-[#F5E7A3]">
                        {post.category}
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-[11px] text-[#C9C2A6]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#D4AF37]" />
                          {post.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#D4AF37]" />
                          {post.readTime}
                        </span>
                      </div>

                      <h3 className="font-serif text-xl text-[#FAF8F3] group-hover:text-[#F5E7A3] transition-colors leading-snug">
                        {post.title}
                      </h3>

                      <p className="text-xs text-[#C9C2A6] line-clamp-3 leading-relaxed font-light">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[#D4AF37] font-semibold">
                      <span>Read Technical Guide</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </StaggerGrid>

        {/* Modal Reader */}
        {selectedPost && (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedPost(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl bg-[#0B1330] border border-[#D4AF37]/30 shadow-2xl p-6 sm:p-10 space-y-6 text-[#FAF8F3]">
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-[#080E24] text-[#C9C2A6] hover:text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-3">
                {selectedPost.category && (
                  <span className="px-3 py-1 rounded-full bg-[#121F4D] border border-[#D4AF37]/30 text-xs font-mono text-[#F5E7A3] uppercase">
                    {selectedPost.category}
                  </span>
                )}
                <h2 className="font-serif text-2xl sm:text-4xl text-[#FAF8F3] leading-snug">
                  {selectedPost.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#C9C2A6]">
                  {selectedPost.author && (
                    <span className="flex items-center gap-1.5">
                      {selectedPost.author.avatar && (
                        <img 
                          src={selectedPost.author.avatar} 
                          alt={selectedPost.author.name}
                          className="w-5 h-5 rounded-full object-cover border border-[#D4AF37]/40" 
                        />
                      )}
                      <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{selectedPost.author.name}</span>
                      <span className="text-[#C9C2A6]/60">({selectedPost.author.role})</span>
                    </span>
                  )}
                  <span>•</span>
                  <span>{selectedPost.date}</span>
                  <span>•</span>
                  <span>{selectedPost.readTime}</span>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden aspect-[16/8] border border-[#D4AF37]/20 bg-[#070D22]">
                <img
                  src={selectedPost.coverImage || selectedPost.image}
                  alt={selectedPost.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="prose prose-invert max-w-none text-xs sm:text-sm text-[#C9C2A6] leading-relaxed space-y-4">
                <p className="text-sm font-medium text-[#FAF8F3] leading-relaxed italic border-l-2 border-[#D4AF37] pl-3 py-1 bg-[#121F4D]/30 rounded-r-lg">
                  {selectedPost.excerpt}
                </p>
                {selectedPost.content && selectedPost.content.length > 0 ? (
                  selectedPost.content.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))
                ) : (
                  <p>In high-end manufacturing, precision in CAD software determines downstream success on the polishing bench.</p>
                )}
              </div>

              {selectedPost.tags && selectedPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedPost.tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="px-2.5 py-1 rounded-md bg-[#080E24] border border-[#D4AF37]/20 text-[11px] text-[#C9C2A6]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-6 border-t border-white/10 flex justify-between items-center gap-4 flex-wrap">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="px-6 py-2.5 rounded-xl border border-white/20 text-xs text-[#FAF8F3] hover:bg-white/5"
                >
                  Close Article
                </button>
                <button
                  onClick={() => {
                    setSelectedPost(null);
                    onNavigate('custom-design');
                  }}
                  className="btn-gold-luxury px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <span>Request Custom CAD Engineering</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#0B1330]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


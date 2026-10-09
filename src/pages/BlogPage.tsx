import React, { useState, useEffect } from 'react';
import { PageId, BlogPost } from '../types';
import { api } from '../services/api';
import { Sparkles, Calendar, Clock, ArrowRight, X, User, Loader2 } from 'lucide-react';
import { RevealOnScroll } from '../components/motion/RevealOnScroll';
import { StaggerGrid, StaggerItem } from '../components/motion/StaggerGrid';
import { LazyImage } from '../components/motion/LazyImage';

interface BlogPageProps {
  onNavigate: (page: PageId) => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ onNavigate }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    api.getBlogPosts()
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch blog posts:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleOpenPost = (postSummary: BlogPost) => {
    setSelectedPost(postSummary);
    if (postSummary.slug) {
      api.getBlogPost(postSummary.slug)
        .then((fullPost) => {
          if (fullPost && fullPost.title) {
            setSelectedPost(fullPost);
          }
        })
        .catch(() => {});
    }
  };

  const categories = ['all', 'Casting & Metallurgy', 'MatrixGold & Rhino 3D', '3D Printing Resins'];

  const filteredPosts = selectedCategory === 'all'
    ? posts
    : posts.filter((p) => (p.category || '').toLowerCase().includes(selectedCategory.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#17243B] pt-28 pb-20 px-4 sm:px-8 lg:px-12">
      <div className="max-w-[1536px] mx-auto space-y-12">
        {/* Header */}
        <RevealOnScroll className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF9F0] border border-[#E8D7B7]">
            <Sparkles className="w-3.5 h-3.5 text-[#B88732]" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#B88732]">
              CAD Knowledge Base
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#17345C]">
            Jewellery CAD & Foundry Insights
          </h1>
          <p className="text-sm text-[#687386] font-normal">
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
                    ? 'btn-gold-luxury text-[#17345C] font-bold shadow-sm'
                    : 'bg-white text-[#17345C] hover:bg-[#FFF9F0] border border-[#E8D7B7]'
                }`}
              >
                {c === 'all' ? 'All Guides' : c}
              </button>
            ))}
          </div>
        </RevealOnScroll>

        {/* Blog Post Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-[#B88732] animate-spin" />
            <p className="text-xs text-[#687386]">Loading CAD guides & articles…</p>
          </div>
        ) : (
          <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => {
              const displayImage = post.coverImage || post.image;
              return (
                <StaggerItem key={post.id} index={index}>
                  <article
                    onClick={() => handleOpenPost(post)}
                    className="group rounded-2xl bg-white border border-[#E8D7B7] overflow-hidden cursor-pointer shadow-sm hover:border-[#D9B66F] hover:shadow-md transition-all flex flex-col justify-between h-full"
                  >
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#FFF9F0]">
                    <LazyImage
                      src={displayImage}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {post.category && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white/90 backdrop-blur border border-[#E8D7B7] text-[10px] uppercase font-mono text-[#17345C] font-bold shadow-sm">
                        {post.category}
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-[11px] text-[#687386]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#B88732]" />
                          {post.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#B88732]" />
                          {post.readTime}
                        </span>
                      </div>

                      <h3 className="font-serif text-xl font-bold text-[#17345C] group-hover:text-[#B88732] transition-colors leading-snug">
                        {post.title}
                      </h3>

                      <p className="text-xs text-[#687386] line-clamp-3 leading-relaxed font-normal">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#E8D7B7] flex items-center justify-between text-xs text-[#B88732] font-bold">
                      <span>Read Technical Guide</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </StaggerGrid>
        )}

        {/* Modal Reader */}
        {selectedPost && (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedPost(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white border border-[#E8D7B7] shadow-2xl p-6 sm:p-10 space-y-6 text-[#17345C]">
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C] hover:bg-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-3">
                {selectedPost.category && (
                  <span className="px-3 py-1 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-xs font-mono text-[#B88732] font-bold uppercase">
                    {selectedPost.category}
                  </span>
                )}
                <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#17345C] leading-snug">
                  {selectedPost.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#687386]">
                  {selectedPost.author && (
                    <span className="flex items-center gap-1.5">
                      {selectedPost.author.avatar && (
                        <img 
                          src={selectedPost.author.avatar} 
                          alt={selectedPost.author.name}
                          className="w-5 h-5 rounded-full object-cover border border-[#E8D7B7]" 
                        />
                      )}
                      <User className="w-3.5 h-3.5 text-[#B88732]" />
                      <span className="text-[#17345C] font-semibold">{selectedPost.author.name}</span>
                      <span className="text-[#687386]">({selectedPost.author.role})</span>
                    </span>
                  )}
                  <span>•</span>
                  <span>{selectedPost.date}</span>
                  <span>•</span>
                  <span>{selectedPost.readTime}</span>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden aspect-[16/8] border border-[#E8D7B7] bg-[#FFF9F0]">
                <img
                  src={selectedPost.coverImage || selectedPost.image}
                  alt={selectedPost.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="prose max-w-none text-xs sm:text-sm text-[#687386] leading-relaxed space-y-4">
                <p className="text-sm font-medium text-[#17345C] leading-relaxed italic border-l-2 border-[#D9B66F] pl-3 py-1 bg-[#FFF9F0] rounded-r-lg">
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
                      className="px-2.5 py-1 rounded-md bg-[#FFF9F0] border border-[#E8D7B7] text-[11px] text-[#17345C]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-6 border-t border-[#E8D7B7] flex justify-between items-center gap-4 flex-wrap">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="px-6 py-2.5 rounded-xl border border-[#E8D7B7] text-xs text-[#17345C] hover:bg-[#FFF9F0]"
                >
                  Close Article
                </button>
                <button
                  onClick={() => {
                    setSelectedPost(null);
                    onNavigate('custom-design');
                  }}
                  className="btn-gold-luxury text-[#17345C] font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                >
                  <span>Request Custom CAD Engineering</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#17345C]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


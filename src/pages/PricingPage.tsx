import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Wrench, 
  PenTool, 
  Building2, 
  HelpCircle,
  Clock,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { PageId } from '../types';

interface PricingPageProps {
  onNavigate: (page: PageId, slug?: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'cad_design' | 'file_editing' | 'custom_bespoke' | 'enterprise'>('cad_design');

  return (
    <div className="min-h-screen bg-[#060B1E] text-slate-100 pt-28 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="max-w-[1600px] mx-auto space-y-10">
        {/* Page Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F5E7A3] text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            Transparent Studio Pricing & Services
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            CAD Engineering Pricing Structure
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
            Clear, competitive pricing for ready-to-cast CAD models, file modifications, custom bespoke designs, and high-volume studio retainers.
          </p>
        </div>

        {/* 4-Tab Navigation */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('cad_design')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'cad_design'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            CAD Design Pricing
          </button>

          <button
            onClick={() => setActiveTab('file_editing')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'file_editing'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            File Editing Pricing
          </button>

          <button
            onClick={() => setActiveTab('custom_bespoke')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'custom_bespoke'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <PenTool className="w-4 h-4 shrink-0" />
            Custom Design Pricing
          </button>

          <button
            onClick={() => setActiveTab('enterprise')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'enterprise'
                ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            Bulk Order Pricing
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-5xl mx-auto">
        {/* TAB 1: Ready CAD Catalog */}
        {activeTab === 'cad_design' && (
          <div className="space-y-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Ready-Made Production CAD Catalog</h2>
                  <p className="text-slate-400 text-sm mt-1">Instant digital access to master 3D jewelry files</p>
                </div>
                <button
                  onClick={() => onNavigate('collections')}
                  className="px-6 py-3 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  Browse Full Catalog <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-white text-lg">Essential Solitaires</h3>
                  <p className="text-xs text-slate-400">Standard single-stone rings, pendants & stud earrings.</p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Casting-ready .3dm & .stl</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Precise stone seats</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Immediate Download</li>
                  </ul>
                </div>

                <div className="bg-slate-950/60 border border-[#D4AF37]/40 rounded-2xl p-6 space-y-4 relative">
                  <span className="absolute -top-3 right-4 bg-[#D4AF37] text-slate-950 text-[10px] font-extrabold px-3 py-0.5 rounded-full">
                    POPULAR
                  </span>
                  <h3 className="font-bold text-white text-lg">Intricate Halo & Pavé</h3>
                  <p className="text-xs text-slate-400">Detailed micro-pave, halo settings, and accent bands.</p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Includes render preview</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Full weight breakdown</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Multi-format bundle</li>
                  </ul>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-white text-lg">Master Bridal & Sets</h3>
                  <p className="text-xs text-slate-400">Complex bridal sets, ornate bangles, and statement pieces.</p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Interlocking CAD files</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> 3D render blueprints</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Free minor resize included</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: File Editing */}
        {activeTab === 'file_editing' && (
          <div className="space-y-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">CAD File Modification & Revision</h2>
                  <p className="text-slate-400 text-sm mt-1">Upload your existing .3dm, .stl, .obj, or .step file for master editing</p>
                </div>
                <button
                  onClick={() => onNavigate('file-editing')}
                  className="px-6 py-3 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  Upload File for Edit <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-sm">Resizing & Scaling</h4>
                  <p className="text-xs text-slate-400">Ring size conversions (US, HK, EU, UK, IN), inner diameter adjustments, or proportional scaling.</p>
                </div>
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-sm">Stone Seat Revision</h4>
                  <p className="text-xs text-slate-400">Modify seat dimensions for oval, cushion, pear, or round center stones.</p>
                </div>
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-sm">Weight & Hollow Optimization</h4>
                  <p className="text-xs text-slate-400">Reduce gold/platinum weight while preserving structural integrity and casting durability.</p>
                </div>
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-sm">Mesh Repair & Format Conversion</h4>
                  <p className="text-xs text-slate-400">Fix non-manifold edges, open meshes, or convert STL/OBJ into clean 3DM NURBS geometry.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Custom Bespoke CAD */}
        {activeTab === 'custom_bespoke' && (
          <div className="space-y-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Custom Bespoke CAD Design</h2>
                  <p className="text-slate-400 text-sm mt-1">Turn reference sketches or photos into flawless production 3D CAD models</p>
                </div>
                <button
                  onClick={() => onNavigate('custom-design')}
                  className="px-6 py-3 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  Start Custom CAD Wizard <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">How Bespoke Estimations Work</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-[#D4AF37] font-bold text-sm">Step 1</span>
                    <h4 className="font-semibold text-white text-sm">Select Specifications</h4>
                    <p className="text-xs text-slate-400">Category (Ring, Pendant, etc.), stone setting style, metal purity, and size parameters.</p>
                  </div>
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-[#D4AF37] font-bold text-sm">Step 2</span>
                    <h4 className="font-semibold text-white text-sm">Upload References</h4>
                    <p className="text-xs text-slate-400">Attach hand sketches, photos, or select reference items from our master catalog.</p>
                  </div>
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-[#D4AF37] font-bold text-sm">Step 3</span>
                    <h4 className="font-semibold text-white text-sm">Engineer Review</h4>
                    <p className="text-xs text-slate-400">Our bench jewelers analyze casting feasibility and send final confirmation.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Enterprise Retainer */}
        {activeTab === 'enterprise' && (
          <div className="space-y-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Studio & Enterprise Retainer Plans</h2>
                  <p className="text-slate-400 text-sm mt-1">Dedicated CAD engineering capacity for manufacturers, brands & retailers</p>
                </div>
                <button
                  onClick={() => onNavigate('contact')}
                  className="px-6 py-3 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  Contact Studio Manager <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-white text-lg">Boutique Brand Retainer</h3>
                  <p className="text-xs text-slate-400">Ideal for growing jewelry brands requiring regular monthly CAD design creation and file maintenance.</p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Priority queue turnarounds</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Direct WhatsApp CAD engineer line</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Unlimited minor file revisions</li>
                  </ul>
                </div>

                <div className="bg-slate-950/70 border border-[#D4AF37]/50 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-white text-lg">High-Volume Manufacturer</h3>
                  <p className="text-xs text-slate-400">Dedicated team of senior CAD designers producing 50+ casting-ready models per month.</p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Custom Rhino template library</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> MatrixGold & Matrix CAM optimization</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Dedicated NDA & IP protection</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingPage;

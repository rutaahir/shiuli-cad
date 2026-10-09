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
    <div className="min-h-screen bg-[#FFFDF9] text-[#17243B] pt-28 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="max-w-[1600px] mx-auto space-y-10">
        {/* Page Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C] text-xs font-semibold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#B88732]" />
            Transparent Studio Pricing &amp; Services
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#17345C] tracking-tight">
            CAD Engineering Pricing Structure
          </h1>
          <p className="text-[#687386] text-base sm:text-lg max-w-2xl mx-auto font-light">
            Clear, competitive pricing for ready-to-cast CAD models, file modifications, custom bespoke designs, and high-volume studio retainers.
          </p>
        </div>

        {/* 4-Tab Navigation */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-2 bg-white p-2 rounded-2xl border border-[#E8D7B7] shadow-sm">
          <button
            onClick={() => setActiveTab('cad_design')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'cad_design'
                ? 'bg-gradient-to-r from-[#D9B66F] to-[#E8D7B7] text-[#17345C] font-bold shadow-md shadow-[#D9B66F]/20 border border-[#D9B66F]'
                : 'text-[#687386] hover:text-[#17345C] hover:bg-[#FFF9F0]'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 text-[#B88732]" />
            CAD Design Pricing
          </button>

          <button
            onClick={() => setActiveTab('file_editing')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'file_editing'
                ? 'bg-gradient-to-r from-[#D9B66F] to-[#E8D7B7] text-[#17345C] font-bold shadow-md shadow-[#D9B66F]/20 border border-[#D9B66F]'
                : 'text-[#687386] hover:text-[#17345C] hover:bg-[#FFF9F0]'
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0 text-[#B88732]" />
            File Editing Pricing
          </button>

          <button
            onClick={() => setActiveTab('custom_bespoke')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'custom_bespoke'
                ? 'bg-gradient-to-r from-[#D9B66F] to-[#E8D7B7] text-[#17345C] font-bold shadow-md shadow-[#D9B66F]/20 border border-[#D9B66F]'
                : 'text-[#687386] hover:text-[#17345C] hover:bg-[#FFF9F0]'
            }`}
          >
            <PenTool className="w-4 h-4 shrink-0 text-[#B88732]" />
            Custom Design Pricing
          </button>

          <button
            onClick={() => setActiveTab('enterprise')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'enterprise'
                ? 'bg-gradient-to-r from-[#D9B66F] to-[#E8D7B7] text-[#17345C] font-bold shadow-md shadow-[#D9B66F]/20 border border-[#D9B66F]'
                : 'text-[#687386] hover:text-[#17345C] hover:bg-[#FFF9F0]'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0 text-[#B88732]" />
            Bulk Order Pricing
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-5xl mx-auto mt-8">
        {/* TAB 1: Ready CAD Catalog */}
        {activeTab === 'cad_design' && (
          <div className="space-y-8">
            <div className="bg-white border border-[#E8D7B7] rounded-3xl p-6 sm:p-10 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E8D7B7] pb-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-[#17345C]">Ready-Made Production CAD Catalog</h2>
                  <p className="text-[#687386] text-sm mt-1 font-light">Instant digital access to master 3D jewelry files</p>
                </div>
                <button
                  onClick={() => onNavigate('collections')}
                  className="btn-gold-luxury px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
                >
                  Browse Full Catalog <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#FFF9F0] border border-[#E8D7B7] rounded-2xl p-6 space-y-4 shadow-sm">
                  <h3 className="font-serif font-bold text-[#17345C] text-lg">Essential Solitaires</h3>
                  <p className="text-xs text-[#687386]">Standard single-stone rings, pendants &amp; stud earrings.</p>
                  <ul className="space-y-2 text-xs text-[#17345C]">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Casting-ready .3dm &amp; .stl</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Precise stone seats</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Immediate Download</li>
                  </ul>
                </div>

                <div className="bg-[#FFF9F0] border-2 border-[#D9B66F] rounded-2xl p-6 space-y-4 relative shadow-md">
                  <span className="absolute -top-3 right-4 bg-[#D9B66F] text-[#17345C] text-[10px] font-extrabold px-3 py-0.5 rounded-full shadow-sm">
                    POPULAR
                  </span>
                  <h3 className="font-serif font-bold text-[#17345C] text-lg">Intricate Halo &amp; Pavé</h3>
                  <p className="text-xs text-[#687386]">Detailed micro-pave, halo settings, and accent bands.</p>
                  <ul className="space-y-2 text-xs text-[#17345C]">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Includes render preview</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Full weight breakdown</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Multi-format bundle</li>
                  </ul>
                </div>

                <div className="bg-[#FFF9F0] border border-[#E8D7B7] rounded-2xl p-6 space-y-4 shadow-sm">
                  <h3 className="font-serif font-bold text-[#17345C] text-lg">Master Bridal &amp; Sets</h3>
                  <p className="text-xs text-[#687386]">Complex bridal sets, ornate bangles, and statement pieces.</p>
                  <ul className="space-y-2 text-xs text-[#17345C]">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Interlocking CAD files</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> 3D render blueprints</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Free minor resize included</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: File Editing */}
        {activeTab === 'file_editing' && (
          <div className="space-y-8">
            <div className="bg-white border border-[#E8D7B7] rounded-3xl p-6 sm:p-10 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E8D7B7] pb-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-[#17345C]">CAD File Modification &amp; Revision</h2>
                  <p className="text-[#687386] text-sm mt-1 font-light">Upload your existing .3dm, .stl, .obj, or .step file for master editing</p>
                </div>
                <button
                  onClick={() => onNavigate('file-editing')}
                  className="btn-gold-luxury px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
                >
                  Upload File for Edit <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#FFF9F0] border border-[#E8D7B7] rounded-xl space-y-2">
                  <h4 className="font-serif font-bold text-[#17345C] text-sm">Resizing &amp; Scaling</h4>
                  <p className="text-xs text-[#687386]">Ring size conversions (US, HK, EU, UK, IN), inner diameter adjustments, or proportional scaling.</p>
                </div>
                <div className="p-4 bg-[#FFF9F0] border border-[#E8D7B7] rounded-xl space-y-2">
                  <h4 className="font-serif font-bold text-[#17345C] text-sm">Stone Seat Revision</h4>
                  <p className="text-xs text-[#687386]">Modify seat dimensions for oval, cushion, pear, or round center stones.</p>
                </div>
                <div className="p-4 bg-[#FFF9F0] border border-[#E8D7B7] rounded-xl space-y-2">
                  <h4 className="font-serif font-bold text-[#17345C] text-sm">Weight &amp; Hollow Optimization</h4>
                  <p className="text-xs text-[#687386]">Reduce gold/platinum weight while preserving structural integrity and casting durability.</p>
                </div>
                <div className="p-4 bg-[#FFF9F0] border border-[#E8D7B7] rounded-xl space-y-2">
                  <h4 className="font-serif font-bold text-[#17345C] text-sm">Mesh Repair &amp; Format Conversion</h4>
                  <p className="text-xs text-[#687386]">Fix non-manifold edges, open meshes, or convert STL/OBJ into clean 3DM NURBS geometry.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Custom Bespoke CAD */}
        {activeTab === 'custom_bespoke' && (
          <div className="space-y-8">
            <div className="bg-white border border-[#E8D7B7] rounded-3xl p-6 sm:p-10 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E8D7B7] pb-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-[#17345C]">Custom Bespoke CAD Design</h2>
                  <p className="text-[#687386] text-sm mt-1 font-light">Turn reference sketches or photos into flawless production 3D CAD models</p>
                </div>
                <button
                  onClick={() => onNavigate('custom-design')}
                  className="btn-gold-luxury px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
                >
                  Start Custom CAD Wizard <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#B88732] uppercase tracking-wider">How Bespoke Estimations Work</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#FFF9F0] rounded-2xl border border-[#E8D7B7] space-y-2">
                    <span className="text-[#B88732] font-bold text-sm">Step 1</span>
                    <h4 className="font-serif font-semibold text-[#17345C] text-sm">Select Specifications</h4>
                    <p className="text-xs text-[#687386]">Category (Ring, Pendant, etc.), stone setting style, metal purity, and size parameters.</p>
                  </div>
                  <div className="p-4 bg-[#FFF9F0] rounded-2xl border border-[#E8D7B7] space-y-2">
                    <span className="text-[#B88732] font-bold text-sm">Step 2</span>
                    <h4 className="font-serif font-semibold text-[#17345C] text-sm">Upload References</h4>
                    <p className="text-xs text-[#687386]">Attach hand sketches, photos, or select reference items from our master catalog.</p>
                  </div>
                  <div className="p-4 bg-[#FFF9F0] rounded-2xl border border-[#E8D7B7] space-y-2">
                    <span className="text-[#B88732] font-bold text-sm">Step 3</span>
                    <h4 className="font-serif font-semibold text-[#17345C] text-sm">Engineer Review</h4>
                    <p className="text-xs text-[#687386]">Our bench jewelers analyze casting feasibility and send final confirmation.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Enterprise Retainer */}
        {activeTab === 'enterprise' && (
          <div className="space-y-8">
            <div className="bg-white border border-[#E8D7B7] rounded-3xl p-6 sm:p-10 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E8D7B7] pb-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-[#17345C]">Studio &amp; Enterprise Retainer Plans</h2>
                  <p className="text-[#687386] text-sm mt-1 font-light">Dedicated CAD engineering capacity for manufacturers, brands &amp; retailers</p>
                </div>
                <button
                  onClick={() => onNavigate('contact')}
                  className="btn-gold-luxury px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
                >
                  Contact Studio Manager <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#FFF9F0] border border-[#E8D7B7] rounded-2xl p-6 space-y-4 shadow-sm">
                  <h3 className="font-serif font-bold text-[#17345C] text-lg">Boutique Brand Retainer</h3>
                  <p className="text-xs text-[#687386]">Ideal for growing jewelry brands requiring regular monthly CAD design creation and file maintenance.</p>
                  <ul className="space-y-2 text-xs text-[#17345C]">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Priority queue turnarounds</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Direct WhatsApp CAD engineer line</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Unlimited minor file revisions</li>
                  </ul>
                </div>

                <div className="bg-[#FFF9F0] border-2 border-[#D9B66F] rounded-2xl p-6 space-y-4 shadow-md">
                  <h3 className="font-serif font-bold text-[#17345C] text-lg">High-Volume Manufacturer</h3>
                  <p className="text-xs text-[#687386]">Dedicated team of senior CAD designers producing 50+ casting-ready models per month.</p>
                  <ul className="space-y-2 text-xs text-[#17345C]">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Custom Rhino template library</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> MatrixGold &amp; Matrix CAM optimization</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#B88732]" /> Dedicated NDA &amp; IP protection</li>
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

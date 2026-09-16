import React, { useState } from 'react';
import { 
  Sparkles, 
  Wand2, 
  ArrowRight, 
  Layers, 
  Diamond, 
  CheckCircle2, 
  RefreshCw, 
  Lightbulb, 
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';
import { PageId } from '../types';

interface AIJewelleryPageProps {
  onNavigate: (page: PageId, slug?: string) => void;
}

const PRESET_PROMPTS = [
  'Art Deco emerald cut diamond ring with tapered baguette side stones in 18k yellow gold',
  'Intricate filigree lotus blossom pendant with central ruby cabochon',
  'Modern architectural geometric cuff bracelet in white gold and pavé diamonds',
  'Vintage Victorian floral drop earrings with South Sea pearls'
];

const AI_FEATURE_MODES = [
  { id: 'concepts', label: 'AI Jewellery Concepts', desc: 'Generative 3D concepts from prompt' },
  { id: 'image-to-design', label: 'Image to Jewellery Design', desc: 'Convert 2D photo to 3D concept' },
  { id: 'assisted', label: 'AI-Assisted Design', desc: 'Bench jeweler + AI hybrid modeling' },
  { id: 'concept-to-cad', label: 'Concept to CAD', desc: 'Direct wax-ready export' },
  { id: 'custom-ai', label: 'Custom AI Jewellery', desc: 'Tailored prompt modeling' }
];

export const AIJewelleryPage: React.FC<AIJewelleryPageProps> = ({ onNavigate }) => {
  const [activeMode, setActiveMode] = useState<string>('concepts');
  const [inputText, setInputText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedConcepts, setGeneratedConcepts] = useState<any[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async (promptToUse?: string) => {
    const text = promptToUse || inputText;
    if (!text.trim()) {
      setErrorMsg('Please enter a description or pick a preset style prompt.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await api.generateAIConcepts({
        input_text: text,
        input_type: activeMode
      });
      const concepts = Array.isArray(res) ? res : [res];
      setGeneratedConcepts(concepts);
      if (concepts.length > 0) {
        setSelectedConcept(concepts[0]);
      }
    } catch (err: any) {
      console.error('AI concept generation error:', err);
      setErrorMsg(err.message || 'Failed to generate AI concepts. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConvertTocad = (concept: any) => {
    // Save generated concept details to session storage for seamless handoff to Custom Design Wizard
    if (concept) {
      sessionStorage.setItem('ai_concept_handoff', JSON.stringify({
        title: concept.prompt || inputText,
        image: concept.image_url,
        notes: concept.notes || 'AI-generated concept baseline'
      }));
    }
    onNavigate('custom-design');
  };

  return (
    <div className="min-h-screen bg-[#060B1E] text-slate-100 pt-28 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8 xl:px-12">
      {/* Hero Header */}
      <div className="max-w-4xl mx-auto text-center space-y-4 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F5E7A3] text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          Next-Gen Generative Jewelry Studio
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          AI + Jewellery Studio
        </h1>
        <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
          Transform text concepts and sketches into high-definition 3D CAD baselines. Our AI bridge merges artificial intelligence with master bench jeweler precision.
        </p>
      </div>

      {/* 5 AI Sub-Feature Selector Bar */}
      <div className="max-w-4xl mx-auto mb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800">
          {AI_FEATURE_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`p-3 rounded-xl text-xs font-semibold transition-all text-center flex flex-col items-center justify-center ${
                activeMode === mode.id
                  ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div>
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[#D4AF37]" />
                Describe Your Jewelry Vision
              </label>
              <textarea
                rows={5}
                placeholder="Describe your dream jewelry piece in detail (e.g. Modern solitaire engagement ring with hidden halo, platinum band, knife-edge profile)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-[#D4AF37] placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[#D4AF37]" />
                Or Try Master Preset Prompts
              </label>
              <div className="space-y-2">
                {PRESET_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(prompt);
                      handleGenerate(prompt);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-[#D4AF37]/50 text-xs text-slate-300 hover:text-white transition-all duration-200 line-clamp-2"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-800">
                {errorMsg}
              </p>
            )}

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => handleGenerate()}
              className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:from-[#F5E7A3] hover:to-[#D4AF37] text-slate-950 font-bold rounded-2xl shadow-lg shadow-[#D4AF37]/20 transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating AI Concept...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate 3D Jewelry Concept
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Generated Output Display */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl min-h-[500px] flex flex-col justify-between">
            {isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] animate-pulse">
                  <Cpu className="w-8 h-8 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-white">Synthesizing 3D Geometry Baseline...</h3>
                <p className="text-slate-400 text-sm max-w-sm">
                  Calculating stone seat placement, metal thickness, and casting tolerances.
                </p>
              </div>
            ) : selectedConcept ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">
                      Generated AI Concept
                    </span>
                    <h3 className="text-xl font-bold text-white mt-0.5">
                      {selectedConcept.prompt || 'Custom Concept'}
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    Casting Feasible
                  </span>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                  <img
                    src={selectedConcept.image_url}
                    alt="AI Concept Render"
                    className="w-full h-80 sm:h-96 object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-xs text-slate-200 font-mono">
                    AI Seed #{selectedConcept.id || '9842'}
                  </div>
                </div>

                {/* Concept Technical Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Est. Weight</span>
                    <span className="text-sm font-bold text-white">4.2g (18k Gold)</span>
                  </div>
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Setting Type</span>
                    <span className="text-sm font-bold text-white">4-Prong Solitaire</span>
                  </div>
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Prerequisites</span>
                    <span className="text-sm font-bold text-[#F5E7A3]">Ready for CAD</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleConvertTocad(selectedConcept)}
                    className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:from-[#F5E7A3] hover:to-[#D4AF37] text-slate-950 font-extrabold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 text-base"
                  >
                    Convert this AI Concept to 3D CAD Request
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500">
                  <Sparkles className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <h3 className="text-lg font-bold text-white">No Concept Generated Yet</h3>
                <p className="text-slate-400 text-sm max-w-sm">
                  Enter your jewelry description or click a preset prompt on the left to generate your initial AI concept render.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIJewelleryPage;

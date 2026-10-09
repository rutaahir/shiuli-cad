import React, { useState, useEffect } from 'react';
import { 
  FileUp, 
  CheckSquare, 
  Square, 
  Send, 
  ShoppingBag, 
  Sparkles, 
  FileCode, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  RefreshCw,
  Wrench,
  Lock,
  LogIn,
  UserPlus
} from 'lucide-react';
import { api } from '../services/api';
import { ModificationTypeData, PageId } from '../types';
import { useAuth } from '../context/AuthContext';

interface FileEditingPageProps {
  onNavigate: (page: PageId, slug?: string) => void;
}

export const FileEditingPage: React.FC<FileEditingPageProps> = ({ onNavigate }) => {
  const { user, isLoggedIn, openAuthModal } = useAuth();
  const [modificationTypes, setModificationTypes] = useState<ModificationTypeData[]>([]);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(true);
  
  // Form State
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [cadFile, setCadFile] = useState<File | null>(null);
  const [selectedModTypeIds, setSelectedModTypeIds] = useState<number[]>([]);
  const [targetWeightGrams, setTargetWeightGrams] = useState<string>('');
  const [targetStoneSizeMm, setTargetStoneSizeMm] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);

  // Status state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      setClientName(user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.username || '');
      setClientEmail(user.email || '');
      setClientPhone(user.phone_number || '');
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    setLoadingTypes(true);
    api.getModificationTypes()
      .then((data) => {
        if (mounted) {
          setModificationTypes(data.filter((m: any) => m.is_active));
        }
      })
      .catch((err) => {
        console.error('Failed to load modification types:', err);
      })
      .finally(() => {
        if (mounted) setLoadingTypes(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const toggleModType = (id: number) => {
    setSelectedModTypeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['3dm', 'stl', 'obj', 'step'].includes(ext || '')) {
        setErrorMsg('Invalid file type. Please upload a .3dm, .stl, .obj, or .step file.');
        return;
      }
      setErrorMsg(null);
      setCadFile(file);
    }
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReferenceFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (directOrder: boolean = false) => {
    if (!isLoggedIn) {
      setErrorMsg('Only logged in users can submit CAD file edit requests. Please log in or create an account.');
      openAuthModal('Please log in to submit your CAD file modification request.');
      return;
    }

    if (!cadFile) {
      setErrorMsg('Please upload your source CAD file (.3dm, .stl, .obj, or .step).');
      return;
    }
    if (selectedModTypeIds.length === 0) {
      setErrorMsg('Please select at least one modification required.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter detailed modification instructions.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('original_file', cadFile);
      formData.append('original_file_format', cadFile.name.split('.').pop()?.toLowerCase() || '3dm');
      formData.append('contact_name', clientName || user?.username || 'Client User');
      formData.append('contact_email', clientEmail || user?.email || '');
      formData.append('contact_phone', clientPhone || user?.phone_number || '');
      formData.append('modification_types', JSON.stringify(selectedModTypeIds));

      let fullDescription = description;
      if (targetWeightGrams || targetStoneSizeMm) {
        fullDescription += `\n\n[Specs]\nTarget Weight: ${targetWeightGrams || 'N/A'}g\nTarget Stone Size: ${targetStoneSizeMm || 'N/A'}`;
      }
      formData.append('description', fullDescription);
      if (referenceFile) formData.append('reference_image', referenceFile);
      formData.append('submission_intent', directOrder ? 'place_order' : 'quote_only');

      await api.createFileEditRequest(formData);

      setSubmitSuccess(true);
      setSubmitMessage(
        directOrder
          ? 'Your file modification request has been submitted for immediate engineering assessment. Our master team will get back to you shortly.'
          : 'Your CAD modification quote request has been submitted successfully! We will review your file and provide full details.'
      );
    } catch (err: any) {
      console.error('File edit submission error:', err);
      setErrorMsg(err.message || 'Failed to submit file modification request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#17243B] pt-28 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="max-w-[1600px] mx-auto space-y-10">
        {/* Header Banner */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[#B88732] text-xs font-semibold uppercase tracking-wider">
            <Wrench className="w-3.5 h-3.5 text-[#B88732]" />
            Master CAD Services
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#17345C] tracking-tight">
            CAD File Editing & Modification Studio
          </h1>
          <p className="text-[#687386] text-base sm:text-lg max-w-2xl mx-auto">
            Upload your existing 3D jewelry CAD file (<span className="text-[#B88732] font-semibold">.3dm, .stl, .obj, .step</span>) for professional resize, stone setting adjustment, weight reduction, mesh repair, or format conversion.
          </p>
        </div>

        {submitSuccess ? (
          <div className="bg-white border border-[#E8D7B7] rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 bg-[#FFF9F0] border border-[#E8D7B7] rounded-full flex items-center justify-center mx-auto text-[#B88732]">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#17345C]">Modification Request Received!</h2>
            <p className="text-[#687386] max-w-xl mx-auto text-base">{submitMessage}</p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => {
                  setSubmitSuccess(false);
                  setCadFile(null);
                  setSelectedModTypeIds([]);
                  setDescription('');
                }}
                className="px-6 py-3 btn-gold-luxury text-[#17345C] font-bold rounded-xl"
              >
                Submit Another File
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="px-6 py-3 bg-white border border-[#E8D7B7] text-[#17345C] font-semibold rounded-xl hover:bg-[#FFF9F0] transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#E8D7B7] rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm">
            {!isLoggedIn && (
              <div className="p-6 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-[#E8D7B7] flex items-center justify-center text-[#B88732] shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-[#17345C] text-base">Account Authentication Required</h4>
                    <p className="text-xs text-[#687386] mt-0.5">
                      Only logged-in users can submit CAD file editing requests so your original CAD files, price quotes, and updates stay secured to your account.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openAuthModal('Please log in to submit your CAD file modification request.')}
                    className="px-4 py-2 btn-gold-luxury text-[#17345C] font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <LogIn className="w-4 h-4" /> Log In
                  </button>
                  <button
                    onClick={() => onNavigate('register')}
                    className="px-4 py-2 bg-white hover:bg-[#FFF9F0] text-[#17345C] font-semibold text-xs rounded-xl border border-[#E8D7B7] flex items-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-[#B88732]" /> Register
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Upload Source CAD File */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-[#E8D7B7] pb-3">
                <div className="w-8 h-8 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[#B88732] font-bold flex items-center justify-center text-sm">
                  1
                </div>
                <h3 className="text-xl font-serif font-bold text-[#17345C]">Upload Your Source CAD File</h3>
              </div>

              <div className="relative border-2 border-dashed border-[#E8D7B7] hover:border-[#D9B66F] rounded-2xl p-8 text-center bg-[#FFF9F0]/50 hover:bg-[#FFF9F0] transition-colors cursor-pointer group">
                <input
                  type="file"
                  accept=".3dm,.stl,.obj,.step"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-white border border-[#E8D7B7] group-hover:border-[#D9B66F] group-hover:text-[#B88732] rounded-2xl flex items-center justify-center mx-auto text-[#687386] transition-colors shadow-sm">
                    <FileUp className="w-7 h-7" />
                  </div>
                  <div>
                    {cadFile ? (
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#17345C]">
                        <FileCode className="w-4 h-4 text-[#B88732]" />
                        {cadFile.name} ({(cadFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </div>
                    ) : (
                      <>
                        <p className="text-base font-semibold text-[#17345C]">
                          Drag & drop or click to upload your CAD file
                        </p>
                        <p className="text-xs text-[#687386] mt-1">
                          Supported formats: <strong className="text-[#17345C]">.3dm, .stl, .obj, .step</strong> (Max 50MB)
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Select Modification Types */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-[#E8D7B7] pb-3">
                <div className="w-8 h-8 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[#B88732] font-bold flex items-center justify-center text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-[#17345C]">Select Modifications Required</h3>
                  <p className="text-xs text-[#687386]">Select one or multiple edits needed on your file</p>
                </div>
              </div>

              {loadingTypes ? (
                <div className="py-8 text-center text-[#687386] text-sm">
                  Loading available modification options...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {modificationTypes.map((mod) => {
                    const isSelected = selectedModTypeIds.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModType(mod.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                          isSelected
                            ? 'bg-[#FFF9F0] border-[#D9B66F] text-[#17345C] shadow-sm'
                            : 'bg-white border-[#E8D7B7] text-[#17345C] hover:border-[#D9B66F]/60'
                        }`}
                      >
                        <div className="mt-0.5 text-[#B88732]">
                          {isSelected ? <CheckSquare className="w-5 h-5 text-[#B88732]" /> : <Square className="w-5 h-5 text-[#687386]/40" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-[#17345C]">{mod.label}</h4>
                          <p className="text-xs text-[#687386] mt-0.5 leading-snug">{mod.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3: Detailed Instructions & Parameters */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-[#E8D7B7] pb-3">
                <div className="w-8 h-8 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[#B88732] font-bold flex items-center justify-center text-sm">
                  3
                </div>
                <h3 className="text-xl font-serif font-bold text-[#17345C]">Modification Details & Specs</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#17345C] mb-1.5">
                    Target Metal Weight (Grams) - Optional
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 5.5"
                    value={targetWeightGrams}
                    onChange={(e) => setTargetWeightGrams(e.target.value)}
                    className="w-full bg-[#FFFDF9] border border-[#E8D7B7] rounded-xl px-4 py-2.5 text-sm text-[#17345C] focus:outline-none focus:border-[#D9B66F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17345C] mb-1.5">
                    Target Stone Size (mm / ct) - Optional
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Center 6.5mm / 1.0ct"
                    value={targetStoneSizeMm}
                    onChange={(e) => setTargetStoneSizeMm(e.target.value)}
                    className="w-full bg-[#FFFDF9] border border-[#E8D7B7] rounded-xl px-4 py-2.5 text-sm text-[#17345C] focus:outline-none focus:border-[#D9B66F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17345C] mb-1.5">
                  Detailed Instructions <span className="text-[#B88732]">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe in detail what needs to be edited (e.g. Change ring size from US 6 to US 7.5, increase prong height by 0.3mm for 1.2ct diamond, reduce shank weight by 15%)."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#FFFDF9] border border-[#E8D7B7] rounded-xl p-3.5 text-sm text-[#17345C] focus:outline-none focus:border-[#D9B66F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17345C] mb-1.5">
                  Reference Sketch or Mark-up Image (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2.5 bg-[#FFF9F0] hover:bg-white text-xs font-semibold text-[#17345C] rounded-xl cursor-pointer border border-[#E8D7B7] transition-colors flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5 text-[#B88732]" />
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReferenceChange}
                      className="hidden"
                    />
                  </label>
                  {referenceFile && (
                    <span className="text-xs text-[#B88732] font-medium truncate">
                      {referenceFile.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Step 4: Contact & Action Buttons */}
            <div className="space-y-4 pt-4 border-t border-[#E8D7B7]">
              <h3 className="text-lg font-serif font-bold text-[#17345C] mb-2">Your Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Your Name *"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="bg-[#FFFDF9] border border-[#E8D7B7] rounded-xl px-4 py-2.5 text-sm text-[#17345C] focus:outline-none focus:border-[#D9B66F]"
                />
                <input
                  type="email"
                  placeholder="Email Address *"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="bg-[#FFFDF9] border border-[#E8D7B7] rounded-xl px-4 py-2.5 text-sm text-[#17345C] focus:outline-none focus:border-[#D9B66F]"
                />
                <input
                  type="tel"
                  placeholder="Phone / WhatsApp"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="bg-[#FFFDF9] border border-[#E8D7B7] rounded-xl px-4 py-2.5 text-sm text-[#17345C] focus:outline-none focus:border-[#D9B66F]"
                />
              </div>

              <div className="pt-6 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(false)}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-white hover:bg-[#FFF9F0] border border-[#E8D7B7] font-semibold text-[#17345C] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-[#B88732]" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-[#B88732]" />
                      Submit for Review & Quote
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(true)}
                  className="flex-1 py-3.5 px-6 rounded-xl btn-gold-luxury text-[#17345C] font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-[#17345C]" />
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Order Modification Directly
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileEditingPage;

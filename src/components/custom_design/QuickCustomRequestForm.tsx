import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Mic,
  Square,
  Volume2,
  Trash2,
  Check,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  FileAudio,
  ShoppingBag,
  HelpCircle,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { useCatalog, BackendProduct } from '../../hooks/useCatalog';
import { useAuth } from '../../context/AuthContext';
import { appStore } from '../../services/store';
import { PageId } from '../../types';

interface QuickCustomRequestFormProps {
  onNavigate?: (page: PageId, params?: any) => void;
  onSwitchToStepByStep?: () => void;
}

export const QuickCustomRequestForm: React.FC<QuickCustomRequestFormProps> = ({
  onNavigate,
  onSwitchToStepByStep
}) => {
  const { user, isLoggedIn } = useAuth();
  const catalogState = useCatalog();

  // 1. Photos State
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // 2. Reference Product State
  const [selectedProduct, setSelectedProduct] = useState<BackendProduct | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState<string>('');

  // 3. Description State
  const [description, setDescription] = useState<string>('');

  // 4. Voice Recording State
  const [voiceMode, setVoiceMode] = useState<'live' | 'upload'>('live');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [voiceAudioFile, setVoiceAudioFile] = useState<File | null>(null);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // 5. Contact Info State
  const [contactName, setContactName] = useState<string>(
    user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username || ''
  );
  const [contactEmail, setContactEmail] = useState<string>(user?.email || '');
  const [contactPhone, setContactPhone] = useState<string>(user?.phone_number || '');

  // 6. Submission & Feedback State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string>('');
  const [submittedTicket, setSubmittedTicket] = useState<any>(null);

  // Sync user info if auth updates
  useEffect(() => {
    if (user) {
      if (!contactName) setContactName(user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username || '');
      if (!contactEmail) setContactEmail(user.email || '');
      if (!contactPhone && user.phone_number) setContactPhone(user.phone_number);
    }
  }, [user]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
      if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    addPhotoFiles(files);
  };

  const addPhotoFiles = (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith('image/') || f.name.endsWith('.3dm') || f.name.endsWith('.stl'));
    if (validFiles.length === 0) return;

    const newPreviews = validFiles.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : ''));
    setPhotoFiles((prev) => [...prev, ...validFiles]);
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (index: number) => {
    if (photoPreviews[index]) {
      URL.revokeObjectURL(photoPreviews[index]);
    }
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Live Recording Handlers
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support microphone audio recording.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `quick_voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setVoiceAudioFile(audioFile);
        setVoiceAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check browser microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl);
    setVoiceAudioFile(file);
    setVoiceAudioUrl(URL.createObjectURL(file));
  };

  const handleRemoveVoiceNote = () => {
    if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl);
    setVoiceAudioFile(null);
    setVoiceAudioUrl('');
    setRecordingSeconds(0);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Filter Catalog Products
  const filteredProducts = (catalogState.products || []).filter((p) => {
    const pAny = p as any;
    const matchesCategory =
      categoryFilter === 'all'
        ? true
        : String(p.category || pAny.category_id || '').toLowerCase() === categoryFilter.toLowerCase() ||
          String(p.category_name || '').toLowerCase() === categoryFilter.toLowerCase();

    const matchesSearch =
      !productSearch.trim() ||
      p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
      Boolean(pAny.sku && String(pAny.sku).toLowerCase().includes(productSearch.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Unique categories for dropdown - Main categories only (no subcategories)
  const categoryOptions = Array.from(
    new Set(
      (catalogState.categories || [])
        .filter((c: any) => !c.parent && !c.parent_id)
        .map((c: any) => c.name || c.title)
    )
  ).filter(Boolean);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError('');

    if (photoFiles.length === 0 && !description.trim() && !voiceAudioFile && !selectedProduct) {
      setSubmissionError('Please provide at least one photo, a reference product, a voice note, or a design description.');
      return;
    }

    if (!contactName.trim()) {
      setSubmissionError('Please enter your name.');
      return;
    }

    if (!contactEmail.trim() && !contactPhone.trim()) {
      setSubmissionError('Please provide either your phone number or email address so we can contact you with the price quote.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload sketch images to get IDs
      let draftSketchIds: number[] = [];
      if (photoFiles.length > 0) {
        try {
          const uploadPromises = photoFiles.map((file) => api.uploadDraftSketch(file));
          const results = await Promise.all(uploadPromises);
          draftSketchIds = results.map((r) => r.id).filter(Boolean);
        } catch (uploadErr) {
          console.warn('Draft sketch upload warning:', uploadErr);
        }
      }

      // 2. Prepare FormData to allow multipart voice note upload
      const formData = new FormData();
      formData.append('request_mode', 'quick');
      formData.append('submission_intent', 'quote_only');
      formData.append('contact_name', contactName.trim());
      formData.append('contact_email', contactEmail.trim());
      formData.append('contact_phone', contactPhone.trim());
      formData.append('client_name', contactName.trim());
      formData.append('client_email', contactEmail.trim());
      formData.append('client_phone', contactPhone.trim());

      let fullDescription = description.trim();
      const pAny = selectedProduct as any;
      if (selectedProduct) {
        fullDescription = `[Reference Product: ${selectedProduct.title} (SKU: ${pAny?.sku || selectedProduct.id})]\n${fullDescription}`;
      }
      formData.append('description', fullDescription || 'Quick Custom Jewelry Request');
      formData.append('special_instructions', fullDescription);

      if (selectedProduct) {
        formData.append('reference_product_id', String(selectedProduct.id));
        if (selectedProduct.primary_image) {
          formData.append('reference_image', selectedProduct.primary_image);
        }
        // Also attach as catalog reference JSON
        formData.append(
          'catalog_references_data',
          JSON.stringify([
            {
              id: selectedProduct.id,
              title: selectedProduct.title,
              sku: pAny?.sku || `SKU-${selectedProduct.id}`,
              price: selectedProduct.price,
              image: selectedProduct.primary_image
            }
          ])
        );
      }

      if (voiceAudioFile) {
        formData.append('voice_recording', voiceAudioFile);
      }

      if (draftSketchIds.length > 0) {
        draftSketchIds.forEach((id) => formData.append('draft_sketch_ids', String(id)));
      }

      let res: any = null;
      try {
        res = await api.createCustomRequest(formData);
      } catch (apiErr: any) {
        console.warn('API error, falling back to local session store:', apiErr);
      }

      const ticketId = String(res?.id || 'quick_' + Date.now());
      if (contactEmail.trim()) {
        localStorage.setItem('shiuli_contact_email', contactEmail.trim());
      }
      localStorage.setItem('shiuli_last_submitted_req_id', ticketId);

      // Offline & fallback store persistence
      const savedLocal = appStore.addCustomRequest({
        id: ticketId,
        request_mode: 'quick',
        clientName: contactName,
        clientEmail: contactEmail,
        clientPhone: contactPhone,
        jewelleryType: selectedProduct?.category_name || (res?.category_name) || 'Custom Jewellery',
        metalPreference: 'Custom Request',
        targetBudget: 'To Negotiate',
        currentQuote: 0,
        status: 'new',
        description: fullDescription || 'Quick Custom Jewelry Request',
        createdAt: new Date().toISOString(),
        referenceImage: res?.reference_image || selectedProduct?.primary_image || photoPreviews[0] || '',
        voice_recording_url: res?.voice_recording_url || voiceAudioUrl || '',
        messages: []
      });

      setSubmittedTicket(res || savedLocal[0]);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (err: any) {
      console.error('Failed to submit quick request:', err);
      setSubmissionError(err.message || 'Something went wrong while submitting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (submittedTicket) {
    return (
      <div className="bg-white border border-[#E8D7B7] rounded-3xl p-6 sm:p-10 shadow-2xl text-center max-w-2xl mx-auto space-y-6 animate-fade-in text-[#17243B]">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F5E7A3] text-[#09112B] flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.4)]">
          <CheckCircle2 className="w-9 h-9 sm:w-12 sm:h-12" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#B88732] font-bold px-3 py-1 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] inline-block">
            ⚡ Quick Custom Brief Submitted
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#17243B] tracking-tight">
            Thank You, {contactName || 'Valued Jeweler'}!
          </h2>
          <p className="text-xs sm:text-sm text-[#687386] max-w-md mx-auto leading-relaxed">
            Your custom jewelry brief has reached our master CAD team. We are reviewing your inspiration photos, voice note, and specifications to prepare a personalized price quote.
          </p>
        </div>

        <div className="bg-[#FFF9F0]/60 border border-[#E8D7B7] rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-2.5">
            <span className="text-xs text-[#687386] font-mono">Reference Ticket ID:</span>
            <span className="text-sm font-mono font-bold text-[#B88732]">
              #{submittedTicket.id || 'QUICK-REQ'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-[#687386] block font-mono">Contact Method</span>
              <span className="font-semibold text-[#17243B] truncate block">{contactPhone || contactEmail}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#687386] block font-mono">Mode</span>
              <span className="font-semibold text-[#B88732] flex items-center gap-1">⚡ Quick Request</span>
            </div>
          </div>

          {selectedProduct && (
            <div className="flex items-center gap-3 pt-1 border-t border-[#E8D7B7]">
              {selectedProduct.primary_image && (
                <img
                  src={selectedProduct.primary_image}
                  alt={selectedProduct.title}
                  className="w-10 h-10 rounded-lg object-cover border border-[#E8D7B7] shrink-0"
                />
              )}
              <div className="text-xs">
                <span className="text-[10px] text-[#687386] font-mono block">Reference Design</span>
                <span className="font-bold text-[#17243B] truncate block">{selectedProduct.title}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('account')}
              className="px-6 py-3 rounded-xl btn-gold-luxury text-[#17345C] font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              View My Custom Requests <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              setSubmittedTicket(null);
              setPhotoFiles([]);
              setPhotoPreviews([]);
              setSelectedProduct(null);
              setDescription('');
              setVoiceAudioFile(null);
              setVoiceAudioUrl('');
            }}
            className="px-6 py-3 rounded-xl bg-white/5 border border-[#E8D7B7] text-[#17243B] font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in text-[#17243B]">
      {/* HEADER EXPLANATION BANNER */}
      <div className="bg-gradient-to-r from-[#FFF9F0] via-[#FFFFFF] to-[#FFF9F0] border border-[#E8D7B7] rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[#B88732] text-[10px] font-bold uppercase tracking-wider">
                ⚡ Express Bespoke Brief
              </span>
              <span className="text-[#687386] text-xs hidden sm:inline">• 2-Minute Submission</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#17243B]">
              Quick Custom Jewelry Request
            </h2>
            <p className="text-xs sm:text-sm text-[#687386] leading-relaxed">
              Upload photos of your dream piece, pick an optional catalog design for reference, speak your notes via voice, and get an artisan quote directly from admin.
            </p>
          </div>

          {onSwitchToStepByStep && (
            <button
              type="button"
              onClick={onSwitchToStepByStep}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-[#E8D7B7] text-xs font-bold text-[#17243B] transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Prefer Step-by-Step 3D Studio?</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#B88732]" />
            </button>
          )}
        </div>
      </div>

      {/* ERROR NOTICE */}
      {submissionError && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{submissionError}</span>
        </div>
      )}

      {/* SECTION 1: PHOTO & SKETCH UPLOAD BOX */}
      <div className="bg-white/90 border border-[#E8D7B7] hover:border-[#E8D7B7] rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-lg transition-all space-y-4">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between border-b border-[#E8D7B7] pb-3 gap-2.5">
          <div className="flex items-start xs:items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF9F0] text-[#B88732] flex items-center justify-center font-bold text-sm border border-[#E8D7B7] shrink-0 mt-0.5 xs:mt-0">
              1
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#17243B]">
                Upload Photo(s) of Your Custom Design
              </h3>
              <p className="text-[11px] text-[#687386]">
                Share photo(s), sketches, or CAD files showing what &amp; how you want your piece crafted.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[#B88732] bg-[#FFF9F0] px-2.5 py-1 rounded-lg border border-[#E8D7B7] shrink-0 self-start xs:self-center">
            {photoFiles.length} Uploaded
          </span>
        </div>

        {/* Drag & Drop Box */}
        <div
          onClick={() => photoInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) {
              addPhotoFiles(Array.from(e.dataTransfer.files) as File[]);
            }
          }}
          className="border-2 border-dashed border-[#E8D7B7] hover:border-[#D9B66F] rounded-2xl p-5 sm:p-8 text-center cursor-pointer transition-all bg-[#FFF9F0]/40 hover:bg-[#FFF9F0]/70 group"
        >
          <input
            type="file"
            ref={photoInputRef}
            onChange={handlePhotoSelect}
            multiple
            accept="image/*,.3dm,.stl"
            className="hidden"
          />
          <div className="w-11 h-11 sm:w-12 sm:h-12 mx-auto rounded-full bg-[#FFF9F0] text-[#B88732] flex items-center justify-center group-hover:scale-110 transition-transform mb-2.5 sm:mb-3 border border-[#E8D7B7]">
            <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-[#17243B]">
            Click to upload or drag &amp; drop reference photos
          </p>
          <p className="text-[11px] sm:text-xs text-[#687386] mt-1 max-w-sm mx-auto">
            Supports JPG, PNG, WEBP, or Rhino .3DM / .STL 3D files (Multiple photos allowed)
          </p>
        </div>

        {/* Uploaded Thumbnails Preview */}
        {photoFiles.length > 0 && (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3 pt-2">
            {photoFiles.map((file, idx) => (
              <div
                key={idx}
                className="relative rounded-xl overflow-hidden border border-[#E8D7B7] bg-[#FFF9F0] group aspect-square flex items-center justify-center shadow-md"
              >
                {photoPreviews[idx] ? (
                  <img
                    src={photoPreviews[idx]}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-2 text-center">
                    <ImageIcon className="w-6 h-6 text-[#B88732] mx-auto mb-1" />
                    <span className="text-[10px] text-[#687386] font-mono truncate block max-w-full">
                      {file.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePhoto(idx);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600/90 text-white flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow-md"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: BACKEND CATALOG REFERENCE & BUY DIRECT SHOWCASE */}
      <div className="bg-white/90 border border-[#E8D7B7] hover:border-[#E8D7B7] rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-lg transition-all space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E8D7B7] pb-3 gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF9F0] text-[#B88732] flex items-center justify-center font-bold text-sm border border-[#E8D7B7] shrink-0 mt-0.5 sm:mt-0">
              2
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-[#17243B]">
                  Available Catalog Products (Optional Reference)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-[#687386] font-mono">
                  Optional
                </span>
              </div>
              <p className="text-[11px] text-[#687386]">
                Browse available pieces in our catalog to give us a reference like: "I want something similar to this product".
              </p>
            </div>
          </div>

          {/* Category Dropdown & Search Filter */}
          <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 xs:flex-initial">
              <Filter className="w-3.5 h-3.5 text-[#687386] absolute left-2.5 top-2.5 pointer-events-none" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full xs:w-auto pl-8 pr-7 py-2 xs:py-1.5 text-xs rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-[#17243B] focus:outline-none focus:border-[#D9B66F] cursor-pointer appearance-none min-w-[130px]"
              >
                <option value="all">All Categories</option>
                {categoryOptions.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 xs:flex-initial">
              <Search className="w-3.5 h-3.5 text-[#687386] absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full xs:w-40 sm:w-44 pl-8 pr-3 py-2 xs:py-1.5 text-xs rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-[#17243B] focus:outline-none focus:border-[#D9B66F]"
              />
            </div>
          </div>
        </div>

        {/* Selected Reference Banner */}
        {selectedProduct && (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37]/20 via-[#0F1D46] to-[#0F1D46] border border-[#D9B66F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              {selectedProduct.primary_image && (
                <img
                  src={selectedProduct.primary_image}
                  alt={selectedProduct.title}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-[#E8D7B7] shrink-0"
                />
              )}
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-[#B88732] font-bold uppercase tracking-wider block">
                  ✓ Selected Reference Design
                </span>
                <p className="font-bold text-xs sm:text-sm text-[#17243B] truncate">{selectedProduct.title}</p>
                <span className="text-xs text-[#B88732] font-mono">
                  Price: ₹{Number(selectedProduct.price).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-xs text-[#687386] hover:text-[#17243B] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer transition-all self-start sm:self-auto shrink-0"
            >
              Clear Reference
            </button>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3 max-h-80 overflow-y-auto pr-1">
          {filteredProducts.slice(0, 16).map((prod) => {
            const isSelected = selectedProduct?.id === prod.id;
            return (
              <div
                key={prod.id}
                className={`p-2.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#FFF9F0] border-[#D9B66F] shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-[#D4AF37]'
                    : 'bg-[#FFF9F0]/40 hover:bg-[#FFF9F0] border-[#E8D7B7] hover:border-[#E8D7B7]'
                }`}
              >
                <div>
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-2 bg-[#FFFDF9]">
                    {prod.primary_image ? (
                      <img
                        src={prod.primary_image}
                        alt={prod.title}
                        className="w-full h-full object-cover transition-transform hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#687386] font-mono text-xs">
                        CAD
                      </div>
                    )}
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 bg-[#D4AF37] text-[#09112B] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                        <Check className="w-3 h-3" /> Reference
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-[#17243B] truncate" title={prod.title}>
                    {prod.title}
                  </h4>
                  <p className="text-[11px] text-[#B88732] font-mono mt-0.5">
                    ₹{Number(prod.price).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-[#E8D7B7]">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(isSelected ? null : prod)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 truncate ${
                      isSelected
                        ? 'bg-[#D4AF37] text-[#09112B]'
                        : 'bg-white/10 hover:bg-[#FFF9F0] text-[#17243B] hover:text-[#B88732] border border-[#E8D7B7]'
                    }`}
                  >
                    {isSelected ? '✓ Selected' : 'Use Reference'}
                  </button>

                  {onNavigate && (
                    <button
                      type="button"
                      title="Buy direct or view details in new tab"
                      onClick={() => onNavigate('product-detail', { productId: prod.id })}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#687386] hover:text-[#17243B] transition-all cursor-pointer shrink-0"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-[#B88732]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: DESCRIPTION TEXTAREA */}
      <div className="bg-white/90 border border-[#E8D7B7] hover:border-[#E8D7B7] rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-lg transition-all space-y-3">
        <div className="flex items-start sm:items-center gap-2.5 border-b border-[#E8D7B7] pb-3">
          <div className="w-8 h-8 rounded-xl bg-[#FFF9F0] text-[#B88732] flex items-center justify-center font-bold text-sm border border-[#E8D7B7] shrink-0 mt-0.5 sm:mt-0">
            3
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#17243B]">
              Design Description &amp; Specifications
            </h3>
            <p className="text-[11px] text-[#687386]">
              Tell us in your own words what and how you want the custom design (metal purity, stones, sizes, modifications).
            </p>
          </div>
        </div>

        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Example: I want a 18K yellow gold engagement ring with an oval center stone around 1.5 carats, similar to the reference photo. Ring size 7 US. Need micro-pavé on shank and milgrain edges..."
          className="w-full p-3.5 sm:p-4 rounded-2xl bg-[#FFF9F0]/70 border border-[#E8D7B7] text-[#17243B] placeholder-slate-400 focus:outline-none focus:border-[#D9B66F] text-xs sm:text-sm leading-relaxed"
        />
      </div>

      {/* SECTION 4: VOICE RECORDING (LIVE OR UPLOAD) */}
      <div className="bg-white/90 border border-[#E8D7B7] hover:border-[#E8D7B7] rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-lg transition-all space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E8D7B7] pb-3 gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF9F0] text-[#B88732] flex items-center justify-center font-bold text-sm border border-[#E8D7B7] shrink-0 mt-0.5 sm:mt-0">
              4
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-[#17243B]">
                  Voice Recording Instructions
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-[#687386] font-mono">
                  Optional
                </span>
              </div>
              <p className="text-[11px] text-[#687386]">
                Easily speak your custom requirements directly, or upload a voice note from your phone.
              </p>
            </div>
          </div>

          {/* Toggle between Live Recording and Audio File Upload */}
          <div className="grid grid-cols-2 sm:flex items-center bg-[#FFF9F0] p-1 rounded-xl border border-[#E8D7B7] text-xs font-bold w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setVoiceMode('live')}
              className={`w-full sm:w-auto px-2.5 sm:px-3 py-2 sm:py-1 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 text-[11px] sm:text-xs whitespace-nowrap ${
                voiceMode === 'live' ? 'bg-[#D4AF37] text-[#09112B]' : 'text-[#687386] hover:text-[#17243B]'
              }`}
            >
              <span>🎙️ Live Recording</span>
            </button>
            <button
              type="button"
              onClick={() => setVoiceMode('upload')}
              className={`w-full sm:w-auto px-2.5 sm:px-3 py-2 sm:py-1 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 text-[11px] sm:text-xs whitespace-nowrap ${
                voiceMode === 'upload' ? 'bg-[#D4AF37] text-[#09112B]' : 'text-[#687386] hover:text-[#17243B]'
              }`}
            >
              <span>📁 Upload Audio File</span>
            </button>
          </div>
        </div>

        {/* Live Recording Mode */}
        {voiceMode === 'live' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF9F0]/60 border border-[#E8D7B7] text-center space-y-4">
            {!isRecording && !voiceAudioUrl && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F5E7A3] text-[#09112B] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Mic className="w-7 h-7 sm:w-8 sm:h-8" />
                </button>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-[#17243B]">Tap to Start Voice Recording</p>
                  <p className="text-[11px] sm:text-xs text-[#687386]">Speak your custom specifications in any language.</p>
                </div>
              </div>
            )}

            {isRecording && (
              <div className="space-y-4 animate-pulse">
                <div className="flex items-center justify-center gap-2 text-rose-400 font-mono font-bold text-xs sm:text-sm">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500 animate-ping inline-block" />
                  <span>RECORDING LIVE: {formatTimer(recordingSeconds)}</span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 mx-auto shadow-lg cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-white" /> Stop &amp; Save Recording
                </button>
              </div>
            )}

            {voiceAudioUrl && !isRecording && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-2.5 sm:p-3 rounded-xl border border-[#E8D7B7] w-full max-w-md mx-auto gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#B88732] shrink-0" />
                    <span className="text-[11px] sm:text-xs font-mono text-slate-200 truncate">Voice Note Recorded</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveVoiceNote}
                    className="text-rose-400 hover:text-rose-300 text-[11px] sm:text-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Re-record
                  </button>
                </div>
                <audio controls src={voiceAudioUrl} className="mx-auto w-full max-w-md" />
              </div>
            )}
          </div>
        )}

        {/* Audio File Upload Mode */}
        {voiceMode === 'upload' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF9F0]/60 border border-[#E8D7B7] text-center space-y-3">
            <input
              type="file"
              ref={audioFileInputRef}
              onChange={handleAudioFileUpload}
              accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
              className="hidden"
            />
            {!voiceAudioUrl ? (
              <div
                onClick={() => audioFileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E8D7B7] hover:border-[#D9B66F] rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-all hover:bg-[#FFF9F0]"
              >
                <FileAudio className="w-8 h-8 sm:w-10 sm:h-10 text-[#B88732] mx-auto mb-2 opacity-80" />
                <p className="text-xs sm:text-sm font-bold text-[#17243B]">Click to Upload Audio File</p>
                <p className="text-[11px] sm:text-xs text-[#687386] mt-0.5">Supports .mp3, .wav, .m4a, .webm, .ogg voice notes</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-2.5 sm:p-3 rounded-xl border border-[#E8D7B7] w-full max-w-md mx-auto gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileAudio className="w-4 h-4 sm:w-5 sm:h-5 text-[#B88732] shrink-0" />
                    <span className="text-[11px] sm:text-xs font-mono text-slate-200 truncate">
                      {voiceAudioFile?.name || 'Uploaded Audio'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveVoiceNote}
                    className="text-rose-400 hover:text-rose-300 text-[11px] sm:text-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
                <audio controls src={voiceAudioUrl} className="mx-auto w-full max-w-md" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 5: CONTACT INFORMATION */}
      <div className="bg-white/90 border border-[#E8D7B7] hover:border-[#E8D7B7] rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-lg transition-all space-y-4">
        <div className="flex items-start sm:items-center gap-2.5 border-b border-[#E8D7B7] pb-3">
          <div className="w-8 h-8 rounded-xl bg-[#FFF9F0] text-[#B88732] flex items-center justify-center font-bold text-sm border border-[#E8D7B7] shrink-0 mt-0.5 sm:mt-0">
            5
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#17243B]">
              Your Contact Details (For Quotation &amp; Negotiation)
            </h3>
            <p className="text-[11px] text-[#687386]">
              Our master CAD designers will reach out with the price quote and 3D modeling turnaround.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-mono text-[#687386] uppercase block mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-[#17243B] placeholder-slate-500 focus:outline-none focus:border-[#D9B66F] text-xs font-semibold"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-[#687386] uppercase block mb-1">
              Phone / WhatsApp Number
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-[#17243B] placeholder-slate-500 focus:outline-none focus:border-[#D9B66F] text-xs font-semibold"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-[#687386] uppercase block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="e.g. rahul@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-[#17243B] placeholder-slate-500 focus:outline-none focus:border-[#D9B66F] text-xs font-semibold"
            />
          </div>
        </div>
      </div>

      {/* SUBMISSION BUTTON */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        <p className="text-[11px] sm:text-xs text-[#687386] text-center sm:text-left max-w-md">
          🔒 By submitting, our admin team negotiates pricing directly with you. No advance payment required for initial review.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl btn-gold-luxury text-[#17345C] font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Submitting Brief...</span>
            </>
          ) : (
            <>
              <span>Submit Quick Custom Request</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

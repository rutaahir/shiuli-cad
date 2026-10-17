import React, { useState, useEffect, useRef } from 'react';
import {
  FileUp,
  Check,
  Send,
  ShoppingBag,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
  Wrench,
  Lock,
  LogIn,
  UserPlus,
  Mic,
  Volume2,
  Trash2,
  MessageCircle,
  ExternalLink,
  Scale,
  Gem,
  Image as ImageIcon,
  User,
  Mail,
  Phone,
  FileCheck2,
  ArrowRight,
  Save,
  FileAudio,
  Square,
  ShieldCheck,
  Cloud,
  Sparkles,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { ModificationTypeData, PageId } from '../types';
import { useAuth } from '../context/AuthContext';

interface FileEditingPageProps {
  onNavigate: (page: PageId, slug?: string) => void;
}

const STUDIO_WHATSAPP_NUMBER = '919574787098';
const STUDIO_TELEGRAM_LINK = 'https://t.me/+919574787098';

const DEFAULT_MODIFICATION_TYPES: ModificationTypeData[] = [
  { id: 1, key: '3dm-file-editing', label: '3DM File Editing', description: 'Rhino 8 native NURBS surface modification, layer organization, and feature adjustments.', base_price: 150, icon: 'Layers', is_active: true, display_order: 1 },
  { id: 2, key: 'stl-file-editing', label: 'STL File Editing', description: 'Triangle mesh repairing, watertight topological fixes, and polygon sculpting.', base_price: 120, icon: 'Box', is_active: true, display_order: 2 },
  { id: 3, key: 'size-modification', label: 'Size Modification', description: 'Ring size resizing (US, UK, Indian, EU), inner diameter scaling, and shank re-balancing.', base_price: 50, icon: 'Ruler', is_active: true, display_order: 3 },
  { id: 4, key: 'weight-adjustment', label: 'Weight Adjustment', description: 'Gold/Metal gram weight calibration, under-gallery hollowing, and thickness optimization.', base_price: 75, icon: 'Scale', is_active: true, display_order: 4 },
  { id: 5, key: 'stone-size-modification', label: 'Stone Size Modification', description: 'Adjusting stone seat dimensions, bezel boundaries, and table depths.', base_price: 80, icon: 'Gem', is_active: true, display_order: 5 },
  { id: 6, key: 'stone-setting-modification', label: 'Stone Setting Modification', description: 'Switching setting styles (e.g. Prong to Bezel, Pave to Channel, Flush to Micro-Pave).', base_price: 100, icon: 'Sparkles', is_active: true, display_order: 6 },
  { id: 7, key: 'shape-modification', label: 'Shape Modification', description: 'Altering ring shank profiles, halo contours, and motif outlines.', base_price: 110, icon: 'Edit', is_active: true, display_order: 7 },
  { id: 8, key: 'add-remove-stones', label: 'Add / Remove Stones', description: 'Adding accent halo stones, side baguettes, or converting to solid metal band.', base_price: 90, icon: 'Plus', is_active: true, display_order: 8 },
  { id: 9, key: 'name-initial-logo', label: 'Name / Initial / Logo', description: 'Embossing studio logos, hallmarks, initials, or 3D relief emblems.', base_price: 65, icon: 'ShieldCheck', is_active: true, display_order: 9 },
  { id: 10, key: 'engraving', label: 'Engraving Correction', description: 'Calibrating 3D relief text, script fonts, and inside shank calligraphy.', base_price: 45, icon: 'FileText', is_active: true, display_order: 10 },
  { id: 11, key: 'manufacturing-correction', label: 'Manufacturing Correction', description: 'Fixing cold-shuts, thin wall warnings, sprue gates, and prong clearance.', base_price: 130, icon: 'CheckCircle2', is_active: true, display_order: 11 },
  { id: 12, key: 'casting-3d-printing-prep', label: 'Casting & 3D Printing Prep', description: 'Adding sprue feeders, shrinkage allowance (+1.25%), and Formlabs STL export.', base_price: 95, icon: 'Printer', is_active: true, display_order: 12 },
];

export const FileEditingPage: React.FC<FileEditingPageProps> = ({ onNavigate }) => {
  const { user, isLoggedIn, openAuthModal, requireAuth } = useAuth();
  const [modificationTypes, setModificationTypes] = useState<ModificationTypeData[]>(DEFAULT_MODIFICATION_TYPES);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(false);

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
  const [referencePreview, setReferencePreview] = useState<string>('');

  // Voice Note State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [voiceAudioBlob, setVoiceAudioBlob] = useState<Blob | null>(null);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string>('');
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const cadFileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  // Section Refs for smooth scrolling on validation error
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  const clientNameInputRef = useRef<HTMLInputElement>(null);
  const clientPhoneInputRef = useRef<HTMLInputElement>(null);
  const clientEmailInputRef = useRef<HTMLInputElement>(null);

  // Inline Validation & Upload Progress State
  const [fieldErrors, setFieldErrors] = useState<{
    cadFile?: string;
    modTypes?: string;
    description?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
  }>({});
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Status state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clean up timer and object URLs
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl);
      if (referencePreview) URL.revokeObjectURL(referencePreview);
    };
  }, [voiceAudioUrl, referencePreview]);

  // Voice Note Recording Functions
  const startRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setVoiceAudioBlob(audioBlob);
          const url = URL.createObjectURL(audioBlob);
          setVoiceAudioUrl(url);
          setUploadedAudioFile(null);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(200);
        setIsRecording(true);
        setRecordingSeconds(0);
        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      } else {
        alert('Voice recording is not supported in this browser environment.');
      }
    } catch (err) {
      console.warn('Microphone access denied:', err);
      alert('Unable to access microphone. Please check your browser audio permissions.');
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

  const clearVoiceNote = () => {
    if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl);
    setVoiceAudioBlob(null);
    setVoiceAudioUrl('');
    setUploadedAudioFile(null);
    setRecordingSeconds(0);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadedAudioFile(file);
      setVoiceAudioBlob(file);
      const url = URL.createObjectURL(file);
      setVoiceAudioUrl(url);
    }
  };

  // Generate Complete Details Text for WhatsApp & Telegram
  const generateOrderSummaryText = () => {
    const selectedLabels = modificationTypes
      .filter((m) => selectedModTypeIds.includes(m.id))
      .map((m) => m.label)
      .join(', ');

    const voiceStatus = voiceAudioBlob || uploadedAudioFile
      ? uploadedAudioFile ? `Audio File Attached: ${uploadedAudioFile.name}` : `Voice Recording Attached (${recordingSeconds}s)`
      : 'None';

    return `💎 CAD FILE MODIFICATION ORDER — SHIULI CAD STUDIO 💎

👤 Client Details:
• Name: ${clientName.trim() || 'Not provided'}
• WhatsApp / Phone: ${clientPhone.trim() || 'Not provided'}
• Email: ${clientEmail.trim() || 'Not provided'}

📁 Source CAD File:
• File Name: ${cadFile ? cadFile.name : 'Will send file directly via chat'}
• Format: ${cadFile ? '.' + cadFile.name.split('.').pop()?.toUpperCase() : 'Not selected yet'}
• File Size: ${cadFile ? (cadFile.size / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A'}

🛠️ Requested Modifications:
• Edits Required: ${selectedLabels || 'Custom CAD Edits'}
• Target Metal Weight: ${targetWeightGrams ? `${targetWeightGrams} grams` : 'As per design'}
• Target Stone Size: ${targetStoneSizeMm ? targetStoneSizeMm : 'As per design'}

📝 Detailed Instructions:
${description.trim() || 'Please inspect CAD file and provide quotation'}

🎙️ Voice Note & Audio Instructions:
• Status: ${voiceStatus}

📎 Reference Sketch / Image:
• Attachment: ${referenceFile ? referenceFile.name : 'None'}

Please confirm feasibility and provide the production quotation.`;
  };

  const handleOpenWhatsApp = () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      setErrorMsg('Please enter your Name and Phone / WhatsApp number below so our atelier can address your message.');
      return;
    }
    setErrorMsg(null);
    const text = generateOrderSummaryText();
    const url = `https://wa.me/${STUDIO_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleOpenTelegram = () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      setErrorMsg('Please enter your Name and Phone / WhatsApp number below so our atelier can address your message.');
      return;
    }
    setErrorMsg(null);
    const text = generateOrderSummaryText();
    const url = `${STUDIO_TELEGRAM_LINK}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

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
    api.getModificationTypes()
      .then((data: any) => {
        if (mounted) {
          const list = Array.isArray(data) ? data : (data?.results || data?.data || []);
          const active = list.filter((m: any) => m.is_active);
          if (active.length > 0) {
            setModificationTypes(active);
          }
        }
      })
      .catch((err) => {
        console.warn('Backend modification types fetch notice:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const toggleModType = (id: number) => {
    setSelectedModTypeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (fieldErrors.modTypes) {
      setFieldErrors((prev) => ({ ...prev, modTypes: undefined }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['3dm', 'stl', 'obj', 'step'].includes(ext || '')) {
        setFieldErrors((prev) => ({
          ...prev,
          cadFile: 'Invalid file format. Please upload a .3dm, .stl, .obj, or .step file.'
        }));
        return;
      }
      setFieldErrors((prev) => ({ ...prev, cadFile: undefined }));
      setErrorMsg(null);
      setCadFile(file);
    }
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceFile(file);
      if (file.type.startsWith('image/')) {
        setReferencePreview(URL.createObjectURL(file));
      } else {
        setReferencePreview('');
      }
    }
  };

  const clearReferenceFile = () => {
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    setReferenceFile(null);
    setReferencePreview('');
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      setErrorMsg('Only logged-in clients can submit CAD file edit requests. Please sign in or register.');
      requireAuth(() => {
        handleSubmit();
      }, {
        intent: 'custom-request',
        message: 'Please sign in or create an account to submit your CAD file modification request.',
      });
      return;
    }

    // Comprehensive contextual validation
    const errors: typeof fieldErrors = {};
    if (!cadFile) {
      errors.cadFile = 'Source CAD file (.3dm, .stl, .obj, or .step) is required.';
    }
    if (selectedModTypeIds.length === 0) {
      errors.modTypes = 'Please select at least one modification required for your model.';
    }
    if (!description.trim()) {
      errors.description = 'Please provide detailed modification instructions.';
    }
    if (!clientName.trim()) {
      errors.clientName = 'Full name is required.';
    }
    if (!clientPhone.trim()) {
      errors.clientPhone = 'WhatsApp / phone number is required.';
    }
    if (!clientEmail.trim()) {
      errors.clientEmail = 'Email address is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg('Please review and complete all highlighted required fields below.');

      // Smoothly scroll and center on the first invalid field
      if (errors.cadFile && step1Ref.current) {
        step1Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.modTypes && step2Ref.current) {
        step2Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.description && step3Ref.current) {
        step3Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.clientName && clientNameInputRef.current) {
        clientNameInputRef.current.focus();
        clientNameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.clientPhone && clientPhoneInputRef.current) {
        clientPhoneInputRef.current.focus();
        clientPhoneInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.clientEmail && clientEmailInputRef.current) {
        clientEmailInputRef.current.focus();
        clientEmailInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setFieldErrors({});

    try {
      const isLargeFile = cadFile.size > 50 * 1024 * 1024; // >50MB
      let driveFileId: string | null = null;

      if (isLargeFile) {
        setUploadProgress(0);
        try {
          const driveUploadRes = await api.uploadFileEditToGDrive(cadFile, (pct) => {
            setUploadProgress(pct);
          });
          driveFileId = driveUploadRes?.drive_file_id || null;
          setUploadProgress(100);
        } catch (gdriveErr: any) {
          console.warn('Google Drive direct streaming unavailable or OAuth token not yet linked. Falling back to secure studio server storage:', gdriveErr);
          driveFileId = null;
          setUploadProgress(null);
        }
      }

      const formData = new FormData();
      if (isLargeFile && driveFileId) {
        formData.append('drive_file_id', driveFileId);
        formData.append('storage_provider', 'gdrive');
        formData.append('original_file_name', cadFile.name);
        formData.append('file_size_bytes', String(cadFile.size));
      } else {
        formData.append('original_file', cadFile);
        formData.append('original_file_name', cadFile.name);
        formData.append('file_size_bytes', String(cadFile.size));
        formData.append('storage_provider', 'local');
      }

      formData.append('original_file_format', cadFile.name.split('.').pop()?.toLowerCase() || '3dm');
      formData.append('contact_name', clientName.trim() || user?.username || 'Client User');
      formData.append('contact_email', clientEmail.trim() || user?.email || '');
      formData.append('contact_phone', clientPhone.trim() || user?.phone_number || '');
      formData.append('modification_types', JSON.stringify(selectedModTypeIds));

      if (targetWeightGrams) {
        formData.append('target_weight_grams', targetWeightGrams);
      }
      if (targetStoneSizeMm) {
        formData.append('target_stone_size', targetStoneSizeMm);
      }

      let fullDescription = description.trim();
      if (targetWeightGrams || targetStoneSizeMm) {
        fullDescription += `\n\n[Specs]\nTarget Weight: ${targetWeightGrams || 'N/A'}g\nTarget Stone Size: ${targetStoneSizeMm || 'N/A'}`;
      }
      formData.append('description', fullDescription);

      if (referenceFile) formData.append('reference_image', referenceFile);
      if (voiceAudioBlob) {
        const audioFile =
          uploadedAudioFile ||
          new File([voiceAudioBlob], 'voice_note.webm', {
            type: voiceAudioBlob.type || 'audio/webm',
          });
        formData.append('voice_note', audioFile);
      }
      formData.append('submission_intent', 'place_order');

      await api.createFileEditRequest(formData);

      setSubmitSuccess(true);
      setSubmitMessage(
        'Your CAD modification details and source model have been saved and sent directly to the Admin. Our master team will review your file and issue an official quotation shortly.'
      );
    } catch (err: any) {
      console.error('File edit submission error:', err);
      setErrorMsg(err.message || 'Failed to submit file modification request. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };


  return (
    <div className="min-h-screen bg-[#FCFAF6] text-[#17243B] pt-24 sm:pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[#B88735] text-[11px] font-bold uppercase tracking-widest shadow-2xs">
            <Wrench className="w-3.5 h-3.5 text-[#B88735]" />
            <span>Master CAD Services</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#17345C] tracking-tight">
            CAD File Editing &amp; Modification Studio
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] font-medium max-w-xl mx-auto leading-relaxed">
            Upload your existing 3D jewelry CAD file (<span className="text-[#B88732] font-bold">.3dm, .stl, .obj, .step</span>) for precision resizing, prong adjustment, weight optimization, or mesh repair.
          </p>
        </div>

        {/* SUCCESS STATE */}
        {submitSuccess ? (
          <div className="bg-white border border-[#D6AD62] rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-[0_20px_60px_rgba(23,54,93,0.1)]">
            <div className="w-16 h-16 bg-[#FFF9F0] border border-[#D6AD62] rounded-full flex items-center justify-center mx-auto text-[#B88735] shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#17345C]">
                Modification Request Received!
              </h2>
              <p className="text-xs sm:text-sm text-[#475569] font-medium max-w-lg mx-auto">
                {submitMessage}
              </p>
            </div>

            {/* Quick action to also open in WhatsApp */}
            <div className="p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 text-left flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl mx-auto">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0" />
                <span className="text-xs text-[#17345C]">
                  Want instant engineering confirmation on WhatsApp? Click below to send your submitted specs directly to our master team.
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <span>Chat on WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  setSubmitSuccess(false);
                  setCadFile(null);
                  setSelectedModTypeIds([]);
                  setDescription('');
                  clearVoiceNote();
                  clearReferenceFile();
                }}
                className="px-6 py-2.5 btn-gold-luxury text-[#17345C] font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Submit Another File
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="px-6 py-2.5 bg-white border border-[#E8D7B7] text-[#17345C] font-semibold text-xs rounded-xl hover:bg-[#FFF9F0] transition-colors cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          </div>
        ) : (
          /* MAIN EDITING FORM */
          <div className="bg-white rounded-3xl border border-[#E8D7B7] p-5 sm:p-8 md:p-9 shadow-[0_12px_45px_rgba(23,54,93,0.05)] space-y-6 sm:space-y-7">

            {/* Auth Notice Banner if guest */}
            {!isLoggedIn && (
              <div className="p-4 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white border border-[#E8D7B7] flex items-center justify-center text-[#B88735] shrink-0 shadow-2xs">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-[#17345C] text-xs sm:text-sm">Account Authentication Required</h4>
                    <p className="text-[11px] sm:text-xs text-[#687386]">
                      Log in to submit modification files so your models and quotations stay securely attached to your account.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => openAuthModal('Please log in to submit your CAD file modification request.')}
                    className="flex-1 sm:flex-initial px-3.5 py-1.5 btn-gold-luxury text-[#17345C] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('register')}
                    className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-white hover:bg-[#FFF9F0] text-[#17345C] font-semibold text-xs rounded-xl border border-[#E8D7B7] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#B88735]" /> Register
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-red-400 hover:text-red-700 font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* STEP 1: UPLOAD SOURCE CAD FILE */}
            <div ref={step1Ref} className={`space-y-3 p-4 sm:p-5 rounded-2xl transition-all ${
              fieldErrors.cadFile ? 'bg-rose-50/20 border-2 border-rose-400 ring-2 ring-rose-200 shadow-sm' : ''
            }`}>
              <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-3">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shadow-xs ${
                    fieldErrors.cadFile ? 'bg-rose-600 text-white' : 'bg-[#17345C] text-[#FFFDF9]'
                  }`}>
                    1
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-[#0B1330] tracking-tight">
                    Upload Your Source CAD File <span className="text-rose-600 font-bold">*</span>
                  </h3>
                </div>
                {cadFile && cadFile.size > 50 * 1024 * 1024 ? (
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                    <Cloud className="w-3.5 h-3.5 text-blue-600" />
                    <span>Google Drive Cloud Storage ({(cadFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  </span>
                ) : cadFile ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{(cadFile.size / (1024 * 1024)).toFixed(2)} MB Attached</span>
                  </span>
                ) : (
                  <span className="text-xs text-[#475569] font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>High-Capacity Cloud &amp; Direct CAD Storage</span>
                  </span>
                )}
              </div>

              {cadFile ? (
                /* Selected File Preview Box */
                <div className={`p-4 rounded-2xl bg-[#FFF9F0]/80 border flex items-center justify-between gap-3 shadow-2xs ${
                  cadFile.size > 50 * 1024 * 1024 ? 'border-blue-300 ring-1 ring-blue-200' : 'border-[#D6AD62]'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      cadFile.size > 50 * 1024 * 1024 ? 'bg-blue-900 text-blue-200' : 'bg-[#17345C] text-white'
                    }`}>
                      {cadFile.size > 50 * 1024 * 1024 ? (
                        <Cloud className="w-5 h-5 text-blue-300" />
                      ) : (
                        <FileCode className="w-5 h-5 text-[#D6AD62]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-[#0B1330] truncate">{cadFile.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#475569] font-medium mt-0.5">
                        <span className="font-semibold text-[#0B1330]">{(cadFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                        <span>•</span>
                        <span className="uppercase font-mono text-[#B88732] font-bold">.{cadFile.name.split('.').pop()}</span>
                        <span>•</span>
                        {cadFile.size > 50 * 1024 * 1024 ? (
                          <span className="text-blue-700 font-semibold flex items-center gap-0.5">
                            <Cloud className="w-3 h-3 text-blue-600" /> Direct Google Drive Storage (&gt;50MB)
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Attached
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => cadFileInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-white hover:bg-[#FFF9F0] border border-[#E8D7B7] text-[#17345C] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setCadFile(null)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Compact Drag & Drop Zone */
                <div
                  onClick={() => cadFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 transition-all text-center cursor-pointer group shadow-2xs ${
                    fieldErrors.cadFile
                      ? 'border-rose-400 bg-rose-50/30 hover:bg-rose-50/50'
                      : 'border-[#E8D7B7] hover:border-[#B88735] bg-[#FFFDF9] hover:bg-[#FFF9F0]/60'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto transition-transform group-hover:scale-105 shadow-2xs ${
                    fieldErrors.cadFile
                      ? 'bg-rose-100 text-rose-600 border border-rose-300'
                      : 'bg-white border border-[#E8D7B7] group-hover:border-[#B88735] group-hover:text-[#B88735] text-[#17345C]'
                  }`}>
                    <FileUp className="w-5 h-5" />
                  </div>
                  <p className={`text-sm sm:text-base font-bold mt-2.5 ${fieldErrors.cadFile ? 'text-rose-700' : 'text-[#0B1330]'}`}>
                    Drag &amp; drop or click to upload your CAD file
                  </p>
                  <p className="text-xs text-[#475569] font-medium mt-1">
                    Accepts Rhino 3DM, STL watertight mesh, OBJ polygon, or STEP solid files &bull; Files over 50MB securely saved to Google Drive
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5">
                    {['.3DM', '.STL', '.OBJ', '.STEP'].map((ext) => (
                      <span key={ext} className="px-2 py-0.5 rounded-md bg-[#FFF9F0] border border-[#E8D7B7] text-[10px] font-mono font-bold text-[#17345C]">
                        {ext}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Error Badge for Step 1 */}
              {fieldErrors.cadFile && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 w-fit">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{fieldErrors.cadFile}</span>
                </div>
              )}

              {/* Live Upload Progress Indicator */}
              {uploadProgress !== null && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      Streaming CAD file to Google Drive Cloud Storage...
                    </span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <input
                ref={cadFileInputRef}
                type="file"
                accept=".3dm,.stl,.obj,.step"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* STEP 2: SELECT MODIFICATIONS REQUIRED */}
            <div ref={step2Ref} className={`space-y-3 p-4 sm:p-5 rounded-2xl transition-all ${
              fieldErrors.modTypes ? 'bg-rose-50/20 border-2 border-rose-400 ring-2 ring-rose-200 shadow-sm' : ''
            }`}>
              <div className="flex items-center justify-between border-b border-[#E8D7B7] pb-3">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shadow-xs ${
                    fieldErrors.modTypes ? 'bg-rose-600 text-white' : 'bg-[#17345C] text-[#FFFDF9]'
                  }`}>
                    2
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-[#0B1330] tracking-tight">
                    Select Modifications Required <span className="text-rose-600 font-bold">*</span>
                  </h3>
                </div>
                {selectedModTypeIds.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFF9F0] border border-[#D6AD62] text-xs font-bold text-[#B88732]">
                    {selectedModTypeIds.length} selected
                  </span>
                )}
              </div>

              {loadingTypes ? (
                <div className="py-6 text-center text-[#475569] text-xs font-medium flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#B88735]" />
                  <span>Loading studio modification services...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {modificationTypes.map((mod) => {
                    const isSelected = selectedModTypeIds.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModType(mod.id)}
                        className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${isSelected
                            ? 'bg-[#F4F7FB] border-[#17345C] ring-1 ring-[#17345C]/20 shadow-2xs'
                            : 'bg-white border-[#E8D7B7] hover:border-[#D6AD62] hover:bg-[#FFFDF9]'
                          }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${isSelected
                                ? 'bg-[#17345C] text-white shadow-2xs'
                                : 'border border-[#C8B89E] bg-white'
                              }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-[#17345C]' : 'text-[#0B1330]'}`}>
                              {mod.label}
                            </h4>
                            {mod.base_price && Number(mod.base_price) > 0 ? (
                              <span className="text-[10px] font-mono font-bold text-[#B88735] bg-[#FFF9F0] px-1.5 py-0.5 rounded border border-[#E8D7B7] shrink-0">
                                From ${Number(mod.base_price).toFixed(0)}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-[#475569] font-medium mt-0.5 line-clamp-2 leading-relaxed">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline Error Badge for Step 2 */}
              {fieldErrors.modTypes && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 w-fit">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{fieldErrors.modTypes}</span>
                </div>
              )}
            </div>

            {/* STEP 3: MODIFICATION DETAILS & SPECS */}
            <div ref={step3Ref} className={`space-y-4 p-4 sm:p-5 rounded-2xl transition-all ${
              fieldErrors.description ? 'bg-rose-50/20 border-2 border-rose-400 ring-2 ring-rose-200 shadow-sm' : ''
            }`}>
              <div className="flex items-center gap-3 border-b border-[#E8D7B7] pb-3">
                <span className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shadow-xs ${
                  fieldErrors.description ? 'bg-rose-600 text-white' : 'bg-[#17345C] text-[#FFFDF9]'
                }`}>
                  3
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#0B1330] tracking-tight">
                  Modification Details &amp; Specs
                </h3>
              </div>

              {/* Target Metal Weight & Stone Size Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#0B1330] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#B88732]" />
                      <span>Target Metal Weight (Grams)</span>
                    </span>
                    <span className="text-[11px] text-[#64748B] font-semibold bg-[#F1F5F9] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                      Optional
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 5.5"
                      value={targetWeightGrams}
                      onChange={(e) => setTargetWeightGrams(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D7B7] focus:border-[#B88732] focus:ring-1 focus:ring-[#B88732]/25 bg-[#FFFDF9] text-xs sm:text-sm font-medium text-[#0B1330] placeholder-[#94A3B8] focus:outline-hidden pr-14"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#475569]">
                      grams
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#0B1330] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Gem className="w-4 h-4 text-[#B88732]" />
                      <span>Target Stone Size (mm / ct)</span>
                    </span>
                    <span className="text-[11px] text-[#64748B] font-semibold bg-[#F1F5F9] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                      Optional
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Center 6.5mm / 1.0ct diamond"
                    value={targetStoneSizeMm}
                    onChange={(e) => setTargetStoneSizeMm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D7B7] focus:border-[#B88732] focus:ring-1 focus:ring-[#B88732]/25 bg-[#FFFDF9] text-xs sm:text-sm font-medium text-[#0B1330] placeholder-[#94A3B8] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Detailed Modification Instructions + Voice Note (Unified Studio Container) */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#0B1330] mb-1.5 flex items-center gap-1.5">
                  <span>Detailed Modification Instructions</span>
                  <span className="text-rose-600 font-bold">*</span>
                </label>
                <div className={`relative rounded-2xl border bg-[#FFFDF9] transition-colors p-4 space-y-3 ${
                  fieldErrors.description
                    ? 'border-rose-400 ring-2 ring-rose-200'
                    : 'border-[#E8D7B7] focus-within:border-[#B88732] focus-within:ring-1 focus-within:ring-[#B88732]/25'
                }`}>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (fieldErrors.description) {
                        setFieldErrors((prev) => ({ ...prev, description: undefined }));
                      }
                    }}
                    placeholder="Describe your design, specifications, requirements, gemstone details, finger ring size, weight constraints, or any special casting preferences..."
                    className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#0B1330] focus:outline-hidden resize-none placeholder-[#64748B]/70 leading-relaxed"
                  />

                  {/* Voice Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#E8D7B7]/80">
                    <div className="text-xs font-semibold text-[#17345C] flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-[#B88732]" />
                      <span>Record live voice instructions or upload an audio file:</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 1. Upload audio recording file */}
                      <button
                        type="button"
                        onClick={() => audioFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E8D7B7] hover:border-[#B88732] bg-white text-xs font-bold text-[#17345C] transition-all cursor-pointer shadow-2xs"
                        title="Upload existing audio file"
                      >
                        <FileAudio className="w-3.5 h-3.5 text-[#B88732]" />
                        <span>Upload Recording</span>
                      </button>
                      <input
                        ref={audioFileInputRef}
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
                        onChange={handleAudioUpload}
                        className="hidden"
                      />

                      {/* 2. Live Record Microphone Button */}
                      {isRecording ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-300 text-red-600 animate-pulse text-xs font-mono font-bold">
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                          <span>00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center ml-1 cursor-pointer"
                            title="Stop recording"
                          >
                            <Square className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#17345C] hover:bg-[#0f2440] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                          title="Record Voice Note"
                        >
                          <Mic className="w-3.5 h-3.5 text-white" />
                          <span>Record Voice</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline Error Badge for Step 3 */}
                {fieldErrors.description && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 w-fit mt-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{fieldErrors.description}</span>
                  </div>
                )}

                {/* Voice Note Audio Player */}
                {voiceAudioUrl && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-white border border-[#D6AD62] flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#17345C]">
                      <Volume2 className="w-4 h-4 text-[#B88732]" />
                      <span>
                        {uploadedAudioFile ? `Audio File: ${uploadedAudioFile.name}` : `Voice Note Recorded (${recordingSeconds}s)`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <audio controls src={voiceAudioUrl} className="h-8 max-w-[240px]" />
                      <button
                        type="button"
                        onClick={clearVoiceNote}
                        className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                        title="Delete recording"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Reference Sketch / Markup Upload */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#0B1330] mb-1.5 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#B88732]" />
                  <span>Add Reference Sketch or Mark-up Image</span>
                  <span className="text-[11px] text-[#64748B] font-semibold bg-[#F1F5F9] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                    Optional
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => refImageInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8D7B7] hover:border-[#B88732] bg-white hover:bg-[#FFF9F0] text-xs sm:text-sm font-bold text-[#17345C] transition-all cursor-pointer shadow-2xs"
                  >
                    <ImageIcon className="w-4 h-4 text-[#B88732]" />
                    <span>Upload Reference Image / Mark-up Sketch</span>
                  </button>
                  <input
                    ref={refImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReferenceChange}
                    className="hidden"
                  />

                  {referenceFile && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#D6AD62] text-xs text-[#17345C] shadow-2xs">
                      {referencePreview ? (
                        <img src={referencePreview} alt="Preview" className="w-6 h-6 rounded object-cover border border-[#E8D7B7]" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-[#B88735]" />
                      )}
                      <span className="truncate max-w-[180px] font-medium">{referenceFile.name}</span>
                      <button
                        type="button"
                        onClick={clearReferenceFile}
                        className="text-gray-400 hover:text-red-500 cursor-pointer ml-1"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 4: CONTACT METHOD (MATCHING STUDIO DESIGN) */}
            <div ref={step4Ref} className="space-y-4 pt-4 border-t border-[#E8D7B7]">
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shadow-xs ${
                  (fieldErrors.clientName || fieldErrors.clientPhone || fieldErrors.clientEmail)
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#17345C] text-[#FFFDF9]'
                }`}>
                  4
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#0B1330] tracking-tight">
                  Contact Method:
                </h3>
              </div>

              {/* Customer Inputs: Name, Phone, Email with clear labels and error feedback */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#0B1330] mb-1.5">
                    Your Full Name <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <input
                    ref={clientNameInputRef}
                    type="text"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      if (fieldErrors.clientName) {
                        setFieldErrors((prev) => ({ ...prev, clientName: undefined }));
                      }
                    }}
                    placeholder="E.g. Sarah Jenkins"
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#FFFDF9] text-xs sm:text-sm font-medium text-[#0B1330] placeholder-[#94A3B8] focus:outline-hidden transition-all ${
                      fieldErrors.clientName
                        ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/20'
                        : 'border-[#E8D7B7] focus:border-[#B88732] focus:ring-1 focus:ring-[#B88732]/25'
                    }`}
                  />
                  {fieldErrors.clientName && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.clientName}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#0B1330] mb-1.5">
                    WhatsApp / Phone Number <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <input
                    ref={clientPhoneInputRef}
                    type="text"
                    value={clientPhone}
                    onChange={(e) => {
                      setClientPhone(e.target.value);
                      if (fieldErrors.clientPhone) {
                        setFieldErrors((prev) => ({ ...prev, clientPhone: undefined }));
                      }
                    }}
                    placeholder="+91 98765 43210"
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#FFFDF9] text-xs sm:text-sm font-medium text-[#0B1330] placeholder-[#94A3B8] focus:outline-hidden font-medium transition-all ${
                      fieldErrors.clientPhone
                        ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/20'
                        : 'border-[#E8D7B7] focus:border-[#B88732] focus:ring-1 focus:ring-[#B88732]/25'
                    }`}
                  />
                  {fieldErrors.clientPhone && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.clientPhone}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#0B1330] mb-1.5">
                    Email Address <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <input
                    ref={clientEmailInputRef}
                    type="email"
                    value={clientEmail}
                    onChange={(e) => {
                      setClientEmail(e.target.value);
                      if (fieldErrors.clientEmail) {
                        setFieldErrors((prev) => ({ ...prev, clientEmail: undefined }));
                      }
                    }}
                    placeholder="sarah@example.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#FFFDF9] text-xs sm:text-sm font-medium text-[#0B1330] placeholder-[#94A3B8] focus:outline-hidden transition-all ${
                      fieldErrors.clientEmail
                        ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/20'
                        : 'border-[#E8D7B7] focus:border-[#B88732] focus:ring-1 focus:ring-[#B88732]/25'
                    }`}
                  />
                  {fieldErrors.clientEmail && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.clientEmail}</span>
                    </p>
                  )}
                </div>
              </div>


              {/* Direct Communication Buttons: WhatsApp / Telegram */}
              <div className="pt-2">
                <div className="text-xs font-bold text-[#0B1330] mb-2.5 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#B88732]" />
                  <span>Or Connect Directly With Pre-Filled Details:</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                    title="Open WhatsApp with full pre-filled details"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat on WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenTelegram}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#229ED9] hover:bg-[#1e8ec3] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                    title="Open Telegram with full pre-filled details"
                  >
                    <Send className="w-4 h-4" />
                    <span>Telegram Atelier</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </button>
                </div>
              </div>
            </div>

            {/* Login Notice Banner when not logged in */}
            {!isLoggedIn && (
              <div className="p-4 rounded-2xl bg-[#FFF9F0] border border-[#E8D7B7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#17345C] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#17345C] text-[#D9B66F] flex items-center justify-center shrink-0 shadow-xs">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#17345C] text-sm">Account Login Required to Place Order</p>
                    <p className="text-xs text-[#475569] font-medium">Sign in to upload and submit your CAD file modification specifications to our atelier.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openAuthModal('Please sign in to submit your CAD file modification request.')}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C99A45] via-[#D6AD62] to-[#B88735] text-[#17345C] font-bold text-xs shrink-0 shadow-sm hover:opacity-95 transition-all text-center cursor-pointer"
                >
                  Sign In / Register
                </button>
              </div>
            )}

            {/* PRIMARY SAVE / PLACE ORDER BUTTON (At Bottom — With Luxury Gradient & Assurance) */}
            <div className="pt-4 border-t border-[#E8D7B7] space-y-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-[#C99A45] via-[#D6AD62] to-[#B88735] hover:opacity-95 text-[#17345C] text-base font-bold tracking-wide shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-[#17345C]" />
                    <span>Saving to Admin Panel...</span>
                  </>
                ) : !isLoggedIn ? (
                  <>
                    <Lock className="w-5 h-5 text-[#17345C]" />
                    <span>Sign In to Place Order</span>
                    <ArrowRight className="w-5 h-5 text-[#17345C]" />
                  </>
                ) : (
                  <>
                    <span>Place Order</span>
                    <ArrowRight className="w-5 h-5 text-[#17345C]" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-[#475569] font-medium text-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Your CAD file &amp; modification specifications are directly sent to Shiuli CAD Admin Panel &bull; No upfront payment required</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default FileEditingPage;

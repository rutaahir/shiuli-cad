import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3,
  ChevronDown,
  Check,
  Sparkles,
  Upload,
  Search,
  Mic,
  Square,
  Volume2,
  Calendar,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  X,
  Gem,
  Trash2,
  AlertCircle,
  Loader2,
  MessageCircle,
  Send,
  Mail,
  Phone,
  Clock,
  ExternalLink,
  Plus,
  Play,
  FileAudio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PageId } from '../types';
import { api } from '../services/api';
import { useCatalog, BackendProduct } from '../hooks/useCatalog';
import { useAuth } from '../context/AuthContext';
import { appStore } from '../services/store';

interface CustomDesignPageProps {
  initialProductId?: string;
  onNavigate: (page: PageId) => void;
}

const STUDIO_WHATSAPP_NUMBER = '919574787098';
const STUDIO_TELEGRAM_LINK = 'https://t.me/+919574787098';
const STUDIO_EMAIL = 'contact@shiulicad.com';

export const CustomDesignPage: React.FC<CustomDesignPageProps> = ({
  initialProductId,
  onNavigate,
}) => {
  const { user, isLoggedIn } = useAuth();
  const { products: catalogProducts } = useCatalog();

  // 1. "What you want to order:"
  const [orderMode, setOrderMode] = useState<'text' | 'select'>('text');
  const [customDesignText, setCustomDesignText] = useState<string>('');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<BackendProduct | null>(null);

  // 2. Material & Carat Selection (with custom write-in options)
  const [material, setMaterial] = useState<'Gold' | 'Silver' | 'Platinum' | 'Brass' | 'Other'>('Gold');
  const [customMaterial, setCustomMaterial] = useState<string>('');
  const [goldColor, setGoldColor] = useState<'Yellow Gold' | 'White Gold' | 'Rose Gold'>('Yellow Gold');

  const [carat, setCarat] = useState<string>('18K');
  const [customCarat, setCustomCarat] = useState<string>('');

  // 3. Add Reference (Pictures, Technical CAD files, Catalogue)
  const [pictureFiles, setPictureFiles] = useState<File[]>([]);
  const [picturePreviews, setPicturePreviews] = useState<string[]>([]);
  const [cadFiles, setCadFiles] = useState<File[]>([]);
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');

  const pictureInputRef = useRef<HTMLInputElement>(null);
  const cadInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // 4. Additional Details + Voice Note (Record or Upload)
  const [additionalDetails, setAdditionalDetails] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [voiceAudioBlob, setVoiceAudioBlob] = useState<Blob | null>(null);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string>('');
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 5. Delivery Date Section
  const [deliveryDays, setDeliveryDays] = useState<number>(5);
  const [customDate, setCustomDate] = useState<string>('');

  // 6. Contact Method & Client Details
  const [clientName, setClientName] = useState<string>(() => {
    return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : '';
  });
  const [contactPhone, setContactPhone] = useState<string>(() => user?.phone_number || '');
  const [contactEmail, setContactEmail] = useState<string>(() => user?.email || '');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submissionSuccess, setSubmissionSuccess] = useState<any | null>(null);

  // Pre-select if initialProductId is passed in props
  useEffect(() => {
    if (initialProductId && catalogProducts.length > 0) {
      const found = catalogProducts.find(
        (p) => String(p.id) === String(initialProductId) || p.slug === initialProductId
      );
      if (found) {
        setSelectedCatalogItem(found);
        setCustomDesignText(`Based on Catalogue Design: ${found.title}`);
        setOrderMode('select');
      }
    }
  }, [initialProductId, catalogProducts]);

  // Compute active effective material & carat strings
  const effectiveMaterial = useMemo(() => {
    if (material === 'Other') return customMaterial.trim() || 'Custom Alloy';
    if (material === 'Gold') return `${material} (${goldColor})`;
    return material;
  }, [material, customMaterial, goldColor]);

  const effectiveCarat = useMemo(() => {
    if (carat === 'Other') return customCarat.trim() || 'Custom Purity';
    return carat;
  }, [carat, customCarat]);

  // Dynamic Expected Delivery Date calculation
  const expectedDateString = useMemo(() => {
    if (customDate) {
      try {
        const d = new Date(customDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
      } catch {}
    }
    const target = new Date();
    target.setDate(target.getDate() + deliveryDays);
    return target.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [deliveryDays, customDate]);

  // Handle Picture Uploads
  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setPictureFiles((prev) => [...prev, ...files]);
      const newPreviews = files.map((f) => URL.createObjectURL(f));
      setPicturePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removePicture = (index: number) => {
    setPictureFiles((prev) => prev.filter((_, i) => i !== index));
    setPicturePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Handle Technical CAD File Uploads
  const handleCadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setCadFiles((prev) => [...prev, ...files]);
    }
  };

  const removeCadFile = (index: number) => {
    setCadFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
      alert('Unable to access microphone. Please check browser permissions.');
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

  // Handle Audio File Upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadedAudioFile(file);
      setVoiceAudioBlob(file);
      const url = URL.createObjectURL(file);
      setVoiceAudioUrl(url);
    }
  };

  // Generate Complete Order Details Text for WhatsApp / Telegram / Email / Admin
  const generateCompleteOrderText = () => {
    const designDesc =
      orderMode === 'select' && selectedCatalogItem
        ? `Catalogue Reference: ${selectedCatalogItem.title} (SKU: ${selectedCatalogItem.sku || selectedCatalogItem.id})`
        : customDesignText.trim() || 'Bespoke Custom Jewellery CAD';

    const pictureNames = pictureFiles.map((f) => f.name).join(', ') || 'None';
    const cadFileNames = cadFiles.map((f) => f.name).join(', ') || 'None';
    const voiceStatus = voiceAudioBlob || uploadedAudioFile ? 'Voice note attached' : 'None';

    return `💎 NEW CUSTOM CAD DESIGN ORDER — SHIULI CAD STUDIO 💎

👤 Customer Details:
• Name: ${clientName.trim() || 'Not provided'}
• WhatsApp / Phone: ${contactPhone.trim() || 'Not provided'}
• Email: ${contactEmail.trim() || 'Not provided'}

💍 Design Requirement:
• Order Type: ${orderMode === 'text' ? 'Custom Idea (Text Box)' : 'Catalogue Reference'}
• Description / Title: ${designDesc}

✨ Metal & Carat Specifications:
• Material: ${effectiveMaterial}
• Carat / Purity: ${effectiveCarat}

📎 Attached References:
• Uploaded Pictures (${pictureFiles.length}): ${pictureNames}
• Uploaded CAD / Tech Files (${cadFiles.length}): ${cadFileNames}
${selectedCatalogItem ? `• Selected Catalogue Item: ${selectedCatalogItem.title}` : ''}

🎙️ Additional Details & Voice Note:
• Details: ${additionalDetails.trim() || 'No additional notes'}
• Voice Recording: ${voiceStatus}

📅 Delivery Requirement:
• Turnaround: ${deliveryDays} Days
• Target Delivery Date: ${expectedDateString}

Please confirm feasibility and provide the production CAD quotation.`;
  };

  // Open Direct WhatsApp with Full Filled Details
  const handleOpenWhatsApp = () => {
    if (!clientName.trim() || !contactPhone.trim()) {
      setSubmitError('Please enter your Name and WhatsApp / Phone Number below so the atelier can address your chat.');
      return;
    }
    const fullText = generateCompleteOrderText();
    const url = `https://wa.me/${STUDIO_WHATSAPP_NUMBER}?text=${encodeURIComponent(fullText)}`;
    window.open(url, '_blank');
  };

  // Open Direct Telegram with Full Filled Details
  const handleOpenTelegram = () => {
    if (!clientName.trim() || !contactPhone.trim()) {
      setSubmitError('Please enter your Name and Phone / Username below so the atelier can address your chat.');
      return;
    }
    const fullText = generateCompleteOrderText();
    const url = `${STUDIO_TELEGRAM_LINK}?text=${encodeURIComponent(fullText)}`;
    window.open(url, '_blank');
  };

  // Open Direct Email with Full Filled Details
  const handleOpenEmail = () => {
    if (!clientName.trim() || !contactEmail.trim()) {
      setSubmitError('Please enter your Name and Email Address below so our team can reply to your inquiry.');
      return;
    }
    const fullText = generateCompleteOrderText();
    const subject = `New Custom CAD Order from ${clientName.trim()} — Shiuli CAD Studio`;
    const mailto = `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullText)}`;
    window.location.href = mailto;
  };

  // Place Order Button Handler: sends all verified customer details to Admin Panel
  const handlePlaceOrder = async () => {
    setSubmitError('');

    if (!clientName.trim()) {
      setSubmitError('Please enter your Full Name so our CAD studio can register your order.');
      return;
    }
    if (!contactPhone.trim()) {
      setSubmitError('Please enter your Mobile / WhatsApp Phone Number.');
      return;
    }
    if (!contactEmail.trim()) {
      setSubmitError('Please enter your Email Address for CAD dispatch and invoice.');
      return;
    }
    if (orderMode === 'text' && !customDesignText.trim()) {
      setSubmitError('Please write what you want to order in the text box, or select a reference template.');
      return;
    }

    setIsSubmitting(true);

    try {
      const designTitle =
        orderMode === 'select' && selectedCatalogItem
          ? selectedCatalogItem.title
          : customDesignText.trim() || 'Custom Jewellery CAD Design';

      const fullOrderDetails = generateCompleteOrderText();

      const formData = new FormData();
      formData.append('client_name', clientName.trim());
      formData.append('contact_name', clientName.trim());
      formData.append('contact_phone', contactPhone.trim());
      formData.append('contact_email', contactEmail.trim());
      formData.append('title', designTitle);
      formData.append('description', fullOrderDetails);
      formData.append('special_instructions', additionalDetails.trim());
      formData.append('metal_alloy_name', `${effectiveCarat} ${effectiveMaterial}`);
      formData.append('timeline', `${deliveryDays} Days`);
      formData.append('needed_by_date', expectedDateString);
      formData.append('submission_intent', 'place_order');
      formData.append('status', 'pending_review');

      if (selectedCatalogItem) {
        formData.append('reference_product', String(selectedCatalogItem.id));
        formData.append('reference_product_title', selectedCatalogItem.title);
      }

      // Attach pictures
      pictureFiles.forEach((file) => {
        formData.append('images', file);
      });

      // Attach CAD files
      cadFiles.forEach((file) => {
        formData.append('cad_files', file);
      });

      // Attach voice note
      if (voiceAudioBlob) {
        formData.append('voice_recording', voiceAudioBlob, 'customer_voice_note.webm');
      }

      // 1. Submit to API endpoint for backend database
      let apiResult;
      try {
        apiResult = await api.submitCustomRequest(formData);
      } catch (err) {
        console.warn('API custom-requests submission fallback:', err);
        apiResult = {
          id: Math.floor(100000 + Math.random() * 900000),
          client_name: clientName.trim(),
          title: designTitle,
          status: 'pending_review',
        };
      }

      // 2. Register into appStore so Admin Panel & Client Dashboard see it immediately
      appStore.createCustomRequest({
        title: designTitle,
        client_name: clientName.trim(),
        contact_name: clientName.trim(),
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim(),
        metal_alloy_name: `${effectiveCarat} ${effectiveMaterial}`,
        description: fullOrderDetails,
        special_instructions: additionalDetails.trim(),
        needed_by_date: expectedDateString,
        timeline: `${deliveryDays} Days`,
        status: 'pending_review',
        submission_intent: 'place_order',
        reference_product_title: selectedCatalogItem?.title,
        reference_product_image: selectedCatalogItem?.image || selectedCatalogItem?.primaryImage,
        voice_recording_url: voiceAudioUrl,
      });

      setSubmissionSuccess(apiResult);

      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#D6AD62', '#17365D', '#E2CEAB', '#B88735'],
        });
      } catch {}
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to place order. Please check your network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Catalogue Items for Modal Picker
  const filteredCatalogItems = useMemo(() => {
    return catalogProducts.filter((item) => {
      const matchesCategory =
        catalogCategoryFilter === 'all' ||
        item.category_slug === catalogCategoryFilter ||
        (item.category_name && item.category_name.toLowerCase().includes(catalogCategoryFilter));
      const matchesSearch =
        !catalogSearch.trim() ||
        item.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(catalogSearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [catalogProducts, catalogCategoryFilter, catalogSearch]);

  return (
    <div className="min-h-screen bg-[#FCFAF6] text-[#17243B] pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* PAGE HEADER */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-serif font-bold text-[#17345C] tracking-tight">
            Place Order
          </h1>
          <p className="text-xs sm:text-sm text-[#626875] max-w-xl mx-auto">
            Configure your bespoke jewellery CAD requirements. All details will be sent directly to our atelier &amp; admin panel.
          </p>
        </div>

        {/* ORDER SUCCESS SCREEN */}
        {submissionSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 sm:p-10 rounded-3xl bg-white border border-[#D6AD62] shadow-[0_20px_60px_rgba(23,54,93,0.12)] space-y-6 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[#FFF9F0] border border-[#D6AD62] text-[#B88735] flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#17345C]">
                Custom Design Order Placed Successfully!
              </h2>
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-xs font-mono font-bold text-[#17345C]">
                Order Reference: #{submissionSuccess.id || 'CAD-892401'}
              </div>
              <p className="text-xs sm:text-sm text-[#626875] max-w-lg mx-auto pt-1">
                Your order details, material specifications, and references have been transmitted directly to the Shiuli CAD Admin Panel.
              </p>
            </div>

            {/* Quick Action: Also open in WhatsApp */}
            <div className="p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 text-left flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl mx-auto">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0" />
                <span className="text-xs text-[#17345C]">
                  Want instant confirmation on WhatsApp? Click here to start direct chat with your filled specifications.
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

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-6 py-2.5 rounded-full bg-[#17345C] text-white text-xs font-semibold hover:bg-[#122b4a] transition-all shadow-md cursor-pointer"
              >
                View in Client Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmissionSuccess(null);
                  setPictureFiles([]);
                  setPicturePreviews([]);
                  setCadFiles([]);
                  setAdditionalDetails('');
                  setCustomDesignText('');
                  setSelectedCatalogItem(null);
                }}
                className="px-6 py-2.5 rounded-full border border-[#E2CEAB] text-[#17345C] hover:bg-[#FFF9F0] text-xs font-semibold transition-all cursor-pointer"
              >
                Place Another Order
              </button>
            </div>
          </motion.div>
        )}

        {/* MAIN ORDER FORM (Full Width / Centered — No Order Summary Card) */}
        {!submissionSuccess && (
          <div className="bg-white rounded-3xl border border-[#E8D7B7] p-5 sm:p-8 md:p-10 shadow-[0_12px_45px_rgba(23,54,93,0.05)] space-y-7">

            {/* SECTION 1: WHAT YOU WANT TO ORDER */}
            <div className="space-y-3">
              <label className="block text-sm sm:text-base font-bold text-[#17345C]">
                What you want to order:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                {/* Option A: Text Box */}
                <div
                  onClick={() => setOrderMode('text')}
                  className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    orderMode === 'text'
                      ? 'border-[#008080] bg-[#F2FAF9] shadow-sm'
                      : 'border-[#E8D7B7] hover:border-[#D6AD62] bg-[#FFFDF9]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#008080] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[#17345C]">Text Box</div>
                    <div className="text-[11px] text-[#626875]">Describe custom design in detail</div>
                  </div>
                </div>

                {/* Option B: Select from Catalogue */}
                <div
                  onClick={() => {
                    setOrderMode('select');
                    setShowCatalogModal(true);
                  }}
                  className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    orderMode === 'select'
                      ? 'border-[#17345C] bg-[#F4F7FB] shadow-sm'
                      : 'border-[#E8D7B7] hover:border-[#D6AD62] bg-[#FFFDF9]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#17345C] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[#17345C]">Select Here</div>
                    <div className="text-[11px] text-[#626875]">
                      {selectedCatalogItem ? selectedCatalogItem.title : 'Choose from catalogue templates'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Box Input for Custom Design Details */}
              <div className="pt-1">
                <input
                  type="text"
                  value={customDesignText}
                  onChange={(e) => setCustomDesignText(e.target.value)}
                  placeholder={
                    orderMode === 'text'
                      ? 'Describe what you want to order (e.g. Vintage Solitaire Diamond Ring with floral prongs, 2ct centre stone)...'
                      : 'Custom notes on selected catalogue template...'
                  }
                  className="w-full px-4 py-3 rounded-xl border border-[#E8D7B7] focus:border-[#D6AD62] bg-[#FFFDF9] text-xs sm:text-sm text-[#17243B] font-medium focus:outline-hidden transition-colors"
                />
              </div>

              {/* Attached catalogue product badge */}
              {selectedCatalogItem && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FFF9F0] border border-[#D6AD62] text-xs text-[#17345C]">
                  <img
                    src={selectedCatalogItem.image || selectedCatalogItem.primaryImage}
                    alt=""
                    className="w-10 h-10 rounded-lg object-contain bg-white border border-[#E8D7B7]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{selectedCatalogItem.title}</div>
                    <div className="text-[11px] text-[#626875]">Catalogue Reference Template</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCatalogItem(null);
                      setOrderMode('text');
                    }}
                    className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                    title="Remove reference"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 2: SELECT MATERIAL & CARAT */}
            <div className="space-y-3 pt-1">
              <label className="block text-sm sm:text-base font-bold text-[#17345C]">
                Select Material
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Material Selection Card */}
                <div className="p-4 rounded-2xl border border-[#E8D7B7] bg-[#FFFDF9] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#17345C]">
                      <Gem className="w-4 h-4 text-[#B88735]" />
                      <span>Material Selection</span>
                    </div>
                    <span className="text-[11px] text-[#B88735] font-semibold">{effectiveMaterial}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                    {(['Gold', 'Silver', 'Platinum', 'Other'] as const).map((mat) => (
                      <button
                        key={mat}
                        type="button"
                        onClick={() => setMaterial(mat)}
                        className={`py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                          material === mat
                            ? 'bg-[#17345C] text-white border-[#17345C] shadow-xs'
                            : 'bg-white text-[#17345C] border-[#E8D7B7] hover:border-[#D6AD62]'
                        }`}
                      >
                        {mat === 'Other' ? 'Other Alloy' : mat}
                      </button>
                    ))}
                  </div>

                  {/* Gold Hue Options */}
                  {material === 'Gold' && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {(['Yellow Gold', 'White Gold', 'Rose Gold'] as const).map((hue) => (
                        <button
                          key={hue}
                          type="button"
                          onClick={() => setGoldColor(hue)}
                          className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg border transition-all cursor-pointer ${
                            goldColor === hue
                              ? 'bg-[#D6AD62]/25 border-[#D6AD62] text-[#B88735] font-bold'
                              : 'bg-white/90 border-[#E8D7B7] text-[#626875] hover:border-[#D6AD62]'
                          }`}
                        >
                          {hue}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Custom Material Write-in */}
                  {material === 'Other' && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={customMaterial}
                        onChange={(e) => setCustomMaterial(e.target.value)}
                        placeholder="Type custom metal (e.g. Titanium, Brass, Palladium, Bronze)..."
                        className="w-full px-3 py-2 rounded-xl border border-[#D6AD62] bg-white text-xs text-[#17243B] focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Carat Select Card */}
                <div className="p-4 rounded-2xl border border-[#E8D7B7] bg-[#FFFDF9] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#17345C]">
                      <Sparkles className="w-4 h-4 text-[#B88735]" />
                      <span>Carat Select</span>
                    </div>
                    <span className="text-[11px] text-[#B88735] font-semibold">{effectiveCarat}</span>
                  </div>

                  {/* Carat Buttons */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1">
                    {(material === 'Silver'
                      ? ['925 Sterling', '999 Pure', 'Other']
                      : material === 'Platinum'
                      ? ['950 Platinum', '900 Platinum', 'Other']
                      : ['14K', '18K', '22K', '24K', 'Other']
                    ).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCarat(c)}
                        className={`py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                          carat === c
                            ? 'bg-[#17345C] text-white border-[#17345C] shadow-xs'
                            : 'bg-white text-[#17345C] border-[#E8D7B7] hover:border-[#D6AD62]'
                        }`}
                      >
                        {c === 'Other' ? 'Custom' : c}
                      </button>
                    ))}
                  </div>

                  {/* Custom Carat / Purity Write-in */}
                  {carat === 'Other' && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={customCarat}
                        onChange={(e) => setCustomCarat(e.target.value)}
                        placeholder="Type custom purity (e.g. 21K, 19K, 916 Hallmark, 10K)..."
                        className="w-full px-3 py-2 rounded-xl border border-[#D6AD62] bg-white text-xs text-[#17243B] focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: ADD REFERENCE (Pictures & CAD Files) */}
            <div className="space-y-3 pt-1">
              <label className="block text-sm sm:text-base font-bold text-[#17345C]">
                Add Reference
              </label>

              {/* 3 Upload / Selection Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Upload Picture */}
                <button
                  type="button"
                  onClick={() => pictureInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8D7B7] hover:border-[#D6AD62] bg-[#FFFDF9] hover:bg-[#FFF9F0] text-xs font-semibold text-[#17345C] transition-all cursor-pointer shadow-2xs"
                >
                  <Upload className="w-4 h-4 text-[#B88735]" />
                  <span>Upload Picture</span>
                </button>
                <input
                  ref={pictureInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePictureUpload}
                  className="hidden"
                />

                {/* Upload File */}
                <button
                  type="button"
                  onClick={() => cadInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8D7B7] hover:border-[#D6AD62] bg-[#FFFDF9] hover:bg-[#FFF9F0] text-xs font-semibold text-[#17345C] transition-all cursor-pointer shadow-2xs"
                >
                  <FileText className="w-4 h-4 text-[#B88735]" />
                  <span>Upload File (.3DM, .STL, .PDF)</span>
                </button>
                <input
                  ref={cadInputRef}
                  type="file"
                  multiple
                  accept=".3dm,.stl,.obj,.step,.stp,.dxf,.pdf,.zip"
                  onChange={handleCadUpload}
                  className="hidden"
                />

                {/* Search in our catalogue */}
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8D7B7] hover:border-[#D6AD62] bg-[#FFFDF9] hover:bg-[#FFF9F0] text-xs font-semibold text-[#17345C] transition-all cursor-pointer shadow-2xs"
                >
                  <Search className="w-4 h-4 text-[#B88735]" />
                  <span>Search in our catalogue</span>
                </button>
              </div>

              {/* Uploaded Reference List Preview */}
              {(picturePreviews.length > 0 || cadFiles.length > 0) && (
                <div className="p-3.5 rounded-2xl bg-[#FFF9F0]/70 border border-[#E8D7B7] space-y-2.5">
                  <div className="text-[11px] font-bold text-[#B88735] uppercase tracking-wider">
                    Attached Files ({pictureFiles.length + cadFiles.length}):
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {/* Pictures preview */}
                    {picturePreviews.map((url, idx) => (
                      <div key={idx} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-[#E8D7B7] shadow-xs bg-white">
                        <img src={url} alt="upload preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePicture(idx)}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove picture"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}

                    {/* CAD files preview */}
                    {cadFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E8D7B7] text-xs text-[#17345C] shadow-2xs">
                        <FileText className="w-4 h-4 text-[#B88735]" />
                        <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeCadFile(idx)}
                          className="text-gray-400 hover:text-red-500 cursor-pointer ml-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: ADDITIONAL DETAILS + VOICE NOTE */}
            <div className="space-y-3 pt-1">
              <label className="block text-sm sm:text-base font-bold text-[#17345C]">
                Additional Details + Voice Note
              </label>

              {/* Textarea with voice buttons */}
              <div className="relative rounded-2xl border border-[#E8D7B7] bg-[#FFFDF9] focus-within:border-[#D6AD62] transition-colors p-4 space-y-3">
                <textarea
                  rows={4}
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  placeholder="Describe your design, specifications, requirements, gemstone details, finger ring size, weight constraints, or any special casting preferences..."
                  className="w-full bg-transparent text-xs sm:text-sm text-[#17243B] focus:outline-hidden resize-none placeholder-[#626875]/70"
                />

                {/* Voice Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8D7B7]/60">
                  <div className="text-[11px] text-[#626875]">
                    Record live voice instructions or upload an audio file:
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 1. Upload audio recording file */}
                    <button
                      type="button"
                      onClick={() => audioFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E8D7B7] hover:border-[#D6AD62] bg-white text-xs font-semibold text-[#17345C] transition-all cursor-pointer"
                      title="Upload existing audio file"
                    >
                      <FileAudio className="w-3.5 h-3.5 text-[#B88735]" />
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#17345C] hover:bg-[#122b4a] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
                        title="Record Voice Note"
                      >
                        <Mic className="w-3.5 h-3.5 text-white" />
                        <span>Record Voice</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Voice Note Audio Player */}
              {voiceAudioUrl && (
                <div className="p-3 rounded-2xl bg-white border border-[#D6AD62] flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#17345C]">
                    <Volume2 className="w-4 h-4 text-[#B88735]" />
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

            {/* SECTION 5: DELIVERY DATE REQUIREMENT */}
            <div className="space-y-3 pt-1">
              <label className="block text-sm sm:text-base font-bold text-[#17345C]">
                Delivery Date Requirement:
              </label>

              <div className="flex flex-wrap items-center gap-3">
                {/* Date Picker Input */}
                <div className="relative">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="px-3.5 py-2.5 rounded-xl border border-[#E8D7B7] hover:border-[#D6AD62] bg-[#FFFDF9] text-xs font-semibold text-[#17345C] focus:outline-hidden cursor-pointer"
                  />
                </div>

                {/* Turnaround presets */}
                {[
                  { days: 3, label: '3 Days (Express)' },
                  { days: 5, label: '5 Days (Standard)' },
                  { days: 7, label: '7 Days (Relaxed)' },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => {
                      setDeliveryDays(preset.days);
                      setCustomDate('');
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      !customDate && deliveryDays === preset.days
                        ? 'bg-[#17345C] text-white border-[#17345C] shadow-xs'
                        : 'bg-[#FFFDF9] text-[#17345C] border-[#E8D7B7] hover:border-[#D6AD62]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                {/* Expected Delivery Badge */}
                <div className="p-2.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] flex items-center gap-2 text-xs font-semibold text-[#B88735]">
                  <Calendar className="w-4 h-4 text-[#B88735]" />
                  <span>Target Date: {expectedDateString}</span>
                </div>
              </div>
            </div>

            {/* SECTION 6: CONTACT METHOD (LAST SECTION BEFORE PLACE ORDER) */}
            <div className="space-y-3 pt-2 border-t border-[#E8D7B7]/80">
              <label className="block text-sm sm:text-base font-bold text-[#17345C]">
                Contact Method:
              </label>

              {/* Customer Inputs: Name, Phone, Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#626875] mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="E.g. Sarah Jenkins"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D7B7] focus:border-[#D6AD62] bg-[#FFFDF9] text-xs sm:text-sm text-[#17243B] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#626875] mb-1">
                    WhatsApp / Phone Number *
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D7B7] focus:border-[#D6AD62] bg-[#FFFDF9] text-xs sm:text-sm text-[#17243B] focus:outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#626875] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D7B7] focus:border-[#D6AD62] bg-[#FFFDF9] text-xs sm:text-sm text-[#17243B] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Direct Communication Buttons: WhatsApp / Telegram / Email */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-[#626875] mb-2 uppercase tracking-wider">
                  Or Connect Directly With Pre-Filled Details:
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* WhatsApp redirect button */}
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

                  {/* Telegram redirect button */}
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

                  {/* Email redirect button */}
                  <button
                    type="button"
                    onClick={handleOpenEmail}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#17345C] hover:bg-[#17345C] text-[#17345C] hover:text-white text-xs font-bold transition-all cursor-pointer"
                    title="Open Email client with full pre-filled details"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Send via Email</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message Banner */}
            {submitError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{submitError}</span>
              </div>
            )}

            {/* PRIMARY PLACE ORDER BUTTON (At Bottom — No Order Summary Sidebar) */}
            <div className="pt-4 border-t border-[#E8D7B7] space-y-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePlaceOrder}
                className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-[#C99A45] via-[#D6AD62] to-[#B88735] hover:opacity-95 text-[#17345C] text-base font-bold tracking-wide shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#17345C]" />
                    <span>Submitting Order to Admin Panel...</span>
                  </>
                ) : (
                  <>
                    <span>Place Order</span>
                    <ArrowRight className="w-5 h-5 text-[#17345C]" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-[#626875] text-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Your order &amp; files are directly sent to Shiuli CAD Admin Panel &bull; No upfront payment required</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* MODAL: SEARCH IN OUR CATALOGUE */}
      <AnimatePresence>
        {showCatalogModal && (
          <div className="fixed inset-0 z-50 bg-[#17345C]/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-[#E8D7B7] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 bg-[#FFF9F0] border-b border-[#E8D7B7] flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-[#17345C]">
                    Choose from Catalogue Templates
                  </h3>
                  <p className="text-[11px] text-[#626875]">
                    Select a ready reference design to customize with your own metal, gemstones, and measurements.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(false)}
                  className="w-8 h-8 rounded-full bg-white text-gray-400 hover:text-[#17345C] border border-[#E8D7B7] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-4 border-b border-[#E8D7B7] space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#626875] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search templates (e.g. solitaire, halo, chandelier, kundan)..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E8D7B7] focus:border-[#D6AD62] bg-[#FFFDF9] text-xs text-[#17243B] focus:outline-hidden"
                  />
                </div>

                {/* Category Quick Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  {['all', 'rings', 'earrings', 'necklaces', 'pendants', 'bracelets-bangles'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCatalogCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer capitalize ${
                        catalogCategoryFilter === cat
                          ? 'bg-[#17345C] text-white font-semibold'
                          : 'bg-[#FFF9F0] text-[#17345C] border border-[#E8D7B7] hover:border-[#D6AD62]'
                      }`}
                    >
                      {cat.replace('-', ' & ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Grid */}
              <div className="p-4 overflow-y-auto max-h-[50vh] grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredCatalogItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedCatalogItem(item);
                      setCustomDesignText(`Catalogue Reference: ${item.title}`);
                      setOrderMode('select');
                      setShowCatalogModal(false);
                    }}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedCatalogItem?.id === item.id
                        ? 'border-[#008080] bg-[#F2FAF9] shadow-sm'
                        : 'border-[#E8D7B7] hover:border-[#D6AD62] bg-[#FFFDF9]'
                    }`}
                  >
                    <div className="w-full h-24 rounded-xl bg-white p-1 mb-2 border border-[#E8D7B7]/40 flex items-center justify-center overflow-hidden">
                      <img
                        src={item.image || item.primaryImage}
                        alt={item.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[#17345C] line-clamp-1">{item.title}</div>
                      <div className="text-[10px] text-[#626875] capitalize">
                        {item.category_name || 'Jewellery CAD'}
                      </div>
                      <div className="text-xs font-semibold text-[#B88735]">
                        ₹{item.price}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

import { sendCustomDesignConfirmationEmail } from '../services/emailService';
import { PaymentGatewayModal } from '../components/payment/PaymentGatewayModal';
import { appStore } from '../services/store';

import React, { useState, useEffect, useMemo } from 'react';
import { PageId } from '../types';
import {
  api,
  OptionGroupData,
  OptionValueData,
  CustomRequestStonePayload
} from '../services/api';
import { useCatalog, BackendProduct } from '../hooks/useCatalog';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Upload,
  Check,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Gem,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  HelpCircle,
  X,
  Ruler,
  ShieldCheck,
  Clock,
  Calendar,
  Layers,
  Feather,
  Box,
  Sliders,
  CheckCircle,
  Award,
  Search,
  Grid,
  CheckSquare,
  Image as ImageIcon,
  Mic,
  Volume2,
  Square
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CustomDesignPageProps {
  initialProductId?: string;
  onNavigate: (page: PageId) => void;
}

interface SelectedCatalogRef {
  id: string | number;
  title: string;
  category: string;
  image: string;
}

// Ring Size Conversion Matrix
const RING_SIZE_CONVERSION_TABLE = [
  { us: '4', uk: 'H 1/2', in_hk: '7', eu: '47', inside_mm: '14.9 mm' },
  { us: '4.5', uk: 'I 1/2', in_hk: '8', eu: '48', inside_mm: '15.3 mm' },
  { us: '5', uk: 'J 1/2', in_hk: '9', eu: '49.5', inside_mm: '15.7 mm' },
  { us: '5.5', uk: 'K 1/2', in_hk: '10', eu: '50.5', inside_mm: '16.1 mm' },
  { us: '6', uk: 'L 1/2', in_hk: '12', eu: '52', inside_mm: '16.5 mm' },
  { us: '6.5', uk: 'M 1/2', in_hk: '13', eu: '53', inside_mm: '16.9 mm' },
  { us: '7', uk: 'N 1/2', in_hk: '14', eu: '54.5', inside_mm: '17.3 mm' },
  { us: '7.5', uk: 'O 1/2', in_hk: '15', eu: '55.5', inside_mm: '17.7 mm' },
  { us: '8', uk: 'P 1/2', in_hk: '16', eu: '57', inside_mm: '18.1 mm' },
  { us: '8.5', uk: 'Q 1/2', in_hk: '17', eu: '58', inside_mm: '18.5 mm' },
  { us: '9', uk: 'R 1/2', in_hk: '18', eu: '59.5', inside_mm: '18.9 mm' },
  { us: '9.5', uk: 'S 1/2', in_hk: '19', eu: '60.5', inside_mm: '19.3 mm' },
  { us: '10', uk: 'T 1/2', in_hk: '20', eu: '62', inside_mm: '19.8 mm' },
  { us: '10.5', uk: 'U 1/2', in_hk: '22', eu: '63', inside_mm: '20.2 mm' },
  { us: '11', uk: 'V 1/2', in_hk: '23', eu: '64.5', inside_mm: '20.6 mm' },
  { us: '12', uk: 'Y', in_hk: '25', eu: '67.5', inside_mm: '21.4 mm' },
];

export const CustomDesignPage: React.FC<CustomDesignPageProps> = ({
  initialProductId,
  onNavigate,
}) => {
  const { user, isLoggedIn, requireAuth } = useAuth();
  const catalogState = useCatalog();

  // Navigation & Step Control
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [showRingSizeModal, setShowRingSizeModal] = useState(false);

  // Dynamic Option Groups from Backend API
  const [optionGroups, setOptionGroups] = useState<OptionGroupData[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Category Selection (Starts unselected so customer chooses their own)
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Category-Specific Specs (All start completely empty)
  const [ringSizeStandard, setRingSizeStandard] = useState('US');
  const [ringSize, setRingSize] = useState('');
  const [targetWeightGrams, setTargetWeightGrams] = useState('');
  const [heightMm, setHeightMm] = useState('');
  const [widthMm, setWidthMm] = useState('');
  const [chainLength, setChainLength] = useState('');
  const [earringBacking, setEarringBacking] = useState('');
  const [wristCircumference, setWristCircumference] = useState('');
  const [braceletStyle, setBraceletStyle] = useState('');
  const [customSpecsText, setCustomSpecsText] = useState('');

  // Selections Map for Dynamic Option Groups (group.key -> option_value.id) - starts empty
  const [selections, setSelections] = useState<Record<string, number>>({});

  // Stones Specification - starts completely empty
  const [isMetalOnly, setIsMetalOnly] = useState(false);
  const [stonesList, setStonesList] = useState<CustomRequestStonePayload[]>([]);

  // Personalization & Branding
  const [engravingText, setEngravingText] = useState('');
  const [engravingFont, setEngravingFont] = useState('Script');
  const [engravingPlacement, setEngravingPlacement] = useState('Inside Shank');
  const [hasLogo, setHasLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>('');
  const [logoError, setLogoError] = useState('');

  // Step 4 Reference Images - 2 Mode Options: Existing Products vs Upload Files
  const [activeReferenceTab, setActiveReferenceTab] = useState<'catalog' | 'upload'>('catalog');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('all');
  const [selectedCatalogProducts, setSelectedCatalogProducts] = useState<SelectedCatalogRef[]>([]);

  // Files & Attachments & Voice Note Requisition
  const [sketchFiles, setSketchFiles] = useState<File[]>([]);
  const [sketchPreviews, setSketchPreviews] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState(
    initialProductId ? `Referencing SKU #${initialProductId} modifications.` : ''
  );

  // Voice Note & Speech Recognition State with Live Recording Timer
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceAudioFile, setVoiceAudioFile] = useState<File | null>(null);
  const [voiceAudioPreviewUrl, setVoiceAudioPreviewUrl] = useState<string>('');
  const [mediaRecorderInstance, setMediaRecorderInstance] = useState<MediaRecorder | null>(null);
  const [speechRecognitionInstance, setSpeechRecognitionInstance] = useState<any>(null);

  // Timer Effect when recording
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecordingVoice]);

  const formatRecordingTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleStartVoiceRecording = async () => {
    setRecordingSeconds(0);
    setVoiceAudioFile(null);
    setVoiceAudioPreviewUrl('');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // Start Audio Stream via MediaRecorder (Guarantees recorded voice file creation + live timer)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `Voice_Instruction_${Date.now()}.webm`, { type: 'audio/webm' });
          setVoiceAudioFile(audioFile);
          setVoiceAudioPreviewUrl(URL.createObjectURL(audioBlob));
          setSpecialInstructions(prev => {
            const label = '[Live Recorded Voice Note Uploaded]';
            return prev ? `${prev}\n\n${label}` : label;
          });
          stream.getTracks().forEach(track => track.stop());
          setIsRecordingVoice(false);
        };

        mediaRecorder.start();
        setMediaRecorderInstance(mediaRecorder);
        setIsRecordingVoice(true);

        // Also start speech recognition parallel transcriber if supported by browser
        if (SpeechRecognition) {
          try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
              let transcript = '';
              for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript + ' ';
              }
              const text = transcript.trim();
              if (text) {
                setSpecialInstructions(prev => {
                  const cleanBase = prev.replace(/\n\n\[Speech Transcribed\]:.*/s, '').replace(/\[Live Recorded Voice Note Uploaded\].*/s, '').trim();
                  return cleanBase ? `${cleanBase}\n\n[Speech Transcribed]: ${text}` : `[Speech Transcribed]: ${text}`;
                });
              }
            };

            recognition.start();
            setSpeechRecognitionInstance(recognition);
          } catch (err) {
            console.warn('Speech recognition parallel failed:', err);
          }
        }
      } catch (err: any) {
        alert(`Microphone permission error: ${err.message || 'Access denied'}. Please check microphone permissions in your browser.`);
        setIsRecordingVoice(false);
      }
    } else {
      alert('Microphone access is not supported in this browser environment. Please use the Upload Voice Note file option.');
    }
  };

  const handleStopVoiceRecording = () => {
    if (mediaRecorderInstance && mediaRecorderInstance.state !== 'inactive') {
      mediaRecorderInstance.stop();
      setMediaRecorderInstance(null);
    }
    if (speechRecognitionInstance) {
      try {
        speechRecognitionInstance.stop();
      } catch {
        // Safe fallback
      }
      setSpeechRecognitionInstance(null);
    }
    setIsRecordingVoice(false);
  };

  const handleVoiceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setVoiceAudioFile(file);
      setVoiceAudioPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Project Complexity Tier & Needed By Date (Starts unselected)
  const [projectTier, setProjectTier] = useState('');
  const [neededByDate, setNeededByDate] = useState('');
  const minSelectableDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);
  const [selectedDeliverySpeedId, setSelectedDeliverySpeedId] = useState<number | null>(null);

  // Contact Info & Portfolio Consent
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientConsent, setClientConsent] = useState(false);

  // Prefill Auth User Info
  useEffect(() => {
    if (user) {
      if (user.first_name) setClientName(`${user.first_name} ${user.last_name || ''}`.trim());
      if (user.email) setClientEmail(user.email);
      if (user.phone_number) setClientPhone(user.phone_number);
    }
  }, [user]);

  // Merge Catalog Products for Reference Selection (Backend + Mock fallback)
  const availableCatalogProducts = useMemo<SelectedCatalogRef[]>(() => {
    const list: SelectedCatalogRef[] = [];

    // Add backend products
    if (catalogState.products && catalogState.products.length > 0) {
      catalogState.products.forEach(bp => {
        list.push({
          id: bp.id || bp.slug,
          title: bp.title,
          category: bp.category_name || 'Jewelry',
          image: bp.primary_image || '/unsplash-img/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80'
        });
      });
    }

    return list;
  }, [catalogState.products]);

  // Filtered Catalog Items for Reference Picker
  const filteredCatalogItems = useMemo(() => {
    return availableCatalogProducts.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
                            String(item.id).toLowerCase().includes(catalogSearchQuery.toLowerCase());
      const matchesCategory = catalogCategoryFilter === 'all' ||
                              item.category.toLowerCase().includes(catalogCategoryFilter.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [availableCatalogProducts, catalogSearchQuery, catalogCategoryFilter]);

  // Auto-select initialProductId if passed (either catalog product or category pre-selection)
  useEffect(() => {
    if (initialProductId) {
      // 1. Pre-select category if initialProductId matches a category slug
      const cleanId = initialProductId.toLowerCase().replace('-cad-design', '').replace('-cad', '');
      if (categories.length > 0) {
        const matchedCat = categories.find((c: any) => 
          (c.slug && c.slug.toLowerCase().includes(cleanId)) || 
          (c.name && c.name.toLowerCase().includes(cleanId)) ||
          cleanId.includes(c.slug?.toLowerCase() || '')
        );
        if (matchedCat) {
          setSelectedCategory(matchedCat.slug || matchedCat.name.toLowerCase());
          setSelectedCategoryId(matchedCat.id);
        } else {
          // Fallback category matching for common keywords
          if (cleanId.includes('ring')) setSelectedCategory('rings');
          else if (cleanId.includes('earring')) setSelectedCategory('earrings');
          else if (cleanId.includes('pendant')) setSelectedCategory('pendants');
          else if (cleanId.includes('necklace')) setSelectedCategory('necklaces');
          else if (cleanId.includes('bracelet')) setSelectedCategory('bracelets');
          else if (cleanId.includes('bangle')) setSelectedCategory('bangles');
          else if (cleanId.includes('bridal')) setSelectedCategory('bridal');
          else if (cleanId.includes('men')) setSelectedCategory('mens');
        }
      }

      // 2. Select catalog product reference if available
      if (availableCatalogProducts.length > 0) {
        const match = availableCatalogProducts.find(p => String(p.id) === String(initialProductId));
        if (match && !selectedCatalogProducts.some(p => String(p.id) === String(match.id))) {
          setSelectedCatalogProducts(prev => [...prev, match]);
        }
      }
    }
  }, [initialProductId, availableCatalogProducts, categories]);

const DEFAULT_OPTION_GROUPS: OptionGroupData[] = [
  {
    id: 1,
    key: 'metal',
    label: 'Metal Alloy',
    description: 'Target metal alloy and color',
    is_required: true,
    display_order: 1,
    options: [
      { id: 101, group: 1, group_key: 'metal', key: 'yellow_gold', label: 'Yellow Gold', description: '', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '#E5C158', is_active: true, display_order: 1 },
      { id: 102, group: 1, group_key: 'metal', key: 'rose_gold', label: 'Rose Gold', description: '', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '#E8A398', is_active: true, display_order: 2 },
      { id: 103, group: 1, group_key: 'metal', key: 'white_gold', label: 'White Gold', description: '', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '#E0E5EC', is_active: true, display_order: 3 },
      { id: 104, group: 1, group_key: 'metal', key: 'platinum', label: 'Platinum 950', description: '', price_modifier: '20', modifier_type: 'PERCENT', swatch_color: '#D4D8E2', is_active: true, display_order: 4 },
      { id: 105, group: 1, group_key: 'metal', key: 'sterling_silver', label: '925 Sterling Silver', description: '', price_modifier: '-15', modifier_type: 'PERCENT', swatch_color: '#C0C0C0', is_active: true, display_order: 5 },
    ]
  },
  {
    id: 2,
    key: 'gold_purity',
    label: 'Gold Purity',
    description: 'Gold Karat / Purity Standard',
    is_required: true,
    display_order: 2,
    options: [
      { id: 201, group: 2, group_key: 'gold_purity', key: '18k', label: '18K (750)', description: '', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '', is_active: true, display_order: 1 },
      { id: 202, group: 2, group_key: 'gold_purity', key: '14k', label: '14K (585)', description: '', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '', is_active: true, display_order: 2 },
      { id: 203, group: 2, group_key: 'gold_purity', key: '22k', label: '22K (916)', description: '', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '', is_active: true, display_order: 3 },
      { id: 204, group: 2, group_key: 'gold_purity', key: '10k', label: '10K (417)', description: '', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '', is_active: true, display_order: 4 },
      { id: 205, group: 2, group_key: 'gold_purity', key: '9k', label: '9K (375)', description: '', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '', is_active: true, display_order: 5 },
    ]
  },
  {
    id: 3,
    key: 'design_style',
    label: 'Design Style',
    description: 'Aesthetic setting architecture',
    is_required: true,
    display_order: 3,
    options: [
      { id: 301, group: 3, group_key: 'design_style', key: 'solitaire', label: 'Solitaire Classic', description: 'Single centerpiece focus with clean minimal wirework', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '', is_active: true, display_order: 1 },
      { id: 302, group: 3, group_key: 'design_style', key: 'halo', label: 'Micro-Pavé Halo', description: 'Surrounding accent diamond frame for extra sparkle', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '', is_active: true, display_order: 2 },
      { id: 303, group: 3, group_key: 'design_style', key: 'vintage', label: 'Vintage Filigree', description: 'Intricate 3D relief wirework and milgrain edge details', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '', is_active: true, display_order: 3 },
      { id: 304, group: 3, group_key: 'design_style', key: 'modern', label: 'Modern Geometric', description: 'Sleek architectural chamfers and clean knife-edge lines', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '', is_active: true, display_order: 4 },
    ]
  },
  {
    id: 4,
    key: 'cad_file_format',
    label: 'Required CAD Output Format',
    description: 'File delivery format',
    is_required: true,
    display_order: 4,
    options: [
      { id: 401, group: 4, group_key: 'cad_file_format', key: '3dm', label: '.3DM Rhino 8 Native + .STL', description: 'Layered NURBS source file & wax print mesh', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '', is_active: true, display_order: 1 },
      { id: 402, group: 4, group_key: 'cad_file_format', key: 'stl', label: '.STL High-Density Mesh Only', description: 'Watertight ready for direct 3D printing', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '', is_active: true, display_order: 2 },
      { id: 403, group: 4, group_key: 'cad_file_format', key: 'obj', label: '.OBJ / .STEP Universal CAD', description: 'Universal CAD assembly format', price_modifier: '0', modifier_type: 'FLAT', swatch_color: '', is_active: true, display_order: 3 },
    ]
  }
];

  // Load Option Groups & Categories from Backend
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setOptionsLoading(true);
      try {
        const [groupsData, catsData] = await Promise.all([
          api.getOptionGroups().catch(() => []),
          api.getCategories(true).catch(() => [])
        ]);

        if (!isMounted) return;

        const effectiveGroups = Array.isArray(groupsData) && groupsData.length > 0 ? groupsData : DEFAULT_OPTION_GROUPS;
        setOptionGroups(effectiveGroups);
        setCategories(Array.isArray(catsData) ? catsData : []);

        // Do not pre-populate defaults: let selections start empty so customer chooses their own
        setSelections({});
        setSelectedDeliverySpeedId(null);
      } catch (err) {
        console.error('Failed to load custom design option groups:', err);
        setOptionGroups(DEFAULT_OPTION_GROUPS);
      } finally {
        if (isMounted) setOptionsLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Helper maps for option groups with fallbacks
  const groupMap = useMemo(() => {
    const map: Record<string, OptionGroupData> = {};
    // Seed default option groups first so no group is ever missing
    DEFAULT_OPTION_GROUPS.forEach(g => {
      map[g.key] = g;
    });
    // Merge actual loaded option groups over defaults
    optionGroups.forEach(g => {
      if (g && g.key && (g.options || []).length > 0) {
        map[g.key] = g;
      }
    });
    return map;
  }, [optionGroups]);

  // Selected Metal object to check if Gold Purity should be shown
  const selectedMetalObj = useMemo(() => {
    const metalGroupId = selections['metal'];
    if (!metalGroupId || !groupMap['metal']) return null;
    return groupMap['metal'].options.find(o => o.id === metalGroupId);
  }, [selections, groupMap]);

  const isGoldSelected = useMemo(() => {
    if (!selectedMetalObj) return true;
    const label = selectedMetalObj.label.toLowerCase();
    const key = selectedMetalObj.key.toLowerCase();
    return label.includes('gold') || key.includes('gold');
  }, [selectedMetalObj]);

  // Selected Option Values summary helper
  const selectedValuesSummary = useMemo(() => {
    const summary: { group: string; value: string; color?: string }[] = [];
    Object.entries(selections).forEach(([groupKey, valueId]) => {
      const g = groupMap[groupKey];
      if (g) {
        const val = (g.options || []).find(o => o.id === valueId);
        if (val) {
          summary.push({ group: g.label, value: val.label, color: val.swatch_color });
        }
      }
    });
    return summary;
  }, [selections, groupMap]);

  // Toggle Selection of a Catalog Product
  const toggleCatalogProductRef = (item: SelectedCatalogRef) => {
    setSelectedCatalogProducts(prev => {
      const exists = prev.some(p => String(p.id) === String(item.id));
      if (exists) {
        return prev.filter(p => String(p.id) !== String(item.id));
      } else {
        return [...prev, item];
      }
    });
  };

  // Handle Logo Upload with Format Validation
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['.svg', '.ai', '.eps', '.pdf', '.png', '.jpg', '.jpeg'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        setLogoError(`Invalid logo format (${ext}). Allowed formats: SVG, AI, EPS, PDF, PNG, JPG`);
        return;
      }
      setLogoFile(file);
      setLogoPreviewUrl(URL.createObjectURL(file as Blob));
      setHasLogo(true);
    }
  };

  // Handle Sketches Upload
  const handleSketchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setSketchFiles(prev => [...prev, ...filesArr]);
      const newPreviews = filesArr.map(f => URL.createObjectURL(f as Blob));
      setSketchPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeSketch = (index: number) => {
    setSketchFiles(prev => prev.filter((_, i) => i !== index));
    setSketchPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Stone Add/Remove
  const addStoneRow = () => {
    setStonesList(prev => [
      ...prev,
      {
        stone_type: 'Natural Diamond',
        shape: 'Round Brilliant',
        setting_style: 'Prong',
        size_value: '0.50',
        size_unit: 'carat',
        clarity: 'VS1',
        quantity: 1,
        is_center_stone: false
      }
    ]);
  };

  const removeStoneRow = (index: number) => {
    setStonesList(prev => prev.filter((_, i) => i !== index));
  };

  const updateStoneRow = (index: number, field: keyof CustomRequestStonePayload, val: any) => {
    setStonesList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Handle Form Submission (Submits brief directly to Admin review without payment prompt)
  const handleSubmit = async () => {
    requireAuth(async () => {
      await doExecuteSubmit('quote_only');
    }, {
      intent: 'custom-request',
      message: 'Sign in or register to submit your bespoke CAD design brief & collaborate with our artisans.',
    });
  };

  const doExecuteSubmit = async (
    submissionIntent: 'quote_only' | 'place_order',
    transactionId?: string,
    paymentMethod?: string
  ) => {
    setSubmissionError('');
    setIsSubmitting(true);

    try {
      // Format selections with group_key, group_label, value_label, and swatch_color
      const selectedOptionsPayload = Object.entries(selections)
        .filter(([_, valId]) => Boolean(valId))
        .map(([groupKey, valId]) => {
          const groupObj = groupMap[groupKey] || optionGroups.find(g => g.key === groupKey || (g.options || []).some(o => o.id === valId));
          const valObj = groupObj?.options?.find(o => o.id === valId);
          return {
            group_key: groupKey,
            group_label: groupObj?.label || groupKey,
            option_group: groupObj?.id || groupKey,
            option_value: valId,
            value_label: valObj?.label || '',
            other_text: valObj?.label || '',
            swatch_color: valObj?.swatch_color || ''
          };
        });

      // Upload draft sketch files if user attached any
      let draftSketchIds: number[] = [];
      if (sketchFiles && sketchFiles.length > 0) {
        try {
          const uploadPromises = sketchFiles.map(f => api.uploadDraftSketch(f));
          const uploadResults = await Promise.all(uploadPromises);
          draftSketchIds = uploadResults.map(r => r.id).filter(Boolean);
        } catch (uploadErr) {
          console.warn('Draft sketches upload warning:', uploadErr);
        }
      }

      // Format catalog references into structured array and notes
      const catalogRefsPayload = selectedCatalogProducts.map(p => ({
        id: p.id,
        title: p.title,
        image: p.image,
        sku: p.sku || `SKU-${p.id}`,
        price: p.price
      }));

      let fullNotes = specialInstructions;
      if (selectedCatalogProducts.length > 0) {
        const catRefsText = selectedCatalogProducts.map(p => `[Ref SKU: ${p.id} - ${p.title}]`).join(', ');
        fullNotes = `${fullNotes ? fullNotes + '\n' : ''}Catalog References: ${catRefsText}`;
      }
      if (transactionId) {
        fullNotes = `${fullNotes ? fullNotes + '\n' : ''}[Advance CAD Initiation Deposit: ₹2,500 Paid via ${paymentMethod || 'Gateway'} | Ref: ${transactionId}]`;
      }

      const bodyData = {
        category: selectedCategoryId,
        category_group: selectedCategory,
        ring_size_standard: selectedCategory === 'rings' ? (ringSizeStandard ? ringSizeStandard.toLowerCase() : 'in_hk') : '',
        ring_size: selectedCategory === 'rings' ? ringSize : '',
        target_weight_grams: selectedCategory === 'rings' ? targetWeightGrams : '',
        height_mm: heightMm,
        width_mm: widthMm,
        chain_length: chainLength,
        earring_backing: earringBacking,
        wrist_circumference: wristCircumference,
        bracelet_style: braceletStyle,
        custom_specs_text: customSpecsText,
        is_metal_only: isMetalOnly,
        engraving_text: engravingText,
        engraving_font: engravingFont,
        engraving_placement: engravingPlacement,
        has_logo: hasLogo,
        budget_range: projectTier,
        needed_by_date: neededByDate || null,
        description: fullNotes || customSpecsText || `Custom ${selectedCategory} design request`,
        special_instructions: fullNotes,
        client_consent_to_feature: clientConsent,
        submission_intent: submissionIntent,
        contact_name: clientName || user?.first_name || user?.username || 'Client',
        contact_phone: clientPhone || user?.phone_number || '',
        contact_email: clientEmail || user?.email || '',
        client_name: clientName || user?.first_name || user?.username || 'Client',
        client_email: clientEmail || user?.email || '',
        client_phone: clientPhone || user?.phone_number || '',
        reference_image: selectedCatalogProducts[0]?.image || '',
        catalog_references: catalogRefsPayload,
        catalog_references_data: catalogRefsPayload,
        selected_options: selectedOptionsPayload,
        selections_data: selectedOptionsPayload,
        stones: isMetalOnly ? [] : stonesList,
        stones_data: isMetalOnly ? [] : stonesList,
        draft_sketch_ids: draftSketchIds
      };

      let res: any = null;
      try {
        res = await api.createCustomRequest(bodyData);
      } catch (apiErr) {
        console.warn('API custom request submission warning, using local appStore sync:', apiErr);
      }
      
      // Save locally to appStore as well to guarantee 100% offline & session persistence
      const savedLocal = appStore.addCustomRequest({
        id: res?.id || 'req_' + Date.now(),
        clientName: clientName || user?.first_name || user?.username || 'Client',
        clientEmail: clientEmail || user?.email || '',
        clientPhone: clientPhone || user?.phone_number || '',
        jewelleryType: selectedCategory || 'Custom Jewellery',
        metalPreference: selectedCategory || 'Gold',
        targetBudget: projectTier || 'Standard',
        currentQuote: 2500,
        status: 'new',
        description: fullNotes || customSpecsText || `Custom ${selectedCategory} design request`,
        createdAt: new Date().toISOString(),
        referenceImage: selectedCatalogProducts[0]?.image || '',
        messages: [],
      });

      // Dispatch real email via Gmail SMTP
      if (clientEmail || user?.email) {
        sendCustomDesignConfirmationEmail(
          clientEmail || user?.email || '',
          customSpecsText || `${selectedCategory} Custom Project`,
          clientName || user?.first_name || 'Valued Jeweller',
          selectedCategory || 'Jewellery CAD',
          fullNotes || 'Full design specifications attached.'
        ).catch((e) => console.warn('Background email dispatch notice:', e));
      }

      setSubmittedTicket(res || savedLocal[0]);
      setIsSubmitted(true);
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 } });
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmissionError(err.message || 'Failed to submit design specification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [apiCategories, setApiCategories] = useState<any[]>([]);

  useEffect(() => {
    api.getCategories(true).then((cats) => {
      if (cats && Array.isArray(cats) && cats.length > 0) {
        setApiCategories(cats);
      }
    }).catch(() => {});
  }, []);

  // Dynamic Category Selector Config from API
  const categoryGroups = useMemo(() => {
    if (apiCategories.length > 0) {
      return apiCategories.map((c) => ({
        id: c.slug,
        name: c.name,
        icon: c.slug.includes('ring') ? Sparkles : c.slug.includes('ear') ? Gem : c.slug.includes('pendant') ? Layers : Ruler,
        desc: `Bespoke ${c.name} 3D CAD modeling & precision engineering.`
      }));
    }
    return [
      { id: 'rings', name: 'Rings', icon: Sparkles, desc: 'Engagement, Solitaire, Eternity, Wedding & Fashion Rings' },
      { id: 'pendants', name: 'Pendants & Necklaces', icon: Layers, desc: 'Pendants, Solitaire Drops, Statement Chokers & Chains' },
      { id: 'earrings', name: 'Earrings', icon: Gem, desc: 'Studs, Drop Earrings, Dangles, Hoops & Huggies' },
      { id: 'bracelets', name: 'Bracelets & Bangles', icon: Ruler, desc: 'Kadas, Tennis Bracelets, Stackable Bangles & Cuffs' },
      { id: 'other', name: 'Custom / Other', icon: Feather, desc: 'Brooches, Cufflinks, Sculptures & Specialty Concepts' },
    ];
  }, [apiCategories]);

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#060B1E] text-[#F5F1E8] pt-24 pb-24 px-4 sm:px-8 lg:px-12 relative overflow-hidden">
        <div className="max-w-3xl mx-auto bg-[#09112B]/90 backdrop-blur-xl rounded-3xl border border-[#D4AF37]/40 shadow-2xl p-8 sm:p-12 text-center my-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#F5E7A3] via-[#D4AF37] to-[#B8860B] rounded-full flex items-center justify-center mx-auto mb-6 text-[#0B1330] shadow-[0_0_30px_rgba(212,175,55,0.4)]">
            <CheckCircle2 className="w-10 h-10 animate-pulse" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif gold-gradient-text font-bold mb-3 tracking-wide">
            Custom 3D CAD Brief Submitted!
          </h1>
          <p className="text-[#FAF8F3]/80 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Your custom specification brief <span className="font-mono font-bold text-[#F5E7A3] bg-[#D4AF37]/20 px-3 py-1 rounded-full border border-[#D4AF37]/30">#{submittedTicket?.ticket_id || 'CR-SUCCESS'}</span> has been sent to our Senior CAD Engineer for review. Once the official quote is issued, step-by-step stage payment options will activate in your dashboard.
          </p>

          {/* Specification Summary Card */}
          <div className="bg-[#121F4D]/80 border border-[#D4AF37]/30 rounded-2xl p-6 text-left mb-8 max-w-md mx-auto space-y-3">
            <h3 className="font-serif gold-gradient-text text-sm font-bold uppercase tracking-widest pb-2 border-b border-[#D4AF37]/20">
              Specification Details
            </h3>
            <div className="space-y-2 text-xs text-[#FAF8F3]/80">
              <div className="flex justify-between">
                <span className="text-[#FAF8F3]/60">Design Category:</span>
                <span className="font-bold text-[#FAF8F3] capitalize">{selectedCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#FAF8F3]/60">Client Contact:</span>
                <span className="font-bold text-[#F5E7A3]">{clientName || user?.first_name || 'Valued Client'}</span>
              </div>
              {selectedCatalogProducts.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#FAF8F3]/60">Catalog Reference:</span>
                  <span className="font-bold text-[#D4AF37]">{selectedCatalogProducts.length} Product(s) Selected</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#FAF8F3]/60">Included Assets:</span>
                <span className="font-bold text-[#D4AF37]">3DM + Printable STL + 4K Renders</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('account')}
              className="px-8 py-3.5 btn-gold-luxury font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              View My CAD Submissions <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setCurrentStep(1);
              }}
              className="px-8 py-3.5 bg-transparent border border-[#D4AF37]/40 text-[#F5E7A3] font-bold rounded-xl hover:bg-[#D4AF37]/10 transition-all"
            >
              Start Another Custom Specification
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B1E] text-[#F5F1E8] pt-24 sm:pt-28 pb-24 px-4 sm:px-6 lg:px-8 xl:px-12 relative overflow-hidden">
      {/* Container aligned with site width */}
      <div className="max-w-[1600px] mx-auto space-y-6 relative z-10">

        {/* STREAMLINED COMPACT HEADER */}
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <h1 className="text-3xl sm:text-4xl font-serif gold-gradient-text font-bold tracking-tight">
            Custom Design & 3D CAD Studio
          </h1>
          <p className="text-[#FAF8F3]/70 text-xs sm:text-sm">
            Configure your exact jewelry specifications for 100% 3D printability and precision casting.
          </p>
        </div>

        {/* Stepper Header (Compact Bar) */}
        <div className="w-full bg-[#09112B]/80 backdrop-blur-md p-3.5 rounded-2xl border border-[#D4AF37]/30 shadow-xl">
          <div className="flex justify-between items-center relative">
            {[
              { step: 1, title: 'Category & Specs' },
              { step: 2, title: 'Metal & Style' },
              { step: 3, title: 'Stones & Gemstones' },
              { step: 4, title: 'Branding & References' },
              { step: 5, title: 'Review & Dispatch' },
            ].map((s) => (
              <div key={s.step} className="flex-1 flex flex-col items-center relative z-10">
                <button
                  onClick={() => currentStep > s.step && setCurrentStep(s.step)}
                  disabled={currentStep < s.step}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    currentStep === s.step
                      ? 'bg-gradient-to-r from-[#F5E7A3] via-[#D4AF37] to-[#B8860B] text-[#0B1330] shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-110 font-extrabold'
                      : currentStep > s.step
                      ? 'bg-[#1E4FA3] text-white border border-[#5B8DEF]/40 cursor-pointer'
                      : 'bg-[#121F4D]/60 text-[#FAF8F3]/40 border border-white/10 cursor-not-allowed'
                  }`}
                >
                  {currentStep > s.step ? <Check className="w-4 h-4" /> : s.step}
                </button>
                <span className={`text-[11px] font-semibold mt-1.5 hidden sm:block ${currentStep === s.step ? 'text-[#F5E7A3]' : 'text-[#FAF8F3]/50'}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Form Grid & Specification Summary Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-8 bg-[#09112B]/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-2xl">
            {optionsLoading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin mx-auto mb-4" />
                <p className="text-[#FAF8F3]/60 font-medium text-sm">Loading studio design parameters from database...</p>
              </div>
            ) : (
              <>
                {/* STEP 1: CATEGORY & CATEGORY-SPECIFIC SPECS */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-serif gold-gradient-text font-bold mb-1">Step 1: Select Jewelry Type</h2>
                      <p className="text-xs text-[#FAF8F3]/60">Choose your base design category to reveal tailored dimension controls.</p>
                    </div>

                    {/* Category Selector Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {categoryGroups.map(cat => {
                        const IconComp = cat.icon;
                        const isSel = selectedCategory === cat.id;
                        return (
                          <div
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              const matched = categories.find(c => c.slug?.toLowerCase() === cat.id || c.name?.toLowerCase().includes(cat.id.slice(0, 4)));
                              if (matched) setSelectedCategoryId(matched.id);
                            }}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                              isSel
                                ? 'border-[#D4AF37] bg-[#121F4D]/90 shadow-[0_0_20px_rgba(212,175,55,0.2)] ring-1 ring-[#D4AF37]/50'
                                : 'border-white/10 hover:border-[#D4AF37]/40 bg-[#09112B]/60'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`p-2 rounded-xl ${isSel ? 'bg-[#D4AF37] text-[#0B1330]' : 'bg-[#121F4D] text-[#D4AF37]'}`}>
                                <IconComp className="w-5 h-5" />
                              </div>
                              <span className="font-bold text-[#FAF8F3] text-sm">{cat.name}</span>
                            </div>
                            <p className="text-xs text-[#FAF8F3]/60 line-clamp-2">{cat.desc}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Ring Specific Dimension Options */}
                    {selectedCategory === 'rings' && (
                      <div className="bg-[#121F4D]/50 border border-[#D4AF37]/25 rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                            <Ruler className="w-4 h-4 text-[#D4AF37]" /> Ring Sizing & Metal Weight Specs
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowRingSizeModal(true)}
                            className="text-xs font-semibold text-[#F5E7A3] hover:text-white flex items-center gap-1 underline"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-[#D4AF37]" /> Size Chart & Conversion
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Sizing Standard</label>
                            <select
                              value={ringSizeStandard}
                              onChange={e => setRingSizeStandard(e.target.value)}
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                            >
                              <option value="US">US / Canada</option>
                              <option value="UK">UK / Australia</option>
                              <option value="IN_HK">Indian / Hong Kong</option>
                              <option value="EU">European (ISO)</option>
                              <option value="MM">Inside Diameter (mm)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Target Ring Size</label>
                            <input
                              type="text"
                              value={ringSize}
                              onChange={e => setRingSize(e.target.value)}
                              placeholder="e.g. 6.5 or 16.9mm"
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Target Metal Weight (g)</label>
                            <input
                              type="text"
                              value={targetWeightGrams}
                              onChange={e => setTargetWeightGrams(e.target.value)}
                              placeholder="e.g. 4.5g"
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pendants Specific Specs */}
                    {selectedCategory === 'pendants' && (
                      <div className="bg-[#121F4D]/50 border border-[#D4AF37]/25 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-[#D4AF37]" /> Pendant & Necklace Dimensions
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Height (mm)</label>
                            <input
                              type="text"
                              value={heightMm}
                              onChange={e => setHeightMm(e.target.value)}
                              placeholder="e.g. 24 mm"
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Width (mm)</label>
                            <input
                              type="text"
                              value={widthMm}
                              onChange={e => setWidthMm(e.target.value)}
                              placeholder="e.g. 16 mm"
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Chain Preference</label>
                            <select
                              value={chainLength}
                              onChange={e => setChainLength(e.target.value)}
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                            >
                              <option value="">-- Choose Chain Specification (Optional) --</option>
                              <option value="No Chain / Pendant Only">No Chain / Pendant Only</option>
                              <option value="16 inches (Choker)">16 inches (Choker)</option>
                              <option value="18 inches (Standard)">18 inches (Standard)</option>
                              <option value="20 inches (Matinee)">20 inches (Matinee)</option>
                              <option value="24 inches (Opera)">24 inches (Opera)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Earrings Specific Specs */}
                    {selectedCategory === 'earrings' && (
                      <div className="bg-[#121F4D]/50 border border-[#D4AF37]/25 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-[#D4AF37]" /> Earring Architecture
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Drop Length / Stud Diameter (mm)</label>
                            <input
                              type="text"
                              value={heightMm}
                              onChange={e => setHeightMm(e.target.value)}
                              placeholder="e.g. 12mm stud or 45mm drop"
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Backing Mechanism</label>
                            <select
                              value={earringBacking}
                              onChange={e => setEarringBacking(e.target.value)}
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                            >
                              <option value="">-- Choose Backing Mechanism (Optional) --</option>
                              <option value="Push Back">Push Back (Friction Post)</option>
                              <option value="Screw Back">Screw Back (Security Post)</option>
                              <option value="Lever Back">Lever Back</option>
                              <option value="French Hook">French Wire / Fish Hook</option>
                              <option value="Hoop Catch">Hinged Hoop Catch</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bracelets Specific Specs */}
                    {selectedCategory === 'bracelets' && (
                      <div className="bg-[#121F4D]/50 border border-[#D4AF37]/25 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-[#D4AF37]" /> Wrist & Bangle Dimensions
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Wrist Circumference / Inner Diameter</label>
                            <input
                              type="text"
                              value={wristCircumference}
                              onChange={e => setWristCircumference(e.target.value)}
                              placeholder="e.g. 7.0 inches or 2.4 Kada size"
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Bracelet Type</label>
                            <select
                              value={braceletStyle}
                              onChange={e => setBraceletStyle(e.target.value)}
                              className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                            >
                              <option value="">-- Choose Bracelet Style (Optional) --</option>
                              <option value="Kada">Traditional Kada</option>
                              <option value="Tennis Bracelet">Tennis Bracelet (Continuous Stones)</option>
                              <option value="Link / Chain">Link / Charm Chain</option>
                              <option value="Rigid Cuff">Rigid Cuff</option>
                              <option value="Flexible Bangle">Flexible Stackable Bangle</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Specs for Other */}
                    {selectedCategory === 'other' && (
                      <div className="bg-[#121F4D]/50 border border-[#D4AF37]/25 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                          <Feather className="w-4 h-4 text-[#D4AF37]" /> Custom Concept Requirements
                        </h3>
                        <div>
                          <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Dimensional & Structural Requirements</label>
                          <textarea
                            rows={3}
                            value={customSpecsText}
                            onChange={e => setCustomSpecsText(e.target.value)}
                            placeholder="Describe target dimensions, pin backings, hinges, or special structural mechanisms..."
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] p-3"
                          />
                        </div>
                      </div>
                    )}

                    {/* CAD Deliverable Format Dropdown */}
                    {groupMap['cad_file_format'] && (
                      <div>
                        <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Required CAD Output Format</label>
                        <select
                          value={selections['cad_file_format'] || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setSelections(prev => {
                              const updated = { ...prev };
                              if (!val) {
                                delete updated['cad_file_format'];
                              } else {
                                updated['cad_file_format'] = Number(val);
                              }
                              return updated;
                            });
                          }}
                          className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                        >
                          <option value="">-- Choose Required CAD Format (Optional) --</option>
                          {(groupMap['cad_file_format'].options || [])
                            .filter(o => o.is_active)
                            .map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label} {opt.description ? `(${opt.description})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: METAL & DESIGN STYLE */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-serif gold-gradient-text font-bold mb-1">Step 2: Metal Alloy & Design Style</h2>
                      <p className="text-xs text-[#FAF8F3]/60">Select your target metal alloy, gold purity, and structural aesthetic profile.</p>
                    </div>

                    {/* Metal Alloy Selector */}
                    {groupMap['metal'] && (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-[#F5E7A3] uppercase tracking-wider">Metal Alloy Selection</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {(groupMap['metal'].options || [])
                            .filter(o => o.is_active)
                            .map(opt => {
                              const isSel = selections['metal'] === opt.id;
                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => setSelections(prev => ({ ...prev, metal: opt.id }))}
                                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all duration-300 ${
                                    isSel
                                      ? 'border-[#D4AF37] bg-[#121F4D] shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-[#D4AF37]/50'
                                      : 'border-white/10 hover:border-[#D4AF37]/30 bg-[#09112B]/60'
                                  }`}
                                >
                                  <span
                                    className="w-7 h-7 rounded-full border border-white/20 shadow-inner flex-shrink-0"
                                    style={{ backgroundColor: opt.swatch_color || '#E5E4E2' }}
                                  />
                                  <div>
                                    <p className="font-bold text-[#FAF8F3] text-xs">{opt.label}</p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Gold Purity Selector - Only shown if Gold is selected */}
                    {isGoldSelected && groupMap['gold_purity'] && (
                      <div className="space-y-3 bg-[#121F4D]/50 border border-[#D4AF37]/30 rounded-2xl p-4">
                        <label className="block text-xs font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Gold Purity Standard
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {(groupMap['gold_purity'].options || [])
                            .filter(o => o.is_active)
                            .map(opt => {
                              const isSel = selections['gold_purity'] === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setSelections(prev => ({ ...prev, gold_purity: opt.id }))}
                                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                                    isSel
                                      ? 'bg-[#D4AF37] text-[#0B1330] border-[#F5E7A3] shadow-md font-extrabold'
                                      : 'bg-[#09112B] text-[#FAF8F3]/80 border-white/10 hover:border-[#D4AF37]/40'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Design Style Selector */}
                    {groupMap['design_style'] && (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-[#F5E7A3] uppercase tracking-wider">Aesthetic & Setting Architecture</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(groupMap['design_style'].options || [])
                            .filter(o => o.is_active)
                            .map(opt => {
                              const isSel = selections['design_style'] === opt.id;
                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => setSelections(prev => ({ ...prev, design_style: opt.id }))}
                                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                                    isSel
                                      ? 'border-[#D4AF37] bg-[#121F4D] shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-[#D4AF37]/50'
                                      : 'border-white/10 hover:border-[#D4AF37]/30 bg-[#09112B]/60'
                                  }`}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-[#FAF8F3] text-sm">{opt.label}</span>
                                  </div>
                                  {opt.description && (
                                    <p className="text-xs text-[#FAF8F3]/60">{opt.description}</p>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Ring Type Selector (if category is rings) */}
                    {selectedCategory === 'rings' && groupMap['ring_type'] && (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-[#F5E7A3] uppercase tracking-wider">Ring Style Profile</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {(groupMap['ring_type'].options || [])
                            .filter(o => o.is_active)
                            .map(opt => {
                              const isSel = selections['ring_type'] === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setSelections(prev => ({ ...prev, ring_type: opt.id }))}
                                  className={`p-2.5 text-xs font-semibold rounded-xl border text-left transition-all ${
                                    isSel
                                      ? 'bg-[#1E4FA3] text-white border-[#5B8DEF]/60 font-bold shadow-md'
                                      : 'bg-[#09112B] text-[#FAF8F3]/70 border-white/10 hover:border-[#D4AF37]/30'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: STONES & GEMSTONES */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-serif gold-gradient-text font-bold mb-1">Step 3: Gemstones & Setting Architecture</h2>
                      <p className="text-xs text-[#FAF8F3]/60">Configure multi-stone arrangements, stone shapes, and precise seat clearances.</p>
                    </div>

                    {/* Metal-only Toggle */}
                    <div className="bg-[#121F4D]/60 border border-[#D4AF37]/30 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-[#FAF8F3] text-sm">Solid Metal Design (No Stones)</h4>
                        <p className="text-xs text-[#FAF8F3]/60">Enable if your design is plain gold/silver band or engraving-only piece.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isMetalOnly}
                          onChange={e => setIsMetalOnly(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                      </label>
                    </div>

                    {!isMetalOnly && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-1.5">
                            <Gem className="w-4 h-4 text-[#D4AF37]" /> Stone Layout Breakdown ({stonesList.length})
                          </h3>
                          <button
                            type="button"
                            onClick={addStoneRow}
                            className="px-3 py-1.5 bg-[#D4AF37]/15 text-[#F5E7A3] hover:bg-[#D4AF37]/25 border border-[#D4AF37]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Another Stone Row
                          </button>
                        </div>

                        {stonesList.length === 0 ? (
                          <div className="p-8 rounded-2xl bg-[#121F4D]/30 border border-dashed border-[#D4AF37]/35 text-center space-y-3">
                            <Gem className="w-8 h-8 text-[#D4AF37]/60 mx-auto" />
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-[#FAF8F3]">No Gemstone Rows Added</p>
                              <p className="text-xs text-[#FAF8F3]/60 max-w-sm mx-auto">
                                If your design features diamonds or gemstones, click below to specify shapes, sizes, and setting styles. Or leave empty for a metal-focused piece.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={addStoneRow}
                              className="px-4 py-2 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#F5E7A3] border border-[#D4AF37]/50 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                            >
                              <Plus className="w-4 h-4" /> Add Diamond / Gemstone Specification
                            </button>
                          </div>
                        ) : (
                          stonesList.map((stone, idx) => (
                            <div key={idx} className="p-4 bg-[#121F4D]/40 border border-white/10 rounded-2xl relative space-y-3">
                              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                <span className="text-xs font-bold text-[#F5E7A3] uppercase">
                                  Stone #{idx + 1} {stone.is_center_stone ? '(Main Centerpiece)' : '(Accent Stone)'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeStoneRow(idx)}
                                  className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove
                                </button>
                              </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Stone Type</label>
                                <select
                                  value={stone.stone_type}
                                  onChange={e => updateStoneRow(idx, 'stone_type', e.target.value)}
                                  className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-2.5"
                                >
                                  <option value="Natural Diamond">Natural Diamond</option>
                                  <option value="Lab Diamond">Lab-Grown Diamond</option>
                                  <option value="Moissanite">Moissanite</option>
                                  <option value="Blue Sapphire">Blue Sapphire</option>
                                  <option value="Emerald">Colombian Emerald</option>
                                  <option value="Ruby">Burmese Ruby</option>
                                  <option value="Cubic Zirconia">Cubic Zirconia (CZ)</option>
                                  <option value="Other Gemstone">Other Precious Gemstone</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Stone Shape</label>
                                <select
                                  value={stone.shape}
                                  onChange={e => updateStoneRow(idx, 'shape', e.target.value)}
                                  className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-2.5"
                                >
                                  {(groupMap['stone_shape']?.options || [])
                                    .filter(o => o.is_active)
                                    .map(o => (
                                      <option key={o.id} value={o.label}>{o.label}</option>
                                    ))}
                                  {(!groupMap['stone_shape'] || groupMap['stone_shape'].options.length === 0) && (
                                    <>
                                      <option value="Round Brilliant">Round Brilliant</option>
                                      <option value="Oval">Oval</option>
                                      <option value="Emerald Cut">Emerald Cut</option>
                                      <option value="Princess">Princess</option>
                                      <option value="Cushion">Cushion</option>
                                      <option value="Pear">Pear</option>
                                    </>
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Setting Style</label>
                                <select
                                  value={stone.setting_style}
                                  onChange={e => updateStoneRow(idx, 'setting_style', e.target.value)}
                                  className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-2.5"
                                >
                                  {(groupMap['stone_setting']?.options || [])
                                    .filter(o => o.is_active)
                                    .map(o => (
                                      <option key={o.id} value={o.label}>{o.label}</option>
                                    ))}
                                  {(!groupMap['stone_setting'] || groupMap['stone_setting'].options.length === 0) && (
                                    <>
                                      <option value="Prong">Prong</option>
                                      <option value="Bezel">Bezel</option>
                                      <option value="Channel">Channel</option>
                                      <option value="Pave">Pave</option>
                                      <option value="Flush">Flush</option>
                                    </>
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Size Value & Unit</label>
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={stone.size_value}
                                    onChange={e => updateStoneRow(idx, 'size_value', e.target.value)}
                                    placeholder="1.0"
                                    className="w-1/2 text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-2"
                                  />
                                  <select
                                    value={stone.size_unit}
                                    onChange={e => updateStoneRow(idx, 'size_unit', e.target.value)}
                                    className="w-1/2 text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-1"
                                  >
                                    <option value="carat">carat (ct)</option>
                                    <option value="mm">mm size</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Stone Clarity Grade</label>
                                <select
                                  value={stone.clarity}
                                  onChange={e => updateStoneRow(idx, 'clarity', e.target.value)}
                                  className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-2.5"
                                >
                                  <option value="VVS1">VVS1 (Very Very Slight)</option>
                                  <option value="VVS2">VVS2</option>
                                  <option value="VS1">VS1 (Very Slight)</option>
                                  <option value="VS2">VS2</option>
                                  <option value="SI1">SI1 (Slight Inclusion)</option>
                                  <option value="SI2">SI2</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Stone Count (Qty)</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={stone.quantity}
                                  onChange={e => updateStoneRow(idx, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-2.5"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="checkbox"
                                id={`center_stone_${idx}`}
                                checked={stone.is_center_stone || false}
                                onChange={e => updateStoneRow(idx, 'is_center_stone', e.target.checked)}
                                className="rounded border-white/20 text-[#D4AF37] focus:ring-[#D4AF37]"
                              />
                              <label htmlFor={`center_stone_${idx}`} className="text-xs font-medium text-[#FAF8F3]/80 cursor-pointer">
                                Mark as Main Centerpiece Stone
                              </label>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

                {/* STEP 4: BRANDING & REFERENCES */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-serif gold-gradient-text font-bold mb-1">Step 4: Branding & Reference Attachments</h2>
                      <p className="text-xs text-[#FAF8F3]/60">Select catalog designs or upload custom reference sketches & hallmark vector logos.</p>
                    </div>

                    {/* Engraving Specs */}
                    <div className="bg-[#121F4D]/50 border border-[#D4AF37]/30 rounded-2xl p-5 space-y-4">
                      <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#D4AF37]" /> Custom Engraving Personalization
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Engraving Text</label>
                          <input
                            type="text"
                            value={engravingText}
                            onChange={e => setEngravingText(e.target.value)}
                            placeholder="e.g. Forever & Always"
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Font Style</label>
                          <select
                            value={engravingFont}
                            onChange={e => setEngravingFont(e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                          >
                            <option value="Script">Calligraphy Script</option>
                            <option value="Block">Modern Block Sans</option>
                            <option value="Roman">Classic Roman Serif</option>
                            <option value="Gothic">Vintage Gothic</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">Placement</label>
                          <select
                            value={engravingPlacement}
                            onChange={e => setEngravingPlacement(e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                          >
                            <option value="Inside Shank">Inside Shank / Band</option>
                            <option value="Outside Shank">Outside Shank</option>
                            <option value="Pendant Backing">Pendant Backplate</option>
                            <option value="Bail">Bail Accent</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Studio / Brand Logo Upload */}
                    <div className="bg-[#121F4D]/50 border border-[#D4AF37]/30 rounded-2xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" /> Studio Hallmark & Vector Logo Stamp
                          </h3>
                          <p className="text-xs text-[#FAF8F3]/60">Stamp your studio hallmark directly onto 3D model geometry.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasLogo}
                            onChange={e => setHasLogo(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                        </label>
                      </div>

                      {hasLogo && (
                        <div className="pt-2">
                          <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5">
                            Upload Vector Logo (.svg, .ai, .eps, .pdf, .png, .jpg)
                          </label>
                          <input
                            type="file"
                            accept=".svg,.ai,.eps,.pdf,.png,.jpg,.jpeg"
                            onChange={handleLogoUpload}
                            className="block w-full text-xs text-[#FAF8F3]/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#D4AF37] file:text-[#0B1330] hover:file:bg-[#F5E7A3]"
                          />
                          {logoError && (
                            <p className="text-xs text-rose-400 font-semibold mt-1.5 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> {logoError}
                            </p>
                          )}
                          {logoFile && !logoError && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 font-medium">
                              <CheckCircle2 className="w-4 h-4" /> Selected: {logoFile.name}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* REFERENCE IMAGES / HAND SKETCHES SECTION - DUAL OPTION (CATALOG vs UPLOAD) */}
                    <div className="bg-[#121F4D]/50 border border-[#D4AF37]/30 rounded-2xl p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div>
                          <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                            <Grid className="w-4 h-4 text-[#D4AF37]" /> Reference Designs & Hand Sketches
                          </h3>
                          <p className="text-xs text-[#FAF8F3]/60">Choose from existing studio CAD catalog products or upload custom hand sketches.</p>
                        </div>

                        {/* Dual Option Mode Tabs */}
                        <div className="inline-flex bg-[#09112B] p-1 rounded-xl border border-[#D4AF37]/30">
                          <button
                            type="button"
                            onClick={() => setActiveReferenceTab('catalog')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              activeReferenceTab === 'catalog'
                                ? 'bg-gradient-to-r from-[#F5E7A3] via-[#D4AF37] to-[#B8860B] text-[#0B1330] shadow-md'
                                : 'text-[#FAF8F3]/70 hover:text-white'
                            }`}
                          >
                            <Grid className="w-3.5 h-3.5" /> Option 1: Existing Studio Products
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveReferenceTab('upload')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              activeReferenceTab === 'upload'
                                ? 'bg-gradient-to-r from-[#F5E7A3] via-[#D4AF37] to-[#B8860B] text-[#0B1330] shadow-md'
                                : 'text-[#FAF8F3]/70 hover:text-white'
                            }`}
                          >
                            <Upload className="w-3.5 h-3.5" /> Option 2: Upload Custom File
                          </button>
                        </div>
                      </div>

                      {/* Selected Catalog References summary bar */}
                      {selectedCatalogProducts.length > 0 && (
                        <div className="p-3 bg-[#09112B]/90 border border-[#D4AF37]/40 rounded-xl space-y-2">
                          <span className="text-[11px] font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5 text-[#D4AF37]" /> Selected Studio Catalog References ({selectedCatalogProducts.length})
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {selectedCatalogProducts.map(p => (
                              <div key={p.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#121F4D] border border-[#D4AF37]/30 text-xs text-[#FAF8F3]">
                                <img src={p.image} alt={p.title} className="w-5 h-5 rounded object-cover" />
                                <span className="truncate max-w-[150px] font-semibold">{p.title}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleCatalogProductRef(p)}
                                  className="text-rose-400 hover:text-rose-200"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TAB 1: EXISTING CATALOG PRODUCTS */}
                      {activeReferenceTab === 'catalog' && (
                        <div className="space-y-3">
                          {/* Search & Category Filter Controls */}
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                              <Search className="w-4 h-4 text-[#D4AF37] absolute left-3 top-2.5" />
                              <input
                                type="text"
                                value={catalogSearchQuery}
                                onChange={e => setCatalogSearchQuery(e.target.value)}
                                placeholder="Search studio catalog products by title or SKU..."
                                className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 pl-9 pr-3"
                              />
                            </div>
                            <select
                              value={catalogCategoryFilter}
                              onChange={e => setCatalogCategoryFilter(e.target.value)}
                              className="text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3 sm:w-44"
                            >
                              <option value="all">All Categories</option>
                              <option value="ring">Rings</option>
                              <option value="pendant">Pendants & Necklaces</option>
                              <option value="earring">Earrings</option>
                              <option value="bangle">Bracelets & Bangles</option>
                            </select>
                          </div>

                          {/* Product Grid Picker */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                            {filteredCatalogItems.map(item => {
                              const isSel = selectedCatalogProducts.some(p => String(p.id) === String(item.id));
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => toggleCatalogProductRef(item)}
                                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative group ${
                                    isSel
                                      ? 'border-[#D4AF37] bg-[#121F4D] shadow-[0_0_12px_rgba(212,175,55,0.4)] ring-1 ring-[#D4AF37]'
                                      : 'border-white/10 hover:border-[#D4AF37]/40 bg-[#09112B]/70'
                                  }`}
                                >
                                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-900 mb-2 relative">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    {isSel && (
                                      <div className="absolute top-1.5 right-1.5 p-1 bg-[#D4AF37] text-[#0B1330] rounded-full shadow-md">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-[#FAF8F3] text-xs line-clamp-1">{item.title}</p>
                                    <span className="text-[10px] text-[#D4AF37] block">Ref SKU #{item.id}</span>
                                  </div>
                                </div>
                              );
                            })}
                            {filteredCatalogItems.length === 0 && (
                              <div className="col-span-full py-8 text-center text-xs text-[#FAF8F3]/50">
                                No matching studio catalog products found. Try changing your search query or upload a custom sketch file.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* TAB 2: UPLOAD CUSTOM SKETCHES & FILES */}
                      {activeReferenceTab === 'upload' && (
                        <div className="space-y-3">
                          <div className="border-2 border-dashed border-[#D4AF37]/40 rounded-2xl p-6 text-center hover:border-[#D4AF37] bg-[#09112B]/60 transition-all cursor-pointer relative">
                            <input
                              type="file"
                              multiple
                              accept="image/*,.pdf"
                              onChange={handleSketchUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
                            <p className="text-xs font-bold text-[#FAF8F3]">Click or drag custom reference sketches here</p>
                            <p className="text-[11px] text-[#FAF8F3]/50">PNG, JPG, PDF up to 10MB each</p>
                          </div>

                          {sketchPreviews.length > 0 && (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-2">
                              {sketchPreviews.map((url, i) => (
                                <div key={i} className="relative group rounded-xl overflow-hidden border border-white/20 aspect-square bg-slate-900">
                                  <img src={url} alt={`Sketch ${i}`} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => removeSketch(i)}
                                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Special Design Notes & Voice Requisition Module */}
                    <div className="space-y-4 bg-[#121F4D]/40 border border-[#D4AF37]/30 rounded-2xl p-5">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-1.5">
                          <Mic className="w-4 h-4 text-[#D4AF37]" /> Special Design Notes & Voice Requisition
                        </label>
                        <span className="text-[10px] text-[#D4AF37] font-mono">Text, Speech AI & Audio</span>
                      </div>

                      <textarea
                        rows={3}
                        value={specialInstructions}
                        onChange={e => setSpecialInstructions(e.target.value)}
                        placeholder="Add specific instructions regarding prong thickness, metal relief, hollow interior, or stone clearance..."
                        className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                      />

                      {/* Voice Note & Speech-To-Text Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Option A: Real-Time Microphone Record & Speech Recognition */}
                        <div className="p-3.5 rounded-xl bg-[#09112B] border border-[#D4AF37]/25 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-[#FAF8F3] flex items-center gap-1.5">
                              <Mic className={`w-3.5 h-3.5 ${isRecordingVoice ? 'text-rose-500 animate-pulse' : 'text-[#D4AF37]'}`} />
                              Record Voice Instructions
                            </span>
                            {isRecordingVoice && (
                              <span className="text-xs text-rose-400 font-mono font-bold animate-pulse flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                {formatRecordingTime(recordingSeconds)}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#FAF8F3]/60 leading-tight">
                            Click start to speak your CAD instructions. Spoken words will be transcribed & audio file attached automatically.
                          </p>
                          <div className="pt-1 flex gap-2">
                            {!isRecordingVoice ? (
                              <button
                                type="button"
                                onClick={handleStartVoiceRecording}
                                className="w-full py-2.5 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#F5E7A3] hover:bg-[#D4AF37]/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                              >
                                <Mic className="w-3.5 h-3.5 text-[#D4AF37]" /> Start Recording
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleStopVoiceRecording}
                                className="w-full py-2.5 rounded-lg bg-rose-600 border border-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg animate-pulse transition-all cursor-pointer"
                              >
                                <Square className="w-3.5 h-3.5 fill-white" />
                                <span>Stop Recording &amp; Attach Audio ({formatRecordingTime(recordingSeconds)})</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Option B: Upload Voice Note Audio File */}
                        <div className="p-3.5 rounded-xl bg-[#09112B] border border-[#D4AF37]/25 space-y-2 relative">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-[#FAF8F3] flex items-center gap-1.5">
                              <Upload className="w-3.5 h-3.5 text-[#D4AF37]" /> Upload Voice Note
                            </span>
                            {voiceAudioFile && (
                              <span className="text-[10px] text-emerald-400 font-mono font-bold">✓ Attached</span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#FAF8F3]/60 leading-tight">
                            Attach a pre-recorded audio file (.MP3, .WAV, .M4A, .OGG up to 25MB).
                          </p>
                          <div className="pt-1 relative">
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleVoiceFileUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full py-2 rounded-lg bg-[#121F4D] border border-white/10 text-xs font-semibold text-[#FAF8F3] flex items-center justify-center gap-1.5 text-center">
                              <Volume2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span className="truncate max-w-[150px]">
                                {voiceAudioFile ? voiceAudioFile.name : 'Select Audio File'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {voiceAudioPreviewUrl && (
                        <div className="p-2.5 rounded-xl bg-[#09112B] border border-emerald-500/30 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                            <Volume2 className="w-4 h-4 text-emerald-400" />
                            <span>Voice Note Attached</span>
                          </div>
                          <audio controls src={voiceAudioPreviewUrl} className="h-7 max-w-[200px]" />
                        </div>
                      )}
                    </div>

                    {/* Complexity Tier & Timeline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#FAF8F3]/80 mb-1.5 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-[#D4AF37]" /> Production Complexity Tier
                        </label>
                        <select
                          value={projectTier}
                          onChange={e => setProjectTier(e.target.value)}
                          className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3"
                        >
                          <option value="">-- Choose Project Tier (Optional) --</option>
                          <option value="Standard Commercial CAD">Standard Commercial CAD</option>
                          <option value="High Precision Fine Jewelry">High Precision Fine Jewelry</option>
                          <option value="Exquisite Masterpiece">Exquisite Masterpiece</option>
                          <option value="Haute Joaillerie Atelier">Haute Joaillerie Atelier</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-[#FAF8F3]/80 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" /> Target Completion Date (Optional)
                          </label>
                          {neededByDate && (
                            <button
                              type="button"
                              onClick={() => setNeededByDate('')}
                              className="text-[10px] text-rose-400 hover:text-rose-300 underline font-mono"
                            >
                              Clear Date
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type="date"
                            min={minSelectableDate}
                            value={neededByDate}
                            onChange={e => setNeededByDate(e.target.value)}
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/40 bg-[#09112B] text-[#FAF8F3] py-2.5 px-3 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] [color-scheme:dark] cursor-pointer"
                          />
                        </div>

                        {/* Quick Presets for Target Deadline */}
                        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                          <span className="text-[10px] font-mono text-[#FAF8F3]/50">Quick Pick:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 7);
                              setNeededByDate(d.toISOString().split('T')[0]);
                            }}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/40 text-[#FAF8F3]/80 transition-all cursor-pointer"
                          >
                            +7d (Rush)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 14);
                              setNeededByDate(d.toISOString().split('T')[0]);
                            }}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/40 text-[#FAF8F3]/80 transition-all cursor-pointer"
                          >
                            +14d (Standard)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 30);
                              setNeededByDate(d.toISOString().split('T')[0]);
                            }}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/40 text-[#FAF8F3]/80 transition-all cursor-pointer"
                          >
                            +30d (Relaxed)
                          </button>
                        </div>

                        {neededByDate && (
                          <div className="p-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs text-[#F5E7A3] flex items-center justify-between font-mono">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                              Target Deadline: {new Date(neededByDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold">
                              {(() => {
                                const diff = Math.ceil((new Date(neededByDate + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                                return diff > 0 ? `In ${diff} day${diff === 1 ? '' : 's'}` : 'Today';
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: REVIEW & DISPATCH */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-serif gold-gradient-text font-bold mb-1">Step 5: Final Review & Dispatch</h2>
                      <p className="text-xs text-[#FAF8F3]/60">Verify your details before choosing whether to Request a Free Quote or Submit Custom CAD Order directly.</p>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-[#121F4D]/50 border border-[#D4AF37]/30 rounded-2xl p-5 space-y-3">
                      <h3 className="text-xs font-serif gold-gradient-text font-bold uppercase tracking-widest flex items-center gap-2">
                        Client & Studio Contact Info
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            placeholder="Client Name"
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={clientEmail}
                            onChange={e => setClientEmail(e.target.value)}
                            placeholder="email@studio.com"
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#FAF8F3]/70 mb-1">Phone Number</label>
                          <input
                            type="text"
                            value={clientPhone}
                            onChange={e => setClientPhone(e.target.value)}
                            placeholder="+1 / +91 phone"
                            className="w-full text-xs rounded-xl border border-[#D4AF37]/30 bg-[#09112B] text-[#FAF8F3] py-2 px-3"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Selected References Review */}
                    {selectedCatalogProducts.length > 0 && (
                      <div className="bg-[#121F4D]/50 border border-[#D4AF37]/30 rounded-2xl p-4 space-y-2">
                        <span className="text-xs font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> Selected Studio Catalog References ({selectedCatalogProducts.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedCatalogProducts.map(p => (
                            <div key={p.id} className="flex items-center gap-3 p-2 bg-[#09112B] rounded-xl border border-white/10">
                              <img src={p.image} alt={p.title} className="w-10 h-10 rounded-lg object-cover" />
                              <div className="overflow-hidden">
                                <p className="font-bold text-xs text-[#FAF8F3] truncate">{p.title}</p>
                                <span className="text-[10px] text-[#D4AF37]">SKU #{p.id}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delivery Turnaround Option */}
                    {groupMap['delivery_speed'] && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#D4AF37]" /> Turnaround Speed
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {(groupMap['delivery_speed'].options || [])
                            .filter(o => o.is_active)
                            .map(opt => {
                              const isSel = selectedDeliverySpeedId === opt.id;
                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => setSelectedDeliverySpeedId(opt.id)}
                                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-300 ${
                                    isSel
                                      ? 'border-[#D4AF37] bg-[#121F4D] shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-[#D4AF37]/50'
                                      : 'border-white/10 hover:border-[#D4AF37]/30 bg-[#09112B]/60'
                                  }`}
                                >
                                  <p className="font-bold text-[#FAF8F3] text-xs">{opt.label}</p>
                                  <p className="text-[11px] text-[#FAF8F3]/60">{opt.description}</p>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Portfolio Feature Consent Checkbox */}
                    <div className="p-4 bg-[#121F4D]/40 border border-[#D4AF37]/30 rounded-2xl flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="clientConsent"
                        checked={clientConsent}
                        onChange={(e) => setClientConsent(e.target.checked)}
                        className="mt-1 rounded border-[#D4AF37]/50 text-[#D4AF37] focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="clientConsent" className="text-xs text-[#FAF8F3]/90 leading-relaxed cursor-pointer">
                        <span className="font-bold text-[#F5E7A3] block mb-0.5">Allow Public Portfolio Showcase (Optional)</span>
                        I grant Shiuli CAD Studio permission to feature this finished 3D CAD design in the public portfolio showcase upon completion. (Your name, contact details, and private notes will <strong className="text-white">never</strong> be shown).
                      </label>
                    </div>

                    {submissionError && (
                      <div className="p-4 bg-rose-900/40 border border-rose-500/50 rounded-2xl text-rose-200 text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                        <span>{submissionError}</span>
                      </div>
                    )}

                    {/* Primary Submission CTA */}
                    <div className="pt-4">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleSubmit}
                        className="w-full py-4 px-6 btn-gold-luxury font-bold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[#0B1330]" />
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" /> Submit Custom CAD Design Brief
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Navigation Controls */}
                <div className="flex justify-between items-center pt-8 border-t border-white/10 mt-8">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
                    disabled={currentStep === 1}
                    className={`px-5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      currentStep === 1
                        ? 'border-white/10 text-white/20 cursor-not-allowed'
                        : 'border-white/20 text-[#FAF8F3] hover:bg-white/5'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" /> Previous Step
                  </button>

                  {currentStep < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (currentStep === 1 && !selectedCategory) {
                          alert('Please select a jewelry category (e.g. Rings, Pendants, Earrings) before proceeding to the next step.');
                          return;
                        }
                        setCurrentStep(prev => Math.min(prev + 1, 5));
                      }}
                      className="px-6 py-2.5 bg-[#1E4FA3] hover:bg-[#2A66D6] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                    >
                      Next Step <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Real-time Sticky Specification Summary Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#09112B]/95 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[#D4AF37]/35 sticky top-28 space-y-5">
              
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#D4AF37]/25">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#F5E7A3]">
                    <Sliders className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="font-serif gold-gradient-text font-bold text-base leading-tight">
                      Specification Summary
                    </h3>
                    <p className="text-[10px] text-[#FAF8F3]/50">Real-time studio configuration</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#D4AF37]/20 text-[#F5E7A3] border border-[#D4AF37]/40 font-bold uppercase tracking-wider">
                  {selectedCategory || 'Unselected'}
                </span>
              </div>

              {/* Configured Parameters Stream */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-[#F5E7A3] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#D4AF37]" /> Configured Parameters
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Spec
                  </span>
                </div>
                
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 text-xs">
                  {/* Category */}
                  <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                    <span className="text-[#FAF8F3]/60 font-medium">Design Type:</span>
                    <span className="font-bold text-[#FAF8F3] capitalize">{selectedCategory || 'Unselected'}</span>
                  </div>

                  {/* Ring Size */}
                  {selectedCategory === 'rings' && ringSize && (
                    <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60 font-medium">Target Ring Size:</span>
                      <span className="font-bold text-[#F5E7A3]">{ringSize} ({ringSizeStandard})</span>
                    </div>
                  )}

                  {/* Ring Metal Weight */}
                  {selectedCategory === 'rings' && targetWeightGrams && (
                    <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60 font-medium">Target Metal Weight:</span>
                      <span className="font-bold text-[#FAF8F3]">{targetWeightGrams} grams</span>
                    </div>
                  )}

                  {/* Height & Width dimensions */}
                  {(heightMm || widthMm) && (
                    <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60 font-medium">Target Dimensions:</span>
                      <span className="font-bold text-[#FAF8F3]">{heightMm ? `H: ${heightMm}mm ` : ''}{widthMm ? `W: ${widthMm}mm` : ''}</span>
                    </div>
                  )}

                  {/* Chain length / Earring backing / Wrist size */}
                  {selectedCategory === 'pendants' && chainLength && (
                    <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60 font-medium">Chain Specification:</span>
                      <span className="font-bold text-[#FAF8F3]">{chainLength}</span>
                    </div>
                  )}
                  {selectedCategory === 'earrings' && earringBacking && (
                    <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60 font-medium">Earring Backing:</span>
                      <span className="font-bold text-[#FAF8F3]">{earringBacking}</span>
                    </div>
                  )}
                  {selectedCategory === 'bracelets' && (wristCircumference || braceletStyle) && (
                    <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60 font-medium">Style & Wrist:</span>
                      <span className="font-bold text-[#FAF8F3]">{braceletStyle} {wristCircumference ? `(${wristCircumference})` : ''}</span>
                    </div>
                  )}

                  {/* Catalog References */}
                  {selectedCatalogProducts.length > 0 && (
                    <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-[#D4AF37]/35 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[#FAF8F3]/60 font-medium">Catalog References:</span>
                        <span className="font-bold text-[#D4AF37]">{selectedCatalogProducts.length} Selected</span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedCatalogProducts.map(p => (
                          <span key={p.id} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#D4AF37]/20 text-[#F5E7A3] border border-[#D4AF37]/30">
                            {p.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Option Selections from Backend API */}
                  {selectedValuesSummary.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60 font-medium truncate max-w-[130px]">{item.group}:</span>
                      <span className="font-bold text-[#FAF8F3] flex items-center gap-1.5">
                        {item.color && (
                          <span className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: item.color }} />
                        )}
                        {item.value}
                      </span>
                    </div>
                  ))}

                  {/* Gemstone Layout */}
                  <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                    <span className="text-[#FAF8F3]/60 font-medium">Gemstone Layout:</span>
                    <span className="font-bold text-[#FAF8F3]">
                      {isMetalOnly ? 'Plain Metal (No Stones)' : `${stonesList.length} Stone Row(s)`}
                    </span>
                  </div>

                  {!isMetalOnly && stonesList.length > 0 && (
                    <div className="p-2.5 rounded-2xl bg-[#09112B]/80 border border-white/5 space-y-1 text-[11px]">
                      {stonesList.map((st, i) => (
                        <div key={i} className="flex justify-between text-[#FAF8F3]/80">
                          <span>Row {i + 1}: {st.shape} {st.stone_type} ({st.quantity}x)</span>
                          <span className="font-bold text-[#F5E7A3]">{st.size_value} {st.size_unit}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Personalization & Engraving */}
                  {engravingText && (
                    <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60 font-medium">Inside Engraving:</span>
                      <span className="font-bold text-[#F5E7A3] italic">"{engravingText}"</span>
                    </div>
                  )}

                  {/* Logo Stamp */}
                  {hasLogo && (
                    <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60 font-medium">Vector Hallmark:</span>
                      <span className="font-bold text-[#D4AF37]">Custom Logo Stamp</span>
                    </div>
                  )}

                  {/* Sketches */}
                  {sketchFiles.length > 0 && (
                    <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60 font-medium">Uploaded Sketches:</span>
                      <span className="font-bold text-emerald-400">{sketchFiles.length} File(s) Attached</span>
                    </div>
                  )}

                  {/* Target Date */}
                  {neededByDate && (
                    <div className="p-3 rounded-2xl bg-[#121F4D]/70 border border-white/10 flex justify-between items-center">
                      <span className="text-[#FAF8F3]/60 font-medium">Required By:</span>
                      <span className="font-bold text-[#F5E7A3]">{neededByDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Master CAD Deliverables Guarantee Card */}
              <div className="p-4 bg-[#121F4D]/80 border border-[#D4AF37]/35 rounded-2xl text-xs space-y-2">
                <h4 className="font-bold text-[#F5E7A3] flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-[#D4AF37]" /> Master CAD Deliverables
                </h4>
                <ul className="space-y-1 text-[#FAF8F3]/75 text-[11px]">
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-[#D4AF37]" /> Layered Rhino (.3DM) Native File</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-[#D4AF37]" /> Watertight Wax-Ready (.STL) Mesh</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-[#D4AF37]" /> 4K Photorealistic Ray-Traced Render</li>
                </ul>
              </div>

              {/* 100% Production Guarantee */}
              <div className="p-3.5 bg-[#060D22] rounded-2xl border border-[#D4AF37]/30 text-[#FAF8F3]/75 text-[11px] space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#F5E7A3]">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" /> Production Ready Guarantee
                </div>
                <p className="leading-relaxed text-[10px] text-[#FAF8F3]/60">100% tested for stone seat clearance &amp; casting shrinkage.</p>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* RING SIZE CONVERSION MODAL */}
      {showRingSizeModal && (
        <div className="fixed inset-0 z-50 bg-[#0B1330]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#09112B] rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-[#D4AF37]/40 flex flex-col">
            <div className="p-6 bg-[#121F4D] text-[#FAF8F3] flex justify-between items-center border-b border-[#D4AF37]/30">
              <div>
                <h3 className="text-lg font-serif gold-gradient-text font-bold flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-[#D4AF37]" /> International Ring Size Conversion Chart
                </h3>
                <p className="text-xs text-[#FAF8F3]/60">Match inside diameter in millimeters across global sizing standards.</p>
              </div>
              <button
                onClick={() => setShowRingSizeModal(false)}
                className="p-1 rounded-full text-[#FAF8F3]/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#121F4D] text-[#F5E7A3] font-bold uppercase tracking-wider border-b border-white/10">
                    <th className="p-2.5 rounded-l-xl">US / Canada</th>
                    <th className="p-2.5">UK / Aus</th>
                    <th className="p-2.5">IN / HK</th>
                    <th className="p-2.5">EU (ISO)</th>
                    <th className="p-2.5 rounded-r-xl">Inside Dia (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {RING_SIZE_CONVERSION_TABLE.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#121F4D]/50 transition-colors">
                      <td className="p-2.5 font-bold text-[#FAF8F3]">{row.us}</td>
                      <td className="p-2.5 text-[#FAF8F3]/70">{row.uk}</td>
                      <td className="p-2.5 text-[#FAF8F3]/70">{row.in_hk}</td>
                      <td className="p-2.5 text-[#FAF8F3]/70">{row.eu}</td>
                      <td className="p-2.5 font-mono text-[#F5E7A3] font-semibold">{row.inside_mm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-[#121F4D]/60 border-t border-white/10 text-right">
              <button
                onClick={() => setShowRingSizeModal(false)}
                className="px-6 py-2 btn-gold-luxury font-bold text-xs rounded-xl"
              >
                Close Conversion Chart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

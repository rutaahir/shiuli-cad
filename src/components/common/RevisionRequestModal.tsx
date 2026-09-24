import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';

interface RevisionRequestModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder?: any) => void;
}

export const RevisionRequestModal: React.FC<RevisionRequestModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [comment, setComment] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceAudioFile, setVoiceAudioFile] = useState<File | null>(null);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setComment('');
      setReferenceImage(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      stopRecording();
      if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl);
      setVoiceAudioFile(null);
      setVoiceAudioUrl(null);
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const policy = order.revision_policy || {
    free_revisions_allowed: 2,
    extra_revision_fee: 500,
    used_revisions: order.revision_requests?.length || 0,
    remaining_free: Math.max(0, 2 - (order.revision_requests?.length || 0)),
    is_free_next: (order.revision_requests?.length || 0) < 2,
  };

  const currentVersion = order.current_version || 1;
  const nextRevisionNum = (order.revision_requests?.length || 0) + 1;

  // MediaRecorder handlers
  const startRecording = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('Microphone recording is not supported in this browser.');
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
        const audioFile = new File([audioBlob], `revision_voice_${order.id}_rev${nextRevisionNum}.webm`, { type: 'audio/webm' });
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
      console.error('Microphone access denied:', err);
      setErrorMsg('Microphone access denied. Please allow microphone permissions or attach an audio file.');
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

  const discardVoiceNote = () => {
    stopRecording();
    if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl);
    setVoiceAudioFile(null);
    setVoiceAudioUrl(null);
    setIsPlayingAudio(false);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl);
    setVoiceAudioFile(file);
    setVoiceAudioUrl(URL.createObjectURL(file));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setReferenceImage(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  };

  const discardImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setReferenceImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMsg('Please specify the revision instructions or changes you would like our CAD team to make.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('comment', comment.trim());

      if (voiceAudioFile) {
        formData.append('voice_note', voiceAudioFile);
      }
      if (referenceImage) {
        formData.append('reference_image', referenceImage);
      }

      await api.submitRevisionRequest(order.id, formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit revision request:', err);
      setErrorMsg(err?.message || 'Failed to submit revision request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#09112B] border border-[#D4AF37]/30 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Top Luxury Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-[#D4AF37]/15 text-[#F3E5AB] border border-[#D4AF37]/30">
                Revision #{nextRevisionNum} (CAD v{currentVersion})
              </span>
              <span className="text-xs font-semibold text-[#8E9CAE]">Order #{order.id}</span>
            </div>
            <h2 className="text-xl font-serif font-bold text-[#FAF8F3]">
              Request Design Adjustments
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8E9CAE] hover:text-[#FAF8F3] hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Dynamic Revision Policy Banner */}
          <div className="p-4 rounded-2xl bg-[#12204D]/60 border border-white/10 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-semibold text-[#F3E5AB] flex items-center gap-2">
                <span>Studio Revision Policy</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#09112B] border border-white/10 text-white">
                  {policy.is_free_next ? `${policy.remaining_free} Free Round${policy.remaining_free === 1 ? '' : 's'} Remaining` : 'Extra Round'}
                </span>
              </div>
              <p className="text-[#C9C2A6]">
                {policy.is_free_next
                  ? `Your bespoke order includes ${policy.free_revisions_allowed} free CAD review rounds. This will be revision round #${nextRevisionNum}.`
                  : `You have completed all ${policy.free_revisions_allowed} complimentary revisions. A nominal studio modification charge of ₹${policy.extra_revision_fee} will apply.`}
              </p>
            </div>
          </div>

          {/* Feedback Instructions */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#FAF8F3] uppercase tracking-wider">
              Feedback & Modification Details <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe the adjustments you'd like our master CAD team to make (e.g., increase shank thickness to 2.2mm, lower center solitaire basket by 1mm, change prongs from round to claw, adjust bezel edge...)"
              className="w-full px-4 py-3 rounded-xl bg-[#070D21] border border-white/15 text-[#FAF8F3] text-xs focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all placeholder:text-[#6B7280] resize-y"
            />
          </div>

          {/* Audio Voice Note (Optional) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#FAF8F3] uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Voice Note Explanation (Optional)</span>
              </label>
              <span className="text-[11px] text-[#8E9CAE]">Record spoken guidance</span>
            </div>

            <div className="p-4 rounded-xl bg-[#070D21] border border-white/10 space-y-3">
              {!voiceAudioFile && !isRecording && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-4 py-2 rounded-xl bg-[#12204D] hover:bg-[#1A2E60] border border-[#D4AF37]/40 text-[#F3E5AB] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Mic className="w-4 h-4 text-rose-400 animate-pulse" />
                    <span>Record Voice Note</span>
                  </button>

                  <span className="text-[11px] text-[#6B7280]">or</span>

                  <label className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#C9C2A6] text-xs font-medium flex items-center gap-2 transition-all cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#8E9CAE]" />
                    <span>Upload Audio File</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {isRecording && (
                <div className="flex items-center justify-between bg-rose-950/40 border border-rose-500/40 p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-mono font-bold text-rose-300">
                      Recording: {formatTimer(recordingSeconds)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop Recording</span>
                  </button>
                </div>
              )}

              {voiceAudioFile && !isRecording && (
                <div className="flex items-center justify-between bg-[#12204D] border border-[#D4AF37]/30 p-3 rounded-xl">
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                    <audio
                      ref={audioPlayerRef}
                      src={voiceAudioUrl || ''}
                      onPlay={() => setIsPlayingAudio(true)}
                      onPause={() => setIsPlayingAudio(false)}
                      onEnded={() => setIsPlayingAudio(false)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!audioPlayerRef.current) return;
                        if (isPlayingAudio) {
                          audioPlayerRef.current.pause();
                        } else {
                          audioPlayerRef.current.play();
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-[#D4AF37] hover:bg-[#F3E5AB] text-[#09112B] flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer"
                    >
                      {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#FAF8F3] truncate">
                        {voiceAudioFile.name}
                      </p>
                      <p className="text-[10px] text-[#C9C2A6]">
                        {(voiceAudioFile.size / 1024).toFixed(1)} KB • Voice Note Attached
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={discardVoiceNote}
                    className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Remove Voice Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Reference Image Attachment (Optional) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#FAF8F3] uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Reference Photo / Screenshot (Optional)</span>
              </label>
              <span className="text-[11px] text-[#8E9CAE]">Markups, inspiration, sketches</span>
            </div>

            {!imagePreview ? (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/15 hover:border-[#D4AF37]/50 rounded-2xl bg-[#070D21] transition-all cursor-pointer group">
                <ImageIcon className="w-8 h-8 text-[#8E9CAE] group-hover:text-[#D4AF37] transition-colors mb-2" />
                <span className="text-xs font-semibold text-[#FAF8F3]">
                  Click to upload reference image
                </span>
                <span className="text-[10px] text-[#6B7280] mt-0.5">
                  Supports JPG, PNG, WEBP up to 15MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/40 bg-[#070D21] p-2 flex items-center gap-4">
                <img
                  src={imagePreview}
                  alt="Reference"
                  className="w-20 h-20 rounded-xl object-cover border border-white/10"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#FAF8F3] truncate">
                    {referenceImage?.name}
                  </p>
                  <p className="text-[10px] text-[#C9C2A6]">
                    {referenceImage ? (referenceImage.size / 1024).toFixed(1) : 0} KB • Attached Reference
                  </p>
                </div>
                <button
                  type="button"
                  onClick={discardImage}
                  className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer mr-2"
                  title="Remove image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* WhatsApp Secondary Helper */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
            <span className="text-[#8E9CAE]">Need direct verbal coordination?</span>
            <a
              href={`https://wa.me/919574787098?text=Hello%20Shiuli%20Studio%2C%20I%20have%20feedback%20regarding%20Order%20%23${order.id}%20CAD%20preview%20v${currentVersion}.`}
              target="_blank"
              rel="noreferrer"
              className="text-[#D4AF37] hover:text-[#F3E5AB] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Message us on WhatsApp instead</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#FAF8F3] text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] hover:from-[#F3E5AB] hover:to-[#D4AF37] text-[#09112B] text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Feedback...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Submit Revision Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, AlertTriangle, Lock, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { sendCadDownloadEmail } from '../services/emailService';
import { useAuth } from '../context/AuthContext';

export const SecureDownloadPage: React.FC = () => {
  const { isLoggedIn, user } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'downloading' | 'complete' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSecondDownload, setIsSecondDownload] = useState<boolean>(false);
  const [downloadFileName, setDownloadFileName] = useState<string>('CAD_Design_File.zip');
  const [portfolioConsent, setPortfolioConsent] = useState<boolean>(false);

  // Extract token from path e.g. /download/{token}
  const pathParts = window.location.pathname.split('/download/');
  const token = pathParts.length > 1 ? pathParts[1].replace(/\/$/, '') : '';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setIsSecondDownload(false);
      setErrorMessage('No download token specified.');
      return;
    }

    triggerSecureDownload();
  }, [token]);

  const triggerSecureDownload = async () => {
    setStatus('downloading');
    setErrorMessage('');
    setIsSecondDownload(false);

    const jwtToken = localStorage.getItem('shiuli_access_token');
    const headers: Record<string, string> = {};
    if (jwtToken) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
    }

    try {
      const response = await fetch(`/api/payments/download/${token}/`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        let errText = 'This download link is invalid, expired, or has already been used.';
        let isSecond = false;
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errText = errData.error;
          }
          if (errData && (errData.is_second_download || errData.code === 'SECOND_DOWNLOAD_UNAVAILABLE')) {
            isSecond = true;
          }
        } catch {}

        const lower = errText.toLowerCase();
        if (
          lower.includes('already been used') ||
          lower.includes('second-time') ||
          lower.includes('second time') ||
          lower.includes('expired')
        ) {
          isSecond = true;
        }

        setIsSecondDownload(isSecond);
        setStatus('error');
        setErrorMessage(errText);
        return;
      }

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'ready_made_cad_design.3dm';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setStatus('complete');

      if (user?.email) {
        sendCadDownloadEmail(
          user.email,
          filename.replace(/_/g, ' '),
          ['.3DM (Rhino 8 Native)', '.STL (Watertight High-Res Mesh)', '.OBJ (Universal Quad Mesh)'],
          window.location.href
        ).catch((e) => console.warn('Background email dispatch notice:', e));
      }
    } catch (err: any) {
      setStatus('error');
      setIsSecondDownload(false);
      setErrorMessage('Failed to connect to secure file delivery service.');
    }
  };

  const handleGoToDashboard = () => {
    window.history.pushState({ page: 'account' }, '', '/account?tab=downloads');
    window.location.href = '/account?tab=downloads';
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4 text-[#17243B]">
        <RefreshCw className="w-10 h-10 text-[#B88732] animate-spin mb-4" />
        <p className="text-sm font-medium text-[#687386]">Verifying secure download token...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4 text-[#17243B] pt-28 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white border border-[#E8D7B7] rounded-2xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />

        {status === 'downloading' && (
          <div className="space-y-4 py-6">
            <div className="inline-flex p-4 bg-[#FFF9F0] border border-[#E8D7B7] rounded-full text-[#B88732]">
              <Download className="w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#17345C]">Preparing Your File Download...</h2>
            <p className="text-sm text-[#687386]">
              Authenticating user <span className="text-[#B88732] font-semibold">{user?.email}</span> and streaming CAD file.
            </p>
          </div>
        )}

        {status === 'complete' && (
          <div className="space-y-4 py-4">
            <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-600">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#17345C]">Download Complete!</h2>
            <p className="text-sm text-[#17243B]">
              Your CAD design file has been delivered to your browser downloads.
            </p>
            <div className="p-4 bg-[#FFFDF9]/80 border border-[#E8D7B7] rounded-xl text-xs text-[#687386] text-left space-y-2">
              <div className="flex items-center space-x-2 text-[#B88732] font-semibold mb-1">
                <Lock className="w-4 h-4" />
                <span>Single-Use Token Spent</span>
              </div>
              <p>• This token link has now been marked as used and deactivated.</p>
              <p>• If you need to re-download this design in the future, request a new link from your <span className="text-[#B88732] font-semibold">My Downloads</span> dashboard.</p>
              
              <div className="pt-2 border-t border-[#E8D7B7]">
                <label className="flex items-start space-x-2.5 cursor-pointer text-[#17243B]">
                  <input
                    type="checkbox"
                    checked={portfolioConsent}
                    onChange={(e) => setPortfolioConsent(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 bg-white text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-[11px] leading-snug">
                    Allow Shiuli CAD Studio to feature this design in our public portfolio (your name & contact will never be shown).
                  </span>
                </label>
              </div>
            </div>
            <button
              onClick={handleGoToDashboard}
              className="w-full py-3 btn-gold-luxury text-[#17345C] font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to My Downloads Dashboard</span>
            </button>
          </div>
        )}

        {status === 'error' && isSecondDownload && (
          <div className="space-y-5 py-2">
            <div className="inline-flex p-4 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-600 shadow-[0_0_25px_rgba(217,119,6,0.15)]">
              <Lock className="w-12 h-12" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 text-[11px] font-bold tracking-widest uppercase rounded-full bg-amber-50 border border-amber-300 text-amber-700">
                One-Time Link Used
              </span>
              <h2 className="text-2xl font-serif font-bold text-[#17345C]">
                Second-Time Download Not Available
              </h2>
              <p className="text-sm text-[#687386] max-w-md mx-auto leading-relaxed">
                This download link has already been used and has expired. For file security and asset protection, single-use links cannot be reopened.
              </p>
            </div>

            <div className="p-4 bg-[#FFFDF9] border border-[#E8D7B7] rounded-xl text-left text-xs space-y-2.5 text-[#17243B]">
              <div className="flex items-center space-x-2 text-[#B88732] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>File was already delivered during your first session</span>
              </div>
              <p className="text-[#687386] pl-6 leading-relaxed">
                Single-use tokens expire immediately upon download completion to prevent unauthorized access or link sharing.
              </p>
              <div className="pt-2 border-t border-[#E8D7B7] text-[#687386] pl-6 leading-relaxed">
                <strong>Need your CAD files again?</strong> Your purchase is safe and intact. You can generate a fresh, secure download link anytime from your <span className="font-semibold text-[#17345C]">Order History</span>.
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                onClick={handleGoToDashboard}
                className="w-full py-3.5 btn-gold-luxury text-[#17345C] font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>Request New Link from My Orders</span>
              </button>

              <button
                onClick={() => { window.location.href = '/'; }}
                className="w-full py-2.5 text-xs text-[#687386] hover:text-[#17345C] transition-colors"
              >
                Back to Home Page
              </button>
            </div>
          </div>
        )}

        {status === 'error' && !isSecondDownload && (
          <div className="space-y-4 py-4">
            <div className="inline-flex p-4 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-600">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-rose-800">Unable to Download File</h2>
            <p className="text-sm text-rose-900 bg-rose-50 border border-rose-200 p-4 rounded-xl leading-relaxed">
              {errorMessage}
            </p>

            <div className="pt-4 space-y-3">
              <button
                onClick={handleGoToDashboard}
                className="w-full py-3.5 btn-gold-luxury text-[#17345C] font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>Request New Link from My Orders</span>
              </button>

              <button
                onClick={() => { window.location.href = '/'; }}
                className="w-full py-2.5 text-xs text-[#687386] hover:text-[#17345C] transition-colors"
              >
                Back to Home Page
              </button>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
};

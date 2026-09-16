import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, AlertTriangle, Lock, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SecureDownloadPage: React.FC = () => {
  const { isLoggedIn, user } = useAuth();
  const [status, setStatus] = useState<'initiating' | 'downloading' | 'complete' | 'error'>('initiating');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extract token from path e.g. /download/{token}
  const pathParts = window.location.pathname.split('/download/');
  const token = pathParts.length > 1 ? pathParts[1].replace(/\/$/, '') : '';

  useEffect(() => {
    if (!isLoggedIn) {
      // Redirect to login preserving current route
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      return;
    }

    if (!token) {
      setStatus('error');
      setErrorMessage('No download token specified.');
      return;
    }

    triggerSecureDownload();
  }, [isLoggedIn, token]);

  const triggerSecureDownload = async () => {
    setStatus('downloading');
    setErrorMessage(null);

    const jwtToken = localStorage.getItem('shiuli_access_token');
    const headers: Record<string, string> = {};
    if (jwtToken) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
    }

    try {
      const response = await fetch(`/download/${token}/`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        let errText = 'This download link is invalid, expired, or has already been used.';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errText = errData.error;
          }
        } catch {}
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
    } catch (err: any) {
      setStatus('error');
      setErrorMessage('Failed to connect to secure file delivery service.');
    }
  };

  const handleGoToDashboard = () => {
    window.history.pushState({ page: 'account' }, '', '/account');
    window.location.href = '/account';
  };

  if (status === 'initiating') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100">
        <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mb-4" />
        <p className="text-sm font-medium text-zinc-400">Verifying secure download token...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100 pt-28 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />

        {status === 'downloading' && (
          <div className="space-y-4 py-6">
            <div className="inline-flex p-4 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400">
              <Download className="w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-amber-100">Preparing Your File Download...</h2>
            <p className="text-sm text-zinc-400">
              Authenticating user <span className="text-amber-300 font-semibold">{user?.email}</span> and streaming CAD file.
            </p>
          </div>
        )}

        {status === 'complete' && (
          <div className="space-y-4 py-4">
            <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-amber-100">Download Complete!</h2>
            <p className="text-sm text-zinc-300">
              Your CAD design file has been delivered to your browser downloads.
            </p>
            <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-400 text-left space-y-1">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold mb-1">
                <Lock className="w-4 h-4" />
                <span>Single-Use Token Spent</span>
              </div>
              <p>• This token link has now been marked as used and deactivated.</p>
              <p>• If you need to re-download this design in the future, request a new link from your <span className="text-amber-300 font-semibold">My Downloads</span> dashboard.</p>
            </div>
            <button
              onClick={handleGoToDashboard}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to My Downloads Dashboard</span>
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-4">
            <div className="inline-flex p-4 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-400">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-rose-200">Unable to Download File</h2>
            <p className="text-sm text-zinc-300 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
              {errorMessage}
            </p>

            <div className="pt-4 space-y-3">
              <button
                onClick={handleGoToDashboard}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>Request New Link from My Orders</span>
              </button>

              <button
                onClick={() => { window.location.href = '/'; }}
                className="w-full py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
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

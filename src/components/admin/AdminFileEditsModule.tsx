import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ModificationTypeData } from '../../types';
import { 
  Wrench, 
  Plus, 
  Edit2, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  FileCode, 
  CheckCircle2, 
  Sliders,
  Download,
  Eye,
  Search,
  RefreshCw,
  User,
  Mail,
  Phone,
  Clock,
  DollarSign,
  Tag,
  FileText
} from 'lucide-react';

export interface FileEditRequestItem {
  id: number;
  client: number;
  client_name: string;
  client_email?: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  original_file: string;
  original_file_format: string;
  modification_types: number[];
  modification_type_labels: string[];
  description: string;
  reference_image?: string | null;
  status: 'new' | 'quoted' | 'negotiating' | 'agreed' | 'rejected';
  submission_intent: 'quote_only' | 'place_order';
  estimated_price_shown?: string | number | null;
  agreed_price?: string | number | null;
  created_at: string;
}

export const AdminFileEditsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'mod_types'>('requests');
  
  // Data States
  const [requests, setRequests] = useState<FileEditRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [modTypes, setModTypes] = useState<ModificationTypeData[]>([]);
  const [loadingModTypes, setLoadingModTypes] = useState(true);

  // Status & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'quoted' | 'agreed' | 'rejected'>('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected Request Modal State
  const [selectedReq, setSelectedReq] = useState<FileEditRequestItem | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [quotePriceInput, setQuotePriceInput] = useState<string>('');
  const [selectedStatusInput, setSelectedStatusInput] = useState<string>('new');

  // Modal State for Edit/Create Modification Type
  const [isModModalOpen, setIsModModalOpen] = useState(false);
  const [editingMod, setEditingMod] = useState<Partial<ModificationTypeData> | null>(null);
  const [isSubmittingMod, setIsSubmittingMod] = useState(false);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoadingRequests(true);
    setErrorMsg('');
    try {
      await api.ensureAdminToken();
      const data = await api.getFileEditRequests();
      setRequests(data || []);
    } catch (err: any) {
      console.error('Failed to load file edit requests:', err);
      setErrorMsg(err.message || 'Failed to load submitted file edit requests.');
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadModTypes = async () => {
    setLoadingModTypes(true);
    setErrorMsg('');
    try {
      const data = await api.getModificationTypes();
      setModTypes(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load modification types.');
    } finally {
      setLoadingModTypes(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    loadModTypes();
  }, []);

  const handleOpenRequestDetail = (req: FileEditRequestItem) => {
    setSelectedReq(req);
    setSelectedStatusInput(req.status || 'new');
    setQuotePriceInput(req.agreed_price ? String(req.agreed_price) : '');
  };

  const handleSaveRequestStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setUpdatingStatus(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: any = {
        status: selectedStatusInput,
      };
      if (quotePriceInput) {
        payload.agreed_price = parseFloat(quotePriceInput);
      }

      const updated = await api.updateFileEditRequestStatus(selectedReq.id, payload);
      setSuccessMsg(`Request #${selectedReq.id} status updated to "${selectedStatusInput.toUpperCase()}".`);
      setSelectedReq(updated);
      await fetchRequests();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update request status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Modification Type Handlers
  const handleOpenEditMod = (mod?: ModificationTypeData) => {
    if (mod) {
      setEditingMod({ ...mod });
    } else {
      setEditingMod({
        key: 'custom-modification',
        label: 'New Modification Type',
        description: 'Description of CAD file modification',
        base_price: 75.0,
        icon: 'Wrench',
        is_active: true,
        display_order: modTypes.length + 1,
      });
    }
    setIsModModalOpen(true);
  };

  const handleSaveMod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMod || !editingMod.key) return;
    setIsSubmittingMod(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (editingMod.id) {
        await api.request(`/file-edits/modification-types/${editingMod.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(editingMod),
        });
        setSuccessMsg(`Modification type "${editingMod.label}" updated successfully.`);
      } else {
        await api.request('/file-edits/modification-types/', {
          method: 'POST',
          body: JSON.stringify(editingMod),
        });
        setSuccessMsg(`New modification type "${editingMod.label}" created successfully.`);
      }
      setIsModModalOpen(false);
      setEditingMod(null);
      await loadModTypes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save modification type.');
    } finally {
      setIsSubmittingMod(false);
    }
  };

  // Filtered Requests
  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' ? true : r.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const nameMatch = (r.contact_name || r.client_name || '').toLowerCase().includes(q);
    const emailMatch = (r.contact_email || r.client_email || '').toLowerCase().includes(q);
    const formatMatch = (r.original_file_format || '').toLowerCase().includes(q);
    const idMatch = `fed-${r.id}`.includes(q) || `#${r.id}`.includes(q);
    return matchesStatus && (nameMatch || emailMatch || formatMatch || idMatch || q === '');
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'quoted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'agreed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1330]/5 text-[#0B1330] text-xs font-semibold uppercase tracking-wider mb-2">
            <Wrench className="w-3.5 h-3.5 text-[#D4AF37]" />
            SuperAdmin CAD File Studio
          </div>
          <h2 className="text-2xl font-bold text-slate-900">CAD File Edit Requests & Studio CMS</h2>
          <p className="text-slate-500 text-xs mt-1">
            View submitted client CAD modification orders, review 3D files (.3dm, .stl, .obj, .step), quote prices, and manage pricing rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchRequests();
              loadModTypes();
            }}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRequests || loadingModTypes ? 'animate-spin text-[#D4AF37]' : ''}`} />
          </button>

          {activeTab === 'mod_types' && (
            <button
              onClick={() => handleOpenEditMod()}
              className="px-4 py-2.5 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" /> Add Modification Type
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
            activeTab === 'requests'
              ? 'bg-[#0B1330] text-[#F5E7A3] shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4 text-[#D4AF37]" />
          Submitted CAD Edit Requests
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'requests' ? 'bg-[#D4AF37]/20 text-[#F5E7A3]' : 'bg-slate-200 text-slate-700'
          }`}>
            {requests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('mod_types')}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
            activeTab === 'mod_types'
              ? 'bg-[#0B1330] text-[#F5E7A3] shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#D4AF37]" />
          Modification Options & Pricing Rules
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'mod_types' ? 'bg-[#D4AF37]/20 text-[#F5E7A3]' : 'bg-slate-200 text-slate-700'
          }`}>
            {modTypes.length}
          </span>
        </button>
      </div>

      {/* System Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* TAB 1: SUBMITTED CAD REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by client name, email, ID, format..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {(['all', 'new', 'quoted', 'agreed', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-[#0B1330] text-[#F5E7A3]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table of Requests */}
          {loadingRequests ? (
            <div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /> Loading submitted CAD file edit requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm bg-white rounded-2xl border border-slate-200 space-y-2">
              <FileCode className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold">No CAD File Edit Requests found.</p>
              <p className="text-xs text-slate-400">When clients submit CAD files on the File Editing page, they will appear here in real time.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Req ID</th>
                      <th className="px-5 py-3.5">Client Contact</th>
                      <th className="px-5 py-3.5">Format & File</th>
                      <th className="px-5 py-3.5">Modifications</th>
                      <th className="px-5 py-3.5">Intent</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Price</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-slate-900">
                          #FED-{req.id}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 text-xs">
                            {req.contact_name || req.client_name || 'Client'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {req.contact_email || req.client_email}
                          </div>
                          {req.contact_phone && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {req.contact_phone}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded bg-[#0B1330] text-[#F5E7A3] font-mono text-[10px] font-bold uppercase mr-2">
                            .{req.original_file_format || 'cad'}
                          </span>
                          {req.original_file && (
                            <a
                              href={req.original_file}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#0B1330] hover:underline font-semibold text-[11px]"
                            >
                              <Download className="w-3 h-3 text-[#D4AF37]" /> Download CAD
                            </a>
                          )}
                        </td>
                        <td className="px-5 py-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {req.modification_type_labels?.length > 0 ? (
                              req.modification_type_labels.map((lbl, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                                  {lbl}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">Custom edits</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.submission_intent === 'place_order'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {req.submission_intent === 'place_order' ? 'Direct Order' : 'Quote Request'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(req.status)}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900">
                          {req.agreed_price ? `$${Number(req.agreed_price).toFixed(2)}` : <span className="text-slate-400 font-normal">Pending</span>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleOpenRequestDetail(req)}
                            className="px-3 py-1.5 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold text-[11px] rounded-lg flex items-center gap-1.5 ml-auto shadow-sm transition-all"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" /> Review & Quote
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MODIFICATION OPTIONS & PRICING RULES */}
      {activeTab === 'mod_types' && (
        <div className="space-y-4">
          {loadingModTypes ? (
            <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /> Loading modification types...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modTypes.map((mod) => (
                <div
                  key={mod.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#D4AF37]/50 transition-all shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-mono text-slate-700 font-semibold">
                        {mod.key}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          mod.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {mod.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{mod.label}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{mod.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Base Price</span>
                      <span className="text-sm font-bold text-[#0B1330]">
                        ${typeof mod.base_price === 'number' ? mod.base_price.toFixed(2) : mod.base_price}
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenEditMod(mod)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REQUEST DETAIL & QUOTE MODAL */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold font-mono text-[#0B1330]">
                  <FileCode className="w-4 h-4 text-[#D4AF37]" /> #FED-{selectedReq.id}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  CAD File Modification Request Review
                </h3>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Client Information</span>
                <p className="font-bold text-slate-900 mt-1">{selectedReq.contact_name || selectedReq.client_name}</p>
                <p className="text-slate-600">{selectedReq.contact_email || selectedReq.client_email}</p>
                {selectedReq.contact_phone && <p className="text-slate-500 font-mono mt-0.5">{selectedReq.contact_phone}</p>}
              </div>

              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Submission Intent</span>
                <span className="font-bold text-[#0B1330] inline-block mt-1">
                  {selectedReq.submission_intent === 'place_order' ? 'Direct Order Assessment' : 'Quote Request Only'}
                </span>
                <span className="text-slate-400 text-[10px] block mt-1">
                  Submitted: {new Date(selectedReq.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* File & Modifications */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Source CAD File & Requested Edits</h4>
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 text-white rounded-xl">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-[#D4AF37] text-slate-950 font-bold uppercase">
                    .{selectedReq.original_file_format || 'cad'}
                  </span>
                  <span className="truncate max-w-xs">{selectedReq.original_file?.split('/').pop() || 'CAD File'}</span>
                </div>
                {selectedReq.original_file && (
                  <a
                    href={selectedReq.original_file}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#F5E7A3] text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download File
                  </a>
                )}
              </div>

              {selectedReq.modification_type_labels?.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-700">Modification Types Selected:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedReq.modification_type_labels.map((lbl, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold">
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description Instructions */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Client Instructions & Specifications</h4>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-mono">
                {selectedReq.description || 'No additional instructions provided.'}
              </div>
            </div>

            {/* Reference Image */}
            {selectedReq.reference_image && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Reference Image / Mark-up</h4>
                <div className="relative group w-32 h-32 rounded-xl overflow-hidden border border-slate-200 cursor-pointer" onClick={() => setLightboxImage(selectedReq.reference_image || null)}>
                  <img src={selectedReq.reference_image} alt="Reference" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}

            {/* Update Status & Agreed Price Form */}
            <form onSubmit={handleSaveRequestStatus} className="space-y-4 pt-4 border-t border-slate-200 bg-slate-50/60 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8 rounded-b-3xl">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#D4AF37]" /> SuperAdmin Status & Price Quote Action
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Action *</label>
                  <select
                    value={selectedStatusInput}
                    onChange={(e) => setSelectedStatusInput(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  >
                    <option value="new">New / Under Assessment</option>
                    <option value="quoted">Quoted (Price Provided)</option>
                    <option value="agreed">Agreed / Order Approved</option>
                    <option value="rejected">Rejected / Cannot Edit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quote / Agreed Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 120.00"
                    value={quotePriceInput}
                    onChange={(e) => setQuotePriceInput(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-6 py-2 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold rounded-xl text-xs flex items-center gap-2 shadow-md"
                >
                  {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> : 'Update Status & Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODIFICATION TYPE MODAL */}
      {isModModalOpen && editingMod && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingMod.id ? `Edit Modification: ${editingMod.label}` : 'Create Modification Type'}
              </h3>
              <button
                onClick={() => setIsModModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMod} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Label *</label>
                <input
                  type="text"
                  required
                  value={editingMod.label || ''}
                  onChange={(e) => setEditingMod({ ...editingMod, label: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Key (Slug) *</label>
                <input
                  type="text"
                  required
                  value={editingMod.key || ''}
                  onChange={(e) => setEditingMod({ ...editingMod, key: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingMod.description || ''}
                  onChange={(e) => setEditingMod({ ...editingMod, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingMod.base_price || 0}
                    onChange={(e) => setEditingMod({ ...editingMod, base_price: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Icon Name</label>
                  <input
                    type="text"
                    value={editingMod.icon || 'Wrench'}
                    onChange={(e) => setEditingMod({ ...editingMod, icon: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0B1330]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="mod_is_active"
                  checked={editingMod.is_active ?? true}
                  onChange={(e) => setEditingMod({ ...editingMod, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-[#0B1330] focus:ring-0"
                />
                <label htmlFor="mod_is_active" className="text-xs font-semibold text-slate-700">
                  Enable this modification option in client wizard
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMod}
                  className="px-6 py-2 bg-[#0B1330] hover:bg-[#121F4D] text-[#F5E7A3] font-bold rounded-xl text-xs flex items-center gap-2"
                >
                  {isSubmittingMod ? <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> : 'Save Modification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxImage} alt="Reference Full View" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
            <button className="absolute -top-4 -right-4 p-2 bg-white text-slate-900 rounded-full shadow-lg font-bold">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFileEditsModule;

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ContactMessageData } from '../../types';
import {
  Mail,
  Phone,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  MessageSquare,
  Send,
  Check,
  Inbox,
  Filter
} from 'lucide-react';

export const AdminContactModule: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Selected Detail Modal State
  const [selectedMsg, setSelectedMsg] = useState<ContactMessageData | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchMessages = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await api.ensureAdminToken();
      const data = await api.getContactMessages();
      setMessages(data || []);
    } catch (err: any) {
      console.error('Failed to load contact messages:', err);
      setErrorMsg(err.message || 'Failed to load contact inquiries from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleToggleReadStatus = async (msg: ContactMessageData, targetState?: boolean) => {
    const nextState = targetState !== undefined ? targetState : !msg.is_read;
    setUpdatingId(msg.id);
    try {
      await api.markContactMessageRead(msg.id, nextState);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_read: nextState } : m)));
      if (selectedMsg && selectedMsg.id === msg.id) {
        setSelectedMsg({ ...selectedMsg, is_read: nextState });
      }
      setSuccessMsg(`Message #${msg.id} marked as ${nextState ? 'read' : 'unread'}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update message status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteMessage = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this contact inquiry?')) return;
    setUpdatingId(id);
    try {
      await api.deleteContactMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMsg && selectedMsg.id === id) {
        setSelectedMsg(null);
      }
      setSuccessMsg(`Contact inquiry #${id} deleted successfully.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete message.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtered Messages List
  const filteredMessages = messages.filter((m) => {
    const matchesStatus =
      statusFilter === 'all' ? true : statusFilter === 'unread' ? !m.is_read : m.is_read;
    const matchesSubject = selectedSubject === 'all' ? true : m.subject === selectedSubject;
    const q = searchQuery.toLowerCase();
    const nameMatch = (m.name || '').toLowerCase().includes(q);
    const emailMatch = (m.email || '').toLowerCase().includes(q);
    const phoneMatch = (m.phone || '').toLowerCase().includes(q);
    const msgMatch = (m.message || '').toLowerCase().includes(q);
    const idMatch = `#${m.id}`.includes(q) || `msg-${m.id}`.includes(q);

    return matchesStatus && matchesSubject && (nameMatch || emailMatch || phoneMatch || msgMatch || idMatch || q === '');
  });

  const unreadCount = messages.filter((m) => !m.is_read).length;
  const subjectsList = Array.from(new Set(messages.map((m) => m.subject).filter(Boolean)));
  const responseRate = messages.length > 0 ? Math.round(((messages.length - unreadCount) / messages.length) * 100) : 100;

  return (
    <div className="space-y-4">
      {/* Sleek Compact Header & KPI Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E7EF] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-xl font-bold text-[#1E2230] tracking-tight">
              Studio Contact Inquiries
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#E8EEFF] text-[#2856C7] font-semibold">
              Live CRM
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            Client support messages submitted via the Contact Atelier page.
          </p>
        </div>

        {/* Compact KPI Metrics Badge Strip */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-3 bg-[#F6F7FB] px-3.5 py-1.5 rounded-xl border border-[#E5E7EF] text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase text-[#6B7280]">Total:</span>
              <span className="font-mono font-bold text-[#1E2230]">{messages.length}</span>
            </div>
            <div className="h-3.5 w-px bg-[#E5E7EF]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase text-[#6B7280]">Unread:</span>
              <span className={`font-mono font-bold ${unreadCount > 0 ? 'text-[#E8A93B]' : 'text-[#1F9D66]'}`}>
                {unreadCount}
              </span>
            </div>
            <div className="h-3.5 w-px bg-[#E5E7EF]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase text-[#6B7280]">Response Rate:</span>
              <span className="font-mono font-bold text-[#1F9D66]">{responseRate}%</span>
            </div>
          </div>

          <button
            onClick={fetchMessages}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E5E7EF] text-[#6B7280] hover:text-[#1E2230] hover:bg-[#F6F7FB] transition-colors"
            title="Refresh Inquiries"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2856C7]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Integrated Filter & Search Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-[#E5E7EF] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search by name, email, phone, message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#F6F7FB] border border-[#E5E7EF] rounded-xl text-xs text-[#1E2230] focus:outline-none focus:border-[#2856C7] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Tabs */}
          <div className="flex items-center gap-0.5 bg-[#F6F7FB] p-1 rounded-xl border border-[#E5E7EF]">
            {(['all', 'unread', 'read'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-[#0D1B4C] text-white shadow-sm'
                    : 'text-[#6B7280] hover:text-[#1E2230]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Subject Dropdown Filter */}
          {subjectsList.length > 0 && (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 border border-[#E5E7EF] rounded-xl text-xs font-medium text-[#1E2230] bg-[#F6F7FB] focus:outline-none focus:border-[#2856C7]"
            >
              <option value="all">All Subjects / Topics</option>
              {subjectsList.map((subj) => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-[#E5E7EF] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#6B7280] text-xs font-mono flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#2856C7]" /> Loading contact messages...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <Inbox className="w-9 h-9 mx-auto text-[#9CA3AF]" />
            <p className="text-xs font-semibold text-[#1E2230]">No Contact Messages Found</p>
            <p className="text-[11px] text-[#6B7280]">
              {searchQuery ? 'No inquiries match your current search query.' : 'New messages from the contact page will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F6F7FB] border-b border-[#E5E7EF] text-[11px] font-mono uppercase text-[#6B7280]">
                  <th className="px-4 py-2.5 font-medium">ID & Status</th>
                  <th className="px-4 py-2.5 font-medium">Client Details</th>
                  <th className="px-4 py-2.5 font-medium">Subject / Topic</th>
                  <th className="px-4 py-2.5 font-medium">Message Snippet</th>
                  <th className="px-4 py-2.5 font-medium">Received Date</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EF]">
                {filteredMessages.map((msg) => (
                  <tr
                    key={msg.id}
                    className={`hover:bg-[#F6F7FB] transition-colors ${
                      !msg.is_read ? 'bg-[#FFFBEB]/60' : ''
                    }`}
                  >
                    {/* ID & Status */}
                    <td className="px-4 py-2.5 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#1E2230]">#MSG-{msg.id}</span>
                        {!msg.is_read ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold uppercase">
                            Unread
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-[10px] font-medium">
                            Read
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Client Details */}
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-[#1E2230]">{msg.name}</div>
                      <div className="text-[10px] text-[#6B7280] font-mono">{msg.email}</div>
                      {msg.phone && <div className="text-[10px] text-[#9CA3AF] font-mono">{msg.phone}</div>}
                    </td>

                    {/* Subject / Topic */}
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-[#E8EEFF] text-[#2856C7] font-semibold text-[11px]">
                        {msg.subject || 'General Inquiry'}
                      </span>
                    </td>

                    {/* Message Snippet */}
                    <td className="px-4 py-2.5 max-w-xs">
                      <p className="text-[#4B5563] truncate text-xs" title={msg.message}>
                        {msg.message}
                      </p>
                    </td>

                    {/* Received Date */}
                    <td className="px-4 py-2.5 text-[11px] font-mono text-[#6B7280]">
                      {new Date(msg.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedMsg(msg);
                            if (!msg.is_read) {
                              handleToggleReadStatus(msg, true);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#0D1B4C] text-white hover:bg-[#1E2230] font-semibold text-xs flex items-center gap-1 transition-colors shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#C9A227]" />
                          <span>View Detail</span>
                        </button>

                        <button
                          onClick={() => handleToggleReadStatus(msg)}
                          disabled={updatingId === msg.id}
                          className="p-1.5 rounded-lg bg-[#F6F7FB] border border-[#E5E7EF] text-[#6B7280] hover:text-[#1E2230] transition-colors"
                          title={msg.is_read ? 'Mark Unread' : 'Mark Read'}
                        >
                          <Check className={`w-3.5 h-3.5 ${msg.is_read ? 'text-[#9CA3AF]' : 'text-[#1F9D66] font-bold'}`} />
                        </button>

                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          disabled={updatingId === msg.id}
                          className="p-1.5 rounded-lg bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition-colors"
                          title="Delete Inquiry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* COMPACT DETAIL MODAL */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#E5E7EF] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0D1B4C] bg-[#E8EEFF] px-2 py-0.5 rounded">
                  #MSG-{selectedMsg.id}
                </span>
                <h3 className="font-serif text-base font-bold text-[#1E2230]">
                  Contact Inquiry Detail
                </h3>
              </div>
              <button
                onClick={() => setSelectedMsg(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1E2230] hover:bg-[#F6F7FB]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Client Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F6F7FB] p-3.5 rounded-xl border border-[#E5E7EF] text-xs">
              <div>
                <span className="text-[#6B7280] font-mono text-[10px] uppercase block">Client Information</span>
                <p className="font-bold text-[#1E2230] text-sm mt-0.5">{selectedMsg.name}</p>
                <div className="flex items-center gap-1.5 text-[#4B5563] mt-1 font-mono">
                  <Mail className="w-3 h-3 text-[#2856C7]" />
                  <a href={`mailto:${selectedMsg.email}`} className="hover:underline text-[#2856C7]">
                    {selectedMsg.email}
                  </a>
                </div>
                {selectedMsg.phone && (
                  <div className="flex items-center gap-1.5 text-[#4B5563] mt-1 font-mono">
                    <Phone className="w-3 h-3 text-[#1F9D66]" />
                    <a href={`https://wa.me/${selectedMsg.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline text-[#1F9D66]">
                      {selectedMsg.phone} (WhatsApp)
                    </a>
                  </div>
                )}
              </div>

              <div>
                <span className="text-[#6B7280] font-mono text-[10px] uppercase block">Submission Overview</span>
                <span className="font-semibold text-[#0D1B4C] block mt-0.5">{selectedMsg.subject || 'General Inquiry'}</span>
                <span className="text-[#6B7280] block text-[11px] font-mono mt-1">
                  Received: {new Date(selectedMsg.created_at).toLocaleString()}
                </span>
                {selectedMsg.ip_address && (
                  <span className="text-[#9CA3AF] block text-[10px] font-mono mt-0.5">
                    IP: {selectedMsg.ip_address}
                  </span>
                )}
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <h4 className="font-mono text-[10px] uppercase text-[#6B7280]">Message Body</h4>
              <div className="p-4 bg-[#0D1B4C] text-white rounded-xl text-xs leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedMsg.message}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-[#E5E7EF] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href={`mailto:${selectedMsg.email}?subject=Re: ${encodeURIComponent(selectedMsg.subject || 'Shiuli CAD Studio Inquiry')}`}
                  className="px-3.5 py-1.5 bg-[#0D1B4C] text-white hover:bg-[#1E2230] font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-[#C9A227]" /> Reply via Email
                </a>

                {selectedMsg.phone && (
                  <a
                    href={`https://wa.me/${selectedMsg.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-[#1F9D66] text-white hover:bg-[#198254] font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedMsg(null)}
                className="px-3.5 py-1.5 bg-[#F6F7FB] border border-[#E5E7EF] hover:bg-[#E5E7EF] text-[#1E2230] font-semibold text-xs rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContactModule;

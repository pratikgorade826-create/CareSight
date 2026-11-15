import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  Upload,
  FileText,
  Download,
  Sparkles,
  Search,
  Tag,
  Loader2,
  X,
  Eye,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HealthcareDocument } from '../types';

export const MedicalVault: React.FC = () => {
  const { user, activeElderlyId } = useAuth();
  const [documents, setDocuments] = useState<HealthcareDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('prescription');
  const [isUploading, setIsUploading] = useState(false);

  // Summary Modal
  const [viewSummaryDoc, setViewSummaryDoc] = useState<HealthcareDocument | null>(null);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDocuments(activeElderlyId || undefined);
      setDocuments(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [activeElderlyId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('document_type', docType);
      if (activeElderlyId) {
        formData.append('elderly_id', activeElderlyId);
      }

      await api.uploadDocument(formData);
      setShowUploadModal(false);
      setTitle('');
      setFile(null);
      loadDocuments();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.document_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || d.document_type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
            <FolderLock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Digital Medical Vault
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Securely store, categorize, and synthesize prescriptions, lab reports, and doctor certificates with Gemini AI.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-teal-600/25 active:scale-95 transition"
        >
          <Upload className="w-5 h-5" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents by title or clinical tags..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-teal-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="">All Document Types</option>
          <option value="prescription">Prescriptions</option>
          <option value="lab_report">Lab Reports</option>
          <option value="discharge_summary">Discharge Summaries</option>
          <option value="doctor_note">Doctor Notes</option>
          <option value="medical_certificate">Medical Certificates</option>
          <option value="imaging_scan">Imaging / Scans</option>
        </select>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Accessing encrypted medical vault...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <FolderLock className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Vault Is Empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Upload PDF prescriptions and hospital diagnostic reports for secure archival and AI summarization.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md"
          >
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {doc.document_type.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                    {doc.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(doc.created_at).toLocaleDateString()} • {roundKb(doc.file_size_bytes)} KB
                  </p>
                </div>

                {doc.ai_summary && (
                  <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl border border-teal-200/60 dark:border-teal-900/60 text-xs text-slate-700 dark:text-slate-300">
                    <p className="font-extrabold text-[10px] uppercase text-teal-700 dark:text-teal-300 flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3" /> AI Summary:
                    </p>
                    <p className="line-clamp-3 leading-relaxed font-medium">{doc.ai_summary}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <button
                  onClick={() => setViewSummaryDoc(doc)}
                  className="w-1/2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Eye className="w-4 h-4 text-teal-600" />
                  View Summary
                </button>
                <a
                  href={`/api/documents/${doc.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-1/2 py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-teal-600 text-white flex items-center justify-between">
              <h2 className="text-xl font-black">Upload Healthcare Document</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-1 rounded-lg hover:bg-white/20">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cardiology Prescription — Nov 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Document Category
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="prescription">Prescription</option>
                  <option value="lab_report">Lab / Blood Report</option>
                  <option value="discharge_summary">Discharge Summary</option>
                  <option value="doctor_note">Doctor Consultation Note</option>
                  <option value="medical_certificate">Medical Certificate</option>
                  <option value="imaging_scan">Imaging / X-Ray / MRI Scan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Select File (PDF or Image) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/*"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="w-1/2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-1/2 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Upload & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Dialog */}
      {viewSummaryDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                {viewSummaryDoc.title}
              </h3>
              <button onClick={() => setViewSummaryDoc(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p className="font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Gemini Medical Synthesis:
              </p>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {viewSummaryDoc.ai_summary || 'No summary available.'}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setViewSummaryDoc(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs"
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

function roundKb(bytes: number) {
  return Math.round((bytes / 1024) * 10) / 10;
}

import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Upload, Camera, CheckCircle, AlertCircle, Sparkles, X, RefreshCw } from 'lucide-react';

interface ReceiptOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReceiptOCRModal: React.FC<ReceiptOCRModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrData, setOcrData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Live Camera Access States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isOpen) return null;

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsCameraActive(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. Please check permissions.');
      setIsCameraActive(false);
    }
  };

  const captureCameraPhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        stopCamera();
        handleProcessFile();
      }
    }
  };

  const handleCloseModal = () => {
    stopCamera();
    setOcrData(null);
    setError(null);
    onClose();
  };

  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Editable Form fields for uploaded receipt
  const [editMerchant, setEditMerchant] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('Card');
  const [editNotes, setEditNotes] = useState('');

  const fetchOptions = async () => {
    try {
      const [catRes, accRes] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts')
      ]);
      setCategories(catRes.data || []);
      setAccounts(accRes.data || []);

      if (accRes.data && accRes.data.length > 0 && !editAccountId) {
        setEditAccountId(accRes.data[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen]);

  const handleProcessFile = async () => {
    try {
      setLoading(true);
      setError(null);
      // Request AI OCR analysis from backend
      const res = await api.post('/ai/ocr');
      const data = res.data;
      setOcrData(data);

      setEditMerchant(data.merchant || 'Uploaded Receipt');
      setEditAmount((data.amount || 0).toString());
      setEditDate(data.date || new Date().toISOString().split('T')[0]);
      setEditNotes(`📷 Uploaded Receipt Scan (Tax: ₹${data.tax || 0})`);

      // Try matching category
      if (categories.length > 0) {
        const match = categories.find((c: any) => c.name.toLowerCase() === (data.suggested_category || '').toLowerCase());
        setEditCategoryId(match ? match.id.toString() : categories[0].id.toString());
      }
    } catch (err) {
      setError('Unable to read this receipt automatically. Please enter details manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAmount || parseFloat(editAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    try {
      setLoading(true);
      const catId = editCategoryId || (categories.length > 0 ? categories[0].id : null);
      const accId = editAccountId || (accounts.length > 0 ? accounts[0].id : null);

      if (!catId || !accId) {
        alert('Please select category and account.');
        return;
      }

      await api.post('/transactions', {
        account_id: parseInt(accId.toString()),
        category_id: parseInt(catId.toString()),
        type: 'Expense',
        amount: parseFloat(editAmount),
        description: editMerchant.trim() || 'Uploaded Receipt Purchase',
        transaction_date: editDate ? `${editDate}T12:00:00` : new Date().toISOString(),
        payment_method: editPaymentMethod,
        notes: editNotes.trim() || '📷 Uploaded Receipt Scan'
      });

      onSuccess();
      handleCloseModal();
    } catch (err) {
      alert('Failed to save receipt record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel border border-amber-500/30 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Sparkles className="text-amber-500" size={20} />
            <span>Live Camera & Receipt Scan</span>
          </h2>
          <button onClick={handleCloseModal} className="p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera Live Stream View */}
        {isCameraActive ? (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border-2 border-amber-500/40 shadow-inner">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-3 flex justify-center items-center gap-3">
                <button
                  onClick={captureCameraPhoto}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
                >
                  <Camera size={16} />
                  <span>Snap Photo</span>
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold hover:bg-black/80"
                >
                  Cancel Camera
                </button>
              </div>
            </div>
          </div>
        ) : !ocrData ? (
          <div className="space-y-4">
            {cameraError && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-xl flex items-center gap-2 border border-destructive/20">
                <AlertCircle size={16} />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Live Camera Button */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md">
                  <Camera size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Scan via Live Webcam / Device Camera</h4>
                  <p className="text-[11px] text-muted-foreground">Access device camera to take receipt photo</p>
                </div>
              </div>
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md"
              >
                Open Cam
              </button>
            </div>

            {/* File Upload Box */}
            <div className="border-2 border-dashed border-border/60 rounded-2xl p-6 text-center space-y-3 hover:border-amber-500/50 transition-colors bg-card/40">
              <Upload className="mx-auto text-amber-500" size={32} />
              <div>
                <p className="text-sm font-bold text-foreground">Or Upload Receipt File</p>
                <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, or PDF</p>
              </div>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-500/15 file:text-amber-600 hover:file:bg-amber-500/25 cursor-pointer"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleProcessFile}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm rounded-xl hover:opacity-95 transition-all shadow-md disabled:opacity-50"
            >
              {loading ? 'Analyzing Receipt...' : 'Scan & Extract Receipt Details'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirmSave} className="space-y-3.5">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle size={15} className="text-amber-500" />
                <span>Extracted Receipt Data</span>
              </span>
              <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full font-semibold">Editable Record</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Merchant / Store Name</label>
              <input
                type="text"
                required
                value={editMerchant}
                onChange={e => setEditMerchant(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Category</label>
                <select
                  value={editCategoryId}
                  onChange={e => setEditCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon || '📦'} {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Account</label>
                <select
                  value={editAccountId}
                  onChange={e => setEditAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Payment Method</label>
              <select
                value={editPaymentMethod}
                onChange={e => setEditPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                <option value="Card">💳 Card</option>
                <option value="UPI">📱 UPI</option>
                <option value="Cash">💵 Cash</option>
                <option value="Net Banking">🏦 Net Banking</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes / Receipt Tags</label>
              <input
                type="text"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOcrData(null)}
                className="w-1/2 py-2.5 border border-border text-muted-foreground rounded-xl hover:bg-accent font-semibold text-xs transition-colors"
              >
                Rescan Receipt
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-1/2 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500 transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? 'Saving Record...' : 'Confirm & Save Record'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};


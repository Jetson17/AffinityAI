import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Toast() {
  const { toast } = useAuth();
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />,
    error: <AlertCircle size={18} style={{ color: 'var(--danger)' }} />,
    info: <Info size={18} style={{ color: 'var(--primary)' }} />
  };

  return (
    <div className="toast-container">
      <div className={`toast ${toast.type || 'info'}`}>
        {icons[toast.type] || icons.info}
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

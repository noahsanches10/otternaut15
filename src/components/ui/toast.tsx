import { Check, AlertCircle } from 'lucide-react';
import { toast as hotToast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

const TOAST_DURATION = 1100;

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
}

function Toast({ message, type = 'success' }: ToastProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        "px-4 py-3 rounded-lg shadow-lg min-w-[300px]",
        "bg-card border border-border",
        "text-sm font-medium",
      )}
      style={{
        animation: `
          toast-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55),
          float 2.5s ease-in-out infinite alternate
        `
      }}
    >
      <div 
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center",
          type === 'success' ? "bg-emerald-500" : "bg-destructive",
        )}
        style={{
          animation: 'bounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        }}
      >
        {type === 'success' ? (
          <Check className="w-4 h-4 text-white" style={{ animation: 'spin-once 0.5s ease-out' }} />
        ) : (
          <AlertCircle className="w-4 h-4 text-white" style={{ animation: 'shake 0.5s ease-in-out' }} />
        )}
      </div>
      <span 
        className={cn(
          "font-medium",
          type === 'success' && "text-emerald-500",
          type === 'error' && "text-destructive"
        )}
      >
        {message}
      </span>
    </div>
  );
}

export const toast = {
  success: (message: string) => {
    return hotToast.custom(
      (t) => (
        <Toast
          message={message}
          type="success"
        />
      ),
      { duration: TOAST_DURATION }
    );
  },
  error: (message: string) => {
    return hotToast.custom(
      (t) => (
        <Toast
          message={message}
          type="error"
        />
      ),
      { duration: TOAST_DURATION }
    );
  }
};
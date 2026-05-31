import React from "react";
import LoadingSpinner from "./LoadingSpinner";

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  onCancel?: () => void;
  cancelText?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = "A carregar...",
  size = "md",
  className = "",
  onCancel,
  cancelText = "Cancelar",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <LoadingSpinner size={size} />
      {message && (
        <p className="text-sm text-text-muted text-center">{message}</p>
      )}
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-sm text-primary-500 hover:text-primary-600 transition-colors font-medium"
        >
          {cancelText}
        </button>
      )}
    </div>
  );
};

export default LoadingState;
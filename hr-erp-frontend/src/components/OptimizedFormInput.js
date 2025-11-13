import React, { useState, useCallback, useMemo, memo } from 'react';

const OptimizedFormInput = memo(({
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  label,
  placeholder,
  required = false,
  disabled = false,
  error = null,
  success = null,
  helperText = null,
  options = [], // For select inputs
  multiple = false, // For select inputs
  min = null,
  max = null,
  step = null,
  pattern = null,
  autoComplete = 'off',
  className = '',
  inputRef = null,
  icon = null,
  loading = false,
  validate = null, // Custom validation function
  debounceMs = 0, // Debounce onChange calls
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Debounced onChange handler
  const debouncedOnChange = useMemo(() => {
    if (debounceMs === 0 || !onChange) return onChange;
    
    let timeout;
    return (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => onChange(e), debounceMs);
    };
  }, [onChange, debounceMs]);

  const handleChange = useCallback((e) => {
    // Immediate validation if provided
    if (validate && touched) {
      const validationError = validate(e.target.value);
      setLocalError(validationError);
    }

    if (debouncedOnChange) {
      debouncedOnChange(e);
    }
  }, [validate, touched, debouncedOnChange]);

  const handleFocus = useCallback((e) => {
    setFocused(true);
    if (props.onFocus) props.onFocus(e);
  }, [props]);

  const handleBlur = useCallback((e) => {
    setFocused(false);
    setTouched(true);
    
    // Validate on blur
    if (validate) {
      const validationError = validate(e.target.value);
      setLocalError(validationError);
    }

    if (onBlur) onBlur(e);
  }, [validate, onBlur]);

  const displayError = error || localError;
  const inputId = `input-${name}`;
  
  const inputClasses = `
    optimized-input
    ${focused ? 'focused' : ''}
    ${displayError ? 'error' : ''}
    ${success ? 'success' : ''}
    ${disabled ? 'disabled' : ''}
    ${loading ? 'loading' : ''}
    ${className}
  `.trim();

  const renderInput = () => {
    const commonProps = {
      id: inputId,
      name,
      value: value || '',
      onChange: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      placeholder,
      required,
      disabled: disabled || loading,
      className: inputClasses,
      ref: inputRef,
      autoComplete,
      ...props
    };

    switch (type) {
      case 'select':
        return (
          <select {...commonProps} multiple={multiple}>
            {placeholder && !multiple && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option 
                key={typeof option === 'string' ? option : option.value} 
                value={typeof option === 'string' ? option : option.value}
                disabled={option.disabled}
              >
                {typeof option === 'string' ? option : option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea 
            {...commonProps} 
            rows={props.rows || 4}
            style={{ resize: props.resize || 'vertical' }}
          />
        );

      case 'file':
        return (
          <input
            {...commonProps}
            type="file"
            accept={props.accept}
            multiple={props.multiple}
          />
        );

      default:
        return (
          <input
            {...commonProps}
            type={type}
            min={min}
            max={max}
            step={step}
            pattern={pattern}
          />
        );
    }
  };

  return (
    <div className="optimized-form-group">
      <style jsx>{`
        .optimized-form-group {
          margin-bottom: 1.5rem;
          position: relative;
        }

        .input-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        .input-label.required::after {
          content: ' *';
          color: #ff5252;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          z-index: 2;
          color: rgba(255, 255, 255, 0.6);
          pointer-events: none;
          transition: color 0.2s ease;
        }

        .optimized-input {
          width: 100% !important;
          padding: 12px 16px !important;
          border: 2px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 8px !important;
          background: rgba(0, 0, 0, 0.7) !important;
          color: #ffffff !important;
          font-size: 1rem !important;
          font-family: inherit !important;
          transition: all 0.3s ease !important;
          box-sizing: border-box !important;
        }

        .optimized-input.has-icon {
          padding-left: 44px !important;
        }

        .optimized-input::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
          opacity: 1 !important;
        }

        .optimized-input:focus {
          outline: none !important;
          border-color: rgba(100, 181, 246, 0.8) !important;
          box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.2) !important;
          background: rgba(0, 0, 0, 0.8) !important;
        }

        .optimized-input.focused + .input-icon {
          color: rgba(100, 181, 246, 0.8);
        }

        .optimized-input.error {
          border-color: rgba(244, 67, 54, 0.8) !important;
          box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2) !important;
        }

        .optimized-input.success {
          border-color: rgba(76, 175, 80, 0.8) !important;
          box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2) !important;
        }

        .optimized-input.disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
          background: rgba(0, 0, 0, 0.4) !important;
        }

        .optimized-input.loading {
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.2) 50%,
            rgba(255, 255, 255, 0.1) 100%
          );
          background-size: 200% 100%;
          animation: loading-shimmer 1.5s infinite;
        }

        .loading-spinner {
          position: absolute;
          right: 12px;
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .input-feedback {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .input-error {
          color: #ff5252;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .input-success {
          color: #4caf50;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .input-helper {
          color: rgba(255, 255, 255, 0.7);
        }

        .character-count {
          position: absolute;
          bottom: -1.5rem;
          right: 0;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }

        /* Select specific styles */
        select.optimized-input {
          cursor: pointer;
          background-image: url("data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><path fill='%23ffffff' d='m0 1 2 2 2-2z'/></svg>");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 12px;
          padding-right: 40px !important;
        }

        select.optimized-input:focus {
          background-image: url("data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><path fill='%2364b5f6' d='m0 1 2 2 2-2z'/></svg>");
        }

        /* Textarea specific styles */
        textarea.optimized-input {
          resize: vertical;
          min-height: 100px;
          line-height: 1.5;
        }

        /* File input specific styles */
        input[type="file"].optimized-input {
          border-style: dashed;
          padding: 20px;
          text-align: center;
          cursor: pointer;
        }

        input[type="file"].optimized-input:hover {
          border-color: rgba(100, 181, 246, 0.6);
          background: rgba(100, 181, 246, 0.1);
        }

        @keyframes loading-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .optimized-input {
            font-size: 16px !important; /* Prevents zoom on iOS */
            padding: 14px 16px !important;
          }
          
          .input-label {
            font-size: 0.95rem;
          }
        }
      `}</style>

      {label && (
        <label htmlFor={inputId} className={`input-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}

      <div className="input-wrapper">
        {icon && <div className={`input-icon ${focused ? 'focused' : ''}`}>{icon}</div>}
        {renderInput()}
        {loading && <div className="loading-spinner"></div>}
      </div>

      {(displayError || success || helperText) && (
        <div className="input-feedback">
          {displayError && (
            <div className="input-error">
              <span>⚠️</span>
              {displayError}
            </div>
          )}
          {!displayError && success && (
            <div className="input-success">
              <span>✅</span>
              {success}
            </div>
          )}
          {!displayError && !success && helperText && (
            <div className="input-helper">
              {helperText}
            </div>
          )}
        </div>
      )}

      {(type === 'text' || type === 'textarea') && max && (
        <div className="character-count">
          {(value || '').length}/{max}
        </div>
      )}
    </div>
  );
});

OptimizedFormInput.displayName = 'OptimizedFormInput';

export default OptimizedFormInput; 

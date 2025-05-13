import React, { useState, useRef, useEffect } from 'react';

interface SegmentedInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
}

export function SegmentedInput({
  length,
  value,
  onChange,
  autoFocus = false,
  className = '',
}: SegmentedInputProps) {
  const [segments, setSegments] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);
  
  // Update segments when value changes externally
  useEffect(() => {
    const valueArray = value.split('');
    const newSegments = Array(length).fill('');
    
    for (let i = 0; i < Math.min(valueArray.length, length); i++) {
      newSegments[i] = valueArray[i];
    }
    
    setSegments(newSegments);
  }, [value, length]);
  
  // Auto-focus the first input when component mounts
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);
  
  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const newChar = e.target.value.slice(-1).toUpperCase();
    
    if (!/^[0-9A-F]$/.test(newChar) && newChar !== '') {
      return;
    }
    
    const newSegments = [...segments];
    newSegments[index] = newChar;
    setSegments(newSegments);
    
    // Join segments and call onChange
    onChange(newSegments.join(''));
    
    // Move to next input if current input is filled
    if (newChar !== '' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === 'Backspace' && segments[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Move to next input on right arrow
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Move to previous input on left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').toUpperCase();
    const validChars = pasteData.match(/[0-9A-F]/g) || [];
    
    const newSegments = [...segments];
    for (let i = 0; i < Math.min(validChars.length, length); i++) {
      newSegments[i] = validChars[i];
    }
    
    setSegments(newSegments);
    onChange(newSegments.join(''));
    
    // Focus the next empty slot or the last slot
    const nextEmptyIndex = newSegments.findIndex(seg => seg === '');
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[length - 1]?.focus();
    }
  };

  return (
    <div className={`flex justify-center items-center gap-2 ${className}`}>
      {segments.map((segment, index) => (
        <input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          value={segment}
          onChange={e => handleChange(index, e)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          maxLength={1}
          className="w-10 h-12 text-center font-mono text-lg font-medium border rounded-md focus:ring-2 focus:ring-primary focus:border-primary uppercase"
          aria-label={`Code segment ${index + 1}`}
        />
      ))}
    </div>
  );
}
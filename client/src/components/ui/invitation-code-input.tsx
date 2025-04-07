import React, { useState, useRef, useEffect } from 'react';

interface InvitationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export function InvitationCodeInput({
  value,
  onChange,
  autoFocus = false,
}: InvitationCodeInputProps) {
  const [segments, setSegments] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Update segments when value changes externally
  useEffect(() => {
    if (value) {
      const chars = value.split('');
      const newSegments = Array(6).fill('');
      chars.forEach((char, index) => {
        if (index < 6) {
          newSegments[index] = char.toUpperCase();
        }
      });
      setSegments(newSegments);
    }
  }, [value]);
  
  // Auto-focus the first input when component mounts
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);
  
  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const newChar = e.target.value.slice(-1).toUpperCase();
    
    // Only allow hexadecimal characters
    if (!/^[0-9A-F]$/.test(newChar) && newChar !== '') {
      return;
    }
    
    const newSegments = [...segments];
    newSegments[index] = newChar;
    setSegments(newSegments);
    
    // Join segments and call onChange
    onChange(newSegments.join(''));
    
    // Move to next input if current input is filled
    if (newChar !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === 'Backspace' && segments[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Move to next input on right arrow
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Move to previous input on left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').toUpperCase().trim();
    
    // Extract hexadecimal characters only
    const validChars = pasteData.match(/[0-9A-F]/g) || [];
    
    // Create new segments array with pasted data
    const newSegments = [...segments];
    for (let i = 0; i < Math.min(validChars.length, 6); i++) {
      newSegments[i] = validChars[i];
    }
    
    setSegments(newSegments);
    onChange(newSegments.join(''));
    
    // If we have a full code, focus the last input
    if (validChars.length >= 6) {
      inputRefs.current[5]?.focus();
    } else {
      // Otherwise focus the next empty slot
      const nextEmptyIndex = newSegments.findIndex(seg => seg === '');
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
    }
  };

  return (
    <div className="flex items-center justify-between w-full">
      {segments.map((segment, index) => (
        <input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          value={segment}
          onChange={e => handleChange(index, e)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          maxLength={1}
          className="w-full h-14 text-center font-mono text-xl font-medium border rounded-md bg-gray-50 focus:ring-2 focus:ring-primary focus:border-primary uppercase mx-1"
          aria-label={`Code segment ${index + 1}`}
        />
      ))}
    </div>
  );
}
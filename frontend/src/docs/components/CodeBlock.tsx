import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'bash', filename }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl border border-[#1E232B] bg-[#0B0E14] shadow-xl overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1E232B] bg-[#12161F] text-[#8B949E]">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFD026]/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          <span className="ml-2 text-[#E6EDF3] font-medium">{filename || language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1E232B] hover:bg-[#30363D] text-[#E6EDF3] transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#FFD026]" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[#E6EDF3] leading-relaxed font-mono">
        <pre>{code}</pre>
      </div>
    </div>
  );
};

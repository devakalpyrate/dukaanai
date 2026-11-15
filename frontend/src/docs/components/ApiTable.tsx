import React from 'react';

export interface ParamRow {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  example?: string;
}

interface ApiTableProps {
  parameters: ParamRow[];
  title?: string;
}

export const ApiTable: React.FC<ApiTableProps> = ({ parameters, title }) => {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-[#1E232B] bg-[#12161F]">
      {title && (
        <div className="px-4 py-2.5 bg-[#0E1217] border-b border-[#1E232B] text-xs font-bold text-[#E6EDF3] uppercase tracking-wider flex items-center justify-between">
          <span>{title}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD026]" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#1E232B] bg-[#090B0E] text-[#8B949E]">
              <th className="py-2.5 px-4 font-semibold">Field</th>
              <th className="py-2.5 px-4 font-semibold">Type</th>
              <th className="py-2.5 px-4 font-semibold">Required</th>
              <th className="py-2.5 px-4 font-semibold">Description</th>
              <th className="py-2.5 px-4 font-semibold">Example</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E232B]/80">
            {parameters.map((p, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-4 font-mono font-semibold text-[#FFD026]">{p.name}</td>
                <td className="py-2.5 px-4 font-mono text-purple-300">{p.type}</td>
                <td className="py-2.5 px-4">
                  {p.required ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Required
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1E232B] text-[#8B949E]">
                      Optional
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-[#C9D1D9] leading-relaxed">{p.description}</td>
                <td className="py-2.5 px-4 font-mono text-[#8B949E]">{p.example || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

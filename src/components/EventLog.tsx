import React, { useRef, useEffect } from 'react';
import type { LogEntry } from '../types/game';

interface EventLogProps {
  logs: LogEntry[];
}

const TYPE_COLORS: Record<LogEntry['type'], string> = {
  info: 'text-cyan-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
  success: 'text-green-400',
  system: 'text-gray-500',
};

const TYPE_PREFIX: Record<LogEntry['type'], string> = {
  info: '',
  warning: '⚠️ ',
  danger: '🚨 ',
  success: '✅ ',
  system: '▸ ',
};

export const EventLog: React.FC<EventLogProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs.length]);

  return (
    <div className="absolute bottom-0 left-0 w-full h-36 bg-gray-950/95 border-t border-cyan-900/40 z-[1000] font-mono backdrop-blur-sm">
      <div className="flex items-center justify-between px-3 py-1 border-b border-gray-800">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">항해 일지 (Event Log)</span>
        <span className="text-[10px] text-gray-600">{logs.length} entries</span>
      </div>
      <div ref={scrollRef} className="p-2 overflow-y-auto h-[calc(100%-24px)] scrollbar-thin">
        {logs.map((log, idx) => (
          <div key={idx} className={`text-xs leading-relaxed ${TYPE_COLORS[log.type]}`}>
            <span className="text-gray-600 mr-2">[{log.time}]</span>
            {TYPE_PREFIX[log.type]}{log.message}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-xs text-gray-600 italic">항해 로그가 없습니다.</div>
        )}
      </div>
    </div>
  );
};

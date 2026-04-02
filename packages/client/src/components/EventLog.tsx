import React, { useEffect, useRef, useState } from 'react';

interface Props { events: string[]; }

export default function EventLog({ events }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [prevLen, setPrevLen] = useState(events.length);
  const [newIdx, setNewIdx]   = useState<number | null>(null);

  useEffect(() => {
    if (events.length > prevLen) {
      setNewIdx(events.length - 1);
      setTimeout(() => setNewIdx(null), 1200);
      setPrevLen(events.length);
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const recent = events.slice(-25);

  return (
    <div style={{
      background: '#111827', borderRadius: 12, border: '1px solid #1e3a5f', overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 12px', background: '#0d1830',
        borderBottom: '1px solid #1e3a5f',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 11, color: '#546a8a', fontWeight: 600, letterSpacing: '0.08em' }}>
          PROTOKOLL
        </span>
        <div style={{
          marginLeft: 'auto', fontSize: 10, color: '#546a8a',
          background: '#1a2540', borderRadius: 4, padding: '1px 5px',
        }}>
          {events.length}
        </div>
      </div>

      <div style={{ height: 180, overflowY: 'auto', padding: '6px 8px' }}>
        {recent.length === 0 && (
          <p style={{ color: '#546a8a', textAlign: 'center', padding: '1rem', fontSize: 12 }}>
            Noch keine Ereignisse…
          </p>
        )}
        {recent.map((evt, i) => {
          const absIdx  = events.length - recent.length + i;
          const isNew   = absIdx === newIdx;
          const isLast  = i === recent.length - 1;
          return (
            <div key={absIdx} style={{
              display: 'flex', gap: 6, padding: '3px 5px', borderRadius: 5,
              fontSize: 11, lineHeight: 1.45, color: isLast ? '#e8edf5' : '#8899b4',
              fontWeight: isLast ? 500 : 400,
              background: isNew ? 'rgba(34,211,163,0.12)' : 'transparent',
              animation: isNew ? 'newEntry 1.2s ease both, slideLeft 0.2s ease both' : 'none',
              transition: 'background 0.4s',
              marginBottom: 1,
            }}>
              <span style={{ color: '#1e3a5f', flexShrink: 0, fontSize: 9, paddingTop: 2 }}>
                {absIdx + 1}
              </span>
              <span>{evt}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

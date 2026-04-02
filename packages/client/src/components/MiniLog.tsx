import React, { useEffect, useRef, useState } from 'react';

interface Props { events: string[]; }

export default function MiniLog({ events }: Props) {
  const [visible, setVisible] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (events.length === 0) return;
    const last3 = events.slice(-3);
    setVisible(last3);

    if (timerRef.current) clearTimeout(timerRef.current);
    // auto-fade after 6 seconds of no new events
    timerRef.current = setTimeout(() => setVisible([]), 6000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [events]);

  if (visible.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 4, pointerEvents: 'none', minWidth: 320, maxWidth: 480,
    }}>
      {visible.map((evt, i) => {
        const isNewest = i === visible.length - 1;
        const age      = visible.length - 1 - i; // 0=newest
        return (
          <div key={i} style={{
            padding: isNewest ? '8px 18px' : '5px 14px',
            borderRadius: 20,
            background: isNewest
              ? 'rgba(34,211,163,0.18)'
              : `rgba(26,37,64,${0.7 - age * 0.2})`,
            border: isNewest
              ? '1px solid rgba(34,211,163,0.35)'
              : `1px solid rgba(30,58,95,${0.5 - age * 0.15})`,
            backdropFilter: 'blur(8px)',
            fontSize: isNewest ? 14 : 11 - age,
            fontWeight: isNewest ? 700 : 400,
            color: isNewest ? '#e8edf5' : `rgba(136,153,180,${0.9 - age * 0.25})`,
            textAlign: 'center',
            opacity: 1 - age * 0.3,
            transition: 'all 0.4s ease',
            animation: isNewest ? 'slideUp 0.25s ease both' : 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 480,
          }}>
            {evt}
          </div>
        );
      })}
    </div>
  );
}

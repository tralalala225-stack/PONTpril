import React from 'react';

export const MeanderDivider: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`flex items-center justify-center w-full select-none py-2 ${className}`}
      aria-hidden="true"
    >
      <div
        className="h-[1px] flex-1"
        style={{
          background:
            'linear-gradient(90deg, rgba(11,15,20,0) 0%, rgba(154,123,56,0.45) 65%, #D4AF37 100%)',
        }}
      />
      <div className="mx-3 flex items-center gap-1.5 text-[#D4AF37]">
        <span className="w-1.5 h-1.5 rotate-45 border border-[#9A7B38] bg-[#121820]" />
        <svg
          width="36"
          height="14"
          viewBox="0 0 36 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[#D4AF37]"
        >
          <path
            d="M1 13V1H11V9H5V5H8M13 13V1H23V9H17V5H20M25 13V1H35V9H29V5H32"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="square"
          />
        </svg>
        <span className="w-1.5 h-1.5 rotate-45 border border-[#9A7B38] bg-[#121820]" />
      </div>
      <div
        className="h-[1px] flex-1"
        style={{
          background:
            'linear-gradient(270deg, rgba(11,15,20,0) 0%, rgba(154,123,56,0.45) 65%, #D4AF37 100%)',
        }}
      />
    </div>
  );
};

/**
 * Золотой лавровый венок Понта — обрамляет монограмму, иконку или цифру
 */
export const LaurelWreathBadge: React.FC<{
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'gold' | 'olive' | 'crimson';
  title?: string;
}> = ({ children, size = 'md', tone = 'gold', title }) => {
  const dim =
    size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12';
  const strokeColor =
    tone === 'olive' ? '#8EBDA2' : tone === 'crimson' ? '#F1A9B2' : '#E5C158';
  const leafFill =
    tone === 'olive'
      ? 'rgba(142, 189, 162, 0.22)'
      : tone === 'crimson'
        ? 'rgba(192, 57, 43, 0.25)'
        : 'rgba(212, 175, 55, 0.22)';

  return (
    <div
      className={`${dim} relative flex items-center justify-center select-none shrink-0`}
      title={title}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
      >
        {/* Inner subtle medallion ring */}
        <circle
          cx="32"
          cy="32"
          r="21"
          fill="#0B0F14"
          stroke={strokeColor}
          strokeOpacity="0.35"
          strokeWidth="1"
        />
        {/* Left Laurel Branch */}
        <path
          d="M32 56C17 53 9 41 10 25C11 16 16 9 23 6"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Right Laurel Branch */}
        <path
          d="M32 56C47 53 55 41 54 25C53 16 48 9 41 6"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Left Leaves */}
        <path
          d="M18 48C13 46 11 41 14 39C17 41 19 45 18 48ZM12 38C8 34 8 29 12 28C14 31 14 35 12 38ZM12 26C10 21 12 16 16 16C17 20 15 24 12 26ZM17 15C17 10 20 7 24 8C23 12 20 14 17 15Z"
          fill={leafFill}
          stroke={strokeColor}
          strokeWidth="1.1"
        />
        {/* Right Leaves */}
        <path
          d="M46 48C51 46 53 41 50 39C47 41 45 45 46 48ZM52 38C56 34 56 29 52 28C50 31 50 35 52 38ZM52 26C54 21 52 16 48 16C47 20 49 24 52 26ZM47 15C47 10 44 7 40 8C41 12 44 14 47 15Z"
          fill={leafFill}
          stroke={strokeColor}
          strokeWidth="1.1"
        />
        {/* Bottom Ribbon Tie */}
        <path
          d="M27 58L32 54L37 58M29 55L25 61M35 55L39 61"
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* Top Crown Star */}
        <circle cx="32" cy="6" r="2" fill={strokeColor} />
      </svg>
      <div className="relative z-10 flex items-center justify-center text-[#F3E5AB] font-epigraphic font-bold text-xs">
        {children}
      </div>
    </div>
  );
};

/**
 * Горизонтальный лавровый фриз для заголовков карточек и секций
 */
export const LaurelHeaderDivider: React.FC<{ label?: string }> = ({ label }) => {
  return (
    <div className="flex items-center justify-center gap-3 py-1 select-none" aria-hidden="true">
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#9A7B38]/50 to-[#D4AF37]" />
      <div className="flex items-center gap-2 text-[#D4AF37]">
        {/* Left mini laurel */}
        <svg width="28" height="14" viewBox="0 0 28 14" fill="none">
          <path
            d="M27 7H3M22 7C19 3 15 3 13 7C15 11 19 11 22 7ZM13 7C10 3 6 3 4 7C6 11 10 11 13 7Z"
            stroke="#D4AF37"
            strokeWidth="1.2"
          />
        </svg>
        {label && (
          <span className="font-epigraphic text-[10px] uppercase tracking-[0.2em] text-[#E5C158]">
            {label}
          </span>
        )}
        {/* Right mini laurel */}
        <svg width="28" height="14" viewBox="0 0 28 14" fill="none">
          <path
            d="M1 7H25M6 7C9 3 13 3 15 7C13 11 9 11 6 7ZM15 7C18 3 22 3 24 7C22 11 18 11 15 7Z"
            stroke="#D4AF37"
            strokeWidth="1.2"
          />
        </svg>
      </div>
      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#9A7B38]/50 to-[#D4AF37]" />
    </div>
  );
};

export const WaxSealBadge: React.FC<{
  sigil?: 'EUPATOR' | 'STRATIOS' | 'EUXINUS';
  size?: 'sm' | 'md';
}> = ({ sigil = 'EUPATOR', size = 'md' }) => {
  const dim = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center select-none shrink-0 relative`}
      style={{
        background:
          'radial-gradient(circle at 35% 30%, #A93243 0%, #8B2635 60%, #58141E 100%)',
        boxShadow:
          'inset 0 1px 2px rgba(255, 180, 185, 0.35), inset 0 -2px 4px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.65)',
        border: '1.5px solid #C0392B',
      }}
      title={`Восковая печать: ${sigil}`}
    >
      <div className="w-[78%] h-[78%] rounded-full border border-[#F3E5AB]/35 flex items-center justify-center text-[#F3E5AB]">
        {sigil === 'EUPATOR' && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M15.5 4.5C11.5 5.2 9 8.5 9 12.5C9 16.5 11.5 19.8 15.5 20.5C12.8 19 11.2 16 11.2 12.5C11.2 9 12.8 6 15.5 4.5Z"
              fill="#F3E5AB"
            />
            <path
              d="M16 9L16 16M12.5 12.5L19.5 12.5M13.5 10L18.5 15M18.5 10L13.5 15"
              stroke="#F3E5AB"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        )}
        {sigil === 'STRATIOS' && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3V21M12 7C8 5 6 7 6 10C6 13 8 15 12 13M12 7C16 5 18 7 18 10C18 13 16 15 12 13"
              stroke="#F3E5AB"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
        {sigil === 'EUXINUS' && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4V20M8 6V10C8 12.2 9.8 14 12 14C14.2 14 16 12.2 16 10V6M9 19H15"
              stroke="#F3E5AB"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
};

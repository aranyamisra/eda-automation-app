import React from 'react';
import { Box, Typography } from '@mui/material';

const DataGenieLogo = ({ size = 'medium', showText = true, animated = false }) => {
  const sizes = {
    small: { logoSize: 28, fontSize: '1rem' },
    medium: { logoSize: 40, fontSize: '1.25rem' },
    large: { logoSize: 56, fontSize: '1.5rem' },
    xl: { logoSize: 72, fontSize: '2rem' }
  };

  const { logoSize, fontSize } = sizes[size];

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: showText ? 1.5 : 0,
      cursor: 'pointer',
      '&:hover .genie-lamp': animated ? {
        transform: 'rotate(-3deg) scale(1.05)',
        filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))',
      } : {}
    }}>
      {/* Realistic Genie Lamp */}
      <Box
        className="genie-lamp"
        sx={{
          width: logoSize,
          height: logoSize,
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        <svg
          width={logoSize}
          height={logoSize}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Lamp Body Gradient */}
            <linearGradient id={`lampGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="30%" stopColor="#ffed4e" />
              <stop offset="70%" stopColor="#ffc107" />
              <stop offset="100%" stopColor="#ff8f00" />
            </linearGradient>
            
            {/* Lamp Shadow Gradient */}
            <linearGradient id={`shadowGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b8860b" />
              <stop offset="100%" stopColor="#8b6914" />
            </linearGradient>
            
            {/* Magic Smoke Gradient */}
            <linearGradient id={`smokeGradient-${size}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e3f2fd" />
              <stop offset="50%" stopColor="#90caf9" />
              <stop offset="100%" stopColor="#42a5f5" />
            </linearGradient>
            
            {/* Data Stream Gradient */}
            <linearGradient id={`dataGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4caf50" />
              <stop offset="50%" stopColor="#66bb6a" />
              <stop offset="100%" stopColor="#81c784" />
            </linearGradient>
            
            {/* Lamp Highlight */}
            <radialGradient id={`highlight-${size}`} cx="40%" cy="30%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            
            {/* Glow Filter */}
            <filter id={`glow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Magical Smoke/Data Stream */}
          <g opacity="0.8">
            {/* Curly smoke wisps */}
            <path
              d="M75 35 Q80 30, 85 32 Q90 28, 95 30 Q88 25, 85 28 Q82 24, 78 26"
              fill={`url(#smokeGradient-${size})`}
              opacity="0.7"
            >
              {animated && (
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0,0; 2,-2; 0,0"
                  dur="3s"
                  repeatCount="indefinite"
                />
              )}
            </path>
            
            <path
              d="M85 28 Q88 22, 92 24 Q96 20, 100 22 Q94 18, 90 20 Q87 16, 83 18"
              fill={`url(#smokeGradient-${size})`}
              opacity="0.6"
            >
              {animated && (
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0,0; -1,-3; 0,0"
                  dur="4s"
                  repeatCount="indefinite"
                />
              )}
            </path>
            
            <path
              d="M92 20 Q95 15, 98 17 Q102 13, 105 15 Q100 11, 96 13 Q93 9, 89 11"
              fill={`url(#smokeGradient-${size})`}
              opacity="0.5"
            >
              {animated && (
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0,0; 1,-2; 0,0"
                  dur="5s"
                  repeatCount="indefinite"
                />
              )}
            </path>
          </g>

          {/* Data Points in Smoke */}
          <g opacity="0.9">
                         <circle cx="88" cy="25" r="1.5" fill={`url(#dataGradient-${size})`}>
               {animated && (
                 <>
                   <animate attributeName="cy" values="25;20;25" dur="2s" repeatCount="indefinite" />
                   <animate attributeName="opacity" values="0.9;1;0.9" dur="2s" repeatCount="indefinite" />
                 </>
               )}
             </circle>
             <circle cx="95" cy="18" r="1" fill={`url(#dataGradient-${size})`}>
               {animated && (
                 <>
                   <animate attributeName="cy" values="18;13;18" dur="2.5s" repeatCount="indefinite" />
                   <animate attributeName="opacity" values="0.9;1;0.9" dur="2.5s" repeatCount="indefinite" />
                 </>
               )}
             </circle>
             <circle cx="100" cy="15" r="0.8" fill={`url(#dataGradient-${size})`}>
               {animated && (
                 <>
                   <animate attributeName="cy" values="15;10;15" dur="3s" repeatCount="indefinite" />
                   <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" />
                 </>
               )}
             </circle>
          </g>

          {/* Lamp Base/Stand */}
          <ellipse 
            cx="60" 
            cy="95" 
            rx="25" 
            ry="6" 
            fill={`url(#shadowGradient-${size})`}
            opacity="0.8"
          />
          
          {/* Main Lamp Body */}
          <path
            d="M35 50 
               C35 40, 45 35, 60 35 
               C75 35, 85 40, 85 50 
               L85 75 
               C85 82, 78 88, 70 88 
               L50 88 
               C42 88, 35 82, 35 75 
               Z"
            fill={`url(#lampGradient-${size})`}
            stroke={`url(#shadowGradient-${size})`}
            strokeWidth="1"
            filter={animated ? `url(#glow-${size})` : undefined}
          />

          {/* Lamp Spout */}
          <path
            d="M75 45 
               C85 42, 95 40, 105 35 
               C108 33, 106 30, 101 32 
               C95 35, 85 40, 75 42
               Z"
            fill={`url(#lampGradient-${size})`}
            stroke={`url(#shadowGradient-${size})`}
            strokeWidth="1"
          />

          {/* Lamp Handle */}
          <path
            d="M40 60 
               C30 60, 25 55, 27 50 
               C29 47, 33 49, 35 52"
            fill="none"
            stroke={`url(#lampGradient-${size})`}
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Lamp Lid */}
          <ellipse 
            cx="60" 
            cy="35" 
            rx="25" 
            ry="8" 
            fill={`url(#lampGradient-${size})`}
            stroke={`url(#shadowGradient-${size})`}
            strokeWidth="1"
          />
          
          {/* Lid Knob */}
          <circle 
            cx="60" 
            cy="35" 
            r="3" 
            fill={`url(#shadowGradient-${size})`}
          />

          {/* Lamp Body Highlight */}
          <ellipse
            cx="55"
            cy="55"
            rx="15"
            ry="20"
            fill={`url(#highlight-${size})`}
            opacity="0.6"
          />

          {/* Data Visualization Elements on Lamp */}
          <g opacity="0.8">
            {/* Mini Bar Chart */}
            <rect x="50" y="65" width="3" height="8" fill="rgba(76, 175, 80, 0.8)" />
            <rect x="54" y="62" width="3" height="11" fill="rgba(76, 175, 80, 0.8)" />
            <rect x="58" y="67" width="3" height="6" fill="rgba(76, 175, 80, 0.8)" />
            <rect x="62" y="64" width="3" height="9" fill="rgba(76, 175, 80, 0.8)" />
            
            {/* Data Connection Lines */}
            <path 
              d="M52 65 L56 62 L60 67 L64 64" 
              stroke="rgba(255,255,255,0.7)" 
              strokeWidth="1" 
              fill="none"
              opacity="0.8"
            />
            
            {/* Data Points */}
            <circle cx="52" cy="58" r="1.5" fill="rgba(255,255,255,0.9)" />
            <circle cx="60" cy="55" r="1.5" fill="rgba(255,255,255,0.9)" />
            <circle cx="68" cy="60" r="1.5" fill="rgba(255,255,255,0.9)" />
          </g>

          {/* Decorative Patterns on Lamp */}
          <g opacity="0.4">
            <path 
              d="M45 45 Q60 42, 75 45" 
              stroke={`url(#shadowGradient-${size})`}
              strokeWidth="1" 
              fill="none"
            />
            <path 
              d="M40 70 Q60 67, 80 70" 
              stroke={`url(#shadowGradient-${size})`}
              strokeWidth="1" 
              fill="none"
            />
          </g>

        </svg>
      </Box>

      {/* DataGenie Text */}
      {showText && (
        <Typography
          variant="h6"
          sx={{
            fontSize: fontSize,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #ffd700 0%, #ff8f00 50%, #4caf50 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: '"Inter", "Roboto", sans-serif',
            letterSpacing: '-0.5px',
            textShadow: animated ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          DataGenie
        </Typography>
      )}
    </Box>
  );
};

export default DataGenieLogo; 
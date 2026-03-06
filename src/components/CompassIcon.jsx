import React from 'react';

const CompassIcon = ({ size = 48, color = "white", className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        className={className}
    >
        {/* Legs vertically angled */}
        <polygon points="40,20 50,20 30,80 15,95" fill={color} />
        <polygon points="60,20 50,20 70,80 85,95" fill={color} />

        {/* Crossbar */}
        <rect x="15" y="62" width="70" height="10" rx="4" fill={color} />

        {/* Vertical Tick under Pin */}
        <rect x="46" y="55" width="8" height="24" rx="4" fill={color} />

        {/* Pin Head */}
        <path fillRule="evenodd" clipRule="evenodd" d="M 50 2 C 40 2 32 10 32 20 C 32 32 50 52 50 52 C 50 52 68 32 68 20 C 68 10 60 2 50 2 Z M 50 13 A 7 7 0 1 1 50 27 A 7 7 0 1 1 50 13 Z" fill={color} />
    </svg>
);

export default CompassIcon;

import React from 'react';

interface TimLogoProps {
  className?: string;
  variant?: 'white' | 'blue';
}

export const TimLogo: React.FC<TimLogoProps> = ({ 
  className = "h-7", 
  variant = 'white' 
}) => {
  // Cor das letras TIM: Branco (#FFFFFF) ou Azul Royal Oficial (#002B7F)
  const textColor = variant === 'blue' ? '#002B7F' : '#FFFFFF';

  return (
    <svg
      viewBox="0 0 280 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none pointer-events-none ${className}`}
    >
      {/* ========================================================= */}
      {/* 1. ÍCONE OFICIAL TIM: O 'T' TRIGRAMA EM 5 BLOCOS VERMELHOS */}
      {/* ========================================================= */}

      {/* Bloco Superior (Traço horizontal do T) */}
      <rect x="0" y="0" width="94" height="18" rx="9" fill="#ED1C24" />

      {/* Linha do Meio - Pilar Esquerdo e Pilar Direito */}
      <rect x="0" y="32" width="40" height="18" rx="9" fill="#ED1C24" />
      <rect x="54" y="32" width="40" height="18" rx="9" fill="#ED1C24" />

      {/* Linha Inferior - Pilar Esquerdo e Pilar Direito */}
      <rect x="0" y="64" width="40" height="18" rx="9" fill="#ED1C24" />
      <rect x="54" y="64" width="40" height="18" rx="9" fill="#ED1C24" />

      {/* ========================================================= */}
      {/* 2. TIPOGRAFIA OFICIAL TIM EM VETOR MATRICIAL DEFINITIVO  */}
      {/* ========================================================= */}

      {/* Letra 'T' */}
      <path
        d="M120 0 H164 V18 H149 V82 H135 V18 H120 V0 Z"
        fill={textColor}
      />

      {/* Letra 'I' */}
      <path
        d="M176 0 H191 V82 H176 V0 Z"
        fill={textColor}
      />

      {/* Letra 'M' (Geometria precisa do manual da marca) */}
      <path
        d="M203 0 H218 L235 44 L252 0 H267 V82 H253 V26 L239 63 H231 L217 26 V82 H203 V0 Z"
        fill={textColor}
      />
    </svg>
  );
};

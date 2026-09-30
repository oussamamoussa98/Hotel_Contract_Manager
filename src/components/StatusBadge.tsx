import React from 'react';
import { EntryStatus } from '../types';
import { Check, Code2, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: EntryStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs font-semibold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  switch (status) {
    case 'SAISI':
      return (
        <span
          id={`status-badge-${status.toLowerCase()}`}
          className={`inline-flex items-center rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300/80 font-semibold tracking-tight shadow-2xs ${sizeClasses[size]} ${className}`}
          title="Contrat saisi et validé dans le système"
        >
          {showIcon && <Check className={`${iconSizes[size]} text-emerald-600 stroke-[2.5] flex-shrink-0`} aria-hidden="true" />}
          <span>Saisi</span>
        </span>
      );

    case 'XML':
      return (
        <span
          id={`status-badge-${status.toLowerCase()}`}
          className={`inline-flex items-center rounded-md bg-blue-50 text-blue-800 border border-blue-300/80 font-semibold tracking-tight shadow-2xs ${sizeClasses[size]} ${className}`}
          title="Flux tarifaire XML automatisé"
        >
          {showIcon && <Code2 className={`${iconSizes[size]} text-blue-600 stroke-[2.5] flex-shrink-0`} aria-hidden="true" />}
          <span>XML</span>
        </span>
      );

    case 'NON_SAISI':
    default:
      return (
        <span
          id={`status-badge-${status.toLowerCase()}`}
          className={`inline-flex items-center rounded-md bg-rose-50 text-rose-800 border border-rose-300 font-semibold tracking-tight shadow-2xs ${sizeClasses[size]} ${className}`}
          title="En attente de saisie dans le système"
        >
          {showIcon && <AlertCircle className={`${iconSizes[size]} text-rose-600 stroke-[2.5] flex-shrink-0`} aria-hidden="true" />}
          <span>Non Saisi</span>
        </span>
      );
  }
};


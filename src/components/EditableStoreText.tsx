import React from 'react';
import { Edit3 } from 'lucide-react';
import { StoreCustomTexts } from '../types';

interface EditableStoreTextProps {
  textKey: keyof StoreCustomTexts;
  value: string;
  isAdmin?: boolean;
  onOpenEditor?: (key: keyof StoreCustomTexts) => void;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  isButtonInline?: boolean;
  pencilClassName?: string;
}

export const EditableStoreText: React.FC<EditableStoreTextProps> = ({
  textKey,
  value,
  isAdmin = false,
  onOpenEditor,
  className = '',
  as = 'span',
  isButtonInline = false,
  pencilClassName = 'text-amber-400'
}) => {
  const isBlank = !value || value.trim() === '';

  // Si el texto está vacío y no es admin, ocultar el elemento por completo (return null)
  if (isBlank) {
    if (!isAdmin || !onOpenEditor) {
      return null;
    }
    // Si es admin y el texto está vacío, mostrar botón discreto para permitir volver a redactar
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenEditor(textKey);
        }}
        className="inline-flex items-center gap-1 text-[8.5px] px-1.5 py-0.5 rounded bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-dashed border-amber-400/30 cursor-pointer transition-all my-0.5"
        title={`Escribir texto para: ${String(textKey)}`}
      >
        <Edit3 size={10} />
        <span>+ {String(textKey)}</span>
      </button>
    );
  }

  const Tag = as;

  if (!isAdmin || !onOpenEditor) {
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <Tag className={`group/edit relative inline-flex items-center gap-1.5 ${className}`}>
      <span>{value}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenEditor(textKey);
        }}
        className={`opacity-40 group-hover/edit:opacity-100 hover:scale-110 transition-all p-1 rounded-md bg-amber-400/20 hover:bg-amber-400 text-black border border-amber-400/40 cursor-pointer shadow-sm ml-1 shrink-0 ${pencilClassName}`}
        title={`Editar texto: "${value.slice(0, 30)}..."`}
        aria-label="Editar este texto"
      >
        <Edit3 size={11} className="stroke-[2.5]" />
      </button>
    </Tag>
  );
};

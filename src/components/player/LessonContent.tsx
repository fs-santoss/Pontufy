'use client';

import { type ReactNode } from 'react';

interface LessonContentProps {
  content: string;
}

function formatInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-brand-slate">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function LessonContent({ content }: LessonContentProps) {
  if (!content) {
    return <p className="text-brand-text italic">Conteudo da aula nao disponivel.</p>;
  }

  const lines = content.split('\n');
  const elements: ReactNode[] = [];
  let currentParagraph: string[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let key = 0;

  const flush = () => {
    if (currentList) {
      const items = currentList.items;
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={key++} className="list-disc ml-6 space-y-1.5 mb-4 text-brand-slate/80">
            {items.map((item, i) => <li key={i} className="leading-relaxed">{formatInline(item)}</li>)}
          </ul>,
        );
      } else {
        elements.push(
          <ol key={key++} className="list-decimal ml-6 space-y-1.5 mb-4 text-brand-slate/80">
            {items.map((item, i) => <li key={i} className="leading-relaxed">{formatInline(item)}</li>)}
          </ol>,
        );
      }
      currentList = null;
    }
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ');
      if (text.trim()) {
        elements.push(
          <p key={key++} className="mb-4 leading-relaxed text-brand-slate/80">{formatInline(text)}</p>,
        );
      }
      currentParagraph = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      flush();
      elements.push(
        <h2 key={key++} className="text-xl font-bold text-brand-slate mt-8 mb-3 first:mt-0">
          {formatInline(trimmed.slice(3))}
        </h2>,
      );
    } else if (trimmed.startsWith('### ')) {
      flush();
      elements.push(
        <h3 key={key++} className="text-lg font-semibold text-brand-slate mt-6 mb-2">
          {formatInline(trimmed.slice(4))}
        </h3>,
      );
    } else if (/^[-*]\s/.test(trimmed)) {
      if (currentParagraph.length > 0) flush();
      if (!currentList || currentList.type !== 'ul') {
        if (currentList) flush();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(trimmed.replace(/^[-*]\s/, ''));
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (currentParagraph.length > 0) flush();
      if (!currentList || currentList.type !== 'ol') {
        if (currentList) flush();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(trimmed.replace(/^\d+\.\s/, ''));
    } else if (trimmed === '') {
      flush();
    } else {
      if (currentList) flush();
      currentParagraph.push(trimmed);
    }
  }
  flush();

  return <div className="lesson-content">{elements}</div>;
}

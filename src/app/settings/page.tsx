// src/app/settings/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { TranscriptionConfig } from '@/types'

export default function SettingsPage() {
  const [config, setConfig] = useState<TranscriptionConfig>(() => ({
    language: 'en-US',
    continuous: true,
    interimResults: true,
    autoSave: false,
    maxDuration: 4 * 60 * 60 * 1000,
    chunkInterval: 5 * 60 * 1000,
    autoPause: {
      enabled: false,
      silenceThreshold: 2000
    },
    keywords: {}  // Initialize with empty object
  }));

  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');

  const addCategory = () => {
    if (newCategory && (!config.keywords || !(newCategory in config.keywords))) {
      setConfig(prev => ({
        ...prev,
        keywords: {
          ...(prev.keywords || {}),
          [newCategory]: []
        }
      }));
      setNewCategory('');
    }
  };

  const addKeyword = () => {
    if (
      newKeyword && 
      selectedCategory && 
      config.keywords && 
      config.keywords[selectedCategory] &&
      !config.keywords[selectedCategory].includes(newKeyword)
    ) {
      setConfig(prev => ({
        ...prev,
        keywords: {
          ...(prev.keywords || {}),
          [selectedCategory]: [
            ...(prev.keywords?.[selectedCategory] || []),
            newKeyword
          ]
        }
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (category: string, keyword: string) => {
    setConfig(prev => ({
      ...prev,
      keywords: {
        ...(prev.keywords || {}),
        [category]: prev.keywords?.[category]?.filter(k => k !== keyword) || []
      }
    }));
  };

  const removeCategory = (category: string) => {
    setConfig(prev => {
      const newKeywords = { ...(prev.keywords || {}) };
      delete newKeywords[category];
      return {
        ...prev,
        keywords: newKeywords
      };
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-gray-300 hover:text-white">
          <ArrowLeft className="mr-2" />
          Back to Transcriber
        </Link>
      </div>

      {/* Rest of your JSX */}
    </div>
  );
}
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sun, Moon, BookOpen, Eye, Leaf, Palette, Coffee, Monitor } from 'lucide-react';

export type ReadingMode = 'normal' | 'dark' | 'sepia' | 'paper' | 'focus' | 'eye-care' | 'green' | 'warm';

export interface ReadingModeConfig {
  id: ReadingMode;
  label: string;
  icon: React.ReactNode;
  preview: string;
  filter: string;
  canvasBg: string;
}

export const readingModes: ReadingModeConfig[] = [
  {
    id: 'normal',
    label: 'عادي',
    icon: <Sun className="h-4 w-4" />,
    preview: '#ffffff',
    filter: 'none',
    canvasBg: 'white',
  },
  {
    id: 'dark',
    label: 'ليلي',
    icon: <Moon className="h-4 w-4" />,
    preview: '#1a1a2e',
    filter: 'invert(1) hue-rotate(180deg)',
    canvasBg: '#1a1a2e',
  },
  {
    id: 'sepia',
    label: 'بني دافئ',
    icon: <Coffee className="h-4 w-4" />,
    preview: '#d4a574',
    filter: 'sepia(90%) saturate(70%) brightness(85%) contrast(105%)',
    canvasBg: '#e8d5b0',
  },
  {
    id: 'paper',
    label: 'ورقي',
    icon: <BookOpen className="h-4 w-4" />,
    preview: '#f5f0e1',
    filter: 'sepia(45%) brightness(92%) contrast(90%) saturate(75%)',
    canvasBg: '#f0e8d8',
  },
  {
    id: 'focus',
    label: 'تركيز',
    icon: <Eye className="h-4 w-4" />,
    preview: '#2d2d2d',
    filter: 'brightness(80%) contrast(140%) saturate(0%)',
    canvasBg: '#1a1a1a',
  },
  {
    id: 'eye-care',
    label: 'حماية العين',
    icon: <Monitor className="h-4 w-4" />,
    preview: '#ffeebb',
    filter: 'sepia(60%) saturate(50%) brightness(92%) hue-rotate(-15deg)',
    canvasBg: '#fff0c8',
  },
  {
    id: 'green',
    label: 'أخضر مريح',
    icon: <Leaf className="h-4 w-4" />,
    preview: '#b5d6b2',
    filter: 'sepia(40%) saturate(60%) brightness(92%) hue-rotate(80deg)',
    canvasBg: '#d0ecd0',
  },
  {
    id: 'warm',
    label: 'دافئ',
    icon: <Palette className="h-4 w-4" />,
    preview: '#ffccaa',
    filter: 'sepia(70%) saturate(50%) brightness(95%) hue-rotate(-5deg)',
    canvasBg: '#ffe8d0',
  },
];

export function getReadingModeConfig(mode: ReadingMode): ReadingModeConfig {
  return readingModes.find((m) => m.id === mode) || readingModes[0];
}

interface ReadingModeSelectorProps {
  selectedMode: ReadingMode;
  onModeChange: (mode: ReadingMode) => void;
}

const ReadingModeSelector = ({ selectedMode, onModeChange }: ReadingModeSelectorProps) => {
  const current = getReadingModeConfig(selectedMode);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full hover:bg-accent"
          title={`وضع القراءة: ${current.label}`}
        >
          {current.icon}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="w-64 p-3"
      >
        <p className="text-xs font-semibold text-muted-foreground mb-3 text-center font-cairo">
          🎨 وضع القراءة
        </p>
        <div className="grid grid-cols-2 gap-2">
          {readingModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-cairo transition-all duration-200 ${
                selectedMode === mode.id
                  ? 'ring-2 ring-primary shadow-md scale-[1.02]'
                  : 'hover:bg-accent/80 hover:scale-[1.01]'
              }`}
              style={{
                backgroundColor: selectedMode === mode.id ? mode.preview + '30' : undefined,
              }}
            >
              <span
                className="w-5 h-5 rounded-full border-2 flex-shrink-0 shadow-sm"
                style={{
                  backgroundColor: mode.preview,
                  borderColor: selectedMode === mode.id ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                }}
              />
              <span className="truncate font-medium">{mode.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ReadingModeSelector;

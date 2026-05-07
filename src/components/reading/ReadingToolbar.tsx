import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw,
  Maximize,
  Minimize,
  Bookmark,
  Settings,
  Download,
  Share2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface ReadingToolbarProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  isFullscreen: boolean;
  isAutoReading: boolean;
  soundEnabled: boolean;
  showToolbar: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleFullscreen: () => void;
  onToggleAutoReading: () => void;
  onToggleSound: () => void;
  onToggleToolbar: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onShare: () => void;
  onDownload: () => void;
  onSettings: () => void;
  onBookmark: () => void;
}

const ReadingToolbar = ({
  currentPage,
  totalPages,
  zoom,
  isFullscreen,
  isAutoReading,
  soundEnabled,
  showToolbar,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFullscreen,
  onToggleAutoReading,
  onToggleSound,
  onToggleToolbar,
  onPrevPage,
  onNextPage,
  onFirstPage,
  onLastPage,
  onShare,
  onDownload,
  onSettings,
  onBookmark
}: ReadingToolbarProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <AnimatePresence>
      {showToolbar && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border shadow-lg"
        >
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">
                <span className="font-amiri">صفحة {currentPage} من {totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onFirstPage} disabled={currentPage <= 1}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onPrevPage} disabled={currentPage <= 1}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onNextPage} disabled={currentPage >= totalPages}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onLastPage} disabled={currentPage >= totalPages}>
                  <SkipForward className="h-4 w-4" />
                </Button>

                <Separator orientation="vertical" className="h-6 mx-2" />

                <Button variant="ghost" size="sm" onClick={onZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onResetZoom}>
                  <span className="text-xs">{zoom}%</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={onZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>

                <Separator orientation="vertical" className="h-6 mx-2" />

                <Button variant={isAutoReading ? "default" : "ghost"} size="sm" onClick={onToggleAutoReading}>
                  {isAutoReading ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant={soundEnabled ? "default" : "ghost"} size="sm" onClick={onToggleSound}>
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={onToggleFullscreen}>
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onBookmark}>
                  <Bookmark className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onDownload}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onSettings}>
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onToggleToolbar}>
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReadingToolbar;
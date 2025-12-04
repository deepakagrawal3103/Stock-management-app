import React, { useState, useEffect } from 'react';
import { getRoughWork, saveRoughWork } from '../services/storage';
import { Button, Card, Textarea } from './ui/Common';
import { Eraser, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const RoughWork: React.FC = () => {
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setContent(getRoughWork());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setContent(newVal);
    saveRoughWork(newVal);
    setLastSaved(new Date());
  };

  const handleClear = () => {
    if (confirm("Clear all notes?")) {
      setContent('');
      saveRoughWork('');
      setLastSaved(new Date());
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full">
      <Card className="h-full flex flex-col bg-amber-50/30 border-amber-200/60 shadow-lg shadow-amber-500/5">
        <div className="flex justify-between items-center p-4 border-b border-amber-100 bg-amber-50/50 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
              Scratchpad
            </h2>
            <AnimatePresence mode="wait">
              {lastSaved && (
                <motion.div 
                  key={lastSaved.getTime()}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 text-xs text-amber-600/80 font-medium mt-0.5"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button size="sm" variant="ghost" onClick={handleClear} icon={Eraser} className="text-amber-700 hover:bg-amber-100/50 hover:text-amber-900">
            Clear
          </Button>
        </div>
        <div className="flex-1 p-4">
          <textarea
            value={content}
            onChange={handleChange}
            className="w-full h-full p-4 rounded-xl border-0 bg-white/60 focus:bg-white focus:ring-2 focus:ring-amber-400/50 text-gray-800 font-mono text-sm leading-relaxed resize-none shadow-inner transition-all placeholder-amber-900/20"
            placeholder="Type your rough notes here..."
          />
        </div>
      </Card>
    </motion.div>
  );
};
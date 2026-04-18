/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Sparkles, 
  Scissors, 
  Video, 
  CheckCircle, 
  AlertCircle, 
  Zap,
  ChevronRight,
  Download,
  Play,
  Maximize
} from 'lucide-react';
import { ProcessingStatus, ClipMetadata } from './types';
import { analyzeVideo, fileToBase64 } from './services/geminiService';

export default function App() {
  const [status, setStatus] = useState<ProcessingStatus>({
    status: 'idle',
    progress: 0
  });
  const [processedClips, setProcessedClips] = useState<{ id: string, localUrl: string, metadata: ClipMetadata }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatus({ status: 'idle', progress: 0 });
    }
  };

  const startProcessing = async () => {
    if (!selectedFile) return;

    try {
      setStatus({ status: 'uploading', progress: 20 });
      const formData = new FormData();
      formData.append('video', selectedFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        let errorMessage = 'Upload failed';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = `Server Error: ${uploadResponse.status}`;
        }
        throw new Error(errorMessage);
      }

      const uploadData = await uploadResponse.json();
      const videoId = uploadData.id;

      setStatus({ status: 'analyzing', progress: 50 });
      const base64 = await fileToBase64(selectedFile);
      const clipsMetadata = await analyzeVideo(base64, selectedFile.type);

      setStatus({ status: 'clipping', progress: 80 });
      const clips: { id: string, localUrl: string, metadata: ClipMetadata }[] = [];
      
      for (const meta of clipsMetadata) {
        const res = await fetch('/api/create-clip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            startTime: meta.startTime,
            endTime: meta.endTime,
            cropCenter: meta.speakerPosition
          })
        });

        if (!res.ok) {
          const errorText = await res.text();
          let errorMessage = 'Clipping failed';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            errorMessage = `Clipping Error: ${res.status}`;
          }
          throw new Error(errorMessage);
        }

        const clipData = await res.json();
        clips.push({ id: meta.id, localUrl: clipData.url, metadata: meta });
      }

      setProcessedClips(clips);
      setStatus({ status: 'completed', progress: 100 });
    } catch (error) {
      console.error(error);
      setStatus({ status: 'error', progress: 0, error: 'Processing failed. Please try a shorter video.' });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-bg text-text-main overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center px-6 justify-between blur-header z-20 shrink-0">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
            <Zap size={14} className="text-white fill-current" />
          </div>
          AttentionX AI
        </div>
        <div className="flex gap-3">
          {processedClips.length > 0 && (
            <button className="btn-primary px-4 py-2 text-sm rounded-lg font-semibold flex items-center gap-2">
              <Download size={16} /> Export All Clips
            </button>
          )}
        </div>
      </header>

      {/* Container */}
      <div className="flex-1 flex min-h-0 container max-w-none p-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[280px] border-r border-border bg-[#0C0C0E] p-6 flex flex-col gap-8 overflow-y-auto shrink-0">
          <div className="flex flex-col gap-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-text-dim">Workspace</div>
            <nav className="flex flex-col gap-1">
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main text-left">
                <Video size={16} className="text-primary" /> Active Project
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-dim hover:bg-surface/50 text-sm text-left transition-colors">
                <Sparkles size={16} /> All Media
              </button>
            </nav>
          </div>

          <div className="flex flex-col gap-4 mt-auto">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-text-dim">Source Video</div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`
                border border-dashed rounded-xl p-6 transition-all cursor-pointer text-center
                ${selectedFile ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-text-dim/30 bg-white/5'}
              `}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="video/*" />
              <div className="space-y-2">
                {selectedFile ? (
                  <>
                    <p className="text-xs font-medium truncate text-text-main">{selectedFile.name}</p>
                    <p className="text-[10px] text-text-dim uppercase tracking-widest leading-none">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mx-auto text-text-dim/50" size={24} />
                    <p className="text-xs text-text-dim">Choose long-form video</p>
                  </>
                )}
              </div>
            </div>

            <button
              disabled={!selectedFile || status.status !== 'idle'}
              onClick={startProcessing}
              className="btn-primary w-full py-3 rounded-lg font-bold text-sm tracking-tight uppercase"
            >
              {status.status === 'idle' ? 'Analyze & Repurpose' : 'Processing...'}
            </button>
          </div>
        </aside>

        {/* Main Editor */}
        <main className="flex-1 flex flex-col p-6 gap-6 bg-bg overflow-y-auto min-w-0">
          <div className="flex justify-between items-center shrink-0">
            <h2 className="text-2xl font-bold tracking-tight">Editor View</h2>
            <div className="flex gap-2">
              <span className="text-[11px] font-semibold bg-accent/10 text-accent px-2 py-1 rounded border border-accent/20 flex items-center gap-1 uppercase tracking-wider">
                <CheckCircle size={12} /> AI Tracking Active
              </span>
            </div>
          </div>

          <div className="flex-1 bg-black rounded-2xl border border-border relative flex items-center justify-center overflow-hidden min-h-[400px]">
            {selectedFile ? (
              <video 
                src={URL.createObjectURL(selectedFile)} 
                className="w-full h-full object-contain opacity-40"
              />
            ) : (
              <div className="text-text-dim/20 font-mono text-sm tracking-[0.5em] uppercase">No Source Loaded</div>
            )}
            
            {status.status !== 'idle' && status.status !== 'completed' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10 p-12">
                <div className="w-full max-w-md space-y-6">
                  <div className="flex justify-between text-[11px] uppercase tracking-widest text-text-dim font-bold">
                    <span>{status.status}</span>
                    <span className="text-primary">{status.progress}%</span>
                  </div>
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${status.progress}%` }}
                    />
                  </div>
                  <ul className="grid grid-cols-2 gap-3">
                    <ProcessItem active={status.status === 'uploading'} done={status.progress > 20}>Uploading</ProcessItem>
                    <ProcessItem active={status.status === 'analyzing'} done={status.progress > 50}>Analyzing</ProcessItem>
                    <ProcessItem active={status.status === 'clipping'} done={status.progress > 80}>Clipping</ProcessItem>
                    <ProcessItem active={status.status === 'completed'} done={status.progress === 100}>Success</ProcessItem>
                  </ul>
                  {status.error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2">
                      <AlertCircle size={14} /> {status.error}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="absolute w-[180px] h-[320px] border-2 border-primary rounded shadow-[0_0_0_2000px_rgba(0,0,0,0.6)] flex items-center justify-center z-0">
              <div className="absolute bottom-10 text-center w-[90%] font-black text-lg uppercase text-white drop-shadow-[2px_2px_0_#000]">
                THIS IS THE HOOK!
              </div>
            </div>
          </div>

          <div className="h-24 bg-surface border border-border rounded-xl p-4 flex flex-col gap-2 shrink-0">
            <div className="flex justify-between text-[10px] uppercase font-bold text-text-dim tracking-wider">
              <span>00:00</span>
              <span className="text-accent flex items-center gap-1"><Sparkles size={10} /> Emotional Peaks (Sentiment Analysis)</span>
              <span>58:12</span>
            </div>
            <div className="flex-1 flex items-end gap-[3px]">
              {[...Array(60)].map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 rounded-sm ${i > 20 && i < 35 || i > 45 && i < 55 ? 'bg-accent shadow-[0_0_8px_var(--color-accent)]' : 'bg-border'}`} 
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                />
              ))}
            </div>
          </div>
        </main>

        {/* Right Panel */}
        <aside className="w-[320px] border-l border-border bg-[#0C0C0E] p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-text-dim">Extracted Nuggets ({processedClips.length})</div>
          
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {processedClips.length > 0 ? (
                processedClips.map((clip, index) => (
                  <motion.div
                    key={clip.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-surface border border-border rounded-xl flex flex-col gap-3 group card-hover cursor-pointer"
                  >
                    <div className="aspect-video bg-border rounded-lg overflow-hidden relative">
                      <video src={clip.localUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={20} className="text-white fill-white" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold leading-tight line-clamp-2">"{clip.metadata.hookHeadline}"</div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-text-dim">
                        <span>{Math.round(clip.metadata.endTime - clip.metadata.startTime)}s</span>
                        <span className="text-accent">98% Viral Score</span>
                      </div>
                    </div>
                    <a 
                      href={clip.localUrl} 
                      download
                      className="btn-secondary py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-center"
                    >
                      Export Clip
                    </a>
                  </motion.div>
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
                  <Scissors className="text-text-dim/20 mb-3" size={32} />
                  <p className="text-[11px] font-bold text-text-dim/60 uppercase tracking-widest">No nuggets yet</p>
                  <p className="text-[10px] text-text-dim/40 mt-1 uppercase tracking-tight">Run analysis to extract segments</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {processedClips.length > 0 && (
            <button className="btn-secondary mt-auto py-3 rounded-lg font-bold text-xs uppercase tracking-widest">
              Run Re-Analysis
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function ProcessItem({ children, active, done }: { children: ReactNode, active: boolean, done: boolean }) {
  return (
    <li className={`flex items-center gap-3 transition-all text-[10px] uppercase font-bold tracking-tight ${done ? 'text-accent' : active ? 'text-primary' : 'text-text-dim/40'}`}>
      {done ? (
        <CheckCircle size={14} className="text-accent" />
      ) : active ? (
        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      ) : (
        <div className="w-3 h-3 rounded-full border border-border" />
      )}
      <span className={active ? 'scale-105 transition-transform' : ''}>{children}</span>
    </li>
  );
}

export interface ClipMetadata {
  id: string;
  startTime: number;
  endTime: number;
  reasoning: string;
  hookHeadline: string;
  speakerPosition: 'left' | 'center' | 'right' | number;
}

export interface ProcessingStatus {
  status: 'idle' | 'uploading' | 'analyzing' | 'clipping' | 'completed' | 'error';
  progress: number;
  error?: string;
  clips?: ClipMetadata[];
  originalVideoUrl?: string;
}

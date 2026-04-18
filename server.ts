import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';

const app = express();
const PORT = 3000;

// Ensure directories exist
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const CLIPS_DIR = path.join(process.cwd(), 'clips');

[UPLOADS_DIR, CLIPS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

app.use(express.json());

// API Routes
app.post('/api/upload', (req, res, next) => {
  upload.single('video')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: 'Server error during upload' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }
    res.json({
      id: req.file.filename,
      url: `/uploads/${req.file.filename}`
    });
  });
});

app.post('/api/create-clip', async (req, res) => {
  const { videoId, startTime, endTime, cropCenter = 0.5 } = req.body;
  const inputPath = path.join(UPLOADS_DIR, videoId);
  const clipId = `clip-${uuidv4()}.mp4`;
  const outputPath = path.join(CLIPS_DIR, clipId);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Original video not found' });
  }

  // Calculate crop coordinates for vertical video (9:16 from 16:9)
  // We use even dimensions (trunc(x/2)*2) to ensure compatibility with many encoders (like libx264)
  // Ensure we don't try to crop more width than available
  const cropW = 'min(iw,trunc(ih*9/16/2)*2)';
  const cropH = 'trunc(ih/2)*2';
  const cropX = `trunc(clamp(iw*${cropCenter}-ih*9/32, 0, max(0, iw-ih*9/16))/2)*2`;
  const cropY = '0';

  ffmpeg(inputPath)
    .setStartTime(startTime)
    .setDuration(endTime - startTime)
    .videoFilters([
      {
        filter: 'crop',
        options: `${cropW}:${cropH}:${cropX}:${cropY}`
      },
      // Pad if necessary to reach exactly 9:16 or just ensure even dimensions
      {
        filter: 'pad',
        options: 'trunc(ih*9/16/2)*2:trunc(ih/2)*2:(ow-iw)/2:(oh-ih)/2'
      },
      {
        filter: 'format',
        options: 'yuv420p'
      }
    ])
    .on('start', (command) => {
      console.log('FFmpeg started:', command);
    })
    .on('error', (err, stdout, stderr) => {
      console.error('Error creating clip:', err);
      console.error('FFmpeg stderr:', stderr);
      res.status(500).json({ error: `Failed to create clip: ${err.message}` });
    })
    .on('end', () => {
      res.json({ clipId, url: `/clips/${clipId}` });
    })
    .outputOptions([
      '-c:v libx264',
      '-preset ultrafast',
      '-crf 23',
      '-c:a copy'
    ])
    .save(outputPath);
});

// Serve static files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/clips', express.static(CLIPS_DIR));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AttentionX server running on http://localhost:${PORT}`);
  });
}

startServer();

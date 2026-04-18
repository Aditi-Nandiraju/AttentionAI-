# AttentionX - Automated Content Repurposing Engine

AttentionX is an AI-powered platform designed to help creators, educators, and mentors repurpose their long-form video content into viral, high-impact snackable clips for TikTok, Reels, and Shorts.

## Features

- **Emotional Peak Detection**: Uses Google Gemini 1.5 Flash to analyze video content, identifying high-energy or profound insights.
- **Smart-Crop to Vertical (9:16)**: Automatically tracks the speaker and crops horizontal (16:9) video into vertical format while keeping the subject centered.
- **Hook Headline Generation**: AI-generated "scroll-stopping" headlines for every clip.
- **Automated Workflow**: From a single long-form upload to a week's worth of content in minutes.

## Technical Architecture

- **Frontend**: React 19, Tailwind CSS 4, Framer Motion for a "Hardware" industrial aesthetic.
- **Backend**: Express.js server for video processing.
- **AI Engine**: Google Gemini 1.5 Flash (`gemini-3-flash-preview`) for multimodal video analysis.
- **Video Processing**: FFmpeg (via `fluent-ffmpeg`) for precise cutting and smart-cropping.

## Getting Started

1. **Upload**: Drag and drop your long-form video (lecture, podcast, or workshop).
2. **Analyze**: Our engine sends the content to Gemini for saliency analysis.
3. **Review**: Browse the detected "Golden Nuggets" with AI reasoning.
4. **Download**: Export your 9:16 vertical clips ready for social media.


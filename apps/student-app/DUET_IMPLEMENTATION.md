# TikTok Duet Feature - Implementation Guide

## Overview

This implementation provides a complete TikTok-style Duet feature for Expo React Native apps. It allows users to record themselves while watching a challenge video, then automatically composes both videos side-by-side.

## Architecture

### Native Modules

#### iOS (Swift)
- **DuetVideoComposer.swift**: Core video composition using AVFoundation
  - Loads two video files
  - Creates side-by-side layout
  - Handles audio mixing
  - Exports final MP4 with H.264 encoding

#### Android (Kotlin)
- **DuetVideoComposer.kt**: Video composition using MediaCodec and MediaMuxer
  - Extracts video and audio tracks
  - Creates output format with proper dimensions
  - Transcodes and combines videos
  - Supports different quality profiles

### TypeScript/JavaScript Layer

#### 1. **DuetVideoComposer** (`src/duet-video-composer.ts`)
- Wrapper around native video composition module
- Handles platform differences (iOS/Android)
- Error handling and fallbacks
- Promise-based API

#### 2. **CameraRecordingController** (`src/camera-recording-controller.ts`)
- Manages camera video recording
- Supports quality profiles (480p, 720p, 1080p, 4k)
- Handles recording start/stop lifecycle
- Manages permissions

#### 3. **RecordingController** (`src/recording-controller.ts`)
- Manages audio recording
- Handles multiple recording segments
- Audio merging (placeholder for FFmpeg integration)
- Audio file management

#### 4. **AudioMixer** (`src/audio-mixer.ts`)
- Mixes multiple audio tracks
- Volume control per track
- Spatial audio support (for future)
- Playback preview

#### 5. **LayoutEngine** (`src/layout-engine.ts`)
- Configurable layout system
- Supports:
  - Side-by-side
  - Top/bottom
  - Picture-in-picture
- Rectangle-based positioning
- Extensible for custom layouts

#### 6. **ExportManager** (`src/export-manager.ts`)
- Orchestrates video composition and export
- Progress tracking
- File management (delete, check size)
- Gallery integration
- Sharing support

#### 7. **UploadManager** (`src/upload-manager.ts`)
- Handles video upload to backend
- Progress tracking
- Retry logic with exponential backoff
- Resume support for interrupted uploads

## Flow Diagram

```
Load Challenge Video
        ↓
Show Camera Preview (Duet mode)
        ↓
User presses "Record Your Answer"
        ↓
├─→ Camera Recording Starts (720p)
├─→ Audio Recording Starts
├─→ Challenge Video Plays
        ↓
Video Ends (Auto-stop)
        ↓
├─→ Camera Recording Stops
├─→ Audio Recording Stops
        ↓
Compose Videos (Native Module)
        ↓
├─→ Side-by-Side Layout
├─→ Audio Mixing
├─→ H.264 Encoding
        ↓
Export Final MP4
        ↓
Preview Composed Video
        ↓
Upload to Backend

```

## Integration Steps

### 1. Setup Expo Development Build

```bash
# Initialize development build (required, not Expo Go)
eas build --platform ios --profile development
eas build --platform android --profile development
```

### 2. Add Native Code

**iOS:**
- Add `DuetVideoComposer.swift` to Xcode project
- Bridge with `DuetVideoComposer.m`
- Ensure AVFoundation framework is linked

**Android:**
- Add `DuetVideoComposer.kt` to Android Studio
- Register in MainApplication.kt:
  ```kotlin
  override fun getPackages(): List<ReactPackage> {
    return listOf(
      DuetVideoComposerPackage(),
      // ... other packages
    )
  }
  ```

### 3. Usage in React Native

```typescript
import { CameraView } from "expo-camera";
import { ExportManager } from "../../src/export-manager";
import { DuetVideoComposer } from "../../src/duet-video-composer";
import { LayoutEngine } from "../../src/layout-engine";

// In your component:
const cameraRef = useRef<CameraView>(null);
const [composedVideoUri, setComposedVideoUri] = useState<string | null>(null);

// 1. Start recording
async function startRecording() {
  // Start camera recording
  if (cameraRef.current?.recordAsync) {
    const videoPromise = cameraRef.current.recordAsync({
      quality: "720p"
    });
    videoPromise.then(video => {
      setCameraVideoUri(video.uri);
    });
  }

  // Start audio recording
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  recordingRef.current = recording;

  // Play challenge video
  await videoRef.current?.playAsync();
}

// 2. Compose videos after recording stops
async function composeVideos() {
  const exportManager = new ExportManager();
  
  const result = await exportManager.exportDuetVideo(
    cameraVideoUri,
    challengeVideoUrl,
    `duet-${Date.now()}.mp4`,
    (progress) => {
      console.log(`Progress: ${progress.stage} - ${progress.progress}%`);
    }
  );

  setComposedVideoUri(result.uri);
}

// 3. Use layout engine
const layout = LayoutEngine.calculateLayout({
  type: "sideBySide",
  canvasWidth: 1280,
  canvasHeight: 720
});

console.log("Left video position:", layout.leftVideoRect);
console.log("Right video position:", layout.rightVideoRect);
```

## Configuration

### Quality Profiles

Adjust in `CameraRecordingController`:
```typescript
{
  "480p": { videoQuality: "480p" },  // ~1.5 Mbps
  "720p": { videoQuality: "720p" },  // ~5 Mbps
  "1080p": { videoQuality: "1080p" }, // ~10 Mbps
  "4k": { videoQuality: "4k" }        // ~25 Mbps
}
```

### Layout Types

Supported layouts in `LayoutEngine`:
- `sideBySide`: Equal width, full height
- `topBottom`: Equal height, full width
- `pictureinpicture`: Small video overlay (30% size)

### Audio Settings

Configure in `RecordingController`:
```typescript
Audio.RecordingOptionsPresets.HIGH_QUALITY
// or
Audio.RecordingOptionsPresets.MAX_AVAILABLE
```

## Performance Considerations

### Memory
- Camera recording: ~50-100 MB per minute (720p)
- Audio recording: ~5 MB per minute
- Video composition: Offloaded to native layer

### Encoding
- Hardware-accelerated on both iOS (H.264) and Android (MediaCodec)
- Export time: ~5-20 seconds depending on video length and device

### Optimization Tips
1. Use 720p for most cases (balance quality/file size)
2. Limit max duration to prevent excessive memory usage
3. Clean up temporary files after upload
4. Use background task for upload on iOS

## Error Handling

```typescript
try {
  const result = await DuetVideoComposer.composeVideos(
    leftVideoPath,
    rightVideoPath,
    outputPath
  );
} catch (error) {
  console.error("Composition failed:", error.message);
  // Handle specific errors:
  // - "Could not load video tracks"
  // - "Could not create export session"
  // - Network errors during upload
}
```

## Future Enhancements

1. **Beauty Filters**: GPU-based real-time effects
2. **Stickers/Text**: Overlay system
3. **Multiple Layouts**: Custom layout builder UI
4. **Green Screen**: Chroma key support
5. **Audio Enhancement**: Echo cancellation, noise reduction
6. **Captions**: Auto-generated from audio
7. **Background Music**: Track mixing with volume control
8. **Transitions**: Between recordings
9. **Effects Library**: Filters, distortions, etc.
10. **Multi-segment Duets**: Record across multiple videos

## Troubleshooting

### "DuetVideoComposer module not found"
- Ensure you're using Expo Development Build (not Expo Go)
- Run `eas build` with development profile

### "Camera permission denied"
- Handle in `startDuetting()` - app requests permission on button tap
- User must grant in Settings

### "Video composition fails"
- Check video file paths are correct
- Ensure videos have compatible formats (MP4, H.264)
- Verify sufficient disk space (min 500MB)

### "Upload fails"
- Check API endpoint URL is correct
- Verify network connectivity
- Use retry logic with exponential backoff

## Testing Checklist

- [ ] Camera preview renders correctly
- [ ] Audio records with proper permissions
- [ ] Camera video records simultaneously with audio
- [ ] Video stops when challenge video ends
- [ ] Native composition creates output MP4
- [ ] Composed video plays correctly
- [ ] Upload progress tracking works
- [ ] Retry logic handles network failures
- [ ] Temporary files are cleaned up
- [ ] Works on both iOS and Android

## Support

For issues with:
- **Native modules**: Check Xcode/Android Studio build logs
- **Camera/Audio APIs**: Refer to Expo documentation
- **Video composition**: See native framework docs (AVFoundation/MediaCodec)
- **React Navigation**: Consult React Navigation docs

---

**Version**: 1.0.0
**Last Updated**: 2026-06-29

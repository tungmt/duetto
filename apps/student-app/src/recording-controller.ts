import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

export interface RecordingSegment {
  uri: string;
  duration: number;
  startTime: number;
}

export class RecordingController {
  private recording: Audio.Recording | null = null;
  private segments: RecordingSegment[] = [];
  private recordingStartTime: number = 0;

  async requestPermissions(): Promise<boolean> {
    const { granted } = await Audio.requestPermissionsAsync();
    return granted;
  }

  async startRecording(): Promise<void> {
    if (this.recording) {
      await this.stopRecording();
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    this.recording = recording;
    this.recordingStartTime = Date.now();
  }

  async stopRecording(): Promise<RecordingSegment | null> {
    if (!this.recording) {
      return null;
    }

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI() ?? "";
    const duration = (Date.now() - this.recordingStartTime) / 1000;

    this.recording = null;

    if (uri) {
      const segment: RecordingSegment = {
        uri,
        duration,
        startTime: this.recordingStartTime
      };
      this.segments.push(segment);
      return segment;
    }

    return null;
  }

  getSegments(): RecordingSegment[] {
    return this.segments;
  }

  clearSegments(): void {
    this.segments = [];
  }

  async mergeAudioSegments(outputUri: string): Promise<string> {
    if (this.segments.length === 0) {
      throw new Error("No audio segments to merge");
    }

    if (this.segments.length === 1) {
      const sourceUri = this.segments[0].uri;
      const sourceData = await FileSystem.readAsStringAsync(sourceUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      await FileSystem.writeAsStringAsync(outputUri, sourceData, {
        encoding: FileSystem.EncodingType.Base64
      });
      return outputUri;
    }

    // For multiple segments, would need FFmpeg or native module to concatenate
    // For now, just return the first segment (production should implement proper merging)
    console.warn("Multiple audio segment merging not yet implemented. Using first segment only.");
    return this.segments[0].uri;
  }
}

export default RecordingController;

import { CameraView } from "expo-camera";
import * as FileSystem from "expo-file-system";
import React from "react";

export interface CameraRecordingOptions {
  quality?: "480p" | "720p" | "1080p" | "4k";
  fps?: number;
  videoBitrate?: number;
  maxDuration?: number;
}

export class CameraRecordingController {
  private cameraRef: React.RefObject<CameraView>;
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;

  constructor(cameraRef: React.RefObject<CameraView>) {
    this.cameraRef = cameraRef;
  }

  async startRecording(options?: CameraRecordingOptions): Promise<void> {
    if (!this.cameraRef.current) {
      throw new Error("Camera ref not initialized");
    }

    if (this.isRecording) {
      return;
    }

    try {
      const videoRecordingPromise = this.cameraRef.current.recordAsync(
        this.getRecordingOptions(options)
      );

      if (videoRecordingPromise) {
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        await videoRecordingPromise;
      }
    } catch (error) {
      console.error("Error starting camera recording:", error);
      this.isRecording = false;
      throw error;
    }
  }

  async stopRecording(): Promise<{ uri: string; duration: number } | null> {
    if (!this.cameraRef.current || !this.isRecording) {
      return null;
    }

    try {
      await this.cameraRef.current.stopRecording();
      this.isRecording = false;

      const duration = (Date.now() - this.recordingStartTime) / 1000;

      // Note: Camera.recordAsync() will return the video URI through a callback
      // This needs to be handled via the recordingCallback prop
      return { uri: "", duration };
    } catch (error) {
      console.error("Error stopping camera recording:", error);
      this.isRecording = false;
      throw error;
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  private getRecordingOptions(options?: CameraRecordingOptions) {
    const qualityMap: Record<string, any> = {
      "480p": { videoQuality: "480p" },
      "720p": { videoQuality: "720p" },
      "1080p": { videoQuality: "1080p" },
      "4k": { videoQuality: "4k" }
    };

    const quality = options?.quality || "720p";
    const qualityOptions = qualityMap[quality] || qualityMap["720p"];

    return {
      ...qualityOptions,
      maxDuration: options?.maxDuration,
      maxFileSize: 500 * 1024 * 1024 // 500MB
    };
  }
}

export default CameraRecordingController;

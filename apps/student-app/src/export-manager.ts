import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { DuetVideoComposer } from "./duet-video-composer";

export interface ExportProgress {
  stage: "composing" | "encoding" | "finalizing";
  progress: number; // 0-100
}

export interface ExportResult {
  uri: string;
  duration: number;
  size: number;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

export class ExportManager {
  async exportDuetVideo(
    studentVideoUri: string,
    challengeVideoUri: string,
    outputFileName: string,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult> {
    try {
      onProgress?.({ stage: "composing", progress: 0 });

      // Create output path
      const outputDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!outputDir) {
        throw new Error("No writable directory available");
      }

      const outputUri = `${outputDir}${outputFileName}`;

      // Remove existing file if present
      try {
        await FileSystem.deleteAsync(outputUri);
      } catch {
        // File might not exist
      }

      onProgress?.({ stage: "composing", progress: 50 });

      // Call native video composer
      const result = await DuetVideoComposer.composeVideos(
        studentVideoUri,
        challengeVideoUri,
        outputUri
      );

      onProgress?.({ stage: "encoding", progress: 80 });

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(result, {
        size: true
      });

      if (!fileInfo.exists) {
        throw new Error("Output file was not created");
      }

      onProgress?.({ stage: "finalizing", progress: 100 });

      return {
        uri: result,
        duration: 0, // Would need to extract from video metadata
        size: fileInfo.size || 0
      };
    } catch (error) {
      console.error("Error exporting duet video:", error);
      throw error;
    }
  }

  async shareVideo(uri: string): Promise<boolean> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        console.warn("Sharing not available on this platform");
        return false;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "video/mp4",
        dialogTitle: "Share Duet Video"
      });
      return true;
    } catch (error) {
      console.error("Error sharing video:", error);
      throw error;
    }
  }

  async deleteVideo(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri);
    } catch (error) {
      console.error("Error deleting video:", error);
      throw error;
    }
  }

  async getVideoFileSize(uri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      return fileInfo.size || 0;
    } catch (error) {
      console.error("Error getting file size:", error);
      return 0;
    }
  }

  async copyVideoToGallery(uri: string, fileName: string): Promise<string> {
    try {
      // This would require native implementation for proper gallery access
      // For now, just return the URI
      console.warn("Copying to gallery requires native implementation");
      return uri;
    } catch (error) {
      console.error("Error copying to gallery:", error);
      throw error;
    }
  }
}

export default ExportManager;

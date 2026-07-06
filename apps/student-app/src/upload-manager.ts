import * as FileSystem from "expo-file-system";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

export class UploadManager {
  async uploadVideo(
    videoUri: string,
    apiEndpoint: string,
    onProgress?: UploadProgressCallback
  ): Promise<{ url: string; duration: number }> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(videoUri, {
        size: true
      });

      if (!fileInfo.exists) {
        throw new Error("Video file not found");
      }

      const fileSize = fileInfo.size || 0;

      // Prepare multipart form data
      const formData = new FormData();
      formData.append("video", {
        uri: videoUri,
        type: "video/mp4",
        name: "duet-video.mp4"
      } as any);

      // Upload with progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        if (onProgress) {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress: UploadProgress = {
                loaded: event.loaded,
                total: event.total,
                percentage: Math.round((event.loaded / event.total) * 100)
              };
              onProgress(progress);
            }
          });
        }

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({
                url: response.url,
                duration: response.duration || 0
              });
            } catch (error) {
              reject(new Error("Invalid response format"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload request failed"));
        });

        xhr.open("POST", apiEndpoint);
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Error uploading video:", error);
      throw error;
    }
  }

  async uploadVideoWithRetry(
    videoUri: string,
    apiEndpoint: string,
    maxRetries: number = 3,
    onProgress?: UploadProgressCallback
  ): Promise<{ url: string; duration: number }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.uploadVideo(videoUri, apiEndpoint, onProgress);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Upload attempt ${attempt + 1}/${maxRetries} failed:`, error);

        if (attempt < maxRetries - 1) {
          // Wait before retry (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error("Upload failed after all retries");
  }

  async resumeUpload(
    videoUri: string,
    apiEndpoint: string,
    sessionId: string,
    onProgress?: UploadProgressCallback
  ): Promise<{ url: string; duration: number }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(videoUri, {
        size: true
      });

      if (!fileInfo.exists) {
        throw new Error("Video file not found");
      }

      const formData = new FormData();
      formData.append("video", {
        uri: videoUri,
        type: "video/mp4",
        name: "duet-video.mp4"
      } as any);
      formData.append("sessionId", sessionId);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        if (onProgress) {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress: UploadProgress = {
                loaded: event.loaded,
                total: event.total,
                percentage: Math.round((event.loaded / event.total) * 100)
              };
              onProgress(progress);
            }
          });
        }

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({
                url: response.url,
                duration: response.duration || 0
              });
            } catch (error) {
              reject(new Error("Invalid response format"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload request failed"));
        });

        xhr.open("POST", apiEndpoint);
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Error resuming upload:", error);
      throw error;
    }
  }
}

export default UploadManager;

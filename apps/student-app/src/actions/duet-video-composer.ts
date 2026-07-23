import { NativeModules, Platform } from "react-native";

interface IDuetVideoComposer {
  composeVideos(leftVideoPath: string, rightVideoPath: string, outputPath: string): Promise<string>;
}

const DuetVideoComposerModule = NativeModules.DuetVideoComposer as IDuetVideoComposer | undefined;

if (!DuetVideoComposerModule) {
  console.warn("DuetVideoComposer native module not found. This requires Expo Development Build.");
}

export class DuetVideoComposer {
  static async composeVideos(
    leftVideoPath: string,
    rightVideoPath: string,
    outputPath: string
  ): Promise<string> {
    if (!DuetVideoComposerModule) {
      throw new Error(
        "DuetVideoComposer module not available. Ensure you're using Expo Development Build: eas build --platform ios --profile development"
      );
    }

    return DuetVideoComposerModule.composeVideos(leftVideoPath, rightVideoPath, outputPath);
  }
}

export default DuetVideoComposer;

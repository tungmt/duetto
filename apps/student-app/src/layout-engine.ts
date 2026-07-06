export type LayoutType = "sideBySide" | "topBottom" | "pictureinpicture";

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface LayoutConfig {
  type: LayoutType;
  canvasWidth: number;
  canvasHeight: number;
}

export interface LayoutResult {
  leftVideoRect: LayoutRect;
  rightVideoRect: LayoutRect;
  canvasSize: { width: number; height: number };
}

export class LayoutEngine {
  /**
   * Calculate layout rectangles based on layout type and canvas size
   */
  static calculateLayout(config: LayoutConfig): LayoutResult {
    switch (config.type) {
      case "sideBySide":
        return this.calculateSideBySide(config);
      case "topBottom":
        return this.calculateTopBottom(config);
      case "pictureinpicture":
        return this.calculatePictureInPicture(config);
      default:
        return this.calculateSideBySide(config);
    }
  }

  private static calculateSideBySide(config: LayoutConfig): LayoutResult {
    const halfWidth = config.canvasWidth / 2;
    const height = config.canvasHeight;

    return {
      leftVideoRect: {
        x: 0,
        y: 0,
        width: halfWidth,
        height
      },
      rightVideoRect: {
        x: halfWidth,
        y: 0,
        width: halfWidth,
        height
      },
      canvasSize: {
        width: config.canvasWidth,
        height
      }
    };
  }

  private static calculateTopBottom(config: LayoutConfig): LayoutResult {
    const halfHeight = config.canvasHeight / 2;
    const width = config.canvasWidth;

    return {
      leftVideoRect: {
        x: 0,
        y: 0,
        width,
        height: halfHeight
      },
      rightVideoRect: {
        x: 0,
        y: halfHeight,
        width,
        height: halfHeight
      },
      canvasSize: {
        width,
        height: config.canvasHeight
      }
    };
  }

  private static calculatePictureInPicture(config: LayoutConfig): LayoutResult {
    const pipSize = config.canvasWidth * 0.3;
    const pipX = config.canvasWidth - pipSize - 16;
    const pipY = config.canvasHeight - pipSize - 16;

    return {
      leftVideoRect: {
        x: 0,
        y: 0,
        width: config.canvasWidth,
        height: config.canvasHeight
      },
      rightVideoRect: {
        x: pipX,
        y: pipY,
        width: pipSize,
        height: pipSize
      },
      canvasSize: {
        width: config.canvasWidth,
        height: config.canvasHeight
      }
    };
  }

  /**
   * Validate that rectangles fit within canvas
   */
  static validateLayout(result: LayoutResult): boolean {
    const validate = (rect: LayoutRect) => {
      return (
        rect.x >= 0 &&
        rect.y >= 0 &&
        rect.x + rect.width <= result.canvasSize.width &&
        rect.y + rect.height <= result.canvasSize.height
      );
    };

    return validate(result.leftVideoRect) && validate(result.rightVideoRect);
  }
}

export default LayoutEngine;

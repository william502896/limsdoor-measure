
/**
 * Leveling Utilities
 * 2024 LimsDoor AR
 */

export const LEVEL_TOLERANCE_DEFAULT = 1.5;
export const LEVEL_TOLERANCE_STRICT = 0.5;
export const LEVEL_TOLERANCE_LOOSE = 2.5;

export type LevelStatus = "initial" | "stable" | "unstable";

/**
 * Validates if the angle is within tolerance of the target (usually 0).
 */
export function isAngleLevel(angle: number, tolerance: number = LEVEL_TOLERANCE_DEFAULT): boolean {
    return Math.abs(angle) <= tolerance;
}

/**
 * Simple Moving Average Buffer
 */
export class AngleBuffer {
    private buffer: number[] = [];
    private readonly size: number;

    constructor(size: number = 10) {
        this.size = size;
    }

    push(val: number) {
        this.buffer.push(val);
        if (this.buffer.length > this.size) {
            this.buffer.shift();
        }
    }

    getAverage(): number {
        if (this.buffer.length === 0) return 0;
        const sum = this.buffer.reduce((a, b) => a + b, 0);
        return sum / this.buffer.length;
    }

    reset() {
        this.buffer = [];
    }
}

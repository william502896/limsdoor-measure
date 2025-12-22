import * as THREE from "three";

// ===============================================
// Constants
// ===============================================
export const THRESHOLD = {
    GAP_WARNING_MM: 5.0,
    GAP_DANGER_MM: 10.0,
    ANGLE_WARNING_DEG: 1.5,
    ANGLE_DANGER_DEG: 3.0,
};

export type RiskLevel = "NORMAL" | "WARNING" | "DANGER";

export type ArMeasurementResult = {
    maxAngle: number;
    maxStepMm: number;
    riskLevel: RiskLevel;
    extraMaterialRecommended: boolean;
    photoRequired: boolean;
    adminCheckRequired: boolean;
    width?: number; // Measured width (optional)
    height?: number; // Measured height (optional)
};

// ===============================================
// Math Helpers
// ===============================================

/**
 * Calculates the angle (in degrees) between a normal vector and the "Up" vector (Gravity).
 * 0 degrees means perfectly vertical (or perfectly horizontal depending on context).
 * actually, for a wall, "vertical" error is deviation of the wall's Y-axis from World Y?
 * Or simply deviation of surface normal from horizontal plane?
 *
 * Let's assume:
 * - Vertical Error: Deviation of the surface normal from the horizontal plane (XZ).
 *   Perfect Vertical Wall Normal = (x, 0, z). Dot with UP(0,1,0) should be 0.
 *   So Angle = 90 - angle(normal, UP).
 */
export function calcVerticalError(normal: THREE.Vector3): number {
    const up = new THREE.Vector3(0, 1, 0);
    // angle between normal and UP
    const angleRad = normal.angleTo(up);
    const angleDeg = THREE.MathUtils.radToDeg(angleRad);

    // Ideal wall normal is perpendicular to UP (90 deg).
    // Error is |90 - angle|.
    return Math.abs(90 - angleDeg);
}

/**
 * Calculates Horizontal Error.
 * This is trickier without a "North" reference.
 * Usually assumes "Horizontal" means the top/bottom edge of the door is level.
 * In AR point-to-point, we check the line segment's angle relative to the horizon.
 * 
 * For Surface Normal: Hard to define "Horizontal Error" for a single normal vector 
 * without knowing the wall's intended orientation.
 * 
 * STARTGY B: We use Device Orientation (Gamma) for "Levelness" (already implemented in useLeveling).
 * This function handles pure Vector math if we have two points.
 */
export function calcLineLevelError(p1: THREE.Vector3, p2: THREE.Vector3): number {
    const diff = new THREE.Vector3().subVectors(p2, p1);
    // Project to screen plane? No, project to vertical plane defined by line?
    // Simply: angle between line vector and the horizontal plane XZ?
    // Sin(angle) = y / length
    if (diff.lengthSq() < 0.0001) return 0;

    const y = Math.abs(diff.y);
    const len = diff.length();
    const asin = Math.asin(y / len); // angle from horizon
    return THREE.MathUtils.radToDeg(asin);
}

/**
 * Calculate Gap (Step) from a Reference Plane.
 * 
 * @param point Target point to measure
 * @param planeNormal Normal of the reference plane
 * @param planePoint A point on the reference plane
 */
export function calcGap(point: THREE.Vector3, planeNormal: THREE.Vector3, planePoint: THREE.Vector3): number {
    // Distance from point to plane
    // Plane defined by (P - P0) . n = 0
    // signed dist = (point - planePoint) . planeNormal

    const vec = new THREE.Vector3().subVectors(point, planePoint);
    const dist = vec.dot(planeNormal);
    return Math.abs(dist * 1000); // return in mm
}

// ===============================================
// Logic Helpers
// ===============================================

export function evaluateRisk(maxGapMm: number, maxAngleDeg: number): ArMeasurementResult {
    let risk: RiskLevel = "NORMAL";

    // Check Danger
    if (maxGapMm >= THRESHOLD.GAP_DANGER_MM || maxAngleDeg >= THRESHOLD.ANGLE_DANGER_DEG) {
        risk = "DANGER";
    }
    // Check Warning
    else if (maxGapMm >= THRESHOLD.GAP_WARNING_MM || maxAngleDeg >= THRESHOLD.ANGLE_WARNING_DEG) {
        risk = "WARNING";
    }

    return {
        maxAngle: Number(maxAngleDeg.toFixed(1)),
        maxStepMm: Number(maxGapMm.toFixed(1)),
        riskLevel: risk,
        extraMaterialRecommended: maxGapMm >= THRESHOLD.GAP_WARNING_MM,
        photoRequired: maxGapMm >= THRESHOLD.GAP_DANGER_MM,
        adminCheckRequired: risk === "DANGER"
    };
}

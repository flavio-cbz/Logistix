export interface TrajectoryPoint {
  /**
   * Position horizontale (en px, coordonnées DOM).
   */
  x: number;
  /**
   * Position verticale (en px, coordonnées DOM).
   * Pour un drag horizontal, cette valeur reste constante.
   */
  y: number;
  /**
   * Temps relatif en millisecondes depuis le début du drag.
   */
  t: number;
}

export interface TrajectoryOptions {
  /**
   * Durée totale du mouvement en millisecondes.
   * Par défaut : 600ms.
   */
  durationMs?: number;

  /**
   * Nombre total de points générés, incluant le point de départ et le point final.
   * Par défaut : 30.
   */
  pointsCount?: number;
}

/**
 * Courbe ease-in-out de type S-curve standard.
 * Utilise la fonction "smoothstep" améliorée : 3t² - 2t³
 * - t = 0   -> 0
 * - t = 0.5 -> ~0.5
 * - t = 1   -> 1
 */
function easeInOutS(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/**
 * Génère une trajectoire de drag horizontal "humaine" entre deux points.
 *
 * - Mouvement non linéaire (accélération puis décélération) via ease-in-out.
 * - Y reste constant.
 * - Les timestamps sont répartis uniformément sur la durée.
 */
export function generateHorizontalDragTrajectory(
  startX: number,
  startY: number,
  deltaX: number,
  options: TrajectoryOptions = {},
): TrajectoryPoint[] {
  const durationMs = options.durationMs ?? 600;
  const pointsCount = Math.max(2, options.pointsCount ?? 30);

  const points: TrajectoryPoint[] = [];

  for (let i = 0; i < pointsCount; i += 1) {
    const progressLinear = i / (pointsCount - 1); // 0 -> 1
    const progressEased = easeInOutS(progressLinear);

    const x = startX + deltaX * progressEased;
    const y = startY;
    const t = Math.round(durationMs * progressLinear);

    points.push({ x, y, t });
  }

  return points;
}
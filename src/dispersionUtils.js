// Utility functions for golf shot dispersion analysis

/**
 * Calculate the center point (mean) of shots
 * @param {Array} shots - Array of shot objects with carry and side properties
 * @returns {Object} - {x: meanSide, y: meanCarry}
 */
export const calculateCenter = (shots) => {
  if (shots.length === 0) return { x: 0, y: 0 };
  
  const sumX = shots.reduce((sum, shot) => sum + shot.side, 0);
  const sumY = shots.reduce((sum, shot) => sum + shot.carry, 0);
  
  return {
    x: sumX / shots.length,
    y: sumY / shots.length
  };
};

/**
 * Calculate the covariance matrix for shot dispersion
 * @param {Array} shots - Array of shot objects with carry and side properties
 * @returns {Object} - {xx: varianceX, yy: varianceY, xy: covariance}
 */
export const calculateCovarianceMatrix = (shots) => {
  if (shots.length < 2) return { xx: 0, yy: 0, xy: 0 };
  
  const center = calculateCenter(shots);
  
  let xx = 0, yy = 0, xy = 0;
  
  shots.forEach(shot => {
    const dx = shot.side - center.x;
    const dy = shot.carry - center.y;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  });
  
  const n = shots.length - 1; // Use n-1 for sample variance
  return {
    xx: xx / n,
    yy: yy / n,
    xy: xy / n
  };
};

/**
 * Calculate the eigenvalues and eigenvectors of the covariance matrix
 * @param {Object} cov - Covariance matrix {xx, yy, xy}
 * @returns {Object} - {eigenvalues: [major, minor], eigenvectors: [[x1,y1], [x2,y2]]}
 */
export const calculateEigenDecomposition = (cov) => {
  const { xx, yy, xy } = cov;
  
  // Calculate eigenvalues
  const trace = xx + yy;
  const det = xx * yy - xy * xy;
  const discriminant = Math.sqrt(trace * trace - 4 * det);
  
  const lambda1 = (trace + discriminant) / 2;
  const lambda2 = (trace - discriminant) / 2;
  
  // Calculate eigenvectors
  const eigenvector1 = [xy, lambda1 - xx];
  const eigenvector2 = [xy, lambda2 - xx];
  
  // Normalize eigenvectors
  const norm1 = Math.sqrt(eigenvector1[0] * eigenvector1[0] + eigenvector1[1] * eigenvector1[1]);
  const norm2 = Math.sqrt(eigenvector2[0] * eigenvector2[0] + eigenvector2[1] * eigenvector2[1]);
  
  return {
    eigenvalues: [lambda1, lambda2],
    eigenvectors: [
      [eigenvector1[0] / norm1, eigenvector1[1] / norm1],
      [eigenvector2[0] / norm2, eigenvector2[1] / norm2]
    ]
  };
};

/**
 * Calculate dispersion ellipse parameters
 * @param {Array} shots - Array of shot objects
 * @param {number} confidenceLevel - Confidence level (0.5, 0.75, 0.95)
 * @returns {Object} - Ellipse parameters for SVG
 */
export const calculateDispersionEllipse = (shots, confidenceLevel = 0.75) => {
  if (shots.length < 3) return null;
  
  const center = calculateCenter(shots);
  const cov = calculateCovarianceMatrix(shots);
  const eigen = calculateEigenDecomposition(cov);
  
  // Chi-square critical values for different confidence levels
  const chiSquareValues = {
    0.5: 1.386,   // 50% confidence
    0.75: 2.773,  // 75% confidence
    0.95: 5.991   // 95% confidence
  };
  
  const chiSquare = chiSquareValues[confidenceLevel] || 2.773;
  
  // Calculate ellipse radii
  const majorRadius = Math.sqrt(eigen.eigenvalues[0] * chiSquare);
  const minorRadius = Math.sqrt(eigen.eigenvalues[1] * chiSquare);
  
  // Calculate rotation angle
  const angle = Math.atan2(eigen.eigenvectors[0][1], eigen.eigenvectors[0][0]);
  
  return {
    centerX: center.x,
    centerY: center.y,
    majorRadius,
    minorRadius,
    angle: angle * (180 / Math.PI), // Convert to degrees
    confidenceLevel
  };
};

/**
 * Generate SVG path for an ellipse
 * @param {Object} ellipse - Ellipse parameters
 * @returns {string} - SVG path string
 */
export const generateEllipsePath = (ellipse) => {
  const { centerX, centerY, majorRadius, minorRadius, angle } = ellipse;
  
  // Convert angle to radians
  const angleRad = angle * (Math.PI / 180);
  
  // Generate points around the ellipse
  const points = [];
  const numPoints = 50;
  
  for (let i = 0; i <= numPoints; i++) {
    const t = (i / numPoints) * 2 * Math.PI;
    
    // Parametric equation of ellipse
    const x = majorRadius * Math.cos(t);
    const y = minorRadius * Math.sin(t);
    
    // Rotate the point
    const rotatedX = x * Math.cos(angleRad) - y * Math.sin(angleRad);
    const rotatedY = x * Math.sin(angleRad) + y * Math.cos(angleRad);
    
    // Translate to center
    points.push([rotatedX + centerX, rotatedY + centerY]);
  }
  
  // Convert to SVG path
  if (!points || points.length === 0) return '';
  
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i][0]} ${points[i][1]}`;
  }
  path += ' Z';
  
  return path;
};

/**
 * Calculate shot statistics for tooltips
 * @param {Array} shots - Array of shot objects
 * @returns {Object} - Shot statistics
 */
export const calculateShotStats = (shots) => {
  if (shots.length === 0) return null;
  
  const carries = shots.map(s => s.carry);
  const sides = shots.map(s => s.side);
  
  return {
    count: shots.length,
    avgCarry: carries.reduce((a, b) => a + b, 0) / carries.length,
    avgSide: sides.reduce((a, b) => a + b, 0) / sides.length,
    minCarry: Math.min(...carries),
    maxCarry: Math.max(...carries),
    minSide: Math.min(...sides),
    maxSide: Math.max(...sides),
    stdDevCarry: Math.sqrt(carries.reduce((sum, x) => sum + Math.pow(x - (carries.reduce((a, b) => a + b, 0) / carries.length), 2), 0) / carries.length),
    stdDevSide: Math.sqrt(sides.reduce((sum, x) => sum + Math.pow(x - (sides.reduce((a, b) => a + b, 0) / sides.length), 2), 0) / sides.length)
  };
}; 

// Fit a best-fit ellipse to a set of [x, y] points
// Returns {cx, cy, rx, ry, angle} for SVG <ellipse>
export function fitEllipse(points) {
  if (!points || points.length < 3) return null;
  
  // Validate points have valid coordinates
  const validPoints = points.filter(([x, y]) => 
    typeof x === 'number' && !isNaN(x) && 
    typeof y === 'number' && !isNaN(y)
  );
  
  if (validPoints.length < 3) return null;
  
  // Compute centroid
  const centroid = {
    x: validPoints.reduce((sum, [x]) => sum + x, 0) / validPoints.length,
    y: validPoints.reduce((sum, [, y]) => sum + y, 0) / validPoints.length
  };
  
  // Center points around centroid
  const centeredPoints = validPoints.map(([x, y]) => [x - centroid.x, y - centroid.y]);
  
  // Compute covariance matrix
  const covXX = centeredPoints.reduce((sum, [x]) => sum + x * x, 0) / validPoints.length;
  const covYY = centeredPoints.reduce((sum, [, y]) => sum + y * y, 0) / validPoints.length;
  const covXY = centeredPoints.reduce((sum, [x, y]) => sum + x * y, 0) / validPoints.length;
  
  // Compute eigenvalues and eigenvectors
  const trace = covXX + covYY;
  const det = covXX * covYY - covXY * covXY;
  const discriminant = Math.sqrt(trace * trace - 4 * det);
  
  const lambda1 = (trace + discriminant) / 2;
  const lambda2 = (trace - discriminant) / 2;
  
  // Compute angle from eigenvector
  const eigenvector1 = { x: covXY, y: lambda1 - covXX };
  const norm1 = Math.sqrt(eigenvector1.x * eigenvector1.x + eigenvector1.y * eigenvector1.y);
  eigenvector1.x /= norm1;
  eigenvector1.y /= norm1;
  const angle = Math.atan2(eigenvector1.y, eigenvector1.x) * 180 / Math.PI;
  
  // Scale factors for ellipse size (adjust these for tighter/looser fit)
  const scaleFactor = 2.0; // Makes ellipse larger to encompass more points
  const rx = Math.sqrt(lambda1) * scaleFactor;
  const ry = Math.sqrt(lambda2) * scaleFactor;
  
  return {
    cx: centroid.x,
    cy: centroid.y,
    rx: Math.max(rx, 5), // Minimum radius
    ry: Math.max(ry, 5), // Minimum radius
    angle
  };
} 

// Detect outliers using Mahalanobis distance
// Returns array of outlier indices
export function detectOutliers(points, threshold = 2.5) {
  if (points.length < 4) return []; // Need at least 4 points for robust detection
  
  // Compute centroid
  const centroid = {
    x: points.reduce((sum, [x]) => sum + x, 0) / points.length,
    y: points.reduce((sum, [, y]) => sum + y, 0) / points.length
  };
  
  // Center points around centroid
  const centeredPoints = points.map(([x, y]) => [x - centroid.x, y - centroid.y]);
  
  // Compute covariance matrix
  const covXX = centeredPoints.reduce((sum, [x]) => sum + x * x, 0) / points.length;
  const covYY = centeredPoints.reduce((sum, [, y]) => sum + y * y, 0) / points.length;
  const covXY = centeredPoints.reduce((sum, [x, y]) => sum + x * y, 0) / points.length;
  
  // Compute inverse covariance matrix
  const det = covXX * covYY - covXY * covXY;
  if (Math.abs(det) < 1e-10) return []; // Singular matrix
  
  const invCovXX = covYY / det;
  const invCovYY = covXX / det;
  const invCovXY = -covXY / det;
  
  // Compute Mahalanobis distance for each point
  const distances = centeredPoints.map(([x, y]) => {
    return Math.sqrt(x * x * invCovXX + y * y * invCovYY + 2 * x * y * invCovXY);
  });
  
  // Find outliers (points with distance > threshold)
  const outliers = [];
  distances.forEach((distance, index) => {
    if (distance > threshold) {
      outliers.push(index);
    }
  });
  
  return outliers;
}

// Alternative: IQR-based outlier detection (more robust for small datasets)
export function detectOutliersIQR(points, factor = 1.5) {
  if (points.length < 4) return [];
  
  // Separate x and y coordinates
  const xCoords = points.map(([x]) => x);
  const yCoords = points.map(([, y]) => y);
  
  // Compute IQR for x and y
  const xSorted = [...xCoords].sort((a, b) => a - b);
  const ySorted = [...yCoords].sort((a, b) => a - b);
  
  const xQ1 = xSorted[Math.floor(xSorted.length * 0.25)] || 0;
  const xQ3 = xSorted[Math.floor(xSorted.length * 0.75)] || 0;
  const xIQR = xQ3 - xQ1;
  
  const yQ1 = ySorted[Math.floor(ySorted.length * 0.25)] || 0;
  const yQ3 = ySorted[Math.floor(ySorted.length * 0.75)] || 0;
  const yIQR = yQ3 - yQ1;
  
  // Find outliers
  const outliers = [];
  points.forEach(([x, y], index) => {
    // Handle edge case where IQR is 0 (all values are the same)
    const isXOutlier = xIQR > 0 ? (x < (xQ1 - factor * xIQR) || x > (xQ3 + factor * xIQR)) : false;
    const isYOutlier = yIQR > 0 ? (y < (yQ1 - factor * yIQR) || y > (yQ3 + factor * yIQR)) : false;
    
    if (isXOutlier || isYOutlier) {
      outliers.push(index);
    }
  });
  
  return outliers;
} 
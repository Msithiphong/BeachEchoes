/**
 * GPS Calibration Script
 * 
 * Calculates affine transformation coefficients using least squares regression
 * from reference GPS/map coordinate pairs.
 * The printed constants are copied into helpers/mapUtils.js.
 * 
 * Run: node helpers/calibrateGPS.js
 */

// Reference points: [latitude, longitude, mapX, mapY]
const referencePoints = [
  [33.78743, -118.11441, 0.56486, 0.10687],
  [33.78474, -118.11429, 0.57068, 0.30520],
  [33.78618, -118.10931, 0.89238, 0.20016],
  [33.77647, -118.11257, 0.67946, 0.89156],
  [33.78114, -118.11336, 0.62740, 0.54899],
  [33.78319, -118.11102, 0.78796, 0.41259],
];

/**
 * Solve Ax = b using least squares (normal equations: A^T A x = A^T b)
 */
function leastSquares(A, b) {
  const n = A[0].length; // number of variables
  const m = A.length;     // number of equations
  
  // Calculate A^T
  const AT = Array(n).fill(0).map(() => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      AT[i][j] = A[j][i];
    }
  }
  
  // Calculate A^T * A
  const ATA = Array(n).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < m; k++) {
        sum += AT[i][k] * A[k][j];
      }
      ATA[i][j] = sum;
    }
  }
  
  // Calculate A^T * b
  const ATb = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < m; j++) {
      sum += AT[i][j] * b[j];
    }
    ATb[i] = sum;
  }
  
  // Solve ATA * x = ATb using Gaussian elimination
  return gaussianElimination(ATA, ATb);
}

/**
 * Solve linear system using Gaussian elimination with partial pivoting
 */
function gaussianElimination(A, b) {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, b[i]]);
  
  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }
  
  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }
  
  return x;
}

// Build matrices for X coordinates
const AX = referencePoints.map(([lat, lng]) => [lat, lng, 1]);
const bX = referencePoints.map(([, , x]) => x);

// Build matrices for Y coordinates
const AY = referencePoints.map(([lat, lng]) => [lat, lng, 1]);
const bY = referencePoints.map(([, , , y]) => y);

// Solve for coefficients
const [a, b, c] = leastSquares(AX, bX);
const [d, e, f] = leastSquares(AY, bY);

console.log('Affine Transform Coefficients:');
console.log('');
console.log('const AFFINE_TRANSFORM = {');
console.log('  // X coefficients (lat, lng, constant)');
console.log(`  a: ${a},`);
console.log(`  b: ${b},`);
console.log(`  c: ${c},`);
console.log('  ');
console.log('  // Y coefficients (lat, lng, constant)');
console.log(`  d: ${d},`);
console.log(`  e: ${e},`);
console.log(`  f: ${f},`);
console.log('};');
console.log('');
console.log('Verification (predicted vs actual):');
console.log('');

referencePoints.forEach(([lat, lng, actualX, actualY], i) => {
  const predictedX = a * lat + b * lng + c;
  const predictedY = d * lat + e * lng + f;
  const errorX = Math.abs(predictedX - actualX);
  const errorY = Math.abs(predictedY - actualY);
  
  console.log(`Point ${i + 1}: GPS (${lat}, ${lng})`);
  console.log(`  X: predicted=${predictedX.toFixed(5)}, actual=${actualX.toFixed(5)}, error=${errorX.toFixed(5)}`);
  console.log(`  Y: predicted=${predictedY.toFixed(5)}, actual=${actualY.toFixed(5)}, error=${errorY.toFixed(5)}`);
  console.log('');
});

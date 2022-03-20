const grad = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

function genTable(seed){
  const rng = new RNG(seed);
  const table = [];
  for(let i = 0; i < 256; i ++)
    table.push(i);

  for(let i = 0; i < 255; i ++){
    const r = i + (rng.random() % (256 - i));
    [table[r], table[i]] = [table[i], table[r]];
  }
  return table;
}

function dot(grad, x, y){
  return grad[0] * x + grad[1] * y;
}

function noise(xin, yin, table){
  let n0, n1, n2; // Noise contributions from the three corners
  // Skew the input space to determine which simplex cell we're in
  const F2 = (Math.sqrt(3) - 1) / 2;
  const s = (xin + yin) * F2; // Hairy factor for 2D
  const i = fastfloor(xin + s);
  const j = fastfloor(yin + s);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const t = (i + j) * G2;
  const X0 = i - t; // Unskew the cell origin back to (x,y) space
  const Y0 = j - t;
  const x0 = xin - X0; // The x,y distances from the cell origin
  const y0 = yin - Y0;
  // For the 2D case, the simplex shape is an equilateral triangle.
  // Determine which simplex we are in.
  let i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
  if(x0 > y0){ i1 = 1; j1 = 0; } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
  else { i1 = 0; j1 = 1; } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
  // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
  // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
  // c = (3-sqrt(3))/6
  const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2; // Offsets for last corner in (x,y) unskewed coords
  const y2 = y0 - 1 + 2 * G2;
  // Work out the hashed gradient indices of the three simplex corners
  const ii = i & 255;
  const jj = j & 255;
  const gi0 = table[ii + table[jj] & 255] % 12;
  const gi1 = table[ii + i1 + table[jj + j1] & 255] % 12;
  const gi2 = table[ii + 1 + table[jj + 1] & 255] % 12;
  // Calculate the contribution from the three corners
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if(t0 < 0) n0 = 0;
  else {
    t0 *= t0;
    n0 = t0 * t0 * dot(grad[gi0], x0, y0); // (x,y) of grad3 used for 2D gradient
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if(t1 < 0) n1 = 0;
  else {
    t1 *= t1;
    n1 = t1 * t1 * dot(grad[gi1], x1, y1);
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if(t2 < 0) n2 = 0;
  else {
    t2 *= t2;
    n2 = t2 * t2 * dot(grad[gi2], x2, y2);
  }
  // Add contributions from each corner to get the final noise value.
  // The result is scaled to return values in the interval [0, 1].
  return 35 * (n0 + n1 + n2) + 0.5;
}

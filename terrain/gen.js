// id, temperature, height, live factor

const biomes = {
  // plains
  "Icy Plains": ["icy_plains", 1, 0, 4],
  "Tundra": ["tundra", 5, 0, 6],
  "Seas": ["seas", 6, 0, 10],
  "Grassland": ["grassland", 8, 0, 10],
  "Wasteland": ["wasteland", 9, 0, 6],
  "Desert": ["desert", 10, 0, 3],
  "Magma": ["magma", 13, 0, 0],

  // forest
  "Taiga": ["taiga", 2, 3, 6],
  "River": ["river", 6, 3, 9],
  "Forest": ["forest", 8, 3, 11],
  "Cactus": ["cactus", 10, 3, 4],
  "Lava": ["lava", 14, 3, 0],

  // hills
  "Snowy Hills": ["snowy_hills", 2, 8, 5],
  "Pool": ["pool", 5, 8, 8],
  "Highground": ["highground", 8, 8, 9],

  // mountains
  "Ice Spikes": ["ice_spikes", 0, 15, 0],
  "Rocks": ["rocks", 4, 15, 3],
  "Lake": ["lake", 5, 15, 4],
  "Mountains": ["mountains", 7, 15, 6],
  "Volcano": ["volcano", 15, 15, 0]

};

class RNG {
  constructor(key){
    this.key = key;
  }
  random(){
    const a = 269323675994833;
    const b = 7131910007;
    const c = 3408380627;
    return this.key = (this.key * b + c) % a;
  }
}

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
  const factor = 0.01;

  xin = xin * factor;
  yin = yin * factor;

  let n0, n1, n2; // Noise contributions from the three corners
  // Skew the input space to determine which simplex cell we're in
  const F2 = (Math.sqrt(3) - 1) / 2;
  const s = (xin + yin) * F2; // Hairy factor for 2D
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
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

function biome(x, y){
  const tempSeed = 6942054;
  const tempTable = genTable(tempSeed);

  const heiSeed = 20040901;
  const heiTable = genTable(heiSeed);

  let [t, h] = [noise(x, y, tempTable), noise(x, y, heiTable)];
  t = Math.floor(t * 16);
  h = Math.floor(h * 16);

  let min = 450;
  let bi;
  for(let b in biomes){
    const dt = Math.abs(t - biomes[b][1]);
    const dh = Math.abs(h - biomes[b][2]);
    const d = dt * dt + dh * dh;
    if(d < min) {
      min = d;
      bi = biomes[b][0];
    }
  }
  return bi;

  //return [t, h];
}

function build(){
  const s = 25;

  let field = "";
  const alpha = " .,-_:;+=u*%8#@";
  for(let x = -s; x <= s; x ++){
    for(let y = -s; y <= s; y ++){
      //const [t, h] = biome(x, y);
      //field += alpha[Math.floor(t * alpha.length)] + " ";
      console.log(biome(x, y));
    }
    //field += "\n";
  }
  //console.log(field);
}
//build();

//const fs = require("fs");

const express = require("express");;
const app = express();
const port = 42069;

app.get("/map/:x/:y", (req, res) => {
  const x = Number(req.params.x);
  const y = Number(req.params.y);
  res.send(biome(x, y));
});

app.get("/assets/biomes/:biome", (req, res) => {
  const biome = req.params.biome;
  res.sendFile("./res/" + biome + ".png", { "root": __dirname });
});

app.get("/", (req, res) => {
  res.sendFile("./index.html", { "root": __dirname });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.canvas = this.createGrid();
}

  createGrid() {
    return Array(this.height).fill(null).map(() => Array(this.width).fill('#FFFFFF'));
}

  drawPixel(x, y, color) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.canvas[y][x] = color;
      console.log(`Pixel at (${x},${y}) set to ${color}`);
    }
}

  exportArt() {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      resolution: `${this.width}x${this.height}`,
      data: this.canvas
    });
}
}

const dailyArt = new PixelCanvas(16, 16);
dailyArt.drawPixel(7, 7, '#00FF00');
console.log

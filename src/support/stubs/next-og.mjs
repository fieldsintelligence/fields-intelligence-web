// Test-only stand-in for next/og. Keeps the React element so tests can read
// the drawn title without rasterizing a PNG.
export class ImageResponse {
  constructor(element, options) {
    this.element = element;
    this.options = options;
  }
}

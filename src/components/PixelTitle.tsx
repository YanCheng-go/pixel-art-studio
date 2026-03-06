// Each letter is a 5-tall grid of varying width. 1 = filled block, 0 = empty.
const PIXEL_FONT: Record<string, number[][]> = {
  P: [
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 1],
    [1, 0, 0, 0],
    [1, 0, 0, 0],
  ],
  I: [
    [1, 1, 1],
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
    [1, 1, 1],
  ],
  X: [
    [1, 0, 0, 1],
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [1, 0, 0, 1],
  ],
  E: [
    [1, 1, 1, 1],
    [1, 0, 0, 0],
    [1, 1, 1, 0],
    [1, 0, 0, 0],
    [1, 1, 1, 1],
  ],
  L: [
    [1, 0, 0, 0],
    [1, 0, 0, 0],
    [1, 0, 0, 0],
    [1, 0, 0, 0],
    [1, 1, 1, 1],
  ],
  A: [
    [0, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
  ],
  R: [
    [1, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 1, 1, 0],
    [1, 0, 1, 0],
    [1, 0, 0, 1],
  ],
  T: [
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  S: [
    [0, 1, 1, 1],
    [1, 0, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 1],
    [1, 1, 1, 0],
  ],
  U: [
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [0, 1, 1, 0],
  ],
  D: [
    [1, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 0],
  ],
  O: [
    [0, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [0, 1, 1, 0],
  ],
  ' ': [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
};

interface PixelTitleProps {
  text: string;
  blockSize?: number;
  fill?: string;
  stroke?: string;
}

export function PixelTitle({
  text,
  blockSize = 4,
  fill = '#00E599',
  stroke = '#0a0a0a',
}: PixelTitleProps) {
  const gap = 1; // gap between letters in grid units
  const bs = blockSize;
  const pad = 0.5; // inner padding for the 3D outlined look

  // Calculate total width
  const letters = text.toUpperCase().split('');
  let totalGridWidth = 0;
  for (let i = 0; i < letters.length; i++) {
    const glyph = PIXEL_FONT[letters[i]];
    if (!glyph) continue;
    totalGridWidth += glyph[0].length;
    if (i < letters.length - 1) totalGridWidth += gap;
  }

  const svgWidth = totalGridWidth * bs;
  const svgHeight = 5 * bs;

  const blocks: JSX.Element[] = [];
  let offsetX = 0;

  for (const char of letters) {
    const glyph = PIXEL_FONT[char];
    if (!glyph) continue;
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col]) {
          const x = (offsetX + col) * bs;
          const y = row * bs;
          blocks.push(
            <rect
              key={`${char}-${offsetX}-${row}-${col}`}
              x={x + pad}
              y={y + pad}
              width={bs - pad * 2}
              height={bs - pad * 2}
              fill={fill}
              stroke={stroke}
              strokeWidth={pad}
              rx={0.5}
            />
          );
        }
      }
    }
    offsetX += glyph[0].length + gap;
  }

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="pixel-title"
    >
      {blocks}
    </svg>
  );
}

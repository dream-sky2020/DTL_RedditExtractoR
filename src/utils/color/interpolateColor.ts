export const interpolateColor = (color1: string, color2: string, factor: number) => {
  if (color1 === 'transparent' || color2 === 'transparent') {
    return factor < 0.5 ? color1 : color2;
  }
  
  const hex = (x: string) => {
    const h = x.replace('#', '');
    if (h.length === 3) return h.split('').map(c => c + c).join('');
    return h;
  };

  const r1 = parseInt(hex(color1).substring(0, 2), 16);
  const g1 = parseInt(hex(color1).substring(2, 4), 16);
  const b1 = parseInt(hex(color1).substring(4, 6), 16);

  const r2 = parseInt(hex(color2).substring(0, 2), 16);
  const g2 = parseInt(hex(color2).substring(2, 4), 16);
  const b2 = parseInt(hex(color2).substring(4, 6), 16);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * 将 HSL 颜色值转换为十六进制字符串
 * @param h 色相 (0-360)
 * @param s 饱和度 (0-1)
 * @param l 亮度 (0-1)
 * @returns 十六进制颜色字符串 (例如: #ff0000)
 */
export const hslToHex = (h: number, s: number, l: number) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255).toString(16).padStart(2, '0');
  const g = Math.round((g1 + m) * 255).toString(16).padStart(2, '0');
  const b = Math.round((b1 + m) * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
};

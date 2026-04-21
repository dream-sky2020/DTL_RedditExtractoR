/**
 * 生成伪随机数 (0-1)
 * @param seed 随机种子
 * @param index 索引
 * @returns 0 到 1 之间的伪随机数
 */
export const pseudoRandom01 = (seed: number, index: number) => {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

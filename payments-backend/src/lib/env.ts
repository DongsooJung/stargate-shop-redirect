export function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`MISSING_ENV_${name}`);
  return value;
}

export function origins() {
  return {
    shop: process.env.SHOP_ORIGIN || "https://shop.stargateedu.co.kr",
    pay: process.env.PAY_ORIGIN || "https://pay.stargateedu.co.kr",
  };
}

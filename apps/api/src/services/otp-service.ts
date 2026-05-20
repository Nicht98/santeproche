import { redis } from '../infra/redis.js';

export async function generateOtp(phone: string): Promise<string> {
  const key = `otp:${phone}`;
  const attemptsKey = `${key}:attempts`;
  const attempts = await redis.incr(attemptsKey);
  if (attempts === 1) await redis.expire(attemptsKey, 3600);
  if (attempts > 3) throw new Error('Too many OTP requests');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.setex(key, 300, otp);
  return otp;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const key = `otp:${phone}`;
  const stored = await redis.get(key);
  if (!stored) return false;
  if (stored !== code) return false;
  await redis.del(key);
  return true;
}

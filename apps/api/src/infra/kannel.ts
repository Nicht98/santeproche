export async function sendSms(phone: string, message: string): Promise<void> {
  const kannelUrl = process.env.KANNEL_URL;
  if (!kannelUrl || kannelUrl === 'http://kannel:13013') {
    console.log(`[DEV SMS] to ${phone}: ${message}`);
    return;
  }

  // Production: Kannel sendsms endpoint
  try {
    const user = process.env.KANNEL_SMS_USER || 'santeproche';
    const pass = process.env.KANNEL_SMS_PASS || 'test';
    const url = `${kannelUrl}/cgi-bin/sendsms?user=${user}&pass=${pass}&to=${phone.replace('+','')}&text=${encodeURIComponent(message)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[SMS] Kannel returned ${res.status}, falling back to console`);
      console.log(`[FALLBACK SMS] to ${phone}: ${message}`);
    }
  } catch (err) {
    console.warn(`[SMS] Kannel unreachable (${(err as Error).message}), falling back to console`);
    console.log(`[FALLBACK SMS] to ${phone}: ${message}`);
  }
}

export async function sendSms(phone: string, message: string): Promise<void> {
  const kannelUrl = process.env.KANNEL_URL;
  if (!kannelUrl) {
    console.log(`[DEV SMS] to ${phone}: ${message}`);
    return;
  }
  // Production: Kannel sendsms endpoint
  const url = `${kannelUrl}/cgi-bin/sendsms?user=${process.env.KANNEL_SMS_USER}&pass=${process.env.KANNEL_SMS_PASS}&to=${phone.replace('+','')}&text=${encodeURIComponent(message)}`;
  await fetch(url);
}

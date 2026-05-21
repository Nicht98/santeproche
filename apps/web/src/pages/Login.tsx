import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequestOtp, useVerifyOtp } from '../hooks/api';
import { useAuthStore } from '../stores/auth';
import { Card } from '../components/ui';

export function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+237');
  const [otp, setOtp] = useState('');

  const req = useRequestOtp();
  const verify = useVerifyOtp();

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    req.mutate({ phone }, {
      onSuccess: () => setStep('otp'),
    });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    verify.mutate({ phone, code: otp }, {
      onSuccess: (data) => {
        setAuth(data);
        if (!data.isProfileComplete) {
          navigate('/register/patient');
        } else {
          navigate('/');
        }
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-600">SantéProche</h1>
          <p className="mt-1 text-sm text-gray-500">Accès santé facile</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Numéro de téléphone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="+2376XXXXXXXX"
                required
              />
            </label>
            <button
              type="submit"
              disabled={req.isPending}
              className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {req.isPending ? 'Envoi…' : 'Recevoir un code'}
            </button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-400">ou</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { loginAsGuest(); navigate('/'); }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Continuer sans compte
            </button>

            {req.isError && (
              <p className="text-xs text-red-600">{(req.error as Error)?.message || 'Erreur'}</p>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-center text-xs text-gray-500">Un code a été envoyé à {phone}</p>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Code de vérification</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="123456"
                required
              />
            </label>
            <button
              type="submit"
              disabled={verify.isPending}
              className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {verify.isPending ? 'Vérification…' : 'Vérifier'}
            </button>
            <div className="flex justify-center">
              <button
                type="button"
                className="text-xs text-brand-600 underline"
                onClick={() => setStep('phone')}
              >
                Changer de numéro
              </button>
            </div>
            {verify.isError && (
              <p className="text-xs text-red-600">{(verify.error as Error)?.message || 'Erreur'}</p>
            )}
          </form>
        )}
      </Card>
    </div>
  );
}

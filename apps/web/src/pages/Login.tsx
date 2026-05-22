import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, UserCircle, ArrowRight, Heart, Stethoscope } from 'lucide-react';
import { useRequestOtp, useVerifyOtp } from '../hooks/api';
import { useAuthStore } from '../stores/auth';
import { formatError } from '../lib/errors';

export function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+237');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState<string>('patient');

  const req = useRequestOtp();
  const verify = useVerifyOtp();

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    req.mutate({ phone }, { onSuccess: () => setStep('otp') });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    verify.mutate({ phone, code: otp, role }, {
      onSuccess: (data) => {
        setAuth(data);
        const isProviderRole = data.user?.role && ['doctor','pharmacist','clinic_admin','hospital_admin','admin'].includes(data.user.role);
        if (!data.isProfileComplete) {
          navigate(isProviderRole ? '/register/provider' : '/register/patient');
        } else {
          navigate(isProviderRole ? '/dashboard' : '/');
        }
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-12">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 shadow-glow-brand">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">SantéProche</h1>
          <p className="mt-1 text-sm text-slate-500 text-balance">Accès santé simple et rapide près de chez vous</p>
        </div>

        <div className="w-full max-w-sm animate-slide-up">
          {step === 'phone' ? (
            <form onSubmit={handleRequest} className="space-y-5">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Numéro de téléphone</span>
                  <div className="relative mt-1">
                    <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field pl-10" placeholder="+2376XXXXXXXX" required />
                  </div>
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Je suis</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${role === 'patient' ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                      <UserCircle className="h-4 w-4" />
                      <input type="radio" name="role" value="patient" checked={role === 'patient'} onChange={(e) => setRole(e.target.value)} className="sr-only" />
                      Patient(e)
                    </label>
                    <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${role === 'doctor' ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                      <Stethoscope className="h-4 w-4" />
                      <input type="radio" name="role" value="doctor" checked={role === 'doctor'} onChange={(e) => setRole(e.target.value)} className="sr-only" />
                      Soignant
                    </label>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={req.isPending} className="btn-primary w-full py-3.5">
                {req.isPending ? <span>Envoi en cours…</span> : <span className="flex items-center justify-center gap-2">Recevoir un code <ArrowRight className="h-4 w-4" /></span>}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-slate-50 px-3 text-slate-400">ou</span></div>
              </div>

              <button type="button" onClick={() => { loginAsGuest(); navigate('/'); }} className="btn-secondary w-full">Continuer sans compte</button>

              {req.isError && <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600">{formatError(req.error)}</p>}
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="text-center">
                <p className="text-sm text-slate-500">Code envoyé à <span className="font-mono font-semibold text-slate-900">{phone}</span></p>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Code de vérification</span>
                <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} className="input-field mt-1 text-center text-2xl font-mono tracking-[0.5em]" placeholder="------" required />
              </label>

              <button type="submit" disabled={verify.isPending} className="btn-primary w-full py-3.5">
                {verify.isPending ? 'Vérification…' : 'Vérifier'}
              </button>

              <div className="flex justify-center">
                <button type="button" className="text-sm font-medium text-brand-600 underline underline-offset-2 transition-colors hover:text-brand-700" onClick={() => setStep('phone')}>
                  Changer de numéro
                </button>
              </div>

              {verify.isError && <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600">{formatError(verify.error)}</p>}
            </form>
          )}
        </div>
      </div>

      <div className="pb-6 text-center">
        <p className="text-xs text-slate-400">En continuant, vous acceptez nos conditions d'utilisation</p>
      </div>
    </div>
  );
}

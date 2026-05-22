import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegisterPatient } from '../hooks/api';
import { useAuthStore } from '../stores/auth';
import { Card } from '../components/ui';
import { formatError } from '../lib/errors';

export function PatientRegister() {
  const navigate = useNavigate();
  const register = useRegisterPatient();
  const completeProfile = useAuthStore((s) => s.completeProfile);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    bloodType: '',
    address: '',
  });

  const change = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(form, {
      onSuccess: () => {
        completeProfile();
        navigate('/');
      },
    });
  };

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

  return (
    <div className="p-4">
      <Card>
        <h1 className="text-lg font-bold text-gray-900">Compléter votre profil</h1>
        <p className="mt-1 text-xs text-gray-500">Nous avons besoin de quelques détails pour vous aider mieux.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Prénom</span>
              <input className={inputCls} value={form.firstName} onChange={change('firstName')} required />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Nom</span>
              <input className={inputCls} value={form.lastName} onChange={change('lastName')} required />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Genre</span>
            <select className={inputCls} value={form.gender} onChange={change('gender')} required>
              <option value="">Choisir…</option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
              <option value="other">Autre</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Date de naissance</span>
            <input type="date" className={inputCls} value={form.dateOfBirth} onChange={change('dateOfBirth')} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Groupe sanguin</span>
            <select className={inputCls} value={form.bloodType} onChange={change('bloodType')}>
              <option value="">Inconnu</option>
              <option value="A+">A+</option>
              <option value="A-">A−</option>
              <option value="B+">B+</option>
              <option value="B-">B−</option>
              <option value="O+">O+</option>
              <option value="O-">O−</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB−</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={register.isPending}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {register.isPending ? 'Enregistrement…' : 'Continuer'}
          </button>
          {register.isError && <p className="text-xs text-red-600">{formatError(register.error)}</p>}
        </form>
      </Card>
    </div>
  );
}

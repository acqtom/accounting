import { useState, type FormEvent, type ReactNode } from 'react';
import { CARD_CLASS } from '../lib/ui';
import { IconBadge, LockIcon } from './icons';

const UNLOCK_KEY = 'accounting-hub-unlocked';
const PASSCODE = 'acc123';

export default function PasscodeGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(UNLOCK_KEY) === 'true');
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value === PASSCODE) {
      localStorage.setItem(UNLOCK_KEY, 'true');
      setUnlocked(true);
    } else {
      setError(true);
      setValue('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className={`${CARD_CLASS} p-10 w-full max-w-sm`}>
        <div className="flex justify-center mb-4">
          <IconBadge>
            <LockIcon className="w-5 h-5" />
          </IconBadge>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Educatr accounting</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Enter the passcode to continue</p>
        <input
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          autoFocus
          placeholder="Passcode"
          className={`w-full text-center text-lg tracking-widest border rounded-lg px-4 py-3 outline-none transition-colors ${
            error ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-indigo-400'
          }`}
        />
        {error && <p className="text-sm text-red-500 text-center mt-2">Incorrect passcode</p>}
        <button
          type="submit"
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-3 rounded-lg transition-colors"
        >
          Enter
        </button>
      </form>
    </div>
  );
}

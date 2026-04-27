import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', { token, password });
      navigate('/login?reset=1');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <p className="text-[#0a0a0a] font-semibold mb-4">Invalid reset link.</p>
          <Link to="/forgot-password" className="text-sm text-[#0a0a0a] underline underline-offset-4">
            Request a new one
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-sm w-full">
        <Link to="/" className="text-2xl font-black tracking-widest uppercase text-[#0a0a0a] block mb-12">
          Billie
        </Link>

        <h1 className="text-2xl font-black text-[#0a0a0a] mb-1 tracking-tight">Set new password</h1>
        <p className="text-[#888] text-sm mb-8">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
          )}
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] mb-1.5">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-[#0a0a0a] transition-colors"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] mb-1.5">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-[#0a0a0a] transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0a0a0a] text-white py-3 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  );
}

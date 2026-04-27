import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex" style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}>
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a0a0a] flex-col justify-between p-12">
        <span className="text-base font-black tracking-widest uppercase text-white">Billie</span>
        <div>
          <h2 className="text-5xl font-black text-white leading-tight tracking-tight mb-4">
            Expense tracking,<br />the smart way.
          </h2>
          <p className="text-white/50 text-base">
            Text a photo of your receipt. Billie handles the rest.
          </p>
        </div>
        <p className="text-white/30 text-sm">billietracker.com</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-sm w-full">
          <div className="lg:hidden mb-10">
            <span className="text-base font-black tracking-widest uppercase text-[#0a0a0a]">Billie</span>
          </div>

          <h1 className="text-2xl font-black text-[#0a0a0a] mb-1 tracking-tight">Welcome back</h1>
          <p className="text-[#888] text-sm mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-[#0a0a0a] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-[#0a0a0a] transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0a0a0a] text-white py-3 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#888]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#0a0a0a] font-semibold underline underline-offset-4 hover:opacity-60">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

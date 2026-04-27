import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '+1',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let phone = formData.phoneNumber.trim();
      if (phone && !phone.startsWith('+')) phone = '+1' + phone;
      await register({ ...formData, phoneNumber: phone });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a0a0a] flex-col justify-between p-12">
        <span className="text-base font-black tracking-widest uppercase text-white">Billie</span>
        <div>
          <h2 className="text-5xl font-black text-white leading-tight tracking-tight mb-4">
            Track smarter,<br />spend better.
          </h2>
          <p className="text-white/50 text-base">
            Snap a receipt via SMS. Billie logs it instantly.
          </p>
        </div>
        <p className="text-white/30 text-sm">billietracker.com</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-sm w-full">
          <div className="lg:hidden mb-10">
            <span className="text-base font-black tracking-widest uppercase text-[#0a0a0a]">Billie</span>
          </div>

          <h1 className="text-2xl font-black text-[#0a0a0a] mb-1 tracking-tight">Create account</h1>
          <p className="text-[#888] text-sm mb-8">Start tracking your expenses today</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] mb-1.5">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-[#0a0a0a] transition-colors"
                  placeholder="Connor"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] mb-1.5">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-[#0a0a0a] transition-colors"
                  placeholder="Burke"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-[#0a0a0a] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] mb-1.5">
                Phone number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-[#0a0a0a] transition-colors"
                placeholder="+11234567890"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-[#0a0a0a] transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0a0a0a] text-white py-3 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#888]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0a0a0a] font-semibold underline underline-offset-4 hover:opacity-60">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

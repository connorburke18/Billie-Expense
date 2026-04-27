import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-sm w-full">
        <Link to="/" className="text-2xl font-black tracking-widest uppercase text-[#0a0a0a] block mb-12">
          Billie
        </Link>

        {submitted ? (
          <div>
            <h1 className="text-2xl font-black text-[#0a0a0a] mb-3 tracking-tight">Check your email</h1>
            <p className="text-[#555] text-sm leading-relaxed mb-8">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link. It expires in 1 hour.
            </p>
            <Link to="/login" className="text-sm font-semibold text-[#0a0a0a] underline underline-offset-4 hover:opacity-60">
              Back to sign in
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-black text-[#0a0a0a] mb-1 tracking-tight">Forgot password</h1>
            <p className="text-[#888] text-sm mb-8">Enter your email and we'll send a reset link.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
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
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0a0a0a] text-white py-3 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#888]">
              Remember it?{' '}
              <Link to="/login" className="text-[#0a0a0a] font-semibold underline underline-offset-4 hover:opacity-60">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

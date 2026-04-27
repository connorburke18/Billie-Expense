import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Check } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '/mo',
    expenseLimit: '5 expenses/mo',
    seats: 1,
    features: [
      '5 expenses per month',
      '3 email reports',
      'SMS submission',
      'Receipt image storage',
    ],
    cta: 'Get started',
    highlight: false,
  },
  {
    id: 'solo',
    name: 'Solo',
    price: 5,
    period: '/mo',
    expenseLimit: '100 expenses/mo',
    seats: 1,
    features: [
      '100 expenses per month',
      'Unlimited email reports',
      'CSV & Excel export',
      'Receipt image storage',
      'AI categorization',
    ],
    cta: 'Start Solo',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12,
    period: '/mo',
    expenseLimit: '500 expenses/mo',
    seats: 1,
    features: [
      '500 expenses per month',
      'Unlimited email reports',
      'CSV & Excel export',
      'Receipt image storage',
      'AI categorization',
      'Priority support',
    ],
    cta: 'Start Pro',
    highlight: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 25,
    period: '/mo',
    expenseLimit: '500 expenses/seat/mo',
    seats: 3,
    features: [
      '3 seats included (+$8/seat)',
      '500 expenses per seat',
      'Unlimited email reports',
      'CSV & Excel export',
      'Receipt image storage',
      'AI categorization',
      'Priority support',
      'Team management',
    ],
    cta: 'Start Business',
    highlight: false,
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [seats, setSeats] = useState(3);

  const handleSelect = async (planId: string) => {
    if (planId === 'free') {
      navigate('/register');
      return;
    }
    if (!user) {
      navigate('/register');
      return;
    }
    setLoading(planId);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/stripe/create-checkout',
        { plan: planId, seats: planId === 'business' ? seats : 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = res.data.url;
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start checkout');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-200">
        <Link to="/" className="text-xl font-black tracking-widest uppercase text-[#0a0a0a] hover:opacity-60 transition-opacity">
          Billie
        </Link>
        <div className="flex items-center gap-5">
          {user ? (
            <Link to="/dashboard" className="text-sm font-medium text-[#0a0a0a] hover:opacity-60 transition-opacity">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-[#0a0a0a] hover:opacity-60 transition-opacity whitespace-nowrap">
                Sign in
              </Link>
              <Link to="/register" className="text-sm font-semibold bg-[#0a0a0a] text-white px-4 py-2 hover:opacity-80 transition-opacity whitespace-nowrap">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-[#0a0a0a] tracking-tight mb-3">Simple pricing.</h1>
          <p className="text-[#888] text-base">No hidden fees. Cancel anytime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-gray-200 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`p-8 flex flex-col ${plan.highlight ? 'bg-[#0a0a0a] text-white' : 'bg-white'}`}
            >
              <div className="mb-6">
                <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${plan.highlight ? 'text-white/60' : 'text-[#888]'}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-[#0a0a0a]'}`}>
                    ${plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlight ? 'text-white/50' : 'text-[#888]'}`}>{plan.period}</span>
                </div>
                {plan.id === 'business' && (
                  <p className={`text-xs mt-1 ${plan.highlight ? 'text-white/50' : 'text-[#888]'}`}>+ $8/seat after 3</p>
                )}
              </div>

              {plan.id === 'business' && (
                <div className="mb-6">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888] block mb-1.5">
                    Seats
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSeats(Math.max(1, seats - 1))}
                      className="w-7 h-7 border border-gray-300 text-[#0a0a0a] flex items-center justify-center text-sm hover:bg-gray-50"
                    >−</button>
                    <span className="text-[#0a0a0a] font-semibold w-4 text-center">{seats}</span>
                    <button
                      onClick={() => setSeats(seats + 1)}
                      className="w-7 h-7 border border-gray-300 text-[#0a0a0a] flex items-center justify-center text-sm hover:bg-gray-50"
                    >+</button>
                    <span className="text-xs text-[#888]">= ${25 + Math.max(0, seats - 3) * 8}/mo</span>
                  </div>
                </div>
              )}

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-white/70' : 'text-[#0a0a0a]'}`} />
                    <span className={plan.highlight ? 'text-white/80' : 'text-[#555]'}>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 text-sm font-semibold transition-opacity disabled:opacity-40 ${
                  plan.highlight
                    ? 'bg-white text-[#0a0a0a] hover:opacity-80'
                    : 'bg-[#0a0a0a] text-white hover:opacity-80'
                }`}
              >
                {loading === plan.id ? 'Loading...' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#888] mt-6 text-center">
          All plans include a 7-day free trial. No credit card required for Free tier.
        </p>
      </section>
    </div>
  );
}

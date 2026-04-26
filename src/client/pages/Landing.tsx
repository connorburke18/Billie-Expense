import { Link } from 'react-router-dom';
import { Receipt, MessageSquare, BarChart2, Image, Shield, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Billie</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <MessageSquare className="w-3.5 h-3.5" />
          WhatsApp-powered expense tracking
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Snap a receipt.<br />Billie handles the rest.
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Send a photo of any receipt to Billie on WhatsApp and it automatically logs the expense — no apps, no manual entry.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/register"
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-6 py-3">
            Sign in
          </Link>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Everything you need</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                title: 'WhatsApp native',
                desc: 'Just text Billie a receipt photo or describe an expense in plain English. No new apps to download.',
              },
              {
                icon: BarChart2,
                title: 'Smart categorization',
                desc: 'AI automatically categorizes your expenses and gives you summaries, breakdowns, and spending insights.',
              },
              {
                icon: Image,
                title: 'Receipt storage',
                desc: 'Every receipt image is stored permanently so you can retrieve it anytime — great for reimbursements.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-8 py-20">
        <div className="bg-indigo-600 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to stop losing receipts?</h2>
          <p className="text-indigo-200 mb-8">
            By signing up you agree to receive WhatsApp messages from Billie for expense tracking purposes.
            Reply STOP at any time to opt out. Reply HELP for help.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
          >
            Create free account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Receipt className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-600">Billie</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gray-600">Terms of Service</Link>
            <a href="mailto:hello@billietracker.com" className="hover:text-gray-600">Contact</a>
          </div>
          <p>© {new Date().getFullYear()} Billie. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

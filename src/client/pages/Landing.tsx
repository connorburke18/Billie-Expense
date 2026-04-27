import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-200">
        <span className="text-sm font-black tracking-widest uppercase text-[#0a0a0a]">Billie</span>
        <div className="flex items-center gap-5">
          <Link to="/login" className="text-sm font-medium text-[#0a0a0a] hover:opacity-60 transition-opacity whitespace-nowrap">
            Sign in
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold bg-[#0a0a0a] text-white px-4 py-2 hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero split */}
      <section className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-16 flex flex-col md:flex-row">
          <div className="md:w-1/2 pr-0 md:pr-12 pb-10 md:pb-0 md:border-r border-gray-200 flex items-center">
            <h1 className="text-4xl md:text-5xl font-black leading-[1.08] text-[#0a0a0a] tracking-tight">
              Expense tracking<br />should be simple.
            </h1>
          </div>
          <div className="md:w-1/2 pl-0 md:pl-12 flex flex-col justify-center">
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-3 leading-snug">
              Snap a receipt via SMS.<br />Billie logs it automatically.
            </h2>
            <p className="text-[#555] text-sm leading-relaxed mb-7">
              Send a photo of any receipt to Billie and it reads the amount, categorizes the expense, and stores everything — no apps, no spreadsheets, no manual entry.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                to="/register"
                className="text-sm font-semibold bg-[#0a0a0a] text-white px-5 py-2.5 hover:opacity-80 transition-opacity"
              >
                Create free account
              </Link>
              <Link to="/login" className="text-sm font-medium text-[#0a0a0a] hover:opacity-60 transition-opacity underline underline-offset-4">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ background: '#888' }} className="py-16">
        <div className="max-w-6xl mx-auto px-8">
          <h2 className="text-3xl font-black text-white tracking-tight mb-10">Everything included.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/20">
            {[
              {
                title: 'SMS native',
                desc: 'Text Billie a receipt photo or describe an expense in plain English. No app to download.',
              },
              {
                title: 'Smart categorization',
                desc: 'AI reads your receipts and categorizes expenses automatically. Ask for summaries anytime.',
              },
              {
                title: 'Receipt storage',
                desc: 'Every receipt image is stored permanently. Retrieve it anytime — great for reimbursements.',
              },
            ].map(({ title, desc }) => (
              <div key={title} className="py-8 md:py-0 md:px-8 first:pl-0 last:pr-0">
                <h3 className="text-base font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <h2 className="text-3xl md:text-4xl font-black text-[#0a0a0a] tracking-tight leading-tight">
              Ready to stop<br />losing receipts?
            </h2>
            <div className="flex flex-col gap-3">
              <Link
                to="/register"
                className="text-sm font-semibold bg-[#0a0a0a] text-white px-7 py-3 hover:opacity-80 transition-opacity text-center"
              >
                Create free account
              </Link>
              <p className="text-xs text-[#888] leading-relaxed max-w-xs">
                By signing up you agree to receive SMS messages from Billie. Reply STOP to opt out.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-black tracking-widest uppercase text-[#0a0a0a]">Billie</span>
          <div className="flex items-center gap-6 text-xs text-[#888]">
            <Link to="/privacy" className="hover:text-[#0a0a0a] transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#0a0a0a] transition-colors">Terms of Service</Link>
            <a href="mailto:hello@billietracker.com" className="hover:text-[#0a0a0a] transition-colors">Contact</a>
          </div>
          <p className="text-xs text-[#888]">© {new Date().getFullYear()} Billie.</p>
        </div>
      </footer>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Billie</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link to="/register" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">Get started</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-600 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing billietracker.com or using Billie's WhatsApp service, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>Billie is an AI-powered expense tracking service that allows users to log expenses by sending receipt photos or text messages via WhatsApp, and to view and manage those expenses through a web dashboard at billietracker.com.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Eligibility</h2>
            <p>You must be at least 18 years of age to use Billie. By using the service you represent that you meet this requirement.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Account Registration</h2>
            <p>You may create an account by registering at billietracker.com or by initiating a conversation with Billie on WhatsApp. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. WhatsApp Messaging Terms</h2>
            <p>By providing your phone number and using Billie via WhatsApp, you expressly consent to receive automated WhatsApp messages from Billie for the purpose of expense tracking, confirmations, and account notifications.</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Opt-in:</strong> Consent is given when you create an account at billietracker.com or initiate a WhatsApp conversation with Billie.</li>
              <li><strong>Opt-out:</strong> You may opt out at any time by replying <strong>STOP</strong> to any Billie message. After opting out, you will receive a single confirmation message and no further messages.</li>
              <li><strong>Help:</strong> Reply <strong>HELP</strong> to any Billie message or email hello@billietracker.com for support.</li>
              <li>Message frequency varies based on your usage of the service.</li>
              <li>Standard WhatsApp and mobile data rates may apply depending on your carrier plan.</li>
              <li>Billie will never send unsolicited promotional messages unrelated to your expense tracking activity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Use the service for any unlawful purpose.</li>
              <li>Attempt to gain unauthorized access to any part of the service.</li>
              <li>Submit false, misleading, or fraudulent expense information.</li>
              <li>Abuse or spam the WhatsApp messaging system.</li>
              <li>Reverse engineer or attempt to extract the source code of Billie.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Data and Privacy</h2>
            <p>Your use of Billie is also governed by our <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>, which is incorporated into these Terms by reference.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. AI-Generated Content</h2>
            <p>Billie uses artificial intelligence to parse receipts and categorize expenses. While we strive for accuracy, AI-generated categorizations and summaries may contain errors. You are responsible for verifying the accuracy of your expense records.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Disclaimer of Warranties</h2>
            <p>Billie is provided "as is" without warranties of any kind, express or implied. We do not guarantee that the service will be uninterrupted, error-free, or that expense data will be captured with 100% accuracy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Billie shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service, including any financial decisions made based on expense data provided by Billie.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time for violations of these Terms. You may delete your account at any time by contacting hello@billietracker.com.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Changes to Terms</h2>
            <p>We may modify these Terms at any time. Continued use of the service after changes are posted constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">13. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:hello@billietracker.com" className="text-indigo-600 hover:underline">hello@billietracker.com</a>.</p>
          </section>

        </div>
      </div>

      <footer className="border-t border-gray-100 py-8 px-8 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>© {new Date().getFullYear()} Billie</span>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gray-600">Terms of Service</Link>
            <a href="mailto:hello@billietracker.com" className="hover:text-gray-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

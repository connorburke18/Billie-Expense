import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';

export default function Privacy() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-600 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>Billie ("we", "our", or "us") operates the expense tracking service available at billietracker.com and via SMS messaging. This Privacy Policy explains how we collect, use, and protect your personal information when you use our service.</p>
            <p className="mt-2">By registering for Billie or sending us a message, you agree to this Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account information:</strong> Name, email address, and password when you register.</li>
              <li><strong>Phone number:</strong> Your mobile phone number used to send and receive SMS messages.</li>
              <li><strong>Expense data:</strong> Amounts, merchants, categories, dates, and descriptions of expenses you submit.</li>
              <li><strong>Receipt images:</strong> Photos of receipts you send via SMS, stored permanently for your retrieval.</li>
              <li><strong>Message content:</strong> Text messages sent to Billie via SMS for the purpose of logging and querying expenses.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide the expense tracking service, including parsing receipts and responding to your queries.</li>
              <li>To send you SMS messages in response to your expense submissions and questions.</li>
              <li>To store and display your expenses on the Billie web dashboard.</li>
              <li>To improve the accuracy and quality of our AI-powered parsing and categorization.</li>
              <li>To contact you about your account at hello@billietracker.com.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. SMS Messaging</h2>
            <p>By registering for Billie or texting our SMS number, you consent to receive SMS messages from Billie for the purpose of expense tracking, confirmations, and account-related notifications.</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Opt-in:</strong> You opt in by creating an account on billietracker.com or by texting Billie.</li>
              <li><strong>Opt-out:</strong> Reply <strong>STOP</strong> at any time to stop receiving messages from Billie.</li>
              <li><strong>Help:</strong> Reply <strong>HELP</strong> for assistance or contact us at hello@billietracker.com.</li>
              <li>Message frequency varies based on your usage. Message and data rates may apply.</li>
              <li>We do not sell your phone number or message data to third parties for marketing purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Sharing</h2>
            <p>We do not sell your personal information. We share data only with third-party service providers necessary to operate Billie, including providers for message delivery, AI-powered parsing, image storage, and application hosting. These providers are contractually obligated to protect your data and may not use it for their own purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <p>We retain your expense data and account information for as long as your account is active. Receipt images are stored permanently unless you delete the associated expense. You may request deletion of your account and all associated data by emailing hello@billietracker.com.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Security</h2>
            <p>We use industry-standard security practices including encrypted connections (HTTPS), hashed passwords, and secure cloud storage. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data at any time. Contact us at <a href="mailto:hello@billietracker.com" className="text-indigo-600 hover:underline">hello@billietracker.com</a> to make a request.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contact</h2>
            <p>If you have questions about this Privacy Policy, please contact us at <a href="mailto:hello@billietracker.com" className="text-indigo-600 hover:underline">hello@billietracker.com</a>.</p>
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

export default function Privacy() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-card w-full max-w-2xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Privacy Policy</h1>
          <p className="text-xs text-gray-400 mt-1">Last updated: March 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">What data we collect</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            KeyJourney collects only the data you enter yourself: your name, savings amounts, monthly contributions,
            apartment price targets, mortgage details, viewed apartments, bid history, checklist tasks,
            target areas, BRF financial details (debt, monthly fee, land ownership), and notes.
            We also store your email address to identify your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Where it is stored</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            All data is stored in Supabase, a PostgreSQL database hosted within the European Union.
            Data is not transferred to or processed by any third party outside the EU.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Who can see your data</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Only you can see your data. Every record in the database is isolated by your user ID using
            Row Level Security — no other user or account can access your information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">How to delete your data</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            You can delete all your data at any time from the Dashboard page using the
            "Delete" option. This permanently removes all records associated with your account.
            To fully delete your account, contact us at the email below.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Contact</h2>
          <p className="text-sm text-gray-500">For any privacy-related questions, contact the app owner directly.</p>
        </section>

        <a href="/login" className="inline-block text-xs text-teal-600 hover:underline">← Back to login</a>
      </div>
    </div>
  )
}

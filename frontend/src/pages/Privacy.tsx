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
            KeyJourney collects only the data you enter yourself: your name, savings amounts,
            monthly contributions, apartment price targets, loan promise details, viewed apartments,
            bid tracking, viewing reminders, checklist tasks, target areas, BRF financial details,
            listing comparisons, and calculator snapshots. We also store your email address to
            identify your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Where it is stored</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            All data is stored in Supabase — a PostgreSQL database hosted within the European Union.
            Data is not transferred to or processed by any third party outside the EU. Structured
            data (viewings, settings, target areas, reminders) is stored in dedicated tables.
            Unstructured data (checklist, comparisons, BRF checks, calculator snapshots) is stored
            as JSON blobs, also in Supabase.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Who can see your data</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Only you can see your data. Every record is isolated by your user ID using Row Level
            Security (RLS) in Supabase — no other user or account can access your information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Third-party services</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            The Maps page embeds Google Maps via an iframe for area exploration and directions.
            If you use the map, Google's standard privacy policy applies to that interaction.
            No data you enter into KeyJourney is sent to Google. Login via Google OAuth is
            optionally supported — if used, Google's authentication policy also applies.
            The app also loads the Manrope font from Google Fonts, which may log your IP address
            per Google's standard font CDN policy.
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            The Calculator and Comparison pages fetch the current Swedish mortgage bond rate
            from the Riksbank public API. This is a read-only request — no personal data is sent.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Export and deletion</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            You can export a full backup of all your data as an Excel file at any time from the
            Overview page. You can also permanently delete all your data using the Delete option
            in the same menu. This immediately removes all records associated with your account.
            To fully delete your account, contact the app owner directly.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Contact</h2>
          <p className="text-sm text-gray-500">For any privacy-related questions, contact the app owner directly.</p>
        </section>

      </div>
    </div>
  )
}

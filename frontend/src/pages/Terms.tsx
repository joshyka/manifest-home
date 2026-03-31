export default function Terms() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-card w-full max-w-2xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Terms of Service</h1>
          <p className="text-xs text-gray-400 mt-1">Last updated: March 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Use of the service</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            KeyJourney is a private home-buying tracker for personal use. Access is restricted to
            authorised users only. You may not share your login credentials or attempt to access
            another user's data. You may optionally share data access with one partner via the
            Household feature in Settings — both members are responsible for how that shared access is used.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Your data</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            All data you enter belongs to you. It is used solely to power your experience within the
            app — savings tracking, viewings, bid tracking (asking price, bid rounds, trend analysis), checklists, BRF health checks,
            listing comparisons, mortgage snapshots, and target areas. We do not sell, share,
            or monetise your data. You can export a full backup at any time from the Overview page,
            or permanently delete all your data from the Settings page. If you are part of a
            household, both members access the same data — leaving or removing a partner immediately
            revokes shared access.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">No financial advice</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            The mortgage calculator, savings projections, stress test figures, BRF health scores,
            and listing cost estimates in KeyJourney are for informational purposes only. They do
            not constitute financial, legal, or mortgage advice. Interest rates shown are fetched
            from the Riksbank public API (Swedish 5-year mortgage bond rate) and are indicative only —
            your actual mortgage rate will vary by lender, credit profile, and loan terms.
            Amortisation rules and tax relief figures are estimates based on Swedish conventions
            and may not reflect your exact situation. Always consult a qualified adviser before
            making financial decisions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Availability</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            We aim to keep the service available but cannot guarantee uninterrupted access.
            The service may be updated, changed, or discontinued at any time without notice.
          </p>
        </section>

      </div>
    </div>
  )
}

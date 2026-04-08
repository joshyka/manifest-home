import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Section {
  title: string
  items: { q: string; a: string }[]
}

const SECTIONS: Section[] = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'Where do I begin?',
        a: 'Start on the Savings page — enter your names, current savings, and monthly contributions, then add your loan promise details.\nThe Overview page will then show your full progress at a glance.\nUse Viewings to log apartments you visit, Comparison to compare listings side by side, and Checklist to track every step of the buying process.\nMaps lets you explore neighbourhoods and manage your target areas.',
      },
    ],
  },
  {
    title: 'Checklist',
    items: [
      {
        q: 'How does the checklist work?',
        a: 'Drag and drop cards to reorder or move them between columns (To Do, In Progress, Done).\nClick the pencil icon to edit a task — update the label, set a due date, and assign it to a person (you, your partner, or both).\nDue date badges are colour-coded: red = overdue, amber = due today or within 3 days, gray = future.\nAssigned tasks show a name pill on the card — useful for splitting tasks between partners.',
      },
    ],
  },
  {
    title: 'Viewings',
    items: [
      {
        q: 'How do viewings work?',
        a: 'Tap + to log a viewing — enter the address, date, and whether you went to bidding with all bid rounds as comma-separated amounts.\nClick the Chart button on any bidding row to toggle the bid escalation chart.\nClick the archive icon to hide a viewing from the main list — it stays in the database.\nUse "Show archived" at the bottom to view archived entries.',
      },
    ],
  },
  {
    title: 'Comparison',
    items: [
      {
        q: 'How does the comparison board work?',
        a: 'Add listings and edit all fields directly on the card — price, size, rooms, avgift, notes, and rating.\nThe best value badge highlights the listing with the lowest price per sqm across all cards.\nSave a named snapshot of the current board at any time — load it back later to compare against new listings.\nLoading a snapshot when active items exist will ask you to confirm before replacing them.',
      },
    ],
  },
  {
    title: 'Maps & target areas',
    items: [
      {
        q: 'How do Maps and target areas work?',
        a: 'The Maps page shows a Google Maps embed for exploring neighbourhoods and finding nearby amenities.\nTarget areas let you save areas of interest with a priority (High, Medium, or Low) — manage them from the Maps page or the Overview.\nTarget areas are shared with your partner if you are in a household.',
      },
    ],
  },
  {
    title: 'Household sharing',
    items: [
      {
        q: 'How do I share access with my partner?',
        a: 'Go to Settings → Share House. An invite code is generated immediately — share it with your partner. They enter it under Settings → Join House on their own account. The code expires after 48 hours.',
      },
      {
        q: 'What can my partner see and do?',
        a: 'Your partner sees all your data — savings, viewings, checklist, comparisons, calculator snapshots, BRF checks, and target areas. Everything is shared; there is no private data within a household.\nBoth members can add, edit, and delete data. Changes are reflected for both instantly.',
      },
      {
        q: 'What happens when I remove my partner?',
        a: 'Their access is revoked immediately and they revert to their own account data. No data is deleted — your data stays intact, and so does theirs.',
      },
    ],
  },
  {
    title: 'Calculator',
    items: [
      {
        q: 'How does the calculator work?',
        a: 'Enter the apartment price and your loan details — the calculator shows your estimated monthly cost using the live Riksbank mortgage rate.\nThe stress test shows the same cost at 7%, which is how Swedish banks assess your repayment ability.\nRänteavdrag (tax relief on interest) is applied automatically — 30% back up to 100 000 kr/year, 21% above that.\nYou can save calculator snapshots to compare different price scenarios over time.',
      },
    ],
  },
  {
    title: 'BRF Checker',
    items: [
      {
        q: 'How do I read the BRF results?',
        a: 'Debt/sqm: the BRF\'s total loans divided by living area — under 5 000 kr/sqm is healthy, higher means risk of fee increases.\nFee/sqm: monthly avgift per sqm — a very low fee can indicate deferred maintenance costs.\nLand ownership: if the BRF leases the land (tomträtt), ground rent can be renegotiated upward — a significant financial risk.\nUse the results as a guide, not a guarantee — always review the full BRF annual report.',
      },
    ],
  },
  {
    title: 'Data & privacy',
    items: [
      {
        q: 'How do I export or delete my data?',
        a: 'Go to Settings → Export to download a full Excel backup of all your data.\nTo delete everything, go to Settings → Danger Zone → Delete all data. This is permanent and cannot be undone.\nYour login account is not deleted — only the data associated with it.',
      },
      {
        q: 'Is my data private?',
        a: 'Yes. All data is isolated to your user account — no other user can access your information. Data is stored in the EU and is never sold or shared.',
      },
    ],
  },
]

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        className="w-full flex items-center justify-between gap-3 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-sm font-semibold text-gray-800">{q}</span>
        {open ? <ChevronUp size={14} className="text-teal-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-300 shrink-0" />}
      </button>
      {open && (
        <div className="text-sm text-gray-500 leading-relaxed pb-3 space-y-1">
          {a.split('\n').map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}
    </div>
  )
}

export default function Help() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Help</h1>
        <p className="text-sm text-gray-400 mt-0.5">Answers to common questions about KeyJourney.</p>
      </div>

      {SECTIONS.map(section => (
        <div key={section.title} className="card">
          <h2 className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-3">{section.title}</h2>
          {section.items.map(item => (
            <AccordionItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      ))}
    </div>
  )
}

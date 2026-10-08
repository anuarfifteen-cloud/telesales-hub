import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// The full Blackjack 21 guide: one accordion section per topic, each holding its
// questions (or named rules) with the answer written for players, not admins.
const SECTIONS = [
  {
    id: "basics",
    icon: "🎯",
    title: "Blackjack Basics",
    items: [
      {
        q: "What is the goal?",
        a: "Get a hand total closer to 21 than the Dealer's — without going over 21.",
      },
      {
        label: "Card values",
        a: "2 to 10 = face value. Jack, Queen and King = 10 each. Ace = 1 or 11, whichever makes your hand better.",
      },
      {
        label: "The deal",
        a: "You and the Dealer each get 2 cards. Both of the Dealer's cards start face down — the Dealer's hand is only turned over once your turn ends.",
      },
      {
        label: "Your move",
        a: "Hit = draw one more card to get closer to 21. Stand = keep your total and end your turn.",
      },
      {
        label: "Dealer's turn",
        a: "The Dealer turns its cards over and plays its own hand by the house rules — its strategy stays private.",
      },
      {
        label: "Who wins",
        a: "The hand closest to 21 without going over wins the round. Going over 21 is a Bust — an instant loss. Matching the Dealer's total is a Push and your chips come back.",
      },
      {
        label: "Natural Blackjack",
        a: "An Ace + a 10-value card on your first two cards. That's a Blackjack — the best hand in the game!",
      },
    ],
  },
  {
    id: "daily",
    icon: "🎁",
    title: "Daily Free Chips",
    items: [
      {
        q: "How do I get free chips?",
        a: "Visit the Token Tab every day to claim 5 FREE Casino Chips automatically!",
      },
    ],
  },
  {
    id: "buying",
    icon: "💵",
    title: "Buying Chips",
    items: [
      {
        q: "How do I get more chips?",
        a: "Convert Tokens to Chips in the Cashier. Standard rate: 1 Token = 10 Chips — plus bonus chips on the 10 and 50 Token bundles!",
      },
    ],
  },
  {
    id: "playing",
    icon: "🎲",
    title: "Playing & Winning Tokens",
    items: [
      {
        q: "How do payouts work?",
        a: "Place bets in increments of 5 Chips (5, 10, 15, 20...).",
      },
      {
        label: "Standard Win",
        a: "Standard wins credit whole Tokens directly to your main wallet at 10 Chips = 1 Token! (e.g. a 5-Chip wager returns 10 Chips total = 1 Token in your wallet).",
      },
      {
        label: "Natural 21 (Blackjack)",
        a: "Ace + a 10-value card on your first 2 cards. It pays your normal win — 2× your bet, cashed in at 10 Chips = 1 Token — PLUS a flat 10-Token bonus on top, no matter how big or small your bet is. (e.g. a 5-Chip bet pays 1 Token + 10 bonus = 11 Tokens.)",
      },
      {
        label: "Push (Tie)",
        a: "Your original chips are returned to your chip balance.",
      },
    ],
  },
  {
    id: "cashout",
    icon: "🏦",
    title: "Cashing Out",
    items: [
      {
        q: "Can I convert chips back to Tokens?",
        a: "Yes! You can cash out unused chips in the Cashier in steps of 20 Chips (20 Chips = 1 Token).",
      },
      {
        label: "Pro Tip",
        a: "Playing Blackjack and winning bypasses the 50% Cash-Out fee and pays full 1:1 Token value directly to your main wallet!",
      },
    ],
  },
];

/** A question with its answer, shown straight under the question line. */
function QuestionRow({ q, a }) {
  return (
    <div className="space-y-1">
      <p className="text-[12px] font-black text-amber-100">{q}</p>
      <p className="text-[11.5px] leading-relaxed text-emerald-100/80">{a}</p>
    </div>
  );
}

/** A named rule (Standard Win, Push, Pro Tip...) on its own gold-trimmed card. */
function RuleCard({ label, a }) {
  return (
    <div
      className="rounded-2xl px-3 py-2.5"
      style={{ background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.35)" }}
    >
      <p className="text-[11px] font-black uppercase tracking-widest text-amber-300">{label}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-emerald-100/85">{a}</p>
    </div>
  );
}

export default function BlackjackGuideContent() {
  return (
    <Accordion type="multiple" defaultValue={["basics"]} className="w-full">
      {SECTIONS.map((section) => (
        <AccordionItem key={section.id} value={section.id} className="border-amber-400/20">
          <AccordionTrigger className="py-3 text-[12px] font-black uppercase tracking-widest text-amber-200 hover:no-underline [&>svg]:text-amber-300">
            <span className="flex items-center gap-2">
              <span className="text-base">{section.icon}</span>
              {section.title}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2.5 pb-3">
            {section.items.map((item, i) =>
              item.q ? (
                <QuestionRow key={i} q={item.q} a={item.a} />
              ) : (
                <RuleCard key={i} label={item.label} a={item.a} />
              )
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
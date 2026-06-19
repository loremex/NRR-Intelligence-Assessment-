import type { V2LeverKey } from '../lib/scoring'

export const V2_LEVERS = ['impact', 'whitespace', 'accountability', 'playbook', 'execution', 'governance'] as const

export const V2_LEVER_LABELS: Record<V2LeverKey, string> = {
  impact: 'Impact intelligence',
  whitespace: 'Whitespace intelligence',
  accountability: 'Accountability intelligence',
  playbook: 'Playbook intelligence',
  execution: 'Execution intelligence',
  governance: 'Governance intelligence',
}

export interface V2Scenario {
  text: string
}

export interface V2LeverContent {
  lever: V2LeverKey
  title: string
  question: string
  scenarios: [V2Scenario, V2Scenario, V2Scenario, V2Scenario, V2Scenario]
}

export interface V2CapabilityContent {
  key: 'retention' | 'expansion' | 'pricing'
  name: string
  levers: [V2LeverContent, V2LeverContent, V2LeverContent, V2LeverContent, V2LeverContent, V2LeverContent]
}

export const V2_ASSESSMENT_CONTENT: V2CapabilityContent[] = [
  {
    key: 'retention',
    name: 'Revenue Retention',
    levers: [
      {
        lever: 'impact',
        title: 'Impact intelligence',
        question: 'Can your team show, right now, the quantified value each customer is getting from you — or do you only know at QBR time, in slides, after the fact?',
        scenarios: [
          { text: "We don't really measure this. If the customer is happy and using the product, we assume value is there." },
          { text: 'CSMs know it qualitatively for their top customers, from conversations. Nothing systematic.' },
          { text: 'We capture impact at QBRs and renewals. It lives in slides — backward-looking, not continuous.' },
          { text: 'Realized value is tracked per customer in a system. Reviewed monthly, used in renewal forecasting.' },
          { text: 'Value signals are continuous and predictive. We know if a customer is silently losing faith before they do.' },
        ],
      },
      {
        lever: 'whitespace',
        title: 'Whitespace intelligence',
        question: 'If a customer was going to churn in the next two quarters, would your system tell you — or would you find out from the customer?',
        scenarios: [
          { text: "We find out when the customer tells us. We don't have a system for spotting churn risk early." },
          { text: 'We catch it from soft signals — CSM gut, a missed meeting, a support pattern. Often too late.' },
          { text: 'Quarterly risk review surfaces big risks. Smaller patterns slip through.' },
          { text: 'Health scores and risk signals live in the CRM. The team reviews them weekly and escalates.' },
          { text: 'Risk fires automatically from leading indicators across product, support, and stakeholder data. We act before the customer feels it.' },
        ],
      },
      {
        lever: 'accountability',
        title: 'Accountability intelligence',
        question: "Is retention something specific people in your org are measured, paid, and visibly accountable for — or is it everyone's job and no one's number?",
        scenarios: [
          { text: "Retention isn't really in anyone's number. CS is \"responsible\" but nothing measurable hangs on it." },
          { text: 'CS comp is tied to satisfaction, tenure, or coverage. Retention is implicit, not explicit.' },
          { text: "CSMs have renewal targets, but they're soft. Most variable comp is elsewhere." },
          { text: 'CSMs and CS leaders carry GRR and NRR targets, with clear bonus tied to retention outcomes.' },
          { text: 'Retention is weighted across CS, Sales, and Product. Comp, dashboards, and operating reviews are all aligned to net retention.' },
        ],
      },
      {
        lever: 'playbook',
        title: 'Playbook intelligence',
        question: 'When a customer turns red, is there a real recovery plan with named owners and a timeline — or does it depend on whichever CSM happens to own them?',
        scenarios: [
          { text: "Honestly, we don't have a defined recovery motion. We hope, or we discount." },
          { text: 'Depends on the CSM. They do what they can with what they have.' },
          { text: 'We pull a recovery plan together for the biggest red customers. Quality is uneven across the team.' },
          { text: 'Every red customer has a defined recovery plan — named owners, actions, review cadence.' },
          { text: 'Recovery plans are templated, tracked with milestone status, and reviewed in operating cadence with learnings fed back into the system.' },
        ],
      },
      {
        lever: 'execution',
        title: 'Execution intelligence',
        question: 'When a retention risk fires — a red customer, a champion loss, a usage drop — how fast can your team actually mobilize and act on it?',
        scenarios: [
          { text: 'Slow. Weeks, or until something forces it to the top of the pile.' },
          { text: 'It depends. Sometimes days, sometimes weeks. It moves when someone senior pushes.' },
          { text: "We respond, but the path from signal to action is manual. There's a meeting, then a follow-up, then someone acts." },
          { text: 'Signals route to defined owners with a target response window. Most fire within days, not weeks.' },
          { text: 'Risk signals trigger named actions automatically, assigned and tracked. Response time is measured and improving.' },
        ],
      },
      {
        lever: 'governance',
        title: 'Governance intelligence',
        question: 'Is retention something you actively run in your operating rhythm — or does it only surface when something breaks?',
        scenarios: [
          { text: "It only surfaces when something breaks — a big churn, a board question. No regular cadence." },
          { text: "It comes up when there's noise, otherwise it's CS's problem." },
          { text: "Quarterly retention review. Numbers get reported but action items don't always follow through." },
          { text: 'Monthly retention review with leadership. Risks, recoveries, and patterns tracked across the portfolio.' },
          { text: 'Net retention is a top-line metric in every operating cadence, with clear owners, leading indicators, and learnings feeding back into how the team operates.' },
        ],
      },
    ],
  },
  {
    key: 'expansion',
    name: 'Revenue Expansion',
    levers: [
      {
        lever: 'impact',
        title: 'Impact intelligence',
        question: "Before you walk into an expansion conversation, can you show the customer the quantified value they've already gotten — or are you asking them to buy more on faith?",
        scenarios: [
          { text: "We don't really quantify it. We rely on the relationship and the customer's general sentiment." },
          { text: "The rep or CSM puts together impact numbers when an expansion conversation comes up. It's anecdotal and uneven." },
          { text: "We pull a value summary from QBR materials before an expansion ask. It's backward-looking and slide-based." },
          { text: 'Realized value per customer is tracked continuously and used to frame every expansion conversation.' },
          { text: 'The value story is live, quantified, and tied to the specific expansion ask — we walk in with proof, not pitch.' },
        ],
      },
      {
        lever: 'whitespace',
        title: 'Whitespace intelligence',
        question: 'If I asked you right now which customers have the most untapped expansion potential — and where — could your team tell me, with data?',
        scenarios: [
          { text: "Not really. We know our biggest customers but not where the headroom is across the base." },
          { text: "The reps know their own accounts. There's no portfolio-level view of whitespace." },
          { text: 'We do whitespace exercises once or twice a year — usually for planning. The data goes stale fast.' },
          { text: 'Whitespace is mapped per customer in our CRM — product gaps, seat gaps, tier gaps — and refreshed quarterly.' },
          { text: 'Whitespace is live and signal-driven — we see opportunity emerge across the portfolio in real time.' },
        ],
      },
      {
        lever: 'accountability',
        title: 'Accountability intelligence',
        question: "Is expansion in a specific person's number — with comp, targets, and visibility — or does it just happen when it happens?",
        scenarios: [
          { text: "It just happens. Nobody owns it as a number. We celebrate it when it comes in." },
          { text: "Sales or CS will pursue expansion when they see it, but it's not formally in their plan." },
          { text: "Account managers have expansion targets, but they're soft and most of the comp is elsewhere." },
          { text: 'AMs and CSMs carry explicit expansion targets with bonus tied to them. Quotas are set and tracked.' },
          { text: 'Expansion is owned across Sales, CS, and Product with aligned comp, dashboards, and operating reviews.' },
        ],
      },
      {
        lever: 'playbook',
        title: 'Playbook intelligence',
        question: 'When an expansion opportunity surfaces — usage spike, new buyer, new use case — is there a defined motion to pursue it, or does it depend entirely on the rep?',
        scenarios: [
          { text: 'It depends on the rep. The best ones run their own playbook, the rest improvise.' },
          { text: "We have some shared best practices, but they're tribal. Quality varies a lot." },
          { text: 'We have documented motions for the main expansion types. Adoption is uneven across the team.' },
          { text: 'Defined plays exist for each expansion type, tied to triggers, and most reps run them consistently.' },
          { text: 'Plays are triggered automatically by signal, assigned to the right owner, and measured for win rate.' },
        ],
      },
      {
        lever: 'execution',
        title: 'Execution intelligence',
        question: 'Once an expansion play kicks off, how reliably does it get driven to a decision — with the right people, the right timing, and the right asks — instead of stalling?',
        scenarios: [
          { text: 'Plays often stall. They lose momentum once the initial enthusiasm fades.' },
          { text: "It depends who's driving. Some reps push them through, others let them drift." },
          { text: 'We track active expansion plays and review them, but slippage is common in the middle stages.' },
          { text: 'Every active play has a defined cadence, named owner, and clear next-step accountability. Slippage is visible and addressed.' },
          { text: 'Plays are tracked end-to-end with stage-by-stage measurement. Bottlenecks surface fast and feed back into the motion.' },
        ],
      },
      {
        lever: 'governance',
        title: 'Governance intelligence',
        question: 'Is expansion something you actively run in your operating rhythm — or does it surface mainly at renewal time, as an afterthought?',
        scenarios: [
          { text: "It surfaces at renewal, if at all. Otherwise we're focused on new logos and retention." },
          { text: "Expansion gets reviewed in big-deal forecast calls but not as its own discipline." },
          { text: 'Quarterly expansion review. Pipeline gets discussed, action items follow inconsistently.' },
          { text: 'Monthly expansion review with leadership. Pipeline, conversion, and patterns tracked across the portfolio.' },
          { text: 'Expansion is a top-line operating metric — pipeline, win rate, leading indicators — with learnings fed back into plays.' },
        ],
      },
    ],
  },
  {
    key: 'pricing',
    name: 'Pricing Optimization',
    levers: [
      {
        lever: 'impact',
        title: 'Impact intelligence',
        question: "Before you propose a price increase or new pricing structure to a customer, can you show them the quantified value they've gotten — or is the conversation mostly about cost and market rates?",
        scenarios: [
          { text: "We don't anchor pricing to value delivered. Conversations default to market benchmarks and customer pushback." },
          { text: "The rep or CSM puts together value numbers when a pricing conversation comes up. It's anecdotal." },
          { text: 'We pull value data from QBR materials before a renewal pricing conversation. Backward-looking, slide-based.' },
          { text: 'Realized value per customer is tracked continuously and used to frame every pricing conversation.' },
          { text: 'Pricing conversations open with a quantified value story tied to outcomes — we ask for more because we can prove more.' },
        ],
      },
      {
        lever: 'whitespace',
        title: 'Whitespace intelligence',
        question: "If I asked you which customers are underpriced relative to the value they're getting — and by how much — could your team tell me, with data?",
        scenarios: [
          { text: "Not really. We know list price vs. what we charge, but not value vs. price by customer." },
          { text: "Reps have a gut feel for which customers are getting a deal. There's no portfolio-level view." },
          { text: 'We do pricing reviews once or twice a year and flag underpriced customers for renewal. Data goes stale fast.' },
          { text: 'Underpricing is tracked per customer — value delivered vs. price paid — and refreshed quarterly. Reps see it before renewal.' },
          { text: 'Value-to-price gap is live across the portfolio, signals fire when customers drift into underpriced territory.' },
        ],
      },
      {
        lever: 'accountability',
        title: 'Accountability intelligence',
        question: "Is pricing — price realization, discount discipline, renewal uplift — in a specific person's number? Or is it everyone's responsibility and no one's metric?",
        scenarios: [
          { text: "Pricing isn't really in anyone's number. We track ARR but not price realization or discount erosion." },
          { text: "Finance watches it, but it's not in Sales or CS comp. Pricing slippage is reported, not owned." },
          { text: 'Sales has a discount-cap policy but enforcement is uneven. Renewal uplift is a soft target.' },
          { text: 'Sales and CS leaders carry explicit targets on price realization and renewal uplift, with comp tied to it.' },
          { text: 'Pricing outcomes are owned across Sales, CS, RevOps, and Finance with aligned comp, dashboards, and operating reviews.' },
        ],
      },
      {
        lever: 'playbook',
        title: 'Playbook intelligence',
        question: 'When a pricing event happens — renewal, expansion, partial churn, cross-sell — does the team have a defined motion to capture the right price, or does it depend on the rep?',
        scenarios: [
          { text: 'It depends entirely on the rep. The best ones negotiate well; the rest leave money on the table.' },
          { text: "We have some shared best practices and discount guidelines, but they're tribal and inconsistently applied." },
          { text: 'We have defined motions for renewal uplift and basic discounting. Packaging, bundling, and reinstatement are case-by-case.' },
          { text: 'Defined playbooks cover renewal uplift, expansion pricing, bundle offers, and partial-churn repricing. Contracts have built-in protections (penalties, reinstatement, abuse-of-license).' },
          { text: 'Pricing motions are systematic — predefined upsell paths, packaged bundles for consolidation, automatic repricing on product drop, and tested discount tiers — built into how every deal is structured.' },
        ],
      },
      {
        lever: 'execution',
        title: 'Execution intelligence',
        question: 'When a rep quotes a deal — renewal, expansion, restructure — how disciplined is the path from opportunity to signed contract? Is it driven by a system, or by spreadsheets and approvals up the chain?',
        scenarios: [
          { text: 'Quotes are spreadsheets. Discount approvals are negotiated up the management chain, deal by deal.' },
          { text: "We have a CPQ tool but it's underused. Most real quoting still happens off-system." },
          { text: "CPQ handles most deals and is integrated with CRM. Discount guidance is rule-based but static — doesn't adapt to the deal." },
          { text: 'CPQ handles the vast majority of expansion and renewal quoting, with dynamic deal-scoring giving reps tailored discount guidance per deal.' },
          { text: 'Quoting is fully automated with deal-scoring models that surface optimal pricing per deal and learn from outcomes — discount slippage is measured and shrinking.' },
        ],
      },
      {
        lever: 'governance',
        title: 'Governance intelligence',
        question: 'Is pricing run in your operating rhythm — price realization, discount trends, packaging performance reviewed in cadence — or is pricing set once and revisited rarely?',
        scenarios: [
          { text: 'Pricing is revisited when it breaks — a major deal, a competitor move, a board ask. No regular cadence.' },
          { text: "Pricing comes up in annual planning. Otherwise it's RevOps or Finance running the numbers in isolation." },
          { text: "Quarterly pricing review. Discount trends and renewal uplift get reported, but action items don't always follow through." },
          { text: 'Monthly pricing review with leadership. Price realization, discount discipline, package performance tracked across the portfolio.' },
          { text: 'Pricing is a top-line operating metric — realization, leakage, package mix, renewal uplift — with learnings feeding back into playbooks and contracts.' },
        ],
      },
    ],
  },
]

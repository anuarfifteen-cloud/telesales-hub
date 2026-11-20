// Pure frontend text builders for the Workspace tab: no records, no integrations.

export const CRM_AGENTS = [
  "MOHAMMAD ANWARUDDIN BIN EMBRAN",
  "MUHD NUR AIMAN NAJIB BIN JALANI",
  "NOR ADIBAH HAJI ASLI",
  "ANIL HAKIM BIN NURUL ARSHIL AZIM",
  "NURUL DIANA YA'AKUB",
  "MUHAMMAD KASHIRAN BIN ABDULLAH",
  "SALWA LAMAT",
  "NURUL HUSNINA NADIA JOHARI",
  "DAYANG SITI NURUSUHADDAH HJ SELAMAT",
  "NURUL AZIEMAH @AZIMAH BINTI ASMIN",
  "NURUL KAMALIAH HJ SALIM",
  "NURAQILAH @NUR ATIQAH BINTI JEFERIDIN",
  "NUR HALIMATUL SA'ADAH HAJI ASSIM",
  "SITI NURAFIQAH HJ HASHIM",
];

/** Plan amounts offered per plan. EASI is pay-per-use, so it has none. */
export const PLAN_AMOUNTS = {
  freedom: [18, 28, 48, 68, 88, 168],
};

/** Mobi registration choices, written into the note exactly as shown. */
export const MOBI_PLAN_TYPES = [
  "$18 NON-CONTRACT (6GB)",
  "$30 NON-CONTRACT (15GB)",
  "$50 NON-CONTRACT (30GB)",
  "$80 NON-CONTRACT (65GB)",
  "$18 MORE DATA (8GB) 24M CONTRACT",
  "$30 MORE DATA (18GB) 24M CONTRACT",
  "$50 MORE DATA (35GB) 24M CONTRACT",
  "$80 MORE DATA (70GB) 24M CONTRACT",
];

/** Infinity registration choices, written into the note exactly as shown. */
export const INFINITY_PLAN_TYPES = [
  "$38 (650GB) 24M CONTRACT",
  "$58 (1000GB) 24M CONTRACT",
  "$78 (1500GB) 24M CONTRACT",
  "$98 (2000GB) 24M CONTRACT",
  "$148 (2500GB) 24M CONTRACT",
  "$148 BUL (UNLIMITED) 24M CONTRACT",
  "$188 BUL (UNLIMITED) 24M CONTRACT",
];

export const BRANCHES = [
  "Rimba Point",
  "Yayasan",
  "Airport Mall",
  "Times Square",
  "Gadong",
  "Tutong",
  "KB",
  "Seria",
  "Temburong",
];

/** YYYY-MM-DD → DD/MM/YYYY, the format the notes are written in. */
export function formatNoteDate(iso) {
  if (!iso) return "[Date]";
  const parts = String(iso).split("-");
  if (parts.length !== 3) return String(iso);
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function agreementBlock(agent, dateText) {
  return [
    "AS AGREED BY SUB THROUGH TELESALES",
    `TELESALES AGENT: ${agent || "[Agent]"}`,
    `DATE: ${dateText}`,
  ].join("\n");
}

const EASI_LINES = [
  "*EASI PREPAID PAY PER USE BASIS.",
  "*USSD *100# TO VIEW EASI MENU.",
  "*USSD *133# OR MYDST APP TO PURCHASE ADD ON.",
];

const MOBI_LINES = [
  "*DATA ACCESS WILL BE CHARGED ONCE EXCEED THE ENTITLEMENT.",
  "*DATA BUNDLES WILL RESET WITH FULL QUOTA BY NEXT BILLING CYCLE.",
  "*USSD *400# TO VIEW BILL & BUNDLES.",
  "*USSD *433# OR MYDST APPS TO PURCHASE ADD ON.",
  "*BUNDLE AND RENTAL WILL BE PRO-RATED ONCE ACTIVATED.",
];

const MOBI_MIGRATION_LINES = [
  "*REMAINING CREDIT BALANCE EXCEEDING $5 WILL BE CARRY FORWARD AS BILL.",
  "*ANY EASI ADD ON DATA AND CREDIT BALANCE BELOW $5 WILL BE FORFEITED.",
];

const FREEDOM_LINES = [
  "*DATA ACCESS WILL BE SUSPENDED UPON EXHAUSTION OF BUNDLE.",
  "*DATA BUNDLES WILL RESET WITH FULL QUOTA BY NEXT BILLING CYCLE.",
  "*USSD *400# TO VIEW BILL & BUNDLES.",
  "*USSD *433# OR MYDST APPS TO PURCHASE ADD ON.",
  "*BUNDLE AND RENTAL WILL BE PRO-RATED ONCE ACTIVATED.",
];

const INFINITY_LINES = [
  "*DATA SPEED WILL REDUCE ONCE EXCEED THE ENTITLEMENT/QUOTA.",
  "*DATA BUNDLES WILL RESET EVERY 1st OF THE MONTH.",
  "*OUTGOING CALL WILL BE CHARGE $0.05CENTS/MINUTE.",
  "*DOWNLOAD THE MYDST APP TO EASILY MANAGE YOUR INFINITY ACCOUNT ALL IN ONE PLACE.",
  "*BUNDLE AND RENTAL WILL BE PRO-RATED ONCE ACTIVATED.",
];

/** Builds the copyable CRM registration note for the selected plan. */
export function buildCrmNote({
  plan,
  amount,
  mobiPlanType,
  infinityPlanType,
  agent,
  date,
  includeMigration,
}) {
  const dateText = formatNoteDate(date);
  const heading = [];
  let lines = [];

  if (plan === "easi") {
    heading.push("NEW REGISTRATION EASI", "NEW REGISTER EASI PREPAID");
    lines = EASI_LINES;
  } else if (plan === "mobi") {
    // A migration note carries its own two header lines and the credit terms.
    const planText = mobiPlanType || MOBI_PLAN_TYPES[0];
    if (includeMigration) {
      heading.push(
        "MIGRATION FROM EASI TO NEW REGISTRATION MOBI",
        `MIGRATION FROM EASI TO NEW REGISTER MOBI ${planText}`
      );
      lines = [...MOBI_LINES, ...MOBI_MIGRATION_LINES];
    } else {
      heading.push("NEW REGISTRATION MOBI", `NEW REGISTER MOBI ${planText}`);
      lines = MOBI_LINES;
    }
  } else if (plan === "freedom") {
    heading.push("NEW REGISTRATION FREEDOM", `NEW REGISTER FREEDOM $${amount || "[Amount]"}`);
    lines = FREEDOM_LINES;
  } else {
    heading.push(
      "NEW REGISTRATION INFINITY",
      `NEW REGISTER INFINITY ${infinityPlanType || INFINITY_PLAN_TYPES[0]}`
    );
    lines = INFINITY_LINES;
  }

  return [
    ...heading,
    "",
    agreementBlock(agent, dateText),
    "",
    "ALREADY INFORMED & SUB ACKNOWLEDGED:",
    ...lines,
  ].join("\n");
}

// `guideline` is the internal routing note shown above the preview only — it is
// never written into the ticket body, so it can never be copied to the clipboard.
export const BCAE_CATEGORIES = [
  {
    key: "pickup",
    label: "Branch Pick-Up",
    title: "Online Order Branch Pick-Up",
    guideline: "Assign to Branches Officer",
  },
  {
    key: "activation",
    label: "SIM Activation",
    title: "SIM Received Not Active Yet",
    guideline: "Assign to Customer Fulfilment",
  },
  {
    key: "infinity",
    label: "Infinity Recontract",
    title: "Infinity Recontract SMS Link",
    guideline: "Assign to Branch Officer",
  },
  {
    key: "mobi",
    label: "Mobi Recontract",
    title: "Mobi More Data / Payless Recontract",
    guideline: "Assign to Branches Officer",
  },
];

/** Plans offered in the recontract ticket dropdowns. */
export const MOBI_PLANS = ["Mobi 18", "Mobi 30", "Mobi 50", "Mobi 80"];

/** Recontract contract types. */
export const CONTRACT_TYPES = ["More Data", "Payless"];

/** Data quota (GB) per Mobi plan, for each contract type. */
export const MOBI_DATA_QUOTAS = {
  "More Data": { "Mobi 18": 8, "Mobi 30": 18, "Mobi 50": 35, "Mobi 80": 70 },
  Payless: { "Mobi 18": 6, "Mobi 30": 15, "Mobi 50": 30, "Mobi 80": 65 },
};

/** The quota that belongs to a Mobi plan + contract type combination. */
export function mobiQuotaFor(plan, contract) {
  return MOBI_DATA_QUOTAS[contract]?.[plan] ?? "";
}

/** Infinity recontract plans, contracts and speeds. Infinity has no Payless tier. */
export const INFINITY_PLANS = [
  "Infinity 38",
  "Infinity 58",
  "Infinity 78",
  "Infinity 98",
  "Infinity 148",
  "Infinity 148 BUL",
  "Infinity 188 BUL",
];
export const INFINITY_CONTRACTS = ["More Data", "Device"];
export const INFINITY_SPEEDS = ["100Mbps", "200Mbps", "500Mbps"];

/** The only Infinity data quotas a ticket may carry. */
export const INFINITY_DATA_QUOTAS = [650, 1000, 1500, 2000, 2500, "UNLIMITED"];

/** Each plan's official quota, pre-selected when that plan is chosen. */
export const INFINITY_PLAN_QUOTAS = {
  "Infinity 38": 650,
  "Infinity 58": 1000,
  "Infinity 78": 1500,
  "Infinity 98": 2000,
  "Infinity 148": 2500,
  "Infinity 148 BUL": "UNLIMITED",
  "Infinity 188 BUL": "UNLIMITED",
};

/** The full allowed quota list for the ticket's dropdown. */
export function infinityQuotasFor() {
  return INFINITY_DATA_QUOTAS;
}

/** The quota that belongs to a plan, used as the dropdown's selection. */
export function infinityDefaultQuotaFor(plan) {
  return INFINITY_PLAN_QUOTAS[plan] ?? INFINITY_DATA_QUOTAS[0];
}

/** Renders an ISO date (YYYY-MM-DD) as the ticket's DD.MM.YYYY form. */
export function formatDotDate(isoDate) {
  const parts = String(isoDate || "").split("-");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return "";
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/** Fills a value, falling back to the template's own bracket label. */
function fill(value, placeholder) {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text || placeholder;
}

/** Builds the copyable BCAE ticket body for the selected category. */
export function buildBcaeNote(category, fields) {
  const ref = fill(fields.ref, "[BCAE Ref]");
  const date = fill(formatNoteDate(fields.date), "[Date]");
  const subId = fill(fields.subId, "[Sub ID]");
  const name = fill(fields.customerName, "[Customer Name]");
  const ic = fill(fields.ic, "[IC No]");
  const contact = fill(fields.contact, "[Contact No]");
  const branch = fill(fields.branch, "[Selected Branch]");

  if (category === "pickup") {
    return [
      `BCAE Ref: ${ref}`,
      "",
      `Order date: ${date}`,
      `Order ID: ${subId}`,
      `Name: ${name}`,
      "Date/Time for pickup: ",
      `Location: ${branch}`,
      "Item for pick up: ",
      `Number to be contacted: ${contact}`,
      "",
      `Remarks: Sub would like to make payment and pick up the SIM card at the ${branch} Branch by tomorrow ##.##.####, 5pm onwards.`,
      "kindly assist, thank you.",
    ].join("\n");
  }

  if (category === "activation") {
    return [
      `BCAE Ref: ${ref}`,
      "",
      `Order date: ${date}`,
      `Sub ID: ${subId}`,
      "Complaints No: ",
      `Customer name: ${name}`,
      `IC No: ${ic}`,
      `Number to be contacted: ${contact}`,
      "",
      "Remarks: Sub received simcard today/on ##.##.#### and claiming line is not active yet.",
    ].join("\n");
  }

  if (category === "infinity") {
    const currentPlan = fill(fields.infinityCurrentPlan, "[Infinity Current Plan]");
    const upgradePlan = fill(fields.infinityUpgradePlan, "[Infinity Upgrade Plan]");
    const contract = fill(fields.infinityContract, "[Infinity Contract]");
    const quota = fill(fields.infinityDataQuota, "[Infinity Data Quota]");
    const speed = fill(fields.infinitySpeed, "[Infinity Speed]");
    const effectiveDate = fill(formatDotDate(fields.infinityEffectiveDate), "[Effective Date]");

    return [
      "ASSIGN TO BRANCH OFFICER",
      `BCAE REF: ${ref}`,
      "",
      `Call date: ${date}`,
      `Sub Id/Service line: ${subId}`,
      `Customer name: ${name}`,
      `IC No: ${ic}`,
      `Contact num: ${contact}`,
      "",
      `Current Plan: ${currentPlan}`,
      `Infinity add on choice: ${upgradePlan} 24M Contract - ${contract} ${quota}GB | ${speed}`,
      `Effective Date: ${effectiveDate}`,
      "",
      `Remarks: Sub would like to recontract with ${upgradePlan} ${contract} effective ${effectiveDate}. Please assist and contact sub at ${contact}. Thank you.`,
    ].join("\n");
  }

  const currentPlan = fill(fields.mobiCurrentPlan, "[Current Plan]");
  const upgradePlan = fill(fields.mobiUpgradePlan, "[Upgrade Plan]");
  const contractType = fill(fields.mobiContract, "[Contract Type]");
  const dataQuota = fill(fields.mobiDataQuota, "[Data Quota]");
  const effectiveDate = fill(formatDotDate(fields.mobiEffectiveDate), "[Effective Date]");

  return [
    `BCAE REF: ${ref}`,
    "",
    `Sub requests to upgrade the mobi plan to ${upgradePlan} ${contractType} - ${dataQuota}GB, Recontract 24 months.`,
    "- no outstanding bills.",
    "- not under contract.",
    "",
    `Current Plan : ${currentPlan}`,
    `Upgrade Plan : ${upgradePlan} 24months - ${contractType} ${dataQuota}GB.`,
    `Effective Date : ${effectiveDate}`,
    "",
    `MSISDN : ${contact}`,
    `Sub ID : ${subId}`,
    `Name : ${name}`,
    `IC : ${ic}`,
    `Contact Number : ${contact}`,
    "",
    "Kindly help to upgrade the plan, thank you.",
    "",
    "Remarks : Sub called from 16888 and request to upgrade the plan, thank you.",
  ].join("\n");
}
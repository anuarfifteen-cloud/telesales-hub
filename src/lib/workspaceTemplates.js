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
  mobi: [18, 30, 50, 80],
  freedom: [18, 28, 48, 68, 88, 168],
  infinity: [38, 58, 78, 98, 148],
};

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
export function buildCrmNote({ plan, amount, agent, date, includeMigration }) {
  const dateText = formatNoteDate(date);
  const heading = [];
  let lines = [];

  if (plan === "easi") {
    heading.push("NEW REGISTRATION EASI", "NEW REGISTER EASI PREPAID");
    lines = EASI_LINES;
  } else if (plan === "mobi") {
    heading.push(`NEW REGISTER MOBI $${amount || "[Amount]"}`);
    lines = includeMigration ? [...MOBI_LINES, ...MOBI_MIGRATION_LINES] : MOBI_LINES;
  } else if (plan === "freedom") {
    heading.push("NEW REGISTRATION FREEDOM", `NEW REGISTER FREEDOM $${amount || "[Amount]"}`);
    lines = FREEDOM_LINES;
  } else {
    heading.push("NEW REGISTRATION INFINITY", `NEW REGISTER INFINITY $${amount || "[Amount]"}`);
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

export const BCAE_CATEGORIES = [
  { key: "pickup", label: "Branch Pick-Up", title: "Online Order Branch Pick-Up" },
  { key: "activation", label: "SIM Activation", title: "SIM Received Not Active Yet" },
  { key: "infinity", label: "Infinity Recontract", title: "Infinity Recontract SMS Link" },
  { key: "mobi", label: "Mobi Recontract", title: "Mobi More Data / Payless Recontract" },
];

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
      "ASSIGN TO BRANCHES OFFICER",
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
      "ASSIGN TO CUSTOMER FULFILMENT",
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
      "Current Plan: Infinity XX 24M Contract - XXXGB | 100Mbps",
      "Infinity add on choice:  Infinity XX 24M Contract - XXXGB | 100Mbps",
      "Effective Date: XXXXXXXX",
      "",
      `Remarks: Sub would like to recontract with infinity XX more data effective XXXXXXXX. Please assist and contact sub at ${contact}. Thank you.`,
    ].join("\n");
  }

  return [
    "ASSIGN TO BRANCHES OFFICER",
    `BCAE REF: ${ref}`,
    "",
    "Sub requests to upgrade the mobi plan to Mobi XX More Data/Paylesss - XXGB, Recontract 24 months.",
    "- no outstanding bills.",
    "- not under contract.",
    "",
    "Current Plan : Mobi XX",
    "Upgrade Plan : Mobi XX 24months - More Data/Payless XXGB.",
    "Effective Date : XXXXXXX",
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
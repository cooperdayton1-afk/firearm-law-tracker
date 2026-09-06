// Placeholder data shaped exactly like rows from the Supabase "bills" table.
// Once the LegiScan key is approved, this file gets swapped for a real
// fetch from Supabase — nothing else in the UI needs to change.

export const CATEGORIES = [
  "Carry & Possession",
  "Regulation & Licensing",
  "Weapon Restrictions",
  "Storage & Safety",
  "Sales & Commerce",
  "Places & Restrictions",
];

export const STATUSES = ["Introduced", "In Committee", "Passed", "Signed", "Failed"];

export const MOCK_BILLS = [
  { id: 1, state: "CA", billNumber: "AB-1204", title: "Concealed Carry Permit Reciprocity Act", description: "Establishes reciprocity standards for concealed carry permits issued by other states.", category: "Carry & Possession", status: "In Committee", lastActionDate: "2026-06-02" },
  { id: 2, state: "TX", billNumber: "HB-338", title: "Firearm Safe Storage in Vehicles", description: "Requires firearms left in unattended vehicles to be secured in a locked container.", category: "Storage & Safety", status: "Passed", lastActionDate: "2026-05-14" },
  { id: 3, state: "NY", billNumber: "S-4021", title: "Extreme Risk Protection Order Expansion", description: "Expands who may petition for an extreme risk protection order (red flag order).", category: "Regulation & Licensing", status: "Signed", lastActionDate: "2026-04-30" },
  { id: 4, state: "FL", billNumber: "SB-712", title: "Ammunition Sales Age Verification", description: "Requires age verification for online ammunition sales delivered within the state.", category: "Sales & Commerce", status: "Introduced", lastActionDate: "2026-06-10" },
  { id: 5, state: "CO", billNumber: "HB-1156", title: "Assault Weapon Definition Update", description: "Updates the statutory definition of restricted semi-automatic firearms.", category: "Weapon Restrictions", status: "In Committee", lastActionDate: "2026-05-22" },
  { id: 6, state: "VA", billNumber: "HB-889", title: "School Zone Firearm Restrictions", description: "Expands the radius of school zones in which firearm possession is restricted.", category: "Places & Restrictions", status: "Failed", lastActionDate: "2026-03-18" },
  { id: 7, state: "WA", billNumber: "SB-5099", title: "Child Access Prevention Standards", description: "Sets minimum safe-storage standards for firearms in households with minors.", category: "Storage & Safety", status: "Passed", lastActionDate: "2026-06-01" },
  { id: 8, state: "GA", billNumber: "HB-201", title: "Constitutional Carry Clarification", description: "Clarifies permitless carry provisions for state-owned buildings.", category: "Carry & Possession", status: "Introduced", lastActionDate: "2026-06-05" },
  { id: 9, state: "OH", billNumber: "SB-88", title: "Federal Firearms License Registry", description: "Creates a state-level registry cross-referencing federally licensed dealers.", category: "Regulation & Licensing", status: "In Committee", lastActionDate: "2026-05-27" },
  { id: 10, state: "PA", billNumber: "HB-1420", title: "Gun Show Background Check Closure", description: "Closes the private-sale exemption for background checks at gun shows.", category: "Sales & Commerce", status: "Introduced", lastActionDate: "2026-06-08" },
  { id: 11, state: "AZ", billNumber: "SB-1310", title: "Ghost Gun Serialization Requirement", description: "Requires serial numbers on self-manufactured and 3D-printed firearms.", category: "Weapon Restrictions", status: "Passed", lastActionDate: "2026-04-11" },
  { id: 12, state: "IL", billNumber: "HB-2207", title: "Campus Carry Prohibition", description: "Reaffirms the prohibition on firearm carry at public university campuses.", category: "Places & Restrictions", status: "Signed", lastActionDate: "2026-03-29" },
  { id: 13, state: "MI", billNumber: "SB-410", title: "Safe Storage Tax Credit", description: "Creates a state tax credit for the purchase of certified gun safes and locks.", category: "Storage & Safety", status: "Introduced", lastActionDate: "2026-06-11" },
  { id: 14, state: "NC", billNumber: "HB-77", title: "Open Carry in Public Parks", description: "Permits open carry of firearms in state-managed public parks.", category: "Carry & Possession", status: "Failed", lastActionDate: "2026-02-20" },
];

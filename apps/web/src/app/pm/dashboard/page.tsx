import { DashboardCard } from "@/components/dashboard-card";
import { requireRole } from "@/lib/auth";

const today = new Date();
const todayISO = today.toISOString().slice(0, 10);
const dueSoonISO = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 30)
  .toISOString()
  .slice(0, 10);

type ContactRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  parish: string | null;
};

const DEMO_CONTACTS: ContactRow[] = [
  { id: "demo-1", full_name: "Amelia Darrell", email: "amelia.darrell@tanktech.bm", phone: "+1-441-555-1201", address: "14 Cedar Hill, Pembroke", parish: "Pembroke" },
  { id: "demo-2", full_name: "Ethan Outerbridge", email: "ethan.outerbridge@tanktech.bm", phone: "+1-441-555-1210", address: "9 St. John's Road, Pembroke", parish: "Pembroke" },
  { id: "demo-3", full_name: "Jaden Smith", email: "jaden.smith@tanktech.bm", phone: "+1-441-555-1202", address: "5 North Shore Lane, Devonshire", parish: "Devonshire" },
  { id: "demo-4", full_name: "Kai Obrien", email: "kai.obrien@tanktech.bm", phone: "+1-441-555-1206", address: "22 Harbour Court, Paget", parish: "Paget" },
  { id: "demo-5", full_name: "Layla Swan", email: "layla.swan@tanktech.bm", phone: "+1-441-555-1207", address: "3 Palm Grove, Warwick", parish: "Warwick" },
  { id: "demo-6", full_name: "Micah Minors", email: "micah.minors@tanktech.bm", phone: "+1-441-555-1208", address: "18 Lighthouse Hill, Southampton", parish: "Southampton" },
  { id: "demo-7", full_name: "Noah Foggo", email: "noah.foggo@tanktech.bm", phone: "+1-441-555-1209", address: "41 Mangrove Bay Road, Sandys", parish: "Sandys" },
  { id: "demo-8", full_name: "Olivia Bean", email: "olivia.bean@tanktech.bm", phone: "+1-441-555-1211", address: "11 Blue Hole Drive, Hamilton Parish", parish: "Hamilton Parish" },
  { id: "demo-9", full_name: "Priya Bascome", email: "priya.bascome@tanktech.bm", phone: "+1-441-555-1212", address: "7 Harrington Sound, Smith's", parish: "Smith's" },
  { id: "demo-10", full_name: "Sofia Trott", email: "sofia.trott@tanktech.bm", phone: "+1-441-555-1213", address: "27 Old Towne Road, St. George's", parish: "St. George's" },
];

function mergeLatestProperty(
  contacts: ContactRow[],
  properties: Array<{ owner_id: string | null; address: string; parish: string | null; created_at: string }>,
) {
  const latestPropertyByOwner = new Map<string, { address: string; parish: string | null; createdAt: number }>();

  for (const property of properties) {
    if (!property.owner_id) {
      continue;
    }

    const createdAt = new Date(property.created_at).getTime();
    const current = latestPropertyByOwner.get(property.owner_id);
    if (!current || createdAt > current.createdAt) {
      latestPropertyByOwner.set(property.owner_id, {
        address: property.address,
        parish: property.parish,
        createdAt,
      });
    }
  }

  return contacts.map((contact) => {
    const property = latestPropertyByOwner.get(contact.id);

    return {
      ...contact,
      address: contact.address ?? property?.address ?? null,
      parish: contact.parish ?? property?.parish ?? null,
    };
  });
}

export default async function PropertyManagerDashboard() {
  const { supabase, user } = await requireRole(["property_manager", "admin", "staff"]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.org_id;

  const [properties, tanks, dueSoon, overdue, upcoming] = await Promise.all([
    supabase.from("properties").select("id", { head: true, count: "exact" }).eq("org_id", orgId),
    supabase
      .from("tanks")
      .select("id, properties!inner(org_id)", { head: true, count: "exact" })
      .eq("properties.org_id", orgId),
    supabase
      .from("subscriptions")
      .select("id", { head: true, count: "exact" })
      .eq("org_id", orgId)
      .lte("next_due_date", dueSoonISO),
    supabase
      .from("subscriptions")
      .select("id", { head: true, count: "exact" })
      .eq("org_id", orgId)
      .lt("next_due_date", todayISO),
    supabase
      .from("bookings")
      .select("id", { head: true, count: "exact" })
      .eq("org_id", orgId)
      .in("status", ["requested", "scheduled"]),
  ]);

  const { data: contactsRaw } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, address, parish")
    .eq("role", "customer")
    .order("full_name", { ascending: true })
    .limit(10);

  const contactIds = (contactsRaw ?? []).map((contact) => contact.id);
  const { data: contactProperties } = contactIds.length
    ? await supabase
      .from("properties")
      .select("owner_id, address, parish, created_at")
      .in("owner_id", contactIds)
    : { data: [] as Array<{ owner_id: string | null; address: string; parish: string | null; created_at: string }> };

  const contacts = mergeLatestProperty((contactsRaw ?? []) as ContactRow[], contactProperties ?? []);
  const contactsForDisplay = contacts.length ? contacts : DEMO_CONTACTS;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Property Manager Dashboard</h1>
      <p className="mt-2 text-slate-600">Track compliance, tanks, and bookings across your properties.</p>
      <section className="mt-8 grid gap-4 md:grid-cols-5">
        <DashboardCard label="Properties" value={properties.count ?? 0} />
        <DashboardCard label="Tanks" value={tanks.count ?? 0} />
        <DashboardCard label="Due Soon" value={dueSoon.count ?? 0} />
        <DashboardCard label="Overdue" value={overdue.count ?? 0} />
        <DashboardCard label="Upcoming" value={upcoming.count ?? 0} />
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-sky-950">Customer Contacts</h2>
          <p className="text-sm text-slate-600">Top 10 contacts with phone, parish, and address details.</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Parish</th>
              <th className="px-4 py-3">Address</th>
            </tr>
          </thead>
          <tbody>
            {contactsForDisplay.map((contact) => (
              <tr key={contact.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-sky-950">{contact.full_name ?? "-"}</td>
                <td className="px-4 py-3 text-slate-700">{contact.email ?? "-"}</td>
                <td className="px-4 py-3 text-slate-700">{contact.phone ?? "-"}</td>
                <td className="px-4 py-3 text-slate-700">{contact.parish ?? "Unknown"}</td>
                <td className="px-4 py-3 text-slate-700">{contact.address ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

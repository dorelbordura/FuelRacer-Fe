import { useEffect, useState } from "react";
import { api } from "./Races";

export default function AdminPage({ token }) {
  const [players, setPlayers] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (token.isAdmin) fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    const res = await api("/admin/players");
    setPlayers(res.players || []);
    setLoading(false);
  };

  const giveFuel = async (id, amount) => {
    await api("/admin/giveFuel", {
      method: "POST",
      body: JSON.stringify({ address: id, amount })
    });
    setSuccess(`✅ Gave ${amount} fuel to ${id.slice(0, 6)}…`);
    fetchPlayers();
    setTimeout(() => setSuccess(""), 3000);
  };

  if (!token) return <p>Loading...</p>;
  if (!token.isAdmin) return <p>🚫 You are not an admin</p>;

  return (
    <div className="flex flex-col min-h-screen font-sans">
        <div className="p-6 mx-auto font-sans" style={{width: '105vh'}}>
            <h1 className="text-3xl font-bold mb-6 text-white-800">Admin Dashboard</h1>

            {/* Toast */}
            {success && (
                <div className="fixed top-6 right-6 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in">
                    {success}
                </div>
            )}

            {/* Search & Refresh */}
            <div className="flex flex-row md:flex-row justify-between items-center mb-6 gap-3">
                <input
                    type="text"
                    placeholder="🔍 Search by address..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="border border-gray-300 px-4 py-2 rounded-lg w-full md:w-1/2 shadow-sm focus:ring-2 focus:ring-blue-400"
                    style={{maxWidth: '50vh'}}
                />
                <button
                    onClick={fetchPlayers}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow transition"
                >
                    Refresh Players
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
                <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 text-left">Address</th>
                            <th className="px-6 py-3 text-left">Fuel</th>
                            <th className="px-6 py-3 text-left">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="3" className="text-center p-6 text-gray-500">
                                    Loading players…
                                </td>
                            </tr>
                        ) : (
                        players
                            .filter((p) => p.id.toLowerCase().includes(filter.toLowerCase()))
                            .map((p, i) => (
                                <tr
                                    key={p.id}
                                    className={`${
                                    i % 2 === 0 ? "bg-white" : "bg-gray-50"
                                    } hover:bg-blue-50 transition`}
                                >
                                    <td className="px-6 py-3 font-mono text-gray-800 truncate max-w-[220px]">
                                        {p.id}
                                    </td>
                                    <td className="px-6 py-3 text-gray-600">{p.fuel ?? 0}</td>
                                    <td className="px-6 py-3">
                                        <FuelInput onGive={(amt) => giveFuel(p.id, amt)} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}

function FuelInput({ onGive }) {
  const [val, setVal] = useState(1);

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="1"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-20 border border-gray-300 rounded-lg px-2 py-1 shadow-sm focus:ring-2 focus:ring-green-400"
        style={{color: 'black'}}
      />
      <button
        onClick={() => onGive(val)}
        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg shadow transition"
      >
        Give
      </button>
    </div>
  );
}

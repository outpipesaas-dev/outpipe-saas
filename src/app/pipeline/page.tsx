"use client";

import { useEffect, useState } from "react";
import { 
  Briefcase, 
  Trash2, 
  CheckCircle, 
  Globe, 
  Phone, 
  MapPin, 
  MoreHorizontal, 
  Filter,
  ExternalLink
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  company: string;
  website: string | null;
  phone: string | null;
  status: string;
  location: string | null;
  searchQuery: string | null;
  googleMapsUrl: string | null;
  createdAt: string;
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("NEW");

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leads?status=${filter}`);
      const data = await response.json();
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filter]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      // Refresh local list
      setLeads(leads.filter(l => l.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Lead Pipeline
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Review and qualify your recently scraped prospects.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            {["NEW", "QUALIFIED", "LOST"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filter === s 
                  ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {s === "LOST" ? "TRASH" : s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-zinc-100 dark:bg-zinc-900 p-6 rounded-full">
              <Filter className="h-8 w-8 text-zinc-400" />
            </div>
            <h2 className="mt-4 text-xl font-semibold dark:text-zinc-200">No leads found</h2>
            <p className="text-zinc-500 max-w-xs mt-2 text-sm italic">
              "Try launching a new scrape research for US businesses."
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leads.map((lead) => (
              <div 
                key={lead.id} 
                className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                      <Briefcase className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {lead.googleMapsUrl && (
                        <a 
                          href={lead.googleMapsUrl} 
                          target="_blank" 
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400"
                        >
                          <MapPin className="h-4 w-4" />
                        </a>
                      )}
                      {lead.website && (
                        <a 
                          href={lead.website} 
                          target="_blank" 
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 leading-tight">
                      {lead.company}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-1">
                      {lead.website || "No website detected"}
                    </p>
                  </div>

                  <div className="pt-2 space-y-2">
                    {lead.location && (
                      <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <MapPin className="h-3 w-3" />
                        {lead.location}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-50 dark:border-zinc-800 flex items-center justify-between gap-3">
                  <button 
                    onClick={() => updateStatus(lead.id, "LOST")}
                    className="flex-1 py-2 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Trash
                  </button>
                  <button 
                    onClick={() => updateStatus(lead.id, "QUALIFIED")}
                    className="flex-1 py-2 flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve
                  </button>
                </div>
                
                {lead.searchQuery && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-medium text-zinc-400 uppercase tracking-tighter">
                    {lead.searchQuery}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

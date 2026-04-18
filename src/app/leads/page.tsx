"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Building2, 
  Search, 
  MapPin, 
  ExternalLink, 
  CheckCircle2, 
  Trash2, 
  Filter, 
  ArrowUpDown,
  MoreVertical,
  Globe,
  Database,
  History,
  Activity,
  Zap,
  Loader2,
  Mail,
  Sparkles,
  ArrowRight,
  Copy,
  AlertCircle
} from "lucide-react";

interface OutreachDraft {
  subject: string;
  body: string;
  editedSubject?: string;
  editedBody?: string;
  followUp: string;
  status: string;
  sentAt?: string;
}

interface Lead {
  id: string;
  company: string;
  website: string | null;
  phone: string | null;
  status: string;
  location: string | null;
  searchQuery: string | null;
  scrapeJobId: string | null;
  createdAt: string;
  diagnostics?: Array<{
    status: string;
    overallScore: number | null;
    opportunities: any;
    websiteAudit: any;
    aiSummary: string;
  }>;
  tier: string;
  tierReason: string | null;
  isTierLocked: boolean;
  outreachDraft?: OutreachDraft | null;
}

interface ScrapeJob {
  id: string;
  query: string;
  location: string;
  status: string;
}

export default function LeadsInbox() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string>("latest");
  const [statusFilter, setStatusFilter] = useState<string>("NEW");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'INTEL' | 'OUTREACH'>('INTEL');
  
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, jobsRes] = await Promise.all([
        fetch(`/api/leads?status=${statusFilter}${selectedJob !== 'all' ? `&jobId=${selectedJob}` : ''}${tierFilter !== 'all' ? `&tier=${tierFilter}` : ''}`),
        fetch('/api/jobs')
      ]);
      const leadsData = await leadsRes.json();
      const jobsData = await jobsRes.json();
      
      setLeads(leadsData || []);
      setJobs(jobsData || []);

      // Auto-select latest job if "latest" is selected
      if (selectedJob === 'latest' && jobsData.length > 0) {
        setSelectedJob(jobsData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, selectedJob, tierFilter]);

  const activeJobMetadata = jobs.find(j => j.id === (selectedJob === 'latest' ? jobs[0]?.id : selectedJob));

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Status mapping for analysis
  const getAnalysisStatus = (lead: Lead) => {
    const diagnostic = lead.diagnostics?.[0];
    if (analyzingIds.has(lead.id) || diagnostic?.status === 'ANALYZING') return { label: 'Analyzing', color: 'bg-blue-100 text-blue-800' };
    if (diagnostic?.status === 'COMPLETED') return { label: 'Finalized', color: 'bg-green-100 text-green-800' };
    if (lead.website) return { label: 'Partial', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Pending', color: 'bg-zinc-100 text-zinc-600' };
  };

  // ... (previous helper functions: updateLeadStatus, saveDraft, analyzeLead, generateDraft, getOppBadge, updateLeadTier, getConfidenceStyle, getTierBadge)

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
                Leads Inbox
                <span className="px-2 py-1 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg text-xs font-black">
                  {leads.length}
                </span>
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Prioritized review for identified opportunities</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link 
                href="/scrape"
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                New Research
              </Link>
              <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden md:block mx-1" />
              <button onClick={fetchData} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400">
                <History className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 py-4 px-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Research Focus</label>
                <div className="flex items-center gap-2">
                 <Database className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-400" />
                 <select 
                   value={selectedJob} 
                   onChange={(e) => setSelectedJob(e.target.value)}
                   className="bg-transparent text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-50 outline-none cursor-pointer max-w-[200px]"
                 >
                   <option value="latest">Latest Scrape Run</option>
                   <option value="all">View All History</option>
                   {jobs.map(j => (
                     <option key={j.id} value={j.id}>{j.query} ({j.location})</option>
                   ))}
                 </select>
                </div>
              </div>
              
              {activeJobMetadata && (
                <div className="h-10 w-px bg-zinc-100 dark:bg-zinc-800 hidden md:block" />
              )}

              {activeJobMetadata && (
                <div className="flex items-center gap-6 animate-in fade-in duration-300">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Context</span>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {activeJobMetadata.query} in {activeJobMetadata.location}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</span>
                    <span className={`text-[10px] font-black uppercase ${activeJobMetadata.status === 'COMPLETED' ? 'text-green-600' : 'text-zinc-500'}`}>
                      {activeJobMetadata.status}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto">
               <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-lg">
                 <Zap className="h-3 w-3 text-zinc-400" />
                 <select 
                   value={tierFilter} 
                   onChange={(e) => setTierFilter(e.target.value)}
                   className="bg-transparent text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-400 outline-none cursor-pointer"
                 >
                   <option value="all">Every Tier</option>
                   <option value="HOT">Priority: 🔥 Hot</option>
                   <option value="GOOD">Priority: ✅ Good</option>
                 </select>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <main className={`flex-1 overflow-y-auto p-8 transition-all ${selectedLead ? 'mr-[450px]' : ''}`}>
          <div className="max-w-7xl mx-auto">
            <div className="overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Business Intelligence</th>
                    <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest hidden md:table-cell">Analysis Status</th>
                    <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {leads.map((lead) => {
                    const analysis = getAnalysisStatus(lead);
                    const isSelected = selectedLead?.id === lead.id;

                    return (
                      <tr key={lead.id} className={`group hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-all ${isSelected ? 'bg-zinc-100 dark:bg-zinc-900' : ''}`}>
                        <td className="p-6">
                          <button onClick={() => setSelectedLead(lead)} className="flex items-start gap-4 text-left w-full group">
                            <div className="h-12 w-12 rounded-[18px] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700 font-black text-xs text-zinc-400 group-hover:bg-white dark:group-hover:bg-zinc-700 transition-all">
                              {lead.company.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-zinc-900 dark:text-zinc-50 text-base">{lead.company}</div>
                              <div className="text-xs text-zinc-500 font-medium mt-0.5">{lead.website ? new URL(lead.website).hostname : 'No website found'}</div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {getTierBadge(lead.tier)}
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter truncate max-w-[250px]">
                                  {lead.tierReason}
                                </span>
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className="p-6 hidden md:table-cell">
                          <div className="flex flex-col gap-2">
                             <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit border border-current opacity-70 ${analysis.color}`}>
                               {analysis.label}
                             </span>
                             {lead.diagnostics?.[0]?.opportunities?.type && (
                               <div className="flex gap-1">{getOppBadge(lead.diagnostics[0].opportunities.type)}</div>
                             )}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => setSelectedLead(lead)} className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                              Audit Intel
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, "QUALIFIED"); }} className="p-2.5 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {selectedLead && (
          <aside className="fixed right-0 top-0 bottom-0 w-[450px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col font-sans animate-in slide-in-from-right">
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
               <div className="flex items-start justify-between mb-6">
                 <div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 block">Manual Validation Mode</span>
                   <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 leading-tight">{selectedLead.company}</h2>
                   <div className="flex items-center gap-2 mt-3">
                    {getTierBadge(selectedLead.tier)}
                    <span className="h-1 w-1 bg-zinc-300 rounded-full" />
                    <a href={selectedLead.website || '#'} target="_blank" className="text-xs font-bold text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 transition-colors">
                      {selectedLead.website ? 'Visit Site' : 'No link'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                   </div>
                 </div>
                 <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400"><Trash2 className="h-5 w-5 rotate-45" /></button>
               </div>

               <div className="p-5 bg-zinc-900 dark:bg-zinc-50 rounded-[28px] text-white dark:text-zinc-900 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Engine Verdict</span>
                    <span className="text-lg px-2 py-0.5 bg-white/20 dark:bg-black/10 rounded-lg font-black">{selectedLead.tier}</span>
                  </div>
                  <p className="font-bold leading-relaxed">"{selectedLead.tierReason}"</p>
                  
                  {/* REASON CODES DISPLAY */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {((selectedLead.firmographics as any)?.reasonCodes as string[])?.map(code => (
                      <span key={code} className="px-2 py-1 bg-white/10 dark:bg-black/5 rounded-md text-[9px] font-black tracking-widest border border-white/20">
                        {code}
                      </span>
                    ))}
                    {!((selectedLead.firmographics as any)?.reasonCodes) && (
                      <span className="text-[9px] font-bold opacity-50 uppercase tracking-widest italic">No codes available for this batch</span>
                    )}
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
               {/* Analysis Detail */}
               <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Provenance & Reference</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Scrape Run ID</span>
                        <span className="text-xs font-bold font-mono text-zinc-600 truncate block">#{selectedLead.scrapeJobId?.slice(-8) || 'Manual'}</span>
                     </div>
                     <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Import Date</span>
                        <span className="text-xs font-bold text-zinc-600 block">{new Date(selectedLead.createdAt).toLocaleDateString()}</span>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Commercial Intel</h3>
                  {selectedLead.diagnostics?.[0] ? (
                    <div className="space-y-4">
                       <div className="flex items-start gap-4 p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl">
                          <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div>
                             <span className="text-[10px] font-black uppercase text-blue-800 dark:text-blue-400 mb-1 block">Best Entry Service</span>
                             <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{selectedLead.diagnostics[0].opportunities?.service}</p>
                          </div>
                       </div>
                       <p className="text-xs text-zinc-500 italic leading-relaxed border-l-2 border-zinc-200 pl-4">
                         "{selectedLead.diagnostics[0].aiSummary}"
                       </p>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                      <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">Deep audit not run</p>
                      <p className="text-[11px] text-zinc-500 font-medium leading-relaxed max-w-[280px] mx-auto">
                        This lead only has an initial scan. Run a deep audit to identify actionable sales opportunities such as weak calls to action, missing booking flow, trust gaps, and conversion friction.
                      </p>
                      <button 
                        onClick={() => analyzeLead(selectedLead.id)} 
                        className="mt-6 w-full py-4 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        Run Deep Audit
                      </button>
                    </div>
                  )}
               </div>
            </div>

            <div className="p-8 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-4">
               <button onClick={() => updateLeadStatus(selectedLead.id, 'LOST')} className="py-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-500 hover:bg-white transition-all">Discard Lead</button>
               <button onClick={() => updateLeadStatus(selectedLead.id, 'QUALIFIED')} className="py-4 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Move to Outreach</button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

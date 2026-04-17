"use client";

import { useState, useEffect } from "react";
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
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("NEW");
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [isDrafting, setIsDrafting] = useState(false);
  const [activeTab, setActiveTab] = useState<'INTEL' | 'OUTREACH'>('INTEL');
  
  // Local Edit State
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, jobsRes] = await Promise.all([
        fetch(`/api/leads?status=${statusFilter}${selectedJob !== 'all' ? `&jobId=${selectedJob}` : ''}`),
        fetch('/api/jobs')
      ]);
      const leadsData = await leadsRes.json();
      const jobsData = await jobsRes.json();
      
      setLeads(leadsData || []);
      setJobs(jobsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, selectedJob]);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (selectedLead?.outreachDraft) {
      setDraftSubject(selectedLead.outreachDraft.editedSubject || selectedLead.outreachDraft.subject || "");
      setDraftBody(selectedLead.outreachDraft.editedBody || selectedLead.outreachDraft.body || "");
    } else {
      setDraftSubject("");
      setDraftBody("");
    }
  }, [selectedLead]);

  const updateLeadStatus = async (id: string, newStatus: string) => {
    try {
      await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const saveDraft = async (id: string, isSent = false) => {
    try {
      const res = await fetch(`/api/leads/${id}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          editedSubject: draftSubject, 
          editedBody: draftBody,
          status: isSent ? 'SENT' : 'EDITED' 
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLeads(prev => prev.map(l => l.id === id ? { ...l, outreachDraft: updated } : l));
        if (isSent) {
          updateLeadStatus(id, 'APPROACHING');
          setSelectedLead(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const analyzeLead = async (id: string) => {
    setAnalyzingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/leads/${id}/analyze`, { method: "POST" });
      if (res.ok) {
        setTimeout(fetchData, 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generateDraft = async (id: string) => {
    setIsDrafting(true);
    try {
      const res = await fetch(`/api/leads/${id}/draft`, { method: "POST" });
      if (res.ok) {
        const draft = await res.json();
        setLeads(prev => prev.map(l => l.id === id ? { ...l, outreachDraft: draft } : l));
        setDraftSubject(draft.subject);
        setDraftBody(draft.body);
        // Switch to Outreach tab instantly
        setActiveTab('OUTREACH');
        if (selectedLead?.id === id) {
          setSelectedLead(prev => prev ? { ...prev, outreachDraft: draft } : null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDrafting(false);
    }
  };

  const getOppBadge = (type: string) => {
    const map: Record<string, { label: string, color: string }> = {
      SILENT_HERO: { label: "Silent Hero", color: "bg-orange-100 text-orange-700 border-orange-200" },
      LEAK_PRONE: { label: "Leak Prone", color: "bg-red-100 text-red-700 border-red-200" },
      INFORMATION_MAZE: { label: "Info Maze", color: "bg-purple-100 text-purple-700 border-purple-200" },
      FRICTION_HEAVY: { label: "Friction Heavy", color: "bg-blue-100 text-blue-700 border-blue-200" },
      VISUAL_GHOST: { label: "Visual Ghost", color: "bg-zinc-100 text-zinc-700 border-zinc-200" },
      NO_WEBSITE: { label: "No Website", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    };
    const style = map[type] || { label: type, color: "bg-zinc-100 text-zinc-500 border-zinc-200" };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${style.color}`}>{style.label}</span>;
  };

  const getConfidenceStyle = (conf: string) => {
    if (conf === 'HIGH') return 'bg-green-100 text-green-700 border-green-200';
    if (conf === 'MEDIUM') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      {/* ... header code ... */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-8">
        {/* Header content unchanged */}
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* ... */}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <main className={`flex-1 overflow-y-auto p-8 transition-all ${selectedLead ? 'mr-[400px]' : ''}`}>
          <div className="max-w-7xl mx-auto">
            <div className="overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
              <table className="w-full text-left border-collapse">
                {/* ... table header ... */}
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <th className="p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Company</th>
                    <th className="p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hidden md:table-cell">Opportunity Type</th>
                    <th className="p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hidden lg:table-cell">Provenance</th>
                    <th className="p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {/* ... mapping leads ... */}
                  {leads.map((lead) => {
                    const diagnostic = lead.diagnostics?.[0];
                    const isAnalyzing = analyzingIds.has(lead.id) || diagnostic?.status === 'ANALYZING';
                    const hasDiagnostic = !!diagnostic && diagnostic.status === 'COMPLETED';
                    const isSelected = selectedLead?.id === lead.id;

                    return (
                      <tr key={lead.id} className={`group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors ${isSelected ? 'bg-zinc-100 dark:bg-zinc-900' : ''}`}>
                        <td className="p-4">
                          <button 
                            onClick={() => setSelectedLead(lead)}
                            className="flex items-center gap-3 text-left w-full group"
                          >
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                              hasDiagnostic ? 'bg-zinc-900 border-zinc-800 group-hover:bg-white group-hover:text-zinc-950' : 'bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
                            }`}>
                              {hasDiagnostic ? (
                                <span className={`text-xs font-black ${isSelected ? 'text-zinc-950' : 'text-white'}`}>{diagnostic.overallScore}</span>
                              ) : (
                                <Building2 className={`h-5 w-5 ${hasDiagnostic ? 'text-zinc-500' : 'text-zinc-400'}`} />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-zinc-50 group-hover:underline underline-offset-4">{lead.company}</div>
                              <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                                {lead.website ? (
                                  <a href={lead.website} target="_blank" className="hover:text-zinc-900 dark:hover:text-zinc-300 flex items-center gap-1">
                                    {new URL(lead.website).hostname}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-yellow-600 dark:text-yellow-500 font-medium font-xs">no website</span>
                                )}
                              </div>
                            </div>
                          </button>
                        </td>
                        {/* ... other cells unchanged ... */}
                        <td className="p-4 hidden md:table-cell">
                          {isAnalyzing ? (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 animate-pulse">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              INTEL GATHERING...
                            </div>
                          ) : hasDiagnostic ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                {getOppBadge(diagnostic.opportunities?.type)}
                                {lead.outreachDraft && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[8px] font-black uppercase">
                                    <Sparkles className="h-2 w-2" />
                                    Ready
                                  </div>
                                )}
                              </div>
                              <div className="text-[9px] font-medium text-zinc-400 truncate max-w-[150px]">
                                {diagnostic.opportunities?.service}
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => analyzeLead(lead.id)}
                              className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 uppercase tracking-widest transition-colors"
                            >
                              <Activity className="h-3 w-3" />
                              Identify
                            </button>
                          )}
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                              {lead.searchQuery || "Manual"}
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                              <MapPin className="h-3 w-3 text-zinc-400" />
                              <span className="truncate max-w-[120px]">{lead.location || "USA"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, "LOST"); }}
                              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                              title="Trash Lead"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            {lead.status === 'NEW' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, "QUALIFIED"); }}
                                className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-2"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve
                              </button>
                            )}
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

        {/* LEAD INSPECTOR SIDE PANEL (Tabbed) */}
        {selectedLead && (
          <aside className="fixed right-0 top-16 bottom-0 w-[450px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-40 overflow-y-auto animate-in slide-in-from-right duration-300 shadow-zinc-100/50 flex flex-col">
            {/* Header */}
            <div className="p-8 pb-4 space-y-6 shrink-0 bg-white dark:bg-zinc-950 sticky top-0 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">{selectedLead.company}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">{selectedLead.location || "Global Business"}</p>
                    {selectedLead.diagnostics?.[0]?.opportunities?.confidence && (
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black tracking-widest border uppercase ${getConfidenceStyle(selectedLead.diagnostics[0].opportunities.confidence)}`}>
                        {selectedLead.diagnostics[0].opportunities.confidence} Confidence
                      </span>
                    )}
                    {selectedLead.status === 'APPROACHING' && (
                       <span className="px-1.5 py-0.5 rounded-[4px] text-[8px] font-black tracking-widest bg-green-100 text-green-700 border border-green-200 uppercase">
                         Contacted
                       </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400"
                >
                  <Filter className="h-4 w-4 rotate-45" />
                </button>
              </div>

              {/* Tabs Switcher */}
              <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                <button 
                  onClick={() => setActiveTab('INTEL')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    activeTab === 'INTEL' 
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  Intel
                </button>
                <button 
                  onClick={() => setActiveTab('OUTREACH')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    activeTab === 'OUTREACH' 
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Outreach
                </button>
              </div>
            </div>

            <div className="p-8 pt-4 flex-1">
              {activeTab === 'INTEL' ? (
                /* Intelligence View */
                <div className="space-y-8">
                  {selectedLead.diagnostics?.[0] ? (
                    <>
                      <div className="bg-zinc-900 border border-zinc-800 rounded-[24px] p-6 text-white space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Proposed Strategy</div>
                          <div className="flex items-center gap-2">
                             <span className="text-2xl font-black">{selectedLead.diagnostics[0].overallScore}</span>
                             <span className="text-[10px] font-bold text-zinc-600 uppercase">Fit</span>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold leading-tight mb-2 text-zinc-50">
                            {selectedLead.diagnostics[0].opportunities?.service}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {getOppBadge(selectedLead.diagnostics[0].opportunities?.type)}
                          </div>
                        </div>
                        <div className="pt-4 border-t border-zinc-800">
                           <p className="text-xs text-zinc-400 italic leading-relaxed">
                             "The Why": {selectedLead.diagnostics[0].aiSummary}
                           </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">The Evidence Log</h4>
                        <div className="grid grid-cols-1 gap-2">
                           {(selectedLead.diagnostics[0].websiteAudit as any)?.evidenceLog?.map((entry: any, i: number) => (
                             <div key={i} className="group p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                               <div className="flex items-center justify-between mb-1.5">
                                 <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-50">{entry.label}</span>
                                 {entry.status === 'POSITIVE' ? (
                                   <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                 ) : entry.status === 'NEGATIVE' ? (
                                   <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                 ) : (
                                   <Activity className="h-3.5 w-3.5 text-zinc-400" />
                                 )}
                               </div>
                               <p className="text-[11px] text-zinc-500 leading-relaxed">
                                 {entry.reason}
                               </p>
                             </div>
                           ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-5 bg-orange-50 dark:bg-orange-950 border border-orange-100 dark:border-orange-900 rounded-[20px]">
                        <Zap className="h-5 w-5 text-orange-500 shrink-0" />
                        <p className="text-[11px] text-orange-800 dark:text-orange-200 font-medium leading-relaxed">
                          Pitch Tip: Pivot your message to focus on the {selectedLead.diagnostics[0].opportunities?.type.replace('_', ' ').toLowerCase()} gap. This is a high-impact friction point for their customers.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="p-10 text-center space-y-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                      <History className="h-8 w-8 text-zinc-300 mx-auto" />
                      <div>
                        <h5 className="font-bold text-zinc-900 dark:text-zinc-50">Intel Needed</h5>
                        <p className="text-xs text-zinc-500 mt-1 max-w-[200px] mx-auto leading-relaxed">Launch a deep scan to uncover sales opportunities.</p>
                      </div>
                      <button 
                        onClick={() => analyzeLead(selectedLead.id)}
                        className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                      >
                        Uncover Gaps
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Outreach View (Calibration Mode) */
                <div className="space-y-8 animate-in fade-in duration-300 flex flex-col h-full">
                  {!selectedLead.outreachDraft ? (
                    <div className="p-10 text-center space-y-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                      <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto">
                        <Sparkles className="h-8 w-8 text-blue-500" />
                      </div>
                      <div>
                        <h5 className="font-bold text-zinc-900 dark:text-zinc-50">Generate Hook</h5>
                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Let AI suggest a direct, observational hook for you.</p>
                      </div>
                      <button 
                        disabled={isDrafting}
                        onClick={() => generateDraft(selectedLead.id)}
                        className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Craft Short Hook
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6 flex-1 flex flex-col">
                      <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 space-y-6 flex-1 flex flex-col">
                         <div className="space-y-2 shrink-0">
                           <div className="flex items-center justify-between">
                             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Subject Line (edit)</span>
                             <span className="text-[9px] text-zinc-400 italic">keep it lowercase & specific</span>
                           </div>
                           <input 
                             value={draftSubject}
                             onChange={(e) => setDraftSubject(e.target.value)}
                             placeholder="e.g. website observation"
                             className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm font-bold text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-500 outline-none transition-all"
                           />
                         </div>
                         
                         <div className="space-y-2 flex-1 flex flex-col">
                           <div className="flex items-center justify-between">
                             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Email Body</span>
                             <div className="flex items-center gap-3">
                               <button 
                                 onClick={() => {
                                   setDraftSubject(selectedLead.outreachDraft?.subject || "");
                                   setDraftBody(selectedLead.outreachDraft?.body || "");
                                 }}
                                 className="text-[9px] font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
                               >
                                 Reset to AI Draft
                               </button>
                               <span className={`text-[9px] font-bold ${draftBody.split(/\s+/).length > 40 ? 'text-red-500' : 'text-zinc-400'}`}>
                                 {draftBody.split(/\s+/).length} / 40 words
                               </span>
                             </div>
                           </div>
                           <textarea 
                             value={draftBody}
                             onChange={(e) => setDraftBody(e.target.value)}
                             className="w-full flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed outline-none focus:ring-2 focus:ring-zinc-500 transition-all resize-none"
                             placeholder="Write your observation here..."
                           />
                         </div>

                         <div className="space-y-2 opacity-60">
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Follow-up context</span>
                           <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950 rounded-2xl border-dashed border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 italic leading-relaxed">
                             {selectedLead.outreachDraft.followUp}
                           </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 shrink-0">
                         <button 
                           onClick={() => saveDraft(selectedLead.id)}
                           className="py-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-zinc-100"
                         >
                           Save Progress
                         </button>
                         <button 
                           onClick={() => {
                             navigator.clipboard.writeText(`Subject: ${draftSubject}\n\n${draftBody}`);
                             saveDraft(selectedLead.id, true);
                           }}
                           className="py-4 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 group hover:scale-[1.02] transition-all"
                         >
                           Copy & Mark Sent
                           <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                         </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-start gap-3 mt-auto shrink-0">
                     <div className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg">
                       <Zap className="h-4 w-4 text-zinc-400" />
                     </div>
                     <p className="text-[10px] text-zinc-500 leading-relaxed">
                       Principle: Use "I" to signal a personal reachout from a developer. Keep subject lines lowercase for a manual feel.
                     </p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

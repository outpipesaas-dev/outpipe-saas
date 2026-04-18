"use client";

import { useEffect, useState } from "react";
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Hash,
  ArrowRight,
  Database,
  AlertCircle
} from "lucide-react";

interface ScrapeJob {
  id: string;
  query: string;
  location: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  leadsFound: number;
  leadsImported: number;
  leadsSkipped: number;
  errorLog: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export default function ScrapeHistory({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      setJobs(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); 
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  if (loading && jobs.length === 0) {
    return (
      <div className="p-12 text-center animate-pulse">
        <Loader2 className="h-6 w-6 text-zinc-300 mx-auto animate-spin mb-4" />
        <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Synchronizing History...</p>
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className="p-8 text-center bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
        <AlertCircle className="mx-auto h-6 w-6 text-red-500 mb-2" />
        <p className="text-sm font-bold text-red-700 dark:text-red-400">Unable to load history</p>
        <button 
          onClick={() => { setLoading(true); fetchJobs(); }}
          className="mt-4 text-xs font-black uppercase text-red-600 dark:text-red-500 underline"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 font-bold px-2">
        <History className="h-4 w-4" />
        <h2 className="text-sm uppercase tracking-widest text-[10px]">Recent Research Runs</h2>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {jobs.map((job) => (
          <div 
            key={job.id}
            className="group font-sans bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {job.query}
                  </span>
                  <ArrowRight className="h-3 w-3 text-zinc-300" />
                  <span className="text-xs font-medium text-zinc-500 uppercase">
                    {job.location}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-medium">
                   <div className="flex items-center gap-1">
                     <Clock className="h-3 w-3" />
                     {new Date(job.createdAt).toLocaleTimeString()}
                   </div>
                   {job.status === "COMPLETED" && (
                     <div className="flex items-center gap-3 border-l border-zinc-200 dark:border-zinc-800 pl-3">
                       <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                         <Hash className="h-2.5 w-2.5" />
                         {job.leadsImported} imported
                       </span>
                       <span className="text-zinc-400">
                         {job.leadsSkipped} skipped
                       </span>
                     </div>
                   )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {job.status === "RUNNING" ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 dark:bg-zinc-50 rounded-lg text-white dark:text-zinc-950 text-[10px] font-bold animate-pulse">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    RUNNING
                  </div>
                ) : job.status === "COMPLETED" ? (
                  <div className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    DONE
                  </div>
                ) : job.status === "FAILED" ? (
                  <div className="flex flex-col items-end gap-1">
                    <div className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold flex items-center gap-1">
                      <XCircle className="h-2.5 w-2.5" />
                      FAILED
                    </div>
                    {job.errorLog && (
                      <span className="text-[10px] text-red-400 font-medium max-w-[150px] truncate text-right">
                        {job.errorLog}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-bold">
                    PENDING
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="p-8 text-center bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
             <Database className="mx-auto h-6 w-6 text-zinc-300 mb-2" />
             <p className="text-xs text-zinc-500 italic">History is empty. Launch your first research run above.</p>
          </div>
        )}
      </div>
    </div>
  );
}

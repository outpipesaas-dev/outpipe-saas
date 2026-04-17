"use client";

import { useState } from "react";
import { Search, MapPin, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import ScrapeHistory from "@/components/scrape-history";

export default function ScrapePage() {
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleStartScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !location) return;

    setStatus("loading");
    setMessage("Initializing scraping process...");

    try {
      const response = await fetch("/api/scraper/google-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: niche, location, maxResults }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text.slice(0, 100));
        throw new Error("Received non-JSON response from server.");
      }

      const data = await response.json();
      setStatus("success");
      setMessage(`Scrape Job #${data.jobId.slice(-4)} started. Monitoring progress below...`);
      
      // Reset form after a few seconds
      setTimeout(() => {
        setNiche("");
        setLocation("");
        setStatus("idle");
      }, 5000);

    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Something went wrong. Please check the logs.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              New Research
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              Launch a scavenger hunt for your next US client.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleStartScrape} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Niche / Industry
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Roofers"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all dark:text-zinc-50"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  US City / State
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Orlando, FL"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all dark:text-zinc-50"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Bulk Volume (Max Results)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all dark:text-zinc-50 font-bold"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className={`w-full h-14 flex items-center justify-center gap-2 rounded-2xl font-bold transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                status === "success" 
                ? "bg-green-600 text-white" 
                : "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950"
              }`}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Deploying Playwright...
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Mission Started
                </>
              ) : (
                "Launch Scraper"
              )}
            </button>
          </form>

          {message && (
            <div className={`mt-8 p-4 rounded-xl flex gap-3 ${
              status === "success" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-800/30" :
              status === "error" ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-800/30" :
              "bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400"
            }`}>
              {status === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : 
               status === "error" ? <AlertCircle className="h-5 w-5 shrink-0" /> : 
               <Loader2 className="h-5 w-5 animate-spin shrink-0" />}
              <span className="text-sm font-bold">{message}</span>
            </div>
          )}
        </div>

        <ScrapeHistory />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
             <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-4 flex items-center justify-center font-bold text-zinc-400 text-xs">01</div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Search</h3>
            <p className="mt-2 text-sm font-medium dark:text-zinc-200">Google Maps Live Search</p>
          </div>
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
             <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-4 flex items-center justify-center font-bold text-zinc-400 text-xs">02</div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Store</h3>
            <p className="mt-2 text-sm font-medium dark:text-zinc-200">Deduplicated Lead Storage</p>
          </div>
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
             <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-4 flex items-center justify-center font-bold text-zinc-400 text-xs">03</div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Review</h3>
            <p className="mt-2 text-sm font-medium dark:text-zinc-200">Inbox-first Lead Triage</p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, ArrowRight, Trophy, Target, Sparkles, SlidersHorizontal, CheckCircle2, ShieldAlert, Plus, Lock, Globe } from "lucide-react"

const DEFAULT_SPORTS = [
  { id: "running", label: "Running", emoji: "🏃" },
  { id: "cycling", label: "Cycling", emoji: "🚴" },
  { id: "swimming", label: "Swimming", emoji: "🏊" },
  { id: "hiking", label: "Hiking", emoji: "🥾" },
  { id: "crossfit", label: "CrossFit", emoji: "🏋️" },
  { id: "padel", label: "Padel", emoji: "🎾" },
  { id: "tennis", label: "Tennis", emoji: "🎾" },
  { id: "yoga", label: "Yoga", emoji: "🧘" },
]

export default function CreateLeaguePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [availableSports, setAvailableSports] = useState(DEFAULT_SPORTS)
  const [customSportInput, setCustomSportInput] = useState("")

  const [form, setForm] = useState({
    name: "",
    description: "",
    isPublic: false, // NEW: Defaults to Private
    sports: [] as string[],
    scoringMode: "algorithm" as "algorithm" | "basic" | "advanced",
    runPointsPerKm: 10,
    padelPointsPerWin: 50,
  })

  function toggleSport(sportId: string) {
    if (form.sports.includes(sportId)) {
      setForm({ ...form, sports: form.sports.filter(s => s !== sportId) })
    } else {
      setForm({ ...form, sports: [...form.sports, sportId] })
    }
  }

  function handleAddCustomSport(e: React.FormEvent) {
    e.preventDefault()
    if (!customSportInput.trim()) return
    const newId = customSportInput.trim().toLowerCase()
    
    if (!availableSports.find(s => s.id === newId)) {
      setAvailableSports([...availableSports, { id: newId, label: customSportInput.trim(), emoji: "🏅" }])
    }
    if (!form.sports.includes(newId)) {
      setForm({ ...form, sports: [...form.sports, newId] })
    }
    setCustomSportInput("")
  }

  async function handleCreate() {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert("You must be logged in to create a league.")
      setLoading(false)
      return
    }

    const { data: newLeague, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        name: form.name,
        description: form.description,
        activity_type: form.sports.join(','),
        scoring_mode: form.scoringMode,
        is_public: form.isPublic, // NEW: Saves public/private status
        created_by: user.id
      })
      .select()
      .single()

    if (leagueError) {
      console.error("Database Error:", leagueError)
      alert(`Database Error: ${leagueError.message}. \n\nEnsure 'scoring_mode' and 'is_public' exist in your table.`)
      setLoading(false)
      return
    }

    if (newLeague) {
      await supabase
        .from('league_members')
        .insert({
          league_id: newLeague.id,
          user_id: user.id,
          total_points: 0,
          matches_played: 0,
          matches_won: 0
        })
    }
    
    router.push(`/compete/leagues/${newLeague?.id || ''}`) 
  }

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans pb-24">
      
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-6 pb-4">
        <button 
          onClick={() => step > 1 ? setStep(step - 1) : router.push("/compete/leagues")} 
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100"
        >
          <ArrowLeft className="size-4" /> {step > 1 ? "Back" : "Cancel"}
        </button>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 mt-4">
        
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-black uppercase tracking-widest text-teal-600">Step {step} of 3</span>
            <span className="text-xs font-bold text-slate-400">
              {step === 1 ? "Basics" : step === 2 ? "Eligible Sports" : "Scoring Rules"}
            </span>
          </div>
          <div className="flex gap-2 h-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex-1 rounded-full transition-all duration-500 ${step >= i ? "bg-teal-500" : "bg-slate-200"}`} />
            ))}
          </div>
        </div>

        {/* ── STEP 1: BASICS ── */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Setup your League</h1>
              <p className="text-lg text-slate-500 font-medium">Create a competitive space for you and your friends.</p>
            </div>

            <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-sm border border-slate-100 space-y-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">League Name</label>
                <input 
                  type="text"
                  placeholder="e.g. The Sunday Warriors"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-lg font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">What's on the line? (Optional)</label>
                <textarea 
                  placeholder="Loser buys the post-run coffees for a month..."
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-base font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all resize-none"
                />
              </div>

              {/* NEW: Public vs Private Toggle */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">Privacy</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setForm({...form, isPublic: false})}
                    className={`flex items-start gap-3 p-5 rounded-2xl border-2 transition-all text-left ${!form.isPublic ? "border-teal-500 bg-teal-50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${!form.isPublic ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                      <Lock className="size-5" />
                    </div>
                    <div>
                      <h4 className={`font-black mb-0.5 ${!form.isPublic ? "text-teal-900" : "text-slate-700"}`}>Private</h4>
                      <p className={`text-xs font-medium ${!form.isPublic ? "text-teal-700" : "text-slate-500"}`}>Invite only. Best for friend groups.</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setForm({...form, isPublic: true})}
                    className={`flex items-start gap-3 p-5 rounded-2xl border-2 transition-all text-left ${form.isPublic ? "border-teal-500 bg-teal-50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${form.isPublic ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                      <Globe className="size-5" />
                    </div>
                    <div>
                      <h4 className={`font-black mb-0.5 ${form.isPublic ? "text-teal-900" : "text-slate-700"}`}>Public</h4>
                      <p className={`text-xs font-medium ${form.isPublic ? "text-teal-700" : "text-slate-500"}`}>Anyone in the city can join.</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                disabled={!form.name.trim()}
                onClick={() => setStep(2)}
                className="flex items-center gap-2 rounded-full bg-teal-600 text-white px-8 py-4 text-base font-bold shadow-md hover:bg-teal-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
              >
                Choose Sports <ArrowRight className="size-5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: SPORTS ── */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Which sports count?</h1>
              <p className="text-lg text-slate-500 font-medium">Select the activities that will earn points in this league.</p>
            </div>

            <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-sm border border-slate-100">
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {availableSports.map(sport => {
                  const isSelected = form.sports.includes(sport.id);
                  return (
                    <button
                      key={sport.id}
                      onClick={() => toggleSport(sport.id)}
                      className={`relative flex flex-col items-center justify-center p-5 rounded-3xl border-2 transition-all duration-200 ${
                        isSelected 
                          ? "border-teal-500 bg-teal-50 shadow-sm" 
                          : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {isSelected && <div className="absolute top-3 right-3 size-5 bg-teal-500 rounded-full flex items-center justify-center shadow-sm"><CheckCircle2 className="size-3.5 text-white" /></div>}
                      <span className="text-4xl mb-2 grayscale-[20%]">{sport.emoji}</span>
                      <span className={`text-sm font-bold capitalize ${isSelected ? "text-teal-900" : "text-slate-600"}`}>{sport.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Add Custom Sport */}
              <div className="pt-6 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">Don't see your sport?</label>
                <form onSubmit={handleAddCustomSport} className="flex gap-3">
                  <input 
                    type="text"
                    placeholder="Type custom sport..."
                    value={customSportInput}
                    onChange={(e) => setCustomSportInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all"
                  />
                  <button type="submit" disabled={!customSportInput.trim()} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                    <Plus className="size-4" /> Add
                  </button>
                </form>
              </div>

            </div>

            <div className="mt-8 flex justify-end">
              <button 
                disabled={form.sports.length === 0}
                onClick={() => setStep(3)}
                className="flex items-center gap-2 rounded-full bg-teal-600 text-white px-8 py-4 text-base font-bold shadow-md hover:bg-teal-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
              >
                Set Scoring Rules <ArrowRight className="size-5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: SCORING SETTINGS ── */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">How do you win?</h1>
              <p className="text-lg text-slate-500 font-medium max-w-lg">Choose how activities are converted into leaderboard points.</p>
            </div>

            <div className="grid grid-cols-1 gap-5 mb-8">
              
              {/* Option 1: Algorithm */}
              <button 
                onClick={() => setForm({...form, scoringMode: "algorithm"})}
                className={`flex items-start gap-5 p-6 rounded-[2rem] border-2 transition-all text-left ${form.scoringMode === "algorithm" ? "border-teal-500 bg-teal-50 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${form.scoringMode === "algorithm" ? "bg-teal-500 text-white shadow-sm" : "bg-slate-100 text-slate-500"}`}>
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <h3 className={`text-lg font-black mb-1 ${form.scoringMode === "algorithm" ? "text-teal-900" : "text-slate-800"}`}>The Balance Algorithm</h3>
                  <p className={`font-medium leading-relaxed ${form.scoringMode === "algorithm" ? "text-teal-700/80" : "text-slate-500"}`}>
                    Uses the official app points system. Automatically balances cardio endurance against match wins for a fair, multi-sport competition.
                  </p>
                </div>
              </button>

              {/* Option 2: Basic Flat Rate */}
              <button 
                onClick={() => setForm({...form, scoringMode: "basic"})}
                className={`flex items-start gap-5 p-6 rounded-[2rem] border-2 transition-all text-left ${form.scoringMode === "basic" ? "border-amber-500 bg-amber-50 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${form.scoringMode === "basic" ? "bg-amber-500 text-white shadow-sm" : "bg-slate-100 text-slate-500"}`}>
                  <Target className="size-6" />
                </div>
                <div>
                  <h3 className={`text-lg font-black mb-1 ${form.scoringMode === "basic" ? "text-amber-900" : "text-slate-800"}`}>Simple Tally (Basic)</h3>
                  <p className={`font-medium leading-relaxed ${form.scoringMode === "basic" ? "text-amber-800/80" : "text-slate-500"}`}>
                    A flat 10 points per activity logged, regardless of distance, time, or skill. Perfect for casual consistency challenges.
                  </p>
                </div>
              </button>

              {/* Option 3: Advanced Rules */}
              <button 
                onClick={() => setForm({...form, scoringMode: "advanced"})}
                className={`flex items-start gap-5 p-6 rounded-[2rem] border-2 transition-all text-left ${form.scoringMode === "advanced" ? "border-indigo-500 bg-indigo-50 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${form.scoringMode === "advanced" ? "bg-indigo-500 text-white shadow-sm" : "bg-slate-100 text-slate-500"}`}>
                  <SlidersHorizontal className="size-6" />
                </div>
                <div>
                  <h3 className={`text-lg font-black mb-1 ${form.scoringMode === "advanced" ? "text-indigo-900" : "text-slate-800"}`}>Custom Rulebook (Advanced)</h3>
                  <p className={`font-medium leading-relaxed ${form.scoringMode === "advanced" ? "text-indigo-800/80" : "text-slate-500"}`}>
                    Full control. Set exact point multipliers per kilometer run, or specific points for individual match outcomes.
                  </p>
                </div>
              </button>

            </div>

            {/* Advanced Settings Panel */}
            {form.scoringMode === "advanced" && (
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 mb-8 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                  <ShieldAlert className="size-5 text-indigo-500" />
                  <h4 className="font-bold text-slate-800">Advanced Multipliers</h4>
                </div>

                <div className="space-y-8">
                  {form.sports.includes("running") || form.sports.includes("cycling") || form.sports.includes("swimming") ? (
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-bold text-slate-700">Points per Kilometer (Endurance)</label>
                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{form.runPointsPerKm} pts / km</span>
                      </div>
                      <input 
                        type="range" min="1" max="50" 
                        value={form.runPointsPerKm}
                        onChange={(e) => setForm({...form, runPointsPerKm: parseInt(e.target.value)})}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  ) : null}
                  
                  {form.sports.includes("padel") || form.sports.includes("tennis") ? (
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-bold text-slate-700">Points per Match Win (Racket Sports)</label>
                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{form.padelPointsPerWin} pts</span>
                      </div>
                      <input 
                        type="range" min="10" max="200" step="10"
                        value={form.padelPointsPerWin}
                        onChange={(e) => setForm({...form, padelPointsPerWin: parseInt(e.target.value)})}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  ) : null}
                  
                  {form.sports.length === 0 && (
                    <p className="text-sm font-medium text-slate-400 italic">Go back to Step 2 and select sports to configure their specific points.</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleCreate}
                disabled={loading}
                className="flex items-center gap-2 rounded-full bg-slate-900 text-white px-8 py-4 text-base font-bold shadow-md hover:bg-slate-800 hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {loading ? "Creating League..." : "Launch League"} <Trophy className="size-5 text-amber-400" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

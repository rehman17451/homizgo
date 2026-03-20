"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getCurrentUser, getProperties, type Property, type User, type Gender,
} from "@/lib/store"
import { Navbar } from "@/components/navbar"
import { PropertyCard } from "@/components/property-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Search, SlidersHorizontal, Building2, Users, X, Sparkles, MapPin } from "lucide-react"

export default function UserDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState("")
  const router = useRouter()

  const [filterGender, setFilterGender] = useState<Gender | "all">("all")
  const [filterType, setFilterType] = useState<"all" | "landlord" | "pgowner">("all")
  const [filterMaxPrice, setFilterMaxPrice] = useState(15000)
  const [filterFacilities, setFilterFacilities] = useState<string[]>([])
  const ALL_FACILITIES = ["WiFi", "Parking", "Food", "Electricity", "Laundry", "AC", "Gym", "Security"]

  useEffect(() => {
    let active = true
    async function load() {
      const current = await getCurrentUser()
      if (!current || current.role !== "user") {
        router.push("/login")
        return
      }
      const rows = await getProperties()
      if (!active) return
      setUser(current)
      setProperties(rows)
    }
    load().catch(() => router.push("/login"))
    return () => {
      active = false
    }
  }, [router])

  const filtered = properties.filter((p) => {
    if (!p.available) return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.location.toLowerCase().includes(search.toLowerCase())) return false
    if (filterGender !== "all" && p.propertyFor !== filterGender) return false
    if (filterType !== "all" && p.ownerRole !== filterType) return false
    if (p.price > filterMaxPrice) return false
    if (filterFacilities.length > 0 && !filterFacilities.every((f) => p.facilities.includes(f))) return false
    return true
  })

  const landlordListings = filtered.filter((p) => p.ownerRole === "landlord")
  const pgListings = filtered.filter((p) => p.ownerRole === "pgowner")
  const activeFilters = (filterGender !== "all" ? 1 : 0) + (filterType !== "all" ? 1 : 0) + (filterMaxPrice < 15000 ? 1 : 0) + filterFacilities.length

  const clearFilters = () => { setFilterGender("all"); setFilterType("all"); setFilterMaxPrice(15000); setFilterFacilities([]); setSearch("") }
  const toggleFacility = (f: string) => setFilterFacilities((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])

  if (!user) return null

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                Student
              </span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Find Your Stay</h1>
            <p className="mt-1 text-muted-foreground">Hey {user.name}, browse {filtered.length} available properties</p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            {showFilters ? "Hide Filters" : "Filters"}
            {activeFilters > 0 && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{activeFilters}</span>
            )}
          </Button>
        </div>

        {/* Search bar */}
        <div className="mt-6">
          <div className="flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-sm">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary/50 px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or location..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-semibold text-card-foreground">Filters</h3>
              <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear All
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender</Label>
                <div className="mt-2 flex gap-2">
                  {(["all", "male", "female"] as const).map((g) => (
                    <Button key={g} type="button" variant={filterGender === g ? "default" : "outline"} size="sm" className="rounded-xl flex-1" onClick={() => setFilterGender(g)}>
                      {g === "all" ? "All" : g === "male" ? "Boys" : "Girls"}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
                <div className="mt-2 flex gap-2">
                  {(["all", "landlord", "pgowner"] as const).map((t) => (
                    <Button key={t} type="button" variant={filterType === t ? "default" : "outline"} size="sm" className="rounded-xl flex-1" onClick={() => setFilterType(t)}>
                      {t === "all" ? "All" : t === "landlord" ? "Rental" : "PG"}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Max Price: <span className="text-primary font-bold">INR {filterMaxPrice.toLocaleString("en-IN")}</span>
                </Label>
                <div className="mt-3">
                  <Slider value={[filterMaxPrice]} onValueChange={([v]) => setFilterMaxPrice(v)} max={20000} min={1000} step={500} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Facilities</Label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ALL_FACILITIES.map((f) => (
                    <button key={f} onClick={() => toggleFacility(f)} className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      filterFacilities.includes(f) ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}>{f}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {landlordListings.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-4 w-4 text-primary" /></div>
              <h2 className="font-heading text-xl font-semibold text-foreground">Landlord Rentals</h2>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{landlordListings.length}</span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {landlordListings.map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)}
            </div>
          </div>
        )}

        {pgListings.length > 0 && (
          <div className="mt-14">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10"><Users className="h-4 w-4 text-accent" /></div>
              <h2 className="font-heading text-xl font-semibold text-foreground">PG Accommodations</h2>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{pgListings.length}</span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pgListings.map((p, i) => <PropertyCard key={p.id} property={p} index={i + 2} />)}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="mt-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <Search className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-semibold text-foreground">No properties found</p>
            <p className="mt-1 text-muted-foreground">Try adjusting your filters or search criteria.</p>
            <Button variant="outline" className="mt-4 rounded-xl" onClick={clearFilters}>Clear Filters</Button>
          </div>
        )}
      </main>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  getCurrentUser, getProperties, addProperty, updateProperty, deleteProperty, getUsers,
  type Property, type User,
} from "@/lib/store"
import { Navbar } from "@/components/navbar"
import { PropertyForm } from "@/components/property-form"
import { Button } from "@/components/ui/button"
import {
  Plus, Pencil, Trash2, Eye, Users, MessageSquare, MapPin, IndianRupee,
  Building2, Home, TrendingUp, Sparkles,
} from "lucide-react"

export default function LandlordDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editProp, setEditProp] = useState<Property | null>(null)
  const [viewInterested, setViewInterested] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let active = true
    async function load() {
      const current = await getCurrentUser()
      if (!current || current.role !== "landlord") {
        router.push("/login")
        return
      }
      const [users, props] = await Promise.all([getUsers(), getProperties()])
      if (!active) return
      setUser(current)
      setAllUsers(users)
      setProperties(props.filter((p) => p.ownerId === current.id))
    }
    load().catch(() => router.push("/login"))
    return () => {
      active = false
    }
  }, [router])

  const refreshProperties = async (ownerId: string) => {
    const props = await getProperties()
    setProperties(props.filter((p) => p.ownerId === ownerId))
  }

  const handleAdd = async (data: Partial<Property>) => {
    if (!user) return
    await addProperty({ ...data, ownerId: user.id, ownerName: user.name, ownerRole: "landlord" } as any)
    await refreshProperties(user.id)
    setShowForm(false)
  }

  const [propToDelete, setPropToDelete] = useState<string | null>(null)

  const handleEdit = async (data: Partial<Property>) => {
    if (!editProp) return
    await updateProperty(editProp.id, data)
    await refreshProperties(user!.id)
    setEditProp(null)
  }

  const handleDeleteConfirm = async () => {
    if (propToDelete) {
      await deleteProperty(propToDelete)
      await refreshProperties(user!.id)
      setPropToDelete(null)
    }
  }

  const getInterestedUserNames = (userIds: string[]) =>
    userIds.map((id) => { const u = allUsers.find((usr) => usr.id === id); return u ? u.name : "Unknown User" })

  if (!user) return null

  const totalInterested = properties.reduce((sum, p) => sum + p.interestedUsers.length, 0)

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Home className="h-3 w-3" />
                Landlord
              </span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">My Properties</h1>
            <p className="mt-1 text-muted-foreground">Welcome back, {user.name}</p>
          </div>
          <Button className="rounded-xl shadow-lg shadow-primary/20" onClick={() => { setShowForm(true); setEditProp(null) }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Properties", value: properties.length, icon: Home, color: "bg-primary/10 text-primary" },
            { label: "Interested Users", value: totalInterested, icon: Users, color: "bg-accent/10 text-accent" },
            { label: "Available", value: properties.filter((p) => p.available).length, icon: TrendingUp, color: "bg-chart-3/10 text-chart-3" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border bg-card p-5 transition-all hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-heading text-2xl font-bold text-card-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(showForm || editProp) && (
          <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
            <PropertyForm onSubmit={editProp ? handleEdit : handleAdd} onCancel={() => { setShowForm(false); setEditProp(null) }} initial={editProp || undefined} isPG={false} />
          </div>
        )}

        <div className="mt-8 space-y-4">
          {properties.length === 0 && !showForm && (
            <div className="rounded-2xl border bg-card p-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                <Building2 className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-lg font-semibold text-card-foreground">No properties yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add your first rental property to get started.</p>
              <Button className="mt-5 rounded-xl" onClick={() => setShowForm(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Add First Property
              </Button>
            </div>
          )}

          {properties.map((prop) => (
            <div key={prop.id} className="group rounded-2xl border bg-card p-5 transition-all hover:shadow-md hover:border-primary/20">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading text-lg font-semibold text-card-foreground">{prop.title}</h3>
                    <span className={`rounded-lg px-2.5 py-0.5 text-xs font-medium ${prop.available ? "bg-chart-3/10 text-chart-3" : "bg-destructive/10 text-destructive"}`}>
                      {prop.available ? "Available" : "Unavailable"}
                    </span>
                    <span className="rounded-lg bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                      {prop.propertyFor === "male" ? "Boys" : "Girls"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{prop.location}</span>
                    <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" />{prop.price.toLocaleString("en-IN")}/{prop.rentDuration?.toLowerCase()}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{prop.interestedUsers.length} interested</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/property/${prop.id}`}><Button variant="outline" size="sm" className="rounded-xl"><Eye className="mr-1.5 h-4 w-4" />View</Button></Link>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setViewInterested(viewInterested === prop.id ? null : prop.id)}>
                    <Users className="mr-1.5 h-4 w-4" />Interested ({prop.interestedUsers.length})
                  </Button>
                  <Link href="/chat"><Button variant="outline" size="sm" className="rounded-xl"><MessageSquare className="mr-1.5 h-4 w-4" />Chat</Button></Link>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setEditProp(prop); setShowForm(false) }}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
                  <Button variant="outline" size="sm" className="rounded-xl text-destructive hover:bg-destructive/10" onClick={() => setPropToDelete(prop.id)}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>
                </div>
              </div>
              {viewInterested === prop.id && (
                <div className="mt-4 rounded-xl bg-secondary/50 p-4">
                  <h4 className="text-sm font-semibold text-card-foreground">Interested Users</h4>
                  {prop.interestedUsers.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">No one has shown interest yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {getInterestedUserNames(prop.interestedUsers).map((name, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-card-foreground">
                          <div className="h-2 w-2 rounded-full bg-primary" />{name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {propToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
              <h3 className="font-heading text-lg font-semibold text-card-foreground">Delete Property</h3>
              <p className="mt-2 text-sm text-muted-foreground">Are you sure you want to delete this property? This action cannot be undone.</p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" className="rounded-xl" onClick={() => setPropToDelete(null)}>Cancel</Button>
                <Button variant="destructive" className="rounded-xl" onClick={handleDeleteConfirm}>Delete</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

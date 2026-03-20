"use client"

import { useState, useRef } from "react"
import type { Property, Gender } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { X, Sparkles, UploadCloud, Loader2 } from "lucide-react"

const ALL_FACILITIES = ["WiFi", "Parking", "Food", "Electricity", "Laundry", "AC", "Gym", "Security"]

interface PropertyFormProps {
  onSubmit: (data: Partial<Property>) => void
  onCancel: () => void
  initial?: Property
  isPG?: boolean
}

export function PropertyForm({ onSubmit, onCancel, initial, isPG = false }: PropertyFormProps) {
  const [title, setTitle] = useState(initial?.title || "")
  const [propertyFor, setPropertyFor] = useState<Gender>(initial?.propertyFor || "male")
  const [price, setPrice] = useState(initial?.price?.toString() || "")
  const [location, setLocation] = useState(initial?.location || "")
  const [mapEmbed, setMapEmbed] = useState(initial?.mapEmbed || "")
  const [facilities, setFacilities] = useState<string[]>(initial?.facilities || [])
  const [rules, setRules] = useState(initial?.rules?.join(", ") || "")
  const [livingAlone, setLivingAlone] = useState(initial?.livingAlone || false)
  const [phm, setPhm] = useState(initial?.phm || false)
  const [rentDuration, setRentDuration] = useState(initial?.rentDuration || "Monthly")
  const [waterFiltration, setWaterFiltration] = useState(initial?.waterFiltration || false)
  const [distanceRange, setDistanceRange] = useState(initial?.distanceRange || "")
  const [notes, setNotes] = useState(initial?.notes || "")
  const [available, setAvailable] = useState(initial?.available ?? true)
  const [currentOccupants, setCurrentOccupants] = useState(initial?.currentOccupants?.toString() || "")
  const [totalCapacity, setTotalCapacity] = useState(initial?.totalCapacity?.toString() || "")
  const [roomType, setRoomType] = useState<"private" | "sharing">(initial?.roomType || "sharing")
  const [foodIncluded, setFoodIncluded] = useState(initial?.foodIncluded || false)
  const [images, setImages] = useState<string[]>(initial?.images || [])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setIsUploading(true)
    try {
      const uploadedUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append("file", file)
        formData.append("bucket", "property-images")
        const res = await fetch("/api/storage/upload", { method: "POST", body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Upload failed")
        if (data.url) uploadedUrls.push(data.url)
      }
      setImages((prev) => [...prev, ...uploadedUrls])
    } catch (err: any) {
      console.error("Failed to upload images:", err)
      alert(`Upload Error: ${err.message}`)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleFacility = (f: string) => {
    setFacilities((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: Partial<Property> = {
      title, propertyFor, price: Number(price), location,
      mapEmbed: mapEmbed.trim(),
      facilities,
      rules: rules.split(",").map((r) => r.trim()).filter(Boolean),
      livingAlone, phm, rentDuration, waterFiltration, distanceRange, notes,
      images, available,
    }
    if (isPG) {
      data.currentOccupants = Number(currentOccupants) || 0
      data.totalCapacity = Number(totalCapacity) || 0
      data.roomType = roomType
      data.foodIncluded = foodIncluded
    }
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="font-heading text-xl font-bold text-card-foreground">
            {initial ? "Edit Property" : "Add New Property"}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="icon" className="rounded-xl" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="title">Property Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Spacious 2BHK Near Campus" className="mt-1.5 rounded-xl" />
        </div>
        <div>
          <Label>Property For</Label>
          <div className="mt-1.5 flex gap-2">
            <Button type="button" variant={propertyFor === "male" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setPropertyFor("male")}>Male</Button>
            <Button type="button" variant={propertyFor === "female" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setPropertyFor("female")}>Female</Button>
          </div>
        </div>
        <div>
          <Label htmlFor="price">Price (INR / month)</Label>
          <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="8000" className="mt-1.5 rounded-xl" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="location">Location / Address</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="MG Road, Near Engineering College" className="mt-1.5 rounded-xl" />
        </div>

        {/* Google Maps Embed URL */}
        <div className="md:col-span-2">
          <Label htmlFor="mapEmbed">
            Google Maps Embed URL{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="mapEmbed"
            value={mapEmbed}
            onChange={(e) => setMapEmbed(e.target.value)}
            placeholder="https://www.google.com/maps/embed?pb=..."
            className="mt-1.5 rounded-xl"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            To get this: open{" "}
            <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Google Maps
            </a>{" "}
            → search your address → <strong>Share</strong> → <strong>Embed a map</strong> → copy the value inside{" "}
            <code className="bg-secondary rounded px-1">src="..."</code>
          </p>
          {mapEmbed && (
            <div className="mt-3 aspect-video overflow-hidden rounded-xl border">
              <iframe
                src={mapEmbed}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Map preview"
              />
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="distanceRange">Distance from Campus</Label>
          <Input id="distanceRange" value={distanceRange} onChange={(e) => setDistanceRange(e.target.value)} placeholder="0.5 km" className="mt-1.5 rounded-xl" />
        </div>
        <div>
          <Label htmlFor="rentDuration">Rent Duration</Label>
          <select id="rentDuration" value={rentDuration} onChange={(e) => setRentDuration(e.target.value)} className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Semi-Annual">Semi-Annual</option>
            <option value="Annual">Annual</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <Label>Facilities</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_FACILITIES.map((f) => (
              <button key={f} type="button" onClick={() => toggleFacility(f)} className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                facilities.includes(f)
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="rules">Rules & Regulations (comma-separated)</Label>
          <Textarea id="rules" value={rules} onChange={(e) => setRules(e.target.value)} placeholder="No smoking, No pets, Visitors allowed till 9 PM" className="mt-1.5 rounded-xl" />
        </div>
        {isPG && (
          <>
            <div>
              <Label htmlFor="currentOccupants">Current Occupants</Label>
              <Input id="currentOccupants" type="number" value={currentOccupants} onChange={(e) => setCurrentOccupants(e.target.value)} placeholder="15" className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="totalCapacity">Total Capacity</Label>
              <Input id="totalCapacity" type="number" value={totalCapacity} onChange={(e) => setTotalCapacity(e.target.value)} placeholder="30" className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>Room Type</Label>
              <div className="mt-1.5 flex gap-2">
                <Button type="button" variant={roomType === "private" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setRoomType("private")}>Private</Button>
                <Button type="button" variant={roomType === "sharing" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setRoomType("sharing")}>Sharing</Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="foodIncluded" checked={foodIncluded} onCheckedChange={setFoodIncluded} />
              <Label htmlFor="foodIncluded">Food Included</Label>
            </div>
          </>
        )}
        <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
          <Switch id="livingAlone" checked={livingAlone} onCheckedChange={setLivingAlone} />
          <Label htmlFor="livingAlone">Living Alone Option</Label>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
          <Switch id="phm" checked={phm} onCheckedChange={setPhm} />
          <Label htmlFor="phm">PHM Required</Label>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
          <Switch id="waterFiltration" checked={waterFiltration} onCheckedChange={setWaterFiltration} />
          <Label htmlFor="waterFiltration">Water Filtration</Label>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
          <Switch id="available" checked={available} onCheckedChange={setAvailable} />
          <Label htmlFor="available">Available</Label>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="notes">Extra Notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional details..." className="mt-1.5 rounded-xl" />
        </div>
        <div className="md:col-span-2">
          <Label>Property Images</Label>
          <div className="mt-2">
            <div className="flex items-center gap-4">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="rounded-xl">
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isUploading ? "Uploading..." : "Upload Images"}
              </Button>
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <span className="text-sm text-muted-foreground">{images.length} images added</span>
            </div>
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {images.map((url, i) => (
                  <div key={i} className="group relative aspect-video overflow-hidden rounded-xl border bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Property image ${i + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/70">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1 rounded-xl h-11 shadow-lg shadow-primary/20">
          {initial ? "Save Changes" : "Add Property"}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

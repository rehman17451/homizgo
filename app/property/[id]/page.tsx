"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  getCurrentUser, getProperties, getUsers, toggleInterest, getOrCreateThread,
  type Property, type User,
} from "@/lib/store"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft, Heart, MessageSquare, MapPin, IndianRupee, Wifi, Car, UtensilsCrossed, Zap,
  ShieldCheck, Dumbbell, WashingMachine, Wind, Users, Home, CheckCircle2, XCircle,
  CreditCard, Share2, Phone, Sparkles, Star, ExternalLink, Send,
} from "lucide-react"
import { format } from "date-fns"

const facilityIcons: Record<string, React.ElementType> = {
  WiFi: Wifi, Parking: Car, Food: UtensilsCrossed, Electricity: Zap,
  Security: ShieldCheck, Gym: Dumbbell, Laundry: WashingMachine, AC: Wind,
}

// ── Review types ──────────────────────────────────────────────────────────────
interface Review {
  id: string
  propertyId: string
  userId: string
  userName: string
  rating: number
  comment: string
  createdAt: string
}

// ── Star rating component ─────────────────────────────────────────────────────
function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
  size?: "sm" | "md"
}) {
  const [hovered, setHovered] = useState(0)
  const sz = size === "sm" ? "h-4 w-4" : "h-6 w-6"
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (readonly ? value : (hovered || value)) >= star
        return (
          <button
            key={star}
            type={readonly ? "button" : "button"}
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            className={`transition-transform ${readonly ? "cursor-default" : "hover:scale-110 cursor-pointer"}`}
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          >
            <Star className={`${sz} ${filled ? "fill-chart-4 text-chart-4" : "text-muted-foreground/30"}`} />
          </button>
        )
      })}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [property, setProperty] = useState<Property | null>(null)
  const [owner, setOwner] = useState<User | null>(null)
  const [currentUser, setCurrentUserState] = useState<User | null>(null)
  const [isInterested, setIsInterested] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)

  // ── Reviews state ───────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [myRating, setMyRating] = useState(0)
  const [myComment, setMyComment] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState("")
  const [reviewSuccess, setReviewSuccess] = useState(false)

  // ── Load property, owner, user ──────────────────────────────────────────────
  useEffect(() => {
    let active = true
    async function load() {
      const [user, props, users] = await Promise.all([getCurrentUser(), getProperties(), getUsers()])
      const prop = props.find((p) => p.id === params.id)
      if (!active) return
      setCurrentUserState(user)
      if (prop) {
        setProperty(prop)
        setOwner(users.find((u) => u.id === prop.ownerId) || null)
        if (user) setIsInterested(prop.interestedUsers.includes(user.id))
      }
    }
    load().catch(() => {})
    return () => { active = false }
  }, [params.id])

  // ── Load reviews ────────────────────────────────────────────────────────────
  const loadReviews = useCallback(async () => {
    if (!params.id) return
    setReviewsLoading(true)
    try {
      const res = await fetch(`/api/properties/${params.id}/reviews`)
      const data = await res.json()
      if (res.ok) setReviews(data.reviews ?? [])
    } catch {}
    finally { setReviewsLoading(false) }
  }, [params.id])

  useEffect(() => { loadReviews() }, [loadReviews])

  // Pre-fill form if user already has a review
  useEffect(() => {
    if (currentUser && reviews.length > 0) {
      const mine = reviews.find((r) => r.userId === currentUser.id)
      if (mine) { setMyRating(mine.rating); setMyComment(mine.comment) }
    }
  }, [currentUser, reviews])

  // ── Interaction handlers ────────────────────────────────────────────────────
  const handleInterest = async () => {
    if (!currentUser || !property) { router.push("/login"); return }
    const interested = await toggleInterest(property.id, currentUser.id)
    setIsInterested(interested)
    const props = await getProperties()
    setProperty(props.find((p) => p.id === property.id) || null)
  }

  const handleChat = async () => {
    if (!currentUser || !property || !owner) { router.push("/login"); return }
    if (currentUser.role !== "user") {
      alert("Only students can start a conversation with an owner.")
      return
    }
    try {
      const res = await fetch("/api/chat/start-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: owner.id }),
      })
      if (!res.ok) { const err = await res.json(); alert(err.error || "Failed to start conversation"); return }
    } catch { alert("Failed to start conversation. Please try again."); return }
    router.push("/chat")
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: property?.title, text: `Check out this property on Homigo: ${property?.title}`, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setReviewError("")
    if (!myRating) { setReviewError("Please select a star rating."); return }
    setSubmittingReview(true)
    try {
      const res = await fetch(`/api/properties/${params.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: myRating, comment: myComment }),
      })
      const data = await res.json()
      if (!res.ok) { setReviewError(data.error || "Failed to submit review"); return }
      setReviewSuccess(true)
      await loadReviews()
      setTimeout(() => setReviewSuccess(false), 3000)
    } catch { setReviewError("Network error. Please try again.") }
    finally { setSubmittingReview(false) }
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  if (!property) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-secondary shimmer" />
            <p className="mt-4 text-muted-foreground">Loading property...</p>
          </div>
        </div>
      </div>
    )
  }

  const isPG = property.ownerRole === "pgowner"

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to listings
        </button>

        {/* Image */}
        <div className="relative h-64 overflow-hidden rounded-3xl md:h-80 bg-secondary">
          {property.images && property.images.length > 0 ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={property.images[selectedImage] || property.images[0]} alt={property.title} className="h-full w-full object-cover transition-opacity duration-300" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10">
              <Home className="h-20 w-20 text-primary/25" />
            </div>
          )}
          <div className="absolute left-4 top-4 flex gap-2">
            <Badge className="rounded-xl bg-primary text-primary-foreground shadow-sm text-sm px-3 py-1">{isPG ? "PG" : "Rental"}</Badge>
            <Badge variant="outline" className="rounded-xl border-card/50 bg-card/80 text-card-foreground backdrop-blur-sm text-sm px-3 py-1">
              {property.propertyFor === "male" ? "Boys" : "Girls"}
            </Badge>
          </div>
          <div className="absolute right-4 top-4 flex gap-2">
            <button onClick={handleShare} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/80 text-card-foreground backdrop-blur-sm hover:bg-card transition-colors" aria-label="Share property">
              <Share2 className="h-5 w-5" />
            </button>
            <button onClick={handleInterest} className={`flex h-10 w-10 items-center justify-center rounded-xl backdrop-blur-sm transition-colors ${isInterested ? "bg-primary text-primary-foreground" : "bg-card/80 text-card-foreground hover:bg-card"}`} aria-label="Toggle interest">
              <Heart className={`h-5 w-5 ${isInterested ? "fill-current" : ""}`} />
            </button>
          </div>
          {!property.available && (
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
              <span className="rounded-2xl bg-destructive px-6 py-3 text-lg font-bold text-destructive-foreground shadow-lg">Not Available</span>
            </div>
          )}
        </div>

        {property.images && property.images.length > 1 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {property.images.map((url, i) => (
              <div key={i} onClick={() => setSelectedImage(i)} className={`h-20 w-28 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border bg-secondary transition-all ${selectedImage === i ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:opacity-80"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${property.title} ${i + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground text-balance">{property.title}</h1>
              <div className="mt-3 flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 text-primary/60" /><span>{property.location}</span></div>
              {/* Avg rating summary */}
              {reviews.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <StarRating value={Math.round(avgRating)} readonly size="sm" />
                  <span className="text-sm font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                </div>
              )}
            </div>

            {/* Price cards */}
            <div className="flex flex-wrap gap-4">
              <div className="rounded-2xl bg-primary/5 border border-primary/10 px-6 py-4">
                <div className="flex items-center gap-1"><IndianRupee className="h-5 w-5 text-primary" /><span className="font-heading text-3xl font-bold text-foreground">{property.price.toLocaleString("en-IN")}</span></div>
                <p className="text-sm text-muted-foreground">per {property.rentDuration?.toLowerCase()}</p>
              </div>
              {isPG && (
                <>
                  <div className="rounded-2xl bg-accent/5 border border-accent/10 px-6 py-4">
                    <div className="flex items-center gap-1"><Users className="h-5 w-5 text-accent" /><span className="font-heading text-3xl font-bold text-foreground">{property.currentOccupants}/{property.totalCapacity}</span></div>
                    <p className="text-sm text-muted-foreground">occupants</p>
                  </div>
                  <div className="rounded-2xl bg-secondary px-6 py-4">
                    <p className="font-heading text-xl font-bold capitalize text-foreground">{property.roomType}</p>
                    <p className="text-sm text-muted-foreground">room type</p>
                  </div>
                </>
              )}
            </div>

            {/* Facilities */}
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">Facilities</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {property.facilities.map((f) => {
                  const Icon = facilityIcons[f] || CheckCircle2
                  return (
                    <div key={f} className="flex items-center gap-3 rounded-xl bg-card border p-3.5 transition-all hover:border-primary/20 hover:shadow-sm">
                      <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground">{f}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Details */}
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">Details</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <DetailRow label="Distance" value={property.distanceRange} />
                <DetailRow label="Living Alone" value={property.livingAlone ? "Yes" : "No"} isPositive={property.livingAlone} />
                <DetailRow label="PHM Required" value={property.phm ? "Yes" : "No"} />
                <DetailRow label="Water Filtration" value={property.waterFiltration ? "Yes" : "No"} isPositive={property.waterFiltration} />
                <DetailRow label="Rent Duration" value={property.rentDuration} />
                {isPG && property.foodIncluded !== undefined && <DetailRow label="Food Included" value={property.foodIncluded ? "Yes" : "No"} isPositive={property.foodIncluded} />}
              </div>
            </div>

            {property.rules.length > 0 && (
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground">Rules</h2>
                <ul className="mt-4 space-y-2.5">
                  {property.rules.map((r, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10"><div className="h-1.5 w-1.5 rounded-full bg-primary" /></div>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {property.notes && (
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground">Notes</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{property.notes}</p>
              </div>
            )}

            {/* ── Google Maps Location ── */}
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">Location</h2>
              <div className="mt-4">
                {property.mapEmbed ? (
                  <div className="overflow-hidden rounded-2xl border aspect-video shadow-sm">
                    <iframe
                      src={property.mapEmbed}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Property location on Google Maps"
                    />
                  </div>
                ) : (
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(property.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl border bg-secondary/30 p-5 hover:bg-secondary/60 transition-colors group"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">{property.location}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        Open in Google Maps <ExternalLink className="h-3 w-3" />
                      </p>
                    </div>
                  </a>
                )}
              </div>
            </div>

            {/* ── Reviews & Feedback ── */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">Reviews</h2>
                  {reviews.length > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Average: <span className="font-semibold text-foreground">{avgRating.toFixed(1)}/5</span> · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                {reviews.length > 0 && (
                  <StarRating value={Math.round(avgRating)} readonly size="sm" />
                )}
              </div>

              {/* Write review (only for student role) */}
              {currentUser?.role === "user" && (
                <div className="mb-8 rounded-2xl border bg-card p-6">
                  <h3 className="text-sm font-semibold text-card-foreground mb-4">
                    {reviews.find((r) => r.userId === currentUser.id) ? "Update Your Review" : "Write a Review"}
                  </h3>
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Your rating</p>
                      <StarRating value={myRating} onChange={setMyRating} />
                    </div>
                    <div>
                      <Textarea
                        value={myComment}
                        onChange={(e) => setMyComment(e.target.value)}
                        placeholder="Share your experience with this property..."
                        className="rounded-xl resize-none"
                        rows={3}
                      />
                    </div>
                    {reviewError && (
                      <p className="text-sm text-destructive">{reviewError}</p>
                    )}
                    {reviewSuccess && (
                      <p className="text-sm font-medium text-chart-3 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Review submitted!
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="rounded-xl shadow-sm shadow-primary/20"
                      disabled={submittingReview}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </Button>
                  </form>
                </div>
              )}

              {/* Reviews list */}
              {reviewsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-2xl border bg-secondary/30 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                    <Star className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium text-card-foreground">No reviews yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Be the first to leave a review!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl border bg-card p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 font-heading text-sm font-bold text-primary">
                          {review.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="font-semibold text-card-foreground text-sm">{review.userName}</p>
                              <StarRating value={review.rating} readonly size="sm" />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(review.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="sticky top-24 space-y-4">
              {owner && (
                <div className="rounded-2xl border bg-card p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{isPG ? "PG Owner" : "Landlord"}</h3>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-sm">{owner.name.charAt(0)}</div>
                    <div>
                      <p className="font-semibold text-card-foreground">{owner.name}</p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3 w-3" />{owner.phone}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-chart-4 text-chart-4" /><Star className="h-3.5 w-3.5 fill-chart-4 text-chart-4" /><Star className="h-3.5 w-3.5 fill-chart-4 text-chart-4" /><Star className="h-3.5 w-3.5 fill-chart-4 text-chart-4" /><Star className="h-3.5 w-3.5 fill-chart-4 text-chart-4" /><span className="ml-1 text-xs text-muted-foreground">Verified</span></div>
                </div>
              )}

              <div className="rounded-2xl border bg-card p-5 space-y-3">
                <Button className={`w-full rounded-xl h-11 ${isInterested ? "shadow-none" : "shadow-lg shadow-primary/20"}`} variant={isInterested ? "outline" : "default"} onClick={handleInterest}>
                  <Heart className={`mr-2 h-4 w-4 ${isInterested ? "fill-primary text-primary" : ""}`} />
                  {isInterested ? "Interested" : "Show Interest"}
                </Button>
                <Button variant="outline" className="w-full rounded-xl h-11" onClick={handleChat}>
                  <MessageSquare className="mr-2 h-4 w-4" />Chat with Owner
                </Button>
                <Button variant="outline" className="w-full rounded-xl h-11" onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" />Share
                </Button>
                <Button variant="outline" className="w-full rounded-xl h-11" onClick={() => setShowPaymentModal(true)}>
                  <CreditCard className="mr-2 h-4 w-4" />Proceed to Booking
                </Button>
                <p className="text-center text-xs text-muted-foreground">{property.interestedUsers.length} students interested</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><CreditCard className="h-8 w-8 text-primary" /></div>
              <h3 className="font-heading text-xl font-bold text-card-foreground">Coming Soon</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">Payment system will be integrated in a future version. Contact the owner directly to finalize.</p>
              <Button className="mt-6 rounded-xl" onClick={() => setShowPaymentModal(false)}>Got it</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, isPositive }: { label: string; value: string; isPositive?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-3.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {isPositive !== undefined && (isPositive ? <CheckCircle2 className="h-3.5 w-3.5 text-chart-3" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />)}
        {value}
      </span>
    </div>
  )
}

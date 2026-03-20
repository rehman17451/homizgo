"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { PropertyCard } from "@/components/property-card"
import { getProperties, type Property } from "@/lib/store"
import {
  Building2,
  Search,
  Shield,
  Users,
  Heart,
  ArrowRight,
  GraduationCap,
  Handshake,
  Star,
  Sparkles,
  MapPin,
  MessageSquare,
  CheckCircle2,
  Quote,
  ChevronRight,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function AnimatedCounter({ target, label }: { target: string; label: string }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="text-center">
      <div className={`font-heading text-4xl font-bold text-primary transition-all duration-700 ${visible ? "animate-counter-up" : "opacity-0 translate-y-4"}`}>
        {target}
      </div>
      <div className="mt-1.5 text-sm font-medium text-muted-foreground">{label}</div>
    </div>
  )
}

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [search, setSearch] = useState("")
  const pageRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const listingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    getProperties()
      .then((rows) => {
        if (active) setProperties(rows)
      })
      .catch(() => {
        if (active) setProperties([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let cleanup = () => {}

    ;(async () => {
      const gsapModule = await import("gsap")
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")
      const gsap = gsapModule.default || gsapModule.gsap
      gsap.registerPlugin(ScrollTrigger)

      if (!pageRef.current) return

      const ctx = gsap.context(() => {
        const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } })
        heroTl
          .fromTo(".hero-badge", { opacity: 0, y: 30, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.4)" })
          .fromTo(".hero-title", { opacity: 0, y: 48 }, { opacity: 1, y: 0, duration: 0.9 }, "-=0.45")
          .fromTo(".hero-subtitle", { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.75 }, "-=0.55")
          .fromTo(".hero-cta", { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.65 }, "-=0.45")
          .fromTo(".hero-search", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.4")

        gsap.to(".hero-glow-primary", {
          yPercent: -18,
          scale: 1.08,
          ease: "none",
          scrollTrigger: { trigger: ".hero-section", start: "top top", end: "bottom top", scrub: 1.1 },
        })

        gsap.to(".hero-glow-accent", {
          yPercent: -12,
          xPercent: 8,
          ease: "none",
          scrollTrigger: { trigger: ".hero-section", start: "top top", end: "bottom top", scrub: 1.2 },
        })

        gsap.fromTo(".feature-card", { opacity: 0, y: 44, scale: 0.96 }, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.62,
          stagger: 0.1,
          scrollTrigger: { trigger: featuresRef.current, start: "top 82%" },
        })

        gsap.fromTo(".step-item", { opacity: 0, x: -28 }, {
          opacity: 1,
          x: 0,
          duration: 0.58,
          stagger: 0.14,
          scrollTrigger: { trigger: ".steps-section", start: "top 80%" },
        })

        gsap.fromTo(".testimonial-card", { opacity: 0, y: 36, rotateX: 5 }, {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.58,
          stagger: 0.1,
          scrollTrigger: { trigger: ".testimonials-section", start: "top 82%" },
        })

        const hasListings = document.querySelector(".listing-card")
        if (listingsRef.current && hasListings) {
          gsap.fromTo(".listing-card", { opacity: 0, y: 32, scale: 0.97 }, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.52,
            stagger: 0.07,
            scrollTrigger: { trigger: listingsRef.current, start: "top 86%" },
          })
        }

        gsap.fromTo(".cta-banner", { opacity: 0, y: 46, scale: 0.98 }, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.75,
          scrollTrigger: { trigger: ".cta-section", start: "top 86%" },
        })

        gsap.fromTo(".footer-col", { opacity: 0, y: 18 }, {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.12,
          scrollTrigger: { trigger: ".footer-section", start: "top 92%" },
        })
      }, pageRef)

      cleanup = () => {
        ctx.revert()
      }
    })()

    return () => cleanup()
  }, [properties.length])

  const filtered = properties.filter(
    (p) =>
      p.available &&
      (p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase()))
  )
  const landlordListings = filtered.filter((p) => p.ownerRole === "landlord")
  const pgListings = filtered.filter((p) => p.ownerRole === "pgowner")

  const features = [
    { icon: GraduationCap, title: "Student-First", desc: "Exclusively designed for college students. Housing that fits your budget and campus life.", color: "bg-primary/10 text-primary group-hover:bg-primary" },
    { icon: Shield, title: "Verified & Safe", desc: "Every listing is verified. Background checks on all landlords and PG owners.", color: "bg-accent/10 text-accent group-hover:bg-accent" },
    { icon: Handshake, title: "Direct Connect", desc: "Chat with owners instantly. No middlemen, no brokerage, no hidden charges.", color: "bg-chart-3/10 text-chart-3 group-hover:bg-chart-3" },
    { icon: Heart, title: "Zero Commission", desc: "We are a student non-profit. Completely free to use. Forever.", color: "bg-chart-4/10 text-chart-4 group-hover:bg-chart-4" },
  ]

  const steps = [
    { num: "01", title: "Create Account", desc: "Sign up in 30 seconds. Choose your role: Student, Landlord, or PG Owner.", icon: Sparkles },
    { num: "02", title: "Browse or List", desc: "Students filter and browse. Owners list properties with all details.", icon: Search },
    { num: "03", title: "Connect & Chat", desc: "Show interest and chat directly with property owners in real-time.", icon: MessageSquare },
    { num: "04", title: "Move In", desc: "Finalize your booking, pay securely, and start your new chapter.", icon: CheckCircle2 },
  ]

  const testimonials = [
    { name: "Arjun M.", college: "IIT Bangalore", text: "Found my apartment in 2 days. The direct chat feature saved me from brokers.", rating: 5 },
    { name: "Sneha R.", college: "Christ University", text: "As a girl student, safety was my priority. Homigo's verified listings gave me confidence.", rating: 5 },
    { name: "Vikram S.", college: "RVCE", text: "Listed my PG and got 15 inquiries in the first week. Amazing platform for owners.", rating: 5 },
  ]

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden">
      <Navbar />

      {/* Hero */}
      <section className="hero-section relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="hero-glow-primary absolute top-20 right-[10%] h-72 w-72 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="hero-glow-accent absolute top-40 left-[5%] h-48 w-48 rounded-full bg-accent/5 blur-3xl animate-float-delayed" />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 lg:px-8 lg:pt-24 lg:pb-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="hero-badge mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary">
              <Zap className="h-4 w-4" />
              Trusted by 500+ students across 12 cities
            </div>

            <h1 className="hero-title font-heading text-4xl font-bold leading-[1.1] tracking-tight text-foreground md:text-6xl lg:text-7xl text-balance">
              Find Your Perfect
              <span className="relative mx-3 inline-block text-primary">
                Home
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path d="M2 8c40-6 80-6 120-2s60 4 76 0" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" className="opacity-40" />
                </svg>
              </span>
              Away From Home
            </h1>

            <p className="hero-subtitle mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl text-pretty">
              Homigo connects college students with verified landlords and PG owners.
              Safe, affordable, and hassle-free housing -- built by students, for students.
            </p>

            <div className="hero-cta mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="lg" className="h-12 rounded-xl px-8 text-base shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Get Started Free
                </Button>
              </Link>
              <Link href="#listings">
                <Button size="lg" variant="outline" className="h-12 rounded-xl px-8 text-base">
                  <Search className="mr-2 h-5 w-5" />
                  Browse Listings
                </Button>
              </Link>
            </div>

            {/* Hero search bar */}
            <div className="hero-search mx-auto mt-12 max-w-2xl">
              <div className="flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-lg shadow-foreground/5">
                <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary/50 px-4 py-3">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by location, property name..."
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Link href="#listings">
                  <Button className="h-11 rounded-xl px-6">
                    Search
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Animated counters */}
        <div className="border-y bg-card/60 backdrop-blur-sm">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 lg:grid-cols-4 lg:px-8">
            <AnimatedCounter target="120+" label="Active Listings" />
            <AnimatedCounter target="500+" label="Happy Students" />
            <AnimatedCounter target="80+" label="Verified Owners" />
            <AnimatedCounter target="12" label="Cities Covered" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={featuresRef} className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Star className="h-4 w-4" />
              Why Homigo
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold text-foreground md:text-4xl lg:text-5xl text-balance">
              Everything Students Need
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              We built Homigo to solve every pain point of student housing search.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="feature-card group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className={`relative flex h-12 w-12 items-center justify-center rounded-xl ${f.color} transition-colors group-hover:text-primary-foreground`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="relative mt-5 font-heading text-lg font-semibold text-card-foreground">
                  {f.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="steps-section border-y bg-secondary/30 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
              <Zap className="h-4 w-4" />
              How It Works
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold text-foreground md:text-4xl text-balance">
              Your New Home in 4 Simple Steps
            </h2>
          </div>
          <div className="mx-auto mt-14 max-w-3xl space-y-0">
            {steps.map((step, i) => (
              <div key={step.num} className="step-item group relative flex gap-6">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="absolute left-6 top-14 h-[calc(100%_-_20px)] w-px bg-border" />
                )}
                <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-heading text-sm font-bold shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                  {step.num}
                </div>
                <div className="flex-1 pb-10">
                  <div className="flex items-center gap-3">
                    <h3 className="font-heading text-xl font-semibold text-foreground">{step.title}</h3>
                    <step.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-chart-4/10 px-4 py-1.5 text-sm font-medium text-chart-4">
              <Heart className="h-4 w-4" />
              Testimonials
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold text-foreground md:text-4xl text-balance">
              Loved by Students Across India
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="testimonial-card relative rounded-2xl border bg-card p-6 transition-all hover:shadow-lg"
              >
                <Quote className="absolute right-5 top-5 h-8 w-8 text-primary/10" />
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-chart-4 text-chart-4" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {'"'}{t.text}{'"'}
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.college}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Listings */}
      <section ref={listingsRef} id="listings" className="border-t bg-secondary/20 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <Building2 className="h-4 w-4" />
                Featured
              </span>
              <h2 className="mt-3 font-heading text-3xl font-bold text-foreground md:text-4xl">
                Browse Listings
              </h2>
              <p className="mt-1 text-muted-foreground">{filtered.length} properties available</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or location..."
                className="rounded-xl pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {landlordListings.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground">Landlord Rentals</h3>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {landlordListings.map((p) => (
                  <div key={p.id} className="listing-card"><PropertyCard property={p} /></div>
                ))}
              </div>
            </div>
          )}

          {pgListings.length > 0 && (
            <div className="mt-14">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <Users className="h-4 w-4 text-accent" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground">PG Accommodations</h3>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pgListings.map((p) => (
                  <div key={p.id} className="listing-card"><PropertyCard property={p} /></div>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="mt-20 text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-lg text-muted-foreground">No properties found matching your search.</p>
            </div>
          )}

          <div className="mt-14 text-center">
            <Link href="/register">
              <Button variant="outline" size="lg" className="rounded-xl">
                Sign up to see all listings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-section py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="cta-banner relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground shadow-2xl shadow-primary/20 md:px-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-primary-foreground/5 blur-2xl" />
            <div className="relative">
              <h2 className="font-heading text-3xl font-bold md:text-4xl text-balance">
                Ready to Find Your Perfect Stay?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80 text-pretty">
                Join 500+ students who found their home through Homigo. It takes less than a minute.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/register">
                  <Button size="lg" variant="secondary" className="rounded-xl bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Create Free Account
                  </Button>
                </Link>
                <Link href="#listings">
                  <Button size="lg" variant="ghost" className="rounded-xl text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground border border-primary-foreground/20">
                    Explore Listings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section border-t bg-card py-14">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-10 md:grid-cols-3">
            <div className="footer-col">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="font-heading text-xl font-bold">Homigo</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                A non-profit student initiative making housing search simple, safe, and free for every college student.
              </p>
            </div>
            <div className="footer-col">
              <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">Quick Links</h4>
              <div className="mt-4 flex flex-col gap-2.5">
                <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Home</Link>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">Login</Link>
                <Link href="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">Register</Link>
              </div>
            </div>
            <div className="footer-col">
              <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">For Owners</h4>
              <div className="mt-4 flex flex-col gap-2.5">
                <Link href="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">List Property</Link>
                <Link href="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">List PG</Link>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-8 sm:flex-row">
            <p className="text-xs text-muted-foreground">Made with care for students, by students.</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              India
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

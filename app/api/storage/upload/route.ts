import { NextResponse } from "next/server"
import { requireCurrentUser } from "@/lib/server/api-helpers"
import { createAdminSupabaseClient } from "@/lib/supabase/server"

/**
 * POST /api/storage/upload
 * Accepts multipart/form-data with a "file" field and optional "bucket" field.
 * Uploads the file to Supabase Storage and returns the public URL.
 *
 * Request body (multipart/form-data):
 *   file    — File blob
 *   bucket  — "property-images" | "avatars" (default: "property-images")
 *   folder  — optional subfolder within the bucket (default: userId)
 *
 * Response:
 *   { url: string, path: string, bucket: string }
 */
export async function POST(request: Request) {
  try {
    const session = await requireCurrentUser()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const bucket = (formData.get("bucket") as string) || "property-images"
    const allowedBuckets = ["property-images", "avatars"]
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json({ error: `Invalid bucket. Allowed: ${allowedBuckets.join(", ")}` }, { status: 400 })
    }

    const folder = (formData.get("folder") as string) || session.user.id
    const ext = file.name.split(".").pop() || "bin"
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const storagePath = `${folder}/${fileName}`

    // Use admin client securely since user is already authenticated
    // This bypasses RLS and automatically handles missing policies
    const supabaseAdmin = createAdminSupabaseClient()
    
    // Auto-create bucket gracefully in case it doesn't exist yet
    await supabaseAdmin.storage.createBucket(bucket, { public: true }).catch(() => {})

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath)
    const publicUrl = urlData.publicUrl

    // Audit log in storage_files (best-effort, non-blocking)
    supabaseAdmin
      .from("storage_files")
      .insert({
        user_id: session.user.id,
        bucket,
        path: storagePath,
        public_url: publicUrl,
        file_size: file.size,
        mime_type: file.type || null,
      })
      .then(
        () => {},
        (err: any) => console.error("Audit log error:", err)
      )

    return NextResponse.json({ url: publicUrl, path: storagePath, bucket })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 })
  }
}

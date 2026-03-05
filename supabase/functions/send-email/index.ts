import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const FROM = "Balance <hello@balanceapp.com>"

serve(async (req) => {
  const { type, to, data } = await req.json()

  let subject = ""
  let html = ""

  if (type === "event_registered") {
    subject = `You're registered for ${data.eventTitle} 🎉`
    html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:28px;font-weight:900;color:#0f172a;margin-bottom:8px">You're in! 🎉</h1>
        <p style="color:#64748b;font-size:16px;margin-bottom:24px">
          You've successfully registered for <strong style="color:#0f172a">${data.eventTitle}</strong>.
        </p>
        <div style="background:#f8fafc;border-radius:16px;padding:20px;margin-bottom:24px;border:1px solid #e2e8f0">
          <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Event details</p>
          <p style="margin:0 0 4px;font-weight:700;color:#0f172a;font-size:16px">${data.eventTitle}</p>
          <p style="margin:0 0 4px;color:#64748b;font-size:14px">📅 ${data.eventDate}</p>
          <p style="margin:0;color:#64748b;font-size:14px">📍 ${data.eventLocation}</p>
        </div>
        <a href="${data.eventUrl}" style="display:inline-block;background:#0f172a;color:white;padding:14px 28px;border-radius:100px;font-weight:700;font-size:14px;text-decoration:none">
          View event →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px">balance · Edinburgh, Scotland</p>
      </div>
    `
  }

  if (type === "friend_request") {
    subject = `${data.senderName} wants to be friends on Balance`
    html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:28px;font-weight:900;color:#0f172a;margin-bottom:8px">Friend request 👋</h1>
        <p style="color:#64748b;font-size:16px;margin-bottom:24px">
          <strong style="color:#0f172a">${data.senderName}</strong> wants to connect with you on Balance.
        </p>
        <a href="${data.profileUrl}" style="display:inline-block;background:#0f172a;color:white;padding:14px 28px;border-radius:100px;font-weight:700;font-size:14px;text-decoration:none;margin-right:12px">
          View profile →
        </a>
        <a href="${data.notificationsUrl}" style="display:inline-block;background:#f1f5f9;color:#0f172a;padding:14px 28px;border-radius:100px;font-weight:700;font-size:14px;text-decoration:none">
          Respond
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px">balance · Edinburgh, Scotland</p>
      </div>
    `
  }

  if (type === "friend_accepted") {
    subject = `${data.acceptorName} accepted your friend request 🤝`
    html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:28px;font-weight:900;color:#0f172a;margin-bottom:8px">New connection! 🤝</h1>
        <p style="color:#64748b;font-size:16px;margin-bottom:24px">
          <strong style="color:#0f172a">${data.acceptorName}</strong> accepted your friend request. You're now connected on Balance.
        </p>
        <a href="${data.profileUrl}" style="display:inline-block;background:#0f172a;color:white;padding:14px 28px;border-radius:100px;font-weight:700;font-size:14px;text-decoration:none">
          View their profile →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px">balance · Edinburgh, Scotland</p>
      </div>
    `
  }

  if (!subject) return new Response("Unknown email type", { status: 400 })

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })

  const result = await res.json()
  return new Response(JSON.stringify(result), { status: res.ok ? 200 : 500 })
})
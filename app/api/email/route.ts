import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, title, location, date, time } = body

    // Format the date nicely
    const formattedDate = new Date(date).toLocaleDateString('en-GB', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Keep this exactly as is for Sandbox
      to: email, 
      subject: `You're in: ${title} 🏆`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto; overflow: hidden;">
                  
                  <tr>
                    <td style="padding: 48px 40px 32px 40px; text-align: center;">
                      <img src="https://balance-app.com/images/logo.png" alt="Balance Logo" width="48" height="48" style="display: block; margin: 0 auto 24px auto; border-radius: 12px;" />
                      
                      <h1 style="margin: 0; color: #0f172a; font-size: 36px; font-weight: 900; letter-spacing: -1px;">You're in.</h1>
                      <p style="margin: 16px 0 0 0; color: #64748b; font-size: 18px; line-height: 1.5;">
                        You've officially secured your spot for <br/>
                        <strong style="color: #0f172a;">${title}</strong>.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 16px;">
                        <tr>
                          <td style="padding: 24px;">
                            
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td width="32" valign="top" style="font-size: 20px; padding-bottom: 20px;">📍</td>
                                <td valign="top" style="padding-bottom: 20px;">
                                  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #0d9488; font-weight: 800; margin-bottom: 4px;">Location</div>
                                  <div style="font-size: 16px; color: #0f172a; font-weight: 600;">${location}</div>
                                </td>
                              </tr>
                              <tr>
                                <td width="32" valign="top" style="font-size: 20px;">🗓️</td>
                                <td valign="top">
                                  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #0d9488; font-weight: 800; margin-bottom: 4px;">Date & Time</div>
                                  <div style="font-size: 16px; color: #0f172a; font-weight: 600;">${formattedDate} at ${time}</div>
                                </td>
                              </tr>
                            </table>

                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 0 40px 48px 40px; text-align: center;">
                      <p style="margin: 0 0 32px 0; color: #64748b; font-size: 16px; line-height: 1.6;">
                        Get ready to sweat, connect with your crew, and earn those leaderboard points.
                      </p>
                      <a href="http://localhost:3000/dashboard" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 36px; border-radius: 50px;">View My Schedule</a>
                    </td>
                  </tr>
                  
                </table>

                <table width="100%" max-width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto;">
                  <tr>
                    <td style="padding: 32px 20px; text-align: center; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                      <p style="margin: 0 0 8px 0;">© ${new Date().getFullYear()} Balance. All rights reserved.</p>
                      <p style="margin: 0;">You received this email because you registered for an event on the Balance platform.</p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>

        </body>
        </html>
      `
    })

    if (error) {
      console.error("Resend Error:", error)
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error("API Route Error:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}

import { Resend } from "resend";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
const resendKey = process.env.RESEND_API_KEY;

interface BookingNotification {
  customer_name: string;
  contact_type: string;
  contact_value: string;
  date: string;
  start_hour: number;
  duration_hours: number;
  num_people: number;
}

export async function notifyNewBooking(booking: BookingNotification) {
  if (!resendKey || !ADMIN_EMAIL) return;

  try {
    const resend = new Resend(resendKey);

    await resend.emails.send({
      from: "PINSLAND 预约通知 <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      subject: `新预约 — ${booking.customer_name} · ${booking.num_people}人`,
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #D32F2F; margin-bottom: 16px;">新预约通知</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">姓名</td>
              <td style="padding: 8px 0; font-weight: bold;">${booking.customer_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">${booking.contact_type === "whatsapp" ? "WhatsApp" : "微信"}</td>
              <td style="padding: 8px 0; font-weight: bold;">${booking.contact_value}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">日期</td>
              <td style="padding: 8px 0; font-weight: bold;">${booking.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">时间</td>
              <td style="padding: 8px 0; font-weight: bold;">${String(booking.start_hour).padStart(2, "0")}:00 - ${String(booking.start_hour + booking.duration_hours).padStart(2, "0")}:00</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">人数</td>
              <td style="padding: 8px 0; font-weight: bold;">${booking.num_people} 人</td>
            </tr>
          </table>
          <p style="margin-top: 16px; color: #999; font-size: 12px;">请登录后台确认或拒绝此预约</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send notification email:", error);
  }
}

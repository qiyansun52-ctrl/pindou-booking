export type BookingStatus = "pending" | "confirmed" | "rejected" | "cancelled";
export type ContactType = "wechat" | "whatsapp";

export interface AvailableSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface Booking {
  id: string;
  slot_id: string;
  customer_name: string;
  contact_type: ContactType;
  contact_value: string;
  start_time: string;
  duration_hours: number;
  num_people: number;
  actual_amount: number | null;
  status: BookingStatus;
  created_at: string;
  available_slots?: AvailableSlot;
}

export interface CreateBookingInput {
  date: string;
  start_hour: number;
  duration_hours: number;
  num_people: number;
  customer_name: string;
  contact_type: ContactType;
  contact_value: string;
}

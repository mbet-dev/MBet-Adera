export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string
          created_at: string
          sender_id: string
          receiver_id: string
          content: string
          read: boolean
          parcel_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          sender_id: string
          receiver_id: string
          content: string
          read?: boolean
          parcel_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          read?: boolean
          parcel_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 
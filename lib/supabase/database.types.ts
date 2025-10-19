export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          is_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          username: string
          is_admin?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          is_admin?: boolean
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: number
          user_id: string | null
          items: Json
          total: number
          status: string
          customer_info: Json | null
          created_at: string
          delivery_coordinates: Json | null
        }
        Insert: {
          id?: number
          user_id: string | null
          items: Json
          total: number
          status?: string
          customer_info?: Json | null
          created_at?: string
          delivery_coordinates?: Json | null
        }
        Update: {
          id?: number
          user_id?: string | null
          items?: Json
          total?: number
          status?: string
          customer_info?: Json | null
          created_at?: string
          delivery_coordinates?: Json | null
        }
      }
      menu_items: {
        Row: {
          id: number
          title: string
          description: string | null
          price: number
          category: string
          image_url: string | null
          available: boolean
          created_at: string
        }
        Insert: {
          id?: number
          title: string
          description?: string | null
          price: number
          category: string
          image_url?: string | null
          available?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          title?: string
          description?: string | null
          price?: number
          category?: string
          image_url?: string | null
          available?: boolean
          created_at?: string
        }
      }
      delivery_drivers: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          email: string
          is_active: boolean
          current_location: Json | null
          last_updated: string
          current_order_id: number | null
          rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone: string
          email: string
          is_active?: boolean
          current_location?: Json | null
          last_updated?: string
          current_order_id?: number | null
          rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string
          email?: string
          is_active?: boolean
          current_location?: Json | null
          last_updated?: string
          current_order_id?: number | null
          rating?: number | null
          created_at?: string
        }
      }
      delivery_assignments: {
        Row: {
          id: string
          order_id: number
          driver_id: string
          status: string
          assigned_at: string
          accepted_at: string | null
          completed_at: string | null
          start_location: Json
          delivery_location: Json
          estimated_distance: number | null
          estimated_duration: number | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: number
          driver_id: string
          status?: string
          assigned_at?: string
          accepted_at?: string | null
          completed_at?: string | null
          start_location: Json
          delivery_location: Json
          estimated_distance?: number | null
          estimated_duration?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: number
          driver_id?: string
          status?: string
          assigned_at?: string
          accepted_at?: string | null
          completed_at?: string | null
          start_location?: Json
          delivery_location?: Json
          estimated_distance?: number | null
          estimated_duration?: number | null
          created_at?: string
        }
      }
      order_status_updates: {
        Row: {
          id: string
          order_id: number
          status: string
          timestamp: string
          note: string | null
          driver_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: number
          status: string
          timestamp?: string
          note?: string | null
          driver_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: number
          status?: string
          timestamp?: string
          note?: string | null
          driver_id?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          read: boolean
          timestamp: string
          data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          read?: boolean
          timestamp?: string
          data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          read?: boolean
          timestamp?: string
          data?: Json | null
          created_at?: string
        }
      }
    }
  }
}

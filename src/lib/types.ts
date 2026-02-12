export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ToolStatus = "draft" | "pending" | "published" | "rejected";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type FreeType = "free_forever" | "freemium" | "trial" | "open_source" | "student_plan";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          role: "user" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: "user" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: "user" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tools: {
        Row: {
          id: string;
          slug: string;
          name: string;
          url: string;
          logo_url: string | null;
          category: string;
          short_description: string;
          how_it_works: string;
          free_type: FreeType;
          free_details: string;
          pricing_notes: string | null;
          tags: string[];
          created_by: string | null;
          status: ToolStatus;
          moderation_notes: string | null;
          is_verified: boolean;
          avg_rating: number;
          review_count: number;
          click_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          url: string;
          logo_url?: string | null;
          category: string;
          short_description: string;
          how_it_works: string;
          free_type: FreeType;
          free_details: string;
          pricing_notes?: string | null;
          tags?: string[];
          created_by?: string | null;
          status?: ToolStatus;
          moderation_notes?: string | null;
          is_verified?: boolean;
          avg_rating?: number;
          review_count?: number;
          click_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          url?: string;
          logo_url?: string | null;
          category?: string;
          short_description?: string;
          how_it_works?: string;
          free_type?: FreeType;
          free_details?: string;
          pricing_notes?: string | null;
          tags?: string[];
          created_by?: string | null;
          status?: ToolStatus;
          moderation_notes?: string | null;
          is_verified?: boolean;
          avg_rating?: number;
          review_count?: number;
          click_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tool_reviews: {
        Row: {
          id: string;
          tool_id: string;
          user_id: string;
          rating: number;
          review_text: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tool_id: string;
          user_id: string;
          rating: number;
          review_text?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tool_id?: string;
          user_id?: string;
          rating?: number;
          review_text?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tool_bookmarks: {
        Row: {
          id: string;
          tool_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tool_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tool_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tool_submissions: {
        Row: {
          id: string;
          submitted_by: string;
          name: string;
          url: string;
          category: string;
          short_description: string;
          how_it_works: string;
          free_type: FreeType;
          free_details: string;
          tags: string[];
          status: SubmissionStatus;
          moderation_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          submitted_by: string;
          name: string;
          url: string;
          category: string;
          short_description: string;
          how_it_works: string;
          free_type: FreeType;
          free_details: string;
          tags?: string[];
          status?: SubmissionStatus;
          moderation_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          submitted_by?: string;
          name?: string;
          url?: string;
          category?: string;
          short_description?: string;
          how_it_works?: string;
          free_type?: FreeType;
          free_details?: string;
          tags?: string[];
          status?: SubmissionStatus;
          moderation_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_resources: {
        Row: {
          id: string;
          name: string;
          url: string;
          category: string;
          short_description: string;
          free_details: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          url: string;
          category: string;
          short_description: string;
          free_details: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          category?: string;
          short_description?: string;
          free_details?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tool_updates: {
        Row: {
          id: string;
          tool_id: string;
          changed_by: string | null;
          field_name: string;
          old_value: string | null;
          new_value: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tool_id: string;
          changed_by?: string | null;
          field_name: string;
          old_value?: string | null;
          new_value?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tool_id?: string;
          changed_by?: string | null;
          field_name?: string;
          old_value?: string | null;
          new_value?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_submission: {
        Args: { submission_id: string; moderation_comment?: string };
        Returns: string;
      };
      reject_submission: {
        Args: { submission_id: string; moderation_comment?: string };
        Returns: void;
      };
      increment_tool_click: {
        Args: { target_tool_id: string };
        Returns: void;
      };
      set_admin_by_email: {
        Args: { target_email: string };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type ToolWithStats = Database["public"]["Tables"]["tools"]["Row"];

export type ReviewWithProfile = Database["public"]["Tables"]["tool_reviews"]["Row"] & {
  profiles: Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "avatar_url"> | null;
};

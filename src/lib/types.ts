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

// ============================================================
// Social community unions
// ============================================================

export type PostType =
  | "normal"
  | "project"
  | "achievement"
  | "course_completion"
  | "learning_update"
  | "project_update";

export type ProjectStatus = "planning" | "building" | "completed" | "maintaining" | "archived";
export type ProjectReviewStatus = "draft" | "pending" | "approved" | "rejected";
export type FeedbackType = "bug" | "suggestion" | "question" | "improvement";
export type FeedbackStatus = "open" | "in_progress" | "fixed" | "closed";
export type ConversationType = "direct" | "group" | "project";
export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "feedback"
  | "feedback_status"
  | "message"
  | "group_invite";

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
          username: string | null;
          branch: string | null;
          year: string | null;
          college: string | null;
          skills: string[];
          tools_used: string[];
          interests: string[];
          currently_building: string | null;
          looking_for: string | null;
          link_github: string | null;
          link_linkedin: string | null;
          link_instagram: string | null;
          link_portfolio: string | null;
          link_youtube: string | null;
          link_x: string | null;
          link_other: string | null;
          show_links: boolean;
          portfolio_enabled: boolean;
          portfolio_type: "html" | "zip" | "external" | null;
          portfolio_html: string | null;
          portfolio_storage_path: string | null;
          portfolio_external_url: string | null;
          portfolio_updated_at: string | null;
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
          username?: string | null;
          branch?: string | null;
          year?: string | null;
          college?: string | null;
          skills?: string[];
          tools_used?: string[];
          interests?: string[];
          currently_building?: string | null;
          looking_for?: string | null;
          link_github?: string | null;
          link_linkedin?: string | null;
          link_instagram?: string | null;
          link_portfolio?: string | null;
          link_youtube?: string | null;
          link_x?: string | null;
          link_other?: string | null;
          show_links?: boolean;
          portfolio_enabled?: boolean;
          portfolio_type?: "html" | "zip" | "external" | null;
          portfolio_html?: string | null;
          portfolio_storage_path?: string | null;
          portfolio_external_url?: string | null;
          portfolio_updated_at?: string | null;
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
          username?: string | null;
          branch?: string | null;
          year?: string | null;
          college?: string | null;
          skills?: string[];
          tools_used?: string[];
          interests?: string[];
          currently_building?: string | null;
          looking_for?: string | null;
          link_github?: string | null;
          link_linkedin?: string | null;
          link_instagram?: string | null;
          link_portfolio?: string | null;
          link_youtube?: string | null;
          link_x?: string | null;
          link_other?: string | null;
          show_links?: boolean;
          portfolio_enabled?: boolean;
          portfolio_type?: "html" | "zip" | "external" | null;
          portfolio_html?: string | null;
          portfolio_storage_path?: string | null;
          portfolio_external_url?: string | null;
          portfolio_updated_at?: string | null;
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
      tool_guides: {
        Row: {
          id: string;
          tool_id: string;
          summary: string;
          free_access_notes: string | null;
          requires_login: boolean;
          requires_api_key: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tool_id: string;
          summary: string;
          free_access_notes?: string | null;
          requires_login?: boolean;
          requires_api_key?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tool_id?: string;
          summary?: string;
          free_access_notes?: string | null;
          requires_login?: boolean;
          requires_api_key?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tool_guide_steps: {
        Row: {
          id: string;
          guide_id: string;
          step_order: number;
          title: string;
          description: string;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          guide_id: string;
          step_order: number;
          title: string;
          description: string;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          guide_id?: string;
          step_order?: number;
          title?: string;
          description?: string;
          image_url?: string | null;
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
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          post_type: PostType;
          title: string | null;
          content: string;
          image_url: string | null;
          tags: string[];
          project_id: string | null;
          visibility: "public" | "followers";
          like_count: number;
          comment_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          post_type?: PostType;
          title?: string | null;
          content: string;
          image_url?: string | null;
          tags?: string[];
          project_id?: string | null;
          visibility?: "public" | "followers";
          like_count?: number;
          comment_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          post_type?: PostType;
          title?: string | null;
          content?: string;
          image_url?: string | null;
          tags?: string[];
          project_id?: string | null;
          visibility?: "public" | "followers";
          like_count?: number;
          comment_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      post_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          category: string | null;
          status: ProjectStatus;
          review_status: ProjectReviewStatus;
          cover_url: string | null;
          screenshots: string[];
          demo_url: string | null;
          github_url: string | null;
          other_url: string | null;
          technologies: string[];
          tools_used: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          category?: string | null;
          status?: ProjectStatus;
          review_status?: ProjectReviewStatus;
          cover_url?: string | null;
          screenshots?: string[];
          demo_url?: string | null;
          github_url?: string | null;
          other_url?: string | null;
          technologies?: string[];
          tools_used?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          status?: ProjectStatus;
          review_status?: ProjectReviewStatus;
          cover_url?: string | null;
          screenshots?: string[];
          demo_url?: string | null;
          github_url?: string | null;
          other_url?: string | null;
          technologies?: string[];
          tools_used?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: "owner" | "contributor";
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: "owner" | "contributor";
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: "owner" | "contributor";
          created_at?: string;
        };
        Relationships: [];
      };
      project_feedback: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          feedback_type: FeedbackType;
          content: string;
          status: FeedbackStatus;
          owner_response: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          feedback_type?: FeedbackType;
          content: string;
          status?: FeedbackStatus;
          owner_response?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          feedback_type?: FeedbackType;
          content?: string;
          status?: FeedbackStatus;
          owner_response?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          type: ConversationType;
          title: string | null;
          created_by: string | null;
          project_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type?: ConversationType;
          title?: string | null;
          created_by?: string | null;
          project_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: ConversationType;
          title?: string | null;
          created_by?: string | null;
          project_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversation_members: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
          last_read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role?: "owner" | "member";
          joined_at?: string;
          last_read_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: "owner" | "member";
          joined_at?: string;
          last_read_at?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: NotificationType;
          entity_id: string | null;
          body: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: NotificationType;
          entity_id?: string | null;
          body?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string | null;
          type?: NotificationType;
          entity_id?: string | null;
          body?: string | null;
          is_read?: boolean;
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
      follow_user: {
        Args: { target_profile_id: string };
        Returns: void;
      };
      unfollow_user: {
        Args: { target_profile_id: string };
        Returns: void;
      };
      is_following: {
        Args: { target_profile_id: string };
        Returns: boolean;
      };
      get_or_create_direct_conversation: {
        Args: { other_user: string };
        Returns: string;
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

export type SocialProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostLike = Database["public"]["Tables"]["post_likes"]["Row"];
export type PostComment = Database["public"]["Tables"]["post_comments"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectMember = Database["public"]["Tables"]["project_members"]["Row"];
export type ProjectFeedback = Database["public"]["Tables"]["project_feedback"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationMember = Database["public"]["Tables"]["conversation_members"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Follow = Database["public"]["Tables"]["follows"]["Row"];

// Joined shapes
export type PostWithAuthor = Post & {
  profiles: Pick<SocialProfile, "id" | "username" | "full_name" | "avatar_url"> | null;
  projects: Pick<Project, "id" | "title"> | null;
};

export type CommentWithAuthor = PostComment & {
  profiles: Pick<SocialProfile, "id" | "username" | "full_name" | "avatar_url"> | null;
};

export type ProjectWithOwner = Project & {
  profiles: Pick<SocialProfile, "id" | "username" | "full_name" | "avatar_url"> | null;
};

export type FeedbackWithAuthor = ProjectFeedback & {
  profiles: Pick<SocialProfile, "id" | "username" | "full_name" | "avatar_url"> | null;
};

export type MessageWithSender = Message & {
  profiles: Pick<SocialProfile, "id" | "username" | "full_name" | "avatar_url"> | null;
};

export type NotificationWithActor = Notification & {
  profiles: Pick<SocialProfile, "id" | "username" | "full_name" | "avatar_url"> | null;
};

export type ConversationListItem = Conversation & {
  conversation_members: {
    user_id: string;
    profiles: Pick<SocialProfile, "id" | "username" | "full_name" | "avatar_url"> | null;
  }[];
  messages: { content: string; created_at: string; sender_id: string } | null;
};

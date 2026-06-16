export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      reports: {
        Row: {
          id: string;
          project_id: string | null;
          run_number: number | null;
          title: string;
          subtitle: string;
          doc: Json;
          share_token: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          run_number?: number | null;
          title?: string;
          subtitle?: string;
          doc?: Json;
          share_token?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          run_number?: number | null;
          title?: string;
          subtitle?: string;
          doc?: Json;
          share_token?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      report_versions: {
        Row: {
          id: string;
          report_id: string;
          doc: Json;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          doc: Json;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          doc?: Json;
          label?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_versions_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
        ];
      };
      competitor_platforms: {
        Row: {
          competitor_id: string;
          platform: Database["public"]["Enums"]["platform"];
          sort_order: number;
        };
        Insert: {
          competitor_id: string;
          platform: Database["public"]["Enums"]["platform"];
          sort_order?: number;
        };
        Update: {
          competitor_id?: string;
          platform?: Database["public"]["Enums"]["platform"];
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "competitor_platforms_competitor_id_fkey";
            columns: ["competitor_id"];
            isOneToOne: false;
            referencedRelation: "competitors";
            referencedColumns: ["id"];
          },
        ];
      };
      competitors: {
        Row: {
          accent: string;
          brand_letter: string;
          created_at: string;
          engagement_total: string | null;
          handle: string;
          id: string;
          is_client: boolean;
          mentions: number;
          name: string;
          project_id: string;
          reach_estimate: string | null;
          sentiment: Database["public"]["Enums"]["sentiment_kind"];
          sort_order: number;
          sov: number;
          targets: string[];
        };
        Insert: {
          accent: string;
          brand_letter: string;
          created_at?: string;
          engagement_total?: string | null;
          handle: string;
          id?: string;
          is_client?: boolean;
          mentions?: number;
          name: string;
          project_id: string;
          reach_estimate?: string | null;
          sentiment?: Database["public"]["Enums"]["sentiment_kind"];
          sort_order?: number;
          sov?: number;
          targets?: string[];
        };
        Update: {
          accent?: string;
          brand_letter?: string;
          created_at?: string;
          engagement_total?: string | null;
          handle?: string;
          id?: string;
          is_client?: boolean;
          mentions?: number;
          name?: string;
          project_id?: string;
          reach_estimate?: string | null;
          sentiment?: Database["public"]["Enums"]["sentiment_kind"];
          sort_order?: number;
          sov?: number;
          targets?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "competitors_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      cost_ledger: {
        Row: {
          cost_usd: number;
          id: string;
          metadata: Json;
          occurred_at: string;
          operation: string;
          project_id: string | null;
          provider: string;
          reservation_id: string | null;
          run_id: string | null;
          unit_type: string | null;
          units: number;
          workspace_id: string | null;
        };
        Insert: {
          cost_usd?: number;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          operation: string;
          project_id?: string | null;
          provider: string;
          reservation_id?: string | null;
          run_id?: string | null;
          unit_type?: string | null;
          units?: number;
          workspace_id?: string | null;
        };
        Update: {
          cost_usd?: number;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          operation?: string;
          project_id?: string | null;
          provider?: string;
          reservation_id?: string | null;
          run_id?: string | null;
          unit_type?: string | null;
          units?: number;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      insights: {
        Row: {
          body: string | null;
          confidence: number;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["insight_kind"];
          project_id: string;
          run_id: string | null;
          sort_order: number;
          sources: number;
          title: string;
        };
        Insert: {
          body?: string | null;
          confidence?: number;
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["insight_kind"];
          project_id: string;
          run_id?: string | null;
          sort_order?: number;
          sources?: number;
          title: string;
        };
        Update: {
          body?: string | null;
          confidence?: number;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["insight_kind"];
          project_id?: string;
          run_id?: string | null;
          sort_order?: number;
          sources?: number;
          title?: string;
        };
        Relationships: [];
      };
      media_analysis: {
        Row: {
          brand_safety: string | null;
          cost_usd: number;
          created_at: string;
          id: string;
          kind: string;
          language: string | null;
          media_file_id: string;
          model: string | null;
          ocr_text: string | null;
          raw: Json | null;
          sentiment: string | null;
          shows: Json;
          summary: string | null;
          topics: Json;
          transcript: string | null;
        };
        Insert: {
          brand_safety?: string | null;
          cost_usd?: number;
          created_at?: string;
          id?: string;
          kind: string;
          language?: string | null;
          media_file_id: string;
          model?: string | null;
          ocr_text?: string | null;
          raw?: Json | null;
          sentiment?: string | null;
          shows?: Json;
          summary?: string | null;
          topics?: Json;
          transcript?: string | null;
        };
        Update: {
          brand_safety?: string | null;
          cost_usd?: number;
          created_at?: string;
          id?: string;
          kind?: string;
          language?: string | null;
          media_file_id?: string;
          model?: string | null;
          ocr_text?: string | null;
          raw?: Json | null;
          sentiment?: string | null;
          shows?: Json;
          summary?: string | null;
          topics?: Json;
          transcript?: string | null;
        };
        Relationships: [];
      };
      media_files: {
        Row: {
          bytes: number | null;
          created_at: string;
          duration_s: number | null;
          expires_at: string | null;
          height: number | null;
          id: string;
          kind: string;
          mention_id: string | null;
          project_id: string | null;
          run_id: string | null;
          status: string;
          storage_path: string | null;
          url: string;
          width: number | null;
        };
        Insert: {
          bytes?: number | null;
          created_at?: string;
          duration_s?: number | null;
          expires_at?: string | null;
          height?: number | null;
          id?: string;
          kind: string;
          mention_id?: string | null;
          project_id?: string | null;
          run_id?: string | null;
          status?: string;
          storage_path?: string | null;
          url: string;
          width?: number | null;
        };
        Update: {
          bytes?: number | null;
          created_at?: string;
          duration_s?: number | null;
          expires_at?: string | null;
          height?: number | null;
          id?: string;
          kind?: string;
          mention_id?: string | null;
          project_id?: string | null;
          run_id?: string | null;
          status?: string;
          storage_path?: string | null;
          url?: string;
          width?: number | null;
        };
        Relationships: [];
      };
      mentions: {
        Row: {
          author: string;
          body: string;
          brand: string;
          competitor_id: string | null;
          created_at: string;
          engagement: Json;
          external_id: string | null;
          handle: string;
          id: string;
          is_ad: boolean;
          metrics: Json;
          permalink: string | null;
          platform: Database["public"]["Enums"]["platform"];
          project_id: string;
          published_at: string | null;
          run_id: string | null;
          sentiment: Database["public"]["Enums"]["sentiment_kind"];
          sort_order: number;
          thumb_type: Database["public"]["Enums"]["thumb_kind"] | null;
          ts_label: string;
          url: string | null;
        };
        Insert: {
          author: string;
          body: string;
          brand: string;
          competitor_id?: string | null;
          created_at?: string;
          engagement?: Json;
          external_id?: string | null;
          handle: string;
          id?: string;
          is_ad?: boolean;
          metrics?: Json;
          permalink?: string | null;
          platform: Database["public"]["Enums"]["platform"];
          project_id: string;
          published_at?: string | null;
          run_id?: string | null;
          sentiment: Database["public"]["Enums"]["sentiment_kind"];
          sort_order?: number;
          thumb_type?: Database["public"]["Enums"]["thumb_kind"] | null;
          ts_label: string;
          url?: string | null;
        };
        Update: {
          author?: string;
          body?: string;
          brand?: string;
          competitor_id?: string | null;
          created_at?: string;
          engagement?: Json;
          external_id?: string | null;
          handle?: string;
          id?: string;
          is_ad?: boolean;
          metrics?: Json;
          permalink?: string | null;
          platform?: Database["public"]["Enums"]["platform"];
          project_id?: string;
          published_at?: string | null;
          run_id?: string | null;
          sentiment?: Database["public"]["Enums"]["sentiment_kind"];
          sort_order?: number;
          thumb_type?: Database["public"]["Enums"]["thumb_kind"] | null;
          ts_label?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      pending_charges: {
        Row: {
          estimated_cost_usd: number;
          expires_at: string;
          id: string;
          operation: string;
          project_id: string | null;
          provider: string;
          reserved_at: string;
          run_id: string | null;
          status: string;
          workspace_id: string | null;
        };
        Insert: {
          estimated_cost_usd?: number;
          expires_at: string;
          id?: string;
          operation: string;
          project_id?: string | null;
          provider: string;
          reserved_at?: string;
          run_id?: string | null;
          status?: string;
          workspace_id?: string | null;
        };
        Update: {
          estimated_cost_usd?: number;
          expires_at?: string;
          id?: string;
          operation?: string;
          project_id?: string | null;
          provider?: string;
          reserved_at?: string;
          run_id?: string | null;
          status?: string;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          budget_monthly_usd: number;
          created_at: string;
          geo: string[];
          id: string;
          keywords: string[];
          languages: string[];
          name: string;
          period_days: number;
          slug: string;
          status: Database["public"]["Enums"]["project_status"];
          workspace_id: string;
        };
        Insert: {
          budget_monthly_usd?: number;
          created_at?: string;
          geo?: string[];
          id?: string;
          keywords?: string[];
          languages?: string[];
          name: string;
          period_days?: number;
          slug: string;
          status?: Database["public"]["Enums"]["project_status"];
          workspace_id: string;
        };
        Update: {
          budget_monthly_usd?: number;
          created_at?: string;
          geo?: string[];
          id?: string;
          keywords?: string[];
          languages?: string[];
          name?: string;
          period_days?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["project_status"];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      run_analysis: {
        Row: {
          body: string;
          created_at: string;
          headline: string;
          id: string;
          project_id: string;
          recommendations: string[];
          run_id: string | null;
          section: string;
          takeaways: string[];
        };
        Insert: {
          body: string;
          created_at?: string;
          headline: string;
          id?: string;
          project_id: string;
          recommendations?: string[];
          run_id?: string | null;
          section: string;
          takeaways?: string[];
        };
        Update: {
          body?: string;
          created_at?: string;
          headline?: string;
          id?: string;
          project_id?: string;
          recommendations?: string[];
          run_id?: string | null;
          section?: string;
          takeaways?: string[];
        };
        Relationships: [];
      };
      run_sources: {
        Row: {
          cost: number;
          created_at: string;
          error: string | null;
          id: string;
          mentions_count: number;
          platform: Database["public"]["Enums"]["platform"];
          run_id: string;
          status: string;
        };
        Insert: {
          cost?: number;
          created_at?: string;
          error?: string | null;
          id?: string;
          mentions_count?: number;
          platform: Database["public"]["Enums"]["platform"];
          run_id: string;
          status?: string;
        };
        Update: {
          cost?: number;
          created_at?: string;
          error?: string | null;
          id?: string;
          mentions_count?: number;
          platform?: Database["public"]["Enums"]["platform"];
          run_id?: string;
          status?: string;
        };
        Relationships: [];
      };
      run_steps: {
        Row: {
          cost_usd: number;
          created_at: string;
          cumulative_usd: number;
          id: string;
          label: string;
          metadata: Json;
          provider: string | null;
          run_id: string;
        };
        Insert: {
          cost_usd?: number;
          created_at?: string;
          cumulative_usd?: number;
          id?: string;
          label: string;
          metadata?: Json;
          provider?: string | null;
          run_id: string;
        };
        Update: {
          cost_usd?: number;
          created_at?: string;
          cumulative_usd?: number;
          id?: string;
          label?: string;
          metadata?: Json;
          provider?: string | null;
          run_id?: string;
        };
        Relationships: [];
      };
      runs: {
        Row: {
          ad_intent: string | null;
          budget_usd: number;
          cost_actual: number | null;
          cost_estimated_high: number | null;
          cost_estimated_low: number | null;
          cost_hard: number;
          cost_soft: number;
          cost_used: number;
          created_at: string;
          error: string | null;
          finished_at: string | null;
          id: string;
          mentions_count: number;
          number: number;
          plan: Json | null;
          project_id: string;
          scope: string | null;
          started_at: string | null;
          status: string;
        };
        Insert: {
          ad_intent?: string | null;
          budget_usd?: number;
          cost_actual?: number | null;
          cost_estimated_high?: number | null;
          cost_estimated_low?: number | null;
          cost_hard?: number;
          cost_soft?: number;
          cost_used?: number;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          mentions_count?: number;
          number: number;
          plan?: Json | null;
          project_id: string;
          scope?: string | null;
          started_at?: string | null;
          status?: string;
        };
        Update: {
          ad_intent?: string | null;
          budget_usd?: number;
          cost_actual?: number | null;
          cost_estimated_high?: number | null;
          cost_estimated_low?: number | null;
          cost_hard?: number;
          cost_soft?: number;
          cost_used?: number;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          mentions_count?: number;
          number?: number;
          plan?: Json | null;
          project_id?: string;
          scope?: string | null;
          started_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "runs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      source_settings: {
        Row: {
          actor_build: string | null;
          actor_id: string | null;
          enabled: boolean;
          fallback_actor_id: string | null;
          platform: Database["public"]["Enums"]["platform"];
          provider: string | null;
          results_limit: number;
          scope: string;
          updated_at: string;
        };
        Insert: {
          actor_build?: string | null;
          actor_id?: string | null;
          enabled?: boolean;
          fallback_actor_id?: string | null;
          platform: Database["public"]["Enums"]["platform"];
          provider?: string | null;
          results_limit?: number;
          scope?: string;
          updated_at?: string;
        };
        Update: {
          actor_build?: string | null;
          actor_id?: string | null;
          enabled?: boolean;
          fallback_actor_id?: string | null;
          platform?: Database["public"]["Enums"]["platform"];
          provider?: string | null;
          results_limit?: number;
          scope?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      system_flags: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value?: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          brand_color: string;
          created_at: string;
          id: string;
          name: string;
          settings: Json;
          slug: string;
        };
        Insert: {
          brand_color?: string;
          created_at?: string;
          id?: string;
          name: string;
          settings?: Json;
          slug: string;
        };
        Update: {
          brand_color?: string;
          created_at?: string;
          id?: string;
          name?: string;
          settings?: Json;
          slug?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      budget_spent_with_pending: { Args: { p_run_id: string }; Returns: number };
      commit_charge: { Args: { p_real: number; p_reservation_id: string }; Returns: undefined };
      release_charge: { Args: { p_reservation_id: string }; Returns: undefined };
      release_expired_charges: { Args: Record<string, never>; Returns: number };
      reserve_budget: {
        Args: {
          p_estimated: number;
          p_expires_minutes?: number;
          p_operation: string;
          p_provider: string;
          p_run_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      insight_kind: "opp" | "thr" | "pat" | "ano";
      platform:
        | "instagram"
        | "tiktok"
        | "youtube"
        | "facebook"
        | "x"
        | "reddit"
        | "mastodon"
        | "bluesky"
        | "web"
        | "meta_ads"
        | "google_ads"
        | "linkedin_ads";
      project_status: "active" | "draft" | "archived";
      sentiment_kind: "pos" | "neu" | "neg" | "mix";
      thumb_kind: "photo" | "video" | "article" | "ad";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

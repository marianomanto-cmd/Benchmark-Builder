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
      insights: {
        Row: {
          body: string | null;
          confidence: number;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["insight_kind"];
          project_id: string;
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
          sort_order?: number;
          sources?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "insights_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      mentions: {
        Row: {
          author: string;
          body: string;
          brand: string;
          competitor_id: string | null;
          created_at: string;
          handle: string;
          id: string;
          is_ad: boolean;
          metrics: Json;
          permalink: string | null;
          platform: Database["public"]["Enums"]["platform"];
          project_id: string;
          sentiment: Database["public"]["Enums"]["sentiment_kind"];
          sort_order: number;
          thumb_type: Database["public"]["Enums"]["thumb_kind"] | null;
          ts_label: string;
        };
        Insert: {
          author: string;
          body: string;
          brand: string;
          competitor_id?: string | null;
          created_at?: string;
          handle: string;
          id?: string;
          is_ad?: boolean;
          metrics?: Json;
          permalink?: string | null;
          platform: Database["public"]["Enums"]["platform"];
          project_id: string;
          sentiment: Database["public"]["Enums"]["sentiment_kind"];
          sort_order?: number;
          thumb_type?: Database["public"]["Enums"]["thumb_kind"] | null;
          ts_label: string;
        };
        Update: {
          author?: string;
          body?: string;
          brand?: string;
          competitor_id?: string | null;
          created_at?: string;
          handle?: string;
          id?: string;
          is_ad?: boolean;
          metrics?: Json;
          permalink?: string | null;
          platform?: Database["public"]["Enums"]["platform"];
          project_id?: string;
          sentiment?: Database["public"]["Enums"]["sentiment_kind"];
          sort_order?: number;
          thumb_type?: Database["public"]["Enums"]["thumb_kind"] | null;
          ts_label?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentions_competitor_id_fkey";
            columns: ["competitor_id"];
            isOneToOne: false;
            referencedRelation: "competitors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mentions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          period_days: number;
          slug: string;
          status: Database["public"]["Enums"]["project_status"];
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          period_days?: number;
          slug: string;
          status?: Database["public"]["Enums"]["project_status"];
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
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
      runs: {
        Row: {
          cost_hard: number;
          cost_soft: number;
          cost_used: number;
          created_at: string;
          id: string;
          number: number;
          project_id: string;
          status: string;
        };
        Insert: {
          cost_hard?: number;
          cost_soft?: number;
          cost_used?: number;
          created_at?: string;
          id?: string;
          number: number;
          project_id: string;
          status?: string;
        };
        Update: {
          cost_hard?: number;
          cost_soft?: number;
          cost_used?: number;
          created_at?: string;
          id?: string;
          number?: number;
          project_id?: string;
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
      workspaces: {
        Row: {
          brand_color: string;
          created_at: string;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          brand_color?: string;
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          brand_color?: string;
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
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
        | "meta_ads";
      project_status: "active" | "draft" | "archived";
      sentiment_kind: "pos" | "neu" | "neg" | "mix";
      thumb_kind: "photo" | "video" | "article" | "ad";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assinaturas: {
        Row: {
          assinado_em: string | null
          campanha_id: string
          cep_assinante: string | null
          cidade_assinante: string | null
          complemento_assinante: string | null
          consented_at: string | null
          email_assinante: string | null
          endereco_assinante: string | null
          estado_assinante: string | null
          id: string
          ip_origem: string | null
          metadata: Json
          n_assinante: number | null
          nome_assinante: string | null
          numero_assinante: string | null
          responses: Json
          source: string
          user_agent: string | null
        }
        Insert: {
          assinado_em?: string | null
          campanha_id: string
          cep_assinante?: string | null
          cidade_assinante?: string | null
          complemento_assinante?: string | null
          consented_at?: string | null
          email_assinante?: string | null
          endereco_assinante?: string | null
          estado_assinante?: string | null
          id?: string
          ip_origem?: string | null
          metadata?: Json
          n_assinante?: number | null
          nome_assinante?: string | null
          numero_assinante?: string | null
          responses?: Json
          source?: string
          user_agent?: string | null
        }
        Update: {
          assinado_em?: string | null
          campanha_id?: string
          cep_assinante?: string | null
          cidade_assinante?: string | null
          complemento_assinante?: string | null
          consented_at?: string | null
          email_assinante?: string | null
          endereco_assinante?: string | null
          estado_assinante?: string | null
          id?: string
          ip_origem?: string | null
          metadata?: Json
          n_assinante?: number | null
          nome_assinante?: string | null
          numero_assinante?: string | null
          responses?: Json
          source?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_activity: {
        Row: {
          action: string
          campaign_id: string
          created_at: string
          details: Json
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          campaign_id: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          campaign_id?: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_activity_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          archived_at: string | null
          assinaturas_meta: number | null
          ativa: boolean | null
          candidato_id: string | null
          cor_destaque: string
          created_at: string
          created_by: string | null
          criado_em: string | null
          descricao: string | null
          destaque_primario: string | null
          destaque_secundario: string | null
          fim_em: string | null
          form_config: Json
          id: string
          id_planilha: string | null
          imagem_fundo: string | null
          imagem_lateral: string | null
          inicio_em: string | null
          legenda_video: string | null
          meta_description: string | null
          meta_title: string | null
          nota_citacao: string | null
          nota_video: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          published_at: string | null
          settings: Json
          slug: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          tema: number
          texto_assinar: string | null
          texto_citacao: string | null
          texto_compartilhar: string | null
          texto_conclusao: string | null
          texto_contexto: string | null
          texto_dot: string | null
          texto_faixa: string | null
          texto_form: string | null
          texto_impacto: string | null
          texto_impacto_apoio: string | null
          texto_proposta: string | null
          texto_topicos: string | null
          texto_topicos_intro: string | null
          texto_video: string | null
          theme_key: string
          titulo: string
          titulo_assinar: string | null
          titulo_citacao: string | null
          titulo_topicos: string | null
          titulo_video: string | null
          updated_at: string
          updated_by: string | null
          url_formulario: string | null
          video_url: string | null
        }
        Insert: {
          archived_at?: string | null
          assinaturas_meta?: number | null
          ativa?: boolean | null
          candidato_id?: string | null
          cor_destaque?: string
          created_at?: string
          created_by?: string | null
          criado_em?: string | null
          descricao?: string | null
          destaque_primario?: string | null
          destaque_secundario?: string | null
          fim_em?: string | null
          form_config?: Json
          id?: string
          id_planilha?: string | null
          imagem_fundo?: string | null
          imagem_lateral?: string | null
          inicio_em?: string | null
          legenda_video?: string | null
          meta_description?: string | null
          meta_title?: string | null
          nota_citacao?: string | null
          nota_video?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          settings?: Json
          slug?: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          tema?: number
          texto_assinar?: string | null
          texto_citacao?: string | null
          texto_compartilhar?: string | null
          texto_conclusao?: string | null
          texto_contexto?: string | null
          texto_dot?: string | null
          texto_faixa?: string | null
          texto_form?: string | null
          texto_impacto?: string | null
          texto_impacto_apoio?: string | null
          texto_proposta?: string | null
          texto_topicos?: string | null
          texto_topicos_intro?: string | null
          texto_video?: string | null
          theme_key: string
          titulo: string
          titulo_assinar?: string | null
          titulo_citacao?: string | null
          titulo_topicos?: string | null
          titulo_video?: string | null
          updated_at?: string
          updated_by?: string | null
          url_formulario?: string | null
          video_url?: string | null
        }
        Update: {
          archived_at?: string | null
          assinaturas_meta?: number | null
          ativa?: boolean | null
          candidato_id?: string | null
          cor_destaque?: string
          created_at?: string
          created_by?: string | null
          criado_em?: string | null
          descricao?: string | null
          destaque_primario?: string | null
          destaque_secundario?: string | null
          fim_em?: string | null
          form_config?: Json
          id?: string
          id_planilha?: string | null
          imagem_fundo?: string | null
          imagem_lateral?: string | null
          inicio_em?: string | null
          legenda_video?: string | null
          meta_description?: string | null
          meta_title?: string | null
          nota_citacao?: string | null
          nota_video?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          settings?: Json
          slug?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          tema?: number
          texto_assinar?: string | null
          texto_citacao?: string | null
          texto_compartilhar?: string | null
          texto_conclusao?: string | null
          texto_contexto?: string | null
          texto_dot?: string | null
          texto_faixa?: string | null
          texto_form?: string | null
          texto_impacto?: string | null
          texto_impacto_apoio?: string | null
          texto_proposta?: string | null
          texto_topicos?: string | null
          texto_topicos_intro?: string | null
          texto_video?: string | null
          theme_key?: string
          titulo?: string
          titulo_assinar?: string | null
          titulo_citacao?: string | null
          titulo_topicos?: string | null
          titulo_video?: string | null
          updated_at?: string
          updated_by?: string | null
          url_formulario?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos: {
        Row: {
          cargo: string | null
          criado_em: string | null
          dominio_formularios: string | null
          estado: string | null
          id: string
          municipio: string | null
          nome: string
          numero: string | null
          partido: string | null
        }
        Insert: {
          cargo?: string | null
          criado_em?: string | null
          dominio_formularios?: string | null
          estado?: string | null
          id?: string
          municipio?: string | null
          nome: string
          numero?: string | null
          partido?: string | null
        }
        Update: {
          cargo?: string | null
          criado_em?: string | null
          dominio_formularios?: string | null
          estado?: string | null
          id?: string
          municipio?: string | null
          nome?: string
          numero?: string | null
          partido?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "master" | "admin" | "editor"
      campaign_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["master", "admin", "editor"],
      campaign_status: ["draft", "published", "archived"],
    },
  },
} as const

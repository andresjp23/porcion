
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "profiles": {
                  Row: {
                    "activity": Database["public"]['Enums']["activity_level"] | null,"birth_date": string | null,"carbs_g": number | null,"created_at": string,"display_name": string | null,"fat_g": number | null,"goal": Database["public"]['Enums']["goal_type"] | null,"height_cm": number | null,"id": string,"kcal_is_manual": boolean,"kcal_target": number | null,"macros_are_manual": boolean,"onboarding_completed_at": string | null,"privacy_accepted_at": string | null,"privacy_version": string | null,"protein_g": number | null,"sex": Database["public"]['Enums']["sex_for_calc"] | null,"timezone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity"?: Database["public"]['Enums']["activity_level"] | null,"birth_date"?: string | null,"carbs_g"?: number | null,"created_at"?: string,"display_name"?: string | null,"fat_g"?: number | null,"goal"?: Database["public"]['Enums']["goal_type"] | null,"height_cm"?: number | null,"id": string,"kcal_is_manual"?: boolean,"kcal_target"?: number | null,"macros_are_manual"?: boolean,"onboarding_completed_at"?: string | null,"privacy_accepted_at"?: string | null,"privacy_version"?: string | null,"protein_g"?: number | null,"sex"?: Database["public"]['Enums']["sex_for_calc"] | null,"timezone"?: string
                  }
                  Update: {
                    "activity"?: Database["public"]['Enums']["activity_level"] | null,"birth_date"?: string | null,"carbs_g"?: number | null,"created_at"?: string,"display_name"?: string | null,"fat_g"?: number | null,"goal"?: Database["public"]['Enums']["goal_type"] | null,"height_cm"?: number | null,"id"?: string,"kcal_is_manual"?: boolean,"kcal_target"?: number | null,"macros_are_manual"?: boolean,"onboarding_completed_at"?: string | null,"privacy_accepted_at"?: string | null,"privacy_version"?: string | null,"protein_g"?: number | null,"sex"?: Database["public"]['Enums']["sex_for_calc"] | null,"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"weight_entries": {
                  Row: {
                    "created_at": string,"date": string,"user_id": string,"weight_kg": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date": string,"user_id"?: string,"weight_kg": number
                  }
                  Update: {
                    "created_at"?: string,"date"?: string,"user_id"?: string,"weight_kg"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "has_consented":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           }
          }
          Enums: {
            "activity_level": "sedentary"|"light"|"moderate"|"high"|"very_high","food_basis": "g"|"ml","food_source": "seed"|"off"|"user","goal_type": "lose"|"maintain"|"gain","list_status": "active"|"archived","meal_type": "breakfast"|"lunch"|"snack"|"dinner","report_status": "open"|"resolved"|"dismissed","sex_for_calc": "male"|"female"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "activity_level": ["sedentary", "light", "moderate", "high", "very_high"],"food_basis": ["g", "ml"],"food_source": ["seed", "off", "user"],"goal_type": ["lose", "maintain", "gain"],"list_status": ["active", "archived"],"meal_type": ["breakfast", "lunch", "snack", "dinner"],"report_status": ["open", "resolved", "dismissed"],"sex_for_calc": ["male", "female"]
          }
        }
} as const

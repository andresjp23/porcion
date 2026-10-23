
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
            "favorites": {
                  Row: {
                    "created_at": string,"food_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"food_id": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"food_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "food_list_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    }
                  ]
                },"food_logs": {
                  Row: {
                    "carbs": number,"created_at": string,"fat": number,"food_id": string | null,"food_name": string,"grams": number,"id": string,"kcal": number,"log_date": string,"meal": Database["public"]['Enums']["meal_type"],"portion_id": string | null,"protein": number,"quantity": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "carbs": number,"created_at"?: string,"fat": number,"food_id"?: string | null,"food_name": string,"grams": number,"id"?: string,"kcal": number,"log_date": string,"meal": Database["public"]['Enums']["meal_type"],"portion_id"?: string | null,"protein": number,"quantity": number,"user_id"?: string
                  }
                  Update: {
                    "carbs"?: number,"created_at"?: string,"fat"?: number,"food_id"?: string | null,"food_name"?: string,"grams"?: number,"id"?: string,"kcal"?: number,"log_date"?: string,"meal"?: Database["public"]['Enums']["meal_type"],"portion_id"?: string | null,"protein"?: number,"quantity"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "food_logs_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "food_list_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "food_logs_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "food_logs_portion_id_fkey"
      columns: ["portion_id"]
isOneToOne: false
      referencedRelation: "food_list_items"
      referencedColumns: ["default_portion_id"]
    },{
      foreignKeyName: "food_logs_portion_id_fkey"
      columns: ["portion_id"]
isOneToOne: false
      referencedRelation: "food_portions"
      referencedColumns: ["id"]
    }
                  ]
                },"food_portions": {
                  Row: {
                    "food_id": string,"grams": number,"id": string,"is_default": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "food_id": string,"grams": number,"id"?: string,"is_default"?: boolean,"name": string
                  }
                  Update: {
                    "food_id"?: string,"grams"?: number,"id"?: string,"is_default"?: boolean,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "food_portions_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "food_list_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "food_portions_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    }
                  ]
                },"food_reports": {
                  Row: {
                    "created_at": string,"food_id": string,"id": string,"reason": string,"reporter_id": string | null,"status": Database["public"]['Enums']["report_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"food_id": string,"id"?: string,"reason": string,"reporter_id"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Update: {
                    "created_at"?: string,"food_id"?: string,"id"?: string,"reason"?: string,"reporter_id"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "food_reports_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "food_list_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "food_reports_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    }
                  ]
                },"foods": {
                  Row: {
                    "aliases": (string)[],"barcode": string | null,"basis": Database["public"]['Enums']["food_basis"],"brand": string | null,"carbs_100": number,"created_at": string,"created_by": string | null,"fat_100": number,"id": string,"kcal_100": number,"name": string,"open_reports": number,"protein_100": number,"search_text": string,"source": Database["public"]['Enums']["food_source"],"updated_at": string,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "aliases"?: (string)[],"barcode"?: string | null,"basis"?: Database["public"]['Enums']["food_basis"],"brand"?: string | null,"carbs_100": number,"created_at"?: string,"created_by"?: string | null,"fat_100": number,"id"?: string,"kcal_100": number,"name": string,"open_reports"?: number,"protein_100": number,"search_text"?: never,"source": Database["public"]['Enums']["food_source"],"updated_at"?: string,"verified"?: boolean
                  }
                  Update: {
                    "aliases"?: (string)[],"barcode"?: string | null,"basis"?: Database["public"]['Enums']["food_basis"],"brand"?: string | null,"carbs_100"?: number,"created_at"?: string,"created_by"?: string | null,"fat_100"?: number,"id"?: string,"kcal_100"?: number,"name"?: string,"open_reports"?: number,"protein_100"?: number,"search_text"?: never,"source"?: Database["public"]['Enums']["food_source"],"updated_at"?: string,"verified"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
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
            "food_list_items": {
                  Row: {
                    "basis": Database["public"]['Enums']["food_basis"] | null,"brand": string | null,"carbs_100": number | null,"default_portion_grams": number | null,"default_portion_id": string | null,"default_portion_name": string | null,"fat_100": number | null,"id": string | null,"kcal_100": number | null,"name": string | null,"open_reports": number | null,"protein_100": number | null,"source": Database["public"]['Enums']["food_source"] | null,"verified": boolean | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "can_edit_food":
{ Args: { "target_food_id": string }; Returns: boolean
                           },
"copy_meal":
{ Args: { "from_date": string,"m": Database["public"]['Enums']["meal_type"],"to_date": string }; Returns: number
                           },
"create_food":
{ Args: { "barcode"?: string,"basis": Database["public"]['Enums']["food_basis"],"brand"?: string,"carbs_100": number,"fat_100": number,"kcal_100": number,"name": string,"portions"?: Json,"protein_100": number }; Returns: string
                           },
"day_summary":
{ Args: { "d": string }; Returns: {
              "carbs": number,"entries": number,"fat": number,"kcal": number,"meal": Database["public"]['Enums']["meal_type"],"protein": number
            }[]
                           },
"favorite_foods":
{ Args: Record<PropertyKey, never>; Returns: {
              "basis": Database["public"]['Enums']["food_basis"] | null,
"brand": string | null,
"carbs_100": number | null,
"default_portion_grams": number | null,
"default_portion_id": string | null,
"default_portion_name": string | null,
"fat_100": number | null,
"id": string | null,
"kcal_100": number | null,
"name": string | null,
"open_reports": number | null,
"protein_100": number | null,
"source": Database["public"]['Enums']["food_source"] | null,
"verified": boolean | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "food_list_items"
        isOneToOne: false
        isSetofReturn: true
      } },
"food_search_text":
{ Args: { "aliases": (string)[],"brand": string,"name": string }; Returns: string
                           },
"has_consented":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"import_off_product":
{ Args: { "barcode": string,"basis": Database["public"]['Enums']["food_basis"],"brand"?: string,"carbs_100": number,"fat_100": number,"kcal_100": number,"name": string,"protein_100": number,"serving_grams"?: number }; Returns: string
                           },
"is_my_food":
{ Args: { "target_food_id": string }; Returns: boolean
                           },
"is_valid_gtin":
{ Args: { "code": string }; Returns: boolean
                           },
"my_foods":
{ Args: Record<PropertyKey, never>; Returns: {
              "basis": Database["public"]['Enums']["food_basis"] | null,
"brand": string | null,
"carbs_100": number | null,
"default_portion_grams": number | null,
"default_portion_id": string | null,
"default_portion_name": string | null,
"fat_100": number | null,
"id": string | null,
"kcal_100": number | null,
"name": string | null,
"open_reports": number | null,
"protein_100": number | null,
"source": Database["public"]['Enums']["food_source"] | null,
"verified": boolean | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "food_list_items"
        isOneToOne: false
        isSetofReturn: true
      } },
"recent_foods":
{ Args: { "lim"?: number }; Returns: {
              "basis": Database["public"]['Enums']["food_basis"] | null,
"brand": string | null,
"carbs_100": number | null,
"default_portion_grams": number | null,
"default_portion_id": string | null,
"default_portion_name": string | null,
"fat_100": number | null,
"id": string | null,
"kcal_100": number | null,
"name": string | null,
"open_reports": number | null,
"protein_100": number | null,
"source": Database["public"]['Enums']["food_source"] | null,
"verified": boolean | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "food_list_items"
        isOneToOne: false
        isSetofReturn: true
      } },
"search_foods":
{ Args: { "lim"?: number,"q": string }; Returns: {
              "basis": Database["public"]['Enums']["food_basis"],"brand": string,"carbs_100": number,"default_portion_grams": number,"default_portion_id": string,"default_portion_name": string,"fat_100": number,"id": string,"kcal_100": number,"name": string,"open_reports": number,"protein_100": number,"source": Database["public"]['Enums']["food_source"],"verified": boolean
            }[]
                           },
"unaccent_immutable":
{ Args: { "value": string }; Returns: string
                           },
"update_food":
{ Args: { "basis": Database["public"]['Enums']["food_basis"],"brand"?: string,"carbs_100": number,"fat_100": number,"food_id": string,"kcal_100": number,"name": string,"portions"?: Json,"protein_100": number }; Returns: undefined
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

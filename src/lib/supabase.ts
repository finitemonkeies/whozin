
import { createClient } from "@supabase/supabase-js";
// @ts-ignore
import { projectId, publicAnonKey } from "../../utils/supabase/info";

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

export const getServerUrl = (path: string) => {
    return `https://${projectId}.supabase.co/functions/v1/make-server-3b9fa398${path}`;
}

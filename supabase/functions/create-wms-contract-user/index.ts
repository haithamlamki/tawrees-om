import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  full_name?: string;
  phone?: string;
  customer_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { email, full_name, phone, customer_id }: CreateUserRequest = await req.json();

    if (!email || !customer_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and customer_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Require authenticated caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requesterId = userData.user.id;

    // Authorization: allow admins or customer owner/admin for this customer
    const { data: isAdmin } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requesterId)
      .eq('role', 'admin')
      .maybeSingle();

    let authorized = !!isAdmin;
    if (!authorized) {
      const { data: custRole } = await supabase
        .from('wms_customer_users')
        .select('role')
        .eq('user_id', requesterId)
        .eq('customer_id', customer_id)
        .maybeSingle();
      authorized = !!custRole && (custRole.role === 'owner' || custRole.role === 'admin');
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating/linking WMS contract user:', { email, full_name, customer_id });

    // Try to find existing user by email via profiles first (faster than scanning auth users)
    let userId: string | null = null;
    const { data: profileMatch } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profileMatch?.id) {
      userId = profileMatch.id;
    }

    // Fallback to admin listUsers if no profile found
    if (!userId) {
      const { data: existingUsers, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) {
        console.error('Error listing users:', listErr);
      }
      const match = existingUsers?.users?.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
      if (match) {
        userId = match.id;
      }
    }

    let temporaryPassword: string | undefined;

    // If not found, create new auth user
    if (!userId) {
      const password = crypto.randomUUID() + crypto.randomUUID();
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, phone },
      });
      if (authError) {
        console.error('Error creating auth user:', authError);
        throw authError;
      }
      userId = authData.user.id;
      temporaryPassword = password;

      // Wait briefly for triggers to run (profile creation)
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Ensure profile exists/updated
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileUpsertErr } = await supabase.from('profiles').upsert(
        {
          id: userId,
          full_name: full_name ?? 'User',
          email,
          phone: phone ?? null,
        },
        { onConflict: 'id' }
      );
      if (profileUpsertErr) {
        console.error('Error upserting profile:', profileUpsertErr);
        // Non-fatal, continue
      }
    }

    // Link user to WMS customer (no specific branch for contract-wide access)
    const { data: existingLink } = await supabase
      .from('wms_customer_users')
      .select('id')
      .eq('user_id', userId)
      .eq('customer_id', customer_id)
      .maybeSingle();

    if (!existingLink) {
      const { error: linkErr } = await supabase.from('wms_customer_users').insert({
        user_id: userId,
        customer_id,
        branch_id: null,
      });
      if (linkErr) {
        console.error('Error linking user to customer:', linkErr);
        throw linkErr;
      }
    }

    // Assign store_customer role (idempotent)
    const { error: roleErr } = await supabase
      .from('user_roles')
      .upsert(
        { user_id: userId, role: 'store_customer' },
        { onConflict: 'user_id,role' }
      );
    if (roleErr) {
      console.error('Error assigning role:', roleErr);
      throw roleErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        message: temporaryPassword
          ? 'User created and linked successfully'
          : 'Existing user linked successfully',
        temporary_password: temporaryPassword,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-wms-contract-user function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Failed to create or link user' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

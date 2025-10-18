import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get requesting user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { email, full_name, phone, customer_id, branch_id, role } = await req.json();

    console.log('Creating WMS user:', { email, full_name, role, customer_id });

    // Verify requesting user is customer owner/admin
    const { data: requestingUserRole, error: roleError } = await supabase
      .from('wms_customer_users')
      .select('role, customer_id')
      .eq('user_id', user.id)
      .eq('customer_id', customer_id)
      .single();

    if (roleError || !requestingUserRole || !['owner', 'admin'].includes(requestingUserRole.role)) {
      throw new Error('Only customer owners/admins can create users');
    }

    // Try to find existing user by email via profiles first (faster than scanning auth users)
    let userId: string | null = null;
    const { data: profileMatch } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (profileMatch?.id) {
      userId = profileMatch.id;
      console.log('Found existing user via profile:', userId);
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
        console.log('Found existing user via auth:', userId);
      }
    }

    let temporaryPassword: string | undefined;

    // If not found, create new auth user
    if (!userId) {
      const tempPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name, phone },
      });
      if (authError) {
        console.error('Error creating auth user:', authError);
        throw authError;
      }
      userId = authData.user.id;
      temporaryPassword = tempPassword;
      console.log('Created new user:', userId);

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

    // Check if user is already linked to this customer
    const { data: existingLink } = await supabase
      .from('wms_customer_users')
      .select('id')
      .eq('user_id', userId)
      .eq('customer_id', customer_id)
      .maybeSingle();

    if (!existingLink) {
      // Create wms_customer_users entry
      const { error: customerUserError } = await supabase
        .from('wms_customer_users')
        .insert({
          user_id: userId,
          customer_id,
          branch_id: branch_id || null,
          role: role || 'employee'
        });

      if (customerUserError) {
        console.error('Customer user creation error:', customerUserError);
        throw customerUserError;
      }
    }

    // Add system role if applicable (idempotent)
    if (role === 'employee' || role === 'accountant') {
      const systemRole = role === 'employee' ? 'wms_employee' : 'wms_accountant';
      const { error: roleInsertError } = await supabase
        .from('user_roles')
        .upsert(
          { user_id: userId, role: systemRole },
          { onConflict: 'user_id,role' }
        );

      if (roleInsertError) {
        console.error('User role creation error:', roleInsertError);
        // Don't throw, this is non-critical
      }
    }

    console.log('WMS user created/linked successfully');

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    // Log full error server-side only
    console.error('[CREATE-WMS-USER] Error:', error);
    
    // Return sanitized error to client
    const message = error?.message?.includes('Unauthorized') || error?.message?.includes('authorization')
      ? 'Unauthorized access'
      : error?.message?.includes('Only customer')
      ? 'Insufficient permissions'
      : 'Unable to create user';
      
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
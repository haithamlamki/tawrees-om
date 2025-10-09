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

    // Generate temporary password
    const tempPassword = crypto.randomUUID();

    // Create auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone
      }
    });

    if (createError) throw createError;

    console.log('Auth user created:', newUser.user?.id);

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user!.id,
        full_name,
        email,
        phone
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw profileError;
    }

    // Create wms_customer_users entry
    const { error: customerUserError } = await supabase
      .from('wms_customer_users')
      .insert({
        user_id: newUser.user!.id,
        customer_id,
        branch_id,
        role: role // 'employee', 'accountant', 'viewer'
      });

    if (customerUserError) {
      console.error('Customer user creation error:', customerUserError);
      throw customerUserError;
    }

    // Add system role if applicable
    if (role === 'employee' || role === 'accountant') {
      const systemRole = role === 'employee' ? 'wms_employee' : 'wms_accountant';
      const { error: roleInsertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: newUser.user!.id,
          role: systemRole
        });

      if (roleInsertError) {
        console.error('User role creation error:', roleInsertError);
        // Don't throw, this is non-critical
      }
    }

    console.log('WMS user created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user!.id,
        email,
        temporary_password: tempPassword,
        message: 'User created successfully. Please share the temporary password securely.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating WMS user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
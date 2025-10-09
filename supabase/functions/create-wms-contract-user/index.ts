import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  full_name: string;
  phone: string;
  customer_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, full_name, phone, customer_id }: CreateUserRequest = await req.json();

    console.log('Creating WMS contract user:', { email, full_name, customer_id });

    // Validate required fields
    if (!email || !customer_id) {
      throw new Error('Email and customer_id are required');
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    const userExists = existingUser?.users.some(u => u.email === email);
    
    if (userExists) {
      throw new Error(`A user with email ${email} already exists. Please use a different email or link the existing user manually.`);
    }

    // Generate a secure random password
    const password = crypto.randomUUID() + crypto.randomUUID();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        phone,
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      throw authError;
    }

    const userId = authData.user.id;
    console.log('Created auth user:', userId);

    // Create profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: userId,
        full_name,
        email,
        phone,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Rollback: delete the auth user
      await supabaseClient.auth.admin.deleteUser(userId);
      throw profileError;
    }

    console.log('Created profile for user:', userId);

    // Link user to WMS customer (no specific branch - can access all branches)
    const { error: customerUserError } = await supabaseClient
      .from('wms_customer_users')
      .insert({
        user_id: userId,
        customer_id,
        branch_id: null, // No specific branch
      });

    if (customerUserError) {
      console.error('Error linking user to customer:', customerUserError);
      // Rollback: delete profile and auth user
      await supabaseClient.from('profiles').delete().eq('id', userId);
      await supabaseClient.auth.admin.deleteUser(userId);
      throw customerUserError;
    }

    console.log('Linked user to customer:', customer_id);

    // Assign store_customer role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'store_customer',
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // Rollback: delete all created records
      await supabaseClient.from('wms_customer_users').delete().eq('user_id', userId);
      await supabaseClient.from('profiles').delete().eq('id', userId);
      await supabaseClient.auth.admin.deleteUser(userId);
      throw roleError;
    }

    console.log('Assigned store_customer role to user:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        message: 'User created successfully',
        temporary_password: password, // Return for admin to share with customer
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in create-wms-contract-user function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create user',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

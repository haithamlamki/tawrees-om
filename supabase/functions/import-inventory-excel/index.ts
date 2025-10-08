import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const customerId = formData.get('customerId') as string;

    if (!file || !customerId) {
      throw new Error('Missing required parameters: file and customerId');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB limit');
    }

    console.log(`Processing Excel import for customer ${customerId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} rows in Excel file`);

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string; data: any }>,
    };

    // Validate and import each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNumber = i + 2; // Excel row number (accounting for header)

      try {
        // Validate required fields - accept both 'price' and 'price_per_unit'
        const price = row.price || row.price_per_unit;
        if (!row.product_name || !row.sku || !row.quantity || !price) {
          throw new Error('Missing required fields: product_name, sku, quantity, price (or price_per_unit)');
        }

        // Check for duplicate SKU
        const { data: existing } = await supabase
          .from('wms_inventory')
          .select('id')
          .eq('customer_id', customerId)
          .eq('sku', row.sku)
          .single();

        if (existing) {
          throw new Error(`Duplicate SKU: ${row.sku} already exists`);
        }

        // Insert inventory item
        const { error: insertError } = await supabase
          .from('wms_inventory')
          .insert({
            customer_id: customerId,
            product_name: row.product_name,
            sku: row.sku,
            quantity: Number(row.quantity),
            unit_price: Number(price),
            description: row.description || null,
            location: row.location || null,
            min_stock_level: row.minimum_quantity ? Number(row.minimum_quantity) : null,
            max_stock_level: row.max_stock_level ? Number(row.max_stock_level) : null,
          });

        if (insertError) {
          throw insertError;
        }

        results.success++;
        console.log(`Row ${rowNumber}: Successfully imported ${row.sku}`);

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({
          row: rowNumber,
          error: errorMessage,
          data: row,
        });
        console.error(`Row ${rowNumber}: Failed to import - ${errorMessage}`);
      }
    }

    console.log(`Import completed: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Import completed: ${results.success} items imported, ${results.failed} failed`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error importing Excel file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

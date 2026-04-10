import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    const { data, error } = await supabase
        .from('professionals')
        .select(`
            id, full_name, phone, location, bio,
            profiles:user_id ( username, avatar_url, full_name )
        `)
        .ilike('specialty', `%store-hardware%`);

    console.log('Error:', error);
    console.log('Data:', data);
}

testQuery();

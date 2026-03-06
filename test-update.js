import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://qggewemotkqltagglnwj.supabase.co',
    'sb_publishable_TwFcvYnU5USMeRCq0lHnaw_TiHyJxIp'
);

async function test() {
    const { data, error } = await supabase.from('professionals').select('*').limit(5);
    console.log(data);
}

test();

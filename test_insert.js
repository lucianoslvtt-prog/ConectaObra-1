import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qggewemotkqltagglnwj.supabase.co',
  'sb_publishable_TwFcvYnU5USMeRCq0lHnaw_TiHyJxIp'
);

async function test() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'debug@test.com',
    password: 'password123'
  });
  
  if (authErr) {
    console.error('Auth error', authErr);
    return;
  }
  
  const user = auth.user;
  
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: user.id,
      content: '',
      tagged_trades: [],
      image_urls: ['https://example.com/image.jpg'],
    })
    .select()
    .single();
    
  console.log('Insert Error:', error);
  console.log('Insert Data:', data);
}

test();

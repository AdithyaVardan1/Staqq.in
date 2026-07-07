const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearBlogs() {
    console.log('Clearing all blog posts from Supabase...');
    const { data, error } = await supabase
        .from('blog_posts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
    
    if (error) {
        console.error('Error clearing blogs:', error);
    } else {
        console.log('Successfully cleared blogs.');
    }
}

clearBlogs();


import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log('Testing connection...');

    // 1. Log in (we need a valid user token to test RLS)
    // We can't easily login as the user without their password.
    // However, we can try to fetch something public?
    // Or ask the user to provide a token? Unlikely.

    // Instead, let's try to simulate the query anonymously? 
    // No, RLS usually blocks anon.

    console.log('Skipping auth (cannot login automatically). Checking public access if any...');

    // Try to select from profiles
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    console.log('Profiles check:', { data, error });

    if (error) {
        console.error('Error details:', error);
    }
}

test();

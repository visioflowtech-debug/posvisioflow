import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface CompanyProfile {
    business_name: string;
    address: string;
    phone: string;
    tax_id: string;
    currency: string;
    logo_url?: string;
}

export type UserRole = 'owner' | 'admin' | 'cashier' | 'super_admin';

export function useCompanyProfile() {
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [role, setRole] = useState<UserRole>('owner'); // Default to owner until checked
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isSuspended, setIsSuspended] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 0. Check Personal Profile for Super Admin & Status
            const { data: myProfile, error: myProfileError } = await supabase
                .from('profiles')
                .select('is_super_admin, status')
                .eq('id', user.id)
                .single();

            if (myProfile?.status === 'suspended') {
                setIsSuspended(true);
                setLoading(false);
                return;
            }

            if (myProfile?.is_super_admin) {
                setIsSuperAdmin(true);
                setRole('super_admin');
                setLoading(false);
                return;
            }

            // 1. Check if user is a team member
            const { data: teamMember } = await supabase
                .from('team_members')
                .select('owner_id, role')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .maybeSingle();

            let targetUserId = user.id;
            let userRole: UserRole = 'owner';

            if (teamMember) {
                targetUserId = teamMember.owner_id;
                userRole = teamMember.role as UserRole;
            }

            setRole(userRole);

            // 2. Fetch Company Profile (Owner's profile)
            const { data, error } = await supabase
                .from('profiles')
                .select('business_name, address, phone, tax_id, currency, logo_url, status')
                .eq('id', targetUserId)
                .single();

            if (error) throw error;

            // Also check if the COMPANY is suspended (if I am an employee)
            if (data.status === 'suspended') {
                setIsSuspended(true);
            }

            setProfile(data);
        } catch (error) {
            console.error('Error fetching company profile:', error);
        } finally {
            setLoading(false);
        }
    };

    return { profile, role, loading, isSuperAdmin, isSuspended, refetch: fetchProfile };
}

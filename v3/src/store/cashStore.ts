import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface CashRegister {
    id: number;
    status: 'open' | 'closed';
    opening_amount: number;
    opened_at: string;
}

interface CashStore {
    currentRegister: CashRegister | null;
    loading: boolean;
    checkRegisterStatus: () => Promise<void>;
    openRegister: (amount: number) => Promise<void>;
    closeRegister: (closingAmount: number) => Promise<void>;
}

export const useCashStore = create<CashStore>((set, get) => ({
    currentRegister: null,
    loading: true,

    checkRegisterStatus: async () => {
        try {
            set({ loading: true });
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            // Buscar la última caja abierta
            const { data, error } = await supabase
                .from('cash_registers')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'open')
                .order('opened_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 es "no rows found"
                console.error('Error checking register:', error);
            }

            set({ currentRegister: data || null });
        } finally {
            set({ loading: false });
        }
    },

    openRegister: async (amount: number) => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error('No user found');

        const { data, error } = await supabase
            .from('cash_registers')
            .insert([{
                user_id: user.id,
                opening_amount: amount,
                status: 'open',
                opened_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        set({ currentRegister: data });
    },

    closeRegister: async (closingAmount: number) => {
        const { currentRegister } = get();
        if (!currentRegister) return;

        const { error } = await supabase
            .from('cash_registers')
            .update({
                status: 'closed',
                closing_amount: closingAmount,
                closed_at: new Date().toISOString()
            })
            .eq('id', currentRegister.id);

        if (error) throw error;
        set({ currentRegister: null });
    }
}));

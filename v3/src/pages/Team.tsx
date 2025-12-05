import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, UserPlus, Trash2, Shield, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TeamMember {
    id: string;
    user_id: string;
    role: 'admin' | 'cashier';
    status: string;
    profile?: {
        email: string;
        business_name: string;
    };
}

export default function Team() {
    // const { profile } = useCompanyProfile(); // Unused
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'admin' | 'cashier'>('cashier');
    const [processing, setProcessing] = useState(false);

    const { showToast } = useToast();

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            // Fetch team members and join with profiles to get email
            const { data, error } = await supabase
                .from('team_members')
                .select('*, profile:profiles!team_members_user_id_fkey(email, business_name)');

            if (error) throw error;
            setMembers(data || []);
        } catch (error) {
            console.error('Error fetching members:', error);
            showToast('Error al cargar miembros', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setProcessing(true);

        try {
            // 1. Find user by email
            const { data: users, error: userError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single();

            if (userError || !users) {
                showToast('Usuario no encontrado. Asegúrate de que se haya registrado en la aplicación.', 'error');
                return;
            }

            // 2. Add to team
            const { error: inviteError } = await supabase
                .from('team_members')
                .insert([{
                    user_id: users.id,
                    owner_id: (await supabase.auth.getUser()).data.user?.id,
                    role,
                    status: 'active'
                }]);

            if (inviteError) {
                if (inviteError.code === '23505') { // Duplicate key error
                    showToast('Este usuario ya es miembro del equipo.', 'info');
                    return;
                }
                throw inviteError;
            }

            showToast('Miembro agregado exitosamente.', 'success');
            setEmail('');
            fetchMembers();
        } catch (error: any) {
            console.error('Error inviting member:', error);
            showToast(`Error al agregar miembro: ${error.message}`, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar a este miembro?')) return;

        try {
            const { error } = await supabase
                .from('team_members')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast('Miembro eliminado', 'success');
            fetchMembers();
        } catch (error) {
            console.error('Error removing member:', error);
            showToast('Error al eliminar miembro', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Equipo</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Invite Form */}
                    <div className="md:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800 mb-4">Agregar Miembro</h2>
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email del Usuario</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="usuario@ejemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    >
                                        <option value="cashier">Cajero (Ventas)</option>
                                        <option value="admin">Administrador (Total)</option>
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Agregar
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Members List */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900">Miembros del Equipo</h2>
                            </div>
                            {loading ? (
                                <div className="p-8 text-center text-gray-500">Cargando...</div>
                            ) : members.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No tienes miembros en tu equipo.</div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {members.map((member) => (
                                        <div key={member.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${member.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                                    {member.role === 'admin' ? <Shield className="w-5 h-5 text-purple-600" /> : <User className="w-5 h-5 text-blue-600" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{member.profile?.email || 'Usuario desconocido'}</p>
                                                    <p className="text-xs text-gray-500 capitalize">{member.role === 'admin' ? 'Administrador' : 'Cajero'}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(member.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

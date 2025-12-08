import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { ShieldAlert, Search, ShieldCheck, Power, LogOut, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Profile {
    id: string;
    business_name: string;
    email: string;
    status: 'active' | 'suspended';
    is_super_admin: boolean;
    created_at: string;
}

export default function SuperAdmin() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
        } catch (error) {
            console.error('Error fetching profiles:', error);
            showToast('Error al cargar perfiles', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (profile: Profile) => {
        const newStatus = profile.status === 'active' ? 'suspended' : 'active';
        const action = newStatus === 'active' ? 'ACTIVAR' : 'SUSPENDER';

        if (!confirm(`¿CONFIRMAS QUE DESEAS ${action} A LA EMPRESA:\n"${profile.business_name || 'Sin nombre'}"?\n\nAl suspender, ningún usuario de esta empresa podrá acceder.`)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', profile.id);

            if (error) throw error;

            setProfiles(profiles.map(p =>
                p.id === profile.id ? { ...p, status: newStatus } : p
            ));

            showToast(`Perfil ${action === 'ACTIVAR' ? 'activado' : 'suspendido'} correctamente`, 'success');
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Error al actualizar estado', 'error');
        }
    };

    const filteredProfiles = profiles.filter(p =>
        p.business_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.id.includes(search)
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-600 rounded-lg">
                            <ShieldAlert className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Super Admin</h1>
                            <p className="text-gray-400">Control maestro de empresas</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/" className="flex items-center gap-2 bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                            <LayoutDashboard className="w-4 h-4" />
                            Ir al App
                        </Link>
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="flex items-center gap-2 bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Salir
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre de empresa o ID..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                </div>

                {/* Table */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900/50 text-gray-400 text-sm uppercase tracking-wider">
                                <th className="p-4 font-medium">Empresa / ID</th>
                                <th className="p-4 font-medium">Rol</th>
                                <th className="p-4 font-medium">Estado</th>
                                <th className="p-4 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Cargando...</td></tr>
                            ) : filteredProfiles.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No se encontraron resultados</td></tr>
                            ) : filteredProfiles.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-white">{p.business_name || 'Sin Nombre'}</div>
                                        <div className="text-sm text-gray-400">{p.email || 'Sin Email'}</div>
                                        <div className="text-xs text-gray-500 font-mono">{p.id}</div>
                                    </td>
                                    <td className="p-4">
                                        {p.is_super_admin ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs font-bold border border-red-900">
                                                <ShieldCheck className="w-3 h-3" /> SUPER ADMIN
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-sm">Usuario</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${p.status === 'suspended'
                                            ? 'bg-red-900/20 text-red-500 border-red-900/30'
                                            : 'bg-green-900/20 text-green-500 border-green-900/30'
                                            }`}>
                                            {p.status === 'suspended' ? 'SUSPENDIDO' : 'ACTIVO'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {!p.is_super_admin && (
                                            <button
                                                onClick={() => toggleStatus(p)}
                                                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold ${p.status === 'suspended'
                                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                                    }`}
                                            >
                                                <Power className="w-4 h-4" />
                                                {p.status === 'suspended' ? 'Activar' : 'Suspender'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

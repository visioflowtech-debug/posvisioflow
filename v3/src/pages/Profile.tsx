import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

import { useToast } from '../context/ToastContext';
import { User, Lock, Save, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Profile() {
    const { showToast } = useToast();

    const [form, setForm] = useState({
        full_name: '',
        password: '',
        confirmPassword: ''
    });

    const [loading, setLoading] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState('');

    useEffect(() => {
        getCurrentUser();
    }, []);

    // Load initial data
    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserEmail(user.email || '');
            // Get full_name from metadata or profile if available relative to user
            // But we can also check the companyProfile if it is the same user
            // However, the useCompanyProfile hook fetches the *Business Profile*. 
            // If I am just a member, companyProfile is my boss.
            // Wait, useCompanyProfile logic:
            // if isSuperAdmin -> null
            // else -> queries profiles where id = user.id (OWNER) OR team_members join profiles on owner_id.
            // Actually, let's fetch my OWN profile data directly to be sure.

            const { data } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();

            if (data?.full_name) {
                setForm(prev => ({ ...prev, full_name: data.full_name }));
            } else if (user.user_metadata?.full_name) {
                setForm(prev => ({ ...prev, full_name: user.user_metadata.full_name }));
            }
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Update Password if provided
            if (form.password) {
                if (form.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
                if (form.password !== form.confirmPassword) throw new Error('Las contraseñas no coinciden');

                const { error: passError } = await supabase.auth.updateUser({ password: form.password });
                if (passError) throw passError;

                showToast('Contraseña actualizada correctamente', 'success');
            }

            // 2. Update Name if changed
            if (form.full_name) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('No hay sesión activa');

                // Update Database
                const { error: dbError } = await supabase
                    .from('profiles')
                    .update({ full_name: form.full_name })
                    .eq('id', user.id);

                if (dbError) throw dbError;

                // Update Auth Metadata (so it persists in session)
                const { error: metaError } = await supabase.auth.updateUser({
                    data: { full_name: form.full_name }
                });

                if (metaError) throw metaError;

                showToast('Información de perfil actualizada', 'success');
            }

            // Clear password fields (security UI)
            setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));

        } catch (error: any) {
            console.error('Error updating profile:', error);
            showToast(error.message || 'Error al actualizar perfil', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Volver al Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
                    <p className="text-gray-500">Gestiona tu información personal y seguridad</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header Info */}
                    <div className="bg-gray-50 p-6 border-b border-gray-100 flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
                            {(form.full_name || currentUserEmail).charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{form.full_name || 'Sin Nombre'}</h2>
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <Mail className="w-4 h-4" />
                                {currentUserEmail}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">
                        {/* Personal Info */}
                        <section>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-gray-400" />
                                Información Personal
                            </h3>
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre Completo
                                    </label>
                                    <input
                                        type="text"
                                        value={form.full_name}
                                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Tu nombre real"
                                    />
                                </div>
                            </div>
                        </section>

                        <hr className="border-gray-100" />

                        {/* Security */}
                        <section>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-gray-400" />
                                Seguridad
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nueva Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Min. 6 caracteres"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Déjalo en blanco si no deseas cambiarla.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirmar Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        value={form.confirmPassword}
                                        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Repite la contraseña"
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Cambios
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

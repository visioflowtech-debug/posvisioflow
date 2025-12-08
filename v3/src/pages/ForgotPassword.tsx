import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'http://localhost:5173/update-password',
            });

            if (error) throw error;

            setMessage('Se ha enviado un correo de recuperación. Revisa tu bandeja de entrada.');
        } catch (error: any) {
            console.error('Error sending reset email:', error);
            setError(error.message || 'Error al enviar el correo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-blue-100 p-3 rounded-full mb-4">
                        <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Recuperar Contraseña</h2>
                    <p className="text-gray-500 text-center">Ingresa tu correo para recibir un enlace de recuperación.</p>
                </div>

                {message ? (
                    <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
                        <p>{message}</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleReset} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Correo Electrónico
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="tu@correo.com"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    'Enviar Enlace'
                                )}
                            </button>
                        </form>
                    </>
                )}

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2 font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Volver a Iniciar Sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}

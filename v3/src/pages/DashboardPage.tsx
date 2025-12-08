import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { formatCurrency } from '../lib/formatters';
import {
    Package,
    ShoppingCart,
    History,
    Settings,
    TrendingUp,
    AlertTriangle,
    DollarSign,
    LogOut,
    User,
    Banknote,
    CreditCard
} from 'lucide-react';
import { startOfDay, startOfMonth } from 'date-fns';

export default function Dashboard() {
    const { profile, role, isSuperAdmin } = useCompanyProfile();
    const [stats, setStats] = useState({
        todaySales: 0,
        monthSales: 0,
        lowStockCount: 0,
        cashBalance: 0,
        bankBalance: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const today = startOfDay(new Date()).toISOString();
            const monthStart = startOfMonth(new Date()).toISOString();

            // Today's Sales
            const { data: todayData } = await supabase
                .from('sales')
                .select('total')
                .gte('created_at', today);

            const todayTotal = todayData?.reduce((sum, sale) => sum + sale.total, 0) || 0;

            // Month's Sales
            const { data: monthData } = await supabase
                .from('sales')
                .select('total')
                .gte('created_at', monthStart);

            const monthTotal = monthData?.reduce((sum, sale) => sum + sale.total, 0) || 0;

            // Low Stock
            const { count } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .lt('stock', 5);

            // Financial Accounts
            const { data: accounts } = await supabase
                .from('accounts')
                .select('type, balance');

            const cashBalance = accounts?.find(a => a.type === 'cash')?.balance || 0;
            const bankBalance = accounts?.find(a => a.type === 'bank')?.balance || 0;

            setStats({
                todaySales: todayTotal,
                monthSales: monthTotal,
                lowStockCount: count || 0,
                cashBalance,
                bankBalance
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const currencySymbol = profile?.currency || '$';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {profile?.business_name || 'Dashboard'}
                        </h1>
                        <p className="text-gray-500">Resumen de actividad</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            to="/profile"
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                            <User className="w-4 h-4" />
                            Mi Perfil
                        </Link>
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="flex items-center gap-2 bg-gray-900 border border-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 font-medium transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Salir
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                {/* KPI Cards - Only for Owners/Admins */}
                {role !== 'cashier' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Sales Today */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-green-50 rounded-xl">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">HOY</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium mb-1">Ventas del Día</p>
                                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.todaySales, currencySymbol)}</h3>
                            </div>
                        </div>

                        {/* Sales Month */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <TrendingUp className="w-6 h-6 text-blue-600" />
                                </div>
                                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">MES</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium mb-1">Ventas del Mes</p>
                                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthSales, currencySymbol)}</h3>
                            </div>
                        </div>

                        {/* Cash Balance */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-emerald-50 rounded-xl">
                                    <Banknote className="w-6 h-6 text-emerald-600" />
                                </div>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">CAJA</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium mb-1">Saldo en Efectivo</p>
                                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.cashBalance, currencySymbol)}</h3>
                            </div>
                        </div>

                        {/* Bank Balance */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-indigo-50 rounded-xl">
                                    <CreditCard className="w-6 h-6 text-indigo-600" />
                                </div>
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">BANCOS</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium mb-1">Saldo en Bancos</p>
                                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.bankBalance, currencySymbol)}</h3>
                            </div>
                        </div>
                    </div>
                )}

                {/* Alerts Section (Only if needed) */}
                {stats.lowStockCount > 0 && role !== 'cashier' && (
                    <div className="mb-8 bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-orange-800">Alerta de Inventario</h4>
                            <p className="text-sm text-orange-700">Tienes {stats.lowStockCount} productos con stock bajo (menos de 5 unidades).</p>
                        </div>
                        <Link to="/products" className="ml-auto px-4 py-2 bg-white text-orange-600 text-sm font-bold rounded-lg shadow-sm hover:bg-orange-50 transition-colors">
                            Ver Productos
                        </Link>
                    </div>
                )}
            </div>

            {/* Quick Actions Grid */}
            <h2 className="text-xl font-bold text-gray-900 mb-4">Accesos Directos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link to="/pos" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group">
                    <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <ShoppingCart className="w-6 h-6 text-green-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Punto de Venta</h2>
                    <p className="text-sm text-gray-500">Realizar nueva venta</p>
                </Link>

                <Link to="/products" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group">
                    <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Productos</h2>
                    <p className="text-sm text-gray-500">Gestionar inventario</p>
                </Link>

                {role !== 'cashier' && (
                    <>
                        <Link to="/sales-history" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group">
                            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <History className="w-6 h-6 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Reportes</h2>
                            <p className="text-sm text-gray-500">Ver historial y caja</p>
                        </Link>

                        <Link to="/settings" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group">
                            <div className="bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Settings className="w-6 h-6 text-gray-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Configuración</h2>
                            <p className="text-sm text-gray-500">Ajustes de empresa</p>
                        </Link>

                        <Link to="/purchases" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group">
                            <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <ShoppingCart className="w-6 h-6 text-orange-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Compras</h2>
                            <p className="text-sm text-gray-500">Reponer stock</p>
                        </Link>

                        <Link to="/expenses" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group">
                            <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <DollarSign className="w-6 h-6 text-red-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Gastos</h2>
                            <p className="text-sm text-gray-500">Registrar salidas</p>
                        </Link>

                        <Link to="/financial-reports" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group">
                            <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-6 h-6 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Finanzas</h2>
                            <p className="text-sm text-gray-500">Flujo de caja</p>
                        </Link>

                        <Link to="/team" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group">
                            <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Package className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Equipo</h2>
                            <p className="text-sm text-gray-500">Gestionar usuarios</p>
                        </Link>

                        {/* Super Admin Link - Only visible if authorized */}
                        {isSuperAdmin && (
                            <Link to="/super-admin" className="bg-red-600 p-6 rounded-xl shadow-sm hover:shadow-md hover:bg-red-700 transition-all border border-red-500 group">
                                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <AlertTriangle className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-lg font-bold text-white mb-1">Super Admin</h2>
                                <p className="text-sm text-red-100">Control maestro</p>
                            </Link>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

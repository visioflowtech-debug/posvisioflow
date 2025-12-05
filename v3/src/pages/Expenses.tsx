import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { formatCurrency } from '../lib/formatters';
import { ArrowLeft, Plus, Save, Loader2, Trash2, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface ExpenseCategory {
    id: string;
    name: string;
}

interface Expense {
    id: string;
    amount: number;
    description: string;
    date: string;
    category: {
        name: string;
    };
}

export default function Expenses() {
    const { profile } = useCompanyProfile();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [processing, setProcessing] = useState(false);

    // Category Modal
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [expensesRes, categoriesRes] = await Promise.all([
                supabase
                    .from('expenses')
                    .select('*, category:expense_categories(name)')
                    .order('date', { ascending: false }),
                supabase
                    .from('expense_categories')
                    .select('*')
                    .order('name')
            ]);

            if (expensesRes.error) throw expensesRes.error;
            if (categoriesRes.error) throw categoriesRes.error;

            setExpenses(expensesRes.data || []);
            setCategories(categoriesRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        try {
            const { error } = await supabase
                .from('expenses')
                .insert([{
                    amount: parseFloat(amount),
                    description,
                    category_id: categoryId
                }]);

            if (error) throw error;

            setAmount('');
            setDescription('');
            setCategoryId('');
            fetchData();
            alert('Gasto registrado exitosamente');
        } catch (error: any) {
            console.error('Error adding expense:', error);
            alert(`Error al registrar gasto: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        setCreatingCategory(true);
        try {
            const { data, error } = await supabase
                .from('expense_categories')
                .insert([{ name: newCategoryName }])
                .select()
                .single();

            if (error) throw error;

            setCategories([...categories, data]);
            setCategoryId(data.id); // Auto-select new category
            setShowCategoryModal(false);
            setNewCategoryName('');
        } catch (error: any) {
            console.error('Error creating category:', error);
            alert(`Error al crear categoría: ${error.message}`);
        } finally {
            setCreatingCategory(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este gasto?')) return;

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Error al eliminar el gasto');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Gastos</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Add Expense Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Registrar Nuevo Gasto</h2>

                            <form onSubmit={handleAddExpense} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                    <div className="flex gap-2">
                                        <select
                                            required
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setShowCategoryModal(true)}
                                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                                            title="Nueva Categoría"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                    <textarea
                                        required
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                        placeholder="Detalles del gasto..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 transition-all disabled:opacity-50"
                                >
                                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Registrar Gasto
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Expenses List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800">Historial de Gastos</h2>
                                <div className="text-sm text-gray-500">
                                    Total: <span className="font-bold text-gray-900">{formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0), profile?.currency)}</span>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                            ) : expenses.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">No hay gastos registrados.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold text-gray-700">Fecha</th>
                                                <th className="px-6 py-4 font-semibold text-gray-700">Descripción</th>
                                                <th className="px-6 py-4 font-semibold text-gray-700">Categoría</th>
                                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Monto</th>
                                                <th className="px-6 py-4 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {expenses.map((expense) => (
                                                <tr key={expense.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                                        {format(new Date(expense.date), 'dd/MM/yyyy')}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-900">{expense.description}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                                                            <Tag className="w-3 h-3" />
                                                            {expense.category?.name || 'Sin categoría'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-red-600">
                                                        -{formatCurrency(expense.amount, profile?.currency)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => handleDeleteExpense(expense.id)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Create Category Modal */}
                {showCategoryModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Nueva Categoría</h3>
                            <form onSubmit={handleCreateCategory}>
                                <input
                                    type="text"
                                    autoFocus
                                    required
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                                    placeholder="Nombre de la categoría"
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCategoryModal(false)}
                                        className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creatingCategory}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                                    >
                                        {creatingCategory ? 'Creando...' : 'Crear'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

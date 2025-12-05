import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { formatCurrency } from '../lib/formatters';
import { ArrowLeft, Trash2, Save, Loader2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
}

interface PurchaseItem {
    product_id: number;
    product_name: string;
    quantity: number;
    cost_price: number;
}

export default function Purchases() {
    const { profile } = useCompanyProfile();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [supplierName, setSupplierName] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');
            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const addItem = (product: Product) => {
        const existingItem = items.find(i => i.product_id === product.id);
        if (existingItem) {
            alert('El producto ya está en la lista. Modifica la cantidad en la tabla.');
            return;
        }

        setItems([...items, {
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            cost_price: 0
        }]);
        setSearchTerm(''); // Clear search after adding
    };

    const updateItem = (index: number, field: keyof PurchaseItem, value: number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);
    };

    const handleSubmit = async () => {
        if (!supplierName.trim()) {
            alert('Por favor ingresa el nombre del proveedor.');
            return;
        }
        if (items.length === 0) {
            alert('Agrega al menos un producto a la compra.');
            return;
        }

        setProcessing(true);
        try {
            // Call RPC function to process purchase transactionally
            const { error } = await supabase.rpc('process_purchase', {
                p_supplier_name: supplierName,
                p_total: calculateTotal(),
                p_items: items
            });

            if (error) throw error;

            alert('Compra registrada exitosamente. El stock ha sido actualizado.');
            setSupplierName('');
            setItems([]);
            fetchProducts(); // Refresh stock
        } catch (error: any) {
            console.error('Error processing purchase:', error);
            alert(`Error al registrar la compra: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Registrar Compra</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left: Product Selection */}
                    <div className="md:col-span-1 space-y-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="font-bold text-gray-800 mb-4">Buscar Productos</h2>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Nombre del producto..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>

                            <div className="max-h-[400px] overflow-y-auto space-y-2">
                                {loading ? (
                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                                ) : filteredProducts.length === 0 ? (
                                    <p className="text-gray-500 text-sm text-center">No se encontraron productos.</p>
                                ) : (
                                    filteredProducts.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => addItem(product)}
                                            className="w-full text-left p-3 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 group"
                                        >
                                            <div className="font-medium text-gray-800 group-hover:text-blue-700">{product.name}</div>
                                            <div className="text-xs text-gray-500">Stock actual: {product.stock}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Purchase Details */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                                <input
                                    type="text"
                                    value={supplierName}
                                    onChange={(e) => setSupplierName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Nombre del proveedor"
                                />
                            </div>

                            <div className="overflow-x-auto mb-6">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-sm font-semibold text-gray-700">Producto</th>
                                            <th className="px-4 py-3 text-sm font-semibold text-gray-700 w-24">Cant.</th>
                                            <th className="px-4 py-3 text-sm font-semibold text-gray-700 w-32">Costo Unit.</th>
                                            <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">Subtotal</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                                    Agrega productos desde el panel izquierdo
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-gray-800">{item.product_name}</td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.cost_price}
                                                            onChange={(e) => updateItem(index, 'cost_price', parseFloat(e.target.value) || 0)}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium">
                                                        {formatCurrency(item.quantity * item.cost_price, profile?.currency)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => removeItem(index)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    {items.length > 0 && (
                                        <tfoot className="bg-gray-50 font-bold">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-right text-gray-700">Total Compra:</td>
                                                <td className="px-4 py-3 text-right text-blue-600 text-lg">
                                                    {formatCurrency(calculateTotal(), profile?.currency)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSubmit}
                                    disabled={processing || items.length === 0}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all"
                                >
                                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Registrar Compra
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

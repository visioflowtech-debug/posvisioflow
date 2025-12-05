import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';
import type { Product, CartItem } from '../store/cartStore';
import { useCashStore } from '../store/cashStore';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Minus, CreditCard, Banknote, Lock, Unlock, Printer, CheckCircle, Search } from 'lucide-react';

export default function POS() {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { profile } = useCompanyProfile();
    const { showToast } = useToast();

    // Store Hooks
    const { cart, addToCart, updateQuantity, clearCart, total } = useCartStore();
    const { currentRegister, checkRegisterStatus, openRegister, closeRegister } = useCashStore();

    // Modal States
    const [showOpenRegisterModal, setShowOpenRegisterModal] = useState(false);
    const [showCloseRegisterModal, setShowCloseRegisterModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Form States
    const [openingAmount, setOpeningAmount] = useState('');
    const [closingAmount, setClosingAmount] = useState('');
    const [cashReceived, setCashReceived] = useState('');
    const [processing, setProcessing] = useState(false);
    const [lastSale, setLastSale] = useState<{
        items: CartItem[],
        total: number,
        date: string,
        paymentMethod: 'Efectivo' | 'Tarjeta',
        cashReceived?: number,
        change?: number
    } | null>(null);

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 20;

    useEffect(() => {
        // Initial load
        checkRegisterStatus();
        setPage(0);
        setProducts([]);
        fetchProducts(0, searchTerm, true);
    }, [searchTerm]);

    const fetchProducts = async (pageNumber: number, search: string, isNewSearch: boolean = false) => {
        try {
            let query = supabase
                .from('products')
                .select('*')
                .order('name')
                .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE - 1);

            if (search) {
                query = query.ilike('name', `%${search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            const newProducts = data || [];

            if (isNewSearch) {
                setProducts(newProducts);
            } else {
                setProducts(prev => [...prev, ...newProducts]);
            }

            setHasMore(newProducts.length === PAGE_SIZE);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchProducts(nextPage, searchTerm);
    };

    // No client-side filtering needed anymore
    const filteredProducts = products;

    const handleOpenRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            await openRegister(parseFloat(openingAmount));
            setShowOpenRegisterModal(false);
            setOpeningAmount('');
            showToast('Caja abierta exitosamente', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al abrir caja', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleCloseRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            await closeRegister(parseFloat(closingAmount));
            setShowCloseRegisterModal(false);
            setClosingAmount('');
            showToast('Caja cerrada exitosamente', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al cerrar caja', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handlePayment = async (method: 'Efectivo' | 'Tarjeta') => {
        if (!currentRegister) return;
        setProcessing(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('No user');

            const currentTotal = total();
            const currentCart = [...cart];
            const saleDate = new Date().toISOString();

            // 1. Create Sale
            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .insert([{
                    user_id: user.id,
                    cash_register_id: currentRegister.id,
                    total: currentTotal,
                    payment_method: method,
                    created_at: saleDate
                }])
                .select()
                .single();

            if (saleError) throw saleError;

            // 2. Create Sale Items
            const saleItems = currentCart.map(item => ({
                sale_id: sale.id,
                product_id: item.id,
                product_name: item.name,
                qty: item.qty,
                price: item.price
            }));

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(saleItems);

            if (itemsError) throw itemsError;

            // 3. Update Stock
            for (const item of currentCart) {
                const { data: prod } = await supabase.from('products').select('stock').eq('id', item.id).single();
                if (prod) {
                    await supabase.from('products').update({ stock: prod.stock - item.qty }).eq('id', item.id);
                }
            }

            // Save for printing
            setLastSale({
                items: currentCart,
                total: currentTotal,
                date: saleDate,
                paymentMethod: method,
                cashReceived: method === 'Efectivo' ? parseFloat(cashReceived) : undefined,
                change: method === 'Efectivo' ? parseFloat(cashReceived) - currentTotal : undefined
            });

            setShowPaymentModal(false);
            setShowSuccessModal(true);
            clearCart();
            setCashReceived('');
            fetchProducts(0, searchTerm, true); // Refresh stock
            showToast('Venta registrada exitosamente', 'success');
        } catch (error: any) {
            console.error('Payment error:', error);
            showToast('Error al procesar el pago: ' + error.message, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Left: Product Grid */}
            <div className="flex-1 flex flex-col min-w-0 print:hidden">
                <div className="bg-white p-4 shadow-sm flex items-center justify-between z-10 gap-4">
                    <div className="flex items-center gap-4 min-w-fit">
                        <Link to="/" className="p-2 hover:bg-gray-100 rounded-full">
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </Link>
                        <h1 className="text-xl font-bold text-gray-800 hidden md:block">Punto de Venta</h1>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-md relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white border focus:border-blue-500 rounded-lg outline-none transition-all"
                        />
                    </div>

                    {currentRegister ? (
                        <button
                            onClick={() => setShowCloseRegisterModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium whitespace-nowrap"
                        >
                            <Lock className="w-4 h-4" />
                            <span className="hidden sm:inline">Cerrar Caja</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowOpenRegisterModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium animate-pulse whitespace-nowrap"
                        >
                            <Unlock className="w-4 h-4" />
                            <span className="hidden sm:inline">Abrir Caja</span>
                        </button>
                    )}
                </div>

                {!currentRegister ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                        <Lock className="w-24 h-24 mb-4 text-gray-300" />
                        <h2 className="text-2xl font-bold text-gray-500">Caja Cerrada</h2>
                        <p className="mb-6">Debes abrir la caja para comenzar a vender.</p>
                        <button
                            onClick={() => setShowOpenRegisterModal(true)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg"
                        >
                            Abrir Caja Ahora
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6">
                        {filteredProducts.length === 0 ? (
                            <div className="text-center text-gray-500 py-12">
                                <p className="text-lg">No se encontraron productos.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredProducts.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-transparent hover:border-blue-500 flex flex-col items-center text-center group active:scale-95"
                                        >
                                            <span className="text-4xl mb-3 group-hover:scale-110 transition-transform block">{product.icon}</span>
                                            <h3 className="font-bold text-gray-800 leading-tight mb-1">{product.name}</h3>
                                            <p className="text-blue-600 font-bold">${product.price.toLocaleString('es-CO')}</p>
                                            <p className={`text-xs mt-1 ${product.stock && product.stock < 5 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                                Stock: {product.stock ?? 0}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                                {hasMore && (
                                    <div className="flex justify-center py-4">
                                        <button
                                            onClick={loadMore}
                                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                                        >
                                            Cargar más productos
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Cart Sidebar */}
            <div className="w-96 bg-white shadow-xl flex flex-col border-l border-gray-200 z-20 print:hidden">
                <div className="p-4 bg-blue-600 text-white shadow-md">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        🛒 Orden Actual
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <span className="text-4xl mb-2">🛍️</span>
                            <p>Carrito vacío</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="flex-1 min-w-0 mr-2">
                                    <h4 className="font-bold text-gray-800 truncate">{item.name}</h4>
                                    <p className="text-sm text-gray-500">${item.price.toLocaleString('es-CO')} x {item.qty}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateQuantity(item.id, -1)}
                                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="font-bold w-6 text-center">{item.qty}</span>
                                    <button
                                        onClick={() => updateQuantity(item.id, 1)}
                                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-4 text-xl font-bold text-gray-800">
                        <span>Total</span>
                        <span>${total().toLocaleString('es-CO')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={clearCart}
                            disabled={cart.length === 0}
                            className="col-span-2 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-5 h-5" /> Cancelar
                        </button>
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            disabled={cart.length === 0 || !currentRegister}
                            className="col-span-2 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            Cobrar
                        </button>
                    </div>
                </div>
            </div>

            {/* Open Register Modal */}
            {showOpenRegisterModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">Abrir Caja</h2>
                            <p className="text-gray-500 text-sm">Ingresa el monto inicial en efectivo.</p>
                        </div>
                        <form onSubmit={handleOpenRegister} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Inicial</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={openingAmount}
                                    onChange={(e) => setOpeningAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowOpenRegisterModal(false)}
                                    className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                                >
                                    {processing ? 'Abriendo...' : 'Abrir Caja'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Close Register Modal */}
            {showCloseRegisterModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">Cerrar Caja</h2>
                            <p className="text-gray-500 text-sm">Ingresa el monto final en efectivo.</p>
                        </div>
                        <form onSubmit={handleCloseRegister} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Final (Cierre)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={closingAmount}
                                    onChange={(e) => setClosingAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCloseRegisterModal(false)}
                                    className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"
                                >
                                    {processing ? 'Cerrando...' : 'Cerrar Caja'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 text-center border-b border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-800 mb-1">Cobrar Orden</h2>
                            <p className="text-4xl font-black text-green-600 mt-2">${total().toLocaleString('es-CO')}</p>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Cash Payment Logic */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto Recibido (Efectivo)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={cashReceived}
                                            onChange={(e) => setCashReceived(e.target.value)}
                                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-2xl font-bold text-gray-800"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {parseFloat(cashReceived) >= total() && (
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-green-700 font-medium">Su Cambio:</span>
                                            <span className="text-2xl font-bold text-green-700">
                                                ${(parseFloat(cashReceived) - total()).toLocaleString('es-CO')}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => handlePayment('Efectivo')}
                                        disabled={processing || !cashReceived || parseFloat(cashReceived) < total()}
                                        className="py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-200"
                                    >
                                        <Banknote className="w-5 h-5" />
                                        Cobrar Efectivo
                                    </button>
                                    <button
                                        onClick={() => handlePayment('Tarjeta')}
                                        disabled={processing}
                                        className="py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-200"
                                    >
                                        <CreditCard className="w-5 h-5" />
                                        Cobrar Tarjeta
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
                            <button
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setCashReceived('');
                                }}
                                disabled={processing}
                                className="text-gray-500 hover:text-gray-700 font-medium px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Venta Exitosa!</h2>
                            <p className="text-gray-500 mb-8">La transacción se ha completado correctamente.</p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handlePrint()}
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-200"
                                >
                                    <Printer className="w-5 h-5" />
                                    Imprimir Ticket
                                </button>
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition-colors"
                                >
                                    Nueva Venta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Printable Receipt (Hidden on screen, visible on print) */}
            <div className="hidden print:block print:w-[80mm] print:p-4 bg-white text-black">
                <style type="text/css" media="print">
                    {`
                        @page { size: auto; margin: 0mm; }
                        body { margin: 0px; }
                    `}
                </style>
                <div className="text-center mb-4">
                    <h1 className="text-xl font-bold uppercase">{profile?.business_name || 'Mi Negocio'}</h1>
                    <p className="text-sm text-gray-500">Ticket de Venta</p>
                    <p className="text-xs text-gray-400">{lastSale ? new Date(lastSale.date).toLocaleString() : new Date().toLocaleString()}</p>
                    {lastSale && (
                        <p className="text-xs font-bold mt-1 uppercase">
                            Pago: {lastSale.paymentMethod}
                        </p>
                    )}
                </div>

                <div className="border-t border-b border-black/10 py-2 mb-4 space-y-1">
                    {lastSale?.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.qty} x {item.name}</span>
                            <span>${(item.price * item.qty).toLocaleString('es-CO')}</span>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between font-bold text-lg border-t border-black/10 pt-2">
                    <span>TOTAL</span>
                    <span>${lastSale?.total.toLocaleString('es-CO') || '0'}</span>
                </div>

                {lastSale?.paymentMethod === 'Efectivo' && (
                    <div className="border-t border-black/10 mt-2 pt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                            <span>Recibido:</span>
                            <span>${lastSale.cashReceived?.toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold">
                            <span>Cambio:</span>
                            <span>${lastSale.change?.toLocaleString('es-CO')}</span>
                        </div>
                    </div>
                )}

                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>¡Gracias por su compra!</p>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/formatters';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { ArrowLeft, FileText, Loader2, Package, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Sale {
    id: number;
    total: number;
    payment_method: string;
    created_at: string;
    sale_items: {
        product_name: string;
        qty: number;
        price: number;
    }[];
}

interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
}

interface CashRegister {
    id: number;
    opening_amount: number;
    closing_amount: number | null;
    opened_at: string;
    closed_at: string | null;
    status: string;
}

export default function SalesHistory() {
    const { profile } = useCompanyProfile();
    const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'cashflow'>('sales');
    const [loading, setLoading] = useState(true);

    // Data States
    const [sales, setSales] = useState<Sale[]>([]);
    const [inventory, setInventory] = useState<Product[]>([]);
    const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);

    // Pagination
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 10;
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        setPage(0);
        fetchData(0);
    }, [activeTab]);

    const fetchData = async (pageNumber: number = 0) => {
        setLoading(true);
        try {
            if (activeTab === 'sales') {
                const { data, count, error } = await supabase
                    .from('sales')
                    .select(`*, sale_items (product_name, qty, price)`, { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE - 1);

                if (error) throw error;
                setSales(data || []);
                setTotalCount(count || 0);
            } else if (activeTab === 'inventory') {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .order('name');
                if (error) throw error;
                setInventory(data || []);
            } else if (activeTab === 'cashflow') {
                const { data, error } = await supabase
                    .from('cash_registers')
                    .select('*')
                    .order('opened_at', { ascending: false });
                if (error) throw error;
                setCashRegisters(data || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        fetchData(newPage);
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');
        const companyName = profile?.business_name || 'Mi Empresa';

        doc.setFontSize(18);
        doc.text(companyName, 14, 15);

        doc.setFontSize(12);
        doc.setTextColor(100);

        if (activeTab === 'sales') {
            doc.text('Reporte de Ventas', 14, 25);
            doc.text(`Fecha: ${dateStr}`, 14, 32);
            autoTable(doc, {
                head: [['ID', 'Fecha', 'Método', 'Total']],
                body: sales.map(s => [
                    s.id,
                    format(new Date(s.created_at), 'dd/MM/yyyy HH:mm'),
                    s.payment_method,
                    `$${s.total.toLocaleString('es-CO')}`
                ]),
                startY: 40,
            });
            doc.save(`ventas_${companyName}.pdf`);
        } else if (activeTab === 'inventory') {
            doc.text('Reporte de Inventario', 14, 25);
            doc.text(`Fecha: ${dateStr}`, 14, 32);
            autoTable(doc, {
                head: [['Producto', 'Precio', 'Stock', 'Valor Total']],
                body: inventory.map(p => [
                    p.name,
                    `$${p.price.toLocaleString('es-CO')}`,
                    p.stock,
                    `$${(p.price * (p.stock || 0)).toLocaleString('es-CO')}`
                ]),
                startY: 40,
            });
            doc.save(`inventario_${companyName}.pdf`);
        } else if (activeTab === 'cashflow') {
            doc.text('Reporte de Flujo de Caja', 14, 25);
            doc.text(`Fecha: ${dateStr}`, 14, 32);
            autoTable(doc, {
                head: [['Apertura', 'Cierre', 'Monto Inicial', 'Monto Final', 'Estado']],
                body: cashRegisters.map(c => [
                    format(new Date(c.opened_at), 'dd/MM/yyyy HH:mm'),
                    c.closed_at ? format(new Date(c.closed_at), 'dd/MM/yyyy HH:mm') : '-',
                    formatCurrency(c.opening_amount, profile?.currency),
                    c.closing_amount ? formatCurrency(c.closing_amount, profile?.currency) : '-',
                    c.status === 'open' ? 'Abierta' : 'Cerrada'
                ]),
                startY: 40,
            });
            doc.save(`caja_${companyName}.pdf`);
        }
    };

    const exportExcel = () => {
        const companyName = profile?.business_name || 'Mi Empresa';
        // Create worksheet with company name in A1
        const worksheet = XLSX.utils.aoa_to_sheet([[companyName]]);
        let filename;

        if (activeTab === 'sales') {
            const data = sales.map(s => ({
                ID: s.id,
                Fecha: format(new Date(s.created_at), 'dd/MM/yyyy HH:mm'),
                Metodo: s.payment_method,
                Total: s.total
            }));
            XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A2', skipHeader: false });
            filename = `ventas_${companyName}.xlsx`;
        } else if (activeTab === 'inventory') {
            const data = inventory.map(p => ({
                Producto: p.name,
                Precio: p.price,
                Stock: p.stock,
                ValorTotal: p.price * (p.stock || 0)
            }));
            XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A2', skipHeader: false });
            filename = `inventario_${companyName}.xlsx`;
        } else {
            const data = cashRegisters.map(c => ({
                Apertura: format(new Date(c.opened_at), 'dd/MM/yyyy HH:mm'),
                Cierre: c.closed_at ? format(new Date(c.closed_at), 'dd/MM/yyyy HH:mm') : '-',
                MontoInicial: c.opening_amount,
                MontoFinal: c.closing_amount,
                Estado: c.status
            }));
            XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A2', skipHeader: false });
            filename = `caja_${companyName}.xlsx`;
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
        XLSX.writeFile(workbook, filename);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm transition-colors">
                            <FileText className="w-5 h-5" /> PDF
                        </button>
                        <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors">
                            <FileText className="w-5 h-5" /> Excel
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'sales' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                    >
                        Historial Ventas
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'inventory' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                    >
                        <Package className="w-5 h-5" /> Inventario
                    </button>
                    <button
                        onClick={() => setActiveTab('cashflow')}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'cashflow' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                    >
                        <DollarSign className="w-5 h-5" /> Flujo de Caja
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 min-h-[400px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {activeTab === 'sales' && (
                                <>
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold text-gray-700">ID</th>
                                                <th className="px-6 py-4 font-semibold text-gray-700">Fecha</th>
                                                <th className="px-6 py-4 font-semibold text-gray-700">Items</th>
                                                <th className="px-6 py-4 font-semibold text-gray-700">Método</th>
                                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {sales.map((sale) => (
                                                <tr key={sale.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-medium">#{sale.id}</td>
                                                    <td className="px-6 py-4 text-gray-600">{format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}</td>
                                                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                                                        {sale.sale_items.map(i => `${i.qty}x ${i.product_name}`).join(', ')}
                                                    </td>
                                                    <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded text-sm">{sale.payment_method}</span></td>
                                                    <td className="px-6 py-4 text-right font-bold">{formatCurrency(sale.total, profile?.currency)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {/* Pagination Controls for Sales */}
                                    <div className="flex justify-between items-center bg-white p-4 border-t border-gray-200">
                                        <span className="text-sm text-gray-500">
                                            Mostrando {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount} ventas
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handlePageChange(page - 1)}
                                                disabled={page === 0}
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Anterior
                                            </button>
                                            <button
                                                onClick={() => handlePageChange(page + 1)}
                                                disabled={(page + 1) * PAGE_SIZE >= totalCount}
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Siguiente
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'inventory' && (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-gray-700">Producto</th>
                                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Precio Unit.</th>
                                            <th className="px-6 py-4 font-semibold text-gray-700 text-center">Stock</th>
                                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Valor Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {inventory.map((product) => (
                                            <tr key={product.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                                                <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(product.price, profile?.currency)}</td>
                                                <td className={`px-6 py-4 text-center font-bold ${product.stock < 5 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {product.stock}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                    {formatCurrency(product.price * (product.stock || 0), profile?.currency)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'cashflow' && (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-gray-700">Apertura</th>
                                            <th className="px-6 py-4 font-semibold text-gray-700">Cierre</th>
                                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Monto Inicial</th>
                                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Monto Final</th>
                                            <th className="px-6 py-4 font-semibold text-gray-700 text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {cashRegisters.map((register) => (
                                            <tr key={register.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-gray-600">{format(new Date(register.opened_at), 'dd/MM/yyyy HH:mm')}</td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {register.closed_at ? format(new Date(register.closed_at), 'dd/MM/yyyy HH:mm') : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(register.opening_amount, profile?.currency)}</td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-900">
                                                    {register.closing_amount ? formatCurrency(register.closing_amount, profile?.currency) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${register.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {register.status === 'open' ? 'Abierta' : 'Cerrada'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}

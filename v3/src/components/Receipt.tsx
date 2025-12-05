import React from 'react';
import type { CartItem } from '../store/cartStore';

interface ReceiptProps {
    saleId: number | null;
    date: string;
    items: CartItem[];
    total: number;
    cashReceived?: number;
    change?: number;
    paymentMethod: string;
    companyDetails?: {
        name: string;
        address: string;
        phone: string;
        tax_id: string;
    };
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({
    saleId,
    date,
    items,
    total,
    cashReceived,
    change,
    paymentMethod,
    companyDetails
}, ref) => {
    return (
        <div ref={ref} className="p-4 bg-white text-black font-mono text-sm" style={{ width: '80mm', minHeight: '100mm' }}>
            {/* Header */}
            <div className="text-center mb-4">
                <h1 className="text-xl font-bold uppercase">{companyDetails?.name || 'Mi Tienda POS'}</h1>
                {companyDetails?.tax_id && <p className="text-xs">NIT: {companyDetails.tax_id}</p>}
                {companyDetails?.address && <p className="text-xs">Dirección: {companyDetails.address}</p>}
                {companyDetails?.phone && <p className="text-xs">Tel: {companyDetails.phone}</p>}
            </div>

            {/* Ticket Info */}
            <div className="mb-4 border-b border-black pb-2 border-dashed">
                <p>Ticket #: {saleId || '---'}</p>
                <p>Fecha: {date}</p>
                <p>Cajero: Admin</p>
            </div>

            {/* Items */}
            <div className="mb-4">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-black border-dashed">
                            <th className="py-1">Cant</th>
                            <th className="py-1">Desc</th>
                            <th className="text-right py-1">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td className="py-1 align-top">{item.qty}</td>
                                <td className="py-1 align-top">{item.name}</td>
                                <td className="text-right py-1 align-top">
                                    ${(item.price * item.qty).toLocaleString('es-CO')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="border-t border-black border-dashed pt-2 mb-4">
                <div className="flex justify-between font-bold text-lg">
                    <span>TOTAL:</span>
                    <span>${total.toLocaleString('es-CO')}</span>
                </div>
                {paymentMethod === 'Efectivo' && cashReceived && (
                    <>
                        <div className="flex justify-between text-sm mt-1">
                            <span>Efectivo:</span>
                            <span>${cashReceived.toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Cambio:</span>
                            <span>${(change || 0).toLocaleString('es-CO')}</span>
                        </div>
                    </>
                )}
                <div className="flex justify-between text-sm mt-2">
                    <span>Método:</span>
                    <span>{paymentMethod}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs mt-6">
                <p>¡Gracias por su compra!</p>
                <p>Conserve este ticket para cambios.</p>
                <p className="mt-2 text-[10px]">Sistema POS v3</p>
            </div>
        </div>
    );
});

Receipt.displayName = 'Receipt';

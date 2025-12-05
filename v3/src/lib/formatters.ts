export const formatCurrency = (amount: number, currencySymbol: string = '$') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount).replace('$', currencySymbol);
};

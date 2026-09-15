export interface PricingCalculationResult {
  basePrice: number;
  subsidyDiscount: number;
  finalCashPrice: number;
  installmentsCount: number;
  installmentValue: number;
  formattedInstallments: string;
  discountLabel: string;
  savingsPercentage: number;
}

export function calculateTelecomPricing(
  basePrice: number,
  subsidyValue: number,
  installments: number = 12,
  isPercentage: boolean = false
): PricingCalculationResult {
  const safeBase = Math.max(0, Number(basePrice) || 0);
  const safeInstallments = Math.max(1, Math.min(24, Math.floor(Number(installments) || 12)));

  let discount = 0;
  if (isPercentage) {
    const pct = Math.min(100, Math.max(0, Number(subsidyValue) || 0));
    discount = Math.round((safeBase * (pct / 100)) * 100) / 100;
  } else {
    discount = Math.min(safeBase, Math.max(0, Number(subsidyValue) || 0));
  }

  const finalCash = Math.max(0, Math.round((safeBase - discount) * 100) / 100);
  const rawInstallment = finalCash / safeInstallments;
  const installmentValue = Math.round(rawInstallment * 100) / 100;

  const formattedInstallment = installmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedInstallments = `${safeInstallments}x de ${formattedInstallment} sem juros`;

  const discountLabel = discount > 0 
    ? `Economia de ${discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    : 'Preço de Tabela';

  const savingsPercentage = safeBase > 0 ? Math.round((discount / safeBase) * 100) : 0;

  return {
    basePrice: safeBase,
    subsidyDiscount: discount,
    finalCashPrice: finalCash,
    installmentsCount: safeInstallments,
    installmentValue,
    formattedInstallments,
    discountLabel,
    savingsPercentage
  };
}

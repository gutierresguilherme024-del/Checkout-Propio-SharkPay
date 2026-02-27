export type PaymentMethod = "pix" | "card";

export type CheckoutSettings = {
  headline: string;
  subheadline: string;
  primaryHue: number; // 0-360 for editor preview
  timerEnabled: boolean;
  timerDurationMinutes: number;
  urgencyBarText: string;
  socialProofEnabled: boolean;
  socialProofText: string;
  floatingMessageEnabled: boolean;
  floatingMessageText: string;
  guaranteeText: string;
};

export const defaultCheckoutSettings: CheckoutSettings = {
  headline: "Finalize sua compra em menos de 60 segundos",
  subheadline: "Pagamento seguro via Pix ou Cartão. Liberação automática após confirmação.",
  primaryHue: 190,
  timerEnabled: true,
  timerDurationMinutes: 2,
  urgencyBarText: "Oferta ativa — preço pode mudar a qualquer momento",
  socialProofEnabled: true,
  socialProofText: "Mais de 2.300 compradores nos últimos 30 dias",
  floatingMessageEnabled: true,
  floatingMessageText: "Alguém acabou de comprar agora",
  guaranteeText: "Garantia de 7 dias. Se não for para você, devolvemos 100%.",
};

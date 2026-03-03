import { mundpay } from '../gateways/mundpay';

export async function createPayment(gatewayName: string, data: any) {
    return mundpay.createCharge(data);
}

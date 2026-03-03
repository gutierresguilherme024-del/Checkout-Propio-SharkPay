export interface Gateway {
    createCharge(data: any): Promise<any>
    handleWebhook(payload: any): Promise<any>
}

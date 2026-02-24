export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            checkout_settings: {
                Row: {
                    id: string
                    headline: string
                    subheadline: string
                    primary_hue: number
                    timer_enabled: boolean
                    timer_duration_minutes: number
                    urgency_bar_text: string
                    social_proof_enabled: boolean
                    social_proof_text: string
                    floating_message_enabled: boolean
                    floating_message_text: string
                    guarantee_text: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    headline?: string
                    subheadline?: string
                    primary_hue?: number
                    timer_enabled?: boolean
                    timer_duration_minutes?: number
                    urgency_bar_text?: string
                    social_proof_enabled?: boolean
                    social_proof_text?: string
                    floating_message_enabled?: boolean
                    floating_message_text?: string
                    guarantee_text?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    headline?: string
                    subheadline?: string
                    primary_hue?: number
                    timer_enabled?: boolean
                    timer_duration_minutes?: number
                    urgency_bar_text?: string
                    social_proof_enabled?: boolean
                    social_proof_text?: string
                    floating_message_enabled?: boolean
                    floating_message_text?: string
                    guarantee_text?: string
                    updated_at?: string
                }
            }
            orders: {
                Row: {
                    id: string
                    customer_name: string
                    customer_email: string
                    amount: number
                    status: string
                    payment_method: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    customer_name: string
                    customer_email: string
                    amount: number
                    status?: string
                    payment_method: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    customer_name?: string
                    customer_email?: string
                    amount?: number
                    status?: string
                    payment_method?: string
                    created_at?: string
                }
            }
            produtos: {
                Row: {
                    id: string
                    nome: string
                    descricao: string | null
                    preco: number
                    imagem_url: string | null
                    pdf_storage_key: string | null
                    ativo: boolean
                    criado_em: string
                    atualizado_em: string
                }
                Insert: {
                    id?: string
                    nome: string
                    descricao?: string | null
                    preco: number
                    imagem_url?: string | null
                    pdf_storage_key?: string | null
                    ativo?: boolean
                    criado_em?: string
                    atualizado_em?: string
                }
                Update: {
                    id?: string
                    nome?: string
                    descricao?: string | null
                    preco?: number
                    imagem_url?: string | null
                    pdf_storage_key?: string | null
                    ativo?: boolean
                    criado_em?: string
                    atualizado_em?: string
                }
            }
            pedidos: {
                Row: {
                    id: string
                    produto_id: string | null
                    email_comprador: string
                    nome_comprador: string | null
                    valor: number
                    metodo_pagamento: string | null
                    gateway: string | null
                    gateway_payment_id: string | null
                    status: string
                    entregue: boolean
                    entregue_em: string | null
                    criado_em: string
                }
                Insert: {
                    id?: string
                    produto_id?: string | null
                    email_comprador: string
                    nome_comprador?: string | null
                    valor: number
                    metodo_pagamento?: string | null
                    gateway?: string | null
                    gateway_payment_id?: string | null
                    status?: string
                    entregue?: boolean
                    entregue_em?: string | null
                    criado_em?: string
                }
                Update: {
                    id?: string
                    produto_id?: string | null
                    email_comprador?: string | null
                    nome_comprador?: string | null
                    valor?: number
                    metodo_pagamento?: string | null
                    gateway?: string | null
                    gateway_payment_id?: string | null
                    status?: string
                    entregue?: boolean
                    entregue_em?: string | null
                    criado_em?: string
                }
            }
            configuracoes_entrega: {
                Row: {
                    id: string
                    produto_id: string
                    assunto_email: string | null
                    corpo_email: string | null
                    modo_entrega: string
                    validade_link_dias: number
                    email_remetente: string | null
                    email_remetente_nome: string | null
                    criado_em: string
                }
                Insert: {
                    id?: string
                    produto_id: string
                    assunto_email?: string | null
                    corpo_email?: string | null
                    modo_entrega?: string
                    validade_link_dias?: number
                    email_remetente?: string | null
                    email_remetente_nome?: string | null
                    criado_em?: string
                }
                Update: {
                    id?: string
                    produto_id?: string
                    assunto_email?: string | null
                    corpo_email?: string | null
                    modo_entrega?: string
                    validade_link_dias?: number
                    email_remetente?: string | null
                    email_remetente_nome?: string | null
                    criado_em?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

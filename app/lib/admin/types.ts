export type PartnerType = 'supplier' | 'customer' | 'both';
export type PriceStatus = 'draft' | 'confirmed' | 'archived';
export type InvoiceStatus = 'uploaded' | 'parsing' | 'review_needed' | 'approved';

export interface Partner {
    id: string;
    name: string;
    type: PartnerType;
    business_number?: string;
    contact_name?: string;
    contact_phone?: string;
    address?: string;
    memo?: string;
    status: 'active' | 'inactive';
    created_at: string;
}

export interface Item {
    id: string;
    name: string;
    unit: string; // 'ea', 'set', 'm2'
    category?: string;
    created_at: string;
}

export interface PriceRule {
    id: string;
    partner_id: string;
    item_id: string;
    purchase_price: number;
    sales_price: number;
    margin_rate: number;
    start_date?: string;
    end_date?: string;
    status: PriceStatus;
    created_at: string;
    // Join fields (optional)
    partner?: Partner;
    item?: Item;
}

export interface TransactionInvoice {
    id: string;
    file_url?: string;
    partner_id?: string;
    status: InvoiceStatus;
    ocr_raw_data?: any;
    created_at: string;
    partner?: Partner; // Joined
}

export interface InvoiceItem {
    id: string;
    invoice_id: string;
    raw_item_name: string;
    mapped_item_id?: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    confidence_score: number;
    status: 'pending' | 'confirmed';
    item?: Item; // Joined
}

// ============================================================
// Payment Provider Registry Types
// ============================================================

// ============================================================
// Registry
// ============================================================

export interface PaymentMethodOption {
  code: string;
  name: string;
  groupCode: string;
  groupName: string;
  icon?: string;
  feeLabel?: string;
}

export interface PaymentGroupOption {
  code: string;
  name: string;
  methods: PaymentMethodOption[];
}

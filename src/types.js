// JSDoc typedefs mirroring the Supabase schema. Used purely for editor
// hints — not enforced at runtime.

/**
 * @typedef {object} Project
 * @property {string} id
 * @property {string} title
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {object} BudgetCategory
 * @property {string} id
 * @property {string} project_id
 * @property {string} title
 * @property {number} sort_order
 * @property {string|null} status
 */

/**
 * @typedef {object} BudgetGroup
 * @property {string} id
 * @property {string} category_id
 * @property {string} title
 * @property {number} sort_order
 * @property {string|null} status
 * @property {BudgetCategory} [category]
 */

/**
 * @typedef {object} BudgetLine
 * @property {string} id
 * @property {string} group_id
 * @property {string|null} code
 * @property {string} title
 * @property {number} original_amount
 * @property {number} adjustments_in
 * @property {number} adjustments_out
 * @property {string|null} status
 * @property {string|null} tag
 * @property {number} sort_order
 * @property {BudgetGroup} [group]
 */

/**
 * @typedef {object} ContractMilestone
 * @property {string} id
 * @property {string} contract_id
 * @property {string|null} section_id
 * @property {string} budget_line_id
 * @property {string} title
 * @property {number} original_value
 * @property {string|null} status
 * @property {number} sort_order
 */

/**
 * @typedef {object} ContractSection
 * @property {string} id
 * @property {string} contract_id
 * @property {string} title
 * @property {number} sort_order
 */

/**
 * @typedef {object} Contract
 * @property {string} id
 * @property {string} project_id
 * @property {string} title
 * @property {string|null} reference
 * @property {string|null} vendor
 * @property {string|null} po_number
 * @property {string|null} contract_standard
 * @property {'Approved'|'Pending'|'Part-Approved'} status
 * @property {number} retention_pct
 * @property {number} tax_percent
 * @property {string|null} date_approved
 * @property {ContractMilestone[]} [contract_milestones]
 * @property {ContractSection[]} [contract_sections]
 */

/**
 * @typedef {object} Variation
 * @property {string} id
 * @property {string} contract_id
 * @property {string|null} budget_line_id
 * @property {string|null} reference
 * @property {string} title
 * @property {string|null} description
 * @property {number|null} contract_variation_no
 * @property {'Forecast'|'Pending'|'In Principle'|'Approved'} status
 * @property {string|null} category
 * @property {string|null} date_received
 * @property {string|null} date_approved
 * @property {string|null} date_rejected
 * @property {number|null} requested_amount
 * @property {number} variation_amount
 */

/**
 * @typedef {object} PaymentClaim
 * @property {string} id
 * @property {string} contract_id
 * @property {string|null} reference
 * @property {string|null} title
 * @property {number|null} contract_payment_no
 * @property {'Paid'|'Approved'|'Draft'|'Certified'} status
 * @property {number} claim_amount
 * @property {number|null} submitted_amount
 * @property {number} certified_amount
 * @property {number|null} value_completed
 * @property {number|null} percent_completed
 * @property {number|null} previous_payments
 * @property {number} retention_amount
 * @property {string|null} period_from
 * @property {string|null} period_to
 * @property {string|null} month
 * @property {string|null} date
 */

/**
 * @typedef {object} Forecast
 * @property {string} id
 * @property {string} budget_line_id
 * @property {string} title
 * @property {number} amount
 * @property {string|null} notes
 */

export {};

export interface RevCatWebhookPayload {
  api_version: string;
  event: Event;
}

export interface Event {
  aliases: string[];
  app_id: string;
  app_user_id: string;
  commission_percentage: number;
  country_code: string;
  currency: string;
  entitlement_id: string;
  entitlement_ids: string[];
  environment: string;
  event_timestamp_ms: number;
  expiration_at_ms: number;
  id: string;
  is_family_share: boolean;
  offer_code: string;
  original_app_user_id: string;
  original_transaction_id: string;
  period_type: string;
  presented_offering_id: string;
  price: number;
  price_in_purchased_currency: number;
  product_id: string;
  purchased_at_ms: number;
  store: string;
  subscriber_attributes: SubscriberAttributes;
  takehome_percentage: number;
  tax_percentage: number;
  transaction_id: string;
  type: 'TEST' | 'INITIAL_PURCHASE' | 'RENEWAL' | 'CANCELLATION'; // etc
}

interface SubscriberAttributes {
  '$Favorite Cat': FavoriteCat;
}

interface FavoriteCat {
  updated_at_ms: number;
  value: string;
}

export interface GetSubscriberResponse {
  request_date: Date;
  request_date_ms: number;
  subscriber: Subscriber;
}

export interface Subscriber {
  entitlements: Entitlements;
  first_seen: Date;
  management_url: string;
  non_subscriptions: NonSubscriptions;
  original_app_user_id: string;
  original_application_version: string;
  original_purchase_date: Date;
  other_purchases: object;
  subscriptions: Subscriptions;
}

export interface Entitlements {
  pro: ProCat;
}

export interface ProCat {
  expires_date: null;
  grace_period_expires_date: null;
  product_identifier: string;
  purchase_date: Date;
}

export interface NonSubscriptions {
  onetime: Onetime[];
}

export interface Onetime {
  id: string;
  is_sandbox: boolean;
  purchase_date: Date;
  store: string;
}

// export interface OtherPurchases {}

export interface Subscriptions {
  monthly_full_access: Subcription;
  'pmu.forms.yearly': Subcription;
}

export interface Subcription {
  auto_resume_date: null;
  billing_issues_detected_at: null;
  expires_date: Date;
  grace_period_expires_date: null;
  is_sandbox: boolean;
  original_purchase_date: Date;
  ownership_type: string;
  period_type: string;
  purchase_date: Date;
  refunded_at: null;
  store: string;
  store_transaction_id: string;
  unsubscribe_detected_at: Date | null;
}

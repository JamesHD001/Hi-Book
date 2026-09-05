begin;

create extension if not exists pgtap;

select plan(42);

-- Core schema objects
select has_table('public', 'users', 'users table exists');
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'user_privacy_settings', 'privacy settings table exists');
select has_table('public', 'follows', 'follows table exists');
select has_table('public', 'blocks', 'blocks table exists');
select has_table('public', 'reports', 'reports table exists');
select has_table('public', 'posts', 'posts table exists');
select has_table('public', 'post_media', 'post_media table exists');
select has_table('public', 'comments', 'comments table exists');
select has_table('public', 'conversations', 'conversations table exists');
select has_table('public', 'conversation_participants', 'conversation participants table exists');
select has_table('public', 'messages', 'messages table exists');
select has_table('public', 'message_media', 'message_media table exists');
select has_table('public', 'notifications', 'notifications table exists');
select has_table('public', 'moderation_cases', 'moderation cases table exists');
select has_table('public', 'moderation_actions', 'moderation actions table exists');
select has_table('public', 'admin_roles', 'admin roles table exists');
select has_table('public', 'admin_permissions', 'admin permissions table exists');
select has_table('public', 'analytics_events', 'analytics events table exists');
select has_table('public', 'currencies', 'currencies table exists');
select has_table('public', 'purchases', 'purchases table exists');
select has_table('public', 'payments', 'payments table exists');
select has_table('public', 'payment_attempts', 'payment attempts table exists');
select has_table('public', 'coin_wallets', 'coin wallets table exists');
select has_table('public', 'coin_transactions', 'coin transactions table exists');
select has_table('public', 'coin_transaction_entries', 'coin transaction entries table exists');
select has_table('public', 'financial_accounts', 'financial accounts table exists');
select has_table('public', 'financial_ledger_entries', 'financial ledger entries table exists');
select has_table('public', 'gift_transactions', 'gift transactions table exists');
select has_table('public', 'refunds', 'refunds table exists');
select has_table('public', 'payment_reconciliations', 'payment reconciliations table exists');
select has_table('public', 'product_fulfillment_rules', 'fulfillment rules table exists');
select has_table('public', 'fulfillments', 'fulfillments table exists');
select has_table('public', 'payment_webhook_events', 'payment webhook events table exists');
select has_table('public', 'hbc_recovery_obligations', 'HBC recovery obligations table exists');

-- Critical columns / authorization boundaries
select has_column('public', 'users', 'id', 'users has auth UUID id');
select has_column('public', 'users', 'account_status', 'users has account status');
select has_column('public', 'profiles', 'username_normalized', 'profiles has normalized username');
select has_column('public', 'user_privacy_settings', 'profile_visibility', 'privacy owns profile visibility');
select has_column('public', 'messages', 'sender_id', 'messages has immutable sender identity');
select has_column('public', 'coin_wallets', 'available_balance', 'wallet has projected balance');
select has_column('public', 'financial_ledger_entries', 'transaction_group_id', 'ledger has transaction grouping');
select has_column('public', 'payments', 'provider_reference', 'payments has provider reference');

select * from finish();

rollback;

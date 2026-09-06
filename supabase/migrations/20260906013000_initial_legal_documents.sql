-- Hi!Book 2.0 — initial legal-document registry entries.
-- Legal text is maintained in the web legal pages and must receive legal review
-- before production publication. The database stores the accepted document version.

begin;

insert into public.legal_document (document_type, version, title, effective_at, published_at)
select 'TERMS_OF_USE', '1.0', 'Hi!Book Terms of Use', now(), now()
where not exists (
  select 1 from public.legal_document
  where document_type = 'TERMS_OF_USE' and version = '1.0'
);

insert into public.legal_document (document_type, version, title, effective_at, published_at)
select 'PRIVACY_POLICY', '1.0', 'Hi!Book Privacy Policy', now(), now()
where not exists (
  select 1 from public.legal_document
  where document_type = 'PRIVACY_POLICY' and version = '1.0'
);

commit;

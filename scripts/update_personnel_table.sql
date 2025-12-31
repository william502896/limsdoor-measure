-- Add new columns to "인사" table
-- Base Info
alter table public."인사" add column if not exists "주소" text; -- Address
alter table public."인사" add column if not exists "상세주소" text; -- Detail Address
alter table public."인사" add column if not exists "우편번호" text; -- Zip

-- Personal Info
alter table public."인사" add column if not exists "결혼여부" boolean default false; -- Married?
alter table public."인사" add column if not exists "자녀유무" boolean default false; -- Children?
alter table public."인사" add column if not exists "취미" text; -- Hobbies
alter table public."인사" add column if not exists "비상연락망" text; -- Emergency Contact

-- Career & Vehicle
alter table public."인사" add column if not exists "경력사항" text; -- Career Summary
alter table public."인사" add column if not exists "차량종류" text; -- Vehicle Type
alter table public."인사" add column if not exists "차량소유" boolean default false; -- Vehicle Owned?
alter table public."인사" add column if not exists "차량번호" text; -- License Plate

-- Image
alter table public."인사" add column if not exists "프로필이미지" text; -- Base64 or URL

-- Add comments for clarity
comment on column public."인사"."주소" is 'Address';
comment on column public."인사"."프로필이미지" is 'Profile Image URL or Base64';

-- Debug Latest Submission
-- Check the most recent 3 updated/created schedules and their linked customers

SELECT 
    s.id as schedule_id,
    s.created_at as schedule_created,
    s.customer_id as "Link_CustomerID",
    s.status,
    s.title,
    c.id as "Real_CustomerID",
    c.name as "Customer_Name",
    c.phone as "Customer_Phone"
FROM public.sc_schedules s
LEFT JOIN public.crm_customers c ON s.customer_id = c.id
ORDER BY s.created_at DESC
LIMIT 3;

-- Also check if there are any customers with the same phone number (Duplication check)
SELECT id, name, phone, created_at 
FROM public.crm_customers 
ORDER BY created_at DESC 
LIMIT 5;

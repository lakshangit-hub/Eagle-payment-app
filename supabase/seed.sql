-- ==============================================================================
-- EAGLE CREDIT (PVT) LTD - SEED DATA FOR FIELD TESTING & INITIAL DEPLOYMENT
-- Creates test field officer profile, customers, loan facilities, and guarantors.
-- ==============================================================================

-- 1. Create Field Officer user profile (Note: user must exist in auth.users, e.g. officer@eaglecredit.lk)
-- In production or Supabase Studio, create officer@eaglecredit.lk in Supabase Auth,
-- then insert their ID here:

DO $$
DECLARE
  v_officer_id uuid;
BEGIN
  -- Select existing user or create a fallback demo user if running in local postgres
  SELECT id INTO v_officer_id FROM auth.users WHERE email = 'officer@eaglecredit.lk' LIMIT 1;
  
  IF v_officer_id IS NULL THEN
    -- If user does not exist yet, generate a placeholder UUID for demonstration seed
    v_officer_id := 'a0000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, full_name, officer_code, role, phone)
  VALUES (v_officer_id, 'Field Officer #402', 'OFFICER-402', 'officer', '077 000 0402')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- 2. Insert Customers
  INSERT INTO public.customers (id, name, nic, address, phone, phone2, occupation, assigned_officer_id)
  VALUES
    ('EC-000124', 'Kasun Perera', '200012345678', 'No. 18, Lake Road, Kurunegala', '077 123 4567', '071 456 7890', 'Small business owner', v_officer_id),
    ('EC-000210', 'Kamal Gunawardena', '198523456789', 'No. 84, Temple Road, Alawwa', '071 889 9001', '077 556 6778', 'Bakery & Retail Shop Owner', v_officer_id),
    ('EC-000155', 'Nimali Fernando', '198956712345', 'No. 42, Beach Road, Negombo', '078 234 5678', '072 345 6789', 'Tailoring shop proprietor', v_officer_id),
    ('EC-000189', 'Dinesh Wickramasinghe', '199345678901', 'No. 5, Raja Mawatha, Anuradhapura', '076 345 6789', null, 'Agricultural transport operator', v_officer_id)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    assigned_officer_id = EXCLUDED.assigned_officer_id;

  -- 3. Insert Facilities
  INSERT INTO public.facilities (
    facility_no, customer_id, product, original_amount, balance, installment,
    frequency, tenor, rate, arrears, arrears_rentals, start_date, maturity_date,
    purpose, has_asset, vehicle, make, model, year, market_value, color, status
  )
  VALUES
    ('E26-03-11ACPL', 'EC-000210', 'Commercial Microloan', 250000.00, 185000.00, 18500.00, 'Monthly', '6 / 18', '17.5% per annum', 37000.00, 2, '11/03/2026', '11/09/2027', 'Bakery oven upgrade & inventory', true, 'WP CAD 4912', 'Piaggio', 'Ape Three Wheeler', '2022', 680000.00, 'Blue', 'Active'),
    ('E26-10-02ACPL', 'EC-000124', 'Personal Loan', 60000.00, 45000.00, 5000.00, 'Monthly', '1 / 12', '18% per annum', 0.00, 0, '15/10/2026', '15/10/2027', 'Business expenses', false, null, null, null, null, null, null, 'Active'),
    ('E26-08-14ACPL', 'EC-000124', 'Vehicle Leasing', 850000.00, 792000.00, 31500.00, 'Monthly', '3 / 48', '12.5% per annum', 0.00, 0, '15/08/2026', '15/08/2030', 'Vehicle purchase', true, 'WP BKL 7421', 'Bajaj', 'Pulsar 150', '2024', 750000.00, 'Black', 'Active'),
    ('E26-05-19ACPL', 'EC-000155', 'Micro Enterprise Loan', 120000.00, 80000.00, 10000.00, 'Monthly', '4 / 12', '16% per annum', 0.00, 0, '10/05/2026', '10/05/2027', 'Industrial sewing machine purchase', false, null, null, null, null, null, null, 'Active'),
    ('E26-02-08ACPL', 'EC-000189', 'Equipment Leasing', 1200000.00, 1050000.00, 42000.00, 'Monthly', '8 / 36', '13% per annum', 0.00, 0, '08/02/2026', '08/02/2029', 'Mini tractor leasing', true, 'NC RD 8812', 'Kubota', 'B2420 Tractor', '2023', 1100000.00, 'Orange', 'Active')
  ON CONFLICT (facility_no) DO UPDATE SET
    balance = EXCLUDED.balance,
    arrears = EXCLUDED.arrears,
    installment = EXCLUDED.installment;

  -- 4. Insert Guarantors
  INSERT INTO public.guarantors (customer_id, facility_no, name, relationship, address, phone, nic)
  VALUES
    ('EC-000210', 'E26-03-11ACPL', 'Bandula Gunawardena', 'Brother', 'No. 90, Temple Road, Alawwa', '077 334 4556', '198234567890'),
    ('EC-000124', 'E26-10-02ACPL', 'Ruwan Silva', 'Brother', 'No. 32, Lake Road, Kurunegala', '077 987 6543', '198765432109'),
    ('EC-000124', 'E26-08-14ACPL', 'Sampath Jayasinghe', 'Friend', 'No. 45, Kandy Road, Kurunegala', '071 234 5678', '197654321098'),
    ('EC-000155', 'E26-05-19ACPL', 'Sunil Fernando', 'Spouse', 'No. 42, Beach Road, Negombo', '078 876 5432', '198512345678')
  ON CONFLICT DO NOTHING;

  -- 5. Insert Previous Payments
  INSERT INTO public.payments (receipt_no, facility_no, customer_id, officer_id, amount, status, collected_at, synced_at)
  VALUES
    ('RC-000098', 'E26-03-11ACPL', 'EC-000210', v_officer_id, 18500.00, 'Confirmed', '2026-08-11 10:30:00+05:30', '2026-08-11 10:30:05+05:30'),
    ('RC-000085', 'E26-03-11ACPL', 'EC-000210', v_officer_id, 18500.00, 'Confirmed', '2026-07-11 11:15:00+05:30', '2026-07-11 11:15:08+05:30'),
    ('RC-000124', 'E26-10-02ACPL', 'EC-000124', v_officer_id, 5000.00, 'Confirmed', '2026-10-21 09:20:00+05:30', '2026-10-21 09:20:03+05:30'),
    ('RC-000125', 'E26-08-14ACPL', 'EC-000124', v_officer_id, 31500.00, 'Confirmed', '2026-10-21 09:45:00+05:30', '2026-10-21 09:45:04+05:30'),
    ('RC-000118', 'E26-08-14ACPL', 'EC-000124', v_officer_id, 31500.00, 'Confirmed', '2026-09-21 14:10:00+05:30', '2026-09-21 14:10:06+05:30'),
    ('RC-000110', 'E26-08-14ACPL', 'EC-000124', v_officer_id, 31500.00, 'Confirmed', '2026-08-21 13:50:00+05:30', '2026-08-21 13:50:05+05:30'),
    ('RC-000112', 'E26-05-19ACPL', 'EC-000155', v_officer_id, 10000.00, 'Confirmed', '2026-10-10 16:00:00+05:30', '2026-10-10 16:00:04+05:30'),
    ('RC-000109', 'E26-02-08ACPL', 'EC-000189', v_officer_id, 42000.00, 'Confirmed', '2026-10-08 11:00:00+05:30', '2026-10-08 11:00:07+05:30')
  ON CONFLICT (receipt_no) DO NOTHING;

END $$;

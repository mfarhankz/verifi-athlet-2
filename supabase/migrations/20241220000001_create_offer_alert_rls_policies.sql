-- Enable RLS on offer_alert table if not already enabled
ALTER TABLE offer_alert ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view offer alerts for their customer
CREATE POLICY "Users can view offer alerts for their customer" ON offer_alert
  FOR SELECT
  USING (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert offer alerts for their customer
CREATE POLICY "Users can insert offer alerts for their customer" ON offer_alert
  FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update offer alerts for their customer
CREATE POLICY "Users can update offer alerts for their customer" ON offer_alert
  FOR UPDATE
  USING (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete offer alerts for their customer
CREATE POLICY "Users can delete offer alerts for their customer" ON offer_alert
  FOR DELETE
  USING (
    customer_id IN (
      SELECT customer_id 
      FROM user_customer_map 
      WHERE user_id = auth.uid()
    )
  );

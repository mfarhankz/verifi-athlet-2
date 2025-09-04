// pages/api/inviteUser.js

import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email } = req.body;

    // Validate the email input
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Send the invitation email with the redirectTo parameter
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: 'https://app.verifiedathletics.com/set-password',
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Invitation sent', data });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} not allowed`);
  }
}
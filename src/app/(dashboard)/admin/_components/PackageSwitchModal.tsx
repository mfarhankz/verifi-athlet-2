import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Radio, Button, Space, message, Spin } from 'antd';
import { supabase } from '@/lib/supabaseClient';
import { getPackageIdsBySport } from '@/lib/queries';

interface PackageSwitchModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  customerRecord: {
    id: string;
    customer_id: string;
    school_name: string;
    package_name: string;
    package_id: string | null;
    customer_package_map_id: string | null;
    status: string;
  } | null;
  selectedSport: {
    id: string;
    name: string;
    abbrev: string;
  } | null;
}

interface Package {
  id: string;
  package_name: string;
}

const PackageSwitchModal: React.FC<PackageSwitchModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  customerRecord,
  selectedSport
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [switchReason, setSwitchReason] = useState<'correction' | 'change'>('correction');

  // Load available packages for the selected sport
  useEffect(() => {
    if (visible && selectedSport) {
      loadPackages();
    }
  }, [visible, selectedSport]);

  const loadPackages = async () => {
    if (!selectedSport) return;
    
    setLoadingPackages(true);
    try {
      // Get package IDs for the selected sport using the same approach as admin page
      const packageIds = getPackageIdsBySport(selectedSport.abbrev);
      console.log('Loading packages for sport:', selectedSport.abbrev, 'packageIds:', packageIds);
      
      if (!packageIds || packageIds.length === 0) {
        console.log('No packages found for sport:', selectedSport.abbrev);
        setPackages([]);
        return;
      }

      const { data: packageData, error } = await supabase
        .from('customer_package')
        .select('id, package_name')
        .in('id', packageIds)
        .order('package_name');

      console.log('Package query result:', { packageData, error });

      if (error) {
        console.error('Error loading packages:', error);
        message.error('Failed to load packages');
        return;
      }

      console.log('Setting packages:', packageData);
      setPackages(packageData || []);
    } catch (error) {
      console.error('Error loading packages:', error);
      message.error('Failed to load packages');
    } finally {
      setLoadingPackages(false);
    }
  };


  const handleSubmit = async () => {
    if (!customerRecord || !selectedSport) return;

    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      setLoading(true);

      const { newPackageId, reason } = values;

      if (reason === 'correction') {
        // Just update the package on the existing record
        const { error: updateError } = await supabase
          .from('customer_package_map')
          .update({ customer_package_id: newPackageId })
          .eq('id', customerRecord.customer_package_map_id);

        if (updateError) {
          console.error('Error updating package:', updateError);
          message.error('Failed to update package');
          return;
        }

        message.success('Package updated successfully');
      } else if (reason === 'change') {
        // End current package and create new one
        const currentTime = new Date().toISOString();

        // First, end the current package
        const { error: endError } = await supabase
          .from('customer_package_map')
          .update({ access_end: currentTime })
          .eq('id', customerRecord.customer_package_map_id);

        if (endError) {
          console.error('Error ending current package:', endError);
          message.error('Failed to end current package');
          return;
        }

        // Then create new package mapping
        const { error: createError } = await supabase
          .from('customer_package_map')
          .insert({
            customer_id: customerRecord.customer_id,
            customer_package_id: newPackageId,
            access_start: currentTime,
            access_end: null
          });

        if (createError) {
          console.error('Error creating new package:', createError);
          message.error('Failed to create new package');
          return;
        }

        message.success('Package changed successfully');
      }

      onSuccess();
      form.resetFields();
      setSwitchReason('correction');
    } catch (error) {
      console.error('Error switching package:', error);
      message.error('Failed to switch package');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSwitchReason('correction');
    onCancel();
  };

  if (!customerRecord) return null;

  return (
    <Modal
      title={`Switch Package - ${customerRecord.school_name}`}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          reason: 'correction'
        }}
      >
        <Form.Item
          label="Current Package"
          name="currentPackage"
        >
          <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: '6px' }}>
            {customerRecord.package_name}
          </div>
        </Form.Item>

        <Form.Item
          label="Reason for Switch"
          name="reason"
          rules={[{ required: true, message: 'Please select a reason' }]}
        >
          <Radio.Group 
            value={switchReason} 
            onChange={(e) => setSwitchReason(e.target.value)}
          >
            <Radio value="correction">Correcting a mistake</Radio>
            <Radio value="change">Customer changed packages</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="New Package"
          name="newPackageId"
          rules={[{ required: true, message: 'Please select a new package' }]}
        >
          <Select
            placeholder="Select a new package"
            loading={loadingPackages}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={packages.map(pkg => ({
              value: pkg.id,
              label: pkg.package_name
            }))}
            notFoundContent={loadingPackages ? <Spin size="small" /> : 'No packages found'}
          />
        </Form.Item>

        {switchReason === 'change' && (
          <div style={{ 
            padding: '12px', 
            background: '#fff7e6', 
            border: '1px solid #ffd591', 
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <div style={{ color: '#d46b08', fontWeight: 'bold', marginBottom: '4px' }}>
              ⚠️ Package Change
            </div>
            <div style={{ color: '#d46b08', fontSize: '14px' }}>
              This will end the current package at {new Date().toLocaleString()} and start the new package immediately.
            </div>
          </div>
        )}

        {switchReason === 'correction' && (
          <div style={{ 
            padding: '12px', 
            background: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <div style={{ color: '#389e0d', fontWeight: 'bold', marginBottom: '4px' }}>
              ✓ Correction
            </div>
            <div style={{ color: '#389e0d', fontSize: '14px' }}>
              This will simply change the package without affecting access dates.
            </div>
          </div>
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
            >
              {switchReason === 'correction' ? 'Update Package' : 'Change Package'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PackageSwitchModal;

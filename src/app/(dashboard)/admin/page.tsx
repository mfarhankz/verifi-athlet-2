"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Typography, Table, message, Card, Tag, Input, Space, Button, Modal, Form, Select } from "antd";
import { SettingOutlined, UserOutlined, ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useCustomer, useUser } from "@/contexts/CustomerContext";
import { useZoom } from '@/contexts/ZoomContext';
import { supabase } from "@/lib/supabaseClient";
import { useDebounce } from '@/hooks/useDebounce';

const { Title, Text } = Typography;

// Sport package mappings from queries.ts
const SPORT_PACKAGES: Record<string, number[]> = {
  bsb: [7, 8, 9, 10], // Baseball: Elite, Starter, Package 9, NAIA
  sb: [11, 12, 13, 14],   // Softball
  wbb: [15, 16, 17,18],  // Women's Basketball
  mbb: [19, 20, 21, 22],  // Men's Basketball
  wvol: [23, 24, 25, 26], // Women's Volleyball
  mlax: [27, 28, 29, 30], // Men's Lacrosse
  wlax: [31, 32, 33, 34], // Women's Lacrosse
  mten: [35, 36, 37, 38], // Men's Tennis
  wten: [39, 40, 41, 42], // Women's Tennis
  mglf: [43, 44, 45, 46], // Men's Golf
  wglf: [47, 48, 49, 50], // Women's Golf
  mtaf: [51, 52, 53, 54], // Men's Track & Field
  wtaf: [55, 56, 57, 58], // Women's Track & Field
  mswm: [59, 60, 61, 62], // Men's Swimming
  wswm: [63, 64, 65, 66], // Women's Swimming
  mwre: [67, 68, 69, 70], // Men's Wrestling
  msoc: [2, 71, 72, 73],  // Men's Soccer
  wsoc: [74, 75, 76, 77], // Women's Soccer
};

// Sport ID mappings (from queries.ts)
const SPORT_ID_MAPPING: Record<string, number> = {
  mbb: 1,   // Men's Basketball
  wbb: 2,   // Women's Basketball
  msoc: 3,  // Men's Soccer
  wsoc: 4,  // Women's Soccer
  wvol: 5,  // Women's Volleyball
  bsb: 6,   // Baseball
  sb: 7,    // Softball
  mcc: 8,   // Men's Cross Country
  wcc: 9,   // Women's Cross Country
  mglf: 10, // Men's Golf
  wglf: 11, // Women's Golf
  mlax: 12, // Men's Lacrosse
  wlax: 13, // Women's Lacrosse
  mten: 14, // Men's Tennis
  wten: 15, // Women's Tennis
  mtaf: 16, // Men's Track & Field
  wtaf: 17, // Women's Track & Field
  mswm: 18, // Men's Swimming
  wswm: 19, // Women's Swimming
  mwre: 20, // Men's Wrestling
  fb: 21,   // Football
};

interface SportUser {
  id: string;
  name_first: string;
  name_last: string;
  phone: string | null;
  school_name: string;
  package_name: string;
  access_date: string;
  access_end: string | null;
  customer_id: string;
}

const boxStyle: React.CSSProperties = {
  width: "100%",
  padding: "20px",
  flexDirection: "column",
};

export default function AdminPage() {
  const userDetails = useUser();
  const { zoom } = useZoom();
  const { activeSportAbbrev, activeSportName } = useCustomer();
  const [loading, setLoading] = useState(false);
  const [sportUsers, setSportUsers] = useState<SportUser[]>([]);
  const [searchInput, setSearchInput] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [selectedUsers, setSelectedUsers] = useState<SportUser[]>([]);
  const [disablingAccess, setDisablingAccess] = useState(false);
  
  // Add Customer Modal states
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [addCustomerForm] = Form.useForm();
  const [schools, setSchools] = useState<{id: string, name: string}[]>([]);
  const [packages, setPackages] = useState<{id: number, package_name: string}[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);

  // Load users for the selected sport
  const loadSportUsers = async () => {
    if (!activeSportAbbrev) {
      setSportUsers([]);
      return;
    }

    try {
      setLoading(true);
      
      // Get package IDs for the selected sport
      const packageIds = SPORT_PACKAGES[activeSportAbbrev];
      if (!packageIds || packageIds.length === 0) {
        console.log(`No packages found for sport: ${activeSportAbbrev}`);
        setSportUsers([]);
        return;
      }

      console.log(`Loading users for ${activeSportAbbrev} with packages: ${packageIds}`);

      // Use a multi-step approach to work around potential RLS restrictions
      // Step 1: Get customers with the target packages
      const { data: customersWithPackages, error: packageError } = await supabase
        .from('customer_package_map')
        .select(`
          customer_id,
          customer_package_id,
          customer_package!inner (
            id,
            package_name
          )
        `)
        .in('customer_package_id', packageIds)
        .is('access_end', null);

      if (packageError) {
        console.error('Error fetching customers with packages:', packageError);
        console.error('Package error details:', {
          message: packageError.message,
          code: packageError.code,
          details: packageError.details,
          hint: packageError.hint
        });
        throw packageError;
      }

      if (!customersWithPackages || customersWithPackages.length === 0) {
        console.log('No customers found with target packages');
        setSportUsers([]);
        setLoading(false);
        return;
      }

      const customerIds = customersWithPackages.map((item: any) => item.customer_id);

      // Step 2: Get users associated with these customers
      const { data: userCustomerMappings, error: userMapError } = await supabase
        .from('user_customer_map')
        .select(`
          user_id,
          customer_id,
          created_at,
          access_end
        `)
        .in('customer_id', customerIds);

      if (userMapError) {
        console.error('Error fetching user-customer mappings:', userMapError);
        console.error('User mapping error details:', {
          message: userMapError.message,
          code: userMapError.code,
          details: userMapError.details,
          hint: userMapError.hint
        });
        throw userMapError;
      }

      if (!userCustomerMappings || userCustomerMappings.length === 0) {
        console.log('No user mappings found for customers');
        setSportUsers([]);
        setLoading(false);
        return;
      }

      const userIds = userCustomerMappings.map((item: any) => item.user_id);

      // Step 3: Get user details (in batches to avoid URL length limits)
      let userDetails: any[] = [];
      const batchSize = 100; // Process 100 user IDs at a time
      
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        console.log(`Fetching user details batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(userIds.length/batchSize)} (${batch.length} users)...`);
        
        const { data: batchData, error: batchError } = await supabase
          .from('user_detail')
          .select('id, name_first, name_last, phone')
          .in('id', batch);
        
        if (batchError) {
          console.error('Error fetching user details batch:', batchError);
          console.error('Batch error details:', {
            message: batchError.message,
            code: batchError.code,
            details: batchError.details,
            hint: batchError.hint
          });
          throw batchError;
        }
        
        if (batchData) {
          userDetails = userDetails.concat(batchData);
        }
      }
      
      console.log('Total user details fetched:', userDetails.length);

      // Step 4: Get customer details (including school info)
      const { data: customerDetails, error: customerError } = await supabase
        .from('customer')
        .select(`
          id,
          school!inner (
            name
          )
        `)
        .in('id', customerIds);

      if (customerError) {
        console.error('Error fetching customer details:', customerError);
        console.error('Customer error details:', {
          message: customerError.message,
          code: customerError.code,
          details: customerError.details,
          hint: customerError.hint
        });
        throw customerError;
      }



      // Transform the data using our multi-step results
      // Group by user to combine multiple packages into single rows
      const userMap = new Map<string, SportUser>();
      
      userDetails?.forEach((user: any) => {
        // Find all customer mappings for this user
        const userMappings = userCustomerMappings?.filter((mapping: any) => mapping.user_id === user.id) || [];
        
        userMappings.forEach((mapping: any) => {
          // Find customer details for this mapping
          const customerDetail = customerDetails?.find((customer: any) => customer.id === mapping.customer_id);
          const schoolName = customerDetail?.school?.name || 'Unknown School';
          
          // Find all packages for this customer
          const customerPackages = customersWithPackages?.filter((pkg: any) => pkg.customer_id === mapping.customer_id) || [];
          
          customerPackages.forEach((packageInfo: any) => {
            const packageName = packageInfo.customer_package?.package_name || `Package ${packageInfo.customer_package_id}`;
            
            // Create a unique key for each user-school combination
            const userKey = `${user.id}-${mapping.customer_id}`;
            
            if (userMap.has(userKey)) {
              // User already exists, add package to existing entry
              const existingUser = userMap.get(userKey)!;
              const packages = existingUser.package_name.split(' | ');
              if (!packages.includes(packageName)) {
                existingUser.package_name = [...packages, packageName].join(' | ');
              }
              // Keep the most recent access_end (null takes precedence for active status)
              if (existingUser.access_end && !mapping.access_end) {
                existingUser.access_end = mapping.access_end;
              }
            } else {
              // New user entry
              userMap.set(userKey, {
                id: user.id,
                name_first: user.name_first,
                name_last: user.name_last,
                phone: user.phone || null,
                school_name: schoolName,
                package_name: packageName,
                access_date: mapping.created_at || '',
                access_end: mapping.access_end,
                customer_id: mapping.customer_id
              });
            }
          });
        });
      });
      
      const transformedUsers = Array.from(userMap.values());

      setSportUsers(transformedUsers);

    } catch (error) {
      console.error('Error loading sport users:', error);
      message.error('Failed to load sport users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSportUsers();
  }, [activeSportAbbrev]);

  // Load schools for dropdown
  const loadSchools = async () => {
    setLoadingSchools(true);
    try {
      const { data: schoolData, error } = await supabase
        .from('school')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setSchools(schoolData || []);
    } catch (error) {
      console.error('Error loading schools:', error);
      message.error('Failed to load schools');
    } finally {
      setLoadingSchools(false);
    }
  };

  // Load packages for the selected sport
  const loadPackages = async () => {
    if (!activeSportAbbrev) return;
    
    setLoadingPackages(true);
    try {
      const packageIds = SPORT_PACKAGES[activeSportAbbrev];
      if (!packageIds || packageIds.length === 0) {
        setPackages([]);
        return;
      }

      const { data: packageData, error } = await supabase
        .from('customer_package')
        .select('id, package_name')
        .in('id', packageIds)
        .order('package_name');
      
      if (error) throw error;
      setPackages(packageData || []);
    } catch (error) {
      console.error('Error loading packages:', error);
      message.error('Failed to load packages');
    } finally {
      setLoadingPackages(false);
    }
  };

  // Load packages when sport changes
  useEffect(() => {
    if (isAddCustomerModalOpen) {
      loadPackages();
    }
  }, [activeSportAbbrev, isAddCustomerModalOpen]);

  // Handle opening Add Customer modal
  const handleOpenAddCustomerModal = () => {
    setIsAddCustomerModalOpen(true);
    loadSchools();
    loadPackages();
  };

  // Handle closing Add Customer modal
  const handleCloseAddCustomerModal = () => {
    setIsAddCustomerModalOpen(false);
    addCustomerForm.resetFields();
  };

  // Handle Add Customer form submission
  const handleAddCustomer = async (values: any) => {
    try {
      setSubmittingCustomer(true);
      
      const { school_id, package_ids } = values;
      
      if (!activeSportAbbrev) {
        message.error('Please select a sport first');
        return;
      }

      const sportId = SPORT_ID_MAPPING[activeSportAbbrev];
      if (!sportId) {
        message.error('Invalid sport selected');
        return;
      }

      // Step 1: Create customer
      const { data: customerData, error: customerError } = await supabase
        .from('customer')
        .insert({
          sport_id: sportId,
          school_id: school_id
        })
        .select('id')
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        throw customerError;
      }

      const customerId = customerData.id;
      console.log('Created customer with ID:', customerId);

      // Step 2: Create customer package mappings
      const now = new Date().toISOString();
      const packageMappings = package_ids.map((packageId: number) => ({
        customer_id: customerId,
        customer_package_id: packageId,
        access_start: now
      }));

      const { error: packageError } = await supabase
        .from('customer_package_map')
        .insert(packageMappings);

      if (packageError) {
        console.error('Error creating package mappings:', packageError);
        throw packageError;
      }

      message.success('Customer and packages added successfully!');
      handleCloseAddCustomerModal();
      
      // Reload the users table
      await loadSportUsers();
      
    } catch (error) {
      console.error('Error adding customer:', error);
      message.error('Failed to add customer');
    } finally {
      setSubmittingCustomer(false);
    }
  };

  // Function to disable access for selected users
  const handleDisableAccess = async () => {
    console.log('Disable access button clicked');
    console.log('Selected users:', selectedUsers);
    
    // Debug: Check current user ID
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current authenticated user ID:', session?.user?.id);
    
    if (selectedUsers.length === 0) {
      message.warning('Please select users to disable access for');
      return;
    }

    // Try direct execution first to test if the Modal is the issue
    if (confirm(`Are you sure you want to disable access for ${selectedUsers.length} user(s)? This action will set their access_end date to now.`)) {
      console.log('Confirmation received, starting disable process');
      setDisablingAccess(true);
      try {
        const now = new Date().toISOString();
        console.log('Current timestamp:', now);
        
        // Update each selected user's access_end
        for (const user of selectedUsers) {
          console.log(`Updating user ${user.id} for customer ${user.customer_id}`);
          
          const { data, error } = await supabase
            .from('user_customer_map')
            .update({ access_end: now })
            .eq('user_id', user.id)
            .eq('customer_id', user.customer_id);
          
          console.log('Update result for user', user.id, ':', { data, error });
          
          if (error) {
            console.error('Error disabling access for user:', user.id, error);
            throw error;
          }
        }

        message.success(`Successfully disabled access for ${selectedUsers.length} user(s)`);
        setSelectedUsers([]);
        await loadSportUsers(); // Reload data to reflect changes
      } catch (error) {
        console.error('Error disabling user access:', error);
        message.error('Failed to disable user access');
      } finally {
        setDisablingAccess(false);
      }
    }
  };

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!debouncedSearchQuery) {
      return sportUsers;
    }
    
    const query = debouncedSearchQuery.toLowerCase();
    return sportUsers.filter(user => {
      const firstName = user.name_first?.toLowerCase() || '';
      const lastName = user.name_last?.toLowerCase() || '';
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      const schoolName = user.school_name?.toLowerCase() || '';
      
      return firstName.includes(query) ||
             lastName.includes(query) ||
             fullName.includes(query) ||
             schoolName.includes(query);
    });
  }, [sportUsers, debouncedSearchQuery]);

  const columns = [
    {
      title: 'First Name',
      dataIndex: 'name_first',
      key: 'name_first',
      sorter: (a: SportUser, b: SportUser) => a.name_first.localeCompare(b.name_first),
    },
    {
      title: 'Last Name',
      dataIndex: 'name_last',
      key: 'name_last',
      sorter: (a: SportUser, b: SportUser) => a.name_last.localeCompare(b.name_last),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string | null) => phone || 'N/A',
      sorter: (a: SportUser, b: SportUser) => (a.phone || '').localeCompare(b.phone || ''),
    },
    {
      title: 'School Name',
      dataIndex: 'school_name',
      key: 'school_name',
      sorter: (a: SportUser, b: SportUser) => a.school_name.localeCompare(b.school_name),
    },
    {
      title: 'Status',
      dataIndex: 'access_end',
      key: 'status',
      render: (access_end: string | null) => (
        <Tag color={access_end ? 'red' : 'green'}>
          {access_end ? 'Inactive' : 'Active'}
        </Tag>
      ),
      sorter: (a: SportUser, b: SportUser) => {
        const aActive = !a.access_end;
        const bActive = !b.access_end;
        return aActive === bActive ? 0 : aActive ? -1 : 1; // Active users first
      },
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
      ],
      onFilter: (value: any, record: SportUser) => {
        if (value === 'active') return !record.access_end;
        if (value === 'inactive') return !!record.access_end;
        return true;
      },
    },
    {
      title: 'Package Name',
      dataIndex: 'package_name',
      key: 'package_name',
      render: (packageName: string) => {
        const packages = packageName.split(' | ');
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {packages.map((pkg, index) => (
              <Tag key={index} color="blue">{pkg}</Tag>
            ))}
          </div>
        );
      },
      sorter: (a: SportUser, b: SportUser) => a.package_name.localeCompare(b.package_name),
    },
    {
      title: 'Access Date',
      dataIndex: 'access_date',
      key: 'access_date',
      render: (date: string) => (
        date ? new Date(date).toLocaleDateString() : 'Unknown'
      ),
      sorter: (a: SportUser, b: SportUser) => new Date(a.access_date).getTime() - new Date(b.access_date).getTime(),
    },
  ];

  return (
    <div className="w-full h-full overflow-auto">
      <div 
        style={{ 
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
          paddingBottom: zoom > 100 ? '2rem' : '0',
          paddingRight: zoom > 100 ? '5%' : '0',
          minHeight: zoom > 100 ? `${zoom}vh` : 'auto',
          width: zoom > 100 ? `${Math.max(zoom, 120)}%` : '100%',
          marginBottom: zoom > 100 ? '4rem' : '0'
        }}
      >
        <div style={boxStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={2} style={{ margin: 0 }}>
              <SettingOutlined style={{ marginRight: 8 }} />
              Admin Dashboard
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAddCustomerModal}
              disabled={!activeSportAbbrev}
            >
              Add Customer
            </Button>
          </div>
          <Text type="secondary">
            Welcome, {userDetails?.name_first} {userDetails?.name_last}. 
            {activeSportName ? ` Viewing users for ${activeSportName}.` : ' Select a sport to view users.'}
          </Text>

          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <UserOutlined style={{ marginRight: 8 }} />
                  {activeSportName ? `${activeSportName} Users` : 'Sport Users'}
                  {activeSportAbbrev && (
                    <Tag color="green" style={{ marginLeft: 8 }}>
                      {activeSportAbbrev.toUpperCase()}
                    </Tag>
                  )}
                </div>
                <Space>
                  <Input.Search
                    style={{ width: 300 }}
                    placeholder="Search by name or school..."
                    allowClear
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onSearch={(value) => setSearchInput(value)}
                  />
                  <Button
                    type="primary"
                    danger
                    disabled={selectedUsers.length === 0}
                    loading={disablingAccess}
                    onClick={handleDisableAccess}
                  >
                    Disable Access ({selectedUsers.length})
                  </Button>
                </Space>
              </div>
            }
            style={{ marginTop: 24 }}
          >
            <Table
              columns={columns}
              dataSource={filteredUsers}
              rowKey={(record) => `${record.id}-${record.customer_id}`}
              loading={loading}
              rowSelection={{
                type: 'checkbox',
                selectedRowKeys: selectedUsers.map(user => `${user.id}-${user.customer_id}`),
                onChange: (selectedRowKeys, selectedRows) => {
                  console.log('Row selection changed:', { selectedRowKeys, selectedRows });
                  setSelectedUsers(selectedRows);
                },
                getCheckboxProps: (record: SportUser) => ({
                  disabled: !!record.access_end, // Disable checkbox for already inactive users
                  name: `${record.name_first} ${record.name_last}`,
                }),
              }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
              }}
              scroll={{ x: 'max-content' }}
              locale={{
                emptyText: activeSportAbbrev 
                  ? `No users found for ${activeSportName || activeSportAbbrev}`
                  : 'Select a sport from the dropdown to view users'
              }}
            />
          </Card>

          {/* Add Customer Modal */}
          <Modal
            title="Add Customer"
            open={isAddCustomerModalOpen}
            onCancel={handleCloseAddCustomerModal}
            footer={null}
            width={600}
          >
            <Form
              form={addCustomerForm}
              layout="vertical"
              onFinish={handleAddCustomer}
            >
              <Form.Item
                label="School"
                name="school_id"
                rules={[{ required: true, message: 'Please select a school' }]}
              >
                <Select
                  showSearch
                  placeholder="Search and select a school"
                  loading={loadingSchools}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={schools.map(school => ({
                    value: school.id,
                    label: school.name
                  }))}
                />
              </Form.Item>

              <Form.Item
                label={`${activeSportName || 'Sport'} Packages`}
                name="package_ids"
                rules={[{ required: true, message: 'Please select at least one package' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Select one or more packages"
                  loading={loadingPackages}
                  options={packages.map(pkg => ({
                    value: pkg.id,
                    label: pkg.package_name
                  }))}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={handleCloseAddCustomerModal}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submittingCustomer}
                  >
                    Add Customer
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </div>
    </div>
  );
}

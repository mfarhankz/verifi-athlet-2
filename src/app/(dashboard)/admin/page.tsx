"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Typography, Table, message, Card, Tag, Input, Space, Button, Modal, Form, Select, Tabs, Checkbox, Popconfirm } from "antd";
import { SettingOutlined, UserOutlined, ExclamationCircleOutlined, PlusOutlined, TeamOutlined, DeleteOutlined, AppstoreAddOutlined, DownloadOutlined, CopyOutlined } from '@ant-design/icons';
import { useCustomer, useUser } from "@/contexts/CustomerContext";
import { useZoom } from '@/contexts/ZoomContext';
import { supabase } from "@/lib/supabaseClient";
import { useDebounce } from '@/hooks/useDebounce';
import AdminAlertModal from './_components/AdminAlertModal';
import PackageSwitchModal from './_components/PackageSwitchModal';
import EditViewDataTab from './_components/EditViewDataTab';
import { fetchSchoolsByMultipleDivisions, DivisionType } from '@/utils/schoolUtils';
import {   getPackageIdsBySport,  fetchUserDetailsByIds,  fetchDataTypesInUse, fetchAthleteFactData,  insertAthleteFact, searchAthletes,  checkUserAthleteAccess,  fetchAllSports, fetchAthletesFromSportView,  
  fetchCustomersForSport,  fetchPackageDataForCustomers,  fetchPackagesByIds, fetchAlertsForCustomers,  createCustomer,  createCustomerPackageMappings,  fetchExistingPackagesForCustomer,  
  updateCustomerPackageAccess,  updateUserAccess,  updateUserDetails,  createAlert, endAlerts,  loadSportUsersWithData,  fetchAllCustomersWithPackages} from '@/lib/queries';

const { Title, Text } = Typography;

// Sport package mappings - dynamically generated from PACKAGE_DEFINITIONS
const SPORT_PACKAGES: Record<string, number[]> = {
  fb: getPackageIdsBySport('fb'),
  bsb: getPackageIdsBySport('bsb'),
  sb: getPackageIdsBySport('sb'),
  wbb: getPackageIdsBySport('wbb'),
  mbb: getPackageIdsBySport('mbb'),
  wvol: getPackageIdsBySport('wvol'),
  mlax: getPackageIdsBySport('mlax'),
  wlax: getPackageIdsBySport('wlax'),
  mten: getPackageIdsBySport('mten'),
  wten: getPackageIdsBySport('wten'),
  mglf: getPackageIdsBySport('mglf'),
  wglf: getPackageIdsBySport('wglf'),
  mtaf: getPackageIdsBySport('mtaf'),
  wtaf: getPackageIdsBySport('wtaf'),
  mswm: getPackageIdsBySport('mswm'),
  wswm: getPackageIdsBySport('wswm'),
  mwre: getPackageIdsBySport('mwre'),
  msoc: getPackageIdsBySport('msoc'),
  wsoc: getPackageIdsBySport('wsoc'),
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
  email: string;
  name_first: string;
  name_last: string;
  phone: string | null;
  school_name: string;
  package_name: string;
  access_date: string;
  access_end: string | null;
  customer_id: string;
  last_sign_in_at: string | null;
}

interface AlertData {
  id: number;
  created_at: string;
  customer_id: string;
  user_id: string;
  recipient: string;
  filter: string;
  rule: string;
  ended_at: string | null;
  customer_name: string;
  package_names: string;
  created_by_name: string;
  recipient_names: string;
}

interface Sport {
  id: string;
  name: string;
  abbrev: string;
}

const boxStyle: React.CSSProperties = {
  width: "100%",
  padding: "20px",
  flexDirection: "column",
};

export default function AdminPage() {
  const userDetails = useUser();
  const { zoom } = useZoom();
  const [loading, setLoading] = useState(false);
  const [sportUsers, setSportUsers] = useState<SportUser[]>([]);
  const [searchInput, setSearchInput] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [selectedUsers, setSelectedUsers] = useState<SportUser[]>([]);
  const [disablingAccess, setDisablingAccess] = useState(false);
  const [reactivatingAccess, setReactivatingAccess] = useState(false);
  
  // Refresh button state
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [refreshTimer, setRefreshTimer] = useState<number>(0);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastJobId, setLastJobId] = useState<number | null>(null);
  const [lastJobPid, setLastJobPid] = useState<number | null>(null);
  
  // Local sport selection state (independent from CustomerContext)
  const [allSports, setAllSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [loadingSports, setLoadingSports] = useState(false);
  
  // Add Customer Modal states
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [addCustomerForm] = Form.useForm();
  const [schools, setSchools] = useState<{id: string, name: string}[]>([]);
  const [packages, setPackages] = useState<{id: number, package_name: string}[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);
  
  // Invite User Modal states
  const [isInviteUserModalOpen, setIsInviteUserModalOpen] = useState(false);
  const [inviteUserForm] = Form.useForm();
  const [submittingInvite, setSubmittingInvite] = useState(false);
  
  // Customer selection for invite user
  const [availableCustomers, setAvailableCustomers] = useState<{id: string, school_name: string, packages: string[]}[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  // Customer Management states
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [loadingAllCustomers, setLoadingAllCustomers] = useState(false);
  const [customerSearchInput, setCustomerSearchInput] = useState<string>('');
  const debouncedCustomerSearch = useDebounce(customerSearchInput, 500);
  const [selectedCustomers, setSelectedCustomers] = useState<any[]>([]);
  const [disablingCustomers, setDisablingCustomers] = useState(false);
  
  // Edit User Modal states
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editUserForm] = Form.useForm();
  const [editingUser, setEditingUser] = useState<SportUser | null>(null);
  const [submittingUserEdit, setSubmittingUserEdit] = useState(false);
  
  // Add Package to Customer Modal states
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [addPackageForm] = Form.useForm();
  const [existingCustomers, setExistingCustomers] = useState<{id: string, school_name: string, existing_packages: string[]}[]>([]);
  const [loadingExistingCustomers, setLoadingExistingCustomers] = useState(false);
  const [availablePackagesForAdd, setAvailablePackagesForAdd] = useState<{id: number, package_name: string}[]>([]);
  const [submittingPackageAdd, setSubmittingPackageAdd] = useState(false);
  
  // User Management states
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchInput, setUserSearchInput] = useState<string>('');
  const debouncedUserSearch = useDebounce(userSearchInput, 500);
  const [activeTab, setActiveTab] = useState('sport-users');
  const [recentlyUpdatedUserKey, setRecentlyUpdatedUserKey] = useState<string | null>(null);

  // Alerts states
  const [allAlerts, setAllAlerts] = useState<AlertData[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertSearchInput, setAlertSearchInput] = useState<string>('');
  const debouncedAlertSearch = useDebounce(alertSearchInput, 500);
  
  // Shared user details cache
  const [userDetailsCache, setUserDetailsCache] = useState<Map<string, any>>(new Map());

  // Helper function to get user details with caching
  const getUserDetails = async (userIds: string[]) => {
    const uncachedIds = userIds.filter(id => !userDetailsCache.has(id));
    
    if (uncachedIds.length === 0) {
      // All users are in cache, return them
      return userIds.map(id => userDetailsCache.get(id)).filter(Boolean);
    }

    // Fetch uncached users in batches
    let newUserDetails: any[] = [];
    const batchSize = 500;
    
    for (let i = 0; i < uncachedIds.length; i += batchSize) {
      const batch = uncachedIds.slice(i, i + batchSize);
      // Debug log removed(`Fetching user details batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(uncachedIds.length/batchSize)} (${batch.length} users)...`);
      
      const batchData = await fetchUserDetailsByIds(batch);
      newUserDetails = newUserDetails.concat(batchData);
    }

    // Update cache with new user details
    const newCache = new Map(userDetailsCache);
    newUserDetails.forEach(user => {
      newCache.set(user.id, user);
    });
    setUserDetailsCache(newCache);

    // Return all requested users (from cache + newly fetched)
    return userIds.map(id => newCache.get(id)).filter(Boolean);
  };
  
  // Alert modal states
  const [editingAlert, setEditingAlert] = useState<AlertData | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  
  // Alert selection states for bulk operations
  const [selectedAlertIds, setSelectedAlertIds] = useState<number[]>([]);
  const [endingAlerts, setEndingAlerts] = useState(false);
  
  // Create Alert Modal states
  const [isCreateAlertModalOpen, setIsCreateAlertModalOpen] = useState(false);
  const [createAlertForm] = Form.useForm();
  const [submittingAlert, setSubmittingAlert] = useState(false);
  const [availableCustomersForAlert, setAvailableCustomersForAlert] = useState<{id: string, school_name: string, packages: string[]}[]>([]);
  const [loadingCustomersForAlert, setLoadingCustomersForAlert] = useState(false);
  const [selectedCustomerForAlert, setSelectedCustomerForAlert] = useState<string | null>(null);
  const [teamUsersForAlert, setTeamUsersForAlert] = useState<{id: string, name_first: string, name_last: string}[]>([]);
  const [loadingTeamUsers, setLoadingTeamUsers] = useState(false);
  const [alertRecipientType, setAlertRecipientType] = useState<"staff" | "individual">("individual");

  // Package Switch Modal states
  const [isPackageSwitchModalOpen, setIsPackageSwitchModalOpen] = useState(false);
  const [selectedCustomerForSwitch, setSelectedCustomerForSwitch] = useState<any>(null);

  const [hasAthleteAccess, setHasAthleteAccess] = useState(false);
  const [checkingAthleteAccess, setCheckingAthleteAccess] = useState(true);

  // Edit/View Data tab state
  const [selectedDataType, setSelectedDataType] = useState<string>('');


  // Check if user has athlete access (customer_package_id 3 or 5)
  const checkAthleteAccess = async () => {
    try {
      setCheckingAthleteAccess(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setHasAthleteAccess(false);
        return;
      }

      const hasAccess = await checkUserAthleteAccess(session.user.id);
      setHasAthleteAccess(hasAccess);
    } catch (error) {
      console.error('Error checking athlete access:', error);
      setHasAthleteAccess(false);
    } finally {
      setCheckingAthleteAccess(false);
    }
  };

  // Load all available sports from the database
  const loadAllSports = async () => {
    try {
      setLoadingSports(true);
      const sportsData = await fetchAllSports();
      setAllSports(sportsData);
    } catch (error) {
      console.error('Error loading sports:', error);
      message.error('Failed to load sports');
    } finally {
      setLoadingSports(false);
    }
  };

  // Load users for the selected sport
  const loadSportUsers = async () => {
    if (!selectedSport) {
      setSportUsers([]);
      return;
    }

    try {
      setLoading(true);
      
      // Get package IDs for the selected sport
      const packageIds = SPORT_PACKAGES[selectedSport.abbrev];
      if (!packageIds || packageIds.length === 0) {
        // Debug log removed(`No packages found for sport: ${selectedSport.abbrev}`);
        setSportUsers([]);
        return;
      }

      const transformedUsers = await loadSportUsersWithData(packageIds, getUserDetails);
      setSportUsers(transformedUsers);

    } catch (error) {
      console.error('Error loading sport users:', error);
      message.error('Failed to load sport users');
    } finally {
      setLoading(false);
    }
  };

  // Copy athlete ID to clipboard
  const copyAthleteId = async (athleteId: string) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(athleteId);
        message.success('Athlete ID copied to clipboard');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = athleteId;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          message.success('Athlete ID copied to clipboard');
        } catch (err) {
          message.error('Failed to copy athlete ID');
        }
        
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Failed to copy athlete ID:', error);
      message.error('Failed to copy athlete ID');
    }
  };


  // Load sports on component mount
  useEffect(() => {
    loadAllSports();
    checkAthleteAccess();
  }, []);

  // Load users when sport selection changes
  useEffect(() => {
    loadSportUsers();
  }, [selectedSport]);

  // Load customers when sport changes
  useEffect(() => {
    if (selectedSport) {
      loadCustomersForSport();
    }
  }, [selectedSport]);

  // Load all users when tab changes to user management or search changes
  useEffect(() => {
    if (activeTab === 'user-management') {
      loadAllUsers();
    }
  }, [activeTab, debouncedUserSearch]);

  // Load customers when tab changes to customer management or sport/search changes
  useEffect(() => {
    if (activeTab === 'customer-management') {
      loadAllCustomers();
    }
  }, [activeTab, selectedSport, debouncedCustomerSearch]);

  // Load alerts when tab changes to alerts or sport/search changes
  useEffect(() => {
    if (activeTab === 'alerts') {
      setSelectedAlertIds([]); // Clear selection when reloading alerts
      loadAllAlerts();
    }
  }, [activeTab, selectedSport, debouncedAlertSearch]);


  // Load schools for dropdown (limited to D1, D2, D3, and NAIA)
  const loadSchools = async () => {
    setLoadingSchools(true);
    try {
      const targetDivisions: DivisionType[] = ['D1', 'D2', 'D3', 'NAIA'];
      const schoolData = await fetchSchoolsByMultipleDivisions(targetDivisions);
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
    if (!selectedSport) return;
    
    setLoadingPackages(true);
    try {
      const packageIds = SPORT_PACKAGES[selectedSport.abbrev];
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
  }, [selectedSport, isAddCustomerModalOpen]);

  // Handle opening Add Customer modal
  const handleOpenAddCustomerModal = () => {
    setIsAddCustomerModalOpen(true);
    loadSchools();
    loadPackages();
  };

  // Handle opening Invite User modal
  const handleOpenInviteUserModal = () => {
    setIsInviteUserModalOpen(true);
    if (selectedSport) {
      loadCustomersForSport();
    }
  };

  // Handle closing Add Customer modal
  const handleCloseAddCustomerModal = () => {
    setIsAddCustomerModalOpen(false);
    addCustomerForm.resetFields();
  };

  // Handle opening Add Package to Customer modal
  const handleOpenAddPackageModal = () => {
    setIsAddPackageModalOpen(true);
    if (selectedSport) {
      loadExistingCustomers();
      loadAvailablePackagesForAdd();
    }
  };

  // Handle closing Add Package to Customer modal
  const handleCloseAddPackageModal = () => {
    setIsAddPackageModalOpen(false);
  };

  // Refresh button functions
  const triggerRefresh = async () => {
    console.log('🚀 Triggering refresh operation...');
    console.trace('📍 triggerRefresh called from:'); // This will show the call stack
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/trigger-refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        console.log('✅ Refresh trigger successful, starting polling in 1 minute...');
        console.log('🔄 Setting refresh status to running...');
        setRefreshStatus('running');
        setRefreshTimer(360); // 6 minutes in seconds
        setLastJobId(null); // Reset job ID tracking
        setLastJobPid(null); // Reset PID tracking
        startRefreshPolling();
      } else {
        console.error('❌ Failed to trigger refresh:', response.status);
        setRefreshStatus('failed');
        message.error('Failed to trigger refresh');
      }
    } catch (error) {
      console.error('❌ Error triggering refresh:', error);
      setRefreshStatus('failed');
      message.error('Error triggering refresh');
    }
  };

  const checkRefreshStatus = async () => {
    console.log('🔄 Checking refresh job status...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/refresh-status', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const jobDetails = data.jobDetails;
        
        console.log('📊 Job details received:', jobDetails);
        
        // Handle both array and single object responses
        const job = Array.isArray(jobDetails) ? jobDetails[0] : jobDetails;
        
        if (job) {
          console.log(`📈 Job Status: ${job.status}, Start Time: ${job.start_time}, End Time: ${job.end_time}, Job ID: ${job.jobid}, Job PID: ${job.job_pid || 'N/A'}`);
          
          // Check if job ID changed (indicating a new job started)
          if (job.jobid && lastJobId && job.jobid !== lastJobId && job.status === 'running') {
            console.log(`⚠️ Job ID changed from ${lastJobId} to ${job.jobid} - marking as failed`);
            setRefreshStatus('failed');
            stopRefreshPolling();
            message.error('Refresh job was interrupted by a new job. Please try again.');
            return;
          }
          
          // Check if job PID changed (indicating a new process started)
          if (job.job_pid && lastJobPid && job.job_pid !== lastJobPid && job.status === 'running') {
            console.log(`⚠️ Job PID changed from ${lastJobPid} to ${job.job_pid} - marking as failed`);
            setRefreshStatus('failed');
            stopRefreshPolling();
            message.error('Refresh job was interrupted by a new process. Please try again.');
            return;
          }
          
          // Update the last known job ID and PID
          if (job.jobid) {
            setLastJobId(job.jobid);
          }
          if (job.job_pid) {
            setLastJobPid(job.job_pid);
          }
          
          // Check if job has been running for more than 6 minutes
          if (job.status === 'running' && job.start_time) {
            const startTime = new Date(job.start_time);
            const now = new Date();
            const runningTime = (now.getTime() - startTime.getTime()) / 1000; // seconds
            
            if (runningTime > 360) { // 6 minutes
              console.log(`⏰ Job has been running for ${Math.floor(runningTime / 60)} minutes - marking as failed`);
              setRefreshStatus('failed');
              stopRefreshPolling();
              message.error('Refresh job timed out after 6 minutes. Please try again.');
              return;
            }
          }
          
          if (job.status === 'succeeded') {
            console.log('✅ Refresh job completed successfully!');
            setRefreshStatus('success');
            stopRefreshPolling();
            message.success('Data refresh completed successfully!');
          } else if (job.status === 'failed') {
            console.log('❌ Refresh job failed!');
            setRefreshStatus('failed');
            stopRefreshPolling();
            message.error('Data refresh failed. Please try again.');
          } else {
            console.log(`⏳ Job still running with status: ${job.status}, continuing to poll...`);
          }
          // If status is 'running' or any other status, keep the button light green and continue polling
        } else {
          // No job details found, might still be starting up
          console.log('⏳ No job details found yet, continuing to poll...');
        }
      } else {
        console.error('❌ Failed to check refresh status:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error checking refresh status:', error);
    }
  };

  const startRefreshPolling = () => {
    console.log('⏰ Starting refresh polling - will begin checking status in 1 minute...');
    // Wait 1 minute (60 seconds) before starting to check status
    setTimeout(() => {
      console.log('🔄 Starting status checks every 15 seconds...');
      // Check status every 15 seconds after the initial 1-minute wait
      const interval = setInterval(() => {
        checkRefreshStatus();
      }, 15000);
      setRefreshInterval(interval);
    }, 60000); // 60 seconds = 1 minute

    // Update timer every second
    const timerInterval = setInterval(() => {
      setRefreshTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRefreshPolling = () => {
    if (refreshInterval) {
      console.log('🛑 Stopping refresh polling...');
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  // Check refresh status on component mount
  useEffect(() => {
    const checkInitialRefreshStatus = async () => {
      console.log('🔍 Checking initial refresh status on page load...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/admin/refresh-status', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const jobDetails = data.jobDetails;
          
          console.log('📊 Initial job details:', jobDetails);
          
          // Handle both array and single object responses
          const job = Array.isArray(jobDetails) ? jobDetails[0] : jobDetails;
          
          if (job) {
            console.log('📈 Processing job:', job);
            
            // Check if job has been running for more than 6 minutes
            if (job.status === 'running' && job.start_time) {
              const startTime = new Date(job.start_time);
              const now = new Date();
              const runningTime = (now.getTime() - startTime.getTime()) / 1000; // seconds
              
              if (runningTime > 360) { // 6 minutes
                console.log(`⏰ Found job that has been running for ${Math.floor(runningTime / 60)} minutes - marking as failed`);
                setRefreshStatus('failed');
                return;
              }
            }
            
            if (job.status === 'running') {
              console.log('🔄 Found running refresh job, setting button to running state');
              setRefreshStatus('running');
              setRefreshTimer(360); // 6 minutes in seconds
              setLastJobId(job.jobid || null);
              setLastJobPid(job.job_pid || null);
              startRefreshPolling();
            } else if (job.status === 'succeeded') {
              console.log('✅ Found completed refresh job');
              setRefreshStatus('success');
            } else if (job.status === 'failed') {
              console.log('❌ Found failed refresh job');
              setRefreshStatus('failed');
            } else {
              console.log('ℹ️ Job status is:', job.status, 'button remains idle');
            }
          } else {
            console.log('ℹ️ No job details found, button remains idle');
          }
        } else {
          console.log('⚠️ Could not check initial refresh status:', response.status);
        }
      } catch (error) {
        console.error('❌ Error checking initial refresh status:', error);
      }
    };

    checkInitialRefreshStatus();
  }, []); // Empty dependency array means this runs once on mount

  // Debug refresh status changes
  useEffect(() => {
    console.log('🔄 Refresh status changed to:', refreshStatus);
    console.log('🎨 Button classes should be:', `refresh-button refresh-button-${refreshStatus}`);
  }, [refreshStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRefreshPolling();
    };
  }, [refreshInterval]);

  // Load customers for the selected sport
  const loadCustomersForSport = async () => {
    if (!selectedSport) {
      setAvailableCustomers([]);
      return;
    }

    try {
      setLoadingCustomers(true);
      
      const sportId = SPORT_ID_MAPPING[selectedSport.abbrev];
      if (!sportId) {
        console.error('Invalid sport selected');
        setAvailableCustomers([]);
        return;
      }

      // Get customers for the selected sport with school information
      const customersData = await fetchCustomersForSport(sportId);

      if (!customersData || customersData.length === 0) {
        setAvailableCustomers([]);
        return;
      }

      // Get package information for each customer
      const customerIds = customersData.map((customer: any) => customer.id);
      const packageData = await fetchPackageDataForCustomers(customerIds);

      // Combine customer and package data
      const enrichedCustomers = customersData.map((customer: any) => {
        const customerPackages = packageData?.filter((pkg: any) => pkg.customer_id === customer.id) || [];
        const packageNames = customerPackages.map((pkg: any) => pkg.customer_package?.package_name || 'Unknown Package');
        
        return {
          id: customer.id,
          school_name: customer.school?.name || 'Unknown School',
          packages: packageNames,
        };
      });

      setAvailableCustomers(enrichedCustomers);
      
    } catch (error) {
      console.error('Error loading customers:', error);
      message.error('Failed to load customers');
      setAvailableCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Load existing customers for adding packages
  const loadExistingCustomers = async () => {
    if (!selectedSport) {
      setExistingCustomers([]);
      return;
    }

    try {
      setLoadingExistingCustomers(true);
      
      const sportId = SPORT_ID_MAPPING[selectedSport.abbrev];
      if (!sportId) {
        console.error('Invalid sport selected');
        setExistingCustomers([]);
        return;
      }

      // Get customers for the selected sport with school information
      const { data: customersData, error: customersError } = await supabase
        .from('customer')
        .select(`
          id,
          sport_id,
          school_id,
          school!inner (
            name
          )
        `)
        .eq('sport_id', sportId);

      if (customersError) {
        console.error('Error fetching customers:', customersError);
        throw customersError;
      }

      if (!customersData || customersData.length === 0) {
        setExistingCustomers([]);
        return;
      }

      // Get existing package information for each customer
      const customerIds = customersData.map((customer: any) => customer.id);
      const { data: packageData, error: packageError } = await supabase
        .from('customer_package_map')
        .select(`
          customer_id,
          customer_package!inner (
            id,
            package_name
          )
        `)
        .in('customer_id', customerIds)
        .is('access_end', null); // Only active packages

      if (packageError) {
        console.error('Error fetching package data:', packageError);
        // Continue without package info
      }

      // Combine customer and existing package data
      const enrichedCustomers = customersData.map((customer: any) => {
        const customerPackages = packageData?.filter((pkg: any) => pkg.customer_id === customer.id) || [];
        const existingPackageNames = customerPackages.map((pkg: any) => pkg.customer_package?.package_name || 'Unknown Package');
        
        return {
          id: customer.id,
          school_name: customer.school?.name || 'Unknown School',
          existing_packages: existingPackageNames,
        };
      });

      setExistingCustomers(enrichedCustomers);
      
    } catch (error) {
      console.error('Error loading existing customers:', error);
      message.error('Failed to load existing customers');
      setExistingCustomers([]);
    } finally {
      setLoadingExistingCustomers(false);
    }
  };

  // Load available packages for adding to customers
  const loadAvailablePackagesForAdd = async () => {
    if (!selectedSport) return;
    
    try {
      const packageIds = SPORT_PACKAGES[selectedSport.abbrev];
      if (!packageIds || packageIds.length === 0) {
        setAvailablePackagesForAdd([]);
        return;
      }

      const packageData = await fetchPackagesByIds(packageIds);
      setAvailablePackagesForAdd(packageData);
    } catch (error) {
      console.error('Error loading packages for add:', error);
      message.error('Failed to load available packages');
    }
  };

  // Load all customers for customer management
  const loadAllCustomers = async () => {
    if (!selectedSport) {
      setAllCustomers([]);
      return;
    }

    try {
      setLoadingAllCustomers(true);
      
      const sportId = SPORT_ID_MAPPING[selectedSport.abbrev];
      if (!sportId) {
        console.error('Invalid sport selected');
        setAllCustomers([]);
        return;
      }

      // Get customers for the selected sport with school information
      const customerPackageRows = await fetchAllCustomersWithPackages(sportId);
      setAllCustomers(customerPackageRows);
      
    } catch (error) {
      console.error('Error loading customers:', error);
      message.error(error instanceof Error ? error.message : 'Failed to load customers');
      setAllCustomers([]);
    } finally {
      setLoadingAllCustomers(false);
    }
  };

  // Load all users for user management
  const loadAllUsers = async () => {
    try {
      setLoadingUsers(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        message.error('You must be logged in to view users');
        return;
      }

      const response = await fetch(`/api/admin/list-users?search=${encodeURIComponent(debouncedUserSearch)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load users');
      }

      setAllUsers(result.users || []);
      
    } catch (error) {
      console.error('Error loading users:', error);
      message.error(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load all alerts for the selected sport
  const loadAllAlerts = async () => {
    if (!selectedSport) {
      setAllAlerts([]);
      return;
    }

    try {
      setLoadingAlerts(true);
      
      const sportId = SPORT_ID_MAPPING[selectedSport.abbrev];
      if (!sportId) {
        console.error('Invalid sport selected');
        setAllAlerts([]);
        return;
      }

      // Step 1: Get customers for the selected sport
      const customersData = await fetchCustomersForSport(sportId);

      if (!customersData || customersData.length === 0) {
        setAllAlerts([]);
        return;
      }

      const customerIds = customersData.map((customer: any) => customer.id);

      // Step 2: Get alerts for these customers
      const alertsData = await fetchAlertsForCustomers(customerIds);

      if (!alertsData || alertsData.length === 0) {
        setAllAlerts([]);
        return;
      }

      // Step 3: Get package information for each customer
      const { data: packageData, error: packageError } = await supabase
        .from('customer_package_map')
        .select(`
          customer_id,
          customer_package!inner (
            package_name
          )
        `)
        .in('customer_id', customerIds)
        .is('access_end', null);

      if (packageError) {
        console.error('Error fetching package data:', packageError);
        // Continue without package info
      }

      // Step 4: Get user details for created_by users using cache
      const creatorUserIds = [...new Set(alertsData.map((alert: any) => alert.user_id))] as string[];
      const creatorUsers = await getUserDetails(creatorUserIds);

      // Step 5: Get user details for recipients using cache
      const allRecipientIds = [...new Set(
        alertsData
          .filter((alert: any) => alert.recipient !== "entire_staff")
          .flatMap((alert: any) => alert.recipient.split(",").map((id: string) => id.trim()))
          .filter(Boolean)
      )] as string[];

      let recipientUsers: any[] = [];
      if (allRecipientIds.length > 0) {
        recipientUsers = await getUserDetails(allRecipientIds);
      }

      // Step 6: Transform and combine all data
      const transformedAlerts: AlertData[] = alertsData.map((alert: any) => {
        // Get customer info
        const customer = customersData.find((c: any) => c.id === alert.customer_id);
        const customerName = customer?.school?.name || 'Unknown School';

        // Get package names for this customer
        const customerPackages = packageData?.filter((pkg: any) => pkg.customer_id === alert.customer_id) || [];
        const packageNames = customerPackages.map((pkg: any) => pkg.customer_package?.package_name).join(', ') || 'No packages';

        // Get creator name
        const creator = creatorUsers?.find((user: any) => user.id === alert.user_id);
        const createdByName = creator ? `${creator.name_first || ''} ${creator.name_last || ''}`.trim() : 'Unknown User';

        // Get recipient names
        let recipientNames = '';
        if (alert.recipient === 'entire_staff') {
          recipientNames = 'Entire Staff';
        } else {
          const recipientIds = alert.recipient.split(',').map((id: string) => id.trim());
          const names = recipientIds.map((id: string) => {
            const user = recipientUsers.find((u: any) => u.id === id);
            return user ? `${user.name_first || ''} ${user.name_last || ''}`.trim() : id;
          });
          recipientNames = names.join(', ');
        }

        return {
          id: alert.id,
          created_at: alert.created_at,
          customer_id: alert.customer_id,
          user_id: alert.user_id,
          recipient: alert.recipient,
          filter: alert.filter || '',
          rule: alert.rule || '',
          ended_at: alert.ended_at,
          customer_name: customerName,
          package_names: packageNames,
          created_by_name: createdByName,
          recipient_names: recipientNames,
        };
      });

      setAllAlerts(transformedAlerts);
      
    } catch (error) {
      console.error('Error loading alerts:', error);
      message.error(error instanceof Error ? error.message : 'Failed to load alerts');
      setAllAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  };

  // Handle Invite User form submission
  const handleInviteUser = async (values: any) => {
    try {
      setSubmittingInvite(true);
      
      const { email, firstName, lastName, phone, customerId } = values;
      
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        message.error('You must be logged in to invite users');
        return;
      }

      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          phone,
          customerId,
          sendEmail: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to invite user');
      }

      const selectedCustomer = availableCustomers.find(c => c.id === customerId);
      const customerInfo = selectedCustomer ? ` for ${selectedCustomer.school_name}` : '';
      message.success(`Invitation sent to ${email}${customerInfo} - Email confirmed automatically`);
      setIsInviteUserModalOpen(false);
      inviteUserForm.resetFields();
      
      // Reload users if on user management tab
      if (activeTab === 'user-management') {
        loadAllUsers();
      }
      
    } catch (error) {
      console.error('Error inviting user:', error);
      message.error(error instanceof Error ? error.message : 'Failed to invite user');
    } finally {
      setSubmittingInvite(false);
    }
  };

  // Handle Add Customer form submission
  const handleAddCustomer = async (values: any) => {
    try {
      setSubmittingCustomer(true);
      
      const { school_id, package_ids } = values;
      
      if (!selectedSport) {
        message.error('Please select a sport first');
        return;
      }

      const sportId = SPORT_ID_MAPPING[selectedSport.abbrev];
      if (!sportId) {
        message.error('Invalid sport selected');
        return;
      }

      // Step 1: Create customer
      const customerData = await createCustomer(sportId, school_id);
      const customerId = customerData.id;

      // Step 2: Create customer package mappings
      const now = new Date().toISOString();
      const packageMappings = package_ids.map((packageId: number) => ({
        customer_id: customerId,
        customer_package_id: packageId,
        access_start: now
      }));

      await createCustomerPackageMappings(packageMappings);

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

  // Handle Add Package to Customer form submission
  const handleAddPackageToCustomer = async (values: any) => {
    try {
      setSubmittingPackageAdd(true);
      
      const { customer_id, package_ids } = values;
      
      if (!selectedSport) {
        message.error('Please select a sport first');
        return;
      }

      // Get existing active packages for this customer
      const existingPackages = await fetchExistingPackagesForCustomer(customer_id);
      const existingPackageIds = existingPackages?.map((pkg: any) => pkg.customer_package_id) || [];

      // Filter out packages that the customer already has
      const newPackageIds = package_ids.filter((packageId: number) => 
        !existingPackageIds.includes(packageId)
      );

      if (newPackageIds.length === 0) {
        message.warning('The selected customer already has all the selected packages');
        return;
      }

      // Create customer package mappings for new packages only
      const now = new Date().toISOString();
      const packageMappings = newPackageIds.map((packageId: number) => ({
        customer_id: customer_id,
        customer_package_id: packageId,
        access_start: now
      }));

      await createCustomerPackageMappings(packageMappings);

      const skippedCount = package_ids.length - newPackageIds.length;
      let successMessage = `Successfully added ${newPackageIds.length} package(s)`;
      if (skippedCount > 0) {
        successMessage += ` (${skippedCount} package(s) were already assigned)`;
      }
      
      message.success(successMessage);
      handleCloseAddPackageModal();
      
      // Reload the relevant data
      await loadSportUsers();
      if (activeTab === 'customer-management') {
        await loadAllCustomers();
      }
      
    } catch (error) {
      console.error('Error adding packages to customer:', error);
      message.error('Failed to add packages to customer');
    } finally {
      setSubmittingPackageAdd(false);
    }
  };

  // Function to disable access for selected customer packages
  const handleDisableCustomers = async () => {
    if (selectedCustomers.length === 0) {
      message.warning('Please select packages to disable access for');
      return;
    }

    // Filter out packages that don't have a mapping ID (e.g., 'No Package' entries)
    const validPackages = selectedCustomers.filter(item => item.customer_package_map_id);
    
    if (validPackages.length === 0) {
      message.warning('No valid packages selected for disabling');
      return;
    }

    if (confirm(`Are you sure you want to disable access for ${validPackages.length} package(s)? This action will set their access_end date to now.`)) {
      setDisablingCustomers(true);
      try {
        const now = new Date().toISOString();
        
        // Update each selected package mapping directly
        // RLS will automatically enforce admin access permissions
        const packageMapIds = validPackages.map(item => item.customer_package_map_id);
        
        await updateCustomerPackageAccess(packageMapIds, now);

        message.success(`Successfully disabled access for ${validPackages.length} package(s)`);
        setSelectedCustomers([]);
        await loadAllCustomers(); // Reload data to reflect changes
      } catch (error) {
        console.error('Error disabling package access:', error);
        message.error('Failed to disable package access');
      } finally {
        setDisablingCustomers(false);
      }
    }
  };

  // Function to disable access for selected users
  const handleDisableAccess = async () => {
    // Debug log removed('Disable access button clicked');
    // Debug log removed('Selected users:', selectedUsers);
    
    // Debug: Check current user ID
    const { data: { session } } = await supabase.auth.getSession();
    // Debug log removed('Current authenticated user ID:', session?.user?.id);
    
    if (selectedUsers.length === 0) {
      message.warning('Please select users to disable access for');
      return;
    }

    // Try direct execution first to test if the Modal is the issue
    if (confirm(`Are you sure you want to disable access for ${selectedUsers.length} user(s)? This action will set their access_end date to now.`)) {
      // Debug log removed('Confirmation received, starting disable process');
      setDisablingAccess(true);
      try {
        const now = new Date().toISOString();
        // Debug log removed('Current timestamp:', now);
        
        // Update each selected user's access_end
        for (const user of selectedUsers) {
          // Debug log removed(`Updating user ${user.id} for customer ${user.customer_id}`);
          
          await updateUserAccess(user.id, user.customer_id, now);
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

  // Function to reactivate access for selected users
  const handleReactivateAccess = async () => {
    // Debug log removed('Reactivate access button clicked');
    // Debug log removed('Selected users:', selectedUsers);
    
    if (selectedUsers.length === 0) {
      message.warning('Please select users to reactivate access for');
      return;
    }

    // Filter only inactive users (those with access_end set)
    const inactiveUsers = selectedUsers.filter(user => user.access_end);
    
    if (inactiveUsers.length === 0) {
      message.warning('No inactive users selected. Please select users with disabled access.');
      return;
    }

    if (confirm(`Are you sure you want to reactivate access for ${inactiveUsers.length} user(s)? This will restore their access.`)) {
      // Debug log removed('Confirmation received, starting reactivate process');
      setReactivatingAccess(true);
      try {
        // Update each selected inactive user's access_end to null
        for (const user of inactiveUsers) {
          // Debug log removed(`Reactivating user ${user.id} for customer ${user.customer_id}`);
          
          await updateUserAccess(user.id, user.customer_id, null);
        }

        message.success(`Successfully reactivated access for ${inactiveUsers.length} user(s)`);
        setSelectedUsers([]);
        await loadSportUsers(); // Reload data to reflect changes
      } catch (error) {
        console.error('Error reactivating user access:', error);
        message.error('Failed to reactivate user access');
      } finally {
        setReactivatingAccess(false);
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
      const email = user.email?.toLowerCase() || '';
      const firstName = user.name_first?.toLowerCase() || '';
      const lastName = user.name_last?.toLowerCase() || '';
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      const schoolName = user.school_name?.toLowerCase() || '';
      
      return email.includes(query) ||
             firstName.includes(query) ||
             lastName.includes(query) ||
             fullName.includes(query) ||
             schoolName.includes(query);
    });
  }, [sportUsers, debouncedSearchQuery]);

  // CSV Export function
  const exportToCSV = () => {
    if (filteredUsers.length === 0) {
      message.warning('No data to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'Email',
      'First Name',
      'Last Name',
      'Phone',
      'School Name',
      'Package Name',
      'Access Date',
      'Access End',
      'Last Sign In',
      'Customer ID'
    ];

    // Convert data to CSV format
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(user => [
        `"${user.email || ''}"`,
        `"${user.name_first || ''}"`,
        `"${user.name_last || ''}"`,
        `"${user.phone || ''}"`,
        `"${user.school_name || ''}"`,
        `"${user.package_name || ''}"`,
        `"${user.access_date || ''}"`,
        `"${user.access_end || ''}"`,
        `"${user.last_sign_in_at || ''}"`,
        `"${user.customer_id || ''}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const fileName = selectedSport 
      ? `${selectedSport.name}_users_${new Date().toISOString().split('T')[0]}.csv`
      : `sport_users_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success(`Exported ${filteredUsers.length} users to CSV`);
  };

  // Filter customer packages based on search query
  const filteredCustomers = useMemo(() => {
    if (!debouncedCustomerSearch) {
      return allCustomers;
    }
    
    const query = debouncedCustomerSearch.toLowerCase();
    return allCustomers.filter(customerPackage => {
      const schoolName = customerPackage.school_name?.toLowerCase() || '';
      const packageName = customerPackage.package_name?.toLowerCase() || '';
      
      return schoolName.includes(query) || packageName.includes(query);
    });
  }, [allCustomers, debouncedCustomerSearch]);

  // Filter alerts based on search query
  const filteredAlerts = useMemo(() => {
    if (!debouncedAlertSearch) {
      return allAlerts;
    }
    
    const query = debouncedAlertSearch.toLowerCase();
    return allAlerts.filter(alert => {
      const customerName = alert.customer_name?.toLowerCase() || '';
      const packageNames = alert.package_names?.toLowerCase() || '';
      const createdByName = alert.created_by_name?.toLowerCase() || '';
      const recipientNames = alert.recipient_names?.toLowerCase() || '';
      const rule = alert.rule?.toLowerCase() || '';
      const filter = alert.filter?.toLowerCase() || '';
      
      return customerName.includes(query) ||
             packageNames.includes(query) ||
             createdByName.includes(query) ||
             recipientNames.includes(query) ||
             rule.includes(query) ||
             filter.includes(query);
    });
  }, [allAlerts, debouncedAlertSearch]);


  // Handle opening Edit User modal
  const handleOpenEditUserModal = (user: SportUser) => {
    setEditingUser(user);
    editUserForm.setFieldsValue({
      name_first: user.name_first,
      name_last: user.name_last,
      phone: user.phone,
    });
    setIsEditUserModalOpen(true);
  };

  // Handle closing Edit User modal
  const handleCloseEditUserModal = () => {
    setIsEditUserModalOpen(false);
    setEditingUser(null);
    editUserForm.resetFields();
  };

  // Handle Edit User form submission
  const handleEditUser = async (values: any) => {
    if (!editingUser) return;
    
    try {
      setSubmittingUserEdit(true);
      
      const { name_first, name_last, phone } = values;
      
      await updateUserDetails(editingUser.id, {
        name_first,
        name_last,
        phone
      });

      message.success(`User details updated successfully!`);
      handleCloseEditUserModal();
      
      // Reload the users table to reflect changes
      await loadSportUsers();
      const rowKey = `${editingUser.id}-${editingUser.customer_id}`;
      setRecentlyUpdatedUserKey(rowKey);
      setTimeout(() => setRecentlyUpdatedUserKey(null), 2000);
      
    } catch (error) {
      console.error('Error updating user:', error);
      message.error('Failed to update user details');
    } finally {
      setSubmittingUserEdit(false);
    }
  };

  // Sport users table columns
  const sportUserColumns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a: SportUser, b: SportUser) => a.email.localeCompare(b.email),
      width: 200,
    },
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
      render: (phone: string | null) => (phone || 'N/A'),
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
    {
      title: 'Last Sign In',
      dataIndex: 'last_sign_in_at',
      key: 'last_sign_in_at',
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : 'Never',
      sorter: (a: SportUser, b: SportUser) => {
        if (!a.last_sign_in_at && !b.last_sign_in_at) return 0;
        if (!a.last_sign_in_at) return 1;
        if (!b.last_sign_in_at) return -1;
        return new Date(a.last_sign_in_at).getTime() - new Date(b.last_sign_in_at).getTime();
      },
    },
  ];

  // Customer-Package management table columns
  const customerColumns = [
    {
      title: 'School Name',
      dataIndex: 'school_name',
      key: 'school_name',
      sorter: (a: any, b: any) => a.school_name.localeCompare(b.school_name),
    },
    {
      title: 'Package',
      dataIndex: 'package_name',
      key: 'package_name',
      render: (packageName: string, record: any) => (
        <Tag 
          color={packageName === 'No Package' ? 'default' : 'blue'}
          style={{ 
            cursor: record.customer_package_map_id ? 'pointer' : 'default',
            userSelect: 'none'
          }}
          onClick={() => {
            if (record.customer_package_map_id) {
              handleOpenPackageSwitchModal(record);
            }
          }}
        >
          {packageName}
        </Tag>
      ),
      sorter: (a: any, b: any) => a.package_name.localeCompare(b.package_name),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? 'Active' : 'Inactive'}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
      ],
      onFilter: (value: any, record: any) => record.status === value,
    },
    {
      title: 'Access Start',
      dataIndex: 'access_start',
      key: 'access_start',
      render: (date: string | null) => (
        date ? new Date(date).toLocaleDateString() : 'Not set'
      ),
      sorter: (a: any, b: any) => {
        if (!a.access_start && !b.access_start) return 0;
        if (!a.access_start) return 1;
        if (!b.access_start) return -1;
        return new Date(a.access_start).getTime() - new Date(b.access_start).getTime();
      },
    },
    {
      title: 'Access End',
      dataIndex: 'access_end',
      key: 'access_end',
      render: (date: string | null) => (
        date ? new Date(date).toLocaleDateString() : 'Active'
      ),
      sorter: (a: any, b: any) => {
        if (!a.access_end && !b.access_end) return 0;
        if (!a.access_end) return -1; // Active items first
        if (!b.access_end) return 1;
        return new Date(a.access_end).getTime() - new Date(b.access_end).getTime();
      },
    },
  ];

  // All users table columns
  const allUserColumns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a: any, b: any) => a.email.localeCompare(b.email),
    },
    {
      title: 'First Name',
      dataIndex: 'name_first',
      key: 'name_first',
      sorter: (a: any, b: any) => (a.name_first || '').localeCompare(b.name_first || ''),
    },
    {
      title: 'Last Name',
      dataIndex: 'name_last',
      key: 'name_last',
      sorter: (a: any, b: any) => (a.name_last || '').localeCompare(b.name_last || ''),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'confirmed' ? 'green' : 'orange'}>
          {status === 'confirmed' ? 'Confirmed' : 'Pending'}
        </Tag>
      ),
      filters: [
        { text: 'Confirmed', value: 'confirmed' },
        { text: 'Pending', value: 'pending' },
      ],
      onFilter: (value: any, record: any) => record.status === value,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Last Sign In',
      dataIndex: 'last_sign_in_at',
      key: 'last_sign_in_at',
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : 'Never',
      sorter: (a: any, b: any) => {
        if (!a.last_sign_in_at && !b.last_sign_in_at) return 0;
        if (!a.last_sign_in_at) return 1;
        if (!b.last_sign_in_at) return -1;
        return new Date(a.last_sign_in_at).getTime() - new Date(b.last_sign_in_at).getTime();
      },
    },
  ];

  // Alert modal handlers
  const handleEditAlert = (alert: AlertData) => {
    setEditingAlert(alert);
    setIsAlertModalOpen(true);
  };

  const handleCloseAlertModal = () => {
    setEditingAlert(null);
    setIsAlertModalOpen(false);
  };

  const handleSaveAlert = async () => {
    setIsAlertModalOpen(false);
    setEditingAlert(null);
    
    // Reload alerts data
    if (selectedSport) {
      await loadAllAlerts();
    }
  };

  // Handle opening Create Alert modal
  const handleOpenCreateAlertModal = () => {
    setIsCreateAlertModalOpen(true);
    setSelectedCustomerForAlert(null);
    setTeamUsersForAlert([]);
    setAlertRecipientType("individual");
    createAlertForm.resetFields();
    if (selectedSport) {
      loadCustomersForAlert();
    }
  };

  // Handle closing Create Alert modal
  const handleCloseCreateAlertModal = () => {
    setIsCreateAlertModalOpen(false);
    setSelectedCustomerForAlert(null);
    setTeamUsersForAlert([]);
    setAlertRecipientType("individual");
    createAlertForm.resetFields();
  };

  // Handle opening Package Switch modal
  const handleOpenPackageSwitchModal = (customerRecord: any) => {
    setSelectedCustomerForSwitch(customerRecord);
    setIsPackageSwitchModalOpen(true);
  };

  // Handle closing Package Switch modal
  const handleClosePackageSwitchModal = () => {
    setIsPackageSwitchModalOpen(false);
    setSelectedCustomerForSwitch(null);
  };

  // Handle package switch success
  const handlePackageSwitchSuccess = () => {
    handleClosePackageSwitchModal();
    // Reload customers data
    if (selectedSport) {
      loadAllCustomers();
    }
  };

  // Load customers for alert creation
  const loadCustomersForAlert = async () => {
    if (!selectedSport) {
      setAvailableCustomersForAlert([]);
      return;
    }

    try {
      setLoadingCustomersForAlert(true);
      
      const sportId = SPORT_ID_MAPPING[selectedSport.abbrev];
      if (!sportId) {
        console.error('Invalid sport selected');
        setAvailableCustomersForAlert([]);
        return;
      }

      // Get customers for the selected sport with school information
      const { data: customersData, error: customersError } = await supabase
        .from('customer')
        .select(`
          id,
          sport_id,
          school_id,
          school!inner (
            name
          )
        `)
        .eq('sport_id', sportId);

      if (customersError) {
        console.error('Error fetching customers:', customersError);
        throw customersError;
      }

      if (!customersData || customersData.length === 0) {
        setAvailableCustomersForAlert([]);
        return;
      }

      // Get package information for each customer
      const customerIds = customersData.map((customer: any) => customer.id);
      const { data: packageData, error: packageError } = await supabase
        .from('customer_package_map')
        .select(`
          customer_id,
          customer_package!inner (
            id,
            package_name
          )
        `)
        .in('customer_id', customerIds)
        .is('access_end', null);

      if (packageError) {
        console.error('Error fetching package data:', packageError);
        // Continue without package info
      }

      // Combine customer and package data
      const enrichedCustomers = customersData.map((customer: any) => {
        const customerPackages = packageData?.filter((pkg: any) => pkg.customer_id === customer.id) || [];
        const packageNames = customerPackages.map((pkg: any) => pkg.customer_package?.package_name || 'Unknown Package');
        
        return {
          id: customer.id,
          school_name: customer.school?.name || 'Unknown School',
          packages: packageNames,
        };
      });

      setAvailableCustomersForAlert(enrichedCustomers);
      
    } catch (error) {
      console.error('Error loading customers for alert:', error);
      message.error('Failed to load customers');
      setAvailableCustomersForAlert([]);
    } finally {
      setLoadingCustomersForAlert(false);
    }
  };

  // Load team users for selected customer in alert creation
  const loadTeamUsersForAlert = async (customerId: string) => {
    try {
      setLoadingTeamUsers(true);
      const { fetchUsersForCustomer } = await import('@/utils/utils');
      const users = await fetchUsersForCustomer(customerId);
      setTeamUsersForAlert(users);
    } catch (error) {
      console.error('Error loading team users for alert:', error);
      message.error('Failed to load team members');
      setTeamUsersForAlert([]);
    } finally {
      setLoadingTeamUsers(false);
    }
  };

  // Handle customer selection change in create alert form
  const handleCustomerSelectionForAlert = (customerId: string) => {
    setSelectedCustomerForAlert(customerId);
    if (customerId) {
      loadTeamUsersForAlert(customerId);
    } else {
      setTeamUsersForAlert([]);
    }
    // Reset recipient selection when customer changes
    setAlertRecipientType("individual");
    createAlertForm.setFieldsValue({
      recipientType: "individual",
      selectedIds: []
    });
  };

  // Handle alert recipient type change
  const handleAlertRecipientTypeChange = (value: "staff" | "individual") => {
    setAlertRecipientType(value);
    if (value === "staff") {
      createAlertForm.setFieldValue("selectedIds", []);
    }
  };

  // Handle Create Alert form submission
  const handleCreateAlert = async (values: any) => {
    try {
      setSubmittingAlert(true);
      
      const { customerId, rule, filter, recipientType, selectedIds } = values;
      
      if (!selectedSport) {
        message.error('Please select a sport first');
        return;
      }

      if (recipientType === "individual" && (!selectedIds || selectedIds.length === 0)) {
        message.error("Please select at least one recipient");
        return;
      }

      // Get current user ID from session
      const { data: { session } } = await supabase.auth.getSession();
      const user_id = session?.user?.id;
      
      if (!user_id) {
        message.error('You must be logged in to create alerts');
        return;
      }

      // Prepare recipient data
      const recipient = recipientType === "staff" 
        ? "entire_staff" 
        : selectedIds.join(",");

      // Create the alert
      await createAlert({
        customer_id: customerId,
        user_id: user_id,
        recipient: recipient,
        rule: rule,
        filter: filter,
      });

      const selectedCustomer = availableCustomersForAlert.find(c => c.id === customerId);
      const customerInfo = selectedCustomer ? ` for ${selectedCustomer.school_name}` : '';
      message.success(`Alert created successfully${customerInfo}`);
      handleCloseCreateAlertModal();
      
      // Reload alerts data
      if (selectedSport) {
        await loadAllAlerts();
      }
      
    } catch (error) {
      console.error('Error creating alert:', error);
      message.error(error instanceof Error ? error.message : 'Failed to create alert');
    } finally {
      setSubmittingAlert(false);
    }
  };

  // Handle bulk ending of selected alerts
  const handleEndSelectedAlerts = async () => {
    if (selectedAlertIds.length === 0) {
      message.warning('Please select alerts to end');
      return;
    }

    setEndingAlerts(true);
    try {
      const now = new Date().toISOString();
      
      await endAlerts(selectedAlertIds.map(id => id.toString()));

      message.success(`Successfully ended ${selectedAlertIds.length} alert(s)`);
      setSelectedAlertIds([]);
      
      // Reload alerts data
      if (selectedSport) {
        await loadAllAlerts();
      }
    } catch (err) {
      console.error('Error ending alerts:', err);
      message.error('Failed to end alerts');
    } finally {
      setEndingAlerts(false);
    }
  };

  // Handle selecting/deselecting all alerts
  const handleSelectAllAlerts = (checked: boolean) => {
    if (checked) {
      // Select all active alerts (those without ended_at)
      const activeAlertIds = filteredAlerts
        .filter(alert => !alert.ended_at)
        .map(alert => alert.id);
      setSelectedAlertIds(activeAlertIds);
    } else {
      setSelectedAlertIds([]);
    }
  };

  // Handle individual alert selection
  const handleAlertSelection = (alertId: number, checked: boolean) => {
    if (checked) {
      setSelectedAlertIds(prev => [...prev, alertId]);
    } else {
      setSelectedAlertIds(prev => prev.filter(id => id !== alertId));
    }
  };

  // Calculate selection states
  const activeAlerts = filteredAlerts.filter(alert => !alert.ended_at);
  const selectedActiveCount = selectedAlertIds.filter(id => 
    activeAlerts.some(alert => alert.id === id)
  ).length;
  const isAllSelected = activeAlerts.length > 0 && selectedActiveCount === activeAlerts.length;
  const isIndeterminate = selectedActiveCount > 0 && selectedActiveCount < activeAlerts.length;


  // Alerts table columns
  const alertColumns = [
    {
      title: (
        <Checkbox
          checked={isAllSelected}
          indeterminate={isIndeterminate}
          onChange={(e) => handleSelectAllAlerts(e.target.checked)}
          disabled={activeAlerts.length === 0}
        >
          Select
        </Checkbox>
      ),
      dataIndex: 'select',
      key: 'select',
      width: 80,
      render: (_: any, record: AlertData) => (
        <Checkbox
          checked={selectedAlertIds.includes(record.id)}
          onChange={(e) => handleAlertSelection(record.id, e.target.checked)}
          disabled={!!record.ended_at} // Disable checkbox for already ended alerts
        />
      ),
    },
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: AlertData, b: AlertData) => a.id - b.id,
      render: (id: number, record: AlertData) => (
        <Button 
          type="link" 
          onClick={() => handleEditAlert(record)}
          style={{ padding: 0, height: 'auto', fontWeight: 'bold' }}
        >
          {id}
        </Button>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: AlertData, b: AlertData) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 200,
      render: (customerName: string, record: AlertData) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{customerName}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.package_names}
          </div>
        </div>
      ),
      sorter: (a: AlertData, b: AlertData) => a.customer_name.localeCompare(b.customer_name),
    },
    {
      title: 'Created By',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      width: 150,
      sorter: (a: AlertData, b: AlertData) => a.created_by_name.localeCompare(b.created_by_name),
    },
    {
      title: 'Recipients',
      dataIndex: 'recipient_names',
      key: 'recipient_names',
      width: 200,
      render: (recipientNames: string) => (
        <div style={{ 
          maxWidth: '200px',
          whiteSpace: 'normal',
          wordWrap: 'break-word'
        }}>
          {recipientNames}
        </div>
      ),
      sorter: (a: AlertData, b: AlertData) => a.recipient_names.localeCompare(b.recipient_names),
    },
    {
      title: 'Rule',
      dataIndex: 'rule',
      key: 'rule',
      width: 150,
      render: (rule: string) => (
        <div style={{ 
          maxWidth: '150px',
          whiteSpace: 'normal',
          wordWrap: 'break-word'
        }}>
          {rule}
        </div>
      ),
      sorter: (a: AlertData, b: AlertData) => a.rule.localeCompare(b.rule),
    },
    {
      title: 'Filter',
      dataIndex: 'filter',
      key: 'filter',
      width: 250,
      render: (filter: string) => (
        <div style={{ 
          maxWidth: '250px',
          whiteSpace: 'normal',
          wordWrap: 'break-word',
          fontSize: '12px',
          color: '#666'
        }}>
          {filter || 'No filter'}
        </div>
      ),
      sorter: (a: AlertData, b: AlertData) => (a.filter || '').localeCompare(b.filter || ''),
    },
    {
      title: 'Ended At',
      dataIndex: 'ended_at',
      key: 'ended_at',
      width: 120,
      render: (endedAt: string | null) => (
        <div style={{ 
          color: endedAt ? '#ff4d4f' : '#52c41a',
          fontWeight: endedAt ? 'normal' : 'bold'
        }}>
          {endedAt ? new Date(endedAt).toLocaleDateString() : 'Active'}
        </div>
      ),
      sorter: (a: AlertData, b: AlertData) => {
        if (!a.ended_at && !b.ended_at) return 0;
        if (!a.ended_at) return -1; // Active alerts first
        if (!b.ended_at) return 1;
        return new Date(a.ended_at).getTime() - new Date(b.ended_at).getTime();
      },
    },
  ];

  return (
    <div className="w-full h-full">
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
            <Space>
              <Button
                type="default"
                icon={<UserOutlined />}
                onClick={handleOpenInviteUserModal}
                disabled={!selectedSport}
              >
                Invite User
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenAddCustomerModal}
                disabled={!selectedSport}
              >
                Add New Customer
              </Button>
              <Button
                type="default"
                icon={<AppstoreAddOutlined />}
                onClick={handleOpenAddPackageModal}
                disabled={!selectedSport}
              >
                Add Package to Customer
              </Button>
              <Button
                type="default"
                icon={<i className="icon-game" />}
                onClick={() => window.open('/verified-game', '_blank')}
              >
                Verified Game
              </Button>
              <button
                onClick={triggerRefresh}
                disabled={refreshStatus === 'running'}
                className={`refresh-button refresh-button-${refreshStatus}`}
                onMouseEnter={() => console.log('🖱️ Button hover - refreshStatus:', refreshStatus, 'refreshTimer:', refreshTimer)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  border: '1px solid',
                  borderRadius: '6px',
                  cursor: refreshStatus === 'running' ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  minWidth: '120px',
                  justifyContent: 'center',
                  // Force colors with inline styles
                  backgroundColor: refreshStatus === 'idle' ? '#f5f5f5' : 
                                  refreshStatus === 'running' ? '#d9f7be' : 
                                  refreshStatus === 'success' ? '#52c41a' : '#ff4d4f',
                  color: refreshStatus === 'idle' ? '#666' : 
                         refreshStatus === 'running' ? '#389e0d' : 
                         refreshStatus === 'success' ? '#fff' : '#fff',
                  borderColor: refreshStatus === 'idle' ? '#d9d9d9' : 
                               refreshStatus === 'running' ? '#b7eb8f' : 
                               refreshStatus === 'success' ? '#52c41a' : '#ff4d4f'
                }}
              >
                <i className="icon-refresh" />
                {refreshStatus === 'idle' && 'Refresh Data'}
                {refreshStatus === 'running' && `Refreshing... ${Math.floor(refreshTimer / 60)}:${(refreshTimer % 60).toString().padStart(2, '0')}`}
                {refreshStatus === 'success' && 'Refresh Complete'}
                {refreshStatus === 'failed' && 'Refresh Failed'}
              </button>
              {/* Only show Test Config button in development */}
              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={async () => {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const response = await fetch('/api/admin/test-config', {
                        headers: {
                          'Authorization': `Bearer ${session?.access_token}`,
                        },
                      });
                      const result = await response.json();
                      // Debug log removed('Config test result:', result);
                      if (response.ok) {
                        message.success(
                          `Admin configuration is working correctly!\n\n` +
                          `✅ Service Role Key: Configured\n` +
                          `✅ Database Access: All tables accessible\n` +
                          `✅ RLS Bypass: Working properly`
                        );
                      } else {
                        message.error(`Config error: ${result.error}`);
                      }
                    } catch (error) {
                      console.error('Config test failed:', error);
                      message.error('Failed to test configuration');
                    }
                  }}
                  style={{ backgroundColor: '#f0f0f0', borderColor: '#d9d9d9' }}
                >
                  🔧 Test Config
                </Button>
              )}
            </Space>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Text type="secondary">
              Welcome, {userDetails?.name_first} {userDetails?.name_last}.
            </Text>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'sport-users',
                label: (
                  <span>
                    <UserOutlined />
                    Sport Users
                  </span>
                ),
                children: (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Text strong>Sport:</Text>
                      <Select
                        style={{ width: 200 }}
                        placeholder="Select a sport"
                        loading={loadingSports}
                        value={selectedSport?.id}
                        onChange={(value) => {
                          const sport = allSports.find(s => s.id === value);
                          setSelectedSport(sport || null);
                        }}
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={allSports.map(sport => ({
                          value: sport.id,
                          label: `${sport.name} (${sport.abbrev.toUpperCase()})`
                        }))}
                      />
                    </div>

                    <Card 
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <UserOutlined style={{ marginRight: 8 }} />
                            {selectedSport ? `${selectedSport.name} Users` : 'Sport Users'}
                            {selectedSport && (
                              <Tag color="green" style={{ marginLeft: 8 }}>
                                {selectedSport.abbrev.toUpperCase()}
                              </Tag>
                            )}
                          </div>
                          <Space>
                            <Input.Search
                              style={{ width: 300 }}
                              placeholder="Search by email, name, or school..."
                              allowClear
                              value={searchInput}
                              onChange={(e) => setSearchInput(e.target.value)}
                              onSearch={(value) => setSearchInput(value)}
                            />
                            <Button
                              icon={<DownloadOutlined />}
                              onClick={exportToCSV}
                              disabled={filteredUsers.length === 0}
                            >
                              Export CSV
                            </Button>
                            <Button
                              type="primary"
                              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                              disabled={selectedUsers.length === 0 || selectedUsers.every(user => !user.access_end)}
                              loading={reactivatingAccess}
                              onClick={handleReactivateAccess}
                            >
                              Reactivate Access ({selectedUsers.filter(user => user.access_end).length})
                            </Button>
                            <Button
                              type="primary"
                              danger
                              disabled={selectedUsers.length === 0 || selectedUsers.every(user => user.access_end)}
                              loading={disablingAccess}
                              onClick={handleDisableAccess}
                            >
                              Disable Access ({selectedUsers.filter(user => !user.access_end).length})
                            </Button>
                          </Space>
                        </div>
                      }
                    >
                      {/* Temporary highlight style for recently updated row */}
                      <style>{`
                        .ant-table-tbody > tr.row-updated > td {
                          background-color: #fff7e6 !important; /* light orange */
                          transition: background-color 0.5s ease;
                        }
                      `}</style>
                      <Table
                        columns={sportUserColumns}
                        dataSource={filteredUsers}
                        rowKey={(record) => `${record.id}-${record.customer_id}`}
                        loading={loading}
                        onRow={(record) => ({
                          onClick: () => handleOpenEditUserModal(record),
                          style: { cursor: 'pointer' }
                        })}
                        rowClassName={(record) => (
                          `${record.id}-${record.customer_id}` === recentlyUpdatedUserKey ? 'row-updated' : ''
                        )}
                        rowSelection={{
                          type: 'checkbox',
                          selectedRowKeys: selectedUsers.map(user => `${user.id}-${user.customer_id}`),
                          onChange: (selectedRowKeys, selectedRows) => {
                            // Debug log removed('Row selection changed:', { selectedRowKeys, selectedRows });
                            setSelectedUsers(selectedRows);
                          },
                          getCheckboxProps: (record: SportUser) => ({
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
                          emptyText: selectedSport 
                            ? `No users found for ${selectedSport.name}`
                            : 'Select a sport from the dropdown to view users'
                        }}
                      />
                    </Card>
                  </div>
                ),
              },
              {
                key: 'customer-management',
                label: (
                  <span>
                    <SettingOutlined />
                    Customers
                  </span>
                ),
                children: (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Text strong>Sport:</Text>
                      <Select
                        style={{ width: 200 }}
                        placeholder="Select a sport"
                        loading={loadingSports}
                        value={selectedSport?.id}
                        onChange={(value) => {
                          const sport = allSports.find(s => s.id === value);
                          setSelectedSport(sport || null);
                        }}
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={allSports.map(sport => ({
                          value: sport.id,
                          label: `${sport.name} (${sport.abbrev.toUpperCase()})`
                        }))}
                      />
                    </div>
                    <Card 
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <SettingOutlined style={{ marginRight: 8 }} />
                            {selectedSport ? `${selectedSport.name} Customer Packages` : 'Customer Package Management'}
                            {selectedSport && (
                              <Tag color="blue" style={{ marginLeft: 8 }}>
                                {selectedSport.abbrev.toUpperCase()}
                              </Tag>
                            )}
                          </div>
                          <Space>
                            <Input.Search
                              style={{ width: 300 }}
                              placeholder="Search by school name or package name..."
                              allowClear
                              value={customerSearchInput}
                              onChange={(e) => setCustomerSearchInput(e.target.value)}
                              onSearch={(value) => setCustomerSearchInput(value)}
                            />
                            <Button
                              type="primary"
                              danger
                              disabled={selectedCustomers.length === 0}
                              loading={disablingCustomers}
                              onClick={handleDisableCustomers}
                            >
                              Disable Packages ({selectedCustomers.length})
                            </Button>
                          </Space>
                        </div>
                      }
                    >
                      <Table
                        columns={customerColumns}
                        dataSource={filteredCustomers}
                        rowKey="id"
                        loading={loadingAllCustomers}
                        rowSelection={{
                          type: 'checkbox',
                          selectedRowKeys: selectedCustomers.map(customer => customer.id),
                          onChange: (selectedRowKeys, selectedRows) => {
                            setSelectedCustomers(selectedRows);
                          },
                          getCheckboxProps: (record: any) => ({
                            disabled: record.status === 'inactive' || !record.customer_package_map_id, // Disable checkbox for inactive packages or 'No Package' entries
                            name: `${record.school_name} - ${record.package_name}`,
                          }),
                        }}
                        pagination={{
                          pageSize: 20,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} customers`,
                        }}
                        scroll={{ x: 'max-content' }}
                        locale={{
                          emptyText: selectedSport 
                            ? `No customer packages found for ${selectedSport.name}`
                            : 'Select a sport from the dropdown to view customer packages'
                        }}
                      />
                    </Card>
                  </div>
                ),
              },
              {
                key: 'alerts',
                label: (
                  <span>
                    <ExclamationCircleOutlined />
                    Alerts
                  </span>
                ),
                children: (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Text strong>Sport:</Text>
                      <Select
                        style={{ width: 200 }}
                        placeholder="Select a sport"
                        loading={loadingSports}
                        value={selectedSport?.id}
                        onChange={(value) => {
                          const sport = allSports.find(s => s.id === value);
                          setSelectedSport(sport || null);
                        }}
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={allSports.map(sport => ({
                          value: sport.id,
                          label: `${sport.name} (${sport.abbrev.toUpperCase()})`
                        }))}
                      />
                    </div>
                    <Card 
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <ExclamationCircleOutlined style={{ marginRight: 8 }} />
                            {selectedSport ? `${selectedSport.name} Alerts` : 'Alert Management'}
                            {selectedSport && (
                              <Tag color="purple" style={{ marginLeft: 8 }}>
                                {selectedSport.abbrev.toUpperCase()}
                              </Tag>
                            )}
                          </div>
                          <Space>
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={handleOpenCreateAlertModal}
                              disabled={!selectedSport}
                            >
                              Create New Alert
                            </Button>
                            <Input.Search
                              style={{ width: 300 }}
                              placeholder="Search alerts by customer, rule, filter..."
                              allowClear
                              value={alertSearchInput}
                              onChange={(e) => setAlertSearchInput(e.target.value)}
                              onSearch={(value) => setAlertSearchInput(value)}
                            />
                          </Space>
                        </div>
                      }
                    >
                      {/* Bulk Action Controls */}
                      {selectedAlertIds.length > 0 && (
                        <div style={{ 
                          marginBottom: 16, 
                          padding: '12px 16px', 
                          background: '#f0f8ff', 
                          border: '1px solid #91caff',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div>
                            <Text strong>{selectedAlertIds.length}</Text>
                            <Text> alert(s) selected</Text>
                          </div>
                          <Space>
                            <Button 
                              size="small" 
                              onClick={() => setSelectedAlertIds([])}
                            >
                              Clear Selection
                            </Button>
                            <Popconfirm
                              title="End Selected Alerts"
                              description={`Are you sure you want to end ${selectedAlertIds.length} selected alert(s)? This action cannot be undone.`}
                              onConfirm={handleEndSelectedAlerts}
                              okText="Yes, End Alerts"
                              cancelText="Cancel"
                              okButtonProps={{ danger: true }}
                            >
                              <Button 
                                type="primary" 
                                danger 
                                size="small"
                                loading={endingAlerts}
                                icon={<DeleteOutlined />}
                              >
                                End Selected Alerts
                              </Button>
                            </Popconfirm>
                          </Space>
                        </div>
                      )}
                      
                      <Table
                        columns={alertColumns}
                        dataSource={filteredAlerts}
                        rowKey="id"
                        loading={loadingAlerts}
                        pagination={{
                          pageSize: 20,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} alerts`,
                        }}
                        scroll={{ x: 'max-content' }}
                        locale={{
                          emptyText: selectedSport 
                            ? `No alerts found for ${selectedSport.name}`
                            : 'Select a sport from the dropdown to view alerts'
                        }}
                      />
                    </Card>
                  </div>
                ),
              },
              // {
              //   key: 'user-management',
              //   label: (
              //     <span>
              //       <TeamOutlined />
              //       All Users
              //     </span>
              //   ),
              //   children: (
              //     <Card 
              //       title={
              //         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              //           <div style={{ display: 'flex', alignItems: 'center' }}>
              //             <TeamOutlined style={{ marginRight: 8 }} />
              //             User Management
              //           </div>
              //           <Input.Search
              //             style={{ width: 300 }}
              //             placeholder="Search by email or name..."
              //             allowClear
              //             value={userSearchInput}
              //             onChange={(e) => setUserSearchInput(e.target.value)}
              //             onSearch={(value) => setUserSearchInput(value)}
              //           />
              //         </div>
              //       }
              //     >
              //       <Table
              //         columns={allUserColumns}
              //         dataSource={allUsers}
              //         rowKey="id"
              //         loading={loadingUsers}
              //         pagination={{
              //           pageSize: 20,
              //           showSizeChanger: true,
              //           showQuickJumper: true,
              //           showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
              //         }}
              //         scroll={{ x: 'max-content' }}
              //       />
              //     </Card>
              //   ),
              // },
              {
                key: 'edit-view-data',
                label: (
                  <span>
                    <AppstoreAddOutlined />
                    Edit/View Data
                  </span>
                ),
                children: (
                  <EditViewDataTab 
                    selectedDataType={selectedDataType}
                    setSelectedDataType={setSelectedDataType}
                    hasAthleteAccess={hasAthleteAccess}
                    allSports={allSports}
                    onAthleteUpdate={() => {
                      // Refresh any athlete-related data if needed
                      console.log('Athlete data updated, refreshing...');
                    }}
                  />
                ),
              },
            ]}
          />

          {/* Invite User Modal */}
          <Modal
            title={`Invite New User${selectedSport ? ` - ${selectedSport.name}` : ''}`}
            open={isInviteUserModalOpen}
            onCancel={() => {
              setIsInviteUserModalOpen(false);
              inviteUserForm.resetFields();
            }}
            footer={null}
            width={600}
          >
            <Form
              form={inviteUserForm}
              layout="vertical"
              onFinish={handleInviteUser}
            >
              <Form.Item
                label="Email Address"
                name="email"
                rules={[
                  { required: true, message: 'Please enter email address' },
                  { type: 'email', message: 'Please enter a valid email address' },
                ]}
              >
                <Input
                  placeholder="user@example.com"
                  autoComplete="email"
                />
              </Form.Item>

              <Form.Item
                label="First Name (Optional)"
                name="firstName"
              >
                <Input placeholder="John" />
              </Form.Item>

              <Form.Item
                label="Last Name (Optional)"
                name="lastName"
              >
                <Input placeholder="Doe" />
              </Form.Item>

              <Form.Item
                label="Phone Number (Optional)"
                name="phone"
              >
                <Input placeholder="+1 (555) 123-4567" />
              </Form.Item>

              <Form.Item
                label="Customer"
                name="customerId"
                rules={[
                  { required: true, message: 'Please select a customer' },
                ]}
              >
                <Select
                  placeholder="Select a customer"
                  loading={loadingCustomers}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={availableCustomers.map(customer => ({
                    value: customer.id,
                    label: `${customer.school_name} (${customer.packages.join(', ')})`
                  }))}
                  notFoundContent={!selectedSport ? 'Please select a sport first' : loadingCustomers ? 'Loading customers...' : 'No customers found for this sport'}
                  disabled={!selectedSport || loadingCustomers}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => {
                    setIsInviteUserModalOpen(false);
                    inviteUserForm.resetFields();
                  }}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submittingInvite}
                  >
                    Send Invitation
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

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
                label={`${selectedSport?.name || 'Sport'} Packages`}
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

          {/* Add Package to Customer Modal */}
          <Modal
            title={`Add Package to Customer${selectedSport ? ` - ${selectedSport.name}` : ''}`}
            open={isAddPackageModalOpen}
            onCancel={handleCloseAddPackageModal}
            footer={null}
            width={600}
          >
            <Form
              form={addPackageForm}
              layout="vertical"
              onFinish={handleAddPackageToCustomer}
            >
              <Form.Item
                label="Customer"
                name="customer_id"
                rules={[
                  { required: true, message: 'Please select a customer' },
                ]}
              >
                <Select
                  placeholder="Select an existing customer"
                  loading={loadingExistingCustomers}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={existingCustomers.map(customer => ({
                    value: customer.id,
                    label: `${customer.school_name} (Current: ${customer.existing_packages.length > 0 ? customer.existing_packages.join(', ') : 'No packages'})`
                  }))}
                  notFoundContent={!selectedSport ? 'Please select a sport first' : loadingExistingCustomers ? 'Loading customers...' : 'No customers found for this sport'}
                  disabled={!selectedSport || loadingExistingCustomers}
                />
              </Form.Item>

              <Form.Item
                label={`${selectedSport?.name || 'Sport'} Packages to Add`}
                name="package_ids"
                rules={[{ required: true, message: 'Please select at least one package to add' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Select one or more packages to add"
                  options={availablePackagesForAdd.map(pkg => ({
                    value: pkg.id,
                    label: pkg.package_name
                  }))}
                  disabled={!selectedSport}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={handleCloseAddPackageModal}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submittingPackageAdd}
                  >
                    Add Packages
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* Edit User Modal */}
          <Modal
            title={editingUser ? `Edit User: ${editingUser.email}` : 'Edit User'}
            open={isEditUserModalOpen}
            onCancel={handleCloseEditUserModal}
            footer={null}
            width={600}
          >
            <Form
              form={editUserForm}
              layout="vertical"
              onFinish={handleEditUser}
            >
              <Form.Item
                label="First Name"
                name="name_first"
              >
                <Input placeholder="Enter first name" />
              </Form.Item>

              <Form.Item
                label="Last Name"
                name="name_last"
              >
                <Input placeholder="Enter last name" />
              </Form.Item>

              <Form.Item
                label="Phone Number"
                name="phone"
              >
                <Input placeholder="Enter phone number (e.g., +1 555-123-4567)" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={handleCloseEditUserModal}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submittingUserEdit}
                  >
                    Update User
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* Admin Alert Modal */}
          <AdminAlertModal
            open={isAlertModalOpen}
            onCancel={handleCloseAlertModal}
            onSave={handleSaveAlert}
            alertData={editingAlert}
            loading={false}
          />

          {/* Create Alert Modal */}
          <Modal
            title={`Create New Alert${selectedSport ? ` - ${selectedSport.name}` : ''}`}
            open={isCreateAlertModalOpen}
            onCancel={handleCloseCreateAlertModal}
            footer={null}
            width={600}
            destroyOnClose
          >
            <Form
              form={createAlertForm}
              layout="vertical"
              onFinish={handleCreateAlert}
            >
              <Form.Item
                label="Customer"
                name="customerId"
                rules={[
                  { required: true, message: 'Please select a customer' },
                ]}
              >
                <Select
                  placeholder="Select a customer"
                  loading={loadingCustomersForAlert}
                  showSearch
                  value={selectedCustomerForAlert}
                  onChange={handleCustomerSelectionForAlert}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={availableCustomersForAlert.map(customer => ({
                    value: customer.id,
                    label: `${customer.school_name} (${customer.packages.join(', ')})`
                  }))}
                  notFoundContent={!selectedSport ? 'Please select a sport first' : loadingCustomersForAlert ? 'Loading customers...' : 'No customers found for this sport'}
                  disabled={!selectedSport || loadingCustomersForAlert}
                />
              </Form.Item>

              <Form.Item
                label="Rule Name"
                name="rule"
                rules={[
                  { required: true, message: 'Please enter a rule name' },
                ]}
              >
                <Input
                  placeholder="Enter a name for this alert"
                />
              </Form.Item>

              <Form.Item
                label="Filter"
                name="filter"
                rules={[
                  { required: true, message: 'Please enter filter criteria' },
                ]}
              >
                <Input.TextArea
                  placeholder="Enter filter criteria"
                  rows={3}
                  showCount
                />
              </Form.Item>

              <Form.Item
                label="Recipients"
                name="recipientType"
                rules={[
                  { required: true, message: 'Please select recipient type' },
                ]}
              >
                <Select
                  value={alertRecipientType}
                  onChange={handleAlertRecipientTypeChange}
                  options={[
                    { value: "individual", label: "Select Individuals" },
                    { value: "staff", label: "Entire Staff" },
                  ]}
                />
              </Form.Item>

              {alertRecipientType === "individual" && (
                <Form.Item
                  name="selectedIds"
                  rules={[
                    {
                      required: true,
                      validator: (_, value) => {
                        if (!value || value.length === 0) {
                          return Promise.reject('Please select at least one recipient');
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select team members"
                    loading={loadingTeamUsers}
                    disabled={!selectedCustomerForAlert}
                    notFoundContent={
                      !selectedCustomerForAlert 
                        ? 'Please select a customer first' 
                        : loadingTeamUsers 
                          ? 'Loading...' 
                          : 'No team members found'
                    }
                    options={teamUsersForAlert.map(user => ({
                      value: user.id,
                      label: `${user.name_first} ${user.name_last}`,
                    }))}
                  />
                </Form.Item>
              )}

              {alertRecipientType === "staff" && (
                <div style={{ marginTop: 8, marginBottom: 16, color: "#666", fontStyle: 'italic' }}>
                  Alert will be sent to all staff members for this customer.
                </div>
              )}

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={handleCloseCreateAlertModal}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submittingAlert}
                  >
                    Create Alert
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* Package Switch Modal */}
          <PackageSwitchModal
            visible={isPackageSwitchModalOpen}
            onCancel={handleClosePackageSwitchModal}
            onSuccess={handlePackageSwitchSuccess}
            customerRecord={selectedCustomerForSwitch}
            selectedSport={selectedSport}
          />
        </div>
      </div>
    </div>
  );
}

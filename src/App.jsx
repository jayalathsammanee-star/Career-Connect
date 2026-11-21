import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

// A curated set of distinct workplace/technology photos. The internship ID
// keeps each listing's image stable between renders and page visits.
const INTERNSHIP_PHOTOS = [
  'photo-1497366754035-f200968a6e72',
  'photo-1521737711867-e3b97375f902',
  'photo-1497366216548-37526070297c',
  'photo-1524758631624-e2822e304c36',
  'photo-1498050108023-c5249f4df085',
  'photo-1516321318423-f06f85e504b3',
  'photo-1553877522-43269d4ea984',
  'photo-1522071820081-009f0129c71c',
  'photo-1519389950473-47ba0277781c',
  'photo-1556761175-b413da4baf72',
  'photo-1552664730-d307ca884978',
  'photo-1522202176988-66273c2fd55f',
];

const getInternshipPhoto = (job) => {
  const id = Number(job.internship_id) || 0;
  const photo = INTERNSHIP_PHOTOS[Math.abs(id) % INTERNSHIP_PHOTOS.length];
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=700&q=85`;
};

// Convert API date values to the user's local calendar date.
// This avoids date-only fields moving back one day because of UTC conversion.
const getLocalDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLocalDate = (value) => {
  const dateValue = getLocalDateInputValue(value);
  if (!dateValue) return '';
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
};

const getTodayLocalDateInputValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const apiFetch = (url, options = {}) => {
  const token = window.localStorage.getItem('careerconnect_token');
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
};

const getStoredUser = () => {
  try {
    const token = window.localStorage.getItem('careerconnect_token');
    const user = window.localStorage.getItem('careerconnect_user');
    return token && user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

function App() {
  const [page, setPage] = useState(() => getStoredUser()?.role === 'admin' ? 'admin-dashboard' : getStoredUser() ? 'dashboard' : 'home');
  const [internships, setInternships] = useState([]);
  const [internshipLoading, setInternshipLoading] = useState(true);
  // Browse internships filters (client-side; the existing API remains unchanged)
  const [internshipSearch, setInternshipSearch] = useState('');
  const [internshipTypeFilter, setInternshipTypeFilter] = useState('all');
  const [internshipLocationFilter, setInternshipLocationFilter] = useState('all');
  const [internshipSort, setInternshipSort] = useState('latest');

  // Registration
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loggedUser, setLoggedUser] = useState(getStoredUser);

  // Shared UI
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [loading, setLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [publicMenuOpen, setPublicMenuOpen] = useState(false);

  // Internship application state
  const [applications, setApplications] = useState([]);
  // Student Notifications
const [notifications, setNotifications] = useState([]);
const [notificationLoading, setNotificationLoading] = useState(false);
const [notificationsOpen, setNotificationsOpen] = useState(false);
const [savedInternships, setSavedInternships] = useState([]);
const [adminStats, setAdminStats] = useState(null);
const [adminUsers, setAdminUsers] = useState([]);
const [adminLoading, setAdminLoading] = useState(false);

const unreadCount = notifications.filter(
  (notification) => !notification.is_read
).length;
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [applicationSubmitting, setApplicationSubmitting] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [cvDownloadingId, setCvDownloadingId] = useState(null);
  const [companyApplications, setCompanyApplications] = useState([]);
  const [companyApplicationsLoading, setCompanyApplicationsLoading] = useState(false);
  const [companyInternshipStats, setCompanyInternshipStats] = useState({ total: 0, active: 0 });
  const [companyInternshipStatsLoading, setCompanyInternshipStatsLoading] = useState(false);
  const [companyInternships, setCompanyInternships] = useState([]);
  const [companyInternshipsLoading, setCompanyInternshipsLoading] = useState(false);
  const [editingInternship, setEditingInternship] = useState(null);
  const [internshipUpdating, setInternshipUpdating] = useState(false);
  const [internshipDeletingId, setInternshipDeletingId] = useState(null);
  const [editInternshipForm, setEditInternshipForm] = useState({ title: '', description: '', requirements: '', location: '', internship_type: 'Full-time', deadline: '' });
  const [updatingApplicationId, setUpdatingApplicationId] = useState(null);

  // Company profile and logo
  const [companyProfile, setCompanyProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);

  // Student profile
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentProfileLoading, setStudentProfileLoading] = useState(false);
  const [studentProfileSaving, setStudentProfileSaving] = useState(false);
  const [studentCvFile, setStudentCvFile] = useState(null);
  const [studentCvUploading, setStudentCvUploading] = useState(false);
  const [studentPhotoFile, setStudentPhotoFile] = useState(null);
  const [studentPhotoPreview, setStudentPhotoPreview] = useState('');
  const [studentPhotoUploading, setStudentPhotoUploading] = useState(false);

  // Create internship
  const [internshipForm, setInternshipForm] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    internship_type: 'Full-time',
    deadline: '',
  });
  const [internshipSubmitting, setInternshipSubmitting] = useState(false);

  useEffect(() => {
    const loadInternships = async () => {
      setInternshipLoading(true);
      try {
        const response = await apiFetch(`${API_URL}/internships`);
        if (!response.ok) throw new Error('Failed to load internships');
        const data = await response.json();
        setInternships(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Internship loading error:', error);
        setInternships([]);
      } finally {
        setInternshipLoading(false);
      }
    };

    loadInternships();
  }, []);

  // Load the logged-in student's profile when they open My Profile
  useEffect(() => {
    const loadStudentProfile = async () => {
      if (!loggedUser || loggedUser.role !== 'student' || !['profile', 'apply', 'dashboard'].includes(page)) return;
      setStudentProfileLoading(true);
      try {
        const response = await apiFetch(`${API_URL}/student/profile/${loggedUser.user_id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to load student profile');
        setStudentProfile({
          full_name: data.full_name || loggedUser.full_name || '',
          email: data.email || loggedUser.email || '',
          phone: data.phone || '',
          university: data.university || '',
          degree_program: data.degree_program || '',
          skills: data.skills || '',
          about_me: data.about_me || '',
          cv_path: data.cv_path || '',
          profile_image: data.profile_image || ''
        });
        setStudentPhotoPreview(data.profile_image ? `http://localhost:5000${data.profile_image}` : '');
      } catch (error) {
        showMessage(error.message || 'Unable to load student profile.', 'error');
      } finally {
        setStudentProfileLoading(false);
      }
    };
    loadStudentProfile();
  }, [loggedUser, page]);

  // Load the company profile across the whole company workspace so its logo
  // is available in the sidebar and top bar, not only on the My Profile page.
  useEffect(() => {
    const loadCompanyProfile = async () => {
      if (!loggedUser || loggedUser.role !== 'company') {
        setCompanyProfile(null);
        setLogoPreview('');
        return;
      }

      setProfileLoading(true);
      try {
        const response = await apiFetch(`${API_URL}/company/profile/${loggedUser.user_id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to load company profile');

        setCompanyProfile(data);
        const logoPath = data.logo || '';
        setLogoPreview(logoPath
          ? (/^https?:\/\//i.test(logoPath) ? logoPath : `http://localhost:5000${logoPath.startsWith('/') ? logoPath : `/${logoPath}`}`)
          : '');
      } catch (error) {
        // Avoid interrupting normal workspace navigation if a company profile
        // has not been created yet. Show the error when My Profile is opened.
        if (page === 'profile') showMessage(error.message || 'Unable to load company profile.', 'error');
      } finally {
        setProfileLoading(false);
      }
    };

    loadCompanyProfile();
  }, [loggedUser, page]);

  // Load internships owned by the logged-in company
  useEffect(() => {
    const loadCompanyInternships = async () => {
      if (!loggedUser || loggedUser.role !== 'company' || page !== 'my-internships') return;
      setCompanyInternshipsLoading(true);
      try {
        const response = await apiFetch(`${API_URL}/company/internships/${loggedUser.user_id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to load your internships');
        setCompanyInternships(Array.isArray(data) ? data : []);
      } catch (error) {
        showMessage(error.message || 'Unable to load your internships.', 'error');
      } finally {
        setCompanyInternshipsLoading(false);
      }
    };
    loadCompanyInternships();
  }, [loggedUser, page]);

  // Load the logged-in student's applications
  useEffect(() => {
    const loadApplications = async () => {
      if (!loggedUser || loggedUser.role !== 'student') {
        setApplications([]);
        return;
      }

      setApplicationLoading(true);
      try {
        const response = await apiFetch(
          `${API_URL}/applications/student/${loggedUser.user_id}`
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to load applications');
        }
        setApplications(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Applications loading error:', error);
        showMessage(error.message || 'Unable to load applications.', 'error');
      } finally {
        setApplicationLoading(false);
      }
    };

    loadApplications();
  }, [loggedUser]);

  // Load notifications for both student and company workspaces
  useEffect(() => {
    const loadNotifications = async () => {
      if (!loggedUser || !['student', 'company'].includes(loggedUser.role)) {
        setNotifications([]);
        return;
      }

      setNotificationLoading(true);
      try {
        const response = await apiFetch(`${API_URL}/notifications/${loggedUser.user_id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to load notifications');
        setNotifications(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Notification loading error:', error);
      } finally {
        setNotificationLoading(false);
      }
    };

    loadNotifications();
  }, [loggedUser]);

  // Load the student's saved internships from MySQL.
  useEffect(() => {
    const loadSavedInternships = async () => {
      if (!loggedUser || loggedUser.role !== 'student') {
        setSavedInternships([]);
        return;
      }
      try {
        const response = await apiFetch(`${API_URL}/student/saved/${loggedUser.user_id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load saved internships');
        setSavedInternships(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Saved internships loading error:', error);
      }
    };
    loadSavedInternships();
  }, [loggedUser]);

  const isInternshipSaved = (internshipId) =>
    savedInternships.some((item) => Number(item.internship_id) === Number(internshipId));

  const toggleSavedInternship = async (job) => {
    if (!loggedUser || loggedUser.role !== 'student') {
      showMessage('Please log in with a student account to save internships.', 'info');
      navigate('login');
      return;
    }
    const alreadySaved = isInternshipSaved(job.internship_id);
    try {
      const response = await apiFetch(`${API_URL}/student/saved/${loggedUser.user_id}/${job.internship_id}`, {
        method: alreadySaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update saved internships');
      setSavedInternships((current) => alreadySaved
        ? current.filter((item) => Number(item.internship_id) !== Number(job.internship_id))
        : [...current, { ...job, internship_id: job.internship_id }]);
      showMessage(alreadySaved ? 'Internship removed from saved items.' : 'Internship saved successfully.', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to save internship.', 'error');
    }
  };

  // Load admin statistics and a limited user directory only for database-designated admins.
  useEffect(() => {
    const loadAdminOverview = async () => {
      if (!loggedUser || loggedUser.role !== 'admin' || page !== 'admin-dashboard') return;
      setAdminLoading(true);
      try {
        const response = await apiFetch(`${API_URL}/admin/overview/${loggedUser.user_id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load admin overview');
        setAdminStats(data.stats || null);
        setAdminUsers(Array.isArray(data.recentUsers) ? data.recentUsers : []);
      } catch (error) {
        showMessage(error.message || 'Unable to load admin dashboard.', 'error');
      } finally {
        setAdminLoading(false);
      }
    };
    loadAdminOverview();
  }, [loggedUser, page]);

  // Refresh the notification list whenever the bell is opened.
  useEffect(() => {
    if (!notificationsOpen || !loggedUser || !['student', 'company'].includes(loggedUser.role)) return;
    let active = true;
    apiFetch(`${API_URL}/notifications/${loggedUser.user_id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to refresh notifications');
        if (active) setNotifications(Array.isArray(data) ? data : []);
      })
      .catch((error) => console.error('Notification refresh error:', error));
    return () => { active = false; };
  }, [notificationsOpen, loggedUser]);

  // Load applications submitted to the logged-in company's internships
  useEffect(() => {
    const loadCompanyApplications = async () => {
      if (!loggedUser || loggedUser.role !== 'company') {
        setCompanyApplications([]);
        return;
      }

      setCompanyApplicationsLoading(true);
      try {
        const response = await apiFetch(`${API_URL}/company/applications/${loggedUser.user_id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to load company applications');
        setCompanyApplications(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Company applications loading error:', error);
        showMessage(error.message || 'Unable to load applications.', 'error');
      } finally {
        setCompanyApplicationsLoading(false);
      }
    };

    loadCompanyApplications();
  }, [loggedUser]);

  // Load internship statistics for the company dashboard
  useEffect(() => {
    const loadCompanyInternshipStats = async () => {
      if (!loggedUser || loggedUser.role !== 'company' || page !== 'dashboard') {
        return;
      }

      setCompanyInternshipStatsLoading(true);
      try {
        const response = await apiFetch(
          `${API_URL}/company/internship-stats/${loggedUser.user_id}`
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to load internship statistics');
        }
        setCompanyInternshipStats({
          total: Number(data.total) || 0,
          active: Number(data.active) || 0,
        });
      } catch (error) {
        console.error('Company internship statistics error:', error);
        showMessage(error.message || 'Unable to load internship statistics.', 'error');
      } finally {
        setCompanyInternshipStatsLoading(false);
      }
    };

    loadCompanyInternshipStats();
  }, [loggedUser, page]);

  const updateApplicationStatus = async (applicationId, status) => {
    if (!loggedUser || loggedUser.role !== 'company') return;
    setUpdatingApplicationId(applicationId);
    setMessage('');
    try {
      const response = await apiFetch(`${API_URL}/company/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: loggedUser.user_id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update application');
      setCompanyApplications((current) => current.map((item) =>
        Number(item.application_id) === Number(applicationId) ? { ...item, status } : item
      ));
      showMessage(data.message || `Application ${status}.`, 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to update application.', 'error');
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  const handleDownloadCV = async (application) => {
    if (!loggedUser || loggedUser.role !== 'company') return;

    setCvDownloadingId(application.application_id);
    try {
      const response = await apiFetch(
        `${API_URL}/company/applications/${application.application_id}/cv?user_id=${loggedUser.user_id}`
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Unable to download CV.');
      }

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `Student-CV-${application.application_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
      showMessage('CV downloaded successfully.', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to download CV.', 'error');
    } finally {
      setCvDownloadingId(null);
    }
  };

  const handlePreviewCV = async (application) => {
    if (!loggedUser || loggedUser.role !== 'company') return;
    try {
      const response = await apiFetch(`${API_URL}/company/applications/${application.application_id}/cv?user_id=${loggedUser.user_id}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Unable to preview CV.');
      }
      const blob = await response.blob();
      const previewUrl = window.URL.createObjectURL(blob);
      const previewWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer');
      if (!previewWindow) showMessage('Your browser blocked the CV preview. Please use Download CV instead.', 'info');
      window.setTimeout(() => window.URL.revokeObjectURL(previewUrl), 60_000);
    } catch (error) {
      showMessage(error.message || 'Unable to preview CV.', 'error');
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) {
        const response = await apiFetch(
          `${API_URL}/notifications/${notification.notification_id}/read`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: loggedUser.user_id }),
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to update notification');

        setNotifications((current) => current.map((item) =>
          item.notification_id === notification.notification_id
            ? { ...item, is_read: 1 }
            : item
        ));
      }
      setNotificationsOpen(false);
      navigate(loggedUser?.role === 'company' ? 'company-applications' : 'applications');
    } catch (error) {
      showMessage(error.message || 'Unable to open notification.', 'error');
    }
  };

  const handleSaveCompanyProfile = async (e) => {
    e.preventDefault();
    if (!loggedUser || !companyProfile) return;

    setProfileSaving(true);
    try {
      const response = await apiFetch(
        `${API_URL}/company/profile/${loggedUser.user_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: companyProfile.full_name,
            company_name: companyProfile.company_name,
            description: companyProfile.description,
            website: companyProfile.website,
            location: companyProfile.location,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }

      setLoggedUser((current) => ({
        ...current,
        full_name: companyProfile.full_name,
      }));
      showMessage(data.message || 'Company profile updated successfully!', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to update company profile.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !loggedUser) {
      showMessage('Please select a logo image first.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('logo', logoFile);
    setLogoUploading(true);

    try {
      const response = await apiFetch(
        `${API_URL}/company/profile/${loggedUser.user_id}/logo`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Logo upload failed');
      }

      setCompanyProfile((current) => ({ ...current, logo: data.logo }));
      setLogoPreview(`http://localhost:5000${data.logo}`);
      setLogoFile(null);
      showMessage(data.message || 'Company logo uploaded successfully!', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to upload company logo.', 'error');
    } finally {
      setLogoUploading(false);
    }
  };

  const studentName = loggedUser?.full_name || 'Student';
  const companyDisplayName = companyProfile?.company_name || loggedUser?.company_name || loggedUser?.full_name || 'Company';
  const accountDisplayName = loggedUser?.role === 'company' ? companyDisplayName : studentName;
  const firstName = accountDisplayName.trim().split(' ')[0] || (loggedUser?.role === 'company' ? 'Company' : 'Student');
  const initials = accountDisplayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || (loggedUser?.role === 'company' ? 'C' : 'S');

  // Resolve the saved company logo for all company workspace identity areas.
  const getCompanyLogoSrc = () => {
    const logoPath = logoPreview || companyProfile?.logo || '';
    if (!logoPath) return '';
    if (/^https?:\/\//i.test(logoPath)) return logoPath;
    return `http://localhost:5000${logoPath.startsWith('/') ? logoPath : `/${logoPath}`}`;
  };

  // Reuse the profile image already saved for this student.
  const getStudentPhotoSrc = () => {
    const imagePath = studentPhotoPreview || studentProfile?.profile_image || '';
    if (!imagePath) return '';
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `http://localhost:5000${normalizedPath}`;
  };

  const featuredInternships = useMemo(
    () => internships.slice(0, 3),
    [internships]
  );

  const pendingCount = applications.filter(
    (application) => application.status === 'pending'
  ).length;
  const acceptedCount = applications.filter(
    (application) => application.status === 'accepted'
  ).length;

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
  };

  const handleSaveStudentProfile = async (e) => {
    e.preventDefault();
    if (!studentProfile) return;
    setStudentProfileSaving(true);
    try {
      const response = await apiFetch(`${API_URL}/student/profile/${loggedUser.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: studentProfile.full_name,
          phone: studentProfile.phone,
          university: studentProfile.university,
          degree_program: studentProfile.degree_program,
          skills: studentProfile.skills,
          about_me: studentProfile.about_me
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to save student profile');
      setLoggedUser((current) => ({ ...current, full_name: studentProfile.full_name }));
      showMessage(data.message || 'Student profile updated successfully!', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to save student profile.', 'error');
    } finally {
      setStudentProfileSaving(false);
    }
  };

  const handleStudentPhotoUpload = async () => {
    if (!studentPhotoFile || !loggedUser) {
      showMessage('Please select a profile photo first.', 'error');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(studentPhotoFile.type)) {
      showMessage('Please choose a JPG, PNG or WEBP image.', 'error');
      return;
    }
    if (studentPhotoFile.size > 2 * 1024 * 1024) {
      showMessage('Profile photo must be smaller than 2MB.', 'error');
      return;
    }
    setStudentPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', studentPhotoFile);
      const response = await apiFetch(`${API_URL}/student/profile/${loggedUser.user_id}/photo`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Profile photo upload failed');
      setStudentProfile((current) => ({ ...current, profile_image: data.profile_image }));
      setStudentPhotoPreview(`http://localhost:5000${data.profile_image}?t=${Date.now()}`);
      setStudentPhotoFile(null);
      const fileInput = document.getElementById('studentPhotoInput');
      if (fileInput) fileInput.value = '';
      showMessage(data.message || 'Profile photo uploaded successfully!', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to upload profile photo.', 'error');
    } finally {
      setStudentPhotoUploading(false);
    }
  };

  const handleRemoveStudentPhoto = async () => {
    if (!loggedUser || !studentProfile?.profile_image) return;
    try {
      const response = await apiFetch(`${API_URL}/student/profile/${loggedUser.user_id}/photo`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to remove profile photo');
      setStudentProfile((current) => ({ ...current, profile_image: '' }));
      setStudentPhotoPreview('');
      setStudentPhotoFile(null);
      showMessage(data.message || 'Profile photo removed.', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to remove profile photo.', 'error');
    }
  };

  const handleStudentCvUpload = async () => {
    if (!studentCvFile) return;
    if (studentCvFile.type !== 'application/pdf' || !studentCvFile.name.toLowerCase().endsWith('.pdf')) {
      showMessage('Please choose a PDF file.', 'error');
      return;
    }
    if (studentCvFile.size > 5 * 1024 * 1024) {
      showMessage('CV must be smaller than 5MB.', 'error');
      return;
    }
    setStudentCvUploading(true);
    try {
      const formData = new FormData();
      formData.append('cv', studentCvFile);
      const response = await apiFetch(`${API_URL}/student/profile/${loggedUser.user_id}/cv`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'CV upload failed');
      setStudentProfile((current) => ({ ...current, cv_path: data.cv_path || current.cv_path }));
      setStudentCvFile(null);
      showMessage(data.message || 'CV uploaded successfully!', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to upload CV.', 'error');
    } finally {
      setStudentCvUploading(false);
    }
  };

  const navigate = (nextPage) => {
    setMessage('');
    setPage(nextPage);
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      showMessage('Registration successful! You can now log in.', 'success');
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('student');
    } catch (error) {
      showMessage(error.message || 'Unable to register. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.token) window.localStorage.setItem('careerconnect_token', data.token);
      window.localStorage.setItem('careerconnect_user', JSON.stringify(data.user));
      setLoggedUser(data.user);
      setLoginEmail('');
      setLoginPassword('');
      setPage(data.user.role === 'admin' ? 'admin-dashboard' : 'dashboard');
      setMessage('');
    } catch (error) {
      showMessage(error.message || 'Unable to log in. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem('careerconnect_token');
    window.localStorage.removeItem('careerconnect_user');
    setLoggedUser(null);
    setMessage('');
    setPage('home');
    setMobileSidebarOpen(false);
  };

  const handleCreateInternship = async (e) => {
    e.preventDefault();
    if (!loggedUser || loggedUser.role !== 'company') {
      showMessage('Please log in with a company account.', 'error');
      return;
    }
    setInternshipSubmitting(true);
    setMessage('');
    try {
      const response = await apiFetch(`${API_URL}/company/internships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: loggedUser.user_id, ...internshipForm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to publish internship.');

      const refreshResponse = await apiFetch(`${API_URL}/internships`);
      if (!refreshResponse.ok) throw new Error('Internship was published, but the list could not be refreshed.');
      const refreshedInternships = await refreshResponse.json();
      setInternships(Array.isArray(refreshedInternships) ? refreshedInternships : []);
      setInternshipForm({
        title: '', description: '', requirements: '', location: '',
        internship_type: 'Full-time', deadline: '',
      });
      setPage('internships');
      showMessage(data.message || 'Internship published successfully!', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to publish internship.', 'error');
    } finally {
      setInternshipSubmitting(false);
    }
  };

  const openEditInternship = (job) => {
    setEditingInternship(job);
    setEditInternshipForm({
      title: job.title || '', description: job.description || '',
      requirements: job.requirements || '', location: job.location || '',
      internship_type: job.internship_type || 'Full-time',
      deadline: getLocalDateInputValue(job.deadline),
    });
  };

  const handleUpdateInternship = async (e) => {
    e.preventDefault();
    if (!editingInternship || !loggedUser) return;
    setInternshipUpdating(true);
    try {
      const response = await apiFetch(`${API_URL}/company/internships/${editingInternship.internship_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: loggedUser.user_id, ...editInternshipForm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update internship');
      setCompanyInternships((items) => items.map((item) => Number(item.internship_id) === Number(editingInternship.internship_id) ? { ...item, ...editInternshipForm } : item));
      setInternships((items) => items.map((item) => Number(item.internship_id) === Number(editingInternship.internship_id) ? { ...item, ...editInternshipForm } : item));
      setEditingInternship(null);
      showMessage(data.message || 'Internship updated successfully!', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to update internship.', 'error');
    } finally { setInternshipUpdating(false); }
  };

  const handleDeleteInternship = async (job) => {
    if (!loggedUser) return;
    if (!window.confirm(`Delete the internship \"${job.title}\"? This cannot be undone.`)) return;
    setInternshipDeletingId(job.internship_id);
    try {
      const response = await apiFetch(`${API_URL}/company/internships/${job.internship_id}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: loggedUser.user_id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to delete internship');
      setCompanyInternships((items) => items.filter((item) => Number(item.internship_id) !== Number(job.internship_id)));
      setInternships((items) => items.filter((item) => Number(item.internship_id) !== Number(job.internship_id)));
      showMessage(data.message || 'Internship deleted successfully!', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to delete internship.', 'error');
    } finally { setInternshipDeletingId(null); }
  };

  const handleViewInternship = (job) => {
    setSelectedInternship(job);
    navigate('internship-details');
  };

  const handleApplyClick = (job) => {
    if (!loggedUser) {
      showMessage('Please log in to apply for internships.', 'info');
      setPage('login');
      return;
    }

    if (loggedUser.role !== 'student') {
      showMessage('Only student accounts can apply for internships.', 'error');
      return;
    }

    const alreadyApplied = applications.some(
      (application) => Number(application.internship_id) === Number(job.internship_id)
    );

    if (alreadyApplied) {
      showMessage('You have already applied for this internship.', 'info');
      setPage('applications');
      return;
    }

    setSelectedInternship(job);
    setCoverLetter('');
    setCvFile(null);
    navigate('apply');
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    if (!loggedUser || loggedUser.role !== 'student' || !selectedInternship) {
      showMessage('Please log in with a student account before applying.', 'error');
      return;
    }

    setApplicationSubmitting(true);
    setMessage('');

    try {
      if (!cvFile && !studentProfile.cv_path) {
        throw new Error('Please upload a CV in My Profile before applying, or select a PDF below.');
      }

      const formData = new FormData();
      formData.append('internship_id', selectedInternship.internship_id);
      formData.append('student_id', loggedUser.user_id);
      formData.append('cover_letter', coverLetter.trim());
      if (cvFile) formData.append('cv', cvFile);

      const response = await apiFetch(`${API_URL}/applications`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Application submission failed');
      }

      const applicationsResponse = await apiFetch(
        `${API_URL}/applications/student/${loggedUser.user_id}`
      );
      const applicationsData = await applicationsResponse.json();
      if (!applicationsResponse.ok) {
        throw new Error(applicationsData.message || 'Application submitted, but the list could not be refreshed.');
      }

      setApplications(Array.isArray(applicationsData) ? applicationsData : []);
      setSelectedInternship(null);
      setCoverLetter('');
      setCvFile(null);
      setPage('applications');
      showMessage(data.message || 'Application submitted successfully!', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to submit application.', 'error');
    } finally {
      setApplicationSubmitting(false);
    }
  };

  const DashboardSidebar = () => (
    <>
      <div className="sidebar-brand">
        <div className="brand-mark">C</div>
        <span>Career<strong>Connect</strong></span>
      </div>

      <div className="sidebar-user">
        <div className={`avatar ${loggedUser?.role === 'company' ? 'company-account-avatar' : ''}`}>
          {loggedUser?.role === 'student' && getStudentPhotoSrc() ? (
            <img className="dashboard-avatar-image" src={getStudentPhotoSrc()} alt={`${studentName} profile`} />
          ) : loggedUser?.role === 'company' && getCompanyLogoSrc() ? (
            <img className="dashboard-avatar-image company-logo-avatar-image" src={getCompanyLogoSrc()} alt={`${companyDisplayName} logo`} />
          ) : initials}
        </div>
        <div className="sidebar-user-copy">
          <strong>{accountDisplayName}</strong>
          <span>{loggedUser?.role || 'student'} account</span>
        </div>
      </div>

      <p className="sidebar-label">WORKSPACE</p>
      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        <button className={page === 'dashboard' || page === 'admin-dashboard' ? 'active' : ''} onClick={() => navigate(loggedUser?.role === 'admin' ? 'admin-dashboard' : 'dashboard')}>
          <span className="nav-icon">▦</span> {loggedUser?.role === 'admin' ? 'Admin Overview' : 'Overview'}
        </button>
        <button className={page === 'internships' ? 'active' : ''} onClick={() => navigate('internships')}>
          <span className="nav-icon">⌕</span> Browse Internships
        </button>
        {loggedUser?.role === 'student' && (
          <button className={page === 'saved-internships' ? 'active' : ''} onClick={() => navigate('saved-internships')}>
            <span className="nav-icon">☆</span> Saved Internships
          </button>
        )}
        {loggedUser?.role === 'company' && (
          <button className={page === 'post-internship' ? 'active' : ''} onClick={() => navigate('post-internship')}>
            <span className="nav-icon">＋</span> Post Internship
          </button>
        )}
        {loggedUser?.role === 'company' && (
          <button className={page === 'my-internships' ? 'active' : ''} onClick={() => navigate('my-internships')}>
            <span className="nav-icon">▣</span> My Internships
          </button>
        )}
        {loggedUser?.role === 'company' ? (
          <button className={page === 'company-applications' ? 'active' : ''} onClick={() => navigate('company-applications')}>
            <span className="nav-icon">▤</span> Received Applications
          </button>
        ) : loggedUser?.role === 'student' ? (
          <button className={page === 'applications' ? 'active' : ''} onClick={() => navigate('applications')}>
            <span className="nav-icon">▤</span> My Applications
          </button>
        ) : null}
        {loggedUser?.role !== 'admin' && (
          <button className={page === 'profile' ? 'active' : ''} onClick={() => navigate('profile')}>
            <span className="nav-icon">◎</span> My Profile
          </button>
        )}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-help">
          <span className="help-icon">?</span>
          <strong>Need some help?</strong>
          <p>We're here to support your career journey.</p>
          <button onClick={() => showMessage('Support contact details can be added here.', 'info')}>
            Get support
          </button>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <span className="nav-icon">↪</span> Log out
        </button>
      </div>
    </>
  );

  const DashboardLayout = ({ children }) => (
    <div className="dashboard-shell">
      <aside className={`dashboard-sidebar ${mobileSidebarOpen ? 'sidebar-open' : ''}`}>
        <DashboardSidebar />
      </aside>

      {mobileSidebarOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            className="mobile-menu-button"
            aria-label="Open navigation"
            onClick={() => setMobileSidebarOpen(true)}
          >
            ☰
          </button>
          {loggedUser?.role === 'student' ? (
            <div className="student-topbar-search">
              <span>⌕</span>
              <input
                type="search"
                value={internshipSearch}
                onChange={(event) => setInternshipSearch(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') navigate('internships'); }}
                placeholder="Search internships, companies or keywords…"
                aria-label="Search internships, companies or keywords"
              />
              <kbd>Enter</kbd>
            </div>
          ) : (
            <div className="breadcrumb">Workspace <span>/</span> {page === 'dashboard' ? 'Overview' : page === 'internships' ? 'Internships' : page === 'post-internship' ? 'Post Internship' : page === 'my-internships' ? 'My Internships' : page === 'applications' ? 'My Applications' : page === 'saved-internships' ? 'Saved Internships' : page === 'admin-dashboard' ? 'Admin Dashboard' : page === 'apply' ? 'Apply for Internship' : page === 'company-applications' ? 'Received Applications' : 'My Profile'}</div>
          )}
          <div className="topbar-right">
            <span className="topbar-date">CareerConnect Portal</span>
            {['student', 'company'].includes(loggedUser?.role) && (
              <div className="notification-wrapper">
                <button
                  type="button"
                  className="notification-bell"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  aria-label="Notifications"
                >
                  🔔
                  {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
                </button>
                {notificationsOpen && (
                  <div className="notification-dropdown">
                    <div className="notification-header">
                      <strong>Notifications</strong>
                      <span>{unreadCount} unread</span>
                    </div>
                    {notificationLoading ? (
                      <p className="notification-empty">Loading...</p>
                    ) : notifications.length === 0 ? (
                      <p className="notification-empty">No notifications yet.</p>
                    ) : (
                      <div className="notification-list">
                        {notifications.map((notification) => (
                          <button
                            type="button"
                            key={notification.notification_id}
                            className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <strong>{notification.title}</strong>
                            <p>{notification.message}</p>
                            <small>{new Date(notification.created_at).toLocaleString()}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <span className={loggedUser?.role === 'student' ? 'student-topbar-name' : 'company-topbar-name'}>{firstName}</span>
            <div className={`avatar avatar-small ${loggedUser?.role === 'company' ? 'company-account-avatar' : ''}`}>
              {loggedUser?.role === 'student' && getStudentPhotoSrc() ? (
                <img className="dashboard-avatar-image" src={getStudentPhotoSrc()} alt={`${studentName} profile`} />
              ) : loggedUser?.role === 'company' && getCompanyLogoSrc() ? (
                <img className="dashboard-avatar-image company-logo-avatar-image" src={getCompanyLogoSrc()} alt={`${companyDisplayName} logo`} />
              ) : initials}
            </div>
          </div>
        </header>
        <main className="dashboard-content">
          {message && (
            <div className={`message-banner ${messageType}`} role="status">
              <span>{message}</span>
              <button aria-label="Dismiss message" onClick={() => setMessage('')}>×</button>
            </div>
          )}
          {children}
        </main>
        <footer className="dashboard-footer">
          © 2026 CareerConnect. Connecting talent with opportunity.
        </footer>
      </div>
    </div>
  );

  const InternshipCard = ({ job }) => (
    <article className="internship-card" key={job.internship_id}>
      <div className="company-avatar internship-image">
        <img src={getInternshipPhoto(job)} alt={`${job.title || 'Internship'} workplace`} loading="lazy" />
        <span>{(job.company_name || 'C').charAt(0).toUpperCase()}</span>
      </div>
      <div className="internship-card-body">
        <div className="internship-card-heading">
          <div>
            <h3>{job.title}</h3>
            <p>{job.company_name || 'Company'}</p>
          </div>
          <span className="type-pill">{job.internship_type || 'Internship'}</span>
        </div>
        <div className="internship-meta">
          {job.location && <span>⌖ {job.location}</span>}
          {job.deadline && <span>◷ Deadline: {formatLocalDate(job.deadline)}</span>}
        </div>
        {job.description && <p className="internship-description">{job.description}</p>}
        <div className="internship-card-actions cc-internship-card-actions">
          {loggedUser?.role === 'student' && (
            <button className="button-secondary button-small" type="button" onClick={() => toggleSavedInternship(job)} aria-pressed={isInternshipSaved(job.internship_id)}>
              {isInternshipSaved(job.internship_id) ? '★ Saved' : '☆ Save'}
            </button>
          )}
          <button className="button-secondary button-small" onClick={() => handleViewInternship(job)}>View details</button>
          <button className="button-primary button-small" onClick={() => handleApplyClick(job)}>Apply Now <span>→</span></button>
        </div>
      </div>
    </article>
  );

  const internshipTypes = [...new Set(internships.map((job) => String(job.internship_type || '').trim()).filter(Boolean))].sort();
  const internshipLocations = [...new Set(internships.map((job) => String(job.location || '').trim()).filter(Boolean))].sort();

  const filteredInternships = useMemo(() => {
    const query = internshipSearch.trim().toLowerCase();
    const filtered = internships.filter((job) => {
      const searchable = [job.title, job.company_name, job.description, job.requirements, job.location, job.internship_type]
        .filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesType = internshipTypeFilter === 'all' || String(job.internship_type || '') === internshipTypeFilter;
      const matchesLocation = internshipLocationFilter === 'all' || String(job.location || '') === internshipLocationFilter;
      return matchesSearch && matchesType && matchesLocation;
    });

    return [...filtered].sort((a, b) => {
      if (internshipSort === 'title') return String(a.title || '').localeCompare(String(b.title || ''));
      if (internshipSort === 'company') return String(a.company_name || '').localeCompare(String(b.company_name || ''));
      const aDate = new Date(a.created_at || a.posted_at || a.internship_id || 0).getTime();
      const bDate = new Date(b.created_at || b.posted_at || b.internship_id || 0).getTime();
      return internshipSort === 'oldest' ? aDate - bDate : bDate - aDate;
    });
  }, [internships, internshipSearch, internshipTypeFilter, internshipLocationFilter, internshipSort]);

  const clearInternshipFilters = () => {
    setInternshipSearch('');
    setInternshipTypeFilter('all');
    setInternshipLocationFilter('all');
    setInternshipSort('latest');
  };

  const browseInternshipContent = (
    <>
      <section className="cc-browse-intro">
        <div>
          <span className="cc-browse-eyebrow">YOUR NEXT OPPORTUNITY</span>
          <h1>Find an internship that moves you forward.</h1>
          <p>Explore real opportunities from companies and take the next step in your career.</p>
        </div>
        <div className="cc-browse-total">
          <strong>{internships.length}</strong>
          <span>opportunities</span>
        </div>
      </section>

      <section className="cc-browse-search-panel" aria-label="Search and filter internships">
        <div className="cc-browse-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={internshipSearch}
            onChange={(e) => setInternshipSearch(e.target.value)}
            placeholder="Search by job title, company or keyword"
            aria-label="Search internships"
          />
          {internshipSearch && <button type="button" onClick={() => setInternshipSearch('')} aria-label="Clear search">×</button>}
        </div>
        <div className="cc-browse-filter">
          <label htmlFor="browse-type-filter">Internship type</label>
          <select id="browse-type-filter" value={internshipTypeFilter} onChange={(e) => setInternshipTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            {internshipTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="cc-browse-filter">
          <label htmlFor="browse-location-filter">Location</label>
          <select id="browse-location-filter" value={internshipLocationFilter} onChange={(e) => setInternshipLocationFilter(e.target.value)}>
            <option value="all">All locations</option>
            {internshipLocations.map((location) => <option key={location} value={location}>{location}</option>)}
          </select>
        </div>
      </section>

      <div className="cc-browse-results-row">
        <p><strong>{filteredInternships.length}</strong> {filteredInternships.length === 1 ? 'internship' : 'internships'} found</p>
        <div className="cc-browse-sort">
          <label htmlFor="browse-sort">Sort by</label>
          <select id="browse-sort" value={internshipSort} onChange={(e) => setInternshipSort(e.target.value)}>
            <option value="latest">Latest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Job title</option>
            <option value="company">Company name</option>
          </select>
        </div>
      </div>

      {internshipLoading ? (
        <div className="cc-browse-state"><span className="cc-browse-spinner" />Loading internship opportunities...</div>
      ) : filteredInternships.length ? (
        <div className="internship-list public-internship-list browse-internship-grid cc-browse-grid">
          {filteredInternships.map((job) => <InternshipCard key={job.internship_id} job={job} />)}
        </div>
      ) : (
        <div className="cc-browse-empty">
          <div>⌕</div>
          <h2>{internships.length ? 'No matching internships' : 'No internships available yet'}</h2>
          <p>{internships.length ? 'Try changing your search or filters to see more opportunities.' : 'New opportunities will appear here when companies publish them.'}</p>
          {internships.length > 0 && <button type="button" onClick={clearInternshipFilters}>Clear all filters</button>}
        </div>
      )}
    </>
  );

  return (
    <div className="app">
      {/* Public navigation */}
      {!['dashboard', 'applications', 'company-applications', 'profile', 'apply', 'post-internship', 'my-internships'].includes(page) && (
        <nav className="navbar cc-navbar-premium">
          <button className="public-brand" onClick={() => { navigate('home'); setPublicMenuOpen(false); }} aria-label="CareerConnect home">
            <span className="cc-brand-mark">C</span><span className="cc-brand-name">Career<span>Connect</span></span>
          </button>
          <button className="cc-mobile-menu-toggle" aria-label={publicMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={publicMenuOpen} onClick={() => setPublicMenuOpen(open => !open)}>
            <span></span><span></span><span></span>
          </button>
          <div className={`nav-links cc-public-nav-links ${publicMenuOpen ? 'cc-mobile-menu-open' : ''}`}>
            <button className={page === 'home' ? 'cc-nav-active' : ''} onClick={() => { navigate('home'); setPublicMenuOpen(false); }}>Home</button>
            <button className={page === 'internships' ? 'cc-nav-active' : ''} onClick={() => { navigate('internships'); setPublicMenuOpen(false); }}>Internships</button>
            <div className="cc-nav-dropdown">
              <button className="cc-nav-dropdown-trigger" aria-haspopup="true">For Students <span className="cc-nav-chevron">⌄</span></button>
              <div className="cc-nav-dropdown-menu">
                <button onClick={() => { navigate('internships'); setPublicMenuOpen(false); }}>Browse internships</button>
                <button onClick={() => { navigate('register'); setPublicMenuOpen(false); }}>Create student account</button>
                <button onClick={() => { navigate('login'); setPublicMenuOpen(false); }}>Student login</button>
              </div>
            </div>
            <div className="cc-nav-dropdown">
              <button className="cc-nav-dropdown-trigger" aria-haspopup="true">For Companies <span className="cc-nav-chevron">⌄</span></button>
              <div className="cc-nav-dropdown-menu">
                <button onClick={() => { navigate('register'); setPublicMenuOpen(false); }}>Create company account</button>
                <button onClick={() => { navigate('login'); setPublicMenuOpen(false); }}>Company login</button>
                <button onClick={() => { navigate(loggedUser?.role === 'company' ? 'post-internship' : 'register'); setPublicMenuOpen(false); }}>Post an internship</button>
              </div>
            </div>
            <button className={page === 'about' ? 'cc-nav-active' : ''} onClick={() => { navigate('about'); setPublicMenuOpen(false); }}>About</button>
            {loggedUser ? (
              <><button onClick={() => { navigate('dashboard'); setPublicMenuOpen(false); }}>Dashboard</button><button className="nav-logout" onClick={() => { handleLogout(); setPublicMenuOpen(false); }}>Logout</button></>
            ) : (
              <><button className="cc-login-button" onClick={() => { navigate('login'); setPublicMenuOpen(false); }}><span className="cc-nav-button-icon">♙</span> Log In</button><button className="register" onClick={() => { navigate('register'); setPublicMenuOpen(false); }}><span className="cc-nav-button-icon">♧</span> Register</button></>
            )}
          </div>
        </nav>
      )}

      {/* Home */}
      {page === 'home' && (
        <>
          <section className="cc-home-hero">
            <div className="cc-home-hero-copy">
              <span className="cc-home-eyebrow">✦ &nbsp; INTERNSHIP PLATFORM</span>
              <h1>Launch Your Career with <span>CareerConnect</span></h1>
              <p>A modern internship portal that connects talented students with leading companies for real-world experience, skills, and career growth.</p>
              <div className="cc-home-actions">
                <button className="cc-home-primary" onClick={() => navigate('internships')}>⌕ &nbsp; Find Internships</button>
                <button className="cc-home-secondary" onClick={() => navigate(loggedUser?.role === 'company' ? 'post-internship' : 'register')}>▣ &nbsp; Post an Internship</button>
              </div>
              <div className="cc-home-stats">
                <div><strong>{internships.length}</strong><span>Live opportunities</span></div>
                <i />
                <div><strong>{new Set(internships.map((job) => job.company_name).filter(Boolean)).size}</strong><span>Hiring companies</span></div>
                <i />
                <div><strong>{new Set(internships.map((job) => job.internship_type).filter(Boolean)).size || 1}</strong><span>Opportunity types</span></div>
              </div>
            </div>
            <div className="cc-home-hero-photo">
              <img src="/careerconnect-team.png" alt="Students collaborating on a laptop in a modern workplace" fetchPriority="high" />
              <div className="cc-home-photo-accent" />
            </div>
          </section>

          <section className="cc-featured-section">
            <div className="cc-featured-heading">
              <div><span className="cc-section-kicker">START YOUR NEXT CHAPTER</span><h2>Featured Internships</h2><p>Explore the latest internship opportunities from companies.</p></div>
              <button onClick={() => navigate('internships')}>View All Internships <span>→</span></button>
            </div>
            {internshipLoading ? (
              <div className="cc-home-empty">Loading the latest opportunities...</div>
            ) : internships.length ? (
              <div className="cc-featured-grid">
                {internships.slice(0, 4).map((job) => (
                  <article className="cc-featured-card" key={job.internship_id}>
                    <div className="cc-featured-image"><img src={getInternshipPhoto(job)} alt={`${job.title || 'Internship'} workplace`} loading="lazy" /><span className="cc-featured-bookmark" aria-hidden="true">☆</span></div>
                    <div className="cc-featured-body">
                      <div className="cc-featured-company"><span>{(job.company_name || 'C').charAt(0).toUpperCase()}</span><strong>{job.company_name || 'Company'}</strong></div>
                      <h3>{job.title || 'Internship opportunity'}</h3>
                      <div className="cc-featured-tags"><span>{job.internship_type || 'Internship'}</span><span>Career opportunity</span></div>
                      <div className="cc-featured-footer"><span>⌖ &nbsp;{job.location || 'Location not specified'}</span><div><button className="cc-featured-details" onClick={() => handleViewInternship(job)}>Details</button><button onClick={() => handleApplyClick(job)}>Apply Now</button></div></div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cc-home-empty"><strong>New opportunities are on the way.</strong><span>Check back soon to explore internships posted by companies.</span></div>
            )}
          </section>

          <section className="cc-home-bottom" id="cc-home-about">
            <div><span className="cc-section-kicker">BUILT FOR BOTH SIDES</span><h2>Find opportunities. Discover talent.</h2><p>CareerConnect helps students take their first career step and helps companies connect with motivated emerging talent.</p></div>
            <div className="cc-home-bottom-actions"><button onClick={() => navigate('internships')}>Explore internships →</button><button onClick={() => navigate('register')}>Join CareerConnect →</button></div>
          </section>
        </>
      )}

      {/* Modern Corporate About page */}
      {page === 'about' && (
        <main className="cc-about-page cc-about-modern">
          <section className="cc-about-hero">
            <div className="cc-about-hero-copy">
              <span className="cc-about-kicker">ABOUT CAREERCONNECT</span>
              <h1>Connecting ambition with <span>opportunity.</span></h1>
              <p>We bring students and companies together through meaningful internship opportunities, helping emerging talent gain practical experience and take confident steps towards their careers.</p>
              <div className="cc-about-actions">
                <button onClick={() => navigate('internships')}>Explore internships <span>→</span></button>
                <button onClick={() => navigate('register')}>Join CareerConnect</button>
              </div>
              <div className="cc-about-hero-note"><span>✦</span> One platform. New possibilities.</div>
            </div>
            <div className="cc-about-hero-visual">
              <img src="/about-team.png" alt="CareerConnect team collaborating in a modern office" />
              <div className="cc-about-image-caption"><strong>Build your next chapter</strong><span>Discover. Connect. Grow.</span></div>
            </div>
          </section>

          <section className="cc-about-intro">
            <div className="cc-about-intro-heading"><span className="cc-about-kicker">WHO WE ARE</span><h2>A simpler way to connect talent with opportunity.</h2></div>
            <p>CareerConnect is an internship platform designed around the needs of students and hiring companies. Students can discover opportunities and manage applications, while companies can introduce roles and connect with motivated emerging talent.</p>
          </section>

          <section className="cc-about-purpose-grid">
            <article className="cc-about-purpose-card cc-about-mission-card">
              <span className="cc-about-purpose-icon">◎</span><span className="cc-about-kicker">OUR MISSION</span>
              <h2>Make career beginnings more accessible.</h2>
              <p>Our mission is to make it easier for students to find relevant internship opportunities and for companies to discover promising talent through a clear, accessible platform.</p>
            </article>
            <article className="cc-about-purpose-card cc-about-vision-card">
              <span className="cc-about-purpose-icon">↗</span><span className="cc-about-kicker">OUR VISION</span>
              <h2>A connected future for emerging talent.</h2>
              <p>We envision a future where every aspiring professional can explore meaningful work experience and every company can connect with the next generation of talent.</p>
            </article>
          </section>

          <section className="cc-about-pillars">
            <div className="cc-about-section-heading"><span className="cc-about-kicker">WHY CAREERCONNECT</span><h2>Everything you need to take the next step.</h2><p>A focused experience that supports both sides of the internship journey.</p></div>
            <div className="cc-about-pillar-grid">
              <article><span className="cc-about-icon">⌕</span><h3>Discover opportunities</h3><p>Browse internship listings, explore role details and find opportunities that match your interests.</p></article>
              <article><span className="cc-about-icon">▤</span><h3>Manage applications</h3><p>Keep your applications organised and follow their progress from your student workspace.</p></article>
              <article><span className="cc-about-icon">♧</span><h3>Connect with talent</h3><p>Companies can publish opportunities and review applications from interested candidates.</p></article>
            </div>
          </section>

          <section className="cc-about-audience">
            <div className="cc-about-section-heading"><span className="cc-about-kicker">BUILT FOR BOTH SIDES</span><h2>One platform, shared progress.</h2></div>
            <div className="cc-about-audience-grid">
              <article><span className="cc-about-audience-label">FOR STUDENTS</span><h3>Turn your ambition into experience.</h3><p>Create your profile, discover internships and keep track of your applications in one place.</p><button onClick={() => navigate('internships')}>Find internships <span>→</span></button></article>
              <article><span className="cc-about-audience-label">FOR COMPANIES</span><h3>Meet the next generation of talent.</h3><p>Share internship opportunities, outline your requirements and connect with aspiring professionals.</p><button onClick={() => { setRole('company'); navigate('register'); }}>Join as a company <span>→</span></button></article>
            </div>
          </section>

          <section className="cc-about-cta"><div><span className="cc-about-kicker">YOUR NEXT CHAPTER STARTS HERE</span><h2>Ready to move forward?</h2><p>Explore opportunities or become part of the CareerConnect community today.</p></div><button onClick={() => navigate('internships')}>Browse internships <span>→</span></button></section>
        </main>
      )}

      {/* Internship details page */}
      {page === 'internship-details' && selectedInternship && (
        <main className="cc-details-page">
          <button className="cc-details-back" onClick={() => navigate('internships')}>← Back to internships</button>
          <section className="cc-details-hero">
            <img src={getInternshipPhoto(selectedInternship)} alt={`${selectedInternship.title || 'Internship'} workplace`} />
            <div className="cc-details-hero-shade" />
            <div className="cc-details-hero-content"><span className="cc-about-kicker">INTERNSHIP OPPORTUNITY</span><h1>{selectedInternship.title || 'Internship opportunity'}</h1><p>{selectedInternship.company_name || 'Company'} <span>·</span> {selectedInternship.location || 'Location not specified'}</p><div className="cc-details-tags"><span>{selectedInternship.internship_type || 'Internship'}</span><span>Application deadline: {selectedInternship.deadline ? formatLocalDate(selectedInternship.deadline) : 'Not specified'}</span></div></div>
          </section>
          <div className="cc-details-layout">
            <div className="cc-details-main">
              <section className="cc-details-panel"><span className="cc-about-kicker">ROLE OVERVIEW</span><h2>About this internship</h2><p>{selectedInternship.description || 'The company has not added a detailed description for this opportunity yet. Please contact the company for further information.'}</p></section>
              <section className="cc-details-panel"><span className="cc-about-kicker">WHAT YOU MAY NEED</span><h2>Requirements & qualifications</h2><p>{selectedInternship.requirements || 'No specific requirements have been provided. Review the role with the company before applying.'}</p></section>
              <section className="cc-details-panel"><span className="cc-about-kicker">THE OPPORTUNITY</span><h2>Key information</h2><div className="cc-details-facts"><div><small>Location</small><strong>{selectedInternship.location || 'Not specified'}</strong></div><div><small>Internship type</small><strong>{selectedInternship.internship_type || 'Not specified'}</strong></div><div><small>Application deadline</small><strong>{selectedInternship.deadline ? formatLocalDate(selectedInternship.deadline) : 'Not specified'}</strong></div><div><small>Company</small><strong>{selectedInternship.company_name || 'Company'}</strong></div></div></section>
            </div>
            <aside className="cc-details-sidebar"><span className="cc-about-kicker">INTERESTED IN THIS ROLE?</span><h2>Take the next step.</h2><p>Submit your application through CareerConnect and share your interest with the hiring company.</p><button onClick={() => handleApplyClick(selectedInternship)}>Apply for this internship <span>→</span></button><small>Student accounts can submit applications.</small></aside>
          </div>
        </main>
      )}

      {/* Student dashboard */}
      {page === 'dashboard' && loggedUser && (
        <DashboardLayout>
          {loggedUser.role === 'company' ? (
            <div className="student-dashboard-v2 company-dashboard-v2">
              <section className="student-dashboard-heading">
                <div>
                  <span className="section-kicker">COMPANY WORKSPACE</span>
                  <h1>Your company dashboard</h1>
                  <p>Manage your internship opportunities, review applications, and connect with emerging talent.</p>
                </div>
                <span className="student-dashboard-date">▦ &nbsp; {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </section>

              <section className="student-welcome-banner company-welcome-banner">
                <div className="student-welcome-copy">
                  <span>CAREERCONNECT FOR COMPANIES</span>
                  <h2>Welcome back, {firstName}! <b>✦</b></h2>
                  <p>Find promising candidates, manage your vacancies, and make your next great connection.</p>
                  <button onClick={() => navigate('post-internship')}>Post an internship <span>→</span></button>
                </div>
                <div className="student-welcome-photo company-welcome-photo" role="img" aria-label="Professionals collaborating in a modern workplace" />
                <div className="student-welcome-orb" />
              </section>

              <section className="student-dashboard-stats company-dashboard-stats">
                <article className="student-metric-card">
                  <span className="student-metric-icon blue">▣</span>
                  <div><small>Total internships</small><strong>{companyInternshipStatsLoading ? '…' : companyInternshipStats.total}</strong><span>Opportunities posted by you</span></div>
                </article>
                <article className="student-metric-card">
                  <span className="student-metric-icon green">✓</span>
                  <div><small>Active internships</small><strong>{companyInternshipStatsLoading ? '…' : companyInternshipStats.active}</strong><span>Currently open opportunities</span></div>
                </article>
                <article className="student-metric-card">
                  <span className="student-metric-icon amber">▤</span>
                  <div><small>Total applications</small><strong>{companyApplicationsLoading ? '…' : companyApplications.length}</strong><span>Applications received</span></div>
                </article>
                <article className="student-metric-card">
                  <span className="student-metric-icon violet">◷</span>
                  <div><small>Pending review</small><strong>{companyApplicationsLoading ? '…' : companyApplications.filter((a) => a.status === 'pending').length}</strong><span>Awaiting your decision</span></div>
                </article>
              </section>

              <div className="student-dashboard-columns">
                <div className="student-dashboard-primary-column">
                  <section className="student-dashboard-card student-applications-card">
                    <div className="student-card-heading">
                      <div><span className="student-card-heading-icon">◷</span><div><h2>Recent applications</h2><p>Review the latest students interested in your opportunities.</p></div></div>
                      <button onClick={() => navigate('company-applications')}>View all <span>→</span></button>
                    </div>
                    {companyApplicationsLoading ? <div className="student-dashboard-empty">Loading applications…</div> : companyApplications.length ? (
                      <div className="student-application-timeline">
                        {companyApplications.slice(0, 5).map((application) => (
                          <article className="student-application-item" key={application.application_id}>
                            <span className={`student-timeline-dot ${String(application.status || 'pending').toLowerCase()}`} />
                            <div className="student-application-company-mark">{(application.student_name || 'S').charAt(0).toUpperCase()}</div>
                            <div className="student-application-info"><strong>{application.student_name || 'Student applicant'}</strong><span>{application.title || 'Internship application'}</span><small>{application.student_email || 'Email not available'}</small></div>
                            <span className={`student-status-pill ${String(application.status || 'pending').toLowerCase()}`}>{String(application.status || 'pending').replaceAll('_', ' ')}</span>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="student-dashboard-empty"><span>▤</span><strong>No applications received yet</strong><p>When students apply for your internships, their applications will appear here.</p><button onClick={() => navigate('post-internship')}>Post an internship →</button></div>
                    )}
                  </section>

                  <section className="student-dashboard-card company-posted-card">
                    <div className="student-card-heading">
                      <div><span className="student-card-heading-icon">▣</span><div><h2>Your internship listings</h2><p>Keep track of the opportunities published by your company.</p></div></div>
                      <button onClick={() => navigate('my-internships')}>Manage all <span>→</span></button>
                    </div>
                    {companyInternshipsLoading ? <div className="student-dashboard-empty">Loading your internships…</div> : companyInternships.length ? (
                      <div className="company-dashboard-listings">
                        {companyInternships.slice(0, 3).map((job) => {
                          const deadlineDate = job.deadline ? new Date(`${getLocalDateInputValue(job.deadline)}T23:59:59`) : null;
                          const isActive = !deadlineDate || deadlineDate >= new Date();
                          const applicantCount = companyApplications.filter((item) => Number(item.internship_id) === Number(job.internship_id)).length;
                          return <article className="company-dashboard-listing" key={job.internship_id}>
                            <div className="company-dashboard-listing-icon">▣</div>
                            <div className="company-dashboard-listing-info"><strong>{job.title || 'Internship opportunity'}</strong><span>{job.location || 'Location not specified'} · {job.internship_type || 'Internship'}</span><small>{deadlineDate ? `Deadline: ${formatLocalDate(job.deadline)}` : 'No deadline specified'}</small></div>
                            <div className="company-dashboard-listing-meta"><span className={`company-listing-status ${isActive ? 'active' : 'closed'}`}>{isActive ? 'Active' : 'Closed'}</span><small>{applicantCount} applicant{applicantCount === 1 ? '' : 's'}</small></div>
                          </article>;
                        })}
                      </div>
                    ) : <div className="student-dashboard-empty"><span>▣</span><strong>No internships posted yet</strong><p>Create your first listing to start reaching potential candidates.</p><button onClick={() => navigate('post-internship')}>Create internship →</button></div>}
                  </section>
                </div>

                <aside className="student-dashboard-side-column">
                  <section className="student-dashboard-card company-review-card">
                    <div className="student-side-card-heading"><span className="student-side-icon">✓</span><div><h2>Application overview</h2><p>See how your applications are progressing.</p></div></div>
                    <div className="company-status-breakdown">
                      <div><span className="company-status-dot pending" /><span>Pending review</span><strong>{companyApplications.filter((a) => a.status === 'pending').length}</strong></div>
                      <div><span className="company-status-dot accepted" /><span>Accepted</span><strong>{companyApplications.filter((a) => a.status === 'accepted').length}</strong></div>
                      <div><span className="company-status-dot rejected" /><span>Rejected</span><strong>{companyApplications.filter((a) => a.status === 'rejected').length}</strong></div>
                    </div>
                    <button className="student-full-width-action" onClick={() => navigate('company-applications')}>Review applications <span>→</span></button>
                  </section>

                  <section className="student-dashboard-card company-quick-actions">
                    <div className="student-side-card-heading"><span className="student-side-icon violet">✧</span><div><h2>Quick actions</h2><p>Manage your hiring activity.</p></div></div>
                    <button onClick={() => navigate('post-internship')}>＋ <span><strong>Post an internship</strong><small>Publish a new opportunity</small></span><b>→</b></button>
                    <button onClick={() => navigate('my-internships')}>▣ <span><strong>Manage internships</strong><small>Update your current listings</small></span><b>→</b></button>
                    <button onClick={() => navigate('company-applications')}>▤ <span><strong>View applications</strong><small>Review interested candidates</small></span><b>→</b></button>
                  </section>

                  <section className="student-dashboard-tip company-dashboard-tip">
                    <span>✦</span><div><strong>Build your talent pipeline</strong><p>Keep internship details clear and review applications regularly to create a better experience for students.</p><button onClick={() => navigate('my-internships')}>Manage opportunities →</button></div>
                  </section>
                </aside>
              </div>
            </div>
          ) : (
          <>
          <div className="student-dashboard-v2">
            <section className="student-dashboard-heading">
              <div>
                <span className="section-kicker">STUDENT WORKSPACE</span>
                <h1>Your student dashboard</h1>
                <p>Manage your applications, track your progress, and discover new opportunities.</p>
              </div>
              <span className="student-dashboard-date">▦ &nbsp; {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </section>

            <section className="student-welcome-banner">
              <div className="student-welcome-copy">
                <span>CAREERCONNECT</span>
                <h2>Welcome back, {firstName}! <b>👋</b></h2>
                <p>Explore new internship opportunities, track your applications, and take the next step toward your career.</p>
                <button onClick={() => navigate('internships')}>Browse internships <span>→</span></button>
              </div>
              <div className="student-welcome-photo" role="img" aria-label="Students collaborating in a modern workplace" />
              <div className="student-welcome-orb" />
            </section>

            <section className="student-dashboard-stats">
              <article className="student-metric-card">
                <span className="student-metric-icon blue">▤</span>
                <div><small>Total applications</small><strong>{applicationLoading ? '…' : applications.length}</strong><span>Applications submitted</span></div>
              </article>
              <article className="student-metric-card">
                <span className="student-metric-icon amber">◷</span>
                <div><small>Pending review</small><strong>{applicationLoading ? '…' : pendingCount}</strong><span>Waiting for company response</span></div>
              </article>
              <article className="student-metric-card">
                <span className="student-metric-icon green">✓</span>
                <div><small>Accepted</small><strong>{applicationLoading ? '…' : acceptedCount}</strong><span>Positive application outcomes</span></div>
              </article>
              <article className="student-metric-card">
                <span className="student-metric-icon violet">☆</span>
                <div><small>Available internships</small><strong>{internshipLoading ? '…' : internships.length}</strong><span>Explore current opportunities</span></div>
              </article>
            </section>

            <div className="student-dashboard-columns">
              <div className="student-dashboard-primary-column">
                <section className="student-dashboard-card student-applications-card">
                  <div className="student-card-heading">
                    <div><span className="student-card-heading-icon">◷</span><div><h2>Recent applications</h2><p>Keep track of your latest application updates.</p></div></div>
                    <button onClick={() => navigate('applications')}>View all <span>→</span></button>
                  </div>
                  {applicationLoading ? <div className="student-dashboard-empty">Loading your applications…</div> : applications.length ? (
                    <div className="student-application-timeline">
                      {applications.slice(0, 4).map((application, index) => (
                        <article className="student-application-item" key={application.application_id}>
                          <span className={`student-timeline-dot ${String(application.status || 'pending').toLowerCase()}`} />
                          <div className="student-application-company-mark">{(application.company_name || 'C').charAt(0).toUpperCase()}</div>
                          <div className="student-application-info"><strong>{application.title || 'Internship application'}</strong><span>{application.company_name || 'Company'}</span><small>{application.applied_at ? new Date(application.applied_at).toLocaleDateString() : 'Date not available'}</small></div>
                          <span className={`student-status-pill ${String(application.status || 'pending').toLowerCase()}`}>{String(application.status || 'pending').replaceAll('_', ' ')}</span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="student-dashboard-empty"><span>▤</span><strong>No applications yet</strong><p>When you apply for an internship, its progress will appear here.</p><button onClick={() => navigate('internships')}>Explore internships →</button></div>
                  )}
                </section>

                <section className="student-dashboard-card student-recommendations-card">
                  <div className="student-card-heading">
                    <div><span className="student-card-heading-icon">✧</span><div><h2>Recommended internships</h2><p>Explore opportunities listed on CareerConnect.</p></div></div>
                    <button onClick={() => navigate('internships')}>View all <span>→</span></button>
                  </div>
                  {internshipLoading ? <div className="student-dashboard-empty">Loading opportunities…</div> : featuredInternships.length ? (
                    <div className="student-recommended-grid">
                      {featuredInternships.map((job) => (
                        <article className="student-recommended-card" key={job.internship_id}>
                          <img src={getInternshipPhoto(job)} alt={`${job.title || 'Internship'} workplace`} loading="lazy" />
                          <div className="student-recommended-content">
                            <span className="student-recommended-type">{job.internship_type || 'Internship'}</span>
                            <h3>{job.title || 'Internship opportunity'}</h3>
                            <p>{job.company_name || 'Company'}</p>
                            <div className="student-recommended-meta"><span>⌖ {job.location || 'Location not specified'}</span>{job.deadline && <span>Deadline: {formatLocalDate(job.deadline)}</span>}</div>
                            <div className="student-recommended-actions"><button className="student-outline-action" onClick={() => handleViewInternship(job)}>View details</button><button onClick={() => handleApplyClick(job)}>Apply now →</button></div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : <div className="student-dashboard-empty">No internship opportunities are available yet.</div>}
                </section>
              </div>

              <aside className="student-dashboard-side-column">
                <section className="student-dashboard-card student-profile-progress-card">
                  <div className="student-side-card-heading"><span className="student-side-icon">♙</span><div><h2>Profile completion</h2><p>Complete your profile to improve your opportunities.</p></div></div>
                  {(() => {
                    const profile = studentProfile || {};
                    const checks = [
                      ['Basic information', Boolean(profile.full_name || loggedUser.full_name)],
                      ['Contact details', Boolean(profile.phone)],
                      ['Education details', Boolean(profile.university || profile.degree_program)],
                      ['CV / Resume', Boolean(profile.cv_path)],
                      ['Skills & interests', Boolean(profile.skills)],
                    ];
                    const completed = checks.filter((item) => item[1]).length;
                    const percentage = Math.round((completed / checks.length) * 100);
                    return <>
                      <div className="student-profile-progress">
                        <div className="student-progress-ring" style={{ '--progress': `${percentage}%` }}><div><strong>{percentage}%</strong><small>Complete</small></div></div>
                        <ul>{checks.map(([label, done]) => <li key={label} className={done ? 'done' : ''}><span>{done ? '✓' : '○'}</span>{label}</li>)}</ul>
                      </div>
                      <button className="student-full-width-action" onClick={() => navigate('profile')}>Complete profile <span>→</span></button>
                    </>;
                  })()}
                </section>

                <section className="student-dashboard-card student-saved-card">
                  <div className="student-side-card-heading"><span className="student-side-icon violet">☆</span><div><h2>Save opportunities</h2><p>Keep interesting roles in one place.</p></div></div>
                  <div className="student-saved-empty"><span>♧</span><strong>Build your shortlist</strong><p>Browse internships and keep track of the roles you want to explore.</p><button onClick={() => navigate('internships')}>Browse internships →</button></div>
                </section>

                <section className="student-dashboard-tip">
                  <span>✦</span><div><strong>Your next step starts here</strong><p>A complete profile helps companies learn more about you.</p><button onClick={() => navigate('profile')}>Update my profile →</button></div>
                </section>
              </aside>
            </div>
          </div>
          </>
          )}
        </DashboardLayout>
      )}

      {/* Post a new internship */}
      {page === 'my-internships' && loggedUser?.role === 'company' && (
        <DashboardLayout>
          <section className="page-heading">
            <span className="section-kicker">COMPANY WORKSPACE</span>
            <h1>My internships</h1>
            <p>View and manage the internship opportunities posted by your company.</p>
          </section>
          {companyInternshipsLoading ? (
            <div className="dashboard-panel empty-state">Loading your internships...</div>
          ) : companyInternships.length === 0 ? (
            <div className="dashboard-panel empty-state"><div className="empty-icon">▣</div><strong>You haven't posted any internships yet</strong><p>Create your first opportunity to start receiving applications.</p><button className="button-primary" onClick={() => navigate('post-internship')}>＋ Post internship</button></div>
          ) : (
            <div className="company-internship-list">
              {companyInternships.map((job) => {
                const deadlineDate = job.deadline ? new Date(`${getLocalDateInputValue(job.deadline)}T23:59:59`) : null;
                const isActive = !deadlineDate || deadlineDate >= new Date();
                return (
                  <article className="dashboard-panel company-internship-card" key={job.internship_id}>
                    <div className="company-internship-card-top">
                      <div><h2>{job.title}</h2><p>{job.location || 'Location not specified'} · {job.internship_type || 'Internship'}</p></div>
                      <span className={`internship-status-pill ${isActive ? 'active' : 'closed'}`}>{isActive ? 'Active' : 'Closed'}</span>
                    </div>
                    <p className="company-internship-description">{job.description}</p>
                    <div className="company-internship-meta"><span>Deadline: {job.deadline ? formatLocalDate(job.deadline) : 'Not specified'}</span><span>{job.application_count || 0} application(s)</span></div>
                    {job.requirements && <div className="company-internship-requirements"><strong>Requirements</strong><p>{job.requirements}</p></div>}
                    <div className="company-internship-actions">
                      <button className="button-secondary button-small" onClick={() => openEditInternship(job)}>Edit details</button>
                      <button className="button-secondary button-small danger-button" disabled={internshipDeletingId === job.internship_id} onClick={() => handleDeleteInternship(job)}>{internshipDeletingId === job.internship_id ? 'Deleting...' : 'Delete'}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {editingInternship && (
            <div className="internship-edit-overlay">
              <form className="dashboard-panel internship-edit-form" onSubmit={handleUpdateInternship}>
                <div className="panel-heading"><div><h2>Edit internship</h2><p>Update the details of this opportunity.</p></div><button type="button" className="modal-close-button" onClick={() => setEditingInternship(null)}>×</button></div>
                <label htmlFor="editInternshipTitle">Internship title *</label><input id="editInternshipTitle" required maxLength={150} value={editInternshipForm.title} onChange={(e) => setEditInternshipForm({ ...editInternshipForm, title: e.target.value })} />
                <label htmlFor="editInternshipDescription">Description *</label><textarea id="editInternshipDescription" required rows={4} value={editInternshipForm.description} onChange={(e) => setEditInternshipForm({ ...editInternshipForm, description: e.target.value })} />
                <label htmlFor="editInternshipRequirements">Requirements</label><textarea id="editInternshipRequirements" rows={3} value={editInternshipForm.requirements} onChange={(e) => setEditInternshipForm({ ...editInternshipForm, requirements: e.target.value })} />
                <label htmlFor="editInternshipLocation">Location</label><input id="editInternshipLocation" value={editInternshipForm.location} onChange={(e) => setEditInternshipForm({ ...editInternshipForm, location: e.target.value })} />
                <label htmlFor="editInternshipType">Internship type</label><select id="editInternshipType" value={editInternshipForm.internship_type} onChange={(e) => setEditInternshipForm({ ...editInternshipForm, internship_type: e.target.value })}><option>Full-time</option><option>Part-time</option><option>Remote</option><option>Hybrid</option></select>
                <label htmlFor="editInternshipDeadline">Application deadline</label><input id="editInternshipDeadline" type="date" value={editInternshipForm.deadline} onChange={(e) => setEditInternshipForm({ ...editInternshipForm, deadline: e.target.value })} />
                <div className="application-form-actions"><button className="button-primary" type="submit" disabled={internshipUpdating}>{internshipUpdating ? 'Saving...' : 'Save changes'}</button><button className="button-secondary" type="button" onClick={() => setEditingInternship(null)}>Cancel</button></div>
              </form>
            </div>
          )}
        </DashboardLayout>
      )}

      {page === 'saved-internships' && loggedUser?.role === 'student' && (
        <DashboardLayout>
          <section className="page-heading">
            <span className="section-kicker">STUDENT WORKSPACE</span>
            <h1>Saved internships</h1>
            <p>Keep track of opportunities you want to explore later.</p>
          </section>
          <div className="cc-saved-grid">
            {savedInternships.length ? savedInternships.map((job) => (
              <article className="dashboard-panel cc-saved-card" key={job.internship_id}>
                <div className="cc-saved-card-top">
                  <div><span className="section-kicker">{job.internship_type || 'INTERNSHIP'}</span><h2>{job.title}</h2><p>{job.company_name || 'Company'} · {job.location || 'Location not specified'}</p></div>
                  <button className="button-secondary button-small" onClick={() => toggleSavedInternship(job)}>Remove</button>
                </div>
                <p>{job.description || 'Explore this opportunity and review its requirements.'}</p>
                <div className="cc-saved-actions">
                  <button className="button-secondary button-small" onClick={() => handleViewInternship(job)}>View details</button>
                  <button className="button-primary button-small" onClick={() => handleApplyClick(job)}>Apply now →</button>
                </div>
              </article>
            )) : (
              <div className="dashboard-panel cc-empty-state"><span>☆</span><h2>No saved internships yet</h2><p>Browse opportunities and use the Save button to keep interesting roles here.</p><button className="button-primary" onClick={() => navigate('internships')}>Browse internships →</button></div>
            )}
          </div>
        </DashboardLayout>
      )}

      {page === 'admin-dashboard' && loggedUser?.role === 'admin' && (
        <DashboardLayout>
          <section className="page-heading">
            <span className="section-kicker">CAREERCONNECT ADMINISTRATION</span>
            <h1>Platform overview</h1>
            <p>Monitor platform activity and review recently registered accounts.</p>
          </section>
          <section className="cc-admin-metrics">
            {[
              ['Total students', adminStats?.students, 'graduation-cap'],
              ['Total companies', adminStats?.companies, 'building-2'],
              ['Internships', adminStats?.internships, 'briefcase-business'],
              ['Applications', adminStats?.applications, 'file-check']
            ].map(([label, value, icon]) => (
              <article className="dashboard-panel cc-admin-metric" key={label}><span className="cc-admin-icon">{icon === 'graduation-cap' ? '♙' : icon === 'building-2' ? '▦' : icon === 'briefcase-business' ? '▣' : '✓'}</span><small>{label}</small><strong>{adminLoading ? '…' : Number(value || 0).toLocaleString()}</strong></article>
            ))}
          </section>
          <section className="dashboard-panel cc-admin-users">
            <div className="panel-heading"><div><h2>Recently registered accounts</h2><p>Latest student and company registrations.</p></div></div>
            {adminLoading ? <p>Loading accounts…</p> : adminUsers.length ? (
              <div className="cc-admin-table-wrap"><table className="cc-admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Account ID</th></tr></thead><tbody>{adminUsers.map((user) => <tr key={user.user_id}><td>{user.full_name}</td><td>{user.email}</td><td><span className="type-pill">{user.role}</span></td><td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div>
            ) : <p>No account data available.</p>}
          </section>
          <p className="cc-admin-note">Admin access is assigned directly in the database. Public registration cannot create administrator accounts.</p>
        </DashboardLayout>
      )}

      {page === 'post-internship' && loggedUser?.role === 'company' && (
        <DashboardLayout>
          <section className="page-heading">
            <span className="section-kicker">COMPANY WORKSPACE</span>
            <h1>Post a new internship</h1>
            <p>Share a new opportunity with students on CareerConnect.</p>
          </section>
          <div className="dashboard-panel" style={{ padding: '28px' }}>
            <form onSubmit={handleCreateInternship} className="application-form">
              <label htmlFor="internshipTitle">Internship title *</label>
              <input id="internshipTitle" type="text" maxLength={150} required
                value={internshipForm.title}
                onChange={(e) => setInternshipForm({ ...internshipForm, title: e.target.value })}
                placeholder="e.g. Software Engineering Intern" />

              <label htmlFor="internshipDescription">Description *</label>
              <textarea id="internshipDescription" rows={5} required
                value={internshipForm.description}
                onChange={(e) => setInternshipForm({ ...internshipForm, description: e.target.value })}
                placeholder="Describe the internship role and responsibilities..." />

              <label htmlFor="internshipRequirements">Requirements</label>
              <textarea id="internshipRequirements" rows={4}
                value={internshipForm.requirements}
                onChange={(e) => setInternshipForm({ ...internshipForm, requirements: e.target.value })}
                placeholder="List the skills, qualifications or experience required..." />

              <label htmlFor="internshipLocation">Location</label>
              <input id="internshipLocation" type="text" maxLength={100}
                value={internshipForm.location}
                onChange={(e) => setInternshipForm({ ...internshipForm, location: e.target.value })}
                placeholder="e.g. Colombo / Remote" />

              <label htmlFor="internshipType">Internship type</label>
              <select id="internshipType" value={internshipForm.internship_type}
                onChange={(e) => setInternshipForm({ ...internshipForm, internship_type: e.target.value })}>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>

              <label htmlFor="internshipDeadline">Application deadline</label>
              <input id="internshipDeadline" type="date"
                value={internshipForm.deadline}
                onChange={(e) => setInternshipForm({ ...internshipForm, deadline: e.target.value })}
                min={getTodayLocalDateInputValue()} />

              <div className="application-form-actions" style={{ marginTop: '24px' }}>
                <button className="button-primary" type="submit" disabled={internshipSubmitting}>
                  {internshipSubmitting ? 'Publishing...' : 'Publish internship'} <span>→</span>
                </button>
                <button className="button-secondary" type="button" onClick={() => navigate('dashboard')}>Cancel</button>
              </div>
            </form>
          </div>
        </DashboardLayout>
      )}

      {/* Internships */}
      {page === 'internships' && (
        loggedUser ? (
          <DashboardLayout>
            <div className="cc-browse-page">{browseInternshipContent}</div>
          </DashboardLayout>
        ) : (
          <section className="public-content cc-browse-page">
            {message && <div className={`message-banner ${messageType}`}>{message}</div>}
            {browseInternshipContent}
          </section>
        )
      )}

      {/* Apply for Internship */}
      {page === 'apply' && loggedUser && selectedInternship && (
        <DashboardLayout>
          <section className="page-heading">
            <span className="section-kicker">APPLICATION</span>
            <h1>Apply for internship</h1>
            <p>Review the opportunity and submit your application.</p>
          </section>

          <div className="dashboard-panel application-form-panel">
            <div className="application-job-summary">
              <div className="company-avatar">{(selectedInternship.company_name || 'C').charAt(0).toUpperCase()}</div>
              <div>
                <h2>{selectedInternship.title}</h2>
                <p>{selectedInternship.company_name || 'Company'}</p>
                {selectedInternship.location && <span>{selectedInternship.location}</span>}
              </div>
            </div>

            <form onSubmit={handleSubmitApplication} className="application-form">
              <label htmlFor="coverLetter">Cover letter</label>
              <textarea
                id="coverLetter"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Introduce yourself and explain why you are interested in this internship..."
                rows={7}
                maxLength={5000}
              />
              <small>{coverLetter.length}/5000 characters</small>

              <div className="cv-upload-field" style={{ marginTop: '24px' }}>
                <label htmlFor="studentCV">{studentProfile.cv_path ? 'Upload a different CV (optional)' : 'Upload your CV (PDF only) *'}</label>
                {studentProfile.cv_path && (
                  <p className="cv-selected-name">A CV is already saved in your profile and will be included automatically.</p>
                )}
                <input
                  id="studentCV"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      setCvFile(null);
                      return;
                    }
                    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
                      showMessage('Please choose a PDF file.', 'error');
                      e.target.value = '';
                      setCvFile(null);
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      showMessage('CV must be 5MB or smaller.', 'error');
                      e.target.value = '';
                      setCvFile(null);
                      return;
                    }
                    setCvFile(file);
                    setMessage('');
                  }}
                  
                />
                <small>Maximum file size: 5MB. Your saved profile CV will be used automatically unless you choose a different PDF.</small>
                {cvFile && <p className="cv-selected-name">Selected: {cvFile.name}</p>}
              </div>

              <div className="application-form-actions">
                <button className="button-primary" type="submit" disabled={applicationSubmitting || studentProfileLoading}>
                  {studentProfileLoading ? 'Checking saved CV...' : applicationSubmitting ? 'Submitting...' : 'Submit application'} <span>→</span>
                </button>
                <button className="button-secondary" type="button" onClick={() => navigate('internships')}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </DashboardLayout>
      )}

      {/* Applications */}
      {page === 'applications' && loggedUser && (
        <DashboardLayout>
          <section className="page-heading"><span className="section-kicker">YOUR ACTIVITY</span><h1>My applications</h1><p>Keep track of the opportunities you apply for.</p></section>
          {applicationLoading ? (
            <div className="dashboard-panel empty-state">Loading your applications...</div>
          ) : applications.length === 0 ? (
            <div className="dashboard-panel empty-state application-empty">
              <div className="empty-icon">▤</div>
              <strong>No applications yet</strong>
              <p>Your submitted internship applications will appear here.</p>
              <button className="button-primary button-small" onClick={() => navigate('internships')}>Explore internships →</button>
            </div>
          ) : (
            <div className="internship-list">
              {applications.map((application) => (
                <article className="internship-card" key={application.application_id}>
                  <div className="company-avatar">{(application.company_name || 'C').charAt(0).toUpperCase()}</div>
                  <div className="internship-card-body">
                    <div className="internship-card-heading">
                      <div>
                        <h3>{application.title}</h3>
                        <p>{application.company_name || 'Company'}</p>
                      </div>
                      <span className={`status-badge ${String(application.status || 'pending').toLowerCase()}`}>
                        {application.status || 'pending'}
                      </span>
                    </div>
                    <div className="internship-meta">
                      {application.location && <span>⌖ {application.location}</span>}
                      {application.internship_type && <span>{application.internship_type}</span>}
                      {application.applied_at && <span>Applied: {new Date(application.applied_at).toLocaleDateString()}</span>}
                    </div>
                    {application.cover_letter && <p className="internship-description">{application.cover_letter}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </DashboardLayout>
      )}

      {/* Applications received by company */}
      {page === 'company-applications' && loggedUser?.role === 'company' && (
        <DashboardLayout>
          <section className="page-heading"><span className="section-kicker">COMPANY WORKSPACE</span><h1>Received applications</h1><p>Review students who applied for your internship opportunities.</p></section>
          {companyApplicationsLoading ? (
            <div className="dashboard-panel empty-state">Loading applications...</div>
          ) : companyApplications.length === 0 ? (
            <div className="dashboard-panel empty-state"><div className="empty-icon">▤</div><strong>No applications received yet</strong><p>When students apply for your internships, their applications will appear here.</p></div>
          ) : (
            <div className="company-application-list company-application-page-list">
              {companyApplications.map((application) => (
                <article className="dashboard-panel company-application-card" key={application.application_id}>
                  <div className="company-application-card-top">
                    <div className="company-applicant-avatar">{(application.student_name || 'S').charAt(0).toUpperCase()}</div>
                    <div className="company-applicant-info"><h3>{application.student_name}</h3><span>{application.student_email}</span></div>
                    <span className={`status-badge ${application.status}`}>{application.status}</span>
                  </div>
                  <div className="company-application-details"><strong>{application.title}</strong><span>Applied: {application.applied_at ? new Date(application.applied_at).toLocaleDateString() : 'Date unavailable'}</span></div>
                  <div className="company-cover-letter"><strong>Cover letter</strong><p>{application.cover_letter || 'No cover letter was provided.'}</p></div>
                  <div className="company-application-actions">
                    {application.has_cv ? (
                      <>
                        <button type="button" className="button-secondary button-small" onClick={() => handlePreviewCV(application)}>Preview CV</button>
                        <button
                          type="button"
                          className="button-secondary button-small"
                          disabled={cvDownloadingId === application.application_id}
                          onClick={() => handleDownloadCV(application)}
                        >
                          {cvDownloadingId === application.application_id ? 'Downloading...' : 'Download CV'}
                        </button>
                      </>
                    ) : (
                      <span className="cv-not-uploaded">No CV uploaded</span>
                    )}
                    <button className="button-primary button-small" disabled={updatingApplicationId === application.application_id || application.status === 'accepted'} onClick={() => updateApplicationStatus(application.application_id, 'accepted')}>{updatingApplicationId === application.application_id ? 'Updating...' : 'Accept'}</button>
                    <button className="button-secondary button-small" disabled={updatingApplicationId === application.application_id || application.status === 'rejected'} onClick={() => updateApplicationStatus(application.application_id, 'rejected')}>Reject</button>
                    {application.status !== 'pending' && <button className="text-link" onClick={() => updateApplicationStatus(application.application_id, 'pending')} disabled={updatingApplicationId === application.application_id}>Reset to pending</button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </DashboardLayout>
      )}

      {/* Profile */}
      {page === 'profile' && loggedUser && (
        <DashboardLayout>
          <section className="page-heading">
            <span className="section-kicker">ACCOUNT</span>
            <h1>My profile</h1>
            <p>Review and update your CareerConnect account information.</p>
          </section>

          {loggedUser.role === 'company' ? (
            profileLoading ? (
              <div className="dashboard-panel empty-state">Loading company profile...</div>
            ) : companyProfile ? (
              <div className="dashboard-panel profile-page-card company-profile-card">
                <div className="profile-page-top">
                  <div className="avatar avatar-large company-account-avatar">
                    {getCompanyLogoSrc() ? (
                      <img className="dashboard-avatar-image company-logo-avatar-image" src={getCompanyLogoSrc()} alt={`${companyProfile.company_name || 'Company'} logo`} />
                    ) : (companyProfile.company_name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2>{companyProfile.company_name}</h2>
                    <p>{companyProfile.email}</p>
                    <span className="account-badge">Company account</span>
                  </div>
                </div>

                <section className="company-logo-section">
                  <h3>Company Logo</h3>
                  <div className="company-logo-preview">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Company logo" />
                    ) : (
                      <div className="company-logo-placeholder">
                        {(companyProfile.company_name || 'C').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p>Choose a JPG, PNG or WEBP image. Maximum file size: 2MB.</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (file.size > 2 * 1024 * 1024) {
                        showMessage('Image must be smaller than 2MB.', 'error');
                        e.target.value = '';
                        return;
                      }

                      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                        showMessage('Only JPG, PNG and WEBP images are allowed.', 'error');
                        e.target.value = '';
                        return;
                      }

                      setLogoFile(file);
                      setLogoPreview(URL.createObjectURL(file));
                    }}
                  />
                  <button
                    type="button"
                    className="button-primary button-small"
                    onClick={handleLogoUpload}
                    disabled={!logoFile || logoUploading}
                  >
                    {logoUploading ? 'Uploading...' : 'Upload Logo'}
                  </button>
                </section>

                <form className="company-profile-form" onSubmit={handleSaveCompanyProfile}>
                  <h3>Account Information</h3>
                  <div className="profile-input-grid">
                    <div>
                      <label htmlFor="companyContactName">Contact person name</label>
                      <input
                        id="companyContactName"
                        type="text"
                        value={companyProfile.full_name || ''}
                        onChange={(e) => setCompanyProfile({
                          ...companyProfile,
                          full_name: e.target.value
                        })}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="companyEmail">Email address</label>
                      <input id="companyEmail" type="email" value={companyProfile.email || ''} disabled />
                    </div>
                  </div>

                  <h3>Company Information</h3>
                  <div className="profile-input-grid">
                    <div>
                      <label htmlFor="companyName">Company name</label>
                      <input
                        id="companyName"
                        type="text"
                        value={companyProfile.company_name || ''}
                        onChange={(e) => setCompanyProfile({
                          ...companyProfile,
                          company_name: e.target.value
                        })}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="companyWebsite">Website</label>
                      <input
                        id="companyWebsite"
                        type="url"
                        placeholder="https://example.com"
                        value={companyProfile.website || ''}
                        onChange={(e) => setCompanyProfile({
                          ...companyProfile,
                          website: e.target.value
                        })}
                      />
                    </div>
                    <div className="profile-full-width">
                      <label htmlFor="companyLocation">Location</label>
                      <input
                        id="companyLocation"
                        type="text"
                        placeholder="Enter company location"
                        value={companyProfile.location || ''}
                        onChange={(e) => setCompanyProfile({
                          ...companyProfile,
                          location: e.target.value
                        })}
                      />
                    </div>
                    <div className="profile-full-width">
                      <label htmlFor="companyDescription">Company description</label>
                      <textarea
                        id="companyDescription"
                        rows={5}
                        placeholder="Tell students about your company..."
                        value={companyProfile.description || ''}
                        onChange={(e) => setCompanyProfile({
                          ...companyProfile,
                          description: e.target.value
                        })}
                      />
                    </div>
                  </div>

                  <button type="submit" className="button-primary" disabled={profileSaving}>
                    {profileSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="dashboard-panel empty-state">
                <strong>Company profile is not available.</strong>
                <p>Please check that this company account has a matching record in the companies table.</p>
              </div>
            )
          ) : studentProfileLoading || !studentProfile ? (
            <div className="dashboard-panel empty-state">{studentProfileLoading ? 'Loading your profile...' : 'Student profile is not available.'}</div>
          ) : (
            <div className="dashboard-panel profile-page-card student-profile-card">
              <div className="profile-page-top">
                <div className="student-profile-photo-wrap">
                  {studentPhotoPreview || studentProfile.profile_image ? (
                    <img className="student-profile-photo" src={studentPhotoPreview || `http://localhost:5000${studentProfile.profile_image}`} alt="Student profile" />
                  ) : (
                    <div className="avatar avatar-large student-profile-photo-fallback">{(studentProfile.full_name || 'S').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || initials}</div>
                  )}
                </div>
                <div className="student-profile-heading-details">
                  <h2>{studentProfile.full_name || studentName}</h2>
                  <p>{studentProfile.email || loggedUser.email}</p>
                  <span className="account-badge">Student account</span>
                </div>
              </div>

              <section className="student-photo-upload-panel" aria-label="Profile photo settings">
                <div className="student-photo-upload-copy">
                  <strong>Profile photo</strong>
                  <span>Choose a clear JPG, PNG or WEBP image (maximum 2MB).</span>
                </div>
                <input id="studentPhotoInput" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => setStudentPhotoFile(e.target.files?.[0] || null)} />
                <div className="student-photo-actions">
                  <button type="button" className="button-primary button-small" onClick={handleStudentPhotoUpload} disabled={!studentPhotoFile || studentPhotoUploading}>
                    {studentPhotoUploading ? 'Uploading...' : studentProfile.profile_image ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {studentProfile.profile_image && <button type="button" className="button-secondary button-small" onClick={handleRemoveStudentPhoto}>Remove Photo</button>}
                </div>
              </section>

              <form className="company-profile-form" onSubmit={handleSaveStudentProfile}>
                <h3>Personal Details</h3>
                <div className="profile-input-grid">
                  <div>
                    <label htmlFor="studentFullName">Full name</label>
                    <input id="studentFullName" value={studentProfile.full_name} onChange={(e) => setStudentProfile({ ...studentProfile, full_name: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="studentEmail">Email address</label>
                    <input id="studentEmail" type="email" value={studentProfile.email} disabled />
                  </div>
                  <div>
                    <label htmlFor="studentPhone">Phone number</label>
                    <input id="studentPhone" type="tel" placeholder="Enter your phone number" value={studentProfile.phone} onChange={(e) => setStudentProfile({ ...studentProfile, phone: e.target.value })} />
                  </div>
                  <div>
                    <label>Account status</label>
                    <input value="Active" disabled />
                  </div>
                </div>

                <h3>Education Details</h3>
                <div className="profile-input-grid">
                  <div>
                    <label htmlFor="studentUniversity">University / Institute</label>
                    <input id="studentUniversity" placeholder="Enter your university" value={studentProfile.university} onChange={(e) => setStudentProfile({ ...studentProfile, university: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="studentDegree">Degree / Study programme</label>
                    <input id="studentDegree" placeholder="e.g. BSc (Hons) Computer Science" value={studentProfile.degree_program} onChange={(e) => setStudentProfile({ ...studentProfile, degree_program: e.target.value })} />
                  </div>
                </div>

                <h3>About Me</h3>
                <div className="profile-input-grid">
                  <div className="profile-full-width">
                    <label htmlFor="studentAbout">Professional summary</label>
                    <textarea id="studentAbout" rows={4} placeholder="Write a short introduction about yourself..." value={studentProfile.about_me} onChange={(e) => setStudentProfile({ ...studentProfile, about_me: e.target.value })} />
                  </div>
                  <div className="profile-full-width">
                    <label htmlFor="studentSkills">Technical skills</label>
                    <textarea id="studentSkills" rows={3} placeholder="e.g. Java, Python, React, MySQL" value={studentProfile.skills} onChange={(e) => setStudentProfile({ ...studentProfile, skills: e.target.value })} />
                    <small className="profile-help-text">Separate skills with commas.</small>
                  </div>
                </div>

                <h3>CV / Resume</h3>
                <div className="student-cv-upload">
                  <div>
                    <strong>{studentProfile.cv_path ? 'A CV is saved to your profile' : 'No CV uploaded yet'}</strong>
                    <p>{studentProfile.cv_path ? 'You can upload a new PDF to replace your current CV.' : 'Upload your CV as a PDF file (maximum 5MB).'}</p>
                  </div>
                  <input type="file" accept="application/pdf,.pdf" onChange={(e) => setStudentCvFile(e.target.files?.[0] || null)} />
                  <button type="button" className="button-secondary button-small" onClick={handleStudentCvUpload} disabled={!studentCvFile || studentCvUploading}>
                    {studentCvUploading ? 'Uploading...' : 'Upload CV'}
                  </button>
                </div>

                <div className="student-profile-actions">
                  <button type="submit" className="button-primary" disabled={studentProfileSaving}>
                    {studentProfileSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </DashboardLayout>
      )}

      {/* Login */}
      {page === 'login' && (
        <section className="auth-page cc-login-page">
          <div className="cc-login-visual">
            <img className="cc-login-photo" src="/careerconnect-team.png" alt="Students and professionals collaborating around a laptop" />
            <div className="cc-login-photo-shade" />
            <div className="cc-login-visual-content">
              <span className="cc-login-eyebrow"><span className="cc-login-eyebrow-dot" /> YOUR NEXT CHAPTER STARTS HERE</span>
              <h2>Big opportunities begin with <span>one sign in.</span></h2>
              <p>Connect with internship opportunities, build practical experience, and take your next step with CareerConnect.</p>
              <div className="cc-login-benefits">
                <div><span className="cc-login-benefit-icon">✦</span><span><strong>Discover opportunities</strong><small>Explore internships from companies</small></span></div>
                <div><span className="cc-login-benefit-icon">↗</span><span><strong>Move your career forward</strong><small>Keep your applications in one place</small></span></div>
              </div>
            </div>
            <div className="cc-login-visual-footer"><span>CareerConnect</span><span>Connecting talent with opportunity</span></div>
          </div>
          <div className="auth-form-side cc-login-form-side">
            <form className="form-box auth-card cc-login-card" onSubmit={handleLogin}>
              <div className="cc-login-mobile-brand"><span className="cc-brand-mark">C</span><span>Career<span>Connect</span></span></div>
              <span className="cc-login-form-kicker">WELCOME BACK</span>
              <h1>Sign in to your account</h1>
              <p className="auth-subtitle">Enter your registered email and password to continue.</p>
              <label htmlFor="login-email">Email address</label>
              <div className="cc-login-input-wrap"><span aria-hidden="true">✉</span><input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required /></div>
              <label htmlFor="login-password">Password</label>
              <div className="cc-login-input-wrap cc-login-password-wrap"><span aria-hidden="true">▣</span><input id="login-password" type={showLoginPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required /><button className="cc-password-toggle" type="button" onClick={() => setShowLoginPassword((visible) => !visible)} aria-label={showLoginPassword ? 'Hide password' : 'Show password'}>{showLoginPassword ? 'Hide' : 'Show'}</button></div>
              {message && <p className={`form-message ${messageType}`} role="alert">{message}</p>}
              <button className="button-primary auth-submit cc-login-submit" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'} <span>→</span></button>
              <p className="auth-switch cc-login-switch">New to CareerConnect? <button type="button" onClick={() => navigate('register')}>Create an account</button></p>
              <button className="back-home cc-login-back" type="button" onClick={() => navigate('home')}>← Back to homepage</button>
              <div className="cc-login-security"><span>♢</span> Your account details are protected by secure sign-in.</div>
            </form>
          </div>
        </section>
      )}

      {/* Registration */}
      {page === 'register' && (
        <section className="auth-page cc-login-page cc-register-page">
          <div className="cc-login-visual cc-register-visual">
            <img className="cc-login-photo" src="/register-career-journey.png" alt="A student beginning her career journey in a modern workspace" />
            <div className="cc-login-photo-shade" />
            <div className="cc-login-visual-content">
              <span className="cc-login-eyebrow"><span className="cc-login-eyebrow-dot" /> YOUR NEXT CHAPTER STARTS HERE</span>
              <h2>Build your future with <span>CareerConnect.</span></h2>
              <p>Create an account to discover internship opportunities, showcase your potential, and connect with companies.</p>
              <div className="cc-login-benefits">
                <div><span className="cc-login-benefit-icon">✦</span><span><strong>For students</strong><small>Discover opportunities and manage applications</small></span></div>
                <div><span className="cc-login-benefit-icon">↗</span><span><strong>For companies</strong><small>Find emerging talent and manage vacancies</small></span></div>
              </div>
            </div>
            <div className="cc-login-visual-footer"><span>CareerConnect</span><span>Connecting talent with opportunity</span></div>
          </div>
          <div className="auth-form-side cc-login-form-side cc-register-form-side">
            <form className="form-box auth-card cc-login-card cc-register-card" onSubmit={handleRegister}>
              <div className="cc-login-mobile-brand"><span className="cc-brand-mark">C</span><span>Career<span>Connect</span></span></div>
              <span className="cc-login-form-kicker">JOIN OUR COMMUNITY</span>
              <h1>Create your account</h1>
              <p className="auth-subtitle">A few details are all you need to get started.</p>
              <label htmlFor="register-full-name">Full name</label>
              <div className="cc-login-input-wrap"><span aria-hidden="true">♙</span><input id="register-full-name" type="text" autoComplete="name" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
              <label htmlFor="register-email">Email address</label>
              <div className="cc-login-input-wrap"><span aria-hidden="true">✉</span><input id="register-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <label htmlFor="register-password">Password</label>
              <div className="cc-login-input-wrap"><span aria-hidden="true">▣</span><input id="register-password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></div>
              <label htmlFor="register-role">I am joining as</label>
              <div className="cc-login-input-wrap cc-register-select-wrap"><span aria-hidden="true">⌄</span><select id="register-role" value={role} onChange={(e) => setRole(e.target.value)}><option value="student">Student</option><option value="company">Company</option></select></div>
              {message && <p className={`form-message ${messageType}`} role="alert">{message}</p>}
              <button className="button-primary auth-submit cc-login-submit" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'} <span>→</span></button>
              <p className="auth-switch cc-login-switch">Already have an account? <button type="button" onClick={() => navigate('login')}>Sign in</button></p>
              <button className="back-home cc-login-back" type="button" onClick={() => navigate('home')}>← Back to homepage</button>
              <div className="cc-login-security"><span>♢</span> Your account details are protected by secure sign-in.</div>
            </form>
          </div>
        </section>
      )}

      {['home', 'internships', 'internship-details', 'about', 'login', 'register'].includes(page) && (
        <footer className="cc-site-footer">
          <div className="cc-footer-main">
            <div className="cc-footer-brand-column">
              <button className="cc-footer-brand" onClick={() => navigate('home')} aria-label="CareerConnect home">
                <span className="cc-brand-mark">C</span><span>Career<span>Connect</span></span>
              </button>
              <p>Connecting emerging talent with meaningful opportunities. Discover internships, build practical experience, and take your next career step.</p>
              <div className="cc-footer-tagline"><span>✦</span> Connecting talent with opportunity</div>
            </div>
            <div className="cc-footer-links-column">
              <h3>Explore</h3>
              <button onClick={() => navigate('home')}>Home</button>
              <button onClick={() => navigate('internships')}>Browse internships</button>
              <button onClick={() => navigate('about')}>About CareerConnect</button>
            </div>
            <div className="cc-footer-links-column">
              <h3>For students</h3>
              <button onClick={() => navigate('internships')}>Find internships</button>
              <button onClick={() => { setRole('student'); navigate('register'); }}>Create student account</button>
              <button onClick={() => navigate('login')}>Student sign in</button>
            </div>
            <div className="cc-footer-links-column">
              <h3>For companies</h3>
              <button onClick={() => { setRole('company'); navigate('register'); }}>Join as a company</button>
              <button onClick={() => navigate('login')}>Company sign in</button>
              <button onClick={() => { setRole('company'); navigate('register'); }}>Post an internship</button>
            </div>
          </div>
          <div className="cc-footer-bottom">
            <span>© {new Date().getFullYear()} CareerConnect. All rights reserved.</span>
            <span>Built to connect talent with opportunity.</span>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;


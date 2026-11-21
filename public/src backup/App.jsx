import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

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

function App() {
  const [page, setPage] = useState('home');
  const [internships, setInternships] = useState([]);
  const [internshipLoading, setInternshipLoading] = useState(true);

  // Registration
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggedUser, setLoggedUser] = useState(null);

  // Shared UI
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [loading, setLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Internship application state
  const [applications, setApplications] = useState([]);
  // Student Notifications
const [notifications, setNotifications] = useState([]);
const [notificationLoading, setNotificationLoading] = useState(false);
const [notificationsOpen, setNotificationsOpen] = useState(false);

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

  // Student profile and CV
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentProfileLoading, setStudentProfileLoading] = useState(false);
  const [studentProfileSaving, setStudentProfileSaving] = useState(false);
  const [studentCVFile, setStudentCVFile] = useState(null);
  const [studentCVUploading, setStudentCVUploading] = useState(false);

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
        const response = await fetch(`${API_URL}/internships`);
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

  // Load company profile when the company opens My Profile
  useEffect(() => {
    const loadCompanyProfile = async () => {
      if (!loggedUser || loggedUser.role !== 'company' || page !== 'profile') {
        return;
      }

      setProfileLoading(true);
      try {
        const response = await fetch(
          `${API_URL}/company/profile/${loggedUser.user_id}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load company profile');
        }

        setCompanyProfile(data);
        setLogoPreview(data.logo ? `http://localhost:5000${data.logo}` : '');
      } catch (error) {
        showMessage(error.message || 'Unable to load company profile.', 'error');
      } finally {
        setProfileLoading(false);
      }
    };

    loadCompanyProfile();
  }, [loggedUser, page]);

  // Load the logged-in student's profile when My Profile is opened
  useEffect(() => {
    const loadStudentProfile = async () => {
      if (!loggedUser || loggedUser.role !== 'student' || page !== 'profile') return;
      setStudentProfileLoading(true);
      try {
        const response = await fetch(`${API_URL}/student/profile/${loggedUser.user_id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to load student profile');
        setStudentProfile(data);
      } catch (error) {
        showMessage(error.message || 'Unable to load student profile.', 'error');
      } finally {
        setStudentProfileLoading(false);
      }
    };
    loadStudentProfile();
  }, [loggedUser, page]);

  // Load internships owned by the logged-in company
  useEffect(() => {
    const loadCompanyInternships = async () => {
      if (!loggedUser || loggedUser.role !== 'company' || page !== 'my-internships') return;
      setCompanyInternshipsLoading(true);
      try {
        const response = await fetch(`${API_URL}/company/internships/${loggedUser.user_id}`);
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
        const response = await fetch(
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

  // Load student notifications (added without changing existing page layout)
  useEffect(() => {
    const loadNotifications = async () => {
      if (!loggedUser || loggedUser.role !== 'student') {
        setNotifications([]);
        return;
      }

      setNotificationLoading(true);
      try {
        const response = await fetch(`${API_URL}/notifications/${loggedUser.user_id}`);
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

  // Load applications submitted to the logged-in company's internships
  useEffect(() => {
    const loadCompanyApplications = async () => {
      if (!loggedUser || loggedUser.role !== 'company') {
        setCompanyApplications([]);
        return;
      }

      setCompanyApplicationsLoading(true);
      try {
        const response = await fetch(`${API_URL}/company/applications/${loggedUser.user_id}`);
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
        const response = await fetch(
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
      const response = await fetch(`${API_URL}/company/applications/${applicationId}/status`, {
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
      const response = await fetch(
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

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) {
        const response = await fetch(
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
      navigate('applications');
    } catch (error) {
      showMessage(error.message || 'Unable to open notification.', 'error');
    }
  };

  const handleSaveCompanyProfile = async (e) => {
    e.preventDefault();
    if (!loggedUser || !companyProfile) return;

    setProfileSaving(true);
    try {
      const response = await fetch(
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

  const handleSaveStudentProfile = async (e) => {
    e.preventDefault();
    if (!loggedUser || !studentProfile) return;
    setStudentProfileSaving(true);
    try {
      const response = await fetch(`${API_URL}/student/profile/${loggedUser.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: studentProfile.full_name,
          phone: studentProfile.phone,
          university: studentProfile.university,
          degree_program: studentProfile.degree_program,
          skills: studentProfile.skills,
          about_me: studentProfile.about_me,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Profile update failed');
      setLoggedUser((current) => ({ ...current, full_name: studentProfile.full_name }));
      showMessage(data.message || 'Student profile updated successfully!', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to update student profile.', 'error');
    } finally {
      setStudentProfileSaving(false);
    }
  };

  const handleStudentCVUpload = async () => {
    if (!loggedUser || !studentCVFile) {
      showMessage('Please select your CV PDF first.', 'error');
      return;
    }
    const formData = new FormData();
    formData.append('cv', studentCVFile);
    setStudentCVUploading(true);
    try {
      const response = await fetch(`${API_URL}/student/profile/${loggedUser.user_id}/cv`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'CV upload failed');
      setStudentProfile((current) => ({ ...current, cv_path: data.cv_path }));
      setStudentCVFile(null);
      showMessage(data.message || 'CV uploaded successfully!', 'success');
    } catch (error) {
      showMessage(error.message || 'Unable to upload CV.', 'error');
    } finally {
      setStudentCVUploading(false);
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
      const response = await fetch(
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
  const firstName = studentName.trim().split(' ')[0] || 'Student';
  const initials = studentName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'S';

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

      setLoggedUser(data.user);
      setLoginEmail('');
      setLoginPassword('');
      setPage('dashboard');
      setMessage('');
    } catch (error) {
      showMessage(error.message || 'Unable to log in. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
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
      const response = await fetch(`${API_URL}/company/internships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: loggedUser.user_id, ...internshipForm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to publish internship.');

      const refreshResponse = await fetch(`${API_URL}/internships`);
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
      const response = await fetch(`${API_URL}/company/internships/${editingInternship.internship_id}`, {
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
      const response = await fetch(`${API_URL}/company/internships/${job.internship_id}`, {
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
      if (!cvFile) {
        throw new Error('Please upload your CV in PDF format.');
      }

      const formData = new FormData();
      formData.append('internship_id', selectedInternship.internship_id);
      formData.append('student_id', loggedUser.user_id);
      formData.append('cover_letter', coverLetter.trim());
      formData.append('cv', cvFile);

      const response = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Application submission failed');
      }

      const applicationsResponse = await fetch(
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
        <div className="avatar">{initials}</div>
        <div className="sidebar-user-copy">
          <strong>{studentName}</strong>
          <span>{loggedUser?.role || 'student'} account</span>
        </div>
      </div>

      <p className="sidebar-label">WORKSPACE</p>
      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        <button className={page === 'dashboard' ? 'active' : ''} onClick={() => navigate('dashboard')}>
          <span className="nav-icon">▦</span> Overview
        </button>
        <button className={page === 'internships' ? 'active' : ''} onClick={() => navigate('internships')}>
          <span className="nav-icon">⌕</span> Browse Internships
        </button>
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
        ) : (
          <button className={page === 'applications' ? 'active' : ''} onClick={() => navigate('applications')}>
            <span className="nav-icon">▤</span> My Applications
          </button>
        )}
        <button className={page === 'profile' ? 'active' : ''} onClick={() => navigate('profile')}>
          <span className="nav-icon">◎</span> My Profile
        </button>
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
          <div className="breadcrumb">Workspace <span>/</span> {page === 'dashboard' ? 'Overview' : page === 'internships' ? 'Internships' : page === 'post-internship' ? 'Post Internship' : page === 'my-internships' ? 'My Internships' : page === 'applications' ? 'My Applications' : page === 'apply' ? 'Apply for Internship' : page === 'company-applications' ? 'Received Applications' : 'My Profile'}</div>
          <div className="topbar-right">
            <span className="topbar-date">CareerConnect Portal</span>
            {loggedUser?.role === 'student' && (
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
            <div className="avatar avatar-small">{initials}</div>
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
      <div className="company-avatar">
        {(job.company_name || 'C').charAt(0).toUpperCase()}
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
        <div className="internship-card-actions">
          <button className="button-primary button-small" onClick={() => handleApplyClick(job)}>Apply Now <span>→</span></button>
        </div>
      </div>
    </article>
  );

  return (
    <div className="app">
      {/* Public navigation */}
      {!['dashboard', 'applications', 'company-applications', 'profile', 'apply', 'post-internship', 'my-internships'].includes(page) && (
        <nav className="navbar">
          <button className="public-brand" onClick={() => navigate('home')}>
            Career<span>Connect</span>
          </button>
          <div className="nav-links">
            <button onClick={() => navigate('home')}>Home</button>
            <button onClick={() => navigate('internships')}>Internships</button>
            {loggedUser ? (
              <>
                <button onClick={() => navigate('dashboard')}>Dashboard</button>
                <button className="nav-logout" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('login')}>Login</button>
                <button className="register" onClick={() => navigate('register')}>Get Started</button>
              </>
            )}
          </div>
        </nav>
      )}

      {/* Home */}
      {page === 'home' && (
        <>
          <section className="hero">
            <div className="hero-content">
              <div className="hero-eyebrow"><span /> YOUR FUTURE STARTS HERE</div>
              <h1>Find your dream<br /><span>internship today.</span></h1>
              <p>Connect with leading companies, discover meaningful opportunities, and take the next step in your career journey.</p>
              <div className="hero-actions">
                <button className="button-primary" onClick={() => navigate('internships')}>Explore internships <span>→</span></button>
                <button className="button-secondary" onClick={() => navigate('register')}>Create an account</button>
              </div>
              <div className="hero-trust"><span>✓</span> Your next opportunity starts with one step.</div>
            </div>
            <div className="hero-visual">
              <img
                className="hero-photo"
                src="/careerconnect-team.png"
                alt="A team collaborating in a modern workplace"
              />
              <div className="floating-note">
                <span>✦</span>
                <div>
                  <strong>New opportunities</strong>
                  <small>Start exploring today</small>
                </div>
              </div>
            </div>
          </section>
          <section className="public-features">
            <div className="section-heading">
              <span className="section-kicker">YOUR CAREER JOURNEY</span>
              <h2>Everything you need to get started</h2>
              <p>A simple place to discover opportunities and move your career forward.</p>
            </div>
            <div className="feature-grid">
              <article className="feature-card"><div className="feature-icon">⌕</div><h3>Discover opportunities</h3><p>Explore internship listings and find roles that match your interests.</p></article>
              <article className="feature-card"><div className="feature-icon">▤</div><h3>Stay organised</h3><p>Keep your career information and application journey in one place.</p></article>
              <article className="feature-card"><div className="feature-icon">↗</div><h3>Move forward</h3><p>Take the next step towards gaining practical experience.</p></article>
            </div>
          </section>
        </>
      )}

      {/* Student dashboard */}
      {page === 'dashboard' && loggedUser && (
        <DashboardLayout>
          {loggedUser.role === 'company' ? (
            <>
              <section className="welcome-row">
                <div>
                  <span className="section-kicker">COMPANY WORKSPACE</span>
                  <h1>Welcome back, {firstName} <span className="wave">✦</span></h1>
                  <p>Manage your internship opportunities and review student applications.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button className="button-primary" onClick={() => navigate('post-internship')}>＋ Post internship</button>
                  <button className="button-secondary" onClick={() => navigate('company-applications')}>View applications →</button>
                </div>
              </section>
              <section className="stat-grid company-stat-grid">
                <article className="stat-card"><div className="stat-icon blue">▣</div><div><span>Total internships</span><strong>{companyInternshipStatsLoading ? '...' : companyInternshipStats.total}</strong><small>Internships posted by you</small></div></article>
                <article className="stat-card"><div className="stat-icon green">✓</div><div><span>Active internships</span><strong>{companyInternshipStatsLoading ? '...' : companyInternshipStats.active}</strong><small>Open or not past deadline</small></div></article>
                <article className="stat-card"><div className="stat-icon blue">▤</div><div><span>Total applications</span><strong>{companyApplications.length}</strong><small>Received for your internships</small></div></article>
                <article className="stat-card"><div className="stat-icon amber">◷</div><div><span>Pending review</span><strong>{companyApplications.filter((a) => a.status === 'pending').length}</strong><small>Waiting for your review</small></div></article>
                <article className="stat-card"><div className="stat-icon green">✓</div><div><span>Accepted</span><strong>{companyApplications.filter((a) => a.status === 'accepted').length}</strong><small>Accepted applicants</small></div></article>
                <article className="stat-card"><div className="stat-icon violet">×</div><div><span>Rejected</span><strong>{companyApplications.filter((a) => a.status === 'rejected').length}</strong><small>Rejected applications</small></div></article>
              </section>
              <section className="dashboard-panel">
                <div className="panel-heading"><div><h2>Recent applications</h2><p>Students who applied for your internship vacancies</p></div><button className="text-link" onClick={() => navigate('company-applications')}>View all →</button></div>
                {companyApplicationsLoading ? <div className="empty-state">Loading applications...</div> : companyApplications.length ? (
                  <div className="company-application-list">
                    {companyApplications.slice(0, 5).map((application) => (
                      <article className="company-application-row" key={application.application_id}>
                        <div className="company-applicant-avatar">{(application.student_name || 'S').charAt(0).toUpperCase()}</div>
                        <div className="company-applicant-info"><strong>{application.student_name}</strong><span>{application.title}</span><small>{application.student_email}</small></div>
                        <span className={`status-badge ${application.status}`}>{application.status}</span>
                      </article>
                    ))}
                  </div>
                ) : <div className="empty-state"><strong>No applications received yet</strong><p>Applications from students will appear here.</p></div>}
              </section>
            </>
          ) : (
          <>
          <section className="welcome-row">
            <div>
              <span className="section-kicker">STUDENT WORKSPACE</span>
              <h1>Welcome back, {firstName} <span className="wave">✦</span></h1>
              <p>Here’s an overview of your CareerConnect account.</p>
            </div>
            <button className="button-primary" onClick={() => navigate('internships')}>Find internships <span>→</span></button>
          </section>

          <section className="stat-grid">
            <article className="stat-card"><div className="stat-icon blue">▤</div><div><span>Total applications</span><strong>{applications.length}</strong><small>Applications submitted</small></div></article>
            <article className="stat-card"><div className="stat-icon amber">◷</div><div><span>Pending review</span><strong>{pendingCount}</strong><small>Waiting for an update</small></div></article>
            <article className="stat-card"><div className="stat-icon green">✓</div><div><span>Accepted</span><strong>{acceptedCount}</strong><small>Ready for your next step</small></div></article>
            <article className="stat-card"><div className="stat-icon violet">☆</div><div><span>Saved opportunities</span><strong>0</strong><small>Keep track of interesting roles</small></div></article>
          </section>

          <section className="dashboard-panel profile-summary">
            <div className="panel-heading"><div><h2>Profile overview</h2><p>Your account information</p></div><button className="text-link" onClick={() => navigate('profile')}>View profile →</button></div>
            <div className="profile-summary-content">
              <div className="avatar avatar-large">{initials}</div>
              <div className="profile-summary-details"><h3>{studentName}</h3><p>{loggedUser.email}</p><span className="account-badge">{loggedUser.role} account</span></div>
              <div className="profile-complete"><span>Account status</span><strong><i /> Active</strong></div>
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="panel-heading"><div><h2>Recommended internships</h2><p>Explore opportunities listed on CareerConnect</p></div><button className="text-link" onClick={() => navigate('internships')}>View all →</button></div>
            {internshipLoading ? <p className="empty-state">Loading internship opportunities...</p> : featuredInternships.length ? (
              <div className="recommended-list">{featuredInternships.map((job) => <InternshipCard key={job.internship_id} job={job} />)}</div>
            ) : (
              <div className="empty-state"><div className="empty-icon">⌕</div><strong>No internships to show yet</strong><p>New opportunities will appear here when they are added.</p></div>
            )}
          </section>

          <section className="dashboard-panel next-step-panel">
            <div className="next-step-icon">✦</div>
            <div><h2>Your next step starts here</h2><p>Browse available internships and find an opportunity that fits your goals.</p></div>
            <button className="button-primary button-small" onClick={() => navigate('internships')}>Browse opportunities →</button>
          </section>
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
            <section className="page-heading"><span className="section-kicker">OPPORTUNITIES</span><h1>Browse internships</h1><p>Explore opportunities and take the next step in your career.</p></section>
            {internshipLoading ? <div className="dashboard-panel empty-state">Loading internships...</div> : internships.length ? (
              <div className="internship-list">{internships.map((job) => <InternshipCard key={job.internship_id} job={job} />)}</div>
            ) : (
              <div className="dashboard-panel empty-state"><div className="empty-icon">⌕</div><strong>No internships available</strong><p>Please check again later for new opportunities.</p></div>
            )}
          </DashboardLayout>
        ) : (
          <section className="public-content">
            <div className="page-heading"><span className="section-kicker">OPPORTUNITIES</span><h1>Available internships</h1><p>Explore opportunities and take the next step in your career.</p></div>
            {message && <div className={`message-banner ${messageType}`}>{message}</div>}
            {internshipLoading ? <p className="empty-state">Loading internships...</p> : internships.length ? <div className="internship-list public-internship-list">{internships.map((job) => <InternshipCard key={job.internship_id} job={job} />)}</div> : <div className="empty-state"><strong>No internships available at the moment.</strong></div>}
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
                <label htmlFor="studentCV">Upload your CV (PDF only) *</label>
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
                <small>Maximum file size: 5MB. Your CV will be shared with the company receiving this application.</small>
                {cvFile && <p className="cv-selected-name">Selected: {cvFile.name}</p>}
              </div>

              <div className="application-form-actions">
                <button className="button-primary" type="submit" disabled={applicationSubmitting}>
                  {applicationSubmitting ? 'Submitting...' : 'Submit application'} <span>→</span>
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
                      <button
                        type="button"
                        className="button-secondary button-small"
                        disabled={cvDownloadingId === application.application_id}
                        onClick={() => handleDownloadCV(application)}
                      >
                        {cvDownloadingId === application.application_id ? 'Downloading...' : 'Download CV'}
                      </button>
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
                  <div className="avatar avatar-large">
                    {(companyProfile.company_name || 'C').charAt(0).toUpperCase()}
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
          ) : studentProfileLoading ? (
            <div className="dashboard-panel empty-state">Loading student profile...</div>
          ) : studentProfile ? (
            <div className="dashboard-panel profile-page-card company-profile-card">
              <div className="profile-page-top">
                <div className="avatar avatar-large">{initials}</div>
                <div>
                  <h2>{studentProfile.full_name || studentName}</h2>
                  <p>{loggedUser.email}</p>
                  <span className="account-badge">Student account</span>
                </div>
              </div>

              <section className="company-logo-section">
                <h3>CV / Resume</h3>
                <p>Upload your latest CV as a PDF file. Maximum file size: 5MB.</p>
                {studentProfile.cv_path ? (
                  <p className="profile-note">Current CV: <strong>{studentProfile.cv_path}</strong></p>
                ) : (
                  <p className="profile-note">No CV uploaded yet.</p>
                )}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
                      showMessage('Please select a PDF file only.', 'error');
                      e.target.value = '';
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      showMessage('CV must be smaller than 5MB.', 'error');
                      e.target.value = '';
                      return;
                    }
                    setStudentCVFile(file);
                  }}
                />
                {studentCVFile && <p className="profile-note">Selected: {studentCVFile.name}</p>}
                <button type="button" className="button-primary button-small" onClick={handleStudentCVUpload} disabled={!studentCVFile || studentCVUploading}>
                  {studentCVUploading ? 'Uploading...' : studentProfile.cv_path ? 'Replace CV' : 'Upload CV'}
                </button>
              </section>

              <form className="company-profile-form" onSubmit={handleSaveStudentProfile}>
                <h3>Personal Information</h3>
                <div className="profile-input-grid">
                  <div>
                    <label htmlFor="studentFullName">Full name</label>
                    <input id="studentFullName" type="text" value={studentProfile.full_name || ''} onChange={(e) => setStudentProfile({ ...studentProfile, full_name: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="studentEmail">Email address</label>
                    <input id="studentEmail" type="email" value={loggedUser.email || ''} disabled />
                  </div>
                  <div>
                    <label htmlFor="studentPhone">Phone number</label>
                    <input id="studentPhone" type="tel" placeholder="Enter phone number" value={studentProfile.phone || ''} onChange={(e) => setStudentProfile({ ...studentProfile, phone: e.target.value })} />
                  </div>
                </div>

                <h3>Education</h3>
                <div className="profile-input-grid">
                  <div>
                    <label htmlFor="studentUniversity">University / Institute</label>
                    <input id="studentUniversity" type="text" placeholder="Enter your university" value={studentProfile.university || ''} onChange={(e) => setStudentProfile({ ...studentProfile, university: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="studentDegree">Degree programme</label>
                    <input id="studentDegree" type="text" placeholder="e.g. BSc in Computer Science" value={studentProfile.degree_program || ''} onChange={(e) => setStudentProfile({ ...studentProfile, degree_program: e.target.value })} />
                  </div>
                </div>

                <h3>Professional Information</h3>
                <div className="profile-input-grid">
                  <div className="profile-full-width">
                    <label htmlFor="studentSkills">Skills</label>
                    <textarea id="studentSkills" rows={3} placeholder="e.g. Java, Python, MySQL, HTML, CSS" value={studentProfile.skills || ''} onChange={(e) => setStudentProfile({ ...studentProfile, skills: e.target.value })} />
                  </div>
                  <div className="profile-full-width">
                    <label htmlFor="studentAbout">About me</label>
                    <textarea id="studentAbout" rows={5} placeholder="Write a short introduction about yourself..." value={studentProfile.about_me || ''} onChange={(e) => setStudentProfile({ ...studentProfile, about_me: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="button-primary" disabled={studentProfileSaving}>
                  {studentProfileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          ) : (
            <div className="dashboard-panel empty-state">Student profile is not available. Please refresh the page.</div>
          )}
        </DashboardLayout>
      )}

      {/* Login */}
      {page === 'login' && (
        <section className="auth-page">
          <div className="auth-decoration"><span className="auth-orb orb-a" /><span className="auth-orb orb-b" /><div className="auth-promo"><span className="section-kicker">WELCOME TO CAREERCONNECT</span><h2>Your next opportunity is closer than you think.</h2><p>Sign in to explore internships and manage your career journey.</p></div></div>
          <div className="auth-form-side">
            <form className="form-box auth-card" onSubmit={handleLogin}>
              <div className="auth-brand">Career<span>Connect</span></div>
              <span className="section-kicker">YOUR CAREER STARTS HERE</span>
              <h1>Welcome back</h1>
              <p className="auth-subtitle">Enter your details to access your account.</p>
              <label>Email address</label>
              <input type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              <label>Password</label>
              <input type="password" placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              {message && <p className={`form-message ${messageType}`}>{message}</p>}
              <button className="button-primary auth-submit" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'} <span>→</span></button>
              <p className="auth-switch">Don't have an account? <button type="button" onClick={() => navigate('register')}>Create account</button></p>
              <button className="back-home" type="button" onClick={() => navigate('home')}>← Back to home</button>
            </form>
          </div>
        </section>
      )}

      {/* Registration */}
      {page === 'register' && (
        <section className="auth-page">
          <div className="auth-decoration"><span className="auth-orb orb-a" /><span className="auth-orb orb-b" /><div className="auth-promo"><span className="section-kicker">TAKE THE FIRST STEP</span><h2>Make room for your next big opportunity.</h2><p>Create your account and begin exploring your future career path.</p></div></div>
          <div className="auth-form-side">
            <form className="form-box auth-card" onSubmit={handleRegister}>
              <div className="auth-brand">Career<span>Connect</span></div>
              <span className="section-kicker">JOIN OUR COMMUNITY</span>
              <h1>Create account</h1>
              <p className="auth-subtitle">Fill in your details to get started.</p>
              <label>Full name</label>
              <input type="text" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <label>Email address</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <label>Password</label>
              <input type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
              <label>Account type</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="student">Student</option>
                <option value="company">Company</option>
              </select>
              {message && <p className={`form-message ${messageType}`}>{message}</p>}
              <button className="button-primary auth-submit" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'} <span>→</span></button>
              <p className="auth-switch">Already have an account? <button type="button" onClick={() => navigate('login')}>Sign in</button></p>
              <button className="back-home" type="button" onClick={() => navigate('home')}>← Back to home</button>
            </form>
          </div>
        </section>
      )}

      {['home', 'login', 'register'].includes(page) && (
        <footer className="public-footer">
          <div className="footer-brand">Career<span>Connect</span></div>
          <p>Connecting talent with opportunity.</p>
          <small>© 2026 CareerConnect. All rights reserved.</small>
        </footer>
      )}
    </div>
  );
}

export default App;


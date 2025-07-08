import React, { useState, useEffect } from 'react';
import './App.css';

interface InterviewDetails {
  interview_id: string;
  candidate_name: string;
  candidate_phone: string;
  status: string;
  questions_answered: number;
  total_questions: number;
  start_time: string;
  end_time: string;
  completion_rate: string;
  interviewer: string;
}

interface DashboardStats {
  totalInterviews: number;
  completedInterviews: number;
  inProgressInterviews: number;
  terminatedInterviews: number;
}

interface InterviewFormData {
  title: string;
  role: string;
  jobDescription: string;
  candidateName: string;
  candidateEmail: string;
  resume: string;
  resumeText: string;
  yearsOfExperience: number;
  totalQuestion: number;
  startTime: Date | null;
  expiryTime: Date | null;
  duration: number;
}

interface JobDescription {
  title: string;
  company: string;
  description: string;
  required_skills: string;
  experience_required: string;
}

const API_BASE_URL = 'http://13.204.76.229:8000';
const fetchAllInterviews = async () => {
  const response = await fetch(`${API_BASE_URL}/interviews-detailed`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
};

function App() {
  const [interviews, setInterviews] = useState<InterviewDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalInterviews: 0,
    completedInterviews: 0,
    inProgressInterviews: 0,
    terminatedInterviews: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('COMPLETED');
  const [showInterviewForm, setShowInterviewForm] = useState<string | null>(null);
  const [interviewFormData, setInterviewFormData] = useState<InterviewFormData>({
    title: '',
    role: '',
    jobDescription: '',
    candidateName: '',
    candidateEmail: '',
    resume: '',
    resumeText: 'Resume text',
    yearsOfExperience: 0,
    totalQuestion: 5,
    startTime: null,
    expiryTime: null,
    duration: 60,
  });
  const [uploading, setUploading] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [jobDescription, setJobDescription] = useState<JobDescription | null>(null);
  const [loadingJD, setLoadingJD] = useState(false);
  const [isSubmittingInterview, setIsSubmittingInterview] = useState(false);

  useEffect(() => {
    loadInterviews();
    loadJobDescription();
  }, []);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchAllInterviews();
      
      const interviewData = response.interviews || response.data || response || [];
      setInterviews(Array.isArray(interviewData) ? interviewData : []);
      
      calculateStats(interviewData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch interviews');
      console.error('Error fetching interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadJobDescription = async () => {
    try {
      setLoadingJD(true);
      const response = await fetch(`${API_BASE_URL}/job-description`);
      if (response.ok) {
        const jdData = await response.json();
        setJobDescription(jdData);
        console.log('📋 Loaded JD:', jdData);
      }
    } catch (error) {
      console.error('Error loading job description:', error);
    } finally {
      setLoadingJD(false);
    }
  };

  const calculateStats = (interviewData: InterviewDetails[]) => {
    const validCompletedInterviews = interviewData.filter(interview => {
      const hasValidStartTime = interview.start_time && interview.start_time !== 'N/A';
      const hasProgress = interview.questions_answered > 0;
      return interview.status === 'COMPLETED' && hasValidStartTime && hasProgress;
    });

    const total = interviewData.length;
    const completed = validCompletedInterviews.length;
    const inProgress = interviewData.filter(i => i.status === 'IN_PROGRESS').length;
    const terminated = interviewData.filter(i => i.status === 'TERMINATED').length;

    setStats({
      totalInterviews: total,
      completedInterviews: completed,
      inProgressInterviews: inProgress,
      terminatedInterviews: terminated
    });
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = interview.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interview.interview_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interview.candidate_phone?.includes(searchTerm);
    
    // Only show completed interviews with valid start time and non-zero progress
    const hasValidStartTime = interview.start_time && interview.start_time !== 'N/A';
    const hasProgress = interview.questions_answered > 0;
    
    return matchesSearch && interview.status === 'COMPLETED' && hasValidStartTime && hasProgress;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#28a745';
      case 'IN_PROGRESS': return '#ffc107';
      case 'TERMINATED': return '#dc3545';
      case 'CALLBACK_REQUESTED': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return 'N/A';
    try {
      return new Date(dateTime).toLocaleString();
    } catch {
      return dateTime;
    }
  };

  const handleInterviewFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInterviewFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, interviewId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload to your backend (you may need to create this endpoint)
      const response = await fetch(`${API_BASE_URL}/upload-resume`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setInterviewFormData(prev => ({
          ...prev,
          resume: result.file_url || URL.createObjectURL(file)
        }));

        setFormErrors(prev => ({
          ...prev,
          resume: ''
        }));
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setFormErrors(prev => ({
        ...prev,
        resume: 'Failed to upload resume'
      }));
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!interviewFormData.title.trim()) newErrors.title = 'Title is required';
    if (!interviewFormData.role.trim()) newErrors.role = 'Role is required';
    if (!interviewFormData.jobDescription.trim()) newErrors.jobDescription = 'Job description is required';
    if (!interviewFormData.candidateEmail.trim()) newErrors.candidateEmail = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(interviewFormData.candidateEmail)) newErrors.candidateEmail = 'Invalid email format';
    if (!interviewFormData.resume.trim()) newErrors.resume = 'Resume is required';
    if (interviewFormData.yearsOfExperience < 0) newErrors.yearsOfExperience = 'Experience cannot be negative';
    if (interviewFormData.totalQuestion <= 0) newErrors.totalQuestion = 'Questions must be greater than 0';
    if (!interviewFormData.startTime) newErrors.startTime = 'Start time is required';
    if (!interviewFormData.expiryTime) newErrors.expiryTime = 'Expiry time is required';
    if (interviewFormData.startTime && interviewFormData.expiryTime && interviewFormData.startTime >= interviewFormData.expiryTime) {
      newErrors.expiryTime = 'Expiry time must be after start time';
    }
    if (interviewFormData.duration <= 0) newErrors.duration = 'Duration must be greater than 0';

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartInterview = async (candidateData: InterviewDetails) => {
    if (!validateForm()) {
      return;
    }

    setIsSubmittingInterview(true);
    try {
      // Create interview API call to EC2 backend
      const response = await fetch(`${API_BASE_URL}/interview/create-interview/${candidateData.interview_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Add authorization header if you have a token
          // 'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: interviewFormData.title,
          role: interviewFormData.role,
          jobDescription: interviewFormData.jobDescription,
          candidateName: candidateData.candidate_name,
          candidateEmail: interviewFormData.candidateEmail,
          resume: interviewFormData.resume,
          resumeText: interviewFormData.resumeText,
          yearsOfExperience: parseInt(interviewFormData.yearsOfExperience.toString()),
          totalQuestion: parseInt(interviewFormData.totalQuestion.toString()),
          startTime: interviewFormData.startTime?.toISOString(),
          expiryTime: interviewFormData.expiryTime?.toISOString(),
          duration: parseInt(interviewFormData.duration.toString()),
          // Add candidate phone from the existing data
          candidatePhone: candidateData.candidate_phone
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Interview started successfully:', result);
      
      // Show success message
      alert('🚀 AI Interview started successfully! The candidate will receive instructions.');
      
      // Close form and refresh data
      setShowInterviewForm(null);
      setInterviewFormData({
        title: '',
        role: '',
        jobDescription: '',
        candidateName: '',
        candidateEmail: '',
        resume: '',
        resumeText: 'Resume text',
        yearsOfExperience: 0,
        totalQuestion: 5,
        startTime: null,
        expiryTime: null,
        duration: 60,
      });
      setFormErrors({});
      
      // Refresh the interviews list to show updated data
      loadInterviews();
      
    } catch (error: unknown) {
      console.error('❌ Error starting interview:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to start interview. Please try again.';
      
      // Type guard to check if error is an Error object
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message) {
          errorMessage = `Error: ${error.message}`;
        }
      } else if (typeof error === 'string') {
        errorMessage = `Error: ${error}`;
      }
      
      alert(errorMessage);
      
      // Set form error for display
      setFormErrors(prev => ({
        ...prev,
        submit: errorMessage
      }));
    } finally {
      setIsSubmittingInterview(false);
    }
  };

  const handleUseJD = () => {
    if (jobDescription) {
      setInterviewFormData(prev => ({
        ...prev,
        title: jobDescription.title,
        role: jobDescription.title,
        jobDescription: jobDescription.description,
      }));
      console.log('📋 Applied JD to form');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button onClick={loadInterviews} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="brand-section">
          <div className="logo">
            <img src="/title-logo.svg" alt="Onelab" className="logo-icon" />
            <div className="brand-text">
              <span className="brand-name">Onelab</span>
              <div className="brand-subtitle">
                <img src="/dashboard-logo.svg" alt="AI Interview Bot" className="subtitle-logo" />
              </div>
            </div>
          </div>
          <div className="page-title">
            <h1>AI Interview Dashboard</h1>
            <p>Manage job descriptions, make calls, and monitor interview progress</p>
          </div>
        </div>
        <button onClick={loadInterviews} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.completedInterviews}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Interview Table */}
      <div className="table-section">
        <div className="table-header">
          <h3>Completed Interviews ({filteredInterviews.length})</h3>
        </div>
        
        <div className="table-container">
          <table className="interviews-table">
            <thead>
              <tr>
                <th>Interview ID</th>
                <th>Candidate</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
                <th>Completion Rate</th>
                <th>Interviewer</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">
                    {searchTerm ? 'No completed interviews match your search' : 'No completed interviews found'}
                  </td>
                </tr>
              ) : (
                filteredInterviews.map((interview) => (
                  <tr key={interview.interview_id}>
                    <td className="interview-id">{interview.interview_id}</td>
                    <td className="candidate-name">{interview.candidate_name}</td>
                    <td className="phone">{interview.candidate_phone}</td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(interview.status) }}
                      >
                        {interview.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        onClick={() => {
                          setShowInterviewForm(interview.interview_id);
                          setInterviewFormData(prev => ({
                            ...prev,
                            candidateName: interview.candidate_name,
                          }));
                        }}
                        className="action-btn"
                      >
                        📞 Start Interview
                      </button>
                    </td>
                    <td className="completion-rate">{interview.completion_rate}</td>
                    <td className="interviewer">{interview.interviewer}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel Overlay */}
      {showInterviewForm && (
        <div className="side-panel-overlay" onClick={() => setShowInterviewForm(null)}>
          <div className="side-panel" onClick={(e) => e.stopPropagation()}>
            {/* Panel Header */}
            <div className="side-panel-header">
              <div className="panel-title">
                <h2>🚀 Start AI Interview</h2>
                <p>Configure interview settings for {interviewFormData.candidateName}</p>
              </div>
              <button 
                className="close-panel-btn"
                onClick={() => setShowInterviewForm(null)}
              >
                ✕
              </button>
            </div>

            {/* Panel Content */}
            <div className="side-panel-content">
              {/* Job Description Section */}
              {jobDescription && (
                <div className="jd-section">
                  <div className="jd-header">
                    <h3>📋 Current Job Description</h3>
                    <button 
                      onClick={handleUseJD}
                      className="use-jd-btn"
                      type="button"
                    >
                      Apply Current JD
                    </button>
                  </div>
                  <div className="jd-preview">
                    <div className="jd-title">{jobDescription.title}</div>
                    <div className="jd-company">at {jobDescription.company}</div>
                    <div className="jd-skills">
                      <strong>Required Skills:</strong> {jobDescription.required_skills}
                    </div>
                    <div className="jd-experience">
                      <strong>Experience:</strong> {jobDescription.experience_required}
                    </div>
                  </div>
                </div>
              )}

              {/* Interview Form */}
              <form className="interview-form">
                <div className="form-section">
                  <h3>📝 Basic Information</h3>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Interview Title*</label>
                      <input
                        type="text"
                        name="title"
                        value={interviewFormData.title}
                        onChange={handleInterviewFormChange}
                        placeholder="e.g., Senior Developer Interview"
                        className={`form-input ${formErrors.title ? 'error' : ''}`}
                      />
                      {formErrors.title && <span className="error-text">{formErrors.title}</span>}
                    </div>
                    <div className="form-field">
                      <label>Job Role*</label>
                      <input
                        type="text"
                        name="role"
                        value={interviewFormData.role}
                        onChange={handleInterviewFormChange}
                        placeholder="e.g., Senior Full Stack Developer"
                        className={`form-input ${formErrors.role ? 'error' : ''}`}
                      />
                      {formErrors.role && <span className="error-text">{formErrors.role}</span>}
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Job Description*</label>
                    <textarea
                      name="jobDescription"
                      value={interviewFormData.jobDescription}
                      onChange={handleInterviewFormChange}
                      placeholder="Enter detailed job description..."
                      className={`form-textarea ${formErrors.jobDescription ? 'error' : ''}`}
                      rows={4}
                    />
                    {formErrors.jobDescription && <span className="error-text">{formErrors.jobDescription}</span>}
                  </div>
                </div>

                <div className="form-section">
                  <h3>👤 Candidate Information</h3>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Candidate Email*</label>
                      <input
                        type="email"
                        name="candidateEmail"
                        value={interviewFormData.candidateEmail}
                        onChange={handleInterviewFormChange}
                        placeholder="candidate@email.com"
                        className={`form-input ${formErrors.candidateEmail ? 'error' : ''}`}
                      />
                      {formErrors.candidateEmail && <span className="error-text">{formErrors.candidateEmail}</span>}
                    </div>
                    <div className="form-field">
                      <label>Years of Experience</label>
                      <input
                        type="number"
                        name="yearsOfExperience"
                        value={interviewFormData.yearsOfExperience}
                        onChange={handleInterviewFormChange}
                        min="0"
                        className={`form-input ${formErrors.yearsOfExperience ? 'error' : ''}`}
                      />
                      {formErrors.yearsOfExperience && <span className="error-text">{formErrors.yearsOfExperience}</span>}
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Resume*</label>
                    <div className="file-upload-area">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileUpload(e, showInterviewForm)}
                        disabled={uploading}
                        className="file-input"
                        id="resume-upload"
                      />
                      <label htmlFor="resume-upload" className="file-upload-label">
                        <div className="upload-icon">📄</div>
                        <div className="upload-text">
                          {uploading ? (
                            <div className="upload-loading">
                              <div className="spinner-small"></div>
                              <span>Uploading...</span>
                            </div>
                          ) : interviewFormData.resume ? (
                            <div className="upload-success">
                              <span>✅ Resume Uploaded</span>
                            </div>
                          ) : (
                            <div>
                              <strong>Click to upload resume</strong>
                              <br />
                              <small>PDF, DOC, DOCX files accepted</small>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                    {formErrors.resume && <span className="error-text">{formErrors.resume}</span>}
                  </div>
                </div>

                <div className="form-section">
                  <h3>⚙️ Interview Settings</h3>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Duration (minutes)*</label>
                      <input
                        type="number"
                        name="duration"
                        value={interviewFormData.duration}
                        onChange={handleInterviewFormChange}
                        min="1"
                        className={`form-input ${formErrors.duration ? 'error' : ''}`}
                      />
                      {formErrors.duration && <span className="error-text">{formErrors.duration}</span>}
                    </div>
                    <div className="form-field">
                      <label>Total Questions*</label>
                      <input
                        type="number"
                        name="totalQuestion"
                        value={interviewFormData.totalQuestion}
                        onChange={handleInterviewFormChange}
                        min="1"
                        className={`form-input ${formErrors.totalQuestion ? 'error' : ''}`}
                      />
                      {formErrors.totalQuestion && <span className="error-text">{formErrors.totalQuestion}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Start Time*</label>
                      <input
                        type="datetime-local"
                        name="startTime"
                        value={interviewFormData.startTime ? interviewFormData.startTime.toISOString().slice(0, 16) : ''}
                        onChange={(e) => setInterviewFormData(prev => ({ ...prev, startTime: e.target.value ? new Date(e.target.value) : null }))}
                        className={`form-input ${formErrors.startTime ? 'error' : ''}`}
                      />
                      {formErrors.startTime && <span className="error-text">{formErrors.startTime}</span>}
                    </div>
                    <div className="form-field">
                      <label>Expiry Time*</label>
                      <input
                        type="datetime-local"
                        name="expiryTime"
                        value={interviewFormData.expiryTime ? interviewFormData.expiryTime.toISOString().slice(0, 16) : ''}
                        onChange={(e) => setInterviewFormData(prev => ({ ...prev, expiryTime: e.target.value ? new Date(e.target.value) : null }))}
                        className={`form-input ${formErrors.expiryTime ? 'error' : ''}`}
                      />
                      {formErrors.expiryTime && <span className="error-text">{formErrors.expiryTime}</span>}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Panel Footer */}
            <div className="side-panel-footer">
              {/* Show submit error if exists */}
              {formErrors.submit && (
                <div className="error-message-inline">
                  <span className="error-text">{formErrors.submit}</span>
                </div>
              )}
              
              <button
                onClick={() => {
                  setShowInterviewForm(null);
                  setFormErrors({});
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStartInterview(filteredInterviews.find(i => i.interview_id === showInterviewForm)!)}
                disabled={isSubmittingInterview || uploading}
                className="start-interview-btn"
              >
                {isSubmittingInterview ? (
                  <div className="btn-loading">
                    <div className="spinner-small"></div>
                    <span>Starting Interview...</span>
                  </div>
                ) : (
                  <span>🚀 Start AI Interview</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;